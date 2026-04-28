/**
 * Debug: Release Flow — Maker releases record ID 24, then Approver approves the release
 *
 * Confirmed UI selectors (from diagnostic run 2026-04-27):
 *   RELEASE button:     button[aria-label="RELEASE"] (no stable ID, inside drawer)
 *   Release popup:      .facct-modal.comment-modal-wrapper
 *   Comment textarea:   #release-confirmation-comment (placeholder="Comments", required, max 200)
 *   Upload file:        button[aria-label="upload file"]
 *   Cancel:             #release-confirmation-cancel-btn
 *   Submit:             #release-confirmation-submit-btn (disabled until comment filled)
 *   Approver claim:     #task-footer-claim-btn
 *   Approver approve:   #task-footer-approve-btn
 *   Approve comment:    #comment-modal-text-field
 *   Approve submit:     #comment-modal-submit-btn
 *
 * Flow:
 * 1. Maker login → Navigate to WC Main Premium
 * 2. Search for record ID 24 → Open profile via kebab → Overview
 * 3. Click RELEASE → Fill comment → Submit
 * 4. Approver login (separate browser) → Tasks → Pending L1 → Commercial Records
 * 5. Find record 24 in tasks → Claim → Approve
 */
import { chromium, Browser, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

const RECORD_ID = "24";
const RELEASE_COMMENT = "Release via debug automation";
const APPROVE_COMMENT = "Release approved via debug automation";

let step = 0;
function S(m: string) {
  step++;
  console.log(`\n[${step}] ${m}`);
}
async function ss(p: Page, n: string) {
  await p
    .screenshot({ path: `reports/debug-release-${String(step).padStart(2, "0")}-${n}.png` })
    .catch(() => {});
}

/** Wait for toaster / alert */
async function toaster(p: Page, label: string): Promise<string> {
  try {
    const el = await p.waitForSelector(
      '[role="alert"], .MuiSnackbar-root, [class*="notistack"]',
      { state: "visible", timeout: 8000 }
    );
    const t = (await el.textContent()) || "";
    console.log(`  Toaster(${label}): "${t.trim().substring(0, 120)}"`);
    return t.trim();
  } catch {
    console.log(`  No toaster(${label})`);
    return "";
  }
}

/** Wait for the profile drawer to open */
async function waitDrawer(p: Page) {
  await p.locator(".facct-drawer-paper").first().waitFor({ state: "visible", timeout: 15000 });
  await p.waitForTimeout(2000);
}

/** Open record via kebab → Overview */
async function openViaKebab(p: Page, rowLocator: any) {
  await rowLocator.locator(".kebab-cell svg, td:last-child svg").first().click();
  await p.locator('[role="menuitem"]:has-text("Overview")').first().waitFor({ state: "visible", timeout: 5000 });
  await p.locator('[role="menuitem"]:has-text("Overview")').first().click();
  await p.waitForLoadState("networkidle");
  await waitDrawer(p);
}

/** Find a record in the approver tasks table by Record ID */
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
  const b = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled", "--force-device-scale-factor=0.67"],
  });
  const c = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  c.setDefaultTimeout(60000);
  const p = await c.newPage();

  await AuthHelper.login(p, {
    orgId: EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID,
    email: EnvConfig.APPROVER_USERNAME,
    password: EnvConfig.APPROVER_PASSWORD,
  });
  console.log("  Approver logged in");

  await p.locator('.product-card:has-text("List")').first().click();
  await p.waitForLoadState("networkidle");

  await p.locator("xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span").waitFor({ state: "visible", timeout: 10000 });
  await p.locator("xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span").click();
  await p.waitForLoadState("networkidle");

  const pl1 = p.locator('button[aria-label*="Pending L1"]');
  if (await pl1.isVisible({ timeout: 5000 }).catch(() => false)) {
    await pl1.click();
    await p.waitForLoadState("networkidle");
  }

  const ct = p.locator('button[aria-label*="COMMERCIAL RECORDS"]');
  if (await ct.isVisible({ timeout: 5000 }).catch(() => false)) {
    await ct.click();
    await p.waitForLoadState("networkidle");
  }

  await p.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  console.log("  On Tasks > Pending L1 > Commercial Records");

  return { browser: b, page: p };
}

// ==================== MAIN ====================
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
    // ========== 1. MAKER LOGIN ==========
    S("Maker login");
    await AuthHelper.login(page, {
      orgId: EnvConfig.ORG_ID,
      email: EnvConfig.USERNAME,
      password: EnvConfig.PASSWORD,
    });
    console.log("  ✅ Logged in");

    // ========== 2. NAVIGATE TO WC MAIN PREMIUM ==========
    S("Navigate to WC Main Premium");
    await page.locator('.product-card:has-text("List")').first().click();
    await page.waitForLoadState("networkidle");

    await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();

    await page.locator("text=Commercial list").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("text=Commercial list").click();
    await page.waitForLoadState("networkidle");

    const listSearch = page.locator('input[placeholder*="Search"]').first();
    await listSearch.waitFor({ state: "visible", timeout: 10000 });
    await listSearch.fill("WC Main Premium");
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");

    await page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().waitFor({ state: "visible", timeout: 10000 });
    await page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().click();
    await page.waitForLoadState("networkidle");
    await page.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });
    console.log("  ✅ On WC Main Premium");

    // ========== 3. SEARCH AND OPEN RECORD ==========
    S(`Search and open record ${RECORD_ID}`);
    const recordSearch = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await recordSearch.waitFor({ state: "visible", timeout: 10000 });
    await recordSearch.clear();
    await recordSearch.fill(RECORD_ID);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });

    await openViaKebab(page, page.locator("tbody tr").first());
    console.log(`  ✅ Record ${RECORD_ID} profile opened`);
    await ss(page, "record-profile");

    // Verify record is in suppressed state
    const statusChip = page.locator("div.lseg-multi-status-chip-label").first();
    const statusLabel = (await statusChip.getAttribute("aria-label").catch(() => "")) || "";
    console.log(`  Record status: "${statusLabel}"`);

    // ========== 4. CLICK RELEASE ==========
    S("Click RELEASE");
    const releaseBtn = page.locator('button[aria-label="RELEASE"]').first();
    await releaseBtn.waitFor({ state: "visible", timeout: 10000 });
    await releaseBtn.click();
    console.log("  ✅ Clicked RELEASE");

    // Wait for the release confirmation popup
    await page.locator(".comment-modal-wrapper").waitFor({ state: "visible", timeout: 10000 });
    console.log("  Release popup opened");
    await ss(page, "release-popup");

    // ========== 5. FILL COMMENT AND SUBMIT ==========
    S("Fill release comment and submit");

    // Fill the mandatory comment field
    const commentField = page.locator("#release-confirmation-comment");
    await commentField.waitFor({ state: "visible", timeout: 5000 });
    await commentField.fill(RELEASE_COMMENT);
    console.log(`  Filled comment: "${RELEASE_COMMENT}"`);

    // Wait for submit button to become enabled (disabled until comment is filled)
    const submitBtn = page.locator("#release-confirmation-submit-btn");
    await page.waitForFunction(() => {
      const btn = document.querySelector("#release-confirmation-submit-btn") as HTMLButtonElement;
      return btn && !btn.disabled;
    }, { timeout: 10000 });
    console.log("  Submit button enabled");

    await submitBtn.click();
    console.log("  Clicked SUBMIT");

    const releaseToaster = await toaster(page, "release-submit");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
    console.log("  ✅ Release submitted for approval");
    await ss(page, "release-submitted");

    // ========== 6. APPROVER: CLAIM + APPROVE RELEASE ==========
    S("Approver: claim + approve release");
    const { browser: ab, page: ap } = await approverSession();

    const found = await findTaskByRecordId(ap, RECORD_ID);
    if (!found) {
      throw new Error(`Record ${RECORD_ID} not found in approver tasks — release may have failed`);
    }
    await ss(ap, "approver-record-opened");

    // CLAIM
    await ap.locator("#task-footer-claim-btn").waitFor({ state: "visible", timeout: 10000 });
    await ap.locator("#task-footer-claim-btn").click();
    await ap.waitForLoadState("networkidle");
    await ap.waitForTimeout(2000);
    console.log("  ✅ Claimed");
    await ss(ap, "approver-claimed");

    // APPROVE
    await ap.locator("#task-footer-approve-btn").waitFor({ state: "visible", timeout: 10000 });
    await ap.locator("#task-footer-approve-btn").click();

    await ap.locator("#comment-modal-text-field").waitFor({ state: "visible", timeout: 10000 });
    await ap.locator("#comment-modal-text-field").fill(APPROVE_COMMENT);
    await ap.waitForTimeout(500);

    await ap.locator("#comment-modal-submit-btn").waitFor({ state: "visible", timeout: 5000 });
    await ap.locator("#comment-modal-submit-btn").click();

    const approveToaster = await toaster(ap, "release-approve");
    await ap.waitForLoadState("networkidle").catch(() => {});
    await ap.waitForTimeout(2000);
    console.log("  ✅ Release approved — record is clean again");
    await ss(ap, "approver-approved");

    // ========== DONE ==========
    S("✅ RELEASE FLOW COMPLETE");
    console.log(`  Record ID: ${RECORD_ID}`);
    console.log(`  Status before release: "${statusLabel}"`);
    console.log(`  Release toaster: "${releaseToaster}"`);
    console.log(`  Approve toaster: "${approveToaster}"`);

    await ab.close();
    await browser.close();
  } catch (err) {
    console.log(`\n❌ FATAL: ${err}`);
    await ss(page, "error");
    await page.waitForTimeout(3000);
    await browser.close().catch(() => {});
  }
})();
