/**
 * Debug: Analyze profile view for specific records to find correct locators
 * for clean vs non-clean record detection.
 * 
 * Checks records: 1, 7, 12, 20, 21, 34
 * For each: opens profile, captures ALL aria-labels, badges, warnings, buttons
 */
import { chromium, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

const TARGET_RECORDS = ["1", "3", "7", "10", "12", "20", "21", "34"];

async function analyzeRecord(page: Page, recordId: string): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RECORD ID: ${recordId}`);
  console.log("=".repeat(60));

  // Search for the record
  const searchInput = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.clear();
  await searchInput.fill(recordId);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const rowCount = await rows.count();
  if (rowCount === 0) {
    console.log(`  ❌ No results for record ${recordId}`);
    return;
  }

  // Open via kebab → Overview
  const kebab = rows.first().locator('.kebab-cell svg, td:last-child svg').first();
  await kebab.waitFor({ state: "visible", timeout: 5000 });
  await kebab.click();
  await page.waitForTimeout(1000);
  const overview = page.locator('[role="menuitem"]:has-text("Overview")').first();
  await overview.waitFor({ state: "visible", timeout: 5000 });
  await overview.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(4000);

  // 1. Check ALL elements with aria-label in the drawer
  console.log("\n--- ARIA LABELS ---");
  const ariaElements = page.locator('.facct-drawer-paper [aria-label], [class*="drawer"] [aria-label]');
  const ariaCount = await ariaElements.count();
  for (let i = 0; i < ariaCount; i++) {
    const el = ariaElements.nth(i);
    const label = await el.getAttribute("aria-label").catch(() => "");
    const tag = await el.evaluate(e => e.tagName).catch(() => "");
    const cls = await el.evaluate(e => e.className?.toString().substring(0, 80)).catch(() => "");
    if (label) {
      console.log(`  [${tag}] aria-label="${label}" class="${cls}"`);
    }
  }

  // 2. Check for badge/chip elements (status indicators)
  console.log("\n--- BADGES/CHIPS ---");
  const badges = page.locator('.MuiChip-root, [class*="badge"], [class*="chip"], [class*="status-tag"], [class*="label"]');
  const badgeCount = await badges.count();
  for (let i = 0; i < Math.min(badgeCount, 20); i++) {
    const text = await badges.nth(i).textContent().catch(() => "");
    const ariaLabel = await badges.nth(i).getAttribute("aria-label").catch(() => "");
    if (text?.trim() || ariaLabel) {
      console.log(`  Badge: text="${text?.trim().substring(0, 60)}" aria-label="${ariaLabel || ""}"`);
    }
  }

  // 3. Check for warning elements
  console.log("\n--- WARNINGS ---");
  const warnings = page.locator('span.warning-message, span.warning-text, [class*="warning"], [role="alert"], .MuiAlert-root');
  const warnCount = await warnings.count();
  for (let i = 0; i < warnCount; i++) {
    const text = await warnings.nth(i).textContent().catch(() => "");
    const cls = await warnings.nth(i).evaluate(e => e.className?.toString().substring(0, 80)).catch(() => "");
    if (text?.trim()) {
      console.log(`  Warning: text="${text?.trim().substring(0, 100)}" class="${cls}"`);
    }
  }

  // 4. Check header area for status text
  console.log("\n--- HEADER STATUS ---");
  const headerText = await page.locator('.facct-drawer-paper').first().evaluate(el => {
    // Get text from first 200px height area (header)
    const header = el.querySelector('[class*="header"], [class*="title-bar"], [class*="profile-header"]');
    return header?.textContent?.trim().substring(0, 200) || el.textContent?.substring(0, 300) || "";
  }).catch(() => "");
  console.log(`  Header: "${headerText.substring(0, 200)}"`);

  // 5. Check ALL footer buttons
  console.log("\n--- FOOTER BUTTONS ---");
  const footerBtns = page.locator('button[id*="footer"], button[id*="lseg-footer"]');
  const btnCount = await footerBtns.count();
  for (let i = 0; i < btnCount; i++) {
    const id = await footerBtns.nth(i).getAttribute("id");
    const text = await footerBtns.nth(i).textContent();
    const disabled = await footerBtns.nth(i).isDisabled().catch(() => false);
    const visible = await footerBtns.nth(i).isVisible().catch(() => false);
    console.log(`  Button: id="${id}" text="${text?.trim()}" visible=${visible} disabled=${disabled}`);
  }

  // 6. Specific checks
  const suppressBtn = page.locator('#lseg-footer-suppress-btn');
  const editBtn = page.locator('#lseg-footer-edit-btn');
  const closeBtn = page.locator('#lseg-footer-close-btn');
  console.log("\n--- KEY BUTTONS ---");
  console.log(`  SUPPRESS (#lseg-footer-suppress-btn): visible=${await suppressBtn.isVisible({ timeout: 2000 }).catch(() => false)}`);
  console.log(`  EDIT (#lseg-footer-edit-btn): visible=${await editBtn.isVisible({ timeout: 1000 }).catch(() => false)}`);
  console.log(`  CLOSE (#lseg-footer-close-btn): visible=${await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)}`);

  // 7. Check for "Active" vs other status in profile header
  const statusBadge = page.locator('.facct-drawer-paper .MuiChip-label, [class*="status"]').first();
  const statusText = await statusBadge.textContent().catch(() => "");
  console.log(`\n  STATUS: "${statusText?.trim()}"`);

  // 8. Determine: CLEAN or NOT CLEAN
  const isClean = await suppressBtn.isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`\n  >>> VERDICT: ${isClean ? "✅ CLEAN" : "❌ NOT CLEAN"}`);

  // Close profile
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(1500);
  } else {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);
  }

  // Clear search
  await searchInput.clear();
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--force-device-scale-factor=0.67',
    ]
  });

  const { width, height } = EnvConfig.RESOLUTION;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();

  await AuthHelper.login(page, {
    orgId: EnvConfig.ORG_ID,
    email: EnvConfig.USERNAME,
    password: EnvConfig.PASSWORD,
  });
  console.log("Logged in");

  // Navigate to WC Main Premium
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
  console.log("Opened WC Main Premium\n");

  // Analyze each target record
  for (const recordId of TARGET_RECORDS) {
    try {
      await analyzeRecord(page, recordId);
    } catch (e) {
      console.log(`  ❌ Error analyzing record ${recordId}: ${e}`);
    }
  }

  console.log("\n\nDone. Closing in 3s...");
  await page.waitForTimeout(3000);
  await browser.close();
})();
