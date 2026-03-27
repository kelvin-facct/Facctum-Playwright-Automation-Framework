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

# Environment-specific credentials (optional)
# Use {ENV}_* prefix to override credentials per environment
# These take precedence over the base values when running against that environment
QA_APP_USERNAME=qa.user@example.com
QA_APP_PASSWORD=qa-password
DEV_APP_USERNAME=dev.user@example.com
DEV_APP_PASSWORD=dev-password

# Database credentials
DB_HOST=localhost
DB_NAME=facctum
DB_USER=dbuser
DB_PASSWORD=dbpassword

# Environment-specific database credentials (optional)
QA_DB_HOST=qa-db.example.com
QA_DB_NAME=facctum_qa
DEV_DB_HOST=dev-db.example.com
DEV_DB_NAME=facctum_dev
```

#### Credential Resolution Priority
For app credentials (`APP_ORG_ID`, `APP_USERNAME`, `APP_PASSWORD`) and database credentials (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`), the resolution order is:
1. `@org:xxx` tag in feature file (for `APP_ORG_ID` only - takes highest priority)
2. `{ENV}_*` in process.env (e.g., `DEV_APP_USERNAME`, `DEV_DB_HOST`)
3. `{ENV}_*` in .env.secrets
4. `QA_*` fallback in process.env (e.g., `QA_APP_USERNAME`)
5. `QA_*` fallback in .env.secrets
6. Base key in process.env (e.g., `APP_USERNAME`, `DB_HOST`)
7. Base key in .env.secrets or environments.json
8. Default value

**Note:** For hyphenated environments (e.g., `stage-uk`, `stage-ind`), use underscores in the credential prefix:
- `stage-uk` → `STAGE_UK_APP_USERNAME`, `STAGE_UK_DB_HOST`
- `stage-ind` → `STAGE_IND_APP_PASSWORD`, `STAGE_IND_DB_USER`

This allows you to maintain different credentials per environment in a single `.env.secrets` file. QA credentials serve as a fallback when environment-specific credentials aren't defined.
