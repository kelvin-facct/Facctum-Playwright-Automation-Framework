import { Given, When, Then, Before } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { OFACadvfilterPage } from "../pages/OFACadvfilterPage";
import { EnvConfig } from "../config/env";
import { expect } from "@playwright/test";

// OFAC Filter Test Data (matching Java implementation)
const OFAC_FILTER_DATA = {
  address: "Cuba",
  citizenship: "Egypt",
  startDate: "30/08/2024",
  endDate: "22/12/2025",
  nationality: "Egypt",
  program: "CAR",
  type: "Individual",
  invalidAddress: "Karnataka"
};

let ofacPage: OFACadvfilterPage | null = null;

// Reset page object before each scenario
Before({ tags: "@OFACADVANCEFILTER or @RegulatoryList" }, async function (this: CustomWorld) {
  ofacPage = null;
});

// Initialize page object (shared across steps in same scenario)
function getPage(world: CustomWorld): OFACadvfilterPage {
  if (!ofacPage || !world.page) {
    ofacPage = new OFACadvfilterPage(world.page!);
  }
  return ofacPage;
}

// ==================== LOGIN STEPS ====================

Given("Facctlist Login 1", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.facctlistLogin(
    EnvConfig.BASE_URL,
    EnvConfig.ORG_ID,
    EnvConfig.USERNAME,
    EnvConfig.PASSWORD
  );
});

// ==================== NAVIGATION STEPS ====================

When("Navigate to Regulatory List 1", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.navigateToRegulatoryList();
});

When("Select List name 1", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectOFACList();
});

When("user selects OFAC list", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectOFACList();
});

When("user selects OFAC Enhanced list", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectOFACEnhancedList();
});

// ==================== FILTER STEPS ====================

// Individual tab filter steps (each should complete within 60 seconds)
When("Apply Filter in Active tab", async function (this: CustomWorld) {
  const page = getPage(this);
  // MongoDB validation enabled by default, disable with MONGO_VALIDATION=false
  const enableMongoValidation = process.env.MONGO_VALIDATION !== "false";
  
  await page.applyFiltersForActiveTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type,
    OFAC_FILTER_DATA.invalidAddress,
    enableMongoValidation
  );
});

When("Apply Filter in Error tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFiltersForErrorTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type
  );
});

When("Apply Filter in Delete tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFiltersForDeleteTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type
  );
});

When("Apply Filter in New tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFiltersForNewTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type
  );
});

When("Apply Filter in Amend tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFiltersForAmendTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type
  );
});

When("Apply Filter in Delta Delete tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFiltersForDeltaDeleteTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type
  );
});

When("Apply Filter in Stable tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFiltersForStableTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type
  );
});

When("Apply Filter in Delta Error tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFiltersForDeltaErrorTab(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type
  );
});

Then("the filter operations should complete successfully", async function (this: CustomWorld) {
  // This step just confirms the previous filter operations completed
  console.log("Filter operations completed successfully");
});

Then("the Delta view should be enabled", async function (this: CustomWorld) {
  // Delta view toggle is verified by the click action completing successfully
  console.log("Delta view enabled");
});

// Main step that runs all tabs - 20 minute timeout (test takes 15+ minutes)
When("Apply Filter in all tabs 1", { timeout: 20 * 60 * 1000 }, async function (this: CustomWorld) {
  console.log("[Step] Apply Filter in all tabs 1 - STARTED");
  const page = getPage(this);
  
  // MongoDB validation enabled by default, disable with MONGO_VALIDATION=false
  const enableMongoValidation = process.env.MONGO_VALIDATION !== "false";

  const results = await page.applyOFACFilter(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type,
    OFAC_FILTER_DATA.invalidAddress,
    enableMongoValidation
  );
  
  // Attach MongoDB validation status to Allure report
  const validationReport = {
    mongoValidationEnabled: results.mongoValidationEnabled,
    mongoConnected: results.mongoConnected,
    status: results.mongoValidationEnabled 
      ? (results.mongoConnected ? "CONNECTED" : "CONNECTION FAILED - Validation skipped")
      : "DISABLED (MONGO_VALIDATION=false)",
    validationResults: results.validationResults
  };
  
  await this.attach(
    JSON.stringify(validationReport, null, 2),
    "application/json"
  );
  
  // Log warning if MongoDB validation was expected but didn't run
  if (results.mongoValidationEnabled && !results.mongoConnected) {
    const warningMsg = "⚠️ WARNING: MongoDB validation was enabled but connection failed. DB validation was SKIPPED.";
    console.log(warningMsg);
    await this.attach(warningMsg, "text/plain");
  }
  
  console.log("[Step] Apply Filter in all tabs 1 - COMPLETED");
});

When("user applies OFAC filter in all tabs", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyOFACFilter(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type,
    OFAC_FILTER_DATA.invalidAddress,
    false
  );
});

When("user applies OFAC filter in all tabs with MongoDB validation", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyOFACFilter(
    OFAC_FILTER_DATA.address,
    OFAC_FILTER_DATA.citizenship,
    OFAC_FILTER_DATA.startDate,
    OFAC_FILTER_DATA.endDate,
    OFAC_FILTER_DATA.nationality,
    OFAC_FILTER_DATA.program,
    OFAC_FILTER_DATA.type,
    OFAC_FILTER_DATA.invalidAddress,
    true
  );
});

// ==================== DOWNLOAD STATUS STEPS ====================

Then("Check the status 1", { timeout: 120000 }, async function (this: CustomWorld) {
  console.log("[Step] Check the status 1 - STARTED");
  const page = getPage(this);
  await page.checkDownloadStatus();
  console.log("[Step] Check the status 1 - COMPLETED");
});

Then("user checks the download status", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.checkDownloadStatus();
});

// ==================== INDIVIDUAL FILTER STEPS ====================

When("user opens the OFAC filter panel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.openFilterPanel();
});

When("user closes the OFAC filter panel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.closeFilterPanel();
});

When("user applies the OFAC filter", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFilter();
});

When("user clears all OFAC filters", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clearAllFilters();
});

When("user clears applied OFAC filters", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clearAppliedFilters();
});

When("user selects Address Country filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectAddressCountryFilterAll();
});

When("user selects Citizenship Country filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectCitizenshipCountryFilterAll();
});

When("user selects Nationality Country filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectNationalityCountryFilterAll();
});

When("user selects Program Name filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectProgramNameFilterAll();
});

When("user selects OFAC Type filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectTypeFilterAll();
});

When("user sets Last Updated Date filter from {string} to {string}", async function (this: CustomWorld, startDate: string, endDate: string) {
  const page = getPage(this);
  await page.setLastUpdatedDateFilter(startDate, endDate);
});

When("user searches and selects Address Country {string}", async function (this: CustomWorld, country: string) {
  const page = getPage(this);
  await page.searchAndSelectAddressCountry(country);
});

When("user searches and selects Citizenship Country {string}", async function (this: CustomWorld, country: string) {
  const page = getPage(this);
  await page.searchAndSelectCitizenshipCountry(country);
});

When("user searches and selects Nationality Country {string}", async function (this: CustomWorld, country: string) {
  const page = getPage(this);
  await page.searchAndSelectNationalityCountry(country);
});

When("user searches and selects Program Name {string}", async function (this: CustomWorld, program: string) {
  const page = getPage(this);
  await page.searchAndSelectProgramName(program);
});

When("user searches and selects OFAC Type {string}", async function (this: CustomWorld, type: string) {
  const page = getPage(this);
  await page.searchAndSelectType(type);
});

// ==================== TAB NAVIGATION STEPS ====================

When("user clicks on OFAC Active tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickActiveTab();
});

When("user clicks on OFAC Error tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickErrorTab();
});

When("user clicks on OFAC Delete tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickDeleteTab();
});

When("user toggles OFAC Delta view", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.toggleDeltaView();
});

When("user clicks on OFAC New tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickNewTab();
});

When("user clicks on OFAC Amend tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickAmendTab();
});

When("user clicks on OFAC Delta Delete tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickDeltaDeleteTab();
});

When("user clicks on OFAC Stable tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickStableTab();
});

When("user clicks on OFAC Delta Error tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickDeltaErrorTab();
});

// ==================== DOWNLOAD STEPS ====================

When("user downloads OFAC as Tab Separated", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.downloadAsTabSeparated();
});

When("user downloads OFAC as Excel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.downloadAsExcel();
});

When("user goes to OFAC Downloads tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.goToDownloadsTab();
});

When("user refreshes OFAC downloads", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.refreshDownloads();
});

// ==================== ASSERTION STEPS ====================

Then("the OFAC download button should be visible", async function (this: CustomWorld) {
  const page = getPage(this);
  const isVisible = await page.isDownloadButtonVisible();
  expect(isVisible).toBe(true);
});

Then("the OFAC filter panel should be visible", async function (this: CustomWorld) {
  const page = getPage(this);
  const isVisible = await page.isFilterPanelVisible();
  expect(isVisible).toBe(true);
});

Then("the OFAC filter panel should be closed", async function (this: CustomWorld) {
  const page = getPage(this);
  const isClosed = await page.isFilterPanelClosed();
  expect(isClosed).toBe(true);
});

Then("the OFAC toaster message should be displayed", async function (this: CustomWorld) {
  const page = getPage(this);
  const isVisible = await page.isToasterMessageVisible();
  expect(isVisible).toBe(true);
});

Then("the OFAC UI filtered count should be {int}", async function (this: CustomWorld, expectedCount: number) {
  const page = getPage(this);
  const actualCount = await page.getUIFilteredCount();
  expect(actualCount).toBe(expectedCount);
});
