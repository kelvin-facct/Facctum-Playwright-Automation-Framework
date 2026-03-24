# Tech Stack

## Core Technologies
- **Language**: TypeScript (ES6 target, CommonJS modules)
- **Test Framework**: Cucumber.js with Gherkin syntax
- **Browser Automation**: Playwright
- **Reporting**: Allure Reports
- **Logging**: Winston

## Key Dependencies
- `@cucumber/cucumber` - BDD test framework
- `@playwright/test` - Browser automation
- `allure-cucumberjs` - Allure report integration
- `ts-node` - TypeScript execution

- `cross-env` - Cross-platform env variables
- `pg` - PostgreSQL client for database operations
- `@aws-sdk/rds-signer` - AWS RDS IAM authentication

## Common Commands

### Running Tests
```bash
# Run all tests and open Allure report (default: QA environment, Chromium)
npm test

# Run specific feature file(s) with Allure report
npm run test:file login                    # by name
npm run test:file login.feature            # with extension
npm run test:file src/features/login.feature  # full path
npm run test:file login exploratory        # multiple files

# Run tests only (no report) - for CI/CD pipelines
npm run test:ci

# Run with fail-fast (stop on first failure)
npm run test:fail-fast

# Run in parallel (2 workers)
npm run test:parallel

# Run on specific browser
npm run test:chrome
npm run test:firefox
npm run test:webkit

# Run against specific environment
npm run test:qa
npm run test:dev
```

### Reports
Reports are now organized by environment (e.g., `reports/qa/`, `reports/dev/`).

```bash
# Generate and open Allure report (uses current ENV)
npm run allure:report

# Run tests and generate report (same as npm test)
npm run test:report

# View trace file for debugging
npm run trace:show
```

Report locations:
- `reports/{env}/allure-results/` - Raw Allure data
- `reports/{env}/allure-report/` - Generated HTML report
- `reports/{env}/cucumber-report.json` - Cucumber JSON report

### Environment Variables
- `ENV` - Target environment (qa, dev, stage)
- `BROWSER` - Browser type (chromium, firefox, webkit)
- `PARALLEL` - Number of parallel workers (0 = sequential)
- `HEADLESS` - Run headless (true/false)
- `VALIDATE_SESSION` - Validate session before each scenario (true/false, default: true)

### Database
```bash
# Test database connection
npm run db:test
```

### Database Environment Variables
- `DB_HOST` - Database hostname
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password (when not using IAM auth)
- `DB_USE_IAM_AUTH` - Use AWS IAM authentication (true/false)
- `AWS_REGION` - AWS region for IAM auth (default: us-east-1)

## Configuration Files
- `src/config/cucumber.js` - Cucumber configuration
- `src/config/environments.json` - Environment configurations (qa, dev, stage, uat, prod)
- `src/config/.env.secrets` - Local credentials file (gitignored)
- `tsconfig.json` - TypeScript compiler options

## Configuration Priority
Configuration values are loaded with the following priority (highest to lowest):
1. Process environment variables (`process.env`)
2. `.env.secrets` file (for local credentials, gitignored)
3. Environment-specific config from `environments.json`
4. Default values from `environments.json._defaults`

### Debugging Configuration
To see how your current configuration values are resolved:
```bash
npx ts-node src/scripts/show-config.ts
```
This displays the active values for key settings and reminds you of the priority order.

### environments.json Structure
```json
{
  "_defaults": {
    "HEADLESS": false,
    "TIMEOUT": 60000,
    "DB_PORT": 5432
  },
  "qa": {
    "BASE_URL": "https://qa-saas.facctum.com",
    "API_URL": "https://qa-api.facctum.com",
    "DB_HOST": "localhost"
  },
  "dev": { ... },
  "stage": { ... },
  "uat": { ... },
  "prod": { ... }
}
```

### .env.secrets (Local Credentials)
Create `src/config/.env.secrets` for sensitive values:
```
# App login credentials (multi-step login flow)
APP_ORG_ID=your-org-id
APP_USERNAME=your.email@example.com
APP_PASSWORD=your-password

# Database credentials
DB_USER=dbuser
DB_PASSWORD=dbpassword
```
