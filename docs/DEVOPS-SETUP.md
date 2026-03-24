# DevOps Setup Guide - Facctum Playwright Test Automation

This document provides all configuration details needed to set up CI/CD pipelines for the Playwright BDD test automation framework.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Jenkins Setup](#jenkins-setup)
4. [GitHub Actions Setup](#github-actions-setup)
5. [Credentials Configuration](#credentials-configuration)
6. [Environment Variables](#environment-variables)
7. [Build Parameters](#build-parameters)
8. [Artifacts & Reports](#artifacts--reports)
9. [Troubleshooting](#troubleshooting)

---

## Overview

| Item | Details |
|------|---------|
| Framework | Playwright + Cucumber.js (BDD) |
| Language | TypeScript |
| Reporting | Allure Reports |
| Supported Browsers | Chromium, Firefox, WebKit |
| Environments | QA, Dev, Stage, UAT, Prod |

---

## Prerequisites

### Jenkins Agent Requirements
- Node.js 18+ (LTS recommended)
- Java 11+ (for Jenkins)
- Git
- Windows or Linux agent

### Required Jenkins Plugins
| Plugin | Purpose |
|--------|---------|
| Allure | Allure report integration |
| NodeJS | Node.js installation management |
| Pipeline | Pipeline support |
| Git | Git integration |
| Active Choices | Dynamic parameter selection (optional) |
| AnsiColor | Colored console output |
| Timestamper | Timestamps in console |

### Tool Configuration in Jenkins
1. **NodeJS**: Configure under Manage Jenkins > Tools > NodeJS installations
   - Name: `NodeJS-LTS`
   - Version: 20.x or latest LTS

2. **Allure Commandline**: Configure under Manage Jenkins > Tools > Allure Commandline
   - Name: `Allure`
   - Version: 2.27.0 or latest

---

## Jenkins Setup

### Option 1: Pipeline from SCM (Recommended)
1. Create new Pipeline job
2. Configure:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/kelvin-facct/Facctum-Playwright-Framework.git`
   - Branch: `*/main`
   - Script Path: `jenkins/Jenkinsfile`

### Option 2: Import Job Config
Import `jenkins/job-config.xml` via Jenkins CLI or REST API.

### Pipeline File Location
```
jenkins/
├── Jenkinsfile           # Main pipeline definition
├── job-config.xml        # Job configuration XML
└── README.md             # Detailed Jenkins setup guide
```

---

## GitHub Actions Setup

The workflow file is located at `.github/workflows/playwright.yml`.

### Secrets Required in GitHub
| Secret Name | Description |
|-------------|-------------|
| `APP_ORG_ID` | Organisation ID for login |
| `APP_USERNAME` | Login email address |
| `APP_PASSWORD` | Login password |

Configure in: Repository Settings > Secrets and variables > Actions

---

## Credentials Configuration

### Jenkins Credentials (Per Environment)

Create these credentials in Jenkins (Manage Jenkins > Credentials):

| Credential ID | Type | Description |
|---------------|------|-------------|
| `QA_APP_ORG_ID` | Secret text | QA environment Organisation ID |
| `QA_APP_USERNAME` | Secret text | QA environment login email |
| `QA_APP_PASSWORD` | Secret text | QA environment login password |
| `DEV_APP_ORG_ID` | Secret text | Dev environment Organisation ID |
| `DEV_APP_USERNAME` | Secret text | Dev environment login email |
| `DEV_APP_PASSWORD` | Secret text | Dev environment login password |
| `STAGE_APP_ORG_ID` | Secret text | Stage environment Organisation ID |
| `STAGE_APP_USERNAME` | Secret text | Stage environment login email |
| `STAGE_APP_PASSWORD` | Secret text | Stage environment login password |
| `UAT_APP_ORG_ID` | Secret text | UAT environment Organisation ID |
| `UAT_APP_USERNAME` | Secret text | UAT environment login email |
| `UAT_APP_PASSWORD` | Secret text | UAT environment login password |

**Naming Convention**: `{ENV}_APP_{CREDENTIAL_NAME}` (uppercase)

The Jenkinsfile dynamically selects credentials based on the selected environment:
```groovy
withCredentials([
    string(credentialsId: "${params.ENV.toUpperCase()}_APP_ORG_ID", variable: 'APP_ORG_ID'),
    string(credentialsId: "${params.ENV.toUpperCase()}_APP_USERNAME", variable: 'APP_USERNAME'),
    string(credentialsId: "${params.ENV.toUpperCase()}_APP_PASSWORD", variable: 'APP_PASSWORD')
])
```

### Database Credentials (Optional)

If tests require database access:

| Credential ID | Type | Description |
|---------------|------|-------------|
| `{ENV}_DB_USER` | Secret text | Database username |
| `{ENV}_DB_PASSWORD` | Secret text | Database password |

---

## Environment Variables

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ORG_ID` | Organisation ID for login | `facctum-qa` |
| `APP_USERNAME` | Login email | `test@facctum.com` |
| `APP_PASSWORD` | Login password | `********` |

### Optional Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `ENV` | `qa` | Target environment (qa, dev, stage, uat, prod) |
| `BROWSER` | `chromium` | Browser (chromium, firefox, webkit) |
| `HEADLESS` | `true` | Run without browser UI |
| `PARALLEL` | `0` | Parallel workers (0 = sequential) |
| `RETRY` | `1` | Retry attempts for failed tests |
| `VALIDATE_SESSION` | `true` | Validate session before each scenario |
| `TIMEOUT` | `60000` | Default timeout in ms |

### Database Variables (Optional)
| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | - | Database hostname |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | - | Database name |
| `DB_USER` | - | Database username |
| `DB_PASSWORD` | - | Database password |
| `DB_USE_IAM_AUTH` | `false` | Use AWS IAM authentication |
| `AWS_REGION` | `us-east-1` | AWS region for IAM auth |

---

## Build Parameters

### Jenkins Pipeline Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ENV` | Choice | qa | Target environment |
| `BROWSER` | Choice | chromium | Browser to use |
| `HEADLESS` | Boolean | true | Run headless |
| `PARALLEL` | String | 0 | Parallel workers |
| `RETRY` | String | 1 | Retry attempts |
| `FEATURE_FILE` | String | (empty) | Specific feature file |
| `TAGS` | String | (empty) | Cucumber tags filter |
| `VALIDATE_SESSION` | Boolean | true | Session validation |

### Example Tag Filters
```
@smoke                    # Run smoke tests only
@regression               # Run regression tests
not @skip                 # Exclude skipped tests
@login and not @slow      # Login tests excluding slow ones
```

---

## Artifacts & Reports

### Generated Artifacts
| Path | Description | Retention |
|------|-------------|-----------|
| `reports/{env}/allure-results/` | Raw Allure data | Per build |
| `reports/{env}/allure-report/` | Generated HTML report | Per build |
| `reports/{env}/cucumber-report.json` | Cucumber JSON report | Per build |
| `reports/{env}/runs/{timestamp}/` | Screenshots, traces, videos | On failure only |

### Allure Report Integration
The Jenkinsfile includes Allure report publishing:
```groovy
allure([
    includeProperties: false,
    jdk: '',
    results: [[path: "reports/${params.ENV}/allure-results"]]
])
```

### Build Description Links
After each build, links are added to the build description:
- 📊 Report History
- 📋 Latest Report

---

## Pipeline Stages

| Stage | Description |
|-------|-------------|
| Checkout | Clone repository |
| Setup | Install dependencies, Playwright browsers |
| Run Tests | Execute Cucumber tests |
| Generate Report | Generate Allure report |
| Archive Results | Archive artifacts |
| Publish Allure Report | Publish to Allure plugin |

---

## Commands Reference

### Install Dependencies
```bash
npm ci
npx playwright install --with-deps
```

### Run Tests
```bash
# All tests (CI mode, no report)
npm run test:ci

# Specific feature file
npm run test:file <filename>

# With tags
cucumber-js --config src/config/cucumber.js --tags "@smoke"
```

### Generate Report
```bash
npx allure-commandline generate reports/qa/allure-results -o reports/qa/allure-report --clean
```

---

## Troubleshooting

### Playwright Browsers Not Installing
```bash
# Run manually on agent
npx playwright install --with-deps

# Or install system dependencies (Linux)
npx playwright install-deps
```

### Allure Report Not Showing
1. Verify Allure plugin is installed in Jenkins
2. Check `allure-results` folder has `.json` files
3. Ensure Allure Commandline tool is configured

### Tests Timeout
Increase timeout in Jenkinsfile:
```groovy
options {
    timeout(time: 120, unit: 'MINUTES')
}
```

### Authentication Failures
1. Verify credentials are correctly configured in Jenkins
2. Check credential IDs match naming convention: `{ENV}_APP_{NAME}`
3. Ensure the application is accessible from the Jenkins agent

### Session Validation Overhead
If tests are slow, disable session validation:
- Set `VALIDATE_SESSION=false` in build parameters
- Saves ~3-5 seconds per scenario
- Only disable if token expiry is not a concern

---

## Environment URLs

| Environment | Application URL | API URL |
|-------------|-----------------|---------|
| QA | https://qa-saas.facctum.com | https://qa-api.facctum.com |
| Dev | https://dev-saas.facctum.com | https://dev-api.facctum.com |
| Stage | https://stage-saas.facctum.com | https://stage-api.facctum.com |
| UAT | https://uat-saas.facctum.com | https://uat-api.facctum.com |
| Prod | https://saas.facctum.com | https://api.facctum.com |

---

## Contact

For questions about this framework, contact the QA Automation team.
