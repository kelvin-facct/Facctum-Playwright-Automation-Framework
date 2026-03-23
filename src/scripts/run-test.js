#!/usr/bin/env node
/**
 * Run specific test file(s) with Allure report generation.
 * 
 * Usage:
 *   npm run test:file -- login
 *   npm run test:file -- login.feature
 *   npm run test:file -- login exploratory
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const env = process.env.ENV || 'qa';

if (args.length === 0) {
  console.log('Usage: npm run test:file -- <feature_name> [feature_name2 ...]');
  console.log('Examples:');
  console.log('  npm run test:file -- login');
  console.log('  npm run test:file -- login.feature');
  console.log('  npm run test:file -- login exploratory');
  process.exit(1);
}

// Resolve feature file paths
const featurePaths = args.map(arg => {
  if (arg.includes('/') || arg.includes('\\')) {
    return arg;
  }
  const fileName = arg.endsWith('.feature') ? arg : `${arg}.feature`;
  return `src/features/${fileName}`;
});

console.log(`\nRunning tests: ${featurePaths.join(', ')}`);
console.log(`Environment: ${env}\n`);

// Create temporary config that overrides paths
const reportsDir = `reports/${env}`;
const tempConfig = {
  default: {
    require: [
      "src/world/**/*.ts",
      "src/stepDefinitions/**/*.ts",
      "src/hooks/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    format: [
      "progress",
      `json:${reportsDir}/cucumber-report.json`,
      "allure-cucumberjs/reporter"
    ],
    formatOptions: {
      resultsDir: `${reportsDir}/allure-results`
    },
    paths: featurePaths,
    parallel: parseInt(process.env.PARALLEL || "0", 10),
    retry: parseInt(process.env.RETRY || "0", 10),
    worldParameters: {
      env: env,
      reportsDir: reportsDir
    }
  }
};

const tempConfigPath = 'src/config/cucumber-temp.js';
fs.writeFileSync(tempConfigPath, `module.exports = ${JSON.stringify(tempConfig, null, 2)};`);

try {
  const cucumberCmd = `cucumber-js --config ${tempConfigPath}`;
  execSync(cucumberCmd, { stdio: 'inherit' });
} catch (error) {
  console.log('\nTests completed with failures.');
} finally {
  // Clean up temp config
  fs.unlinkSync(tempConfigPath);
}

// Generate and open Allure report
console.log('\nGenerating Allure report...');
try {
  execSync(`npx allure-commandline generate ${reportsDir}/allure-results --clean -o ${reportsDir}/allure-report`, { stdio: 'inherit' });
  execSync(`npx allure-commandline open ${reportsDir}/allure-report`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to generate/open report:', error.message);
}
