/**
 * Debug: SER Reject Flow
 *
 * Flow:
 * 1. Maker login → Navigate to WC Main Premium → Find clean record
 * 2. Close → re-open via search → Create stale tab
 * 3. Tab 1: Suppress form → Submit
 * 4. Approver: Claim → REJECT
 * 5. Stale tab: Retry suppress → Should SUCCEED (record is back to clean after reject)
 * 6. Approver: Approve the new suppress from stale tab
 * 7. Release + Approve to clean up
 */
import { chromium, Browser, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

const TAGS = ["Enrich Tag"];
const REASON = "Vessel suppression";
const REVIEW_PERIOD = "Annual (365 Days)";
const ATTACHMENT = "src/resources/testData/Test_Sheet.xlsx";

let step = 0;
function S(m: string) { step++; console.log(`\n[${step}] ${m}`); }
async function ss(p: Page, n: string) { await p.screenshot({ path: `reports/debug-reject-${String(step).padStart(2,"0")}-${n}.png` }).catch(() => {}); }

async function toaster(p: Page, label: string): Promise<string> {
  try {
    const el = await p.waitForSelector('[role="alert"], .MuiSnackbar-root, [class*="notistack"]', { state: "visible", timeout: 8000 });
    const t = (await el.textContent()) || "";
    console.log(`  Toaster(${label}): "${t.trim().substring(0, 120)}"`);
    return t.trim();
  } catch { console.log(`  No toaster(${label})`); return ""; }
}

async function waitDrawer(p: Page) {
  await p.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 15000 });
  await p.waitForTimeout(2000);
}

async function waitDrawerClosed(p: Page) {
  await p.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(500);
}

async function openViaKebab(p: Page, rowLocator: any) {
  await rowLocator.locator('.kebab-cell svg, td:last-child svg').first().click();
  await p.locator('[role="menuitem"]:has-text("Overview")').first().waitFor({ state: "visible", timeout: 5000 });
  await p.locator('[role="menuitem"]:has-text("Overview")').first().click();
  await p.waitForLoadState("networkidle");
  await waitDrawer(p);
}

async function findTaskByRecordId(ap: Page, rid: string): Promise<boolean> {
  const pgBtns = ap.locator('button[class*="pagination"]');
  const pgCount = await pgBtns.count();
  if (pgCount >= 4) {
    const lastBtn = pgBtns.nth(3);
    if ((await lastBtn.getAttribute("tabindex")) !== "-1") {
      await lastBtn.click();
      await ap.waitForLoadState("networkidle");
      await ap.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });
    }
  }
  const rows = ap.locator("tbody tr.table-row, tbody.MuiTableBody-root tr");
  await rows.first().waitFor({ state: "visible", timeout: 15000 });
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const labelDiv = rows.nth(i).locator("td:first-child div label div, td:first-child label div").first();
    const lt = (await labelDiv.textContent().catch(() => "") || "").trim();
    const la = (await labelDiv.getAttribute("aria-label").catch(() => "") || "").trim();
    if (lt === rid || la === rid) {
      console.log(`  ✅ Row ${i}: Record ID="${lt}"`);
      await rows.nth(i).locator(".kebab-cell svg, td:last-child svg").first().click();
      await ap.waitForLoadState("networkidle");
      await waitDrawer(ap);
      return true;
    }
  }
  console.log(`  ❌ Record ${rid} not found`);
  return false;
}

async function approverSession(): Promise<{ browser: Browser; page: Page }> {
  const { width, height } = EnvConfig.RESOLUTION;
  const b = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67'] });
  const c = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  c.setDefaultTimeout(60000);
  const p = await c.newPage();
  await AuthHelper.login(p, { orgId: EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID, email: EnvConfig.APPROVER_USERNAME, password: EnvConfig.APPROVER_PASSWORD });
  console.log("  Approver logged in");
  await p.locator('.product-card:has-text("List")').first().click();
  await p.waitForLoadState("networkidle");
  await p.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').waitFor({ state: "visible", timeout: 10000 });
  await p.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').click();
  await p.waitForLoadState("networkidle");
  const pl1 = p.locator('button[aria-label*="Pending L1"]');
  if (await pl1.isVisible({ timeout: 5000 }).catch(() => false)) { await pl1.click(); await p.waitForLoadState("networkidle"); }
  const ct = p.locator('button[aria-label*="COMMERCIAL RECORDS"]');
  if (await ct.isVisible({ timeout: 5000 }).catch(() => false)) { await ct.click(); await p.waitForLoadState("networkidle"); }
  await p.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  console.log("  On Tasks > Pending L1 > Commercial Records");
  return { browser: b, page: p };
}

async function fillSuppressForm(p: Page) {
  await p.locator('#mui-component-select-tags').click();
  await p.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 5000 });
  for (const tag of TAGS) {
    const opt = p.locator(`[role="option"]:has-text("${tag}")`).first();
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
  }
  await p.keyboard.press("Escape");
  await p.locator('#mui-component-select-reasonCode').click();
  await p.locator('span.single-select-option').first().waitFor({ state: "visible", timeout: 5000 });
  const reasonOpt = p.locator(`span.single-select-option:has-text("${REASON}")`).first();
  if (await reasonOpt.isVisible({ timeout: 2000 }).catch(() => false)) await reasonOpt.click();
  else await p.locator('span.single-select-option').first().click();
  await p.locator('#mui-component-select-reviewPeriod').click();
  await p.locator('span.single-select-option').first().waitFor({ state: "visible", timeout: 5000 });
  const periodOpt = p.locator(`span.single-select-option:has-text("${REVIEW_PERIOD}")`).first();
  if (await periodOpt.isVisible({ timeout: 2000 }).catch(() => false)) await periodOpt.click();
  else await p.locator('span.single-select-option').first().click();
  await p.locator('#hold-enrich-comment--1').fill("Reject flow debug test");
  await p.locator('input[type="file"]').first().setInputFiles(ATTACHMENT);
  await p.waitForTimeout(1000);
  console.log("  Form filled");
}

// ==================== MAIN ====================
(async () => {
  const { width, height } = EnvConfig.RESOLUTION;
  const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67'] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(60000);
  const page = await ctx.newPage();
  let cleanId = "";

  try {
    // 1. LOGIN + NAVIGATE
    S("Maker login + navigate");
    await AuthHelper.login(page, { orgId: EnvConfig.ORG_ID, email: EnvConfig.USERNAME, password: EnvConfig.PASSWORD });
    await page.locator('.product-card:has-text("List")').first().click();
    await page.waitForLoadState("networkidle");
    await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();
    await page.locator('text=Commercial list').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('text=Commercial list').click();
    await page.waitForLoadState("networkidle");
    const listSearch = page.locator('input[placeholder*="Search"]').first();
    await listSearch.waitFor({ state: "visible", timeout: 10000 });
    await listSearch.fill("WC Main Premium");
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().click();
    await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    console.log("  ✅ On WC Main Premium");

    // 2. FIND CLEAN RECORD
    S("Find clean record");
    let maxPages = 10;
    while (!cleanId && maxPages > 0) {
      const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
      const rc = await rows.count();
      for (let i = 0; i < rc; i++) {
        if (page.isClosed()) break;
        const rid = (await rows.nth(i).locator('td').first().textContent() || "").trim();
        await openViaKebab(page, rows.nth(i));
        const profileText = await page.locator('.facct-drawer-paper').first().textContent().catch(() => "") || "";
        const ridMatch = profileText.match(/Record ID\s*(\d+)/);
        const profileRid = ridMatch ? ridMatch[1] : "";
        if (profileRid && profileRid !== rid) { await page.locator('#lseg-footer-close-btn').click(); await waitDrawerClosed(page); continue; }
        if (await page.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false)) { cleanId = rid; console.log(`  ✅ Clean: ${rid}`); break; }
        await page.locator('#lseg-footer-close-btn').click(); await waitDrawerClosed(page);
      }
      if (!cleanId) {
        const nb = page.locator('button[class*="pagination-next-btn"]').nth(1);
        if ((await nb.getAttribute("tabindex").catch(() => "-1")) === "-1") break;
        await nb.click(); await page.waitForLoadState("networkidle"); await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }); maxPages--;
      }
    }
    if (!cleanId) throw new Error("No clean record found!");

    // 3. CLOSE → RE-OPEN VIA SEARCH → CREATE STALE TAB
    S("Close → re-open → stale tab");
    await page.locator('#lseg-footer-close-btn').click(); await waitDrawerClosed(page);
    const listUrl = page.url();
    const reSearch = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await reSearch.waitFor({ state: "visible", timeout: 10000 }); await reSearch.clear(); await reSearch.fill(cleanId);
    await page.keyboard.press("Enter"); await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(page, page.locator('tbody tr').first());
    console.log(`  ✅ Re-opened ${cleanId}`);

    const staleTab = await ctx.newPage();
    await staleTab.goto(listUrl); await staleTab.waitForLoadState("networkidle");
    const staleSearch = staleTab.locator('input[placeholder*="Search by Record ID"]').first();
    await staleSearch.waitFor({ state: "visible", timeout: 10000 }); await staleSearch.fill(cleanId);
    await staleTab.keyboard.press("Enter"); await staleTab.waitForLoadState("networkidle");
    await staleTab.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(staleTab, staleTab.locator('tbody tr').first());
    console.log(`  ✅ Stale tab open`);

    // 4. TAB 1: SUPPRESS
    S("Tab 1: Suppress + submit");
    await page.bringToFront(); await page.waitForTimeout(1000);
    await page.locator('#lseg-footer-suppress-btn').click();
    await page.locator('#mui-component-select-tags').waitFor({ state: "visible", timeout: 15000 });
    await fillSuppressForm(page);
    const submitBtn = page.locator('#hold-enrich-modal-submit-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const b = document.querySelector('#hold-enrich-modal-submit-btn') as HTMLButtonElement; return b && !b.disabled; }, { timeout: 10000 }).catch(() => {});
    await submitBtn.click();
    await toaster(page, "suppress-submit");
    await page.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Suppress submitted");

    // 5. APPROVER: CLAIM + REJECT
    S("Approver: claim + REJECT");
    const { browser: ab1, page: ap1 } = await approverSession();
    const found = await findTaskByRecordId(ap1, cleanId);
    if (!found) throw new Error(`Record ${cleanId} not in approver tasks!`);

    await ap1.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#task-footer-claim-btn').click();
    await ap1.waitForLoadState("networkidle"); await ap1.waitForTimeout(2000);
    console.log("  Claimed");

    await ap1.locator('#task-footer-reject-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#task-footer-reject-btn').click();
    await ap1.locator('#comment-modal-text-field').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#comment-modal-text-field').fill("Rejected via debug");
    await ap1.waitForTimeout(500);
    await ap1.locator('#comment-modal-submit-btn').waitFor({ state: "visible", timeout: 5000 });
    await ap1.locator('#comment-modal-submit-btn').click();
    await toaster(ap1, "reject");
    await ap1.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Rejected");
    await ab1.close();

    // 6. STALE TAB: RETRY SUPPRESS → SHOULD SUCCEED
    S("Stale tab: retry suppress (should succeed after reject)");
    await staleTab.bringToFront(); await staleTab.waitForTimeout(1000);
    await staleTab.locator('#lseg-footer-suppress-btn').click();
    await staleTab.locator('#mui-component-select-tags').waitFor({ state: "visible", timeout: 10000 });
    await fillSuppressForm(staleTab);
    const staleSubmit = staleTab.locator('#hold-enrich-modal-submit-btn');
    await staleSubmit.scrollIntoViewIfNeeded();
    await staleSubmit.click();
    const staleToaster = await toaster(staleTab, "stale-retry");
    const staleAlerts = await staleTab.locator('[role="alert"]').allTextContents().catch(() => []);
    const hasError = staleToaster.toLowerCase().includes("updated") || staleToaster.toLowerCase().includes("error") ||
      staleAlerts.some((a: string) => a.toLowerCase().includes("updated") || a.toLowerCase().includes("error"));
    console.log(`  Stale error detected: ${hasError}`);
    if (hasError) {
      console.log("  ⚠️ Unexpected error after reject — record should have been clean");
    } else {
      console.log("  ✅ Stale suppress succeeded (expected after reject)");
    }
    await ss(staleTab, "stale-result");

    // 7. APPROVER: APPROVE THE NEW SUPPRESS (from stale tab)
    S("Approver: approve new suppress");
    const { browser: ab2, page: ap2 } = await approverSession();
    const found2 = await findTaskByRecordId(ap2, cleanId);
    if (!found2) throw new Error(`Record ${cleanId} not in approver tasks after stale suppress!`);

    await ap2.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap2.locator('#task-footer-claim-btn').click();
    await ap2.waitForLoadState("networkidle"); await ap2.waitForTimeout(2000);
    await ap2.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap2.locator('#task-footer-approve-btn').click();
    await ap2.locator('#comment-modal-text-field').waitFor({ state: "visible", timeout: 10000 });
    await ap2.locator('#comment-modal-text-field').fill("Approved stale suppress after reject");
    await ap2.waitForTimeout(500);
    await ap2.locator('#comment-modal-submit-btn').waitFor({ state: "visible", timeout: 5000 });
    await ap2.locator('#comment-modal-submit-btn').click();
    await toaster(ap2, "approve-stale");
    await ap2.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Stale suppress approved");
    await ab2.close();

    // 8. RELEASE + APPROVE (cleanup)
    S("Release + approve cleanup");
    await page.bringToFront();
    await page.reload({ waitUntil: "networkidle" });
    const relSearch = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await relSearch.waitFor({ state: "visible", timeout: 10000 }); await relSearch.clear(); await relSearch.fill(cleanId);
    await page.keyboard.press("Enter"); await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(page, page.locator('tbody tr').first());

    await page.locator('button[aria-label="RELEASE"]').first().waitFor({ state: "visible", timeout: 10000 });
    await page.locator('button[aria-label="RELEASE"]').first().click();
    await page.locator('.comment-modal-wrapper').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('#release-confirmation-comment').fill("Release after reject debug");
    await page.waitForFunction(() => { const btn = document.querySelector('#release-confirmation-submit-btn') as HTMLButtonElement; return btn && !btn.disabled; }, { timeout: 10000 });
    await page.locator('#release-confirmation-submit-btn').click();
    await toaster(page, "release-submit");
    await page.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Release submitted");

    const { browser: ab3, page: ap3 } = await approverSession();
    const found3 = await findTaskByRecordId(ap3, cleanId);
    if (!found3) throw new Error(`Record ${cleanId} not in approver tasks for release!`);
    await ap3.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap3.locator('#task-footer-claim-btn').click();
    await ap3.waitForLoadState("networkidle"); await ap3.waitForTimeout(2000);
    await ap3.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap3.locator('#task-footer-approve-btn').click();
    await ap3.locator('#comment-modal-text-field').waitFor({ state: "visible", timeout: 10000 });
    await ap3.locator('#comment-modal-text-field').fill("Release approved after reject debug");
    await ap3.waitForTimeout(500);
    await ap3.locator('#comment-modal-submit-btn').waitFor({ state: "visible", timeout: 5000 });
    await ap3.locator('#comment-modal-submit-btn').click();
    await toaster(ap3, "release-approve");
    await ap3.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Release approved — record clean");
    await ab3.close();

    // DONE
    S("✅ REJECT FLOW COMPLETE");
    console.log(`  Record: ${cleanId}`);
    console.log(`  Stale error after reject: ${hasError} (expected: false)`);

    await staleTab.close().catch(() => {});
    await browser.close();
  } catch (err) {
    console.log(`\n❌ FATAL: ${err}`);
    await ss(page, "error");
    await browser.close().catch(() => {});
  }
})();
