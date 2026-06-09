/**
 * Debug: Navigate to Data Export > Templates and capture page content
 */
import { chromium } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(30000);
  const page = await ctx.newPage();

  try {
    await AuthHelper.login(page, { orgId: EnvConfig.ORG_ID, email: EnvConfig.USERNAME, password: EnvConfig.PASSWORD });
    console.log("✅ Logged in");

    // Click List Management card
    await page.locator('.product-card:has-text("List")').first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    console.log("✅ On FacctList");

    // Click Data Export to expand submenu
    const dataExport = page.locator('[aria-label="Data Export"]').first();
    await dataExport.waitFor({ state: "visible", timeout: 10000 });
    await dataExport.click();
    await page.waitForTimeout(1000);
    console.log("✅ Expanded Data Export");

    // Click Templates
    const templates = page.locator('[aria-label="Templates"]').first();
    await templates.waitFor({ state: "visible", timeout: 10000 });
    await templates.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    console.log("✅ Clicked Templates");
    console.log(`📍 URL: ${page.url()}`);

    // Check for tables
    const tables = await page.locator("table").count();
    console.log(`\n🔍 Tables found: ${tables}`);

    const tbodyRows = await page.locator("tbody tr").count();
    console.log(`🔍 tbody tr count: ${tbodyRows}`);

    // Check for MUI components
    const papers = await page.locator(".MuiPaper-root").count();
    console.log(`🔍 MuiPaper-root: ${papers}`);

    const grids = await page.locator(".MuiDataGrid-root, [class*='DataGrid']").count();
    console.log(`🔍 DataGrid: ${grids}`);

    // Check for any heading/title
    const headings = await page.locator("h1, h2, h3, h4, h5, h6, [class*='title'], [class*='heading']").allTextContents();
    console.log(`\n📋 Headings: ${JSON.stringify(headings.filter(h => h.trim()).map(h => h.trim().substring(0, 60)))}`);

    // Check for buttons
    const buttons = await page.locator("button").allTextContents();
    console.log(`📋 Buttons: ${JSON.stringify(buttons.filter(b => b.trim()).map(b => b.trim().substring(0, 40)))}`);

    // Check for no-data messages
    const noData = await page.locator('text=No data, text=No records, [class*="no-data"], [class*="empty"]').allTextContents();
    console.log(`📋 No-data messages: ${JSON.stringify(noData.map(n => n.trim().substring(0, 60)))}`);

    // Check for table-row class
    const tableRows = await page.locator("tbody tr.table-row, tbody.MuiTableBody-root tr").count();
    console.log(`🔍 table-row / MuiTableBody tr: ${tableRows}`);

    // Get page body text
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 800));
    console.log(`\n📋 Page text (first 800):\n${bodyText}`);

    await page.screenshot({ path: "reports/debug-templates-page.png" });
    console.log("\n📸 Screenshot: reports/debug-templates-page.png");

  } catch (err) {
    console.error(`❌ Error: ${err}`);
    await page.screenshot({ path: "reports/debug-templates-error.png" }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
