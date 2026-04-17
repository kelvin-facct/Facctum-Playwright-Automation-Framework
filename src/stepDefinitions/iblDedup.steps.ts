import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import * as assert from "assert";

// ==================== IBL Dedup Steps ====================
// Note: "user is logged in and on the home page" step is defined in facctSheild.steps.ts
// Note: "User click on {string} card" step is defined in facctSheild.steps.ts
// Note: "user clicks on Watchlist dropdown" step is defined in bulkUpload.steps.ts

When("user clicks on Internal list option", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.clickInternalList();
});

When("user navigates to Internal List", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.navigateToInternalList();
});

When("user searches for list {string}", async function (this: CustomWorld, listName: string) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.searchList(listName);
});

When("user clicks on list {string}", async function (this: CustomWorld, listName: string) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.clickList(listName);
});

When("user searches and opens list {string}", async function (this: CustomWorld, listName: string) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.searchAndOpenList(listName);
});

When("user searches and opens the default IBL list", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.searchAndOpenList();
});

When("user clicks on Add Records button", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.clickAddRecords();
});

When("user selects Single record option", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.selectSingleRecord();
});

When("user opens the single record form", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.openSingleRecordForm();
});

When("user enters name {string} in the input box", async function (this: CustomWorld, name: string) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.enterName(name);
});

When("user enters the default name in the input box", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.enterName();
});

When("user clicks on VERIFY DUPLICATE button", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.clickVerifyDuplicate();
});

Then("the Select Attributes page should be open", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  const isOpen = await iblDedupPage.verifySelectAttributesPageIsOpen();
  assert.ok(isOpen, "Expected Select Attributes page to be open");
});

When("user clicks SUBMIT on the Select Attributes modal", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.clickAttributeSubmit();
});

When("user clicks CANCEL on the Select Attributes modal", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.clickAttributeCancel();
});

Then("the Verify Duplicates page should be open", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  const isOpen = await iblDedupPage.verifyDuplicatesPageIsOpen();
  assert.ok(isOpen, "Expected Verify Duplicates page to be open");
});

Then("there should be at least {int} matching records", async function (this: CustomWorld, minCount: number) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  const count = await iblDedupPage.getMatchingRecordsCount();
  assert.ok(count >= minCount, `Expected at least ${minCount} matching records but found ${count}`);
});

When("user clicks on each record ID and verifies the details", { timeout: 120000 }, async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.clickEachRecordIdAndVerify();
});

When("user clicks on record at index {int}", async function (this: CustomWorld, index: number) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  const newPage = await iblDedupPage.clickRecordId(index);
  // Store the new page in scenario context for later use
  this.scenarioContext.set("recordPage", newPage);
});

When("user closes the record drawer", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.closeRecordDrawer();
});

Then("the drawer should show record ID {string}", async function (this: CustomWorld, expectedId: string) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  const actualId = await iblDedupPage.getDrawerRecordId();
  assert.ok(actualId.includes(expectedId), `Expected drawer to show record ID ${expectedId} but got ${actualId}`);
});

Then("the drawer full name should contain {string}", async function (this: CustomWorld, expectedName: string) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  const actualName = await iblDedupPage.getDrawerFullName();
  assert.ok(
    actualName.toLowerCase().includes(expectedName.toLowerCase()),
    `Expected full name to contain ${expectedName} but got ${actualName}`
  );
});

// ==================== FULL FLOW STEP ====================

When("user performs the complete IBL dedup verification flow", async function (this: CustomWorld) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.performDedupVerification();
});

When("user performs IBL dedup verification for list {string} with name {string}", async function (
  this: CustomWorld,
  listName: string,
  name: string
) {
  const iblDedupPage = this.pageManager.getIBLDedupPage();
  await iblDedupPage.performDedupVerification(listName, name);
});
