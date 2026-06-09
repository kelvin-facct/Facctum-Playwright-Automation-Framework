/**
 * API Performance Audit Script
 *
 * Intercepts ALL network requests during a user session and identifies
 * slow/bad-performing APIs in one go. Produces a sorted report with:
 * - Response time per request
 * - Slow requests (> threshold)
 * - Failed requests (4xx/5xx)
 * - Payload sizes
 * - Summary statistics
 *
 * Usage:
 *   npx ts-node src/scripts/api-performance-audit.ts
 *   npx ts-node src/scripts/api-performance-audit.ts --threshold 3000
 *   npx ts-node src/scripts/api-performance-audit.ts --flow full
 *   npx ts-node src/scripts/api-performance-audit.ts --output reports/api-perf.json
 *
 * Options:
 *   --threshold <ms>   Mark APIs slower than this as "bad" (default: 2000ms)
 *   --flow <name>      Which user flow to exercise: "login", "navigation", "full" (default: "full")
 *   --output <path>    Output JSON report path (default: reports/api-performance-report.json)
 *   --headless         Run in headless mode
 */
import { chromium, Page, Request, Response } from "playwright";
import { AuthHelper } from "../helpers/authHelper";
import { EnvConfig } from "../config/env";
import * as fs from "fs";
import * as path from "path";

// ==================== Configuration ====================

interface ApiCall {
  url: string;
  method: string;
  status: number;
  statusText: string;
  duration: number;       // ms
  requestSize: number;    // bytes (post body)
  responseSize: number;   // bytes
  resourceType: string;
  timestamp: string;
  failed: boolean;
  errorMessage?: string;
}

interface AuditConfig {
  threshold: number;      // ms — anything above this is "slow"
  flow: "login" | "navigation" | "full";
  output: string;
  headless: boolean;
}

function parseArgs(): AuditConfig {
  const args = process.argv.slice(2);
  const config: AuditConfig = {
    threshold: 2000,
    flow: "full",
    output: "reports/api-performance-report.json",
    headless: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--threshold": config.threshold = parseInt(args[++i]) || 2000; break;
      case "--flow": config.flow = (args[++i] as AuditConfig["flow"]) || "full"; break;
      case "--output": config.output = args[++i] || config.output; break;
      case "--headless": config.headless = true; break;
    }
  }
  return config;
}

// ==================== Network Interceptor ====================

class NetworkInterceptor {
  private calls: ApiCall[] = [];
  private pendingRequests = new Map<Request, { startTime: number }>();

  attach(page: Page): void {
    page.on("request", (request) => {
      this.pendingRequests.set(request, { startTime: Date.now() });
    });

    page.on("response", async (response) => {
      const request = response.request();
      const pending = this.pendingRequests.get(request);
      if (!pending) return;

      const duration = Date.now() - pending.startTime;
      this.pendingRequests.delete(request);

      // Only track API/XHR/fetch calls (skip images, fonts, stylesheets)
      const resourceType = request.resourceType();
      if (["image", "font", "stylesheet", "media"].includes(resourceType)) return;

      let responseSize = 0;
      try {
        const body = await response.body();
        responseSize = body.length;
      } catch { /* response body unavailable */ }

      const postData = request.postData();
      const requestSize = postData ? Buffer.byteLength(postData) : 0;

      this.calls.push({
        url: request.url(),
        method: request.method(),
        status: response.status(),
        statusText: response.statusText(),
        duration,
        requestSize,
        responseSize,
        resourceType,
        timestamp: new Date(pending.startTime).toISOString(),
        failed: response.status() >= 400,
      });
    });

    page.on("requestfailed", (request) => {
      const pending = this.pendingRequests.get(request);
      if (!pending) return;

      const duration = Date.now() - pending.startTime;
      this.pendingRequests.delete(request);

      const resourceType = request.resourceType();
      if (["image", "font", "stylesheet", "media"].includes(resourceType)) return;

      this.calls.push({
        url: request.url(),
        method: request.method(),
        status: 0,
        statusText: "FAILED",
        duration,
        requestSize: 0,
        responseSize: 0,
        resourceType,
        timestamp: new Date(pending.startTime).toISOString(),
        failed: true,
        errorMessage: request.failure()?.errorText || "Unknown error",
      });
    });
  }

  getCalls(): ApiCall[] {
    return [...this.calls];
  }

  clear(): void {
    this.calls = [];
    this.pendingRequests.clear();
  }
}

// ==================== User Flows ====================

async function flowLogin(page: Page): Promise<void> {
  console.log("  [Flow] Login...");
  await AuthHelper.login(page, {
    orgId: EnvConfig.ORG_ID,
    email: EnvConfig.USERNAME,
    password: EnvConfig.PASSWORD,
  });
  // Wait for dashboard cards to be fully rendered
  await page.locator('.product-card').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  console.log("  [Flow] Login complete");
}

async function flowNavigation(page: Page): Promise<void> {
  console.log("  [Flow] Navigating application modules...");

  // Helper: safe click + wait
  async function safeClick(locator: any, label: string, timeout = 10000): Promise<boolean> {
    try {
      await locator.waitFor({ state: "visible", timeout });
      await locator.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(500);
      console.log(`    → ${label}`);
      return true;
    } catch {
      console.log(`    ⊘ ${label} (not reachable)`);
      return false;
    }
  }

  // Helper: expand Watchlist submenu
  async function expandWatchlist(): Promise<boolean> {
    const watchlistBtn = page.locator('span.MuiListItemText-primary:has-text("Watchlist")');
    try {
      await watchlistBtn.waitFor({ state: "visible", timeout: 15000 });
      await watchlistBtn.click();
      await page.locator('.MuiCollapse-entered').waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      return true;
    } catch {
      console.log("    ⊘ Watchlist dropdown (not reachable)");
      return false;
    }
  }

  // ─── 1. Dashboard → FacctList ───
  await safeClick(page.locator('.product-card:has-text("List")').first(), "FacctList (List Management)", 15000);

  // ─── 2. Watchlist → Commercial list → WC Main Premium ───
  if (await expandWatchlist()) {
    if (await safeClick(page.locator('text=Commercial list'), "Commercial list")) {
      // Search and open WC Main Premium
      const listSearch = page.locator('input[placeholder*="Search"]').first();
      if (await listSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await listSearch.fill("WC Main Premium");
        await page.keyboard.press("Enter");
        await page.waitForLoadState("networkidle").catch(() => {});
        if (await safeClick(
          page.locator('a:has-text("WC Main Premium"), .link-cell:has-text("WC Main Premium")').first(),
          "WC Main Premium (records list)"
        )) {
          // Open first record profile (triggers record detail APIs)
          const firstRow = page.locator('tbody tr.table-row, tbody.MuiTableBody-root tr').first();
          if (await firstRow.isVisible({ timeout: 10000 }).catch(() => false)) {
            const kebab = firstRow.locator('.kebab-cell svg, td:last-child svg').first();
            if (await kebab.isVisible({ timeout: 3000 }).catch(() => false)) {
              await kebab.click();
              await page.waitForTimeout(500);
              const overview = page.locator('[role="menuitem"]:has-text("Overview")').first();
              if (await overview.isVisible({ timeout: 3000 }).catch(() => false)) {
                await overview.click();
                await page.waitForLoadState("networkidle").catch(() => {});
                await page.locator('.facct-drawer-paper').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
                await page.waitForTimeout(1500);
                console.log("    → Record Profile View (drawer)");

                // Click Audit tab to trigger audit API
                const auditTab = page.locator('button:has-text("AUDIT"), [role="tab"]:has-text("AUDIT")').first();
                if (await auditTab.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await auditTab.click();
                  await page.waitForLoadState("networkidle").catch(() => {});
                  await page.waitForTimeout(1000);
                  console.log("    → Audit tab");
                }

                // Close drawer
                await page.locator('#lseg-footer-close-btn').click().catch(() => {});
                await page.locator('.facct-drawer-paper').first().waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
              }
            }
          }
        }
      }
    }
  }

  // ─── 3. Tasks page ───
  const tasksNav = page.locator('xpath=/html/body/div/div/div/div[1]/div/div/nav/div/div/div/div[2]/ul/li[2]/div/div[2]/span');
  if (await safeClick(tasksNav, "Tasks")) {
    // Click Pending L1 tab
    const pl1 = page.locator('button[aria-label*="Pending L1"]');
    if (await safeClick(pl1, "Tasks > Pending L1")) {
      // Click Commercial Records sub-tab
      const cr = page.locator('button[aria-label*="COMMERCIAL RECORDS"]');
      await safeClick(cr, "Tasks > Commercial Records");
      await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }

  // ─── 4. Watchlist → Regulatory list → UK SANCTIONS ───
  if (await expandWatchlist()) {
    if (await safeClick(page.locator('[aria-label="Regulatory list"], text=Regulatory list').first(), "Regulatory list")) {
      const regSearch = page.locator('input[placeholder*="Search"]').first();
      if (await regSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await regSearch.fill("UK SANCTIONS");
        await page.keyboard.press("Enter");
        await page.waitForLoadState("networkidle").catch(() => {});
        const ukLink = page.locator('a:has-text("UK SANCTIONS"), .link-cell:has-text("UK SANCTIONS")').first();
        if (await safeClick(ukLink, "UK SANCTIONS (records)")) {
          await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(1500);

          // Open filter panel (triggers filter options API)
          const filterBtn = page.locator('button[aria-label*="filter"], button:has-text("Filter"), [data-testid*="filter"]').first();
          if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await filterBtn.click();
            await page.waitForTimeout(2000);
            console.log("    → UK SANCTIONS filter panel");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);
          }
        }
      }
    }
  }

  // ─── 5. Watchlist → Regulatory list → OFAC ───
  if (await expandWatchlist()) {
    if (await safeClick(page.locator('[aria-label="Regulatory list"], text=Regulatory list').first(), "Regulatory list (OFAC)")) {
      const regSearch2 = page.locator('input[placeholder*="Search"]').first();
      if (await regSearch2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await regSearch2.fill("OFAC");
        await page.keyboard.press("Enter");
        await page.waitForLoadState("networkidle").catch(() => {});
        const ofacLink = page.locator('a:has-text("OFAC"), .link-cell:has-text("OFAC")').first();
        if (await safeClick(ofacLink, "OFAC (records)")) {
          await page.locator('tbody tr').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
    }
  }

  // ─── 6. Watchlist → Internal list ───
  if (await expandWatchlist()) {
    if (await safeClick(page.locator('[aria-label="Internal list"], text=Internal list').first(), "Internal list")) {
      await page.locator('tbody tr, .list-table tr').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  // ─── 7. Back to Dashboard → FacctView (if available) ───
  await page.goto(EnvConfig.BASE_URL, { waitUntil: "networkidle" }).catch(() => {});
  await page.locator('.product-card').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const viewCard = page.locator('.product-card:has-text("View"), .product-card:has-text("FacctView")').first();
  if (await safeClick(viewCard, "FacctView")) {
    await page.waitForTimeout(2000);
  }

  console.log("  [Flow] Navigation complete");
}

// ==================== Report Generation ====================

interface AuditReport {
  meta: {
    environment: string;
    baseUrl: string;
    threshold: number;
    flow: string;
    timestamp: string;
    totalRequests: number;
    totalDuration: number;
  };
  summary: {
    totalApiCalls: number;
    slowApis: number;
    failedApis: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p90ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    totalDataTransferred: string;
  };
  slowApis: ApiCall[];
  failedApis: ApiCall[];
  allApis: ApiCall[];
  byEndpoint: EndpointSummary[];
}

interface EndpointSummary {
  endpoint: string;
  method: string;
  callCount: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  p95Duration: number;
  failureRate: number;
  totalResponseSize: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove query params for grouping, keep path
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

function generateReport(calls: ApiCall[], config: AuditConfig, totalDuration: number): AuditReport {
  const apiCalls = calls.filter(c => c.resourceType === "xhr" || c.resourceType === "fetch" || c.url.includes("/api/"));
  const durations = apiCalls.map(c => c.duration).sort((a, b) => a - b);
  const totalData = apiCalls.reduce((sum, c) => sum + c.responseSize, 0);

  const slowApis = apiCalls.filter(c => c.duration > config.threshold).sort((a, b) => b.duration - a.duration);
  const failedApis = apiCalls.filter(c => c.failed).sort((a, b) => b.duration - a.duration);

  // Group by endpoint
  const endpointMap = new Map<string, ApiCall[]>();
  for (const call of apiCalls) {
    const key = `${call.method} ${normalizeUrl(call.url)}`;
    if (!endpointMap.has(key)) endpointMap.set(key, []);
    endpointMap.get(key)!.push(call);
  }

  const byEndpoint: EndpointSummary[] = Array.from(endpointMap.entries()).map(([key, calls]) => {
    const [method, endpoint] = [key.split(" ")[0], key.substring(key.indexOf(" ") + 1)];
    const durs = calls.map(c => c.duration).sort((a, b) => a - b);
    const failures = calls.filter(c => c.failed).length;
    return {
      endpoint,
      method,
      callCount: calls.length,
      avgDuration: Math.round(durs.reduce((s, d) => s + d, 0) / durs.length),
      maxDuration: durs[durs.length - 1],
      minDuration: durs[0],
      p95Duration: percentile(durs, 95),
      failureRate: Math.round((failures / calls.length) * 100),
      totalResponseSize: calls.reduce((s, c) => s + c.responseSize, 0),
    };
  }).sort((a, b) => b.avgDuration - a.avgDuration);

  return {
    meta: {
      environment: process.env.ENV || "qa",
      baseUrl: EnvConfig.BASE_URL,
      threshold: config.threshold,
      flow: config.flow,
      timestamp: new Date().toISOString(),
      totalRequests: calls.length,
      totalDuration,
    },
    summary: {
      totalApiCalls: apiCalls.length,
      slowApis: slowApis.length,
      failedApis: failedApis.length,
      avgResponseTime: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
      p50ResponseTime: percentile(durations, 50),
      p90ResponseTime: percentile(durations, 90),
      p95ResponseTime: percentile(durations, 95),
      p99ResponseTime: percentile(durations, 99),
      maxResponseTime: durations.length ? durations[durations.length - 1] : 0,
      totalDataTransferred: formatBytes(totalData),
    },
    slowApis,
    failedApis,
    allApis: apiCalls.sort((a, b) => b.duration - a.duration),
    byEndpoint,
  };
}

function printReport(report: AuditReport): void {
  console.log("\n" + "═".repeat(80));
  console.log("  API PERFORMANCE AUDIT REPORT");
  console.log("═".repeat(80));
  console.log(`  Environment:    ${report.meta.environment}`);
  console.log(`  Base URL:       ${report.meta.baseUrl}`);
  console.log(`  Flow:           ${report.meta.flow}`);
  console.log(`  Threshold:      ${report.meta.threshold}ms`);
  console.log(`  Total Duration: ${(report.meta.totalDuration / 1000).toFixed(1)}s`);
  console.log("");

  console.log("─".repeat(80));
  console.log("  SUMMARY");
  console.log("─".repeat(80));
  console.log(`  Total API calls:      ${report.summary.totalApiCalls}`);
  console.log(`  Slow APIs (>${report.meta.threshold}ms): ${report.summary.slowApis}`);
  console.log(`  Failed APIs:          ${report.summary.failedApis}`);
  console.log(`  Avg response time:    ${report.summary.avgResponseTime}ms`);
  console.log(`  P50:                  ${report.summary.p50ResponseTime}ms`);
  console.log(`  P90:                  ${report.summary.p90ResponseTime}ms`);
  console.log(`  P95:                  ${report.summary.p95ResponseTime}ms`);
  console.log(`  P99:                  ${report.summary.p99ResponseTime}ms`);
  console.log(`  Max:                  ${report.summary.maxResponseTime}ms`);
  console.log(`  Data transferred:     ${report.summary.totalDataTransferred}`);
  console.log("");

  if (report.slowApis.length > 0) {
    console.log("─".repeat(80));
    console.log(`  🐌 SLOW APIs (>${report.meta.threshold}ms) — ${report.slowApis.length} found`);
    console.log("─".repeat(80));
    for (const api of report.slowApis.slice(0, 20)) {
      const urlShort = api.url.length > 80 ? api.url.substring(0, 77) + "..." : api.url;
      console.log(`  ${api.duration.toString().padStart(6)}ms  ${api.method.padEnd(6)} ${api.status}  ${urlShort}`);
    }
    if (report.slowApis.length > 20) console.log(`  ... and ${report.slowApis.length - 20} more`);
    console.log("");
  }

  if (report.failedApis.length > 0) {
    console.log("─".repeat(80));
    console.log(`  ❌ FAILED APIs — ${report.failedApis.length} found`);
    console.log("─".repeat(80));
    for (const api of report.failedApis.slice(0, 15)) {
      const urlShort = api.url.length > 70 ? api.url.substring(0, 67) + "..." : api.url;
      console.log(`  ${api.status.toString().padStart(3)}  ${api.method.padEnd(6)} ${api.duration.toString().padStart(5)}ms  ${urlShort}`);
      if (api.errorMessage) console.log(`       Error: ${api.errorMessage}`);
    }
    console.log("");
  }

  console.log("─".repeat(80));
  console.log("  📊 TOP ENDPOINTS BY AVG RESPONSE TIME");
  console.log("─".repeat(80));
  for (const ep of report.byEndpoint.slice(0, 15)) {
    const epShort = ep.endpoint.length > 55 ? ep.endpoint.substring(0, 52) + "..." : ep.endpoint;
    console.log(`  ${ep.avgDuration.toString().padStart(6)}ms avg  ${ep.method.padEnd(5)} ×${ep.callCount.toString().padStart(3)}  ${epShort}`);
    if (ep.failureRate > 0) console.log(`         ⚠️  ${ep.failureRate}% failure rate`);
  }
  console.log("");
  console.log("═".repeat(80));
}

// ==================== Main ====================

(async () => {
  const config = parseArgs();
  console.log("🔍 API Performance Audit");
  console.log(`   Threshold: ${config.threshold}ms | Flow: ${config.flow} | Headless: ${config.headless}`);
  console.log("");

  const { width, height } = EnvConfig.RESOLUTION;
  const browser = await chromium.launch({
    headless: config.headless,
    args: ["--disable-blink-features=AutomationControlled", "--force-device-scale-factor=1"],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  context.setDefaultTimeout(60000);
  const page = await context.newPage();

  const interceptor = new NetworkInterceptor();
  interceptor.attach(page);

  const startTime = Date.now();

  try {
    // Execute the selected flow
    switch (config.flow) {
      case "login":
        await flowLogin(page);
        break;
      case "navigation":
        await flowLogin(page);
        await flowNavigation(page);
        break;
      case "full":
        await flowLogin(page);
        await flowNavigation(page);
        break;
    }

    const totalDuration = Date.now() - startTime;
    const calls = interceptor.getCalls();

    console.log(`\n  Captured ${calls.length} network requests in ${(totalDuration / 1000).toFixed(1)}s`);

    // Generate report
    const report = generateReport(calls, config, totalDuration);

    // Print to console
    printReport(report);

    // Save JSON report
    const outputDir = path.dirname(config.output);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(config.output, JSON.stringify(report, null, 2));
    console.log(`\n  📄 Full report saved: ${config.output}`);

  } catch (err) {
    console.error(`\n❌ Error: ${err}`);
    const totalDuration = Date.now() - startTime;
    const calls = interceptor.getCalls();
    if (calls.length > 0) {
      console.log(`\n  Partial data captured (${calls.length} requests):`);
      const report = generateReport(calls, config, totalDuration);
      printReport(report);
      fs.writeFileSync(config.output, JSON.stringify(report, null, 2));
      console.log(`  📄 Partial report saved: ${config.output}`);
    }
  } finally {
    await browser.close();
  }
})();
