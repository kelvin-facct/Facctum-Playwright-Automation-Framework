/**
 * Debug v7: Use the XPath provided to extract reason and review period values
 * Reason XPath: /html/body/div[4]/div[3]/ul/div/div[2]/div/div/span[1]
 */
import { chromium } from "playwright";
import { EnvConfig } from "../config/env";

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--force-device-scale-factor=0.67'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  await page.goto(EnvConfig.BASE_URL);
  await page.getByRole("button", { name: "LOG IN" }).click();
  await page.getByRole("textbox", { name: "Organisation ID" }).fill(EnvConfig.ORG_ID);
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(EnvConfig.USERNAME);
  await page.getByRole("textbox", { name: "Password" }).fill(EnvConfig.PASSWORD);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator("#facctumThemeProvider").waitFor({ timeout: 30000 });
  await page.locator('.product-card:has-text("List")').first().click();
  await page.waitForLoadState("networkidle");
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
  const firstRow = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr').first();
  await firstRow.locator('.kebab-cell svg, td:last-child svg').first().click();
  await page.waitForTimeout(1000);
  await page.locator('[role="menuitem"]:has-text("Overview")').first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Click SUPPRESS
  await page.locator('#lseg-footer-suppress-btn').click();
  await page.waitForTimeout(2000);

  // Select tag
  await page.locator('#mui-component-select-tags').click();
  await page.waitForTimeout(1000);
  await page.locator('[role="option"]').first().click();
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // ==================== SUPPRESS RECORD - Reason ====================
  console.log("=== SUPPRESS RECORD - Reason ===");
  await page.locator('#mui-component-select-reasonCode').click();
  await page.waitForTimeout(2000);

  // Use the XPath: /html/body/div[4]/div[3]/ul/div/div[2]/div/div/span[1]
  // This means: body > div[4] > div[3] > ul > div > div[2] > div > div > span[1]
  // Get ALL reason options by getting all span[1] elements in that structure
  const reasonValues = await page.locator('xpath=/html/body/div[4]/div[3]/ul/div/div[2]/div/div/span[1]').allTextContents();
  console.log(`  Reason values: ${JSON.stringify(reasonValues)}`);

  // Also try getting all items in the list (div/div contains each option)
  const allReasonItems = await page.locator('xpath=/html/body/div[4]/div[3]/ul/div/div[2]/div/div').allTextContents();
  console.log(`  All reason items: ${JSON.stringify(allReasonItems.map(t => t.trim()).filter(Boolean).slice(0, 20))}`);

  // Dump the ul HTML to understand the structure
  const ulHtml = await page.locator('xpath=/html/body/div[4]/div[3]/ul').innerHTML().catch(() => "not found");
  console.log(`  UL HTML (1500 chars): ${ulHtml.substring(0, 1500)}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // ==================== SUPPRESS RECORD - Review Period ====================
  console.log("\n=== SUPPRESS RECORD - Review Period ===");
  await page.locator('#mui-component-select-reviewPeriod').click();
  await page.waitForTimeout(2000);

  // Same structure but might be div[5] or different index
  // Try multiple div indices
  for (let i = 3; i <= 6; i++) {
    const vals = await page.locator(`xpath=/html/body/div[${i}]/div[3]/ul/div/div[2]/div/div/span[1]`).allTextContents().catch(() => []);
    if (vals.length > 0) {
      console.log(`  Review Period (div[${i}]): ${JSON.stringify(vals)}`);
    }
  }

  // Also try the same div[4] path
  const reviewItems = await page.locator('xpath=/html/body/div[4]/div[3]/ul/div/div[2]/div/div').allTextContents().catch(() => []);
  console.log(`  Review items (div[4]): ${JSON.stringify(reviewItems.map(t => t.trim()).filter(Boolean).slice(0, 20))}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // Cancel suppress form
  await page.locator('#hold-enrich-modal-cancel-btn').click().catch(() => {});
  await page.waitForTimeout(2000);

  // ==================== SUPPRESS ATTRIBUTE - Alias hand icon ====================
  console.log("\n=== SUPPRESS ATTRIBUTE - Finding hand icon ===");

  // The hand icon from the screenshot is a blue hand (👆) on each row of Other names
  // Let me try clicking on the first row of the Other names table directly
  // The icon might be outside the table, rendered as an overlay
  
  // First, let's find what's clickable near the Other names rows
  const drawer = page.locator('.facct-drawer-content');
  
  // Try to find elements with "suppress" or "hand" or "pan" in any attribute
  const suppressEls = await page.evaluate(() => {
    const drawer = document.querySelector('.facct-drawer-content');
    if (!drawer) return [];
    const all = drawer.querySelectorAll('*');
    const results: any[] = [];
    all.forEach(el => {
      const attrs = Array.from(el.attributes).map(a => `${a.name}=${a.value}`).join(' ');
      if (attrs.toLowerCase().includes('suppress') || attrs.toLowerCase().includes('hand') || attrs.toLowerCase().includes('pan_tool')) {
        results.push({
          tag: el.tagName,
          attrs: attrs.substring(0, 200),
          text: el.textContent?.substring(0, 50),
          visible: (el as HTMLElement).offsetParent !== null
        });
      }
    });
    return results.slice(0, 20);
  });
  console.log(`  Elements with suppress/hand/pan_tool: ${JSON.stringify(suppressEls)}`);

  // Also check for img tags (the hand might be an image)
  const imgs = await drawer.locator('img').evaluateAll(imgs =>
    imgs.map(i => ({ src: (i as HTMLImageElement).src, alt: (i as HTMLImageElement).alt }))
  );
  console.log(`  Images in drawer: ${JSON.stringify(imgs)}`);

  console.log("\nDone. 20s to inspect...");
  await page.waitForTimeout(20000);
  await browser.close();
})();
