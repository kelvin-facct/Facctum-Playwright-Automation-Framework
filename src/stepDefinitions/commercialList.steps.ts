import { When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { TestDataStore } from "../helpers/testDataStore";
import * as assert from "assert";

// ==================== Commercial List Steps ====================

When("user clicks on list management", async function (this: CustomWorld) {
  const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.navigateToListManagement();
  await TestDataStore.set("createdCaseId", "CAS123456");
  const caseId = TestDataStore.get<string>("createdCaseId");
  console.log(caseId);
});

Then("user should see {string} in the end of url", async function (this: CustomWorld, urlPart: string) {
  await this.page.waitForURL(new RegExp(`${urlPart}$`));
  const currentUrl = this.page.url();
  assert.ok(currentUrl.endsWith(urlPart), `Expected URL to end with "${urlPart}" but got "${currentUrl}"`);
});

When("user click on {string} and then clicks on {string}", async function (this: CustomWorld, menuItem: string, subMenuItem: string) {
  // Click sidebar menu item (MUI ListItemButton)
  await this.page.getByText(menuItem, { exact: true }).click();
  // Click submenu item
  await this.page.getByText(subMenuItem, { exact: true }).click();
  await this.page.waitForLoadState("networkidle");
});

Then("Commercial list page should open", async function (this: CustomWorld) {
  await this.page.waitForURL(/commercial/i);
  const currentUrl = this.page.url();
  assert.ok(/commercial/i.test(currentUrl), `Expected URL to contain "commercial" but got "${currentUrl}"`);
});
