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
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);

      const rows = this.page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr');
      const rowCount = await rows.count();
      logger.info(`Scanning ${rowCount} records on current page`);

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const firstCell = row.locator('td').first();

        // Extract the Record ID from Cell 0 text.
        // Cell 0 contains checkbox + Record ID number as text.
        const cellText = await firstCell.textContent() || "";
        const recordId = cellText.trim();
        logger.info(`Row ${i}: Record ID = "${recordId}"`);

        // Open profile via kebab menu (3-dot icon in last cell) → Overview
        const kebabIcon = row.locator('.kebab-cell svg, td:last-child svg').first();
        await kebabIcon.waitFor({ state: "visible", timeout: 5000 });
        await kebabIcon.click();
        await this.page.waitForTimeout(1000);

        // Click "Overview" from the popover menu
        const overviewOption = this.page.locator(
          '[role="menuitem"]:has-text("Overview"), ' +
          '.MuiMenuItem-root:has-text("Overview"), ' +
          'li:has-text("Overview")'
        ).first();
        await overviewOption.waitFor({ state: "visible", timeout: 5000 });
        await overviewOption.click();
        await this.page.waitForLoadState("networkidle");
        await this.page.waitForTimeout(2000);

        // Check for ANY warning/status that indicates the record is not clean
        const warningSelectors = [
          'text=This record is already pending approval',
          'text=This record already has a pending review task',
          'text=pending review',
          'text=pending approval',
          'text=Attribute suppressed',
          'text=Record suppressed',
        ];

        let hasWarning = false;
        for (const sel of warningSelectors) {
          const isVisible = await this.page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            const warningText = await this.page.locator(sel).first().textContent().catch(() => sel);
            logger.info(`Record ${recordId}: has warning "${warningText?.trim().substring(0, 60)}", skipping`);
            hasWarning = true;
            break;
          }
        }

        if (hasWarning) {
          await this.closeProfileView();
          continue;
        }

        logger.info(`Found clean record: ${recordId}`);
        return recordId;
      }

      // Paginate to next page
      const nextBtn = this.paginationNextBtn;
      const isDisabled = (await nextBtn.getAttribute("tabindex")) === "-1";
      if (isDisabled) {
        logger.warn("No more pages to scan");
        break;
      }
      await nextBtn.click();
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(2000);
      maxPages--;
    }

    logger.warn("No clean record found");
    return null;
  }

  /**
   * Closes the profile view shutter/panel.
   */
  async closeProfileView(): Promise<void> {
    const closeBtn = this.page.locator(
      '.facct-drawer-footer-wrapper button:has-text("CLOSE"), ' +
      'button[aria-label="close"], ' +
      '.profile-view-close, ' +
      '[data-testid="CloseIcon"]'
    ).first();

    const isVisible = await closeBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await closeBtn.click();
      await this.page.waitForTimeout(1000);
      logger.info("Closed profile view");
    } else {
      // Try pressing Escape as fallback
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(1000);
      logger.info("Closed profile view via Escape");
    }
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
