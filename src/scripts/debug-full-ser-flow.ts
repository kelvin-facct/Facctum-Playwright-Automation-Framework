/**
 * Debug: Full SER Approve flow — captures all locators, toasters, states
 * 
 * Flow:
 * 1. Login → Navigate to WC Main Premium
 * 2. Find clean record (SUPPRESS button visible)
 * 3. Close profile → capture list URL → re-open profile
 * 4. Create stale tab → goto list URL → search by ID → open Overview
 * 5. Tab 1: Fill suppress form → submit → capture toaster
 * 6. Capture all states
 */
import { chromium, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

let step = 0;
async function log(page: Page, msg: string, takeScreenshot = true) {
  step++;
  console.log(`\n[STEP ${step}] ${msg}`);
  if (takeScreenshot) {
    await page.screenshot({ path: `reports/debug-flow-${String(step).padStart(2, '0')}.png` }).catch(() => {});
  }
}

async function captureToasters(page: Page, label: string) {
  console.log(`  --- ${label}: Toasters/Alerts ---`);
  const toasterXpath = page.locator('xpath=/html/body/div[1]/div/div/div[2]');
  const toasterVis = await toasterXpath.isVisible({ timeout: 3000 }).catch(() => false);
  if (toasterVis) {
    const txt = await toasterXpath.textContent().catch(() => "");
    console.log(`  Toaster (xpath div[2]): "${txt?.trim().substring(0, 150)}"`);
  }
  const alerts = page.locator('[role="alert"], .MuiSnackbar-root, .MuiAlert-root');
  const alertCount = await alerts.count();
  for (let i = 0; i < alertCount; i++) {
    const txt = await alerts.nth(i).textContent().catch(() => "");
    const vis = await alerts.nth(i).isVisible().catch(() => false);
    if (vis && txt?.trim()) console.log(`  Alert[${i}]: "${txt.trim().substring(0, 150)}"`);
  }
  if (!toasterVis && alertCount === 0) console.log(`  (none)`);
}

async function captureFooterButtons(page: Page) {
  console.log(`  --- Footer Buttons ---`);
  const btns = page.locator('button[id*="footer"], button[id*="lseg-footer"]');
  const count = await btns.count();
  for (let i = 0; i < count; i++) {
    const id = await btns.nth(i).getAttribute("id");
    const text = await btns.nth(i).textContent();
    const vis = await btns.nth(i).isVisible().catch(() => false);
    console.log(`  [${id}] text="${text?.trim()}" visible=${vis}`);
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67']
  });
  const { width, height } = EnvConfig.RESOLUTION;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  context.setDefaultTimeout(60000);
  const page = await context.newPage();

  // === STEP 1: Login ===
  await AuthHelper.login(page, { orgId: EnvConfig.ORG_ID, email: EnvConfig.USERNAME, password: EnvConfig.PASSWORD });
  await log(page, "Logged in");

  // === STEP 2: Navigate to WC Main Premium ===
  await page.locator('.product-card:has-text("List")').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();
  await page.waitForTimeout(1000);
  await page.locator('text=Commercial list').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.locator('input[placeholder*="Search"]').first().fill("WC Main Premium");
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  await log(page, "Opened WC Main Premium");

  // === STEP 3: Find clean record ===
  const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const rowCount = await rows.count();
  let cleanRecordId: string | null = null;

  for (let i = 0; i < rowCount; i++) {
    const cellText = await rows.nth(i).locator('td').first().textContent() || "";
    const rid = cellText.trim();
    console.log(`  Checking record ${rid}...`);

    const kebab = rows.nth(i).locator('.kebab-cell svg, td:last-child svg').first();
    await kebab.click();
    await page.waitForTimeout(1000);
    await page.locator('[role="menuitem"]:has-text("Overview")').first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const suppressVis = await page.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Record ${rid}: SUPPRESS=${suppressVis}`);

    if (suppressVis) {
      cleanRecordId = rid;
      await log(page, `Found clean record: ${rid}`);
      break;
    }

    // Close and continue
    const closeBtn = page.locator('#lseg-footer-close-btn');
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1500);
      await page.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    }
  }

  if (!cleanRecordId) { console.log("No clean record found!"); await browser.close(); return; }

  // === STEP 4: Close profile, capture URL, re-open ===
  await page.locator('#lseg-footer-close-btn').click();
  await page.waitForTimeout(1500);
  await page.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  const listUrl = page.url();
  console.log(`  List URL: ${listUrl}`);
  await log(page, "Closed profile, captured list URL");

  // Re-open via kebab

  // Find and re-open the clean record
  const rows2 = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  for (let i = 0; i < await rows2.count(); i++) {
    const ct = await rows2.nth(i).locator('td').first().textContent() || "";
    if (ct.trim() === cleanRecordId) {
      await rows2.nth(i).locator('.kebab-cell svg, td:last-child svg').first().click();
      await page.waitForTimeout(1000);
      await page.locator('[role="menuitem"]:has-text("Overview")').first().click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
      break;
    }
  }
  await log(page, `Re-opened record ${cleanRecordId} on Tab 1`);
  await captureFooterButtons(page);

  // === STEP 5: Create stale tab ===
  const staleTab = await context.newPage();
  await staleTab.goto(listUrl);
  await staleTab.waitForLoadState("load");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  await log(staleTab, "Stale tab: navigated to list URL");

  // Search by Record ID
  const staleSearch = staleTab.locator('input[placeholder*="Search by Record ID"]').first();
  const searchVis = await staleSearch.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`  Search by Record ID visible: ${searchVis}`);

  if (!searchVis) {
    // Try fallback
    const fallback = staleTab.locator('input[placeholder*="Search"]').first();
    const fbVis = await fallback.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Fallback search visible: ${fbVis}`);
    if (fbVis) {
      await fallback.click();
      await staleTab.waitForTimeout(300);
      await fallback.fill(cleanRecordId!);
    }
  } else {
    await staleSearch.click();
    await staleTab.waitForTimeout(300);
    await staleSearch.fill(cleanRecordId!);
  }
  await staleTab.keyboard.press("Enter");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  await log(staleTab, `Stale tab: searched for ${cleanRecordId}`);

  const staleRows = staleTab.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const staleRowCount = await staleRows.count();
  console.log(`  Stale tab rows: ${staleRowCount}`);

  if (staleRowCount > 0) {
    await staleRows.first().locator('.kebab-cell svg, td:last-child svg').first().click();
    await staleTab.waitForTimeout(1500);
    await staleTab.locator('[role="menuitem"]:has-text("Overview")').first().click();
    await staleTab.waitForLoadState("networkidle");
    await staleTab.waitForTimeout(3000);
  }
  await log(staleTab, "Stale tab: opened record profile");
  await captureFooterButtons(staleTab);

  const staleSuppressVis = await staleTab.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`  Stale tab SUPPRESS visible: ${staleSuppressVis}`);

  // === STEP 6: Tab 1 — Fill suppress form ===
  await page.bringToFront();
  await page.waitForTimeout(1000);

  // Click SUPPRESS
  await page.locator('#lseg-footer-suppress-btn').click();
  await page.waitForTimeout(2000);
  await log(page, "Clicked SUPPRESS button");

  // Check what form fields appeared
  console.log(`  --- Suppress Form Fields ---`);
  const formFields = ['#mui-component-select-tags', '#mui-component-select-reasonCode', '#mui-component-select-reviewPeriod', '#hold-enrich-comment--1', '#hold-enrich-modal-submit-btn', '#hold-enrich-modal-cancel-btn'];
  for (const sel of formFields) {
    const vis = await page.locator(sel).isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  ${sel}: visible=${vis}`);
  }

  // Fill tags
  await page.locator('#mui-component-select-tags').click();
  await page.waitForTimeout(1000);
  const tagOptions = page.locator('[role="option"]');
  const tagCount = await tagOptions.count();
  console.log(`  Tag options: ${tagCount}`);
  if (tagCount > 0) {
    const firstTag = await tagOptions.first().textContent();
    console.log(`  Selecting first tag: "${firstTag?.trim()}"`);
    await tagOptions.first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // Fill reason (facct-dropdown-v2)
  await page.locator('#mui-component-select-reasonCode').click();
  await page.waitForTimeout(1500);
  const reasonOptions = page.locator('span.single-select-option');
  const reasonCount = await reasonOptions.count();
  console.log(`  Reason options: ${reasonCount}`);
  if (reasonCount > 0) {
    const firstReason = await reasonOptions.first().textContent();
    console.log(`  Selecting first reason: "${firstReason?.trim()}"`);
    await reasonOptions.first().click();
    await page.waitForTimeout(500);
  }

  // Fill review period (facct-dropdown-v2)
  await page.locator('#mui-component-select-reviewPeriod').click();
  await page.waitForTimeout(1500);
  const periodOptions = page.locator('span.single-select-option');
  const periodCount = await periodOptions.count();
  console.log(`  Period options: ${periodCount}`);
  if (periodCount > 0) {
    const firstPeriod = await periodOptions.first().textContent();
    console.log(`  Selecting first period: "${firstPeriod?.trim()}"`);
    await periodOptions.first().click();
    await page.waitForTimeout(500);
  }

  // Fill comment
  const commentField = page.locator('#hold-enrich-comment--1');
  if (await commentField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await commentField.fill("Debug test comment");
    console.log(`  Comment filled`);
  }

  // Upload attachment
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles("src/resources/testData/Test_Sheet.xlsx").catch(e => console.log(`  File upload error: ${e}`));
    await page.waitForTimeout(1000);
    console.log(`  File uploaded`);
  }

  await log(page, "Suppress form filled");

  // Check if submit is enabled
  const submitBtn = page.locator('#hold-enrich-modal-submit-btn');
  const submitVis = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);
  const submitDisabled = await submitBtn.isDisabled().catch(() => true);
  console.log(`  Submit button: visible=${submitVis}, disabled=${submitDisabled}`);

  // Check button state via DOM
  const btnState = await submitBtn.evaluate((btn: HTMLButtonElement) => ({
    disabled: btn.disabled,
    ariaDisabled: btn.getAttribute('aria-disabled'),
    className: btn.className.substring(0, 100),
    innerText: btn.innerText,
  }));
  console.log(`  Button DOM state: ${JSON.stringify(btnState)}`);

  // === STEP 7: Submit ===
  if (submitVis && !submitDisabled) {
    // Wait for button to be truly clickable
    await page.waitForFunction(() => {
      const btn = document.querySelector('#hold-enrich-modal-submit-btn') as HTMLButtonElement;
      return btn && !btn.disabled && !btn.classList.contains('Mui-disabled');
    }, { timeout: 10000 }).catch(e => console.log(`  waitForFunction: ${e}`));

    // Try native Playwright click first
    try {
      await submitBtn.click({ timeout: 5000 });
      console.log(`  Clicked submit via Playwright click`);
    } catch (e) {
      console.log(`  Playwright click failed: ${e}`);
      // Fallback: JS click
      await submitBtn.evaluate((btn: HTMLElement) => btn.click());
      console.log(`  Clicked submit via JS evaluate`);
    }

    await page.waitForTimeout(5000);
    await log(page, "After submit click");

    // Check for toaster with longer wait
    await captureToasters(page, "After suppress submit (5s wait)");

    // Check if the form closed (submit succeeded)
    const formStillOpen = await page.locator('#hold-enrich-modal-submit-btn').isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  Form still open after submit: ${formStillOpen}`);

    if (formStillOpen) {
      console.log("  ❌ SUBMIT FAILED — form still open. Checking validation errors...");
      // Check for any validation messages
      const validationErrors = await page.locator('.MuiFormHelperText-root, [class*="error"], [class*="validation"]').allTextContents().catch(() => []);
      console.log(`  Validation errors: ${JSON.stringify(validationErrors.filter(t => t.trim()))}`);
      
      // Check each field's state
      const tagsValue = await page.locator('#mui-component-select-tags').textContent().catch(() => "");
      const reasonValue = await page.locator('#mui-component-select-reasonCode').textContent().catch(() => "");
      const periodValue = await page.locator('#mui-component-select-reviewPeriod').textContent().catch(() => "");
      const commentValue = await page.locator('#hold-enrich-comment--1').inputValue().catch(() => "");
      console.log(`  Tags value: "${tagsValue?.trim()}"`);
      console.log(`  Reason value: "${reasonValue?.trim()}"`);
      console.log(`  Period value: "${periodValue?.trim()}"`);
      console.log(`  Comment value: "${commentValue?.trim()}"`);
      
      // Check file upload state
      const fileUploaded = await page.locator('[class*="file-name"], [class*="attachment"], [class*="upload"]').allTextContents().catch(() => []);
      console.log(`  File upload indicators: ${JSON.stringify(fileUploaded.filter(t => t.trim()))}`);
    }

    // Check if profile state changed
    const statusAfter = await page.locator('div.lseg-multi-status-chip-label').first().getAttribute("aria-label").catch(() => "unknown");
    console.log(`  Status after submit: "${statusAfter}"`);
  } else {
    console.log("  ❌ Submit button not clickable!");
    await log(page, "Submit button not available");
  }

  // === STEP 8: Check Tab 1 state after submit ===
  await captureFooterButtons(page);

  // === STEP 9: Check stale tab state ===
  await staleTab.bringToFront();
  await staleTab.waitForTimeout(1000);
  await log(staleTab, "Stale tab: checking state after Tab 1 submit");
  await captureFooterButtons(staleTab);

  console.log("\n\n========== SUMMARY ==========");
  console.log(`Clean record: ${cleanRecordId}`);
  console.log(`List URL: ${listUrl}`);
  console.log("=============================\n");

  console.log("Waiting 5s before closing...");
  await page.waitForTimeout(5000);
  await browser.close();
})();
