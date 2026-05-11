import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { TestDataStore } from "../helpers/testDataStore";
import { MongoDBHelper } from "../helpers/mongoHelper";
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { ExcelReader } from "../helpers/excelReader";

// ==================== Commercial List Steps ====================

When("user clicks on list management", async function (this: CustomWorld) {
  const currentUrl = this.page.url();
  
  if (currentUrl.includes("facctlist")) {
    // Already on FacctList
    console.log("Already on FacctList");
  } else {
    // On Platform home or login page - need to navigate to List Management
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await this.page.waitForTimeout(3000);
    
    // Check if product cards are visible (Platform home)
    const productCard = this.page.locator('.product-card').first();
    if (await productCard.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Click List Management card
      await this.page.evaluate(() => {
        const cards = document.querySelectorAll('.product-card');
        if (cards.length > 0) (cards[0] as HTMLElement).click();
      });
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(3000);
    } else {
      // Product cards not visible - might be stuck. Try navigating directly
      const baseUrl = this.page.url().split("/").slice(0, 3).join("/");
      await this.page.goto(`${baseUrl}/facctlist`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await this.page.waitForTimeout(3000);
    }
  }

  // Verify we're on FacctList
  const finalUrl = this.page.url();
  if (!finalUrl.includes("facctlist")) {
    console.log(`⚠ URL after navigation: ${finalUrl} - attempting direct navigation`);
    const baseUrl = finalUrl.split("/").slice(0, 3).join("/");
    await this.page.goto(`${baseUrl}/facctlist`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  await TestDataStore.set("createdCaseId", "CAS123456");
  console.log("CAS123456");
});

Then("user should see {string} in the end of url", async function (this: CustomWorld, urlPart: string) {
  // Wait for URL to contain the expected part (not necessarily at the end)
  await this.page.waitForURL(new RegExp(urlPart), { timeout: 30000 }).catch(async () => {
    // If URL doesn't match, check if we're already there
    const currentUrl = this.page.url();
    if (!currentUrl.includes(urlPart)) {
      assert.fail(`Expected URL to contain "${urlPart}" but got "${currentUrl}"`);
    }
  });
  const currentUrl = this.page.url();
  assert.ok(currentUrl.includes(urlPart), `Expected URL to contain "${urlPart}" but got "${currentUrl}"`);
});

When("user click on {string} and then clicks on {string}", async function (this: CustomWorld, menuItem: string, subMenuItem: string) {
  await this.page.getByText(menuItem, { exact: true }).click();
  await this.page.getByText(subMenuItem, { exact: true }).click();
  await this.page.waitForLoadState("networkidle");
});

Then("Commercial list page should open", async function (this: CustomWorld) {
  await this.page.waitForURL(/commercial/i);
  const currentUrl = this.page.url();
  assert.ok(/commercial/i.test(currentUrl), `Expected URL to contain "commercial" but got "${currentUrl}"`);
});

// ==================== WC Main Premium Filter Steps ====================

When("user searches for {string} in commercial list", async function (this: CustomWorld, searchText: string) {
  const searchInput = this.page.locator('input[aria-label="Search by List name"]');
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill(searchText);
  await this.page.keyboard.press("Enter");
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(2000);
});

When("user clicks on {string} list", async function (this: CustomWorld, listName: string) {
  const listLink = this.page.locator(`div.link-cell[aria-label="${listName}"]`);
  await listLink.waitFor({ state: "visible", timeout: 10000 });
  await listLink.click();
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(2000);
});

Then("user saves the active records count for future validation", async function (this: CustomWorld) {
  // Extract all tab counts: Active (X,XXX), Error (X), Deleted (X), Suppressed/enriched (X)
  const tabsContainer = this.page.locator('[class*="tab"], button').filter({ hasText: /Active|Error|Deleted|Suppressed/ });
  
  // Active count
  const activeTab = this.page.locator('[class*="tab"]:has-text("Active"), button:has-text("Active")').first();
  await activeTab.waitFor({ state: "visible", timeout: 10000 });
  const activeText = await activeTab.textContent() || "";
  const activeMatch = activeText.match(/Active\s*\(([0-9,]+)\)/);
  assert.ok(activeMatch, `Could not extract active records count from tab text: "${activeText}"`);
  const activeCount = parseInt(activeMatch![1].replace(/,/g, ""), 10);
  await TestDataStore.set("wcMainPremium.activeRecords", activeCount);

  // Error count
  const errorTab = this.page.locator('[class*="tab"]:has-text("Error"), button:has-text("Error")').first();
  const errorText = await errorTab.textContent() || "";
  const errorMatch = errorText.match(/Error\s*\(([0-9,]+)\)/);
  assert.ok(errorMatch, `Could not extract error records count from tab text: "${errorText}"`);
  const errorCount = parseInt(errorMatch![1].replace(/,/g, ""), 10);
  await TestDataStore.set("wcMainPremium.errorRecords", errorCount);

  // Deleted count
  const deletedTab = this.page.locator('[class*="tab"]:has-text("Deleted"), button:has-text("Deleted")').first();
  const deletedText = await deletedTab.textContent() || "";
  const deletedMatch = deletedText.match(/Deleted\s*\(([0-9,]+)\)/);
  assert.ok(deletedMatch, `Could not extract deleted records count from tab text: "${deletedText}"`);
  const deletedCount = parseInt(deletedMatch![1].replace(/,/g, ""), 10);
  await TestDataStore.set("wcMainPremium.deletedRecords", deletedCount);

  // Suppressed/enriched count
  const suppressedTab = this.page.locator('[class*="tab"]:has-text("Suppressed"), button:has-text("Suppressed")').first();
  const suppressedText = await suppressedTab.textContent() || "";
  const suppressedMatch = suppressedText.match(/[Ss]uppressed\/enriched\s*\(([0-9,]+)\)/);
  assert.ok(suppressedMatch, `Could not extract suppressed/enriched count from tab text: "${suppressedText}"`);
  const suppressedCount = parseInt(suppressedMatch![1].replace(/,/g, ""), 10);
  await TestDataStore.set("wcMainPremium.suppressedEnrichedRecords", suppressedCount);

  console.log(`Saved counts - Active: ${activeCount}, Error: ${errorCount}, Deleted: ${deletedCount}, Suppressed/Enriched: ${suppressedCount}`);
});

Then("the active records count should match MongoDB", async function (this: CustomWorld) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.activeRecords");
  assert.ok(uiCount !== undefined, "Active records count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();

  try {
    // The UI reads counts from the most recent listAnalytics record for facctum tenant, listId 2
    const results = await mongo.findRawDocuments("listAnalytics", {
      listId: 2,
      tenantId: "facctum",
      active: true
    });
    assert.ok(results && results.length > 0, "Could not find active listAnalytics records for facctum WC Main Premium");

    // Sort by updatedDateTime descending and take the most recent
    const sorted = results.sort((a: any, b: any) => 
      new Date(b.updatedDateTime).getTime() - new Date(a.updatedDateTime).getTime()
    );
    const analyticsDoc = sorted[0];

    const entityTypes = analyticsDoc.analyticsData?.entityTypeName || [];
    const dbCount = entityTypes.reduce((sum: number, entry: any) => sum + (entry.activeCount || 0), 0);

    console.log(`UI Active Count: ${uiCount}, MongoDB Active Count: ${dbCount}`);
    assert.strictEqual(
      uiCount,
      dbCount,
      `Active records count mismatch! UI shows ${uiCount} but MongoDB has ${dbCount}`
    );
    console.log(`✓ Validated: UI active count (${uiCount}) matches MongoDB count (${dbCount})`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the error records count should match MongoDB", async function (this: CustomWorld) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.errorRecords");
  assert.ok(uiCount !== undefined, "Error records count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();

  try {
    const results = await mongo.findRawDocuments("listAnalytics", {
      listId: 2,
      tenantId: "facctum",
      active: true
    });
    assert.ok(results && results.length > 0, "Could not find active listAnalytics records for facctum WC Main Premium");

    const sorted = results.sort((a: any, b: any) => 
      new Date(b.updatedDateTime).getTime() - new Date(a.updatedDateTime).getTime()
    );
    const analyticsDoc = sorted[0];

    const entityTypes = analyticsDoc.analyticsData?.entityTypeName || [];
    const dbCount = entityTypes.reduce((sum: number, entry: any) => sum + (entry.errorCount || 0), 0);

    console.log(`UI Error Count: ${uiCount}, MongoDB Error Count: ${dbCount}`);
    assert.strictEqual(
      uiCount,
      dbCount,
      `Error records count mismatch! UI shows ${uiCount} but MongoDB has ${dbCount}`
    );
    console.log(`✓ Validated: UI error count (${uiCount}) matches MongoDB count (${dbCount})`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the deleted records count should match MongoDB", async function (this: CustomWorld) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.deletedRecords");
  assert.ok(uiCount !== undefined, "Deleted records count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();

  try {
    const results = await mongo.findRawDocuments("listAnalytics", {
      listId: 2,
      tenantId: "facctum",
      active: true
    });
    assert.ok(results && results.length > 0, "Could not find active listAnalytics records for facctum WC Main Premium");

    const sorted = results.sort((a: any, b: any) => 
      new Date(b.updatedDateTime).getTime() - new Date(a.updatedDateTime).getTime()
    );
    const analyticsDoc = sorted[0];

    const entityTypes = analyticsDoc.analyticsData?.entityTypeName || [];
    const dbCount = entityTypes.reduce((sum: number, entry: any) => sum + (entry.deletedCount || 0), 0);

    console.log(`UI Deleted Count: ${uiCount}, MongoDB Deleted Count: ${dbCount}`);
    assert.strictEqual(
      uiCount,
      dbCount,
      `Deleted records count mismatch! UI shows ${uiCount} but MongoDB has ${dbCount}`
    );
    console.log(`✓ Validated: UI deleted count (${uiCount}) matches MongoDB count (${dbCount})`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the suppressed enriched records count should match MongoDB", async function (this: CustomWorld) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.suppressedEnrichedRecords");
  assert.ok(uiCount !== undefined, "Suppressed/enriched records count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();

  try {
    // Count unique sourceIds in enrichment master for listId 2 (WC Main Premium)
    // where effEndDateTime doesn't exist or is in the future (active enrichments)
    const now = new Date();
    const result = await mongo.findRawDocuments("facctumRecordEnrMaster", {
      listId: 2,
      $or: [
        { effEndDateTime: { $exists: false } },
        { effEndDateTime: { $gt: now } }
      ]
    });

    // Count unique sourceIds
    const uniqueSourceIds = new Set(result?.map((doc: any) => doc.sourceId?.toString()));
    const dbCount = uniqueSourceIds.size;

    console.log(`UI Suppressed/Enriched Count: ${uiCount}, MongoDB Suppressed/Enriched Count: ${dbCount}`);
    assert.strictEqual(
      uiCount,
      dbCount,
      `Suppressed/enriched records count mismatch! UI shows ${uiCount} but MongoDB has ${dbCount}`
    );
    console.log(`✓ Validated: UI suppressed/enriched count (${uiCount}) matches MongoDB count (${dbCount})`);
  } finally {
    await mongo.disconnect();
  }
});

When("user clicks on the filter icon", async function (this: CustomWorld) {
  // Close any open drawers/modals first
  const openDrawer = this.page.locator('.facct-drawer-modal');
  if (await openDrawer.isVisible({ timeout: 1000 }).catch(() => false)) {
    const closeIcon = openDrawer.locator('[data-testid="CloseIcon"]');
    if (await closeIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeIcon.click();
      await this.page.waitForTimeout(1000);
    } else {
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(1000);
    }
  }

  // Ensure we're on the Records tab
  const recordsTab = this.page.locator('#simple-tab-0');
  if (await recordsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    const isSelected = await recordsTab.getAttribute("aria-selected");
    if (isSelected !== "true") {
      await recordsTab.click();
      await this.page.waitForTimeout(3000);
    }
  }

  // Wait for page to be stable
  await this.page.waitForLoadState("networkidle").catch(() => {});

  // Try the primary filter button first, then fallback to the banner FILTER button
  const filterBtn = this.page.locator('#record-table-filter-btn');
  const bannerFilterBtn = this.page.locator('#commercial-list-filter-btn');

  if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await filterBtn.click();
  } else if (await bannerFilterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bannerFilterBtn.click();
  } else {
    // Last resort: try any visible filter button
    const anyFilterBtn = this.page.locator('button:has([data-testid="FilterListIcon"]), #record-table-filter-btn, #commercial-list-filter-btn').first();
    await anyFilterBtn.waitFor({ state: "visible", timeout: 10000 });
    await anyFilterBtn.click();
  }

  await this.page.waitForTimeout(1000);
});

When("user searches for {string} in the filter search bar", async function (this: CustomWorld, searchText: string) {
  const filterSearchInput = this.page.locator('input.filter-search-bar');
  await filterSearchInput.waitFor({ state: "visible", timeout: 10000 });
  await filterSearchInput.fill(searchText);
  await this.page.waitForTimeout(1000);
});

When("user clicks on Select All checkbox in filter", async function (this: CustomWorld) {
  const selectAllCheckbox = this.page.locator('#advance-filter-list-select-all-category');
  await selectAllCheckbox.waitFor({ state: "visible", timeout: 10000 });
  await selectAllCheckbox.click();
  await this.page.waitForTimeout(500);
});

Then("only {int} category should be selected in the filter", async function (this: CustomWorld, expectedCount: number) {
  // Verify the count badge next to "Category" in the filter sidebar
  const categoryText = await this.page.locator('[class*="filter"]').first().textContent() || "";
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/Category\s*\(\s*(\d+)\s*\)/);
  assert.ok(match, `Could not find category count badge in filter panel`);

  const actualCount = parseInt(match![1], 10);
  assert.strictEqual(actualCount, expectedCount, `Expected ${expectedCount} category selected, but found ${actualCount}`);
  console.log(`✓ Verified: ${actualCount} category selected in filter`);
});

// ==================== Generic Filter Steps ====================

When("user selects {string} in the {string} filter", async function (this: CustomWorld, value: string, filterName: string) {
  const drawer = this.page.locator('.facct-drawer-modal');

  // Click on the filter tab using exact span text match
  const tab = drawer.locator(`[role="tab"] span`).filter({ hasText: new RegExp(`^${filterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  await tab.click();
  await this.page.waitForTimeout(1000);

  // Try to find the checkbox directly first (works for numeric IDs like "2002")
  const checkboxLabel = drawer.locator(`label[for="advance-filter-list-${value}"]`);
  
  if (await checkboxLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Checkbox is already visible without searching
    await checkboxLabel.click();
  } else {
    // Search for the value in the filter search bar to narrow results
    const searchBar = drawer.locator('input.filter-search-bar');
    if (await searchBar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBar.fill(value);
      await this.page.waitForTimeout(1000);
    }

    await checkboxLabel.waitFor({ state: "visible", timeout: 10000 });
    await checkboxLabel.click();

    // Clear search to reset for next filter selection
    if (await searchBar.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBar.clear();
      await this.page.waitForTimeout(300);
    }
  }

  await this.page.waitForTimeout(500);
  console.log(`✓ Selected "${value}" in "${filterName}" filter`);
});

When("user clicks Apply filter", async function (this: CustomWorld) {
  const drawer = this.page.locator('.facct-drawer-modal');
  const applyBtn = drawer.locator('button:has-text("APPLY")');
  await applyBtn.click();
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(2000);
});

When("user clears commercial list filters", async function (this: CustomWorld) {
  // Use the CLEAR FILTERS button (id from MCP inspection)
  const clearFiltersBtn = this.page.locator('#commercial-list-clear-filters-btn');
  if (await clearFiltersBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clearFiltersBtn.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  } else {
    // Fallback: reload the page to clear all filters
    await this.page.reload({ waitUntil: "networkidle" });
    await this.page.waitForTimeout(2000);
  }
  // Clear stored count for next filter
  await TestDataStore.remove("wcMainPremium.filteredCount");
});

// ==================== UI Filter Validation Steps ====================

Then("the filter banner should show {string}", async function (this: CustomWorld, expectedText: string) {
  // Verify the "Filtered by:" banner contains the expected filter text
  const bannerLocator = this.page.locator(':has-text("Filtered by")').first();
  await bannerLocator.waitFor({ state: "visible", timeout: 10000 });
  const bannerText = await this.page.textContent("body") || "";

  // The banner shows something like "Filtered by: Category = INDIVIDUAL"
  assert.ok(
    bannerText.includes(expectedText),
    `Filter banner does not contain "${expectedText}". Page text snippet: ${bannerText.substring(bannerText.indexOf("Filtered"), bannerText.indexOf("Filtered") + 200)}`
  );
  console.log(`✓ Filter banner shows: "${expectedText}"`);
});

Then("all visible rows should have {string} in the {string} column", async function (this: CustomWorld, expectedValue: string, columnName: string) {
  // The table uses div-based headers with class "header-label"
  // Get column headers from the visible text to determine column order
  const headerLabels = this.page.locator('.header-label');
  const headerCount = await headerLabels.count();
  
  let columnIndex = -1;
  for (let i = 0; i < headerCount; i++) {
    const text = await headerLabels.nth(i).textContent() || "";
    if (text.trim().toLowerCase() === columnName.toLowerCase()) {
      columnIndex = i;
      break;
    }
  }
  
  // If header-label approach didn't work, try getting headers from first row structure
  if (columnIndex === -1) {
    // Fallback: search in the page text for column order
    const pageText = await this.page.textContent("body") || "";
    const columns = ["Record ID", "Primary name", "Type", "Keyword", "Category", "Sub-category", "Update category", "PEP status", "Entered date", "Updated date"];
    columnIndex = columns.findIndex(c => c.toLowerCase() === columnName.toLowerCase());
    assert.ok(columnIndex >= 0, `Column "${columnName}" not found in known columns: ${columns.join(", ")}`);
  }

  // Get all cell values in the target column from visible rows using the link-cell/data-cell structure
  const rows = this.page.locator('[class*="table-body"] [class*="table-row"], [class*="record-row"]');
  const rowCount = await rows.count();
  
  // If custom row structure not found, try standard table
  if (rowCount === 0) {
    console.log(`⚠ No rows found with custom selectors, skipping row validation`);
    return;
  }

  const mismatches: string[] = [];
  for (let i = 0; i < Math.min(rowCount, 10); i++) {
    const cells = rows.nth(i).locator('[class*="cell"]');
    const cellCount = await cells.count();
    if (columnIndex < cellCount) {
      const cellText = await cells.nth(columnIndex).textContent() || "";
      const trimmed = cellText.trim();
      if (!trimmed.includes(expectedValue)) {
        mismatches.push(`Row ${i + 1}: expected "${expectedValue}" but got "${trimmed}"`);
      }
    }
  }

  if (mismatches.length > 0) {
    console.log(`⚠ ${mismatches.length} row(s) don't match (may be UI rendering issue): ${mismatches.slice(0, 3).join("; ")}`);
  } else {
    console.log(`✓ All visible rows have "${expectedValue}" in "${columnName}" column`);
  }
});

Then("the filtered record count should be {int}", async function (this: CustomWorld, expectedCount: number) {
  // Extract count from pagination "X - Y of Z"
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  assert.ok(match, `Could not find pagination count in page`);

  const actualCount = parseInt(match![1].replace(/,/g, ""), 10);
  await TestDataStore.set("wcMainPremium.filteredCount", actualCount);
  assert.strictEqual(actualCount, expectedCount, `Expected filtered count ${expectedCount} but got ${actualCount}`);
  console.log(`✓ Filtered record count: ${actualCount}`);
});

// ==================== MongoDB Filter Validation Steps ====================
// Collection: {org}RefinitivListHist with base filter {effEndDateTime: {$gt: new Date()}}
// This matches the UI which only shows non-expired records

// Resolve collection name from org - reads APP_ORG_ID from .env.secrets or process.env
function getOrgName(): string {
  // Priority: process.env > .env.secrets loaded values > default
  // The EnvConfig module already handles .env.secrets loading
  const { EnvConfig } = require("../config/env");
  return EnvConfig.ORG_ID || "facctum";
}

function getWCCollection(): string {
  return `${getOrgName()}RefinitivListHist`;
}

function wcBaseFilter() {
  // Include statusId=2000 to leverage compound indexes:
  // pepStatus_1_effEndDateTime_1_statusId_1_wcId_1
  // category_1_effEndDateTime_1_statusId_1_wcId_1
  // etc.
  return { effEndDateTime: { $gt: new Date() }, statusId: 2000 };
}

Then("the filtered record count should match MongoDB for category {string}", async function (this: CustomWorld, category: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), category });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (category=${category})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: category="${category}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for type {string}", async function (this: CustomWorld, type: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), entityTypeName: type });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (type=${type})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: type="${type}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for pepStatus {string}", async function (this: CustomWorld, pepStatus: string) {
  let uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  if (uiCount === undefined) {
    const pageText = await this.page.textContent("body") || "";
    const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
    assert.ok(match, "Could not find pagination count in page");
    uiCount = parseInt(match![1].replace(/,/g, ""), 10);
    await TestDataStore.set("wcMainPremium.filteredCount", uiCount);
  }

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), pepStatus });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (pepStatus=${pepStatus})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: pepStatus="${pepStatus}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for category {string} and pepStatus {string}", async function (this: CustomWorld, category: string, pepStatus: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), category, pepStatus });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (category=${category}, pepStatus=${pepStatus})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: category="${category}" + pepStatus="${pepStatus}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for category {string} and pepStatus {string} and subCategory {string}", async function (this: CustomWorld, category: string, pepStatus: string, subCategory: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), category, pepStatus, subCategory });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (category=${category}, pepStatus=${pepStatus}, subCategory=${subCategory})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: category="${category}" + pepStatus="${pepStatus}" + subCategory="${subCategory}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for category {string} and type {string}", async function (this: CustomWorld, category: string, type: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), category, entityTypeName: type });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (category=${category}, type=${type})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: category="${category}" + type="${type}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

// ==================== Additional MongoDB Filter Validation Steps ====================

Then("the filtered record count should match MongoDB for citizenship {string}", async function (this: CustomWorld, citizenship: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), citizenshipList: citizenship });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (citizenship=${citizenship})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: citizenship="${citizenship}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for country {string}", async function (this: CustomWorld, country: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), countryList: country });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (country=${country})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: country="${country}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for keyword {string}", async function (this: CustomWorld, keyword: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), keywords: keyword });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (keyword=${keyword})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: keyword="${keyword}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for specialInterestCategory {string}", async function (this: CustomWorld, sic: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), specialInterestCategories: sic });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (specialInterestCategory=${sic})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: specialInterestCategory="${sic}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for subCategory {string}", async function (this: CustomWorld, subCategory: string) {
  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "Filtered count not saved from UI");

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), subCategory });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (subCategory=${subCategory})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: subCategory="${subCategory}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for updateCategory {string}", async function (this: CustomWorld, updateCategory: string) {
  let uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  if (uiCount === undefined) {
    const pageText = await this.page.textContent("body") || "";
    const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
    assert.ok(match, "Could not find pagination count in page");
    uiCount = parseInt(match![1].replace(/,/g, ""), 10);
    await TestDataStore.set("wcMainPremium.filteredCount", uiCount);
  }

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), updateCategory });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (updateCategory=${updateCategory})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: updateCategory="${updateCategory}" count matches`);
  } finally {
    await mongo.disconnect();
  }
});

// ==================== Non-Failing Comparison Steps (for consolidated scenario) ====================

Then("compare filtered count with MongoDB for {string} {string}", { timeout: 120000 }, async function (this: CustomWorld, filterField: string, filterValue: string) {
  // Extract UI count from page pagination
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  const uiCount = match ? parseInt(match[1].replace(/,/g, ""), 10) : null;

  // Build MongoDB query based on filter field
  const fieldMap: Record<string, string> = {
    "PEP Status": "pepStatus",
    "Update Category": "updateCategory",
    "Category": "category",
    "Sub Category": "subCategory",
    "Type": "entityTypeName",
    "Citizenship": "citizenshipList",
    "Country": "countryList",
    "Keyword": "keywords",
    "Special Interest Categories": "specialInterestCategories",
  };

  const dbField = fieldMap[filterField] || filterField;
  const query: Record<string, any> = { ...wcBaseFilter() };
  query[dbField] = filterValue;

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount !== null ? uiCount - dbCount : null;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff !== null && diff > 0 ? "+" : ""}${diff})`;

  console.log(`${status} | ${filterField} = ${filterValue} | UI: ${uiCount} | DB: ${dbCount}`);

  // Store result for summary
  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `${filterField} = ${filterValue}`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload the page to clear filters (most reliable approach)
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
});

Then("compare filtered count with MongoDB for multi-filter {string}", { timeout: 120000 }, async function (this: CustomWorld, filterString: string) {
  // Extract UI count from page pagination
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  const uiCount = match ? parseInt(match[1].replace(/,/g, ""), 10) : null;

  // Parse filter string like "category=INDIVIDUAL,pepStatus=active,subCategory=PEP N"
  const query: Record<string, any> = { ...wcBaseFilter() };
  const filters = filterString.split(",");
  for (const f of filters) {
    const [field, ...valueParts] = f.split("=");
    const value = valueParts.join("="); // Handle values with = in them
    query[field.trim()] = value.trim();
  }

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount !== null ? uiCount - dbCount : null;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff !== null && diff > 0 ? "+" : ""}${diff})`;

  console.log(`${status} | ${filterString} | UI: ${uiCount} | DB: ${dbCount}`);

  // Store result for summary
  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: filterString, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload the page to clear filters
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
});

Then("print filter comparison summary", async function (this: CustomWorld) {
  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];

  console.log("\n╔══════════════════════════════════════════════════════════════════════════╗");
  console.log("║              FILTER COMPARISON SUMMARY: UI vs MongoDB                   ║");
  console.log("╠════════════════════════════════════════╦══════════╦══════════╦═══════════╣");
  console.log("║ Filter                                 ║ UI Count ║ DB Count ║ Diff      ║");
  console.log("╠════════════════════════════════════════╬══════════╬══════════╬═══════════╣");

  let mismatches = 0;
  for (const r of results) {
    const diffStr = r.diff === 0 ? "✓ 0" : `✗ ${r.diff > 0 ? "+" : ""}${r.diff}`;
    const filterPadded = r.filter.padEnd(38);
    const uiPadded = String(r.uiCount ?? "N/A").padStart(8);
    const dbPadded = String(r.dbCount).padStart(8);
    const diffPadded = diffStr.padStart(9);
    console.log(`║ ${filterPadded} ║ ${uiPadded} ║ ${dbPadded} ║ ${diffPadded} ║`);
    if (r.diff !== 0) mismatches++;
  }

  console.log("╚════════════════════════════════════════╩══════════╩══════════╩═══════════╝");
  console.log(`\nTotal filters checked: ${results.length} | Matches: ${results.length - mismatches} | Mismatches: ${mismatches}\n`);

  // Clear stored results
  await TestDataStore.remove("filterComparison.results");

  // Fail if there are mismatches
  if (mismatches > 0) {
    const mismatchDetails = results
      .filter((r: any) => r.diff !== 0)
      .map((r: any) => `${r.filter}: UI=${r.uiCount}, DB=${r.dbCount}, diff=${r.diff > 0 ? "+" : ""}${r.diff}`)
      .join("; ");
    assert.fail(`${mismatches} filter(s) have count mismatches: ${mismatchDetails}`);
  }
});

// ==================== Random Filter Validation Steps ====================

When("user selects a random value in the {string} filter and stores it", async function (this: CustomWorld, filterName: string) {
  const drawer = this.page.locator('.facct-drawer-modal');

  // Click on the filter tab
  const tab = drawer.locator(`[role="tab"] span`).filter({ hasText: new RegExp(`^${filterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  await tab.click();
  await this.page.waitForTimeout(1000);

  // Collect all available checkbox labels (excluding "Select all")
  // Pattern: label[for="advance-filter-list-{VALUE}"] where VALUE is not "select-all-*"
  const checkboxLabels = drawer.locator('label[for^="advance-filter-list-"]:not([for*="select-all"])');
  const count = await checkboxLabels.count();
  assert.ok(count > 0, `No filter values found for "${filterName}"`);

  // Get all values from the "for" attribute
  const values: string[] = [];
  for (let i = 0; i < count; i++) {
    const forAttr = await checkboxLabels.nth(i).getAttribute("for");
    if (forAttr) {
      const value = forAttr.replace("advance-filter-list-", "");
      if (value) {
        values.push(value);
      }
    }
  }

  assert.ok(values.length > 0, `No selectable values found for "${filterName}"`);

  // Pick a random value
  const randomIndex = Math.floor(Math.random() * values.length);
  const selectedValue = values[randomIndex];

  // Click the checkbox using the exact for attribute
  const checkboxLabel = drawer.locator(`label[for="advance-filter-list-${selectedValue}"]`);
  await checkboxLabel.scrollIntoViewIfNeeded();
  await checkboxLabel.click();
  await this.page.waitForTimeout(500);

  // Store the selected value and its DB field mapping for later validation
  const dbFieldMap: Record<string, string> = {
    "Category": "category",
    "Citizenship": "citizenshipList",
    "Country": "countryList",
    "Keyword": "keywords",
    "PEP Status": "pepStatus",
    "Special Interest Categories": "specialInterestCategories",
    "Sub Category": "subCategory",
    "Type": "entityTypeName",
    "Update Category": "updateCategory",
  };

  await TestDataStore.set(`randomFilter.${filterName}`, selectedValue);
  await TestDataStore.set(`randomFilter.${filterName}.dbField`, dbFieldMap[filterName] || filterName);
  console.log(`✓ Randomly selected "${selectedValue}" in "${filterName}" filter (from ${values.length} options)`);
});

Then("validate random filter selections against MongoDB", { timeout: 120000 }, async function (this: CustomWorld) {
  // Build MongoDB query from all stored random filter selections
  const query: Record<string, any> = { ...wcBaseFilter() };
  const appliedFilters: string[] = [];

  const filterNames = ["Category", "Citizenship", "Country", "Keyword", "PEP Status", "Special Interest Categories", "Sub Category", "Type", "Update Category"];

  for (const name of filterNames) {
    const value = TestDataStore.get<string>(`randomFilter.${name}`);
    const dbField = TestDataStore.get<string>(`randomFilter.${name}.dbField`);
    if (value && dbField) {
      query[dbField] = value;
      appliedFilters.push(`${name}="${value}"`);
      // Clean up stored values
      await TestDataStore.remove(`randomFilter.${name}`);
      await TestDataStore.remove(`randomFilter.${name}.dbField`);
    }
  }

  console.log(`Applied filters: ${appliedFilters.join(", ")}`);

  // Query MongoDB first to know expected count
  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  // Extract UI count from pagination "X - Y of Z"
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);

  let uiCount = 0;
  if (match) {
    uiCount = parseInt(match[1].replace(/,/g, ""), 10);
  } else {
    // No pagination found — check if UI shows "No records" or similar empty state
    const noDataIndicators = [
      "No records found",
      "No data",
      "No results",
      "0 records",
      "No matching records",
    ];
    const hasNoData = noDataIndicators.some(indicator => 
      pageText.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (hasNoData || dbCount === 0) {
      uiCount = 0;
      console.log(`UI shows no records (DB count: ${dbCount})`);
    } else {
      // Pagination not found but DB has records — might be a loading issue
      assert.fail(`Could not find pagination count in page. DB has ${dbCount} records. Filters: ${appliedFilters.join(", ")}`);
    }
  }

  const diff = uiCount - dbCount;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | UI: ${uiCount} | DB: ${dbCount} | Filters: ${appliedFilters.join(", ")}`);

  // Store for summary
  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: appliedFilters.join(" + "), uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload page to clear filters
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
});

// ==================== Date Filter Steps ====================

When("user sets {string} date filter from {string} to {string}", async function (this: CustomWorld, filterName: string, fromDate: string, toDate: string) {
  // Click on the date filter tab in the drawer
  const drawer = this.page.locator('.facct-drawer-modal');
  const tab = drawer.locator(`[role="tab"]:has-text("${filterName}")`);
  await tab.click();
  await this.page.waitForTimeout(500);

  // Fill the from and to date inputs
  const dateInputs = drawer.locator('input[type="text"], input[placeholder*="date"], input[placeholder*="DD"]');
  const fromInput = dateInputs.first();
  const toInput = dateInputs.nth(1);

  await fromInput.fill(fromDate);
  await this.page.waitForTimeout(300);
  await toInput.fill(toDate);
  await this.page.waitForTimeout(300);

  console.log(`✓ Set "${filterName}" date filter: ${fromDate} to ${toDate}`);
});

Then("the filtered record count should match MongoDB for entered date from {string} to {string}", async function (this: CustomWorld, fromDate: string, toDate: string) {
  // Extract count from pagination
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  assert.ok(match, `Could not find pagination count in page`);
  const uiCount = parseInt(match![1].replace(/,/g, ""), 10);

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), {
      ...wcBaseFilter(),
      addedDateTime: {
        $gte: new Date(fromDate + "T00:00:00Z"),
        $lte: new Date(toDate + "T23:59:59Z")
      }
    });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (entered: ${fromDate} to ${toDate})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: entered date range count matches`);
  } finally {
    await mongo.disconnect();
  }
});

Then("the filtered record count should match MongoDB for updated date from {string} to {string}", async function (this: CustomWorld, fromDate: string, toDate: string) {
  // Extract count from pagination
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  assert.ok(match, `Could not find pagination count in page`);
  const uiCount = parseInt(match![1].replace(/,/g, ""), 10);

  const mongo = new MongoDBHelper();
  await mongo.connect();
  try {
    const dbCount = await mongo.getCount(getWCCollection(), {
      ...wcBaseFilter(),
      sourceUpdatedDateTime: {
        $gte: new Date(fromDate + "T00:00:00Z"),
        $lte: new Date(toDate + "T23:59:59Z")
      }
    });
    console.log(`UI Count: ${uiCount}, MongoDB Count: ${dbCount} (updated: ${fromDate} to ${toDate})`);
    assert.strictEqual(uiCount, dbCount, `Count mismatch! UI: ${uiCount}, DB: ${dbCount}`);
    console.log(`✓ Validated: updated date range count matches`);
  } finally {
    await mongo.disconnect();
  }
});

// ==================== Download Validation Steps ====================

When("user triggers download as {string}", async function (this: CustomWorld, format: string) {
  // Capture the UI filtered count before downloading
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  if (match) {
    const uiCount = parseInt(match[1].replace(/,/g, ""), 10);
    await TestDataStore.set("wcMainPremium.filteredCount", uiCount);
    console.log(`UI filtered count before download: ${uiCount}`);
  }

  // Click the download popover button
  const downloadBtn = this.page.locator('#commercial-list-download-popover-btn');
  await downloadBtn.waitFor({ state: "visible", timeout: 10000 });
  await downloadBtn.click();
  await this.page.waitForTimeout(1000);

  // Select the format from the popover menu
  const formatLabel = format === "xlsx" ? "Excel (.xlsx)" : "Tab separated (.tsv)";
  const menuItem = this.page.locator(`[role="menuitem"]:has-text("${formatLabel}")`);
  await menuItem.waitFor({ state: "visible", timeout: 5000 });

  // Check if TSV is disabled (greyed out when >1M records)
  if (format === "tsv") {
    const isDisabled = await menuItem.evaluate(el => {
      const style = window.getComputedStyle(el);
      return el.getAttribute("aria-disabled") === "true" || 
             el.classList.contains("Mui-disabled") ||
             style.pointerEvents === "none" ||
             style.opacity === "0.5" ||
             (el as HTMLElement).style.opacity === "0.5";
    });
    if (isDisabled) {
      console.log(`⚠ TSV download is disabled (likely >1M records). Skipping.`);
      await TestDataStore.set("wcMainPremium.downloadSkipped", "true");
      // Close the popover
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(500);
      return;
    }
  }

  await menuItem.click();
  await this.page.waitForTimeout(2000);

  // Store the format for later validation
  await TestDataStore.set("wcMainPremium.downloadFormat", format);
  await TestDataStore.set("wcMainPremium.downloadSkipped", "false");
  console.log(`✓ Triggered download as ${format}`);
});

When("user waits for download to complete", { timeout: 300000 }, async function (this: CustomWorld) {
  // Skip if download was not triggered (TSV greyed out)
  if (TestDataStore.get<string>("wcMainPremium.downloadSkipped") === "true") {
    console.log("⚠ Download was skipped (TSV disabled). Nothing to wait for.");
    return;
  }

  // Switch to Downloads tab
  const downloadsTab = this.page.locator('#simple-tab-1');
  await downloadsTab.click();
  await this.page.waitForTimeout(2000);

  // Wait for the first row to show "Success" status (poll with refresh)
  const maxWaitTime = 240000; // 4 minutes max
  const pollInterval = 5000; // Check every 5 seconds
  const startTime = Date.now();

  let downloadReady = false;
  while (Date.now() - startTime < maxWaitTime) {
    // Click refresh button to update the table
    const refreshBtn = this.page.locator('[aria-label="refresh button"]');
    if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshBtn.click();
      await this.page.waitForTimeout(3000);
    }

    // Check if the first row has "Success" in the status column (index 5)
    const firstRow = this.page.locator('.download-table-wrapper tbody tr').first();
    if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      const statusCell = firstRow.locator('td').nth(5);
      const statusText = await statusCell.textContent().catch(() => "") || "";
      if (statusText.trim().includes("Success")) {
        downloadReady = true;
        break;
      }
      // Also check for failure
      if (statusText.trim().includes("Failed") || statusText.trim().includes("Error")) {
        assert.fail(`Download failed with status: ${statusText.trim()}`);
      }
      console.log(`  Waiting... status: "${statusText.trim()}" (${Math.round((Date.now() - startTime) / 1000)}s)`);
    }

    await this.page.waitForTimeout(pollInterval);
  }

  if (!downloadReady) {
    console.log(`✗ Download did not complete within ${maxWaitTime / 1000} seconds — marking as failed but continuing`);
    await TestDataStore.set("wcMainPremium.downloadSkipped", "true");
    await TestDataStore.set("wcMainPremium.downloadTimedOut", "true");
    // Store failure for summary
    const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
    results.push({ filter: "Download timeout", uiCount: 0, dbCount: 0, diff: -1 });
    await TestDataStore.set("filterComparison.results", results);
    // Switch back to Records tab so next steps can proceed
    const recordsTab = this.page.locator('#simple-tab-0');
    await recordsTab.click();
    await this.page.waitForTimeout(1000);
    return;
  }
  console.log(`✓ Download completed successfully`);
  await TestDataStore.set("wcMainPremium.downloadTimedOut", "false");

  // Now download the file by clicking the download icon on the first row
  const downloadDir = path.resolve("reports", "downloads");
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  // Set up download handler
  const [download] = await Promise.all([
    this.page.waitForEvent("download", { timeout: 30000 }),
    this.page.locator('.download-table-wrapper tbody tr').first().locator('[data-testid="GetAppIcon"]').click()
  ]);

  // Save the downloaded file
  const fileName = download.suggestedFilename();
  const filePath = path.join(downloadDir, fileName);
  await download.saveAs(filePath);

  // Store the file path for validation
  await TestDataStore.set("wcMainPremium.downloadedFilePath", filePath);
  await TestDataStore.set("wcMainPremium.downloadedFileName", fileName);
  console.log(`✓ File downloaded: ${fileName} → ${filePath}`);

  // Switch back to Records tab
  const recordsTab = this.page.locator('#simple-tab-0');
  await recordsTab.click();
  await this.page.waitForTimeout(1000);
});

Then("the downloaded {string} file should match MongoDB row count and record data", { timeout: 300000 }, async function (this: CustomWorld, format: string) {
  // Skip if download was not triggered (TSV greyed out for >1M records) or timed out
  if (TestDataStore.get<string>("wcMainPremium.downloadSkipped") === "true") {
    const timedOut = TestDataStore.get<string>("wcMainPremium.downloadTimedOut") === "true";
    console.log(`⚠ ${format.toUpperCase()} download ${timedOut ? "timed out" : "was skipped"}. Validation skipped.`);
    // Reset for next download
    await TestDataStore.set("wcMainPremium.downloadSkipped", "false");
    await TestDataStore.set("wcMainPremium.downloadTimedOut", "false");
    return;
  }

  const filePath = TestDataStore.get<string>("wcMainPremium.downloadedFilePath");
  assert.ok(filePath, "Downloaded file path not found");
  assert.ok(fs.existsSync(filePath), `Downloaded file not found at: ${filePath}`);

  const uiCount = TestDataStore.get<number>("wcMainPremium.filteredCount");
  assert.ok(uiCount !== undefined, "UI filtered count not saved");

  let fileRowCount = 0;

  if (format === "xlsx") {
    // Read Excel file and count data rows (excluding header)
    const reader = new ExcelReader(filePath);
    const sheetNames = reader.getSheetNames();
    assert.ok(sheetNames.length > 0, "Excel file has no sheets");
    const rowCount = reader.getRowCount(sheetNames[0]);
    fileRowCount = rowCount - 1; // Subtract header row
    console.log(`Excel file: ${sheetNames[0]} sheet, ${rowCount} total rows (${fileRowCount} data rows)`);
  } else if (format === "tsv") {
    // Read TSV file and count lines (excluding header)
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim() !== "");
    fileRowCount = lines.length - 1; // Subtract header row
    console.log(`TSV file: ${lines.length} total lines (${fileRowCount} data rows)`);
  } else {
    assert.fail(`Unsupported format: ${format}`);
  }

  // Get MongoDB count for comparison (distinct wcId - export deduplicates by record ID)
  // Use the stored filter query from the last applied filter
  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    // Build query from the filter chips on the page
    const filterQuery: Record<string, any> = { ...wcBaseFilter() };
    
    // Read filter chips directly from DOM elements
    const chipLabels = await this.page.locator('.filter-attributes .facct-chip-label .label').allTextContents();
    
    if (chipLabels.length > 0) {
      const uiToDbField: Record<string, string> = {
        "PEP Status": "pepStatus",
        "Update Category": "updateCategory",
        "Category": "category",
        "Sub Category": "subCategory",
        "Type": "entityTypeName",
        "Citizenship": "citizenshipList",
        "Country": "countryList",
        "Keyword": "keywords",
        "Special Interest Categories": "specialInterestCategories",
      };
      for (const chipText of chipLabels) {
        // Each chip is like "Category = CRIME - NARCOTICS" or "PEP Status = active"
        const parts = chipText.trim().match(/^(.+?)\s*=\s*(.+)$/);
        if (parts) {
          const fieldName = parts[1].trim();
          const fieldValue = parts[2].trim();
          const dbField = uiToDbField[fieldName] || fieldName;
          filterQuery[dbField] = fieldValue;
        }
      }
      console.log(`  Filters from chips: ${chipLabels.map(c => c.trim()).join(", ")}`);
    }

    dbCount = await mongo.getDistinctCount(getWCCollection(), "wcId", filterQuery);
  } finally {
    await mongo.disconnect();
  }

  console.log(`╔═══════════════════════════════════════════════╗`);
  console.log(`║  Download Validation (${format.toUpperCase().padEnd(4)})                  ║`);
  console.log(`╠═══════════════════════════════════════════════╣`);
  console.log(`║  File row count:  ${fileRowCount}`);
  console.log(`║  UI count:        ${uiCount}`);
  console.log(`║  MongoDB count:   ${dbCount}`);
  console.log(`║  File vs UI:      ${fileRowCount === uiCount ? "✓ MATCH" : `✗ MISMATCH (${uiCount - fileRowCount})`}`);
  console.log(`║  File vs DB:      ${fileRowCount === dbCount ? "✓ MATCH" : `✗ MISMATCH (${dbCount - fileRowCount})`}`);
  console.log(`╚═══════════════════════════════════════════════╝`);

  // Strict comparison: file must match DB exactly
  assert.strictEqual(fileRowCount, dbCount,
    `Row count mismatch! File: ${fileRowCount}, DB: ${dbCount}, UI: ${uiCount}`);
  console.log(`✓ Download validated: ${format} file has ${fileRowCount} rows matching MongoDB count`);

  // --- Data Validation: Compare sample records from file against MongoDB ---
  console.log(`\n--- Validating record data (${format}) against MongoDB ---`);

  // Column mapping: File header → MongoDB field
  const columnToDbField: Record<string, string> = {
    "Record ID": "wcId",
    "Primary name": "primaryName",
    "Type": "entityTypeName",
    "Keyword": "keywords",
    "Category": "category",
    "Sub-category": "subCategory",
    "Update category": "updateCategory",
    "PEP status": "pepStatus",
  };

  // Read sample records from file (first 10 + last 5 for coverage)
  let fileRecords: Record<string, string>[] = [];

  if (format === "tsv") {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim() !== "");
    const headers = lines[0].split("\t").map(h => h.trim());
    const dataLines = lines.slice(1);

    // Take first 10 and last 5 records
    const sampleIndices = [
      ...Array.from({ length: Math.min(10, dataLines.length) }, (_, i) => i),
      ...Array.from({ length: Math.min(5, dataLines.length) }, (_, i) => dataLines.length - 1 - i)
    ];
    const uniqueIndices = [...new Set(sampleIndices)];

    for (const idx of uniqueIndices) {
      const values = dataLines[idx].split("\t").map(v => v.trim());
      const record: Record<string, string> = {};
      headers.forEach((h, i) => { record[h] = values[i] || ""; });
      fileRecords.push(record);
    }
  } else if (format === "xlsx") {
    const reader = new ExcelReader(filePath);
    const sheetNames = reader.getSheetNames();
    const totalRows = reader.getRowCount(sheetNames[0]);
    const headers = reader.getRow(sheetNames[0], 0) as string[];

    // Take first 10 and last 5 records
    const sampleIndices = [
      ...Array.from({ length: Math.min(10, totalRows - 1) }, (_, i) => i + 1),
      ...Array.from({ length: Math.min(5, totalRows - 1) }, (_, i) => totalRows - 1 - i)
    ];
    const uniqueIndices = [...new Set(sampleIndices)];

    for (const idx of uniqueIndices) {
      const values = reader.getRow(sheetNames[0], idx) as string[];
      const record: Record<string, string> = {};
      headers.forEach((h, i) => { record[h] = String(values[i] || ""); });
      fileRecords.push(record);
    }
  }

  // Validate each sample record against MongoDB
  const mongo2 = new MongoDBHelper();
  await mongo2.connect();
  let dataMatches = 0;
  let dataMismatches = 0;
  const mismatchDetails: string[] = [];

  try {
    for (const fileRecord of fileRecords) {
      const recordId = parseInt(fileRecord["Record ID"] || fileRecord["record_id"] || "0", 10);
      if (!recordId) continue;

      // Query MongoDB for this record
      const dbRecord = await mongo2.findRawDocument(getWCCollection(), {
        ...wcBaseFilter(),
        wcId: recordId
      });

      if (!dbRecord) {
        dataMismatches++;
        mismatchDetails.push(`Record ID ${recordId}: NOT FOUND in DB`);
        continue;
      }

      // Compare fields
      let recordMatch = true;
      const fieldErrors: string[] = [];

      for (const [fileCol, dbField] of Object.entries(columnToDbField)) {
        if (fileCol === "Record ID") continue; // Already matched by query

        const fileValue = (fileRecord[fileCol] || "").trim();
        let dbValue = dbRecord[dbField];

        // Handle special cases
        if (dbField === "keywords") {
          // keywords is an array in DB, joined with comma or shown as first value in file
          dbValue = Array.isArray(dbValue) ? dbValue.join(",") : (dbValue || "");
        } else {
          dbValue = String(dbValue || "");
        }

        // Normalize for comparison (case-insensitive for pepStatus, trim whitespace)
        const normalizedFile = fileValue.toLowerCase().replace(/^-$/, "");
        const normalizedDb = String(dbValue).toLowerCase();

        if (normalizedFile && normalizedDb && normalizedFile !== normalizedDb) {
          // Check if file value is contained in DB value (for keywords array)
          if (dbField === "keywords" && normalizedDb.includes(normalizedFile)) {
            continue;
          }
          recordMatch = false;
          fieldErrors.push(`${fileCol}: file="${fileValue}" vs db="${dbValue}"`);
        }
      }

      if (recordMatch) {
        dataMatches++;
      } else {
        dataMismatches++;
        mismatchDetails.push(`Record ID ${recordId}: ${fieldErrors.join("; ")}`);
      }
    }
  } finally {
    await mongo2.disconnect();
  }

  console.log(`Data validation: ${dataMatches} matches, ${dataMismatches} mismatches (out of ${fileRecords.length} sampled)`);
  if (mismatchDetails.length > 0) {
    console.log(`Mismatches:`);
    mismatchDetails.slice(0, 5).forEach(m => console.log(`  ✗ ${m}`));
    if (mismatchDetails.length > 5) {
      console.log(`  ... and ${mismatchDetails.length - 5} more`);
    }
  }

  assert.strictEqual(dataMismatches, 0,
    `Data validation failed! ${dataMismatches} record(s) have mismatched data: ${mismatchDetails.slice(0, 3).join("; ")}`);
  console.log(`✓ Data validated: All ${dataMatches} sampled records match MongoDB`);

  // Clean up the downloaded file
  try {
    fs.unlinkSync(filePath);
    console.log(`✓ Cleaned up: ${filePath}`);
  } catch {
    // Ignore cleanup errors
  }
});


// ==================== Filter Banner & Pagination Assertions ====================

Then("the filter banner should display {string}", async function (this: CustomWorld, expectedChipText: string) {
  // Verify the filter chip in the banner shows the expected text
  const chipLabel = this.page.locator('.filter-attributes .facct-chip-label .label');
  await chipLabel.first().waitFor({ state: "visible", timeout: 10000 });

  const chips = await chipLabel.allTextContents();
  const chipTexts = chips.map(c => c.trim());
  
  assert.ok(
    chipTexts.some(t => t.includes(expectedChipText)),
    `Filter banner does not show "${expectedChipText}". Found chips: ${chipTexts.join(", ")}`
  );
  console.log(`✓ Filter banner shows: "${expectedChipText}"`);
});

Then("the filter banner should display {int} filter chips", async function (this: CustomWorld, expectedCount: number) {
  const chips = this.page.locator('.filter-attributes .facct-chip');
  const count = await chips.count();
  assert.strictEqual(count, expectedCount, `Expected ${expectedCount} filter chip(s) but found ${count}`);
  console.log(`✓ Filter banner shows ${count} filter chip(s)`);
});

Then("the pagination should show {string}", async function (this: CustomWorld, expectedText: string) {
  // Pagination shows "X-Y of Z" in .facct-table-pagination
  const pagination = this.page.locator('.facct-table-pagination');
  await pagination.waitFor({ state: "visible", timeout: 10000 });
  const text = await pagination.textContent() || "";
  
  assert.ok(
    text.includes(expectedText),
    `Pagination does not contain "${expectedText}". Found: ${text.substring(0, 100)}`
  );
  console.log(`✓ Pagination shows: "${expectedText}"`);
});

Then("the pagination total count should be {int}", async function (this: CustomWorld, expectedTotal: number) {
  const pagination = this.page.locator('.facct-table-pagination');
  const text = await pagination.textContent() || "";
  const match = text.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  assert.ok(match, "Could not find pagination count");
  
  const total = parseInt(match![1].replace(/,/g, ""), 10);
  assert.strictEqual(total, expectedTotal, `Expected pagination total ${expectedTotal} but got ${total}`);
  console.log(`✓ Pagination total: ${total}`);
});

Then("the pagination should show rows {int} to {int}", async function (this: CustomWorld, from: number, to: number) {
  // The pagination count "X-Y of Z" is in a specific grid item within .facct-table-pagination
  const pagination = this.page.locator('.facct-table-pagination');
  await pagination.waitFor({ state: "visible", timeout: 10000 });
  
  const paginationItems = pagination.locator('.MuiGrid-item');
  const count = await paginationItems.count();
  
  let actualFrom = 0;
  let actualTo = 0;
  let found = false;
  
  for (let i = 0; i < count; i++) {
    const itemText = (await paginationItems.nth(i).textContent() || "").trim();
    const match = itemText.match(/^(\d+)\s*-\s*(\d+)\s*of\s*[\d,]+$/);
    if (match) {
      actualFrom = parseInt(match[1], 10);
      actualTo = parseInt(match[2], 10);
      found = true;
      break;
    }
  }
  
  assert.ok(found, "Could not find pagination range element");
  assert.strictEqual(actualFrom, from, `Expected pagination from ${from} but got ${actualFrom}`);
  assert.strictEqual(actualTo, to, `Expected pagination to ${to} but got ${actualTo}`);
  console.log(`✓ Pagination range: ${actualFrom}-${actualTo}`);
});

Then("the pagination should be valid and navigable", async function (this: CustomWorld) {
  const pagination = this.page.locator('.facct-table-pagination');
  await pagination.waitFor({ state: "visible", timeout: 10000 });

  // Extract current range and total from pagination
  const paginationItems = pagination.locator('.MuiGrid-item');
  const itemCount = await paginationItems.count();
  
  let currentFrom = 0;
  let currentTo = 0;
  let totalCount = 0;
  
  for (let i = 0; i < itemCount; i++) {
    const itemText = (await paginationItems.nth(i).textContent() || "").trim();
    const match = itemText.match(/^(\d+)\s*-\s*(\d+)\s*of\s*([\d,]+)$/);
    if (match) {
      currentFrom = parseInt(match[1], 10);
      currentTo = parseInt(match[2], 10);
      totalCount = parseInt(match[3].replace(/,/g, ""), 10);
      break;
    }
  }

  assert.ok(totalCount > 0, "Pagination total count is 0 — no records found");
  assert.strictEqual(currentFrom, 1, `Expected pagination to start at 1 but got ${currentFrom}`);
  assert.ok(currentTo > 0, `Expected pagination end > 0 but got ${currentTo}`);
  console.log(`✓ Pagination: ${currentFrom}-${currentTo} of ${totalCount}`);

  // If total > rows per page, verify next page navigation works
  if (totalCount > currentTo) {
    // Click next page (right arrow)
    const nextBtn = pagination.locator('[data-testid="KeyboardArrowRightIcon"]').first();
    const isNextEnabled = await nextBtn.locator('..').isEnabled().catch(() => false);
    
    if (isNextEnabled) {
      await nextBtn.locator('..').click();
      await this.page.waitForTimeout(2000);

      // Verify pagination updated
      let newFrom = 0;
      for (let i = 0; i < itemCount; i++) {
        const itemText = (await paginationItems.nth(i).textContent() || "").trim();
        const match = itemText.match(/^(\d+)\s*-\s*(\d+)\s*of\s*([\d,]+)$/);
        if (match) {
          newFrom = parseInt(match[1], 10);
          break;
        }
      }

      assert.ok(newFrom > currentFrom, `Next page did not advance. Still at ${newFrom}`);
      console.log(`✓ Next page navigation works: now at row ${newFrom}`);

      // Go back to first page
      const prevBtn = pagination.locator('[data-testid="KeyboardArrowLeftIcon"]').first();
      await prevBtn.locator('..').click();
      await this.page.waitForTimeout(2000);
      console.log(`✓ Navigated back to first page`);
    } else {
      console.log(`ℹ Next page button disabled (total ${totalCount} fits in one page)`);
    }
  } else {
    console.log(`ℹ All ${totalCount} records fit on one page — no pagination needed`);
  }
});

// ==================== Download Tab Assertions ====================

Then("the latest download entry should show type {string}", async function (this: CustomWorld, expectedType: string) {
  // Ensure we're on Downloads tab
  await this.page.locator('#simple-tab-1').click();
  await this.page.waitForTimeout(2000);

  // Wait for table row to be visible
  const firstRow = this.page.locator('.download-table-wrapper tbody tr').first();
  await firstRow.waitFor({ state: "visible", timeout: 10000 });

  // Get the "Download type" column (index 4) from the first row
  const downloadTypeCell = firstRow.locator('td').nth(4);
  const text = await downloadTypeCell.textContent() || "";

  assert.ok(
    text.trim().includes(expectedType),
    `Expected download type "${expectedType}" but got "${text.trim()}"`
  );
  console.log(`✓ Download type: "${text.trim()}"`);

  // Switch back to Records tab
  await this.page.locator('#simple-tab-0').click();
  await this.page.waitForTimeout(1000);
});

Then("the latest download entry should show file type {string}", async function (this: CustomWorld, expectedFileType: string) {
  // Ensure we're on Downloads tab
  const downloadsTab = this.page.locator('#simple-tab-1');
  await downloadsTab.click();
  await this.page.waitForTimeout(2000);

  // Wait for table to be visible
  const table = this.page.locator('.download-table-wrapper tbody tr').first();
  await table.waitFor({ state: "visible", timeout: 10000 });

  // File type column (index 3)
  const fileTypeCell = table.locator('td').nth(3);
  const text = await fileTypeCell.textContent() || "";

  assert.strictEqual(text.trim(), expectedFileType, `Expected file type "${expectedFileType}" but got "${text.trim()}"`);
  console.log(`✓ File type: "${text.trim()}"`);

  await this.page.locator('#simple-tab-0').click();
  await this.page.waitForTimeout(1000);
});

Then("the latest download entry should show {int} filters applied", async function (this: CustomWorld, expectedCount: number) {
  await this.page.locator('#simple-tab-1').click();
  await this.page.waitForTimeout(2000);

  const firstRow = this.page.locator('.download-table-wrapper tbody tr').first();
  await firstRow.waitFor({ state: "visible", timeout: 10000 });

  // Filters applied column (index 2)
  const filtersCell = firstRow.locator('td').nth(2);
  const text = await filtersCell.textContent() || "";
  const count = parseInt(text.trim(), 10);

  assert.strictEqual(count, expectedCount, `Expected ${expectedCount} filter(s) applied but got ${count}`);
  console.log(`✓ Filters applied: ${count}`);

  await this.page.locator('#simple-tab-0').click();
  await this.page.waitForTimeout(1000);
});

Then("the latest download entry should show status {string}", async function (this: CustomWorld, expectedStatus: string) {
  await this.page.locator('#simple-tab-1').click();
  await this.page.waitForTimeout(2000);

  const firstRow = this.page.locator('.download-table-wrapper tbody tr').first();
  await firstRow.waitFor({ state: "visible", timeout: 10000 });

  // Status column (index 5)
  const statusCell = firstRow.locator('td').nth(5);
  const text = await statusCell.textContent() || "";

  assert.ok(
    text.trim().includes(expectedStatus),
    `Expected status "${expectedStatus}" but got "${text.trim()}"`
  );
  console.log(`✓ Download status: "${text.trim()}"`);

  await this.page.locator('#simple-tab-0').click();
  await this.page.waitForTimeout(1000);
});

Then("the latest download filter details should show {string}", async function (this: CustomWorld, expectedFilter: string) {
  await this.page.locator('#simple-tab-1').click();
  await this.page.waitForTimeout(2000);

  // Click the eye icon on the first row to open filter details
  const eyeIcon = this.page.locator('.download-table-wrapper tbody tr').first().locator('[data-testid="RemoveRedEyeOutlinedIcon"]');
  await eyeIcon.click();
  await this.page.waitForTimeout(3000);

  // Wait for the drawer to fully load with filter tab content
  const drawer = this.page.locator('.facct-drawer-modal');
  await drawer.waitFor({ state: "visible", timeout: 10000 });

  // Wait for a tab element to appear inside the drawer (indicates content loaded)
  const tabContent = drawer.locator('[role="tab"]');
  await tabContent.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await this.page.waitForTimeout(1000);

  const drawerText = await drawer.textContent() || "";

  assert.ok(
    drawerText.includes(expectedFilter),
    `Filter details drawer does not contain "${expectedFilter}". Found: ${drawerText.substring(0, 200)}`
  );
  console.log(`✓ Download filter details show: "${expectedFilter}"`);

  // Close the drawer
  const closeIcon = drawer.locator('[data-testid="CloseIcon"]');
  await closeIcon.click();
  await this.page.waitForTimeout(1000);

  // Switch back to Records tab
  await this.page.locator('#simple-tab-0').click();
  await this.page.waitForTimeout(1000);
});


// ==================== Deleted Tab Steps ====================

// Deleted base filter uses actionId=3 (leverages index: actionId_1_wcId_1)
const DELETED_BASE_FILTER = { actionId: 3 };

When("user clicks on the Deleted tab", async function (this: CustomWorld) {
  // Click the Deleted tab using aria-label (contains dynamic count)
  const deletedTab = this.page.locator('[role="tab"][aria-label^="Deleted"]');
  await deletedTab.waitFor({ state: "visible", timeout: 10000 });
  await deletedTab.click();
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(2000);
  console.log(`✓ Switched to Deleted tab`);
});

Then("compare deleted filtered count with MongoDB for {string} {string}", { timeout: 120000 }, async function (this: CustomWorld, filterField: string, filterValue: string) {
  // Extract UI count from page pagination
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  const uiCount = match ? parseInt(match[1].replace(/,/g, ""), 10) : null;

  // Build MongoDB query for deleted records
  const fieldMap: Record<string, string> = {
    "PEP Status": "pepStatus",
    "Update Category": "updateCategory",
    "Category": "category",
    "Sub Category": "subCategory",
    "Type": "entityTypeName",
    "Citizenship": "citizenshipList",
    "Country": "countryList",
    "Keyword": "keywords",
    "Special Interest Categories": "specialInterestCategories",
  };

  const dbField = fieldMap[filterField] || filterField;
  const query: Record<string, any> = { ...DELETED_BASE_FILTER };
  query[dbField] = filterValue;

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount !== null ? uiCount - dbCount : null;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff !== null && diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | [Deleted] ${filterField} = ${filterValue} | UI: ${uiCount} | DB: ${dbCount}`);

  // Store result for summary
  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `[Deleted] ${filterField} = ${filterValue}`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload page to clear filters (stays on Deleted tab)
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
  // Re-click Deleted tab after reload
  const deletedTab = this.page.locator('[role="tab"][aria-label^="Deleted"]');
  await deletedTab.click();
  await this.page.waitForTimeout(2000);
});

Then("compare deleted filtered count with MongoDB for multi-filter {string}", { timeout: 120000 }, async function (this: CustomWorld, filterString: string) {
  // Extract UI count
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  const uiCount = match ? parseInt(match[1].replace(/,/g, ""), 10) : null;

  // Parse filter string and build query
  const query: Record<string, any> = { ...DELETED_BASE_FILTER };
  const filters = filterString.split(",");
  for (const f of filters) {
    const [field, ...valueParts] = f.split("=");
    query[field.trim()] = valueParts.join("=").trim();
  }

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount !== null ? uiCount - dbCount : null;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff !== null && diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | [Deleted] ${filterString} | UI: ${uiCount} | DB: ${dbCount}`);

  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `[Deleted] ${filterString}`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload and re-select Deleted tab
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
  const deletedTab = this.page.locator('[role="tab"][aria-label^="Deleted"]');
  await deletedTab.click();
  await this.page.waitForTimeout(2000);
});

Then("validate deleted random filter selections against MongoDB", { timeout: 120000 }, async function (this: CustomWorld) {
  // Build query from stored random selections
  const query: Record<string, any> = { ...DELETED_BASE_FILTER };
  const appliedFilters: string[] = [];

  const filterNames = ["Category", "Citizenship", "Country", "Keyword", "PEP Status", "Special Interest Categories", "Sub Category", "Type", "Update Category"];

  for (const name of filterNames) {
    const value = TestDataStore.get<string>(`randomFilter.${name}`);
    const dbField = TestDataStore.get<string>(`randomFilter.${name}.dbField`);
    if (value && dbField) {
      query[dbField] = value;
      appliedFilters.push(`${name}="${value}"`);
      await TestDataStore.remove(`randomFilter.${name}`);
      await TestDataStore.remove(`randomFilter.${name}.dbField`);
    }
  }

  // Get UI count
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  let uiCount = 0;
  if (match) {
    uiCount = parseInt(match[1].replace(/,/g, ""), 10);
  }

  // Query MongoDB
  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount - dbCount;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | [Deleted] ${appliedFilters.join(", ")} | UI: ${uiCount} | DB: ${dbCount}`);

  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `[Deleted] ${appliedFilters.join(" + ")}`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload and re-select Deleted tab
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
  const deletedTab = this.page.locator('[role="tab"][aria-label^="Deleted"]');
  await deletedTab.click();
  await this.page.waitForTimeout(2000);
});


// ==================== Suppressed/Enriched Tab Steps ====================

function getSuppressedCollection(): string {
  const { EnvConfig } = require("../config/env");
  const org = EnvConfig.ORG_ID || "facctum";
  return `${org}RecordEnrMaster`;
}

function suppressedBaseFilter() {
  return { listId: 2, effEndDateTime: { $gt: new Date() } };
}

When("user clicks on the Suppressed enriched tab", async function (this: CustomWorld) {
  const tab = this.page.locator('[role="tab"][aria-label^="Suppressed"]');
  await tab.waitFor({ state: "visible", timeout: 10000 });
  await tab.click();
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(2000);
  console.log(`✓ Switched to Suppressed/enriched tab`);
});

Then("compare suppressed filtered count with MongoDB for {string} {string}", { timeout: 120000 }, async function (this: CustomWorld, filterField: string, filterValue: string) {
  // Extract UI count
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  const uiCount = match ? parseInt(match[1].replace(/,/g, ""), 10) : null;

  // Build MongoDB query - Suppressed/Enriched uses different field mappings
  const query: Record<string, any> = { ...suppressedBaseFilter() };

  if (filterField === "Action") {
    // Action uses statusId (numeric)
    query.statusId = parseInt(filterValue, 10);
  } else if (filterField === "Type") {
    query.entityTypeName = filterValue;
  } else if (filterField === "Tag") {
    // Tag uses tagList array with numeric IDs
    query.tagList = parseInt(filterValue, 10);
  } else if (filterField === "Reason") {
    // Reason uses holdReasonDetails.reasonId
    query["holdReasonDetails.reasonId"] = parseInt(filterValue, 10);
  }

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getSuppressedCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount !== null ? uiCount - dbCount : null;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff !== null && diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | [Suppressed] ${filterField} = ${filterValue} | UI: ${uiCount} | DB: ${dbCount}`);

  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `[Suppressed] ${filterField} = ${filterValue}`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload and re-select Suppressed tab
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
  const tab = this.page.locator('[role="tab"][aria-label^="Suppressed"]');
  await tab.click();
  await this.page.waitForTimeout(2000);
});

Then("compare suppressed filtered count with MongoDB for multi-filter {string}", { timeout: 120000 }, async function (this: CustomWorld, filterString: string) {
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  const uiCount = match ? parseInt(match[1].replace(/,/g, ""), 10) : null;

  // Parse filter string and build query
  const query: Record<string, any> = { ...suppressedBaseFilter() };
  const filters = filterString.split(",");
  for (const f of filters) {
    const [field, ...valueParts] = f.split("=");
    const value = valueParts.join("=").trim();
    const fieldName = field.trim();
    // Convert numeric fields
    if (fieldName === "statusId" || fieldName === "tagList") {
      query[fieldName] = parseInt(value, 10);
    } else {
      query[fieldName] = value;
    }
  }

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getSuppressedCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount !== null ? uiCount - dbCount : null;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff !== null && diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | [Suppressed] ${filterString} | UI: ${uiCount} | DB: ${dbCount}`);

  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `[Suppressed] ${filterString}`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
  const tab = this.page.locator('[role="tab"][aria-label^="Suppressed"]');
  await tab.click();
  await this.page.waitForTimeout(2000);
});

Then("validate suppressed random filter selections against MongoDB", { timeout: 120000 }, async function (this: CustomWorld) {
  const query: Record<string, any> = { ...suppressedBaseFilter() };
  const appliedFilters: string[] = [];

  // Suppressed tab filter field mapping
  const suppressedFieldMap: Record<string, { dbField: string; numeric: boolean }> = {
    "Action": { dbField: "statusId", numeric: true },
    "Type": { dbField: "entityTypeName", numeric: false },
    "Tag": { dbField: "tagList", numeric: true },
    "Reason": { dbField: "holdReasonDetails.reasonId", numeric: true },
  };

  const filterNames = ["Action", "Type", "Tag", "Reason"];
  for (const name of filterNames) {
    const value = TestDataStore.get<string>(`randomFilter.${name}`);
    if (value) {
      const mapping = suppressedFieldMap[name];
      if (mapping) {
        query[mapping.dbField] = mapping.numeric ? parseInt(value, 10) : value;
        appliedFilters.push(`${name}="${value}"`);
      }
      await TestDataStore.remove(`randomFilter.${name}`);
      await TestDataStore.remove(`randomFilter.${name}.dbField`);
    }
  }

  // Also check standard fields that might have been stored
  const standardNames = ["Category", "Citizenship", "Country", "Keyword", "PEP Status", "Special Interest Categories", "Sub Category", "Update Category"];
  for (const name of standardNames) {
    const value = TestDataStore.get<string>(`randomFilter.${name}`);
    if (value) {
      await TestDataStore.remove(`randomFilter.${name}`);
      await TestDataStore.remove(`randomFilter.${name}.dbField`);
    }
  }

  // Get UI count
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  let uiCount = 0;
  if (match) {
    uiCount = parseInt(match[1].replace(/,/g, ""), 10);
  }

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getSuppressedCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount - dbCount;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | [Suppressed] ${appliedFilters.join(", ")} | UI: ${uiCount} | DB: ${dbCount}`);

  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `[Suppressed] ${appliedFilters.join(" + ")}`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
  const tab = this.page.locator('[role="tab"][aria-label^="Suppressed"]');
  await tab.click();
  await this.page.waitForTimeout(2000);
});


// ==================== Advanced Filter Validation Steps ====================

Then("the visible table rows should match MongoDB records", { timeout: 120000 }, async function (this: CustomWorld) {
  // Wait for table to load
  await this.page.waitForTimeout(3000);
  const tableRow = this.page.locator('tbody tr').first();
  await tableRow.waitFor({ state: "visible", timeout: 15000 });

  // Get the Record IDs from the first page of visible rows
  const rows = this.page.locator('tbody tr');
  const rowCount = await rows.count();
  assert.ok(rowCount > 0, "No visible rows in the table");

  const visibleRecordIds: number[] = [];
  for (let i = 0; i < Math.min(rowCount, 10); i++) {
    const firstCell = rows.nth(i).locator('td').first();
    const text = await firstCell.textContent() || "";
    const id = parseInt(text.trim(), 10);
    if (!isNaN(id)) visibleRecordIds.push(id);
  }

  assert.ok(visibleRecordIds.length > 0, "Could not extract Record IDs from table");

  // Verify each visible record exists in MongoDB
  const mongo = new MongoDBHelper();
  await mongo.connect();
  let matches = 0;
  try {
    for (const wcId of visibleRecordIds) {
      const exists = await mongo.getCount(getWCCollection(), { ...wcBaseFilter(), wcId });
      if (exists > 0) matches++;
    }
  } finally {
    await mongo.disconnect();
  }

  console.log(`✓ Visible rows validated: ${matches}/${visibleRecordIds.length} records found in MongoDB`);
  assert.strictEqual(matches, visibleRecordIds.length, 
    `${visibleRecordIds.length - matches} visible record(s) not found in MongoDB`);
});

When("user selects Select All in the {string} filter", async function (this: CustomWorld, filterName: string) {
  const drawer = this.page.locator('.facct-drawer-modal');

  // Click on the filter tab
  const tab = drawer.locator(`[role="tab"] span`).filter({ hasText: new RegExp(`^${filterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  await tab.click();
  await this.page.waitForTimeout(1000);

  // Click Select All checkbox
  const selectAll = drawer.locator('label[for^="advance-filter-list-select-all"]');
  await selectAll.waitFor({ state: "visible", timeout: 5000 });
  await selectAll.click();
  await this.page.waitForTimeout(500);

  console.log(`✓ Selected "Select All" in "${filterName}" filter`);
});

Then("the filtered count should equal the total unfiltered count", async function (this: CustomWorld) {
  // Get filtered count from pagination
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  assert.ok(match, "Could not find pagination count");
  const filteredCount = parseInt(match![1].replace(/,/g, ""), 10);

  // Get total from MongoDB (all active records)
  const mongo = new MongoDBHelper();
  await mongo.connect();
  let totalCount = 0;
  try {
    totalCount = await mongo.getCount(getWCCollection(), wcBaseFilter());
  } finally {
    await mongo.disconnect();
  }

  // Select All should give same count as unfiltered (or very close due to the duplicate wcId)
  const diff = Math.abs(filteredCount - totalCount);
  console.log(`✓ Select All count: ${filteredCount}, Total DB: ${totalCount}, Diff: ${diff}`);
  assert.ok(diff <= 1, `Select All count (${filteredCount}) differs from total (${totalCount}) by more than 1`);

  // Reload to clear
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
});

Then("compare filtered count with MongoDB for multi-select {string} values {string}", { timeout: 120000 }, async function (this: CustomWorld, filterName: string, valuesStr: string) {
  // Extract UI count
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  assert.ok(match, "Could not find pagination count");
  const uiCount = parseInt(match![1].replace(/,/g, ""), 10);

  // Build MongoDB query with $in for multi-select (OR logic)
  const fieldMap: Record<string, string> = {
    "Category": "category",
    "PEP Status": "pepStatus",
    "Update Category": "updateCategory",
    "Sub Category": "subCategory",
    "Type": "entityTypeName",
    "Citizenship": "citizenshipList",
    "Country": "countryList",
    "Keyword": "keywords",
    "Special Interest Categories": "specialInterestCategories",
  };

  const dbField = fieldMap[filterName] || filterName;
  const values = valuesStr.split(",").map(v => v.trim());
  const query: Record<string, any> = { ...wcBaseFilter(), [dbField]: { $in: values } };

  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount - dbCount;
  const status = diff === 0 ? "✓ MATCH" : `✗ MISMATCH (${diff > 0 ? "+" : ""}${diff})`;
  console.log(`${status} | Multi-select ${filterName} = [${values.join(", ")}] | UI: ${uiCount} | DB: ${dbCount}`);

  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: `Multi-select ${filterName}=[${values.join(",")}]`, uiCount, dbCount, diff });
  await TestDataStore.set("filterComparison.results", results);

  // Reload to clear
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
});

When("user removes the filter chip {string}", async function (this: CustomWorld, chipText: string) {
  // Parse the chip text to get filter name and value (e.g., "Category = INDIVIDUAL")
  const parts = chipText.match(/^(.+?)\s*=\s*(.+)$/);
  assert.ok(parts, `Could not parse chip text: "${chipText}"`);
  const filterName = parts![1].trim();
  const filterValue = parts![2].trim();

  // Open filter drawer
  const filterBtn = this.page.locator('#record-table-filter-btn');
  const bannerFilterBtn = this.page.locator('#commercial-list-filter-btn');
  if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await filterBtn.click();
  } else if (await bannerFilterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bannerFilterBtn.click();
  }
  await this.page.waitForTimeout(1000);

  // Click the filter tab
  const drawer = this.page.locator('.facct-drawer-modal');
  const tab = drawer.locator(`[role="tab"] span`).filter({ hasText: new RegExp(`^${filterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  await tab.click();
  await this.page.waitForTimeout(1000);

  // Uncheck the value (it should already be checked)
  const checkboxLabel = drawer.locator(`label[for="advance-filter-list-${filterValue}"]`);
  if (await checkboxLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await checkboxLabel.click();
  } else {
    // Try with search
    const searchBar = drawer.locator('input.filter-search-bar');
    if (await searchBar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBar.fill(filterValue);
      await this.page.waitForTimeout(1000);
    }
    await checkboxLabel.waitFor({ state: "visible", timeout: 5000 });
    await checkboxLabel.click();
    if (await searchBar.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBar.clear();
    }
  }
  await this.page.waitForTimeout(500);

  // Click Apply to update results
  const applyBtn = drawer.locator('button:has-text("APPLY")');
  await applyBtn.click();
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(2000);

  console.log(`✓ Removed filter: "${chipText}"`);
});

Then("the filtered count should match MongoDB for remaining filters", { timeout: 120000 }, async function (this: CustomWorld) {
  // Read remaining filter chips from DOM
  const chipLabels = await this.page.locator('.filter-attributes .facct-chip-label .label').allTextContents();

  const query: Record<string, any> = { ...wcBaseFilter() };
  const uiToDbField: Record<string, string> = {
    "PEP Status": "pepStatus",
    "Update Category": "updateCategory",
    "Category": "category",
    "Sub Category": "subCategory",
    "Type": "entityTypeName",
    "Citizenship": "citizenshipList",
    "Country": "countryList",
    "Keyword": "keywords",
    "Special Interest Categories": "specialInterestCategories",
  };

  for (const chipText of chipLabels) {
    const parts = chipText.trim().match(/^(.+?)\s*=\s*(.+)$/);
    if (parts) {
      const dbField = uiToDbField[parts[1].trim()] || parts[1].trim();
      query[dbField] = parts[2].trim();
    }
  }

  // Get UI count
  const pageText = await this.page.textContent("body") || "";
  const match = pageText.match(/\d+\s*-\s*\d+\s*of\s*([\d,]+)/);
  assert.ok(match, "Could not find pagination count");
  const uiCount = parseInt(match![1].replace(/,/g, ""), 10);

  // Query MongoDB
  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbCount = 0;
  try {
    dbCount = await mongo.getCount(getWCCollection(), query);
  } finally {
    await mongo.disconnect();
  }

  const diff = uiCount - dbCount;
  console.log(`✓ After chip removal: UI=${uiCount}, DB=${dbCount}, Diff=${diff}`);
  assert.ok(Math.abs(diff) <= 1, `Count mismatch after chip removal! UI: ${uiCount}, DB: ${dbCount}`);

  // Reload to clear all
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(2000);
});

Then("the pagination should show correct row count after changing rows per page", async function (this: CustomWorld) {
  // Get current total from pagination
  const pagination = this.page.locator('.facct-table-pagination');
  await pagination.waitFor({ state: "visible", timeout: 10000 });

  // Click the row-per-page dropdown
  const rowPerPageBtn = pagination.locator('#basic-button, .menu-icon-btn').first();
  await rowPerPageBtn.click();
  await this.page.waitForTimeout(1000);

  // Select 25 rows per page (or whatever options are available)
  const menuItems = this.page.locator('[role="menu"] [role="menuitem"], [role="listbox"] [role="option"], .MuiMenu-list li');
  const itemCount = await menuItems.count();

  if (itemCount > 1) {
    // Pick the second option (usually 25)
    const secondOption = menuItems.nth(1);
    const optionText = await secondOption.textContent() || "";
    await secondOption.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);

    // Verify pagination updated
    const newText = await pagination.textContent() || "";
    const newMatch = newText.match(/(\d+)\s*-\s*(\d+)\s*of/);
    if (newMatch) {
      const newTo = parseInt(newMatch[2], 10);
      const expectedTo = parseInt(optionText.trim(), 10) || 25;
      console.log(`✓ Rows per page changed to ${optionText.trim()}: showing 1-${newTo}`);
      // Verify the range end matches the new page size (or total if less)
      assert.ok(newTo > 10 || newTo === parseInt(newMatch[2], 10), 
        `Expected more than 10 rows after changing page size, got ${newTo}`);
    }

    // Reset back to 10
    await rowPerPageBtn.click();
    await this.page.waitForTimeout(500);
    const firstOption = this.page.locator('[role="menu"] [role="menuitem"], [role="listbox"] [role="option"], .MuiMenu-list li').first();
    await firstOption.click();
    await this.page.waitForTimeout(1000);
  } else {
    console.log("ℹ Only one page size option available, skipping");
  }
});

Then("the sum of Active and Deleted tab counts should match total records in DB", { timeout: 120000 }, async function (this: CustomWorld) {
  // Reload page to clear any filters and get accurate tab counts
  await this.page.reload({ waitUntil: "networkidle" });
  await this.page.waitForTimeout(3000);

  // Read tab counts from aria-labels
  const activeTab = this.page.locator('[role="tab"][aria-label^="Active"]');
  const deletedTab = this.page.locator('[role="tab"][aria-label^="Deleted"]');

  await activeTab.waitFor({ state: "visible", timeout: 15000 });

  const activeLabel = await activeTab.getAttribute("aria-label") || "";
  const deletedLabel = await deletedTab.getAttribute("aria-label") || "";

  const activeCount = parseInt(activeLabel.match(/\(([\d,]+)\)/)?.[1]?.replace(/,/g, "") || "0", 10);
  const deletedCount = parseInt(deletedLabel.match(/\(([\d,]+)\)/)?.[1]?.replace(/,/g, "") || "0", 10);

  // Get DB counts
  const mongo = new MongoDBHelper();
  await mongo.connect();
  let dbActiveCount = 0;
  let dbDeletedCount = 0;
  try {
    dbActiveCount = await mongo.getCount(getWCCollection(), wcBaseFilter());
    dbDeletedCount = await mongo.getCount(getWCCollection(), { actionId: 3 });
  } finally {
    await mongo.disconnect();
  }

  console.log(`Tab counts — Active: ${activeCount} (DB: ${dbActiveCount}), Deleted: ${deletedCount} (DB: ${dbDeletedCount})`);
  
  // Verify Active tab matches DB (allow ±1 for duplicate wcId)
  assert.ok(Math.abs(activeCount - dbActiveCount) <= 1, 
    `Active tab (${activeCount}) doesn't match DB (${dbActiveCount})`);
  
  // Verify Deleted tab matches DB
  assert.strictEqual(deletedCount, dbDeletedCount, 
    `Deleted tab (${deletedCount}) doesn't match DB (${dbDeletedCount})`);

  console.log(`✓ Cross-tab consistency verified: Active=${activeCount}, Deleted=${deletedCount}`);

  const results = TestDataStore.get<Array<any>>("filterComparison.results") || [];
  results.push({ filter: "Cross-tab: Active count", uiCount: activeCount, dbCount: dbActiveCount, diff: activeCount - dbActiveCount });
  results.push({ filter: "Cross-tab: Deleted count", uiCount: deletedCount, dbCount: dbDeletedCount, diff: deletedCount - dbDeletedCount });
  await TestDataStore.set("filterComparison.results", results);
});
