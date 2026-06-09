import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { logger } from "../utils/logger";
import * as assert from "assert";

// ==================== Background ====================

Given("user is logged in and on the FacctList dashboard", async function (this: CustomWorld) {
  // Login is handled by hooks (Before hook). Navigate to FacctList.
  const dashboard = this.pageManager.getFacctumDashboardPage();
  await dashboard.navigateToListManagement();
  logger.info("User is on the FacctList dashboard");
});

// ==================== Navigation Steps ====================

When("user navigates to Data Export Templates", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  await dataExport.navigateToDataExport();
  await dataExport.navigateToTemplates();
});

When("user navigates to Data Export Custom Delta", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  await dataExport.navigateToDataExport();
  await dataExport.navigateToCustomDelta();
});

When("user navigates to Data Export Destination Config", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  await dataExport.navigateToDataExport();
  await dataExport.navigateToDestinationConfig();
});

When("user navigates to Data Export Downloads", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  await dataExport.navigateToDataExport();
  await dataExport.navigateToDownloads();
});

// ==================== Verification Steps ====================

Then("the Templates page should be loaded", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  const loaded = await dataExport.isPageLoaded();
  assert.ok(loaded, "Templates page did not load — no table rows or no-data message visible");
  logger.info("Templates page loaded successfully");
});

Then("the Custom Delta page should be loaded", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  const loaded = await dataExport.isPageLoaded();
  assert.ok(loaded, "Custom Delta page did not load — no table rows or no-data message visible");
  logger.info("Custom Delta page loaded successfully");
});

Then("the Destination Config page should be loaded", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  const loaded = await dataExport.isPageLoaded();
  assert.ok(loaded, "Destination Config page did not load — no table rows or no-data message visible");
  logger.info("Destination Config page loaded successfully");
});

Then("the Downloads page should be loaded", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  const loaded = await dataExport.isPageLoaded();
  assert.ok(loaded, "Downloads page did not load — no table rows or no-data message visible");
  logger.info("Downloads page loaded successfully");
});

// ==================== Table Verification Steps ====================

Then("the templates table should display records or show no data message", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  const rowCount = await dataExport.getTableRowCount();
  const noData = await dataExport.hasNoData();
  assert.ok(rowCount > 0 || noData, "Templates table has no rows and no 'no data' message");
  logger.info(`Templates table: ${rowCount > 0 ? `${rowCount} records` : "no data message displayed"}`);
});

Then("the custom delta table should display records or show no data message", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  const rowCount = await dataExport.getDeltaCount();
  const noData = await dataExport.hasNoData();
  assert.ok(rowCount > 0 || noData, "Custom Delta table has no rows and no 'no data' message");
  logger.info(`Custom Delta table: ${rowCount > 0 ? `${rowCount} records` : "no data message displayed"}`);
});

Then("the destination config table should display records or show no data message", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  const rowCount = await dataExport.getTableRowCount();
  const noData = await dataExport.hasNoData();
  assert.ok(rowCount > 0 || noData, "Destination Config table has no rows and no 'no data' message");
  logger.info(`Destination Config table: ${rowCount > 0 ? `${rowCount} records` : "no data message displayed"}`);
});

// ==================== Action Steps ====================

When("user refreshes the downloads list", async function (this: CustomWorld) {
  const dataExport = this.pageManager.getDataExportPage();
  await dataExport.refreshDownloads();
});
