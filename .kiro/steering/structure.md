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
│   └── FacctumDashboardPage.ts  # Dashboard page object
│
├── helpers/          # Reusable utilities
│   ├── authHelper.ts         # Reusable authentication functions
│   ├── browserManager.ts     # Browser launch/config
│   ├── contextFactory.ts     # Context creation with auth
│   ├── database.ts           # PostgreSQL database helper (IAM + password auth)
│   ├── dbQuery.ts            # Database queries with auto SSM tunnel management
│   ├── playwrightActions.ts  # Wrapper for common Playwright operations
│   ├── scenarioContext.ts    # Cross-step data sharing
│   └── testDataStore.ts      # Persist data across scenarios via JSON file
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
- Auth state is browser-specific (e.g., `state-chromium.json`)
- Auth state is automatically cleared after each test run completes (ensures fresh login on next run)
- Session validation before each scenario is configurable via `VALIDATE_SESSION` (default: true)

Required credentials in `.env.secrets`:
- `APP_ORG_ID` - Organisation ID
- `APP_USERNAME` - Email address
- `APP_PASSWORD` - Password

Environment-specific credentials (optional):
- Use `{ENV}_*` prefix to override per environment (e.g., `DEV_APP_USERNAME`, `STAGE_APP_PASSWORD`)
- For hyphenated environments, use underscores in the prefix (e.g., `stage-uk` → `STAGE_UK_APP_USERNAME`)
- These take precedence over base values when running against that environment
- QA credentials (`QA_*`) serve as fallback when environment-specific credentials aren't defined
- Supported for both app credentials (`APP_*`) and database credentials (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)

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

// Login and save auth state (for BeforeAll hooks)
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
```

Key methods:
- `login(page, credentials)` - Performs login with email/password
- `loginAndSaveState(authStatePath, credentials?)` - Logs in and saves auth state for session reuse
- `switchUser(context, page, credentials)` - Clears session and logs in as different user (same org)
- `switchOrganization(context, page, credentials)` - Clears all session data and performs full login with new org (orgId required)
- `validateSession(page)` - Checks if current session is still active
- `ensureValidSession(page, context, authStatePath)` - Validates session and re-authenticates if expired

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
