/**
 * Debug script: Replicates the exact stale tab flow from parallelSuppressEnrich.steps.ts
 * 
 * Flow:
 * 1. Login as maker
 * 2. Navigate to WC Main Premium, find clean record (get ID), keep profile open
 * 3. Open NEW TAB → /facctlist → Watchlist → Commercial list → WC Main Premium
 * 4. Search by Record ID → kebab → Overview
 * 5. Verify SUPPRESS button visible
 * 
 * Captures screenshots at each step for debugging.
 */
import { chromium, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

async function screenshot(page: Page, name: string) {
  const path = `reports/debug-stale-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${path}`);
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--force-device-scale-factor=0.67',
      '--high-dpi-support=1',
    ]
  });

  const { width, height } = EnvConfig.RESOLUTION;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  context.setDefaultTimeout(30000);

  // ===== TAB 1: Maker login + find clean record =====
  const tab1 = await context.newPage();
  await AuthHelper.login(tab1, {
    orgId: EnvConfig.ORG_ID,
    email: EnvConfig.USERNAME,
    password: EnvConfig.PASSWORD,
  });
  console.log("✅ Tab 1: Logged in");

  // Navigate to Commercial List
  await tab1.locator('.product-card:has-text("List")').first().click();
  await tab1.waitForLoadState("networkidle");
  await tab1.waitForTimeout(2000);

  await tab1.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();
  await tab1.waitForTimeout(1000);
  await tab1.locator('text=Commercial list').click();
  await tab1.waitForLoadState("networkidle");
  await tab1.waitForTimeout(2000);

  // Search WC Main Premium
  await tab1.locator('input[placeholder*="Search"]').first().fill("WC Main Premium");
  await tab1.keyboard.press("Enter");
  await tab1.waitForLoadState("networkidle");
  await tab1.waitForTimeout(2000);
  await tab1.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().click();
  await tab1.waitForLoadState("networkidle");
  await tab1.waitForTimeout(3000);
  console.log("✅ Tab 1: Opened WC Main Premium");

  // Get first record ID
  const rows = tab1.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const firstCell = rows.first().locator('td').first();
  const recordId = (await firstCell.textContent() || "").trim();
  console.log(`✅ Tab 1: First record ID = "${recordId}"`);

  // Open profile via kebab → Overview (simulating findCleanRecord)
  const kebab1 = rows.first().locator('.kebab-cell svg, td:last-child svg').first();
  await kebab1.click();
  await tab1.waitForTimeout(1000);
  await tab1.locator('[role="menuitem"]:has-text("Overview")').first().click();
  await tab1.waitForLoadState("networkidle");
  await tab1.waitForTimeout(2000);

  const suppressVisible = await tab1.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`✅ Tab 1: Profile open, SUPPRESS visible = ${suppressVisible}`);
  await screenshot(tab1, "01-tab1-profile-open");

  const tab1Url = tab1.url();
  console.log(`✅ Tab 1 URL: ${tab1Url}`);

  // ===== TAB 2 (STALE): Navigate via /facctlist =====
  console.log("\n===== STALE TAB =====");
  const staleTab = await context.newPage();

  // Step 1: Navigate to /facctlist
  const facctListUrl = `${EnvConfig.BASE_URL}/facctlist`;
  console.log(`Step 1: goto ${facctListUrl}`);
  await staleTab.goto(facctListUrl);
  await staleTab.waitForLoadState("load");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  await screenshot(staleTab, "02-stale-facctlist");
  console.log(`  URL: ${staleTab.url()}`);

  // Step 2: Click Watchlist
  console.log("Step 2: Click Watchlist");
  const watchlist = staleTab.locator('span.MuiListItemText-primary:has-text("Watchlist")');
  const watchlistVisible = await watchlist.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`  Watchlist visible: ${watchlistVisible}`);

  if (!watchlistVisible) {
    // Maybe we landed on the dashboard, need to click List Management first
    console.log("  Watchlist not visible — checking if we need List Management card");
    const listCard = staleTab.locator('.product-card:has-text("List")').first();
    if (await listCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log("  Clicking List Management card first");
      await listCard.click();
      await staleTab.waitForLoadState("networkidle");
      await staleTab.waitForTimeout(2000);
      await screenshot(staleTab, "02b-stale-after-list-card");
    }
  }

  await staleTab.locator('span.MuiListItemText-primary:has-text("Watchlist")').waitFor({ state: "visible", timeout: 10000 });
  await staleTab.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();
  await staleTab.waitForTimeout(1000);
  console.log("  ✅ Clicked Watchlist");

  // Step 3: Click Commercial list
  console.log("Step 3: Click Commercial list");
  await staleTab.locator('text=Commercial list').waitFor({ state: "visible", timeout: 10000 });
  await staleTab.locator('text=Commercial list').click();
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(2000);
  await screenshot(staleTab, "03-stale-commercial-list");
  console.log("  ✅ Clicked Commercial list");

  // Step 4: Search WC Main Premium
  console.log("Step 4: Search WC Main Premium");
  const staleListSearch = staleTab.locator('input[placeholder*="Search"]').first();
  await staleListSearch.waitFor({ state: "visible", timeout: 10000 });
  await staleListSearch.fill("WC Main Premium");
  await staleTab.keyboard.press("Enter");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(2000);

  const wcLink2 = staleTab.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first();
  await wcLink2.waitFor({ state: "visible", timeout: 10000 });
  await wcLink2.click();
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  await screenshot(staleTab, "04-stale-wc-main-premium");
  console.log("  ✅ Opened WC Main Premium");

  // Step 5: Search by Record ID
  console.log(`Step 5: Search by Record ID "${recordId}"`);

  // Check all search inputs
  const searchInputs = staleTab.locator('input[placeholder*="Search"]');
  const searchCount = await searchInputs.count();
  console.log(`  Search inputs found: ${searchCount}`);
  for (let i = 0; i < searchCount; i++) {
    const ph = await searchInputs.nth(i).getAttribute("placeholder");
    const vis = await searchInputs.nth(i).isVisible().catch(() => false);
    console.log(`    [${i}] placeholder="${ph}", visible=${vis}`);
  }

  const recordSearch = staleTab.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
  await recordSearch.waitFor({ state: "visible", timeout: 10000 });
  await recordSearch.click();
  await staleTab.waitForTimeout(500);
  await recordSearch.fill(recordId);
  await staleTab.keyboard.press("Enter");
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  await screenshot(staleTab, "05-stale-search-results");
  console.log("  ✅ Searched for record");

  // Step 6: Check results
  console.log("Step 6: Check search results");
  const staleRows = staleTab.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const staleRowCount = await staleRows.count();
  console.log(`  Rows found: ${staleRowCount}`);

  if (staleRowCount === 0) {
    console.log("  ❌ No rows found! Taking screenshot and exiting.");
    await screenshot(staleTab, "06-stale-no-rows");
    await browser.close();
    return;
  }

  // Step 7: Click kebab on first row
  console.log("Step 7: Click kebab");
  const firstRowHtml = await staleRows.first().innerHTML();
  console.log(`  First row HTML (200 chars): ${firstRowHtml.substring(0, 200)}`);

  const kebab2 = staleRows.first().locator('.kebab-cell svg, td:last-child svg').first();
  const kebabVis = await kebab2.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`  Kebab visible: ${kebabVis}`);

  if (!kebabVis) {
    console.log("  ❌ Kebab not visible! Trying alternative selectors...");
    const altSelectors = ['.kebab-cell', 'td:last-child button', 'svg[data-testid*="More"]', 'td:last-child'];
    for (const sel of altSelectors) {
      const el = staleRows.first().locator(sel).first();
      const v = await el.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`    ${sel}: visible=${v}`);
    }
    await screenshot(staleTab, "07-stale-kebab-not-visible");
    await browser.close();
    return;
  }

  await kebab2.click();
  await staleTab.waitForTimeout(1500);
  await screenshot(staleTab, "07-stale-kebab-clicked");

  // Step 8: Click Overview
  console.log("Step 8: Click Overview");
  const menuItems = staleTab.locator('[role="menuitem"]');
  const menuCount = await menuItems.count();
  console.log(`  Menu items: ${menuCount}`);
  for (let i = 0; i < menuCount; i++) {
    const txt = await menuItems.nth(i).textContent();
    console.log(`    [${i}] "${txt?.trim()}"`);
  }

  const overview = staleTab.locator('[role="menuitem"]:has-text("Overview")').first();
  const overviewVis = await overview.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`  Overview visible: ${overviewVis}`);

  if (!overviewVis) {
    console.log("  ❌ Overview not visible!");
    await screenshot(staleTab, "08-stale-no-overview");
    await browser.close();
    return;
  }

  await overview.click();
  await staleTab.waitForLoadState("networkidle");
  await staleTab.waitForTimeout(3000);
  await screenshot(staleTab, "08-stale-overview-clicked");

  // Step 9: Verify SUPPRESS button
  console.log("Step 9: Verify SUPPRESS button");
  const staleSuppressBtn = staleTab.locator('#lseg-footer-suppress-btn');
  const staleSuppressVis = await staleSuppressBtn.isVisible({ timeout: 8000 }).catch(() => false);
  console.log(`  SUPPRESS visible: ${staleSuppressVis}`);
  await screenshot(staleTab, "09-stale-final");

  if (staleSuppressVis) {
    console.log("\n🎉 SUCCESS: Stale tab flow completed — profile open with SUPPRESS button");
  } else {
    console.log("\n❌ FAIL: SUPPRESS button not visible on stale tab");
    // Check what IS visible
    const footerBtns = staleTab.locator('.facct-drawer-footer-wrapper button, [id*="footer"] button');
    const btnCount = await footerBtns.count();
    console.log(`  Footer buttons found: ${btnCount}`);
    for (let i = 0; i < btnCount; i++) {
      const txt = await footerBtns.nth(i).textContent();
      const id = await footerBtns.nth(i).getAttribute("id");
      console.log(`    [${i}] id="${id}", text="${txt?.trim()}"`);
    }
  }

  console.log("\nDone. Waiting 5s before closing...");
  await staleTab.waitForTimeout(5000);
  await browser.close();
})();
