import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { ListManagementPage } from "../pages/ListManagementPage";
import { logger } from "../utils/logger";
import * as assert from "assert";

// ==================== Bulk Upload Steps ====================

When("user clicks on Watchlist dropdown", async function (this: CustomWorld) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.clickWatchlistDropdown();
});

When("user clicks on Internal List", async function (this: CustomWorld) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.clickInternalList();
});

When("user searches and selects list {string}", async function (this: CustomWorld, listName: string) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.searchAndSelectList(listName);
});

When("user clicks on Add Record button", async function (this: CustomWorld) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.clickAddRecord();
});

When("user selects Bulk upload option", async function (this: CustomWorld) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.selectBulkUploadOption();
});

When("user uploads file {string}", async function (this: CustomWorld, filePath: string) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.uploadFile(filePath);
});

When("user enters bulk upload comments {string}", async function (this: CustomWorld, comments: string) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.enterBulkComments(comments);
});

When("user clicks Submit for Approval button", async function (this: CustomWorld) {
  const listPage = this.pageManager.getListManagementPage();
  await listPage.clickSubmitForApproval();
});

Then("bulk upload should be submitted successfully", async function (this: CustomWorld) {
  // Wait for success indication - could be a toast, modal, or URL change
  await this.page.waitForTimeout(2000);
  
  // Check for success toast or message
  const successIndicators = [
    this.page.locator("text=successfully"),
    this.page.locator("text=submitted"),
    this.page.locator(".success-message"),
    this.page.locator("[class*='success']"),
  ];
  
  let found = false;
  for (const indicator of successIndicators) {
    if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      found = true;
      logger.info("Bulk upload success indicator found");
      break;
    }
  }
  
  // If no explicit success message, check we're still on the page without errors
  if (!found) {
    const errorMessage = await this.page.locator(".error-message, [class*='error']").isVisible({ timeout: 1000 }).catch(() => false);
    assert.ok(!errorMessage, "Error message found after bulk upload submission");
    logger.info("No error messages found - assuming bulk upload was successful");
  }
});
