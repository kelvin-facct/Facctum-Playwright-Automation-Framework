import { Locator, Page } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";

export class FacctumDashboardPage {
  private actions: PlaywrightActions;
  
  // Product card locators
  private listManagementCard: Locator;
  private customerScreeningCard: Locator;
  private transactionScreeningCard: Locator;
  private transactionMonitoringCard: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);
    
    // Initialize card locators using nth selector for reliability
    this.listManagementCard = page.locator('.facct-rawhtml').nth(0);
    this.customerScreeningCard = page.locator('.facct-rawhtml').nth(1);
    this.transactionScreeningCard = page.locator('.facct-rawhtml').nth(2);
    this.transactionMonitoringCard = page.locator('.facct-rawhtml').nth(3);
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
}
