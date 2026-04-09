import { Locator, Page } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";
import * as path from "path";

export class ListManagementPage {
  private actions: PlaywrightActions;

  // Locators using CSS selectors
  private watchlistDropdown: Locator;
  private internalListOption: Locator;
  private addRecordBtn: Locator;
  private bulkRecordsMenuItem: Locator;
  private singleRecordMenuItem: Locator;
  private fileInput: Locator;
  private commentsTextarea: Locator;
  private submitForApprovalBtn: Locator;
  private cancelBtn: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);

    // Initialize locators with CSS selectors
    this.watchlistDropdown = page.locator('span.MuiListItemText-primary:has-text("Watchlist")');
    this.internalListOption = page.locator('[aria-label="Internal list"]');
    this.addRecordBtn = page.locator('#internal-list-record-view-add-records-btn');
    this.bulkRecordsMenuItem = page.locator('.MuiMenuItem-root:has-text("Bulk records")');
    this.singleRecordMenuItem = page.locator('.MuiMenuItem-root:has-text("Single record")');
    this.fileInput = page.locator('input[type="file"][accept=".xlsx"]');
    this.commentsTextarea = page.locator('#bulk-records-view-comments');
    this.submitForApprovalBtn = page.locator('button:has-text("SUBMIT FOR APPROVAL")');
    this.cancelBtn = page.locator('button:has-text("CANCEL")');
  }

  async clickWatchlistDropdown(): Promise<void> {
    await this.watchlistDropdown.waitFor({ state: "visible", timeout: 15000 });
    await this.watchlistDropdown.click();
    // Wait for submenu to expand
    await this.page.locator('.MuiCollapse-entered').waitFor({ state: "visible", timeout: 5000 });
    logger.info("Clicked on Watchlist dropdown");
  }

  async clickInternalList(): Promise<void> {
    await this.internalListOption.waitFor({ state: "visible", timeout: 10000 });
    await this.internalListOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked on Internal List (IBL)");
  }

  async searchAndSelectList(listName: string): Promise<void> {
    // Wait for the list table to load
    await this.page.waitForLoadState("networkidle");
    
    // Click on the list item using aria-label
    const listItem = this.page.locator(`[aria-label="${listName}"]`);
    await listItem.waitFor({ state: "visible", timeout: 15000 });
    await listItem.click();
    
    // Wait for list details to load - ADD RECORDS button should appear
    await this.addRecordBtn.waitFor({ state: "visible", timeout: 15000 });
    await this.page.waitForLoadState("networkidle");
    
    logger.info(`Selected list: ${listName}`);
  }

  async clickAddRecord(): Promise<void> {
    await this.addRecordBtn.waitFor({ state: "visible", timeout: 15000 });
    await this.addRecordBtn.click();
    
    // Wait for dropdown menu to appear
    await this.page.locator('ul[role="menu"]').waitFor({ state: "visible", timeout: 5000 });
    logger.info("Clicked on Add Record button");
  }

  async selectBulkUploadOption(): Promise<void> {
    // Wait for menu to be visible
    await this.page.locator('ul[role="menu"]').waitFor({ state: "visible", timeout: 5000 });
    
    // Log available menu items for debugging
    const menuItems = await this.page.locator('ul[role="menu"] .MuiMenuItem-root').allTextContents();
    logger.info(`Available menu items: ${menuItems.join(", ")}`);
    
    // Click on Bulk records
    await this.bulkRecordsMenuItem.click();
    
    // Wait for bulk upload drawer to appear
    await this.page.locator('.facct-drawer-paper').waitFor({ state: "visible", timeout: 10000 });
    logger.info("Selected Bulk records option");
  }

  async uploadFile(filePath: string): Promise<void> {
    // Resolve absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Wait for file input to be present (it's hidden but attached)
    await this.fileInput.waitFor({ state: "attached", timeout: 10000 });
    await this.fileInput.setInputFiles(absolutePath);
    
    // Wait for file to be processed
    await this.page.waitForTimeout(2000);
    logger.info(`Uploaded file: ${absolutePath}`);
  }

  async enterBulkComments(comments: string): Promise<void> {
    await this.commentsTextarea.waitFor({ state: "visible", timeout: 10000 });
    await this.commentsTextarea.fill(comments);
    logger.info("Entered bulk upload comments");
  }

  async clickSubmitForApproval(): Promise<void> {
    await this.submitForApprovalBtn.waitFor({ state: "visible", timeout: 10000 });
    await this.submitForApprovalBtn.click();
    
    // Wait for submission to process
    await this.page.waitForTimeout(3000);
    logger.info("Clicked Submit for Approval button");
  }

  async clickCancel(): Promise<void> {
    await this.cancelBtn.waitFor({ state: "visible", timeout: 10000 });
    await this.cancelBtn.click();
    logger.info("Clicked Cancel button");
  }

  async performBulkUpload(filePath: string, comments: string = "Bulk upload - Automated test"): Promise<void> {
    await this.selectBulkUploadOption();
    await this.uploadFile(filePath);
    await this.enterBulkComments(comments);
    await this.clickSubmitForApproval();
    logger.info("Bulk upload completed");
  }
}
