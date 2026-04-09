import { Locator, Page } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";

export class TasksPage {
  private actions: PlaywrightActions;

  // Navigation locators
  private tasksNavButton: Locator;
  private expandArrow: Locator;

  // Main tabs (Pending L1, Pending L2, Rejected, Overdue, Review)
  private pendingL1Tab: Locator;
  private pendingL2Tab: Locator;
  private rejectedTab: Locator;
  private overdueTab: Locator;
  private reviewTab: Locator;

  // Sub tabs (record types)
  private commercialRecordsTab: Locator;
  private pressReleaseRecordsTab: Locator;
  private internalRecordsTab: Locator;
  private reconciliationRecordsTab: Locator;
  private listsConfigurationTab: Locator;
  private templatesTab: Locator;

  // Table locators
  private tableWrapper: Locator;
  private tableRows: Locator;
  private selectAllCheckbox: Locator;
  private searchInput: Locator;
  private refreshButton: Locator;

  // Action icons
  private overviewIcon: Locator;
  private auditIcon: Locator;
  private releaseIcon: Locator;
  private withdrawIcon: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);

    // Navigation
    this.tasksNavButton = page.locator('[aria-label="Tasks"]');
    this.expandArrow = page.locator('.expand-arrow');

    // Main tabs - using aria-label pattern with partial match
    this.pendingL1Tab = page.locator('button[role="tab"][aria-label*="Pending L1"]');
    this.pendingL2Tab = page.locator('button[role="tab"][aria-label*="Pending L2"]');
    this.rejectedTab = page.locator('button[role="tab"][aria-label*="Rejected"]');
    this.overdueTab = page.locator('button[role="tab"][aria-label*="Overdue"]');
    this.reviewTab = page.locator('button[role="tab"][aria-label*="Review"]');

    // Sub tabs - using aria-label pattern
    this.commercialRecordsTab = page.locator('button[role="tab"][aria-label*="COMMERCIAL RECORDS"]');
    this.pressReleaseRecordsTab = page.locator('button[role="tab"][aria-label*="PRESS RELEASE RECORDS"]');
    this.internalRecordsTab = page.locator('button[role="tab"][aria-label*="INTERNAL RECORDS"]');
    this.reconciliationRecordsTab = page.locator('button[role="tab"][aria-label*="RECONCILIATION RECORDS"]');
    this.listsConfigurationTab = page.locator('button[role="tab"][aria-label*="LISTS CONFIGURATION"]');
    this.templatesTab = page.locator('button[role="tab"][aria-label*="TEMPLATES"]');

    // Table
    this.tableWrapper = page.locator('.facct-table-wrapper-v2');
    this.tableRows = page.locator('.facct-table tbody tr.table-row');
    this.selectAllCheckbox = page.locator('#select-all-records-checkbox');
    this.searchInput = page.locator('input[placeholder="Search by ID"]');
    this.refreshButton = page.locator('button[aria-label="refresh button"]');

    // Action icons (in table rows)
    this.overviewIcon = page.locator('[title="Overview"]');
    this.auditIcon = page.locator('[title="Audit"]');
    this.releaseIcon = page.locator('[title="Release"]');
    this.withdrawIcon = page.locator('[title="Withdraw"]');
  }

  async navigateToTasks(): Promise<void> {
    await this.tasksNavButton.waitFor({ state: "visible", timeout: 15000 });
    await this.tasksNavButton.click();
    await this.page.waitForLoadState("networkidle");
    // Wait for the Tasks page heading to be visible (the h1 is hidden, use path-label)
    await this.page.locator('.path-label:has-text("Tasks")').waitFor({ state: "visible", timeout: 15000 });
    logger.info("Navigated to Tasks page");
  }

  async collapseLeftPanel(): Promise<void> {
    const isVisible = await this.expandArrow.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await this.expandArrow.click();
      await this.page.waitForTimeout(500);
      logger.info("Left panel collapsed");
    } else {
      logger.info("Expand arrow not visible, panel may already be collapsed");
    }
  }


  // Main tab methods
  async isPendingL1TabActive(): Promise<boolean> {
    const isSelected = await this.pendingL1Tab.getAttribute("aria-selected");
    return isSelected === "true";
  }

  async clickPendingL1Tab(): Promise<void> {
    await this.pendingL1Tab.waitFor({ state: "visible", timeout: 10000 });
    await this.pendingL1Tab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Pending L1 tab");
  }

  async clickPendingL2Tab(): Promise<void> {
    await this.pendingL2Tab.waitFor({ state: "visible", timeout: 10000 });
    await this.pendingL2Tab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Pending L2 tab");
  }

  async clickRejectedTab(): Promise<void> {
    await this.rejectedTab.waitFor({ state: "visible", timeout: 10000 });
    await this.rejectedTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Rejected tab");
  }

  async clickOverdueTab(): Promise<void> {
    await this.overdueTab.waitFor({ state: "visible", timeout: 10000 });
    await this.overdueTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Overdue tab");
  }

  async clickReviewTab(): Promise<void> {
    await this.reviewTab.waitFor({ state: "visible", timeout: 10000 });
    await this.reviewTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Review tab");
  }

  // Sub tab methods
  async clickInternalRecordsTab(): Promise<void> {
    await this.internalRecordsTab.waitFor({ state: "visible", timeout: 10000 });
    await this.internalRecordsTab.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(1000); // Wait for table to load
    logger.info("Clicked INTERNAL RECORDS sub tab");
  }

  async clickCommercialRecordsTab(): Promise<void> {
    await this.commercialRecordsTab.waitFor({ state: "visible", timeout: 10000 });
    await this.commercialRecordsTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked COMMERCIAL RECORDS sub tab");
  }

  async clickPressReleaseRecordsTab(): Promise<void> {
    await this.pressReleaseRecordsTab.waitFor({ state: "visible", timeout: 10000 });
    await this.pressReleaseRecordsTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked PRESS RELEASE RECORDS sub tab");
  }

  async clickReconciliationRecordsTab(): Promise<void> {
    await this.reconciliationRecordsTab.waitFor({ state: "visible", timeout: 10000 });
    await this.reconciliationRecordsTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked RECONCILIATION RECORDS sub tab");
  }

  // Verify main tabs are visible
  async verifyMainTabsVisible(): Promise<boolean> {
    const tabs = [
      this.pendingL1Tab,
      this.pendingL2Tab,
      this.rejectedTab,
      this.overdueTab,
      this.reviewTab
    ];

    for (const tab of tabs) {
      const isVisible = await tab.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        logger.warn("One or more main tabs not visible");
        return false;
      }
    }
    logger.info("All main tabs are visible");
    return true;
  }

  // Filter methods - to show only unclaimed records
  async clickUnclaimedFilter(): Promise<void> {
    // Java selector: //span[@class='facct-tooltip ']//*[local-name() = 'svg' and contains(@data-testid,'SwipeLeft')]
    const unclaimedButton = this.page.locator('span.facct-tooltip svg[data-testid*="SwipeLeft"]').first();
    
    const isVisible = await unclaimedButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      await unclaimedButton.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000); // Wait for table to reload with filtered data
      logger.info("Clicked Unclaimed filter button - showing only unclaimed records");
    } else {
      // Try alternative selector
      const altButton = this.page.locator('[data-testid*="SwipeLeft"]').first();
      if (await altButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altButton.click();
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(2000);
        logger.info("Clicked Unclaimed filter button (alt selector)");
      } else {
        logger.warn("Unclaimed filter button not found");
      }
    }
  }

  async clickClaimedFilter(): Promise<void> {
    // Java selector: //span[@class='facct-tooltip ']//*[local-name() = 'svg' and contains(@data-testid,'SwipeRight')]
    const claimedButton = this.page.locator('span.facct-tooltip svg[data-testid*="SwipeRight"]').first();
    
    const isVisible = await claimedButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      await claimedButton.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
      logger.info("Clicked Claimed filter button - showing only claimed records");
    } else {
      logger.warn("Claimed filter button not found");
    }
  }

  // Table interaction methods
  async getTableRowCount(): Promise<number> {
    await this.tableRows.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const count = await this.tableRows.count();
    logger.info(`Table has ${count} rows`);
    return count;
  }

  async selectFirstRecord(): Promise<void> {
    const firstRowCheckbox = this.tableRows.first().locator('input[type="checkbox"]');
    await firstRowCheckbox.waitFor({ state: "visible", timeout: 10000 });
    await firstRowCheckbox.click();
    logger.info("Selected first record in table");
  }

  async selectRecordByIndex(index: number): Promise<void> {
    const rowCheckbox = this.tableRows.nth(index).locator('input[type="checkbox"]');
    await rowCheckbox.waitFor({ state: "visible", timeout: 10000 });
    await rowCheckbox.click();
    logger.info(`Selected record at index ${index}`);
  }

  async selectLatestRecord(): Promise<void> {
    // The table is sorted by submitted date, first row is the latest
    await this.selectFirstRecord();
  }

  async selectFirstUnclaimedRecord(): Promise<boolean> {
    // Find the first unclaimed record (no lock icon in claimed column)
    const rows = this.tableRows;
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const lockIcon = row.locator('.lock-icon');
      const hasLock = await lockIcon.count() > 0;
      
      if (!hasLock) {
        // This record is not claimed, select it
        const checkbox = row.locator('input[type="checkbox"]');
        await checkbox.click();
        logger.info(`Selected unclaimed record at index ${i}`);
        return true;
      }
    }
    
    logger.warn("No unclaimed records found");
    return false;
  }


  async clickRecordById(recordId: string): Promise<void> {
    const recordLink = this.page.locator(`.link-cell[aria-label="${recordId}"]`);
    await recordLink.waitFor({ state: "visible", timeout: 10000 });
    await recordLink.click();
    await this.page.waitForLoadState("networkidle");
    logger.info(`Clicked on record ${recordId}`);
  }

  async searchById(recordId: string): Promise<void> {
    await this.searchInput.waitFor({ state: "visible", timeout: 10000 });
    await this.searchInput.fill(recordId);
    await this.page.keyboard.press("Enter");
    await this.page.waitForLoadState("networkidle");
    logger.info(`Searched for record ID: ${recordId}`);
  }

  async refreshTable(): Promise<void> {
    await this.refreshButton.waitFor({ state: "visible", timeout: 10000 });
    await this.refreshButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Refreshed table");
  }

  // Claim and Accept methods
  async claimRecord(): Promise<void> {
    // Wait for the page to stabilize after checkbox selection
    await this.page.waitForTimeout(2000);
    
    // First, let's look for the footer container that holds the action buttons
    // The footer should appear when a record is selected
    const footerSelectors = [
      '.task-footer',
      '[class*="task-footer"]',
      '.footer-actions',
      '[class*="footer"]'
    ];
    
    let footerFound = false;
    for (const selector of footerSelectors) {
      const footer = this.page.locator(selector).first();
      if (await footer.isVisible({ timeout: 2000 }).catch(() => false)) {
        logger.info(`Footer found with selector: ${selector}`);
        footerFound = true;
        break;
      }
    }
    
    if (!footerFound) {
      // Log all visible elements that might be the footer
      const allDivs = await this.page.locator('div[class*="footer"], div[class*="action"]').allTextContents();
      logger.info(`Potential footer elements: ${allDivs.slice(0, 5).join(', ')}`);
    }
    
    // Try multiple selectors for the Claim button (matching Java: //button[contains(@id,'claim-btn')]//span)
    const claimSelectors = [
      '#task-footer-claim-btn',
      'button[id*="claim-btn"]',
      'button:has-text("CLAIM")',
      '[id*="claim-btn"]',
      'button span:has-text("CLAIM")',
      '.task-footer button:has-text("CLAIM")'
    ];
    
    let claimButton = null;
    let isVisible = false;
    
    for (const selector of claimSelectors) {
      const btn = this.page.locator(selector).first();
      isVisible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        claimButton = btn;
        logger.info(`Claim button found with selector: ${selector}`);
        break;
      }
    }
    
    if (isVisible && claimButton) {
      logger.info("Claim button found, clicking...");
      await claimButton.click();
      await this.page.waitForLoadState("networkidle");
      
      // Wait for success message
      const alertMessage = this.page.locator('[role="alert"]');
      try {
        await alertMessage.waitFor({ state: "visible", timeout: 5000 });
        const message = await alertMessage.textContent();
        logger.info(`Claim result: ${message}`);
      } catch (e) {
        logger.info("No alert message visible after claim");
      }
      
      await this.page.waitForTimeout(2000);
      logger.info("Claimed the record");
    } else {
      // Record might already be claimed, check for unclaim button
      const unclaimSelectors = ['#task-footer-unclaim-btn', 'button[id*="unclaim-btn"]', 'button:has-text("UNCLAIM")'];
      let isAlreadyClaimed = false;
      
      for (const selector of unclaimSelectors) {
        if (await this.page.locator(selector).first().isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info("Record is already claimed by current user");
          isAlreadyClaimed = true;
          break;
        }
      }
      
      if (!isAlreadyClaimed) {
        // Log what buttons ARE visible for debugging - look specifically in the page footer area
        const footerButtons = await this.page.locator('button').filter({ hasText: /CLAIM|APPROVE|REJECT|UNCLAIM/i }).allTextContents();
        logger.warn(`Footer action buttons found: ${footerButtons.join(', ') || 'NONE'}`);
        
        // Also log all buttons with IDs containing 'btn'
        const allBtnIds = await this.page.locator('button[id*="btn"]').evaluateAll(btns => 
          btns.map(b => `${b.id}: ${b.textContent?.trim()}`).slice(0, 10)
        );
        logger.warn(`Buttons with 'btn' in ID: ${allBtnIds.join(', ') || 'NONE'}`);
        
        logger.warn("Record may be claimed by another user or no unclaimed records available");
      }
    }
  }

  async acceptRecord(comment: string = "Approved via automation test"): Promise<void> {
    // Try multiple selectors for the Approve button (matching Java: //button[contains(@id,'approve-btn')]//span)
    const approveSelectors = [
      '#task-footer-approve-btn',
      'button[id*="approve-btn"]',
      'button:has-text("APPROVE")',
      '[id*="approve-btn"]'
    ];
    
    let approveButton = null;
    for (const selector of approveSelectors) {
      const btn = this.page.locator(selector).first();
      const isVisible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        approveButton = btn;
        logger.info(`Approve button found with selector: ${selector}`);
        break;
      }
    }
    
    if (!approveButton) {
      throw new Error("Approve button not found with any selector");
    }
    
    await approveButton.click();
    
    // Wait for the approval dialog to appear
    const commentModal = this.page.locator('.comment-modal-wrapper');
    await commentModal.waitFor({ state: "visible", timeout: 10000 });
    logger.info("Approval dialog opened");
    
    // Fill in the mandatory comment field
    const commentField = this.page.locator('#comment-modal-text-field');
    await commentField.waitFor({ state: "visible", timeout: 5000 });
    await commentField.fill(comment);
    await this.page.waitForTimeout(500); // Wait for the form to validate
    logger.info(`Filled approval comment: ${comment}`);
    
    // Click the submit button in the dialog
    const submitButton = this.page.locator('#comment-modal-submit-btn');
    await submitButton.waitFor({ state: "visible", timeout: 5000 });
    
    // Wait for button to be enabled (it's disabled until comment is entered)
    await this.page.waitForFunction(() => {
      const btn = document.querySelector('#comment-modal-submit-btn') as HTMLButtonElement;
      return btn && !btn.disabled;
    }, { timeout: 5000 });
    
    // Use force click to ensure the button is clicked
    await submitButton.click({ force: true });
    logger.info("Clicked submit button in approval dialog");
    
    // Wait for dialog to close - use a longer timeout and handle potential issues
    try {
      await commentModal.waitFor({ state: "hidden", timeout: 15000 });
      logger.info("Approval dialog closed");
    } catch (e) {
      // If dialog didn't close, try clicking submit again
      logger.warn("Dialog didn't close, trying to click submit again");
      const isStillVisible = await commentModal.isVisible();
      if (isStillVisible) {
        await submitButton.click({ force: true });
        await commentModal.waitFor({ state: "hidden", timeout: 10000 });
      }
    }
    
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(1000);
    logger.info("Record approved successfully");
  }

  async rejectRecord(comment: string = "Rejected via automation test"): Promise<void> {
    // Look for Reject button with specific ID
    const rejectButton = this.page.locator('#task-footer-reject-btn');
    await rejectButton.waitFor({ state: "visible", timeout: 10000 });
    await rejectButton.click();
    
    // Wait for the rejection dialog to appear (similar to approval)
    const commentModal = this.page.locator('.comment-modal-wrapper');
    const hasDialog = await commentModal.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasDialog) {
      // Fill in the comment field if dialog appears
      const commentField = this.page.locator('#comment-modal-text-field');
      await commentField.fill(comment);
      
      // Click the submit button
      const submitButton = this.page.locator('#comment-modal-submit-btn');
      await this.page.waitForFunction(() => {
        const btn = document.querySelector('#comment-modal-submit-btn') as HTMLButtonElement;
        return btn && !btn.disabled;
      }, { timeout: 5000 });
      await submitButton.click();
      
      await commentModal.waitFor({ state: "hidden", timeout: 10000 });
    }
    
    await this.page.waitForLoadState("networkidle");
    logger.info("Rejected the record");
  }

  async unclaimRecord(): Promise<void> {
    // Look for Unclaim button with specific ID
    const unclaimButton = this.page.locator('#task-footer-unclaim-btn');
    await unclaimButton.waitFor({ state: "visible", timeout: 10000 });
    await unclaimButton.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Unclaimed the record");
  }

  async claimAndAcceptRecord(): Promise<void> {
    // The record should already be selected by the previous step
    // Just proceed with claim and approve
    logger.info("Starting claim and accept flow...");

    // Try to claim
    await this.claimRecord();

    // Wait a bit for the claim to process
    await this.page.waitForTimeout(2000);

    // Try to approve
    await this.acceptRecord("Automated Acceptance Comment");
  }

  // Verify record approval
  async verifyRecordApproved(): Promise<boolean> {
    // Check for success message - the message appears briefly after approval
    // Look for text containing "approved successfully" or similar
    const successIndicators = [
      this.page.locator('text=approved successfully'),
      this.page.locator('text=Records approved successfully'),
      this.page.locator('.MuiAlert-message'),
      this.page.locator('[role="alert"]')
    ];
    
    for (const indicator of successIndicators) {
      const isVisible = await indicator.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        const message = await indicator.textContent().catch(() => "");
        logger.info(`Record approval result: ${message}`);
        return true;
      }
    }

    // Alternative: verify the approval dialog closed successfully
    const commentModal = this.page.locator('.comment-modal-wrapper');
    const dialogClosed = await commentModal.isHidden({ timeout: 2000 }).catch(() => true);
    
    if (dialogClosed) {
      logger.info("Record approved - approval dialog closed successfully");
      return true;
    }

    // Final check: verify we're still on the Tasks page (no error occurred)
    const isOnTasksPage = await this.isOnTasksPage();
    if (isOnTasksPage) {
      logger.info("Record approval completed - still on Tasks page");
      return true;
    }

    logger.warn("Could not verify record approval status");
    return false;
  }

  // Get record details from first row
  async getFirstRecordDetails(): Promise<{
    recordId: string;
    listName: string;
    action: string;
    type: string;
    name: string;
    submittedBy: string;
  }> {
    const firstRow = this.tableRows.first();
    await firstRow.waitFor({ state: "visible", timeout: 10000 });

    const cells = firstRow.locator('td');
    
    return {
      recordId: await cells.nth(0).locator('.link-cell').textContent() || "",
      listName: await cells.nth(1).textContent() || "",
      action: await cells.nth(2).textContent() || "",
      type: await cells.nth(3).textContent() || "",
      name: await cells.nth(4).textContent() || "",
      submittedBy: await cells.nth(5).textContent() || ""
    };
  }

  // Check if on Tasks page
  async isOnTasksPage(): Promise<boolean> {
    // The h1 element is hidden (opacity: 0), so we check for the visible path-label
    const tasksHeading = this.page.locator('.path-label:has-text("Tasks")');
    const isVisible = await tasksHeading.isVisible({ timeout: 5000 }).catch(() => false);
    return isVisible;
  }

  // Wait for table to load
  async waitForTableLoad(): Promise<void> {
    await this.tableWrapper.waitFor({ state: "visible", timeout: 15000 });
    await this.page.waitForLoadState("networkidle");
    logger.info("Table loaded");
  }

  // Pagination methods
  async clickDoubleArrowRight(): Promise<void> {
    // Navigate to the last page using the double arrow right (last page) button
    // Java uses: (//button[contains(@class,'pagination-next-btn')])[4]
    // This is the 4th button with class containing 'pagination-next-btn'
    const lastPageButton = this.page.locator('button[class*="pagination-next-btn"]').nth(3); // 0-indexed, so 4th = index 3
    
    const isVisible = await lastPageButton.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (isVisible) {
      // Check if button is disabled (tabindex=-1 means disabled)
      const tabIndex = await lastPageButton.getAttribute("tabindex");
      const isDisabled = tabIndex === "-1";
      
      if (!isDisabled) {
        await lastPageButton.click();
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(3000); // Wait longer for table to reload
        logger.info("Navigated to last page using double arrow right");
      } else {
        logger.info("Already on the last page (button disabled)");
      }
    } else {
      logger.warn("Last page button not found - may be single page or different pagination");
    }
  }

  async clickDoubleArrowLeft(): Promise<void> {
    // Navigate to the first page using the double arrow left (first page) button
    // Java uses: (//button[contains(@class,'pagination-next-btn')])[1]
    // This is the 1st button with class containing 'pagination-next-btn'
    const firstPageButton = this.page.locator('button[class*="pagination-next-btn"]').nth(0); // 0-indexed, so 1st = index 0
    
    const isVisible = await firstPageButton.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (isVisible) {
      const tabIndex = await firstPageButton.getAttribute("tabindex");
      const isDisabled = tabIndex === "-1";
      
      if (!isDisabled) {
        await firstPageButton.click();
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(2000);
        logger.info("Navigated to first page using double arrow left");
      } else {
        logger.info("Already on the first page (button disabled)");
      }
    } else {
      logger.warn("First page button not found");
    }
  }

  // Select the last record on the current page (matching Java behavior)
  async selectLastRecordCheckbox(): Promise<void> {
    // The checkbox structure is:
    // <div class="facct-checkbox" role="button" aria-pressed="false">
    //   <span class="MuiCheckbox-root">
    //     <input type="checkbox" id="internal-records-checkbox-XXX">
    //     <svg data-testid="CheckBoxOutlineBlankIcon">...</svg>
    //   </span>
    //   <label class="facct-checkbox-label">...</label>
    // </div>
    
    // Wait for the table to be loaded
    await this.page.waitForTimeout(2000);
    
    // Find all checkbox input elements in the table body
    // We need to click the input element directly for the checkbox to register
    const checkboxInputs = this.page.locator('tbody.MuiTableBody-root .facct-checkbox input[type="checkbox"]');
    const count = await checkboxInputs.count();
    
    logger.info(`Found ${count} checkbox inputs in table`);
    
    if (count > 0) {
      const lastIndex = count - 1;
      const lastCheckboxInput = checkboxInputs.nth(lastIndex);
      
      // Scroll into view
      await lastCheckboxInput.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300);
      
      // Click the checkbox input element
      await lastCheckboxInput.click({ force: true });
      await this.page.waitForTimeout(500);
      
      // Verify the checkbox was selected by checking the parent's aria-pressed attribute
      const parentCheckbox = this.page.locator('tbody.MuiTableBody-root .facct-checkbox').nth(lastIndex);
      const ariaPressed = await parentCheckbox.getAttribute('aria-pressed');
      logger.info(`Selected last record checkbox (index ${lastIndex} of ${count}), aria-pressed: ${ariaPressed}`);
    } else {
      // Fallback: try alternative selector - click on the checkbox container
      const checkboxContainers = this.page.locator('tbody.MuiTableBody-root .facct-checkbox');
      const altCount = await checkboxContainers.count();
      
      if (altCount > 0) {
        const lastIndex = altCount - 1;
        const lastCheckbox = checkboxContainers.nth(lastIndex);
        await lastCheckbox.scrollIntoViewIfNeeded();
        // Try clicking the inner input
        const innerInput = lastCheckbox.locator('input[type="checkbox"]');
        if (await innerInput.count() > 0) {
          await innerInput.click({ force: true });
          logger.info(`Selected last record checkbox using inner input (index ${lastIndex})`);
        } else {
          await lastCheckbox.click();
          logger.info(`Selected last record checkbox using container click (index ${lastIndex})`);
        }
      } else {
        logger.warn("No record checkboxes found in table");
      }
    }
  }
}
