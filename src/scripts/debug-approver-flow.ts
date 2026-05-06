/**
 * Debug: Approver claim + approve flow for records 24 and 25
 * Uses confirmed locators from previous debug
 */
import { chromium } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

const TARGET_RECORD = "24"; // Change to "25" to test the other

(async () => {
  const { width, height } = EnvConfig.RESOLUTION;
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled", "--force-device-scale-factor=0.67"],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(60000);
  const page = await ctx.newPage();

  try {
    // 1. Login as approver
    console.log("[1] Approver login");
    await AuthHelper.login(page, {
      orgId: EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID,
      email: EnvConfig.APPROVER_USERNAME,
      password: EnvConfig.APPROVER_PASSWORD,
    });
    console.log("  ✅ Logged in");

    // 2. Navigate: List Management → Tasks → Pending L1 → Commercial Records
    console.log("\n[2] Navigate to Tasks");
    await page.locator('.product-card:has-text("List")').first().click();
    await page.waitForLoadState("networkidle");

    await page.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').click();
    await page.waitForLoadState("networkidle");

    const pl1 = page.locator('button[aria-label*="Pending L1"]');
    if (await pl1.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pl1.click();
      await page.waitForLoadState("networkidle");
    }

    const cr = page.locator('button[aria-label*="COMMERCIAL RECORDS"]');
    if (await cr.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cr.click();
      await page.waitForLoadState("networkidle");
    }

    await page.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });
    console.log("  ✅ On Tasks > Pending L1 > Commercial Records");

    // 3. Go to last page
    console.log("\n[3] Navigate to last page");
    const pgBtns = page.locator('button[class*="pagination"]');
    const pgCount = await pgBtns.count();
    console.log(`  Pagination buttons: ${pgCount}`);

    if (pgCount >= 4) {
      const lastBtn = pgBtns.nth(3);
      const dis = (await lastBtn.getAttribute("tabindex")) === "-1";
      if (!dis) {
        await lastBtn.click();
        await page.waitForLoadState("networkidle");
        await page.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });
        console.log("  ✅ On last page");
      } else {
        console.log("  Already on last page");
      }
    }

    // 4. Find record by ID
    console.log(`\n[4] Find record ${TARGET_RECORD}`);
    const rows = page.locator("tbody tr.table-row, tbody.MuiTableBody-root tr");
    const rowCount = await rows.count();
    console.log(`  Rows: ${rowCount}`);

    let foundRow = -1;
    for (let i = 0; i < rowCount; i++) {
      const labelDiv = rows.nth(i).locator("td:first-child div label div, td:first-child label div").first();
      const lt = (await labelDiv.textContent().catch(() => "") || "").trim();
      const la = (await labelDiv.getAttribute("aria-label").catch(() => "") || "").trim();
      if (lt || la) console.log(`  Row ${i}: text="${lt}" aria="${la}"`);
      if (lt === TARGET_RECORD || la === TARGET_RECORD) {
        foundRow = i;
        break;
      }
    }

    if (foundRow === -1) {
      console.log(`  ❌ Record ${TARGET_RECORD} not found!`);
      await browser.close();
      return;
    }
    console.log(`  ✅ Found at row ${foundRow}`);

    // 5. Click Overview icon button to open profile
    console.log(`\n[5] Open profile via Overview button`);
    const row = rows.nth(foundRow);

    // The Overview button is one of the icon buttons in the last cells
    // Try different selectors for the Overview icon
    const overviewSelectors = [
      'button[aria-label="Overview"]',
      'button[title="Overview"]',
      '[data-testid*="overview"]',
      '[data-testid*="Overview"]',
    ];

    let clicked = false;
    for (const sel of overviewSelectors) {
      const btn = row.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`  Found Overview via: ${sel}`);
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Fallback: the Overview is typically the first icon button in the action column
      console.log("  Trying action icon buttons...");
      const actionBtns = row.locator('td:nth-last-child(1) button, td:nth-last-child(2) button');
      const abCount = await actionBtns.count();
      console.log(`  Action buttons found: ${abCount}`);
      for (let b = 0; b < abCount; b++) {
        const ariaLabel = await actionBtns.nth(b).getAttribute("aria-label").catch(() => "");
        const title = await actionBtns.nth(b).getAttribute("title").catch(() => "");
        console.log(`  Button ${b}: aria="${ariaLabel}" title="${title}"`);
        if (ariaLabel?.toLowerCase().includes("overview") || title?.toLowerCase().includes("overview")) {
          await actionBtns.nth(b).click();
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      // Last fallback: click the first icon button (usually Overview)
      console.log("  Clicking first action icon as fallback...");
      const firstIcon = row.locator('td button svg, td [role="button"] svg').first();
      if (await firstIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstIcon.click();
        clicked = true;
      }
    }

    await page.waitForLoadState("networkidle");

    // Wait for drawer
    const drawerVis = await page.locator(".facct-drawer-paper").first().isVisible({ timeout: 8000 }).catch(() => false);
    console.log(`  Drawer visible after label click: ${drawerVis}`);

    if (!drawerVis) {
      console.log("  Trying kebab instead...");
      await rows.nth(foundRow).locator(".kebab-cell svg, td:last-child svg").first().click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const drawerVis2 = await page.locator(".facct-drawer-paper").first().isVisible({ timeout: 8000 }).catch(() => false);
      console.log(`  Drawer after kebab: ${drawerVis2}`);
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: `reports/debug-approver-profile-${TARGET_RECORD}.png` });

    // Capture footer buttons
    console.log("\n  --- Footer Buttons ---");
    const footerBtns = page.locator("button[id*='footer']");
    const fbCount = await footerBtns.count();
    for (let b = 0; b < fbCount; b++) {
      const id = await footerBtns.nth(b).getAttribute("id");
      const text = await footerBtns.nth(b).textContent();
      const vis = await footerBtns.nth(b).isVisible().catch(() => false);
      const dis = await footerBtns.nth(b).isDisabled().catch(() => false);
      console.log(`  [${id}] text="${text?.trim()}" visible=${vis} disabled=${dis}`);
    }

    // 6. Claim
    console.log(`\n[6] Claim`);
    const claimBtn = page.locator("#task-footer-claim-btn");
    const claimVis = await claimBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Claim button visible: ${claimVis}`);

    if (claimVis) {
      await claimBtn.click();
      // Wait for toaster
      try {
        const t = await page.waitForSelector('[role="alert"], .MuiSnackbar-root', { state: "visible", timeout: 8000 });
        console.log(`  Toaster: "${(await t.textContent() || "").trim().substring(0, 100)}"`);
      } catch { console.log("  No toaster"); }
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      console.log("  ✅ Claimed");

      // Check buttons after claim
      console.log("\n  --- Buttons after claim ---");
      const btns2 = page.locator("button[id*='footer']");
      for (let b = 0; b < await btns2.count(); b++) {
        const id = await btns2.nth(b).getAttribute("id");
        const text = await btns2.nth(b).textContent();
        const vis = await btns2.nth(b).isVisible().catch(() => false);
        console.log(`  [${id}] text="${text?.trim()}" visible=${vis}`);
      }
    }

    // 7. Approve
    console.log(`\n[7] Approve`);
    const approveBtn = page.locator("#task-footer-approve-btn");
    const approveVis = await approveBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Approve button visible: ${approveVis}`);

    if (approveVis) {
      await approveBtn.click();
      await page.waitForTimeout(2000);

      // Check for comment dialog
      const commentField = page.locator("#comment-modal-text-field");
      const commentVis = await commentField.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  Comment dialog visible: ${commentVis}`);

      if (commentVis) {
        await commentField.fill("Approved via debug script");
        console.log("  Filled comment");

        const submitBtn = page.locator("#comment-modal-submit-btn");
        const submitVis = await submitBtn.isVisible({ timeout: 5000 }).catch(() => false);
        const submitDis = await submitBtn.isDisabled().catch(() => true);
        console.log(`  Submit: visible=${submitVis} disabled=${submitDis}`);

        if (submitVis && !submitDis) {
          await submitBtn.click();
          // Wait for toaster
          try {
            const t = await page.waitForSelector('[role="alert"], .MuiSnackbar-root', { state: "visible", timeout: 8000 });
            console.log(`  Toaster: "${(await t.textContent() || "").trim().substring(0, 100)}"`);
          } catch { console.log("  No toaster"); }
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(2000);
          console.log("  ✅ Approved!");
        }
      }
    }

    await page.screenshot({ path: `reports/debug-approver-done-${TARGET_RECORD}.png` });
    console.log("\n✅ Approver flow complete");
    await page.waitForTimeout(3000);

  } catch (err) {
    console.log(`\n❌ ERROR: ${err}`);
    await page.screenshot({ path: "reports/debug-approver-error.png" }).catch(() => {});
  }

  await browser.close();
})();
