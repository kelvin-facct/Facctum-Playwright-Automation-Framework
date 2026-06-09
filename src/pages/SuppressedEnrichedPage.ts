import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * SuppressedEnrichedPage - Page object for the Suppressed and Enriched module view.
 *
 * Flow: FacctList sidebar → Watchlist → Suppressed and Enriched
 * Purpose: View and manage all suppressed/enriched record overrides
 */
export class SuppressedEnrichedPage {
  // Navigation
  private watchlistDropdown: Locator;
  private suppressedEnrichedOption: Locator;

  // Page elements
  private pageTitle: Locator;
  private mainTable: Locator;
  private tableRows: Locator;
  private noDataMessage: Locator;
  private totalCount: Locator;

  // Tabs
  private allTab: Locator;
  private suppressedTab: Locator;
  private enrichedTab: Locator;
  private pendingTab: Locator;
  private activeTab: Locator;
  private expiredTab: Locator;

  // Filters
  private filterButton: Locator;
  private filterPanel: Locator;
  private listNameFilter: Locator;
  private recordTypeFilter: Locator;
  private actionTypeFilter: Locator;
  private statusFilter: Locator;
  private tagFilter: Locator;
  private reasonFilter: Locator;
  private reviewPeriodFilter: Locator;
  private applyFilterBtn: Locator;
  private clearFilterBtn: Locator;

  // Search
  private searchInput: Locator;

  // Record actions
  private releaseButton: Locator;
  private viewProfileButton: Locator;
  private auditButton: Locator;

  // Detail drawer
  private detailDrawer: Locator;
  private closeDrawerBtn: Locator;
  private recordIdLabel: Locator;
  private recordNameLabel: Locator;
  private actionTypeLabel: Locator;
  private statusLabel: Locator;
  private tagsLabel: Locator;
  private reasonLabel: Locator;
  private reviewPeriodLabel: Locator;
  private expiryDateLabel: Locator;
  private createdByLabel: Locator;
  private approvedByLabel: Locator;

  // Pagination
  private paginationNextBtn: Locator;
  private paginationLastBtn: Locator;

  constructor(private page: Page) {
    // Navigation
    this.watchlistDropdown = page.locator('span.MuiListItemText-primary:has-text("Watchlist")');
    this.suppressedEnrichedOption = page.locator('[aria-label="Suppressed and Enriched"], text=Suppressed and Enriched');

    // Page elements
    this.pageTitle = page.locator('h1, h2, [class*="page-title"]').first();
    this.mainTable = page.locator('table, .MuiTable-root');
    this.tableRows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    this.noDataMessage = page.locator('text=No data, text=No records, [class*="no-data"]');
    this.totalCount = page.locator('[class*="total-count"], [class*="result-count"]');

    // Tabs
    this.allTab = page.locator('button:has-text("All"), [role="tab"]:has-text("All")').first();
    this.suppressedTab = page.locator('button:has-text("Suppressed"), [role="tab"]:has-text("Suppressed")');
    this.enrichedTab = page.locator('button:has-text("Enriched"), [role="tab"]:has-text("Enriched")');
    this.pendingTab = page.locator('button:has-text("Pending"), [role="tab"]:has-text("Pending")');
    this.activeTab = page.locator('button:has-text("Active"), [role="tab"]:has-text("Active")');
    this.expiredTab = page.locator('button:has-text("Expired"), [role="tab"]:has-text("Expired")');

    // Filters
    this.filterButton = page.locator('button[aria-label*="filter"], button:has-text("Filter"), [data-testid*="filter"]').first();
    this.filterPanel = page.locator('.filter-panel, [class*="filter-container"], [class*="filter-drawer"]');
    this.listNameFilter = page.locator('#filter-list-name, #mui-component-select-listName');
    this.recordTypeFilter = page.locator('#filter-record-type, #mui-component-select-recordType');
    this.actionTypeFilter = page.locator('#filter-action-type, #mui-component-select-actionType');
    this.statusFilter = page.locator('#filter-status, #mui-component-select-status');
    this.tagFilter = page.locator('#filter-tag, #mui-component-select-tag');
    this.reasonFilter = page.locator('#filter-reason, #mui-component-select-reason');
    this.reviewPeriodFilter = page.locator('#filter-review-period, #mui-component-select-reviewPeriod');
    this.applyFilterBtn = page.locator('button:has-text("APPLY"), #apply-filter-btn');
    this.clearFilterBtn = page.locator('button:has-text("CLEAR"), #clear-filter-btn');

    // Search
    this.searchInput = page.locator('input[placeholder*="Search"]').first();

    // Record actions
    this.releaseButton = page.locator('button[aria-label="RELEASE"], button:has-text("RELEASE")');
    this.viewProfileButton = page.locator('button:has-text("VIEW PROFILE"), [aria-label="View Profile"]');
    this.auditButton = page.locator('button:has-text("AUDIT"), [role="tab"]:has-text("AUDIT")');

    // Detail drawer
    this.detailDrawer = page.locator('.facct-drawer-paper, [class*="drawer"]').first();
    this.closeDrawerBtn = page.locator('#lseg-footer-close-btn, button:has-text("CLOSE")');
    this.recordIdLabel = page.locator('[class*="record-id"], text=Record ID');
    this.recordNameLabel = page.locator('[class*="record-name"]');
    this.actionTypeLabel = page.locator('[class*="action-type"]');
    this.statusLabel = page.locator('[class*="status-label"]');
    this.tagsLabel = page.locator('[class*="tags"]');
    this.reasonLabel = page.locator('[class*="reason"]');
    this.reviewPeriodLabel = page.locator('[class*="review-period"]');
    this.expiryDateLabel = page.locator('[class*="expiry-date"]');
    this.createdByLabel = page.locator('[class*="created-by"]');
    this.approvedByLabel = page.locator('[class*="approved-by"]');

    // Pagination
    this.paginationNextBtn = page.locator('button[class*="pagination-next-btn"]').nth(1);
    this.paginationLastBtn = page.locator('button[class*="pagination"]').nth(3);
  }

  // ==================== Navigation ====================

  async navigateToSuppressedEnriched(): Promise<void> {
    await this.watchlistDropdown.waitFor({ state: "visible", timeout: 15000 });
    await this.watchlistDropdown.click();
    await this.page.locator('.MuiCollapse-entered').waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await this.suppressedEnrichedOption.waitFor({ state: "visible", timeout: 10000 });
    await this.suppressedEnrichedOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Suppressed and Enriched");
  }

  // ==================== Tabs ====================

  async clickAllTab(): Promise<void> {
    await this.allTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked All tab");
  }

  async clickSuppressedTab(): Promise<void> {
    await this.suppressedTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Suppressed tab");
  }

  async clickEnrichedTab(): Promise<void> {
    await this.enrichedTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Enriched tab");
  }

  async clickPendingTab(): Promise<void> {
    await this.pendingTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Pending tab");
  }

  async clickActiveTab(): Promise<void> {
    await this.activeTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Active tab");
  }

  async clickExpiredTab(): Promise<void> {
    await this.expiredTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Expired tab");
  }

  // ==================== Filters ====================

  async openFilterPanel(): Promise<void> {
    const isVisible = await this.filterPanel.isVisible().catch(() => false);
    if (!isVisible) {
      await this.filterButton.click();
      await this.filterPanel.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    }
    logger.info("Filter panel opened");
  }

  async selectListNameFilter(listName: string): Promise<void> {
    await this.listNameFilter.click();
    await this.page.locator(`[role="option"]:has-text("${listName}")`).first().click();
    logger.info(`Selected list name filter: ${listName}`);
  }

  async selectActionTypeFilter(actionType: string): Promise<void> {
    await this.actionTypeFilter.click();
    await this.page.locator(`[role="option"]:has-text("${actionType}")`).first().click();
    logger.info(`Selected action type filter: ${actionType}`);
  }

  async applyFilters(): Promise<void> {
    await this.applyFilterBtn.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Filters applied");
  }

  async clearFilters(): Promise<void> {
    await this.clearFilterBtn.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Filters cleared");
  }

  // ==================== Search ====================

  async searchByRecordId(recordId: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(recordId);
    await this.page.keyboard.press("Enter");
    await this.page.waitForLoadState("networkidle");
    logger.info(`Searched for record: ${recordId}`);
  }

  // ==================== Table Operations ====================

  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async hasData(): Promise<boolean> {
    return (await this.tableRows.count()) > 0;
  }

  async openRecordAtRow(index: number): Promise<void> {
    const row = this.tableRows.nth(index);
    await row.locator('.kebab-cell svg, td:last-child svg').first().click();
    await this.page.locator('[role="menuitem"]:has-text("Overview")').first().waitFor({ state: "visible", timeout: 5000 });
    await this.page.locator('[role="menuitem"]:has-text("Overview")').first().click();
    await this.page.waitForLoadState("networkidle");
    await this.detailDrawer.waitFor({ state: "visible", timeout: 15000 });
    await this.page.waitForTimeout(1500);
    logger.info(`Opened record at row ${index}`);
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

  async clickReleaseButton(): Promise<void> {
    await this.releaseButton.waitFor({ state: "visible", timeout: 10000 });
    await this.releaseButton.click();
    logger.info("Clicked Release button");
  }

  // ==================== Pagination ====================

  async goToNextPage(): Promise<void> {
    await this.paginationNextBtn.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to next page");
  }

  async goToLastPage(): Promise<void> {
    if ((await this.paginationLastBtn.getAttribute("tabindex")) !== "-1") {
      await this.paginationLastBtn.click();
      await this.page.waitForLoadState("networkidle");
      logger.info("Navigated to last page");
    }
  }

  async isPageLoaded(): Promise<boolean> {
    return await this.tableRows.first().isVisible({ timeout: 10000 }).catch(() => false) ||
           await this.noDataMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }
}
