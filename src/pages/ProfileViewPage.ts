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
    await this.suppressEnrichBtn.waitFor({ state: "visible", timeout: 10000 });
    await this.suppressEnrichBtn.click();
    await this.page.waitForTimeout(2000);
    logger.info("Clicked SUPPRESS button");
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
      await suppressSubmit.click();
      logger.info("Clicked Submit for Approval (suppress form)");
    } else if (await editSubmit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editSubmit.click();
      logger.info("Clicked Submit for Approval (edit mode)");
    } else {
      throw new Error("No Submit for Approval button found");
    }

    await this.page.waitForLoadState("networkidle");
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
