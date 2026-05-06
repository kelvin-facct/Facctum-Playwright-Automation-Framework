import { Page } from "playwright";
import { LoginPage } from "./LoginPage";
import { FacctumDashboardPage } from "./FacctumDashboardPage";
import { PreScreeningRulePage } from "./PreScreeningRulePage";
import { ListManagementPage } from "./ListManagementPage";
import { TasksPage } from "./TasksPage";
import { IBLDedupPage } from "./IBLDedupPage";
import { CommercialListPage } from "./CommercialListPage";
import { ProfileViewPage } from "./ProfileViewPage";
import { IBLCreateSingleRecordPage } from "./IBLCreateSingleRecordPage";
import { UKSANCTIONSadvfilterPage } from "./UKSANCTIONSadvfilterPage";
import { OFACadvfilterPage } from "./OFACadvfilterPage";

/**
 * PageManager - Factory class for lazy-loading and caching page objects.
 * 
 * Page instances are created on first access and cached for subsequent calls.
 */
export class PageManager {
  private page: Page;
  private loginPage?: LoginPage;
  private facctumDashboardPage?: FacctumDashboardPage;
  private preScreeningRulePage?: PreScreeningRulePage;
  private listManagementPage?: ListManagementPage;
  private tasksPage?: TasksPage;
  private iblDedupPage?: IBLDedupPage;
  private commercialListPage?: CommercialListPage;
  private profileViewPage?: ProfileViewPage;
  private iblCreateSingleRecordPage?: IBLCreateSingleRecordPage;
  private ukSanctionsAdvFilterPage?: UKSANCTIONSadvfilterPage;
  private ofacAdvFilterPage?: OFACadvfilterPage;

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

  getPreScreeningRulePage(): PreScreeningRulePage {
    if (!this.preScreeningRulePage) {
      this.preScreeningRulePage = new PreScreeningRulePage(this.page);
    }
    return this.preScreeningRulePage;
  }

  getListManagementPage(): ListManagementPage {
    if (!this.listManagementPage) {
      this.listManagementPage = new ListManagementPage(this.page);
    }
    return this.listManagementPage;
  }

  getTasksPage(): TasksPage {
    if (!this.tasksPage) {
      this.tasksPage = new TasksPage(this.page);
    }
    return this.tasksPage;
  }

  getIBLDedupPage(): IBLDedupPage {
    if (!this.iblDedupPage) {
      this.iblDedupPage = new IBLDedupPage(this.page);
    }
    return this.iblDedupPage;
  }

  getCommercialListPage(): CommercialListPage {
    if (!this.commercialListPage) {
      this.commercialListPage = new CommercialListPage(this.page);
    }
    return this.commercialListPage;
  }

  getProfileViewPage(): ProfileViewPage {
    if (!this.profileViewPage) {
      this.profileViewPage = new ProfileViewPage(this.page);
    }
    return this.profileViewPage;
  }

  getIBLCreateSingleRecordPage(): IBLCreateSingleRecordPage {
    if (!this.iblCreateSingleRecordPage) {
      this.iblCreateSingleRecordPage = new IBLCreateSingleRecordPage(this.page);
    }
    return this.iblCreateSingleRecordPage;
  }

  getUKSanctionsAdvFilterPage(): UKSANCTIONSadvfilterPage {
    if (!this.ukSanctionsAdvFilterPage) {
      this.ukSanctionsAdvFilterPage = new UKSANCTIONSadvfilterPage(this.page);
    }
    return this.ukSanctionsAdvFilterPage;
  }

  getOFACAdvFilterPage(): OFACadvfilterPage {
    if (!this.ofacAdvFilterPage) {
      this.ofacAdvFilterPage = new OFACadvfilterPage(this.page);
    }
    return this.ofacAdvFilterPage;
  }
}
