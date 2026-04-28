import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../world/customWorld";
import { IBLCreateSingleRecordPage } from "../pages/IBLCreateSingleRecordPage";
import { logger } from "../utils/logger";

/**
 * Step definitions for IBL (Internal Block List) Single Record Creation.
 * Migrated from Java Selenium: IblCreateSingleRecordSteps.java
 */

// Test data variables (loaded from Excel or defaults)
let entityFullName: string;
let businessUnitContact: string;
let recordComment: string;
let bankSubmitComment: string;
let worldCheckId: string;
let location: string;

/**
 * Loads test data from Excel file with fallback to defaults.
 */
function loadTestData(): void {
  try {
    const testData = IBLCreateSingleRecordPage.loadTestDataFromExcel();
    entityFullName = testData.entityFullName;
    businessUnitContact = testData.businessUnitContact;
    recordComment = testData.recordComment;
    bankSubmitComment = testData.bankSubmitComment;
    worldCheckId = testData.worldCheckId;
    location = testData.location;
    logger.info("Test data loaded successfully from Excel file");
  } catch (error) {
    logger.warn(`Failed to load test data from Excel, using defaults: ${error}`);
    setDefaultTestData();
  }
}

function setDefaultTestData(): void {
  entityFullName = "Test Entity";
  businessUnitContact = "test@example.com";
  recordComment = "Test record comment";
  bankSubmitComment = "Test bank submit comment";
  worldCheckId = "WC123456";
  location = "New York";
}

// Initialize test data
loadTestData();

// ==================== NAVIGATION STEPS ====================

When("User click on Watchlist dropdown", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickWatchlistMenu();
});

When("User click on IBL", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickInternalList();
});

When("User selects the list", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.searchAndOpenList();
});

When("User selects the list {string}", async function (this: CustomWorld, listName: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.searchAndOpenList(listName);
});

When("User click on Add Record button", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickAddRecords();
});

When("User select Single record option", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.selectSingleRecord();
});

When("User selects {string} as Record type", async function (this: CustomWorld, recordType: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.selectRecordType(recordType);
});

// ==================== DATA ENTRY STEPS ====================

When("User fills all mandatory fields for IBL single record creation", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  logger.info(`Filling mandatory fields - Entity: ${entityFullName}, Contact: ${businessUnitContact}`);
  
  await iblPage.fillMandatoryFieldsForEntity({
    entityName: entityFullName,
    accountNumber: worldCheckId,
    addressLine1: location,
    city: "Test City",
    country: "Albania",
  });
});

When("User fills all mandatory fields for Vessel record creation", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  logger.info(`Filling mandatory fields for Vessel - Name: ${entityFullName}`);
  
  await iblPage.fillMandatoryFieldsForVessel({
    vesselName: entityFullName,
    imoNumber: "IMO1234567",
  });
});

When("User fills mandatory fields for Individual record", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  
  await iblPage.fillMandatoryFieldsForIndividual({
    firstName: "Test",
    lastName: "Individual",
    accountNumber: "ACC123456",
    addressLine1: "123 Test Street",
    city: "Test City",
    state: "Test State",
    zipCode: "12345",
    country: "Albania",
    gender: "Male",
    dateOfBirth: "01/01/1990",
  });
});

// ==================== ID NUMBER STEPS ====================

When("User clicks on Add ID button", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickAddId();
});

When("User enters Account number {string}", async function (this: CustomWorld, accountNumber: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterAccountNumber(accountNumber);
});

When("User enters Customer ID {string}", async function (this: CustomWorld, customerId: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterCustomerId(customerId);
});

When("User enters Government ID {string}", async function (this: CustomWorld, governmentId: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterGovernmentId(governmentId);
});

When("User selects Related ID and enters value {string}", async function (this: CustomWorld, relatedIdValue: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.selectRelatedIdAndEnterValue(relatedIdValue);
  logger.info(`Selected Related ID and entered value: ${relatedIdValue}`);
});

When("User clicks on ID Type dropdown for row {int}", async function (this: CustomWorld, rowNumber: number) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  // For row 4, we need to click the 4th ID type dropdown
  const dropdown = this.page.locator('.idNumberTypesList #mui-component-select-idType').nth(rowNumber - 1);
  await dropdown.click();
  logger.info(`Clicked on ID Type dropdown for row: ${rowNumber}`);
});

When("User selects Related ID option", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  const option = this.page.locator('span:has-text("Related id")');
  await option.click();
  logger.info("Selected Related ID option from dropdown");
});

When("User enters ID value {string} in row {int}", async function (this: CustomWorld, idValue: string, rowNumber: number) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterIdValue(idValue, rowNumber - 1); // Convert to 0-based index
  logger.info(`Entered ID value '${idValue}' in row: ${rowNumber}`);
});

When("User fills all ID numbers with Account {string} Customer {string} Government {string} Related {string}", async function (
  this: CustomWorld,
  accountNum: string,
  customerId: string,
  govId: string,
  relatedId: string
) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterAccountNumber(accountNum);
  await iblPage.enterCustomerId(customerId);
  await iblPage.enterGovernmentId(govId);
  await iblPage.selectRelatedIdAndEnterValue(relatedId);
  logger.info("Filled all ID numbers");
});

// ==================== NAME ENTRY STEPS ====================

When("User enters first name {string}", async function (this: CustomWorld, firstName: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterFirstName(firstName);
});

When("User enters last name {string}", async function (this: CustomWorld, lastName: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterLastName(lastName);
});

When("User enters middle name {string}", async function (this: CustomWorld, middleName: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterMiddleName(middleName);
});

// ==================== ADDRESS STEPS ====================

When("User enters address line 1 {string}", async function (this: CustomWorld, address: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterAddressLine1(address);
});

When("User enters city {string}", async function (this: CustomWorld, city: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterCity(city);
});

When("User enters state {string}", async function (this: CustomWorld, state: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterState(state);
});

When("User enters zip code {string}", async function (this: CustomWorld, zipCode: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterZipCode(zipCode);
});

When("User selects country {string}", async function (this: CustomWorld, country: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.selectAddressCountry(country);
});

// ==================== GENDER STEPS ====================

When("User selects gender {string}", async function (this: CustomWorld, gender: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.selectGender(gender as "Male" | "Female" | "Other");
});

// ==================== WORLD CHECK ID & LOCATIONS STEPS ====================

When("User enters World Check ID {string}", async function (this: CustomWorld, worldCheckIdValue: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterWorldCheckId(worldCheckIdValue);
  logger.info(`Entered World Check ID: ${worldCheckIdValue}`);
});

When("User enters Location {string}", async function (this: CustomWorld, locationValue: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterLocation(locationValue);
  logger.info(`Entered Location: ${locationValue}`);
});

When("User clicks on Add Location button", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickAddLocation();
  logger.info("Clicked on Add Location button");
});

When("User clicks on Remove Location button", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickRemoveLocation();
  logger.info("Clicked on Remove Location button");
});

When("User enters Location {string} at index {int}", async function (this: CustomWorld, locationValue: string, index: number) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterLocationByIndex(index, locationValue);
  logger.info(`Entered Location '${locationValue}' at index ${index}`);
});

When("User fills World Check ID {string} and Location {string}", async function (this: CustomWorld, worldCheckIdValue: string, locationValue: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.fillWorldCheckAndLocations(worldCheckIdValue, locationValue);
  logger.info("Filled World Check ID and Location");
});

When("User fills World Check ID {string} and multiple Locations {string} {string}", async function (
  this: CustomWorld,
  worldCheckIdValue: string,
  location1: string,
  location2: string
) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.fillWorldCheckAndLocations(worldCheckIdValue, location1, location2);
  logger.info("Filled World Check ID and multiple Locations");
});

// ==================== ADDITIONAL DETAILS TAB STEPS ====================

When("User enters Reason {string}", async function (this: CustomWorld, reason: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterReason(reason);
  logger.info(`Entered Reason: ${reason}`);
});

When("User enters Further comments {string}", async function (this: CustomWorld, furtherComments: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterFurtherComments(furtherComments);
  logger.info(`Entered Further comments: ${furtherComments}`);
});

When("User enters Reference information {string}", async function (this: CustomWorld, referenceInfo: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterReferenceInformation(referenceInfo);
  logger.info(`Entered Reference information: ${referenceInfo}`);
});

When("User fills Additional Details tab with contact {string} comments {string}", async function (
  this: CustomWorld,
  buContact: string,
  comments: string
) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.fillAdditionalDetailsTab({
    businessUnitContact: buContact,
    comments: comments,
  });
  logger.info(`Filled Additional Details tab with contact: ${buContact} and comments: ${comments}`);
});

When("User fills Additional Details tab with all fields", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.fillAdditionalDetailsTab({
    businessUnitContact: businessUnitContact,
    comments: recordComment,
    reason: "Test reason for record creation",
    furtherComments: "Additional comments for testing",
    referenceInfo: "Reference: TEST-REF-001",
  });
  logger.info("Filled Additional Details tab with all fields");
});

When("User clicks on Additional Details tab", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickAdditionalDetails();
  logger.info("Clicked on Additional Details tab");
});

// ==================== DATE STEPS ====================

When("User enters date of birth {string}", async function (this: CustomWorld, date: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.enterDateOfBirth(date);
});

// ==================== SUBMISSION STEPS ====================

When("User clicks on Submit button", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickSubmitForApproval();
  
  // Enter submit comment if available
  if (bankSubmitComment) {
    await iblPage.enterSubmitComment(bankSubmitComment);
    logger.info(`Entered submit comment: ${bankSubmitComment}`);
  }
});

Then("User submits the IBL single record", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickFinalSubmit();
  logger.info("IBL single record submission completed successfully");
});

When("User clicks on bulk Submit button", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  // Bulk submit button has different locator
  const bulkSubmitBtn = this.page.locator('button:has-text("SUBMIT FOR APPROVAL")');
  await bulkSubmitBtn.click();
  logger.info("Clicked on bulk Submit button");
});

// ==================== PENDING TAB & WITHDRAW STEPS ====================

When("User clicks on Pending tab", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickPendingTab();
});

When("User navigates to the last page of records", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.navigateToLastPage();
});

When("User clicks kebab menu for the last record", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.clickKebabMenuForLastRecord();
});

When("User selects Withdraw option", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.selectWithdrawOption();
});

When("User confirms the withdrawal", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.confirmWithdraw();
});

Then("User withdraws the last record", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.withdrawLastRecord();
  logger.info("Last record withdrawn successfully");
});

When("User searches for record ID {string}", async function (this: CustomWorld, recordId: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.searchByRecordId(recordId);
});

When("User searches for {string} in Pending tab", async function (this: CustomWorld, searchText: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.searchByRecordId(searchText);
  logger.info(`Searched for '${searchText}' in Pending tab`);
});

When("User clicks kebab menu for the searched record", async function (this: CustomWorld) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  // After search, there should be only one record, click its kebab menu
  await iblPage.clickKebabMenuForLastRecord();
  logger.info("Clicked kebab menu for the searched record");
});

Then("User withdraws record with ID {string}", async function (this: CustomWorld, recordId: string) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  await iblPage.withdrawRecordById(recordId);
  logger.info(`Record ${recordId} withdrawn successfully`);
});

// ==================== COMPOSITE STEPS ====================

Then("User performs complete IBL single record creation with {string} record type", async function (
  this: CustomWorld,
  recordType: string
) {
  const iblPage = this.pageManager.getIBLCreateSingleRecordPage();
  logger.info(`Starting complete IBL single record creation workflow with record type: ${recordType}`);

  // Navigate to IBL
  await iblPage.clickWatchlistMenu();
  await iblPage.clickInternalList();
  await iblPage.searchAndOpenList();

  // Open single record form
  await iblPage.clickAddRecords();
  await iblPage.selectSingleRecord();

  // Select record type
  await iblPage.selectRecordType(recordType);

  // Fill mandatory fields based on record type
  if (recordType === "Vessel") {
    await iblPage.fillMandatoryFieldsForVessel({
      vesselName: entityFullName,
      imoNumber: "IMO1234567",
    });
  } else if (recordType === "Entity" || recordType === "Bank") {
    await iblPage.fillMandatoryFieldsForEntity({
      entityName: entityFullName,
      accountNumber: worldCheckId,
      addressLine1: location,
      city: "Test City",
      country: "Albania",
    });
  } else {
    await iblPage.fillMandatoryFieldsForIndividual({
      firstName: "Test",
      lastName: entityFullName,
      accountNumber: worldCheckId,
      addressLine1: location,
      city: "Test City",
      country: "Albania",
      gender: "Male",
    });
  }

  // Submit
  await iblPage.clickSubmitForApproval();
  if (bankSubmitComment) {
    await iblPage.enterSubmitComment(bankSubmitComment);
  }
  await iblPage.clickFinalSubmit();

  logger.info("Complete IBL single record creation workflow finished successfully");
});

// ==================== VERIFICATION STEPS ====================

Then("the IBL single record form should be displayed", async function (this: CustomWorld) {
  const page = this.page;
  const drawer = page.locator(".facct-drawer-modal");
  await expect(drawer).toBeVisible({ timeout: 10000 });
  logger.info("IBL single record form is displayed");
});

Then("the record type dropdown should show {string}", async function (this: CustomWorld, expectedType: string) {
  const page = this.page;
  const dropdown = page.locator(".record-type-selector .facct-dropdown");
  await expect(dropdown).toContainText(expectedType);
  logger.info(`Record type dropdown shows: ${expectedType}`);
});
