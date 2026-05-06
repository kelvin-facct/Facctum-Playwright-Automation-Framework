/**
 * Debug: Commercial List Configuration — Edit + Attachment + Maker-Checker
 */
import { chromium, Browser, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

let step = 0;
function S(m: string) { step++; console.log(`\n[${step}] ${m}`); }
async function ss(p: Page, n: string) { await p.screenshot({ path: `reports/debug-listcfg-${String(step).padStart(2,"0")}-${n}.png` }).catch(() => {}); }
async function toaster(p: Page, label: string): Promise<string> {
  try { const el = await p.waitForSelector('[role="alert"], .MuiSnackbar-root', { state: "visible", timeout: 8000 }); const t = (await el.textContent()) || ""; console.log(`  Toaster(${label}): "${t.trim().substring(0, 120)}"`); return t.trim(); } catch { console.log(`  No toaster(${label})`); return ""; }
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
  const lc = p.locator('button[aria-label*="LISTS CONFIGURATION"]');
  if (await lc.isVisible({ timeout: 5000 }).catch(() => false)) { await lc.click(); await p.waitForLoadState("networkidle"); }
  await p.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  console.log("  Approver on Tasks > Pending L1 > Lists Configuration");
  return { browser: b, page: p };
}

(async () => {
  const { width, height } = EnvConfig.RESOLUTION;
  const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67'] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  ctx.setDefaultTimeout(60000);
  const page = await ctx.newPage();
  const LIST_NAME = "WC Main Premium";

  try {
    S("Login + navigate to Commercial list");
    await AuthHelper.login(page, { orgId: EnvConfig.ORG_ID, email: EnvConfig.USERNAME, password: EnvConfig.PASSWORD });
    await page.locator('.product-card:has-text("List")').first().click(); await page.waitForLoadState("networkidle");
    await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('span.MuiListItemText-primary:has-text("Watchlist")').click();
    await page.locator('text=Commercial list').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('text=Commercial list').click(); await page.waitForLoadState("networkidle");
    console.log("  On Commercial list page"); await ss(page, "commercial-list");

    S("APPROVED tab + open list config");
    const approvedTab = page.locator('button[role="tab"]:has-text("APPROVED"), button[aria-label*="APPROVED"]').first();
    if (await approvedTab.isVisible({ timeout: 5000 }).catch(() => false)) { await approvedTab.click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(2000); }

    // PRE-CHECK: If list is in PENDING L1, handle it first
    const pendingTabCheck = page.locator('button[role="tab"]:has-text("PENDING L1")').first();
    const pendingText = await pendingTabCheck.textContent().catch(() => "");
    const pendingCount = parseInt((pendingText?.match(/\((\d+)\)/) || [])[1] || "0");
    console.log(`  Pending count: ${pendingCount}`);

    if (pendingCount > 0) {
      console.log("  List may be in pending state — checking...");
      await pendingTabCheck.click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(2000);

      const pendingListRow = page.locator(`tr:has-text("${LIST_NAME}")`).first();
      if (await pendingListRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`  ${LIST_NAME} is in PENDING — approving via approver first`);

        // Approve via approver session from Tasks > LISTS CONFIGURATION
        const { browser: abPre, page: apPre } = await approverSession();
        const preRows = apPre.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
        await preRows.first().waitFor({ state: "visible", timeout: 15000 });
        const preRc = await preRows.count();
        console.log(`  Approver task rows: ${preRc}`);
        for (let i = 0; i < preRc; i++) {
          const rt = await preRows.nth(i).textContent().catch(() => "") || "";
          if (rt.includes(LIST_NAME)) {
            console.log(`  Found ${LIST_NAME} at row ${i}`);
            // Click Overview icon on the row
            const ov = preRows.nth(i).locator('[title="Overview"], button:has(svg)').first();
            if (await ov.isVisible({ timeout: 3000 }).catch(() => false)) await ov.click();
            await apPre.waitForLoadState("networkidle"); await apPre.waitForTimeout(3000);

            // Claim
            await apPre.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
            await apPre.locator('#task-footer-claim-btn').click();
            await apPre.waitForLoadState("networkidle"); await apPre.waitForTimeout(2000);

            // Approve
            await apPre.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
            await apPre.locator('#task-footer-approve-btn').click();
            const cmt = apPre.locator('.comment-modal-wrapper textarea, #comment-modal-text-field').first();
            await cmt.waitFor({ state: "visible", timeout: 10000 });
            await cmt.fill("Pre-approve pending config via automation");
            await apPre.waitForTimeout(500);
            const sub = apPre.locator('.comment-modal-wrapper button:has-text("SUBMIT"), #comment-modal-submit-btn').first();
            await sub.waitFor({ state: "visible", timeout: 5000 });
            await sub.click();
            await toaster(apPre, "pre-approve");
            await apPre.waitForLoadState("networkidle").catch(() => {});
            console.log("  Pre-approved pending config");
            break;
          }
        }
        await abPre.close();

        // Refresh the page and go back to APPROVED tab
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForTimeout(2000);
      }
    }

    // Make sure we're on APPROVED tab
    const approvedTabFinal = page.locator('button[role="tab"]:has-text("APPROVED")').first();
    if (await approvedTabFinal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approvedTabFinal.click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(2000);
    }

    // Capture tabs
    const tabs = page.locator('button[role="tab"]');
    for (let t = 0; t < await tabs.count(); t++) { const txt = await tabs.nth(t).textContent().catch(() => ""); console.log(`  Tab[${t}]: "${txt?.trim()}"`); }
    // Click Overview icon on the list row to open the config shutter
    const listRow = page.locator(`tr:has-text("${LIST_NAME}")`).first();
    await listRow.waitFor({ state: "visible", timeout: 10000 });
    // Overview icon is the first icon button on the row (from screenshot)
    const overviewIcon = listRow.locator('[title="Overview"], button[aria-label="Overview"], svg[data-testid="DescriptionOutlinedIcon"], svg[data-testid="ArticleOutlinedIcon"]').first();
    if (await overviewIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await overviewIcon.click();
    } else {
      // Fallback: try clicking the first icon button in the row's action area
      const actionIcons = listRow.locator('button:has(svg), [role="button"]:has(svg)');
      const iconCount = await actionIcons.count();
      console.log(`  Action icons on row: ${iconCount}`);
      for (let ic = 0; ic < iconCount; ic++) {
        const title = await actionIcons.nth(ic).getAttribute("title").catch(() => "");
        const ariaLabel = await actionIcons.nth(ic).getAttribute("aria-label").catch(() => "");
        const svgId = await actionIcons.nth(ic).locator("svg").first().getAttribute("data-testid").catch(() => "");
        console.log(`    Icon[${ic}]: title="${title}" aria="${ariaLabel}" svg="${svgId}"`);
      }
      // Click the first one (Overview)
      if (iconCount > 0) await actionIcons.first().click();
    }
    await page.waitForLoadState("networkidle"); await page.waitForTimeout(3000);
    console.log("  Config shutter opened"); await ss(page, "config-shutter");

    // Capture shutter buttons
    const shutterBtns = await page.locator('button:visible').evaluateAll(bs => bs.map(b => ({ id: b.id || '', text: b.textContent?.trim().substring(0, 40) || '', aria: b.getAttribute('aria-label') || '' })).filter(b => b.text.includes('EDIT') || b.text.includes('CLOSE') || b.text.includes('LIST') || b.text.includes('FILTER') || b.text.includes('AUDIT') || b.text.includes('SCHEDULE') || b.text.includes('CUSTOMISATION')));
    for (const b of shutterBtns) console.log(`  Btn: id="${b.id}" text="${b.text}" aria="${b.aria}"`);

    S("Click EDIT in shutter");
    await page.locator('button:has-text("EDIT")').first().click(); await page.waitForTimeout(2000);
    // Handle "Are you certain you wish to edit?" confirmation dialog
    const editConfirmBtn = page.locator('[role="dialog"] button:has-text("EDIT"), [role="presentation"] button:has-text("EDIT")').last();
    if (await editConfirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editConfirmBtn.click();
      console.log("  Confirmed edit dialog");
    }
    await page.waitForTimeout(3000);
    console.log("  Edit mode - Step 1"); await ss(page, "edit-step1");

    S("Upload contract file");
    // Scroll down to find the Contract file / Upload area
    await page.locator('text=Contract file').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(1000);
    // The file input may be hidden — try multiple approaches
    const fileInput = page.locator('input[type="file"]').first();
    const fileInputAttached = await fileInput.count() > 0;
    console.log(`  File input found: ${fileInputAttached}`);
    if (fileInputAttached) {
      await fileInput.setInputFiles("src/resources/testData/Test_Sheet.xlsx");
      await page.waitForTimeout(2000);
      console.log("  File uploaded");
    } else {
      // Try clicking UPLOAD FILE button which may trigger a file chooser
      const uploadBtn = page.locator('button:has-text("UPLOAD FILE"), button[aria-label="upload file"]').first();
      if (await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 10000 }),
          uploadBtn.click(),
        ]);
        await fileChooser.setFiles("src/resources/testData/Test_Sheet.xlsx");
        await page.waitForTimeout(2000);
        console.log("  File uploaded via file chooser");
      } else {
        console.log("  No upload mechanism found — skipping file upload");
      }
    }
    await ss(page, "file-uploaded");

    S("NEXT through wizard steps");
    for (let i = 2; i <= 4; i++) {
      const nextBtn = page.locator('button:has-text("NEXT")').first();
      await nextBtn.waitFor({ state: "visible", timeout: 10000 }); await nextBtn.click();
      await page.waitForTimeout(2000);
      console.log(`  Step ${i}`); await ss(page, `step${i}`);
    }

    S("SUBMIT FOR APPROVAL");
    const submitBtn = page.locator('button:has-text("SUBMIT FOR APPROVAL")').first();
    await submitBtn.waitFor({ state: "visible", timeout: 10000 }); await submitBtn.click();
    await page.waitForTimeout(2000);

    // Handle Comments dialog (.comment-modal-wrapper)
    const commentModal = page.locator('.comment-modal-wrapper');
    if (await commentModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Fill comment inside the comment modal
      const commentField = commentModal.locator('textarea').first();
      await commentField.waitFor({ state: "visible", timeout: 5000 });
      await commentField.fill("List config edit via automation debug");
      console.log("  Comment filled");
      await page.waitForTimeout(500);
      // Click SUBMIT inside the comment modal
      const dialogSubmit = commentModal.locator('button:has-text("SUBMIT")').first();
      await dialogSubmit.waitFor({ state: "visible", timeout: 5000 });
      await dialogSubmit.click();
      console.log("  Comment dialog submitted");
      // Wait for the comment modal to close
      await commentModal.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    const submitToaster = await toaster(page, "submit");
    await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(3000);
    console.log("  Submitted"); await ss(page, "submitted");

    S("Verify PENDING L1 tab");
    const pendingTab = page.locator('button[role="tab"]:has-text("PENDING L1"), button[aria-label*="PENDING L1"]').first();
    if (await pendingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pendingTab.click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(2000);
      const isPending = await page.locator(`text=${LIST_NAME}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  ${LIST_NAME} pending: ${isPending}`);
    }
    await ss(page, "pending");

    S("Open pending list + download + audit");
    // Click Overview icon on the pending list row (same pattern as APPROVED tab)
    const pendingRow = page.locator(`tr:has-text("${LIST_NAME}")`).first();
    if (await pendingRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Find and click Overview icon on the row
      const overviewIcon = pendingRow.locator('[title="Overview"], button:has(svg)').first();
      await overviewIcon.click();
      await page.waitForLoadState("networkidle"); await page.waitForTimeout(3000);
      console.log("  Pending list shutter opened");
      await ss(page, "pending-shutter");

      // Capture all visible elements for debugging
      const shutterBtns = await page.locator('button:visible').evaluateAll(bs => bs.map(b => ({
        id: b.id || '', text: b.textContent?.trim().substring(0, 50) || '', aria: b.getAttribute('aria-label') || ''
      })).filter(b => b.text.includes('LIST') || b.text.includes('FILTER') || b.text.includes('AUDIT') || b.text.includes('CLOSE') || b.text.includes('SCHEDULE') || b.text.includes('CUSTOMISATION')));
      for (const b of shutterBtns) console.log(`  Btn: id="${b.id}" text="${b.text}"`);

      // Check for contract file download link (chip with filename)
      const fileChips = page.locator('[class*="chip"], a[download], a:has-text(".pdf"), a:has-text(".xlsx"), a:has-text("Test_Sheet"), a:has-text("dummy")');
      const chipCount = await fileChips.count();
      console.log(`  File chips/links: ${chipCount}`);
      for (let fc = 0; fc < Math.min(chipCount, 5); fc++) {
        const txt = await fileChips.nth(fc).textContent().catch(() => "");
        const vis = await fileChips.nth(fc).isVisible().catch(() => false);
        if (vis && txt?.trim()) console.log(`    [${fc}]: "${txt.trim()}"`);
      }

      // Try downloading the contract file — target the actual file (not tag chips)
      const fileLink = page.locator('a:has-text("Test_Sheet"), a:has-text(".xlsx"), a:has-text(".pdf"), a:has-text("dummy")').first();
      if (await fileLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        const fileName = await fileLink.textContent().catch(() => "");
        console.log(`  Downloading: "${fileName?.trim()}"`);
        try {
          // File may open in new tab — handle both download and popup
          const [newPage] = await Promise.all([
            page.context().waitForEvent('page', { timeout: 10000 }),
            fileLink.click(),
          ]).catch(() => [null]);
          if (newPage) {
            console.log(`  File opened in new tab: ${newPage.url()}`);
            await newPage.close();
            console.log("  Closed new tab");
          }
        } catch {
          console.log("  No new tab or download triggered");
        }
      } else {
        console.log("  No file link found for download");
      }

      // Check AUDIT tab
      const auditTab = page.locator('button:has-text("AUDIT")').first();
      if (await auditTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await auditTab.click(); await page.waitForTimeout(2000);
        const auditText = await page.locator('.facct-drawer-paper, [role="presentation"]').last().textContent().catch(() => "");
        console.log(`  Audit (first 200): "${auditText?.trim().substring(0, 200)}"`);
        await ss(page, "audit");
      }

      // Close the shutter
      const closeBtn = page.locator('#commercial-list-footer-close-btn, button:has-text("CLOSE")').first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click(); await page.waitForTimeout(2000);
      }
    } else {
      console.log("  Pending list row not found");
    }

    S("Approver: Tasks > Lists Configuration > download + approve");
    const { browser: ab, page: ap } = await approverSession();
    const rows = ap.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    await rows.first().waitFor({ state: "visible", timeout: 15000 });
    const rc = await rows.count();
    let found = false;
    console.log(`  Task rows: ${rc}`);
    for (let i = 0; i < rc; i++) {
      const rt = await rows.nth(i).textContent().catch(() => "") || "";
      if (rt.includes(LIST_NAME)) {
        console.log(`  Found ${LIST_NAME} at row ${i}`);
        const rowOverview = rows.nth(i).locator('[title="Overview"], button:has(svg)').first();
        if (await rowOverview.isVisible({ timeout: 3000 }).catch(() => false)) { await rowOverview.click(); }
        else { const kb = rows.nth(i).locator('.kebab-cell svg, td:last-child svg').first(); if (await kb.isVisible({ timeout: 3000 }).catch(() => false)) await kb.click(); }
        await ap.waitForLoadState("networkidle"); await ap.waitForTimeout(3000);
        found = true; break;
      }
    }
    if (found) {
      console.log("  Task list shutter opened"); await ss(ap, "task-shutter");
      const listTab = ap.locator('button:has-text("LIST DETAILS")').first();
      if (await listTab.isVisible({ timeout: 5000 }).catch(() => false)) { await listTab.click(); await ap.waitForTimeout(2000); }
      const tfChips = ap.locator('[class*="chip"]:visible');
      const tfc = await tfChips.count();
      console.log(`  File chips in task: ${tfc}`);
      for (let fc = 0; fc < Math.min(tfc, 5); fc++) { const t = await tfChips.nth(fc).textContent().catch(() => ""); if (t?.trim()) console.log(`    [${fc}]: "${t.trim()}"`); }
      // Try downloading — file opens in new tab
      const taskFileLink = ap.locator('a:has-text(".pdf"), a:has-text(".xlsx"), a:has-text("Test_Sheet"), a:has-text("dummy"), a:has-text("DUMMY")').first();
      if (await taskFileLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        try {
          const [newTab] = await Promise.all([
            ap.context().waitForEvent('page', { timeout: 10000 }),
            taskFileLink.click(),
          ]).catch(() => [null]);
          if (newTab) { console.log(`  File opened: ${newTab.url()}`); await newTab.close(); }
        } catch { console.log("  No download/tab from task"); }
      }
      await ap.locator('#task-footer-claim-btn').waitFor({ state: "visible", timeout: 10000 });
      await ap.locator('#task-footer-claim-btn').click();
      await ap.waitForLoadState("networkidle"); await ap.waitForTimeout(2000);
      console.log("  Claimed");
      await ap.locator('#task-footer-approve-btn').waitFor({ state: "visible", timeout: 10000 });
      await ap.locator('#task-footer-approve-btn').click();
      const appCmt = ap.locator('.comment-modal-wrapper textarea, #comment-modal-text-field').first();
      await appCmt.waitFor({ state: "visible", timeout: 10000 });
      await appCmt.fill("List config approved via debug");
      await ap.waitForTimeout(500);
      const appSub = ap.locator('.comment-modal-wrapper button:has-text("SUBMIT"), #comment-modal-submit-btn').first();
      await appSub.waitFor({ state: "visible", timeout: 5000 });
      await appSub.click();
      await toaster(ap, "approve"); console.log("  Approved");
    } else { console.log(`  ${LIST_NAME} not found in tasks`); }
    await ab.close();

    S("LIST CONFIG FLOW COMPLETE");
    console.log(`  List: ${LIST_NAME}`);
    console.log(`  Submit toaster: "${submitToaster}"`);
    await browser.close();
  } catch (err) {
    console.log(`\nFATAL: ${err}`);
    await ss(page, "error");
    await browser.close().catch(() => {});
  }
})();
