import { BrowserContext, Browser } from "playwright";
import { EnvConfig } from "../config/env";

/**
 * ContextFactory - Factory class for creating Playwright BrowserContext instances.
 * 
 * Provides methods to create browser contexts with consistent configuration
 * including viewport settings, video recording, and authentication state.
 * 
 * @example
 * ```typescript
 * // Create a context with saved authentication
 * const authContext = await ContextFactory.createContextWithAuth(browser, 'auth-state.json', 'reports/qa/runs/2024-01-01_10-00-00/videos');
 * ```
 */
export class ContextFactory {

  /**
   * Creates a new browser context with saved authentication state.
   * Loads cookies and localStorage from the specified auth state file.
   * @param browser - The Browser instance to create context from
   * @param authStatePath - Path to the saved authentication state JSON file
   * @param videoDir - Directory path for video recordings
   * @returns Promise resolving to a configured BrowserContext with auth state
   */
  static async createContextWithAuth(browser: Browser, authStatePath: string, videoDir?: string): Promise<BrowserContext> {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,

      ...(EnvConfig.RECORD_VIDEO && videoDir && {
        recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } }
      }),

      storageState: authStatePath
    });

    context.setDefaultTimeout(EnvConfig.TIMEOUT);
    return context;
  }
}
