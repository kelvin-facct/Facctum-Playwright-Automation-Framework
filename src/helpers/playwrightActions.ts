import { Page, Locator } from "playwright";
import { logger } from "../utils/logger";
import * as assert from "assert";

/**
 * PlaywrightActions - A wrapper class providing reusable Playwright operations.
 * Centralizes common browser interactions with consistent logging and error handling.
 * 
 * Note: Uses native Playwright waiting methods and Node's assert for Cucumber compatibility.
 */
export class PlaywrightActions {
  constructor(private page: Page) {}

  // ==================== Navigation ====================

  /**
   * Navigates to the specified URL.
   * @param url - The URL to navigate to
   * @param options - Optional navigation options
   * @param options.waitUntil - When to consider navigation complete: 'load', 'domcontentloaded', or 'networkidle'
   */
  async goto(url: string, options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }) {
    logger.info(`Navigating to: ${url}`);
    await this.page.goto(url, options);
  }

  /**
   * Reloads the current page.
   */
  async reload() {
    logger.info("Reloading page");
    await this.page.reload();
  }

  // ==================== Click Actions ====================

  /**
   * Clicks on the specified locator element.
   * @param locator - The Playwright locator to click
   */
  async click(locator: Locator) {
    await locator.click();
  }

  /**
   * Clicks an element by its ARIA role.
   * @param role - The ARIA role (e.g., 'button', 'link', 'textbox')
   * @param options - Optional role options
   * @param options.name - Accessible name to match
   */
  async clickByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }) {
    const locator = this.page.getByRole(role as any, options);
    await locator.click();
  }

  /**
   * Clicks an element by its visible text content.
   * @param text - The text to match (string or RegExp)
   */
  async clickByText(text: string | RegExp) {
    await this.page.getByText(text).click();
  }

  /**
   * Clicks an element by its data-testid attribute.
   * @param testId - The test ID value
   */
  async clickByTestId(testId: string) {
    await this.page.getByTestId(testId).click();
  }

  /**
   * Double-clicks on the specified locator element.
   * @param locator - The Playwright locator to double-click
   */
  async doubleClick(locator: Locator) {
    await locator.dblclick();
  }

  /**
   * Right-clicks (context menu) on the specified locator element.
   * @param locator - The Playwright locator to right-click
   */
  async rightClick(locator: Locator) {
    await locator.click({ button: "right" });
  }

  // ==================== Input Actions ====================

  /**
   * Fills an input field with the specified value, clearing existing content first.
   * @param locator - The input locator
   * @param value - The value to fill
   */
  async fill(locator: Locator, value: string) {
    await locator.fill(value);
  }

  /**
   * Fills an input field identified by role and name.
   * @param role - The ARIA role of the input
   * @param name - The accessible name of the input
   * @param value - The value to fill
   */
  async fillByRole(role: string, name: string, value: string) {
    await this.page.getByRole(role as any, { name }).fill(value);
  }

  /**
   * Fills an input field identified by its placeholder text.
   * @param placeholder - The placeholder text
   * @param value - The value to fill
   */
  async fillByPlaceholder(placeholder: string, value: string) {
    await this.page.getByPlaceholder(placeholder).fill(value);
  }

  /**
   * Fills an input field identified by its associated label.
   * @param label - The label text
   * @param value - The value to fill
   */
  async fillByLabel(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Types text character by character (useful for triggering input events).
   * @param locator - The input locator
   * @param text - The text to type
   * @param options - Optional typing options
   * @param options.delay - Delay between keystrokes in milliseconds
   */
  async type(locator: Locator, text: string, options?: { delay?: number }) {
    await locator.pressSequentially(text, options);
  }

  /**
   * Clears the content of an input field.
   * @param locator - The input locator to clear
   */
  async clear(locator: Locator) {
    await locator.clear();
  }

  // ==================== Select & Checkbox ====================

  /**
   * Selects option(s) from a dropdown/select element.
   * @param locator - The select element locator
   * @param value - The value(s) to select
   */
  async selectOption(locator: Locator, value: string | string[]) {
    await locator.selectOption(value);
  }

  /**
   * Checks a checkbox or radio button.
   * @param locator - The checkbox/radio locator
   */
  async check(locator: Locator) {
    await locator.check();
  }

  /**
   * Unchecks a checkbox.
   * @param locator - The checkbox locator
   */
  async uncheck(locator: Locator) {
    await locator.uncheck();
  }

  // ==================== Hover & Focus ====================

  /**
   * Hovers over an element.
   * @param locator - The element locator to hover over
   */
  async hover(locator: Locator) {
    await locator.hover();
  }

  /**
   * Focuses on an element.
   * @param locator - The element locator to focus
   */
  async focus(locator: Locator) {
    await locator.focus();
  }

  // ==================== Keyboard ====================

  /**
   * Presses a keyboard key or key combination.
   * @param key - The key to press (e.g., 'Enter', 'Tab', 'Control+A')
   */
  async press(key: string) {
    await this.page.keyboard.press(key);
  }

  /**
   * Presses a key while focused on a specific element.
   * @param locator - The element locator
   * @param key - The key to press
   */
  async pressOnLocator(locator: Locator, key: string) {
    await locator.press(key);
  }

  // ==================== Wait Actions ====================

  /**
   * Waits for a selector to reach a specific state.
   * @param selector - The CSS selector to wait for
   * @param options - Wait options
   * @param options.state - Target state: 'visible', 'hidden', 'attached', or 'detached'
   * @param options.timeout - Maximum wait time in milliseconds
   */
  async waitForSelector(selector: string, options?: { state?: "visible" | "hidden" | "attached" | "detached"; timeout?: number }) {
    await this.page.waitForSelector(selector, options);
  }

  /**
   * Waits for a locator to reach a specific state.
   * @param locator - The locator to wait for
   * @param options - Wait options
   * @param options.state - Target state: 'visible', 'hidden', 'attached', or 'detached'
   * @param options.timeout - Maximum wait time in milliseconds
   */
  async waitForLocator(locator: Locator, options?: { state?: "visible" | "hidden" | "attached" | "detached"; timeout?: number }) {
    await locator.waitFor(options);
  }

  /**
   * Waits for the page URL to match the specified pattern.
   * @param url - The URL pattern to match (string or RegExp)
   * @param options - Wait options
   * @param options.timeout - Maximum wait time in milliseconds
   */
  async waitForUrl(url: string | RegExp, options?: { timeout?: number }) {
    await this.page.waitForURL(url, options);
  }

  /**
   * Waits for the page to reach a specific load state.
   * @param state - The load state: 'load', 'domcontentloaded', or 'networkidle'
   */
  async waitForLoadState(state?: "load" | "domcontentloaded" | "networkidle") {
    await this.page.waitForLoadState(state);
  }

  /**
   * Waits for a specified amount of time (use sparingly).
   * @param ms - Time to wait in milliseconds
   */
  async waitForTimeout(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  // ==================== Assertions ====================

  /**
   * Asserts that an element is visible.
   * @param locator - The element locator
   * @param options - Assertion options
   * @param options.timeout - Maximum wait time in milliseconds
   */
  async expectVisible(locator: Locator, options?: { timeout?: number }) {
    await locator.waitFor({ state: "visible", timeout: options?.timeout });
  }

  /**
   * Asserts that an element is hidden.
   * @param locator - The element locator
   * @param options - Assertion options
   * @param options.timeout - Maximum wait time in milliseconds
   */
  async expectHidden(locator: Locator, options?: { timeout?: number }) {
    await locator.waitFor({ state: "hidden", timeout: options?.timeout });
  }

  /**
   * Asserts that an element has the exact specified text.
   * @param locator - The element locator
   * @param text - The expected text (string or RegExp)
   * @param options - Assertion options
   */
  async expectText(locator: Locator, text: string | RegExp, options?: { timeout?: number }) {
    await locator.waitFor({ state: "visible", timeout: options?.timeout });
    const actualText = await locator.textContent();
    if (typeof text === "string") {
      assert.strictEqual(actualText?.trim(), text, `Expected text "${text}" but got "${actualText}"`);
    } else {
      assert.ok(text.test(actualText || ""), `Expected text to match ${text} but got "${actualText}"`);
    }
  }

  /**
   * Asserts that an element contains the specified text.
   * @param locator - The element locator
   * @param text - The text to find (string or RegExp)
   * @param options - Assertion options
   */
  async expectContainsText(locator: Locator, text: string | RegExp, options?: { timeout?: number }) {
    await locator.waitFor({ state: "visible", timeout: options?.timeout });
    const actualText = await locator.textContent();
    if (typeof text === "string") {
      assert.ok(actualText?.includes(text), `Expected text to contain "${text}" but got "${actualText}"`);
    } else {
      assert.ok(text.test(actualText || ""), `Expected text to match ${text} but got "${actualText}"`);
    }
  }

  /**
   * Asserts that an input has the specified value.
   * @param locator - The input locator
   * @param value - The expected value (string or RegExp)
   * @param options - Assertion options
   */
  async expectValue(locator: Locator, value: string | RegExp, options?: { timeout?: number }) {
    await locator.waitFor({ state: "visible", timeout: options?.timeout });
    const actualValue = await locator.inputValue();
    if (typeof value === "string") {
      assert.strictEqual(actualValue, value, `Expected value "${value}" but got "${actualValue}"`);
    } else {
      assert.ok(value.test(actualValue), `Expected value to match ${value} but got "${actualValue}"`);
    }
  }

  /**
   * Asserts that an element is enabled.
   * @param locator - The element locator
   * @param options - Assertion options
   */
  async expectEnabled(locator: Locator, options?: { timeout?: number }) {
    await locator.waitFor({ state: "visible", timeout: options?.timeout });
    const isEnabled = await locator.isEnabled();
    assert.ok(isEnabled, "Expected element to be enabled");
  }

  /**
   * Asserts that an element is disabled.
   * @param locator - The element locator
   * @param options - Assertion options
   */
  async expectDisabled(locator: Locator, options?: { timeout?: number }) {
    await locator.waitFor({ state: "visible", timeout: options?.timeout });
    const isDisabled = await locator.isDisabled();
    assert.ok(isDisabled, "Expected element to be disabled");
  }

  /**
   * Asserts that a checkbox/radio is checked.
   * @param locator - The checkbox/radio locator
   * @param options - Assertion options
   */
  async expectChecked(locator: Locator, options?: { timeout?: number }) {
    await locator.waitFor({ state: "visible", timeout: options?.timeout });
    const isChecked = await locator.isChecked();
    assert.ok(isChecked, "Expected element to be checked");
  }

  /**
   * Asserts that the page has the specified title.
   * @param title - The expected title (string or RegExp)
   * @param options - Assertion options
   */
  async expectTitle(title: string | RegExp, options?: { timeout?: number }) {
    const actualTitle = await this.page.title();
    if (typeof title === "string") {
      assert.strictEqual(actualTitle, title, `Expected title "${title}" but got "${actualTitle}"`);
    } else {
      assert.ok(title.test(actualTitle), `Expected title to match ${title} but got "${actualTitle}"`);
    }
  }

  /**
   * Asserts that the page URL matches the specified pattern.
   * @param url - The expected URL (string or RegExp)
   * @param options - Assertion options
   */
  async expectUrl(url: string | RegExp, options?: { timeout?: number }) {
    if (options?.timeout) {
      await this.page.waitForURL(url, { timeout: options.timeout });
    }
    const actualUrl = this.page.url();
    if (typeof url === "string") {
      assert.strictEqual(actualUrl, url, `Expected URL "${url}" but got "${actualUrl}"`);
    } else {
      assert.ok(url.test(actualUrl), `Expected URL to match ${url} but got "${actualUrl}"`);
    }
  }

  // ==================== Get Text/Attribute ====================

  /**
   * Gets the text content of an element.
   * @param locator - The element locator
   * @returns The text content or null
   */
  async getText(locator: Locator): Promise<string | null> {
    return await locator.textContent();
  }

  /**
   * Gets the value of an input element.
   * @param locator - The input locator
   * @returns The input value
   */
  async getInputValue(locator: Locator): Promise<string> {
    return await locator.inputValue();
  }

  /**
   * Gets an attribute value from an element.
   * @param locator - The element locator
   * @param name - The attribute name
   * @returns The attribute value or null
   */
  async getAttribute(locator: Locator, name: string): Promise<string | null> {
    return await locator.getAttribute(name);
  }

  /**
   * Gets the count of elements matching the locator.
   * @param locator - The element locator
   * @returns The number of matching elements
   */
  async getCount(locator: Locator): Promise<number> {
    return await locator.count();
  }

  // ==================== Visibility Checks ====================

  /**
   * Checks if an element is visible.
   * @param locator - The element locator
   * @returns True if visible, false otherwise
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Checks if an element is enabled.
   * @param locator - The element locator
   * @returns True if enabled, false otherwise
   */
  async isEnabled(locator: Locator): Promise<boolean> {
    return await locator.isEnabled();
  }

  /**
   * Checks if a checkbox/radio is checked.
   * @param locator - The checkbox/radio locator
   * @returns True if checked, false otherwise
   */
  async isChecked(locator: Locator): Promise<boolean> {
    return await locator.isChecked();
  }

  // ==================== Screenshots ====================

  /**
   * Takes a full-page screenshot.
   * @param name - The screenshot filename (without extension)
   * @param outputDir - Optional output directory (defaults to reports/{env}/screenshots)
   */
  async screenshot(name: string, outputDir?: string) {
    const env = process.env.ENV || "qa";
    const dir = outputDir || `reports/${env}/screenshots`;
    logger.info(`Taking screenshot: ${name}`);
    await this.page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  }

  /**
   * Takes a screenshot of a specific element.
   * @param locator - The element locator
   * @param name - The screenshot filename (without extension)
   * @param outputDir - Optional output directory (defaults to reports/{env}/screenshots)
   */
  async screenshotElement(locator: Locator, name: string, outputDir?: string) {
    const env = process.env.ENV || "qa";
    const dir = outputDir || `reports/${env}/screenshots`;
    await locator.screenshot({ path: `${dir}/${name}.png` });
  }

  // ==================== Frames & Dialogs ====================

  /**
   * Gets a frame by its name attribute.
   * @param name - The frame name
   * @returns The frame or null if not found
   */
  getFrame(name: string) {
    return this.page.frame(name);
  }

  /**
   * Gets a frame by its URL.
   * @param url - The frame URL (string or RegExp)
   * @returns The frame or null if not found
   */
  getFrameByUrl(url: string | RegExp) {
    return this.page.frame({ url });
  }

  /**
   * Sets up a handler to automatically accept dialogs.
   */
  async acceptDialog() {
    this.page.on("dialog", (dialog) => dialog.accept());
  }

  /**
   * Sets up a handler to automatically dismiss dialogs.
   */
  async dismissDialog() {
    this.page.on("dialog", (dialog) => dialog.dismiss());
  }

  // ==================== File Upload & Download ====================

  /**
   * Uploads file(s) to a file input element.
   * @param locator - The file input locator
   * @param filePath - The file path(s) to upload
   */
  async uploadFile(locator: Locator, filePath: string | string[]) {
    await locator.setInputFiles(filePath);
  }

  /**
   * Uploads file(s) via file chooser dialog triggered by clicking an element.
   * Use this when the file input is hidden and triggered by another element.
   * @param triggerLocator - The element that opens the file chooser when clicked
   * @param filePath - The file path(s) to upload
   */
  async uploadFileViaChooser(triggerLocator: Locator, filePath: string | string[]) {
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent("filechooser"),
      triggerLocator.click()
    ]);
    await fileChooser.setFiles(filePath);
  }

  /**
   * Clears all files from a file input element.
   * @param locator - The file input locator
   */
  async clearUploadedFiles(locator: Locator) {
    await locator.setInputFiles([]);
  }

  /**
   * Downloads a file by clicking an element and waits for download to complete.
   * @param triggerLocator - The element that triggers the download when clicked
   * @param savePath - Optional path to save the downloaded file
   * @returns The download object with file info
   */
  async downloadFile(triggerLocator: Locator, savePath?: string) {
    const [download] = await Promise.all([
      this.page.waitForEvent("download"),
      triggerLocator.click()
    ]);
    
    if (savePath) {
      await download.saveAs(savePath);
      logger.info(`File downloaded to: ${savePath}`);
    }
    
    return download;
  }

  /**
   * Downloads a file and returns its path in the default downloads folder.
   * @param triggerLocator - The element that triggers the download
   * @returns The path to the downloaded file
   */
  async downloadFileAndGetPath(triggerLocator: Locator): Promise<string> {
    const download = await this.downloadFile(triggerLocator);
    const path = await download.path();
    logger.info(`File downloaded to temp path: ${path}`);
    return path || "";
  }

  /**
   * Downloads a file and returns its suggested filename.
   * @param triggerLocator - The element that triggers the download
   * @returns The suggested filename from the server
   */
  async downloadFileAndGetName(triggerLocator: Locator): Promise<string> {
    const download = await this.downloadFile(triggerLocator);
    return download.suggestedFilename();
  }

  // ==================== Scroll ====================

  /**
   * Scrolls an element into view if needed.
   * @param locator - The element locator
   */
  async scrollToElement(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Scrolls to the top of the page.
   */
  async scrollToTop() {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Scrolls to the bottom of the page.
   */
  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  // ==================== Utilities ====================

  /**
   * Gets the underlying Playwright Page instance.
   * @returns The Page instance
   */
  getPage(): Page {
    return this.page;
  }
}
