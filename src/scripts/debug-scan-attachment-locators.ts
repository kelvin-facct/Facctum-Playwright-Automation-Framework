/**
 * Diagnostic: Scan page for all attachment/download locators
 *
 * Opens an existing suppressed record from Tasks → Review tab and dumps
 * every element that could be an attachment download trigger from:
 *   1. RECORD DETAILS section
 *   2. AUDIT tab
 *   3. Attribute suppress popup (after clicking hand/enrich icon in edit mode)
 *
 * Output: Console logs + screenshots + JSON dump of all found elements
 */
import { chromium, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";
import * as fs from "fs";

let step = 0;
function S(m: string) { step++; console.log(`\n${"=".repeat(60)}\n[${step}] ${m}\n${"=".repeat(60)}`); }
async function ss(p: Page, n: string) {
  await p.screenshot({ path: `reports/debug-scan-${String(step).padStart(2, "0")}-${n}.png`, fullPage: true }).catch(() => {});
}

/** Scan ALL elements inside a container and log everything potentially attachment-related */
async function scanContainer(p: Page, containerSelector: string, label: string): Promise<any[]> {
  console.log(`\n  ========== SCANNING: ${label} (${containerSelector}) ==========`);

  const results = await p.evaluate((sel) => {
    const container = document.querySelector(sel);
    if (!container) return [{ error: `Container "${sel}" not found` }];

    const found: any[] = [];

    // 1. ALL <a> tags
    container.querySelectorAll('a').forEach((a, i) => {
      const rect = a.getBoundingClientRect();
      found.push({
        category: 'LINK',
        index: i,
        tag: 'a',
        text: a.textContent?.trim().substring(0, 100) || '',
        href: a.getAttribute('href')?.substring(0, 150) || '',
        download: a.getAttribute('download') || '',
        target: a.getAttribute('target') || '',
        title: a.getAttribute('title') || '',
        className: a.className?.substring(0, 80) || '',
        id: a.id || '',
        ariaLabel: a.getAttribute('aria-label') || '',
        visible: (a as HTMLElement).offsetParent !== null,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      });
    });

    // 2. ALL <button> tags
    container.querySelectorAll('button').forEach((btn, i) => {
      const svg = btn.querySelector('svg');
      const rect = btn.getBoundingClientRect();
      found.push({
        category: 'BUTTON',
        index: i,
        tag: 'button',
        text: btn.textContent?.trim().substring(0, 80) || '',
        id: btn.id || '',
        title: btn.getAttribute('title') || '',
        ariaLabel: btn.getAttribute('aria-label') || '',
        className: btn.className?.substring(0, 80) || '',
        disabled: (btn as HTMLButtonElement).disabled,
        svgTestId: svg?.getAttribute('data-testid') || '',
        svgClass: svg?.getAttribute('class')?.substring(0, 60) || '',
        visible: (btn as HTMLElement).offsetParent !== null,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      });
    });

    // 3. ALL <svg> with data-testid
    container.querySelectorAll('svg[data-testid]').forEach((svg, i) => {
      const testId = svg.getAttribute('data-testid') || '';
      const parent = svg.parentElement;
      found.push({
        category: 'SVG',
        index: i,
        testId,
        parentTag: parent?.tagName || '',
        parentId: parent?.id || '',
        parentTitle: parent?.getAttribute('title') || '',
        parentAriaLabel: parent?.getAttribute('aria-label') || '',
        parentClass: parent?.className?.substring(0, 60) || '',
        color: getComputedStyle(svg).color,
        fill: svg.getAttribute('fill') || '',
        visible: (svg as unknown as HTMLElement).offsetParent !== null || (parent as HTMLElement)?.offsetParent !== null,
      });
    });

    // 4. ALL elements with class containing: chip, badge, attachment, file, download
    const keywords = ['chip', 'badge', 'attachment', 'file', 'download', 'upload'];
    container.querySelectorAll('*').forEach((el) => {
      const cls = el.className?.toString() || '';
      const clsLower = cls.toLowerCase();
      if (keywords.some(k => clsLower.includes(k))) {
        found.push({
          category: 'CLASS_MATCH',
          tag: el.tagName,
          text: el.textContent?.trim().substring(0, 100) || '',
          className: cls.substring(0, 100),
          id: (el as HTMLElement).id || '',
          visible: (el as HTMLElement).offsetParent !== null,
        });
      }
    });

    // 5. ALL <input type="file">
    container.querySelectorAll('input[type="file"]').forEach((inp, i) => {
      found.push({
        category: 'FILE_INPUT',
        index: i,
        id: (inp as HTMLElement).id || '',
        name: inp.getAttribute('name') || '',
        accept: inp.getAttribute('accept') || '',
        className: inp.className?.substring(0, 60) || '',
      });
    });

    // 6. ALL elements with "download" or "attachment" in any attribute
    container.querySelectorAll('[download], [href*="download"], [href*="attachment"], [aria-label*="download"], [aria-label*="attachment"], [title*="download"], [title*="Download"], [title*="attachment"]').forEach((el, i) => {
      found.push({
        category: 'ATTR_MATCH',
        index: i,
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 80) || '',
        href: el.getAttribute('href')?.substring(0, 100) || '',
        download: el.getAttribute('download') || '',
        title: el.getAttribute('title') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        className: el.className?.toString().substring(0, 80) || '',
        visible: (el as HTMLElement).offsetParent !== null,
      });
    });

    return found;
  }, containerSelector).catch((err) => [{ error: String(err) }]);

  // Print results grouped by category
  const categories = [...new Set(results.map((r: any) => r.category))];
  for (const cat of categories) {
    const items = results.filter((r: any) => r.category === cat);
    console.log(`\n  --- ${cat} (${items.length}) ---`);
    for (const item of items) {
      const { category, ...rest } = item;
      console.log(`    ${JSON.stringify(rest)}`);
    }
  }

  console.log(`\n  Total elements found: ${results.length}`);
  return results;
}

/** Scan a popup/modal for attachment elements */
async function scanPopup(p: Page, label: string): Promise<any[]> {
  // Find the last visible facct-modal
  const modalCount = await p.locator('[role="presentation"].facct-modal').count();
  if (modalCount === 0) {
    console.log(`  No .facct-modal found for ${label}`);
    // Try generic dialog
    const dialogCount = await p.locator('[role="dialog"], .MuiDialog-root, .MuiModal-root').count();
    if (dialogCount > 0) {
      return await scanContainer(p, '[role="dialog"], .MuiDialog-root, .MuiModal-root', label);
    }
    return [];
  }
  // Use nth to target the last modal (topmost)
  const selector = `[role="presentation"].facct-modal >> nth=${modalCount - 1}`;
  // Can't use >> nth in evaluate, use a different approach
  return await p.evaluate((count) => {
    const modals = document.querySelectorAll('[role="presentation"].facct-modal');
    const modal = modals[count - 1];
    if (!modal) return [{ error: 'Modal not found' }];

    const found: any[] = [];

    // Scan all elements inside the modal
    modal.querySelectorAll('*').forEach((el) => {
      const tag = el.tagName;
      const text = el.textContent?.trim().substring(0, 100) || '';
      const cls = el.className?.toString().substring(0, 80) || '';
      const id = (el as HTMLElement).id || '';
      const href = el.getAttribute('href')?.substring(0, 100) || '';
      const title = el.getAttribute('title') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const download = el.getAttribute('download') || '';
      const testId = el.getAttribute('data-testid') || '';
      const visible = (el as HTMLElement).offsetParent !== null;

      // Only log interesting elements
      if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'SVG' ||
          download || href.includes('download') || href.includes('attachment') || href.includes('blob') ||
          title.toLowerCase().includes('download') || ariaLabel.toLowerCase().includes('download') ||
          cls.toLowerCase().includes('chip') || cls.toLowerCase().includes('file') ||
          cls.toLowerCase().includes('attach') || cls.toLowerCase().includes('download') ||
          testId.toLowerCase().includes('download') || testId.toLowerCase().includes('file')) {
        found.push({ tag, text: text.substring(0, 60), cls, id, href, title, ariaLabel, download, testId, visible });
      }
    });

    return found;
  }, modalCount).catch((err) => [{ error: String(err) }]);
}

// ==================== MAIN ====================
(async () => {
  const { width, height } = EnvConfig.RESOLUTION;
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67'],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(60000);
  const page = await ctx.newPage();

  const allResults: Record<string, any[]> = {};

  try {
    // 1. LOGIN → TASKS → REVIEW → COMMERCIAL RECORDS
    S("Login as approver → Tasks → Review → Commercial Records");
    await AuthHelper.login(page, {
      orgId: EnvConfig.APPROVER_ORG_ID || EnvConfig.ORG_ID,
      email: EnvConfig.APPROVER_USERNAME,
      password: EnvConfig.APPROVER_PASSWORD,
    });
    console.log("  Logged in");

    await page.locator('.product-card:has-text("List")').first().click();
    await page.waitForLoadState("networkidle");
    await page.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span')
      .waitFor({ state: "visible", timeout: 10000 });
    await page.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span').click();
    await page.waitForLoadState("networkidle");

    // Review tab
    const reviewTab = page.locator('button[role="tab"][aria-label*="Review"]');
    if (await reviewTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reviewTab.click();
      await page.waitForLoadState("networkidle");
    }
    // Commercial Records sub-tab
    const commTab = page.locator('button[role="tab"][aria-label*="COMMERCIAL RECORDS"]');
    if (await commTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commTab.click();
      await page.waitForLoadState("networkidle");
    }
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    await ss(page, "review-tab");

    // 2. GO TO LAST PAGE → FIND LATEST SUPPRESSED RECORDS
    S("Navigate to last page → find latest suppressed records");

    // Go to last page (latest records) — same pattern as debug-ser-e2e.ts
    const pgBtns = page.locator('button[class*="pagination"]');
    const pgCount = await pgBtns.count();
    console.log(`  Pagination buttons: ${pgCount}`);
    if (pgCount >= 4) {
      const lastBtn = pgBtns.nth(3);
      const tabIndex = await lastBtn.getAttribute("tabindex");
      if (tabIndex !== "-1") {
        await lastBtn.click();
        await page.waitForLoadState("networkidle");
        await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
        console.log("  ✅ Navigated to last page");
      } else {
        console.log("  Already on last page (button disabled)");
      }
    } else {
      console.log("  Single page or no pagination");
    }

    const rows = page.locator("tbody tr.table-row, tbody.MuiTableBody-root tr");
    const rowCount = await rows.count();
    console.log(`  Rows on last page: ${rowCount}`);

    // Log headers
    const headers = await page.locator('thead th').allTextContents().catch(() => []);
    console.log(`  Headers: ${headers.map(h => h.trim()).join(" | ")}`);

    let recordSuppressIdx = -1;
    let attrSuppressIdx = -1;

    // Scan from bottom (latest) to top
    for (let i = rowCount - 1; i >= 0; i--) {
      const row = rows.nth(i);
      const cells = row.locator('td');
      const cellCount = await cells.count();
      const labelDiv = row.locator("td:first-child div label div, td:first-child label div").first();
      const rid = (await labelDiv.textContent().catch(() => "") || "").trim() ||
                  (await labelDiv.getAttribute("aria-label").catch(() => "") || "").trim();
      let action = "";
      if (cellCount > 2) action = (await cells.nth(2).textContent().catch(() => "") || "").trim();
      const actionLower = action.toLowerCase();

      console.log(`  Row ${i}: ID="${rid}" action="${action}"`);

      if (recordSuppressIdx === -1 && actionLower.includes("suppress") && !actionLower.includes("attribute") && !actionLower.includes("enrich")) {
        recordSuppressIdx = i;
        console.log(`  ✅ Record suppress found at row ${i}`);
      }
      if (attrSuppressIdx === -1 && (actionLower.includes("attribute") || actionLower.includes("enrich"))) {
        attrSuppressIdx = i;
        console.log(`  ✅ Attribute suppress found at row ${i}`);
      }
      if (recordSuppressIdx >= 0 && attrSuppressIdx >= 0) break;
    }

    // 3. SCAN RECORD SUPPRESS — RECORD DETAILS
    if (recordSuppressIdx >= 0) {
      S("Open record suppress → scan RECORD DETAILS");
      // On Tasks page, kebab click directly opens the drawer (no context menu)
      await rows.nth(recordSuppressIdx).locator('.kebab-cell svg, td:last-child svg').first().click();
      await page.waitForLoadState("networkidle");
      await page.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 15000 });
      await page.waitForTimeout(2000);
      await ss(page, "rec-suppress-record-details");

      allResults["RECORD_SUPPRESS__RECORD_DETAILS"] = await scanContainer(page, '.facct-drawer-paper', 'Record Suppress — RECORD DETAILS');

      // 4. SCAN RECORD SUPPRESS — AUDIT TAB
      S("Click AUDIT tab → scan");
      const auditTab = page.locator('button[aria-label="AUDIT"]').first();
      if (await auditTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await auditTab.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
        await ss(page, "rec-suppress-audit");

        allResults["RECORD_SUPPRESS__AUDIT"] = await scanContainer(page, '.facct-drawer-paper', 'Record Suppress — AUDIT');
      }

      // Close drawer
      const closeBtn = page.locator('#task-footer-close-btn, #lseg-footer-close-btn').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await page.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
      }
      await page.waitForTimeout(500);
    } else {
      console.log("  ⚠️ No record suppress found — skipping");
    }

    // 5. SCAN ATTRIBUTE SUPPRESS — RECORD DETAILS + EDIT MODE + POPUP
    if (attrSuppressIdx >= 0) {
      S("Open attribute suppress → scan RECORD DETAILS");
      // On Tasks page, kebab click directly opens the drawer (no context menu)
      await rows.nth(attrSuppressIdx).locator('.kebab-cell svg, td:last-child svg').first().click();
      await page.waitForLoadState("networkidle");
      await page.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 15000 });
      await page.waitForTimeout(2000);
      await ss(page, "attr-suppress-record-details");

      allResults["ATTR_SUPPRESS__RECORD_DETAILS"] = await scanContainer(page, '.facct-drawer-paper', 'Attr Suppress — RECORD DETAILS');

      // AUDIT tab
      S("Attr suppress → AUDIT tab → scan");
      const auditTab2 = page.locator('button[aria-label="AUDIT"]').first();
      if (await auditTab2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await auditTab2.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
        await ss(page, "attr-suppress-audit");

        allResults["ATTR_SUPPRESS__AUDIT"] = await scanContainer(page, '.facct-drawer-paper', 'Attr Suppress — AUDIT');
      }

      // Switch back to RECORD DETAILS, then EDIT mode
      S("Attr suppress → EDIT mode → scan icons + popup");
      const recordTab = page.locator('button[aria-label="RECORD DETAILS"]').first();
      if (await recordTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await recordTab.click();
        await page.waitForTimeout(1000);
      }

      const editBtn = page.locator('#lseg-footer-edit-btn, #task-footer-edit-btn').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(3000);
        console.log("  Entered edit mode");

        // Scroll to Other names
        await page.locator('text=Other names').first().scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(1000);
        await ss(page, "attr-suppress-edit-mode");

        allResults["ATTR_SUPPRESS__EDIT_MODE"] = await scanContainer(page, '.facct-drawer-paper', 'Attr Suppress — EDIT MODE (icons)');

        // Try clicking orange hand icon
        const orangeHand = page.locator('.facct-drawer-paper button[title="Attribute suppress"]').first();
        const blueHand = page.locator('.facct-drawer-paper button[title="Attribute suppress request"]').first();
        const enrichIcon = page.locator('.facct-drawer-paper svg[data-testid="AddCircleOutlineIcon"]').first();

        let popupOpened = false;
        if (await orangeHand.isVisible({ timeout: 3000 }).catch(() => false)) {
          await orangeHand.scrollIntoViewIfNeeded();
          await orangeHand.click({ force: true });
          console.log("  Clicked orange hand icon");
          popupOpened = true;
        } else if (await blueHand.isVisible({ timeout: 3000 }).catch(() => false)) {
          await blueHand.scrollIntoViewIfNeeded();
          await blueHand.click({ force: true });
          console.log("  Clicked blue hand icon");
          popupOpened = true;
        } else if (await enrichIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
          await enrichIcon.click();
          console.log("  Clicked enrich icon");
          popupOpened = true;
        } else {
          console.log("  ⚠️ No attribute icon found to click");
        }

        if (popupOpened) {
          await page.waitForTimeout(2000);
          await ss(page, "attr-suppress-popup");

          console.log("\n  ========== SCANNING: Attribute Popup ==========");
          const popupResults = await scanPopup(page, 'Attr Suppress — POPUP');
          allResults["ATTR_SUPPRESS__POPUP"] = popupResults;
          for (const item of popupResults) {
            console.log(`    ${JSON.stringify(item)}`);
          }
        }
      } else {
        console.log("  ⚠️ EDIT button not visible");
      }
    } else {
      console.log("  ⚠️ No attribute suppress found — skipping");
    }

    // SAVE ALL RESULTS
    S("Save scan results");
    const outputPath = "reports/debug-scan-locators.json";
    fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
    console.log(`\n  ✅ Full scan results saved to: ${outputPath}`);
    console.log(`  Screenshots saved to: reports/debug-scan-*.png`);

    // Print summary of what was found
    console.log("\n  ========== SUMMARY ==========");
    for (const [section, items] of Object.entries(allResults)) {
      const links = items.filter((i: any) => i.category === 'LINK').length;
      const buttons = items.filter((i: any) => i.category === 'BUTTON').length;
      const svgs = items.filter((i: any) => i.category === 'SVG').length;
      const classMatches = items.filter((i: any) => i.category === 'CLASS_MATCH').length;
      const attrMatches = items.filter((i: any) => i.category === 'ATTR_MATCH').length;
      console.log(`  ${section}: ${items.length} total (links=${links} buttons=${buttons} svgs=${svgs} class=${classMatches} attr=${attrMatches})`);
    }

    await page.waitForTimeout(5000);
    await browser.close();

  } catch (err) {
    console.log(`\n❌ FATAL: ${err}`);
    await ss(page, "error");
    // Still save partial results
    if (Object.keys(allResults).length > 0) {
      fs.writeFileSync("reports/debug-scan-locators.json", JSON.stringify(allResults, null, 2));
      console.log("  Partial results saved");
    }
    await browser.close().catch(() => {});
  }
})();
