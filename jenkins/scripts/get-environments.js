/**
 * Reads environments.json and outputs environment names (excluding _defaults).
 * Used by Jenkins to dynamically populate the ENV parameter choices.
 * 
 * Usage: node jenkins/scripts/get-environments.js
 * Output: qa,dev,stage,uat,prod (comma-separated list)
 */
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../../src/config/environments.json');

try {
  const content = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content);
  
  // Get all keys except _defaults
  const environments = Object.keys(config).filter(key => key !== '_defaults');
  
  // Output as comma-separated list
  console.log(environments.join(','));
} catch (error) {
  // Fallback to default environments if file can't be read
  console.log('qa,dev,stage,uat');
}
