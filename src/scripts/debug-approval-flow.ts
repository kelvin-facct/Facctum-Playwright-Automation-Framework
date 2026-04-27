/**
 * Debug: Approval flow - Login as approver → List Management → Tasks → Commercial Records → kebab → claim → approve
 */
import { chromium } from "playwright";
import { EnvConfig } from "../config/env";

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--force-device-scale-factor=0.67'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Login as APPROVER
  await page.goto(EnvConfig.BASE_URL);
  await page.getByRole("button", { name: "LOG IN" }).click();
  await page.getByRole("textbox", { name: "Organisation ID" }).fill(EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID);
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(EnvConfig.APPROVER_USERNAME);
  await page.getByRole("textbox", { name: "Password" }).fill(EnvConfig.APPROVER_PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator("#facctumThemeProvider").waitFor({ timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log(`Logged in as: ${EnvConfig.APPROVER_USERNAME}`);

  // Step 1: Click List Management product card (needed to get into the module with Tasks nav)
  console.log("\n=== 1. CLICK LIST MANAGEMENT ===");
  await page.locator('.product-card:has-text("List")').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  console.log(`  URL: ${page.url()}`);

  // Step 2: Click Tasks in left nav using the XPath
  console.log("\n=== 2. CLICK TASKS NAV ===");
  const tasksXpath = 'xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span';
  const tasksNav = page.locator(tasksXpath);
  const tasksVisible = await tasksNav.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`  Tasks nav visible (xpath): ${tasksVisible}`);

  if (tasksVisible) {
    const text = await tasksNav.textContent();
    console.log(`  Tasks nav text: "${text?.trim()}"`);
    await tasksNav.click();
  } else {
    // Fallback: try other selectors
    const fallbacks = ['span.MuiListItemText-primary:has-text("Tasks")', '[aria-label="Tasks"]', 'nav span:has-text("Tasks")'];
    for (const sel of fallbacks) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`  Found Tasks with: ${sel}`);
        await el.click();
        break;
      }
    }
  }
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  console.log(`  URL: ${page.url()}`);

  // Step 3: Dump tabs and click Commercial Records
  console.log("\n=== 3. TABS ON TASKS PAGE ===");
  const allTabs = await page.locator('button[role="tab"]').allTextContents();
  console.log(`  Tabs: ${JSON.stringify(allTabs.filter(t => t.trim()).slice(0, 15))}`);

  // Click Pending L1 if visible
  const pendingL1 = page.locator('button[role="tab"][aria-label*="Pending L1"]');
  if (await pendingL1.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pendingL1.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    console.log("  Clicked Pending L1");
  }

  // Click Commercial Records
  const commercialTab = page.locator('button[role="tab"][aria-label*="COMMERCIAL"]');
  if (await commercialTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await commercialTab.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    console.log("  Clicked COMMERCIAL RECORDS");
  }

  // Step 4: Dump table
  console.log("\n=== 4. TABLE ===");
  const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
  const rowCount = await rows.count();
  console.log(`  Rows: ${rowCount}`);
  for (let i = 0; i < Math.min(rowCount, 3); i++) {
    const cells = rows.nth(i).locator('td');
    const texts: string[] = [];
    const cc = await cells.count();
    for (let c = 0; c < Math.min(cc, 8); c++) {
      texts.push((await cells.nth(c).textContent() || "").trim().substring(0, 25));
    }
    console.log(`  Row ${i}: ${JSON.stringify(texts)}`);
  }

  // Step 5: Kebab menu on first row
  console.log("\n=== 5. KEBAB MENU ===");
  if (rowCount > 0) {
    const firstRow = rows.first();
    const kebab = firstRow.locator('.kebab-cell svg, td:last-child svg').first();
    const kebabVis = await kebab.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Kebab visible: ${kebabVis}`);

    if (kebabVis) {
      await kebab.click();
      await page.waitForTimeout(1500);

      // Dump ALL visible elements that appeared (the menu might not use role="menuitem")
      const menuItems = await page.locator('[role="menuitem"], .MuiMenuItem-root, .MuiPopover-paper li, .MuiMenu-list li, .MuiList-root li').allTextContents();
      console.log(`  Menu items (standard): ${JSON.stringify(menuItems.filter(t => t.trim()))}`);

      // Also check for any popover content
      const popoverContent = await page.locator('.MuiPopover-paper, .MuiMenu-paper, [role="presentation"] .MuiPaper-root').first().innerHTML().catch(() => "no popover");
      console.log(`  Popover HTML (300 chars): ${popoverContent.substring(0, 300)}`);

      // Try clicking text that says "Overview" or "Record" in any visible element
      const overviewEl = page.locator('text=Overview, text=Record view, text=View').first();
      const overviewVis = await overviewEl.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`  Overview/Record view visible: ${overviewVis}`);

      if (overviewVis) {
        const menuText = await overviewEl.textContent();
        console.log(`  Clicking: "${menuText?.trim()}"`);
        await overviewEl.click();
      } else {
        // Click the first clickable thing in the popover
        const firstClickable = page.locator('.MuiPopover-paper *, .facct-popover-content *').filter({ hasText: /.+/ }).first();
        if (await firstClickable.isVisible({ timeout: 2000 }).catch(() => false)) {
          const txt = await firstClickable.textContent();
          console.log(`  Clicking first popover item: "${txt?.trim()}"`);
          await firstClickable.click();
        }
      }
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Step 6: Profile/Record view - dump buttons
      console.log("\n=== 6. RECORD VIEW - BUTTONS ===");
      const buttons = await page.locator('button:visible').evaluateAll(btns =>
        btns.map(b => ({
          text: b.textContent?.trim().substring(0, 50),
          id: b.id,
          aria: b.getAttribute('aria-label'),
          disabled: (b as HTMLButtonElement).disabled
        })).filter(b => b.id?.includes('footer') || b.id?.includes('claim') || b.id?.includes('approve') || b.id?.includes('reject') ||
          b.text?.match(/CLAIM|APPROVE|REJECT|CLOSE|SUBMIT|UNCLAIM/i))
      );
      console.log("  Action buttons:");
      buttons.forEach((b, i) => console.log(`    [${i}] text="${b.text}" id="${b.id}" aria="${b.aria}" disabled=${b.disabled}`));

      // Also dump ALL footer buttons
      const allFooterBtns = await page.locator('.facct-drawer-footer-wrapper button, button[id*="footer"]').evaluateAll(btns =>
        btns.map(b => ({ text: b.textContent?.trim().substring(0, 50), id: b.id, disabled: (b as HTMLButtonElement).disabled }))
      );
      console.log(`\n  Footer buttons: ${JSON.stringify(allFooterBtns)}`);

      // Step 7: Try CLAIM
      console.log("\n=== 7. CLAIM ===");
      const claimBtn = page.locator('button:has-text("CLAIM"), button[id*="claim"]').first();
      const claimVis = await claimBtn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`  CLAIM visible: ${claimVis}`);

      if (claimVis) {
        const claimText = await claimBtn.textContent();
        const claimId = await claimBtn.getAttribute('id');
        console.log(`  CLAIM button: text="${claimText?.trim()}" id="${claimId}"`);
        await claimBtn.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(3000);

        // Check alert
        const alert = await page.locator('[role="alert"]').textContent().catch(() => "no alert");
        console.log(`  Alert: ${alert?.substring(0, 100)}`);

        // Dump buttons after claim
        const afterClaimBtns = await page.locator('button:visible').evaluateAll(btns =>
          btns.map(b => ({
            text: b.textContent?.trim().substring(0, 50),
            id: b.id,
            disabled: (b as HTMLButtonElement).disabled
          })).filter(b => b.id?.includes('footer') || b.text?.match(/CLAIM|APPROVE|REJECT|CLOSE|SUBMIT|UNCLAIM/i))
        );
        console.log("  Buttons after CLAIM:");
        afterClaimBtns.forEach((b, i) => console.log(`    [${i}] text="${b.text}" id="${b.id}" disabled=${b.disabled}`));

        // Step 8: Try APPROVE
        console.log("\n=== 8. APPROVE ===");
        const approveBtn = page.locator('button:has-text("APPROVE"), button[id*="approve"]').first();
        const approveVis = await approveBtn.isVisible({ timeout: 3000 }).catch(() => false);
        console.log(`  APPROVE visible: ${approveVis}`);

        if (approveVis) {
          await approveBtn.click();
          await page.waitForTimeout(3000);

          // Check for comment dialog
          const dialogBtns = await page.locator('[role="dialog"] button, .comment-modal-wrapper button, .MuiDialog-root button').allTextContents();
          console.log(`  Dialog buttons: ${JSON.stringify(dialogBtns.map(t => t.trim()).filter(Boolean))}`);

          const dialogInputs = await page.locator('[role="dialog"] input, [role="dialog"] textarea, .comment-modal-wrapper input, .comment-modal-wrapper textarea').evaluateAll(els =>
            els.map(e => ({ tag: e.tagName, id: e.id, placeholder: (e as HTMLInputElement).placeholder }))
          );
          console.log(`  Dialog inputs: ${JSON.stringify(dialogInputs)}`);

          // Take screenshot
          await page.screenshot({ path: 'reports/debug-approve-dialog.png' });
          console.log("  Screenshot: reports/debug-approve-dialog.png");
        }
      }
    }
  }

  console.log("\n=== DONE ===");
  await page.waitForTimeout(30000);
  await browser.close();
})();
