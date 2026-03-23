import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { expect } from "@playwright/test";
import { EnvConfig } from "../config/env";
import{TestDataStore} from "../helpers/testDataStore";

// ==================== Commercial List Steps ====================

Given("user is on landing page", async function (this: CustomWorld) {
  await this.page.goto(EnvConfig.BASE_URL);
  await this.page.waitForLoadState("networkidle");
});

When("user clicks on list management", async function (this: CustomWorld) {
const dashboardPage = this.pageManager.getFacctumDashboardPage();
  await dashboardPage.navigateToListManagement();
  await TestDataStore.set("createdCaseId", "CAS123456");
  const caseId = TestDataStore.get<string>("createdCaseId");
  console.log(caseId);
});

Then("user should see {string} in the end of url", async function (this: CustomWorld, urlPart: string) {
  await expect(this.page).toHaveURL(new RegExp(`${urlPart}$`));
});

When("user click on {string} and then clicks on {string}", async function (this: CustomWorld, menuItem: string, subMenuItem: string) {
  // Click sidebar menu item (MUI ListItemButton)
  await this.page.getByText(menuItem, { exact: true }).click();
  // Click submenu item
  await this.page.getByText(subMenuItem, { exact: true }).click();
  await this.page.waitForLoadState("networkidle");
});

Then("Commercial list page should open", async function (this: CustomWorld) {
  await expect(this.page).toHaveURL(/commercial/i);
});
