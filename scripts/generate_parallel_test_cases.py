#!/usr/bin/env python3
"""
Generate MINIMUM test cases with BEST COVERAGE using pairwise testing.
Instead of full permutations (2328 cases), uses pairwise coverage to ensure
every pair of parameter values is tested at least once.

Sheets:
1. Suppress Enrich Record
2. Edit Profile View
3. Suppress Attribute (Alias/DOB/ID one by one)
4. Enrich Attribute (Alias/DOB/ID one by one)
5. Summary

Workflow: Approve/Reject/Withdraw
- Approve: state changes, Tab2 gets version conflict
- Reject/Withdraw: state unchanged, audit captured, Tab2 proceeds normally
"""
import pandas as pd
from datetime import datetime
from openpyxl.styles import Alignment
from itertools import product


OUTPUT_FILE = r"C:\Users\ReemaSingh\Downloads\Parallel_TestCases_{}.xlsx".format(
    datetime.now().strftime("%Y%m%d_%H%M%S")
)


def pairwise(params):
    """
    Generate pairwise test combinations.
    params: dict of {param_name: [values]}
    Returns list of dicts with one value per param, covering all pairs.
    """
    names = list(params.keys())
    values = [params[n] for n in names]
    
    if len(names) <= 2:
        # For 2 or fewer params, full product is already minimal
        combos = list(product(*values))
        return [dict(zip(names, c)) for c in combos]
    
    # Track which pairs we need to cover
    all_pairs = set()
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            for vi in values[i]:
                for vj in values[j]:
                    all_pairs.add((i, j, vi, vj))
    
    results = []
    uncovered = set(all_pairs)
    
    while uncovered:
        best_combo = None
        best_score = -1
        
        # Try random-ish candidates to find one that covers most uncovered pairs
        for combo in product(*values):
            score = 0
            for i in range(len(names)):
                for j in range(i + 1, len(names)):
                    if (i, j, combo[i], combo[j]) in uncovered:
                        score += 1
            if score > best_score:
                best_score = score
                best_combo = combo
            if best_score == len(uncovered):
                break
        
        if best_combo is None or best_score == 0:
            break
        
        # Mark pairs as covered
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                uncovered.discard((i, j, best_combo[i], best_combo[j]))
        
        results.append(dict(zip(names, best_combo)))
    
    return results


def get_expected(action, entity):
    if action == "Approve":
        return (
            f"Tab1: {entity} submitted & approved. State changes. Audit captured.\n"
            f"Tab2: Version conflict - stale version error or flagged as conflicting change."
        )
    elif action == "Reject":
        return (
            f"Tab1: {entity} submitted & rejected. State unchanged. Audit captured.\n"
            f"Tab2: Proceeds normally since Tab1 rejection didn't change state."
        )
    else:
        return (
            f"Tab1: {entity} submitted & withdrawn. State unchanged. Audit captured.\n"
            f"Tab2: Proceeds normally since Tab1 withdrawal didn't change state."
        )


def fmt(ws, n):
    for col in ws.columns:
        mx = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(mx + 2, 55)
    for row in ws.iter_rows(min_row=2, max_row=n + 1):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical='top')


# ===================== SHEET 1: Suppress/Enrich Record =====================
def gen_suppress_enrich_record():
    combos = pairwise({
        "Tags": ["Tag_1", "Tag_2", "Tag_1, Tag_2"],
        "Reason": ["Reason_1", "Reason_2"],
        "Review Period": ["ReviewPeriod_1", "ReviewPeriod_2"],
        "Comment": ["With Comment", "Without Comment"],
        "Attachment": ["With Attachment", "Without Attachment"],
        "Workflow": ["Approve", "Reject", "Withdraw"]
    })
    rows = []
    for i, c in enumerate(combos, 1):
        t, r, rv, cm, a, w = c["Tags"], c["Reason"], c["Review Period"], c["Comment"], c["Attachment"], c["Workflow"]
        cmt = f"'Comment {i}'" if cm == "With Comment" else "Empty"
        att = "test_file.pdf" if a == "With Attachment" else "None"
        act = {"Approve": "Claim and APPROVE", "Reject": "Claim and REJECT", "Withdraw": "WITHDRAW (by submitter)"}[w]
        rows.append({
            "Test Case ID": f"SER-TC{i:03d}",
            "Tags": t, "Reason": r, "Review Period": rv,
            "Comment": cm, "Attachment": a, "Tab1 Workflow": w,
            "Tab1 Steps": (
                f"1. Login and open profile record\n"
                f"2. Open same profile in Tab1 and Tab2\n"
                f"3. Tab1: Click Suppress/Enrich on record\n"
                f"4. Select Tags: {t}\n"
                f"5. Select Reason: {r}\n"
                f"6. Select Review period: {rv}\n"
                f"7. Comment: {cmt}\n"
                f"8. Attachment: {att}\n"
                f"9. Click Submit\n"
                f"10. {act} the request"
            ),
            "Tab2 Steps": (
                f"11. Switch to Tab2 (stale version)\n"
                f"12. Click Suppress/Enrich on same record\n"
                f"13. Select Tags: {t}, Reason: {r}, Review: {rv}\n"
                f"14. Comment: {cmt}, Attachment: {att}\n"
                f"15. Click Submit"
            ),
            "Expected Outcome": get_expected(w, "Suppress/Enrich record")
        })
    return pd.DataFrame(rows)


# ===================== SHEET 2: Edit Profile View =====================
def gen_edit_profile():
    rows = []
    tc = 0

    # --- PART A: No-change submission tests (should NOT allow submit) ---
    no_change_scenarios = [
        ("Tab1 only", "Click Edit in Tab1, make NO changes, try Submit"),
        ("Tab2 only", "Click Edit in Tab2, make NO changes, try Submit"),
        ("Both tabs", "Click Edit in both Tab1 and Tab2, make NO changes, try Submit in both"),
    ]
    for scenario, desc in no_change_scenarios:
        tc += 1
        rows.append({
            "Test Case ID": f"EPV-TC{tc:03d}",
            "Test Type": "No-Change Submission",
            "Scenario": scenario,
            "Action in Edit": "No changes made",
            "Attribute Type": "N/A", "Attribute Row": "N/A",
            "Tags": "N/A", "Reason": "N/A", "Review Period": "N/A",
            "Comment": "N/A", "Tab1 Workflow": "N/A",
            "Tab1 Steps": (
                f"1. Login and open profile record\n"
                f"2. Open same profile in Tab1 and Tab2\n"
                f"3. {desc}\n"
                f"4. Attempt to click Save/Submit without any changes"
            ),
            "Tab2 Steps": (
                f"5. Repeat same in other tab if applicable"
            ),
            "Expected Outcome": (
                f"Submit/Save button should be DISABLED or show validation error.\n"
                f"System should NOT allow submission without any changes to the profile."
            )
        })

    # --- PART B: Suppress attribute in Edit Profile mode → goes for approval ---
    suppress_combos = pairwise({
        "Attribute Type": ["Alias", "DOB", "ID"],
        "Attribute Row": ["Row 1", "Row 2"],
        "Tags": ["Tag_1", "Tag_2", "Tag_1, Tag_2"],
        "Reason": ["Reason_1", "Reason_2"],
        "Review Period": ["ReviewPeriod_1", "ReviewPeriod_2"],
        "Comment": ["With Comment", "Without Comment"],
        "Workflow": ["Approve", "Reject", "Withdraw"]
    })
    for c in suppress_combos:
        tc += 1
        at, ar = c["Attribute Type"], c["Attribute Row"]
        t, r, rv, cm, w = c["Tags"], c["Reason"], c["Review Period"], c["Comment"], c["Workflow"]
        cmt = f"'Comment {tc}'" if cm == "With Comment" else "Empty"
        act = {"Approve": "Claim and APPROVE", "Reject": "Claim and REJECT", "Withdraw": "WITHDRAW (by submitter)"}[w]
        rows.append({
            "Test Case ID": f"EPV-TC{tc:03d}",
            "Test Type": "Suppress in Edit Mode",
            "Scenario": f"Suppress {at} {ar} in edit mode",
            "Action in Edit": f"Suppress {at}",
            "Attribute Type": at, "Attribute Row": ar,
            "Tags": t, "Reason": r, "Review Period": rv,
            "Comment": cm, "Tab1 Workflow": w,
            "Tab1 Steps": (
                f"1. Login and open profile record\n"
                f"2. Open same profile in Tab1 and Tab2\n"
                f"3. Tab1: Click Edit Profile\n"
                f"4. Select {at} section > {ar}\n"
                f"5. Click Suppress on {at} row\n"
                f"6. Tags: {t}, Reason: {r}, Review: {rv}\n"
                f"7. Comment: {cmt}\n"
                f"8. Click SUPPRESS → request goes for approval\n"
                f"9. {act} the suppress request"
            ),
            "Tab2 Steps": (
                f"10. Switch to Tab2 (stale version)\n"
                f"11. Click Edit Profile\n"
                f"12. Suppress same {at} {ar} with same values\n"
                f"13. Click SUPPRESS"
            ),
            "Expected Outcome": get_expected(w, f"{at} {ar} suppress via Edit Profile")
        })

    # --- PART C: Enrich attribute in Edit Profile mode → goes for approval ---
    enrich_combos = pairwise({
        "Attribute Type": ["Alias", "DOB", "ID"],
        "Type": ["Type_1", "Type_2"],
        "Language Code": ["LangCode_1", "LangCode_2"],
        "Name": ["Name_1", "Name_2"],
        "Tags": ["Tag_1", "Tag_2", "Tag_1, Tag_2"],
        "Reason": ["Reason_1", "Reason_2"],
        "Review Period": ["ReviewPeriod_1", "ReviewPeriod_2"],
        "Comment": ["With Comment", "Without Comment"],
        "Workflow": ["Approve", "Reject", "Withdraw"]
    })
    for c in enrich_combos:
        tc += 1
        eat, at, al, an = c["Attribute Type"], c["Type"], c["Language Code"], c["Name"]
        t, r, rv, cm, w = c["Tags"], c["Reason"], c["Review Period"], c["Comment"], c["Workflow"]
        cmt = f"'Comment {tc}'" if cm == "With Comment" else "Empty"
        act = {"Approve": "Claim and APPROVE", "Reject": "Claim and REJECT", "Withdraw": "WITHDRAW (by submitter)"}[w]
        rows.append({
            "Test Case ID": f"EPV-TC{tc:03d}",
            "Test Type": "Enrich in Edit Mode",
            "Scenario": f"Enrich {eat} in edit mode",
            "Action in Edit": f"Enrich {eat}",
            "Attribute Type": eat, "Attribute Row": "New",
            "Tags": t, "Reason": r, "Review Period": rv,
            "Comment": cm, "Tab1 Workflow": w,
            "Tab1 Steps": (
                f"1. Login and open profile record\n"
                f"2. Open same profile in Tab1 and Tab2\n"
                f"3. Tab1: Click Edit Profile\n"
                f"4. Click Add/Enrich on {eat} section\n"
                f"5. Type: {at}, Language code: {al}, Name: {an}\n"
                f"6. Tags: {t}, Reason: {r}, Review: {rv}\n"
                f"7. Comment: {cmt}\n"
                f"8. Click ADD → request goes for approval\n"
                f"9. {act} the enrich request"
            ),
            "Tab2 Steps": (
                f"10. Switch to Tab2 (stale version)\n"
                f"11. Click Edit Profile\n"
                f"12. Add/Enrich same {eat} with same values\n"
                f"13. Click ADD"
            ),
            "Expected Outcome": get_expected(w, f"{eat} enrichment via Edit Profile")
        })

    return pd.DataFrame(rows)


# ===================== SHEET 3: Suppress Attribute =====================
def gen_suppress_attribute():
    combos = pairwise({
        "Attribute Type": ["Alias", "DOB", "ID"],
        "Attribute Row": ["Row 1", "Row 2"],
        "Tags": ["Tag_1", "Tag_2", "Tag_1, Tag_2"],
        "Reason": ["Reason_1", "Reason_2"],
        "Review Period": ["ReviewPeriod_1", "ReviewPeriod_2"],
        "Comment": ["With Comment", "Without Comment"],
        "Workflow": ["Approve", "Reject", "Withdraw"]
    })
    rows = []
    for i, c in enumerate(combos, 1):
        at, ar, t, r, rv, cm, w = c["Attribute Type"], c["Attribute Row"], c["Tags"], c["Reason"], c["Review Period"], c["Comment"], c["Workflow"]
        cmt = f"'Comment {i}'" if cm == "With Comment" else "Empty"
        act = {"Approve": "Claim and APPROVE", "Reject": "Claim and REJECT", "Withdraw": "WITHDRAW (by submitter)"}[w]
        rows.append({
            "Test Case ID": f"SA-TC{i:03d}",
            "Attribute Type": at, "Attribute Row": ar,
            "Tags": t, "Reason": r, "Review Period": rv,
            "Comment": cm, "Tab1 Workflow": w,
            "Tab1 Steps": (
                f"1. Login and open profile record in Profile View\n"
                f"2. Open same profile in Tab1 and Tab2\n"
                f"3. Tab1: Select {at} section > {ar}\n"
                f"4. Click Suppress on selected {at} row\n"
                f"5. Select Tags: {t}\n"
                f"6. Select Reason: {r}\n"
                f"7. Select Review period: {rv}\n"
                f"8. Comment: {cmt}\n"
                f"9. Click SUPPRESS button\n"
                f"10. {act} the suppress request"
            ),
            "Tab2 Steps": (
                f"11. Switch to Tab2 (stale version)\n"
                f"12. Select same {at} section > {ar}\n"
                f"13. Click Suppress, Tags: {t}, Reason: {r}, Review: {rv}\n"
                f"14. Comment: {cmt}\n"
                f"15. Click SUPPRESS button"
            ),
            "Expected Outcome": get_expected(w, f"{at} {ar} suppress")
        })
    return pd.DataFrame(rows)


# ===================== SHEET 4: Enrich Attribute =====================
def gen_enrich_attribute():
    combos = pairwise({
        "Attribute Type": ["Alias", "DOB", "ID"],
        "Type": ["Type_1", "Type_2"],
        "Language Code": ["LangCode_1", "LangCode_2"],
        "Name": ["Name_1", "Name_2"],
        "Tags": ["Tag_1", "Tag_2", "Tag_1, Tag_2"],
        "Reason": ["Reason_1", "Reason_2"],
        "Review Period": ["ReviewPeriod_1", "ReviewPeriod_2"],
        "Comment": ["With Comment", "Without Comment"],
        "Workflow": ["Approve", "Reject", "Withdraw"]
    })
    rows = []
    for i, c in enumerate(combos, 1):
        eat, at, al, an = c["Attribute Type"], c["Type"], c["Language Code"], c["Name"]
        t, r, rv, cm, w = c["Tags"], c["Reason"], c["Review Period"], c["Comment"], c["Workflow"]
        cmt = f"'Comment {i}'" if cm == "With Comment" else "Empty"
        act = {"Approve": "Claim and APPROVE", "Reject": "Claim and REJECT", "Withdraw": "WITHDRAW (by submitter)"}[w]
        rows.append({
            "Test Case ID": f"EA-TC{i:03d}",
            "Attribute Type": eat, "Type": at, "Language Code": al, "Name": an,
            "Tags": t, "Reason": r, "Review Period": rv,
            "Comment": cm, "Tab1 Workflow": w,
            "Tab1 Steps": (
                f"1. Login and open profile record in Profile View\n"
                f"2. Open same profile in Tab1 and Tab2\n"
                f"3. Tab1: Click Add/Enrich on {eat} section\n"
                f"4. Type: {at}, Language code: {al}, Name: {an}\n"
                f"5. Select Tags: {t}\n"
                f"6. Select Reason: {r}\n"
                f"7. Select Review period: {rv}\n"
                f"8. Comment: {cmt}\n"
                f"9. Click ADD button\n"
                f"10. {act} the enrich request"
            ),
            "Tab2 Steps": (
                f"11. Switch to Tab2 (stale version)\n"
                f"12. Click Add/Enrich on same {eat} section\n"
                f"13. Type: {at}, Lang: {al}, Name: {an}\n"
                f"14. Tags: {t}, Reason: {r}, Review: {rv}\n"
                f"15. Comment: {cmt}\n"
                f"16. Click ADD button"
            ),
            "Expected Outcome": get_expected(w, f"{eat} enrichment")
        })
    return pd.DataFrame(rows)


def main():
    df1 = gen_suppress_enrich_record()
    df2 = gen_edit_profile()
    df3 = gen_suppress_attribute()
    df4 = gen_enrich_attribute()

    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        for df, name in [(df1, "Suppress Enrich Record"), (df2, "Edit Profile View"),
                         (df3, "Suppress Attribute"), (df4, "Enrich Attribute")]:
            df.to_excel(writer, index=False, sheet_name=name)
            fmt(writer.sheets[name], len(df))

        total = len(df1) + len(df2) + len(df3) + len(df4)
        summary = {
            "Sheet": ["Suppress Enrich Record", "Edit Profile View", "Suppress Attribute", "Enrich Attribute", "TOTAL"],
            "Pairwise TCs": [len(df1), len(df2), len(df3), len(df4), total],
            "Full Permutation TCs": [144, "N/A", 432, 1728, "N/A"],
            "Reduction %": [
                f"{100 - len(df1)/144*100:.0f}%",
                "3 no-change + pairwise suppress/enrich in edit mode",
                f"{100 - len(df3)/432*100:.0f}%",
                f"{100 - len(df4)/1728*100:.0f}%",
                f"Optimized"
            ],
            "Coverage": ["All pairs covered", "All pairs covered", "All pairs covered", "All pairs covered", "Pairwise = best min coverage"],
            "Workflow Note": [
                "Approve=state changes | Reject/Withdraw=state unchanged, audit captured",
                "Approve=state changes | Reject/Withdraw=state unchanged, audit captured",
                "Approve=state changes | Reject/Withdraw=state unchanged, audit captured",
                "Approve=state changes | Reject/Withdraw=state unchanged, audit captured",
                "One record can have multiple suppressions & enrichments (one by one)"
            ]
        }
        pd.DataFrame(summary).to_excel(writer, index=False, sheet_name="Summary")
        fmt(writer.sheets["Summary"], len(summary["Sheet"]))

    print(f"Sheet 1 - Suppress Enrich Record: {len(df1)} (was 144)")
    print(f"Sheet 2 - Edit Profile View:      {len(df2)} (was 24)")
    print(f"Sheet 3 - Suppress Attribute:      {len(df3)} (was 432)")
    print(f"Sheet 4 - Enrich Attribute:        {len(df4)} (was 1728)")
    print(f"Total:                             {len(df1)+len(df2)+len(df3)+len(df4)} (was 2328)")
    print(f"\nSaved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
