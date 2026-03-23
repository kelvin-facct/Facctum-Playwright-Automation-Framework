import { BrowserContext, Page } from "playwright";
import { BrowserManager } from "./browserManager";
import { EnvConfig } from "../config/env";
import { logger } from "../utils/logger";
import * as fs from "fs/promises";
import * as path from "path";

export interface LoginCredentials {
  orgId?: string;
  email: string;
  password: string;
}

/**
 * AuthHelper - Reusable authentication functions for login operations.
 */
export class AuthHelper {
  
  /**
   * Performs login on a given page with provided credentials.
   * @param page - Playwright Page instance
   * @param credentials - Login credentials (orgId defaults to EnvConfig.ORG_ID)
   */
  static async login(page: Page, credentials: LoginCredentials): Promise<void> {
    const { orgId = EnvConfig.ORG_ID, email, password } = credentials;

    // Navigate to landing page
    await page.goto(EnvConfig.BASE_URL);
    
    // Click LOG IN button
    await page.getByRole("button", { name: "LOG IN" }).click();
    
    // Enter Organisation ID
    await page.getByRole("textbox", { name: "Organisation ID" }).fill(orgId);
    await page.getByRole("button", { name: "CONTINUE" }).click();
    
    // Enter email and password
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    
    // Wait for dashboard
    await page.locator("#facctumThemeProvider").waitFor({ timeout: EnvConfig.TIMEOUT });
    
    logger.info(`Logged in as: ${email}`);
  }

  /**
   * Performs login and saves auth state to file.
   * Used for one-time auth setup in BeforeAll hook.
   * @param authStatePath - Path to save the auth state JSON
   * @param credentials - Login credentials (defaults to EnvConfig values)
   */
  static async loginAndSaveState(
    authStatePath: string,
    credentials?: Partial<LoginCredentials>
  ): Promise<void> {
    const creds: LoginCredentials = {
      orgId: credentials?.orgId || EnvConfig.ORG_ID,
      email: credentials?.email || EnvConfig.USERNAME,
      password: credentials?.password || EnvConfig.PASSWORD
    };

    const browser = await BrowserManager.launchBrowserHeadless();
    
    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await this.login(page, creds);

      // Save auth state
      await fs.mkdir(path.dirname(authStatePath), { recursive: true });
      await context.storageState({ path: authStatePath });
      
      await page.close();
      await context.close();
      
      logger.info(`Auth state saved: ${authStatePath}`);
    } finally {
      await browser.close();
    }
  }

  /**
   * Clears session and performs fresh login with new credentials.
   * Used for switching users mid-scenario.
   * @param context - Current browser context
   * @param page - Current page
   * @param credentials - New user credentials
   */
  static async switchUser(
    context: BrowserContext,
    page: Page,
    credentials: LoginCredentials
  ): Promise<void> {
    logger.info(`Switching user to: ${credentials.email}`);
    
    // Clear existing session
    await context.clearCookies();
    
    // Perform fresh login
    await this.login(page, credentials);
  }
}
