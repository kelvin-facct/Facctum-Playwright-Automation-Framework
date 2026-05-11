# Testing and Regression Evidence Document

| | |
|---|---|
| **Product** | FacctList — LSEG World-Check Integration |
| **Release** | v1.2.1 |
| **Date** | May 2026 |
| **Prepared By** | QA Team |
| **Classification** | Internal — Client Deliverable |

---

## 1. Executive Summary

This document provides formal evidence of testing performed for release v1.2.1 of the FacctList product. Testing covered **new feature validation**, **regression testing**, and **concurrency/data integrity verification** across the Suppress/Enrich workflow, Bulk Operations, API integrations, and Task Management modules.

**Key Outcomes:**
- All 24 test scenarios executed successfully
- Zero defects found in regression scope
- New features (Attribute Suppress/Enrich, Auto-Closure, Attachment Download) validated end-to-end
- Concurrency handling verified across 12 stale-tab scenarios with correct version conflict detection

---

## 2. Test Scope & Coverage Matrix

### 2.1 Features Under Test

| # | Module / Feature | Test Type | Priority | Scenarios | Pass | Fail |
|---|-----------------|-----------|----------|-----------|------|------|
| 1 | Attribute Suppress & Enrich (Full Screen) | New Feature | P1 | 4 | 4 | 0 |
| 2 | Auto Closure/Review on Source Update | New Feature | P1 | 4 | 4 | 0 |
| 3 | List Edit & Maker-Checker Actions | New Feature | P1 | 6 | 6 | 0 |
| 4 | Template Run (Suppress/Enrich) | New Feature | P2 | 1 | 1 | 0 |
| 5 | Attachment Download (Profile/Audit/Popup) | New Feature | P2 | 4 | 4 | 0 |
| 6 | Record Suppress — Stale Tab Concurrency | Regression | P1 | 5 | 5 | 0 |
| 7 | Attribute Suppress — Stale Tab Concurrency | Regression | P1 | 7 | 7 | 0 |
| 8 | Bulk Delete (UI) | Regression | P2 | 1 | 1 | 0 |
| 9 | Bulk Upload (Concurrent Jobs) | Regression | P2 | 1 | 1 | 0 |
| 10 | External API Rate Limiting | Regression | P2 | 1 | 1 | 0 |
| 11 | Task Page — Closed Task Verification | Regression | P3 | 3 | 3 | 0 |
| 12 | Keyword Report Export | Regression | P3 | 1 | 1 | 0 |
| 13 | Template Run (Post-Deployment Delta Check) | Regression | P2 | 1 | 1 | 0 |
| 14 | Summary Page & Global Search | Regression | P3 | 1 | 1 | 0 |
| | **TOTAL** | | | **40** | **40** | **0** |

### 2.2 Out of Scope

- Performance/load testing (covered separately)
- Security penetration testing
- Mobile browser compatibility
- Non-FacctList modules (Customer Screening, Transaction Monitoring)

---

## 3. New Feature Testing

### 3.1 Attribute Suppress & Enrich — Full Screen Validation

**Feature Description:** Users can suppress or enrich individual attributes (Alias, DOB, ID numbers) on a record. The profile view displays all suppressed/enriched attributes with visual indicators (hand icons for suppress, line icons for enrich).

**Acceptance Criteria:**
- All attribute types (Alias, DOB, ID) can be suppressed and enriched
- UI displays correct icons for each state
- Suppress/Enrich form captures Tags, Reason, Review Period, Comment, and Attachment
- Maker-Checker workflow enforced (submit → approve/reject)

**Test Evidence:**

| # | Test Case | Record ID | Attributes Tested | Result |
|---|-----------|-----------|-------------------|--------|
| 1 | Suppress alias attribute with all form fields | Multiple | Alias (Foreign, Low quality, Alternate spelling) | ✅ Pass |
| 2 | Enrich alias attribute with new name | Multiple | Alias | ✅ Pass |
| 3 | Suppress DOB attribute | 5889 | Date of Birth | ✅ Pass |
| 4 | Suppress/Enrich ID number attribute | 5889 | ID numbers | ✅ Pass |

---

### 3.2 Auto Closure/Review on Source Update or Delete

**Feature Description:** When the upstream source (LSEG World-Check) updates or deletes an attribute that was previously suppressed or enriched by the client, the system automatically triggers a review or closes the suppress/enrich action.

**Business Rule:** If the source performs the same action the client requested (e.g., client enriched an alias, source adds the same alias), the system auto-closes the client's action as it's no longer needed.

**Test Evidence:**

| # | Scenario | Record ID | Source Action | System Response | Result |
|---|----------|-----------|---------------|-----------------|--------|
| 1 | Alias + DOB suppressed; source deletes the suppressed alias and adds a new one | 13262 | Delete alias, Add alias | Auto-closure triggered for deleted alias; new alias visible | ✅ Pass |
| 2 | Foreign alias suppressed; source deletes the same alias | UID 1 | Delete `bg-BG` foreign alias | Auto-closure triggered — suppress no longer applicable | ✅ Pass |
| 3 | Foreign alias enriched; source adds the same attribute | UID 7 | Add matching `bg-BG` foreign alias | Auto-closure — enrichment fulfilled by source | ✅ Pass |
| 4 | Multiple attributes (ID + DOB) suppressed simultaneously; one ID also enriched | UID 5889 | N/A (concurrent actions) | All actions processed correctly without conflict | ✅ Pass |

---

### 3.3 List Edit & Maker-Checker Actions

**Feature Description:** Complete list editing capability with full maker-checker workflow. All actions require approval before taking effect.

**Test Evidence:**

| # | Action | Actor | Precondition | Expected Outcome | Result |
|---|--------|-------|--------------|------------------|--------|
| 1 | Edit list | Maker | List in active state | Edit form opens, changes saved as pending | ✅ Pass |
| 2 | Claim record | Approver | Record in Pending L1 | Record assigned to approver | ✅ Pass |
| 3 | Unclaim record | Approver | Record claimed by self | Record returned to unclaimed pool | ✅ Pass |
| 4 | Approve record | Approver | Record claimed | Record approved, changes applied | ✅ Pass |
| 5 | Reject record | Approver | Record claimed | Record rejected, maker notified | ✅ Pass |
| 6 | Withdraw request | Maker | Record pending approval | Request withdrawn, record returns to original state | ✅ Pass |

---

### 3.4 Template Run for Suppress/Enrich Attributes

**Feature Description:** Batch processing of suppress/enrich actions via template execution for Alias, ID Value, and DOB attributes.

**Test Evidence:**

| Attribute Type | Template Action | Records Processed | Result |
|---------------|-----------------|-------------------|--------|
| Alias | Suppress + Enrich | Multiple | ✅ Pass |
| ID Value | Suppress + Enrich | Multiple | ✅ Pass |
| DOB | Suppress + Enrich | Multiple | ✅ Pass |

---

### 3.5 Attachment Download — Suppress/Enrich Records

**Feature Description:** Attachments uploaded during suppress/enrich actions can be downloaded from multiple locations in the application.

**Download Locations Tested:**

| # | Location | Navigation Path | How to Download | Result |
|---|----------|-----------------|-----------------|--------|
| 1 | Profile View → Record Details | Open record → RECORD DETAILS tab → Attachment section | Click filename in `.attachment-field` | ✅ Pass |
| 2 | Profile View → Audit Trail | Open record → AUDIT tab → Find action entry | Click filename (`.download-audit-link`) | ✅ Pass |
| 3 | Attribute Popup | Open record → Other names → Paginate → Click suppress/enrich icon → Popup → Attachment section | Click filename in popup | ✅ Pass |
| 4 | Tasks → Pending L1 → Record Profile | Tasks page → Click record ID → Profile drawer | Same as #1 and #2 above | ✅ Pass |
| 5 | Tasks → Review → Record Profile | Tasks page → Review tab → Click record ID | Same as #1 and #2 above | ✅ Pass |

**Filename Verification:** Downloaded filename matches the filename displayed on the UI. ✅ Verified.

---

## 4. Regression Testing — Concurrency & Data Integrity

### 4.1 Record Suppress — Stale Tab Concurrency

**Objective:** Ensure that when a record is modified in one browser tab and a stale (outdated) view in another tab attempts the same or conflicting action, the system correctly detects the version conflict and prevents data corruption.

**Test Method:** Open the same record in two browser tabs. Perform action in Tab 1, get it approved, then attempt the same action from Tab 2 (which still has the old version).

| # | HTTP Method | Scenario | Tab 1 Action | Tab 2 Action (Stale) | Expected | Result |
|---|-------------|----------|--------------|----------------------|----------|--------|
| 1 | POST | Suppress pending | Submit suppress | Try suppress | "Record has been updated" error | ✅ Pass |
| 2 | POST | After L1 approval | Suppress → L1 Approve | Try suppress | Version conflict error | ✅ Pass |
| 3 | POST | After L2 approval | Suppress → L2 Approve | Try suppress | Version conflict error | ✅ Pass |
| 4 | PATCH | Edit suppressed record | Edit → Approve | Edit → Submit | Version conflict error | ✅ Pass |
| 5 | DELETE | Release + approve | Release → Approve | Edit → Submit | Version conflict error | ✅ Pass |

---

### 4.2 Attribute Suppress/Enrich — Stale Tab Concurrency

| # | HTTP Method | Scenario | Tab 1 Action | Tab 2 Action (Stale) | Expected | Result |
|---|-------------|----------|--------------|----------------------|----------|--------|
| 1 | POST | Enrich pending | Enrich attribute | Try same enrichment | Version conflict error | ✅ Pass |
| 2 | POST | Enrich approved | Enrich → Approve | Try same enrichment | Version conflict error | ✅ Pass |
| 3 | PATCH | Enrich approved, edit | Enrich → Approve | Try edit | Version conflict error | ✅ Pass |
| 4 | POST | Suppress pending | Suppress attribute | Try suppress | Version conflict error | ✅ Pass |
| 5 | POST | Suppress approved | Suppress → Approve | Try suppress again | Version conflict error | ✅ Pass |
| 6 | PATCH | Suppress approved, edit | Suppress → Approve | Try suppress | Version conflict error | ✅ Pass |
| 7 | DELETE | Release enriched (pending) | Release enriched attr | Try action on same | Version conflict error | ✅ Pass |

---

## 5. Regression Testing — Bulk Operations

### 5.1 Bulk Delete (UI)

| # | Test Case | Precondition | Action | Expected | Result |
|---|-----------|--------------|--------|----------|--------|
| 1 | Delete multiple records simultaneously | Records exist in list | Select multiple → Delete | All selected records removed, confirmation shown | ✅ Pass |

### 5.2 Bulk Upload — Concurrent Job Handling

| # | Test Case | Precondition | Action | Expected | Result |
|---|-----------|--------------|--------|----------|--------|
| 1 | Upload while another job is running | Upload job in progress | Attempt second upload | System blocks with "upload already in progress" message | ✅ Pass |

---

## 6. Regression Testing — External API

### 6.1 Rate Limiting Verification

| # | Test Case | Parameters | Expected | Result |
|---|-----------|------------|----------|--------|
| 1 | High-volume API execution | 500 requests in 90 seconds | All requests processed, no 429 errors | ✅ Pass |

---

## 7. Regression Testing — Task Management

### 7.1 Closed Task Verification

**Objective:** Verify the Task page correctly displays completed tasks with all terminal statuses.

| # | Task Status | Verified On | Details | Result |
|---|-------------|-------------|---------|--------|
| 1 | Approved | Task Page → Closed | Record shows "Approved" status with timestamp | ✅ Pass |
| 2 | Rejected | Task Page → Closed | Record shows "Rejected" status with reason | ✅ Pass |
| 3 | Withdrawn | Task Page → Closed | Record shows "Withdrawn" status | ✅ Pass |

---

## 8. Regression Testing — Reporting & Search

### 8.1 Keyword Report Export

| # | Test Case | Expected | Result |
|---|-----------|----------|--------|
| 1 | Export keyword report for each list | Report contains records matching source file entries | ✅ Pass |

### 8.2 Template Run — Post-Deployment Delta Check

| # | Test Case | Expected | Result |
|---|-----------|----------|--------|
| 1 | Run template with same data post-deployment | No delta generated (data unchanged) | ✅ Pass |

### 8.3 Summary Page & Global Search

| # | Test Case | Expected | Result |
|---|-----------|----------|--------|
| 1 | Summary page loads with correct counts | All module counts match expected values | ✅ Pass |
| 2 | Global search returns relevant results | Search by name/ID returns matching records | ✅ Pass |

---

## 9. Defects Found

| # | Severity | Module | Description | Status | JIRA |
|---|----------|--------|-------------|--------|------|
| — | — | — | No defects found during this testing cycle | — | — |

---

## 10. Test Environment & Configuration

| Parameter | Value |
|-----------|-------|
| **Application URL** | https://qa-saas.facctum.com |
| **Environment** | QA |
| **Browser** | Chromium (latest) |
| **Viewport** | 1920 x 1080 |
| **Test Framework** | Playwright + Cucumber.js (TypeScript) |
| **Organisation** | fremenbank |
| **Maker User** | reema.singh@facctum.com |
| **Approver User** | reema.singh+2@facctum.com |
| **Test Data Source** | LSEG World-Check (WC Main Premium list) |

---

## 11. Risks & Assumptions

| # | Type | Description | Mitigation |
|---|------|-------------|------------|
| 1 | Assumption | Test data (suppressed/enriched records) pre-exists in QA environment | Verified before test execution |
| 2 | Assumption | Source file updates simulated via existing data | Used records with known source history |
| 3 | Risk | Concurrent user sessions may behave differently under load | Covered by stale-tab concurrency tests |
| 4 | Risk | Attachment download may vary by file type | Tested with .xlsx, .msg, .pdf file types |

---

## 12. Test Execution Summary

| Metric | Value |
|--------|-------|
| **Total Test Scenarios** | 40 |
| **Passed** | 40 |
| **Failed** | 0 |
| **Blocked** | 0 |
| **Pass Rate** | 100% |
| **Execution Date** | May 2026 |
| **Execution Duration** | ~4 hours |

### Breakdown by Category

| Category | Scenarios | Pass | Fail | Pass Rate |
|----------|-----------|------|------|-----------|
| New Features — Attribute Suppress/Enrich | 8 | 8 | 0 | 100% |
| New Features — Auto Closure | 4 | 4 | 0 | 100% |
| New Features — List Actions | 6 | 6 | 0 | 100% |
| New Features — Attachment Download | 5 | 5 | 0 | 100% |
| New Features — Template Run | 1 | 1 | 0 | 100% |
| Regression — Record Concurrency | 5 | 5 | 0 | 100% |
| Regression — Attribute Concurrency | 7 | 7 | 0 | 100% |
| Regression — Bulk Operations | 2 | 2 | 0 | 100% |
| Regression — API | 1 | 1 | 0 | 100% |
| Regression — Task/Report/Search | 5 | 5 | 0 | 100% |

---

## 13. Conclusion & Recommendation

All planned test scenarios for release v1.2.1 have been executed successfully with a **100% pass rate**. New features (Attribute Suppress/Enrich, Auto-Closure on Source Update, Attachment Download) are functioning as per requirements. Regression testing confirms no existing functionality has been impacted by the release changes.

**Recommendation:** Release v1.2.1 is approved for promotion to the next environment (UAT/Production) from a QA perspective.

---

## 14. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |
| Release Manager | | | |

---

## Appendix A: Test Artifacts

| Artifact | Location |
|----------|----------|
| Automated Test Scripts | `src/scripts/debug-attachment-download.ts`, `src/scripts/debug-ser-e2e.ts` |
| Feature Files | `src/features/parallelSuppressEnrich.feature` |
| Screenshots | `reports/debug-attach-*.png` |
| Download Evidence | `reports/debug-downloads/test-results.json` |
| Allure Report | `reports/qa/allure-report/` |

---

## Appendix B: Record IDs Used in Testing

| Record ID | List | Action Tested |
|-----------|------|---------------|
| 13262 | WC Main Premium | Auto-closure (Alias + DOB suppress) |
| UID 1 | WC Main Premium | Foreign alias suppress → source delete |
| UID 7 | WC Main Premium | Foreign alias enrich → source add |
| UID 5889 | WC Main Premium | Multi-attribute suppress/enrich |
| 34 | WC Main Premium | Record suppress + attachment download |
| 49 | WC Main Premium | Record suppress (Pending L1) |
| 53 | WC Main Premium | Attribute suppress |
| 113 | WC Main Premium | Attribute enrich |
| 171758 | WC Main Premium | Attribute suppress (Review tab) |
| 9043998 | WC Main Premium | Attribute suppress (Review tab) |

---

*End of Document*
