import { Locator, Page, expect } from "@playwright/test";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";

export class FacctumDashboardPage {
  private actions: PlaywrightActions;
  
  // Product card locators
  private listManagementCard: Locator;
  private customerScreeningCard: Locator;
  private transactionScreeningCard: Locator;
  private transactionMonitoringCard: Locator;

  // Help Guide panel locators
  private helpIconHeader: Locator;
  private helpGuidePanel: Locator;
  private helpGuidePanelTitle: Locator;
  private helpGuideIframe: Locator;
  private helpGuideCloseButton: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);
    
    // Initialize card locators using nth selector for reliability
    this.listManagementCard = page.locator('.facct-rawhtml').nth(0);
    this.customerScreeningCard = page.locator('.facct-rawhtml').nth(1);
    this.transactionScreeningCard = page.locator('.facct-rawhtml').nth(2);
    this.transactionMonitoringCard = page.locator('.facct-rawhtml').nth(3);

    // Initialize Help Guide panel locators
    this.helpIconHeader = page.locator('.facct-guidedocs svg, [data-testid="HelpOutlineIcon"]').first();
    this.helpGuidePanel = page.locator('.MuiDrawer-paperAnchorRight');
    this.helpGuidePanelTitle = page.locator('.facct-drawer-header-wrapper .header-content');
    this.helpGuideIframe = page.locator('iframe[title="Facctum Docx"]');
    this.helpGuideCloseButton = page.locator('.facct-drawer-footer-wrapper button:has-text("CLOSE")');
  }

  /**
   * Navigates to List Management module.
   */
  async navigateToListManagement(): Promise<void> {
    await this.actions.click(this.listManagementCard);
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to List Management");
  }

  /**
   * Navigates to Customer Screening module.
   */
  async navigateToCustomerScreening(): Promise<void> {
    await this.actions.click(this.customerScreeningCard);
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Customer Screening");
  }

  /**
   * Navigates to Transaction Screening module.
   */
  async navigateToTransactionScreening(): Promise<void> {
    await this.actions.click(this.transactionScreeningCard);
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Transaction Screening");
  }

  /**
   * Navigates to Transaction Monitoring module.
   */
  async navigateToTransactionMonitoring(): Promise<void> {
    await this.actions.click(this.transactionMonitoringCard);
    await this.page.waitForLoadState("networkidle");
    logger.info("Navigated to Transaction Monitoring");
  }

  /**
   * Clicks on a product card by name.
   * @param cardName - Name of the card (e.g., "Customer Screening")
   */
  async clickProductCard(cardName: string): Promise<void> {
    const normalizedName = cardName.replace(/\s+/g, "");
    const card = this.page.locator(`.facct-rawhtml`).filter({ hasText: normalizedName });
    await this.actions.click(card);
    await this.page.waitForLoadState("networkidle");
    logger.info(`Clicked on ${cardName} card`);
  }

  /**
   * Verifies the home page is displayed.
   */
  async verifyHomePageDisplayed(): Promise<void> {
    // Wait for page to be fully loaded first
    await this.page.waitForLoadState("domcontentloaded");
    
    // Wait for the dashboard container to be visible
    await this.page.locator("#facctumThemeProvider").waitFor({ state: "visible", timeout: 30000 });
    
    // Then wait for any product card to be visible (more flexible)
    const anyCard = this.page.locator('.facct-rawhtml, .facct-card, [class*="product-card"]').first();
    await anyCard.waitFor({ state: "visible", timeout: 30000 });
    
    logger.info("Home page verified");
  }

  /**
   * Checks if a product card is enabled (not disabled).
   * @param cardName - Name of the card (e.g., "Customer Screening", "List Management")
   */
  async isCardEnabled(cardName: string): Promise<boolean> {
    let card: Locator;
    
    switch (cardName) {
      case "List Management":
        card = this.listManagementCard;
        break;
      case "Customer Screening":
        card = this.customerScreeningCard;
        break;
      case "Transaction Screening":
        card = this.transactionScreeningCard;
        break;
      case "Transaction Monitoring":
        card = this.transactionMonitoringCard;
        break;
      default:
        card = this.page.locator('.facct-rawhtml').filter({ hasText: cardName });
    }
    
    // Check if card is visible and not disabled
    const isVisible = await card.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) return false;
    
    // Check for disabled class or attribute
    const isDisabled = await card.evaluate((el) => {
      return el.classList.contains('disabled') || 
             el.hasAttribute('disabled') ||
             el.getAttribute('aria-disabled') === 'true';
    }).catch(() => false);
    
    logger.info(`Card "${cardName}" enabled: ${!isDisabled}`);
    return !isDisabled;
  }

  /**
   * Logs out from the application.
   */
  async logout(): Promise<void> {
    // Click on user avatar
    await this.page.locator('.action-center .MuiAvatar-root').click();
    await this.page.waitForTimeout(500);
    
    // Click logout
    await this.page.locator('.logout').click();
    await this.page.waitForLoadState("networkidle");
    
    logger.info("Logged out from application");
  }

  /**
   * Collapses the left navigation panel.
   */
  async collapseLeftPanel(): Promise<void> {
    // Look for collapse button in the left panel
    const collapseButton = this.page.locator('[class*="collapse"], [aria-label*="collapse"], .sidebar-toggle').first();
    if (await collapseButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await collapseButton.click();
      await this.page.waitForTimeout(500);
      logger.info("Left panel collapsed");
    } else {
      logger.info("Collapse button not found or panel already collapsed");
    }
  }

  // ==================== Help Guide Panel Methods ====================

  /**
   * Opens the Help Guide panel by clicking the help icon in the header.
   */
  async openHelpGuidePanel(): Promise<void> {
    await this.helpIconHeader.click();
    await this.helpGuidePanel.waitFor({ state: "visible", timeout: 10000 });
    logger.info("Help Guide panel opened");
  }

  /**
   * Closes the Help Guide panel by clicking the CLOSE button.
   */
  async closeHelpGuidePanel(): Promise<void> {
    await this.helpGuideCloseButton.click();
    await this.helpGuidePanel.waitFor({ state: "hidden", timeout: 5000 });
    logger.info("Help Guide panel closed");
  }

  /**
   * Verifies the Help Guide panel is displayed.
   */
  async verifyHelpGuidePanelDisplayed(): Promise<void> {
    await expect(this.helpGuidePanel).toBeVisible({ timeout: 10000 });
    logger.info("Help Guide panel is displayed");
  }

  /**
   * Verifies the Help Guide panel is closed/hidden.
   */
  async verifyHelpGuidePanelClosed(): Promise<void> {
    await expect(this.helpGuidePanel).not.toBeVisible({ timeout: 5000 });
    logger.info("Help Guide panel is closed");
  }

  /**
   * Gets the Help Guide panel title text.
   */
  async getHelpGuidePanelTitle(): Promise<string> {
    const title = await this.helpGuidePanelTitle.textContent();
    return title || "";
  }

  /**
   * Verifies the Help Guide panel title matches expected text.
   * @param expectedTitle - Expected title text
   */
  async verifyHelpGuidePanelTitle(expectedTitle: string): Promise<void> {
    await expect(this.helpGuidePanelTitle).toHaveText(expectedTitle, { timeout: 5000 });
    logger.info(`Help Guide panel title verified: "${expectedTitle}"`);
  }

  /**
   * Gets the Help Guide iframe source URL.
   */
  async getHelpGuideIframeSrc(): Promise<string | null> {
    return await this.helpGuideIframe.getAttribute("src");
  }

  /**
   * Fetches and returns the text content from the Help Guide iframe.
   */
  async getHelpGuideContent(): Promise<string> {
    const iframeSrc = await this.getHelpGuideIframeSrc();
    
    if (!iframeSrc) {
      throw new Error("Help Guide iframe src not found");
    }
    
    // Fetch the iframe content
    const iframeContent = await this.page.evaluate(async (src) => {
      const response = await fetch(src);
      return response.text();
    }, iframeSrc);
    
    // Extract text content from HTML
    const textContent = iframeContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    return textContent;
  }

  /**
   * Verifies the Help Guide content contains the expected text.
   * @param expectedTexts - Array of text strings to verify
   * @returns Array of missing texts (empty if all found)
   */
  async verifyHelpGuideContentContains(expectedTexts: string[]): Promise<string[]> {
    const content = await this.getHelpGuideContent();
    const missingTexts: string[] = [];
    
    for (const text of expectedTexts) {
      if (!content.includes(text)) {
        missingTexts.push(text);
      }
    }
    
    if (missingTexts.length === 0) {
      logger.info(`All ${expectedTexts.length} expected texts verified in Help Guide content`);
    } else {
      logger.warn(`Missing texts in Help Guide: ${missingTexts.join(", ")}`);
    }
    
    return missingTexts;
  }
}
