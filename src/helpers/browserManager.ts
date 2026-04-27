import { chromium, firefox, webkit, Browser } from "playwright";
import { EnvConfig } from "../config/env";
import { logger } from "../utils/logger";

/**
 * BrowserManager - Factory class for launching Playwright browser instances.
 * 
 * Supports multiple browser types (Chromium, Firefox, WebKit) and provides
 * both headed and headless launch options. Browser type is determined by
 * the BROWSER environment variable.
 * 
 * @example
 * ```typescript
 * // Launch browser based on BROWSER env variable
 * const browser = await BrowserManager.launchBrowser();
 * 
 * // Launch headless browser for background tasks
 * const headlessBrowser = await BrowserManager.launchBrowserHeadless();
 * ```
 */
export class BrowserManager {

  /**
   * Launches a browser instance with configured settings.
   * Uses BROWSER env variable to determine browser type (chromium, firefox, webkit).
   * Headless mode is controlled by EnvConfig.HEADLESS.
   * @returns Promise resolving to a Browser instance
   */
  static async launchBrowser(): Promise<Browser> {
    const browserType = process.env.BROWSER || "chromium";

    logger.info(`Launching browser: ${browserType}`);
    logger.info(`Headless mode: ${EnvConfig.HEADLESS}`);

    switch (browserType) {
      case "firefox":
        return await firefox.launch({
          headless: EnvConfig.HEADLESS
        });

      case "webkit":
        return await webkit.launch({
          headless: EnvConfig.HEADLESS
        });

      default:
        return await chromium.launch({
          headless: EnvConfig.HEADLESS,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--force-device-scale-factor=0.67',
            '--high-dpi-support=1'
          ]
        });
    }
  }

  /**
   * Launches a browser instance in headless mode.
   * Used for background tasks like authentication setup.
   * @returns Promise resolving to a headless Browser instance
   */
  static async launchBrowserHeadless(): Promise<Browser> {
    const browserType = process.env.BROWSER || "chromium";

    switch (browserType) {
      case "firefox":
        return await firefox.launch({ headless: true });

      case "webkit":
        return await webkit.launch({ headless: true });

      default:
        return await chromium.launch({
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--force-device-scale-factor=1',
            '--high-dpi-support=1'
          ]
        });
    }
  }
}
