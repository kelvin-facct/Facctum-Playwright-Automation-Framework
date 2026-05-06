import { Locator, Page, FrameLocator, expect } from "@playwright/test";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";

/**
 * FacctumDashboardPage - Page object for the Facctum Platform dashboard.
 * 
 * Handles:
 * - Product card navigation (List Management, Customer Screening, etc.)
 * - Help Guide panel interactions
 * - User profile and logout
 */
export class FacctumDashboardPage {
  private actions: PlaywrightActions;
  
  // Product card locators
  private listManagementCard: Locator;
  private customerScreeningCard: Locator;
  private transactionScreeningCard: Locator;
  private transactionMonitoringCard: Locator;

  // Help Guide panel locators - verified with MCP
  private helpIconHeader: Locator;
  private helpGuidePanel: Locator;
  private helpGuidePanelTitle: Locator;
  private helpGuideIframe: Locator;
  private helpGuideIframeLocator: FrameLocator;
  private helpGuideCloseButton: Locator;
  private helpGuideLaunchIcon: Locator;
  private helpGuideFullscreenIcon: Locator;
  private helpGuideCloseIcon: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);
    
    // Initialize card locators using text-based selectors for reliability
    this.listManagementCard = page.locator('.product-card:has-text("List")').first();
    this.customerScreeningCard = page.locator('.product-card:has-text("Customer")').first();
    this.transactionScreeningCard = page.locator('.product-card:has-text("Transaction Screening")').first();
    this.transactionMonitoringCard = page.locator('.product-card:has-text("Transaction Monitoring")').first();

    // Initialize Help Guide panel locators - verified with MCP
    this.helpIconHeader = page.locator('[data-testid="HelpOutlineIcon"]');
    this.helpGuidePanel = page.locator('.MuiDrawer-paperAnchorRight');
    this.helpGuidePanelTitle = page.locator('.header-content[role="banner"]');
    
    // Iframe locators - the iframe loads documentation from assets.facctum.com
    this.helpGuideIframe = page.locator('iframe[title="Facctum Docx"]');
    this.helpGuideIframeLocator = page.frameLocator('iframe[title="Facctum Docx"]');
    
    // Panel action buttons - verified with MCP
    this.helpGuideCloseButton = page.locator('.facct-drawer-footer-wrapper button:has-text("CLOSE")');
    this.helpGuideLaunchIcon = page.locator('[data-testid="LaunchIcon"]');
    this.helpGuideFullscreenIcon = page.locator('[data-testid="FullscreenIcon"]');
    this.helpGuideCloseIcon = page.locator('[data-testid="CloseIcon"]');
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
    // Wait for iframe to load
    await this.helpGuideIframe.waitFor({ state: "visible", timeout: 10000 });
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
   * Gets the text content from the Help Guide iframe using frameLocator.
   * This method accesses the iframe content directly through Playwright's frame handling.
   */
  async getHelpGuideIframeContent(): Promise<string> {
    // Wait for iframe to be loaded
    await this.helpGuideIframe.waitFor({ state: "visible", timeout: 10000 });
    
    // Use frameLocator to access iframe content directly - this avoids CORS issues
    const frameLocator = this.page.frameLocator('iframe[title="Facctum Docx"]');
    
    // Wait for the body to be visible in the iframe
    await frameLocator.locator("body").waitFor({ state: "visible", timeout: 10000 });
    
    // Get the text content from the iframe body
    const content = await frameLocator.locator("body").innerText();
    
    return content;
  }

  /**
   * Fetches and returns the text content from the Help Guide iframe.
   * Uses Playwright's frameLocator to access iframe content directly (avoids CORS issues).
   */
  async getHelpGuideContent(): Promise<string> {
    // Wait for iframe to be loaded
    await this.helpGuideIframe.waitFor({ state: "visible", timeout: 10000 });
    
    // Use frameLocator to access iframe content directly - this avoids CORS issues
    const frameLocator = this.page.frameLocator('iframe[title="Facctum Docx"]');
    
    // Wait for the body to be visible in the iframe
    await frameLocator.locator("body").waitFor({ state: "visible", timeout: 10000 });
    
    // Get the text content from the iframe body
    const content = await frameLocator.locator("body").innerText();
    
    logger.info(`Help Guide iframe content retrieved (${content.length} characters)`);
    return content;
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

  /**
   * Expands the Help Guide panel to a new tab by clicking the launch/expand icon.
   * @returns The new Page object for the Help Guide documentation
   */
  async expandHelpGuideToNewTab(): Promise<Page> {
    // Get the iframe src first
    const iframeSrc = await this.getHelpGuideIframeSrc();
    if (!iframeSrc) {
      throw new Error("Help Guide iframe src not found");
    }

    // Wait for the new page to open when clicking the launch icon
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent("page"),
      this.helpGuideLaunchIcon.click()
    ]);

    // Wait for the new page to load
    await newPage.waitForLoadState("networkidle");
    
    logger.info(`Help Guide expanded to new tab: ${newPage.url()}`);
    return newPage;
  }

  /**
   * Clicks on a sidebar link in the Help Guide page (for use with the expanded page).
   * Uses Playwright locators instead of evaluate for better reliability.
   * @param helpGuidePage - The Help Guide page object
   * @param linkText - The text of the link to click
   */
  async clickHelpGuideSidebarLink(helpGuidePage: Page, linkText: string): Promise<void> {
    // Use Playwright's getByRole for better accessibility and reliability
    const link = helpGuidePage.getByRole("link", { name: linkText, exact: true });
    
    // If exact match not found, try partial match
    if (await link.count() === 0) {
      const partialLink = helpGuidePage.locator(`a:has-text("${linkText}")`).first();
      await partialLink.click();
    } else {
      await link.click();
    }

    await helpGuidePage.waitForLoadState("networkidle");
    logger.info(`Clicked on sidebar link: ${linkText}`);
  }

  /**
   * Gets the page title from the Help Guide page.
   * @param helpGuidePage - The Help Guide page object
   */
  async getHelpGuidePageTitle(helpGuidePage: Page): Promise<string> {
    return await helpGuidePage.title();
  }

  /**
   * Gets the main content text from the Help Guide page.
   * @param helpGuidePage - The Help Guide page object
   */
  async getHelpGuidePageContent(helpGuidePage: Page): Promise<string> {
    // Try to get content from main content area first
    const contentSelectors = [".content", "article", "main", ".md-content"];
    
    for (const selector of contentSelectors) {
      const element = helpGuidePage.locator(selector).first();
      if (await element.count() > 0) {
        return await element.innerText();
      }
    }
    
    // Fallback to body
    return await helpGuidePage.locator("body").innerText();
  }

  /**
   * Verifies a sidebar link opens with expected title and content.
   * @param helpGuidePage - The Help Guide page object
   * @param linkText - The text of the link to click
   * @param expectedTitle - Expected page title
   * @param expectedContent - Expected content text
   */
  async verifyHelpGuideSidebarLink(
    helpGuidePage: Page, 
    linkText: string, 
    expectedTitle: string, 
    expectedContent: string
  ): Promise<{ passed: boolean; actualTitle: string; error?: string }> {
    try {
      await this.clickHelpGuideSidebarLink(helpGuidePage, linkText);
      
      const actualTitle = await this.getHelpGuidePageTitle(helpGuidePage);
      const content = await this.getHelpGuidePageContent(helpGuidePage);
      
      if (actualTitle !== expectedTitle) {
        return {
          passed: false,
          actualTitle,
          error: `Title mismatch: expected "${expectedTitle}", got "${actualTitle}"`
        };
      }
      
      if (!content.includes(expectedContent)) {
        return {
          passed: false,
          actualTitle,
          error: `Content does not contain expected text: "${expectedContent}"`
        };
      }
      
      logger.info(`Link "${linkText}" verified: title="${actualTitle}"`);
      return { passed: true, actualTitle };
      
    } catch (error) {
      return {
        passed: false,
        actualTitle: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
