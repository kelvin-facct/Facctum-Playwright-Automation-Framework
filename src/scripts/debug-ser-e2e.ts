/**
 * E2E Debug: SER Approve — Complete flow with explicit waits
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
async function ss(p: Page, n: string) { await p.screenshot({ path: `reports/e2e-${String(step).padStart(2,"0")}-${n}.png` }).catch(() => {}); }

/** Wait for toaster right after action */
async function toaster(p: Page, label: string): Promise<string> {
  try {
    const el = await p.waitForSelector('[role="alert"], .MuiSnackbar-root, [class*="notistack"]', { state: "visible", timeout: 8000 });
    const t = (await el.textContent()) || "";
    console.log(`  Toaster(${label}): "${t.trim().substring(0, 120)}"`);
    return t.trim();
  } catch { console.log(`  No toaster(${label})`); return ""; }
}

/** Wait for drawer to open */
async function waitDrawer(p: Page) {
  await p.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 15000 });
  await p.waitForTimeout(2000); // let drawer content fully render
}

/** Wait for drawer to close */
async function waitDrawerClosed(p: Page) {
  await p.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(500); // small buffer after drawer animation
}

/** Open record via kebab → Overview, wait for drawer */
async function openViaKebab(p: Page, rowLocator: any) {
  await rowLocator.locator('.kebab-cell svg, td:last-child svg').first().click();
  await p.locator('[role="menuitem"]:has-text("Overview")').first().waitFor({ state: "visible", timeout: 5000 });
  await p.locator('[role="menuitem"]:has-text("Overview")').first().click();
  await p.waitForLoadState("networkidle");
  await waitDrawer(p);
}

/** Find record in approver tasks: last page → match Record ID → kebab click to open */
async function findTaskByRecordId(ap: Page, rid: string): Promise<boolean> {
  // Go to last page
  const pgBtns = ap.locator('button[class*="pagination"]');
  const pgCount = await pgBtns.count();
  if (pgCount >= 4) {
    const lastBtn = pgBtns.nth(3);
    if ((await lastBtn.getAttribute("tabindex")) !== "-1") {
      await lastBtn.click();
      await ap.waitForLoadState("networkidle");
      await ap.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });
      console.log(`  On last page`);
    }
  }

  // Find row by Record ID (td:first-child div label div)
  const rows = ap.locator("tbody tr.table-row, tbody.MuiTableBody-root tr");
  await rows.first().waitFor({ state: "visible", timeout: 15000 });
  const count = await rows.count();
  console.log(`  Rows: ${count}`);

  for (let i = 0; i < count; i++) {
    const labelDiv = rows.nth(i).locator("td:first-child div label div, td:first-child label div").first();
    const lt = (await labelDiv.textContent().catch(() => "") || "").trim();
    const la = (await labelDiv.getAttribute("aria-label").catch(() => "") || "").trim();
    if (!lt && !la) continue;

    if (lt === rid || la === rid) {
      console.log(`  ✅ Row ${i}: Record ID="${lt}" — opening via kebab`);
      await rows.nth(i).locator(".kebab-cell svg, td:last-child svg").first().click();
      await ap.waitForLoadState("networkidle");
      await waitDrawer(ap);
      return true;
    }
  }

  console.log(`  ❌ Record ${rid} not found`);
  return false;
}

/** Create approver session → Tasks > Pending L1 > Commercial Records */
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
  // Wait for table to load
  await p.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  console.log("  On Tasks > Pending L1 > Commercial Records");
  return { browser: b, page: p };
}

/** Fill suppress form on a page */
async function fillSuppressForm(p: Page) {
  // Tags
  await p.locator('#mui-component-select-tags').click();
  await p.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 5000 });
  for (const tag of TAGS) {
    const opt = p.locator(`[role="option"]:has-text("${tag}")`).first();
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
  }
  await p.keyboard.press("Escape");

  // Reason
  await p.locator('#mui-component-select-reasonCode').click();
  await p.locator('span.single-select-option').first().waitFor({ state: "visible", timeout: 5000 });
  const reasonOpt = p.locator(`span.single-select-option:has-text("${REASON}")`).first();
  if (await reasonOpt.isVisible({ timeout: 2000 }).catch(() => false)) await reasonOpt.click();
  else await p.locator('span.single-select-option').first().click();

  // Review Period
  await p.locator('#mui-component-select-reviewPeriod').click();
  await p.locator('span.single-select-option').first().waitFor({ state: "visible", timeout: 5000 });
  const periodOpt = p.locator(`span.single-select-option:has-text("${REVIEW_PERIOD}")`).first();
  if (await periodOpt.isVisible({ timeout: 2000 }).catch(() => false)) await periodOpt.click();
  else await p.locator('span.single-select-option').first().click();

  // Comment
  await p.locator('#hold-enrich-comment--1').fill("E2E debug test");

  // Attachment
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
    // 1. LOGIN
    S("Maker login");
    await AuthHelper.login(page, { orgId: EnvConfig.ORG_ID, email: EnvConfig.USERNAME, password: EnvConfig.PASSWORD });
    console.log("  ✅ Logged in");

    // 2. NAVIGATE
    S("Navigate to WC Main Premium");
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
    await page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().waitFor({ state: "visible", timeout: 10000 });
    await page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().click();
    await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    console.log("  ✅ On WC Main Premium");

    // 3. FIND CLEAN RECORD (paginate)
    S("Find clean record");
    let maxPages = 10;
    while (!cleanId && maxPages > 0) {
      const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
      const rc = await rows.count();
      console.log(`  Page: ${rc} rows`);
      for (let i = 0; i < rc; i++) {
        if (page.isClosed()) break;
        const rid = (await rows.nth(i).locator('td').first().textContent() || "").trim();
        console.log(`  Checking ${rid}...`);
        await openViaKebab(page, rows.nth(i));

        // Verify the profile shows the correct Record ID
        const profileText = await page.locator('.facct-drawer-paper').first().textContent().catch(() => "") || "";
        const ridMatch = profileText.match(/Record ID\s*(\d+)/);
        const profileRid = ridMatch ? ridMatch[1] : "";
        if (profileRid && profileRid !== rid) {
          console.log(`  ⚠️ Profile shows Record ID ${profileRid}, expected ${rid} — stale drawer, skipping`);
          await page.locator('#lseg-footer-close-btn').click();
          await waitDrawerClosed(page);
          continue;
        }

        if (await page.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false)) {
          cleanId = rid;
          console.log(`  ✅ Clean: ${rid} (verified on profile)`);
          break;
        }
        await page.locator('#lseg-footer-close-btn').click();
        await waitDrawerClosed(page);
      }
      if (!cleanId) {
        const nb = page.locator('button[class*="pagination-next-btn"]').nth(1);
        if ((await nb.getAttribute("tabindex").catch(() => "-1")) === "-1") { console.log("  No more pages"); break; }
        await nb.click();
        await page.waitForLoadState("networkidle");
        await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
        maxPages--;
      }
    }
    if (!cleanId) throw new Error("No clean record found!");

    // 4. CLOSE → GET URL → RE-OPEN VIA SEARCH
    S("Close → URL → re-open via search");
    await page.locator('#lseg-footer-close-btn').click();
    await waitDrawerClosed(page);
    const listUrl = page.url();
    console.log(`  URL: ${listUrl}`);

    const reSearch = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await reSearch.waitFor({ state: "visible", timeout: 10000 });
    await reSearch.clear(); await reSearch.fill(cleanId);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(page, page.locator('tbody tr').first());
    console.log(`  ✅ Re-opened ${cleanId}`);
    await ss(page, "tab1-profile");

    // 5. CREATE STALE TAB
    S("Create stale tab");
    const staleTab = await ctx.newPage();
    await staleTab.goto(listUrl);
    await staleTab.waitForLoadState("networkidle");
    const staleSearch = staleTab.locator('input[placeholder*="Search by Record ID"]').first();
    await staleSearch.waitFor({ state: "visible", timeout: 10000 });
    await staleSearch.click(); await staleSearch.fill(cleanId);
    await staleTab.keyboard.press("Enter");
    await staleTab.waitForLoadState("networkidle");
    await staleTab.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(staleTab, staleTab.locator('tbody tr').first());
    const staleSup = await staleTab.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  ✅ Stale tab open, SUPPRESS=${staleSup}`);
    await ss(staleTab, "stale-profile");

    // 6. TAB 1: SUPPRESS FORM
    S("Tab 1: Fill suppress form + submit");
    await page.bringToFront();
    await page.waitForTimeout(1000);

    console.log("  Clicking SUPPRESS...");
    const suppBtn = page.locator('#lseg-footer-suppress-btn');
    const suppVis = await suppBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  SUPPRESS visible: ${suppVis}`);
    if (!suppVis) {
      console.log("  ❌ SUPPRESS not visible! Taking screenshot...");
      await ss(page, "suppress-not-visible");
      throw new Error("SUPPRESS button not visible on Tab 1");
    }
    await suppBtn.click();
    console.log("  Clicked SUPPRESS, waiting for form...");

    await page.locator('#mui-component-select-tags').waitFor({ state: "visible", timeout: 15000 });
    console.log("  Suppress form open");

    console.log("  Filling form...");
    await fillSuppressForm(page);

    // Submit
    console.log("  Clicking submit...");
    const submitBtn = page.locator('#hold-enrich-modal-submit-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const b = document.querySelector('#hold-enrich-modal-submit-btn') as HTMLButtonElement;
      return b && !b.disabled;
    }, { timeout: 10000 }).catch(e => console.log(`  Submit wait: ${e}`));
    await submitBtn.click();
    console.log("  Clicked submit, waiting for toaster...");
    const suppressToaster = await toaster(page, "suppress-submit");
    await page.waitForLoadState("networkidle").catch(() => {});

    // Verify form closed
    const formOpen = await page.locator('#hold-enrich-modal-submit-btn').isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Form still open: ${formOpen}`);
    if (formOpen) {
      console.log("  Retrying with force click...");
      await submitBtn.click({ force: true });
      await toaster(page, "suppress-submit-retry");
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    await ss(page, "after-submit");
    console.log(`  ✅ Suppress submitted`);

    // 7. APPROVER: CLAIM + APPROVE
    S("Approver: claim + approve");
    const { browser: ab1, page: ap1 } = await approverSession();
    const found = await findTaskByRecordId(ap1, cleanId);
    if (!found) throw new Error(`Record ${cleanId} not in approver tasks — suppress failed!`);

    await ap1.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#task-footer-claim-btn').click();
    await ap1.waitForLoadState("networkidle");
    await ap1.waitForTimeout(2000);
    await ap1.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
    console.log("  Claimed");

    await ap1.locator('#task-footer-approve-btn').click();
    await ap1.locator('#comment-modal-text-field').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#comment-modal-text-field').fill("Approved via E2E debug");
    await ap1.waitForTimeout(500);
    await ap1.locator('#comment-modal-submit-btn').waitFor({ state: "visible", timeout: 5000 });
    await ap1.locator('#comment-modal-submit-btn').click();
    const approveToaster = await toaster(ap1, "approve");
    await ap1.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Approved");
    await ss(ap1, "approved");
    await ab1.close();

    // 8. STALE TAB: RETRY SUPPRESS → EXPECT ERROR
    S("Stale tab: retry suppress");
    await staleTab.bringToFront();
    await staleTab.locator('#lseg-footer-suppress-btn').click();
    await staleTab.locator('#mui-component-select-tags').waitFor({ state: "visible", timeout: 10000 });
    await fillSuppressForm(staleTab);

    const staleSubmit = staleTab.locator('#hold-enrich-modal-submit-btn');
    await staleSubmit.scrollIntoViewIfNeeded();
    await staleSubmit.click();
    const staleToaster = await toaster(staleTab, "stale-retry");
    const staleAlerts = await staleTab.locator('[role="alert"]').allTextContents().catch(() => []);
    console.log(`  Alerts: ${JSON.stringify(staleAlerts.map(a => a.trim().substring(0, 100)))}`);
    const hasError = staleToaster.toLowerCase().includes("updated") || staleToaster.toLowerCase().includes("error") ||
      staleAlerts.some(a => a.toLowerCase().includes("updated") || a.toLowerCase().includes("error"));
    console.log(`  ✅ Stale error detected: ${hasError}`);
    await ss(staleTab, "stale-result");

    // 9. RELEASE: MAKER OPENS RECORD → RELEASE → COMMENT → SUBMIT
    S("Release suppression");
    await page.bringToFront();
    await page.reload({ waitUntil: "networkidle" });
    // Search and open the record
    const relSearch = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await relSearch.waitFor({ state: "visible", timeout: 10000 });
    await relSearch.clear(); await relSearch.fill(cleanId);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(page, page.locator('tbody tr').first());
    console.log("  Opened suppressed record");

    // Click RELEASE (no stable ID — use aria-label)
    const releaseBtn = page.locator('button[aria-label="RELEASE"]').first();
    await releaseBtn.waitFor({ state: "visible", timeout: 10000 });
    await releaseBtn.click();

    // Wait for release confirmation popup (.comment-modal-wrapper)
    await page.locator('.comment-modal-wrapper').waitFor({ state: "visible", timeout: 10000 });

    // Fill mandatory comment (id: release-confirmation-comment)
    const releaseComment = page.locator('#release-confirmation-comment');
    await releaseComment.waitFor({ state: "visible", timeout: 5000 });
    await releaseComment.fill("Release via E2E debug");
    console.log("  Filled release comment");

    // Wait for submit to become enabled (disabled until comment is filled)
    const relSubmit = page.locator('#release-confirmation-submit-btn');
    await page.waitForFunction(() => {
      const btn = document.querySelector('#release-confirmation-submit-btn') as HTMLButtonElement;
      return btn && !btn.disabled;
    }, { timeout: 10000 });
    await relSubmit.click();
    const releaseToaster = await toaster(page, "release-submit");
    await page.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Release submitted");
    await ss(page, "release-submitted");

    // 10. APPROVER: APPROVE RELEASE
    S("Approver: approve release");
    const { browser: ab2, page: ap2 } = await approverSession();
    const found2 = await findTaskByRecordId(ap2, cleanId);
    if (!found2) throw new Error(`Record ${cleanId} not in approver tasks — release failed!`);

    await ap2.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap2.locator('#task-footer-claim-btn').click();
    await ap2.waitForLoadState("networkidle");
    await ap2.waitForTimeout(2000);
    await ap2.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
    console.log("  Release claimed");

    await ap2.locator('#task-footer-approve-btn').click();
    await ap2.locator('#comment-modal-text-field').waitFor({ state: "visible", timeout: 10000 });
    await ap2.locator('#comment-modal-text-field').fill("Release approved via E2E debug");
    await ap2.waitForTimeout(500);
    await ap2.locator('#comment-modal-submit-btn').waitFor({ state: "visible", timeout: 5000 });
    await ap2.locator('#comment-modal-submit-btn').click();
    const relApproveToaster = await toaster(ap2, "release-approve");
    await ap2.waitForLoadState("networkidle").catch(() => {});
    console.log("  ✅ Release approved — record clean again");
    await ss(ap2, "release-approved");
    await ab2.close();

    // DONE
    S("✅ E2E COMPLETE");
    console.log(`  Record: ${cleanId}`);
    console.log(`  Suppress toaster: "${suppressToaster}"`);
    console.log(`  Approve toaster: "${approveToaster}"`);
    console.log(`  Stale error: ${hasError}`);
    console.log(`  Release toaster: "${releaseToaster}"`);
    console.log(`  Release approve: "${relApproveToaster}"`);

    await staleTab.close().catch(() => {});
    await browser.close();

  } catch (err) {
    console.log(`\n❌ FATAL: ${err}`);
    await ss(page, "error");
    await browser.close().catch(() => {});
  }
})();
