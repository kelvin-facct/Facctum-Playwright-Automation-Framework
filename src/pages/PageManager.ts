import { Page } from "playwright";
import { LoginPage } from "./LoginPage";
import { FacctumDashboardPage } from "./FacctumDashboardPage";

/**
 * PageManager - Factory class for lazy-loading and caching page objects.
 * 
 * Page instances are created on first access and cached for subsequent calls.
 */
export class PageManager {
  private page: Page;
  private loginPage?: LoginPage;
  private facctumDashboardPage?: FacctumDashboardPage;

  constructor(page: Page) {
    this.page = page;
  }

  getLoginPage(): LoginPage {
    if (!this.loginPage) {
      this.loginPage = new LoginPage(this.page);
    }
    return this.loginPage;
  }
  getFacctumDashboardPage(): FacctumDashboardPage {
    if (!this.facctumDashboardPage) {
      this.facctumDashboardPage = new FacctumDashboardPage(this.page);
    }
    return this.facctumDashboardPage;
  }
}
