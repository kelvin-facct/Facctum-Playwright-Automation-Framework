# Facctum Playwright Automation Framework

End-to-end test automation framework for the Facctum AML (Anti-Money Laundering) platform using Playwright and Cucumber BDD.

## Tech Stack

- **TypeScript** - Type-safe test development
- **Playwright** - Browser automation
- **Cucumber.js** - BDD test framework with Gherkin syntax
- **Allure Reports** - Rich test reporting with history tracking
- **Winston** - Logging
- **PostgreSQL** - Database testing support (with AWS RDS IAM auth)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/kelvin-facct/Facctum-Playwright-Automation-Framework.git
cd Facctum-Playwright-Automation-Framework
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Playwright Browsers

```bash
npx playwright install
```

### 4. Configure Credentials

Create a credentials file at `src/config/.env.secrets`:

```bash
# App login credentials
APP_ORG_ID=your-organisation-id
APP_USERNAME=your.email@example.com
APP_PASSWORD=your-password

# Database credentials (optional)
DB_USER=dbuser
DB_PASSWORD=dbpassword
```

> **Note:** This file is gitignored and should never be committed.

### 5. Run Tests

```bash
# Run all tests and open Allure report
npm test

# Run specific feature file
npm run test:file login

# Run without report (CI mode)
npm run test:ci
```

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── cucumber.js   # Cucumber runner config
│   ├── env.ts        # Environment config loader
│   ├── environments.json  # Environment URLs and settings
│   └── .env.secrets  # Local credentials (gitignored)
├── features/         # Gherkin feature files (.feature)
├── stepDefinitions/  # Step definition files (*.steps.ts)
├── pages/            # Page Object Model classes
├── helpers/          # Reusable utilities
├── hooks/            # Cucumber hooks (Before/After)
├── world/            # Cucumber World (shared state)
├── utils/            # General utilities (logger)
└── scripts/          # Helper scripts
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENV` | Target environment (qa, dev, stage, uat, prod) | `qa` |
| `BROWSER` | Browser type (chromium, firefox, webkit) | `chromium` |
| `HEADLESS` | Run headless mode | `false` |
| `PARALLEL` | Number of parallel workers (0 = sequential) | `0` |
| `VALIDATE_SESSION` | Validate session before each scenario | `true` |

### Configuration Priority

Values are loaded with this priority (highest to lowest):
1. Process environment variables (`ENV=dev npm test`)
2. `.env.secrets` file (for credentials)
3. Environment-specific config from `environments.json`
4. Default values from `environments.json._defaults`

### View Current Configuration

```bash
npx ts-node src/scripts/show-config.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests with Allure report
npm test

# Run specific feature file(s)
npm run test:file login                    # by name
npm run test:file login.feature            # with extension
npm run test:file src/features/login.feature  # full path
npm run test:file login dashboard          # multiple files

# Run tests only (no report) - for CI/CD
npm run test:ci

# Run with fail-fast (stop on first failure)
npm run test:fail-fast
```

### Browser Selection

```bash
npm run test:chrome    # Chromium (default)
npm run test:firefox   # Firefox
npm run test:webkit    # WebKit (Safari)
```

### Environment Selection

```bash
npm run test:qa        # QA environment
npm run test:dev       # Dev environment

# Or use ENV variable
ENV=stage npm run test:ci
```

### Parallel Execution

```bash
npm run test:parallel  # 2 workers

# Custom worker count
PARALLEL=4 npm run test:ci
```

### Headless Mode

```bash
HEADLESS=true npm test
```

## Reports

Reports are organized by environment in `reports/{env}/`.

### Allure Reports

```bash
# Generate and open Allure report
npm run allure:report

# Just generate (no open)
npm run allure:generate

# Just open existing report
npm run allure:open
```

### Report Locations

- `reports/{env}/allure-results/` - Raw Allure data
- `reports/{env}/allure-report/` - Generated HTML report
- `reports/{env}/allure-report-history/` - Archived reports (7-day retention)
- `reports/{env}/runs/{timestamp}/` - Screenshots, traces, videos (14-day retention)

### Debugging Failed Tests

```bash
# View trace file for a failed scenario
npm run trace:show
```

## Writing Tests

### Feature Files

Create `.feature` files in `src/features/`:

```gherkin
Feature: User Login
  @Login @Smoke
  Scenario: Successful login with valid credentials
    Given user is on the login page
    When user enters valid credentials
    Then user should see the dashboard
```

### Step Definitions

Create `*.steps.ts` files in `src/stepDefinitions/`:

```typescript
import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";

Given("user is on the login page", async function (this: CustomWorld) {
  const loginPage = this.pageManager.getLoginPage();
  await loginPage.navigate();
});

When("user enters valid credentials", async function (this: CustomWorld) {
  const loginPage = this.pageManager.getLoginPage();
  await loginPage.loginWithConfig();
});

Then("user should see the dashboard", async function (this: CustomWorld) {
  const dashboard = this.pageManager.getFacctumDashboardPage();
  // Add assertions
});
```

### Page Objects

Create page classes in `src/pages/`:

```typescript
import { Page, Locator } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";

export class MyPage {
  private actions: PlaywrightActions;
  private myButton: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);
    this.myButton = page.getByRole("button", { name: "Click Me" });
  }

  async clickButton() {
    await this.actions.click(this.myButton);
  }
}
```

Register in `src/pages/PageManager.ts`:

```typescript
import { MyPage } from "./MyPage";

export class PageManager {
  private myPage?: MyPage;

  getMyPage(): MyPage {
    if (!this.myPage) {
      this.myPage = new MyPage(this.page);
    }
    return this.myPage;
  }
}
```

## Authentication

The framework handles authentication automatically:

1. **BeforeAll**: Logs in once and saves session to `reports/{env}/.auth/`
2. **Before each scenario**: Loads saved session, validates it, re-authenticates if expired
3. **AfterAll**: Clears auth state for fresh login on next run

### Switching Users Mid-Test

```typescript
import { AuthHelper } from "../helpers/authHelper";

// Switch user within same organization
await AuthHelper.switchUser(this.context, this.page, {
  email: "other.user@example.com",
  password: "password123"
});

// Switch to different organization
await AuthHelper.switchOrganization(this.context, this.page, {
  orgId: "other-org-id",
  email: "user@other-org.com",
  password: "password456"
});
```

## Database Testing

### Configuration

Add to `.env.secrets`:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=facctum
DB_USER=dbuser
DB_PASSWORD=dbpassword

# For AWS RDS IAM auth
DB_USE_IAM_AUTH=true
AWS_REGION=us-east-1
```

### Usage in Tests

```typescript
// In step definition
await this.db.connect();
const result = await this.db.query("SELECT * FROM users WHERE id = $1", [userId]);
await this.db.disconnect();
```

### Test Database Connection

```bash
npm run db:test
```

## CI/CD Integration

### Jenkins

See `jenkins/README.md` for Jenkins pipeline setup.

### GitHub Actions

Example workflow:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:ci
        env:
          APP_ORG_ID: ${{ secrets.APP_ORG_ID }}
          APP_USERNAME: ${{ secrets.APP_USERNAME }}
          APP_PASSWORD: ${{ secrets.APP_PASSWORD }}
          HEADLESS: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-results
          path: reports/qa/allure-results/
```

## Troubleshooting

### Common Issues

**Login fails:**
- Check credentials in `.env.secrets`
- Run `npx ts-node src/scripts/show-config.ts` to verify config
- Ensure the target environment is accessible

**Browser not found:**
- Run `npx playwright install`

**Tests timeout:**
- Increase timeout in `environments.json` (`TIMEOUT`, `EXTENDED_TIMEOUT`)
- Check network connectivity to target environment

**Parallel tests fail:**
- Reduce worker count: `PARALLEL=1 npm test`
- Check for test data conflicts

### Debug Mode

```bash
# Run with visible browser
HEADLESS=false npm test

# Enable Playwright debug
PWDEBUG=1 npm run test:ci
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests + open Allure report |
| `npm run test:file <name>` | Run specific feature file(s) |
| `npm run test:ci` | Run tests without report (CI mode) |
| `npm run test:parallel` | Run with 2 parallel workers |
| `npm run test:chrome/firefox/webkit` | Run on specific browser |
| `npm run test:qa/dev` | Run against specific environment |
| `npm run allure:report` | Generate and open Allure report |
| `npm run trace:show` | Open Playwright trace viewer |
| `npm run db:test` | Test database connection |
| `npm run cleanup` | Clean old test artifacts |

## License

ISC
