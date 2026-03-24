import { logger } from "../utils/logger";
import { EnvConfig } from "../config/env";

/**
 * Step retry configuration
 */
export interface StepRetryConfig {
  /** Maximum number of step-level retries (0 = disabled) */
  maxStepRetries: number;
  /** Delay between step retries in milliseconds */
  retryDelayMs: number;
}

/**
 * Result of a step retry attempt
 */
export interface StepRetryResult {
  /** Whether the step ultimately succeeded */
  success: boolean;
  /** Number of retry attempts made */
  attempts: number;
  /** Error from the last failed attempt (if any) */
  lastError?: Error;
  /** Whether step was retried (attempts > 1) */
  wasRetried: boolean;
}

/**
 * Tracking info for step retries within a scenario
 */
export interface StepRetryInfo {
  stepName: string;
  attempts: number;
  success: boolean;
  errors: string[];
}

/**
 * StepRetryTracker - Tracks step retry information for Allure reporting.
 * Each scenario gets its own tracker instance.
 */
export class StepRetryTracker {
  private stepRetries: Map<string, StepRetryInfo> = new Map();
  private totalStepRetries: number = 0;

  /**
   * Records a step retry attempt.
   */
  recordRetry(stepName: string, attempt: number, error?: Error): void {
    const existing = this.stepRetries.get(stepName) || {
      stepName,
      attempts: 0,
      success: false,
      errors: []
    };

    existing.attempts = attempt;
    if (error) {
      existing.errors.push(error.message);
    }

    this.stepRetries.set(stepName, existing);
    
    if (attempt > 1) {
      this.totalStepRetries++;
    }
  }

  /**
   * Marks a step as successful.
   */
  markSuccess(stepName: string): void {
    const existing = this.stepRetries.get(stepName);
    if (existing) {
      existing.success = true;
    }
  }

  /**
   * Gets all step retry info for reporting.
   */
  getRetryInfo(): StepRetryInfo[] {
    return Array.from(this.stepRetries.values()).filter(info => info.attempts > 1);
  }

  /**
   * Gets total number of step retries in this scenario.
   */
  getTotalRetries(): number {
    return this.totalStepRetries;
  }

  /**
   * Checks if any steps were retried.
   */
  hasRetries(): boolean {
    return this.totalStepRetries > 0;
  }

  /**
   * Generates a summary for Allure attachment.
   */
  generateSummary(): string {
    const retriedSteps = this.getRetryInfo();
    if (retriedSteps.length === 0) {
      return "No step retries occurred.";
    }

    const lines = [
      `Step Retry Summary (${this.totalStepRetries} total retries)`,
      "=".repeat(50),
      ""
    ];

    for (const step of retriedSteps) {
      const status = step.success ? "✓ PASSED" : "✗ FAILED";
      lines.push(`Step: ${step.stepName}`);
      lines.push(`  Attempts: ${step.attempts}`);
      lines.push(`  Status: ${status}`);
      if (step.errors.length > 0) {
        lines.push(`  Errors:`);
        step.errors.forEach((err, i) => {
          lines.push(`    ${i + 1}. ${err.substring(0, 100)}${err.length > 100 ? "..." : ""}`);
        });
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Clears all tracking data.
   */
  clear(): void {
    this.stepRetries.clear();
    this.totalStepRetries = 0;
  }
}

/**
 * Default step retry configuration.
 * Reads from EnvConfig which follows the standard priority:
 * process.env > .env.secrets > environments.json > defaults
 * 
 * Set STEP_RETRY=0 to disable step retries.
 */
export function getStepRetryConfig(): StepRetryConfig {
  return {
    maxStepRetries: EnvConfig.STEP_RETRY,
    retryDelayMs: EnvConfig.STEP_RETRY_DELAY
  };
}

/**
 * Executes a step function with retry logic.
 * 
 * @param stepFn - The step function to execute
 * @param stepName - Name of the step for logging
 * @param tracker - StepRetryTracker instance for recording retries
 * @param config - Optional retry configuration
 * @returns StepRetryResult with success status and attempt count
 * 
 * @example
 * ```typescript
 * const result = await executeWithRetry(
 *   async () => { await page.click("#submit"); },
 *   "click submit button",
 *   this.stepRetryTracker
 * );
 * ```
 */
export async function executeWithRetry(
  stepFn: () => Promise<void>,
  stepName: string,
  tracker: StepRetryTracker,
  config?: Partial<StepRetryConfig>
): Promise<StepRetryResult> {
  const cfg = { ...getStepRetryConfig(), ...config };
  
  // STEP_RETRY=0 means disabled, execute once without retry
  if (cfg.maxStepRetries <= 0) {
    try {
      await stepFn();
      return { success: true, attempts: 1, wasRetried: false };
    } catch (error) {
      return { success: false, attempts: 1, lastError: error as Error, wasRetried: false };
    }
  }

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= cfg.maxStepRetries; attempt++) {
    try {
      tracker.recordRetry(stepName, attempt);
      
      if (attempt > 1) {
        logger.info(`Step Retry #${attempt - 1}: ${stepName}`);
        await delay(cfg.retryDelayMs);
      }
      
      await stepFn();
      
      tracker.markSuccess(stepName);
      
      if (attempt > 1) {
        logger.info(`Step succeeded on retry #${attempt - 1}: ${stepName}`);
      }
      
      return {
        success: true,
        attempts: attempt,
        wasRetried: attempt > 1
      };
      
    } catch (error) {
      lastError = error as Error;
      tracker.recordRetry(stepName, attempt, lastError);
      
      if (attempt < cfg.maxStepRetries) {
        logger.warn(`Step failed (attempt ${attempt}/${cfg.maxStepRetries}): ${stepName}`);
        logger.warn(`Error: ${lastError.message}`);
      } else {
        logger.error(`Step failed after ${attempt} attempts: ${stepName}`);
        logger.error(`Final error: ${lastError.message}`);
      }
    }
  }

  return {
    success: false,
    attempts: cfg.maxStepRetries,
    lastError,
    wasRetried: cfg.maxStepRetries > 1
  };
}

/**
 * Simple delay helper.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
