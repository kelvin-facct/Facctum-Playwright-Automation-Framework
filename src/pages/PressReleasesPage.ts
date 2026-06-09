import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * PressReleasesPage - Page object for FacctList Press Releases module.
 *
 * Flow: FacctList sidebar → Watchlist → Press Releases
 * Purpose: View early access to newly published regulatory watchlist updates
 */
export class PressReleasesPage {
  // Navigation
  private watchlistDropdown: Locator;
  private pressReleasesOption: Locator;

  // Page elements
  private pageTitle: Locator;
  private mainTable: Locator;
  private tableRows: Locator;
  private noDataMessage: Locator;

  // Filters
  private filterButton: Locator;
  private filterPanel: Locator;
  private listNameFilter: Locator;
  private dateFilter: Locator;
  private applyFilterBtn: Locator;
  private clearFilterBtn: Locator;

  // Search
  private searchInput: Locator;

  // Actions
  private downloadButton: Locator;
  private viewDetailsButton: Locator;
  private refreshButton: Locator;

  // Detail view
  private detailDrawer: Locator;
  private closeDrawerBtn: Locator;

  // Pagination
  private paginationNextBtn: Locator;
  private paginationLastBtn: Locator;

  constructor(private page: Page) {
    // Navigation
    this.watchlistDropdown = page.locator('span.MuiListItemText-primary:has-text("Watchlist")');
    this.pressReleasesOption = page.locator('[aria-label="Press Releases"], text=Press Releases');

    // Page elements
    this.pageTitle = page.locator('h1, h2, [class*="page-title"]').first();
    this.mainTable = page.locator('table, .MuiTable-root');
    this.tableRows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    this.noDataMessage = page.locator('text=No data, text=No records, text=No press releases, [class*="no-data"]');

    // Filters
    this.filterButton = page.locator('button[aria-label*="filter"], button:has-text("Filter")').first();
    this.filterPanel = page.locator('.filter-panel, [class*="filter-container"]');
    this.listNameFilter = page.locator('#filter-list-name, #mui-component-select-listName');
    this.dateFilter = page.locator('input[type="date"], input[placeholder*="Date"]');
    this.applyFilterBtn = page.locator('button:has-text("APPLY"), #apply-filter-btn');
    this.clearFilterBtn = page.locator('button:has-text("CLEAR"), #clear-filter-btn');

    // Search
    this.searchInput = page.locator('input[placeholder*="Search"]').first();

    // Actions
    this.downloadButton = page.locator('button:has-text("DOWNLOAD"), [aria-label="Download"]');
    this.viewDetailsButton = page.locator('button:has-text("VIEW"), [aria-label="View"]');
    this.refreshButton = page.locator('button:has-text("REFRESH"), [aria-label="Refresh"]');

    // Detail view
    this.detailDrawer = page.locator('.facct-drawer-paper, [class*="drawer"]').first();
    this.closeDrawerBtn = page.locator('#lseg-footer-close-btn, button:has-text("CLOSE")');

    // Pagination
    this.paginationNextBtn = page.locator('button[class*="pagination-next-btn"]').nth(1);
    this.paginationLastBtn = page.locator('button[class*="pagination"]').nth(3);
  }

  // ==================== Navigation ====================

  async navigateToPressReleases(): Promise<void> {
    await this.watchlistDropdown.waitFor({ state: "visible", timeout: 15000 });
    await this.watchlistDropdown.click();
    await this.page.locator('.MuiCollapse-entered').waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await this.pressReleasesOption.waitFor({ state: "visible", timeout: 10000 });
    await this.pressReleasesOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Press Releases");
  }

  // ==================== Search & Filter ====================

  async searchByQuery(query: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    await this.page.keyboard.press("Enter");
    await this.page.waitForLoadState("networkidle");
    logger.info(`Searched for: "${query}"`);
  }

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
    logger.info(`Selected list name: ${listName}`);
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

  // ==================== Table Operations ====================

  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async hasData(): Promise<boolean> {
    return (await this.tableRows.count()) > 0;
  }

  async hasNoData(): Promise<boolean> {
    return await this.noDataMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async openDetailsAtRow(index: number): Promise<void> {
    const row = this.tableRows.nth(index);
    await row.locator('.kebab-cell svg, td:last-child svg').first().click();
    await this.page.waitForTimeout(500);
    const menuItem = this.page.locator('[role="menuitem"]:has-text("View"), [role="menuitem"]:has-text("Details")').first();
    if (await menuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuItem.click();
    }
    await this.page.waitForLoadState("networkidle");
    await this.detailDrawer.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    logger.info(`Opened details at row ${index}`);
  }

  async clickDownloadAtRow(index: number): Promise<void> {
    const row = this.tableRows.nth(index);
    await row.locator('[aria-label="Download"], button:has-text("Download"), svg[data-testid*="download"]').first().click();
    await this.page.waitForTimeout(2000);
    logger.info(`Clicked download at row ${index}`);
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

  // ==================== Pagination ====================

  async goToNextPage(): Promise<void> {
    await this.paginationNextBtn.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to next page");
  }

  async isPageLoaded(): Promise<boolean> {
    return await this.tableRows.first().isVisible({ timeout: 10000 }).catch(() => false) ||
           await this.noDataMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }
}
