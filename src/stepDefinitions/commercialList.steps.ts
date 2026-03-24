import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { TestDataStore } from "../helpers/testDataStore";
import { executeWithRetry } from "../helpers/stepRetry";
import * as assert from "assert";

// ==================== Commercial List Steps ====================

When("user clicks on list management", async function (this: CustomWorld) {
  const result = await executeWithRetry(
    async () => {
      const dashboardPage = this.pageManager.getFacctumDashboardPage();
      await dashboardPage.navigateToListManagement();
    },
    "click on list management",
    this.stepRetryTracker
  );

  // Attach retry info if step was retried
  if (result.wasRetried) {
    await this.attach(`⟳ RETRIED: Passed on attempt ${result.attempts}`, "text/plain");
  }

  if (!result.success) {
    throw result.lastError;
  }

  await TestDataStore.set("createdCaseId", "CAS123456");
  const caseId = TestDataStore.get<string>("createdCaseId");
  console.log(caseId);
});

Then("user should see {string} in the end of url", async function (this: CustomWorld, urlPart: string) {
  const result = await executeWithRetry(
    async () => {
      await this.page.waitForURL(new RegExp(`${urlPart}$`));
      const currentUrl = this.page.url();
      assert.ok(currentUrl.endsWith(urlPart), `Expected URL to end with "${urlPart}" but got "${currentUrl}"`);
    },
    `verify URL ends with ${urlPart}`,
    this.stepRetryTracker
  );

  if (result.wasRetried) {
    await this.attach(`⟳ RETRIED: Passed on attempt ${result.attempts}`, "text/plain");
  }

  if (!result.success) {
    throw result.lastError;
  }
});

When("user click on {string} and then clicks on {string}", async function (this: CustomWorld, menuItem: string, subMenuItem: string) {
  const result = await executeWithRetry(
    async () => {
      await this.page.getByText(menuItem, { exact: true }).click();
      await this.page.getByText(subMenuItem, { exact: true }).click();
      await this.page.waitForLoadState("networkidle");
    },
    `click ${menuItem} > ${subMenuItem}`,
    this.stepRetryTracker
  );

  if (result.wasRetried) {
    await this.attach(`⟳ RETRIED: Passed on attempt ${result.attempts}`, "text/plain");
  }

  if (!result.success) {
    throw result.lastError;
  }
});

Then("Commercial list page should open", async function (this: CustomWorld) {
  const result = await executeWithRetry(
    async () => {
      await this.page.waitForURL(/commercial/i);
      const currentUrl = this.page.url();
      assert.ok(/commercial/i.test(currentUrl), `Expected URL to contain "commercial" but got "${currentUrl}"`);
    },
    "verify commercial list page opened",
    this.stepRetryTracker
  );

  if (result.wasRetried) {
    await this.attach(`⟳ RETRIED: Passed on attempt ${result.attempts}`, "text/plain");
  }

  if (!result.success) {
    throw result.lastError;
  }
});
