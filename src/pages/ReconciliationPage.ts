import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * ReconciliationPage - Page object for FacctList Reconciliation module.
 *
 * Flow: FacctList sidebar → Watchlist → Reconciliation
 * Purpose: Compare official regulatory watchlists with internal data
 */
export class ReconciliationPage {
  // Navigation
  private watchlistDropdown: Locator;
  private reconciliationOption: Locator;

  // Page elements
  private pageTitle: Locator;
  private reconciliationTable: Locator;
  private tableRows: Locator;
  private noDataMessage: Locator;

  // Filters
  private listNameDropdown: Locator;
  private statusDropdown: Locator;
  private dateFromInput: Locator;
  private dateToInput: Locator;
  private applyButton: Locator;
  private clearButton: Locator;
  private filterButton: Locator;

  // Actions
  private runReconciliationBtn: Locator;
  private viewDetailsBtn: Locator;
  private downloadReportBtn: Locator;
  private refreshBtn: Locator;

  // Detail view
  private detailDrawer: Locator;
  private summarySection: Locator;
  private newRecordsCount: Locator;
  private amendedRecordsCount: Locator;
  private deletedRecordsCount: Locator;
  private matchedRecordsCount: Locator;
  private closeDrawerBtn: Locator;

  // Tabs
  private summaryTab: Locator;
  private newTab: Locator;
  private amendedTab: Locator;
  private deletedTab: Locator;
  private matchedTab: Locator;

  constructor(private page: Page) {
    // Navigation
    this.watchlistDropdown = page.locator('span.MuiListItemText-primary:has-text("Watchlist")');
    this.reconciliationOption = page.locator('[aria-label="Reconciliation"], text=Reconciliation');

    // Page elements
    this.pageTitle = page.locator('h1, h2, [class*="page-title"]').first();
    this.reconciliationTable = page.locator('table, .MuiTable-root');
    this.tableRows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    this.noDataMessage = page.locator('text=No data, text=No records, [class*="no-data"]');

    // Filters
    this.listNameDropdown = page.locator('#list-name-select, #mui-component-select-listName');
    this.statusDropdown = page.locator('#status-select, #mui-component-select-status');
    this.dateFromInput = page.locator('input[placeholder*="From"], input[name="dateFrom"]');
    this.dateToInput = page.locator('input[placeholder*="To"], input[name="dateTo"]');
    this.applyButton = page.locator('button:has-text("APPLY"), #apply-btn');
    this.clearButton = page.locator('button:has-text("CLEAR"), #clear-btn');
    this.filterButton = page.locator('button[aria-label*="filter"], button:has-text("Filter")');

    // Actions
    this.runReconciliationBtn = page.locator('button:has-text("RUN"), button:has-text("RECONCILE"), #run-reconciliation-btn');
    this.viewDetailsBtn = page.locator('button:has-text("VIEW"), [aria-label="View Details"]');
    this.downloadReportBtn = page.locator('button:has-text("DOWNLOAD"), [aria-label="Download"]');
    this.refreshBtn = page.locator('button:has-text("REFRESH"), [aria-label="Refresh"]');

    // Detail view
    this.detailDrawer = page.locator('.facct-drawer-paper, [class*="drawer"]').first();
    this.summarySection = page.locator('[class*="summary"], [class*="reconciliation-summary"]');
    this.newRecordsCount = page.locator('[class*="new-count"], [data-testid="new-records"]');
    this.amendedRecordsCount = page.locator('[class*="amended-count"], [data-testid="amended-records"]');
    this.deletedRecordsCount = page.locator('[class*="deleted-count"], [data-testid="deleted-records"]');
    this.matchedRecordsCount = page.locator('[class*="matched-count"], [data-testid="matched-records"]');
    this.closeDrawerBtn = page.locator('#lseg-footer-close-btn, button:has-text("CLOSE")');

    // Tabs
    this.summaryTab = page.locator('button:has-text("Summary"), [role="tab"]:has-text("Summary")');
    this.newTab = page.locator('button:has-text("New"), [role="tab"]:has-text("New")');
    this.amendedTab = page.locator('button:has-text("Amended"), [role="tab"]:has-text("Amended")');
    this.deletedTab = page.locator('button:has-text("Deleted"), [role="tab"]:has-text("Deleted")');
    this.matchedTab = page.locator('button:has-text("Matched"), [role="tab"]:has-text("Matched")');
  }

  // ==================== Navigation ====================

  async navigateToReconciliation(): Promise<void> {
    await this.watchlistDropdown.waitFor({ state: "visible", timeout: 15000 });
    await this.watchlistDropdown.click();
    await this.page.locator('.MuiCollapse-entered').waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await this.reconciliationOption.waitFor({ state: "visible", timeout: 10000 });
    await this.reconciliationOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Reconciliation");
  }

  // ==================== Filters ====================

  async selectListName(listName: string): Promise<void> {
    await this.listNameDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${listName}")`).first().click();
    logger.info(`Selected list: ${listName}`);
  }

  async selectStatus(status: string): Promise<void> {
    await this.statusDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${status}")`).first().click();
    logger.info(`Selected status: ${status}`);
  }

  async setDateRange(from: string, to: string): Promise<void> {
    await this.dateFromInput.fill(from);
    await this.dateToInput.fill(to);
    logger.info(`Set date range: ${from} to ${to}`);
  }

  async applyFilters(): Promise<void> {
    await this.applyButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Filters applied");
  }

  async clearFilters(): Promise<void> {
    await this.clearButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Filters cleared");
  }

  // ==================== Table Operations ====================

  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async hasData(): Promise<boolean> {
    return (await this.tableRows.count()) > 0;
  }

  async openDetailsAtRow(index: number): Promise<void> {
    const row = this.tableRows.nth(index);
    await row.locator('.kebab-cell svg, td:last-child svg, [aria-label="View"]').first().click();
    await this.page.waitForTimeout(500);
    const menuItem = this.page.locator('[role="menuitem"]:has-text("View"), [role="menuitem"]:has-text("Details")').first();
    if (await menuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuItem.click();
    }
    await this.page.waitForLoadState("networkidle");
    await this.detailDrawer.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    logger.info(`Opened details at row ${index}`);
  }

  // ==================== Detail View ====================

  async isDetailViewOpen(): Promise<boolean> {
    return await this.detailDrawer.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async closeDetailView(): Promise<void> {
    await this.closeDrawerBtn.click();
    await this.detailDrawer.waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
    logger.info("Closed detail view");
  }

  // ==================== Tabs ====================

  async clickSummaryTab(): Promise<void> {
    await this.summaryTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Summary tab");
  }

  async clickNewTab(): Promise<void> {
    await this.newTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked New tab");
  }

  async clickAmendedTab(): Promise<void> {
    await this.amendedTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Amended tab");
  }

  async clickDeletedTab(): Promise<void> {
    await this.deletedTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Deleted tab");
  }

  async clickMatchedTab(): Promise<void> {
    await this.matchedTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Matched tab");
  }

  // ==================== Actions ====================

  async clickDownloadReport(): Promise<void> {
    await this.downloadReportBtn.click();
    await this.page.waitForTimeout(2000);
    logger.info("Clicked Download Report");
  }

  async clickRefresh(): Promise<void> {
    await this.refreshBtn.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Refresh");
  }

  async isPageLoaded(): Promise<boolean> {
    return await this.tableRows.first().isVisible({ timeout: 10000 }).catch(() => false) ||
           await this.noDataMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }
}
