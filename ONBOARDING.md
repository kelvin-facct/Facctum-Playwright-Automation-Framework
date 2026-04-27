# New Member Onboarding Guide

Welcome to the Facctum Playwright Automation Framework! This guide walks you through everything you need to start writing automated tests.

## Prerequisites

Before you begin, make sure you have:
- **Node.js 18+** installed ([download](https://nodejs.org/))
- **Git** installed
- **VS Code** (recommended) with extensions: Playwright Test, Cucumber (Gherkin) Full Support
- Access to the Facctum platform (QA environment credentials)

## Step 1: Setup Your Environment

```bash
# Clone the repo
git clone https://github.com/kelvin-facct/Facctum-Playwright-Automation-Framework.git
cd Facctum-Playwright-Automation-Framework

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## Step 2: Configure Credentials

Create `src/config/.env.secrets` (this file is gitignored, never commit it):

```bash
# Your QA credentials
QA_APP_ORG_ID=your-org-id
QA_APP_USERNAME=your.email@facctum.com
QA_APP_PASSWORD=your-password

# Approver credentials (for maker/approver workflows)
QA_APPROVER_USERNAME=approver@facctum.com
QA_APPROVER_PASSWORD=approver-password
```

Verify your config is loaded correctly:
```bash
npx ts-node src/scripts/show-config.ts
```

## Step 3: Run Existing Tests

```bash
# Run all tests and see the Allure report
npm test

# Run a specific feature
npm run test:file facctSheild

# Run headless (no browser window)
HEADLESS=true npm test
```

If tests pass, your setup is good!

---

## How the Framework Works

Understanding the flow before writing tests:

```
Feature File (.feature)
    ↓ Gherkin steps
Step Definitions (.steps.ts)
    ↓ uses
Page Objects (pages/*.ts)
    ↓ uses
PlaywrightActions (helpers/playwrightActions.ts)
    ↓ drives
Browser (Playwright)
```

### Key Concepts

| Concept | What it does | Where |
|---------|-------------|-------|
| Feature File | Test scenarios in plain English (Gherkin) | `src/features/` |
| Step Definition | TypeScript code that implements each Gherkin step | `src/stepDefinitions/` |
| Page Object | Encapsulates page locators and interactions | `src/pages/` |
| PageManager | Factory that gives you access to all page objects | `src/pages/PageManager.ts` |
| CustomWorld | Shared state per scenario (browser, page, context) | `src/world/customWorld.ts` |
| Hooks | Auto setup/teardown (login, screenshots, cleanup) | `src/hooks/hooks.ts` |
| PlaywrightActions | Reusable wrapper for click, fill, wait, assert | `src/helpers/playwrightActions.ts` |

### What Happens Automatically (You Don't Need to Handle)

The hooks handle these for you:
- Browser launch and close
- Login and session management
- Screenshot after every step
- Trace/video capture on failure
- Allure report generation
- Cleanup of old artifacts

---

## Step 4: Write Your First Test

Let's say you want to automate a new page called "Risk Assessment".

### 4.1 Create the Feature File

Create `src/features/riskAssessment.feature`:

```gherkin
@RiskAssessment
Feature: Risk Assessment
  As a compliance officer
  I want to assess risk levels
  So that I can take appropriate action

  Background:
    Given user is logged in and on the home page

  @RiskAssessment @org:facctum
  Scenario: Navigate to Risk Assessment page
    When User click on "Customer Screening" card
    Then validate that the user is on the "Dashboard" page
    When user navigates to Risk Assessment tab
    Then user should see the Risk Assessment page
    And risk assessment table should have records
```

**Tips:**
- `Background` runs before every scenario — use it for common setup
- `@org:facctum` sets which org to login to (overrides .env.secrets)
- `Given user is logged in and on the home page` is already implemented — reuse it!

### 4.2 Create the Page Object

Create `src/pages/RiskAssessmentPage.ts`:

```typescript
import { Page, Locator } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";

export class RiskAssessmentPage {
  private actions: PlaywrightActions;
  
  // Locators — define all your selectors here
  private riskTab: Locator;
  private riskTable: Locator;
  private searchInput: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);
    
    // Use Playwright's built-in locators (preferred over CSS selectors)
    this.riskTab = page.getByRole("tab", { name: "Risk Assessment" });
    this.riskTable = page.locator("table.risk-assessment");
    this.searchInput = page.getByPlaceholder("Search...");
  }

  async navigateToTab() {
    await this.actions.click(this.riskTab);
    logger.info("Navigated to Risk Assessment tab");
  }

  async isPageVisible(): Promise<boolean> {
    return await this.riskTable.isVisible();
  }

  async getRowCount(): Promise<number> {
    const rows = this.riskTable.locator("tbody tr");
    return await rows.count();
  }

  async searchRecord(text: string) {
    await this.actions.fill(this.searchInput, text);
    await this.page.waitForTimeout(1000); // wait for filter
  }
}
```

### 4.3 Register in PageManager

Open `src/pages/PageManager.ts` and add your page:

```typescript
import { RiskAssessmentPage } from "./RiskAssessmentPage";

// Add to the class:
private riskAssessmentPage?: RiskAssessmentPage;

getRiskAssessmentPage(): RiskAssessmentPage {
  if (!this.riskAssessmentPage) {
    this.riskAssessmentPage = new RiskAssessmentPage(this.page);
  }
  return this.riskAssessmentPage;
}
```

### 4.4 Create Step Definitions

Create `src/stepDefinitions/riskAssessment.steps.ts`:

```typescript
import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import * as assert from "assert";

When("user navigates to Risk Assessment tab", async function (this: CustomWorld) {
  const riskPage = this.pageManager.getRiskAssessmentPage();
  await riskPage.navigateToTab();
});

Then("user should see the Risk Assessment page", async function (this: CustomWorld) {
  const riskPage = this.pageManager.getRiskAssessmentPage();
  const isVisible = await riskPage.isPageVisible();
  assert.ok(isVisible, "Risk Assessment page should be visible");
});

Then("risk assessment table should have records", async function (this: CustomWorld) {
  const riskPage = this.pageManager.getRiskAssessmentPage();
  const count = await riskPage.getRowCount();
  assert.ok(count > 0, `Expected records in table, found ${count}`);
});
```

### 4.5 Run Your Test

```bash
npm run test:file riskAssessment
```

---

## Common Patterns You'll Use

### Reusing Existing Steps

Many steps are already implemented. Check existing step files before writing new ones:

```gherkin
# These already exist — just use them!
Given user is logged in and on the home page
When User click on "List Management" card
When User click on "Customer Screening" card
Then validate that the user is on the "Dashboard" page
And user collapses the left panel
Then user logs out from the application
Then user logs in with approver user
```

### Maker/Approver Workflow

```gherkin
Scenario: Create and approve a record
  # Step 1: Maker creates something
  When user creates a new record
  Then record should be pending approval
  
  # Step 2: Switch to approver
  Then user logs out from the application
  Then user logs in with approver user
  Then user navigates to the Home page
  
  # Step 3: Approver approves
  When User click on "List Management" card
  # ... navigate to pending approvals and approve
```

### Using Test Data from Excel

```typescript
import { ExcelReader } from "../helpers/excelReader";

const excel = new ExcelReader("src/resources/testData/Test_Sheet.xlsx");
const name = excel.getCellValue("Sheet1", 1, 0);  // row 1, col 0
const allData = excel.getSheetData("Sheet1");       // array of objects
```

### Sharing Data Between Steps

```typescript
// In one step — save data
this.scenarioContext.set("recordId", "12345");

// In another step — retrieve it
const recordId = this.scenarioContext.get<string>("recordId");
```

### Database Queries

```typescript
await this.db.connect();
const result = await this.db.queryOne(
  "SELECT * FROM records WHERE id = $1", 
  [recordId]
);
assert.equal(result.status, "approved");
```

### Using PlaywrightActions

```typescript
const actions = new PlaywrightActions(this.page);

// Click
await actions.click(this.page.getByRole("button", { name: "Submit" }));

// Fill input
await actions.fill(this.page.getByLabel("Name"), "John Doe");

// Wait and assert
await actions.waitForSelector(".success-message");
await actions.expectVisible(this.page.locator(".success-message"));
await actions.expectContainsText(this.page.locator(".status"), "Approved");

// File upload
await actions.uploadFile(this.page.locator("input[type=file]"), "path/to/file.xlsx");

// Screenshot
await actions.takeScreenshot("my-screenshot");
```

---

## Locator Best Practices

Playwright provides multiple ways to find elements. Use them in this priority:

```typescript
// 1. Role-based (BEST — accessible and resilient)
page.getByRole("button", { name: "Submit" })
page.getByRole("tab", { name: "Risk Assessment" })
page.getByRole("textbox", { name: "Email" })

// 2. Label/Placeholder (good for form fields)
page.getByLabel("Organisation ID")
page.getByPlaceholder("Search...")

// 3. Text-based (good for static text)
page.getByText("Welcome back")
page.getByText("Approved", { exact: true })

// 4. Test ID (when other options don't work)
page.getByTestId("risk-table")

// 5. CSS selector (last resort)
page.locator(".risk-assessment-table tbody tr")
page.locator("#submitBtn")
```

**Pro tip:** Use `npm run codegen` to open Playwright's recorder — click around the app and it generates locators for you!

---

## Running Tests — Quick Reference

| What you want | Command |
|---------------|---------|
| Run all tests + report | `npm test` |
| Run one feature | `npm run test:file riskAssessment` |
| Run headless | `HEADLESS=true npm test` |
| Run on Firefox | `npm run test:firefox` |
| Run against dev | `ENV=dev npm test` |
| Run parallel | `npm run test:parallel` |
| Debug with trace | `npm run trace:show` |
| Record actions | `npm run codegen` |
| Check config | `npx ts-node src/scripts/show-config.ts` |

---

## Project Structure at a Glance

```
src/
├── features/              ← Write your .feature files here
│   ├── facctSheild.feature
│   ├── bulkUpload.feature
│   └── yourNewFeature.feature
│
├── stepDefinitions/       ← Implement steps here
│   ├── facctSheild.steps.ts
│   └── yourNewFeature.steps.ts
│
├── pages/                 ← Page Objects go here
│   ├── LoginPage.ts
│   ├── FacctumDashboardPage.ts
│   ├── PageManager.ts     ← Register new pages here
│   └── YourNewPage.ts
│
├── helpers/               ← Utilities (don't modify unless needed)
│   ├── playwrightActions.ts
│   ├── authHelper.ts
│   ├── excelReader.ts
│   └── database.ts
│
├── hooks/hooks.ts         ← Auto setup/teardown (rarely modify)
├── world/customWorld.ts   ← Shared state per scenario
├── config/                ← Environment config
│   ├── environments.json
│   ├── env.ts
│   └── .env.secrets       ← Your credentials (gitignored)
│
└── resources/testData/    ← Excel test data files
```

---

## Checklist for Adding a New Test

- [ ] Create `.feature` file in `src/features/`
- [ ] Create Page Object in `src/pages/` (if new page)
- [ ] Register page in `src/pages/PageManager.ts`
- [ ] Create step definitions in `src/stepDefinitions/`
- [ ] Reuse existing steps where possible
- [ ] Add `@org:xxx` tag if specific org needed
- [ ] Run with `npm run test:file yourFeature`
- [ ] Check Allure report for results

---

## Getting Help

- Check `COMMANDS.md` for all available commands
- Check `README.md` for detailed configuration options
- Use `npm run codegen` to record browser actions and get locators
- Use `PWDEBUG=1 npm run test:ci` for step-by-step debugging
- Check existing features and step definitions for patterns to follow
