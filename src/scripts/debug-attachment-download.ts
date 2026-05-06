/**
 * Debug: Attachment Download for Record Suppress & Attribute Suppress
 *
 * Finds EXISTING suppressed records and tests attachment download.
 * Records are opened by clicking the record ID link directly (not kebab).
 *
 * Flow (from CSV recording):
 *   1. Login → List Management → Tasks (left nav)
 *   2. Review tab (#simple-tab-4) → COMMERCIAL RECORDS sub-tab → last page
 *   3. Find record suppress + attribute suppress records by Action column
 *   4. Click record ID link (a or div[aria-label]) to open profile drawer
 *   5. Download from .attachment-field (RECORD DETAILS)
 *   6. Download from .download-audit-link (AUDIT tab)
 *   7. For attribute suppress: click hand/enrich icon → popup → download from div[class*='attachment'] span
 *
 * Confirmed selectors (from CSV):
 *   Record ID link:          a[normalize-space()='17'] or div[aria-label='49']
 *   Attachment (details):    .attachment-field
 *   Attachment (audit):      .download-audit-link
 *   Attachment (popup):      div[class*='attachment'] span
 *   AUDIT tab:               #simple-tab-1 or #simple-tab-2 (context-dependent)
 *   RECORD DETAILS tab:      #simple-tab-0 or #simple-tab-1
 *   Review tab:              #simple-tab-4
 *   Orange hand icon:        button[title="Attribute suppress"]
 *   Enriched icon:           button[aria-label='Attribute enriched']
 *   Cancel popup:            #hold-enrich-modal-cancel-btn
 *   Close drawer:            #lseg-footer-close-btn / #task-footer-close-btn
 *   Tasks left nav:          span:has-text("Tasks")
 *   Last page pagination:    pagination button nth(3)
 */
import { chromium, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";
import { ProfileViewPage } from "../pages/ProfileViewPage";
import * as path from "path";
import * as fs from "fs";

const DOWNLOAD_DIR = "reports/debug-downloads";

let step = 0;
function S(m: string) { step++; console.log(`\n${"=".repeat(60)}\n[${step}] ${m}\n${"=".repeat(60)}`); }
async function ss(p: Page, n: string) {
  await p.screenshot({ path: `reports/debug-attach-${String(step).padStart(2, "0")}-${n}.png`, fullPage: true }).catch(() => {});
}

async function waitDrawer(p: Page) {
  await p.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 15000 });
  await p.waitForTimeout(2000);
}

async function waitDrawerClosed(p: Page) {
  await p.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(500);
}

async function closeDrawer(p: Page) {
  for (const sel of ['#task-footer-close-btn', '#lseg-footer-close-btn', '[data-testid="CloseIcon"]']) {
    if (await p.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await p.locator(sel).first().click();
      await waitDrawerClosed(p);
      return;
    }
  }
  await p.keyboard.press("Escape");
  await waitDrawerClosed(p);
}

/**
 * Open a record by clicking its ID link in the table.
 * Tries: a tag with text, div[aria-label], label div with text — all inside td:first-child.
 */
async function clickRecordId(p: Page, recordId: string) {
  // Try <a> link with the record ID text (from commercial list view)
  const aLink = p.locator(`a:text-is("${recordId}")`).first();
  if (await aLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await aLink.click();
    await p.waitForLoadState("networkidle");
    await waitDrawer(p);
    console.log(`  Opened record ${recordId} via <a> link`);
    return;
  }

  // Try div[aria-label] (from tasks view — CSV step 27: div[aria-label='53'])
  const ariaDiv = p.locator(`div[aria-label="${recordId}"]`).first();
  if (await ariaDiv.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ariaDiv.click();
    await p.waitForLoadState("networkidle");
    await waitDrawer(p);
    console.log(`  Opened record ${recordId} via div[aria-label]`);
    return;
  }

  // Try label div text match inside first column
  const labelDiv = p.locator(`td:first-child div label div:text-is("${recordId}")`).first();
  if (await labelDiv.isVisible({ timeout: 3000 }).catch(() => false)) {
    await labelDiv.click();
    await p.waitForLoadState("networkidle");
    await waitDrawer(p);
    console.log(`  Opened record ${recordId} via label div`);
    return;
  }

  throw new Error(`Could not click record ID "${recordId}" — no matching link/div found`);
}

/**
 * Navigate to last page of the table.
 * CSV step 26/36: click the last-page pagination button.
 */
async function goToLastPage(p: Page) {
  const pgBtns = p.locator('button[class*="pagination"]');
  const pgCount = await pgBtns.count();
  console.log(`  Pagination buttons: ${pgCount}`);
  if (pgCount >= 4) {
    const lastBtn = pgBtns.nth(3);
    const tabIndex = await lastBtn.getAttribute("tabindex");
    if (tabIndex !== "-1") {
      await lastBtn.click();
      await p.waitForLoadState("networkidle");
      await p.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
      console.log("  ✅ On last page");
    } else {
      console.log("  Already on last page");
    }
  } else {
    console.log("  Single page or no pagination");
  }
}

/**
 * Switch to a tab by trying multiple selector strategies.
 * For Review tab: #simple-tab-4 (confirmed from CSV step 34).
 * Falls back to aria-label and text match.
 */
async function switchTab(p: Page, label: string, simpleTabId?: string) {
  // Try #simple-tab-N first (most reliable from CSV)
  if (simpleTabId) {
    const idTab = p.locator(`#${simpleTabId}`);
    if (await idTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await idTab.click();
      await p.waitForLoadState("networkidle");
      await p.waitForTimeout(1000);
      console.log(`  Switched to ${label} tab (#${simpleTabId})`);
      return;
    }
  }

  // Try aria-label
  const ariaTab = p.locator(`button[role="tab"][aria-label*="${label}"]`).first();
  if (await ariaTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ariaTab.click();
    await p.waitForLoadState("networkidle");
    await p.waitForTimeout(1000);
    console.log(`  Switched to ${label} tab (aria-label)`);
    return;
  }

  // Try text match
  const textTab = p.locator(`button[role="tab"]:has-text("${label}")`).first();
  if (await textTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await textTab.click();
    await p.waitForLoadState("networkidle");
    await p.waitForTimeout(1000);
    console.log(`  Switched to ${label} tab (text)`);
    return;
  }

  // Log available tabs
  const allTabs = await p.locator('button[role="tab"]').evaluateAll(tabs =>
    tabs.map(t => ({ id: t.id, text: t.textContent?.trim(), ariaLabel: t.getAttribute('aria-label') }))
  );
  console.log(`  ⚠️ Tab "${label}" not found. Available:`);
  for (const t of allTabs) console.log(`    id="${t.id}" text="${t.text}" aria="${t.ariaLabel}"`);
}

/**
 * Scan table rows to find existing suppressed records by Action column.
 * Scans from last row (latest) to first.
 */
async function findExistingSuppressedRecords(p: Page): Promise<{
  recordSuppressId: string; attrSuppressId: string;
}> {
  let recordSuppressId = "", attrSuppressId = "";

  const rows = p.locator("tbody tr.table-row, tbody.MuiTableBody-root tr");
  await rows.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  const count = await rows.count();
  console.log(`  Rows: ${count}`);

  // Debug: dump first row's first cell HTML to understand structure
  if (count > 0) {
    const firstCellHtml = await rows.first().locator('td').first().evaluate(el => el.innerHTML.substring(0, 500)).catch(() => "N/A");
    console.log(`  First cell HTML: ${firstCellHtml}`);
  }

  for (let i = count - 1; i >= 0; i--) {
    const row = rows.nth(i);
    const cells = row.locator('td');
    const cellCount = await cells.count();

    // Record ID from first cell — try multiple patterns
    // CSV shows: <a> tag with ID text, or div[aria-label], or label div
    const firstCell = row.locator('td').first();
    let rid = "";

    // Try <a> tag inside first cell (commercial list view: a[normalize-space()='17'])
    const aTag = firstCell.locator('a').first();
    if (await aTag.count() > 0) {
      rid = (await aTag.textContent().catch(() => "") || "").trim();
    }

    // Try div[aria-label] (tasks view: div[aria-label='49'])
    if (!rid) {
      const ariaDiv = firstCell.locator('div[aria-label]').first();
      if (await ariaDiv.count() > 0) {
        rid = (await ariaDiv.getAttribute("aria-label").catch(() => "") || "").trim();
        if (!rid) rid = (await ariaDiv.textContent().catch(() => "") || "").trim();
      }
    }

    // Try label div
    if (!rid) {
      const labelDiv = firstCell.locator('div label div, label div').first();
      if (await labelDiv.count() > 0) {
        rid = (await labelDiv.textContent().catch(() => "") || "").trim();
        if (!rid) rid = (await labelDiv.getAttribute("aria-label").catch(() => "") || "").trim();
      }
    }

    // Last resort: just get the first cell text and extract a number
    if (!rid) {
      const cellText = (await firstCell.textContent().catch(() => "") || "").trim();
      const numMatch = cellText.match(/\d+/);
      if (numMatch) rid = numMatch[0];
    }

    // Action column (3rd column)
    let action = "";
    if (cellCount > 2) action = (await cells.nth(2).textContent().catch(() => "") || "").trim();
    const actionLower = action.toLowerCase();

    if (!recordSuppressId && actionLower.includes("suppress") && !actionLower.includes("attribute") && !actionLower.includes("enrich")) {
      recordSuppressId = rid;
      console.log(`  ✅ Record suppress: ID="${rid}", action="${action}"`);
    }
    if (!attrSuppressId && (actionLower.includes("attribute") || actionLower.includes("enrich"))) {
      attrSuppressId = rid;
      console.log(`  ✅ Attr suppress/enrich: ID="${rid}", action="${action}"`);
    }
    if (i >= count - 5) console.log(`  Row ${i}: ID="${rid}" action="${action}"`);
    if (recordSuppressId && attrSuppressId) break;
  }

  return { recordSuppressId, attrSuppressId };
}

// ==================== TEST FUNCTIONS ====================

async function testRecordAttachmentDownloads(
  p: Page, recordId: string, prefix: string,
  results: { test: string; status: string; details: string }[]
) {
  const pv = new ProfileViewPage(p);

  // Scan all downloadable elements for diagnostics
  await pv.scanAllDownloadableElements();

  // Try downloading from all attachment links on the current tab (REQUEST FOR REVIEW or RECORD DETAILS)
  const allDl = await pv.downloadAllAttachmentsFromDetails();
  if (allDl.length > 0) {
    const fileList = allDl.map(d => `${d.filename}(${d.size}b)`).join(", ");
    const allMatch = allDl.every(d => d.filenameMatch);
    const mismatches = allDl.filter(d => !d.filenameMatch).map(d => `displayed="${d.displayedName}" got="${d.filename}"`);
    results.push({
      test: `${prefix}: Download from profile details`,
      status: allMatch ? "PASS" : "FAIL",
      details: allMatch
        ? `${allDl.length} file(s): ${fileList}`
        : `${allDl.length} file(s) but filename mismatch: ${mismatches.join("; ")}`,
    });
  } else {
    const toaster = await pv.captureToaster("details-download-fail");
    results.push({
      test: `${prefix}: Download from profile details`,
      status: "INVESTIGATE",
      details: `No downloads. Toaster: ${toaster.join("; ") || "none"}`,
    });
  }
  await ss(p, `${prefix}-details`);

  // AUDIT — .download-audit-link
  await pv.clickAuditTab();
  await ss(p, `${prefix}-audit`);

  const dlAudit = await pv.downloadAttachmentFromAudit();
  const auditToaster = await pv.captureToaster("AUDIT click");
  if (dlAudit) {
    results.push({
      test: `${prefix}: Download from AUDIT (.download-audit-link)`,
      status: dlAudit.filenameMatch ? "PASS" : "FAIL",
      details: dlAudit.filenameMatch
        ? `File: ${dlAudit.filename} (${dlAudit.size} bytes)`
        : `Filename mismatch: displayed="${dlAudit.displayedName}" downloaded="${dlAudit.filename}" (${dlAudit.size} bytes)`,
    });
  } else {
    results.push({
      test: `${prefix}: Download from AUDIT (.download-audit-link)`,
      status: "INVESTIGATE",
      details: `No download event. Toaster: ${auditToaster.join("; ") || "none"}`,
    });
  }

  await pv.clickRecordDetailsTab();
}

async function testAttrSuppressAttachmentDownloads(
  p: Page, recordId: string, prefix: string,
  results: { test: string; status: string; details: string }[]
) {
  const pv = new ProfileViewPage(p);

  // Scan all downloadable elements for diagnostics
  await pv.scanAllDownloadableElements();

  // Log attribute icon counts
  const icons = await pv.getAttributeIconCount();
  console.log(`  Attribute icons — orange: ${icons.orange}, blue: ${icons.blue}, enriched: ${icons.enriched}, enrich: ${icons.enrich}, suppressedSvg: ${icons.suppressedSvg}, enrichedSvg: ${icons.enrichedSvg}`);

  // Try downloading from all attachment links on the current tab first
  const allDl = await pv.downloadAllAttachmentsFromDetails();
  if (allDl.length > 0) {
    const fileList = allDl.map(d => `${d.filename}(${d.size}b)`).join(", ");
    const allMatch = allDl.every(d => d.filenameMatch);
    const mismatches = allDl.filter(d => !d.filenameMatch).map(d => `displayed="${d.displayedName}" got="${d.filename}"`);
    results.push({
      test: `${prefix}: Download from profile details (all links)`,
      status: allMatch ? "PASS" : "FAIL",
      details: allMatch
        ? `${allDl.length} file(s): ${fileList}`
        : `${allDl.length} file(s) but filename mismatch: ${mismatches.join("; ")}`,
    });
  } else {
    // If no downloads from details, try opening attribute popup
    const popupOpened = await pv.openSuppressedAttributePopup();
    await ss(p, `${prefix}-popup`);

    if (popupOpened) {
      const dlPopup = await pv.downloadAttachmentFromPopup();
      const popupToaster = await pv.captureToaster("popup download");
      if (dlPopup) {
        results.push({
          test: `${prefix}: Download from attribute popup`,
          status: dlPopup.filenameMatch ? "PASS" : "FAIL",
          details: dlPopup.filenameMatch
            ? `File: ${dlPopup.filename} (${dlPopup.size} bytes)`
            : `Filename mismatch: displayed="${dlPopup.displayedName}" downloaded="${dlPopup.filename}" (${dlPopup.size} bytes)`,
        });
      } else {
        results.push({
          test: `${prefix}: Download from attribute popup`,
          status: "INVESTIGATE",
          details: `No download event. Toaster: ${popupToaster.join("; ") || "none"}`,
        });
      }
      await pv.closeAttributePopup();
    } else {
      results.push({
        test: `${prefix}: Download from details/popup`,
        status: "INVESTIGATE",
        details: `No downloads from details, no icon found (orange=${icons.orange} blue=${icons.blue} enriched=${icons.enriched} enrich=${icons.enrich} suppressedSvg=${icons.suppressedSvg} enrichedSvg=${icons.enrichedSvg})`,
      });
    }
  }

  // AUDIT — .download-audit-link
  await pv.clickAuditTab();
  await ss(p, `${prefix}-audit`);

  const dlAudit = await pv.downloadAttachmentFromAudit();
  const attrAuditToaster = await pv.captureToaster("attr AUDIT click");
  if (dlAudit) {
    results.push({
      test: `${prefix}: Download from AUDIT (.download-audit-link)`,
      status: dlAudit.filenameMatch ? "PASS" : "FAIL",
      details: dlAudit.filenameMatch
        ? `File: ${dlAudit.filename} (${dlAudit.size} bytes)`
        : `Filename mismatch: displayed="${dlAudit.displayedName}" downloaded="${dlAudit.filename}" (${dlAudit.size} bytes)`,
    });
  } else {
    results.push({
      test: `${prefix}: Download from AUDIT (.download-audit-link)`,
      status: "INVESTIGATE",
      details: `No download event. Toaster: ${attrAuditToaster.join("; ") || "none"}`,
    });
  }
}

// ==================== MAIN ====================
(async () => {
  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const { width, height } = EnvConfig.RESOLUTION;
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67'],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  ctx.setDefaultTimeout(60000);
  const page = await ctx.newPage();

  const results: { test: string; status: string; details: string }[] = [];

  try {
    // ============================================================
    // Login → List Management → Tasks
    // ============================================================
    S("Login → List Management → Tasks");
    await AuthHelper.login(page, {
      orgId: EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID,
      email: EnvConfig.APPROVER_USERNAME,
      password: EnvConfig.APPROVER_PASSWORD,
    });
    console.log("  Logged in");

    await page.locator('.product-card:has-text("List")').first().click();
    await page.waitForLoadState("networkidle");

    // Tasks in left nav
    const tasksNav = page.locator('span.MuiListItemText-primary:has-text("Tasks"), span:text-is("Tasks")').first();
    await tasksNav.waitFor({ state: "visible", timeout: 10000 });
    await tasksNav.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    console.log("  On Tasks page");

    // ============================================================
    // PART A: Pending L1 (default tab) — suppressed records are here
    // ============================================================
    S("PART A: Pending L1 → COMMERCIAL RECORDS → last page");
    await ss(page, "tasks-page");

    // Pending L1 is the default tab — click explicitly to be safe
    await switchTab(page, "Pending L1", "simple-tab-0");

    // Try COMMERCIAL RECORDS sub-tab (may not exist in all envs)
    const commTab = page.locator('button[role="tab"][aria-label*="COMMERCIAL RECORDS"]').first();
    if (await commTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commTab.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      console.log("  Switched to COMMERCIAL RECORDS sub-tab");
    } else {
      console.log("  COMMERCIAL RECORDS sub-tab not found, using default");
    }

    await goToLastPage(page);
    await ss(page, "pending-l1-last-page");

    S("Find existing suppressed records on Pending L1");
    const found = await findExistingSuppressedRecords(page);
    console.log(`\n  Record suppress: ${found.recordSuppressId || "NOT FOUND"}`);
    console.log(`  Attr suppress:   ${found.attrSuppressId || "NOT FOUND"}`);

    // ============================================================
    // PART B: Record Suppress — click ID → profile → download
    // ============================================================
    if (found.recordSuppressId) {
      S(`PART B: Record suppress (${found.recordSuppressId}) — click ID to open`);
      await clickRecordId(page, found.recordSuppressId);
      await ss(page, "B-rec-profile");

      await testRecordAttachmentDownloads(page, found.recordSuppressId, "B-RecSupp", results);

      // Close + re-open to verify persistence
      S("B: Verify attachment persists after re-open");
      await closeDrawer(page);
      await clickRecordId(page, found.recordSuppressId);
      const pv = new ProfileViewPage(page);
      const stillVis = await pv.isAttachmentVisible();
      results.push({
        test: "B-RecSupp: Attachment persists after re-open",
        status: stillVis ? "PASS" : "INVESTIGATE",
        details: stillVis ? "Attachment still visible" : "Not found after re-open",
      });
      await closeDrawer(page);
    } else {
      results.push({ test: "B: Record suppress", status: "SKIP", details: "Not found on Pending L1" });
    }

    // ============================================================
    // PART C: Attribute Suppress — click ID → profile → icon → popup → download
    // ============================================================
    if (found.attrSuppressId) {
      S(`PART C: Attr suppress (${found.attrSuppressId}) — click ID to open`);
      await clickRecordId(page, found.attrSuppressId);
      await ss(page, "C-attr-profile");

      await testAttrSuppressAttachmentDownloads(page, found.attrSuppressId, "C-AttrSupp", results);
      await closeDrawer(page);
    } else {
      results.push({ test: "C: Attribute suppress", status: "SKIP", details: "Not found on Pending L1" });
    }

    // ============================================================
    // PART D: Review tab — try same tests (records may differ)
    // ============================================================
    S("PART D: Review tab → last page → previous page if needed");
    await switchTab(page, "Review", "simple-tab-4");

    // Wait for skeleton loaders to disappear (Review tab loads data async)
    await page.locator('.MuiSkeleton-root').first().waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await goToLastPage(page);

    // Check if rows have data — if skeleton or empty, go to previous page
    const reviewRows = page.locator("tbody tr.table-row, tbody.MuiTableBody-root tr");
    await reviewRows.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const firstCellCheck = await reviewRows.first().locator('td').first().textContent().catch(() => "") || "";
    const hasSkeleton = await page.locator('.MuiSkeleton-root').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (!firstCellCheck.trim() || hasSkeleton) {
      console.log("  Last page has empty/skeleton rows — navigating to previous page");
      const pgBtns = page.locator('button[class*="pagination"]');
      const pgCount = await pgBtns.count();
      if (pgCount >= 4) {
        // pgBtns.nth(2) = single arrow left (previous page)
        const prevBtn = pgBtns.nth(2);
        const tabIndex = await prevBtn.getAttribute("tabindex");
        if (tabIndex !== "-1") {
          await prevBtn.click();
          await page.waitForLoadState("networkidle");
          await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
          await page.waitForTimeout(1000);
          console.log("  ✅ On previous page");
        }
      }
    }

    await ss(page, "D-review-page");

    const reviewFound = await findExistingSuppressedRecords(page);
    console.log(`\n  Record suppress: ${reviewFound.recordSuppressId || "NOT FOUND"}`);
    console.log(`  Attr suppress:   ${reviewFound.attrSuppressId || "NOT FOUND"}`);

    if (reviewFound.recordSuppressId) {
      S(`D: Record suppress (${reviewFound.recordSuppressId}) — Review tab`);
      await clickRecordId(page, reviewFound.recordSuppressId);
      await ss(page, "D-rec-profile");
      await testRecordAttachmentDownloads(page, reviewFound.recordSuppressId, "D-Review-RecSupp", results);
      await closeDrawer(page);
    } else {
      results.push({ test: "D: Record suppress in Review", status: "SKIP", details: "Not found" });
    }

    if (reviewFound.attrSuppressId) {
      S(`D: Attr suppress (${reviewFound.attrSuppressId}) — Review tab`);
      await clickRecordId(page, reviewFound.attrSuppressId);
      await ss(page, "D-attr-profile");
      await testAttrSuppressAttachmentDownloads(page, reviewFound.attrSuppressId, "D-Review-AttrSupp", results);
      await closeDrawer(page);
    } else {
      results.push({ test: "D: Attr suppress in Review", status: "SKIP", details: "Not found" });
    }

    // ============================================================
    // PART E: Validate downloads
    // ============================================================
    S("PART E: Validate downloaded files");
    const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => !f.endsWith('.json'));
    let allOk = true;
    for (const f of files) {
      const sz = fs.statSync(path.join(DOWNLOAD_DIR, f)).size;
      if (sz === 0) allOk = false;
      console.log(`  ${sz > 0 ? "✅" : "❌"} ${f}: ${sz} bytes`);
    }
    results.push({
      test: "E: All downloads non-zero",
      status: files.length > 0 && allOk ? "PASS" : files.length === 0 ? "SKIP" : "FAIL",
      details: `${files.length} files`,
    });

    // ============================================================
    // SUMMARY
    // ============================================================
    S("✅ COMPLETE");
    console.log("\n" + "=".repeat(70));
    console.log("  RESULTS");
    console.log("=".repeat(70));
    let pass = 0, fail = 0, inv = 0, skip = 0;
    for (const r of results) {
      const ic = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : r.status === "SKIP" ? "⏭️" : "🔍";
      console.log(`  ${ic} [${r.status.padEnd(11)}] ${r.test}`);
      console.log(`${"".padEnd(19)}${r.details}`);
      if (r.status === "PASS") pass++; else if (r.status === "FAIL") fail++; else if (r.status === "INVESTIGATE") inv++; else skip++;
    }
    console.log(`\n  Total: ${results.length} | ✅ ${pass} | ❌ ${fail} | 🔍 ${inv} | ⏭️ ${skip}`);
    console.log("=".repeat(70));

    fs.writeFileSync(path.join(DOWNLOAD_DIR, "test-results.json"), JSON.stringify({
      timestamp: new Date().toISOString(), pendingL1: found, review: reviewFound, results,
      summary: { total: results.length, pass, fail, investigate: inv, skip },
    }, null, 2));

    await browser.close();
  } catch (err) {
    console.log(`\n❌ FATAL: ${err}`);
    await ss(page, "fatal-error");
    if (results.length > 0) {
      console.log("\n  PARTIAL RESULTS:");
      for (const r of results) console.log(`  [${r.status}] ${r.test}: ${r.details}`);
    }
    await browser.close().catch(() => {});
    process.exit(1);
  }
})();
