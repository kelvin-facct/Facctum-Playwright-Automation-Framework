import { Page, Locator, expect } from "@playwright/test";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { MongoDBHelper, UKSanctionsMongoQueries } from "../helpers/mongoHelper";

/**
 * Page Object for UK SANCTIONS Advanced Filter functionality
 * Migrated from Java Selenium to TypeScript Playwright
 * 
 * Includes MongoDB validation for UI count verification
 */
export class UKSANCTIONSadvfilterPage {
  private page: Page;
  private actions: PlaywrightActions;
  private mongoHelper: MongoDBHelper | null = null;
  private mongoQueries: UKSanctionsMongoQueries | null = null;

  // ==================== LOGIN LOCATORS ====================
  private readonly welcomePage: Locator;
  private readonly loginButton: Locator;
  private readonly orgNameInput: Locator;
  private readonly continueButton: Locator;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly continueLoginButton: Locator;
  private readonly productCard: Locator;
  private readonly facctlistDashboard: Locator;

  // ==================== NAVIGATION LOCATORS ====================
  private readonly watchlistMenu: Locator;
  private readonly regulatoryListOption: Locator;
  private readonly paginationButton: Locator;
  private readonly pageValue100: Locator;
  private readonly ukSanctionsList: Locator;

  // ==================== TAB LOCATORS ====================
  private readonly recordsTab: Locator;
  private readonly downloadsTab: Locator;
  private readonly activeTab: Locator;
  private readonly activeTabEmpty: Locator;
  private readonly errorTab: Locator;
  private readonly errorTabEmpty: Locator;
  private readonly deleteTab: Locator;
  private readonly deleteTabEmpty: Locator;
  private readonly deltaToggle: Locator;

  // Delta view tabs
  private readonly newTab: Locator;
  private readonly newTabEmpty: Locator;
  private readonly amendTab: Locator;
  private readonly amendTabEmpty: Locator;
  private readonly deltaDeleteTab: Locator;
  private readonly deltaDeleteTabEmpty: Locator;
  private readonly stableTab: Locator;
  private readonly stableTabEmpty: Locator;
  private readonly deltaErrorTab: Locator;
  private readonly deltaErrorTabEmpty: Locator;

  // ==================== FILTER PANEL LOCATORS ====================
  private readonly filterButton: Locator;
  private readonly filterPanel: Locator;
  private readonly filterPanelCloseIcon: Locator;
  private readonly cancelButton: Locator;
  private readonly clearAllButton: Locator;
  private readonly applyButton: Locator;
  private readonly clearFiltersButton: Locator;
  private readonly noFilterMessage: Locator;
  private readonly noDataMessage: Locator;

  // Filter accordion tabs (in filter panel)
  private readonly designatedDateFilter: Locator;
  private readonly designatedDateInput: Locator;
  private readonly idTypeFilter: Locator;
  private readonly idTypeSearch: Locator;
  private readonly idTypeSelectAll: Locator;
  private readonly programSourceFilter: Locator;
  private readonly programSourceSearch: Locator;
  private readonly programSourceSelectAll: Locator;
  private readonly regimeNameFilter: Locator;
  private readonly regimeNameSearch: Locator;
  private readonly regimeNameSelectAll: Locator;
  private readonly typeFilter: Locator;
  private readonly typeSearch: Locator;
  private readonly typeSelectAll: Locator;

  // ==================== DOWNLOAD LOCATORS ====================
  private readonly downloadButton: Locator;
  private readonly excelOption: Locator;
  private readonly tabSeparatedOption: Locator;
  private readonly toasterMessage: Locator;
  private readonly refreshButton: Locator;
  private readonly downloadStatus: Locator;
  private readonly successStatus: Locator;
  private readonly downloadLink: Locator;

  // ==================== PAGINATION LOCATORS ====================
  private readonly paginationTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.actions = new PlaywrightActions(page);

    // Login locators
    this.welcomePage = page.locator("div:has-text('Welcome')").first();
    this.loginButton = page.locator("button[aria-label='LOG IN']");
    this.orgNameInput = page.locator("#organizationName");
    this.continueButton = page.locator("button:has-text('CONTINUE')");
    this.usernameInput = page.locator("#username");
    this.passwordInput = page.locator("#password");
    // Use exact match for "Continue" button to avoid matching "Continue with Facctum SSO"
    this.continueLoginButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.productCard = page.locator(".product-card").first();
    this.facctlistDashboard = page.locator("div:has-text('Dashboard')").first();

    // Navigation locators
    this.watchlistMenu = page.locator("span.MuiListItemText-primary:has-text('Watchlist')");
    this.regulatoryListOption = page.locator("span:has-text('Regulatory list')");
    this.paginationButton = page.locator("#basic-button");
    this.pageValue100 = page.locator("li:has-text('100')");
    this.ukSanctionsList = page.locator("div.link-cell:has-text('UK SANCTIONS')");

    // Tab locators - using nth() for index-based selection when multiple matches
    this.recordsTab = page.locator("button[aria-label='Records']");
    this.downloadsTab = page.locator("button[aria-label='Downloads']");
    this.activeTab = page.locator("button[role='tab']").filter({ hasText: /^Active \(/ });
    this.activeTabEmpty = page.locator("button[aria-label='Active (0)']");
    this.errorTab = page.locator("button[role='tab']").filter({ hasText: /^Error \(/ });
    this.errorTabEmpty = page.locator("button[aria-label='Error (0)']");
    this.deleteTab = page.locator("button[role='tab']").filter({ hasText: /^Deleted \(/ });
    this.deleteTabEmpty = page.locator("button[aria-label='Deleted (0)']");
    this.deltaToggle = page.locator("input[type='checkbox']").first();

    // Delta view tabs
    this.newTab = page.locator("button[role='tab']").filter({ hasText: /^New \(/ });
    this.newTabEmpty = page.locator("button[aria-label='New (0)']");
    this.amendTab = page.locator("button[role='tab']").filter({ hasText: /^Amended \(/ });
    this.amendTabEmpty = page.locator("button[aria-label='Amended (0)']");
    this.deltaDeleteTab = page.locator("button[role='tab']").filter({ hasText: /^Deleted \(/ }).nth(1);
    this.deltaDeleteTabEmpty = page.locator("button[aria-label='Deleted (0 )']");
    this.stableTab = page.locator("button[role='tab']").filter({ hasText: /^Stable \(/ });
    this.stableTabEmpty = page.locator("button[aria-label='Stable (0 )']");
    this.deltaErrorTab = page.locator("button[role='tab']").filter({ hasText: /^Error \(/ }).nth(1);
    this.deltaErrorTabEmpty = page.locator("button[aria-label='Error (0 )']");

    // Filter panel locators
    this.filterButton = page.locator("#record-table-filter-btn, #regulatory-records-filter-btn");
    this.filterPanel = page.locator(".facct-drawer-modal");
    this.filterPanelCloseIcon = page.locator(".facct-drawer-modal [data-testid='CloseIcon']");
    this.cancelButton = page.locator("#advance-filter-close-btn");
    this.clearAllButton = page.locator("#advance-filter-clear-all-btn");
    this.applyButton = page.locator("#advance-filter-apply-btn");
    this.clearFiltersButton = page.locator("#regulatory-records-clear-filters-btn");
    this.noFilterMessage = page.getByText('No filters selected', { exact: true });
    this.noDataMessage = page.locator("h5:has-text('No data available')");

    // Filter accordion tabs
    this.designatedDateFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Designated date')");
    this.designatedDateInput = page.locator(".facct-drawer-modal input[placeholder='DD/MM/YYYY']").first();
    this.idTypeFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Id Type')");
    this.idTypeSearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search id type']");
    this.idTypeSelectAll = page.locator("#advance-filter-list-select-all-idNumberTypesList\\.idType");
    this.programSourceFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Program Source')");
    this.programSourceSearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search program source']");
    this.programSourceSelectAll = page.locator("#advance-filter-list-select-all-sanctionProgramDetailsList\\.programSource");
    this.regimeNameFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Regime Name')");
    this.regimeNameSearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search regime name']");
    this.regimeNameSelectAll = page.locator("#advance-filter-list-select-all-sanctionProgramDetailsList\\.programName");
    this.typeFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Type')");
    this.typeSearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search type']");
    this.typeSelectAll = page.locator("#advance-filter-list-select-all-entityTypeName");

    // Download locators
    this.downloadButton = page.locator("#regulatory-records-download-btn");
    this.excelOption = page.locator("li[role='menuitem']:has-text('Excel (.xlsx)')");
    this.tabSeparatedOption = page.locator("li[role='menuitem']:has-text('Tab separated (.tsv)')");
    this.toasterMessage = page.locator(".Toastify__toast-body");
    this.refreshButton = page.locator("button[aria-label='refresh button']").first();
    this.downloadStatus = page.locator("div:has-text('Download started.')");
    this.successStatus = page.locator("tbody tr").first().locator("td").nth(5).locator("div.status");
    this.downloadLink = page.locator("tbody tr").first().locator("td").nth(6).locator("button");

    // Pagination
    this.paginationTotal = page.locator(".MuiTablePagination-displayedRows");
  }

  // ==================== MONGODB METHODS ====================

  /**
   * Initialize MongoDB connection for validation
   */
  async initMongoDB(): Promise<void> {
    if (!this.mongoHelper) {
      this.mongoHelper = new MongoDBHelper();
      await this.mongoHelper.connect();
      this.mongoQueries = new UKSanctionsMongoQueries(this.mongoHelper);
    }
  }

  /**
   * Close MongoDB connection
   */
  async closeMongoDB(): Promise<void> {
    if (this.mongoHelper) {
      await this.mongoHelper.disconnect();
      this.mongoHelper = null;
      this.mongoQueries = null;
    }
  }

  /**
   * Validate UI count against MongoDB
   */
  async validateUICountWithMongoDB(uiCount: number): Promise<{
    passed: boolean;
    uiCount: number;
    dbCount: number;
    message: string;
  }> {
    if (!this.mongoQueries) {
      console.log("[validateUICountWithMongoDB] MongoDB not initialized, skipping validation");
      return {
        passed: true,
        uiCount,
        dbCount: -1,
        message: "MongoDB validation skipped - not initialized"
      };
    }

    return await this.mongoQueries.validateUICount(uiCount);
  }

  // ==================== LOGIN METHODS ====================

  async facctlistLogin(url: string, orgName: string, username: string, password: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForTimeout(2000);

    const isProductCardVisible = await this.productCard.isVisible({ timeout: 3000 }).catch(() => false);
    if (isProductCardVisible) {
      console.log("Session restored - already on dashboard");
      await this.productCard.click();
      await this.page.waitForTimeout(3000);
      return;
    }

    const isFacctlistDashboard = await this.facctlistDashboard.isVisible({ timeout: 2000 }).catch(() => false);
    if (isFacctlistDashboard) {
      console.log("Already in Facctlist Dashboard");
      return;
    }

    const isWelcomeVisible = await this.welcomePage.isVisible({ timeout: 2000 }).catch(() => false);
    if (isWelcomeVisible) {
      console.log("Welcome page is displayed - performing login");
      await this.loginButton.click();
      await this.orgNameInput.fill(orgName);
      await this.continueButton.click();
      await this.page.waitForTimeout(2000);
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.continueLoginButton.click();
      await this.page.waitForTimeout(5000);
      await this.page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await this.productCard.click();
      await this.page.waitForTimeout(5000);
    } else {
      console.log("Unknown state - attempting to navigate to product card");
      const productCardExists = await this.productCard.isVisible({ timeout: 5000 }).catch(() => false);
      if (productCardExists) {
        await this.productCard.click();
        await this.page.waitForTimeout(3000);
      }
    }

    const isDashboardVisible = await this.facctlistDashboard.isVisible({ timeout: 5000 }).catch(() => false);
    if (isDashboardVisible) {
      console.log("Facctlist Dashboard page is displayed");
    } else {
      console.log("Facctlist Dashboard page is not displayed - may need to wait longer");
      await this.page.waitForTimeout(3000);
    }
  }

  // ==================== NAVIGATION METHODS ====================

  async navigateToRegulatoryList(): Promise<void> {
    await this.watchlistMenu.click();
    await this.page.waitForTimeout(4000);
    await this.regulatoryListOption.click();
    await this.page.waitForTimeout(3000);
  }

  async selectUKSanctionsList(): Promise<void> {
    await this.paginationButton.click();
    await this.page.waitForTimeout(2000);
    await this.pageValue100.click();
    await this.page.waitForTimeout(2000);
    await this.ukSanctionsList.click();
    await this.page.waitForTimeout(3000);
  }

  // ==================== FILTER METHODS ====================

  async openFilterPanel(): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    
    let attempts = 0;
    while (attempts < 3) {
      try {
        await this.filterButton.waitFor({ state: 'visible', timeout: 10000 });
        break;
      } catch {
        attempts++;
        console.log(`Filter button not visible, attempt ${attempts}/3`);
        await this.page.waitForTimeout(2000);
      }
    }
    
    await this.filterButton.click();
    await this.page.waitForTimeout(2000);
  }

  async closeFilterPanel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(2000);
  }

  async closeFilterPanelByIcon(): Promise<void> {
    await this.filterPanelCloseIcon.click();
    await this.page.waitForTimeout(2000);
  }

  async applyFilter(): Promise<void> {
    await this.applyButton.click();
    await this.page.waitForTimeout(3000);
    await this.page.waitForSelector('.facct-drawer-modal', { state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async clearAllFilters(): Promise<void> {
    await this.clearAllButton.click();
  }

  async clearAppliedFilters(): Promise<void> {
    try {
      // Wait for any toast notifications to disappear first
      const toast = this.page.locator(".Toastify__toast");
      const toastVisible = await toast.isVisible().catch(() => false);
      if (toastVisible) {
        console.log("Waiting for toast notification to disappear...");
        await toast.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
          console.log("Toast did not disappear, proceeding anyway");
        });
      }
      
      await this.page.waitForTimeout(500);
      const isVisible = await this.clearFiltersButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        await this.clearFiltersButton.click();
        await this.page.waitForTimeout(2000);
      }
    } catch {
      console.log("Clear filters button not visible");
    }
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  async selectIdTypeFilterAll(): Promise<void> {
    await this.idTypeFilter.click();
    await this.page.waitForTimeout(500);
    await this.idTypeSelectAll.click({ force: true });
  }

  async selectProgramSourceFilterAll(): Promise<void> {
    await this.programSourceFilter.click();
    await this.page.waitForTimeout(500);
    await this.programSourceSelectAll.click({ force: true });
  }

  async selectRegimeNameFilterAll(): Promise<void> {
    await this.regimeNameFilter.click();
    await this.page.waitForTimeout(500);
    await this.regimeNameSelectAll.click({ force: true });
  }

  async selectTypeFilterAll(): Promise<void> {
    // Use exact match to avoid matching "Id Type" which also contains "Type"
    const typeTab = this.page.getByRole('tab', { name: 'Type', exact: true });
    await typeTab.click();
    await this.page.waitForTimeout(1000);
    
    // Use the generic select-all checkbox (like Java's Selectall)
    const selectAllCheckbox = this.page.locator("input[id^='advance-filter-list-select-all']").first();
    await selectAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await selectAllCheckbox.click({ force: true });
  }

  async setDesignatedDateFilter(date: string): Promise<void> {
    await this.designatedDateFilter.click();
    await this.page.waitForTimeout(500);
    await this.designatedDateInput.click();
    await this.designatedDateInput.fill(date);
  }

  async searchAndSelectIdType(idType: string): Promise<void> {
    // Use JavaScript click to expand the Id Type accordion (like Java's jsClick)
    await this.idTypeFilter.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(500);
    
    // Wait for the search input to be visible
    await this.idTypeSearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.idTypeSearch.click();
    await this.idTypeSearch.fill(idType);
    await this.page.waitForTimeout(2000);
    
    if (await this.noDataMessage.isVisible()) {
      console.log("Entered data is not in Ref Data");
      await this.idTypeSearch.clear();
      return;
    }
    
    // Click the select-all checkbox (same as Java's Idtypefilter)
    // This selects all filtered results after searching
    await this.idTypeSelectAll.click({ force: true });
  }

  async searchAndSelectProgramSource(programSource: string): Promise<void> {
    // Use JavaScript click to expand the Program Source accordion (like Java's jsClick)
    await this.programSourceFilter.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(500);
    
    // Wait for the search input to be visible
    await this.programSourceSearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.programSourceSearch.click();
    await this.programSourceSearch.fill(programSource);
    await this.page.waitForTimeout(1000);
    
    // Click the select-all checkbox (same as Java's Programsourcefilter)
    await this.programSourceSelectAll.click({ force: true });
  }

  async searchAndSelectRegimeName(regimeName: string): Promise<void> {
    // Use JavaScript click to expand the Regime Name accordion (like Java's jsClick)
    await this.regimeNameFilter.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(500);
    
    // Wait for the search input to be visible
    await this.regimeNameSearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.regimeNameSearch.click();
    await this.regimeNameSearch.fill(regimeName);
    await this.page.waitForTimeout(1000);
    
    // Click the select-all checkbox (same as Java's Regimenamefilter)
    await this.regimeNameSelectAll.click({ force: true });
  }

  async searchAndSelectType(type: string): Promise<void> {
    // Use exact match to avoid matching "Id Type" which also contains "Type"
    const typeTab = this.page.getByRole('tab', { name: 'Type', exact: true });
    await typeTab.click();
    await this.page.waitForTimeout(1000);
    
    // Wait for the search input to be visible after accordion expands
    const typeSearchInput = this.page.locator("input[placeholder='Search type']").first();
    await typeSearchInput.waitFor({ state: 'visible', timeout: 10000 });
    await typeSearchInput.click();
    await typeSearchInput.fill(type);
    await this.page.waitForTimeout(1000);
    
    // Click the select-all checkbox
    await this.typeSelectAll.click({ force: true });
  }

  // ==================== TAB METHODS ====================

  async clickActiveTab(): Promise<void> {
    await this.activeTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasActiveTabData(): Promise<boolean> {
    try {
      return !(await this.activeTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  async clickErrorTab(): Promise<void> {
    await this.errorTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasErrorTabData(): Promise<boolean> {
    try {
      return !(await this.errorTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  async clickDeleteTab(): Promise<void> {
    await this.deleteTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasDeleteTabData(): Promise<boolean> {
    try {
      return !(await this.deleteTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  async toggleDeltaView(): Promise<void> {
    await this.deltaToggle.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickNewTab(): Promise<void> {
    await this.newTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasNewTabData(): Promise<boolean> {
    try {
      return !(await this.newTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  async clickAmendTab(): Promise<void> {
    await this.amendTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasAmendTabData(): Promise<boolean> {
    try {
      return !(await this.amendTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  async clickDeltaDeleteTab(): Promise<void> {
    await this.deltaDeleteTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasDeltaDeleteTabData(): Promise<boolean> {
    try {
      return !(await this.deltaDeleteTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  async clickStableTab(): Promise<void> {
    await this.stableTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasStableTabData(): Promise<boolean> {
    try {
      return !(await this.stableTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  async clickDeltaErrorTab(): Promise<void> {
    await this.deltaErrorTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async hasDeltaErrorTabData(): Promise<boolean> {
    try {
      return !(await this.deltaErrorTabEmpty.isVisible({ timeout: 2000 }));
    } catch {
      return true;
    }
  }

  // ==================== DOWNLOAD METHODS ====================

  async isDownloadButtonVisible(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(1000);
      return await this.downloadButton.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  async downloadAsTabSeparated(): Promise<void> {
    await this.downloadButton.click();
    await this.tabSeparatedOption.click();
    await this.page.waitForTimeout(3000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async downloadAsExcel(): Promise<void> {
    await this.downloadButton.click();
    await this.excelOption.click();
    await this.page.waitForTimeout(8000);
  }

  async isToasterMessageVisible(): Promise<boolean> {
    try {
      await this.toasterMessage.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async goToDownloadsTab(): Promise<void> {
    await this.downloadsTab.click();
    await this.page.waitForTimeout(2000);
  }

  async refreshDownloads(): Promise<void> {
    await this.refreshButton.click();
    await this.page.waitForTimeout(2000);
  }

  // ==================== UTILITY METHODS ====================

  async getUIFilteredCount(): Promise<number> {
    try {
      const text = await this.page.evaluate(() => document.body.innerText);
      const pattern = /(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/g;
      let match;
      let lastCount = null;
      
      while ((match = pattern.exec(text)) !== null) {
        lastCount = match[3];
      }
      
      return lastCount ? parseInt(lastCount) : -1;
    } catch (error) {
      console.log(`Error capturing UI count: ${error}`);
      return -1;
    }
  }

  async isFilterPanelClosed(): Promise<boolean> {
    try {
      return await this.filterButton.isVisible();
    } catch {
      return false;
    }
  }

  async isFilterPanelVisible(): Promise<boolean> {
    try {
      return await this.filterPanel.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }


  // ==================== MAIN TEST FLOW METHODS ====================

  /**
   * Apply UK SANCTIONS filter for a specific tab with all individual filters
   */
  async applyFiltersForTab(
    tabName: string,
    designatedDate: string,
    idType: string,
    programSource: string,
    regimeName: string,
    type: string
  ): Promise<void> {
    // Test Id Type filter with Select All
    await this.openFilterPanel();
    await this.selectIdTypeFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
    } else {
      console.log(`${tabName} Tab - No Records for Id Type filter`);
      await this.clearAppliedFilters();
    }

    // Test Designated Date filter
    await this.openFilterPanel();
    await this.setDesignatedDateFilter(designatedDate);
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
    } else {
      console.log(`${tabName} Tab - No Records for Designated date filter`);
      await this.clearAppliedFilters();
    }

    // Test Program Source filter with Select All
    await this.openFilterPanel();
    await this.selectProgramSourceFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
    } else {
      console.log(`${tabName} Tab - No Records for Program source filter`);
      await this.clearAppliedFilters();
    }

    // Test Regime Name filter with Select All
    await this.openFilterPanel();
    await this.selectRegimeNameFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
    } else {
      console.log(`${tabName} Tab - No Records for Regime name filter`);
      await this.clearAppliedFilters();
    }

    // Test Type filter with Select All
    await this.openFilterPanel();
    await this.selectTypeFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
    } else {
      console.log(`${tabName} Tab - No Records for Type filter`);
      await this.clearAppliedFilters();
    }

    // Test ALL filters combined
    await this.openFilterPanel();
    await this.setDesignatedDateFilter(designatedDate);
    await this.searchAndSelectIdType(idType);
    await this.searchAndSelectProgramSource(programSource);
    await this.searchAndSelectRegimeName(regimeName);
    await this.searchAndSelectType(type);
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
    } else {
      console.log(`${tabName} Tab - No Records for All filter`);
      await this.clearAppliedFilters();
    }
  }

  /**
   * Main method to apply UK SANCTIONS filter across all tabs
   * Equivalent to Java's apply_uksanctions_filter method
   * Includes MongoDB validation for UI count verification
   * @returns Object containing validation results for reporting
   */
  async applyUKSanctionsFilter(
    designatedDate: string,
    idType: string,
    programSource: string,
    regimeName: string,
    type: string,
    invalidId: string,
    enableMongoValidation: boolean = false
  ): Promise<{
    mongoValidationEnabled: boolean;
    mongoConnected: boolean;
    validationResults: Array<{ tab: string; uiCount: number; dbCount?: number; passed?: boolean; message?: string }>;
  }> {
    const results: {
      mongoValidationEnabled: boolean;
      mongoConnected: boolean;
      validationResults: Array<{ tab: string; uiCount: number; dbCount?: number; passed?: boolean; message?: string }>;
    } = {
      mongoValidationEnabled: enableMongoValidation,
      mongoConnected: false,
      validationResults: []
    };

    // Initialize MongoDB if validation is enabled
    if (enableMongoValidation) {
      try {
        await this.initMongoDB();
        results.mongoConnected = true;
      } catch (error) {
        console.log(`[applyUKSanctionsFilter] MongoDB initialization failed: ${error}`);
        console.log("[applyUKSanctionsFilter] Continuing without MongoDB validation");
        results.mongoConnected = false;
      }
    }

    try {
      // ==================== ACTIVE TAB ====================
      if (await this.hasActiveTabData()) {
        await this.clickActiveTab();

        // Test Cancel button
        await this.openFilterPanel();
        await this.closeFilterPanel();
        
        if (await this.isFilterPanelClosed()) {
          console.log("Close Button is working");
        } else {
          console.log("Close Button not Working");
        }

        // Test Clear All button
        await this.openFilterPanel();
        await this.selectIdTypeFilterAll();
        await this.clearAllFilters();
        await this.applyFilter();

        if (await this.noFilterMessage.isVisible()) {
          console.log("Clear All Button is Working");
          console.log("No filter is added");
        }

        // Test Id Type filter and validate count
        await this.openFilterPanel();
        await this.selectIdTypeFilterAll();
        await this.applyFilter();

        const uiCount = await this.getUIFilteredCount();
        console.log(`[apply_uksanctions_filter] UI Filtered Count (Id Type Select All): ${uiCount}`);

        // MongoDB validation (if enabled)
        if (enableMongoValidation && this.mongoQueries && results.mongoConnected) {
          const validationResult = await this.validateUICountWithMongoDB(uiCount);
          console.log(`[apply_uksanctions_filter] MongoDB Count (UK SANCTIONS Active with ID Type): ${validationResult.dbCount}`);
          console.log(`[apply_uksanctions_filter] ${validationResult.message}`);
          
          // Store validation result for reporting
          results.validationResults.push({
            tab: "Active",
            uiCount: uiCount,
            dbCount: validationResult.dbCount,
            passed: validationResult.passed,
            message: validationResult.message
          });
        } else {
          // Store UI count only (no MongoDB validation)
          results.validationResults.push({
            tab: "Active",
            uiCount: uiCount,
            message: results.mongoConnected ? "MongoDB validation not enabled" : "MongoDB not connected"
          });
        }

        // Download as Tab Separated and Excel (like Java)
        if (await this.isDownloadButtonVisible()) {
          await this.downloadAsTabSeparated();
          
          // Try Excel download and check toaster (like Java)
          try {
            await this.downloadAsExcel();
            if (await this.isToasterMessageVisible()) {
              console.log("Request is in progress");
            }
          } catch {
            console.log("Download is started for same filter");
          }
          
          await this.clearAppliedFilters();
        } else {
          console.log("Active Tab - No Records for ID Type filter");
          await this.clearAppliedFilters();
        }

        // Apply remaining filters for Active tab
        await this.applyFiltersForTab("Active", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in Active Tab");
      }

      // ==================== ERROR TAB ====================
      if (await this.hasErrorTabData()) {
        await this.clickErrorTab();
        await this.applyFiltersForTab("Error", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in Error Tab");
      }

      // ==================== DELETE TAB ====================
      if (await this.hasDeleteTabData()) {
        await this.clickDeleteTab();
        await this.applyFiltersForTab("Delete", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in Delete Tab");
      }

      // Toggle Delta view
      await this.toggleDeltaView();

      // ==================== NEW TAB (Delta) ====================
      if (await this.hasNewTabData()) {
        await this.clickNewTab();
        await this.applyFiltersForTab("New", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in New Tab");
      }

      // ==================== AMEND TAB (Delta) ====================
      if (await this.hasAmendTabData()) {
        await this.clickAmendTab();
        await this.applyFiltersForTab("Amend", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in Amend Tab");
      }

      // ==================== DELTA DELETE TAB ====================
      if (await this.hasDeltaDeleteTabData()) {
        await this.clickDeltaDeleteTab();
        await this.applyFiltersForTab("Delta Delete", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in Delta Delete Tab");
      }

      // ==================== STABLE TAB (Delta) ====================
      if (await this.hasStableTabData()) {
        await this.clickStableTab();
        await this.applyFiltersForTab("Stable", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in Stable Tab");
      }

      // ==================== DELTA ERROR TAB ====================
      if (await this.hasDeltaErrorTabData()) {
        await this.clickDeltaErrorTab();
        await this.applyFiltersForTab("Delta Error", designatedDate, idType, programSource, regimeName, type);
      } else {
        console.log("No Data in Delta Error Tab");
      }
    } finally {
      // Close MongoDB connection
      if (enableMongoValidation) {
        await this.closeMongoDB();
      }
    }
    
    return results;
  }

  /**
   * Check download status - equivalent to Java's check_download_status_2
   * Polls the Downloads tab until a successful download is found (max 30 seconds)
   */
  async checkDownloadStatus(): Promise<void> {
    await this.goToDownloadsTab();
    await this.page.waitForTimeout(2000);
    await this.refreshDownloads();

    const maxWaitTime = 30000; // 30 seconds max
    const pollInterval = 3000; // Check every 3 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await this.refreshDownloads();
      await this.page.waitForTimeout(pollInterval);

      try {
        const isSuccessVisible = await this.successStatus.isVisible({ timeout: 2000 });
        if (isSuccessVisible) {
          console.log("Download completed successfully");
          await this.downloadLink.click();
          return;
        }
      } catch {
        // Continue polling
      }
    }

    console.log("Download status check timed out after 30 seconds");
  }
}
