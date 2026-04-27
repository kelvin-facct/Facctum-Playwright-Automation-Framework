# Parallel Testing Requirement: Suppress/Enrich on Commercial List Records

## Objective

Automate parallel testing of Suppress/Enrich, Suppress Attribute, Enrich Attribute, and Edit Profile operations on WC Main Premium commercial list records using two browser tabs simultaneously.

## Pre-Conditions

- User must be logged in to Facctum platform
- User must have access to List Management > Watchlist > Commercial List
- WC Main Premium list must be available
- A clean record must be identified (see Record Selection Criteria below)

## Navigation Flow

```
Login → Home Page
  → Click "List Management" card
  → Click "Watchlist" dropdown
  → Click "Commercial list"
  → Search for "WC Main Premium"
  → Click on "WC Main Premium" link
  → Record list opens
```

## Record Selection Criteria

From the record list, identify a record that meets ALL of the following:

### Icons to Check (in the Record ID column area)

Each record row can have these icons next to the Record ID:

| Icon | Description | Meaning |
|------|-------------|---------|
| Orange hand icon 👆 | Suppress/Enrich indicator | Record has existing suppress/enrich action |
| Purple lines icon ≡ | Enrichment indicator | Record has existing enrichment |
| Purple pencil icon ✏ | Edit indicator | Record has pending edit |

### Selection Rule

Select a record where NONE of the above 3 icons are present. The record should only show:
- Checkbox (blue square)
- Record ID number (clickable link)
- Primary Name

Example of a GOOD record (no icons):
```
☐ 12                          Some Name
```

Example of a BAD record (has icons — skip these):
```
☐ 105 👆 ≡✏                   Olav AKSELSEN
☐ 102 👆                       Danial AKHMETOV
```

### Profile View Validation

After clicking on a Record ID link:
1. A Profile View shutter/panel opens on the right
2. Check for the warning banner: "⚠ Warning: This record is already pending approval."
3. If the warning IS present → Close this profile, go back, and try the next record
4. If the warning is NOT present → This record is clean and ready for testing

### Record Selection Algorithm

```
1. Open WC Main Premium record list
2. FOR each record in the list:
   a. Check if record has any of the 3 icons (orange hand, purple lines, purple pencil)
   b. IF icons present → skip, continue to next record
   c. IF no icons → click on Record ID link
   d. Profile View opens
   e. Check for "This record is already pending approval" warning
   f. IF warning present → close profile, continue to next record
   g. IF no warning → FOUND clean record, proceed to testing
3. IF no clean record found on current page → paginate to next page and repeat
```

## Test Execution Flow (Per Test Case)

Once a clean record is identified:

### Phase 1: Setup Two Browser Windows
1. Note the Record ID and profile URL
2. Window 1 (Maker): Keep the current browser with the profile open — this is the maker's session
3. Window 2 (Approver): Open a separate browser or incognito window, login as approver user
4. Both windows have the same record open but in separate sessions (maker vs approver)
5. The maker's window (Window 1) will remain open with the stale view throughout the approval process

### Phase 2: Maker Action (Window 1)
Based on the test case type, the maker performs the action in Window 1:

#### For Suppress/Enrich Record (SER test cases):
1. In Window 1 (Maker): Click Suppress/Enrich button on the record
2. Select from dropdown: Tags (multi-select), Reason, Review Period
3. Optionally enter Comment (text input, max 200 chars)
4. Optionally upload Attachment (file upload)
5. Click Submit
6. Perform workflow action (Approve / Reject / Withdraw)

#### For Suppress Attribute (SA test cases):
1. In Window 1 (Maker): In Profile View, locate the attribute section (Other names / ID numbers / Date of birth)
2. Find the specific attribute row to suppress
3. Click the blue hand icon (suppress icon) on that row
4. A popup dialog "Suppress attribute request" opens showing the attribute details
5. Select from dropdown: Tags (multi-select), Reason, Review Period
6. Optionally enter Comment (text input)
7. Click SUPPRESS button in the popup
8. Click Submit button to send for approval
9. Perform workflow action (Approve / Reject / Withdraw)

#### For Enrich Attribute (EA test cases):
Enrichment is triggered from the Profile View by clicking the Add/Enrich button ("+") on a specific section:

1. In Window 1 (Maker): In Profile View, locate the section to enrich:
   - "Other names" section → to add a new alias
   - "ID numbers" section → to add a new ID
   - "Date of birth" section → to add a new DOB
2. Click the Add/Enrich button on that section
3. A popup dialog "Add attribute request" opens with fields:

   **For Other names (Alias):**
   | Field | Input Type | Value |
   |-------|-----------|-------|
   | Type | Dropdown | Select from available types (e.g., Alias, Also Known As) |
   | Language code | Dropdown | Select language code |
   | Name | Text input | Enter random test name (e.g., "Test_Alias_timestamp") |

   **For ID numbers:**
   | Field | Input Type | Value |
   |-------|-----------|-------|
   | Type | Dropdown | Select ID type |
   | ID number | Text input | Enter random test ID |

   **For Date of birth:**
   | Field | Input Type | Value |
   |-------|-----------|-------|
   | Date | Text/Date input | Enter random test date |

   **Common fields in the popup (all enrichment types):**
   | Field | Input Type | Value |
   |-------|-----------|-------|
   | Suppress/enrich tags | Dropdown (multi-select) | Select tag(s) |
   | Reason | Dropdown | Select reason |
   | Review period | Dropdown | Select review period |
   | Comment | Text input (optional, max 200 chars) | Enter comment or leave empty |

4. Click ADD button to submit the enrichment request
5. Request goes for approval workflow
6. Perform workflow action (Approve / Reject / Withdraw)

#### For Edit Profile View (EPV test cases):
- No-Change tests: Click Edit, make no changes, verify Submit is disabled
- Suppress in Edit: Click Edit, suppress an attribute, verify it goes for approval
- Enrich in Edit: Click Edit, enrich an attribute, verify it goes for approval

### Phase 3: Approval Workflow (Window 2 — Approver in separate browser/incognito)
1. Switch to Window 2 (approver session in separate browser or incognito)
2. Login as approver user
3. Navigate to Tasks → Pending approvals
4. Find the request submitted by the maker in Phase 2
5. Claim the request
6. Perform workflow action:
   - Approve → record/attribute state changes
   - Reject → record/attribute state stays unchanged, audit captured
   - Withdraw (done by maker in Window 1 instead) → state stays unchanged, audit captured

### Phase 4: Parallel Conflict Test (Back to Window 1 — Maker's stale view)
1. Switch back to Window 1 (maker's browser — still has the OLD/stale version of the record)
2. DO NOT refresh the page — the view must remain stale
3. Perform the SAME action as Phase 2 with the SAME values on the stale record
4. Click Submit

### Phase 5: Validate Expected Outcome

| Approver Action (Window 2) | Maker's Stale Action (Window 1) Expected Behavior |
|---------------------------|--------------------------------------------------|
| Approve | Window 1 should get version conflict error (record was already modified and approved) |
| Reject | Window 1 should proceed normally (record state unchanged, no conflict) |
| Withdraw | Window 1 should proceed normally (record state unchanged, no conflict) |

For all workflows: Audit trail should be captured.

## Test Cases Reference

Test cases are generated by: `scripts/generate_parallel_test_cases.py`

Output Excel: `Parallel_TestCases_<timestamp>.xlsx`

### Sheet Summary (Pairwise — minimum cases, best coverage)

| Sheet | Test Cases | Description |
|-------|-----------|-------------|
| Suppress Enrich Record | 9 | Record-level suppress/enrich with all workflow permutations |
| Edit Profile View | 29 | No-change validation (3) + Suppress in edit (12) + Enrich in edit (14) |
| Suppress Attribute | 12 | Suppress Alias/DOB/ID one by one |
| Enrich Attribute | 14 | Enrich Alias/DOB/ID one by one |
| Total | 64 | Pairwise optimized from 2,328 full permutations |

### Test Parameters

| Parameter | Values |
|-----------|--------|
| Suppress/Enrich Tags | Tag_1, Tag_2, Tag_1+Tag_2 (multi-select) |
| Reason | Reason_1, Reason_2 |
| Review Period | ReviewPeriod_1, ReviewPeriod_2 |
| Comment | With Comment, Without Comment |
| Attachment | With Attachment, Without Attachment |
| Workflow Action | Approve, Reject, Withdraw |
| Attribute Type | Alias, DOB, ID |
| Attribute Row | Row 1, Row 2 |
| Alias Type | Type_1, Type_2 |
| Language Code | LangCode_1, LangCode_2 |
| Name | Name_1, Name_2 |

## Workflow Rules

- Approve: Record/attribute state changes. Audit captured. Tab2 gets version conflict.
- Reject: Record/attribute state stays unchanged. Audit captured. Tab2 proceeds normally.
- Withdraw: Record/attribute state stays unchanged. Audit captured. Tab2 proceeds normally.
- One record can have multiple suppressions and enrichments (done one by one, not in bulk).

## Automation Artifacts to Create

| File | Purpose |
|------|---------|
| `src/features/parallelSuppressEnrich.feature` | Gherkin feature file with all scenarios |
| `src/pages/CommercialListPage.ts` | Page object for commercial list navigation and record selection |
| `src/pages/ProfileViewPage.ts` | Page object for profile view shutter (suppress, enrich, edit) |
| `src/stepDefinitions/parallelSuppressEnrich.steps.ts` | Step definitions for all parallel test steps |
| Update `src/pages/PageManager.ts` | Register new page objects |

## Notes

- After each test case, the record may need to be reset or a new clean record found
- For Reject/Withdraw cases, the same record can be reused since state doesn't change
- For Approve cases, a new clean record is needed since the state changed
- Pagination may be needed if clean records are not on the first page
