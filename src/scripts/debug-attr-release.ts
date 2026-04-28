/**
 * Debug: Attribute Release — Click orange hand icon to release a suppressed alias
 * Opens record 35, clicks EDIT, captures all hand icons, clicks orange hand, captures popup
 */
import { chromium, Page } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";

const RECORD_ID = "35";

let step = 0;
function S(m: string) { step++; console.log(`\n[${step}] ${m}`); }
async function ss(p: Page, n: string) { await p.screenshot({ path: `reports/debug-attr-rel-${String(step).padStart(2,"0")}-${n}.png` }).catch(() => {}); }

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

async function openViaKebab(p: Page, rowLocator: any) {
  await rowLocator.locator('.kebab-cell svg, td:last-child svg').first().click();
  await p.locator('[role="menuitem"]:has-text("Overview")').first().waitFor({ state: "visible", timeout: 5000 });
  await p.locator('[role="menuitem"]:has-text("Overview")').first().click();
  await p.waitForLoadState("networkidle");
  await waitDrawer(p);
}

(async () => {
  const { width, height } = EnvConfig.RESOLUTION;
  const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--force-device-scale-factor=0.67'] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(60000);
  const page = await ctx.newPage();

  try {
    // 1. LOGIN + NAVIGATE
    S("Login + navigate to WC Main Premium");
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

    // 2. SEARCH AND OPEN RECORD
    S(`Search and open record ${RECORD_ID}`);
    const rs = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await rs.waitFor({ state: "visible", timeout: 10000 }); await rs.clear(); await rs.fill(RECORD_ID);
    await page.keyboard.press("Enter"); await page.waitForLoadState("networkidle");
    await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
    await openViaKebab(page, page.locator('tbody tr').first());
    console.log(`  Record ${RECORD_ID} opened`);
    await ss(page, "profile-opened");

    // Log footer buttons
    console.log("  --- Footer buttons ---");
    const footerBtns = page.locator('.facct-drawer-paper button:visible');
    const fbCount = await footerBtns.count();
    for (let i = 0; i < fbCount; i++) {
      const id = await footerBtns.nth(i).getAttribute("id").catch(() => "");
      const text = await footerBtns.nth(i).textContent().catch(() => "");
      const title = await footerBtns.nth(i).getAttribute("title").catch(() => "");
      if (text?.trim() || title) console.log(`    [${id}] text="${text?.trim().substring(0, 40)}" title="${title}"`);
    }

    // 3. CLICK EDIT
    S("Click EDIT");
    await page.locator('#lseg-footer-edit-btn').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('#lseg-footer-edit-btn').click();
    await page.waitForTimeout(3000);
    console.log("  Edit mode");

    // 4. SCROLL TO OTHER NAMES AND CAPTURE ALL ICONS
    S("Capture all hand icons in edit mode");
    await page.locator('text=Other names').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    await ss(page, "other-names-edit");

    // Capture ALL BackHand icons (both blue=suppress and orange=already suppressed)
    const allHandIcons = await page.locator('.facct-drawer-paper button:has(svg)').evaluateAll(btns =>
      btns.map(b => {
        const svg = b.querySelector('svg');
        return {
          testId: svg?.getAttribute('data-testid') || '',
          title: b.getAttribute('title') || '',
          ariaLabel: b.getAttribute('aria-label') || '',
          id: b.id || '',
          className: b.className.substring(0, 60),
          disabled: (b as HTMLButtonElement).disabled,
          // Get computed color of the SVG to distinguish blue vs orange
          svgColor: svg ? getComputedStyle(svg).color : '',
          svgFill: svg?.getAttribute('fill') || '',
          // Get the parent row text for context
          rowText: b.closest('tr')?.textContent?.trim().substring(0, 80) || '',
          rect: b.getBoundingClientRect(),
        };
      }).filter(b => b.testId.includes('BackHand') || b.testId.includes('Hand') || b.title.includes('suppress') || b.title.includes('Suppress') || b.title.includes('release') || b.title.includes('Release'))
    );

    console.log(`  Hand icons found: ${allHandIcons.length}`);
    for (let i = 0; i < allHandIcons.length; i++) {
      const h = allHandIcons[i];
      console.log(`  [${i}] testId="${h.testId}" title="${h.title}" aria="${h.ariaLabel}" color="${h.svgColor}" fill="${h.svgFill}" disabled=${h.disabled} y=${Math.round(h.rect.y)}`);
      console.log(`       row="${h.rowText}"`);
    }

    // Also capture ALL SVGs with their colors
    const allSvgs = await page.locator('.facct-drawer-paper svg[data-testid*="Hand"], .facct-drawer-paper svg[data-testid*="hand"]').evaluateAll(svgs =>
      svgs.map(svg => ({
        testId: svg.getAttribute('data-testid') || '',
        color: getComputedStyle(svg).color,
        fill: svg.getAttribute('fill') || '',
        parentTitle: svg.parentElement?.getAttribute('title') || '',
        parentClass: svg.parentElement?.className?.substring(0, 60) || '',
        rect: svg.getBoundingClientRect(),
      }))
    );
    console.log(`\n  Hand SVGs: ${allSvgs.length}`);
    for (let i = 0; i < allSvgs.length; i++) {
      const s = allSvgs[i];
      console.log(`  [${i}] testId="${s.testId}" color="${s.color}" fill="${s.fill}" parentTitle="${s.parentTitle}" y=${Math.round(s.rect.y)}`);
    }

    await ss(page, "hand-icons-captured");

    // 5. TRY CLICKING THE ORANGE HAND (suppressed alias)
    S("Click orange hand icon (suppressed alias)");

    // Orange hand: title="Attribute suppress" (NOT "Attribute suppress request")
    // Blue hand: title="Attribute suppress request"
    const orangeHand = page.locator('.facct-drawer-paper button[title="Attribute suppress"]').first();
    const orangeVisible = await orangeHand.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`  Orange hand visible: ${orangeVisible}`);

    if (orangeVisible) {
      await orangeHand.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await orangeHand.click({ force: true });
      console.log("  Clicked orange hand icon");
      await page.waitForTimeout(3000);
      await ss(page, "after-orange-hand-click");

      // Capture what popup appeared
      const dialogs = page.locator('[role="presentation"].facct-modal');
      const dCount = await dialogs.count();
      for (let d = 0; d < dCount; d++) {
        const vis = await dialogs.nth(d).isVisible().catch(() => false);
        if (vis) {
          const text = await dialogs.nth(d).textContent().catch(() => "");
          console.log(`  Dialog[${d}]: "${text?.trim().substring(0, 300)}"`);
        }
      }

      // Capture all buttons that might be release-related
      const relBtns = await page.locator('button:visible').evaluateAll(btns =>
        btns.map(b => ({
          id: b.id || '',
          text: b.textContent?.trim().substring(0, 40) || '',
          ariaLabel: b.getAttribute('aria-label') || '',
        })).filter(b => 
          b.text.toLowerCase().includes('release') || b.text.toLowerCase().includes('suppress') || 
          b.text.toLowerCase().includes('cancel') || b.text.toLowerCase().includes('submit') || 
          b.id.includes('modal') || b.id.includes('release') || b.id.includes('confirm'))
      );
      console.log(`  Relevant buttons: ${relBtns.length}`);
      for (const btn of relBtns) {
        console.log(`    id="${btn.id}" text="${btn.text}" aria="${btn.ariaLabel}"`);
      }

      // Capture all inputs/textareas in popup
      const popupInputs = await page.locator('[role="presentation"].facct-modal:visible input:visible, [role="presentation"].facct-modal:visible textarea:visible').evaluateAll(els =>
        els.map(e => ({
          tag: e.tagName, id: e.id || '', placeholder: e.getAttribute('placeholder') || '', name: e.getAttribute('name') || '',
        }))
      );
      console.log(`  Popup inputs: ${popupInputs.length}`);
      for (const inp of popupInputs) {
        console.log(`    <${inp.tag}> id="${inp.id}" placeholder="${inp.placeholder}" name="${inp.name}"`);
      }
    } else {
      console.log("  No orange hand found on this record");
    }

    console.log("\n  Waiting 10s for inspection...");
    await page.waitForTimeout(10000);
    await browser.close();
  } catch (err) {
    console.log(`\nFATAL: ${err}`);
    await ss(page, "error");
    await browser.close().catch(() => {});
  }
})();
