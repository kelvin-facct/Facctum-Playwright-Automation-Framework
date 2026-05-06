import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { CustomWorld } from "../world/customWorld";
import { FacctumDashboardPage } from "../pages/FacctumDashboardPage";
import { expect } from "@playwright/test";
import { logger } from "../utils/logger";

// Initialize page object - always create fresh instance to avoid stale page references
function getPage(world: CustomWorld): FacctumDashboardPage {
  // Use pageManager if available, otherwise create new instance
  if (world.pageManager) {
    return world.pageManager.getFacctumDashboardPage();
  }
  return new FacctumDashboardPage(world.page!);
}

// Background step - user is already logged in via hooks
Given("user is logged in to the Facctum Platform", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.verifyHomePageDisplayed();
  logger.info("User is logged in and on the Facctum Platform dashboard");
});

// Open Help Guide panel
When("user clicks on the help icon in the header", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.openHelpGuidePanel();
});

When("user opens the Help Guide panel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.openHelpGuidePanel();
});

// Verify Help Guide panel is displayed
Then("the Help Guide panel should be displayed", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.verifyHelpGuidePanelDisplayed();
});

// Verify Help Guide panel title
Then("the Help Guide panel title should be {string}", async function (this: CustomWorld, expectedTitle: string) {
  const page = getPage(this);
  await page.verifyHelpGuidePanelTitle(expectedTitle);
});

// Verify Help Guide content contains expected sections (data table)
Then("the Help Guide content should contain the following sections:", async function (this: CustomWorld, dataTable: DataTable) {
  const page = getPage(this);
  const sections = dataTable.raw().slice(1).map(row => row[0]); // Skip header row
  
  const missingTexts = await page.verifyHelpGuideContentContains(sections);
  
  if (missingTexts.length > 0) {
    // Attach results to Allure report
    await this.attach(
      JSON.stringify({ 
        expected: sections, 
        missing: missingTexts,
        status: "FAILED"
      }, null, 2),
      "application/json"
    );
    throw new Error(`Missing sections in Help Guide: ${missingTexts.join(", ")}`);
  }
  
  // Attach success results to Allure report
  await this.attach(
    JSON.stringify({ 
      expected: sections, 
      found: sections,
      status: "PASSED"
    }, null, 2),
    "application/json"
  );
  
  logger.info(`All ${sections.length} sections verified in Help Guide content`);
});

// Verify Help Guide Section Map contains items (data table)
Then("the Help Guide Section Map should contain:", async function (this: CustomWorld, dataTable: DataTable) {
  const page = getPage(this);
  const items = dataTable.raw().slice(1).map(row => row[0]); // Skip header row
  
  const missingTexts = await page.verifyHelpGuideContentContains(items);
  
  if (missingTexts.length > 0) {
    await this.attach(
      JSON.stringify({ 
        expected: items, 
        missing: missingTexts,
        status: "FAILED"
      }, null, 2),
      "application/json"
    );
    throw new Error(`Missing Section Map items in Help Guide: ${missingTexts.join(", ")}`);
  }
  
  await this.attach(
    JSON.stringify({ 
      expected: items, 
      found: items,
      status: "PASSED"
    }, null, 2),
    "application/json"
  );
  
  logger.info(`All ${items.length} Section Map items verified in Help Guide content`);
});

// Verify Help Guide content contains specific text (data table)
Then("the Help Guide content should contain the following text:", async function (this: CustomWorld, dataTable: DataTable) {
  const page = getPage(this);
  const texts = dataTable.raw().slice(1).map(row => row[0]); // Skip header row
  
  const missingTexts = await page.verifyHelpGuideContentContains(texts);
  
  if (missingTexts.length > 0) {
    await this.attach(
      JSON.stringify({ 
        expected: texts, 
        missing: missingTexts,
        status: "FAILED"
      }, null, 2),
      "application/json"
    );
    throw new Error(`Missing text in Help Guide: ${missingTexts.join(", ")}`);
  }
  
  await this.attach(
    JSON.stringify({ 
      expected: texts, 
      found: texts,
      status: "PASSED"
    }, null, 2),
    "application/json"
  );
  
  logger.info(`All ${texts.length} text items verified in Help Guide content`);
});

// Close Help Guide panel
When("user clicks the CLOSE button on the Help Guide panel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.closeHelpGuidePanel();
});

When("user closes the Help Guide panel", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.closeHelpGuidePanel();
});

// Verify Help Guide panel is closed
Then("the Help Guide panel should be closed", async function (this: CustomWorld) {
  const page = getPage(this);
  await page.verifyHelpGuidePanelClosed();
});

// Verify Help Guide iframe source
Then("the Help Guide iframe should load from {string}", async function (this: CustomWorld, expectedDomain: string) {
  const page = getPage(this);
  const iframeSrc = await page.getHelpGuideIframeSrc();
  
  expect(iframeSrc).not.toBeNull();
  expect(iframeSrc).toContain(expectedDomain);
  
  await this.attach(
    JSON.stringify({ 
      iframeSrc: iframeSrc,
      expectedDomain: expectedDomain,
      status: "PASSED"
    }, null, 2),
    "application/json"
  );
  
  logger.info(`Help Guide iframe source verified: ${iframeSrc}`);
});

// Get Help Guide content for debugging
Then("user should see the Help Guide content", async function (this: CustomWorld) {
  const page = getPage(this);
  const content = await page.getHelpGuideContent();
  
  // Attach content to Allure report for debugging
  await this.attach(content.substring(0, 5000), "text/plain");
  
  logger.info("Help Guide content retrieved successfully");
});

// Click on expand icon to open Help Guide in new tab
When("user clicks on the expand icon to open Help Guide in new tab", async function (this: CustomWorld) {
  const page = getPage(this);
  const helpGuidePage = await page.expandHelpGuideToNewTab();
  
  // Store the new page in scenario context for further interactions
  this.scenarioContext.set("helpGuidePage", helpGuidePage);
  
  logger.info("Help Guide expanded to new tab");
});

// Click on a sidebar link in the Help Guide page
When("user clicks on sidebar link {string}", async function (this: CustomWorld, linkText: string) {
  const helpGuidePage = this.scenarioContext.get("helpGuidePage");
  if (!helpGuidePage) {
    throw new Error("Help Guide page not found in context. Make sure to expand Help Guide to new tab first.");
  }
  
  // Use Playwright's getByRole for better accessibility and reliability
  const link = helpGuidePage.getByRole("link", { name: linkText, exact: true });
  
  // If exact match not found, try partial match with CSS selector
  if (await link.count() === 0) {
    const partialLink = helpGuidePage.locator(`a:has-text("${linkText}")`).first();
    await partialLink.click();
  } else {
    await link.click();
  }
  
  await helpGuidePage.waitForLoadState("networkidle");
  logger.info(`Clicked on sidebar link: ${linkText}`);
});

// Verify page title
Then("the page title should be {string}", async function (this: CustomWorld, expectedTitle: string) {
  const helpGuidePage = this.scenarioContext.get("helpGuidePage");
  if (!helpGuidePage) {
    throw new Error("Help Guide page not found in context.");
  }
  
  const actualTitle = await helpGuidePage.title();
  expect(actualTitle).toBe(expectedTitle);
  
  logger.info(`Page title verified: ${actualTitle}`);
});

// Verify page content contains text
Then("the page content should contain {string}", async function (this: CustomWorld, expectedText: string) {
  const helpGuidePage = this.scenarioContext.get("helpGuidePage");
  if (!helpGuidePage) {
    throw new Error("Help Guide page not found in context.");
  }
  
  // Use Playwright locators to get content from main content area
  const contentSelectors = [".content", "article", "main", ".md-content"];
  let content = "";
  
  for (const selector of contentSelectors) {
    const element = helpGuidePage.locator(selector).first();
    if (await element.count() > 0) {
      content = await element.innerText();
      break;
    }
  }
  
  // Fallback to body if no content area found
  if (!content) {
    content = await helpGuidePage.locator("body").innerText();
  }
  
  expect(content).toContain(expectedText);
  
  logger.info(`Page content verified to contain: ${expectedText}`);
});

// Helper function to expand parent sidebar sections if needed
async function expandSidebarSectionIfNeeded(helpGuidePage: any, linkText: string): Promise<void> {
  // Define the direct parent for each link (only immediate parent, not grandparents)
  // This avoids expanding unrelated sections
  const directParentMap: Record<string, string> = {
    // Platform section children
    "Login": "Platform",
    "Roles": "Platform",
    "Groups": "Platform",
    "Users": "Platform",
    "Help": "Platform",
    "Notifications": "Platform",
    "Tags": "Platform",
    "Profile View": "Platform",
    
    // FacctList section children
    "Dashboard": "FacctList",
    "Tasks": "FacctList",
    "Search": "FacctList",
    "Watchlists": "FacctList",
    "Data Export": "FacctList",
    
    // Watchlists children (under FacctList)
    "Commercial Lists": "Watchlists",
    "Regulatory Lists": "Watchlists",
    "Press Releases": "Watchlists",
    "Internal Lists": "Watchlists",
    "Reconciliation": "Watchlists",
    "Suppressed and Enriched": "Watchlists",
    
    // Data Export children (under FacctList)
    "Templates": "Data Export",
    "Custom Delta": "Data Export",
    "Destination Config": "Data Export",
    "Downloads": "Data Export",
    
    // FacctView section children
    "Case Register": "FacctView",
    "Screening Register": "FacctView",
    "Entity Register": "FacctView",
    "Customer Screening": "FacctView",
    "Transaction Screening": "FacctView",
    "Queues": "FacctView",
    
    // Customer Screening children (under FacctView)
    "On Demand Screening": "Customer Screening",
    "Batch Screening": "Customer Screening",
    "Post-Screening Rules": "Customer Screening",
    "Screening Profile": "Customer Screening",
    
    // Transaction Screening children (under FacctView)
    "Transaction Simulator": "Transaction Screening",
    "Pre-Screening Rules": "Transaction Screening"
  };

  // Get the direct parent for this link
  const directParent = directParentMap[linkText];
  
  if (!directParent) {
    logger.info(`No parent mapping found for "${linkText}", skipping expansion`);
    return;
  }

  // Build the chain of parents to expand (from top to bottom)
  const parentsToExpand: string[] = [];
  let currentParent: string | undefined = directParent;
  
  while (currentParent) {
    parentsToExpand.unshift(currentParent); // Add to beginning
    currentParent = directParentMap[currentParent];
  }

  logger.info(`Parents to expand for "${linkText}": ${parentsToExpand.join(" > ") || "none"}`);

  // Expand each parent section in order (from top to bottom)
  for (const parentSection of parentsToExpand) {
    // Find the parent section link that has a submenu (has-sub-menu class)
    const parentItem = helpGuidePage.locator(`li.has-sub-menu`).filter({ 
      has: helpGuidePage.locator(`> a:text-is("${parentSection}")`)
    }).first();
    
    if (await parentItem.count() > 0) {
      // Check if the submenu is closed (has mark.closed span with "+" text)
      // The mark shows "+" when closed and "-" when expanded
      const closedMark = parentItem.locator("> a span.mark.closed");
      if (await closedMark.count() > 0) {
        const markText = await closedMark.textContent();
        if (markText === "+") {
          logger.info(`Expanding parent section: ${parentSection}`);
          // Click on the span.mark element to toggle the submenu (not the link itself)
          await closedMark.click();
          await helpGuidePage.waitForTimeout(500); // Wait for animation
        } else {
          logger.info(`Parent section "${parentSection}" is already expanded (mark shows "${markText}")`);
        }
      } else {
        logger.info(`Parent section "${parentSection}" is already expanded (no closed mark)`);
      }
    } else {
      logger.warn(`Parent section "${parentSection}" not found in sidebar`);
    }
  }
}

// Verify all sidebar links open correctly with expected content (data table)
// This is a reusable helper function for section-specific steps
async function verifySidebarLinks(
  world: CustomWorld, 
  dataTable: DataTable, 
  sectionName: string
): Promise<void> {
  const helpGuidePage = world.scenarioContext.get("helpGuidePage");
  if (!helpGuidePage) {
    throw new Error("Help Guide page not found in context. Make sure to expand Help Guide to new tab first.");
  }
  
  // Map prefixed link names to actual sidebar link names and their parent sections
  // This handles duplicate link names like "Dashboard", "Post-Screening Rules", "Screening Profile", "Reports"
  const linkNameMapping: Record<string, { actualName: string; parent: string; directUrl?: string }> = {
    // Platform section - Reports (prefixed to distinguish from FacctList/FacctView Reports)
    "Platform Reports": { actualName: "Reports", parent: "Platform", directUrl: "/platform/users/report.html" },
    // FacctList section - Reports (prefixed to distinguish)
    "FacctList Reports": { actualName: "Reports", parent: "FacctList", directUrl: "/facctlist/reports.html" },
    // FacctView section - Reports and Watchlists (prefixed to distinguish)
    "FacctView Reports": { actualName: "Reports", parent: "FacctView", directUrl: "/facctviewv2/reports.html" },
    "FacctView Watchlists": { actualName: "Watchlists", parent: "FacctView", directUrl: "/facctviewv2/system-configuration-watchlists.html" },
    // Customer Screening submenu (prefixed with CS)
    "CS Dashboard": { actualName: "Dashboard", parent: "Customer Screening", directUrl: "/facctviewv2/customer-screening/dashboard.html" },
    "CS Post-Screening Rules": { actualName: "Post-Screening Rules", parent: "Customer Screening", directUrl: "/facctviewv2/customer-screening/post-screening-rules.html" },
    "CS Screening Profile": { actualName: "Screening Profile", parent: "Customer Screening", directUrl: "/facctviewv2/customer-screening/screening-profile.html" },
    // Transaction Screening submenu (prefixed with TS)
    "TS Dashboard": { actualName: "Dashboard", parent: "Transaction Screening", directUrl: "/facctviewv2/transaction-screening/dashboard.html" },
    "TS Post-Screening Rules": { actualName: "Post-Screening Rules", parent: "Transaction Screening", directUrl: "/facctviewv2/transaction-screening/post-screening-rules.html" },
    "TS Screening Profile": { actualName: "Screening Profile", parent: "Transaction Screening", directUrl: "/facctviewv2/transaction-screening/screening-profile.html" },
  };
  
  // Define the direct parent for each link to help find the correct link when there are duplicates
  const directParentMap: Record<string, string> = {
    // Platform section children
    "Login": "Platform", "Roles": "Platform", "Groups": "Platform", "Users": "Platform",
    "Help": "Platform", "Notifications": "Platform", "Tags": "Platform", "Profile View": "Platform",
    "Reports": "Platform", // Note: Reports exists in multiple sections, handled via linkNameMapping
    // FacctList section children
    "Dashboard": "FacctList", "Tasks": "FacctList", "Search": "FacctList", 
    "Watchlists": "FacctList", "Data Export": "FacctList",
    // Watchlists children (under FacctList)
    "Commercial Lists": "Watchlists", "Regulatory Lists": "Watchlists", "Press Releases": "Watchlists",
    "Internal Lists": "Watchlists", "Reconciliation": "Watchlists", "Suppressed and Enriched": "Watchlists",
    // Data Export children (under FacctList)
    "Templates": "Data Export", "Custom Delta": "Data Export", 
    "Destination Config": "Data Export", "Downloads": "Data Export",
    // FacctView section children
    "Case Register": "FacctView", "Screening Register": "FacctView", "Entity Register": "FacctView",
    "Customer Screening": "FacctView", "Transaction Screening": "FacctView", "Queues": "FacctView",
    // Customer Screening children (under FacctView)
    "On Demand Screening": "Customer Screening", "Batch Screening": "Customer Screening",
    "Post-Screening Rules": "Customer Screening", "Screening Profile": "Customer Screening",
    // Transaction Screening children (under FacctView)
    "Transaction Simulator": "Transaction Screening", "Pre-Screening Rules": "Transaction Screening"
  };
  
  const rows = dataTable.hashes(); // Get rows as array of objects
  const results: Array<{linkText: string; status: string; actualTitle?: string; error?: string}> = [];
  
  logger.info(`=== Verifying ${sectionName} section (${rows.length} links) ===`);
  
  for (const row of rows) {
    const { linkText, expectedTitle, expectedContent } = row;
    
    try {
      // Check if this is a prefixed link name that needs special handling
      const mapping = linkNameMapping[linkText];
      const actualLinkText = mapping ? mapping.actualName : linkText;
      const parentSection = mapping ? mapping.parent : directParentMap[linkText];
      
      // If we have a direct URL mapping, navigate directly (most reliable for duplicate names)
      if (mapping?.directUrl) {
        const fullUrl = `https://assets.facctum.com/doc/non-prod/v1.22.0${mapping.directUrl}`;
        await helpGuidePage.goto(fullUrl);
        logger.info(`[${sectionName}] Navigated directly to "${linkText}" via URL: ${fullUrl}`);
      } else {
        // First, expand any parent sections that might contain this link
        await expandSidebarSectionIfNeeded(helpGuidePage, actualLinkText);
        
        // Now try to find and click the link in the sidebar submenu
        let linkClicked = false;
        
        // Escape special regex characters in linkText
        const escapedLinkText = actualLinkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // If we have a parent section, try to find the link within that section first
        if (parentSection) {
          const parentItem = helpGuidePage.locator(`li.has-sub-menu`).filter({ 
            has: helpGuidePage.locator(`> a:text-is("${parentSection}")`)
          }).first();
          
          if (await parentItem.count() > 0) {
            // Look for the link in the immediate submenu
            let targetLink = parentItem.locator(`> ul.sub-menu > li > a:text-is("${actualLinkText}")`).first();
            
            // If not found as direct child, try nested submenu
            if (await targetLink.count() === 0) {
              targetLink = parentItem.locator(`> ul.sub-menu > li.has-sub-menu > a:text-is("${actualLinkText}")`).first();
            }
            
            // If still not found, try any link within the submenu
            if (await targetLink.count() === 0) {
              targetLink = parentItem.locator(`.sub-menu a`).filter({ 
                hasText: new RegExp(`^${escapedLinkText}$`) 
              }).first();
            }
            
            if (await targetLink.count() > 0) {
              // Check if visible, if not get href and navigate
              if (await targetLink.isVisible({ timeout: 2000 }).catch(() => false)) {
                await targetLink.click();
                linkClicked = true;
                logger.info(`[${sectionName}] Clicked link "${actualLinkText}" in ${parentSection} submenu`);
              } else {
                const href = await targetLink.getAttribute("href");
                if (href) {
                  const fullUrl = href.startsWith("http") ? href : (href.startsWith("/") ? `https://assets.facctum.com${href}` : `https://assets.facctum.com/doc/non-prod/v1.22.0/${href}`);
                  await helpGuidePage.goto(fullUrl);
                  linkClicked = true;
                  logger.info(`[${sectionName}] Navigated directly to "${actualLinkText}" via href: ${fullUrl}`);
                }
              }
            }
          }
        }
        
        // Try to find the link in sub-menu first (for child items)
        if (!linkClicked) {
          const subMenuLink = helpGuidePage.locator(`.sub-menu a`).filter({ hasText: new RegExp(`^${escapedLinkText}$`) }).first();
          if (await subMenuLink.count() > 0 && await subMenuLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await subMenuLink.click();
            linkClicked = true;
            logger.info(`[${sectionName}] Clicked link "${actualLinkText}" in sub-menu`);
          }
        }
        
        // If not found in sub-menu, try the main sidebar
        if (!linkClicked) {
          const sidebarLink = helpGuidePage.locator(`.sidebar a`).filter({ hasText: new RegExp(`^${escapedLinkText}$`) }).first();
          if (await sidebarLink.count() > 0 && await sidebarLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await sidebarLink.click();
            linkClicked = true;
            logger.info(`[${sectionName}] Clicked link "${actualLinkText}" in sidebar`);
          }
        }
        
        // Fallback: try getByRole with exact match
        if (!linkClicked) {
          const roleLink = helpGuidePage.getByRole("link", { name: actualLinkText, exact: true });
          if (await roleLink.count() > 0 && await roleLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await roleLink.first().click();
            linkClicked = true;
            logger.info(`[${sectionName}] Clicked link "${actualLinkText}" via getByRole`);
          }
        }
        
        // For parent menu items with submenus, get href and navigate directly
        if (!linkClicked) {
          const hiddenLink = helpGuidePage.locator(`a`).filter({ hasText: new RegExp(`^${escapedLinkText}$`) }).first();
          
          if (await hiddenLink.count() > 0) {
            const href = await hiddenLink.getAttribute("href");
            if (href) {
              const currentUrl = helpGuidePage.url();
              const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
              const fullUrl = href.startsWith("http") ? href : (href.startsWith("/") ? `https://assets.facctum.com${href}` : `${baseUrl}/${href}`);
              await helpGuidePage.goto(fullUrl);
              linkClicked = true;
              logger.info(`[${sectionName}] Navigated directly to "${actualLinkText}" via href: ${fullUrl}`);
            }
          }
        }
        
        // Last resort: partial match with force click
        if (!linkClicked) {
          const partialLink = helpGuidePage.locator(`a:has-text("${actualLinkText}")`).first();
          await partialLink.click({ force: true });
          logger.info(`[${sectionName}] Clicked link "${actualLinkText}" via partial match with force`);
        }
      }
      
      // Wait for navigation to complete
      await helpGuidePage.waitForLoadState("networkidle");
      await helpGuidePage.waitForTimeout(500); // Small delay to ensure page is fully loaded
      
      // Verify title
      const actualTitle = await helpGuidePage.title();
      expect(actualTitle).toBe(expectedTitle);
      
      // Verify content using Playwright locators
      const contentSelectors = [".content", "article", "main", ".md-content"];
      let content = "";
      
      for (const selector of contentSelectors) {
        const element = helpGuidePage.locator(selector).first();
        if (await element.count() > 0) {
          content = await element.innerText();
          break;
        }
      }
      
      // Fallback to body if no content area found
      if (!content) {
        content = await helpGuidePage.locator("body").innerText();
      }
      
      expect(content).toContain(expectedContent);
      
      results.push({
        linkText,
        status: "PASSED",
        actualTitle
      });
      
      logger.info(`[${sectionName}] ✓ Link "${linkText}" verified successfully`);
      
    } catch (error) {
      results.push({
        linkText,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error)
      });
      logger.error(`[${sectionName}] ✗ Link "${linkText}" verification failed: ${error}`);
    }
  }
  
  // Attach results to Allure report
  await world.attach(
    JSON.stringify({ section: sectionName, results }, null, 2),
    "application/json"
  );
  
  // Check if any links failed
  const failedLinks = results.filter(r => r.status === "FAILED");
  if (failedLinks.length > 0) {
    throw new Error(`[${sectionName}] ${failedLinks.length} link(s) failed verification: ${failedLinks.map(l => `${l.linkText} (${l.error})`).join(", ")}`);
  }
  
  logger.info(`=== ${sectionName} section: All ${rows.length} links verified successfully ===`);
}

// Section-specific step definitions for better error reporting
Then("user should verify Platform section sidebar links:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "Platform");
});

Then("user should verify FacctList section sidebar links:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "FacctList");
});

Then("user should verify Watchlists submenu sidebar links:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "Watchlists");
});

Then("user should verify FacctView section sidebar links:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "FacctView");
});

Then("user should verify Customer Screening submenu sidebar links:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "Customer Screening");
});

Then("user should verify Transaction Screening submenu sidebar links:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "Transaction Screening");
});

Then("user should verify Data Export submenu sidebar links:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "Data Export");
});

// Legacy step - kept for backward compatibility
Then("user should verify all sidebar links open correctly with expected content:", async function (this: CustomWorld, dataTable: DataTable) {
  await verifySidebarLinks(this, dataTable, "General");
});
