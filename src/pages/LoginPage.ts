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

    // Initialize locators
    this.btnLogin = page.getByRole("button", { name: "LOG IN" });
    this.txtOrgId = page.getByRole("textbox", { name: "Organisation ID" });
    this.btnContinueOrg = page.getByRole("button", { name: "CONTINUE" });
    this.txtEmail = page.getByRole("textbox", { name: "Email address" });
    this.txtPassword = page.getByRole("textbox", { name: "Password" });
    this.btnContinueLogin = page.getByRole("button", { name: "Continue", exact: true });
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
      await this.btnLogin.waitFor({ timeout: 3000 });
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

    // Click LOG IN on landing page (unless skipped)
    if (!skipLandingPage) {
      await this.btnLogin.click();
    }

    // Enter Organisation ID
    await this.txtOrgId.fill(orgId);
    await this.btnContinueOrg.click();

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
