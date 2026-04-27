/**
 * Debug: Capture the exact HTML of the approve popup after clicking APPROVE footer button
 */
import { chromium } from "playwright";
import { EnvConfig } from "../config/env";

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--incognito', '--force-device-scale-factor=0.67'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Login as approver
  await page.goto(EnvConfig.BASE_URL);
  await page.getByRole("button", { name: "LOG IN" }).click();
  await page.getByRole("textbox", { name: "Organisation ID" }).fill(EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID);
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(EnvConfig.APPROVER_USERNAME);
  await page.getByRole("textbox", { name: "Password" }).fill(EnvConfig.APPROVER_PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator("#facctumThemeProvider").waitFor({ timeout: 30000 });
  await page.waitForLoadState("networkidle");

  // Navigate: List Management → Tasks → Pending L1 → Commercial Records
  await page.locator('.product-card:has-text("List")').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.locator('button[role="tab"][aria-label*="Pending L1"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.locator('button[role="tab"][aria-label*="COMMERCIAL"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Click kebab on first row to open record view
  const firstRow = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr').first();
  await firstRow.locator('.kebab-cell svg, td:last-child svg').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  console.log("Record view opened");

  // Click CLAIM (or skip if already claimed)
  const claimBtn = page.locator('#task-footer-claim-btn');
  const approveBtn = page.locator('#task-footer-approve-btn');
  
  if (await claimBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await claimBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    console.log("Claimed");
  } else if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("Already claimed - APPROVE visible");
  } else {
    // Dump footer buttons to see what's available
    const footerBtns = await page.locator('.facct-drawer-footer-wrapper button, button[id*="footer"]').evaluateAll(btns =>
      btns.map(b => ({ text: b.textContent?.trim(), id: b.id }))
    );
    console.log(`Footer buttons: ${JSON.stringify(footerBtns)}`);
  }

  // Click APPROVE footer button
  await page.locator('#task-footer-approve-btn').click();
  await page.waitForTimeout(5000);
  console.log("APPROVE clicked - waiting for popup...");

  // Take screenshot
  await page.screenshot({ path: 'reports/debug-approve-popup.png' });

  // Check if a new overlay/popup appeared anywhere in the DOM
  const newElements = await page.evaluate(() => {
    const body = document.body;
    const divs = body.querySelectorAll(':scope > div');
    return Array.from(divs).map((d, i) => ({
      index: i,
      class: d.className.substring(0, 80),
      childCount: d.children.length,
      visible: (d as HTMLElement).offsetParent !== null || d.getBoundingClientRect().height > 0,
      text: d.textContent?.substring(0, 100)
    }));
  });
  console.log(`\nBody > div elements:`);
  newElements.forEach(d => console.log(`  [${d.index}] class="${d.class}" children=${d.childCount} visible=${d.visible} text="${d.text?.substring(0, 60)}"`));

  // Dump ALL visible textareas
  const textareas = await page.locator('textarea:visible').evaluateAll(els =>
    els.map(e => ({ id: e.id, name: (e as HTMLTextAreaElement).name, placeholder: (e as HTMLTextAreaElement).placeholder, class: e.className.substring(0, 80) }))
  );
  console.log(`\nVisible textareas: ${JSON.stringify(textareas)}`);

  // Dump ALL visible buttons
  const buttons = await page.locator('button:visible').evaluateAll(btns =>
    btns.map(b => ({ text: b.textContent?.trim().substring(0, 40), id: b.id, class: b.className.substring(0, 60) }))
      .filter(b => b.text?.match(/APPROVE|CANCEL|SUBMIT|REJECT|OK|CONFIRM/i) || b.id?.includes('modal') || b.id?.includes('comment'))
  );
  console.log(`\nPopup buttons: ${JSON.stringify(buttons)}`);

  // Dump the popup/modal HTML
  const modalHtml = await page.evaluate(() => {
    // Find all MuiDialog or modal overlays
    const modals = document.querySelectorAll('.MuiDialog-root, .MuiModal-root, [role="dialog"], .comment-modal-wrapper');
    const results: string[] = [];
    modals.forEach((m, i) => {
      if ((m as HTMLElement).offsetParent !== null || m.querySelector('textarea')) {
        results.push(`Modal ${i}: ${m.innerHTML.substring(0, 2000)}`);
      }
    });
    return results;
  });
  console.log(`\nModal HTML:`);
  modalHtml.forEach(h => console.log(h));

  console.log("\nDone. 30s to inspect...");
  await page.waitForTimeout(30000);
  await browser.close();
})();
