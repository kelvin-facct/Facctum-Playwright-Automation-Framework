import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * DataExportPage - Page object for FacctList Data Export module.
 *
 * Sub-modules: Templates, Custom Delta, Destination Config, Downloads
 * Flow: FacctList sidebar → Data Export → Sub-module
 */
export class DataExportPage {
  // Navigation
  private dataExportNavItem: Locator;
  private templatesOption: Locator;
  private customDeltaOption: Locator;
  private destinationConfigOption: Locator;
  private downloadsOption: Locator;

  // Templates tab
  private createTemplateBtn: Locator;
  private templateNameInput: Locator;
  private templateTable: Locator;
  private templateRows: Locator;

  // Custom Delta tab
  private createDeltaBtn: Locator;
  private deltaTable: Locator;
  private deltaRows: Locator;
  private baselineDropdown: Locator;
  private comparisonDropdown: Locator;

  // Destination Config tab
  private createDestinationBtn: Locator;
  private destinationTable: Locator;
  private destinationRows: Locator;
  private destinationNameInput: Locator;
  private destinationTypeDropdown: Locator;

  // Downloads tab
  private downloadsTable: Locator;
  private downloadRows: Locator;
  private downloadButton: Locator;
  private refreshButton: Locator;

  // Common
  private searchInput: Locator;
  private tableRows: Locator;
  private noDataMessage: Locator;
  private submitButton: Locator;
  private cancelButton: Locator;
  private deleteButton: Locator;
  private editButton: Locator;

  constructor(private page: Page) {
    // Navigation
    this.dataExportNavItem = page.locator('[aria-label="Data Export"]').first();
    this.templatesOption = page.locator('[aria-label="Templates"]').first();
    this.customDeltaOption = page.locator('[aria-label="Custom Delta"]').first();
    this.destinationConfigOption = page.locator('[aria-label="Destination config"]').first();
    this.downloadsOption = page.locator('[aria-label="Downloads"]').first();

    // Templates
    this.createTemplateBtn = page.locator('button:has-text("CREATE"), button:has-text("Add Template"), #create-template-btn');
    this.templateNameInput = page.locator('#template-name, input[name="templateName"]');
    this.templateTable = page.locator('[class*="template"] table, .template-list table');
    this.templateRows = page.locator('[class*="template"] tbody tr, .template-list tbody tr');

    // Custom Delta
    this.createDeltaBtn = page.locator('button:has-text("CREATE"), button:has-text("Add Delta"), #create-delta-btn');
    this.deltaTable = page.locator('[class*="delta"] table, .delta-list table');
    this.deltaRows = page.locator('[class*="delta"] tbody tr, .delta-list tbody tr');
    this.baselineDropdown = page.locator('#baseline-select, #mui-component-select-baseline');
    this.comparisonDropdown = page.locator('#comparison-select, #mui-component-select-comparison');

    // Destination Config
    this.createDestinationBtn = page.locator('button:has-text("CREATE"), button:has-text("Add Destination"), #create-destination-btn');
    this.destinationTable = page.locator('[class*="destination"] table, .destination-list table');
    this.destinationRows = page.locator('[class*="destination"] tbody tr, .destination-list tbody tr');
    this.destinationNameInput = page.locator('#destination-name, input[name="destinationName"]');
    this.destinationTypeDropdown = page.locator('#destination-type, #mui-component-select-destinationType');

    // Downloads
    this.downloadsTable = page.locator('[class*="download"] table, .downloads-list table');
    this.downloadRows = page.locator('[class*="download"] tbody tr, .downloads-list tbody tr');
    this.downloadButton = page.locator('button:has-text("DOWNLOAD"), [aria-label="Download"]');
    this.refreshButton = page.locator('button:has-text("REFRESH"), [aria-label="Refresh"]');

    // Common
    this.searchInput = page.locator('input[placeholder*="Search"]').first();
    this.tableRows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    this.noDataMessage = page.locator('text=No data, text=No records, [class*="no-data"]');
    this.submitButton = page.locator('button:has-text("SUBMIT"), button:has-text("SAVE"), #submit-btn');
    this.cancelButton = page.locator('button:has-text("CANCEL"), #cancel-btn');
    this.deleteButton = page.locator('button:has-text("DELETE"), [aria-label="Delete"]');
    this.editButton = page.locator('button:has-text("EDIT"), [aria-label="Edit"]');
  }

  // ==================== Navigation ====================

  async navigateToDataExport(): Promise<void> {
    // Always click Data Export to expand its submenu (Templates, Destination config)
    await this.dataExportNavItem.waitFor({ state: "visible", timeout: 15000 });
    await this.dataExportNavItem.click();
    await this.page.waitForTimeout(1000);
    // Wait for sub-items to become visible
    await this.page.locator('[aria-label="Templates"]').first()
      .waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    logger.info("Expanded Data Export menu");
  }

  async navigateToTemplates(): Promise<void> {
    await this.templatesOption.waitFor({ state: "visible", timeout: 10000 });
    await this.templatesOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Templates");
  }

  async navigateToCustomDelta(): Promise<void> {
    await this.customDeltaOption.waitFor({ state: "visible", timeout: 10000 });
    await this.customDeltaOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Custom Delta");
  }

  async navigateToDestinationConfig(): Promise<void> {
    await this.destinationConfigOption.waitFor({ state: "visible", timeout: 10000 });
    await this.destinationConfigOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Destination Config");
  }

  async navigateToDownloads(): Promise<void> {
    await this.downloadsOption.waitFor({ state: "visible", timeout: 10000 });
    await this.downloadsOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Downloads");
  }

  // ==================== Templates ====================

  async getTemplateCount(): Promise<number> {
    return await this.templateRows.count();
  }

  async clickCreateTemplate(): Promise<void> {
    await this.createTemplateBtn.click();
    await this.page.waitForTimeout(1000);
    logger.info("Clicked Create Template");
  }

  async enterTemplateName(name: string): Promise<void> {
    await this.templateNameInput.fill(name);
    logger.info(`Entered template name: ${name}`);
  }

  // ==================== Custom Delta ====================

  async getDeltaCount(): Promise<number> {
    return await this.deltaRows.count();
  }

  async clickCreateDelta(): Promise<void> {
    await this.createDeltaBtn.click();
    await this.page.waitForTimeout(1000);
    logger.info("Clicked Create Delta");
  }

  async selectBaseline(value: string): Promise<void> {
    await this.baselineDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${value}")`).first().click();
    logger.info(`Selected baseline: ${value}`);
  }

  async selectComparison(value: string): Promise<void> {
    await this.comparisonDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${value}")`).first().click();
    logger.info(`Selected comparison: ${value}`);
  }

  // ==================== Destination Config ====================

  async getDestinationCount(): Promise<number> {
    return await this.destinationRows.count();
  }

  async clickCreateDestination(): Promise<void> {
    await this.createDestinationBtn.click();
    await this.page.waitForTimeout(1000);
    logger.info("Clicked Create Destination");
  }

  async enterDestinationName(name: string): Promise<void> {
    await this.destinationNameInput.fill(name);
    logger.info(`Entered destination name: ${name}`);
  }

  async selectDestinationType(type: string): Promise<void> {
    await this.destinationTypeDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${type}")`).first().click();
    logger.info(`Selected destination type: ${type}`);
  }

  // ==================== Downloads ====================

  async getDownloadCount(): Promise<number> {
    return await this.downloadRows.count();
  }

  async clickDownloadAtRow(index: number): Promise<void> {
    const row = this.downloadRows.nth(index);
    await row.locator('[aria-label="Download"], button:has-text("Download"), svg').first().click();
    await this.page.waitForTimeout(2000);
    logger.info(`Clicked download at row ${index}`);
  }

  async refreshDownloads(): Promise<void> {
    await this.refreshButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Refreshed downloads");
  }

  // ==================== Common ====================

  async searchInTable(query: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    await this.page.keyboard.press("Enter");
    await this.page.waitForLoadState("networkidle");
    logger.info(`Searched for: "${query}"`);
  }

  async getTableRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async hasNoData(): Promise<boolean> {
    return await this.noDataMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Submit");
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(500);
    logger.info("Clicked Cancel");
  }

  async isPageLoaded(): Promise<boolean> {
    // Wait for page content to appear — could be a table, a no-data message, or any content area
    const hasTable = await this.tableRows.first().isVisible({ timeout: 10000 }).catch(() => false);
    if (hasTable) return true;
    const hasNoData = await this.noDataMessage.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasNoData) return true;
    // Fallback: check for any content container
    const hasContent = await this.page.locator('[class*="content"], [class*="container"], [class*="main"], .MuiPaper-root').first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    return hasContent;
  }
}
