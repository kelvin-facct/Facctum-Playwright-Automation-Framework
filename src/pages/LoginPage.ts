import { Page, Locator } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { EnvConfig } from "../config/env";

/**
 * LoginPage - Page object for the Facctum login flow.
 * 
 * Handles the multi-step login process:
 * 1. Landing page -> Click LOG IN
 * 2. Enter Organisation ID -> CONTINUE
 * 3. Enter Email/Password -> Continue
 */
export class LoginPage {
  private actions: PlaywrightActions;

  // Landing page elements
  private btnLogin: Locator;

  // Organisation ID step elements
  private txtOrgId: Locator;
  private btnContinueOrg: Locator;

  // Credentials step elements
  private txtEmail: Locator;
  private txtPassword: Locator;
  private btnContinueLogin: Locator;

  // Dashboard element (to verify login success)
  private dashboardContainer: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);

    // Initialize locators - using CSS selectors for robustness
    this.btnLogin = page.locator('button:has-text("LOG IN"), button[aria-label="LOG IN"]').first();
    this.txtOrgId = page.locator('input#organizationName, input[name="organizationName"]').first();
    this.btnContinueOrg = page.locator('button:has-text("CONTINUE")').first();
    this.txtEmail = page.locator('input[name="username"], input[type="email"]').first();
    this.txtPassword = page.locator('input[name="password"], input[type="password"]').first();
    this.btnContinueLogin = page.locator('button:has-text("Continue")').first();
    this.dashboardContainer = page.locator("#facctumThemeProvider");
  }

  /**
   * Navigates to the landing page.
   */
  async navigate() {
    await this.actions.goto(EnvConfig.BASE_URL);
    await this.actions.waitForLoadState("networkidle");
  }

  /**
   * Checks if on the landing page (LOG IN button visible).
   */
  async isOnLandingPage(): Promise<boolean> {
    try {
      // Try multiple selectors for the LOG IN button
      const loginBtn = this.page.locator('button:has-text("LOG IN"), button:has-text("Log In"), button:has-text("Login")').first();
      await loginBtn.waitFor({ timeout: 5000, state: "visible" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if already logged in (dashboard loaded).
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Check URL first - if we're on the landing page, we're not logged in
      const url = this.page.url();
      if (url.includes('auth') || url === 'https://qa-saas.facctum.com/' || url === 'https://qa-saas.facctum.com') {
        return false;
      }
      
      await this.dashboardContainer.waitFor({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Performs the full login flow with Organisation ID, email, and password.
   * Skips if already logged in.
   * @param skipLandingPage - Set to true when logging in after logout (skips LOG IN button)
   */
  async login(orgId: string, email: string, password: string, skipLandingPage = false) {
    // Check if already logged in
    if (await this.isLoggedIn()) {
      return;
    }

    // Wait for page to stabilize after logout/navigation
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(1000);

    // Always check if LOG IN button is visible and click it if present
    // This handles cases where logout redirects to landing page
    const isOnLanding = await this.isOnLandingPage();
    if (isOnLanding) {
      // Use a more robust locator for the LOG IN button
      await this.btnLogin.waitFor({ state: "visible", timeout: 15000 });
      await this.btnLogin.click();
      await this.page.waitForTimeout(500);
    }

    // Wait for org ID input to be visible
    await this.txtOrgId.waitFor({ state: "visible", timeout: 15000 });

    // Enter Organisation ID
    await this.txtOrgId.fill(orgId);
    await this.btnContinueOrg.click();

    // Wait for email input to be visible
    await this.txtEmail.waitFor({ state: "visible", timeout: 15000 });

    // Enter email and password
    await this.txtEmail.fill(email);
    await this.txtPassword.fill(password);
    await this.btnContinueLogin.click();

    // Wait for dashboard
    await this.dashboardContainer.waitFor({ timeout: EnvConfig.TIMEOUT });
  }

  /**
   * Performs login using credentials from EnvConfig.
   */
  async loginWithConfig() {
    await this.login(EnvConfig.ORG_ID, EnvConfig.USERNAME, EnvConfig.PASSWORD);
  }

  /**
   * Asserts that a login error message is displayed.
   */
  async expectLoginError(message: string) {
    await this.actions.expectVisible(this.page.getByText(message));
  }

  /**
   * Performs login after logout using credentials from EnvConfig.
   * Skips the landing page LOG IN button.
   */
  async loginAfterLogoutWithConfig() {
    await this.login(EnvConfig.ORG_ID, EnvConfig.USERNAME, EnvConfig.PASSWORD, true);
  }
}
