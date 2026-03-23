/**
 * Show Trace Script
 * 
 * Opens a Playwright trace file in the Playwright Trace Viewer.
 * Trace files are generated when scenarios fail and contain detailed
 * information about browser actions, network requests, and screenshots.
 * 
 * @usage npm run trace:show -- <trace_filename>
 * @example npm run trace:show -- Create_a_new_case.zip
 * 
 * Trace files are stored in: reports/traces/
 */
//upload the trace zip to the below url
//trace url: https://trace.playwright.dev/
const { execSync } = require('child_process');
const path = require('path');

// Get trace filename from command line arguments
const traceName = process.argv[2];

// Validate that a trace filename was provided
if (!traceName) {
  console.log('Usage: npm run trace:show -- <trace_filename>');
  console.log('Example: npm run trace:show -- Create_a_new_case.zip');
  process.exit(1);
}

// Environment-specific trace directory
const env = process.env.ENV || 'qa';

// Build full path to trace file and open in Playwright Trace Viewer
const tracePath = path.join(`reports/${env}/traces`, traceName);
execSync(`npx playwright show-trace "${tracePath}"`, { stdio: 'inherit' });
