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
│   ├── ListManagementPage.ts    # List management page object for Internal List operations
│   │                         # Flow: Watchlist → Internal List → Search/Select list → Add Records
│   │                         # Key methods: clickWatchlistDropdown, clickInternalList, searchAndSelectList,
│   │                         #              clickAddRecord, selectBulkUploadOption, uploadFile,
│   │                         #              enterBulkComments, clickSubmitForApproval, performBulkUpload
│   │                         # searchAndSelectList: Searches by list name, uses multiple fallback selectors
│   │                         #                      to find and click the list (aria-label, link-cell, td, tr)
│   │                         # performBulkUpload: Convenience method combining bulk upload steps
│   │                         # Access via: pageManager.getListManagementPage()
│   ├── TasksPage.ts          # Tasks page for record approval workflows
│   │                         # Methods: claimRecord, acceptRecord(comment?), rejectRecord(comment?), 
│   │                         #          unclaimRecord, claimAndAcceptRecord
│   │                         # Pagination: clickDoubleArrowRight, clickDoubleArrowLeft, selectLastRecordCheckbox
│   │                         # Filters: clickUnclaimedFilter, clickClaimedFilter
│   │                         # Note: acceptRecord/rejectRecord handle the comment dialog automatically
│   ├── IBLDedupPage.ts       # IBL (Internal Block List) Deduplication page object
│   │                         # Flow: Navigate to Internal List → Search list → Add single record → 
│   │                         #       Enter name → Verify duplicates → View duplicate records
│   │                         # Key methods: navigateToInternalList, searchAndOpenList, openSingleRecordForm,
│   │                         #              enterName, clickVerifyDuplicate, verifyDuplicatesPageIsOpen,
│   │                         #              clickEachRecordIdAndVerify, performDedupVerification,
│   │                         #              clickCloseOnDuplicatesModal, clickModifyAttributes,
│   │                         #              clickRecordId (alias), clickRecordIdAndGetNewTab (opens record in new tab, returns Page)
│   │                         # Constants: LIST_NAME ("Facctum IBL"), NAME (test entity name)
│   │                         # Access via: pageManager.getIBLDedupPage()
│   ├── IBLCreateSingleRecordPage.ts  # IBL Single Record Creation page object (migrated from Java)
│   │                         # Flow: Watchlist → Internal List → Search list → Add Records → Single record →
│   │                         #       Select record type → Fill mandatory fields → Submit for approval
│   │                         # Record types: Individual, Entity, Bank, Vessel
│   │                         # NOTE: Default list "Facctview IBL" only supports Individual type.
│   │                         #       Entity/Bank/Vessel require a list configured for those types.
│   │                         # Sections: Names, ID Numbers, Address, Gender, Dates, Additional Details
│   │                         # Key methods: navigateToInternalList, searchAndOpenList, openSingleRecordForm,
│   │                         #              selectRecordType, enterFirstName, enterLastName, enterIdValue,
│   │                         #              selectIdType, enterAddressLine1, selectAddressCountry, selectGender,
│   │                         #              enterDateOfBirth, clickSubmitForApproval, enterSubmitComment, clickFinalSubmit,
│   │                         #              fillMandatoryFieldsForIndividual, fillMandatoryFieldsForEntity,
│   │                         #              fillMandatoryFieldsForVessel, createAndSubmitRecord,
│   │                         #              clickPendingTab, withdrawLastRecord (smart: finds first withdrawable record),
│   │                         #              withdrawRecordById, clickKebabMenuForRow(index)
│   │                         # Customer Type: selectCustomerType(customerType)
│   │                         # Alias/Names: clickAddAlias, enterFullName (for Entity/Bank)
│   │                         # World Check & Locations: enterWorldCheckId, enterLocation, clickAddLocation,
│   │                         #              clickRemoveLocation, enterLocationByIndex, fillWorldCheckAndLocations
│   │                         # Country dropdowns (multi-select): selectCountryOfIncorporation, selectOtherAffiliatedCountries
│   │                         # Additional Details tab: clickAdditionalDetails, selectBusinessUnit, selectSubBusinessUnit,
│   │                         #              enterBusinessUnitContact, selectExpiryDate, enterComments, enterReason,
│   │                         #              enterFurtherComments, enterReferenceInformation, fillAdditionalDetailsTab
│   │                         # ID Number section: selectRelatedIdAndEnterValue, fillIdNumberSection
│   │                         # Footer buttons: clickCancel, clickVerifyDuplicate, clickSaveAsDraft, clickSubmitForApproval
│   │                         # Constants: DEFAULT_LIST_NAME ("Facctview IBL"), TEST_DATA_PATH, SHEET_NAME
│   │                         # Static: loadTestDataFromExcel() - loads test data from Excel file
│   │                         # Access via: pageManager.getIBLCreateSingleRecordPage()
│   ├── CommercialListPage.ts  # Commercial List page object for WC Main Premium
│   │                         # Flow: Dashboard → List Management → Watchlist → Commercial list → WC Main Premium
│   │                         # Key methods: navigateToCommercialList, openWCMainPremium, findCleanRecord,
│   │                         #              openRecordById, searchAndOpenRecord, closeProfileView, getCurrentUrl
│   │                         # findCleanRecord: Iterates through records to find one without pending approval
│   │                         #                  (checks for suppress button visibility in profile view)
│   │                         # Pagination: Handles multi-page navigation with tabindex check
│   │                         # Access via: pageManager.getCommercialListPage()
│   ├── ProfileViewPage.ts    # Record Profile View page object for Suppress/Enrich operations
│   │                         # Operations: Suppress/Enrich Record (SER), Suppress Attribute (SA),
│   │                         #             Enrich Attribute (EA), Edit Profile View (EPV)
│   │                         # Key methods: clickSuppressEnrich, fillSuppressEnrichForm, clickSubmit,
│   │                         #              suppressAttribute, fillSuppressAttributeForm,
│   │                         #              clickEnrichOnSection, fillEnrichAliasForm, fillEnrichIdForm,
│   │                         #              fillEnrichDobForm, clickEdit, verifyAuditTrail,
│   │                         #              hasVersionConflictError, hasActionSucceeded, closeProfileView
│   │                         # Form fields: tags (multi-select), reason, reviewPeriod, comment, attachment
│   │                         # Validation: isProfileViewOpen, hasPendingApprovalWarning, isSubmitEnabled
│   │                         # Access via: pageManager.getProfileViewPage()
│   ├── UKSANCTIONSadvfilterPage.ts  # UK Sanctions advanced filter page object
│   │                         # Flow: Watchlist → Regulatory List → UK SANCTIONS → Filter/Download records
│   │                         # Tabs: Records, Downloads, Active, Error, Deleted
│   │                         # Delta view tabs: New, Amended, Deleted, Stable, Error
│   │                         # Filter categories: Designated Date, Id Type, Program Source, Regime Name, Type
│   │                         # Download formats: Excel (.xlsx), Tab separated (.tsv)
│   │                         # Key methods: applyUKSanctionsFilter (main orchestration across all tabs),
│   │                         #              applyFiltersForTab (apply individual filters for a specific tab),
│   │                         #              checkDownloadStatus (verify download completion and download file)
│   │                         # Key locators: filterButton, filterPanel, applyButton, downloadButton
│   │                         # Access via: pageManager.getUKSanctionsAdvFilterPage()
│   └── OFACadvfilterPage.ts  # OFAC advanced filter page object
│                             # Flow: Watchlist → Regulatory List → OFAC → Filter/Download records
│                             # Tabs: Records, Downloads, Active, Error, Deleted
│                             # Delta view tabs: New, Amended, Deleted, Stable, Error
│                             # Filter categories: Address country, Citizenship country, Nationality country,
│                             #                    Program name, Type, Last Updated Date (date range)
│                             # Download formats: Excel (.xlsx), Tab separated (.tsv)
│                             # Key methods: applyOFACFilter (main orchestration across all tabs),
│                             #              applyFiltersForTab, applyAllFiltersCombined, checkDownloadStatus
│                             # Key locators: filterButton, filterPanel, applyButton, downloadButton
│                             # Test data: address=Cuba, citizenship=Egypt, nationality=Egypt, program=CAR, type=Individual
│                             # Access via: pageManager.getOFACAdvFilterPage()
│
├── helpers/          # Reusable utilities
│   ├── authHelper.ts         # Reusable authentication functions
│   ├── browserManager.ts     # Browser launch/config
│   ├── contextFactory.ts     # Context creation with auth
│   ├── database.ts           # PostgreSQL database helper (IAM + password auth)
│   ├── dbQuery.ts            # Database queries with auto SSM tunnel management
│   ├── excelReader.ts        # Excel file reader for data-driven testing
│   ├── mongoHelper.ts        # MongoDB helper for UI data validation against MongoDB
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
    ├── test-dbQuery.ts          # Test database connectivity
    └── test-mongo.ts            # Test MongoDB connectivity

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

### MongoDB Access (mongoHelper.ts)
MongoDB helper for validating UI data against MongoDB database. Equivalent to Java's MongoDBUtil class.

```typescript
import { MongoDBHelper, UKSanctionsMongoQueries, OFACMongoQueries, getMongoHelper, closeMongoHelper } from "../helpers/mongoHelper";

// Method 1: Instance-based (recommended for multiple queries)
const mongo = new MongoDBHelper({
  host: "localhost",
  port: "27023",
  database: "screenDB",
  username: "user",      // optional
  password: "pass",      // optional
  authEnabled: true,     // optional, auto-detected if username provided
  tlsEnabled: false      // optional
});

await mongo.connect();

// Find all documents in a collection
const allDocs = await mongo.findAll("collectionName");

// Find documents with filter
const filtered = await mongo.findDocuments("collectionName", { status: "active" });

// Find with specific fields only
const partial = await mongo.findDocuments("collectionName", { status: "active" }, ["name", "email"]);

// Get document count
const count = await mongo.getCount("collectionName", { status: "active" });

// Fetch single field value
const value = await mongo.fetchSingleValue("collectionName", { _id: "123" }, "fieldName");

// Fetch column values from all matching documents
const values = await mongo.fetchColumn("collectionName", { status: "active" }, "fieldName");

// Get raw MongoDB documents (for complex operations)
const rawDoc = await mongo.findRawDocument("collectionName", { _id: "123" });
const rawDocs = await mongo.findRawDocuments("collectionName", { status: "active" });

await mongo.disconnect();

// Method 2: Singleton helper (for quick access)
const mongoHelper = await getMongoHelper();
const docs = await mongoHelper.findAll("collectionName");
await closeMongoHelper();

// Method 3: UK Sanctions specific queries
const mongo = new MongoDBHelper();
await mongo.connect();
const ukSanctions = new UKSanctionsMongoQueries(mongo);

// Get Active records with ID Type count
const activeCount = await ukSanctions.getActiveRecordsWithIdTypeCount();

// Get records by status
const errorCount = await ukSanctions.getRecordsByStatusCount(3000);

// Get filtered records with multiple criteria
const filteredCount = await ukSanctions.getFilteredRecords({
  statusId: 2000,
  hasIdType: true,
  hasProgramSource: true,
  entityType: "Individual"
});

// Validate UI count against MongoDB
const validation = await ukSanctions.validateUICount(uiCount, 2000);
// Returns: { passed: boolean, uiCount: number, dbCount: number, message: string }

await mongo.disconnect();

// Method 4: OFAC specific queries
const mongo = new MongoDBHelper();
await mongo.connect();
const ofac = new OFACMongoQueries(mongo);

// Get Active records with Address Country count
const activeCount = await ofac.getActiveRecordsWithAddressCount("OFAC Enhanced");

// Get records by status
const errorCount = await ofac.getRecordsByStatusCount(3000, "OFAC Enhanced");

// Get filtered records with multiple criteria
const filteredCount = await ofac.getFilteredRecords({
  listName: "OFAC Enhanced",
  statusId: 2000,
  hasAddressCountry: true,
  hasCitizenshipCountry: true,
  hasNationalityCountry: true,
  hasProgramName: true,
  entityType: "Individual"
});

// Validate UI count against MongoDB for OFAC
const validation = await ofac.validateUICount(uiCount, "OFAC Enhanced", 2000);
// Returns: { passed: boolean, uiCount: number, dbCount: number, message: string }

// Validate UI count with specific filter type
const filterValidation = await ofac.validateUICountWithFilter(uiCount, "address", "OFAC Enhanced");
// filterType options: "address" | "citizenship" | "nationality" | "program" | "type"

await mongo.disconnect();
```

Key classes:
- `MongoDBHelper` - Main MongoDB connection and query helper
- `UKSanctionsMongoQueries` - UK SANCTIONS specific query methods
- `OFACMongoQueries` - OFAC specific query methods
- `getMongoHelper()` / `closeMongoHelper()` - Singleton helper functions

Key methods (MongoDBHelper):
- `connect()` / `disconnect()` - Connection management
- `isConnected()` - Check connection status
- `findAll(collection)` - Get all documents as Map arrays
- `findDocuments(collection, filter?, fields?)` - Query with optional filter and projection
- `getCount(collection, filter?)` - Count documents
- `fetchSingleValue(collection, filter, field)` - Get single field from first match
- `fetchColumn(collection, filter, field)` - Get field values from all matches
- `findRawDocument(collection, filter?)` - Get raw MongoDB document
- `findRawDocuments(collection, filter?)` - Get raw MongoDB documents array

Environment variables:
- `MONGO_HOST` - MongoDB hostname (default: localhost)
- `MONGO_PORT` - MongoDB port (default: 27023)
- `MONGO_DATABASE` - Database name (default: screenDB)
- `MONGO_USERNAME` - Username (optional)
- `MONGO_PASSWORD` - Password (optional)
- `MONGO_TLS_ENABLED` - Enable TLS (default: false)

SSH Tunnel Support:
- The helper automatically adds `directConnection=true` to the connection URI
- This ensures reliable connections when using SSH tunnels (e.g., AWS Session Manager port forwarding)
- No additional configuration needed - just point `MONGO_HOST` to `localhost` and `MONGO_PORT` to your tunnel port

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

### IBL Dedup Steps (iblDedup.steps.ts)
Steps for testing the IBL (Internal Block List) deduplication workflow.

```gherkin
# Navigation steps
When user clicks on Watchlist dropdown
When user clicks on Internal list option
When user navigates to Internal List

# List search and selection
When user searches for list "Facctum IBL"
When user clicks on list "Facctum IBL"
When user searches and opens list "Facctum IBL"
When user searches and opens the default IBL list

# Add record form
When user clicks on Add Records button
When user selects Single record option
When user opens the single record form
When user enters name "Test Entity" in the input box
When user enters the default name in the input box

# Duplicate verification
When user clicks on VERIFY DUPLICATE button
Then the Select Attributes page should be open
When user clicks SUBMIT on the Select Attributes modal
When user clicks CANCEL on the Select Attributes modal
Then the Verify Duplicates page should be open
Then there should be at least 1 matching record(s)

# Record details
When user clicks on each record ID and verifies the details
When user clicks on record at index 0
When user closes the record drawer
Then the drawer should show record ID "REC123"
Then the drawer full name should contain "Test Entity"

# Full flow steps (combines multiple steps)
When user performs the complete IBL dedup verification flow
When user performs IBL dedup verification for list "Custom List" with name "Custom Name"
```

Key details:
- Uses `IBLDedupPage` page object for all interactions
- Default list name: "Facctum IBL" (configurable via step parameter)
- Default entity name for testing is defined in `IBLDedupPage.NAME` constant
- Full flow step combines: navigate → search list → add record → enter name → verify duplicates → view records
- Record links open in new tabs - use `clickRecordId(index)` or `clickRecordIdAndGetNewTab(index)` (both return the new `Page` object)
- Store the returned page in scenario context for further interactions on the new tab

### IBL Create Single Record Steps (iblCreateSingleRecord.steps.ts)
Steps for testing the IBL (Internal Block List) single record creation workflow.

```gherkin
# Navigation steps
When user clicks on Watchlist dropdown
When user clicks on Internal list option
When user navigates to Internal List

# List search and selection
When user searches for list "Facctview IBL"
When user clicks on list "Facctview IBL"
When user searches and opens list "Facctview IBL"
When user searches and opens the default IBL list

# Add record form
When user clicks on Add Records button
When user selects Single record option
When user opens the single record form
When User selects record type "Individual"

# Name entry
When User enters first name "John"
When User enters last name "Doe"
When User enters full name "Test Entity Ltd"
When User clicks Add Alias button
When User enters alias first name "Johnny" at index 0
When User enters alias last name "D" at index 0

# ID Number section
When User enters account number "ACC123456"
When User enters customer ID "CUST789"
When User enters government ID "GOV456"
When User selects Related ID and enters value "REL123"
When User clicks on ID Type dropdown for row 4
When User selects Related ID option
When User enters ID value "VALUE123" in row 4
When User fills all ID numbers with Account "ACC1" Customer "CUST1" Government "GOV1" Related "REL1"

# Address section
When User enters address line 1 "123 Main Street"
When User selects address country "United States"

# Gender and dates
When User selects gender "Male"
When User enters date of birth "01/01/1990"

# Customer type and additional fields
When User selects customer type "High Risk"
When User enters World Check ID "WC123"
When User enters location "New York"
When User clicks Add Location button

# Additional Details tab
When User clicks on Additional Details tab
When User selects business unit "Compliance"
When User selects sub business unit "AML"
When User enters business unit contact "contact@example.com"
When User selects expiry date "31/12/2025"
When User enters comments "Test comment"
When User enters reason "Test reason"
When User enters further comments "Additional info"
When User enters reference information "REF123"

# Submit workflow
When User clicks Submit for Approval button
When User enters submit comment "Submitting for review"
When User clicks Final Submit button

# Pending/Withdraw workflow
When User clicks on Pending tab
When User withdraws the last record
When User withdraws record by ID "REC123"

# Full flow steps
When User creates and submits Individual record with first name "John" last name "Doe"
When User fills mandatory fields for Individual record
When User fills mandatory fields for Entity record
When User fills mandatory fields for Vessel record
```

Key details:
- Uses `IBLCreateSingleRecordPage` page object for all interactions
- Default list name: "Facctview IBL" (configurable via step parameter)
- Supports record types: Individual, Entity, Bank, Vessel
- NOTE: Default list "Facctview IBL" only supports Individual type; other types require a list configured for those record types
- ID Number section supports: Account Number, Customer ID, Government ID, Related ID
- Related ID requires selecting from dropdown before entering value
- Row-based ID entry allows filling specific rows (1-based index in steps, converted to 0-based internally)
- Full flow steps combine multiple steps for common workflows
- Withdraw workflow allows removing pending records by ID or selecting the last withdrawable record

### UK Sanctions Advanced Filter Steps (ukSanctionsAdvFilter.steps.ts)
Steps for testing the UK SANCTIONS regulatory list advanced filtering and download functionality.

```gherkin
# Background/Setup steps
Given Facctlist Login 2
When Navigate to Regulatory List 2
When Select List name 2

# Full flow step (applies filters across all tabs)
When Apply Filter in all tabs 2
Then Check the status 2

# Filter panel operations
When user opens the filter panel
When user closes the filter panel
When user applies the filter
When user clears all filters
When user clears applied filters

# Individual filter selections (Select All)
When user selects Id Type filter with Select All
When user selects Program Source filter with Select All
When user selects Regime Name filter with Select All
When user selects Type filter with Select All

# Date filter
When user sets Designated Date filter to "01/01/2020"

# Tab navigation
When user clicks on Active tab
When user clicks on Error tab
When user clicks on Delete tab

# Delta view
When user toggles Delta view
When user clicks on New tab

# Download operations
When user downloads as Tab Separated
When user downloads as Excel

# Assertions
Then the download button should be visible
Then the filter panel should be visible
Then the filter panel should be closed
Then the UI filtered count should be 10
Then the Active tab should be selected
Then the Error tab should be selected
Then the Delete tab should be selected
Then the Delta view should be enabled
Then the New tab should be selected
Then the toaster message should be displayed
```

Key details:
- Uses `UKSANCTIONSadvfilterPage` page object for all interactions
- Flow: Watchlist → Regulatory List → UK SANCTIONS → Apply filters → Download
- Tabs: Records, Downloads, Active, Error, Deleted
- Delta view tabs: New, Amended, Deleted, Stable, Error
- Filter categories: Designated Date, Id Type, Program Source, Regime Name, Type
- Download formats: Excel (.xlsx), Tab separated (.tsv)
- Full flow step (`Apply Filter in all tabs 2`) orchestrates filtering across all tabs with predefined test data
- Individual filter steps allow granular testing of each filter category
- Feature file: `src/features/UKSANCTIONSadvfilter.feature` with scenarios for:
  - Full filter application across all tabs
  - Filter panel open/close functionality
  - Individual filter category testing (Id Type, Designated Date, Program Source, Regime Name, Type)
  - Tab navigation (Active, Error, Delete)
  - Delta view toggle and navigation
  - Download functionality (Excel and Tab Separated formats)

### OFAC Advanced Filter Steps (ofacAdvFilter.steps.ts)
Steps for testing the OFAC regulatory list advanced filtering and download functionality.

```gherkin
# Background/Setup steps (shared across scenarios)
Given Facctlist Login 1
When Navigate to Regulatory List 1
When Select List name 1

# Individual tab filter steps (granular testing)
When Apply Filter in Active tab
When Apply Filter in Error tab
When Apply Filter in Delete tab
When Apply Filter in New tab
When Apply Filter in Amend tab
When Apply Filter in Delta Delete tab
When Apply Filter in Stable tab
When Apply Filter in Delta Error tab
Then the filter operations should complete successfully

# Delta view toggle
When user toggles OFAC Delta view
Then the Delta view should be enabled

# Downloads tab
When user goes to OFAC Downloads tab
Then Check the status 1

# Legacy full flow step (applies filters across all tabs - may timeout)
When Apply Filter in all tabs 1
Then Check the status 1

# Filter panel operations
When user opens the OFAC filter panel
When user closes the OFAC filter panel
When user applies the OFAC filter

# Individual filter selections (Select All)
When user selects Address Country filter with Select All
When user selects Citizenship Country filter with Select All
When user selects Nationality Country filter with Select All
When user selects Program Name filter with Select All
When user selects OFAC Type filter with Select All

# Date range filter
When user sets Last Updated Date filter from "30/08/2024" to "22/12/2025"

# Search and select specific values
When user searches and selects Address Country "Cuba"
When user searches and selects Citizenship Country "Egypt"
When user searches and selects Nationality Country "Egypt"
When user searches and selects Program Name "CAR"
When user searches and selects OFAC Type "Individual"

# Tab navigation
When user clicks on OFAC Active tab
When user clicks on OFAC Error tab
When user clicks on OFAC Delete tab

# Delta view
When user toggles OFAC Delta view
When user clicks on OFAC New tab
When user clicks on OFAC Amend tab
When user clicks on OFAC Delta Delete tab
When user clicks on OFAC Stable tab
When user clicks on OFAC Delta Error tab

# Download operations
When user downloads OFAC as Tab Separated
When user downloads OFAC as Excel

# Assertions
Then the OFAC download button should be visible
Then the OFAC filter panel should be visible
Then the OFAC filter panel should be closed
Then the OFAC toaster message should be displayed
```

Key details:
- Uses `OFACadvfilterPage` page object for all interactions
- Flow: Watchlist → Regulatory List → OFAC → Apply filters → Download
- Tabs: Records, Downloads, Active, Error, Deleted
- Delta view tabs: New, Amended, Deleted, Stable, Error
- Filter categories: Address Country, Citizenship Country, Nationality Country, Program Name, Type, Last Updated Date (date range)
- Download formats: Excel (.xlsx), Tab separated (.tsv)
- Individual tab filter steps (`Apply Filter in Active tab`, `Apply Filter in Error tab`, etc.) for granular testing
- Search and select steps allow filtering by specific values (e.g., "Cuba", "Egypt", "CAR", "Individual")
- Feature file: `src/features/OFACadvfilter.feature` with scenarios (@ApplyingofOFACFilter):
  - Active Tab filter application
  - Error Tab filter application
  - Delete Tab filter application
  - Delta view toggle
  - New Tab (Delta) filter application
  - Amend Tab (Delta) filter application
  - Delta Delete Tab filter application
  - Stable Tab (Delta) filter application
  - Delta Error Tab filter application
  - Download status verification
- Background steps handle login and navigation (shared across all scenarios)
- Legacy step (`Apply Filter in all tabs 1`) still available for backward compatibility
- Migrated from Java Selenium test (OFACadvfilterStep.java)

### Help Guide Steps (helpGuide.steps.ts)
Steps for testing the Help Guide panel and documentation pages.

```gherkin
# Background step - user is logged in
Given user is logged in to the Facctum Platform

# Open the Help Guide panel (click the help icon)
When user opens the Help Guide panel
When user clicks on the help icon in the header

# Verify panel is displayed
Then the Help Guide panel should be displayed

# Verify panel title
And the Help Guide panel title should be "Facctum Platform Guide"

# Verify content contains expected sections (data table)
And the Help Guide content should contain the following sections:
  | section              |
  | Platform             |
  | Login and Access     |
  | Password Requirements|
  | Home                 |
  | Section Map          |

# Verify Section Map contains navigation items (data table)
And the Help Guide Section Map should contain:
  | item          |
  | Groups        |
  | Roles         |
  | Help          |
  | Reports       |
  | Users         |
  | Login         |
  | Profile View  |

# Verify content contains expected text (data table)
And the Help Guide content should contain the following text:
  | text                                                         |
  | Single Sign-On (SSO)                                         |
  | Non-SSO Login                                                |
  | Forgotten Password                                           |
  | At least 8 characters                                        |

# Close the Help Guide panel
When user clicks the CLOSE button on the Help Guide panel
When user closes the Help Guide panel

# Verify panel is closed
Then the Help Guide panel should be closed

# Verify iframe source domain
And the Help Guide iframe should load from "assets.facctum.com"

# Debug step - view Help Guide content
Then user should see the Help Guide content

# Open Help Guide in new tab (via expand icon)
When user clicks on the expand icon to open Help Guide in new tab

# Click sidebar link and verify page content
When user clicks on sidebar link "Groups"
Then the page title should be "Groups - Facctum Platform Guide"
And the page content should contain "Groups enable administrators to bundle roles"

# Section-specific sidebar link verification steps (recommended for better error reporting)
# Each step includes the section name in logs and error messages for easier debugging

# Verify Platform section sidebar links
Then user should verify Platform section sidebar links:
  | linkText      | expectedTitle                      | expectedContent                                           |
  | Groups        | Groups - Facctum Platform Guide    | Groups enable administrators to bundle roles              |
  | Roles         | Roles - Facctum Platform Guide     | Roles module enables administrators to define custom roles|
  | Help          | Help - Facctum Platform Guide      | Help empowers users to quickly seek assistance            |
  | Users         | Users - Facctum Platform Guide     | Users can be added or removed by administrators           |
  | Login         | Login - Facctum Platform Guide     | Login process in the Facctum Platform supports            |
  | Notifications | Notifications - Facctum Platform Guide | Notifications in the platform keep users up to date    |
  | Profile View  | Profile View - Facctum Platform Guide | Profile View provide users with quick access           |

# Verify FacctList section sidebar links
Then user should verify FacctList section sidebar links:
  | linkText              | expectedTitle                                 | expectedContent                                                    |
  | Dashboard             | Dashboard - Facctum Platform Guide            | provides an at-a-glance overview of your FacctList environment     |
  | Tasks                 | Tasks - Facctum Platform Guide                | Tasks provides users with access to a range of items               |
  | Search                | Search - Facctum Platform Guide               | Search                                                             |
  | Watchlists            | Watchlists - Facctum Platform Guide           | Watchlists are collections of records used to support screening    |
  | Data Export           | Data Export - Facctum Platform Guide          | Data Export centralises the configuration                          |

# Verify Watchlists submenu sidebar links
Then user should verify Watchlists submenu sidebar links:
  | linkText              | expectedTitle                                       | expectedContent                                                              |
  | Commercial Lists      | Commercial Lists - Facctum Platform Guide           | Commercial Lists are watchlists provided by third-party vendor               |
  | Regulatory Lists      | Regulatory Lists - Facctum Platform Guide           | Regulatory Lists are publicly available watchlists published                 |
  | Internal Lists        | Internal Lists - Facctum Platform Guide             | Internal Lists—also known as Blocklists                                      |
  | Reconciliation        | Reconciliation - Facctum Platform Guide             | Reconciliation enables you to compare official regulatory watchlists         |
  | Suppressed and Enriched | Suppressed and Enriched - Facctum Platform Guide  | Suppressed and Enriched lets you manage one-off record or alias overrides    |

# Verify FacctView section sidebar links
Then user should verify FacctView section sidebar links:
  | linkText              | expectedTitle                                      | expectedContent                                                              |
  | Case Register         | Case Register - Facctum Platform Guide             | Case Register provides users with view of all compliance cases               |
  | Screening Register    | Screening Register - Facctum Platform Guide        | Screening Register records and tracks all screening activities               |
  | Entity Register       | Entity Register - Facctum Platform Guide           | Entity Register stores all entity information in the system                  |
  | Customer Screening    | Customer Screening - Facctum Platform Guide        | Customer Screening helps institutions identify high-risk individuals         |
  | Transaction Screening | Transaction Screening - Facctum Platform Guide     | Transaction Screening enables real-time screening of financial transactions  |
  | Queues                | Queues - Facctum Platform Guide                    | Queues enable skill-based routing of compliance cases                        |

# Verify Customer Screening submenu sidebar links
Then user should verify Customer Screening submenu sidebar links:
  | linkText                       | expectedTitle                                            | expectedContent                                                                        |
  | CS Dashboard                   | Dashboard - Facctum Platform Guide                       | Customer Screening Dashboard provides a real-time overview of system performance       |
  | On Demand Screening            | On Demand Screening - Facctum Platform Guide             | On-Demand Screening allows users to instantly screen individual customers              |
  | Batch Screening                | Batch Screening - Facctum Platform Guide                 | Batch Screening enables users to screen large volumes of customer                      |
  | CS Post-Screening Rules        | Post-Screening Rules - Facctum Platform Guide            | Post-Screening Rules enable organizations to define configurable validation            |
  | CS Screening Profile           | Screening Profile - Facctum Platform Guide               | Screening Profile defines the rules, thresholds, and watchlists                        |

# Verify Transaction Screening submenu sidebar links
Then user should verify Transaction Screening submenu sidebar links:
  | linkText                       | expectedTitle                                            | expectedContent                                                                        |
  | TS Dashboard                   | Dashboard - Facctum Platform Guide                       | Transaction Screening Dashboard provides a real-time overview of transaction screening |
  | Transaction Simulator          | Transaction Simulator - Facctum Platform Guide           | Transaction Simulator allows users to submit test transactions in JSON format          |
  | Pre-Screening Rules            | Pre-Screening Rules - Facctum Platform Guide             | Pre-Screening Rules enable organizations to define configurable validation             |
  | TS Post-Screening Rules        | Post-Screening Rules - Facctum Platform Guide            | Post-Screening Rules enable organizations to define configurable validation            |
  | TS Screening Profile           | Screening Profile - Facctum Platform Guide               | Screening Profile defines the rules, thresholds, and watchlists                        |

# Legacy step (backward compatible) - use section-specific steps above for better error reporting
Then user should verify all sidebar links open correctly with expected content:
  | linkText      | expectedTitle                      | expectedContent                                           |
  | Groups        | Groups - Facctum Platform Guide    | Groups enable administrators to bundle roles              |
```

Key details:
- Feature file: `src/features/helpGuide.feature` with scenarios for:
  - Complete Help Guide verification (@HelpGuideComplete) - consolidated scenario that verifies:
    - Panel display and title
    - Iframe source from assets.facctum.com
    - Content sections (Platform, Login and Access, Password Requirements, Home, Section Map)
    - Section Map navigation items (Groups, Roles, Help, Reports, Users, Login, Profile View)
    - Login and Access section text content
    - Platform section sidebar links via expand to new tab (Groups, Roles, Help, Reports, Users, Login, Notifications, Profile View)
    - FacctList section sidebar links (Dashboard, Tasks, Search, Watchlists, Data Export)
    - FacctList > Watchlists submenu links (Commercial Lists, Regulatory Lists, Internal Lists, Reconciliation, Suppressed and Enriched)
    - FacctView section sidebar links (Case Register, Screening Register, Entity Register, Customer Screening, Transaction Screening, Queues)
    - FacctView > Customer Screening submenu links (CS Dashboard, On Demand Screening, Batch Screening, CS Post-Screening Rules, CS Screening Profile)
    - FacctView > Transaction Screening submenu links (TS Dashboard, Transaction Simulator, Pre-Screening Rules, TS Post-Screening Rules, TS Screening Profile)
  - Panel close functionality (@HelpGuideClose)
- Background step verifies user is logged in via hooks
- Content verification fetches iframe content and checks for expected text strings
- Uses `FacctumDashboardPage` page object for Help Guide interactions
- Text matching is case-sensitive for content verification
- Results are attached to Allure report as JSON (includes section name for section-specific steps)
- Tags: `@HelpGuide @org:facctum`
- **Section-specific sidebar link steps** (recommended for better error reporting):
  - `user should verify Platform section sidebar links:` - Platform section links
  - `user should verify FacctList section sidebar links:` - FacctList section links
  - `user should verify Watchlists submenu sidebar links:` - Watchlists submenu links
  - `user should verify FacctView section sidebar links:` - FacctView section links
  - `user should verify Customer Screening submenu sidebar links:` - Customer Screening submenu links
  - `user should verify Transaction Screening submenu sidebar links:` - Transaction Screening submenu links
  - Each step includes the section name in log messages (e.g., `[Platform] ✓ Link "Groups" verified successfully`)
  - Error messages include section context for easier debugging (e.g., `[FacctView] 2 link(s) failed verification: ...`)
- Legacy step `user should verify all sidebar links open correctly with expected content:` still available for backward compatibility
- **Prefixed link names for duplicate links** (use these when the same link name appears in multiple sections):
  - `Platform Reports` - Reports link in Platform section
  - `FacctList Reports` - Reports link in FacctList section
  - `FacctView Reports` - Reports link in FacctView section
  - `FacctView Watchlists` - Watchlists link in FacctView section (distinct from FacctList Watchlists)
- Platform section links: Groups, Roles, Help, Users, Login, Notifications, Profile View, Platform Reports
- FacctList section links: Dashboard, Tasks, Search, Watchlists, Data Export, FacctList Reports
- FacctList > Watchlists submenu links: Commercial Lists, Regulatory Lists, Internal Lists, Reconciliation, Suppressed and Enriched
- FacctView section links: Case Register, Screening Register, Entity Register, Customer Screening, Transaction Screening, Queues, FacctView Reports, FacctView Watchlists
- FacctView > Customer Screening submenu links: CS Dashboard, On Demand Screening, Batch Screening, CS Post-Screening Rules, CS Screening Profile
- FacctView > Transaction Screening submenu links: TS Dashboard, Transaction Simulator, Pre-Screening Rules, TS Post-Screening Rules, TS Screening Profile
