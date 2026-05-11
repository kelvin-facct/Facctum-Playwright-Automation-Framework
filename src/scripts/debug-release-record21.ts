/**
 * Debug: Release record 21 — capture all locators
 * 
 * 1. Login → WC Main Premium → search record 21 → open profile
 * 2. Capture all buttons, status, release section
 * 3. Click RELEASE → capture popup locators
 * 4. Fill comment → SUBMIT
 */
import { chromium } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

const RECORD_ID = "21";

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67']
  });
  const { width, height } = EnvConfig.RESOLUTION;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(60000);
  const page = await ctx.newPage();

  try {
    // Login
    await AuthHelper.login(page, { orgId: EnvConfig.ORG_ID, email: EnvConfig.USERNAME, password: EnvConfig.PASSWORD });
    console.log("✅ Logged in");

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
    console.log("✅ On WC Main Premium");

    // Search for record 21
    const search = page.locator('input[placeholder*="Search by Record ID"]').first();
    await search.waitFor({ state: "visible", timeout: 10000 });
    await search.click();
    await search.fill(RECORD_ID);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Open via kebab → Overview
    const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    await rows.first().locator('.kebab-cell svg, td:last-child svg').first().click();
    await page.waitForTimeout(1000);
    await page.locator('[role="menuitem"]:has-text("Overview")').first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    console.log("✅ Opened record 21 profile");

    // === CAPTURE PROFILE STATE ===
    console.log("\n--- PROFILE STATUS ---");
    const statusChip = page.locator('div.lseg-multi-status-chip-label').first();
    const statusLabel = await statusChip.getAttribute("aria-label").catch(() => "?");
    console.log(`Status badge: "${statusLabel}"`);

    console.log("\n--- FOOTER BUTTONS ---");
    const allBtns = page.locator('button[id*="footer"], button[id*="lseg-footer"]');
    for (let i = 0; i < await allBtns.count(); i++) {
      const id = await allBtns.nth(i).getAttribute("id");
      const text = await allBtns.nth(i).textContent();
      const vis = await allBtns.nth(i).isVisible().catch(() => false);
      console.log(`  [${id}] text="${text?.trim()}" visible=${vis}`);
    }

    // Check for RELEASE button specifically
    console.log("\n--- RELEASE BUTTON SEARCH ---");
    const releaseSelectors = [
      'button:has-text("RELEASE")',
      'button[aria-label="RELEASE"]',
      '#lseg-footer-release-btn',
      'button:has-text("Release")',
      '[class*="release"]',
    ];
    for (const sel of releaseSelectors) {
      const el = page.locator(sel).first();
      const vis = await el.isVisible({ timeout: 2000 }).catch(() => false);
      if (vis) {
        const id = await el.getAttribute("id").catch(() => "");
        const text = await el.textContent().catch(() => "");
        const ariaLabel = await el.getAttribute("aria-label").catch(() => "");
        const tag = await el.evaluate(e => e.tagName).catch(() => "");
        console.log(`  ✅ "${sel}" → tag=${tag} id="${id}" text="${text?.trim()}" aria-label="${ariaLabel}"`);
      }
    }

    // Check for "Record suppress details" section
    console.log("\n--- SUPPRESS DETAILS SECTION ---");
    const suppressSection = page.locator('text=Record suppress details, text=suppress details').first();
    const hasSuppressSection = await suppressSection.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Suppress details section visible: ${hasSuppressSection}`);

    if (hasSuppressSection) {
      // Get the parent container and all its content
      const sectionContent = await page.evaluate(() => {
        const el = document.querySelector('[class*="suppress-detail"], [class*="record-suppress"]');
        return el?.outerHTML?.substring(0, 500) || "not found";
      });
      console.log(`  Section HTML: ${sectionContent}`);
    }

    await page.screenshot({ path: "reports/debug-release-21-profile.png" });

    // === CLICK RELEASE ===
    console.log("\n--- CLICKING RELEASE ---");
    const releaseBtn = page.locator('button:has-text("RELEASE"), button[aria-label="RELEASE"]').first();
    const releaseVis = await releaseBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`RELEASE button visible: ${releaseVis}`);

    if (!releaseVis) {
      console.log("❌ RELEASE button not visible — record may not be suppressed");
      await page.waitForTimeout(3000);
      await browser.close();
      return;
    }

    await releaseBtn.click();
    await page.waitForTimeout(2000);
    console.log("Clicked RELEASE");
    await page.screenshot({ path: "reports/debug-release-21-popup.png" });

    // === CAPTURE POPUP LOCATORS ===
    console.log("\n--- RELEASE POPUP ---");
    const dialogs = page.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root');
    const dialogCount = await dialogs.count();
    console.log(`Dialogs found: ${dialogCount}`);

    // Check all visible elements in the popup
    const popupTexts = page.locator('[role="dialog"] *, .MuiDialog-root *');
    const textareas = page.locator('[role="dialog"] textarea, .MuiDialog-root textarea, textarea');
    const taCount = await textareas.count();
    console.log(`\nTextareas found: ${taCount}`);
    for (let i = 0; i < taCount; i++) {
      const id = await textareas.nth(i).getAttribute("id").catch(() => "");
      const placeholder = await textareas.nth(i).getAttribute("placeholder").catch(() => "");
      const name = await textareas.nth(i).getAttribute("name").catch(() => "");
      const vis = await textareas.nth(i).isVisible().catch(() => false);
      console.log(`  textarea[${i}]: id="${id}" placeholder="${placeholder}" name="${name}" visible=${vis}`);
    }

    // Check all buttons in popup
    const popupBtns = page.locator('[role="dialog"] button, .MuiDialog-root button');
    const pbCount = await popupBtns.count();
    console.log(`\nPopup buttons: ${pbCount}`);
    for (let i = 0; i < pbCount; i++) {
      const id = await popupBtns.nth(i).getAttribute("id").catch(() => "");
      const text = await popupBtns.nth(i).textContent().catch(() => "");
      const ariaLabel = await popupBtns.nth(i).getAttribute("aria-label").catch(() => "");
      const vis = await popupBtns.nth(i).isVisible().catch(() => false);
      console.log(`  btn[${i}]: id="${id}" text="${text?.trim()}" aria-label="${ariaLabel}" visible=${vis}`);
    }

    // Check for file upload
    const fileInputs = page.locator('[role="dialog"] input[type="file"], .MuiDialog-root input[type="file"], input[type="file"]');
    console.log(`\nFile inputs: ${await fileInputs.count()}`);

    // Check for specific IDs
    console.log("\n--- SPECIFIC SELECTORS ---");
    const specificIds = ['#hold-enrich-comment--1', '#comment-modal-text-field', '#hold-enrich-modal-submit-btn', '#hold-enrich-modal-cancel-btn'];
    for (const sel of specificIds) {
      const vis = await page.locator(sel).isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`  ${sel}: visible=${vis}`);
    }

    // Try to fill comment and submit
    console.log("\n--- FILLING RELEASE FORM ---");
    // Try different comment field selectors
    const commentSelectors = [
      '[role="dialog"] textarea',
      '.MuiDialog-root textarea',
      'textarea[placeholder*="Comment"]',
      '#hold-enrich-comment--1',
      '#comment-modal-text-field',
      'textarea',
    ];
    let commentFilled = false;
    for (const sel of commentSelectors) {
      const field = page.locator(sel).first();
      if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
        await field.fill("Release via debug script");
        console.log(`  ✅ Filled comment via: ${sel}`);
        commentFilled = true;
        break;
      }
    }
    if (!commentFilled) console.log("  ❌ Could not find comment field!");

    await page.waitForTimeout(1000);
    await page.screenshot({ path: "reports/debug-release-21-filled.png" });

    // Click SUBMIT
    const submitSelectors = [
      '[role="dialog"] button:has-text("SUBMIT")',
      '.MuiDialog-root button:has-text("SUBMIT")',
      'button:has-text("SUBMIT")',
      '#hold-enrich-modal-submit-btn',
    ];
    let submitted = false;
    for (const sel of submitSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        const disabled = await btn.isDisabled().catch(() => true);
        console.log(`  Submit "${sel}": visible=true, disabled=${disabled}`);
        if (!disabled) {
          await btn.click();
          console.log(`  ✅ Clicked submit via: ${sel}`);
          submitted = true;
          break;
        }
      }
    }
    if (!submitted) console.log("  ❌ Could not click submit!");

    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(5000);

    // Check result
    const toaster = page.locator('xpath=/html/body/div[1]/div/div/div[2]');
    if (await toaster.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log(`\nToaster: "${(await toaster.textContent().catch(() => ""))?.trim().substring(0, 100)}"`);
    }

    await page.screenshot({ path: "reports/debug-release-21-result.png" });
    console.log("\n✅ Done!");
    await page.waitForTimeout(3000);

  } catch (err) {
    console.log(`\n❌ ERROR: ${err}`);
    await page.screenshot({ path: "reports/debug-release-21-error.png" }).catch(() => {});
  }

  await browser.close();
})();
