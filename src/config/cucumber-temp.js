module.exports = {
  "default": {
    "require": [
      "src/world/**/*.ts",
      "src/stepDefinitions/**/*.ts",
      "src/hooks/**/*.ts"
    ],
    "requireModule": [
      "ts-node/register"
    ],
    "format": [
      "progress",
      "json:reports/qa/cucumber-report.json",
      "allure-cucumberjs/reporter"
    ],
    "formatOptions": {
      "resultsDir": "reports/qa/allure-results"
    },
    "paths": [
      "src/features/parallelSuppressEnrich.feature"
    ],
    "parallel": 0,
    "retry": 0,
    "worldParameters": {
      "env": "qa",
      "reportsDir": "reports/qa"
    }
  }
};