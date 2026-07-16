/**
 * OFAC NON-SDN Profile View UI Verification Script
 * 
 * Navigates to OFAC NON-SDN in FacctList, opens profile view for verified entities,
 * captures all displayed fields, compares against MongoDB, and generates evidence report.
 * 
 * Usage:
 *   npx ts-node scripts/verify_ofac_ui_profile.ts
 *   npx ts-node scripts/verify_ofac_ui_profile.ts --entity 15268
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright';
import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

// Config
const BASE_URL = 'https://qa-saas.facctum.com';
const ORG_ID = process.env.APP_ORG_ID || 'datavium';
const MONGO_URI = 'mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27017/?tls=true&directConnection=true&tlsAllowInvalidCertificates=true';
const MONGO_DB = 'screenDB';
const COLLECTION = 'dataviumRegulatoryListHist';
const LIST_ID = 94;
const LIST_NAME = 'OFAC NON SDN';
const AUTH_STATE = path.resolve('reports/qa/.auth/state-chromium-facctum.json');
const AUTH_STATE_DEFAULT = path.resolve('reports/qa/.auth/state-chromium.json');
const REPORT_DIR = path.resolve('reports');
const SCREENSHOT_DIR = path.resolve('reports/ofac-nonsdn-evidence');

// Entities selected for maximum field variety:
// 50476 - Individual (DOB, Gender, Nationality, Place of Birth, A.K.A., weak alias, 2 ID types, 4 addresses)
// 17013 - Entity (31 names incl Native/F.K.A., 8 IDs, 12 addresses, remarks, Organization Est Date, 7 ID types)
// 15268 - Entity (F.K.A. names, SWIFT/BIC ID, remarks, multiple addresses)
// 30930 - Entity (21 IDs with USCC+ISIN types, 10 source specific details)
const ENTITY_IDS = ['50476', '17013', '15268', '30930'];

interface ProfileField {
  section: string;
  label: string;
  value: string;
}

interface EntityEvidence {
  entityId: string;
  listEntryId: string;
  primaryName: string;
  uiFields: ProfileField[];
  dbFields: Record<string, any>;
  matched: { field: string; uiValue: string; dbValue: string }[];
  uiOnly: { field: string; value: string }[];  // visible in UI but not checked against DB
  dbOnly: { field: string; value: string }[];   // in DB but not visible in UI
  screenshots: string[];
}

async function loadCredentials(): Promise<{ email: string; password: string; orgId: string }> {
  // Try multiple possible locations for .env.secrets
  const possiblePaths = [
    path.resolve(__dirname, '..', 'src', 'config', '.env.secrets'),
    path.resolve(process.cwd(), 'src', 'config', '.env.secrets'),
    path.resolve('d:\\Playwright\\Facctum-Playwright-Automation-Framework', 'src', 'config', '.env.secrets'),
  ];
  
  let email = '', password = '', orgId = ORG_ID;
  
  for (const secretsPath of possiblePaths) {
    if (fs.existsSync(secretsPath)) {
      console.log(`Loading credentials from: ${secretsPath}`);
      const content = fs.readFileSync(secretsPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eqIndex = trimmed.indexOf('=');
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (key === 'APP_USERNAME' || key === 'QA_APP_USERNAME') email = value;
        if (key === 'APP_PASSWORD' || key === 'QA_APP_PASSWORD') password = value;
        if (key === 'APP_ORG_ID' || key === 'QA_APP_ORG_ID') orgId = value;
      }
      if (email && password) break;
    }
  }
  
  // Override org with datavium
  orgId = ORG_ID;
  
  return { email, password, orgId };
}

async function login(page: Page, email: string, password: string, orgId: string) {
  console.log(`Logging in as ${email} to org: ${orgId}`);
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  
  // Click LOG IN button
  const loginBtn = page.locator('button:has-text("LOG IN"), button[aria-label="LOG IN"]').first();
  await loginBtn.waitFor({ state: 'visible', timeout: 15000 });
  await loginBtn.click();
  
  // Enter Org ID
  const orgInput = page.locator('input#organizationName, input[name="organizationName"]').first();
  await orgInput.waitFor({ state: 'visible', timeout: 15000 });
  await orgInput.fill(orgId);
  
  // Click CONTINUE
  const continueBtn = page.locator('button:has-text("CONTINUE"), button[type="submit"]').first();
  await continueBtn.click();
  
  // Enter email
  const emailInput = page.locator('input[name="username"], input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(email);
  
  // Enter password
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.fill(password);
  
  // Click Continue
  const continueLoginBtn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
  await continueLoginBtn.click();
  
  // Wait for dashboard
  await page.locator('#facctumThemeProvider').waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('Login successful');
}

async function navigateToOFACNonSDN(page: Page) {
  console.log('Navigating to OFAC NON-SDN...');
  
  // Click List Management product card
  const listMgmtCard = page.locator('.product-card:has-text("List")').first();
  await listMgmtCard.waitFor({ state: 'visible', timeout: 15000 });
  await listMgmtCard.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('  Clicked List Management card');
  
  // Click Watchlist in sidebar
  const watchlist = page.locator("div[aria-label='Watchlist']");
  await watchlist.waitFor({ state: 'visible', timeout: 10000 });
  await watchlist.click();
  await page.waitForTimeout(1000);
  console.log('  Clicked Watchlist');
  
  // Click Regulatory list
  const regList = page.locator("span:has-text('Regulatory list')");
  await regList.waitFor({ state: 'visible', timeout: 5000 });
  await regList.click();
  await page.waitForTimeout(3000);
  console.log('  Clicked Regulatory list');
  
  // Change pagination to 100 to see all lists
  const paginationBtn = page.locator('#basic-button');
  if (await paginationBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await paginationBtn.click();
    await page.waitForTimeout(1000);
    const page100 = page.locator("li:has-text('100')");
    if (await page100.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page100.click();
      await page.waitForTimeout(2000);
    }
  }
  
  // Search for the target list in the regulatory list table
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]').first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(LIST_NAME);
    await page.waitForTimeout(2000);
  }
  
  // Click on the target list
  const listLink = page.locator(`div.link-cell:has-text('${LIST_NAME}')`).first();
  if (await listLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await listLink.click();
  } else {
    // Try alternate selector
    const altLink = page.locator(`td:has-text('${LIST_NAME}'), a:has-text('${LIST_NAME}')`).first();
    await altLink.click();
  }
  await page.waitForTimeout(3000);
  console.log(`  Clicked ${LIST_NAME}`);
  
  // Click Records tab
  const recordsTab = page.locator("button[aria-label='Records'], button:has-text('Records')").first();
  if (await recordsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await recordsTab.click();
    await page.waitForTimeout(2000);
  }
  
  console.log(`Navigated to ${LIST_NAME} records`);
}

async function searchAndOpenRecord(page: Page, listEntryId: string, sourceNaturalKey: string): Promise<boolean> {
  console.log(`  Searching for record by sourceNaturalKey: ${sourceNaturalKey}`);
  
  // Find search input on the records page
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.clear();
  await searchInput.fill(sourceNaturalKey);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  
  // Find the row and click the record ID (first td link-cell) to open profile view
  const recordIdCell = page.locator('tbody tr').first().locator('td').first().locator('div.link-cell, a, span').first();
  if (await recordIdCell.isVisible({ timeout: 5000 }).catch(() => false)) {
    await recordIdCell.click();
    await page.waitForTimeout(5000);
    console.log(`  Clicked record ID to open profile view`);
    
    // Verify profile view opened (check for PRIMARY DETAILS tab)
    const primaryTab = page.locator('button:has-text("PRIMARY DETAILS"), :text("PRIMARY DETAILS")').first();
    if (await primaryTab.isVisible({ timeout: 15000 }).catch(() => false)) {
      console.log(`  Profile view opened successfully`);
      return true;
    }
    console.log(`  Profile view did not open - PRIMARY DETAILS not visible`);
    return false;
  }
  
  console.log(`  Record ${sourceNaturalKey} not found in table`);
  return false;
}

async function captureProfileFields(page: Page, entityId: string): Promise<ProfileField[]> {
  const fields: ProfileField[] = [];
  
  // Wait for profile view modal to fully load
  await page.waitForTimeout(20000);
  
  const ssDir = path.resolve('reports/ofac-nonsdn-evidence');
  
  // Take screenshot of Primary Details tab
  await page.screenshot({ path: path.join(ssDir, `profile_${entityId}_primary.png`), fullPage: false });
  
  // Capture PRIMARY DETAILS tab content from the profile view modal
  const primaryContent = await page.evaluate(() => {
    const results: { section: string; label: string; value: string }[] = [];
    
    // The profile view is a modal/popup - look for the container with record ID header
    // It contains: record ID, status badge, version, tabs, and field sections
    const allElements = document.querySelectorAll('body *');
    let profileContainer: HTMLElement | null = null;
    
    // Find the modal that contains "PRIMARY DETAILS" and "ADDITIONAL DETAILS" tabs
    for (const el of allElements) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.innerText && htmlEl.innerText.includes('PRIMARY DETAILS') && htmlEl.innerText.includes('ADDITIONAL DETAILS')) {
        // Find the closest parent that looks like a modal/dialog
        let parent = htmlEl;
        while (parent.parentElement && !parent.classList.toString().includes('modal') && !parent.classList.toString().includes('dialog') && parent.getAttribute('role') !== 'dialog') {
          if (parent.offsetWidth > 500 && parent.offsetHeight > 400) {
            break;
          }
          parent = parent.parentElement as HTMLElement;
        }
        profileContainer = parent;
        break;
      }
    }
    
    if (!profileContainer) {
      // Fallback: get the largest visible overlay/modal
      const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="popup"], [class*="Popup"]');
      for (const m of modals) {
        const htmlM = m as HTMLElement;
        if (htmlM.offsetWidth > 400) {
          profileContainer = htmlM;
          break;
        }
      }
    }
    
    if (!profileContainer) return results;
    
    // Extract all visible text from the profile container
    const fullText = profileContainer.innerText || '';
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== 'PRIMARY DETAILS' && l !== 'ADDITIONAL DETAILS');
    
    for (let i = 0; i < lines.length; i++) {
      // Skip sidebar navigation items
      const skipWords = ['Dashboard', 'Tasks', 'AI Assistant', 'Search', 'Watchlist', 'Commercial list', 'Regulatory list', 'Press release', 'Internal list', 'Reconciliation', 'Data Export', 'Reports', 'FacctList'];
      if (skipWords.includes(lines[i])) continue;
      results.push({ section: 'Primary Details', label: `line_${results.length}`, value: lines[i] });
    }
    
    return results;
  });
  
  fields.push(...primaryContent);
  
  // Click on "ADDITIONAL DETAILS" tab
  const additionalTab = page.locator('button:has-text("ADDITIONAL DETAILS"), [role="tab"]:has-text("ADDITIONAL DETAILS")').first();
  if (await additionalTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await additionalTab.click();
    await page.waitForTimeout(3000);
    
    // Screenshot additional details tab
    await page.screenshot({ path: path.join(ssDir, `profile_${entityId}_additional.png`), fullPage: false });
    
    // Capture additional tab content
    const additionalContent = await page.evaluate(() => {
      const results: { section: string; label: string; value: string }[] = [];
      
      const allElements = document.querySelectorAll('body *');
      let profileContainer: HTMLElement | null = null;
      
      for (const el of allElements) {
        const htmlEl = el as HTMLElement;
        if (htmlEl.innerText && htmlEl.innerText.includes('PRIMARY DETAILS') && htmlEl.innerText.includes('ADDITIONAL DETAILS')) {
          let parent = htmlEl;
          while (parent.parentElement) {
            if (parent.offsetWidth > 500 && parent.offsetHeight > 400) break;
            parent = parent.parentElement as HTMLElement;
          }
          profileContainer = parent;
          break;
        }
      }
      
      if (!profileContainer) {
        const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"]');
        for (const m of modals) {
          const htmlM = m as HTMLElement;
          if (htmlM.offsetWidth > 400) { profileContainer = htmlM; break; }
        }
      }
      
      if (!profileContainer) return results;
      
      const fullText = profileContainer.innerText || '';
      const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== 'PRIMARY DETAILS' && l !== 'ADDITIONAL DETAILS');
      
      const skipWords = ['Dashboard', 'Tasks', 'AI Assistant', 'Search', 'Watchlist', 'Commercial list', 'Regulatory list', 'Press release', 'Internal list', 'Reconciliation', 'Data Export', 'Reports', 'FacctList'];
      for (let i = 0; i < lines.length; i++) {
        if (skipWords.includes(lines[i])) continue;
        results.push({ section: 'Additional Details', label: `line_${results.length}`, value: lines[i] });
      }
      return results;
    });
    
    fields.push(...additionalContent);
    
    // Go back to Primary tab
    const primaryTab = page.locator('button:has-text("PRIMARY DETAILS"), [role="tab"]:has-text("PRIMARY DETAILS")').first();
    if (await primaryTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await primaryTab.click();
      await page.waitForTimeout(1000);
    }
  }
  
  return fields;
}

async function getMongoDocument(entityId: string): Promise<Record<string, any> | null> {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(MONGO_DB);
    const collection = db.collection(COLLECTION);
    
    const doc = await collection.findOne({ listName: LIST_NAME, sourceNaturalKey: entityId });
    if (!doc) {
      return await collection.findOne({ listName: LIST_NAME, listEntryId: { $regex: entityId } });
    }
    return doc;
  } finally {
    await client.close();
  }
}

async function generateHTMLEvidence(evidenceList: EntityEvidence[]) {
  const outputPath = path.join(REPORT_DIR, 'OFAC_NON_SDN_UI_Evidence.html');
  
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>OFAC NON-SDN UI Profile View Evidence</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #f4f6f9; padding: 24px; }
  .container { max-width: 1200px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  h1 { color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 12px; }
  h2 { color: #283593; margin-top: 32px; border-left: 4px solid #3949ab; padding-left: 12px; }
  h3 { color: #37474f; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 12px; }
  th { background: #1a237e; color: #fff; padding: 8px 10px; text-align: left; }
  td { padding: 6px 10px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #f8f9fc; }
  .pass { background: #c8e6c9; color: #2e7d32; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  .warn { background: #fff3e0; color: #e65100; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  .gap { background: #ffcdd2; color: #c62828; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  img { max-width: 100%; border: 1px solid #e0e0e0; margin: 8px 0; border-radius: 4px; }
  .recommendation { background: #e3f2fd; border: 2px solid #1976d2; border-radius: 8px; padding: 20px; margin: 24px 0; }
</style></head><body><div class="container">
<h1>OFAC NON-SDN — Profile View UI Evidence</h1>
<p><strong>Date:</strong> ${new Date().toISOString().slice(0, 16)} | <strong>Environment:</strong> QA | <strong>Tenant:</strong> ${ORG_ID}</p>
`;

  for (const ev of evidenceList) {
    html += `<h2>Entity: ${ev.listEntryId} (${ev.primaryName})</h2>`;
    
    // UI Fields captured
    html += `<h3>Fields Visible in Profile View UI</h3>`;
    html += `<table><tr><th>#</th><th>Section</th><th>Field Label</th><th>Value Displayed</th></tr>`;
    ev.uiFields.forEach((f, i) => {
      html += `<tr><td>${i + 1}</td><td>${f.section}</td><td>${f.label}</td><td>${f.value?.slice(0, 100)}</td></tr>`;
    });
    html += `</table>`;
    
    // DB fields NOT in UI
    if (ev.dbOnly.length > 0) {
      html += `<h3>⚠️ DB Fields NOT Visible in UI (Potential Gaps)</h3>`;
      html += `<table><tr><th>#</th><th>DB Field</th><th>DB Value</th><th>Business Impact</th></tr>`;
      ev.dbOnly.forEach((f, i) => {
        html += `<tr><td>${i + 1}</td><td><span class="gap">GAP</span> ${f.field}</td><td>${f.value?.slice(0, 100)}</td><td></td></tr>`;
      });
      html += `</table>`;
    }
    
    // Screenshots
    for (const ss of ev.screenshots) {
      html += `<img src="${ss}" alt="Evidence screenshot" />`;
    }
  }
  
  html += `</div></body></html>`;
  
  fs.writeFileSync(outputPath, html);
  console.log(`\nEvidence report: ${outputPath}`);
}

async function main() {
  // Parse args
  const entityArg = process.argv.find(a => a.startsWith('--entity'));
  const entityIds = entityArg 
    ? [entityArg.split('=')[1] || process.argv[process.argv.indexOf('--entity') + 1]]
    : ENTITY_IDS;

  // Ensure directories
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const creds = await loadCredentials();
  if (!creds.email || !creds.password) {
    console.error('ERROR: Could not load credentials from src/config/.env.secrets');
    console.error('Set APP_USERNAME and APP_PASSWORD in .env.secrets');
    process.exit(1);
  }

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  let context: BrowserContext;
  
  // Try to reuse auth state
  if (fs.existsSync(AUTH_STATE)) {
    context = await browser.newContext({ storageState: AUTH_STATE });
  } else if (fs.existsSync(AUTH_STATE_DEFAULT)) {
    context = await browser.newContext({ storageState: AUTH_STATE_DEFAULT });
  } else {
    context = await browser.newContext();
  }
  
  const page = await context.newPage();
  
  try {
    // Login
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
    
    // Check if already logged in
    const isLoggedIn = await page.url().includes('/home') || await page.locator('text=Dashboard, text=Home').isVisible({ timeout: 3000 }).catch(() => false);
    if (!isLoggedIn) {
      await login(page, creds.email, creds.password, ORG_ID);
    }
    
    // Navigate to OFAC NON-SDN
    await navigateToOFACNonSDN(page);
    
    const evidenceList: EntityEvidence[] = [];
    
    for (const entityId of entityIds) {
      const listEntryId = `OFACNONSDN-${entityId}`;
      console.log(`\nVerifying entity: ${listEntryId}`);
      
      // Get DB document (optional - continues without it)
      let dbDoc: Record<string, any> | null = null;
      try {
        dbDoc = await getMongoDocument(entityId);
      } catch (e: any) {
        console.log(`  MongoDB unavailable: ${e.message?.slice(0, 50)}`);
        console.log(`  Continuing with UI-only capture...`);
      }
      
      // Search and open profile
      const found = await searchAndOpenRecord(page, listEntryId, entityId);
      if (!found) continue;
      
      // Capture UI fields from both tabs
      const uiFields = await captureProfileFields(page, entityId);
      
      // Compare with DB (only if dbDoc available)
      const dbOnly: { field: string; value: string }[] = [];
      if (dbDoc) {
        const importantDbFields = [
        'entityTypeName', 'primaryName', 'listEntryId', 'sourceNaturalKey',
        'additionalInformation', 'nameDetailsList', 'addressDetailsList',
        'sanctionProgramDetailsList', 'sanctionImposedIndicatorsList',
        'idNumberTypesList', 'legalAuthority', 'sanctionListDetails',
        'birthDateDetails', 'birthDateDetailsList', 'placeOfBirthDetails',
        'citizenshipDetails', 'citizenshipDetailsList', 'linkedTo',
        'vesselDetails', 'aircraftInfo', 'sourceSpecificInfoDetails',
        'roleDetails', 'lastUpdatedDateTime'
      ];
      
        for (const field of importantDbFields) {
          const val = dbDoc[field];
          if (val && ((typeof val === 'string' && val.trim()) || (Array.isArray(val) && val.length > 0) || (typeof val === 'object' && Object.keys(val).length > 0))) {
            const displayVal = typeof val === 'string' ? val : JSON.stringify(val).slice(0, 200);
            const valStr = typeof val === 'string' ? val : JSON.stringify(val);
            const isVisible = uiFields.some(f => valStr.includes(f.value) || f.value.includes(valStr.slice(0, 30)));
            if (!isVisible) {
              dbOnly.push({ field, value: displayVal });
            }
          }
        }
      }
      
      evidenceList.push({
        entityId,
        listEntryId,
        primaryName: dbDoc?.primaryName || '',
        uiFields,
        dbFields: dbDoc || {},
        matched: [],
        uiOnly: [],
        dbOnly,
        screenshots: [
          path.relative(REPORT_DIR, path.join(SCREENSHOT_DIR, `profile_${entityId}_primary.png`)),
          path.relative(REPORT_DIR, path.join(SCREENSHOT_DIR, `profile_${entityId}_additional.png`))
        ],
      });
      
      console.log(`  UI fields captured: ${uiFields.length}`);
      console.log(`  DB fields not in UI: ${dbOnly.length}`);
      
      // Close profile view
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }
    
    // Generate evidence
    await generateHTMLEvidence(evidenceList);
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
