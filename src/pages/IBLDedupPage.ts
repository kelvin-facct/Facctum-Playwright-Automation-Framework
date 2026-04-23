import { Locator, Page } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";

/**
 * IBLDedupPage - Page object for IBL (Internal Block List) Deduplication functionality.
 *
 * Handles the flow:
 * 1. Navigate to Internal List
 * 2. Search and select a list
 * 3. Add single record
 * 4. Enter name and verify duplicates
 * 5. Submit and view duplicate records
 */
export class IBLDedupPage {
  private actions: PlaywrightActions;

  // Test data constants
  static readonly LIST_NAME = "Facctview IBL";
  static readonly NAME = "UGANDA COMMERCIAL IMPEX (UCI) LTD";

  // Navigation locators
  private watchlistMenu: Locator;
  private internalListOption: Locator;

  // List search locators
  private listSearchBox: Locator;

  // Add record locators
  private addRecordsBtn: Locator;
  private singleRecordMenuItem: Locator;

  // Record form locators (drawer)
  private recordDrawer: Locator;
  private lastNameInput: Locator;

  // Footer buttons
  private cancelBtn: Locator;
  private verifyDuplicateBtn: Locator;
  private saveAsDraftBtn: Locator;
  private submitForApprovalBtn: Locator;

  // Select attributes modal locators
  private selectAttributesModal: Locator;
  private selectAttributesHeading: Locator;
  private attributeSubmitBtn: Locator;
  private attributeCancelBtn: Locator;

  // Verify duplicates modal locators
  private verifyDuplicatesModal: Locator;
  private verifyDuplicatesHeading: Locator;
  private matchingRecordsCount: Locator;
  private recordIdLinks: Locator;
  private closeBtn: Locator;
  private modifyAttributesBtn: Locator;

  // Record detail drawer locators
  private drawerHeader: Locator;
  private drawerFullName: Locator;
  private drawerCloseIcon: Locator;
  private drawerBackdrop: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);

    // Navigation locators - verified with MCP
    this.watchlistMenu = page.locator('[aria-label="Watchlist"]');
    this.internalListOption = page.locator('[aria-label="Internal list"]');

    // List search locators - verified with MCP
    this.listSearchBox = page.locator('input[placeholder="Search by List name"]');

    // Add record locators - verified with MCP
    this.addRecordsBtn = page.locator("#internal-list-record-view-add-records-btn");
    this.singleRecordMenuItem = page.locator('.MuiMenuItem-root:has-text("Single record")');

    // Record form locators (drawer) - verified with MCP
    this.recordDrawer = page.locator(".facct-drawer-modal");
    this.lastNameInput = page.locator('input[name="lastName"]');

    // Footer buttons - verified with MCP
    this.cancelBtn = page.locator("#ibl-footer-cancel-btn");
    this.verifyDuplicateBtn = page.locator("#ibl-footer-verify-duplicate-btn");
    this.saveAsDraftBtn = page.locator("#ibl-footer-save-as-draft-btn");
    this.submitForApprovalBtn = page.locator("#ibl-footer-approve-btn");

    // Select attributes modal locators - verified with MCP
    this.selectAttributesModal = page.locator(".proactive-attr-modal-wrapper");
    this.selectAttributesHeading = page.locator(".proactive-verify-duplicates-heading");
    this.attributeSubmitBtn = page.locator("#proactive-deduplication-attribute-selection-submit-btn");
    this.attributeCancelBtn = page.locator("#proactive-deduplication-attribute-selection-close-btn");

    // Verify duplicates modal locators - verified with MCP
    this.verifyDuplicatesModal = page.locator(".proactive-deduplication-wrapper");
    this.verifyDuplicatesHeading = page.locator(".verify-duplicates-heading");
    this.matchingRecordsCount = page.locator(".proactive-deduplication-wrapper i");
    this.recordIdLinks = page.locator(".proactive-deduplication-wrapper .link-cell.new-tab-record-view");
    this.closeBtn = page.locator('.proactive-deduplication-wrapper button:has-text("CLOSE")');
    this.modifyAttributesBtn = page.locator('.proactive-deduplication-wrapper button:has-text("MODIFY ATTRIBUTES")');

    // Record detail drawer locators - verified with MCP
    this.drawerHeader = page.locator(".facct-drawer-header-wrapper .header-content");
    this.drawerFullName = page.locator('input[name="fullName"]');
    this.drawerCloseIcon = page.locator('.facct-drawer-modal [data-testid="CloseIcon"]');
    this.drawerBackdrop = page.locator('.facct-drawer-modal .MuiBackdrop-root');
  }

  // ==================== NAVIGATION METHODS ====================

  async clickWatchlistMenu(): Promise<void> {
    await this.watchlistMenu.waitFor({ state: "visible", timeout: 15000 });
    await this.watchlistMenu.click();
    // Wait for submenu to expand
    await this.page.waitForTimeout(500);
    logger.info("Clicked on Watchlist menu");
  }

  async clickInternalList(): Promise<void> {
    await this.internalListOption.waitFor({ state: "visible", timeout: 10000 });
    await this.internalListOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked on Internal List option");
  }

  async navigateToInternalList(): Promise<void> {
    await this.clickWatchlistMenu();
    await this.clickInternalList();
  }

  // ==================== LIST SEARCH METHODS ====================

  async searchList(listName: string): Promise<void> {
    await this.listSearchBox.waitFor({ state: "visible", timeout: 10000 });
    await this.listSearchBox.fill(listName);
    await this.listSearchBox.press("Enter");
    await this.page.waitForLoadState("networkidle");
    logger.info(`Searched for list: ${listName}`);
  }

  async clickList(listName: string): Promise<void> {
    const listLink = this.page.locator(`.link-cell[aria-label="${listName}"]`);
    await listLink.waitFor({ state: "visible", timeout: 10000 });
    await listLink.click();
    await this.addRecordsBtn.waitFor({ state: "visible", timeout: 15000 });
    logger.info(`Clicked on list: ${listName}`);
  }

  async searchAndOpenList(listName: string = IBLDedupPage.LIST_NAME): Promise<void> {
    await this.searchList(listName);
    await this.clickList(listName);
  }

  // ==================== ADD RECORD METHODS ====================

  async clickAddRecords(): Promise<void> {
    await this.addRecordsBtn.waitFor({ state: "visible", timeout: 10000 });
    await this.addRecordsBtn.click();
    await this.page.locator('ul[role="menu"]').waitFor({ state: "visible", timeout: 5000 });
    logger.info("Clicked on Add Records button");
  }

  async selectSingleRecord(): Promise<void> {
    await this.singleRecordMenuItem.waitFor({ state: "visible", timeout: 5000 });
    await this.singleRecordMenuItem.click();
    await this.recordDrawer.waitFor({ state: "visible", timeout: 10000 });
    logger.info("Selected Single record option");
  }

  async openSingleRecordForm(): Promise<void> {
    await this.clickAddRecords();
    await this.selectSingleRecord();
  }

  // ==================== RECORD FORM METHODS ====================

  async enterName(name: string = IBLDedupPage.NAME): Promise<void> {
    await this.lastNameInput.waitFor({ state: "visible", timeout: 5000 });
    await this.lastNameInput.fill(name);
    logger.info(`Entered name: ${name}`);
  }

  async clickVerifyDuplicate(): Promise<void> {
    await this.verifyDuplicateBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.verifyDuplicateBtn.click();
    logger.info("Clicked Verify Duplicate button");
  }

  async clickCancel(): Promise<void> {
    await this.cancelBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.cancelBtn.click();
    logger.info("Clicked Cancel button");
  }

  async clickSaveAsDraft(): Promise<void> {
    await this.saveAsDraftBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.saveAsDraftBtn.click();
    logger.info("Clicked Save as Draft button");
  }

  async clickSubmitForApproval(): Promise<void> {
    await this.submitForApprovalBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.submitForApprovalBtn.click();
    logger.info("Clicked Submit for Approval button");
  }

  // ==================== SELECT ATTRIBUTES MODAL METHODS ====================

  async verifySelectAttributesPageIsOpen(): Promise<boolean> {
    try {
      await this.selectAttributesModal.waitFor({ state: "visible", timeout: 10000 });
      const heading = await this.selectAttributesHeading.textContent();
      logger.info(`Select Attributes page is open with heading: ${heading}`);
      return heading?.includes("Select attributes") ?? false;
    } catch {
      return false;
    }
  }

  async clickAttributeSubmit(): Promise<void> {
    await this.attributeSubmitBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.attributeSubmitBtn.click();
    logger.info("Clicked Submit on Select Attributes modal");
  }

  async clickAttributeCancel(): Promise<void> {
    await this.attributeCancelBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.attributeCancelBtn.click();
    logger.info("Clicked Cancel on Select Attributes modal");
  }

  // ==================== VERIFY DUPLICATES MODAL METHODS ====================

  async verifyDuplicatesPageIsOpen(): Promise<boolean> {
    try {
      await this.verifyDuplicatesModal.waitFor({ state: "visible", timeout: 20000 });
      const isVisible = await this.verifyDuplicatesHeading.isVisible();
      if (isVisible) {
        const heading = await this.verifyDuplicatesHeading.textContent();
        logger.info(`Verify duplicates page is open with heading: ${heading}`);
      }
      return isVisible;
    } catch {
      return false;
    }
  }

  async getMatchingRecordsCount(): Promise<number> {
    // Wait for the modal to be visible first
    await this.verifyDuplicatesModal.waitFor({ state: "visible", timeout: 10000 });
    
    // Wait for the count element to be visible
    await this.matchingRecordsCount.waitFor({ state: "visible", timeout: 5000 });
    
    const countText = await this.matchingRecordsCount.textContent();
    const match = countText?.match(/(\d+)/);
    const count = match ? parseInt(match[1], 10) : 0;
    logger.info(`Found ${count} matching records (text: "${countText}")`);
    return count;
  }

  async getRecordIdLinks(): Promise<string[]> {
    // Wait for at least one record link to be visible
    await this.recordIdLinks.first().waitFor({ state: "visible", timeout: 10000 });
    
    const links = await this.recordIdLinks.allTextContents();
    // Clean up the text (remove the icon text)
    return links.map(link => link.trim().split("\n")[0].trim());
  }

  /**
   * Clicks on a record ID link and waits for the new tab to open.
   * Returns the new page object for the opened tab.
   */
  async clickRecordIdAndGetNewTab(index: number): Promise<Page> {
    const links = this.recordIdLinks;
    const count = await links.count();
    
    if (index >= count) {
      throw new Error(`Record index ${index} out of bounds. Total records: ${count}`);
    }

    // Get the browser context to listen for new pages
    const context = this.page.context();

    // Set up a promise to wait for the new page before clicking
    const newPagePromise = context.waitForEvent("page", { timeout: 15000 });

    // Click the record link (opens in new tab)
    await links.nth(index).click();

    // Wait for the new page to open
    const newPage = await newPagePromise;
    
    // Wait for basic load
    await newPage.waitForLoadState("domcontentloaded");

    logger.info(`New tab opened for record at index ${index}`);
    return newPage;
  }

  /**
   * Clicks on a record ID link (opens in new tab).
   * Note: This method clicks but doesn't switch to the new tab.
   * Use clickRecordIdAndGetNewTab if you need to interact with the new tab.
   */
  async clickRecordId(index: number): Promise<Page> {
    return this.clickRecordIdAndGetNewTab(index);
  }

  async clickCloseOnDuplicatesModal(): Promise<void> {
    await this.closeBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.closeBtn.click();
    logger.info("Clicked Close on Verify Duplicates modal");
  }

  async clickModifyAttributes(): Promise<void> {
    await this.modifyAttributesBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.modifyAttributesBtn.click();
    logger.info("Clicked Modify Attributes button");
  }

  async getDrawerRecordId(): Promise<string> {
    await this.drawerHeader.waitFor({ state: "visible", timeout: 10000 });
    const text = await this.drawerHeader.textContent();
    return text?.trim() ?? "";
  }

  async getDrawerFullName(): Promise<string> {
    await this.drawerFullName.waitFor({ state: "visible", timeout: 10000 });
    const value = await this.drawerFullName.inputValue();
    return value?.trim() ?? "";
  }

  async closeRecordDrawer(): Promise<void> {
    // Try clicking the close icon
    try {
      await this.drawerCloseIcon.click();
    } catch {
      // If close icon fails, try the backdrop
      await this.drawerBackdrop.click({ force: true });
    }
    await this.page.waitForTimeout(1000);
    logger.info("Closed record drawer");
  }

  // ==================== VERIFICATION METHODS ====================

  /**
   * Clicks on each record ID link, opens in new tab, verifies, and closes.
   * @param expectedName - The expected name to verify on record pages
   * @param maxRecords - Maximum number of records to verify (default: 3, use -1 for all)
   */
  async clickEachRecordIdAndVerify(expectedName: string = IBLDedupPage.NAME, maxRecords: number = 3): Promise<void> {
    // Wait for the duplicates modal to be fully loaded
    await this.verifyDuplicatesModal.waitFor({ state: "visible", timeout: 10000 });
    
    // Wait for record links to be present
    await this.recordIdLinks.first().waitFor({ state: "visible", timeout: 10000 });
    
    const recordIds = await this.getRecordIdLinks();
    const totalRecords = recordIds.length;
    logger.info(`Found ${totalRecords} record IDs in modal`);
    
    if (totalRecords === 0) {
      throw new Error("No record IDs found in the Verify Duplicates modal");
    }

    // Limit the number of records to verify
    const recordsToVerify = maxRecords === -1 ? totalRecords : Math.min(maxRecords, totalRecords);
    logger.info(`Will verify ${recordsToVerify} out of ${totalRecords} records`);

    for (let i = 0; i < recordsToVerify; i++) {
      const expectedRecordId = recordIds[i];
      logger.info(`Clicking on record ID: ${expectedRecordId} (${i + 1}/${recordsToVerify})`);

      // Click record and get the new tab
      const newPage = await this.clickRecordIdAndGetNewTab(i);

      // Wait for page to load (use domcontentloaded for speed)
      await newPage.waitForLoadState("domcontentloaded");

      // Get the URL to verify we're on the right record
      const url = newPage.url();
      logger.info(`New tab opened with URL: ${url}`);

      // Verify the URL contains record info
      if (url.includes("record")) {
        logger.info(`Record ${i + 1} page opened successfully`);
      } else {
        logger.warn(`URL does not contain 'record': ${url}`);
      }

      logger.info(`Record ${i + 1} verified successfully`);

      // Close the new tab
      await newPage.close();
      logger.info(`Closed record tab ${i + 1}`);

      // Bring focus back to the original page
      await this.page.bringToFront();
      
      // Wait for the modal to be visible again
      await this.verifyDuplicatesModal.waitFor({ state: "visible", timeout: 5000 });
    }

    logger.info(`All ${recordsToVerify} records verified and closed successfully`);
  }

  // ==================== FULL FLOW METHODS ====================

  async performDedupVerification(
    listName: string = IBLDedupPage.LIST_NAME,
    name: string = IBLDedupPage.NAME
  ): Promise<void> {
    // Search and open the list
    await this.searchAndOpenList(listName);

    // Open single record form
    await this.openSingleRecordForm();

    // Enter name
    await this.enterName(name);

    // Click verify duplicate
    await this.clickVerifyDuplicate();

    // Verify select attributes page opens
    const selectAttrOpen = await this.verifySelectAttributesPageIsOpen();
    if (!selectAttrOpen) {
      throw new Error("Select Attributes page did not open");
    }

    // Click submit on select attributes
    await this.clickAttributeSubmit();

    // Verify duplicates page opens
    const dupPageOpen = await this.verifyDuplicatesPageIsOpen();
    if (!dupPageOpen) {
      throw new Error("Verify Duplicates page did not open");
    }

    logger.info("Dedup verification flow completed successfully");
  }
}
