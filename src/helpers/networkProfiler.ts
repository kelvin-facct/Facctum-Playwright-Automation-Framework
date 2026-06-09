/**
 * NetworkProfiler - Attach to any Playwright Page to capture API performance metrics.
 *
 * Usage in step definitions or hooks:
 *   import { NetworkProfiler } from "../helpers/networkProfiler";
 *
 *   // In Before hook or step:
 *   const profiler = new NetworkProfiler({ threshold: 2000 });
 *   profiler.attach(page);
 *
 *   // After test flow:
 *   const report = profiler.getReport();
 *   console.log(report.summary);
 *   profiler.printSlowApis();
 *
 *   // Attach to Allure report:
 *   world.attach(JSON.stringify(report, null, 2), "application/json");
 */
import { Page, Request, Response } from "playwright";
import { logger } from "../utils/logger";

export interface ApiMetric {
  url: string;
  method: string;
  status: number;
  duration: number;
  requestSize: number;
  responseSize: number;
  resourceType: string;
  timestamp: string;
  failed: boolean;
  errorMessage?: string;
}

export interface ProfilerReport {
  summary: {
    totalCalls: number;
    slowCalls: number;
    failedCalls: number;
    avgMs: number;
    p50Ms: number;
    p90Ms: number;
    p95Ms: number;
    maxMs: number;
  };
  slow: ApiMetric[];
  failed: ApiMetric[];
  all: ApiMetric[];
}

export interface ProfilerOptions {
  /** Threshold in ms to flag as slow (default: 2000) */
  threshold?: number;
  /** Only capture XHR/fetch (default: true). Set false to include scripts/documents */
  apiOnly?: boolean;
  /** URL pattern to include (regex). If set, only matching URLs are tracked */
  includePattern?: RegExp;
  /** URL pattern to exclude (regex) */
  excludePattern?: RegExp;
}

export class NetworkProfiler {
  private metrics: ApiMetric[] = [];
  private pending = new Map<Request, number>();
  private threshold: number;
  private apiOnly: boolean;
  private includePattern?: RegExp;
  private excludePattern?: RegExp;
  private attached = false;

  constructor(options: ProfilerOptions = {}) {
    this.threshold = options.threshold ?? 2000;
    this.apiOnly = options.apiOnly ?? true;
    this.includePattern = options.includePattern;
    this.excludePattern = options.excludePattern;
  }

  /**
   * Attach the profiler to a Playwright Page. Call once per page.
   */
  attach(page: Page): void {
    if (this.attached) return;
    this.attached = true;

    page.on("request", (req) => {
      if (this.shouldSkip(req)) return;
      this.pending.set(req, Date.now());
    });

    page.on("response", async (res) => {
      const req = res.request();
      const start = this.pending.get(req);
      if (start === undefined) return;
      this.pending.delete(req);

      const duration = Date.now() - start;
      let responseSize = 0;
      try { responseSize = (await res.body()).length; } catch {}

      const postData = req.postData();
      this.metrics.push({
        url: req.url(),
        method: req.method(),
        status: res.status(),
        duration,
        requestSize: postData ? Buffer.byteLength(postData) : 0,
        responseSize,
        resourceType: req.resourceType(),
        timestamp: new Date(start).toISOString(),
        failed: res.status() >= 400,
      });

      if (duration > this.threshold) {
        logger.warn(`🐌 Slow API: ${duration}ms ${req.method()} ${req.url().substring(0, 100)}`);
      }
    });

    page.on("requestfailed", (req) => {
      const start = this.pending.get(req);
      if (start === undefined) return;
      this.pending.delete(req);

      this.metrics.push({
        url: req.url(),
        method: req.method(),
        status: 0,
        duration: Date.now() - start,
        requestSize: 0,
        responseSize: 0,
        resourceType: req.resourceType(),
        timestamp: new Date(start).toISOString(),
        failed: true,
        errorMessage: req.failure()?.errorText,
      });
    });
  }

  private shouldSkip(req: Request): boolean {
    if (this.apiOnly) {
      const type = req.resourceType();
      if (["image", "font", "stylesheet", "media"].includes(type)) return true;
    }
    const url = req.url();
    if (this.excludePattern && this.excludePattern.test(url)) return true;
    if (this.includePattern && !this.includePattern.test(url)) return true;
    return false;
  }

  /**
   * Get the full profiler report.
   */
  getReport(): ProfilerReport {
    const apiCalls = this.metrics.filter(m =>
      m.resourceType === "xhr" || m.resourceType === "fetch" || m.url.includes("/api/")
    );
    const durations = apiCalls.map(m => m.duration).sort((a, b) => a - b);

    return {
      summary: {
        totalCalls: apiCalls.length,
        slowCalls: apiCalls.filter(m => m.duration > this.threshold).length,
        failedCalls: apiCalls.filter(m => m.failed).length,
        avgMs: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
        p50Ms: this.percentile(durations, 50),
        p90Ms: this.percentile(durations, 90),
        p95Ms: this.percentile(durations, 95),
        maxMs: durations.length ? durations[durations.length - 1] : 0,
      },
      slow: apiCalls.filter(m => m.duration > this.threshold).sort((a, b) => b.duration - a.duration),
      failed: apiCalls.filter(m => m.failed),
      all: apiCalls.sort((a, b) => b.duration - a.duration),
    };
  }

  /**
   * Print slow APIs to console/logger.
   */
  printSlowApis(): void {
    const report = this.getReport();
    if (report.slow.length === 0) {
      logger.info("✅ No slow APIs detected (all under " + this.threshold + "ms)");
      return;
    }
    logger.warn(`🐌 ${report.slow.length} slow APIs detected (>${this.threshold}ms):`);
    for (const api of report.slow.slice(0, 20)) {
      logger.warn(`  ${api.duration}ms  ${api.method} ${api.status}  ${api.url.substring(0, 100)}`);
    }
  }

  /**
   * Get metrics array (raw data).
   */
  getMetrics(): ApiMetric[] {
    return [...this.metrics];
  }

  /**
   * Reset all captured data.
   */
  clear(): void {
    this.metrics = [];
    this.pending.clear();
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }
}
