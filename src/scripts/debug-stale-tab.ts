/**
 * Debug script: Simulates the stale tab flow
 * - Login → List Management → Watchlist → Commercial list → WC Main Premium
 * - Find a clean record (get its ID)
 * - Close profile
 * - Search by Record ID
 * - Capture DOM of search results to debug kebab/Overview selectors
 */
import { chromium } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";
import * as fs from "fs";

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
  context.setDefaultTimeout(EnvConfig.TIMEOUT);
  const page = await context.newPage();

  // Login
  await AuthHelper.login(page, {
    orgId: EnvConfig.ORG_ID,
    email: EnvConfig.USERNAME,
    password: EnvConfig.PASSWORD,
  });
  console.log("Logged in");

  // Navigate to Commercial List
  await page.locator('.product-card:has-text("List")').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();
  await page.waitForTimeout(1000);

  await page.locator('text=Commercial list').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Search for WC Main Premium
  const searchBox = page.locator('input[placeholder*="Search"]').first();
  await searchBox.fill("WC Main Premium");
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Click WC Main Premium link
  const wcLink = page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first();
  await wcLink.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  console.log("Opened WC Main Premium");

  // Get first row's record ID
  const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const rowCount = await rows.count();
  console.log(`Found ${rowCount} rows`);

  const firstCell = rows.first().locator('td').first();
  const recordId = (await firstCell.textContent() || "").trim();
  console.log(`First record ID: "${recordId}"`);

  // Capture the current URL
  const listUrl = page.url();
  console.log(`List URL: ${listUrl}`);

  // Now simulate what the stale tab does:
  // 1. Search for the record by ID
  console.log("\n=== Simulating stale tab search ===");

  // Look for search bar
  const searchByIdInput = page.locator('input[placeholder*="Search by Record ID"]');
  const searchByIdVisible = await searchByIdInput.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`Search by Record ID input visible: ${searchByIdVisible}`);

  const genericSearch = page.locator('input[placeholder*="Search"]');
  const genericCount = await genericSearch.count();
  console.log(`Generic search inputs found: ${genericCount}`);

  for (let i = 0; i < genericCount; i++) {
    const placeholder = await genericSearch.nth(i).getAttribute("placeholder");
    const isVis = await genericSearch.nth(i).isVisible().catch(() => false);
    console.log(`  Search input ${i}: placeholder="${placeholder}", visible=${isVis}`);
  }

  // Use the search bar
  const searchInput = searchByIdVisible
    ? searchByIdInput.first()
    : page.locator('input[placeholder*="Search"]').first();

  await searchInput.clear();
  await searchInput.fill(recordId);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  console.log(`Searched for record: ${recordId}`);

  // Check results
  const resultRows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const resultCount = await resultRows.count();
  console.log(`Search result rows: ${resultCount}`);

  if (resultCount > 0) {
    // Capture first row HTML
    const firstRowHtml = await resultRows.first().innerHTML();
    console.log(`\nFirst result row HTML (first 1000 chars):\n${firstRowHtml.substring(0, 1000)}`);

    // Check for kebab
    const kebab = resultRows.first().locator('.kebab-cell svg, td:last-child svg').first();
    const kebabVisible = await kebab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`\nKebab visible: ${kebabVisible}`);

    // Try all possible kebab selectors
    const kebabSelectors = [
      '.kebab-cell svg',
      'td:last-child svg',
      '.kebab-cell',
      'td:last-child button',
      '[class*="kebab"]',
      'svg[data-testid*="More"]',
      'button[aria-label*="more"]',
      '[class*="action"] svg',
    ];

    for (const sel of kebabSelectors) {
      const el = resultRows.first().locator(sel).first();
      const vis = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (vis) console.log(`  Kebab match: "${sel}" -> VISIBLE`);
    }

    // Try clicking the kebab
    if (kebabVisible) {
      await kebab.click();
      await page.waitForTimeout(1500);

      // Check for Overview option
      const menuItems = page.locator('[role="menuitem"], .MuiMenuItem-root, li[role="menuitem"]');
      const menuCount = await menuItems.count();
      console.log(`\nMenu items after kebab click: ${menuCount}`);
      for (let i = 0; i < menuCount; i++) {
        const text = await menuItems.nth(i).textContent();
        console.log(`  Menu item ${i}: "${text?.trim()}"`);
      }
    } else {
      console.log("\nKebab not visible — trying to click last cell directly");
      const lastCell = resultRows.first().locator('td').last();
      const lastCellHtml = await lastCell.innerHTML();
      console.log(`Last cell HTML: ${lastCellHtml.substring(0, 500)}`);

      // Try clicking the last cell's first clickable element
      const clickable = lastCell.locator('svg, button, [role="button"]').first();
      const clickableVis = await clickable.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`Last cell clickable element visible: ${clickableVis}`);

      if (clickableVis) {
        await clickable.click();
        await page.waitForTimeout(1500);
        const menuItems = page.locator('[role="menuitem"], .MuiMenuItem-root');
        const menuCount = await menuItems.count();
        console.log(`Menu items: ${menuCount}`);
        for (let i = 0; i < menuCount; i++) {
          const text = await menuItems.nth(i).textContent();
          console.log(`  Menu item ${i}: "${text?.trim()}"`);
        }
      }
    }

    // Also try: can we just click the record ID text/link directly?
    const recordLink = resultRows.first().locator(`text=${recordId}`).first();
    const linkVisible = await recordLink.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`\nRecord ID as clickable text visible: ${linkVisible}`);

    // Check if there's a direct link in the first cell
    const firstCellLink = resultRows.first().locator('td').first().locator('a');
    const linkCount = await firstCellLink.count();
    console.log(`Links in first cell: ${linkCount}`);
  }

  // Take screenshot
  await page.screenshot({ path: "reports/debug-stale-tab-search.png", fullPage: false });
  console.log("\nScreenshot saved: reports/debug-stale-tab-search.png");

  await page.waitForTimeout(5000);
  await browser.close();
})();
