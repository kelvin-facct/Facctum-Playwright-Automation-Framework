import { Browser, BrowserContext, Page } from "playwright";
import { BrowserManager } from "./browserManager";
import { EnvConfig } from "../config/env";
import { logger } from "../utils/logger";
import * as fs from "fs/promises";
import * as path from "path";

/** Result of session validation */
export interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
}

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

  /**
   * Validates if the current session is still active.
   * Navigates to the base URL and checks if redirected to login or dashboard loads.
   * @param page - Playwright Page instance
   * @returns SessionValidationResult indicating if session is valid
   */
  static async validateSession(page: Page): Promise<SessionValidationResult> {
    try {
      logger.info("Validating session...");
      
      // Navigate to base URL
      await page.goto(EnvConfig.BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
      
      // Check if we landed on the dashboard (session valid)
      const dashboardVisible = await page.locator("#facctumThemeProvider").isVisible({ timeout: 5000 }).catch(() => false);
      
      if (dashboardVisible) {
        logger.info("Session is valid - dashboard loaded");
        return { isValid: true };
      }
      
      // Check if login button is visible (session expired)
      const loginButtonVisible = await page.getByRole("button", { name: "LOG IN" }).isVisible({ timeout: 3000 }).catch(() => false);
      
      if (loginButtonVisible) {
        logger.warn("Session expired - login page detected");
        return { isValid: false, reason: "Session expired - redirected to login page" };
      }
      
      // Check for org ID input (partially through login flow)
      const orgIdVisible = await page.getByRole("textbox", { name: "Organisation ID" }).isVisible({ timeout: 2000 }).catch(() => false);
      
      if (orgIdVisible) {
        logger.warn("Session expired - on organisation ID page");
        return { isValid: false, reason: "Session expired - on login flow" };
      }
      
      // Unknown state - assume invalid to be safe
      logger.warn("Session state unknown - treating as invalid");
      return { isValid: false, reason: "Unknown session state" };
      
    } catch (error) {
      logger.error(`Session validation failed: ${error}`);
      return { isValid: false, reason: `Validation error: ${error}` };
    }
  }

  /**
   * Validates session and re-authenticates if expired.
   * Deletes stale auth state file and performs fresh login.
   * @param page - Playwright Page instance
   * @param context - Browser context for saving new auth state
   * @param authStatePath - Path to auth state file
   * @returns true if session was refreshed, false if already valid
   */
  static async ensureValidSession(
    page: Page,
    context: BrowserContext,
    authStatePath: string
  ): Promise<boolean> {
    const validation = await this.validateSession(page);
    
    if (validation.isValid) {
      return false; // No refresh needed
    }
    
    logger.info(`Re-authenticating: ${validation.reason}`);
    
    // Delete stale auth state
    try {
      await fs.unlink(authStatePath);
      logger.info("Deleted stale auth state file");
    } catch {
      // File may not exist
    }
    
    // Perform fresh login on current page
    await this.login(page, {
      email: EnvConfig.USERNAME,
      password: EnvConfig.PASSWORD,
      orgId: EnvConfig.ORG_ID
    });
    
    // Save new auth state
    await fs.mkdir(path.dirname(authStatePath), { recursive: true });
    await context.storageState({ path: authStatePath });
    logger.info("New auth state saved after re-authentication");
    
    return true; // Session was refreshed
  }
}
