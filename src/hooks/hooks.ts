import { Before, After, AfterStep, BeforeAll, AfterAll, setDefaultTimeout } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { BrowserManager } from "../helpers/browserManager";
import { ContextFactory } from "../helpers/contextFactory";
import { AuthHelper } from "../helpers/authHelper";
import { logger } from "../utils/logger";
import { PageManager } from "../pages/PageManager";
import { ScenarioContext } from "../helpers/scenarioContext";
import { EnvConfig } from "../config/env";
import { Browser } from "playwright";
import { TestDataStore } from "../helpers/testDataStore";
import * as fs from "fs/promises";
import * as path from "path";

setDefaultTimeout(EnvConfig.EXTENDED_TIMEOUT);

// Environment-specific paths
const env = process.env.ENV || "qa";
const browserType = process.env.BROWSER || "chromium";
const reportsDir = `reports/${env}`;
const authStatePath = `${reportsDir}/.auth/state-${browserType}.json`;

// Track retry attempts per scenario
const retryTracker = new Map<string, number>();

// Test run timestamp - created once per test run for grouping artifacts
let testRunTimestamp: string = "";

/**
 * Generates a timestamp string for folder/file naming.
 * Format: YYYY-MM-DD_HH-MM-SS
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "_");
}

/**
 * Gets the artifacts directory for the current test run.
 * Structure: reports/{env}/runs/{timestamp}/
 */
function getRunArtifactsDir(): string {
  return `${reportsDir}/runs/${testRunTimestamp}`;
}

/** Shared browser instance for sequential execution mode */
let sharedBrowser: Browser | null = null;

/** Retention periods for artifacts (in days) */
const RETENTION_DAYS = {
  runs: 14,          // Timestamped run folders (screenshots, videos, traces)
  allureReports: 7   // Allure report history
};

/**
 * Cleans up old directories based on retention period.
 * @param dir - Directory to clean
 * @param maxAgeDays - Maximum age in days before deletion
 */
async function cleanOldDirs(dir: string, maxAgeDays: number): Promise<void> {
  try {
    const entries = await fs.readdir(dir);
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      try {
        const stats = await fs.stat(entryPath);
        if (stats.isDirectory() && (now - stats.mtimeMs) > maxAgeMs) {
          await fs.rm(entryPath, { recursive: true, force: true });
          logger.info(`Deleted old directory: ${entryPath}`);
        }
      } catch {
        // Skip entries that can't be accessed
      }
    }
  } catch {
    // Directory doesn't exist yet
  }
}

/**
 * Copies history from previous allure-report to allure-results for trend tracking.
 */
async function preserveAllureHistory(): Promise<void> {
  const historySource = `${reportsDir}/allure-report/history`;
  const historyDest = `${reportsDir}/allure-results/history`;
  
  try {
    await fs.access(historySource);
    await fs.mkdir(historyDest, { recursive: true });
    
    const files = await fs.readdir(historySource);
    for (const file of files) {
      const content = await fs.readFile(path.join(historySource, file));
      await fs.writeFile(path.join(historyDest, file), content);
    }
    logger.info(`Preserved ${files.length} history files for trend tracking`);
  } catch {
    // No previous history exists, skip
  }
}

/**
 * Clears all files in the allure-results directory before a new test run.
 * Preserves history folder for trend tracking.
 */
async function clearAllureResults(): Promise<void> {
  const allureDir = `${reportsDir}/allure-results`;
  try {
    const files = await fs.readdir(allureDir);
    let cleared = 0;
    for (const file of files) {
      // Skip history folder
      if (file === "history") continue;
      
      const filePath = path.join(allureDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        await fs.unlink(filePath);
        cleared++;
      }
    }
    logger.info(`Cleared ${cleared} old allure result files`);
  } catch {
    // Directory doesn't exist yet, nothing to clear
  }
}

/**
 * Ensures all report directories exist for the current environment and test run.
 */
async function ensureReportDirs(): Promise<void> {
  const runDir = getRunArtifactsDir();
  const dirs = [
    `${runDir}/screenshots`,
    `${runDir}/traces`,
    `${runDir}/videos`,
    `${reportsDir}/.auth`,
    `${reportsDir}/allure-results`
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
  logger.info(`Report directories ready: ${runDir}`);
}

/**
 * Writes environment info to Allure results for display in report.
 */
async function writeAllureEnvironment(): Promise<void> {
  const envProps = [
    `Environment=${env.toUpperCase()}`,
    `Browser=${browserType}`,
    `Base.URL=${EnvConfig.BASE_URL}`,
    `Headless=${EnvConfig.HEADLESS}`,
    `Parallel=${EnvConfig.PARALLEL}`,
    `Retry=${EnvConfig.RETRY}`,
    `Node.Version=${process.version}`,
    `Platform=${process.platform}`,
    `Timestamp=${new Date().toISOString()}`
  ].join("\n");

  await fs.writeFile(`${reportsDir}/allure-results/environment.properties`, envProps);
  logger.info("Allure environment.properties written");
}

/**
 * Writes executor.json for Allure to display test executor info.
 */
async function writeAllureExecutor(): Promise<void> {
  const executor = {
    name: process.env.CI ? "CI/CD Pipeline" : "Local Machine",
    type: process.env.CI ? "jenkins" : "local",
    buildName: `${env.toUpperCase()} - ${browserType}`,
    buildOrder: Date.now(),
    reportName: `Test Report - ${new Date().toLocaleDateString()}`,
    reportUrl: process.env.BUILD_URL || undefined
  };

  await fs.writeFile(
    `${reportsDir}/allure-results/executor.json`,
    JSON.stringify(executor, null, 2)
  );
  logger.info("Allure executor.json written");
}

/**
 * Writes categories.json for Allure to categorize test failures.
 */
async function writeAllureCategories(): Promise<void> {
  const categories = [
    {
      name: "Product Defects",
      description: "Test failures due to actual product bugs",
      matchedStatuses: ["failed"],
      messageRegex: ".*Expected.*but got.*|.*to be visible.*|.*to have text.*"
    },
    {
      name: "Element Not Found",
      description: "UI elements could not be located",
      matchedStatuses: ["failed"],
      messageRegex: ".*locator.*|.*selector.*|.*not found.*|.*no element.*"
    },
    {
      name: "Timeout Errors",
      description: "Operations exceeded time limits",
      matchedStatuses: ["failed", "broken"],
      messageRegex: ".*timeout.*|.*Timeout.*|.*exceeded.*"
    },
    {
      name: "Network/API Errors",
      description: "Network connectivity or API failures",
      matchedStatuses: ["broken"],
      messageRegex: ".*ECONNREFUSED.*|.*network.*|.*API.*|.*fetch.*|.*request failed.*"
    },
    {
      name: "Authentication Failures",
      description: "Login or session issues",
      matchedStatuses: ["failed", "broken"],
      messageRegex: ".*login.*|.*auth.*|.*session.*|.*unauthorized.*|.*401.*"
    },
    {
      name: "Database Errors",
      description: "Database connection or query failures",
      matchedStatuses: ["broken"],
      messageRegex: ".*database.*|.*DB.*|.*query.*|.*connection.*|.*postgres.*"
    },
    {
      name: "Test Infrastructure",
      description: "Framework or environment setup issues",
      matchedStatuses: ["broken"],
      messageRegex: ".*hook.*|.*before.*|.*after.*|.*setup.*"
    },
    {
      name: "Skipped Tests",
      description: "Tests that were skipped",
      matchedStatuses: ["skipped"]
    }
  ];

  await fs.writeFile(
    `${reportsDir}/allure-results/categories.json`,
    JSON.stringify(categories, null, 2)
  );
  logger.info("Allure categories.json written");
}

/**
 * Runs cleanup for old test run directories and allure report history.
 */
async function cleanupOldArtifacts(): Promise<void> {
  logger.info(`Cleaning up old artifacts in ${reportsDir}...`);
  await Promise.all([
    cleanOldDirs(`${reportsDir}/runs`, RETENTION_DAYS.runs),
    cleanOldDirs(`${reportsDir}/allure-report-history`, RETENTION_DAYS.allureReports)
  ]);
}

/**
 * Checks if tests are running in parallel mode.
 */
function isParallelMode(): boolean {
  return parseInt(process.env.PARALLEL || "0", 10) > 0;
}

/**
 * Performs one-time authentication and saves the session state.
 * Uses AuthHelper for reusable login logic.
 */
async function ensureAuthenticated(): Promise<void> {
  try {
    await fs.access(authStatePath);
    logger.info(`Auth state exists for ${env}/${browserType}, skipping login`);
    return;
  } catch {
    // Auth state doesn't exist, need to login
  }

  logger.info(`Performing one-time login for ${env}/${browserType}...`);
  
  try {
    await AuthHelper.loginAndSaveState(authStatePath);
  } catch (error) {
    const errorMsg = `
╔════════════════════════════════════════════════════════════════╗
║                    LOGIN FAILED                                ║
╠════════════════════════════════════════════════════════════════╣
║  Could not login to ${EnvConfig.BASE_URL}
║  
║  Org ID:   ${EnvConfig.ORG_ID}
║  Username: ${EnvConfig.USERNAME}
║  Password: ${"*".repeat(Math.min(EnvConfig.PASSWORD.length, 8))}...
║  
║  Please check:
║  1. Credentials in .env.secrets or environments.json
║  2. The application is accessible
║  3. Org ID/Username/Password are correct
║  
║  Run 'npx ts-node src/scripts/show-config.ts' to see current config
╚════════════════════════════════════════════════════════════════╝`;
    
    logger.error(errorMsg);
    throw new Error(`LOGIN FAILED for user "${EnvConfig.USERNAME}" - Check credentials in .env.secrets or environments.json`);
  }
}

/**
 * BeforeAll Hook - Runs once before all scenarios.
 */
BeforeAll(async function () {
  // Initialize test run timestamp once for the entire run
  testRunTimestamp = getTimestamp();
  
  logger.info(`Starting tests for environment: ${env}`);
  logger.info(`Test run artifacts: ${getRunArtifactsDir()}`);
  await ensureReportDirs();
  await preserveAllureHistory();
  await clearAllureResults();
  await writeAllureEnvironment();
  await writeAllureExecutor();
  await writeAllureCategories();
  await cleanupOldArtifacts();
  await ensureAuthenticated();
  
  if (!isParallelMode()) {
    logger.info("Sequential mode: using shared browser instance");
    sharedBrowser = await BrowserManager.launchBrowser();
  } else {
    logger.info("Parallel mode: each scenario gets isolated browser");
  }
});

/**
 * Clears saved authentication state to force fresh login on next run.
 */
async function clearAuthState(): Promise<void> {
  try {
    await fs.unlink(authStatePath);
    logger.info(`Auth state cleared: ${authStatePath}`);
  } catch {
    // File doesn't exist, nothing to clear
  }
}

/**
 * AfterAll Hook - Runs once after all scenarios complete.
 */
AfterAll(async function () {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
  
  // Clear auth state so next run uses fresh credentials
  await clearAuthState();
  
  // Clear test data store
  TestDataStore.clear();
  
  // Clear retry tracker to prevent memory buildup
  retryTracker.clear();
});

/**
 * Before Hook - Runs before each scenario.
 */
Before(async function (this: CustomWorld, scenario) {
  const scenarioName = scenario.pickle.name;
  const scenarioId = scenario.pickle.id;
  
  // Track retry attempts
  const attempt = (retryTracker.get(scenarioId) || 0) + 1;
  retryTracker.set(scenarioId, attempt);
  
  if (attempt > 1) {
    logger.info(`Scenario Retry #${attempt - 1}: ${scenarioName}`);
  }
  
  logger.info(`Scenario Started: ${scenarioName}${attempt > 1 ? ` (Attempt ${attempt})` : ""}`);

  if (isParallelMode()) {
    this.browser = await BrowserManager.launchBrowser();
  } else {
    this.browser = sharedBrowser!;
  }

  this.context = await ContextFactory.createContextWithAuth(this.browser, authStatePath, `${getRunArtifactsDir()}/videos`);
  this.page = await this.context.newPage();
  this.pageManager = new PageManager(this.page);
  this.scenarioContext = new ScenarioContext();
  
  // Store attempt number for After hook
  this.scenarioContext.set("retryAttempt", attempt);

  await this.context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true
  });
});

/**
 * AfterStep Hook - Runs after each step.
 */
AfterStep(async function (this: CustomWorld, step) {
  try {
    const stepName = step.pickleStep.text.replace(/ /g, "_");
    const screenshot = await this.page.screenshot();
    await this.attach(screenshot, "image/png");
    logger.info(`Step Executed: ${stepName}`);
  } catch (error) {
    logger.error(`Step Screenshot Failed: ${error}`);
  }
});

/**
 * After Hook - Runs after each scenario.
 */
After(async function (this: CustomWorld, scenario) {
  const scenarioName = scenario.pickle.name.replace(/ /g, "_");
  const isFailed = scenario.result?.status === "FAILED";
  const attempt = this.scenarioContext?.get("retryAttempt") || 1;
  let videoPath: string | undefined;

  // Add retry information to logs
  if (attempt > 1) {
    if (!isFailed) {
      logger.info(`Scenario passed on retry attempt ${attempt}: ${scenarioName}`);
    }
  }

  try {
    if (this.page && !this.page.isClosed()) {
      const video = this.page.video();
      if (video) {
        videoPath = await video.path();
      }

      if (isFailed) {
        const runDir = getRunArtifactsDir();
        
        try {
          await this.context.tracing.stop({
            path: `${runDir}/traces/${scenarioName}.zip`
          });
        } catch (e) {
          logger.error(`Failed to save trace: ${e}`);
        }

        try {
          await this.page.screenshot({
            path: `${runDir}/screenshots/${scenarioName}.png`,
            fullPage: true
          });
        } catch (e) {
          logger.error(`Failed to take screenshot: ${e}`);
        }

        logger.error(`Scenario Failed: ${scenarioName}`);
      } else {
        try {
          await this.context.tracing.stop();
        } catch (e) {
          // Ignore tracing errors for passed tests
        }
        logger.info(`Scenario Passed: ${scenarioName}`);
      }
    }
  } catch (error) {
    logger.error(`Error in After Hook: ${error}`);
  } finally {
    try {
      if (this.closeDb) {
        await this.closeDb();
      }
    } catch (e) {
      logger.error(`Failed to close database: ${e}`);
    }

    try {
      if (this.page && !this.page.isClosed()) await this.page.close();
    } catch (e) {
      // Page already closed
    }
    
    try {
      if (this.context) await this.context.close();
    } catch (e) {
      // Context already closed
    }
    
    if (isParallelMode() && this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        // Browser already closed
      }
    }

    // Handle video: rename for failed scenarios, delete for passed
    if (videoPath) {
      if (isFailed) {
        const runDir = getRunArtifactsDir();
        const newVideoPath = `${runDir}/videos/${scenarioName}.webm`;
        try {
          await fs.rename(videoPath, newVideoPath);
          logger.info(`Video saved: ${newVideoPath}`);
        } catch (e) {
          logger.error(`Failed to rename video: ${e}`);
        }
      } else {
        await fs.unlink(videoPath).catch(() => {});
      }
    }

    logger.info(`Scenario Finished: ${scenarioName}`);
  }
});
