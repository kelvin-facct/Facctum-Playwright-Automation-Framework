import { Locator, Page } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";

export class FacctumDashboardPage {
  private actions: PlaywrightActions;
  private listManagement: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);
    this.listManagement = page.locator(".facct-rawhtml").first();
  }

  async navigateToListManagement() {
    await this.actions.click(this.listManagement);
  }
}
