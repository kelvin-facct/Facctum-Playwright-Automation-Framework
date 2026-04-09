# Test Commands Quick Reference

## Running Tests

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests + open Allure report (always generates report, even on test failures) |
| `npm run test:file <filename>` | Run specific feature file |
| `npm run test:ci` | Run tests only (no report) - for CI/CD |
| `npm run test:fail-fast` | Stop on first failure |
| `npm run test:parallel` | Run with 2 parallel workers (scenario-level) |
| `npm run test:parallel:features` | Run features in parallel (scenarios sequential within each) |
| `npm run test:parallel:features:report` | Run features in parallel + open Allure report |

## Browser Selection

| Command | Description |
|---------|-------------|
| `npm run test:chrome` | Run on Chromium |
| `npm run test:firefox` | Run on Firefox |
| `npm run test:webkit` | Run on WebKit (Safari) |

## Environment Selection

| Command | Description |
|---------|-------------|
| `npm run test:qa` | Run against QA environment |
| `npm run test:dev` | Run against Dev environment |

## Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `ENV` | qa, dev, stage, uat, prod | Target environment |
| `BROWSER` | chromium, firefox, webkit | Browser to use |
| `HEADLESS` | true, false | Run without browser UI |
| `PARALLEL` | 0, 2, 4... | Number of parallel workers for scenario-level parallelism (0 = sequential) |
| `WORKERS` | 1, 2, 4... | Number of workers for feature-level parallelism (default: min(CPU cores, 2)) |
| `RETRY` | 0, 1, 2... | Number of retry attempts for failed scenarios (0 = no retries) |
| `VALIDATE_SESSION` | true, false | Validate session before each scenario (default: true) |

### Setting Environment Variables

**Git Bash / Linux / Mac:**
```bash
ENV=dev npm test
HEADLESS=true npm test
BROWSER=firefox ENV=stage npm test
RETRY=2 npm test
```

**Windows CMD:**
```cmd
set ENV=dev && npm test
set HEADLESS=true && npm test
set BROWSER=firefox && set ENV=stage && npm test
set RETRY=2 && npm test
```

**PowerShell:**
```powershell
$env:ENV="dev"; npm test
$env:HEADLESS="true"; npm test
$env:BROWSER="firefox"; $env:ENV="stage"; npm test
$env:RETRY="2"; npm test
```

## Reports

## Parallel Execution Modes

Two parallel execution strategies are available:

### Scenario-Level Parallelism (`test:parallel`)
- Runs individual scenarios in parallel across workers
- Best for independent scenarios that don't share state
- Use `PARALLEL` env var to control worker count

### Feature-Level Parallelism (`test:parallel:features`)
- Runs feature files in parallel, but scenarios within each file run sequentially
- Best for features with dependent scenarios (e.g., create → verify → delete flows)
- Use `WORKERS` env var to control worker count (default: min of CPU cores or 2)

```bash
# Scenario-level: 4 parallel workers
PARALLEL=4 npm run test:parallel

# Feature-level: 3 parallel workers
WORKERS=3 npm run test:parallel:features

# Feature-level with report
npm run test:parallel:features:report
```

## Reports

| Command | Description |
|---------|-------------|
| `npm run allure:report` | Archive previous, generate, and open Allure report |
| `npm run allure:archive` | Archive current report to history folder |
| `npm run report:html` | Generate standalone HTML report |
| `npm run report:open` | Generate and open HTML report |
| `npm run trace:show` | View Playwright trace file |

### Report Archiving

Reports are automatically archived before generating new ones. This preserves historical test results for comparison.

- Archives stored in: `reports/{env}/allure-report-history/`
- Archive naming: `report-YYYY-MM-DDTHH-MM-SS`
- Retention: 7 days (older archives auto-deleted)

### Test Run Artifacts

Screenshots, traces, and videos are organized by test run timestamp.

- Artifacts stored in: `reports/{env}/runs/{timestamp}/`
- Timestamp format: `YYYY-MM-DD_HH-MM-SS`
- Retention: 14 days (older run directories auto-deleted)
- Contains: `screenshots/`, `traces/`, `videos/`

## Configuration

| Command | Description |
|---------|-------------|
| `npx ts-node src/scripts/show-config.ts` | Show current config values |
| `npm run env:list` | List available environments |

## Database

| Command | Description |
|---------|-------------|
| `npm run db:test` | Test database connection (existing tunnel) |
| `npm run db:test:full` | Test with auto SSO + tunnel |

## Cleanup

| Command | Description |
|---------|-------------|
| `npm run cleanup` | Clean old report artifacts |
| `del reports\.auth\state-chromium.json` | Clear saved auth (Windows CMD) |

## Code Generation

| Command | Description |
|---------|-------------|
| `npm run codegen` | Open Playwright codegen to record browser actions |
| `npm run codegen -- https://qa-app.facctum.com` | Open codegen with specific URL |

Playwright codegen opens an interactive browser where you can click around and it generates the corresponding Playwright code. Useful for quickly creating selectors and action sequences.

## Environment Variables (inline override)

```bash
# Git Bash / Linux / Mac
ENV=dev npm test
HEADLESS=true npm test
BROWSER=firefox npm test

# Windows CMD
set ENV=dev && npm test

# PowerShell
$env:ENV="dev"; npm test
```

## Common Combinations

```bash
# CI/CD: Headless, sequential, with Allure report
HEADLESS=true npm test

# CI/CD: Headless, sequential, no report (faster)
HEADLESS=true npm run test:ci

# CI/CD: Headless, scenario-level parallel, with report
HEADLESS=true npm run test:parallel && npm run allure:generate

# CI/CD: Headless, feature-level parallel (keeps scenarios sequential within features)
HEADLESS=true npm run test:parallel:features:report

# Feature-level parallel with custom worker count
WORKERS=4 npm run test:parallel:features

# CI/CD: Headless with retries for flaky tests
HEADLESS=true RETRY=1 npm test

# Run login tests on Firefox against Dev, headless
BROWSER=firefox ENV=dev HEADLESS=true npm run test:file login

# Run against stage environment with webkit
ENV=stage BROWSER=webkit npm test
```
