import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * SearchPage - Page object for FacctList Global Search functionality.
 *
 * Flow: FacctList sidebar → Search → Enter query → View results → Open record
 */
export class SearchPage {
  // Navigation
  private searchNavItem: Locator;

  // Search form
  private searchInput: Locator;
  private searchButton: Locator;
  private clearButton: Locator;

  // Filters
  private filterPanel: Locator;
  private filterButton: Locator;
  private entityTypeDropdown: Locator;
  private listTypeDropdown: Locator;
  private statusDropdown: Locator;
  private applyFilterButton: Locator;
  private clearFilterButton: Locator;

  // Results table
  private resultsTable: Locator;
  private tableRows: Locator;
  private noResultsMessage: Locator;
  private resultCount: Locator;

  // Pagination
  private paginationNextBtn: Locator;
  private paginationPrevBtn: Locator;
  private paginationLastBtn: Locator;
  private paginationFirstBtn: Locator;

  constructor(private page: Page) {
    // Navigation
    this.searchNavItem = page.locator('[aria-label="Search"], span.MuiListItemText-primary:has-text("Search")');

    // Search form
    this.searchInput = page.locator('input[placeholder*="Search"], input[aria-label*="Search"], #search-input');
    this.searchButton = page.locator('button[aria-label="Search"], button:has-text("SEARCH"), #search-btn');
    this.clearButton = page.locator('button:has-text("CLEAR"), button[aria-label="Clear"]');

    // Filters
    this.filterPanel = page.locator('.filter-panel, [class*="filter-container"]');
    this.filterButton = page.locator('button[aria-label*="filter"], button:has-text("Filter")');
    this.entityTypeDropdown = page.locator('#entity-type-select, #mui-component-select-entityType');
    this.listTypeDropdown = page.locator('#list-type-select, #mui-component-select-listType');
    this.statusDropdown = page.locator('#status-select, #mui-component-select-status');
    this.applyFilterButton = page.locator('button:has-text("APPLY"), #apply-filter-btn');
    this.clearFilterButton = page.locator('button:has-text("CLEAR"), #clear-filter-btn');

    // Results table
    this.resultsTable = page.locator('table, .MuiTable-root, [class*="search-results"]');
    this.tableRows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    this.noResultsMessage = page.locator('text=No results found, text=No records found, [class*="no-results"]');
    this.resultCount = page.locator('[class*="result-count"], [class*="total-count"], .search-count');

    // Pagination
    this.paginationNextBtn = page.locator('button[class*="pagination-next-btn"]').nth(1);
    this.paginationPrevBtn = page.locator('button[class*="pagination-prev-btn"]').first();
    this.paginationLastBtn = page.locator('button[class*="pagination"]').nth(3);
    this.paginationFirstBtn = page.locator('button[class*="pagination"]').first();
  }

  // ==================== Navigation ====================

  async navigateToSearch(): Promise<void> {
    await this.searchNavItem.waitFor({ state: "visible", timeout: 15000 });
    await this.searchNavItem.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Search page");
  }

  // ==================== Search Operations ====================

  async searchByQuery(query: string): Promise<void> {
    await this.searchInput.waitFor({ state: "visible", timeout: 10000 });
    await this.searchInput.clear();
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(1000);
    logger.info(`Searched for: "${query}"`);
  }

  async searchByRecordId(recordId: string): Promise<void> {
    await this.searchByQuery(recordId);
    logger.info(`Searched by Record ID: ${recordId}`);
  }

  async searchByName(name: string): Promise<void> {
    await this.searchByQuery(name);
    logger.info(`Searched by name: ${name}`);
  }

  async clearSearch(): Promise<void> {
    await this.clearButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Cleared search");
  }

  // ==================== Filters ====================

  async openFilterPanel(): Promise<void> {
    const isVisible = await this.filterPanel.isVisible().catch(() => false);
    if (!isVisible) {
      await this.filterButton.click();
      await this.filterPanel.waitFor({ state: "visible", timeout: 5000 });
    }
    logger.info("Filter panel opened");
  }

  async selectEntityType(type: string): Promise<void> {
    await this.entityTypeDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${type}"), li:has-text("${type}")`).first().click();
    logger.info(`Selected entity type: ${type}`);
  }

  async selectListType(type: string): Promise<void> {
    await this.listTypeDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${type}"), li:has-text("${type}")`).first().click();
    logger.info(`Selected list type: ${type}`);
  }

  async selectStatus(status: string): Promise<void> {
    await this.statusDropdown.click();
    await this.page.locator(`[role="option"]:has-text("${status}"), li:has-text("${status}")`).first().click();
    logger.info(`Selected status: ${status}`);
  }

  async applyFilters(): Promise<void> {
    await this.applyFilterButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Filters applied");
  }

  async clearFilters(): Promise<void> {
    await this.clearFilterButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Filters cleared");
  }

  // ==================== Results ====================

  async getResultCount(): Promise<number> {
    const rows = await this.tableRows.count();
    logger.info(`Search results: ${rows} rows`);
    return rows;
  }

  async getTotalResultCount(): Promise<string> {
    const text = await this.resultCount.textContent().catch(() => "0");
    logger.info(`Total result count: ${text}`);
    return text || "0";
  }

  async hasResults(): Promise<boolean> {
    const count = await this.tableRows.count();
    return count > 0;
  }

  async hasNoResults(): Promise<boolean> {
    return await this.noResultsMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async openRecordAtRow(index: number): Promise<void> {
    const row = this.tableRows.nth(index);
    await row.locator('.kebab-cell svg, td:last-child svg').first().click();
    await this.page.locator('[role="menuitem"]:has-text("Overview")').first().waitFor({ state: "visible", timeout: 5000 });
    await this.page.locator('[role="menuitem"]:has-text("Overview")').first().click();
    await this.page.waitForLoadState("networkidle");
    await this.page.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 15000 });
    logger.info(`Opened record at row ${index}`);
  }

  async getRecordIdAtRow(index: number): Promise<string> {
    const row = this.tableRows.nth(index);
    const id = await row.locator('td').first().textContent();
    return (id || "").trim();
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

  async isNextPageAvailable(): Promise<boolean> {
    return (await this.paginationNextBtn.getAttribute("tabindex")) !== "-1";
  }
}
