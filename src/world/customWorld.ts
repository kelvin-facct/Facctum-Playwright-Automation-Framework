import { setWorldConstructor, IWorldOptions } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page } from "playwright";
import { PageManager } from "../pages/PageManager";
import { ScenarioContext } from "../helpers/scenarioContext";
import { DatabaseHelper } from "../helpers/database";

/**
 * CustomWorld - Cucumber World class that holds shared state for each scenario.
 * 
 * This class is instantiated for each scenario and provides access to:
 * - Browser, context, and page instances
 * - PageManager for accessing page objects
 * - ScenarioContext for sharing data between steps
 * - DatabaseHelper for database operations
 * - Attach function for adding attachments to reports
 */
export class CustomWorld {
  /** The Playwright Browser instance */
  browser!: Browser;

  /** The Playwright BrowserContext with authentication state */
  context!: BrowserContext;

  /** The Playwright Page instance for browser interactions */
  page!: Page;

  /** PageManager for lazy-loaded access to page objects */
  pageManager!: PageManager;

  /** ScenarioContext for sharing data between steps within a scenario */
  scenarioContext!: ScenarioContext;

  /** DatabaseHelper for database operations (lazy-initialized) */
  private _db: DatabaseHelper | null = null;

  /** Cucumber's attach function for adding screenshots/files to reports */
  attach: any;

  /**
   * Creates a new CustomWorld instance.
   * @param options - Cucumber world options including the attach function
   */
  constructor(options: IWorldOptions) {
    this.attach = options.attach;
  }

  /**
   * Gets the DatabaseHelper instance, creating it if needed.
   * Connection must be established by calling db.connect() before use.
   */
  get db(): DatabaseHelper {
    if (!this._db) {
      this._db = new DatabaseHelper();
    }
    return this._db;
  }

  /**
   * Closes the database connection if one exists.
   */
  async closeDb(): Promise<void> {
    if (this._db) {
      await this._db.disconnect();
      this._db = null;
    }
  }
}

setWorldConstructor(CustomWorld);
