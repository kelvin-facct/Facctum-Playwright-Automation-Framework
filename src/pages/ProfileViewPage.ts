import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * ProfileViewPage - Page object for the record profile view shutter/panel.
 * Handles Suppress/Enrich, Suppress Attribute, Enrich Attribute, and Edit Profile operations.
 */
export class ProfileViewPage {
  // Profile view panel
  private profilePanel: Locator;
  private pendingApprovalWarning: Locator;

  // Action buttons
  private suppressEnrichBtn: Locator;
  private editBtn: Locator;

  constructor(private page: Page) {
    // Profile view panel
    this.profilePanel = page.locator('.facct-drawer-paper').first();
    this.pendingApprovalWarning = page.locator('text=This record is already pending approval');

    // Footer action buttons (stable IDs)
    this.suppressEnrichBtn = page.locator('#lseg-footer-suppress-btn');
    this.editBtn = page.locator('#lseg-footer-edit-btn');
  }

  /**
   * Checks if the profile view panel is open.
   */
  async isProfileViewOpen(): Promise<boolean> {
    return await this.profilePanel.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Checks if the record has a pending approval warning.
   */
  async hasPendingApprovalWarning(): Promise<boolean> {
    return await this.pendingApprovalWarning.isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ==================== Suppress/Enrich Record (SER) ====================

  /**
   * Clicks the Suppress/Enrich button on the record profile.
   */
  async clickSuppressEnrich(): Promise<void> {
    // Match E2E debug: click suppress, then wait for form to appear
    const suppBtn = this.page.locator('#lseg-footer-suppress-btn');
    await suppBtn.waitFor({ state: "visible", timeout: 10000 });
    await suppBtn.click();
    // Wait for the suppress form to actually open (tags dropdown visible)
    await this.page.locator('#mui-component-select-tags').waitFor({ state: "visible", timeout: 15000 });
    logger.info("Clicked SUPPRESS button, form opened");
  }

  /**
   * Fills the Suppress/Enrich form with provided parameters.
   * 
   * Actual form IDs after clicking SUPPRESS:
   * - #mui-component-select-tags (Tags multi-select)
   * - #mui-component-select-reasonCode (Reason dropdown)
   * - #mui-component-select-reviewPeriod (Review Period dropdown)
   * - #hold-enrich-comment--1 (Comment textarea, placeholder="Comment")
   * - button[aria-label="upload file"] (Upload file)
   * - #hold-enrich-modal-submit-btn (Submit for Approval)
   * - #hold-enrich-modal-cancel-btn (Cancel)
   */
  async fillSuppressEnrichForm(params: {
    tags: string[];
    reason: string;
    reviewPeriod: string;
    comment?: string;
    attachmentPath?: string;
  }): Promise<void> {
    // Select tags (multi-select)
    await this.selectMuiDropdown("#mui-component-select-tags", params.tags, true);

    // Select reason (facct-dropdown-v2 with search)
    await this.selectFacctDropdown("reasonCode", params.reason);

    // Select review period (facct-dropdown-v2 with search)
    await this.selectFacctDropdown("reviewPeriod", params.reviewPeriod);

    // Enter comment if provided
    if (params.comment) {
      const commentField = this.page.locator('#hold-enrich-comment--1, textarea[placeholder="Comment"]').first();
      await commentField.waitFor({ state: "visible", timeout: 5000 });
      await commentField.fill(params.comment.substring(0, 200));
      logger.info("Entered comment");
    }

    // Upload attachment (always mandatory)
    await this.uploadAttachment(params.attachmentPath || "src/resources/testData/Test_Sheet.xlsx");

    logger.info("Filled Suppress/Enrich form");
  }

  /**
   * Clicks Submit for Approval button.
   * Handles both suppress form (#hold-enrich-modal-submit-btn) and edit mode (#lseg-footer-submitForApproval-btn).
   */
  async clickSubmit(): Promise<void> {
    const suppressSubmit = this.page.locator('#hold-enrich-modal-submit-btn');
    const editSubmit = this.page.locator('#lseg-footer-submitForApproval-btn');

    if (await suppressSubmit.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Match E2E debug: scroll into view, wait for enabled, click, retry if needed
      await suppressSubmit.scrollIntoViewIfNeeded();
      await this.page.waitForFunction(() => {
        const b = document.querySelector('#hold-enrich-modal-submit-btn') as HTMLButtonElement;
        return b && !b.disabled;
      }, { timeout: 10000 }).catch(e => logger.warn(`Submit wait: ${e}`));
      await suppressSubmit.click();
      logger.info("Clicked Submit for Approval (suppress form)");

      // Verify form closed — retry with force click if still open
      await this.page.waitForTimeout(2000);
      const formStillOpen = await suppressSubmit.isVisible({ timeout: 3000 }).catch(() => false);
      if (formStillOpen) {
        logger.warn("Form still open after submit — retrying with force click");
        await suppressSubmit.click({ force: true });
      }
    } else if (await editSubmit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editSubmit.click();
      logger.info("Clicked Submit for Approval (edit mode)");
    } else {
      throw new Error("No Submit for Approval button found");
    }

    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  // ==================== Suppress Attribute (SA) ====================

  /**
   * Suppresses a specific attribute (alias, DOB, or ID) by row index.
   * @param section - "Other names" | "ID numbers" | "Date of birth"
   * @param rowIndex - 0-based row index within the section
   */
  async suppressAttribute(section: string, rowIndex: number): Promise<void> {
    const sectionLocator = this.page.locator(`[class*="section"]:has-text("${section}"), div:has-text("${section}")`).first();
    await sectionLocator.scrollIntoViewIfNeeded();

    // Find the suppress (blue hand) icon on the specific row
    const rows = sectionLocator.locator('tr, [class*="row"], [class*="item"]');
    const targetRow = rows.nth(rowIndex);
    const suppressIcon = targetRow.locator(
      '[data-testid*="PanTool"], [aria-label*="suppress"], ' +
      'button:has(svg[data-testid*="Hand"]), [title*="Suppress"], ' +
      'svg[class*="hand"], button[class*="suppress"]'
    ).first();

    await suppressIcon.waitFor({ state: "visible", timeout: 10000 });
    await suppressIcon.click();
    await this.page.waitForTimeout(1000);
    logger.info(`Clicked suppress icon on ${section} row ${rowIndex}`);
  }

  /**
   * Fills the "Suppress attribute request" popup form.
   */
  async fillSuppressAttributeForm(params: {
    tags: string[];
    reason: string;
    reviewPeriod: string;
    comment?: string;
  }): Promise<void> {
    // Wait for the popup dialog
    const popup = this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').first();
    await popup.waitFor({ state: "visible", timeout: 10000 });
    logger.info("Suppress attribute popup opened");

    await this.selectMuiDropdown("#mui-component-select-tags", params.tags, true);
    await this.selectFacctDropdown("reasonCode", params.reason);
    await this.selectFacctDropdown("reviewPeriod", params.reviewPeriod);

    if (params.comment) {
      await this.enterComment(params.comment);
    }

    // Click SUPPRESS button in the popup
    const suppressBtn = popup.locator('button:has-text("SUPPRESS"), button:has-text("Suppress")').first();
    await suppressBtn.waitFor({ state: "visible", timeout: 5000 });
    await suppressBtn.click();
    await this.page.waitForTimeout(1500);
    logger.info("Clicked SUPPRESS in popup");
  }

  // ==================== Enrich Attribute (EA) ====================

  /**
   * Clicks the Add/Enrich button on a specific section.
   * @param section - "Other names" | "ID numbers" | "Date of birth"
   */
  async clickEnrichOnSection(section: string): Promise<void> {
    const sectionLocator = this.page.locator(`[class*="section"]:has-text("${section}"), div:has-text("${section}")`).first();
    await sectionLocator.scrollIntoViewIfNeeded();

    const addBtn = sectionLocator.locator(
      'button:has-text("+"), button[aria-label*="add"], ' +
      'button[aria-label*="enrich"], [data-testid*="Add"]'
    ).first();

    await addBtn.waitFor({ state: "visible", timeout: 10000 });
    await addBtn.click();
    await this.page.waitForTimeout(1000);
    logger.info(`Clicked Add/Enrich on ${section}`);
  }

  /**
   * Fills the "Add attribute request" popup for Other names (Alias).
   */
  async fillEnrichAliasForm(params: {
    aliasType: string;
    languageCode: string;
    name: string;
    tags: string[];
    reason: string;
    reviewPeriod: string;
    comment?: string;
  }): Promise<void> {
    const popup = this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').first();
    await popup.waitFor({ state: "visible", timeout: 10000 });

    await this.selectMuiDropdown("#mui-component-select-type, [id*='type']", [params.aliasType]);
    await this.selectMuiDropdown("#mui-component-select-language, [id*='language']", [params.languageCode]);

    const nameInput = popup.locator('input[id*="name"], input[placeholder*="name"], input[placeholder*="Name"]').first();
    await nameInput.fill(params.name);

    await this.selectMuiDropdown("#mui-component-select-tags", params.tags, true);
    await this.selectFacctDropdown("reasonCode", params.reason);
    await this.selectFacctDropdown("reviewPeriod", params.reviewPeriod);

    if (params.comment) {
      await this.enterComment(params.comment);
    }

    const addBtn = popup.locator('button:has-text("ADD"), button:has-text("Add")').first();
    await addBtn.click();
    await this.page.waitForTimeout(1500);
    logger.info("Submitted enrich alias form");
  }

  /**
   * Fills the "Add attribute request" popup for ID numbers.
   */
  async fillEnrichIdForm(params: {
    idType: string;
    idNumber: string;
    tags: string[];
    reason: string;
    reviewPeriod: string;
    comment?: string;
  }): Promise<void> {
    const popup = this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').first();
    await popup.waitFor({ state: "visible", timeout: 10000 });

    await this.selectMuiDropdown("#mui-component-select-type, [id*='type']", [params.idType]);

    const idInput = popup.locator('input[id*="id"], input[placeholder*="ID"], input[placeholder*="id"]').first();
    await idInput.fill(params.idNumber);

    await this.selectMuiDropdown("#mui-component-select-tags", params.tags, true);
    await this.selectFacctDropdown("reasonCode", params.reason);
    await this.selectFacctDropdown("reviewPeriod", params.reviewPeriod);

    if (params.comment) {
      await this.enterComment(params.comment);
    }

    const addBtn = popup.locator('button:has-text("ADD"), button:has-text("Add")').first();
    await addBtn.click();
    await this.page.waitForTimeout(1500);
    logger.info("Submitted enrich ID form");
  }

  /**
   * Fills the "Add attribute request" popup for Date of birth.
   */
  async fillEnrichDobForm(params: {
    date: string;
    tags: string[];
    reason: string;
    reviewPeriod: string;
    comment?: string;
  }): Promise<void> {
    const popup = this.page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').first();
    await popup.waitFor({ state: "visible", timeout: 10000 });

    const dateInput = popup.locator('input[type="date"], input[id*="date"], input[placeholder*="date"]').first();
    await dateInput.fill(params.date);

    await this.selectMuiDropdown("#mui-component-select-tags", params.tags, true);
    await this.selectFacctDropdown("reasonCode", params.reason);
    await this.selectFacctDropdown("reviewPeriod", params.reviewPeriod);

    if (params.comment) {
      await this.enterComment(params.comment);
    }

    const addBtn = popup.locator('button:has-text("ADD"), button:has-text("Add")').first();
    await addBtn.click();
    await this.page.waitForTimeout(1500);
    logger.info("Submitted enrich DOB form");
  }

  // ==================== Edit Profile View (EPV) ====================

  /**
   * Clicks the Edit button on the profile view.
   */
  async clickEdit(): Promise<void> {
    await this.editBtn.waitFor({ state: "visible", timeout: 10000 });
    await this.editBtn.click();
    await this.page.waitForTimeout(1000);
    logger.info("Clicked Edit button on profile");
  }

  /**
   * Checks if the Submit button is enabled (for no-change validation).
   * Handles both suppress form submit and edit mode submit.
   */
  async isSubmitEnabled(): Promise<boolean> {
    // Check suppress form submit
    const suppressSubmit = this.page.locator('#hold-enrich-modal-submit-btn');
    if (await suppressSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
      return !(await suppressSubmit.isDisabled().catch(() => true));
    }
    // Check edit mode submit
    const editSubmit = this.page.locator('#lseg-footer-submitForApproval-btn');
    if (await editSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
      return !(await editSubmit.isDisabled().catch(() => true));
    }
    return false;
  }

  // ==================== Audit Verification ====================

  /**
   * Clicks the AUDIT tab in the profile view and verifies the audit trail
   * contains the expected values from the suppress/enrich action.
   */
  async verifyAuditTrail(expectedValues: {
    tags?: string[];
    reason?: string;
    reviewPeriod?: string;
    comment?: string;
  }): Promise<boolean> {
    // Click AUDIT tab (stable aria-label selector)
    const auditTab = this.page.locator('button[aria-label="AUDIT"]').first();
    await auditTab.waitFor({ state: "visible", timeout: 5000 });
    await auditTab.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
    logger.info("Clicked AUDIT tab");

    // Get the audit content text
    const auditContent = await this.page.locator('.facct-drawer-content').textContent() || "";

    let allFound = true;

    // Verify tags
    if (expectedValues.tags) {
      for (const tag of expectedValues.tags) {
        if (!auditContent.includes(tag)) {
          logger.warn(`Audit: tag "${tag}" NOT found`);
          allFound = false;
        } else {
          logger.info(`Audit: tag "${tag}" found`);
        }
      }
    }

    // Verify reason
    if (expectedValues.reason && !auditContent.includes(expectedValues.reason)) {
      logger.warn(`Audit: reason "${expectedValues.reason}" NOT found`);
      allFound = false;
    } else if (expectedValues.reason) {
      logger.info(`Audit: reason "${expectedValues.reason}" found`);
    }

    // Verify review period
    if (expectedValues.reviewPeriod && !auditContent.includes(expectedValues.reviewPeriod)) {
      logger.warn(`Audit: review period "${expectedValues.reviewPeriod}" NOT found`);
      allFound = false;
    } else if (expectedValues.reviewPeriod) {
      logger.info(`Audit: review period "${expectedValues.reviewPeriod}" found`);
    }

    // Switch back to RECORD DETAILS tab
    const recordTab = this.page.locator('button[aria-label="RECORD DETAILS"]').first();
    if (await recordTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recordTab.click();
      await this.page.waitForTimeout(1000);
    }

    return allFound;
  }

  // ==================== Tabs ====================

  // Profile view tabs (confirmed from CSV: #simple-tab-1 for AUDIT, #simple-tab-0 for RECORD DETAILS)
  private auditTab!: Locator;
  private recordDetailsTab!: Locator;

  // Attachment locators — RECORD DETAILS section
  // Confirmed: .attachment-field contains the clickable filename
  private attachmentField!: Locator;
  private attachmentFieldSpan!: Locator;

  // Attachment locators — AUDIT section
  // Confirmed: .download-audit-link is the clickable filename in audit trail
  private auditDownloadLink!: Locator;

  // Attribute suppress/enrich icons (visible beside attribute rows in record list or edit mode)
  // Confirmed: orange hand SVG path for suppress, button[aria-label='Attribute enriched'] for enrich
  private orangeHandIcon!: Locator;
  private blueHandIcon!: Locator;
  private enrichedIcon!: Locator;
  private enrichIcon!: Locator;

  // Additional attribute icons (EditNoteIcon SVGs in table/drawer)
  private attrSuppressedSvg!: Locator;
  private attrEnrichedSvg!: Locator;

  // Attribute suppress/enrich popup attachment
  // Confirmed: div[class*='attachment'] span inside the popup modal
  private popupAttachmentSpan!: Locator;

  // Cancel button in popup
  private popupCancelBtn!: Locator;

  // REQUEST FOR REVIEW tab (default tab when opening from Tasks Pending L1)
  private requestForReviewTab!: Locator;

  // Enrichment/suppress details table rows — each row may have an attachment icon
  private enrichmentDetailRows!: Locator;
  // Attachment icon within enrichment rows (envelope/file icon)
  private rowAttachmentIcons!: Locator;

  private initAttachmentLocators(): void {
    const drawer = this.page.locator('.facct-drawer-paper').first();

    // Tabs — the profile view from Tasks opens on REQUEST FOR REVIEW by default
    this.requestForReviewTab = drawer.locator('button:has-text("REQUEST FOR REVIEW")').first();
    this.auditTab = drawer.locator('button:has-text("AUDIT")').first();
    this.recordDetailsTab = drawer.locator('button:has-text("RECORD DETAILS")').first();

    // Attachment in RECORD DETAILS — confirmed CSS: .attachment-field
    this.attachmentField = drawer.locator('.attachment-field');
    this.attachmentFieldSpan = drawer.locator('.attachment-field span');

    // Attachment in AUDIT — confirmed CSS: .download-audit-link
    this.auditDownloadLink = drawer.locator('.download-audit-link, span.download-audit-link');

    // Attribute icons (in edit mode / commercial list profile view)
    this.orangeHandIcon = drawer.locator('button[title="Attribute suppress"]');
    this.blueHandIcon = drawer.locator('button[title="Attribute suppress request"]');
    this.enrichedIcon = drawer.locator('button[aria-label="Attribute enriched"]');
    this.enrichIcon = drawer.locator('svg[data-testid="AddCircleOutlineIcon"]');

    // EditNoteIcon SVGs in table rows (Review/Tasks views)
    this.attrSuppressedSvg = drawer.locator(
      'svg[data-testid="EditNoteIcon"][title="Attribute suppressed"], ' +
      'svg[title="Attribute suppressed"], ' +
      'svg.MuiSvgIcon-root[title="Attribute suppressed"]'
    );
    this.attrEnrichedSvg = drawer.locator(
      'svg[data-testid="EditNoteIcon"][title="Attribute enriched"], ' +
      'svg[title="Attribute enriched"], ' +
      'svg.MuiSvgIcon-root[title="Attribute enriched"]'
    );

    // Enrichment/suppress details table in REQUEST FOR REVIEW tab
    // Each row in the table may have an attachment (envelope) icon
    this.enrichmentDetailRows = drawer.locator('table tbody tr, .compare-section-slot table tbody tr');

    // Attachment icons within enrichment rows — document/file icons on the right side of each row
    // From screenshot: these are FileCopy/ContentCopy/Description icons (page with folded corner)
    this.rowAttachmentIcons = drawer.locator(
      'svg[data-testid="ContentCopyIcon"], ' +
      'svg[data-testid="FileCopyIcon"], ' +
      'svg[data-testid="FileCopyOutlinedIcon"], ' +
      'svg[data-testid="ContentCopyOutlinedIcon"], ' +
      'svg[data-testid="DescriptionIcon"], ' +
      'svg[data-testid="DescriptionOutlinedIcon"], ' +
      'svg[data-testid="InsertDriveFileIcon"], ' +
      'svg[data-testid="InsertDriveFileOutlinedIcon"], ' +
      'svg[data-testid="ArticleIcon"], ' +
      'svg[data-testid="ArticleOutlinedIcon"], ' +
      'svg[data-testid="NoteIcon"], ' +
      'svg[data-testid="AttachFileIcon"], ' +
      'svg[data-testid="AttachmentIcon"], ' +
      'svg[data-testid="MailIcon"], ' +
      'svg[data-testid="EmailIcon"], ' +
      'svg[data-testid="FileDownloadIcon"], ' +
      '[class*="attachment-icon"], ' +
      'button[aria-label*="attachment"], ' +
      'button[title*="attachment"], ' +
      'button[title*="Attachment"], ' +
      'button[title*="download"], ' +
      'button[title*="Download"]'
    );

    // Popup attachment — confirmed: div[class*='attachment'] span inside .facct-modal
    const popup = this.page.locator('[role="presentation"].facct-modal').last();
    this.popupAttachmentSpan = popup.locator('div.attachment-field span, div[class*="attachment"] span');

    // Cancel button in popup
    this.popupCancelBtn = popup.locator('#hold-enrich-modal-cancel-btn, button:has-text("CANCEL")');
  }

  // ==================== Attachment Download ====================

  /**
   * Captures any visible toaster/alert/snackbar messages.
   * Call after any action to log what the UI reported.
   */
  async captureToaster(label: string): Promise<string[]> {
    const messages: string[] = [];
    try {
      const selectors = [
        '[role="alert"]',
        '.MuiSnackbar-root',
        '[class*="notistack"]',
        '.MuiAlert-message',
      ];
      for (const sel of selectors) {
        const els = this.page.locator(sel);
        const count = await els.count();
        for (let i = 0; i < count; i++) {
          const vis = await els.nth(i).isVisible().catch(() => false);
          if (vis) {
            const text = (await els.nth(i).textContent().catch(() => "") || "").trim();
            if (text && !messages.includes(text)) {
              messages.push(text.substring(0, 150));
            }
          }
        }
      }
      if (messages.length > 0) {
        logger.info(`Toaster(${label}): ${JSON.stringify(messages)}`);
      }
    } catch { /* ignore */ }
    return messages;
  }

  /**
   * Clicks the AUDIT tab in the profile view.
   */
  async clickAuditTab(): Promise<void> {
    this.initAttachmentLocators();
    await this.auditTab.waitFor({ state: "visible", timeout: 5000 });
    await this.auditTab.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
    logger.info("Clicked AUDIT tab");
    await this.captureToaster("after AUDIT tab click");
  }

  /**
   * Clicks the RECORD DETAILS tab in the profile view.
   */
  async clickRecordDetailsTab(): Promise<void> {
    this.initAttachmentLocators();
    if (await this.recordDetailsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.recordDetailsTab.click();
      await this.page.waitForTimeout(1000);
      logger.info("Clicked RECORD DETAILS tab");
    }
  }

  /**
   * Downloads an attachment from the RECORD DETAILS section.
   * Confirmed selector: .attachment-field (click the div or span inside it)
   * @returns Download result with filename and size, or null if not found.
   */
  async downloadAttachmentFromRecordDetails(): Promise<{ filename: string; size: number; displayedName: string; filenameMatch: boolean } | null> {
    this.initAttachmentLocators();
    const result = await this.tryDownload([
      this.attachmentFieldSpan,
      this.attachmentField,
    ], "RECORD DETAILS");
    await this.captureToaster("after RECORD DETAILS download");
    return result;
  }

  /**
   * Downloads an attachment from the AUDIT tab.
   * Confirmed selector: .download-audit-link (span with filename)
   * Caller should click AUDIT tab first via clickAuditTab().
   * @returns Download result with filename and size, or null if not found.
   */
  async downloadAttachmentFromAudit(): Promise<{ filename: string; size: number; displayedName: string; filenameMatch: boolean } | null> {
    this.initAttachmentLocators();
    const result = await this.tryDownload([
      this.auditDownloadLink,
    ], "AUDIT");
    await this.captureToaster("after AUDIT download");
    return result;
  }

  /**
   * Opens the suppressed/enriched attribute popup by clicking the appropriate icon.
   * Must be in edit mode first (call clickEdit()).
   * Scrolls to "Other names" section before looking for icons.
   * @returns true if a popup was opened, false if no icon found.
   */
  /**
   * Opens the suppressed/enriched attribute popup by clicking the appropriate icon.
   * Navigates pagination in the "Other names" section to find rows with icons.
   * @returns true if a popup was opened, false if no icon found.
   */
  async openSuppressedAttributePopup(): Promise<boolean> {
    this.initAttachmentLocators();
    const drawer = this.page.locator('.facct-drawer-paper').first();

    // Scroll to Other names section
    const otherNames = drawer.locator('text=Other names').first();
    if (await otherNames.isVisible({ timeout: 5000 }).catch(() => false)) {
      await otherNames.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(1000);
    } else {
      logger.warn("'Other names' section not found in drawer");
      return false;
    }

    // The Other names table may be paginated — navigate through all pages
    // to find a row with a suppress/enrich icon
    const otherNamesSection = drawer.locator('.compare-sync-lsegv2-other-names, div:has(> text=Other names)').first();
    let maxPages = 10;

    while (maxPages > 0) {
      // Try all icon types on the current page
      if (await this.tryClickAttributeIcon(drawer)) return true;

      // Try navigating to next page within the Other names section
      // Pagination is inside the section: ">" button or next-page arrow
      const sectionPagBtns = drawer.locator('.compare-sync-lsegv2-other-names button[class*="pagination"], .compare-section-slot button[class*="pagination"]');
      const sectionPagCount = await sectionPagBtns.count();

      if (sectionPagCount >= 4) {
        // nth(2) = next page (single arrow right)
        const nextBtn = sectionPagBtns.nth(2);
        const tabIndex = await nextBtn.getAttribute("tabindex").catch(() => "-1");
        if (tabIndex !== "-1") {
          await nextBtn.click();
          await this.page.waitForTimeout(1500);
          logger.info("Navigated to next page in Other names section");
          maxPages--;
          continue;
        }
      }

      // Also try generic next-page buttons near Other names
      const genericNext = drawer.locator('div:has(> div:has-text("Other names")) button:has(svg[data-testid="NavigateNextIcon"]), div:has(> div:has-text("Other names")) button:has(svg[data-testid="ChevronRightIcon"])').first();
      if (await genericNext.isVisible({ timeout: 1000 }).catch(() => false)) {
        const disabled = await genericNext.isDisabled().catch(() => true);
        if (!disabled) {
          await genericNext.click();
          await this.page.waitForTimeout(1500);
          logger.info("Navigated to next page via generic next button");
          maxPages--;
          continue;
        }
      }

      // No more pages
      break;
    }

    logger.warn("No suppressed/enriched attribute icons found after checking all pages");
    return false;
  }

  /**
   * Tries to click any attribute suppress/enrich icon on the current page.
   * Returns true if an icon was clicked and a popup opened.
   */
  private async tryClickAttributeIcon(drawer: Locator): Promise<boolean> {
    // Order: orange hand → blue hand → enriched button → enrich AddCircle → EditNote SVGs
    const iconSets = [
      { loc: this.orangeHandIcon, name: "orange hand (Attribute suppress)" },
      { loc: this.blueHandIcon, name: "blue hand (Attribute suppress request)" },
      { loc: this.enrichedIcon, name: "enriched button (Attribute enriched)" },
      { loc: this.enrichIcon, name: "enrich AddCircle" },
      { loc: this.attrSuppressedSvg, name: "EditNote (Attribute suppressed)" },
      { loc: this.attrEnrichedSvg, name: "EditNote (Attribute enriched)" },
    ];

    for (const { loc, name } of iconSets) {
      const count = await loc.count();
      if (count === 0) continue;

      for (let i = 0; i < count; i++) {
        const icon = loc.nth(i);
        if (!(await icon.isVisible().catch(() => false))) continue;

        await icon.scrollIntoViewIfNeeded();
        await icon.click({ force: true });
        logger.info(`Clicked ${name} (index ${i})`);
        await this.page.waitForTimeout(2000);

        // Check if popup opened ("View add attribute request" or similar)
        const popup = this.page.locator('[role="presentation"].facct-modal, [role="dialog"], .MuiDialog-root').last();
        if (await popup.isVisible({ timeout: 3000 }).catch(() => false)) {
          const title = await popup.locator('h2, h3, .MuiDialogTitle-root, div:has-text("View")').first().textContent().catch(() => "");
          logger.info(`Popup opened: "${title?.trim().substring(0, 60)}"`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Downloads an attachment from the attribute suppress/enrich popup.
   * The popup has an "Attachment" section at the bottom with a clickable filename.
   * Confirmed from screenshot: filename text like "PR-List-20-Jul-2025-10_00_12.xlsx"
   * Caller should open the popup first via openSuppressedAttributePopup().
   * @returns Download result with filename and size, or null if not found.
   */
  async downloadAttachmentFromPopup(): Promise<{ filename: string; size: number; displayedName: string; filenameMatch: boolean } | null> {
    this.initAttachmentLocators();
    const popup = this.page.locator('[role="presentation"].facct-modal, [role="dialog"], .MuiDialog-root').last();

    // Scroll to "Attachment" section inside the popup
    const attachmentLabel = popup.locator('text=Attachment').first();
    if (await attachmentLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await attachmentLabel.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      logger.info("Scrolled to Attachment section in popup");
    }

    // Try multiple selectors for the attachment filename in the popup
    const popupAttachmentLocators = [
      // div.attachment-field span (confirmed from CSV)
      popup.locator('div.attachment-field span, div[class*="attachment"] span'),
      // Any span near the "Attachment" label that looks like a filename
      popup.locator('span:has-text(".xlsx"), span:has-text(".pdf"), span:has-text(".csv"), span:has-text(".msg"), span:has-text(".doc")'),
      // Clickable link inside attachment area
      popup.locator('[class*="attachment"] a, [class*="download"] a'),
    ];

    const result = await this.tryDownload(popupAttachmentLocators.map(l => l), "attribute popup");
    await this.captureToaster("after popup download");
    return result;
  }

  /**
   * Closes the attribute suppress/enrich popup via CANCEL button.
   */
  async closeAttributePopup(): Promise<void> {
    this.initAttachmentLocators();
    if (await this.popupCancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.popupCancelBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info("Closed attribute popup via CANCEL");
    } else {
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(1000);
      logger.info("Closed attribute popup via Escape");
    }
  }

  /**
   * Returns the count of visible attribute suppress/enrich icons in the drawer.
   */
  async getAttributeIconCount(): Promise<{ orange: number; blue: number; enriched: number; enrich: number; suppressedSvg: number; enrichedSvg: number }> {
    this.initAttachmentLocators();
    return {
      orange: await this.orangeHandIcon.count(),
      blue: await this.blueHandIcon.count(),
      enriched: await this.enrichedIcon.count(),
      enrich: await this.enrichIcon.count(),
      suppressedSvg: await this.attrSuppressedSvg.count(),
      enrichedSvg: await this.attrEnrichedSvg.count(),
    };
  }

  /**
   * Checks if an attachment is visible in the RECORD DETAILS view.
   * Confirmed selector: .attachment-field
   */
  async isAttachmentVisible(): Promise<boolean> {
    this.initAttachmentLocators();
    if (await this.attachmentField.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      return true;
    }
    if (await this.attachmentFieldSpan.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }
    // Also check for row attachment icons in enrichment details
    if (await this.rowAttachmentIcons.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }
    return false;
  }

  /**
   * Scans the enrichment/suppress details table for rows with attachment icons.
   * Clicks each attachment icon and attempts download.
   * Returns array of download results.
   */
  async downloadAllAttachmentsFromDetails(): Promise<{ filename: string; size: number; displayedName: string; filenameMatch: boolean }[]> {
    this.initAttachmentLocators();
    const downloads: { filename: string; size: number; displayedName: string; filenameMatch: boolean }[] = [];

    // First try .attachment-field (record suppress view)
    const fieldResult = await this.tryDownload([this.attachmentFieldSpan, this.attachmentField], "attachment-field");
    if (fieldResult) downloads.push(fieldResult);

    // Then try row attachment icons (enrichment details view)
    const iconCount = await this.rowAttachmentIcons.count();
    logger.info(`Row attachment icons found: ${iconCount}`);

    for (let i = 0; i < iconCount; i++) {
      const icon = this.rowAttachmentIcons.nth(i);
      if (!(await icon.isVisible().catch(() => false))) continue;

      const text = await icon.evaluate(el => {
        const row = el.closest('tr');
        return row ? row.textContent?.trim().substring(0, 80) : el.textContent?.trim().substring(0, 40);
      }).catch(() => "");
      logger.info(`Clicking row attachment icon ${i}: row="${text}"`);

      try {
        await icon.scrollIntoViewIfNeeded();
        const [download] = await Promise.all([
          this.page.waitForEvent("download", { timeout: 10000 }),
          icon.click(),
        ]);
        const filename = download.suggestedFilename();
        const tmpPath = await download.path();
        const size = tmpPath ? (await import("fs")).statSync(tmpPath).size : 0;
        logger.info(`Downloaded from row icon ${i}: ${filename} (${size} bytes)`);
        downloads.push({ filename, size });
        await this.captureToaster(`row-icon-${i}`);
      } catch {
        logger.warn(`Row icon ${i} didn't trigger download — may open popup instead`);
        await this.captureToaster(`row-icon-${i}-fail`);

        // Check if a popup opened (the icon might open the attribute details popup)
        const popup = this.page.locator('[role="presentation"].facct-modal').last();
        if (await popup.isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info(`Popup opened from row icon ${i} — trying popup attachment download`);
          const popupResult = await this.downloadAttachmentFromPopup();
          if (popupResult) downloads.push(popupResult);
          await this.closeAttributePopup();
        }
      }
    }

    // Also scan for any other downloadable links/spans in the drawer
    const drawer = this.page.locator('.facct-drawer-paper').first();
    const allDownloadableSelectors = [
      '.download-audit-link',
      'a[download]',
      'a[href*="blob"]',
      '[class*="attachment"] span',
      '[class*="download"] span',
    ];
    for (const sel of allDownloadableSelectors) {
      const els = drawer.locator(sel);
      const count = await els.count();
      for (let i = 0; i < count; i++) {
        const el = els.nth(i);
        if (!(await el.isVisible().catch(() => false))) continue;
        const elText = await el.textContent().catch(() => "");
        // Skip if we already downloaded this file
        if (downloads.some(d => elText?.includes(d.filename))) continue;

        logger.info(`Trying additional download: "${elText?.trim().substring(0, 60)}" (${sel})`);
        try {
          const [download] = await Promise.all([
            this.page.waitForEvent("download", { timeout: 8000 }),
            el.click(),
          ]);
          const filename = download.suggestedFilename();
          const tmpPath = await download.path();
          const size = tmpPath ? (await import("fs")).statSync(tmpPath).size : 0;
          logger.info(`Downloaded: ${filename} (${size} bytes)`);
          downloads.push({ filename, size });
          await this.captureToaster(`additional-${sel}`);
        } catch {
          continue;
        }
      }
    }

    logger.info(`Total attachments downloaded from details: ${downloads.length}`);
    return downloads;
  }

  /**
   * Scans the entire drawer and logs all potentially clickable/downloadable elements.
   * For diagnostics — call this to understand what's available.
   */
  async scanAllDownloadableElements(): Promise<void> {
    this.initAttachmentLocators();
    const drawer = this.page.locator('.facct-drawer-paper').first();

    const elements = await drawer.evaluate(d => {
      const found: any[] = [];
      // All SVGs with data-testid
      d.querySelectorAll('svg[data-testid]').forEach(svg => {
        found.push({
          type: 'svg', testId: svg.getAttribute('data-testid'),
          title: svg.getAttribute('title') || (svg.parentElement as HTMLElement)?.title || '',
          parentTag: svg.parentElement?.tagName,
          parentClass: svg.parentElement?.className?.toString().substring(0, 60) || '',
          visible: (svg as unknown as HTMLElement).offsetParent !== null,
        });
      });
      // All elements with attachment/download/file classes
      d.querySelectorAll('[class*="attachment"], [class*="download"], [class*="file"]').forEach(el => {
        found.push({
          type: 'class-match', tag: el.tagName,
          class: el.className?.toString().substring(0, 80),
          text: el.textContent?.trim().substring(0, 60),
          visible: (el as HTMLElement).offsetParent !== null,
        });
      });
      // All clickable elements in the last column of table rows (the file icons)
      d.querySelectorAll('table tbody tr td:last-child').forEach((td, i) => {
        const svgs = td.querySelectorAll('svg');
        const buttons = td.querySelectorAll('button');
        const links = td.querySelectorAll('a');
        if (svgs.length > 0 || buttons.length > 0 || links.length > 0) {
          found.push({
            type: 'last-col', rowIndex: i,
            svgCount: svgs.length,
            svgTestIds: Array.from(svgs).map(s => s.getAttribute('data-testid')).filter(Boolean),
            buttonCount: buttons.length,
            linkCount: links.length,
            html: td.innerHTML.substring(0, 200),
          });
        }
      });
      return found;
    }).catch(() => []);

    logger.info(`Scannable elements in drawer: ${elements.length}`);
    for (const el of elements) {
      logger.info(`  ${JSON.stringify(el)}`);
    }
  }

  /**
   * Internal: tries each locator in order to trigger a download event.
   * If download event doesn't fire, captures toaster/error/new-tab info for debugging.
   */
  private async tryDownload(
    locators: Locator[],
    context: string
  ): Promise<{ filename: string; size: number; displayedName: string; filenameMatch: boolean } | null> {
    for (const locator of locators) {
      const count = await locator.count();
      if (count === 0) continue;

      for (let i = 0; i < count; i++) {
        const el = locator.nth(i);
        if (!(await el.isVisible().catch(() => false))) continue;

        // Capture the visible filename text BEFORE clicking
        const displayedText = (await el.textContent().catch(() => "") || "").trim();
        logger.info(`Trying download from ${context}: "${displayedText.substring(0, 60)}"`);

        // Capture page count before click (to detect new tab)
        const pagesBefore = this.page.context().pages().length;

        try {
          const [download] = await Promise.all([
            this.page.waitForEvent("download", { timeout: 10000 }),
            el.click(),
          ]);
          const filename = download.suggestedFilename();
          const tmpPath = await download.path();
          const size = tmpPath ? (await import("fs")).statSync(tmpPath).size : 0;
          logger.info(`Downloaded from ${context}: ${filename} (${size} bytes)`);

          // Verify filename matches what was displayed on the UI
          const displayedClean = displayedText.replace(/^\s*📎\s*/, "").trim();
          let filenameMatch = false;
          if (displayedClean && filename) {
            filenameMatch = filename === displayedClean ||
              filename.includes(displayedClean) ||
              displayedClean.includes(filename);
            if (filenameMatch) {
              logger.info(`✅ Filename match: displayed="${displayedClean}" downloaded="${filename}"`);
            } else {
              logger.warn(`❌ Filename MISMATCH: displayed="${displayedClean}" downloaded="${filename}"`);
            }
          } else {
            // No displayed text to compare — skip match check
            filenameMatch = true;
            logger.info(`Filename: "${filename}" (no displayed text to compare)`);
          }

          return { filename, size, displayedName: displayedClean, filenameMatch };
        } catch (dlErr) {
          // Download event didn't fire — capture what happened instead
          logger.warn(`Download event not triggered from ${context} (element ${i}): ${dlErr}`);

          // Check for toaster / alert messages
          try {
            const alerts = await this.page.locator('[role="alert"], .MuiSnackbar-root, [class*="notistack"]').allTextContents();
            if (alerts.length > 0) {
              const alertTexts = alerts.map(a => a.trim().substring(0, 120)).filter(a => a);
              logger.warn(`  Toaster/alerts after click: ${JSON.stringify(alertTexts)}`);
            }
          } catch { /* ignore */ }

          // Check if a new tab/page opened (file might open in new tab instead of downloading)
          const pagesAfter = this.page.context().pages().length;
          if (pagesAfter > pagesBefore) {
            const newPage = this.page.context().pages()[pagesAfter - 1];
            const newUrl = newPage.url();
            logger.warn(`  New tab opened after click: ${newUrl.substring(0, 150)}`);
            // Try to get the content/filename from the new tab
            try {
              const title = await newPage.title().catch(() => "");
              logger.warn(`  New tab title: "${title}"`);
            } catch { /* ignore */ }
            // Close the new tab
            await newPage.close().catch(() => {});
          }

          // Check for error messages in the drawer
          try {
            const errorEls = await this.page.locator('.facct-drawer-paper .MuiAlert-message, .facct-drawer-paper [class*="error"]').allTextContents();
            if (errorEls.length > 0) {
              logger.warn(`  Error elements in drawer: ${JSON.stringify(errorEls.map(e => e.trim().substring(0, 100)))}`);
            }
          } catch { /* ignore */ }

          // Log the element's HTML for debugging
          try {
            const outerHtml = await el.evaluate(e => e.outerHTML.substring(0, 300));
            logger.warn(`  Element HTML: ${outerHtml}`);
          } catch { /* ignore */ }

          // Log the element's parent structure
          try {
            const parentInfo = await el.evaluate(e => {
              const p = e.parentElement;
              return {
                parentTag: p?.tagName || "",
                parentClass: p?.className?.toString().substring(0, 80) || "",
                parentId: p?.id || "",
                childCount: p?.children.length || 0,
                siblings: Array.from(p?.children || []).map(c => ({
                  tag: c.tagName,
                  class: c.className?.toString().substring(0, 40) || "",
                  text: c.textContent?.trim().substring(0, 40) || "",
                })),
              };
            });
            logger.warn(`  Parent: <${parentInfo.parentTag}> class="${parentInfo.parentClass}" id="${parentInfo.parentId}" children=${parentInfo.childCount}`);
            for (const sib of parentInfo.siblings) {
              logger.warn(`    <${sib.tag}> class="${sib.class}" text="${sib.text}"`);
            }
          } catch { /* ignore */ }

          continue;
        }
      }
    }
    logger.warn(`No downloadable attachment found in ${context}`);
    return null;
  }

  // ==================== Validation ====================

  /**
   * Checks for version conflict error after stale action.
   * Actual error: "The record has been updated, please update your changes using the latest version"
   */
  async hasVersionConflictError(): Promise<boolean> {
    const conflictSelectors = [
      'text=The record has been updated',
      'text=please update your changes using the latest version',
      'text=version conflict',
      'text=Version conflict',
      'text=has been modified',
      'text=has been updated',
      'text=already been modified',
      'text=latest version',
      '[role="alert"]:has-text("updated")',
      '[role="alert"]:has-text("conflict")',
      '[role="alert"]:has-text("modified")',
      '[role="alert"]:has-text("latest version")',
      '.MuiAlert-message:has-text("updated")',
      '.MuiAlert-message:has-text("conflict")',
      '.MuiAlert-message:has-text("modified")',
      '.MuiAlert-message:has-text("latest version")'
    ];

    for (const selector of conflictSelectors) {
      const isVisible = await this.page.locator(selector).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) {
        const text = await this.page.locator(selector).first().textContent().catch(() => selector);
        logger.info(`Version conflict error detected: "${text?.trim().substring(0, 100)}"`);
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if the action proceeded normally (no conflict error).
   */
  async hasActionSucceeded(): Promise<boolean> {
    const successSelectors = [
      '[role="alert"]:has-text("success")',
      'text=submitted successfully',
      'text=request submitted',
      '.MuiAlert-message:has-text("success")'
    ];

    for (const selector of successSelectors) {
      const isVisible = await this.page.locator(selector).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) {
        logger.info("Action succeeded");
        return true;
      }
    }
    return false;
  }

  // ==================== Helper Methods ====================

  /**
   * Selects value(s) from a MUI Select dropdown by its ID.
   * @param selectId - CSS selector for the MUI Select trigger (e.g., "#mui-component-select-tags")
   * @param values - Array of option text values to select
   * @param isMulti - If true, selects multiple values without closing between selections
   */
  /**
   * Selects value(s) from a MUI Select dropdown by its ID.
   * Handles both standard MUI Select (tags) and facct-dropdown-v2 (reason, reviewPeriod).
   * @param selectId - CSS selector for the MUI Select trigger (e.g., "#mui-component-select-tags")
   * @param values - Array of option text values to select
   * @param isMulti - If true, selects multiple values without closing between selections
   */
  private async selectMuiDropdown(selectId: string, values: string[], isMulti: boolean = false): Promise<void> {
    const selectTrigger = this.page.locator(selectId).first();
    await selectTrigger.waitFor({ state: "visible", timeout: 5000 });

    // Click the select trigger — try the parent MuiInputBase-root if direct click doesn't open a listbox
    await selectTrigger.click();
    await this.page.waitForTimeout(1000);

    // Check if a listbox/menu appeared
    let optionsVisible = await this.page.locator('[role="listbox"] [role="option"], .MuiMenu-list [role="option"]').first().isVisible({ timeout: 2000 }).catch(() => false);

    if (!optionsVisible) {
      // Try clicking the parent input wrapper instead
      const parentInput = selectTrigger.locator('xpath=ancestor::div[contains(@class, "MuiInputBase-root")]').first();
      if (await parentInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await parentInput.click();
        await this.page.waitForTimeout(1000);
        optionsVisible = await this.page.locator('[role="listbox"] [role="option"], .MuiMenu-list [role="option"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      }
    }

    if (!optionsVisible) {
      logger.warn(`No dropdown options appeared for ${selectId}, selecting first available option`);
      // Try one more time with force click
      await selectTrigger.click({ force: true });
      await this.page.waitForTimeout(1500);
    }

    for (const value of values) {
      const option = this.page.locator(
        `[role="option"]:has-text("${value}"), ` +
        `li[role="option"]:has-text("${value}"), ` +
        `.MuiMenuItem-root:has-text("${value}")`
      ).first();

      const optionExists = await option.isVisible({ timeout: 3000 }).catch(() => false);
      if (optionExists) {
        await option.click();
        await this.page.waitForTimeout(300);
      } else {
        // Fallback: select the first available option
        logger.warn(`Option "${value}" not found for ${selectId}, selecting first available`);
        const firstOption = this.page.locator('[role="option"], .MuiMenuItem-root').first();
        if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await firstOption.click();
          await this.page.waitForTimeout(300);
        }
      }
    }

    // Close the dropdown
    if (isMulti) {
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(300);
    }

    logger.info(`Selected ${selectId}: ${values.join(", ")}`);
  }

  /**
   * Selects a value from a facct-dropdown-v2 (custom dropdown with search box).
   * Structure: span.single-select-option elements inside div.single-select-menu
   * Used for Reason and Review Period fields.
   */
  private async selectFacctDropdown(fieldName: string, value: string): Promise<void> {
    const trigger = this.page.locator(`#mui-component-select-${fieldName}`).first();
    await trigger.waitFor({ state: "visible", timeout: 5000 });
    await trigger.click();
    await this.page.waitForTimeout(1500);

    // The facct-dropdown-v2 renders span.single-select-option items
    const option = this.page.locator(`span.single-select-option:has-text("${value}")`).first();
    const optionVisible = await option.isVisible({ timeout: 3000 }).catch(() => false);

    if (optionVisible) {
      await option.click();
      await this.page.waitForTimeout(500);
      logger.info(`Selected ${fieldName}: ${value}`);
    } else {
      // Try using the search box to filter
      const searchInput = this.page.locator('.filter-text-input[placeholder="Search"]').last();
      const searchVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (searchVisible) {
        await searchInput.fill(value.substring(0, 15));
        await this.page.waitForTimeout(500);
        const filteredOption = this.page.locator(`span.single-select-option`).first();
        if (await filteredOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await filteredOption.click();
          await this.page.waitForTimeout(500);
          logger.info(`Selected ${fieldName}: ${value} (via search)`);
          return;
        }
      }
      // Fallback: select first available option
      logger.warn(`Option "${value}" not found for ${fieldName}, selecting first available`);
      const firstOption = this.page.locator('span.single-select-option').first();
      if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOption.click();
        await this.page.waitForTimeout(500);
      } else {
        await this.page.keyboard.press("Escape");
      }
    }
  }

  /**
   * Enters text in the comment field.
   */
  private async enterComment(comment: string): Promise<void> {
    const commentField = this.page.locator(
      '#hold-enrich-comment--1, textarea[placeholder="Comment"]'
    ).first();
    await commentField.waitFor({ state: "visible", timeout: 5000 });
    await commentField.fill(comment.substring(0, 200));
    logger.info("Entered comment");
  }

  /**
   * Uploads an attachment file.
   */
  private async uploadAttachment(filePath: string): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: "attached", timeout: 5000 });
    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(1000);
    logger.info(`Uploaded attachment: ${filePath}`);
  }

  /**
   * Closes the profile view panel.
   */
  async closeProfileView(): Promise<void> {
    // Try the stable footer close button first
    const closeBtn = this.page.locator('#lseg-footer-close-btn');
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info("Closed profile view");
      return;
    }
    // Fallback: task footer close (approver view)
    const taskCloseBtn = this.page.locator('#task-footer-close-btn');
    if (await taskCloseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await taskCloseBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info("Closed profile view (task footer)");
      return;
    }
    // Fallback: X icon in drawer header
    const closeIcon = this.page.locator('[data-testid="CloseIcon"]').first();
    if (await closeIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeIcon.click();
      await this.page.waitForTimeout(1000);
      logger.info("Closed profile view (X icon)");
      return;
    }
    // Last resort: Escape
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(1000);
    logger.info("Closed profile view (Escape)");
  }
}
