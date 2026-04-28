/**
 * Debug: Attribute Suppress Flow (SA) with Stale Tab
 *
 * Confirmed selectors (from diagnostic run 2026-04-28):
 *   Blue hand icon:     button[title="Attribute suppress request"] svg[data-testid="BackHandOutlinedIcon"]
 *   Add/enrich icon:    svg[data-testid="AddCircleOutlineIcon"]
 *   Suppress popup:     .facct-modal (role="presentation")
 *   Popup suppress btn: #hold-enrich-modal-suppress-btn
 *   Popup cancel btn:   #hold-enrich-modal-cancel-btn
 *   Tags:               #mui-component-select-tags
 *   Reason:             #mui-component-select-reasonCode
 *   Review period:      #mui-component-select-reviewPeriod (defaults to Annual)
 *   Comment:            #hold-enrich-comment--1
 *   Upload file:        button[aria-label="upload file"]
 *   Edit submit:        #lseg-footer-submitForApproval-btn
 *
 * Flow:
 * 1. Login -> WC Main Premium -> Find clean record (EDIT visible + Other names)
 * 2. Close -> capture URL -> re-open via search -> create stale tab
 * 3. Tab 1: EDIT -> scroll to Other names -> click blue hand -> fill popup -> SUPPRESS -> Submit
 * 4. Approver: Claim + Approve
 * 5. Stale tab: EDIT -> same suppress -> expect version conflict
 * 6. Release + Approve cleanup
 */
import { chromium, Browser, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

const TAGS = ["Enrich Tag"];
const REASON = "Weak alias suppression";
const REVIEW_PERIOD = "Annual (365 Days)";

let step = 0;
function S(m: string) { step++; console.log(`\n[${step}] ${m}`); }
async function ss(p: Page, n: string) { await p.screenshot({ path: `reports/debug-attr-${String(step).padStart(2,"0")}-${n}.png` }).catch(() => {}); }

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
  if (await pgBtns.count() >= 4) {
    const lastBtn = pgBtns.nth(3);
    if ((await lastBtn.getAttribute("tabindex")) !== "-1") {
      await lastBtn.click(); await ap.waitForLoadState("networkidle");
      await ap.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15000 });
    }
  }
  const rows = ap.locator("tbody tr.table-row, tbody.MuiTableBody-root tr");
  await rows.first().waitFor({ state: "visible", timeout: 15000 });
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const ld = rows.nth(i).locator("td:first-child div label div, td:first-child label div").first();
    const lt = (await ld.textContent().catch(() => "") || "").trim();
    const la = (await ld.getAttribute("aria-label").catch(() => "") || "").trim();
    if (lt === rid || la === rid) {
      console.log(`  Found Record ID="${lt}" at row ${i}`);
      await rows.nth(i).locator(".kebab-cell svg, td:last-child svg").first().click();
      await ap.waitForLoadState("networkidle"); await waitDrawer(ap);
      return true;
    }
  }
  return false;
}
async function approverSession(): Promise<{ browser: Browser; page: Page }> {
  const { width, height } = EnvConfig.RESOLUTION;
  const b = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67'] });
  const c = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  c.setDefaultTimeout(60000);
  const p = await c.newPage();
  await AuthHelper.login(p, { orgId: EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID, email: EnvConfig.APPROVER_USERNAME, password: EnvConfig.APPROVER_PASSWORD });
  await p.locator('.product-card:has-text("List")').first().click(); await p.waitForLoadState("networkidle");
  await p.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').waitFor({ state: "visible", timeout: 10000 });
  await p.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').click();
  await p.waitForLoadState("networkidle");
  const pl1 = p.locator('button[aria-label*="Pending L1"]');
  if (await pl1.isVisible({ timeout: 5000 }).catch(() => false)) { await pl1.click(); await p.waitForLoadState("networkidle"); }
  const ct = p.locator('button[aria-label*="COMMERCIAL RECORDS"]');
  if (await ct.isVisible({ timeout: 5000 }).catch(() => false)) { await ct.click(); await p.waitForLoadState("networkidle"); }
  await p.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  return { browser: b, page: p };
}

/** Click blue hand icon on first available alias row, fill popup, click SUPPRESS, wait for popup to close */
async function suppressAttribute(p: Page, sectionIndex: number = 0) {
  // Click the blue hand icon (title="Attribute suppress request")
  const handIcons = p.locator('button[title="Attribute suppress request"]');
  const handCount = await handIcons.count();
  console.log(`  Hand icons visible: ${handCount}`);
  if (handCount === 0) throw new Error("No blue hand icons found in edit mode");

  const targetIcon = handIcons.nth(sectionIndex);
  await targetIcon.scrollIntoViewIfNeeded();
  await targetIcon.click();
  console.log(`  Clicked hand icon at index ${sectionIndex}`);

  // Wait for suppress popup to open
  await p.locator('#hold-enrich-modal-suppress-btn').waitFor({ state: "visible", timeout: 10000 });
  console.log("  Suppress popup opened");

  // All form fields must be scoped to the popup modal to avoid matching background elements
  const popup = p.locator('[role="presentation"].facct-modal').last();

  // Fill tags (scoped to popup)
  const tagsSelect = popup.locator('#mui-component-select-tags, [name="tags"]').first();
  await tagsSelect.waitFor({ state: "visible", timeout: 5000 });
  await tagsSelect.click();
  await p.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 5000 });
  for (const tag of TAGS) {
    const opt = p.locator(`[role="option"]:has-text("${tag}")`).first();
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
  }
  await p.keyboard.press("Escape");
  console.log("  Tags filled");

  // Fill reason (scoped to popup)
  const reasonSelect = popup.locator('#mui-component-select-reasonCode, [name="reasonCode"]').first();
  await reasonSelect.waitFor({ state: "visible", timeout: 5000 });
  await reasonSelect.click();
  await p.locator('span.single-select-option').first().waitFor({ state: "visible", timeout: 5000 });
  const reasonOpt = p.locator(`span.single-select-option:has-text("${REASON}")`).first();
  if (await reasonOpt.isVisible({ timeout: 2000 }).catch(() => false)) await reasonOpt.click();
  else await p.locator('span.single-select-option').first().click();
  console.log("  Reason filled");

  // Fill review period (scoped to popup)
  const periodSelect = popup.locator('#mui-component-select-reviewPeriod, [name="reviewPeriod"]').first();
  await periodSelect.waitFor({ state: "visible", timeout: 5000 });
  await periodSelect.click();
  await p.locator('span.single-select-option').first().waitFor({ state: "visible", timeout: 5000 });
  const periodOpt = p.locator(`span.single-select-option:has-text("${REVIEW_PERIOD}")`).first();
  if (await periodOpt.isVisible({ timeout: 2000 }).catch(() => false)) await periodOpt.click();
  else await p.locator('span.single-select-option').first().click();
  console.log("  Review period filled");

  // Fill comment (scoped to popup)
  const commentField = popup.locator('#hold-enrich-comment--1, textarea[placeholder="Comment"]').first();
  await commentField.waitFor({ state: "visible", timeout: 5000 });
  await commentField.fill("Attribute suppress debug test");
  console.log("  Comment filled");

  // Upload attachment (scoped to popup)
  const fileInput = popup.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 5000 });
  await fileInput.setInputFiles("src/resources/testData/Test_Sheet.xlsx");
  await p.waitForTimeout(1000);
  console.log("  Attachment uploaded");

  console.log("  Form filled");

  // Click SUPPRESS in popup
  await p.locator('#hold-enrich-modal-suppress-btn').click();
  console.log("  Clicked SUPPRESS");

  // CRITICAL: The modal backdrop blocks clicks on Submit for Approval
  // Wait for suppress button to disappear, then force-close any remaining modal
  await p.waitForTimeout(3000);

  // Check if the suppress popup is still visible
  const suppressStillVisible = await p.locator('#hold-enrich-modal-suppress-btn').isVisible({ timeout: 2000 }).catch(() => false);
  if (suppressStillVisible) {
    // Try clicking cancel to close the popup
    const cancelBtn = p.locator('#hold-enrich-modal-cancel-btn');
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      console.log("  Closed popup via CANCEL");
    }
  }

  // Wait for ALL modals/backdrops to close
  await p.waitForTimeout(1000);
  // Force-dismiss any remaining modal backdrop via JavaScript
  await p.evaluate(() => {
    const backdrops = document.querySelectorAll('.MuiBackdrop-root.MuiModal-backdrop');
    backdrops.forEach(b => {
      const modal = b.closest('[role="presentation"]');
      if (modal && modal.classList.contains('facct-modal')) {
        (modal as HTMLElement).style.display = 'none';
        (modal as HTMLElement).remove();
      }
    });
  }).catch(() => {});
  await p.waitForTimeout(1000);
  console.log("  Suppress popup closed");
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
    const ls = page.locator('input[placeholder*="Search"]').first();
    await ls.waitFor({ state: "visible", timeout: 10000 }); await ls.fill("WC Main Premium");
    await page.keyboard.press("Enter"); await page.waitForLoadState("networkidle");
    await page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first().click();
    await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    console.log("  On WC Main Premium");

    // 2. FIND CLEAN RECORD
    S("Find clean record (EDIT + Other names)");
    let maxPages = 10;
    while (!cleanId && maxPages > 0) {
      const rows = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
      const rc = await rows.count();
      for (let i = 0; i < rc; i++) {
        if (page.isClosed()) break;
        const rid = (await rows.nth(i).locator('td').first().textContent() || "").trim();
        await openViaKebab(page, rows.nth(i));
        const pt = await page.locator('.facct-drawer-paper').first().textContent().catch(() => "") || "";
        const rm = pt.match(/Record ID\s*(\d+)/);
        if (rm && rm[1] !== rid) { await page.locator('#lseg-footer-close-btn').click(); await waitDrawerClosed(page); continue; }
        if (await page.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false)) {
          // SUPPRESS visible means record is truly clean (never suppressed or fully released)
          if (await page.locator('text=Other names').first().isVisible({ timeout: 3000 }).catch(() => false)) {
            // Also verify no "Record suppressed" status chip
            const statusLabel = await page.locator('div.lseg-multi-status-chip-label').first().getAttribute("aria-label").catch(() => "");
            if (statusLabel && statusLabel.toLowerCase().includes("suppressed")) {
              console.log(`  Record ${rid}: has suppressed status, skipping`);
              await page.locator('#lseg-footer-close-btn').click(); await waitDrawerClosed(page); continue;
            }
            cleanId = rid; console.log(`  Clean: ${rid} (SUPPRESS visible, has aliases)`); break;
          }
        }
        await page.locator('#lseg-footer-close-btn').click(); await waitDrawerClosed(page);
      }
      if (!cleanId) {
        const nb = page.locator('button[class*="pagination-next-btn"]').nth(1);
        if ((await nb.getAttribute("tabindex").catch(() => "-1")) === "-1") break;
        await nb.click(); await page.waitForLoadState("networkidle");
        await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }); maxPages--;
      }
    }
    if (!cleanId) throw new Error("No clean record found!");

    // 3. CLOSE -> CAPTURE URL -> RE-OPEN VIA SEARCH -> CREATE STALE TAB
    S("Close -> URL -> re-open -> stale tab");
    await page.locator('#lseg-footer-close-btn').click(); await waitDrawerClosed(page);
    const listUrl = page.url();
    console.log(`  URL: ${listUrl}`);

    // Re-open via search
    const rs = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await rs.waitFor({ state: "visible", timeout: 10000 }); await rs.clear(); await rs.fill(cleanId);
    await page.keyboard.press("Enter"); await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(page, page.locator('tbody tr').first());
    console.log(`  Re-opened ${cleanId}`);

    // Create stale tab
    const staleTab = await ctx.newPage();
    await staleTab.goto(listUrl); await staleTab.waitForLoadState("networkidle");
    const ss2 = staleTab.locator('input[placeholder*="Search by Record ID"]').first();
    await ss2.waitFor({ state: "visible", timeout: 10000 }); await ss2.fill(cleanId);
    await staleTab.keyboard.press("Enter"); await staleTab.waitForLoadState("networkidle");
    await staleTab.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(staleTab, staleTab.locator('tbody tr').first());
    console.log("  Stale tab open");

    // 4. TAB 1: EDIT -> SUPPRESS ATTRIBUTE -> SUBMIT
    S("Tab 1: EDIT -> suppress alias -> submit");
    await page.bringToFront(); await page.waitForTimeout(1000);

    // Click EDIT
    await page.locator('#lseg-footer-edit-btn').click();
    await page.waitForTimeout(3000);
    console.log("  Edit mode");

    // Scroll to Other names and suppress first alias
    await page.locator('text=Other names').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    await suppressAttribute(page, 0);
    await ss(page, "after-suppress-attr");

    // Click Submit for Approval (force click to bypass any remaining overlay)
    const editSubmit = page.locator('#lseg-footer-submitForApproval-btn');
    await editSubmit.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const b = document.querySelector('#lseg-footer-submitForApproval-btn') as HTMLButtonElement;
      return b && !b.disabled;
    }, { timeout: 10000 });
    await editSubmit.click({ force: true });
    const submitToaster = await toaster(page, "edit-submit");
    await page.waitForLoadState("networkidle").catch(() => {});
    console.log("  Submitted for approval");
    await ss(page, "submitted");

    // 5. APPROVER: CLAIM + APPROVE
    S("Approver: claim + approve");
    const { browser: ab1, page: ap1 } = await approverSession();
    if (!(await findTaskByRecordId(ap1, cleanId))) throw new Error(`Record ${cleanId} not in tasks!`);
    await ap1.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#task-footer-claim-btn').click();
    await ap1.waitForLoadState("networkidle"); await ap1.waitForTimeout(2000);
    await ap1.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#task-footer-approve-btn').click();
    await ap1.locator('#comment-modal-text-field').waitFor({ state: "visible", timeout: 10000 });
    await ap1.locator('#comment-modal-text-field').fill("Approved attr suppress");
    await ap1.waitForTimeout(500);
    await ap1.locator('#comment-modal-submit-btn').waitFor({ state: "visible", timeout: 5000 });
    await ap1.locator('#comment-modal-submit-btn').click();
    await toaster(ap1, "approve"); await ap1.waitForLoadState("networkidle").catch(() => {});
    console.log("  Approved");
    await ab1.close();

    // 6. STALE TAB: EDIT -> SAME SUPPRESS -> EXPECT VERSION CONFLICT
    S("Stale tab: EDIT -> suppress alias -> expect error");
    await staleTab.bringToFront(); await staleTab.waitForTimeout(1000);

    // Click EDIT on stale tab
    const staleEdit = staleTab.locator('#lseg-footer-edit-btn');
    if (await staleEdit.isVisible({ timeout: 5000 }).catch(() => false)) {
      await staleEdit.click();
      await staleTab.waitForTimeout(3000);
      console.log("  Stale: Edit mode");
    } else {
      console.log("  Stale: EDIT not visible (record state changed)");
    }

    // Scroll to Other names and try suppress
    await staleTab.locator('text=Other names').first().scrollIntoViewIfNeeded().catch(() => {});
    await staleTab.waitForTimeout(1000);

    try {
      await suppressAttribute(staleTab, 0);

      // Try submit
      const staleSubmit = staleTab.locator('#lseg-footer-submitForApproval-btn');
      if (await staleSubmit.isVisible({ timeout: 5000 }).catch(() => false)) {
        await staleSubmit.scrollIntoViewIfNeeded();
        await staleSubmit.click();
      }
    } catch (e) {
      console.log(`  Stale suppress error: ${e}`);
    }

    await staleTab.waitForTimeout(3000);
    const staleAlerts = await staleTab.locator('[role="alert"]').allTextContents().catch(() => []);
    console.log(`  Stale alerts: ${JSON.stringify(staleAlerts.map(a => a.trim().substring(0, 100)))}`);
    const hasError = staleAlerts.some(a => a.toLowerCase().includes("updated") || a.toLowerCase().includes("error") || a.toLowerCase().includes("latest version"));
    console.log(`  Version conflict: ${hasError}`);
    await ss(staleTab, "stale-result");

    // 7. RELEASE ATTRIBUTE + APPROVE CLEANUP
    S("Release attribute + approve cleanup");
    await page.bringToFront();
    await page.reload({ waitUntil: "networkidle" });
    const relS = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await relS.waitFor({ state: "visible", timeout: 10000 }); await relS.clear(); await relS.fill(cleanId);
    await page.keyboard.press("Enter"); await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(page, page.locator('tbody tr').first());

    // Click EDIT to enter edit mode
    await page.locator('#lseg-footer-edit-btn').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('#lseg-footer-edit-btn').click();
    await page.waitForTimeout(3000);

    // Scroll to Other names and click the orange hand icon (title="Attribute suppress")
    await page.locator('text=Other names').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const orangeHand = page.locator('.facct-drawer-paper button[title="Attribute suppress"]').first();
    if (await orangeHand.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orangeHand.scrollIntoViewIfNeeded();
      await orangeHand.click({ force: true });
      console.log("  Clicked orange hand (release)");
      await page.waitForTimeout(2000);

      // Click RELEASE in the popup (#hold-enrich-modal-release-btn)
      await page.locator('#hold-enrich-modal-release-btn').waitFor({ state: "visible", timeout: 10000 });
      await page.locator('#hold-enrich-modal-release-btn').click();
      console.log("  Clicked RELEASE in popup");

      // Wait for popup to close
      await page.waitForTimeout(3000);
      await page.evaluate(() => {
        const backdrops = document.querySelectorAll('.MuiBackdrop-root.MuiModal-backdrop');
        backdrops.forEach(b => { const m = b.closest('[role="presentation"]'); if (m && m.classList.contains('facct-modal')) m.remove(); });
      }).catch(() => {});
      await page.waitForTimeout(1000);

      // Submit for Approval
      const editSubmit = page.locator('#lseg-footer-submitForApproval-btn');
      await editSubmit.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const b = document.querySelector('#lseg-footer-submitForApproval-btn') as HTMLButtonElement;
        return b && !b.disabled;
      }, { timeout: 10000 });
      await editSubmit.click({ force: true });
      await toaster(page, "release-submit");
      await page.waitForLoadState("networkidle").catch(() => {});
      console.log("  Release submitted for approval");

      // Approver: approve the release
      const { browser: ab2, page: ap2 } = await approverSession();
      if (await findTaskByRecordId(ap2, cleanId)) {
        await ap2.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
        await ap2.locator('#task-footer-claim-btn').click();
        await ap2.waitForLoadState("networkidle"); await ap2.waitForTimeout(2000);
        await ap2.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
        await ap2.locator('#task-footer-approve-btn').click();
        await ap2.locator('#comment-modal-text-field').waitFor({ state: "visible", timeout: 10000 });
        await ap2.locator('#comment-modal-text-field').fill("Release approved");
        await ap2.waitForTimeout(500);
        await ap2.locator('#comment-modal-submit-btn').waitFor({ state: "visible", timeout: 5000 });
        await ap2.locator('#comment-modal-submit-btn').click();
        await toaster(ap2, "release-approve");
        console.log("  Release approved - attribute clean");
      }
      await ab2.close();
    } else {
      console.log("  No orange hand found - attribute may already be clean");
    }

    S("ATTRIBUTE SUPPRESS FLOW COMPLETE");
    console.log(`  Record: ${cleanId}`);
    console.log(`  Submit toaster: "${submitToaster}"`);
    console.log(`  Stale version conflict: ${hasError}`);

    await staleTab.close().catch(() => {});
    await browser.close();
  } catch (err) {
    console.log(`\nFATAL: ${err}`);
    await ss(page, "error");
    await browser.close().catch(() => {});
  }
})();
