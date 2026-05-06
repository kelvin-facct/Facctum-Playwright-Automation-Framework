/**
 * Debug v3: Check what buttons are visible on record profiles
 * to understand why SUPPRESS is missing
 */
import { chromium } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

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
  console.log("Opened WC Main Premium");

  // Check first 5 records
  const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const rowCount = await rows.count();
  console.log(`Total rows: ${rowCount}\n`);

  for (let i = 0; i < Math.min(5, rowCount); i++) {
    const row = rows.nth(i);
    const cellText = await row.locator('td').first().textContent() || "";
    const recordId = cellText.trim();
    console.log(`--- Record ${i}: ID="${recordId}" ---`);

    // Open via kebab → Overview
    const kebab = row.locator('.kebab-cell svg, td:last-child svg').first();
    await kebab.click();
    await page.waitForTimeout(1000);
    const overview = page.locator('[role="menuitem"]:has-text("Overview")').first();
    if (await overview.isVisible({ timeout: 3000 }).catch(() => false)) {
      await overview.click();
    }
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check ALL buttons in the footer
    const allButtons = page.locator('button[id*="footer"], button[id*="lseg-footer"]');
    const btnCount = await allButtons.count();
    console.log(`  Footer buttons: ${btnCount}`);
    for (let b = 0; b < btnCount; b++) {
      const id = await allButtons.nth(b).getAttribute("id");
      const text = await allButtons.nth(b).textContent();
      const disabled = await allButtons.nth(b).isDisabled().catch(() => false);
      console.log(`    [${b}] id="${id}" text="${text?.trim()}" disabled=${disabled}`);
    }

    // Check for warnings/status text
    const warningSelectors = [
      'text=pending approval',
      'text=pending review',
      'text=Attribute suppressed',
      'text=Record suppressed',
      'text=RELEASE',
    ];
    for (const sel of warningSelectors) {
      const vis = await page.locator(sel).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (vis) {
        const txt = await page.locator(sel).first().textContent().catch(() => "");
        console.log(`  ⚠️ Warning: "${txt?.trim().substring(0, 80)}"`);
      }
    }

    // Check for SUPPRESS specifically
    const suppressBtn = page.locator('#lseg-footer-suppress-btn');
    const suppressVis = await suppressBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  SUPPRESS visible: ${suppressVis}`);

    // Check for EDIT
    const editBtn = page.locator('#lseg-footer-edit-btn');
    const editVis = await editBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  EDIT visible: ${editVis}`);

    // Check for RELEASE
    const releaseBtn = page.locator('button:has-text("RELEASE")');
    const releaseVis = await releaseBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`  RELEASE visible: ${releaseVis}`);

    // Close profile
    const closeBtn = page.locator('#lseg-footer-close-btn');
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1500);
    } else {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1000);
    }

    console.log("");
  }

  await page.screenshot({ path: "reports/debug-stale-v3-done.png" });
  console.log("Done");
  await page.waitForTimeout(3000);
  await browser.close();
})();
