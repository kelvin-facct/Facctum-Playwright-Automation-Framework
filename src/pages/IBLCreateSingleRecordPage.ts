import { Locator, Page } from "playwright";
import { PlaywrightActions } from "../helpers/playwrightActions";
import { logger } from "../utils/logger";
import { ExcelReader } from "../helpers/excelReader";

/**
 * IBLCreateSingleRecordPage - Page object for IBL (Internal Block List) Single Record Creation.
 * Migrated from Java Selenium: IblCreateSingleRecordPage.java
 *
 * Handles the flow:
 * 1. Navigate to Internal List (Watchlist → Internal list)
 * 2. Search and select a list
 * 3. Click Add Records → Single record
 * 4. Select record type (Individual, Entity, Bank, Vessel)
 * 5. Fill mandatory fields (Names, ID numbers, Address, etc.)
 * 6. Fill Additional Details tab
 * 7. Submit for approval
 */
export class IBLCreateSingleRecordPage {
  private actions: PlaywrightActions;

  // Test data constants
  static readonly DEFAULT_LIST_NAME = "Facctview IBL";
  static readonly TEST_DATA_PATH = "src/resources/testData/TestData.xlsx";
  static readonly SHEET_NAME = "IBLRecordAdd";

  // Navigation locators
  private watchlistMenu: Locator;
  private internalListOption: Locator;

  // List search locators
  private listSearchBox: Locator;

  // Add record locators
  private addRecordsBtn: Locator;
  private singleRecordMenuItem: Locator;
  private bulkRecordsMenuItem: Locator;

  // Record form drawer
  private recordDrawer: Locator;
  private drawerCloseIcon: Locator;
  private drawerBackdrop: Locator;

  // Record type dropdown
  private recordTypeDropdown: Locator;

  // Names section locators
  private nameTypeDropdown: Locator;
  private firstNameInput: Locator;
  private middleNameInput: Locator;
  private lastNameInput: Locator;
  private fullNameInput: Locator;
  private addNameBtn: Locator;
  private removeNameBtn: Locator;

  // ID Numbers section locators
  private idTypeDropdown: Locator;
  private idValueInput: Locator;
  private idCountryCodeDropdown: Locator;
  private idCountryNameDropdown: Locator;
  private idPlaceInput: Locator;
  private idRemarksInput: Locator;
  private addIdBtn: Locator;
  private removeIdBtn: Locator;

  // Address section locators
  private addressTypeDropdown: Locator;
  private addressLine1Input: Locator;
  private addressLine2Input: Locator;
  private addressLine3Input: Locator;
  private cityInput: Locator;
  private stateInput: Locator;
  private addressCountryCodeDropdown: Locator;
  private addressCountryNameDropdown: Locator;
  private addressPlaceInput: Locator;
  private zipCodeInput: Locator;
  private addAddressBtn: Locator;
  private removeAddressBtn: Locator;

  // Gender checkboxes
  private femaleCheckbox: Locator;
  private maleCheckbox: Locator;
  private otherGenderCheckbox: Locator;

  // Date section locators
  private dateTypeDropdown: Locator;
  private dateInput: Locator;
  private addDateBtn: Locator;
  private removeDateBtn: Locator;

  // Footer buttons
  private cancelBtn: Locator;
  private verifyDuplicateBtn: Locator;
  private saveAsDraftBtn: Locator;
  private submitForApprovalBtn: Locator;

  // Submit confirmation popup
  private submitCommentInput: Locator;
  private finalSubmitBtn: Locator;

  // Tabs
  private basicTab: Locator;
  private additionalDetailsTab: Locator;

  // Additional Details section locators
  private customerTypeDropdown: Locator;
  private businessUnitDropdown: Locator;
  private subBusinessUnitDropdown: Locator;
  private businessUnitContactInput: Locator;
  private expiryDateBtn: Locator;
  private commentsTextarea: Locator;
  private reasonTextarea: Locator;
  private furtherCommentsTextarea: Locator;
  private referenceInfoTextarea: Locator;

  // World Check & Locations locators
  private worldCheckIdInput: Locator;
  private locationInput: Locator;
  private addLocationBtn: Locator;
  private removeLocationBtn: Locator;

  // Country dropdowns (multi-select)
  private countryOfIncorporationDropdown: Locator;
  private otherAffiliatedCountriesDropdown: Locator;

  // Alias locators
  private addAliasBtn: Locator;

  constructor(private page: Page) {
    this.actions = new PlaywrightActions(page);

    // Navigation locators
    this.watchlistMenu = page.locator('[aria-label="Watchlist"]');
    this.internalListOption = page.locator('[aria-label="Internal list"]');

    // List search locators
    this.listSearchBox = page.locator('input[placeholder="Search by List name"]');

    // Add record locators
    this.addRecordsBtn = page.locator("#internal-list-record-view-add-records-btn");
    this.singleRecordMenuItem = page.locator('.MuiMenuItem-root:has-text("Single record")');
    this.bulkRecordsMenuItem = page.locator('.MuiMenuItem-root:has-text("Bulk records")');

    // Record form drawer
    this.recordDrawer = page.locator(".facct-drawer-modal");
    this.drawerCloseIcon = page.locator('.facct-drawer-modal [data-testid="CloseIcon"]');
    this.drawerBackdrop = page.locator('.facct-drawer-modal .MuiBackdrop-root');

    // Record type dropdown
    this.recordTypeDropdown = page.locator(".record-type-selector .facct-dropdown");

    // Names section locators (first row)
    this.nameTypeDropdown = page.locator('.nameDetailsList #mui-component-select-nameType').first();
    this.firstNameInput = page.locator('.nameDetailsList input[name="firstName"]').first();
    this.middleNameInput = page.locator('.nameDetailsList input[name="middleName"]').first();
    this.lastNameInput = page.locator('.nameDetailsList input[name="lastName"]').first();
    this.fullNameInput = page.locator('.nameDetailsList input[name="fullName"]').first();
    this.addNameBtn = page.locator('.nameDetailsList .add-btn-wrapper button');
    this.removeNameBtn = page.locator('.nameDetailsList [data-testid="RemoveCircleOutlineIcon"]').first();

    // ID Numbers section locators (first row)
    this.idTypeDropdown = page.locator('.idNumberTypesList #mui-component-select-idType').first();
    this.idValueInput = page.locator('.idNumberTypesList input[name="idValue"]').first();
    this.idCountryCodeDropdown = page.locator('.idNumberTypesList #mui-component-select-countryCode').first();
    this.idCountryNameDropdown = page.locator('.idNumberTypesList #mui-component-select-countryName').first();
    this.idPlaceInput = page.locator('.idNumberTypesList input[name="place"]').first();
    this.idRemarksInput = page.locator('.idNumberTypesList input[name="remarks"]').first();
    this.addIdBtn = page.locator('.idNumberTypesList .add-btn-wrapper button');
    this.removeIdBtn = page.locator('.idNumberTypesList [data-testid="RemoveCircleOutlineIcon"]').first();

    // Address section locators (first row)
    this.addressTypeDropdown = page.locator('.addressDetailsList #mui-component-select-addressType').first();
    this.addressLine1Input = page.locator('.addressDetailsList input[name="addressLine1"]').first();
    this.addressLine2Input = page.locator('.addressDetailsList input[name="addressLine2"]').first();
    this.addressLine3Input = page.locator('.addressDetailsList input[name="addressLine3"]').first();
    this.cityInput = page.locator('.addressDetailsList input[name="city"]').first();
    this.stateInput = page.locator('.addressDetailsList input[name="stateOrProvince"]').first();
    this.addressCountryCodeDropdown = page.locator('.addressDetailsList #mui-component-select-countryCode').first();
    this.addressCountryNameDropdown = page.locator('.addressDetailsList #mui-component-select-countryName').first();
    this.addressPlaceInput = page.locator('.addressDetailsList input[name="place"]').first();
    this.zipCodeInput = page.locator('.addressDetailsList input[name="zipCode"]').first();
    this.addAddressBtn = page.locator('.addressDetailsList .add-btn-wrapper button');
    this.removeAddressBtn = page.locator('.addressDetailsList [data-testid="RemoveCircleOutlineIcon"]').first();

    // Gender checkboxes
    this.femaleCheckbox = page.locator('.gender label[aria-label="Female"]');
    this.maleCheckbox = page.locator('.gender label[aria-label="Male"]');
    this.otherGenderCheckbox = page.locator('.gender label[aria-label="Other"]');

    // Date section locators (first row)
    this.dateTypeDropdown = page.locator('.birthDateDetailsList #mui-component-select-dateType').first();
    this.dateInput = page.locator('.birthDateDetailsList input[name="date"]').first();
    this.addDateBtn = page.locator('.birthDateDetailsList .add-btn-wrapper button');
    this.removeDateBtn = page.locator('.birthDateDetailsList [data-testid="RemoveCircleOutlineIcon"]').first();

    // Footer buttons
    this.cancelBtn = page.locator("#ibl-footer-cancel-btn");
    this.verifyDuplicateBtn = page.locator("#ibl-footer-verify-duplicate-btn");
    this.saveAsDraftBtn = page.locator("#ibl-footer-save-as-draft-btn");
    this.submitForApprovalBtn = page.locator("#ibl-footer-approve-btn");

    // Submit confirmation popup
    this.submitCommentInput = page.locator('textarea[placeholder="Comments"]');
    this.finalSubmitBtn = page.locator('.popup-actions button:has-text("SUBMIT")');

    // Tabs
    this.basicTab = page.locator('button[aria-label="Basic"]');
    this.additionalDetailsTab = page.locator('button:has-text("Additional details")');

    // Additional Details section locators
    this.customerTypeDropdown = page.locator('(//div[@aria-haspopup="listbox"])[2]');
    this.businessUnitDropdown = page.locator('.businessUnit [aria-haspopup="listbox"]');
    this.subBusinessUnitDropdown = page.locator('.subBusinessUnit [aria-haspopup="listbox"]');
    this.businessUnitContactInput = page.locator('.buContact input[type="text"]');
    this.expiryDateBtn = page.locator('button[aria-label="Choose date"]');
    this.commentsTextarea = page.locator('.comments textarea[placeholder="Comments"]');
    this.reasonTextarea = page.locator('.additionalInformation textarea').first();
    this.furtherCommentsTextarea = page.locator('.furtherComments textarea');
    this.referenceInfoTextarea = page.locator('.referenceInformation textarea');

    // World Check & Locations locators
    this.worldCheckIdInput = page.locator('.worldCheckList input[type="text"]');
    this.locationInput = page.locator('.locations input[type="text"]').first();
    this.addLocationBtn = page.locator('.locations button:has([data-testid="AddCircleOutlineIcon"])');
    this.removeLocationBtn = page.locator('.locations button:has([data-testid="RemoveCircleOutlineIcon"])');

    // Country dropdowns (multi-select)
    this.countryOfIncorporationDropdown = page.locator('.countryOfIncorporation [role="combobox"]');
    this.otherAffiliatedCountriesDropdown = page.locator('.otherAffliliatedCountries [role="combobox"]');

    // Alias locators
    this.addAliasBtn = page.locator('.nameDetailsList button:has([data-testid="AddCircleOutlineIcon"])');
  }

  // ==================== NAVIGATION METHODS ====================

  async clickWatchlistMenu(): Promise<void> {
    await this.watchlistMenu.waitFor({ state: "visible", timeout: 15000 });
    await this.watchlistMenu.click();
    await this.page.waitForTimeout(500);
    logger.info("Clicked on Watchlist menu");
  }

  async clickInternalList(): Promise<void> {
    await this.internalListOption.waitFor({ state: "visible", timeout: 10000 });
    await this.internalListOption.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked on Internal List option");
  }

  async navigateToInternalList(): Promise<void> {
    await this.clickWatchlistMenu();
    await this.clickInternalList();
  }

  // ==================== LIST SEARCH METHODS ====================

  async searchList(listName: string): Promise<void> {
    await this.listSearchBox.waitFor({ state: "visible", timeout: 10000 });
    await this.listSearchBox.fill(listName);
    await this.listSearchBox.press("Enter");
    await this.page.waitForLoadState("networkidle");
    logger.info(`Searched for list: ${listName}`);
  }

  async clickList(listName: string): Promise<void> {
    const listLink = this.page.locator(`.link-cell[aria-label="${listName}"]`);
    await listLink.waitFor({ state: "visible", timeout: 10000 });
    await listLink.click();
    await this.addRecordsBtn.waitFor({ state: "visible", timeout: 15000 });
    logger.info(`Clicked on list: ${listName}`);
  }

  async searchAndOpenList(listName: string = IBLCreateSingleRecordPage.DEFAULT_LIST_NAME): Promise<void> {
    await this.searchList(listName);
    await this.clickList(listName);
  }

  // ==================== ADD RECORD METHODS ====================

  async clickAddRecords(): Promise<void> {
    await this.addRecordsBtn.waitFor({ state: "visible", timeout: 10000 });
    await this.addRecordsBtn.click();
    await this.page.locator('ul[role="menu"]').waitFor({ state: "visible", timeout: 5000 });
    logger.info("Clicked on Add Records button");
  }

  async selectSingleRecord(): Promise<void> {
    await this.singleRecordMenuItem.waitFor({ state: "visible", timeout: 5000 });
    await this.singleRecordMenuItem.click();
    await this.recordDrawer.waitFor({ state: "visible", timeout: 10000 });
    logger.info("Selected Single record option");
  }

  async openSingleRecordForm(): Promise<void> {
    await this.clickAddRecords();
    await this.selectSingleRecord();
  }

  // ==================== RECORD TYPE METHODS ====================

  async selectRecordType(recordType: string): Promise<void> {
    // Click the dropdown to open it
    await this.recordTypeDropdown.click();
    await this.page.waitForTimeout(500);
    
    // Wait for the listbox to appear
    const listbox = this.page.locator('[role="listbox"]');
    await listbox.waitFor({ state: "visible", timeout: 5000 });
    
    // Check if the option exists
    const option = listbox.locator(`li:has-text("${recordType}")`);
    const optionCount = await option.count();
    
    if (optionCount === 0) {
      // Close the dropdown by pressing Escape
      await this.page.keyboard.press("Escape");
      logger.warn(`Record type "${recordType}" not available for this list. Available types may be limited.`);
      return;
    }
    
    await option.click();
    await this.page.waitForTimeout(500);
    logger.info(`Selected record type: ${recordType}`);
  }

  // ==================== NAMES SECTION METHODS ====================

  async enterFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    logger.info(`Entered first name: ${firstName}`);
  }

  async enterMiddleName(middleName: string): Promise<void> {
    await this.middleNameInput.fill(middleName);
    logger.info(`Entered middle name: ${middleName}`);
  }

  async enterLastName(lastName: string): Promise<void> {
    await this.lastNameInput.fill(lastName);
    logger.info(`Entered last name: ${lastName}`);
  }

  async getFullName(): Promise<string> {
    return await this.fullNameInput.inputValue();
  }

  async clickAddName(): Promise<void> {
    await this.addNameBtn.click();
    logger.info("Clicked Add Name button");
  }

  async selectNameType(nameType: string, index: number = 0): Promise<void> {
    const dropdown = this.page.locator('.nameDetailsList #mui-component-select-nameType').nth(index);
    await dropdown.click();
    await this.page.waitForTimeout(300);
    
    // Try standard MUI MenuItem first, then searchable dropdown
    const muiOption = this.page.locator(`.MuiMenuItem-root:has-text("${nameType}")`);
    const searchableOption = this.page.locator(`.single-select-option:has-text("${nameType}")`);
    
    if (await muiOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await muiOption.click();
    } else if (await searchableOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchableOption.click();
    } else {
      // Fallback: try li element
      const liOption = this.page.locator(`li:has-text("${nameType}")`);
      await liOption.click();
    }
    
    await this.page.waitForTimeout(300);
    logger.info(`Selected name type: ${nameType} at index ${index}`);
  }

  // ==================== ID NUMBERS SECTION METHODS ====================

  async selectIdType(idType: string, index: number = 0): Promise<void> {
    const dropdown = this.page.locator('.idNumberTypesList #mui-component-select-idType').nth(index);
    await dropdown.click();
    await this.page.waitForTimeout(300);
    
    // Try standard MUI MenuItem first, then searchable dropdown
    const muiOption = this.page.locator(`.MuiMenuItem-root:has-text("${idType}")`);
    const searchableOption = this.page.locator(`.single-select-option:has-text("${idType}")`);
    
    if (await muiOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await muiOption.waitFor({ state: "visible", timeout: 5000 });
      await muiOption.click();
    } else if (await searchableOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchableOption.click();
    } else {
      // Fallback: try li element
      const liOption = this.page.locator(`li:has-text("${idType}")`);
      await liOption.click();
    }
    
    await this.page.waitForTimeout(300);
    logger.info(`Selected ID type: ${idType} at index ${index}`);
  }

  async enterIdValue(idValue: string, index: number = 0): Promise<void> {
    const input = this.page.locator('.idNumberTypesList input[name="idValue"]').nth(index);
    await input.fill(idValue);
    logger.info(`Entered ID value: ${idValue} at index ${index}`);
  }

  async clickAddId(): Promise<void> {
    await this.addIdBtn.click();
    await this.page.waitForTimeout(300);
    logger.info("Clicked Add ID button");
  }

  async enterAccountNumber(accountNumber: string): Promise<void> {
    await this.enterIdValue(accountNumber, 0);
    logger.info(`Entered Account number: ${accountNumber}`);
  }

  async enterCustomerId(customerId: string): Promise<void> {
    await this.clickAddId();
    await this.selectIdType("Customer id", 1);
    await this.enterIdValue(customerId, 1);
    logger.info(`Entered Customer ID: ${customerId}`);
  }

  async enterGovernmentId(governmentId: string): Promise<void> {
    await this.clickAddId();
    const idCount = await this.page.locator('.idNumberTypesList input[name="idValue"]').count();
    await this.selectIdType("Government issued id", idCount - 1);
    await this.enterIdValue(governmentId, idCount - 1);
    logger.info(`Entered Government ID: ${governmentId}`);
  }

  // ==================== ADDRESS SECTION METHODS ====================

  async enterAddressLine1(address: string): Promise<void> {
    await this.addressLine1Input.fill(address);
    logger.info(`Entered address line 1: ${address}`);
  }

  async enterAddressLine2(address: string): Promise<void> {
    await this.addressLine2Input.fill(address);
    logger.info(`Entered address line 2: ${address}`);
  }

  async enterCity(city: string): Promise<void> {
    await this.cityInput.fill(city);
    logger.info(`Entered city: ${city}`);
  }

  async enterState(state: string): Promise<void> {
    await this.stateInput.fill(state);
    logger.info(`Entered state: ${state}`);
  }

  async enterZipCode(zipCode: string): Promise<void> {
    await this.zipCodeInput.fill(zipCode);
    logger.info(`Entered zip code: ${zipCode}`);
  }

  async selectAddressCountry(countryName: string): Promise<void> {
    // Click the country dropdown to open it
    await this.addressCountryNameDropdown.click();
    await this.page.waitForTimeout(300);
    
    // Wait for the dropdown listbox to appear
    const listbox = this.page.locator('[role="listbox"]');
    await listbox.waitFor({ state: "visible", timeout: 5000 });
    
    // Type in the search input to filter options
    const searchInput = this.page.locator('.filter-text-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill(countryName);
      await this.page.waitForTimeout(300);
    }
    
    // Click on the matching option (uses span.single-select-option)
    const option = this.page.locator(`.single-select-option:has-text("${countryName}")`).first();
    await option.waitFor({ state: "visible", timeout: 5000 });
    await option.click();
    await this.page.waitForTimeout(300);
    
    logger.info(`Selected address country: ${countryName}`);
  }

  // ==================== GENDER METHODS ====================

  async selectGender(gender: "Male" | "Female" | "Other"): Promise<void> {
    const checkbox = this.page.locator(`.gender label[aria-label="${gender}"]`);
    await checkbox.click();
    logger.info(`Selected gender: ${gender}`);
  }

  // ==================== DATE SECTION METHODS ====================

  async enterDateOfBirth(date: string): Promise<void> {
    await this.dateInput.fill(date);
    logger.info(`Entered date of birth: ${date}`);
  }

  // ==================== FOOTER BUTTON METHODS ====================

  async clickCancel(): Promise<void> {
    await this.cancelBtn.click();
    logger.info("Clicked Cancel button");
  }

  async clickVerifyDuplicate(): Promise<void> {
    await this.verifyDuplicateBtn.click();
    logger.info("Clicked Verify Duplicate button");
  }

  async clickSaveAsDraft(): Promise<void> {
    await this.saveAsDraftBtn.click();
    logger.info("Clicked Save as Draft button");
  }

  async clickSubmitForApproval(): Promise<void> {
    await this.submitForApprovalBtn.click();
    logger.info("Clicked Submit for Approval button");
  }

  async enterSubmitComment(comment: string): Promise<void> {
    await this.submitCommentInput.waitFor({ state: "visible", timeout: 5000 });
    await this.submitCommentInput.fill(comment);
    logger.info(`Entered submit comment: ${comment}`);
  }

  async clickFinalSubmit(): Promise<void> {
    await this.finalSubmitBtn.waitFor({ state: "visible", timeout: 5000 });
    await this.finalSubmitBtn.click();
    logger.info("Clicked final SUBMIT button");
  }

  async closeDrawer(): Promise<void> {
    try {
      await this.drawerCloseIcon.click();
    } catch {
      await this.drawerBackdrop.click({ force: true });
    }
    await this.page.waitForTimeout(500);
    logger.info("Closed record drawer");
  }

  // ==================== CUSTOMER TYPE METHODS ====================

  /**
   * Selects customer type from dropdown.
   * Based on Java: selectCustomerType()
   */
  async selectCustomerType(customerType: string = "Non Barclays Customer - Related Party"): Promise<void> {
    await this.customerTypeDropdown.click();
    await this.page.waitForTimeout(300);
    
    const option = this.page.locator(`span:has-text("${customerType}")`);
    await option.click();
    await this.page.waitForTimeout(300);
    logger.info(`Selected customer type: ${customerType}`);
  }

  // ==================== ALIAS METHODS ====================

  /**
   * Clicks Add Alias button to add another name row.
   * Based on Java: clickAddAlias()
   */
  async clickAddAlias(): Promise<void> {
    await this.addAliasBtn.click();
    await this.page.waitForTimeout(300);
    logger.info("Clicked Add Alias button");
  }

  /**
   * Enters full name (for Entity/Bank record types).
   * Based on Java: enterFullName()
   */
  async enterFullName(fullName: string): Promise<void> {
    await this.fullNameInput.fill(fullName);
    logger.info(`Entered full name: ${fullName}`);
  }

  // ==================== WORLD CHECK & LOCATIONS METHODS ====================

  /**
   * Enters World Check ID value.
   * Based on Java: enterWorldCheckId()
   */
  async enterWorldCheckId(worldCheckId: string): Promise<void> {
    await this.worldCheckIdInput.fill(worldCheckId);
    logger.info(`Entered World Check ID: ${worldCheckId}`);
  }

  /**
   * Enters Location value.
   * Based on Java: enterLocation()
   */
  async enterLocation(location: string): Promise<void> {
    await this.locationInput.fill(location);
    logger.info(`Entered Location: ${location}`);
  }

  /**
   * Clicks Add Location button to add another location field.
   * Based on Java: clickAddLocation()
   */
  async clickAddLocation(): Promise<void> {
    await this.addLocationBtn.click();
    await this.page.waitForTimeout(300);
    logger.info("Clicked Add Location button");
  }

  /**
   * Clicks Remove Location button to remove a location field.
   * Based on Java: clickRemoveLocation()
   */
  async clickRemoveLocation(): Promise<void> {
    await this.removeLocationBtn.click();
    await this.page.waitForTimeout(300);
    logger.info("Clicked Remove Location button");
  }

  /**
   * Enters location at specific index (for multiple locations).
   * Based on Java: enterLocationByIndex()
   */
  async enterLocationByIndex(index: number, location: string): Promise<void> {
    const locationInputs = this.page.locator('.locations input[type="text"]');
    const input = locationInputs.nth(index);
    await input.fill(location);
    logger.info(`Entered Location '${location}' at index ${index}`);
  }

  /**
   * Fills World Check ID and Locations section.
   * Based on Java: fillWorldCheckAndLocations()
   */
  async fillWorldCheckAndLocations(worldCheckId: string, ...locations: string[]): Promise<void> {
    logger.info("Filling World Check ID and Locations section");
    
    if (worldCheckId) {
      await this.enterWorldCheckId(worldCheckId);
    }
    
    if (locations.length > 0) {
      await this.enterLocation(locations[0]);
      
      for (let i = 1; i < locations.length; i++) {
        await this.clickAddLocation();
        await this.enterLocationByIndex(i, locations[i]);
      }
    }
    
    logger.info("World Check ID and Locations section filled");
  }

  // ==================== COUNTRY DROPDOWN METHODS (MULTI-SELECT) ====================

  /**
   * Selects Country of Incorporation from dropdown (multi-select with checkboxes).
   * Based on Java: selectCountryOfIncorporation()
   */
  async selectCountryOfIncorporation(country: string): Promise<void> {
    logger.info(`Selecting Country of Incorporation: ${country}`);
    
    await this.countryOfIncorporationDropdown.click();
    await this.page.waitForTimeout(500);
    
    await this.selectCheckboxOption(country);
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(300);
    
    logger.info(`Selected Country of Incorporation: ${country}`);
  }

  /**
   * Selects Other Affiliated Countries from dropdown (multi-select with checkboxes).
   * Based on Java: selectOtherAffiliatedCountries()
   */
  async selectOtherAffiliatedCountries(country: string): Promise<void> {
    logger.info(`Selecting Other Affiliated Countries: ${country}`);
    
    await this.otherAffiliatedCountriesDropdown.click();
    await this.page.waitForTimeout(500);
    
    await this.selectCheckboxOption(country);
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(300);
    
    logger.info(`Selected Other Affiliated Countries: ${country}`);
  }

  /**
   * Helper method to select checkbox option in facct-checkbox dropdown.
   * Based on Java: selectCheckboxOption()
   */
  private async selectCheckboxOption(optionText: string): Promise<void> {
    // Try to find the checkbox by label aria-label
    const labelByAriaLabel = this.page.locator(`label[aria-label="${optionText}"]`);
    const labelByText = this.page.locator(`label:has-text("${optionText}")`);
    const checkboxDiv = this.page.locator(`.facct-checkbox:has(label[aria-label="${optionText}"])`);
    
    let clicked = false;
    
    // Strategy 1: Click the checkbox input directly
    try {
      const checkboxInput = this.page.locator(`.facct-checkbox:has(label[aria-label="${optionText}"]) input[type="checkbox"]`);
      if (await checkboxInput.isVisible({ timeout: 2000 })) {
        await checkboxInput.click({ force: true });
        clicked = true;
        logger.info(`Clicked checkbox input for: ${optionText}`);
      }
    } catch {
      logger.debug(`Checkbox input click failed for: ${optionText}`);
    }
    
    // Strategy 2: Click the label
    if (!clicked) {
      try {
        if (await labelByAriaLabel.isVisible({ timeout: 1000 })) {
          await labelByAriaLabel.click();
          clicked = true;
          logger.info(`Clicked label for: ${optionText}`);
        }
      } catch {
        logger.debug(`Label click failed for: ${optionText}`);
      }
    }
    
    // Strategy 3: Click the checkbox div
    if (!clicked) {
      try {
        if (await checkboxDiv.isVisible({ timeout: 1000 })) {
          await checkboxDiv.click();
          clicked = true;
          logger.info(`Clicked checkbox div for: ${optionText}`);
        }
      } catch {
        logger.debug(`Checkbox div click failed for: ${optionText}`);
      }
    }
    
    if (!clicked) {
      logger.warn(`Could not find checkbox option: ${optionText}`);
    }
  }

  // ==================== ADDITIONAL DETAILS TAB METHODS ====================

  /**
   * Clicks on Additional Details button to expand the section.
   * Based on Java: clickAdditionalDetails()
   */
  async clickAdditionalDetails(): Promise<void> {
    await this.additionalDetailsTab.click();
    await this.page.waitForTimeout(500);
    logger.info("Clicked Additional Details button");
  }

  /**
   * Selects business unit from dropdown.
   * Based on Java: selectBusinessUnit()
   */
  async selectBusinessUnit(businessUnit: string = "AML Compliance"): Promise<void> {
    await this.businessUnitDropdown.click();
    await this.page.waitForTimeout(300);
    
    const option = this.page.locator(`span:has-text("${businessUnit}")`);
    await option.click();
    await this.page.waitForTimeout(300);
    logger.info(`Selected business unit: ${businessUnit}`);
  }

  /**
   * Selects sub-business unit from dropdown.
   * Based on Java: selectSubBusinessUnit()
   */
  async selectSubBusinessUnit(subBusinessUnit: string = "NA"): Promise<void> {
    await this.subBusinessUnitDropdown.click();
    await this.page.waitForTimeout(300);
    
    const option = this.page.locator(`span:has-text("${subBusinessUnit}")`);
    await option.click();
    await this.page.waitForTimeout(300);
    logger.info(`Selected sub-business unit: ${subBusinessUnit}`);
  }

  /**
   * Enters business unit contact email.
   * Based on Java: enterBusinessUnitContact()
   */
  async enterBusinessUnitContact(contactEmail: string): Promise<void> {
    await this.businessUnitContactInput.fill(contactEmail);
    logger.info(`Entered business unit contact: ${contactEmail}`);
  }

  /**
   * Selects expiry date using calendar picker.
   * Based on Java: selectExpiryDate()
   */
  async selectExpiryDate(daysFromToday: number = 30): Promise<void> {
    logger.info(`Selecting expiry date ${daysFromToday} days from today`);
    
    await this.expiryDateBtn.click();
    await this.page.waitForTimeout(500);
    
    // Click next month button to ensure future date
    const nextMonthBtn = this.page.locator('button[aria-label="Next month"]');
    await nextMonthBtn.click();
    await this.page.waitForTimeout(300);
    
    // Select day 15 (always exists in any month)
    const dayBtn = this.page.locator('button:has-text("15")').first();
    await dayBtn.click();
    await this.page.waitForTimeout(300);
    
    logger.info("Selected expiry date");
  }

  /**
   * Enters comments.
   * Based on Java: enterComments()
   */
  async enterComments(comments: string): Promise<void> {
    await this.commentsTextarea.fill(comments);
    logger.info(`Entered comments: ${comments}`);
  }

  /**
   * Enters reason (optional field).
   * Based on Java: enterReason()
   */
  async enterReason(reason: string): Promise<void> {
    if (reason) {
      await this.reasonTextarea.fill(reason);
      logger.info(`Entered reason: ${reason}`);
    }
  }

  /**
   * Enters further comments (optional field).
   * Based on Java: enterFurtherComments()
   */
  async enterFurtherComments(furtherComments: string): Promise<void> {
    if (furtherComments) {
      await this.furtherCommentsTextarea.fill(furtherComments);
      logger.info(`Entered further comments: ${furtherComments}`);
    }
  }

  /**
   * Enters reference information (optional field).
   * Based on Java: enterReferenceInformation()
   */
  async enterReferenceInformation(referenceInfo: string): Promise<void> {
    if (referenceInfo) {
      await this.referenceInfoTextarea.fill(referenceInfo);
      logger.info(`Entered reference information: ${referenceInfo}`);
    }
  }

  /**
   * Fills all Additional Details tab fields.
   * Based on Java: fillAdditionalDetailsTab()
   */
  async fillAdditionalDetailsTab(data: {
    businessUnitContact: string;
    comments: string;
    reason?: string;
    furtherComments?: string;
    referenceInfo?: string;
  }): Promise<void> {
    logger.info("Filling Additional Details tab fields");
    
    await this.selectBusinessUnit();
    await this.selectSubBusinessUnit();
    await this.enterBusinessUnitContact(data.businessUnitContact);
    await this.selectExpiryDate();
    
    if (data.reason) {
      await this.enterReason(data.reason);
    }
    
    await this.enterComments(data.comments);
    
    if (data.furtherComments) {
      await this.enterFurtherComments(data.furtherComments);
    }
    
    if (data.referenceInfo) {
      await this.enterReferenceInformation(data.referenceInfo);
    }
    
    logger.info("Additional Details tab fields filled successfully");
  }

  // ==================== ID NUMBER SECTION METHODS ====================

  /**
   * Selects Related ID type and enters value.
   * Based on Java: selectRelatedIdAndEnterValue()
   */
  async selectRelatedIdAndEnterValue(idValue: string): Promise<void> {
    await this.clickAddId();
    const idCount = await this.page.locator('.idNumberTypesList input[name="idValue"]').count();
    await this.selectIdType("Related id", idCount - 1);
    await this.enterIdValue(idValue, idCount - 1);
    logger.info(`Selected Related ID and entered value: ${idValue}`);
  }

  /**
   * Fills the ID number section with all required ID types and values.
   * Based on Java: fillIdNumberSection()
   */
  async fillIdNumberSection(accountNumber: string = "ACC123"): Promise<void> {
    logger.info("Filling ID number section");
    await this.enterAccountNumber(accountNumber);
    logger.info("ID number section filled successfully");
  }


  // ==================== COMPOSITE METHODS ====================

  /**
   * Fills all mandatory fields for Individual record type.
   * Based on Java: fillMandatoryFields()
   */
  async fillMandatoryFieldsForIndividual(data: {
    firstName?: string;
    lastName: string;
    accountNumber?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    gender?: "Male" | "Female" | "Other";
    dateOfBirth?: string;
  }): Promise<void> {
    logger.info("Filling mandatory fields for Individual record");

    // Names section
    if (data.firstName) {
      await this.enterFirstName(data.firstName);
    }
    await this.enterLastName(data.lastName);

    // ID Numbers section
    if (data.accountNumber) {
      await this.enterAccountNumber(data.accountNumber);
    }

    // Address section
    if (data.addressLine1) {
      await this.enterAddressLine1(data.addressLine1);
    }
    if (data.city) {
      await this.enterCity(data.city);
    }
    if (data.state) {
      await this.enterState(data.state);
    }
    if (data.zipCode) {
      await this.enterZipCode(data.zipCode);
    }
    if (data.country) {
      await this.selectAddressCountry(data.country);
    }

    // Gender
    if (data.gender) {
      await this.selectGender(data.gender);
    }

    // Date of birth
    if (data.dateOfBirth) {
      await this.enterDateOfBirth(data.dateOfBirth);
    }

    logger.info("Mandatory fields filled successfully");
  }

  /**
   * Fills ALL mandatory fields for IBL single record creation (matches Java fillMandatoryFields).
   * This includes Basic tab fields AND Additional Details tab fields.
   * Based on Java: fillMandatoryFields(entityName, buContact, comments, worldCheckId, location)
   */
  async fillAllMandatoryFields(data: {
    entityName: string;
    businessUnitContact: string;
    comments: string;
    worldCheckId?: string;
    location?: string;
    reason?: string;
    furtherComments?: string;
    referenceInfo?: string;
  }): Promise<void> {
    logger.info(`Starting to fill all mandatory fields for entity: ${data.entityName}`);
    
    // Select customer type
    await this.selectCustomerType();
    
    // Enter full name
    await this.enterFullName(data.entityName);
    
    // Click Add Alias
    await this.clickAddAlias();
    
    // Fill ID number section
    await this.fillIdNumberSection();
    
    // Fill address section
    await this.enterAddressLine1("123 Main St");
    await this.enterAddressLine2("Suite 400");
    await this.enterCity("New York");
    await this.enterState("NY");
    await this.enterZipCode("10001");
    await this.selectAddressCountry("Albania");
    
    // Fill World Check ID and Location
    if (data.worldCheckId) {
      await this.enterWorldCheckId(data.worldCheckId);
    }
    if (data.location) {
      await this.enterLocation(data.location);
    }
    
    // Select Country of Incorporation
    await this.selectCountryOfIncorporation("Albania");
    
    // Select Other Affiliated Countries
    await this.selectOtherAffiliatedCountries("Angola");
    
    // Click Additional Details tab
    await this.clickAdditionalDetails();
    
    // Fill Additional Details tab
    await this.fillAdditionalDetailsTab({
      businessUnitContact: data.businessUnitContact,
      comments: data.comments,
      reason: data.reason || "Testing automation script - reason for adding record",
      furtherComments: data.furtherComments || "Additional testing comments for automation verification",
      referenceInfo: data.referenceInfo || `Reference: AUTO-TEST-${Date.now()}`,
    });
    
    logger.info("All mandatory fields filled successfully");
  }

  /**
   * Fills all mandatory fields for Entity record type.
   */
  async fillMandatoryFieldsForEntity(data: {
    entityName: string;
    accountNumber?: string;
    addressLine1?: string;
    city?: string;
    country?: string;
  }): Promise<void> {
    logger.info("Filling mandatory fields for Entity record");

    // For Entity, the name goes in lastName field (full name)
    await this.enterLastName(data.entityName);

    if (data.accountNumber) {
      await this.enterAccountNumber(data.accountNumber);
    }

    if (data.addressLine1) {
      await this.enterAddressLine1(data.addressLine1);
    }
    if (data.city) {
      await this.enterCity(data.city);
    }
    if (data.country) {
      await this.selectAddressCountry(data.country);
    }

    logger.info("Entity mandatory fields filled successfully");
  }

  /**
   * Fills all mandatory fields for Vessel record type.
   * Based on Java: fillMandatoryFieldsForVessel()
   */
  async fillMandatoryFieldsForVessel(data: {
    vesselName: string;
    imoNumber: string;
  }): Promise<void> {
    logger.info("Filling mandatory fields for Vessel record");

    // Vessel name goes in lastName field
    await this.enterLastName(data.vesselName);

    // IMO number as ID
    await this.enterAccountNumber(data.imoNumber);

    logger.info("Vessel mandatory fields filled successfully");
  }

  /**
   * Complete flow: Create and submit an IBL single record.
   * Based on Java: userPerformsCompleteIblSingleRecordCreation()
   */
  async createAndSubmitRecord(
    listName: string,
    recordType: string,
    recordData: {
      firstName?: string;
      lastName: string;
      accountNumber?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      gender?: "Male" | "Female" | "Other";
      dateOfBirth?: string;
    },
    submitComment?: string
  ): Promise<void> {
    logger.info(`Starting complete IBL single record creation for ${recordType}`);

    // Navigate and open form
    await this.searchAndOpenList(listName);
    await this.openSingleRecordForm();

    // Select record type if not Individual (default)
    if (recordType !== "Individual") {
      await this.selectRecordType(recordType);
    }

    // Fill mandatory fields based on record type
    if (recordType === "Vessel") {
      await this.fillMandatoryFieldsForVessel({
        vesselName: recordData.lastName,
        imoNumber: recordData.accountNumber || "IMO1234567",
      });
    } else if (recordType === "Entity" || recordType === "Bank") {
      await this.fillMandatoryFieldsForEntity({
        entityName: recordData.lastName,
        accountNumber: recordData.accountNumber,
        addressLine1: recordData.addressLine1,
        city: recordData.city,
        country: recordData.country,
      });
    } else {
      await this.fillMandatoryFieldsForIndividual(recordData);
    }

    // Submit
    await this.clickSubmitForApproval();

    // Enter comment if provided
    if (submitComment) {
      await this.enterSubmitComment(submitComment);
    }

    await this.clickFinalSubmit();

    logger.info("IBL single record creation completed successfully");
  }

  // ==================== PENDING TAB & WITHDRAW METHODS ====================

  /**
   * Clicks on Pending tab.
   */
  async clickPendingTab(): Promise<void> {
    const pendingTab = this.page.locator('button[role="tab"]:has-text("Pending")');
    await pendingTab.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Clicked on Pending tab");
  }

  /**
   * Searches for a record by ID in the Pending tab.
   */
  async searchByRecordId(recordId: string): Promise<void> {
    const searchBox = this.page.locator('input[placeholder*="Search"]');
    await searchBox.fill(recordId);
    await searchBox.press("Enter");
    await this.page.waitForLoadState("networkidle");
    logger.info(`Searched for record ID: ${recordId}`);
  }

  /**
   * Searches for records in the Pending tab using the search field.
   * Based on Java: searchInPendingTab()
   */
  async searchInPendingTab(searchText: string): Promise<void> {
    await this.searchByRecordId(searchText);
    logger.info(`Searched for '${searchText}' in Pending tab`);
  }

  /**
   * Clicks the kebab menu for the first (and should be only) record after search.
   * Based on Java: clickKebabMenuForSearchedRecord()
   */
  async clickKebabMenuForSearchedRecord(): Promise<void> {
    await this.clickKebabMenuForLastRecord();
    logger.info("Clicked kebab menu for the searched record");
  }

  /**
   * Navigates to the last page of records using pagination.
   */
  async navigateToLastPage(): Promise<void> {
    const lastPageBtn = this.page.locator('[aria-label="Go to last page"]');
    if (await lastPageBtn.isVisible()) {
      await lastPageBtn.click();
      await this.page.waitForLoadState("networkidle");
      logger.info("Navigated to last page");
    }
  }

  /**
   * Clicks kebab menu for the last record in the list.
   */
  async clickKebabMenuForLastRecord(): Promise<void> {
    const kebabMenus = this.page.locator('[data-testid="MoreVertIcon"]');
    const count = await kebabMenus.count();
    if (count > 0) {
      await kebabMenus.last().click();
      logger.info("Clicked kebab menu for last record");
    }
  }

  /**
   * Selects Withdraw option from the kebab menu.
   * Note: Withdraw option is only available for records submitted by the current user.
   */
  async selectWithdrawOption(): Promise<void> {
    // Wait for the menu to be visible
    const menu = this.page.locator('[role="menu"]');
    await menu.waitFor({ state: "visible", timeout: 5000 });
    
    const withdrawOption = this.page.locator('li[role="menuitem"]:has-text("Withdraw")');
    
    // Check if Withdraw option exists
    if (await withdrawOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await withdrawOption.click();
      logger.info("Selected Withdraw option");
    } else {
      // Close the menu and throw an error
      await this.page.keyboard.press("Escape");
      throw new Error("Withdraw option not available. This may be because the record was not submitted by the current user.");
    }
  }

  /**
   * Confirms the withdrawal in the confirmation dialog.
   */
  async confirmWithdraw(): Promise<void> {
    // Wait for the confirmation modal to appear
    const modal = this.page.locator('.facct-modal');
    await modal.waitFor({ state: "visible", timeout: 5000 });
    
    // Click the WITHDRAW button in the popup-actions
    const confirmBtn = this.page.locator('.popup-actions button[aria-label="Withdraw"], .popup-actions button:has-text("WITHDRAW")');
    await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
    await confirmBtn.click();
    await this.page.waitForLoadState("networkidle");
    logger.info("Confirmed withdrawal");
  }

  /**
   * Clicks kebab menu for a specific row index (0-based).
   */
  async clickKebabMenuForRow(rowIndex: number): Promise<void> {
    const kebabMenus = this.page.locator('[data-testid="MoreVertIcon"]');
    const count = await kebabMenus.count();
    if (rowIndex < count) {
      await kebabMenus.nth(rowIndex).click();
      logger.info(`Clicked kebab menu for row ${rowIndex}`);
    } else {
      throw new Error(`Row index ${rowIndex} out of bounds. Only ${count} rows available.`);
    }
  }

  /**
   * Complete flow: Withdraw the last record that can be withdrawn.
   * Iterates through records from last to first to find one with Withdraw option.
   */
  async withdrawLastRecord(): Promise<void> {
    await this.clickPendingTab();
    await this.navigateToLastPage();
    
    // Wait for the table to load
    await this.page.waitForTimeout(1000);
    
    const kebabMenus = this.page.locator('[data-testid="MoreVertIcon"]');
    const count = await kebabMenus.count();
    logger.info(`Found ${count} records with kebab menus`);
    
    if (count === 0) {
      throw new Error("No records found in Pending tab");
    }
    
    // Try each record from last to first
    for (let i = count - 1; i >= 0; i--) {
      logger.info(`Checking record at row ${i} for Withdraw option...`);
      
      await kebabMenus.nth(i).click();
      await this.page.waitForTimeout(500);
      
      // Wait for menu to appear
      const menu = this.page.locator('[role="menu"]');
      try {
        await menu.waitFor({ state: "visible", timeout: 3000 });
      } catch {
        logger.warn(`Menu did not appear for row ${i}, skipping...`);
        continue;
      }
      
      // Check if Withdraw option is available
      const withdrawOption = this.page.locator('li[role="menuitem"]:has-text("Withdraw")');
      const isWithdrawVisible = await withdrawOption.isVisible().catch(() => false);
      
      if (isWithdrawVisible) {
        logger.info(`Found Withdraw option at row ${i}`);
        await withdrawOption.click();
        await this.confirmWithdraw();
        logger.info(`Record at row ${i} withdrawn successfully`);
        return;
      }
      
      // Close menu and try next record
      logger.info(`Withdraw not available at row ${i}, trying next...`);
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(300);
    }
    
    throw new Error("No withdrawable records found. Make sure there are pending records submitted by the current user.");
  }

  /**
   * Complete flow: Withdraw a record by ID.
   */
  async withdrawRecordById(recordId: string): Promise<void> {
    await this.clickPendingTab();
    await this.searchByRecordId(recordId);
    await this.clickKebabMenuForLastRecord();
    await this.selectWithdrawOption();
    await this.confirmWithdraw();
    logger.info(`Record ${recordId} withdrawn successfully`);
  }

  // ==================== TEST DATA LOADING ====================

  /**
   * Loads test data from Excel file.
   * Based on Java: loadTestData()
   */
  static loadTestDataFromExcel(
    filePath: string = IBLCreateSingleRecordPage.TEST_DATA_PATH,
    sheetName: string = IBLCreateSingleRecordPage.SHEET_NAME,
    rowIndex: number = 1
  ): {
    entityFullName: string;
    businessUnitContact: string;
    recordComment: string;
    bankSubmitComment: string;
    worldCheckId: string;
    location: string;
  } {
    try {
      const excel = new ExcelReader(filePath);
      return {
        entityFullName: excel.getCellValue(sheetName, rowIndex, 0) || "Test Entity",
        businessUnitContact: excel.getCellValue(sheetName, rowIndex, 1) || "test@example.com",
        recordComment: excel.getCellValue(sheetName, rowIndex, 2) || "Test record comment",
        bankSubmitComment: excel.getCellValue(sheetName, rowIndex, 3) || "Test bank submit comment",
        worldCheckId: excel.getCellValue(sheetName, rowIndex, 4) || "WC123456",
        location: excel.getCellValue(sheetName, rowIndex, 5) || "New York",
      };
    } catch (error) {
      logger.warn(`Failed to load test data from Excel: ${error}. Using defaults.`);
      return {
        entityFullName: "Test Entity",
        businessUnitContact: "test@example.com",
        recordComment: "Test record comment",
        bankSubmitComment: "Test bank submit comment",
        worldCheckId: "WC123456",
        location: "New York",
      };
    }
  }
}
