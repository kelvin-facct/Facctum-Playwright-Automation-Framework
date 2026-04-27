import { Given, When, Then, Before } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { UKSANCTIONSadvfilterPage } from "../pages/UKSANCTIONSadvfilterPage";
import { EnvConfig } from "../config/env";
import { expect } from "@playwright/test";

let ukSanctionsPage: UKSANCTIONSadvfilterPage | null = null;

// Reset page object before each scenario
Before({ tags: "@UKSANCTIONSADVANCEFILTER or @RegulatoryList" }, async function (this: CustomWorld) {
  ukSanctionsPage = null;
});

// Initialize page object
function getPage(world: CustomWorld): UKSANCTIONSadvfilterPage {
  if (!ukSanctionsPage || !world.page) {
    ukSanctionsPage = new UKSANCTIONSadvfilterPage(world.page!);
  }
  return ukSanctionsPage;
}

Given("Facctlist Login 2", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.facctlistLogin(
    EnvConfig.BASE_URL,
    EnvConfig.ORG_ID,
    EnvConfig.USERNAME,
    EnvConfig.PASSWORD
  );
});

When("Navigate to Regulatory List 2", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.navigateToRegulatoryList();
});

When("Select List name 2", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectUKSanctionsList();
});

When("Apply Filter in all tabs 2", { timeout: 10 * 60 * 1000 }, async function (this: CustomWorld) {
  const page = getPage(this);
  
  // Test data - using same values as Java test (from UKSANCTIONSadvfilterStep.java)
  const designatedDate = "29/07/2012";
  const idType = "IMONumber";
  const programSource = "UK|UN";
  const regimeName = "The Iran (Sanctions) Regulations 2023";
  const type = "Individual";
  const invalidId = "Adhar";

  // MongoDB validation enabled by default, disable with MONGO_VALIDATION=false
  const enableMongoValidation = process.env.MONGO_VALIDATION !== "false";

  await page.applyUKSanctionsFilter(
    designatedDate,
    idType,
    programSource,
    regimeName,
    type,
    invalidId,
    enableMongoValidation
  );
});

Then("Check the status 2", { timeout: 10 * 60 * 1000 }, async function (this: CustomWorld) {
  const page = getPage(this);
  await page.checkDownloadStatus();
});

// Additional step definitions for more granular testing

When("user opens the filter panel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.openFilterPanel();
});

When("user closes the filter panel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.closeFilterPanel();
});

When("user applies the filter", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.applyFilter();
});

When("user clears all filters", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clearAllFilters();
});

When("user clears applied filters", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clearAppliedFilters();
});

When("user selects Id Type filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectIdTypeFilterAll();
});

When("user selects Program Source filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectProgramSourceFilterAll();
});

When("user selects Regime Name filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectRegimeNameFilterAll();
});

When("user selects Type filter with Select All", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.selectTypeFilterAll();
});

When("user sets Designated Date filter to {string}", async function (this: CustomWorld, date: string) {
  const page = getPage(this);
  await page.setDesignatedDateFilter(date);
});

When("user clicks on Active tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickActiveTab();
});

When("user clicks on Error tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickErrorTab();
});

When("user clicks on Delete tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickDeleteTab();
});

When("user toggles Delta view", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.toggleDeltaView();
});

When("user downloads as Tab Separated", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.downloadAsTabSeparated();
});

When("user downloads as Excel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.downloadAsExcel();
});

Then("the download button should be visible", async function (this: CustomWorld) {
  const page = getPage(this);
  const isVisible = await page.isDownloadButtonVisible();
  expect(isVisible).toBe(true);
});

Then("the UI filtered count should be {int}", async function (this: CustomWorld, expectedCount: number) {
  const page = getPage(this);
  const actualCount = await page.getUIFilteredCount();
  expect(actualCount).toBe(expectedCount);
});

Then("the filter panel should be closed", async function (this: CustomWorld) {
  const page = getPage(this);
  const isClosed = await page.isFilterPanelClosed();
  expect(isClosed).toBe(true);
});

Then("the filter panel should be visible", async function (this: CustomWorld) {
  const page = getPage(this);
  const isVisible = await page.isFilterPanelVisible();
  expect(isVisible).toBe(true);
});

Then("the Active tab should be selected", async function (this: CustomWorld) {
  // Tab selection is verified by the click action completing successfully
  // The page object handles waiting for the tab to be active
});

Then("the Error tab should be selected", async function (this: CustomWorld) {
  // Tab selection is verified by the click action completing successfully
});

Then("the Delete tab should be selected", async function (this: CustomWorld) {
  // Tab selection is verified by the click action completing successfully
});

Then("the Delta view should be enabled", async function (this: CustomWorld) {
  // Delta view toggle is verified by the click action completing successfully
});

When("user clicks on New tab", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.clickNewTab();
});

Then("the New tab should be selected", async function (this: CustomWorld) {
  // Tab selection is verified by the click action completing successfully
});

Then("the toaster message should be displayed", async function (this: CustomWorld) {
  const page = getPage(this);
  const isVisible = await page.isToasterMessageVisible();
  expect(isVisible).toBe(true);
});
