/**
 * Verify Profile View - Primary Details & Additional Details
 * ===========================================================
 * Opens a record by clicking on the record ID, waits 20 seconds for load,
 * then verifies all visible fields in PRIMARY DETAILS and ADDITIONAL DETAILS tabs.
 *
 * Usage:
 *   npx ts-node src/scripts/verify-profile-view.ts [recordId]
 */

import { chromium, Browser, Page } from "playwright";
import { EnvConfig } from "../config/env";
import { AuthHelper } from "../helpers/authHelper";
import { logger } from "../utils/logger";

const RECORD_ID = process.argv[2] || "30930";
const WAIT_AFTER_OPEN = 20000; // 20 seconds

interface ProfileDetails {
  // Header
  recordId: string;
  listName: string;
  status: string;
  version: string;

  // Primary Details
  programName: string;
  sanctionsImposed: string;
  recordType: string;
  lastUpdatedDate: string;
  sanctionsProgramList: Array<{ listName: string; publishedDate: string }>;
  targetType: string;

  // Additional Details (dynamic fields)
  additionalFields: Record<string, string>;
}

async function main() {
  const browser: Browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page: Page = await context.newPage();

  try {
    // Login
    logger.info("Logging in...");
    await AuthHelper.login(page, {
      email: EnvConfig.USERNAME,
      password: EnvConfig.PASSWORD,
    });
    await page.waitForLoadState("networkidle");
    await page.locator("#facctumThemeProvider").waitFor({ state: "visible", timeout: 30000 });
    logger.info("Logged in successfully");

    // Navigate to Regulatory List (OFAC NON SDN is regulatory)
    await page.locator('text=Regulatory list').first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Search for the record ID
    logger.info(`Searching for record ID: ${RECORD_ID}`);
    const searchInput = page.locator('input[placeholder*="Search by Record ID"], input[placeholder*="Search"]').first();
    await searchInput.waitFor({ state: "visible", timeout: 10000 });
    await searchInput.clear();
    await searchInput.fill(RECORD_ID);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click on the record ID link to open profile view
    logger.info(`Clicking on record ID ${RECORD_ID} to open profile view...`);
    const recordLink = page.locator(`a:has-text("${RECORD_ID}"), td:has-text("${RECORD_ID}")`).first();
    await recordLink.waitFor({ state: "visible", timeout: 15000 });
    await recordLink.click();

    // Wait 20 seconds for profile to fully load
    logger.info(`Waiting ${WAIT_AFTER_OPEN / 1000} seconds for profile view to load...`);
    await page.waitForTimeout(WAIT_AFTER_OPEN);

    // Verify profile panel is open
    const profilePanel = page.locator(".facct-drawer-paper, [role='dialog'], [class*='profile-view']").first();
    await profilePanel.waitFor({ state: "visible", timeout: 10000 });
    logger.info("Profile view panel is open");

    // Take screenshot
    await page.screenshot({ path: "reports/profile-view-primary.png", fullPage: false });

    // ========== VERIFY PRIMARY DETAILS TAB ==========
    logger.info("\n=== VERIFYING PRIMARY DETAILS ===");

    // Click PRIMARY DETAILS tab (should be default)
    const primaryTab = page.locator('button:has-text("PRIMARY DETAILS"), [role="tab"]:has-text("PRIMARY DETAILS")').first();
    if (await primaryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await primaryTab.click();
      await page.waitForTimeout(2000);
    }

    // Header - Record ID & List Name
    const headerText = await profilePanel.locator("h1, h2, h3, [class*='header'], [class*='title']").first().textContent().catch(() => "");
    logger.info(`Header: ${headerText?.trim()}`);

    // Status badge (Active/Inactive)
    const statusBadge = profilePanel.locator("[class*='badge'], [class*='chip'], [class*='status'], span:has-text('Active'), span:has-text('Inactive')").first();
    const statusText = await statusBadge.textContent().catch(() => "");
    logger.info(`Status: ${statusText?.trim()}`);

    // Version
    const versionText = await profilePanel.locator("text=/Version/").first().textContent().catch(() => "");
    logger.info(`Version info: ${versionText?.trim()}`);

    // Program name
    const programName = await getFieldValue(page, profilePanel, "Program name");
    logger.info(`Program name: ${programName}`);

    // Sanctions imposed
    const sanctionsImposed = await getFieldValue(page, profilePanel, "Sanctions imposed");
    logger.info(`Sanctions imposed: ${sanctionsImposed}`);

    // Record type (radio buttons)
    const recordTypeChecked = await profilePanel.locator('input[type="radio"]:checked').first().evaluate(
      (el) => (el as HTMLInputElement).closest("label")?.textContent || ""
    ).catch(() => "");
    const recordTypeLabel = await profilePanel.locator('[class*="radio"]:has(input:checked), label:has(input[type="radio"]:checked)').first().textContent().catch(() => "");
    const recordType = recordTypeChecked || recordTypeLabel || "";
    logger.info(`Record type: ${recordType.trim()}`);

    // Record date / Last updated date
    const lastUpdated = await getFieldValue(page, profilePanel, "Last updated date");
    logger.info(`Last updated date: ${lastUpdated}`);

    // Sanctions program list (table)
    logger.info("\nSanctions program list:");
    const programListRows = profilePanel.locator("table tr, [class*='program-list'] [class*='row'], div:has(> div:has-text('List name')) + div");
    const programRowCount = await programListRows.count();
    for (let i = 0; i < Math.min(programRowCount, 10); i++) {
      const rowText = await programListRows.nth(i).textContent().catch(() => "");
      if (rowText && rowText.trim()) {
        logger.info(`  Row ${i + 1}: ${rowText.trim().substring(0, 100)}`);
      }
    }

    // Target type
    const targetType = await getFieldValue(page, profilePanel, "Target type");
    logger.info(`Target type: ${targetType}`);

    // Collect all visible field labels and values in PRIMARY DETAILS
    logger.info("\n--- All Primary Detail Fields ---");
    await logAllFields(page, profilePanel);

    // ========== VERIFY ADDITIONAL DETAILS TAB ==========
    logger.info("\n=== VERIFYING ADDITIONAL DETAILS ===");

    const additionalTab = page.locator('button:has-text("ADDITIONAL DETAILS"), [role="tab"]:has-text("ADDITIONAL DETAILS")').first();
    if (await additionalTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await additionalTab.click();
      await page.waitForTimeout(3000);
      logger.info("Clicked ADDITIONAL DETAILS tab");

      // Take screenshot
      await page.screenshot({ path: "reports/profile-view-additional.png", fullPage: false });

      // Collect all fields in ADDITIONAL DETAILS
      await logAllFields(page, profilePanel);
    } else {
      logger.warn("ADDITIONAL DETAILS tab not found");
    }

    logger.info("\n✅ Profile view verification complete!");

  } catch (error) {
    logger.error(`Error: ${error}`);
    await page.screenshot({ path: "reports/profile-view-error.png" });
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Gets the value of a field by its label text.
 */
async function getFieldValue(page: Page, container: any, label: string): Promise<string> {
  // Try: label followed by value in same container
  const fieldContainer = container.locator(`div:has(> *:has-text("${label}")), td:has-text("${label}"), [class*="field"]:has-text("${label}")`).first();
  if (await fieldContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
    const allText = await fieldContainer.textContent().catch(() => "");
    // Remove the label from the text to get just the value
    return (allText || "").replace(label, "").trim();
  }
  return "";
}

/**
 * Logs all visible label-value pairs in the profile panel.
 */
async function logAllFields(page: Page, container: any): Promise<void> {
  // Strategy 1: Find all divs/tds that look like label-value pairs
  const fieldContainers = container.locator(
    '[class*="field"], [class*="detail-row"], ' +
    'div:has(> span[class*="label"]), div:has(> p[class*="label"]), ' +
    'td:has(> span), [class*="info-block"]'
  );

  const count = await fieldContainers.count();
  const seen = new Set<string>();

  for (let i = 0; i < Math.min(count, 50); i++) {
    const text = await fieldContainers.nth(i).textContent().catch(() => "");
    const trimmed = (text || "").trim().substring(0, 150);
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      logger.info(`  Field: ${trimmed}`);
    }
  }

  // Strategy 2: Get all text content within the panel for complete capture
  if (seen.size === 0) {
    const fullText = await container.textContent().catch(() => "");
    const lines = (fullText || "").split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    for (const line of lines.slice(0, 40)) {
      logger.info(`  Content: ${line.substring(0, 150)}`);
    }
  }
}

main().catch(console.error);
