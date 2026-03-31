import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { PreScreeningRulePage } from "../pages/PreScreeningRulePage";
import { ExcelReader } from "../helpers/excelReader";
import { EnvConfig } from "../config/env";
import { logger } from "../utils/logger";
import * as assert from "assert";

// Excel test data configuration - matching Java
const TEST_DATA_PATH = "src/resources/testData/Test_Sheet.xlsx";
const SHEET_NAME = "Shield";

// Test data variables - loaded from Excel like Java
let ruleName: string;
let orderId: string;
let description: string;
let value: string;
let ruleNameRead: string;
let order_id: string;
let name: string;
let rule_id: string;

// Load test data from Excel (like Java's class-level initialization)
function loadTestData(): void {
  const excel = new ExcelReader(TEST_DATA_PATH);
  
  // Test data - for adding new Pre-Screening Rule (row 1, columns 4-7)
  ruleName = excel.getCellValue(SHEET_NAME, 1, 4);
  orderId = excel.getCellValue(SHEET_NAME, 1, 5);
  description = excel.getCellValue(SHEET_NAME, 1, 6);
  value = excel.getCellValue(SHEET_NAME, 1, 7);
  
  // Test data - for searching Pre-Screening Rule (row 1, columns 0-3)
  ruleNameRead = excel.getCellValue(SHEET_NAME, 1, 0);
  order_id = excel.getCellValue(SHEET_NAME, 1, 1);
  name = excel.getCellValue(SHEET_NAME, 1, 2);
  rule_id = excel.getCellValue(SHEET_NAME, 1, 3);
  
  logger.info(`Loaded test data - ruleName: ${ruleName}, ruleNameRead: ${ruleNameRead}`);
}

// ==================== Background Steps ====================

Given("user is logged in and on the home page", async function (this: CustomWorld) {
  // Load test data at the start
  loadTestData();
  
  // Login is handled by hooks, just verify we're on home page
  await this.page.waitForTimeout(1000);
  
  const loginButton = this.page.getByRole("button", { name: "LOG IN" });
  const isOnLoginPage = await loginButton.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (isOnLoginPage) {
    await this.page.waitForURL(/.*facctum\.com.*/, { timeout: 30000 });
  }
  
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.verifyHomePageDisplayed();
});

// ==================== Card Validation Steps ====================

When("User validate the card states", async function (this: CustomWorld) {
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.verifyHomePageDisplayed();
  logger.info("Card states validated");
});

Then("{string} card should be enabled", async function (this: CustomWorld, cardName: string) {
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  const isEnabled = await dashboardPage.isCardEnabled(cardName);
  assert.ok(isEnabled, `${cardName} card should be enabled`);
});

When("User click on {string} card", async function (this: CustomWorld, cardName: string) {
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  
  if (cardName === "Customer Screening") {
    await dashboardPage.navigateToCustomerScreening();
  } else if (cardName === "List Management") {
    await dashboardPage.navigateToListManagement();
  } else {
    await dashboardPage.clickProductCard(cardName);
  }
});

Then("validate that the user is on the {string} page", async function (this: CustomWorld, pageName: string) {
  if (pageName === "Home") {
    const dashboardPage = this.pageManager.getFacctumDashboardPage();
    await dashboardPage.verifyHomePageDisplayed();
  } else if (pageName === "Dashboard") {
    // Verify we're on the dashboard/product page
    await this.page.waitForLoadState("networkidle");
    logger.info(`Validated user is on ${pageName} page`);
  }
});

// ==================== Navigation Steps ====================

Then("User Click on Pre Screening Rule tab", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  await preScreeningPage.navigateToPreScreeningRules();
});

// ==================== Page Validation and Search ====================

Then("user checks Pre Screening Rule page", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Verify page is loaded
  const isOnPage = await preScreeningPage.isOnPreScreeningRulesPage();
  assert.ok(isOnPage, "Pre-Screening Rule page is not displayed");
  
  // Perform search operation with ruleNameRead from Excel
  logger.info(`Performing search operation with rule name: ${ruleNameRead}`);
  await preScreeningPage.searchRule(ruleNameRead);
  
  // Validate search results
  await preScreeningPage.validateSearchResults(order_id, name, rule_id);
});

Then("user validate the view icon button on Pre Screening Rule page", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Click on view icon
  await preScreeningPage.clickViewIcon(0);
  
  // Validate popup content
  await preScreeningPage.validateViewPopupContent(name, order_id);
  
  // Close popup
  await preScreeningPage.closePopup();
  
  // Clear search
  await preScreeningPage.clearSearch();
});

// ==================== Add Rule Steps ====================

Then("user add the new Pre Screening Rule", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Click Add button
  await preScreeningPage.clickAddRule();
  
  // Fill form fields with Excel data
  await preScreeningPage.fillFormFields(ruleName, orderId, description);
  
  // Configure rule conditions
  await preScreeningPage.configureRuleConditions(value);
  
  // Submit the form
  await preScreeningPage.submitRule();
  
  // Wait for form submission to complete
  await this.page.waitForTimeout(3000);
});

Then("user validate the newly added Pre Screening Rule", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Search for the newly added rule
  await preScreeningPage.searchRule(ruleName);
  
  // Validate the rule appears in search results
  const displayedRuleName = await preScreeningPage.getFirstRuleName();
  assert.strictEqual(displayedRuleName, ruleName, 
    `Newly added rule name mismatch. Expected: ${ruleName}, Actual: ${displayedRuleName}`);
  
  // Validate rule in table
  await preScreeningPage.validateRuleInTable(ruleName, orderId);
});

Then("user validate the edit icon button on Pre Screening Rule page", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Click edit icon
  await preScreeningPage.clickEditIcon(0);
  
  // Validate edit popup is displayed
  const cancelButton = this.page.locator('button:has-text("CANCEL")');
  await cancelButton.waitFor({ state: "visible", timeout: 10000 });
  assert.ok(await cancelButton.isVisible(), "Edit popup is not displayed");
  
  // Close edit popup
  await cancelButton.click();
  await this.page.waitForTimeout(500);
});

// ==================== Logout and Approver Login ====================

Then("user logs out from the application", async function (this: CustomWorld) {
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.logout();
  
  this.scenarioContext.set("currentUser", null);
  await this.page.waitForTimeout(3000);
});

Then("user logs in with approver user", async function (this: CustomWorld) {
  const loginPage = this.pageManager.getLoginPage();
  
  // Get org from scenario context (from @org tag)
  const tenantId = this.scenarioContext.get<string>("orgId") || "equalsmoney";
  
  logger.info(`Starting login with approver credentials: ${EnvConfig.APPROVER_USERNAME}`);
  
  await loginPage.login(
    tenantId,
    EnvConfig.APPROVER_USERNAME,
    EnvConfig.APPROVER_PASSWORD,
    true // skipLandingPage since we just logged out
  );
  
  this.scenarioContext.set("currentUser", {
    orgId: tenantId,
    email: EnvConfig.APPROVER_USERNAME,
    password: EnvConfig.APPROVER_PASSWORD
  });
  
  await this.page.waitForTimeout(3000);
});

Then("user navigates to the Home page", async function (this: CustomWorld) {
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.verifyHomePageDisplayed();
});

// ==================== Approval Workflow ====================

Then("user navigates to Pre Screening Rule pending approval tab", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  await this.page.waitForTimeout(2000);
  await preScreeningPage.clickPendingTab();
});

Then("user searches and claims the Pre Screening Rule", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Search for the rule
  logger.info(`Searching for the rule: ${ruleName}`);
  await preScreeningPage.searchRule(ruleName);
  
  // Click Claim button
  await preScreeningPage.claimRule(0);
  
  await this.page.waitForTimeout(3000);
});

Then("user opens the claimed Pre Screening Rule", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Clear and search for the rule
  await preScreeningPage.clearSearch();
  await preScreeningPage.searchRule(ruleName);
  
  await this.page.waitForTimeout(3000);
  
  // Click View icon to open the rule details
  await preScreeningPage.clickViewIcon(0);
  
  await this.page.waitForTimeout(2000);
  
  // Verify popup is opened
  const popup = this.page.locator('[role="contentinfo"]');
  await popup.waitFor({ state: "visible", timeout: 10000 });
});

Then("user approves the claimed Pre Screening Rule", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  await this.page.waitForTimeout(1000);
  
  // Click Approve button
  await preScreeningPage.approveRule();
  
  await this.page.waitForTimeout(3000);
});

Then("user validates the Pre Screening Rule is approved", async function (this: CustomWorld) {
  const preScreeningPage = new PreScreeningRulePage(this.page);
  
  // Click on Approved tab
  await preScreeningPage.clickApprovedTab();
  await this.page.waitForTimeout(3000);
  
  // Search for the approved rule
  await preScreeningPage.searchRule(ruleName);
  
  // Validate rule status like Java does
  // Java: validates status text contains "approved" or "active"
  await preScreeningPage.validateApprovedRuleStatus(ruleName);
});

Then("user collapses the left panel", async function (this: CustomWorld) {
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.collapseLeftPanel();
});
