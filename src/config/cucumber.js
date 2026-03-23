const fs = require("fs");
const path = require("path");

const env = process.env.ENV || "qa";
const reportsDir = `reports/${env}`;

// Load .env.secrets if exists (same logic as env.ts)
const secretsPath = path.resolve(__dirname, ".env.secrets");
let secrets = {};
try {
  if (fs.existsSync(secretsPath)) {
    const content = fs.readFileSync(secretsPath, "utf-8");
    content.split("\n").forEach(line => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length && !key.trim().startsWith("#")) {
        secrets[key.trim()] = valueParts.join("=").trim();
      }
    });
  }
} catch (e) {
  // Secrets file is optional
}

// Helper to get value with priority: process.env > secrets > default
const get = (key, defaultVal) => process.env[key] ?? secrets[key] ?? defaultVal;

module.exports = {

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

    paths: ["src/features/**/*.feature"],

    parallel: parseInt(get("PARALLEL", "0"), 10),

    retry: parseInt(get("RETRY", "0"), 10),

    worldParameters: {
      env: env,
      reportsDir: reportsDir
    }

  }

};
