/**
 * Archive Allure Report Script
 * 
 * Archives the current allure-report to a timestamped folder for historical tracking.
 * Keeps reports for 7 days by default.
 * 
 * @usage npm run allure:archive
 */

const fs = require('fs');
const path = require('path');

const env = process.env.ENV || 'qa';
const reportsDir = `reports/${env}`;
const currentReport = `${reportsDir}/allure-report`;
const historyDir = `${reportsDir}/allure-report-history`;
const RETENTION_DAYS = 7;

/**
 * Archives the current report with a timestamp.
 */
function archiveReport() {
  // Check if current report exists
  if (!fs.existsSync(currentReport)) {
    console.log('No report to archive');
    return;
  }

  // Create history directory
  fs.mkdirSync(historyDir, { recursive: true });

  // Generate timestamp for archive name
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archiveName = `report-${timestamp}`;
  const archivePath = path.join(historyDir, archiveName);

  // Copy current report to archive
  copyDir(currentReport, archivePath);
  console.log(`Report archived: ${archivePath}`);

  // Clean old archives
  cleanOldArchives();
}

/**
 * Recursively copies a directory.
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Removes archives older than RETENTION_DAYS.
 */
function cleanOldArchives() {
  if (!fs.existsSync(historyDir)) return;

  const now = Date.now();
  const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const entries = fs.readdirSync(historyDir);

  for (const entry of entries) {
    const entryPath = path.join(historyDir, entry);
    const stats = fs.statSync(entryPath);

    if (stats.isDirectory() && (now - stats.mtimeMs) > maxAge) {
      fs.rmSync(entryPath, { recursive: true, force: true });
      console.log(`Deleted old archive: ${entry}`);
    }
  }
}

archiveReport();
