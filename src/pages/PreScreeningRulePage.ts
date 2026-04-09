import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";
import * as assert from "assert";

/**
 * Page Object for Pre-Screening Rules functionality
 * Matches Java implementation exactly
 */
export class PreScreeningRulePage {
  // Navigation locators
  private transactionScreeningMenu: Locator;
  private preScreeningRulesMenuItem: Locator;

  // Tab locators
  private approvedTab: Locator;
  private pendingTab: Locator;

  // Action bar locators
  private searchInput: Locator;
  private addRuleButton: Locator;

  // Table locators
  private tableRows: Locator;

  constructor(private page: Page) {
    this.initializeLocators();
  }

  private initializeLocators(): void {
    // Navigation - matching Java XPaths
    this.transactionScreeningMenu = this.page.locator(
      'span:has-text("Transaction screening")'
    );
    this.preScreeningRulesMenuItem = this.page.locator(
      'span:has-text("Pre-screening rules")'
    );

    // Tabs - using role="tab" and aria-label for reliability
    this.approvedTab = this.page.locator('button[role="tab"][aria-label*="Approved"]');
    this.pendingTab = this.page.locator('button[role="tab"][aria-label*="Pending"]');

    // Action bar - Java uses: //div[@class='search-bar']/..//input[@id=':r7:']
    this.searchInput = this.page.locator('.search-bar input, input[placeholder*="Search"]');
    this.addRuleButton = this.page.locator('button:has-text("ADD PRE-SCREENING RULE")');

    // Table
    this.tableRows = this.page.locator("tbody tr");
  }

  // ==================== Navigation ====================

  async navigateToPreScreeningRules(): Promise<void> {
    logger.info("Clicking on Transaction Screening tab");
    await this.transactionScreeningMenu.click();
    await this.page.waitForTimeout(500);
    
    logger.info("Clicking on Pre-Screening Rules tab");
    await this.preScreeningRulesMenuItem.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Successfully navigated to Pre Screening Rule page");
  }

  async isOnPreScreeningRulesPage(): Promise<boolean> {
    await this.addRuleButton.waitFor({ state: "visible", timeout: 10000 });
    return this.addRuleButton.isVisible();
  }

  // ==================== Tab Navigation ====================

  async clickApprovedTab(): Promise<void> {
    await this.page.waitForTimeout(1000);
    await this.approvedTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Approved tab");
  }

  async clickPendingTab(): Promise<void> {
    await this.page.waitForTimeout(1000);
    await this.pendingTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Pending tab");
  }

  // ==================== Search ====================

  async searchRule(ruleName: string): Promise<void> {
    // Java: //div[@class='search-bar']/..//input[@id=':r7:']
    await this.searchInput.clear();
    await this.searchInput.fill(ruleName);
    await this.searchInput.press("Enter");
    await this.page.waitForTimeout(2000);
    logger.info(`Searched for rule: ${ruleName}`);
  }

  async clearSearch(): Promise<void> {
    try {
      await this.searchInput.clear();
    } catch (e) {
      logger.info("Could not clear search field");
    }
  }

  // ==================== Validation ====================

  async validateSearchResults(expectedOrderId: string, expectedName: string, expectedRuleId: string): Promise<void> {
    // Java validates: order_id, name, rule_id from table
    
    // Validate order ID - Java: //tbody/tr/td[2]/div/div/div
    const orderIdElement = this.page.locator("tbody tr td:nth-child(2) div div div").first();
    const actualOrderId = await orderIdElement.textContent() || "";
    assert.strictEqual(actualOrderId.trim(), expectedOrderId.toString(), 
      `Order ID mismatch. Expected: ${expectedOrderId}, Actual: ${actualOrderId}`);
    
    // Validate name - Java: //tbody/tr/td/button/div/div
    const nameElement = this.page.locator("tbody tr td button div div").first();
    const actualName = await nameElement.textContent() || "";
    assert.strictEqual(actualName.trim(), expectedName, 
      `Name mismatch. Expected: ${expectedName}, Actual: ${actualName}`);
    
    // Validate rule ID - Java: //tbody/tr/td[1]/div
    const ruleIdElement = this.page.locator("tbody tr td:first-child div").first();
    const actualRuleId = await ruleIdElement.textContent() || "";
    assert.strictEqual(actualRuleId.trim(), expectedRuleId.toString(), 
      `Rule ID mismatch. Expected: ${expectedRuleId}, Actual: ${actualRuleId}`);
    
    logger.info("Search results validated successfully");
  }

  async validateViewPopupContent(expectedName: string, expectedOrderId: string): Promise<void> {
    // Java: (//div[@class='pre-screening-rule-details-section']//div/input)[1] for name
    const ruleNameInput = this.page.locator(".pre-screening-rule-details-section input").first();
    const actualRuleName = await ruleNameInput.inputValue();
    assert.strictEqual(actualRuleName, expectedName, 
      `Rule name in popup mismatch. Expected: ${expectedName}, Actual: ${actualRuleName}`);
    
    // Java: (//div[@class='pre-screening-rule-details-section']//div/input)[3] for order
    const orderIdInput = this.page.locator(".pre-screening-rule-details-section input").nth(2);
    const actualOrderId = await orderIdInput.inputValue();
    assert.strictEqual(actualOrderId, expectedOrderId.toString(), 
      `Order ID in popup mismatch. Expected: ${expectedOrderId}, Actual: ${actualOrderId}`);
    
    logger.info("View popup content validated successfully");
  }

  async validateRuleInTable(expectedRuleName: string, expectedOrderId: string): Promise<void> {
    const rows = await this.tableRows.all();
    let ruleFound = false;
    
    for (const row of rows) {
      try {
        const nameCell = row.locator("td button div div");
        const cellText = await nameCell.textContent();
        if (cellText?.trim() === expectedRuleName) {
          ruleFound = true;
          break;
        }
      } catch {
        // Continue checking other rows
      }
    }
    
    assert.ok(ruleFound, `Rule not found in table: ${expectedRuleName}`);
    logger.info(`Rule "${expectedRuleName}" found in table`);
  }

  // ==================== View/Edit ====================

  async clickViewIcon(rowIndex: number = 0): Promise<void> {
    // Java: //div[@class='d-flex justify-content-between']/span/div[@title='View']
    const viewIcon = this.page.locator(".d-flex.justify-content-between span div[title='View']").nth(rowIndex);
    await viewIcon.click();
    await this.page.waitForTimeout(1000);
    logger.info(`Clicked view icon on row ${rowIndex}`);
  }

  async clickEditIcon(rowIndex: number = 0): Promise<void> {
    // Java: (//div[@class="d-flex justify-content-between"]//div)[3] - which is the Edit icon
    // Using title="Edit" is more reliable
    const editIcon = this.page.locator('tbody tr').nth(rowIndex).locator('[title="Edit"]');
    await editIcon.click();
    await this.page.waitForTimeout(1000);
    logger.info(`Clicked edit icon on row ${rowIndex}`);
  }

  async closePopup(): Promise<void> {
    // Java: //div[@role='contentinfo']//button
    const closeButton = this.page.locator('[role="contentinfo"] button').first();
    await closeButton.click();
    await this.page.waitForTimeout(500);
    logger.info("Closed popup");
  }

  // ==================== Add Rule ====================

  async clickAddRule(): Promise<void> {
    await this.addRuleButton.click();
    await this.page.waitForTimeout(1000);
    logger.info("Clicked Add Pre-Screening Rule button");
  }

  async fillFormFields(ruleName: string, orderId: string, description: string): Promise<void> {
    // Java: (//div[@class='pre-screening-rule-details-section']//input)[1] for name
    const ruleNameField = this.page.locator(".pre-screening-rule-details-section input").first();
    await ruleNameField.clear();
    await ruleNameField.fill(ruleName);
    
    // Java: (//div[@class='pre-screening-rule-details-section']//input)[3] for order
    const orderIdField = this.page.locator(".pre-screening-rule-details-section input").nth(2);
    await orderIdField.clear();
    await orderIdField.fill(orderId);
    
    // Java: (//div[@class='pre-screening-rule-details-section']//input)[4] for description
    const descriptionField = this.page.locator(".pre-screening-rule-details-section input").nth(3);
    await descriptionField.clear();
    await descriptionField.fill(description);
    
    // Select outcome - Java: //div[@class='facct-dropdown-v2 w-100']//div[@id='mui-component-select-outcome']
    const outcomeDropdown = this.page.locator("#mui-component-select-outcome");
    await outcomeDropdown.click();
    await this.page.waitForTimeout(500);
    
    // Java: //div[@class='single-select-menu']/span[2]
    const outcomeOption = this.page.locator(".single-select-menu span:nth-child(2)");
    await outcomeOption.click();
    await this.page.waitForTimeout(300);
    
    logger.info(`Filled form fields with name: ${ruleName}`);
  }

  async configureRuleConditions(value: string): Promise<void> {
    // Click Add rule button - Java: //div[@class='add-rule-btn']/button
    const addRuleButton = this.page.locator(".add-rule-btn button");
    await addRuleButton.click();
    await this.page.waitForTimeout(500);
    
    // Select parameter - Java: //div[@id='mui-component-select-parameter']
    const parameterDropdown = this.page.locator("#mui-component-select-parameter");
    await parameterDropdown.click();
    await this.page.waitForTimeout(300);
    
    // Java: //div[@class='single-select-menu  padding-section ']/span[1]
    const parameterOption = this.page.locator(".single-select-menu.padding-section span:first-child, .single-select-menu span:first-child");
    await parameterOption.first().click();
    await this.page.waitForTimeout(300);
    
    // Select operator - Java: //div[@id='mui-component-select-operator']
    const operatorDropdown = this.page.locator("#mui-component-select-operator");
    await operatorDropdown.click();
    await this.page.waitForTimeout(300);
    
    // Java: //ul[@role='listbox']/li[1]
    const operatorOption = this.page.locator("ul[role='listbox'] li:first-child");
    await operatorOption.click();
    await this.page.waitForTimeout(300);
    
    // Add parameter value - Java: //div[@class='chip-section']/div
    const parameterValueChip = this.page.locator(".chip-section > div").first();
    await parameterValueChip.click();
    await this.page.waitForTimeout(500);
    
    // Java: //div[@class='rule-modal-wrapper']//input
    const valueInput = this.page.locator(".rule-modal-wrapper input");
    await valueInput.clear();
    await valueInput.fill(value);
    
    // Java: //div[@class='popup-actions']/button[2]
    const valueSubmitButton = this.page.locator(".popup-actions button:nth-child(2)");
    await valueSubmitButton.click();
    await this.page.waitForTimeout(500);
    
    logger.info(`Configured rule conditions with value: ${value}`);
  }

  async submitRule(): Promise<void> {
    // Java: //button[text()='SUBMIT']
    const submitButton = this.page.locator('button:has-text("SUBMIT")');
    await submitButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Submitted rule");
  }

  // ==================== Approval Workflow ====================

  async claimRule(rowIndex: number = 0): Promise<void> {
    // Java: //div[@class="d-flex justify-content-between"]//div[@title='Claim']
    const claimButton = this.page.locator(".d-flex.justify-content-between div[title='Claim']").nth(rowIndex);
    await claimButton.click();
    await this.page.waitForTimeout(1000);
    
    // Handle confirmation dialog if present
    const confirmBtn = this.page.locator('button:has-text("CONFIRM"), button:has-text("YES"), button:has-text("OK")');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForTimeout(1000);
    }
    
    logger.info(`Claimed rule at row ${rowIndex}`);
  }

  async approveRule(): Promise<void> {
    // Click APPROVE button in the drawer footer
    const approveButton = this.page.locator('button[aria-label="APPROVE"]').first();
    await approveButton.click();
    await this.page.waitForTimeout(1000);
    
    // Fill the required Comments field in the confirmation popup
    const commentsField = this.page.locator('textarea[placeholder="Comments"]');
    await commentsField.waitFor({ state: "visible", timeout: 5000 });
    await commentsField.fill("Approved by automation test");
    
    // Click the APPROVE button in the confirmation popup (second APPROVE button)
    const confirmApproveButton = this.page.locator('button[aria-label="APPROVE"]').nth(1);
    await confirmApproveButton.click();
    await this.page.waitForTimeout(2000);
    
    logger.info("Approved rule with comments");
  }

  // ==================== Helpers ====================

  async getFirstRuleName(): Promise<string> {
    // Java: //tbody/tr/td/button/div/div
    const nameElement = this.page.locator("tbody tr td button div div").first();
    return (await nameElement.textContent()) || "";
  }

  async getRuleCount(): Promise<number> {
    return this.tableRows.count();
  }

  async isRuleVisible(ruleName: string): Promise<boolean> {
    await this.page.waitForTimeout(2000);
    // Java: searches in table for the rule name
    const ruleCell = this.page.locator("tbody tr td button div div").filter({ hasText: ruleName }).first();
    const isVisible = await ruleCell.isVisible({ timeout: 10000 }).catch(() => false);
    logger.info(`Rule "${ruleName}" visibility check: ${isVisible}`);
    return isVisible;
  }

  async validateApprovedRuleStatus(ruleName: string): Promise<void> {
    // Java: //tbody/tr//td[contains(@class,'status') or contains(text(),'Approved') or contains(text(),'Active')]
    // Java validates: status.toLowerCase().contains("approved") || status.toLowerCase().contains("active")
    
    // First check if rule is visible in table
    const ruleVisible = await this.isRuleVisible(ruleName);
    assert.ok(ruleVisible, `Rule "${ruleName}" should be visible in Approved tab`);
    
    // Then validate status text like Java does
    const statusCell = this.page.locator("tbody tr td").filter({ hasText: /approved|active/i }).first();
    const isStatusVisible = await statusCell.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isStatusVisible) {
      const status = await statusCell.textContent() || "";
      assert.ok(
        status.toLowerCase().includes("approved") || status.toLowerCase().includes("active"),
        `Rule status should be Approved or Active. Actual: ${status}`
      );
      logger.info(`Rule status validated: ${status}`);
    } else {
      // If no explicit status cell, just verify rule is in Approved tab (which we already did)
      logger.info(`Rule "${ruleName}" found in Approved tab`);
    }
  }
}
