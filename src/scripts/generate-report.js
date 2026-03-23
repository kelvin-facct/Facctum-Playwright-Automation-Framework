/**
 * Generate Report Script
 * 
 * Generates a standalone HTML test report from Allure results.
 * Parses test result JSON files and creates a visual summary with:
 * - Overall test statistics (total, passed, failed)
 * - Tests grouped by feature/suite
 * - Expandable test steps
 * - Duration information
 * 
 * @usage npm run report:html
 * @output reports/test-report.html
 */

const fs = require('fs');
const path = require('path');

// Environment-specific paths
const env = process.env.ENV || 'qa';

/** Directory containing Allure result JSON files */
const resultsDir = `reports/${env}/allure-results`;

/** Output path for the generated HTML report */
const outputFile = `reports/${env}/test-report.html`;

/**
 * Generates an HTML test report from Allure result files.
 * Reads all result JSON files, groups tests by feature, and creates
 * a styled HTML report with interactive elements.
 */
function generateReport() {
  // Find all test result files
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));
  
  // Group tests by feature/suite
  const testsByFeature = {};
  
  files.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
      const featureName = data.labels?.find(l => l.name === 'feature')?.value || 'Unknown Feature';
      const suiteName = data.labels?.find(l => l.name === 'suite')?.value || featureName;
      
      if (!testsByFeature[suiteName]) {
        testsByFeature[suiteName] = [];
      }
      
      testsByFeature[suiteName].push({
        name: data.name,
        status: data.status,
        duration: data.stop - data.start,
        steps: data.steps || [],
        attachments: data.attachments || []
      });
    } catch (e) {
      // Skip invalid files
    }
  });

  // Calculate summary statistics
  const allTests = Object.values(testsByFeature).flat();
  const totalTests = allTests.length;
  const passedTests = allTests.filter(t => t.status === 'passed').length;
  const failedTests = allTests.filter(t => t.status === 'failed' || t.status === 'broken').length;

  // Generate HTML report
  const html = generateHtml(testsByFeature, totalTests, passedTests, failedTests);

  // Write report to file
  fs.writeFileSync(outputFile, html);
  console.log(`Report generated: ${outputFile}`);
}

/**
 * Generates the HTML content for the test report.
 * @param {Object} testsByFeature - Tests grouped by feature name
 * @param {number} totalTests - Total number of tests
 * @param {number} passedTests - Number of passed tests
 * @param {number} failedTests - Number of failed tests
 * @returns {string} Complete HTML document
 */
function generateHtml(testsByFeature, totalTests, passedTests, failedTests) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .summary-card.passed { border-left: 4px solid #4caf50; }
    .summary-card.failed { border-left: 4px solid #f44336; }
    .summary-card.total { border-left: 4px solid #2196f3; }
    .summary-card h3 { font-size: 32px; }
    .summary-card p { color: #666; }
    .feature { background: white; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    .feature-header { background: #2196f3; color: white; padding: 15px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .feature-header:hover { background: #1976d2; }
    .feature-header h2 { font-size: 18px; }
    .feature-stats { display: flex; gap: 15px; }
    .feature-stats span { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 14px; }
    .tests { display: none; }
    .tests.open { display: block; }
    .test { padding: 15px 20px; border-bottom: 1px solid #eee; }
    .test:last-child { border-bottom: none; }
    .test-header { display: flex; justify-content: space-between; align-items: center; }
    .test-name { font-weight: 500; }
    .test-status { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .test-status.passed { background: #e8f5e9; color: #2e7d32; }
    .test-status.failed { background: #ffebee; color: #c62828; }
    .test-status.broken { background: #fff3e0; color: #e65100; }
    .test-status.skipped { background: #f5f5f5; color: #757575; }
    .test-duration { color: #999; font-size: 14px; margin-top: 5px; }
    .test-steps { margin-top: 10px; padding-left: 20px; display: none; }
    .test-steps.open { display: block; }
    .step { padding: 5px 0; font-size: 14px; color: #555; }
    .toggle-steps { color: #2196f3; cursor: pointer; font-size: 14px; margin-top: 5px; }
    .toggle-steps:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Test Execution Report</h1>
    <div class="summary">
      <div class="summary-card total">
        <h3>${totalTests}</h3>
        <p>Total Tests</p>
      </div>
      <div class="summary-card passed">
        <h3>${passedTests}</h3>
        <p>Passed</p>
      </div>
      <div class="summary-card failed">
        <h3>${failedTests}</h3>
        <p>Failed</p>
      </div>
    </div>
    
    ${Object.entries(testsByFeature).map(([feature, tests]) => `
      <div class="feature">
        <div class="feature-header" onclick="toggleFeature(this)">
          <h2>${feature}</h2>
          <div class="feature-stats">
            <span>✓ ${tests.filter(t => t.status === 'passed').length}</span>
            <span>✗ ${tests.filter(t => t.status !== 'passed').length}</span>
            <span>${tests.length} tests</span>
          </div>
        </div>
        <div class="tests">
          ${tests.map(test => `
            <div class="test">
              <div class="test-header">
                <span class="test-name">${test.name}</span>
                <span class="test-status ${test.status}">${test.status}</span>
              </div>
              <div class="test-duration">${(test.duration / 1000).toFixed(2)}s</div>
              ${test.steps.length > 0 ? `
                <div class="toggle-steps" onclick="toggleSteps(this)">Show ${test.steps.length} steps</div>
                <div class="test-steps">
                  ${test.steps.map(step => `<div class="step">• ${step.name}</div>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>
  
  <script>
    /**
     * Toggles the visibility of tests within a feature section.
     * @param {HTMLElement} header - The feature header element
     */
    function toggleFeature(header) {
      header.nextElementSibling.classList.toggle('open');
    }
    
    /**
     * Toggles the visibility of steps within a test.
     * @param {HTMLElement} btn - The toggle button element
     */
    function toggleSteps(btn) {
      const steps = btn.nextElementSibling;
      steps.classList.toggle('open');
      btn.textContent = steps.classList.contains('open') ? 'Hide steps' : 'Show ' + steps.children.length + ' steps';
    }
  </script>
</body>
</html>`;
}

// Execute report generation
generateReport();
