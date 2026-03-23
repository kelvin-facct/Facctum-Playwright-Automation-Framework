#!/usr/bin/env node
/**
 * Cleanup Reports Script
 * 
 * Removes old test artifacts based on retention periods or clears everything.
 * 
 * Usage:
 *   npm run cleanup              # Clean old run folders (retention-based)
 *   npm run cleanup -- --all     # Delete all reports
 *   npm run cleanup -- --env qa  # Clean specific environment only
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const deleteAll = args.includes('--all');
const envIndex = args.indexOf('--env');
const targetEnv = envIndex !== -1 ? args[envIndex + 1] : null;

const RETENTION_DAYS = {
  runs: 14,           // Timestamped run folders (screenshots, videos, traces)
  allureResults: 7,   // Allure result files
  allureReportHistory: 7  // Archived allure reports
};

/**
 * Recursively deletes a directory.
 */
function deleteDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`  Deleted: ${dirPath}`);
  }
}

/**
 * Deletes directories older than maxAgeDays.
 */
function cleanOldDirs(dir, maxAgeDays) {
  if (!fs.existsSync(dir)) return 0;
  
  const entries = fs.readdirSync(dir);
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  entries.forEach(entry => {
    const entryPath = path.join(dir, entry);
    try {
      const stats = fs.statSync(entryPath);
      if (stats.isDirectory() && (now - stats.mtimeMs) > maxAgeMs) {
        fs.rmSync(entryPath, { recursive: true, force: true });
        console.log(`  Deleted old folder: ${entryPath}`);
        deleted++;
      }
    } catch (e) {
      // Skip entries that can't be accessed
    }
  });

  return deleted;
}

/**
 * Deletes files older than maxAgeDays in a directory.
 */
function cleanOldFiles(dir, maxAgeDays) {
  if (!fs.existsSync(dir)) return 0;
  
  const files = fs.readdirSync(dir);
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile() && (now - stats.mtimeMs) > maxAgeMs) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    } catch (e) {
      // Skip files that can't be accessed
    }
  });

  return deleted;
}

/**
 * Gets all environment directories in reports folder.
 */
function getEnvDirs() {
  const reportsDir = 'reports';
  if (!fs.existsSync(reportsDir)) return [];
  
  return fs.readdirSync(reportsDir)
    .filter(f => {
      const fullPath = path.join(reportsDir, f);
      return fs.statSync(fullPath).isDirectory() && !f.startsWith('.');
    });
}

/**
 * Cleans reports for a specific environment.
 */
function cleanEnv(env) {
  const reportsDir = `reports/${env}`;
  console.log(`\nCleaning ${env.toUpperCase()} environment...`);

  if (deleteAll) {
    deleteDir(reportsDir);
    return;
  }

  let totalDeleted = 0;
  
  // Clean old run folders (contains screenshots, videos, traces)
  totalDeleted += cleanOldDirs(`${reportsDir}/runs`, RETENTION_DAYS.runs);
  
  // Clean old allure results (keep history folder)
  const allureDir = `${reportsDir}/allure-results`;
  if (fs.existsSync(allureDir)) {
    totalDeleted += cleanOldFiles(allureDir, RETENTION_DAYS.allureResults);
  }
  
  // Clean old allure report history
  totalDeleted += cleanOldDirs(`${reportsDir}/allure-report-history`, RETENTION_DAYS.allureReportHistory);

  console.log(`  Removed ${totalDeleted} old items`);
}

// Main execution
console.log('='.repeat(50));
console.log('  Report Cleanup');
console.log('='.repeat(50));
console.log(`Mode: ${deleteAll ? 'DELETE ALL' : 'Retention-based cleanup'}`);

if (targetEnv) {
  cleanEnv(targetEnv);
} else {
  const envDirs = getEnvDirs();
  if (envDirs.length === 0) {
    console.log('\nNo report directories found.');
  } else {
    envDirs.forEach(cleanEnv);
  }
}

console.log('\nCleanup complete.');
