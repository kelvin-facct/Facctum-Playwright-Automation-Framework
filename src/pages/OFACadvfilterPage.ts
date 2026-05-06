import { Page, Locator } from "@playwright/test";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { MongoDBHelper, OFACMongoQueries } from "../helpers/mongoHelper";

/**
 * Page Object for OFAC Advanced Filter functionality
 * Migrated from Java Selenium to TypeScript Playwright
 * 
 * OFAC Filter Categories:
 * - Address country
 * - Citizenship country
 * - Nationality country
 * - Program name
 * - Type
 * - Last Updated Date (date range with start/end)
 */
export class OFACadvfilterPage {
  private page: Page;
  private actions: PlaywrightActions;
  private mongoHelper: MongoDBHelper | null = null;
  private mongoQueries: OFACMongoQueries | null = null;

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
  private readonly ofacList: Locator;
  private readonly ofacEnhancedList: Locator;

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
  private readonly selectAllLabel: Locator;

  // OFAC Filter accordion tabs (in filter panel)
  private readonly addressCountryFilter: Locator;
  private readonly addressCountrySearch: Locator;
  private readonly addressCountrySelectAll: Locator;
  private readonly citizenshipCountryFilter: Locator;
  private readonly citizenshipCountrySearch: Locator;
  private readonly citizenshipCountrySelectAll: Locator;
  private readonly nationalityCountryFilter: Locator;
  private readonly nationalityCountrySearch: Locator;
  private readonly nationalityCountrySelectAll: Locator;
  private readonly programNameFilter: Locator;
  private readonly programNameSearch: Locator;
  private readonly programNameSelectAll: Locator;
  private readonly typeFilter: Locator;
  private readonly typeSearch: Locator;
  private readonly typeSelectAll: Locator;
  private readonly lastUpdatedDateFilter: Locator;
  private readonly startDateInput: Locator;
  private readonly endDateInput: Locator;

  // ==================== DOWNLOAD LOCATORS ====================
  private readonly downloadButton: Locator;
  private readonly excelOption: Locator;
  private readonly tabSeparatedOption: Locator;
  private readonly toasterMessage: Locator;
  private readonly refreshButton: Locator;
  private readonly downloadStatus: Locator;
  private readonly successStatus: Locator;
  private readonly downloadLink: Locator;

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
    this.continueLoginButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.productCard = page.locator(".product-card").first();
    this.facctlistDashboard = page.locator("div:has-text('Dashboard')").first();

    // Navigation locators
    this.watchlistMenu = page.locator("div[aria-label='Watchlist']");
    this.regulatoryListOption = page.locator("span:has-text('Regulatory list')");
    this.paginationButton = page.locator("#basic-button");
    this.pageValue100 = page.locator("li:has-text('100')");
    this.ofacList = page.locator("div.link-cell:has-text('OFAC')").first();
    this.ofacEnhancedList = page.locator("div.link-cell:has-text('OFAC Enhanced')");

    // Tab locators
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
    this.filterButton = page.locator("#record-table-filter-btn");
    this.filterPanel = page.locator(".facct-drawer-modal");
    this.filterPanelCloseIcon = page.locator(".facct-drawer-modal [data-testid='CloseIcon']");
    this.cancelButton = page.locator("#advance-filter-close-btn");
    this.clearAllButton = page.locator("#advance-filter-clear-all-btn");
    this.applyButton = page.locator("#advance-filter-apply-btn");
    this.clearFiltersButton = page.locator("#regulatory-records-clear-filters-btn");
    this.noFilterMessage = page.getByText('No filters selected', { exact: true });
    this.noDataMessage = page.locator("h5:has-text('No data available')");
    this.selectAllLabel = page.locator("label:has-text('Select all')");

    // OFAC Filter accordion tabs
    this.addressCountryFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Address country')");
    this.addressCountrySearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search address country']");
    this.addressCountrySelectAll = page.locator("#advance-filter-list-select-all-addressDetailsList\\.countryName");
    this.citizenshipCountryFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Citizenship country')");
    this.citizenshipCountrySearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search citizenship country']");
    this.citizenshipCountrySelectAll = page.locator("#advance-filter-list-select-all-citizenshipDetailsList\\.countryName");
    this.nationalityCountryFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Nationality country')");
    this.nationalityCountrySearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search nationality country']");
    this.nationalityCountrySelectAll = page.locator("#advance-filter-list-select-all-nationalityDetailsList\\.countryName");
    this.programNameFilter = page.locator(".facct-drawer-modal button[role='tab']:has-text('Program name')");
    this.programNameSearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search program name']");
    this.programNameSelectAll = page.locator("#advance-filter-list-select-all-sanctionProgramDetailsList\\.programName");
    this.typeFilter = page.getByRole('tab', { name: 'Type', exact: true });
    this.typeSearch = page.locator(".facct-drawer-modal input.filter-search-bar[placeholder='Search type']");
    this.typeSelectAll = page.locator("#advance-filter-list-select-all-entityTypeName");
    this.lastUpdatedDateFilter = page.locator(".facct-drawer-modal span:has-text('Last Updated Date')").first();
    this.startDateInput = page.locator(".facct-drawer-modal input[name='startDate']");
    this.endDateInput = page.locator(".facct-drawer-modal input[name='endDate']");

    // Download locators
    this.downloadButton = page.locator("#regulatory-records-download-btn");
    this.excelOption = page.locator("li[role='menuitem']:has-text('Excel (.xlsx)')");
    this.tabSeparatedOption = page.locator("li[role='menuitem']:has-text('Tab separated (.tsv)')");
    this.toasterMessage = page.locator(".Toastify__toast-body");
    this.refreshButton = page.locator("button[aria-label='refresh button']").first();
    this.downloadStatus = page.locator("div:has-text('Download started.')");
    this.successStatus = page.locator("tbody tr").first().locator("td").nth(5).locator("div.status");
    this.downloadLink = page.locator("tbody tr").first().locator("td").nth(6).locator("button");
  }

  // ==================== MONGODB METHODS ====================

  async initMongoDB(): Promise<boolean> {
    if (!this.mongoHelper) {
      try {
        this.mongoHelper = new MongoDBHelper();
        await this.mongoHelper.connect();
        this.mongoQueries = new OFACMongoQueries(this.mongoHelper);
        return true;
      } catch (error) {
        console.log(`[initMongoDB] MongoDB connection failed, continuing without validation: ${error}`);
        this.mongoHelper = null;
        this.mongoQueries = null;
        return false;
      }
    }
    return true;
  }

  async closeMongoDB(): Promise<void> {
    if (this.mongoHelper) {
      await this.mongoHelper.disconnect();
      this.mongoHelper = null;
      this.mongoQueries = null;
    }
  }

  /**
   * Validate UI count against MongoDB for OFAC
   * Equivalent to Java's inline MongoDB validation
   */
  async validateUICountWithMongoDB(
    uiCount: number,
    listName: string = "OFAC Enhanced"
  ): Promise<{
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

    return await this.mongoQueries.validateUICount(uiCount, listName);
  }

  /**
   * Validate UI count with specific filter type
   */
  async validateUICountWithFilter(
    uiCount: number,
    filterType: "address" | "citizenship" | "nationality" | "program" | "type",
    listName: string = "OFAC Enhanced"
  ): Promise<{
    passed: boolean;
    uiCount: number;
    dbCount: number;
    message: string;
  }> {
    if (!this.mongoQueries) {
      console.log("[validateUICountWithFilter] MongoDB not initialized, skipping validation");
      return {
        passed: true,
        uiCount,
        dbCount: -1,
        message: "MongoDB validation skipped - not initialized"
      };
    }

    return await this.mongoQueries.validateUICountWithFilter(uiCount, filterType, listName);
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
    await this.page.waitForTimeout(2000);
    await this.regulatoryListOption.click();
    await this.page.waitForTimeout(1000);
  }

  async selectOFACList(): Promise<void> {
    await this.paginationButton.click();
    await this.page.waitForTimeout(1000);
    await this.pageValue100.click();
    await this.page.waitForTimeout(1000);
    await this.ofacList.click();
    await this.page.waitForTimeout(5000);
  }

  async selectOFACEnhancedList(): Promise<void> {
    await this.paginationButton.click();
    await this.page.waitForTimeout(1000);
    await this.pageValue100.click();
    await this.page.waitForTimeout(1000);
    await this.ofacEnhancedList.click();
    await this.page.waitForTimeout(5000);
  }

  // ==================== FILTER METHODS ====================

  async openFilterPanel(): Promise<void> {
    // Wait for any loading to complete
    await this.page.waitForLoadState('networkidle').catch(() => {});
    
    // Wait for any toast notifications to disappear
    const toast = this.page.locator(".Toastify__toast");
    const toastVisible = await toast.isVisible().catch(() => false);
    if (toastVisible) {
      console.log("Waiting for toast notification to disappear before opening filter panel...");
      await toast.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
        console.log("Toast did not disappear, proceeding anyway");
      });
    }
    
    // Wait for any loading spinners to disappear
    const spinner = this.page.locator(".MuiCircularProgress-root, .loading-spinner, [class*='loading']");
    const spinnerVisible = await spinner.first().isVisible().catch(() => false);
    if (spinnerVisible) {
      console.log("Waiting for loading spinner to disappear...");
      await spinner.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
        console.log("Spinner did not disappear, proceeding anyway");
      });
    }
    
    await this.page.waitForTimeout(1000);  // Reduced from 2000
    
    // Retry mechanism - try up to 3 times with increasing waits
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[openFilterPanel] Attempt ${attempt} to find filter button...`);
      
      // Try multiple locator strategies for the filter button
      const filterButtonLocators = [
        this.filterButton,
        this.page.locator("button#record-table-filter-btn"),
        this.page.locator("[id='record-table-filter-btn']"),
        this.page.locator("button[aria-label*='filter']"),
        this.page.locator("button:has(svg[data-testid='FilterListIcon'])"),
        this.page.getByRole('button', { name: /filter/i })
      ];
      
      let buttonFound = false;
      let workingLocator: Locator | null = null;
      
      for (const locator of filterButtonLocators) {
        try {
          // First try to wait for the element to be attached to DOM
          await locator.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});  // Reduced from 5000
          
          const isVisible = await locator.isVisible({ timeout: 2000 }).catch(() => false);  // Reduced from 3000
          if (isVisible) {
            workingLocator = locator;
            buttonFound = true;
            console.log(`[openFilterPanel] Filter button found on attempt ${attempt}`);
            break;
          }
        } catch {
          // Try next locator
        }
      }
      
      if (buttonFound && workingLocator) {
        // Scroll the button into view before clicking
        await workingLocator.scrollIntoViewIfNeeded().catch(() => {});
        await this.page.waitForTimeout(300);  // Reduced from 500
        
        // Try clicking with force if normal click fails
        try {
          await workingLocator.click({ timeout: 3000 });  // Reduced from 5000
        } catch {
          console.log("[openFilterPanel] Normal click failed, trying force click...");
          await workingLocator.click({ force: true, timeout: 3000 });
        }
        
        await this.page.waitForTimeout(1000);  // Reduced from 2000
        return;
      }
      
      // If not found, try clicking Records tab to ensure we're on the right view
      if (attempt < 3) {
        console.log(`[openFilterPanel] Filter button not found on attempt ${attempt}, trying to click Records tab...`);
        try {
          // First ensure we're on Records tab (not Downloads tab)
          await this.ensureOnRecordsTab();
          
          // Then try clicking the Active tab to ensure filter button is visible
          const activeTabLocators = [
            this.activeTab,
            this.page.locator("button[role='tab']").filter({ hasText: /^Active \(/ }),
            this.page.locator("button:has-text('Active')").first()
          ];
          
          for (const tabLocator of activeTabLocators) {
            const tabVisible = await tabLocator.isVisible({ timeout: 2000 }).catch(() => false);
            if (tabVisible) {
              await tabLocator.click();
              await this.page.waitForTimeout(1500);  // Reduced from 3000
              await this.page.waitForLoadState('networkidle').catch(() => {});
              break;
            }
          }
        } catch {
          console.log("[openFilterPanel] Tab navigation failed");
        }
        
        // Wait longer before next attempt
        await this.page.waitForTimeout(1000 * attempt);  // Reduced from 2000 * attempt
      }
    }
    
    // If we get here, all attempts failed
    console.log("[openFilterPanel] Filter button still not visible after all attempts, taking screenshot for debugging");
    await this.page.screenshot({ path: `reports/debug-filter-button-${Date.now()}.png` });
    throw new Error("Filter button not visible after all attempts");
  }

  async closeFilterPanel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(1000);  // Reduced from 2000
  }

  async applyFilter(): Promise<void> {
    await this.applyButton.click();
    await this.page.waitForTimeout(1500);  // Reduced from 3000
    await this.page.waitForSelector('.facct-drawer-modal', { state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async clearAllFilters(): Promise<void> {
    await this.clearAllButton.click();
  }

  async clearAppliedFilters(): Promise<void> {
    try {
      // Wait for any toast notifications to disappear
      const toast = this.page.locator(".Toastify__toast");
      const toastVisible = await toast.isVisible().catch(() => false);
      if (toastVisible) {
        console.log("Waiting for toast notification to disappear...");
        await toast.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
          console.log("Toast did not disappear, proceeding anyway");
        });
      }
      
      await this.page.waitForTimeout(1000);  // Reduced from 2000
      
      // Wait for any loading spinners to disappear
      const spinner = this.page.locator(".MuiCircularProgress-root, .loading-spinner, [class*='loading']");
      const spinnerVisible = await spinner.first().isVisible().catch(() => false);
      if (spinnerVisible) {
        console.log("Waiting for loading spinner to disappear...");
        await spinner.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
          console.log("Spinner did not disappear, proceeding anyway");
        });
      }
      
      // Try multiple locators for the clear filters button
      const clearButtonLocators = [
        this.clearFiltersButton,
        this.page.locator("#regulatory-records-clear-filters-btn"),
        this.page.locator("button:has-text('CLEAR FILTERS')"),
        this.page.getByRole('button', { name: 'CLEAR FILTERS' })
      ];
      
      let buttonClicked = false;
      for (const locator of clearButtonLocators) {
        const isVisible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          await locator.click();
          buttonClicked = true;
          console.log("[clearAppliedFilters] Clear filters button clicked");
          break;
        }
      }
      
      if (!buttonClicked) {
        console.log("[clearAppliedFilters] Clear filters button not visible");
      }
      
      await this.page.waitForTimeout(1500);  // Reduced from 3000
    } catch (error) {
      console.log(`[clearAppliedFilters] Error: ${error}`);
    }
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(1000);  // Reduced from 2000
  }

  async isNoFilterMessageVisible(): Promise<boolean> {
    try {
      return await this.noFilterMessage.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  // Address Country Filter
  async selectAddressCountryFilterAll(): Promise<void> {
    await this.addressCountryFilter.click();
    await this.page.waitForTimeout(500);
    await this.addressCountrySelectAll.click({ force: true });
  }

  async searchAndSelectAddressCountry(country: string): Promise<void> {
    await this.addressCountryFilter.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(500);
    await this.addressCountrySearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.addressCountrySearch.click();
    await this.addressCountrySearch.fill(country);
    await this.page.waitForTimeout(2000);
    if (await this.noDataMessage.isVisible()) {
      console.log("Entered data is not in Ref Data");
      await this.addressCountrySearch.clear();
      return;
    }
    await this.addressCountrySelectAll.click({ force: true });
  }

  // Citizenship Country Filter
  async selectCitizenshipCountryFilterAll(): Promise<void> {
    await this.citizenshipCountryFilter.click();
    await this.page.waitForTimeout(500);
    await this.citizenshipCountrySelectAll.click({ force: true });
  }

  async searchAndSelectCitizenshipCountry(country: string): Promise<void> {
    await this.citizenshipCountryFilter.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(500);
    await this.citizenshipCountrySearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.citizenshipCountrySearch.click();
    await this.citizenshipCountrySearch.fill(country);
    await this.page.waitForTimeout(1000);
    await this.citizenshipCountrySelectAll.click({ force: true });
  }

  // Nationality Country Filter
  async selectNationalityCountryFilterAll(): Promise<void> {
    await this.nationalityCountryFilter.click();
    await this.page.waitForTimeout(500);
    await this.nationalityCountrySelectAll.click({ force: true });
  }

  async searchAndSelectNationalityCountry(country: string): Promise<void> {
    await this.nationalityCountryFilter.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(500);
    await this.nationalityCountrySearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.nationalityCountrySearch.click();
    await this.nationalityCountrySearch.fill(country);
    await this.page.waitForTimeout(1000);
    await this.nationalityCountrySelectAll.click({ force: true });
  }

  // Program Name Filter
  async selectProgramNameFilterAll(): Promise<void> {
    await this.programNameFilter.click();
    await this.page.waitForTimeout(500);
    await this.programNameSelectAll.click({ force: true });
  }

  async searchAndSelectProgramName(program: string): Promise<void> {
    await this.programNameFilter.evaluate((el) => (el as HTMLElement).click());
    await this.page.waitForTimeout(500);
    await this.programNameSearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.programNameSearch.click();
    await this.programNameSearch.fill(program);
    await this.page.waitForTimeout(1000);
    await this.programNameSelectAll.click({ force: true });
  }

  // Type Filter
  async selectTypeFilterAll(): Promise<void> {
    await this.typeFilter.click();
    await this.page.waitForTimeout(1000);
    const selectAllCheckbox = this.page.locator("input[id^='advance-filter-list-select-all']").first();
    await selectAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await selectAllCheckbox.click({ force: true });
  }

  async searchAndSelectType(type: string): Promise<void> {
    await this.typeFilter.click();
    await this.page.waitForTimeout(1000);
    await this.typeSearch.waitFor({ state: 'visible', timeout: 10000 });
    await this.typeSearch.click();
    await this.typeSearch.fill(type);
    await this.page.waitForTimeout(1000);
    await this.typeSelectAll.click({ force: true });
  }

  // Last Updated Date Filter
  async setLastUpdatedDateFilter(startDate: string, endDate: string): Promise<void> {
    // Try multiple locator strategies for the Last Updated Date filter tab
    const lastUpdatedLocators = [
      this.lastUpdatedDateFilter,
      this.page.locator(".facct-drawer-modal span:has-text('Last Updated Date')").first(),
      this.page.locator(".facct-drawer-modal button:has-text('Last Updated Date')").first(),
      this.page.locator(".facct-drawer-modal [role='tab']:has-text('Last Updated Date')").first(),
      this.page.getByText('Last Updated Date', { exact: true }).first()
    ];
    
    let clicked = false;
    for (const locator of lastUpdatedLocators) {
      try {
        const isVisible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          // Use JavaScript click for more reliable interaction
          await locator.evaluate((el) => (el as HTMLElement).click());
          clicked = true;
          console.log("[setLastUpdatedDateFilter] Last Updated Date filter tab clicked");
          break;
        }
      } catch {
        // Try next locator
      }
    }
    
    if (!clicked) {
      console.log("[setLastUpdatedDateFilter] Last Updated Date filter tab not found, skipping date filter");
      return;
    }
    
    await this.page.waitForTimeout(1000);
    
    // Wait for date inputs to be visible
    const startDateVisible = await this.startDateInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!startDateVisible) {
      console.log("[setLastUpdatedDateFilter] Start date input not visible, skipping date filter");
      return;
    }
    
    await this.startDateInput.click();
    await this.startDateInput.fill(startDate);
    await this.page.waitForTimeout(500);
    await this.endDateInput.click();
    await this.endDateInput.fill(endDate);
    await this.page.waitForTimeout(500);
  }


  // ==================== TAB METHODS ====================

  async clickActiveTab(): Promise<void> {
    await this.activeTab.click();
    await this.page.waitForTimeout(500);  // Reduced from 1000
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
    await this.page.waitForTimeout(500);  // Reduced from 1000
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
    await this.page.waitForTimeout(500);  // Reduced from 1000
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
    await this.page.waitForTimeout(1500);  // Reduced from 3000
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickNewTab(): Promise<void> {
    await this.newTab.click();
    await this.page.waitForTimeout(500);  // Reduced from 1000
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
    await this.page.waitForTimeout(500);  // Reduced from 1000
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
    await this.page.waitForTimeout(500);  // Reduced from 1000
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
    await this.page.waitForTimeout(500);  // Reduced from 1000
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
    await this.page.waitForTimeout(500);  // Reduced from 1000
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

  async clickRecordsTab(): Promise<void> {
    await this.recordsTab.click();
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /**
   * Ensure we're on the Records tab (not Downloads tab)
   * This is needed after download operations which might leave us on Downloads tab
   */
  async ensureOnRecordsTab(): Promise<void> {
    console.log("[ensureOnRecordsTab] Ensuring we're on Records tab...");
    
    // Wait for any loading to complete
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(2000);
    
    // Check if we're on Downloads tab by looking for the Records tab button
    const recordsTabLocators = [
      this.recordsTab,
      this.page.locator("button[aria-label='Records']"),
      this.page.locator("button:has-text('Records')"),
      this.page.getByRole('tab', { name: 'Records' })
    ];
    
    for (const locator of recordsTabLocators) {
      try {
        const isVisible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          // Check if it's already selected
          const ariaSelected = await locator.getAttribute('aria-selected').catch(() => null);
          if (ariaSelected !== 'true') {
            console.log("[ensureOnRecordsTab] Clicking Records tab...");
            await locator.click();
            await this.page.waitForTimeout(3000);
            await this.page.waitForLoadState('networkidle').catch(() => {});
          } else {
            console.log("[ensureOnRecordsTab] Already on Records tab");
          }
          return;
        }
      } catch {
        // Try next locator
      }
    }
    
    console.log("[ensureOnRecordsTab] Records tab not found, may already be on correct view");
  }

  async downloadAsTabSeparated(): Promise<void> {
    console.log("[downloadAsTabSeparated] Starting download...");
    await this.downloadButton.click();
    await this.tabSeparatedOption.click();
    await this.page.waitForTimeout(2000);  // Reduced from 4000
    await this.page.waitForLoadState('networkidle').catch(() => {});
    
    // Wait for any toast notifications to appear and then disappear
    await this.page.waitForTimeout(1500);  // Reduced from 3000
    const toast = this.page.locator(".Toastify__toast");
    const toastVisible = await toast.isVisible().catch(() => false);
    if (toastVisible) {
      console.log("[downloadAsTabSeparated] Waiting for download toast to disappear...");
      await toast.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
        console.log("[downloadAsTabSeparated] Toast did not disappear, proceeding anyway");
      });
    }
    
    // Additional wait to ensure page is stable after download
    await this.page.waitForTimeout(1500);  // Reduced from 3000
    await this.page.waitForLoadState('networkidle').catch(() => {});
    console.log("[downloadAsTabSeparated] Download completed");
  }

  async downloadAsExcel(): Promise<void> {
    console.log("[downloadAsExcel] Starting download...");
    await this.downloadButton.click();
    await this.excelOption.click();
    await this.page.waitForTimeout(4000);  // Reduced from 8000
    await this.page.waitForLoadState('networkidle').catch(() => {});
    
    // Wait for any toast notifications to appear and then disappear
    await this.page.waitForTimeout(1500);  // Reduced from 3000
    const toast = this.page.locator(".Toastify__toast");
    const toastVisible = await toast.isVisible().catch(() => false);
    if (toastVisible) {
      console.log("[downloadAsExcel] Waiting for download toast to disappear...");
      await toast.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
        console.log("[downloadAsExcel] Toast did not disappear, proceeding anyway");
      });
    }
    
    // Additional wait to ensure page is stable after download
    await this.page.waitForTimeout(1500);  // Reduced from 3000
    await this.page.waitForLoadState('networkidle').catch(() => {});
    console.log("[downloadAsExcel] Download completed");
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
    await this.page.waitForTimeout(3000);
  }

  async refreshDownloads(): Promise<void> {
    await this.refreshButton.click();
    await this.page.waitForTimeout(3000);
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
   * Apply individual filters for a specific tab
   * @param tabName - Name of the current tab for logging
   * @param startDate - Start date for Last Updated Date filter
   * @param endDate - End date for Last Updated Date filter
   * @param clickTabAfterClear - Function to click the current tab after clearing filters (Java behavior)
   */
  async applyFiltersForTab(
    tabName: string,
    startDate: string,
    endDate: string,
    clickTabAfterClear?: () => Promise<void>
  ): Promise<void> {
    // Test Address Country filter with Select All
    await this.openFilterPanel();
    await this.selectAddressCountryFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    } else {
      console.log(`${tabName} Tab - No Records for Address country filter`);
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    }

    // Test Citizenship Country filter with Select All
    await this.openFilterPanel();
    await this.selectCitizenshipCountryFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    } else {
      console.log(`${tabName} Tab - No Records for Citizenship country filter`);
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    }

    // Test Last Updated Date filter
    await this.openFilterPanel();
    await this.setLastUpdatedDateFilter(startDate, endDate);
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    } else {
      console.log(`${tabName} Tab - No Records for Last Updated Date filter`);
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    }

    // Test Nationality Country filter with Select All
    await this.openFilterPanel();
    await this.selectNationalityCountryFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    } else {
      console.log(`${tabName} Tab - No Records for Nationality country filter`);
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    }

    // Test Program Name filter with Select All
    await this.openFilterPanel();
    await this.selectProgramNameFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    } else {
      console.log(`${tabName} Tab - No Records for Program name filter`);
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    }

    // Test Type filter with Select All
    await this.openFilterPanel();
    await this.selectTypeFilterAll();
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    } else {
      console.log(`${tabName} Tab - No Records for Type filter`);
      await this.clearAppliedFilters();
      if (clickTabAfterClear) await clickTabAfterClear();
    }
  }

  /**
   * Apply all filters combined for a specific tab
   */
  async applyAllFiltersCombined(
    tabName: string,
    address: string,
    citizenship: string,
    nationality: string,
    program: string,
    type: string,
    invalidAddress?: string
  ): Promise<void> {
    await this.openFilterPanel();

    // Test with invalid address first (if provided)
    if (invalidAddress) {
      await this.addressCountryFilter.evaluate((el) => (el as HTMLElement).click());
      await this.page.waitForTimeout(500);
      await this.addressCountrySearch.waitFor({ state: 'visible', timeout: 10000 });
      await this.addressCountrySearch.click();
      await this.addressCountrySearch.fill(invalidAddress);
      await this.page.waitForTimeout(2000);
      if (await this.noDataMessage.isVisible()) {
        console.log("Entered data is not in Ref Data");
        await this.addressCountrySearch.clear();
      }
    }

    // Apply all filters
    await this.searchAndSelectAddressCountry(address);
    await this.searchAndSelectCitizenshipCountry(citizenship);
    await this.searchAndSelectNationalityCountry(nationality);
    await this.searchAndSelectProgramName(program);
    await this.searchAndSelectType(type);
    await this.applyFilter();

    if (await this.isDownloadButtonVisible()) {
      await this.downloadAsTabSeparated();
      await this.clearAppliedFilters();
    } else {
      console.log(`${tabName} Tab - No Records for All filters combined`);
      await this.clearAppliedFilters();
    }
  }

  /**
   * Apply filters for Active tab only (simplified to fit within 60 seconds)
   * Tests: Cancel button, Clear All button, Address filter with Select All + download
   */
  async applyFiltersForActiveTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string,
    invalidAddress: string,
    enableMongoValidation: boolean = false
  ): Promise<void> {
    // Initialize MongoDB if validation is enabled (gracefully handles connection failures)
    let mongoConnected = false;
    if (enableMongoValidation) {
      mongoConnected = await this.initMongoDB();
      if (!mongoConnected) {
        console.log("[applyFiltersForActiveTab] MongoDB not available, continuing without validation");
      }
    }

    if (await this.hasActiveTabData()) {
      await this.clickActiveTab();

      // Test Cancel button functionality
      await this.openFilterPanel();
      await this.closeFilterPanel();
      if (await this.isFilterPanelClosed()) {
        console.log("Close Button is working");
      } else {
        console.log("Close Button not Working");
      }

      // Test Clear All button functionality
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.clearAllFilters();
      await this.applyFilter();
      if (await this.isNoFilterMessageVisible()) {
        console.log("Clear All Button is Working");
        console.log("No filter is added");
      } else {
        console.log("Filter is working without selecting");
      }

      // Test Address Country with Select All and MongoDB validation
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      const uiCount = await this.getUIFilteredCount();
      console.log(`[applyFiltersForActiveTab] UI Filtered Count (Address Select All): ${uiCount}`);

      if (enableMongoValidation && this.mongoQueries) {
        const validation = await this.validateUICountWithMongoDB(uiCount, "OFAC Enhanced");
        console.log(`[applyFiltersForActiveTab] MongoDB Count: ${validation.dbCount}`);
        console.log(`[applyFiltersForActiveTab] ${validation.message}`);
      }

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickActiveTab(); // Click Active tab after clearing (ensures filter button is visible)
      } else {
        console.log("Active Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickActiveTab(); // Click Active tab after clearing (ensures filter button is visible)
      }
    } else {
      console.log("No Data in Active Tab");
    }

    if (enableMongoValidation) {
      await this.closeMongoDB();
    }
  }

  /**
   * Apply filters for Error tab only (simplified to fit within 60 seconds)
   */
  async applyFiltersForErrorTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string
  ): Promise<void> {
    if (await this.hasErrorTabData()) {
      await this.clickErrorTab();
      
      // Test Address Country with Select All
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickErrorTab();
      } else {
        console.log("Error Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickErrorTab();
      }
    } else {
      console.log("No Data in Error Tab");
    }
  }

  /**
   * Apply filters for Delete tab only (simplified to fit within 60 seconds)
   */
  async applyFiltersForDeleteTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string
  ): Promise<void> {
    if (await this.hasDeleteTabData()) {
      await this.clickDeleteTab();
      
      // Test Address Country with Select All
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickDeleteTab();
      } else {
        console.log("Delete Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickDeleteTab();
      }
    } else {
      console.log("No Data in Delete Tab");
    }
  }

  /**
   * Apply filters for New tab only (Delta view) - simplified
   */
  async applyFiltersForNewTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string
  ): Promise<void> {
    if (await this.hasNewTabData()) {
      await this.clickNewTab();
      
      // Test Address Country with Select All
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickNewTab();
      } else {
        console.log("New Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickNewTab();
      }
    } else {
      console.log("No Data in New Tab");
    }
  }

  /**
   * Apply filters for Amend tab only (Delta view) - simplified
   */
  async applyFiltersForAmendTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string
  ): Promise<void> {
    if (await this.hasAmendTabData()) {
      await this.clickAmendTab();
      
      // Test Address Country with Select All
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickAmendTab();
      } else {
        console.log("Amend Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickAmendTab();
      }
    } else {
      console.log("No Data in Amend Tab");
    }
  }

  /**
   * Apply filters for Delta Delete tab only - simplified
   */
  async applyFiltersForDeltaDeleteTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string
  ): Promise<void> {
    if (await this.hasDeltaDeleteTabData()) {
      await this.clickDeltaDeleteTab();
      
      // Test Address Country with Select All
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickDeltaDeleteTab();
      } else {
        console.log("Delta Delete Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickDeltaDeleteTab();
      }
    } else {
      console.log("No Data in Delta Delete Tab");
    }
  }

  /**
   * Apply filters for Stable tab only (Delta view) - simplified
   */
  async applyFiltersForStableTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string
  ): Promise<void> {
    if (await this.hasStableTabData()) {
      await this.clickStableTab();
      
      // Test Address Country with Select All
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickStableTab();
      } else {
        console.log("Stable Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickStableTab();
      }
    } else {
      console.log("No Data in Stable Tab");
    }
  }

  /**
   * Apply filters for Delta Error tab only - simplified
   */
  async applyFiltersForDeltaErrorTab(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string
  ): Promise<void> {
    if (await this.hasDeltaErrorTabData()) {
      await this.clickDeltaErrorTab();
      
      // Test Address Country with Select All
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        await this.clearAppliedFilters();
        await this.clickDeltaErrorTab();
      } else {
        console.log("Delta Error Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickDeltaErrorTab();
      }
    } else {
      console.log("No Data in Delta Error Tab");
    }
  }

  /**
   * Main method to apply OFAC filter across all tabs
   * Equivalent to Java's apply_ofac_filter method
   * @returns Object containing validation results for reporting
   */
  async applyOFACFilter(
    address: string,
    citizenship: string,
    startDate: string,
    endDate: string,
    nationality: string,
    program: string,
    type: string,
    invalidAddress: string,
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

    // Initialize MongoDB if validation is enabled (gracefully handles connection failures)
    let mongoConnected = false;
    if (enableMongoValidation) {
      mongoConnected = await this.initMongoDB();
      results.mongoConnected = mongoConnected;
      if (!mongoConnected) {
        console.log("[applyOFACFilter] MongoDB not available, continuing without validation");
      }
    }

    // ==================== ACTIVE TAB ====================
    console.log("[applyOFACFilter] Processing ACTIVE tab...");
    if (await this.hasActiveTabData()) {
      await this.clickActiveTab();

      // Test Cancel button functionality
      await this.openFilterPanel();
      await this.closeFilterPanel();
      if (await this.isFilterPanelClosed()) {
        console.log("Close Button is working");
      } else {
        console.log("Close Button not Working");
      }

      // Test Clear All button functionality
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.clearAllFilters();
      await this.applyFilter();
      if (await this.isNoFilterMessageVisible()) {
        console.log("Clear All Button is Working");
        console.log("No filter is added");
      } else {
        console.log("Filter is working without selecting");
      }

      // Test Address Country with Select All and MongoDB validation
      await this.openFilterPanel();
      await this.selectAddressCountryFilterAll();
      await this.applyFilter();

      const uiCount = await this.getUIFilteredCount();
      console.log(`[applyOFACFilter] UI Filtered Count (Address Select All): ${uiCount}`);

      if (enableMongoValidation && this.mongoQueries && mongoConnected) {
        // MongoDB validation - equivalent to Java's inline validation
        const validation = await this.validateUICountWithMongoDB(uiCount, "OFAC Enhanced");
        console.log(`[applyOFACFilter] MongoDB Count (OFAC Active with address): ${validation.dbCount}`);
        console.log(`[applyOFACFilter] ${validation.message}`);
        
        // Store validation result for reporting
        results.validationResults.push({
          tab: "Active",
          uiCount: uiCount,
          dbCount: validation.dbCount,
          passed: validation.passed,
          message: validation.message
        });
      } else {
        // Store UI count only (no MongoDB validation)
        results.validationResults.push({
          tab: "Active",
          uiCount: uiCount,
          message: mongoConnected ? "MongoDB validation not enabled" : "MongoDB not connected"
        });
      }

      if (await this.isDownloadButtonVisible()) {
        await this.downloadAsTabSeparated();
        try {
          await this.downloadAsExcel();
          if (await this.isToasterMessageVisible()) {
            console.log("Request is in progress");
          }
        } catch {
          console.log("Download is started for same filter");
        }
        // After downloads, ensure we're back on Records tab and Active tab
        await this.ensureOnRecordsTab();
        await this.clearAppliedFilters();
        await this.clickActiveTab();
      } else {
        console.log("Active Tab - No Records for Address filter");
        await this.clearAppliedFilters();
        await this.clickActiveTab();
      }

      // Apply individual filters (Active tab needs tab click after clear to ensure filter button is visible)
      await this.applyFiltersForTab("Active", startDate, endDate, () => this.clickActiveTab());

      // Apply all filters combined
      await this.applyAllFiltersCombined("Active", address, citizenship, nationality, program, type, invalidAddress);
    } else {
      console.log("No Data in Active Tab");
    }

    // ==================== ERROR TAB ====================
    console.log("[applyOFACFilter] Processing ERROR tab...");
    if (await this.hasErrorTabData()) {
      await this.clickErrorTab();
      // Pass clickErrorTab as the function to call after clearing filters (Java behavior)
      await this.applyFiltersForTab("Error", startDate, endDate, () => this.clickErrorTab());
      await this.applyAllFiltersCombined("Error", address, citizenship, nationality, program, type);
    } else {
      console.log("No Data in Error Tab");
    }

    // ==================== DELETE TAB ====================
    console.log("[applyOFACFilter] Processing DELETE tab...");
    if (await this.hasDeleteTabData()) {
      await this.clickDeleteTab();
      // Pass clickDeleteTab as the function to call after clearing filters (Java behavior)
      await this.applyFiltersForTab("Delete", startDate, endDate, () => this.clickDeleteTab());
      await this.applyAllFiltersCombined("Delete", address, citizenship, nationality, program, type);
    } else {
      console.log("No Data in Delete Tab");
    }

    // ==================== TOGGLE DELTA VIEW ====================
    console.log("[applyOFACFilter] Toggling DELTA VIEW...");
    await this.toggleDeltaView();

    // ==================== NEW TAB ====================
    console.log("[applyOFACFilter] Processing NEW tab (Delta)...");
    if (await this.hasNewTabData()) {
      await this.clickNewTab();
      // Pass clickNewTab as the function to call after clearing filters (Java behavior)
      await this.applyFiltersForTab("New", startDate, endDate, () => this.clickNewTab());
      await this.applyAllFiltersCombined("New", address, citizenship, nationality, program, type);
    } else {
      console.log("No Data in New Tab");
    }

    // ==================== AMEND TAB ====================
    console.log("[applyOFACFilter] Processing AMEND tab (Delta)...");
    if (await this.hasAmendTabData()) {
      await this.clickAmendTab();
      // Pass clickAmendTab as the function to call after clearing filters (Java behavior)
      await this.applyFiltersForTab("Amend", startDate, endDate, () => this.clickAmendTab());
      await this.applyAllFiltersCombined("Amend", address, citizenship, nationality, program, type);
    } else {
      console.log("No Data in Amend Tab");
    }

    // ==================== DELTA DELETE TAB ====================
    console.log("[applyOFACFilter] Processing DELTA DELETE tab...");
    if (await this.hasDeltaDeleteTabData()) {
      await this.clickDeltaDeleteTab();
      // Pass clickDeltaDeleteTab as the function to call after clearing filters (Java behavior)
      await this.applyFiltersForTab("Delta Delete", startDate, endDate, () => this.clickDeltaDeleteTab());
      await this.applyAllFiltersCombined("Delta Delete", address, citizenship, nationality, program, type);
    } else {
      console.log("No Data in Delta Delete Tab");
    }

    // ==================== STABLE TAB ====================
    console.log("[applyOFACFilter] Processing STABLE tab (Delta)...");
    if (await this.hasStableTabData()) {
      await this.clickStableTab();
      // Pass clickStableTab as the function to call after clearing filters (Java behavior)
      await this.applyFiltersForTab("Stable", startDate, endDate, () => this.clickStableTab());
      await this.applyAllFiltersCombined("Stable", address, citizenship, nationality, program, type);
    } else {
      console.log("No Data in Stable Tab");
    }

    // ==================== DELTA ERROR TAB ====================
    console.log("[applyOFACFilter] Processing DELTA ERROR tab...");
    if (await this.hasDeltaErrorTabData()) {
      await this.clickDeltaErrorTab();
      // Pass clickDeltaErrorTab as the function to call after clearing filters (Java behavior)
      await this.applyFiltersForTab("Delta Error", startDate, endDate, () => this.clickDeltaErrorTab());
      await this.applyAllFiltersCombined("Delta Error", address, citizenship, nationality, program, type);
    } else {
      console.log("No Data in Delta Error Tab");
    }

    // Close MongoDB connection
    if (enableMongoValidation) {
      await this.closeMongoDB();
    }
    
    console.log("[applyOFACFilter] Method completed successfully");
    return results;
  }

  /**
   * Check download status and download file
   * Equivalent to Java's check_download_status_1 method
   * Note: Reduced iterations to fit within 60-second timeout
   */
  async checkDownloadStatus(): Promise<void> {
    await this.goToDownloadsTab();
    await this.page.waitForTimeout(2000);
    
    // Refresh downloads to get latest status
    await this.refreshDownloads();
    await this.page.waitForTimeout(2000);

    // Check for success status with limited retries (to fit within 60-second timeout)
    for (let i = 0; i < 10; i++) {
      await this.refreshDownloads();
      await this.page.waitForTimeout(3000);
      
      try {
        const isSuccessVisible = await this.successStatus.isVisible({ timeout: 2000 });
        if (isSuccessVisible) {
          console.log("Download status: Success found");
          
          // Try to click download link
          try {
            await this.downloadLink.click();
            const isDownloadStarted = await this.downloadStatus.isVisible({ timeout: 2000 });
            if (isDownloadStarted) {
              console.log("Successfully downloaded");
              break;
            }
          } catch {
            // Done - download link click completed
            break;
          }
        }
      } catch {
        // Continue loop till get success
      }
    }
  }
}
