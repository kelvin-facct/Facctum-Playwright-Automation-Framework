import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import * as assert from "assert";

// ==================== IBL Record Approval Steps ====================
// Note: "user is logged in and on the home page" step is defined in facctSheild.steps.ts
// Note: "User click on {string} card" step is defined in facctSheild.steps.ts
// Note: "validate that the user is on the {string} page" step is defined in facctSheild.steps.ts

When("user clicks on Tasks button", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.navigateToTasks();
});

// Note: "user collapses the left panel" step is defined in facctSheild.steps.ts

Then("user can see all main tabs on Tasks page", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  const tabsVisible = await tasksPage.verifyMainTabsVisible();
  assert.ok(tabsVisible, "Expected all main tabs to be visible on Tasks page");
});

When("the Pending L1 tab is already active", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  const isActive = await tasksPage.isPendingL1TabActive();
  if (!isActive) {
    await tasksPage.clickPendingL1Tab();
  }
});

When("user clicks on sub tab INTERNAL RECORDS", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.clickInternalRecordsTab();
});

When("user filters to show only unclaimed records", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.clickUnclaimedFilter();
});

When("user clicks on Double Arrow Right icon", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.clickDoubleArrowRight();
});

Then("user selects the latest record to approve", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.waitForTableLoad();
  
  // Match Java behavior: select the last record on the current page
  // (after navigating to last page with Double Arrow Right)
  await tasksPage.selectLastRecordCheckbox();
});

When("user claims and accepts the record", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.claimAndAcceptRecord();
});

Then("the record should be approved successfully", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  const isApproved = await tasksPage.verifyRecordApproved();
  assert.ok(isApproved, "Expected record to be approved successfully");
});

// Additional utility steps
When("user clicks on Pending L1 tab", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.clickPendingL1Tab();
});

When("user clicks on Pending L2 tab", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.clickPendingL2Tab();
});

When("user clicks on sub tab COMMERCIAL RECORDS", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.clickCommercialRecordsTab();
});

When("user searches for record {string}", async function (this: CustomWorld, recordId: string) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.searchById(recordId);
});

When("user clicks on record {string}", async function (this: CustomWorld, recordId: string) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.clickRecordById(recordId);
});

When("user refreshes the table", async function (this: CustomWorld) {
  const tasksPage = this.pageManager.getTasksPage();
  await tasksPage.refreshTable();
});

Then("the table should have at least {int} record(s)", async function (this: CustomWorld, minCount: number) {
  const tasksPage = this.pageManager.getTasksPage();
  const rowCount = await tasksPage.getTableRowCount();
  assert.ok(rowCount >= minCount, `Expected at least ${minCount} records but found ${rowCount}`);
});
