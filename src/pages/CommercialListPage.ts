import { Locator, Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * CommercialListPage - Page object for navigating to WC Main Premium
 * commercial list and selecting clean records for parallel testing.
 */
export class CommercialListPage {
  // Navigation locators
  private listManagementCard: Locator;
  private watchlistDropdown: Locator;
  private commercialListOption: Locator;

  // Pagination
  private paginationNextBtn: Locator;

  constructor(private page: Page) {
    this.listManagementCard = page.locator('.product-card:has-text("List")').first();
    this.watchlistDropdown = page.locator('span.MuiListItemText-primary:has-text("Watchlist")');
    this.commercialListOption = page.locator('text=Commercial list');
    // Use multiple selectors for table rows to handle different DOM structures
    this.paginationNextBtn = page.locator('button[class*="pagination-next-btn"]').nth(1);
  }

  /**
   * Full navigation: Dashboard → List Management → Watchlist → Commercial list
   */
  async navigateToCommercialList(): Promise<void> {
    await this.listManagementCard.waitFor({ state: "visible", timeout: 15000 });
    await this.listManagementCard.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked List Management card");

    await this.watchlistDropdown.waitFor({ state: "visible", timeout: 15000 });
    await this.watchlistDropdown.click();
    await this.page.waitForTimeout(1000);
    logger.info("Clicked Watchlist dropdown");

    await this.commercialListOption.waitFor({ state: "visible", timeout: 10000 });
    await this.commercialListOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked Commercial list");
  }

  /**
   * Searches for and opens WC Main Premium list.
   */
  async openWCMainPremium(): Promise<void> {
    await this.page.waitForLoadState("networkidle");

    // Search for WC Main Premium
    const searchBox = this.page.locator('input[placeholder*="Search"]').first();
    await searchBox.waitFor({ state: "visible", timeout: 10000 });
    await searchBox.fill("WC Main Premium");
    await this.page.keyboard.press("Enter");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);

    // Click on the WC Main Premium link
    const wcLink = this.page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first();
    await wcLink.waitFor({ state: "visible", timeout: 10000 });
    await wcLink.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
    logger.info("Opened WC Main Premium list");
  }

  /**
   * Finds a clean record with no pending approval warning.
   * 
   * Actual DOM structure (from debug):
   * - Cell 0: Checkbox div + Record ID as text (e.g., "1", "3", "10")
   *   - Always has 1 SVG (the checkbox icon) — NOT an action icon
   *   - The Record ID is plain text, not a clickable link
   * - Cell 1: Primary Name
   * - Cell 2: Type (Entity/Individual)
   * - Cells 3-9: Keyword, Category, PEP, Classification, Status, Created, Updated
   * - Cell 10: Kebab menu (3-dot icon)
   * 
   * Since action icons (suppress/enrich/edit) are not visible in this table view,
   * we click into each record's profile and check for the pending approval warning.
   * 
   * Returns the record ID of the clean record, or null if none found.
   */
  async findCleanRecord(): Promise<string | null> {
    let maxPages = 10;

    while (maxPages > 0) {
      // Fresh locator each iteration (avoids stale references after pagination)
      const rows = this.page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
      const rc = await rows.count();
      logger.info(`Page: ${rc} rows`);

      for (let i = 0; i < rc; i++) {
        if (this.page.isClosed()) return null;

        const rid = (await rows.nth(i).locator('td').first().textContent() || "").trim();
        logger.info(`Checking ${rid}...`);

        // Open via kebab → Overview → wait for drawer (exact E2E debug pattern)
        await rows.nth(i).locator('.kebab-cell svg, td:last-child svg').first().click();
        await this.page.locator('[role="menuitem"]:has-text("Overview")').first().waitFor({ state: "visible", timeout: 5000 });
        await this.page.locator('[role="menuitem"]:has-text("Overview")').first().click();
        await this.page.waitForLoadState("networkidle");
        await this.page.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 15000 });
        await this.page.waitForTimeout(2000);

        // Verify the profile shows the correct Record ID (stale drawer guard)
        const profileText = await this.page.locator('.facct-drawer-paper').first().textContent().catch(() => "") || "";
        const ridMatch = profileText.match(/Record ID\s*(\d+)/);
        const profileRid = ridMatch ? ridMatch[1] : "";
        if (profileRid && profileRid !== rid) {
          logger.warn(`Profile shows Record ID ${profileRid}, expected ${rid} — stale drawer, skipping`);
          await this.page.locator('#lseg-footer-close-btn').click();
          await this.page.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
          await this.page.waitForTimeout(500);
          continue;
        }

        if (await this.page.locator('#lseg-footer-suppress-btn').isVisible({ timeout: 5000 }).catch(() => false)) {
          logger.info(`✅ Clean: ${rid}`);
          return rid;
        }

        // Close drawer (exact E2E debug pattern)
        await this.page.locator('#lseg-footer-close-btn').click();
        await this.page.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
        await this.page.waitForTimeout(500);
      }

      // Paginate — exact E2E debug pattern: .nth(1) with tabindex check + catch
      const nb = this.page.locator('button[class*="pagination-next-btn"]').nth(1);
      const nbCount = await this.page.locator('button[class*="pagination-next-btn"]').count();
      const nbVisible = await nb.isVisible({ timeout: 3000 }).catch(() => false);
      const nbTabIndex = await nb.getAttribute("tabindex").catch(() => "null");
      logger.info(`Pagination: ${nbCount} buttons found, .nth(1) visible=${nbVisible} tabindex=${nbTabIndex}`);
      if (nbTabIndex === "-1" || nbTabIndex === "null") {
        logger.warn("No more pages (tabindex=-1 or null)");
        break;
      }
      await nb.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 });
      logger.info("Navigated to next page");
      maxPages--;
    }

    logger.warn("No clean record found");
    return null;
  }

  /**
   * Closes the profile view shutter/panel.
   */
  async closeProfileView(): Promise<void> {
    // Use the stable ID first (confirmed from debug output)
    const closeBtn = this.page.locator('#lseg-footer-close-btn');
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(1500);
      // Wait for drawer to fully close
      await this.page.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      logger.info("Closed profile view");
      return;
    }

    // Fallback: try X icon
    const closeIcon = this.page.locator('[data-testid="CloseIcon"]').first();
    if (await closeIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeIcon.click();
      await this.page.waitForTimeout(1500);
      logger.info("Closed profile view (X icon)");
      return;
    }

    // Last resort: Escape
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(1500);
    logger.info("Closed profile view via Escape");
  }

  /**
   * Opens a specific record by its ID using kebab menu → Overview.
   */
  async openRecordById(recordId: string): Promise<void> {
    const rows = this.page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const cellText = await row.locator('td').first().textContent() || "";
      if (cellText.trim() === recordId) {
        const kebabIcon = row.locator('.kebab-cell svg, td:last-child svg').first();
        await kebabIcon.click();
        await this.page.waitForTimeout(1000);
        const overviewOption = this.page.locator(
          '[role="menuitem"]:has-text("Overview"), .MuiMenuItem-root:has-text("Overview"), li:has-text("Overview")'
        ).first();
        await overviewOption.click();
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(2000);
        logger.info(`Opened record: ${recordId}`);
        return;
      }
    }
    throw new Error(`Record ID ${recordId} not found in table`);
  }

  /**
   * Gets the current page URL for sharing with the approver window.
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Searches for a record by ID using the search bar and opens it via kebab → Overview.
   * Used by the stale tab to find the record without relying on pagination.
   */
  async searchAndOpenRecord(recordId: string): Promise<void> {
    // Find and use the search bar
    const searchInput = this.page.locator('input[placeholder*="Search by Record ID"]').first();
    let searchVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (searchVisible) {
      await searchInput.fill(recordId);
    } else {
      // Fallback to broader search
      const fallback = this.page.locator('input[placeholder*="Search"]').first();
      await fallback.waitFor({ state: "visible", timeout: 10000 });
      await fallback.fill(recordId);
    }

    await this.page.keyboard.press("Enter");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(3000);

    // Open the first result via kebab → Overview
    const rows = this.page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      throw new Error(`No results found for record ID: ${recordId}`);
    }

    const kebab = rows.first().locator('.kebab-cell svg, td:last-child svg').first();
    await kebab.waitFor({ state: "visible", timeout: 5000 });
    await kebab.click();
    await this.page.waitForTimeout(1000);

    const overviewOption = this.page.locator('[role="menuitem"]:has-text("Overview")').first();
    await overviewOption.waitFor({ state: "visible", timeout: 5000 });
    await overviewOption.click();
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);

    logger.info(`Searched and opened record: ${recordId}`);
  }
}
