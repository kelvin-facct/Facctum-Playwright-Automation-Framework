# Project Structure

```
src/
├── config/           # Configuration files
│   ├── cucumber.js   # Cucumber runner config
│   ├── env.ts        # Environment config loader (EnvConfig)
│   ├── environments.json  # Environment configurations (qa, dev, stage, etc.)
│   └── .env.secrets  # Local credentials (gitignored)
│
├── features/         # Gherkin feature files (.feature)
│
├── stepDefinitions/  # Step definition files (*.steps.ts)
│
├── pages/            # Page Object Model classes
│   ├── PageManager.ts        # Factory for lazy-loading page objects
│   ├── LoginPage.ts          # Login flow page object
│   ├── FacctumDashboardPage.ts  # Dashboard/Home page object
│   ├── PreScreeningRulePage.ts  # Pre-screening rules page object
│   ├── ListManagementPage.ts    # List management page object
│   └── TasksPage.ts          # Tasks page for record approval workflows
│                             # Methods: claimRecord, acceptRecord(comment?), rejectRecord(comment?), 
│                             #          unclaimRecord, claimAndAcceptRecord
│                             # Pagination: clickDoubleArrowRight, clickDoubleArrowLeft, selectLastRecordCheckbox
│                             # Filters: clickUnclaimedFilter, clickClaimedFilter
│                             # Note: acceptRecord/rejectRecord handle the comment dialog automatically
│
├── helpers/          # Reusable utilities
│   ├── authHelper.ts         # Reusable authentication functions
│   ├── browserManager.ts     # Browser launch/config
│   ├── contextFactory.ts     # Context creation with auth
│   ├── database.ts           # PostgreSQL database helper (IAM + password auth)
│   ├── dbQuery.ts            # Database queries with auto SSM tunnel management
│   ├── excelReader.ts        # Excel file reader for data-driven testing
│   ├── playwrightActions.ts  # Wrapper for common Playwright operations
│   ├── scenarioContext.ts    # Cross-step data sharing
│   └── testDataStore.ts      # Persist data across scenarios via JSON file
│
├── resources/        # Test resources
│   └── testData/     # Excel files and other test data for DDT
│
├── hooks/            # Cucumber hooks (Before/After)
│   └── hooks.ts      # Setup, teardown, screenshots, tracing
│
├── world/            # Cucumber World
│   └── customWorld.ts  # Shared scenario state
│
├── utils/            # General utilities
│   └── logger.ts     # Winston logger
│
└── scripts/          # Helper scripts
    ├── generate-report.js       # Standalone HTML report generator
    ├── generate-report-index.js # Generate report history index page
    ├── show-trace.js            # Open Playwright trace viewer
    ├── archive-report.js        # Archive reports with timestamps
    ├── cleanup-reports.js       # Clean old test artifacts
    ├── run-test.js              # Run specific feature files
    ├── list-envs.ts             # List available environments
    ├── show-config.ts           # Display current configuration
    └── test-dbQuery.ts          # Test database connectivity

reports/              # Test artifacts (gitignored)
├── {env}/            # Environment-specific reports (qa, dev, stage, etc.)
│   ├── allure-results/   # Raw Allure data
│   ├── allure-report/    # Generated HTML report
│   ├── allure-report-history/  # Archived reports (7-day retention)
│   ├── runs/             # Timestamped test run artifacts (14-day retention)
│   │   └── {timestamp}/  # e.g., 2026-03-18_10-30-00/
│   │       ├── screenshots/
│   │       ├── traces/
│   │       └── videos/
│   ├── .auth/            # Saved auth state per browser
│   └── cucumber-report.json
```

## Key Patterns

### Page Object Model
- Each page has a dedicated class in `src/pages/`
- Use `PlaywrightActions` wrapper for common operations
- Access pages via `PageManager` (lazy-loaded, cached)

### Cucumber World
- `CustomWorld` holds browser, context, page, and pageManager
- `ScenarioContext` for sharing data between steps
- Hooks handle setup/teardown in `src/hooks/hooks.ts`

### Authentication
The login flow is a multi-step process:
1. Landing page → Click "LOG IN" button
2. Enter Organisation ID → Click "CONTINUE"
3. Enter Email/Password → Click "Continue"
4. Wait for dashboard to load

Authentication behavior:
- One-time login saves auth state to `reports/{env}/.auth/`
- Scenarios within the same test run reuse saved session
- Auth state is browser and org-specific (e.g., `state-chromium.json` for default org, `state-chromium-facctum.json` for `@org:facctum`)
- Auth state is automatically cleared after each test run completes (ensures fresh login on next run)
- Session validation before each scenario is configurable via `VALIDATE_SESSION` (default: true)

#### Organization Override with @org Tag
Use `@org:xxx` tag on scenarios to override the default organization:
- Tag takes priority over `APP_ORG_ID` in `.env.secrets`
- Each org gets its own auth state file (allows parallel testing across orgs)
- Login happens automatically if auth state doesn't exist for that org

```gherkin
@CommercialList @org:facctum
Scenario: Test with facctum org
  When user clicks on list management
  Then user should see the dashboard
```

Required credentials in `.env.secrets`:
- `APP_ORG_ID` - Organisation ID
- `APP_USERNAME` - Email address
- `APP_PASSWORD` - Password

Approver credentials (for approval workflows):
- `APPROVER_USERNAME` - Approver email address
- `APPROVER_PASSWORD` - Approver password
- `APPROVER_ORG_ID` - Approver organization (optional, see resolution below)
- Access via `EnvConfig.APPROVER_USERNAME`, `EnvConfig.APPROVER_PASSWORD`, and `EnvConfig.APPROVER_ORG_ID`

Approver organization resolution order:
1. `APPROVER_ORG_ID` in `.env.secrets` (explicit override, highest priority)
2. `@org:xxx` tag from the scenario (inherits maker's org)
3. Default fallback: `equalsmoney`

This means by default, the approver uses the same organization as the maker (from `@org` tag). Only set `QA_APPROVER_ORG_ID` when the approver needs a different organization than the maker.

#### Generic Login Steps
Use the generic login step to switch between user roles in scenarios:

```gherkin
# Login as maker (uses APP_* credentials)
When user logs in as "maker"

# Login as approver (uses APPROVER_* credentials)
When user logs in as "approver"

# Verify current user
Then the current user should be "approver"
```

Supported roles:
- `maker` - Uses `APP_ORG_ID`, `APP_USERNAME`, `APP_PASSWORD`
- `approver` - Uses `APPROVER_ORG_ID`, `APPROVER_USERNAME`, `APPROVER_PASSWORD`

The step automatically:
- Performs login with role-specific credentials
- Updates `currentUser` in scenario context
- Saves auth state for session reuse
- Verifies dashboard loaded successfully

Environment-specific credentials (optional):
- Use `{ENV}_*` prefix to override per environment (e.g., `DEV_APP_USERNAME`, `STAGE_APP_PASSWORD`, `QA_APPROVER_USERNAME`)
- For hyphenated environments, use underscores in the prefix (e.g., `stage-uk` → `STAGE_UK_APP_USERNAME`)
- These take precedence over base values when running against that environment
- QA credentials (`QA_*`) serve as fallback when environment-specific credentials aren't defined
- Supported for app credentials (`APP_*`), approver credentials (`APPROVER_*`), and database credentials (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)

### AuthHelper (authHelper.ts)
Reusable authentication functions for login operations.

```typescript
import { AuthHelper } from "../helpers/authHelper";

// Login with credentials on a page
await AuthHelper.login(page, {
  email: "user@example.com",
  password: "password123",
  orgId: "my-org"  // optional, defaults to EnvConfig.ORG_ID
});

// Login and save auth state (for Before hooks)
await AuthHelper.loginAndSaveState("reports/qa/.auth/state.json");

// Switch user mid-scenario within same org (clears session first)
await AuthHelper.switchUser(context, page, {
  email: "other@example.com",
  password: "password456"
});

// Switch to a different organization (full login flow)
await AuthHelper.switchOrganization(context, page, {
  orgId: "other-org",
  email: "user@other-org.com",
  password: "password789"
});

// Validate session and re-authenticate if expired (used in Before hook)
const wasRefreshed = await AuthHelper.ensureValidSession(page, context, authStatePath);

// Validate session with custom credentials (e.g., for approver sessions)
const wasRefreshed = await AuthHelper.ensureValidSession(page, context, authStatePath, {
  email: EnvConfig.APPROVER_USERNAME,
  password: EnvConfig.APPROVER_PASSWORD,
  orgId: EnvConfig.APPROVER_ORG_ID
});
```

Key methods:
- `login(page, credentials)` - Performs login with email/password
- `loginAndSaveState(authStatePath, credentials?)` - Logs in and saves auth state for session reuse
- `switchUser(context, page, credentials)` - Clears session and logs in as different user (same org)
- `switchOrganization(context, page, credentials)` - Clears all session data and performs full login with new org (orgId required)
- `validateSession(page)` - Checks if current session is still active
- `ensureValidSession(page, context, authStatePath, credentials?)` - Validates session and re-authenticates if expired (optional credentials for custom users)

### Database Access
- `DatabaseHelper` class in `src/helpers/database.ts`
- Supports AWS RDS with IAM authentication or standard password auth
- Create instances directly: `new DatabaseHelper()`
- Configure via `DB_*` environment variables

```typescript
import { DatabaseHelper } from "../helpers/database";

const db = new DatabaseHelper();

// Manual connection management
await db.connect();
const result1 = await db.query('SELECT * FROM table1');
const result2 = await db.query('SELECT * FROM table2');
await db.disconnect();
```

Key methods:
- `connect()` / `disconnect()` - Manual connection management
- `query(sql, params?)` - Execute query (requires manual connect/disconnect)
- `isConnected()` - Check if connection is active

### TestDataStore (testDataStore.ts)
Persists data across scenarios using a JSON file. Thread-safe for parallel execution using file locking. Useful for sharing data between scenarios.

```typescript
import { TestDataStore } from "../helpers/testDataStore";

// Store data (async, thread-safe)
await TestDataStore.set("createdCaseId", "CAS123456");

// Store data (sync, use when async isn't possible)
TestDataStore.setSync("createdCaseId", "CAS123456");

// Retrieve data (in a later scenario)
const caseId = TestDataStore.get<string>("createdCaseId");

// Check if key exists
if (TestDataStore.has("createdCaseId")) { ... }

// Remove a specific key
await TestDataStore.remove("createdCaseId");

// Clear all stored data (typically in AfterAll hook)
TestDataStore.clear();
```

Key methods:
- `set(key, value)` - Store any value (async, thread-safe with file locking)
- `setSync(key, value)` - Store any value (sync, use when async isn't possible)
- `get<T>(key)` - Retrieve value by key (returns undefined if not found)
- `has(key)` - Check if a key exists
- `remove(key)` - Remove a specific key (async, thread-safe)
- `clear()` - Delete all stored data and lock file

Data is stored in `reports/test-data.json` and should be cleared in the AfterAll hook to ensure clean state between test runs. Use namespaced keys to avoid conflicts in parallel execution: `"feature.keyName"`.

### Excel Reader (excelReader.ts)
Utility for reading test data from Excel files (.xlsx, .xls) for data-driven testing.

```typescript
import { ExcelReader, readExcelSheet } from "../helpers/excelReader";

// Create reader instance
const reader = new ExcelReader("src/resources/testData/TestData.xlsx");

// Get sheet data as array of objects (first row as headers)
const testData = reader.getSheetData<{ Name: string; Email: string }>("Sheet1");

// Get specific cell value by row/column index (0-based)
const value = reader.getCellValue("Sheet1", 0, 0);

// Get cell by reference (e.g., "A1", "B2")
const cell = reader.getCellByRef("Sheet1", "A1");

// Get entire row as array
const row = reader.getRow("Sheet1", 0);

// Get row as object using header row
const rowData = reader.getRowAsObject("Sheet1", 0); // { Header1: "value1", Header2: "value2" }

// Find row by column value (case-insensitive)
const rowIndex = reader.findRowByValue("Sheet1", 0, "searchValue");

// Get sheet metadata
const sheetNames = reader.getSheetNames();
const rowCount = reader.getRowCount("Sheet1");
const colCount = reader.getColumnCount("Sheet1");

// Static helpers for quick reads
const data = readExcelSheet("path/to/file.xlsx", "Sheet1");
```

Key methods:
- `getSheetData<T>(sheetName)` - Get all rows as objects (first row = headers)
- `getCellValue(sheet, row, col)` - Get cell by 0-based indices
- `getCellByRef(sheet, ref)` - Get cell by reference (e.g., "A1")
- `getRow(sheet, rowIndex)` - Get entire row as array
- `getRowAsObject(sheet, rowIndex)` - Get row as object with header keys
- `findRowByValue(sheet, colIndex, value)` - Find row index by value
- `getSheetNames()` - List all sheet names
- `getRowCount(sheet)` / `getColumnCount(sheet)` - Get dimensions

### Database Queries with Auto-Tunnel (dbQuery.ts)
For local development requiring SSM tunnel access to RDS:

```typescript
import { executeQuery, queryWithExistingTunnel } from "../helpers/dbQuery";

// Auto-manages SSO login and SSM tunnel
const cases = await executeQuery("SELECT * FROM cases LIMIT 10");

// Parameterized query
const user = await executeQuery(
  "SELECT * FROM users WHERE username = $1",
  ["john.doe"]
);

// Use when tunnel is already running (e.g., via db-tunnel.bat)
const result = await queryWithExistingTunnel("SELECT NOW()");
```

Key functions:
- `executeQuery(sql, params?, options?)` - Full auto-tunnel management
- `executeQueryOne(sql, params?, options?)` - Returns first row or null
- `queryWithExistingTunnel(sql, params?)` - Uses existing tunnel
- `queryOneWithExistingTunnel(sql, params?)` - Single row with existing tunnel

#### Testing Database Queries
Use the test script to verify database connectivity:

```bash
# With existing tunnel (run db-tunnel.bat first)
npx ts-node src/scripts/test-dbQuery.ts

# Full flow with auto SSO login and tunnel management
npx ts-node src/scripts/test-dbQuery.ts --full
```


### Excel Reader (excelReader.ts)
Read test data from Excel files for data-driven testing.

```typescript
import { ExcelReader, readExcelCell, readExcelSheet } from "../helpers/excelReader";

// Method 1: Instance-based (recommended for multiple reads from same file)
const excel = new ExcelReader("src/resources/testData/TestData.xlsx");

// Get single cell value (0-based indices)
const ruleName = excel.getCellValue("Shield", 1, 4);  // row 1, column 4

// Get cell by reference
const value = excel.getCellByRef("Shield", "A2");

// Get entire row as array
const rowData = excel.getRow("Shield", 1);

// Get row as object (using header row)
const data = excel.getRowAsObject("Shield", 0);  // { RuleName: "...", OrderId: "..." }

// Get all sheet data as array of objects
const allData = excel.getSheetData<{ RuleName: string; OrderId: string }>("Shield");

// Find row by value
const rowIndex = excel.findRowByValue("Shield", 0, "MyRule");

// Method 2: Static helpers (quick one-off reads)
const cell = readExcelCell("src/resources/testData/TestData.xlsx", "Sheet1", 1, 0);
const sheetData = readExcelSheet("src/resources/testData/TestData.xlsx", "Sheet1");
```

Key methods:
- `getCellValue(sheet, row, col)` - Get cell by 0-based indices
- `getCellByRef(sheet, ref)` - Get cell by reference (e.g., "A1")
- `getRow(sheet, rowIndex)` - Get entire row as array
- `getColumn(sheet, colIndex)` - Get entire column as array
- `getRowAsObject(sheet, rowIndex)` - Get row as object with header keys
- `getSheetData<T>(sheet)` - Get all data as typed array of objects
- `findRowByValue(sheet, col, value)` - Find row index by column value
- `getSheetNames()` - List all sheet names
- `getRowCount(sheet)` / `getColumnCount(sheet)` - Get dimensions

Test data files location: `src/resources/testData/`
