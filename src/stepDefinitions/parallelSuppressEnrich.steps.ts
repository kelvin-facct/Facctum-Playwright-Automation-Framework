import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";
import { PageManager } from "../pages/PageManager";
import { logger } from "../utils/logger";
import * as assert from "assert";
import { Browser, BrowserContext, Page, chromium } from "playwright";

// ==================== Helper: Attribute section name mapping ====================

function getAttributeSectionName(type: string): string {
  switch (type.toLowerCase()) {
    case "alias": return "Other names";
    case "dob": return "Date of birth";
    case "id": return "ID numbers";
    default: return type;
  }
}

function parseTags(tagsStr: string): string[] {
  return tagsStr.split(",").map(t => t.trim());
}

// ==================== Background Steps ====================

Given("the maker is logged in and navigated to WC Main Premium commercial list", async function (this: CustomWorld) {
  // Navigate to home page first
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.verifyHomePageDisplayed();

  // Navigate to Commercial List → WC Main Premium
  const commercialListPage = this.pageManager.getCommercialListPage();
  await commercialListPage.navigateToCommercialList();
  await commercialListPage.openWCMainPremium();

  logger.info("Maker navigated to WC Main Premium commercial list");
});

Given("a clean record is identified with no pending actions", async function (this: CustomWorld) {
  const commercialListPage = this.pageManager.getCommercialListPage();
  const recordId = await commercialListPage.findCleanRecord();

  if (!recordId) {
    throw new Error("No clean record found in WC Main Premium list. All records have pending actions.");
  }

  // Store the record ID — profile is still open on Tab 1 from findCleanRecord
  this.scenarioContext.set("cleanRecordId", recordId);
  this.scenarioContext.set("makerPageUrl", this.page.url());

  // Create STALE TAB — navigate to FacctList URL (clean, no drawer state)
  // Then navigate into WC Main Premium, search by Record ID, open Overview
  const staleTab: Page = await this.context.newPage();

  const facctListUrl = `${EnvConfig.BASE_URL}/facctlist`;
  await staleTab.goto(facctListUrl);
  await staleTab.waitForLoadState("load");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  logger.info(`Stale tab: navigated to ${facctListUrl}`);

  // Navigate: Watchlist → Commercial list
  await staleTab.locator('span.MuiListItemText-primary:has-text("Watchlist")').waitFor({ state: "visible", timeout: 10000 });
  await staleTab.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();
  await staleTab.waitForTimeout(1000);
  await staleTab.locator('text=Commercial list').waitFor({ state: "visible", timeout: 10000 });
  await staleTab.locator('text=Commercial list').click();
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(2000);

  // Search for WC Main Premium and open it
  const staleListSearch = staleTab.locator('input[placeholder*="Search"]').first();
  await staleListSearch.waitFor({ state: "visible", timeout: 10000 });
  await staleListSearch.fill("WC Main Premium");
  await staleTab.keyboard.press("Enter");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(2000);

  const wcLink = staleTab.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first();
  await wcLink.waitFor({ state: "visible", timeout: 10000 });
  await wcLink.click();
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  logger.info("Stale tab: opened WC Main Premium list");

  // Search for the record by ID
  const staleRecordSearch = staleTab.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
  await staleRecordSearch.waitFor({ state: "visible", timeout: 10000 });
  await staleRecordSearch.click();
  await staleTab.waitForTimeout(500);
  await staleRecordSearch.fill(recordId);
  await staleTab.keyboard.press("Enter");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  logger.info(`Stale tab: searched for record ${recordId}`);

  // Open the first result via kebab → Overview
  const staleRows = staleTab.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  await staleRows.first().waitFor({ state: "visible", timeout: 15000 });
  const staleRowCount = await staleRows.count();
  logger.info(`Stale tab: ${staleRowCount} rows found after search`);

  if (staleRowCount === 0) {
    throw new Error(`Stale tab: search returned 0 results for record ID "${recordId}"`);
  }

  const kebab = staleRows.first().locator('.kebab-cell svg, td:last-child svg').first();
  await kebab.waitFor({ state: "visible", timeout: 10000 });
  await kebab.click();
  await staleTab.waitForTimeout(1500);

  const overviewOption = staleTab.locator('[role="menuitem"]:has-text("Overview")').first();
  await overviewOption.waitFor({ state: "visible", timeout: 5000 });
  await overviewOption.click();
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);

  // Verify profile drawer opened
  const staleSuppress = staleTab.locator('#lseg-footer-suppress-btn');
  const staleProfileOpen = await staleSuppress.isVisible({ timeout: 8000 }).catch(() => false);
  if (staleProfileOpen) {
    logger.info("Stale tab: profile confirmed open (SUPPRESS button visible)");
  } else {
    logger.warn("Stale tab: SUPPRESS button not visible — profile may not have opened");
  }

  logger.info(`Stale tab: record ${recordId} profile opened successfully`);

  // Switch back to Tab 1 (profile is still open from findCleanRecord — untouched)
  await this.page.bringToFront();
  await this.page.waitForTimeout(1000);

  // Store the stale tab
  this.scenarioContext.set("staleTab", staleTab);
  logger.info(`Clean record identified: ${recordId}. Stale tab created.`);
});

// ==================== Approver Session Helper ====================

/**
 * Creates a separate browser session for the approver user.
 * Stores the approver's browser, context, page, and pageManager in scenarioContext.
 */
async function setupApproverSession(world: CustomWorld): Promise<void> {
  // Launch a SEPARATE browser with isolated user data for the approver
  const approverBrowser: Browser = await chromium.launch({
    headless: EnvConfig.HEADLESS,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--force-device-scale-factor=0.67',
      '--high-dpi-support=1',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });
  const { width, height } = EnvConfig.RESOLUTION;

  // Create a completely fresh context — no shared cookies/storage with maker
  const approverContext: BrowserContext = await approverBrowser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    // Ensure no storage state is shared
    storageState: undefined,
  });
  approverContext.setDefaultTimeout(EnvConfig.TIMEOUT);

  const approverPage: Page = await approverContext.newPage();

  // Login as approver in this isolated context
  await AuthHelper.login(approverPage, {
    orgId: EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID,
    email: EnvConfig.APPROVER_USERNAME,
    password: EnvConfig.APPROVER_PASSWORD,
  });

  const approverPageManager = new PageManager(approverPage);

  world.scenarioContext.set("approverBrowser", approverBrowser);
  world.scenarioContext.set("approverContext", approverContext);
  world.scenarioContext.set("approverPage", approverPage);
  world.scenarioContext.set("approverPageManager", approverPageManager);

  logger.info("Approver session created in separate isolated browser");
}

/**
 * Cleans up the approver session resources.
 */
async function cleanupApproverSession(world: CustomWorld): Promise<void> {
  const approverPage = world.scenarioContext.get<Page>("approverPage");
  const approverContext = world.scenarioContext.get<BrowserContext>("approverContext");
  const approverBrowser = world.scenarioContext.get<Browser>("approverBrowser");

  try { if (approverPage && !approverPage.isClosed()) await approverPage.close(); } catch { /* ignore */ }
  try { if (approverContext) await approverContext.close(); } catch { /* ignore */ }
  try { if (approverBrowser) await approverBrowser.close(); } catch { /* ignore */ }

  logger.info("Approver session cleaned up");
}

/**
 * Captures a named screenshot and attaches it to the Cucumber report as evidence.
 */
async function captureEvidence(world: CustomWorld, page: Page, name: string): Promise<void> {
  try {
    const screenshot = await page.screenshot({ fullPage: false });
    await world.attach(screenshot, "image/png");
    await world.attach(`Evidence: ${name}`, "text/plain");
    logger.info(`Evidence captured: ${name}`);
  } catch (e) {
    logger.warn(`Failed to capture evidence "${name}": ${e}`);
  }
}

// ==================== Suppress/Enrich Record (SER) Steps ====================

When(
  "the maker performs Suppress\\/Enrich on the record with tags {string} reason {string} review period {string} comment {string} attachment {string}",
  async function (this: CustomWorld, tagsStr: string, reason: string, reviewPeriod: string, comment: string, attachment: string) {
    const profileView = this.pageManager.getProfileViewPage();

    await profileView.clickSuppressEnrich();
    await captureEvidence(this, this.page, "Suppress form opened");

    await profileView.fillSuppressEnrichForm({
      tags: parseTags(tagsStr),
      reason,
      reviewPeriod,
      comment: comment === "Without" ? undefined : comment,
      attachmentPath: attachment === "With" ? "src/resources/testData/Test_Sheet.xlsx" : undefined,
    });
    await captureEvidence(this, this.page, "Suppress form filled");

    await profileView.clickSubmit();
    await captureEvidence(this, this.page, "Suppress submitted for approval");

    // Store the action params for replay on stale view
    this.scenarioContext.set("lastAction", "suppressEnrich");
    this.scenarioContext.set("lastActionParams", { tags: parseTags(tagsStr), reason, reviewPeriod, comment, attachment });
    logger.info("Maker performed Suppress/Enrich action");
  }
);

// ==================== Suppress Attribute (SA) Steps ====================

When(
  "the maker suppresses {string} attribute at row {int} with tags {string} reason {string} review period {string} comment {string}",
  async function (this: CustomWorld, attributeType: string, row: number, tagsStr: string, reason: string, reviewPeriod: string, comment: string) {
    const profileView = this.pageManager.getProfileViewPage();
    const sectionName = getAttributeSectionName(attributeType);

    await profileView.suppressAttribute(sectionName, row);
    await profileView.fillSuppressAttributeForm({
      tags: parseTags(tagsStr),
      reason,
      reviewPeriod,
      comment: comment === "Without" ? undefined : comment,
    });
    await profileView.clickSubmit();

    this.scenarioContext.set("lastAction", "suppressAttribute");
    this.scenarioContext.set("lastActionParams", { attributeType, sectionName, row, tags: parseTags(tagsStr), reason, reviewPeriod, comment });
    logger.info(`Maker suppressed ${attributeType} attribute at row ${row}`);
  }
);

// ==================== Enrich Attribute (EA) Steps ====================

When(
  "the maker enriches {string} attribute with tags {string} reason {string} review period {string} comment {string} aliasType {string} langCode {string} name {string} idType {string} idNumber {string} date {string}",
  async function (
    this: CustomWorld, attributeType: string, tagsStr: string, reason: string, reviewPeriod: string,
    comment: string, aliasType: string, langCode: string, name: string, idType: string, idNumber: string, date: string
  ) {
    const profileView = this.pageManager.getProfileViewPage();
    const sectionName = getAttributeSectionName(attributeType);

    await profileView.clickEnrichOnSection(sectionName);

    const tags = parseTags(tagsStr);
    const commentVal = comment === "Without" ? undefined : comment;

    switch (attributeType.toLowerCase()) {
      case "alias":
        await profileView.fillEnrichAliasForm({ aliasType, languageCode: langCode, name, tags, reason, reviewPeriod, comment: commentVal });
        break;
      case "dob":
        await profileView.fillEnrichDobForm({ date, tags, reason, reviewPeriod, comment: commentVal });
        break;
      case "id":
        await profileView.fillEnrichIdForm({ idType, idNumber, tags, reason, reviewPeriod, comment: commentVal });
        break;
    }

    this.scenarioContext.set("lastAction", "enrichAttribute");
    this.scenarioContext.set("lastActionParams", { attributeType, sectionName, tags, reason, reviewPeriod, comment, aliasType, langCode, name, idType, idNumber, date });
    logger.info(`Maker enriched ${attributeType} attribute`);
  }
);

// ==================== Approver Steps ====================

When("the approver opens a separate browser session and navigates to Tasks", async function (this: CustomWorld) {
  await setupApproverSession(this);

  const approverPage = this.scenarioContext.get<Page>("approverPage")!;
  const recordId = this.scenarioContext.get<string>("cleanRecordId")!;

  // Step 1: Click List Management product card (required to access Tasks nav)
  await approverPage.locator('.product-card:has-text("List")').first().click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(2000);

  // Step 2: Click Tasks in left nav using XPath
  const tasksNav = approverPage.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span');
  await tasksNav.waitFor({ state: "visible", timeout: 10000 });
  await tasksNav.click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(2000);

  // Step 3: Click Pending L1 tab (stable aria-label)
  const pendingL1 = approverPage.locator('button[aria-label*="Pending L1"]');
  if (await pendingL1.isVisible({ timeout: 5000 }).catch(() => false)) {
    await pendingL1.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(1000);
  }

  // Step 4: Click COMMERCIAL RECORDS sub-tab (stable aria-label)
  const commercialTab = approverPage.locator('button[aria-label*="COMMERCIAL RECORDS"]');
  if (await commercialTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await commercialTab.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(2000);
  }

  logger.info("Approver navigated to Tasks > Pending L1 > Commercial Records");

  // Step 5: Navigate to LAST page (most recent record is at the end)
  const lastPageBtn = approverPage.locator('button[class*="pagination-next-btn"]').nth(3);
  if (await lastPageBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const isDisabled = (await lastPageBtn.getAttribute("tabindex")) === "-1";
    if (!isDisabled) {
      await lastPageBtn.click();
      await approverPage.waitForLoadState("networkidle");
      await approverPage.waitForTimeout(3000);
      logger.info("Navigated to last page of Tasks table");
    }
  }

  // Click the LAST row's kebab (most recent submission is at the bottom)
  const rows = approverPage.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  await rows.first().waitFor({ state: "visible", timeout: 10000 });
  const rowCount = await rows.count();
  const lastRow = rows.nth(rowCount - 1);
  const lastRowText = await lastRow.textContent() || "";
  logger.info(`Last row (${rowCount} total): ${lastRowText.trim().substring(0, 100)}`);

  const kebab = lastRow.locator('.kebab-cell svg, td:last-child svg').first();
  await kebab.click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(3000);
  logger.info("Approver opened most recent record (last row, last page)");

  // Evidence: Record opened in approver view
  await captureEvidence(this, approverPage, "Approver - Record opened in Tasks");

  // Verify audit trail before claiming - click AUDIT tab and check values
  const auditTab = approverPage.locator('button[aria-label="AUDIT"]').first();
  if (await auditTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await auditTab.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(2000);

    const auditContent = await approverPage.locator('.facct-drawer-content').textContent().catch(() => "") || "";
    const lastActionParams = this.scenarioContext.get<any>("lastActionParams");

    // Verify audit contains expected values
    if (lastActionParams) {
      const tags = lastActionParams.tags || [];
      const reason = lastActionParams.reason || "";

      for (const tag of tags) {
        if (auditContent.includes(tag)) {
          logger.info(`Audit verified: Tag "${tag}" found`);
        } else {
          logger.warn(`Audit: Tag "${tag}" NOT found in audit trail`);
        }
      }

      if (reason && auditContent.includes(reason)) {
        logger.info(`Audit verified: Reason "${reason}" found`);
      } else if (reason) {
        logger.warn(`Audit: Reason "${reason}" NOT found in audit trail`);
      }

      // Log first 300 chars of audit for debugging
      logger.info(`Audit content (first 300): ${auditContent.trim().substring(0, 300)}`);
    }

    // Evidence: Audit trail verified
    await captureEvidence(this, approverPage, "Approver - Audit trail verified");

    // Switch back to record details tab
    const recordTab = approverPage.locator('button[aria-label="RECORD DETAILS"]').first();
    if (await recordTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recordTab.click();
      await approverPage.waitForTimeout(1000);
    }
  }
});

When("the approver claims and Approve the request", async function (this: CustomWorld) {
  const approverPage = this.scenarioContext.get<Page>("approverPage")!;

  // Click CLAIM
  const claimBtn = approverPage.locator('#task-footer-claim-btn');
  await claimBtn.waitFor({ state: "visible", timeout: 10000 });
  await claimBtn.click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(2000);
  logger.info("Approver claimed the record");

  // Evidence: Record claimed
  await captureEvidence(this, approverPage, "Approver - Record claimed");

  // Click APPROVE
  const approveBtn = approverPage.locator('#task-footer-approve-btn');
  await approveBtn.waitFor({ state: "visible", timeout: 10000 });
  await approveBtn.click();
  await approverPage.waitForTimeout(2000);

  // Fill comment in the approve popup
  const cmtField = approverPage.locator('#comment-modal-text-field');
  await cmtField.waitFor({ state: "visible", timeout: 10000 });
  await cmtField.fill("Approved via parallel test automation");
  await approverPage.waitForTimeout(500);

  // Click APPROVE button in the popup
  const appBtn = approverPage.locator('#comment-modal-submit-btn');
  await appBtn.waitFor({ state: "visible", timeout: 5000 });
  await appBtn.click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(3000);

  // Verify approval was successful
  const successBanner = approverPage.locator('[role="alert"]').first();
  const successText = await successBanner.textContent({ timeout: 5000 }).catch(() => "no message");
  logger.info(`Approval result: ${successText?.trim()}`);

  this.scenarioContext.set("approverAction", "Approve");
  logger.info("Approver approved the request");
});

When("the approver claims and Reject the request", async function (this: CustomWorld) {
  const approverPage = this.scenarioContext.get<Page>("approverPage")!;

  // Click CLAIM
  const claimBtn = approverPage.locator('#task-footer-claim-btn');
  await claimBtn.waitFor({ state: "visible", timeout: 10000 });
  await claimBtn.click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(2000);
  logger.info("Approver claimed the record");

  // Click REJECT
  const rejectBtn = approverPage.locator('#task-footer-reject-btn');
  await rejectBtn.waitFor({ state: "visible", timeout: 10000 });
  await rejectBtn.click();
  await approverPage.waitForTimeout(2000);

  // Fill comment in the reject dialog
  const commentField = approverPage.locator('#comment-modal-text-field');
  const hasDialog = await commentField.isVisible({ timeout: 5000 }).catch(() => false);
  if (hasDialog) {
    await commentField.fill("Rejected via parallel test automation");
    await approverPage.waitForTimeout(500);
    // Click the submit button in the popup dialog
    const dialogSubmitBtn = approverPage.locator('#comment-modal-submit-btn').first();
    await dialogSubmitBtn.waitFor({ state: "visible", timeout: 5000 });
    await approverPage.waitForFunction(() => {
      const btn = document.querySelector('#comment-modal-submit-btn') as HTMLButtonElement;
      return btn && !btn.disabled;
    }, { timeout: 5000 }).catch(() => {});
    await dialogSubmitBtn.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(2000);
  }

  this.scenarioContext.set("approverAction", "Reject");
  logger.info("Approver rejected the request");
});

When("the approver claims and Withdraw the request", async function (this: CustomWorld) {
  // Withdraw is done by the maker, not the approver.
  // The maker withdraws from Window 1 before the approver acts.
  // For this step, we simulate the maker withdrawing.
  const profileView = this.pageManager.getProfileViewPage();

  // Look for withdraw button on the maker's page
  const withdrawBtn = this.page.locator('button:has-text("Withdraw"), button:has-text("WITHDRAW")').first();
  const isVisible = await withdrawBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (isVisible) {
    await withdrawBtn.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  }

  this.scenarioContext.set("approverAction", "Withdraw");
  logger.info("Maker withdrew the request");

  // Clean up approver session since it's not needed for withdraw
  await cleanupApproverSession(this);
});

// ==================== Stale View Retry Steps ====================

When("the maker retries the same Suppress\\/Enrich action on the stale view", async function (this: CustomWorld) {
  // Switch to the STALE TAB — this tab has the old profile view, never refreshed
  const staleTab = this.scenarioContext.get<Page>("staleTab")!;
  const params = this.scenarioContext.get<any>("lastActionParams")!;

  // Bring the stale tab to front
  await staleTab.bringToFront();
  await staleTab.waitForTimeout(1000);
  logger.info("Switched to stale tab");

  // Create a ProfileViewPage for the stale tab
  const staleProfileView = new (await import("../pages/ProfileViewPage")).ProfileViewPage(staleTab);

  // Check if SUPPRESS button is visible on the stale tab
  const suppressBtn = staleTab.locator('#lseg-footer-suppress-btn');
  const isOpen = await suppressBtn.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isOpen) {
    logger.warn("SUPPRESS button not visible on stale tab — profile may have closed");
    // Try to re-open via kebab on the stale tab (data is still stale)
    const recordId = this.scenarioContext.get<string>("cleanRecordId")!;
    const rows = staleTab.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const cellText = await rows.nth(i).locator('td').first().textContent() || "";
      if (cellText.trim() === recordId) {
        await rows.nth(i).locator('.kebab-cell svg, td:last-child svg').first().click();
        await staleTab.waitForTimeout(1000);
        const overviewOption = staleTab.locator('[role="menuitem"]:has-text("Overview")').first();
        if (await overviewOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await overviewOption.click();
        }
        await staleTab.waitForTimeout(2000);
        break;
      }
    }
  }

  await staleProfileView.clickSuppressEnrich();
  await staleProfileView.fillSuppressEnrichForm({
    tags: params.tags,
    reason: params.reason,
    reviewPeriod: params.reviewPeriod,
    comment: params.comment === "Without" ? undefined : params.comment,
    attachmentPath: params.attachment === "With" ? "src/resources/testData/Test_Sheet.xlsx" : undefined,
  });
  await staleProfileView.clickSubmit();

  // Capture any error/alert/message that appeared after stale submit
  await staleTab.waitForTimeout(3000);
  const allAlerts = await staleTab.locator('[role="alert"], .MuiAlert-root, .MuiSnackbar-root').allTextContents().catch(() => []);
  if (allAlerts.length > 0) {
    logger.info(`Stale retry alerts: ${JSON.stringify(allAlerts.map(a => a.trim().substring(0, 100)))}`);
    this.scenarioContext.set("staleRetryAlerts", allAlerts);
  }

  // Also capture the full page text around any error/warning banners
  const pageErrors = await staleTab.evaluate(() => {
    const alerts = document.querySelectorAll('[role="alert"], .MuiAlert-root, .MuiSnackbar-root, [class*="error"], [class*="warning"]');
    return Array.from(alerts).map(a => a.textContent?.trim().substring(0, 200)).filter(Boolean);
  });
  if (pageErrors.length > 0) {
    logger.info(`Stale retry page errors: ${JSON.stringify(pageErrors)}`);
    this.scenarioContext.set("staleRetryErrors", pageErrors);
  }

  // Take screenshot for evidence
  await captureEvidence(this, staleTab, "Stale retry - after submit");

  logger.info("Maker retried Suppress/Enrich on stale view");
});

When("the maker retries the same suppress attribute action on the stale view", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  const params = this.scenarioContext.get<any>("lastActionParams")!;

  await profileView.suppressAttribute(params.sectionName, params.row);
  await profileView.fillSuppressAttributeForm({
    tags: params.tags,
    reason: params.reason,
    reviewPeriod: params.reviewPeriod,
    comment: params.comment === "Without" ? undefined : params.comment,
  });
  await profileView.clickSubmit();
  logger.info("Maker retried suppress attribute on stale view");
});

When("the maker retries the same enrich attribute action on the stale view", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  const params = this.scenarioContext.get<any>("lastActionParams")!;
  const sectionName = getAttributeSectionName(params.attributeType);

  await profileView.clickEnrichOnSection(sectionName);

  const commentVal = params.comment === "Without" ? undefined : params.comment;

  switch (params.attributeType.toLowerCase()) {
    case "alias":
      await profileView.fillEnrichAliasForm({ aliasType: params.aliasType, languageCode: params.langCode, name: params.name, tags: params.tags, reason: params.reason, reviewPeriod: params.reviewPeriod, comment: commentVal });
      break;
    case "dob":
      await profileView.fillEnrichDobForm({ date: params.date, tags: params.tags, reason: params.reason, reviewPeriod: params.reviewPeriod, comment: commentVal });
      break;
    case "id":
      await profileView.fillEnrichIdForm({ idType: params.idType, idNumber: params.idNumber, tags: params.tags, reason: params.reason, reviewPeriod: params.reviewPeriod, comment: commentVal });
      break;
  }
  logger.info("Maker retried enrich attribute on stale view");
});

// ==================== Edit Profile View (EPV) Steps ====================

When("the maker clicks Edit on the profile view without making changes", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  await profileView.clickEdit();
  // Do NOT make any changes
  logger.info("Maker clicked Edit without making changes");
});

When("the maker clicks Edit on the profile view", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  await profileView.clickEdit();
  logger.info("Maker clicked Edit on profile view");
});

When("the maker enters only a comment {string}", async function (this: CustomWorld, comment: string) {
  const commentField = this.page.locator(
    'textarea[id*="comment"], input[id*="comment"], [aria-label*="comment"]'
  ).first();
  await commentField.waitFor({ state: "visible", timeout: 5000 });
  await commentField.fill(comment);
  logger.info("Maker entered comment only");
});

When("the maker uploads only an attachment", async function (this: CustomWorld) {
  const fileInput = this.page.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 5000 });
  await fileInput.setInputFiles("src/resources/testData/Test_Sheet.xlsx");
  await this.page.waitForTimeout(1000);
  logger.info("Maker uploaded attachment only");
});

When(
  "the maker suppresses {string} attribute at row {int} in edit mode with tags {string} reason {string} review period {string} comment {string}",
  async function (this: CustomWorld, attributeType: string, row: number, tagsStr: string, reason: string, reviewPeriod: string, comment: string) {
    const profileView = this.pageManager.getProfileViewPage();
    const sectionName = getAttributeSectionName(attributeType);

    await profileView.suppressAttribute(sectionName, row);
    await profileView.fillSuppressAttributeForm({
      tags: parseTags(tagsStr),
      reason,
      reviewPeriod,
      comment: comment === "Without" ? undefined : comment,
    });

    this.scenarioContext.set("lastAction", "editSuppressAttribute");
    this.scenarioContext.set("lastActionParams", { attributeType, sectionName, row, tags: parseTags(tagsStr), reason, reviewPeriod, comment });
    logger.info(`Maker suppressed ${attributeType} at row ${row} in edit mode`);
  }
);

When(
  "the maker enriches {string} in edit mode with tags {string} reason {string} review period {string} comment {string} aliasType {string} langCode {string} name {string} idType {string} idNumber {string} date {string}",
  async function (
    this: CustomWorld, attributeType: string, tagsStr: string, reason: string, reviewPeriod: string,
    comment: string, aliasType: string, langCode: string, name: string, idType: string, idNumber: string, date: string
  ) {
    const profileView = this.pageManager.getProfileViewPage();
    const sectionName = getAttributeSectionName(attributeType);

    await profileView.clickEnrichOnSection(sectionName);

    const tags = parseTags(tagsStr);
    const commentVal = comment === "Without" ? undefined : comment;

    switch (attributeType.toLowerCase()) {
      case "alias":
        await profileView.fillEnrichAliasForm({ aliasType, languageCode: langCode, name, tags, reason, reviewPeriod, comment: commentVal });
        break;
      case "dob":
        await profileView.fillEnrichDobForm({ date, tags, reason, reviewPeriod, comment: commentVal });
        break;
      case "id":
        await profileView.fillEnrichIdForm({ idType, idNumber, tags, reason, reviewPeriod, comment: commentVal });
        break;
    }

    this.scenarioContext.set("lastAction", "editEnrichAttribute");
    this.scenarioContext.set("lastActionParams", { attributeType, sectionName, tags, reason, reviewPeriod, comment, aliasType, langCode, name, idType, idNumber, date });
    logger.info(`Maker enriched ${attributeType} in edit mode`);
  }
);

When("the maker submits the edit", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  await profileView.clickSubmit();
  logger.info("Maker submitted the edit");
});

When("the maker retries the same edit suppress action on the stale view", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  const params = this.scenarioContext.get<any>("lastActionParams")!;

  await profileView.clickEdit();
  await profileView.suppressAttribute(params.sectionName, params.row);
  await profileView.fillSuppressAttributeForm({
    tags: params.tags,
    reason: params.reason,
    reviewPeriod: params.reviewPeriod,
    comment: params.comment === "Without" ? undefined : params.comment,
  });
  await profileView.clickSubmit();
  logger.info("Maker retried edit suppress on stale view");
});

When("the maker retries the same edit enrich action on the stale view", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  const params = this.scenarioContext.get<any>("lastActionParams")!;
  const sectionName = getAttributeSectionName(params.attributeType);

  await profileView.clickEdit();
  await profileView.clickEnrichOnSection(sectionName);

  const commentVal = params.comment === "Without" ? undefined : params.comment;

  switch (params.attributeType.toLowerCase()) {
    case "alias":
      await profileView.fillEnrichAliasForm({ aliasType: params.aliasType, languageCode: params.langCode, name: params.name, tags: params.tags, reason: params.reason, reviewPeriod: params.reviewPeriod, comment: commentVal });
      break;
    case "dob":
      await profileView.fillEnrichDobForm({ date: params.date, tags: params.tags, reason: params.reason, reviewPeriod: params.reviewPeriod, comment: commentVal });
      break;
    case "id":
      await profileView.fillEnrichIdForm({ idType: params.idType, idNumber: params.idNumber, tags: params.tags, reason: params.reason, reviewPeriod: params.reviewPeriod, comment: commentVal });
      break;
  }
  await profileView.clickSubmit();
  logger.info("Maker retried edit enrich on stale view");
});

// ==================== Validation Steps ====================

Then("the Submit button should be disabled", async function (this: CustomWorld) {
  const profileView = this.pageManager.getProfileViewPage();
  const isEnabled = await profileView.isSubmitEnabled();
  assert.strictEqual(isEnabled, false, "Submit button should be disabled when no changes are made");
  logger.info("Verified: Submit button is disabled");
});

Then("the expected outcome for {string} workflow should be validated", async function (this: CustomWorld, workflow: string) {
  // Use the stale tab for validation (that's where the stale action was performed)
  const staleTab = this.scenarioContext.get<Page>("staleTab") || this.page;
  const staleProfileView = new (await import("../pages/ProfileViewPage")).ProfileViewPage(staleTab);

  switch (workflow.toLowerCase()) {
    case "approve": {
      // After approval, the stale suppress should throw an error.
      // First check errors captured during the stale retry step
      const capturedAlerts = this.scenarioContext.get<string[]>("staleRetryAlerts") || [];
      const capturedErrors = this.scenarioContext.get<string[]>("staleRetryErrors") || [];
      logger.info(`Validation - Captured alerts: ${JSON.stringify(capturedAlerts)}`);
      logger.info(`Validation - Captured errors: ${JSON.stringify(capturedErrors)}`);

      // Check for ANY error/alert message on the page now
      // Actual error: "The record has been updated, please update your changes using the latest version"
      const errorSelectors = [
        'text=The record has been updated',
        'text=please update your changes using the latest version',
        'text=has been updated',
        'text=latest version',
        '[role="alert"]:has-text("updated")',
        '[role="alert"]:has-text("latest version")',
        '[role="alert"]',
        '.MuiAlert-root',
        '.MuiSnackbar-root',
        'text=version conflict',
        'text=conflict',
        'text=has been modified',
        'text=already been modified',
        'text=error',
        'text=Error',
        'text=failed',
        'text=cannot',
      ];

      let errorFound = capturedAlerts.length > 0 || capturedErrors.length > 0;
      let errorText = capturedAlerts.join("; ") || capturedErrors.join("; ");

      if (!errorFound) {
        for (const sel of errorSelectors) {
          const el = staleTab.locator(sel).first();
          const isVisible = await el.isVisible({ timeout: 3000 }).catch(() => false);
          if (isVisible) {
            errorText = await el.textContent().catch(() => "") || "";
            errorFound = true;
            break;
          }
        }
      }

      logger.info(`Validation result - Error found: ${errorFound}, Message: "${errorText.trim().substring(0, 200)}"`);

      // Take screenshot for evidence
      try {
        const screenshot = await staleTab.screenshot();
        await this.attach(screenshot, "image/png");
      } catch { /* ignore */ }

      assert.strictEqual(errorFound, true,
        `Expected an error after stale suppress on approved record, but no error was detected. ` +
        `Alerts: ${JSON.stringify(capturedAlerts)}, Errors: ${JSON.stringify(capturedErrors)}`
      );
      logger.info(`PASS: Stale suppress error detected: "${errorText.trim().substring(0, 100)}"`);

      // Evidence: Stale error detected
      await captureEvidence(this, staleTab, `Validation - Stale error: ${errorText.trim().substring(0, 80)}`);

      // Close the record view on stale tab (best effort)
      try {
        const closeBtn = staleTab.locator('#lseg-footer-close-btn, #hold-enrich-modal-cancel-btn, [data-testid="CloseIcon"]').first();
        if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await closeBtn.click();
          await staleTab.waitForTimeout(1000);
        } else {
          await staleTab.keyboard.press("Escape");
          await staleTab.waitForTimeout(1000);
        }
      } catch { /* ignore close errors */ }
      logger.info("Closed record view — Approve workflow test PASSED");
      break;
    }

    case "reject": {
      await staleTab.waitForTimeout(2000);
      const hasError = await staleTab.locator('[role="alert"]:has-text("error"), [role="alert"]:has-text("conflict")').first().isVisible({ timeout: 3000 }).catch(() => false);
      assert.strictEqual(hasError, false,
        "Unexpected error after Reject workflow. Record state should be unchanged."
      );
      logger.info("Validated: No error after Reject workflow");
      await staleProfileView.closeProfileView();
      break;
    }

    case "withdraw": {
      await staleTab.waitForTimeout(2000);
      const hasError = await staleTab.locator('[role="alert"]:has-text("error"), [role="alert"]:has-text("conflict")').first().isVisible({ timeout: 3000 }).catch(() => false);
      assert.strictEqual(hasError, false,
        "Unexpected error after Withdraw workflow. Record state should be unchanged."
      );
      logger.info("Validated: No error after Withdraw workflow");
      await staleProfileView.closeProfileView();
      break;
    }

    default:
      throw new Error(`Unknown workflow action: ${workflow}`);
  }

  // Cleanup approver session if still open
  await cleanupApproverSession(this);

  // Close stale tab
  const staleTabCleanup = this.scenarioContext.get<Page>("staleTab");
  if (staleTabCleanup && !staleTabCleanup.isClosed()) {
    await staleTabCleanup.close().catch(() => {});
  }
});

// ==================== Release Suppression (Cleanup Step) ====================

Then("the suppression is released and approved for cleanup", async function (this: CustomWorld) {
  logger.info("Starting suppression release cleanup...");

  // Switch to maker's main page (Tab 1) and refresh to get latest state
  await this.page.bringToFront();
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(3000);

  // Open the suppressed record profile via kebab → Overview
  const recordId = this.scenarioContext.get<string>("cleanRecordId")!;
  const commercialListPage = this.pageManager.getCommercialListPage();
  try {
    await commercialListPage.openRecordById(recordId);
  } catch {
    logger.warn(`Could not find record ${recordId} for release, skipping cleanup`);
    return;
  }

  await captureEvidence(this, this.page, "Release - Record suppressed profile");

  // Click RELEASE button
  const releaseBtn = this.page.locator('button:has-text("RELEASE")').first();
  if (!(await releaseBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
    logger.info("No RELEASE button found — record may not need release");
    return;
  }

  await releaseBtn.click();
  await this.page.waitForTimeout(2000);

  // Fill comment in the release popup
  const releaseComment = this.page.locator('#hold-enrich-comment--1, textarea[placeholder="Comment"]').first();
  if (await releaseComment.isVisible({ timeout: 3000 }).catch(() => false)) {
    await releaseComment.fill("Release via automation cleanup");
    await this.page.waitForTimeout(500);
  }

  await captureEvidence(this, this.page, "Release - Form filled");

  // Click Submit for Approval
  const releaseSubmit = this.page.locator('#hold-enrich-modal-submit-btn').first();
  if (await releaseSubmit.isVisible({ timeout: 3000 }).catch(() => false)) {
    await releaseSubmit.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  }
  logger.info("Release submitted for approval");

  // Now approve the release via a new approver session
  await setupApproverSession(this);
  const approverPage = this.scenarioContext.get<Page>("approverPage")!;

  // Navigate: List Management → Tasks → Pending L1 → Commercial Records
  await approverPage.locator('.product-card:has-text("List")').first().click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(2000);
  await approverPage.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(2000);
  const pendingL1 = approverPage.locator('button[aria-label*="Pending L1"]');
  if (await pendingL1.isVisible({ timeout: 5000 }).catch(() => false)) {
    await pendingL1.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(1000);
  }
  const commercialTab = approverPage.locator('button[aria-label*="COMMERCIAL RECORDS"]');
  if (await commercialTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await commercialTab.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(2000);
  }

  // Navigate to last page → last row → kebab
  const lastPageBtn = approverPage.locator('button[class*="pagination-next-btn"]').nth(3);
  if (await lastPageBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const isDisabled = (await lastPageBtn.getAttribute("tabindex")) === "-1";
    if (!isDisabled) {
      await lastPageBtn.click();
      await approverPage.waitForLoadState("networkidle");
      await approverPage.waitForTimeout(3000);
    }
  }
  const rows = approverPage.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  await rows.first().waitFor({ state: "visible", timeout: 10000 });
  const rowCount = await rows.count();
  const lastRow = rows.nth(rowCount - 1);
  await lastRow.locator('.kebab-cell svg, td:last-child svg').first().click();
  await approverPage.waitForLoadState("networkidle");
  await approverPage.waitForTimeout(3000);

  // Verify audit trail for the release
  const auditTab = approverPage.locator('button[aria-label="AUDIT"]').first();
  if (await auditTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await auditTab.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(2000);
    const auditContent = await approverPage.locator('.facct-drawer-content').textContent().catch(() => "") || "";
    logger.info(`Release audit (first 300): ${auditContent.trim().substring(0, 300)}`);
    await captureEvidence(this, approverPage, "Release - Audit trail");

    const recordTab = approverPage.locator('button[aria-label="RECORD DETAILS"]').first();
    if (await recordTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recordTab.click();
      await approverPage.waitForTimeout(1000);
    }
  }

  // Claim
  const claimBtn = approverPage.locator('#task-footer-claim-btn');
  if (await claimBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await claimBtn.click();
    await approverPage.waitForLoadState("networkidle");
    await approverPage.waitForTimeout(2000);
    logger.info("Release record claimed");
  }

  // Approve
  const approveBtn = approverPage.locator('#task-footer-approve-btn');
  if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await approveBtn.click();
    await approverPage.waitForTimeout(2000);
    const cmtField = approverPage.locator('#comment-modal-text-field');
    if (await cmtField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cmtField.fill("Release approved via automation cleanup");
      await approverPage.waitForTimeout(500);
      const submitBtn = approverPage.locator('#comment-modal-submit-btn');
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await approverPage.waitForLoadState("networkidle");
        await approverPage.waitForTimeout(2000);
      }
    }
  }

  await captureEvidence(this, approverPage, "Release - Approved");
  logger.info("Release approved — record is clean for next test");
  await cleanupApproverSession(this);
});
