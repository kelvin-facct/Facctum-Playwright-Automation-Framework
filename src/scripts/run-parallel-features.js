/**
 * Feature-Level Parallel Execution Script
 * 
 * Runs feature files in parallel while keeping scenarios within each file sequential.
 * This allows dependent scenarios within a feature to run in order while different
 * features execute simultaneously.
 * 
 * Usage:
 *   npm run test:parallel:features           # Run all features in parallel
 *   npm run test:parallel:features -- 3      # Run with 3 workers
 *   WORKERS=4 npm run test:parallel:features # Run with 4 workers via env
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Configuration
const FEATURES_DIR = "src/features";
const CONFIG_PATH = "src/config/cucumber.js";
const env = process.env.ENV || "qa";
const reportsDir = `reports/${env}`;

// Get worker count from args or env (default: CPU cores or 2, whichever is smaller)
const defaultWorkers = Math.min(os.cpus().length, 2);
const workers = parseInt(process.argv[2] || process.env.WORKERS || defaultWorkers, 10);

/**
 * Discovers all feature files in the features directory.
 */
function discoverFeatureFiles() {
  const features = [];
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".feature")) {
        features.push(fullPath);
      }
    }
  }
  
  scanDir(FEATURES_DIR);
  return features;
}

/**
 * Runs a single feature file and returns a promise.
 */
function runFeature(featurePath, workerIndex) {
  return new Promise((resolve) => {
    const featureName = path.basename(featurePath, ".feature");
    const startTime = Date.now();
    
    console.log(`[Worker ${workerIndex}] Starting: ${featureName}`);
    
    // Run cucumber with PARALLEL=0 to ensure sequential execution within the feature
    const cucumberProcess = spawn("npx", [
      "cucumber-js",
      "--config", CONFIG_PATH,
      featurePath
    ], {
      env: {
        ...process.env,
        PARALLEL: "0",  // Force sequential within feature
        FEATURE_WORKER: workerIndex.toString()
      },
      shell: true,
      stdio: ["inherit", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    cucumberProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    cucumberProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    cucumberProcess.on("close", (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const status = code === 0 ? "✓ PASSED" : "✗ FAILED";
      console.log(`[Worker ${workerIndex}] ${status}: ${featureName} (${duration}s)`);
      
      resolve({
        feature: featureName,
        path: featurePath,
        exitCode: code,
        duration: parseFloat(duration),
        stdout,
        stderr
      });
    });
  });
}

/**
 * Distributes features across workers and runs them in parallel.
 */
async function runFeaturesInParallel(features, maxWorkers) {
  const results = [];
  const queue = [...features];
  const activeWorkers = new Map();
  
  return new Promise((resolve) => {
    function startNextFeature(workerIndex) {
      if (queue.length === 0) {
        activeWorkers.delete(workerIndex);
        if (activeWorkers.size === 0) {
          resolve(results);
        }
        return;
      }
      
      const feature = queue.shift();
      activeWorkers.set(workerIndex, feature);
      
      runFeature(feature, workerIndex).then((result) => {
        results.push(result);
        startNextFeature(workerIndex);
      });
    }
    
    // Start initial workers
    const workerCount = Math.min(maxWorkers, features.length);
    for (let i = 1; i <= workerCount; i++) {
      startNextFeature(i);
    }
  });
}

/**
 * Merges individual cucumber JSON reports into a single report.
 */
function mergeReports() {
  const resultsDir = `${reportsDir}/allure-results`;
  // Allure results are already written to the same directory by each worker
  // No merge needed for Allure - it handles multiple result files automatically
  console.log(`\nAllure results available in: ${resultsDir}`);
}

/**
 * Prints execution summary.
 */
function printSummary(results, totalDuration) {
  console.log("\n" + "=".repeat(60));
  console.log("FEATURE-LEVEL PARALLEL EXECUTION SUMMARY");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.exitCode === 0);
  const failed = results.filter(r => r.exitCode !== 0);
  
  console.log(`\nTotal Features: ${results.length}`);
  console.log(`  Passed: ${passed.length}`);
  console.log(`  Failed: ${failed.length}`);
  console.log(`\nWorkers Used: ${workers}`);
  console.log(`Total Duration: ${totalDuration.toFixed(1)}s`);
  
  // Calculate theoretical sequential time
  const sequentialTime = results.reduce((sum, r) => sum + r.duration, 0);
  const timeSaved = sequentialTime - totalDuration;
  if (timeSaved > 0) {
    console.log(`Time Saved: ${timeSaved.toFixed(1)}s (${((timeSaved / sequentialTime) * 100).toFixed(0)}% faster)`);
  }
  
  if (failed.length > 0) {
    console.log("\nFailed Features:");
    failed.forEach(f => console.log(`  - ${f.feature}`));
  }
  
  console.log("=".repeat(60));
  
  return failed.length > 0 ? 1 : 0;
}

/**
 * Main execution.
 */
async function main() {
  console.log("=".repeat(60));
  console.log("FEATURE-LEVEL PARALLEL EXECUTION");
  console.log("=".repeat(60));
  console.log(`Environment: ${env}`);
  console.log(`Workers: ${workers}`);
  console.log("");
  
  // Discover features
  const features = discoverFeatureFiles();
  
  if (features.length === 0) {
    console.log("No feature files found!");
    process.exit(1);
  }
  
  console.log(`Found ${features.length} feature file(s):`);
  features.forEach(f => console.log(`  - ${path.basename(f)}`));
  console.log("");
  
  // Run features in parallel
  const startTime = Date.now();
  const results = await runFeaturesInParallel(features, workers);
  const totalDuration = (Date.now() - startTime) / 1000;
  
  // Merge reports
  mergeReports();
  
  // Print summary and exit
  const exitCode = printSummary(results, totalDuration);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error("Execution failed:", error);
  process.exit(1);
});
