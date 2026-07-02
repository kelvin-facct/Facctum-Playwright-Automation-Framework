"""
Verify Mismatch Correctness:
Logic: Mismatch means data in Regulatory is NOT present in Commercial (DowJones).
- For nameDetailsList.aliases: Check if ALL Regulatory aliases exist in DowJones names.
  If Regulatory alias IS found in DowJones → INCORRECT mismatch (false positive)
  If Regulatory alias is NOT found in DowJones → CORRECT mismatch (truly missing)
- For dateDetailsList.dobs: Check if Regulatory DOB exists in DowJones DOB entries.
- For idDetailsList.idValue: Check if Regulatory ID values exist in DowJones ID entries.

Output: Report with correct/incorrect mismatch classification.
"""

import csv
from datetime import datetime, timezone
from pymongo import MongoClient

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
client = MongoClient(MONGO_URI)
db = client["screenDB"]
TODAY = datetime.now(timezone.utc)

recon_col = db["fremenbankReconcileList"]
reg_col = db["fremenbankRegulatoryListHist"]
dj_col = db["fremenbankDowjonesListHist"]

OUTPUT = r"C:\Users\ReemaSingh\Downloads\reconcile_mismatch_verification.csv"

LISTS = [
    "UK SANCTIONS Vs Dowjones",
    "EU Vs Dowjones",
    "UN Vs Dowjones",
    "OFAC Vs Dowjones",
    "OFAC Enhanced Vs Dowjones",
]

print(f"Connected. {TODAY.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")


def normalize(text):
    """Normalize text for comparison: lowercase, strip, remove extra spaces."""
    if not text:
        return ""
    return " ".join(str(text).lower().strip().split())


def extract_all_names_from_dj(dj_rec):
    """Extract ALL name variations from DowJones record (normalized set)."""
    names = set()
    if not dj_rec:
        return names
    
    # Primary name
    pn = dj_rec.get("primaryName", "")
    if pn:
        names.add(normalize(pn))
    
    for entry in dj_rec.get("nameDetailsList", []):
        for field in ["firstName", "middleName", "lastName", "fullName", "entityName", "wholeName"]:
            val = entry.get(field, "")
            if val:
                names.add(normalize(val))
        
        # Also add combined fullName
        full = entry.get("fullName", "")
        if full:
            names.add(normalize(full))
        
        # Combine first + last
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        if first and last:
            names.add(normalize(f"{first} {last}"))
            names.add(normalize(f"{last} {first}"))
    
    return names


def extract_all_names_from_reg(reg_rec):
    """Extract ALL name variations from Regulatory record."""
    names = []
    if not reg_rec:
        return names
    
    for entry in reg_rec.get("nameDetailsList", []):
        # Skip low quality aliases
        quality = entry.get("nameQuality", entry.get("aliasQuality", entry.get("nameType", ""))).lower()
        if "low" in quality:
            continue
        
        full = entry.get("fullName", "")
        if full:
            names.append(full)
        
        # Also individual parts
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        if first and last:
            names.append(f"{first} {last}")
    
    return names


def extract_dob_from_dj(dj_rec):
    """Extract DOB values from DowJones (year, month, day, full date)."""
    dobs = set()
    if not dj_rec:
        return dobs
    
    for entry in dj_rec.get("dateDetailsList", []):
        if "birth" in entry.get("dateType", "").lower():
            year = entry.get("year")
            month = entry.get("month")
            day = entry.get("day")
            
            if year:
                dobs.add(str(year))
                if month:
                    dobs.add(f"{year}-{str(month).zfill(2)}")
                    if day:
                        dobs.add(f"{year}-{str(month).zfill(2)}-{str(day).zfill(2)}")
    
    return dobs


def extract_dob_from_reg(reg_rec):
    """Extract DOB values from Regulatory."""
    dobs = set()
    if not reg_rec:
        return dobs
    
    dates = reg_rec.get("birthDateDetailsList", reg_rec.get("dateDetailsList", []))
    for entry in dates:
        date_val = entry.get("date", "")
        if date_val:
            dobs.add(date_val)  # YYYY-MM-DD format
            # Also add just year
            parts = date_val.split("-")
            if parts:
                dobs.add(parts[0])  # year only
    
    return dobs


def extract_ids_from_dj(dj_rec):
    """Extract all ID values from DowJones."""
    ids = set()
    if not dj_rec:
        return ids
    
    for entry in dj_rec.get("idNumberTypesList", []):
        val = entry.get("idValue", "")
        if val:
            ids.add(normalize(val))
    
    return ids


def extract_ids_from_reg(reg_rec):
    """Extract all ID values from Regulatory."""
    ids = []
    if not reg_rec:
        return ids
    
    for entry in reg_rec.get("idNumberTypesList", []):
        val = entry.get("idValue", "")
        if val:
            ids.append(val)
    
    return ids


# ============================================================
# MAIN VERIFICATION
# ============================================================
print("=" * 80)
print("MISMATCH VERIFICATION: Is Regulatory data present in DowJones?")
print("=" * 80)

all_results = []
summary = {}

for list_name in LISTS:
    reg_name = list_name.split(" Vs ")[0]
    print(f"\n{'━' * 80}")
    print(f"  Processing: {list_name}")
    print(f"{'━' * 80}")
    
    # Get all active mismatched records for this list
    mismatch_docs = list(recon_col.find({
        "listName": list_name,
        "reconTypeId": 2,
        "effEndDateTime": {"$gt": TODAY}
    }))
    
    print(f"  Total mismatched records: {len(mismatch_docs)}")
    
    correct_count = 0
    incorrect_count = 0
    
    # Batch load DowJones records for efficiency
    dj_source_ids = set()
    for doc in mismatch_docs:
        for mm in doc.get("mismatchList", []):
            cl_snk = mm.get("clSourceNaturalKey", "")
            if cl_snk and cl_snk.isdigit():
                dj_source_ids.add(int(cl_snk))
    
    print(f"  Loading {len(dj_source_ids)} DowJones records...")
    dj_cache = {}
    if dj_source_ids:
        dj_cursor = dj_col.find({
            "sourceId": {"$in": list(dj_source_ids)},
            "activeStatus": "Active",
            "effEndDateTime": {"$gt": TODAY}
        })
        for dj_doc in dj_cursor:
            dj_cache[str(dj_doc["sourceId"])] = dj_doc
    print(f"  Loaded {len(dj_cache)} DowJones records from cache.")
    
    # Batch load Regulatory records
    reg_snks = [doc.get("sourceNaturalKey", "") for doc in mismatch_docs]
    print(f"  Loading {len(reg_snks)} Regulatory records...")
    reg_cache = {}
    if reg_snks:
        reg_cursor = reg_col.find({
            "listName": reg_name,
            "sourceNaturalKey": {"$in": reg_snks},
            "effEndDateTime": {"$gt": TODAY}
        })
        for reg_doc in reg_cursor:
            reg_cache[reg_doc["sourceNaturalKey"]] = reg_doc
    print(f"  Loaded {len(reg_cache)} Regulatory records from cache.")
    
    # Now verify each mismatch
    for doc in mismatch_docs:
        snk = doc.get("sourceNaturalKey", "")
        reg_rec = reg_cache.get(snk)
        
        for mm in doc.get("mismatchList", []):
            cl_snk = mm.get("clSourceNaturalKey", "")
            dj_rec = dj_cache.get(cl_snk)
            
            for detail in mm.get("mismatchDtl", []):
                field_name = detail.get("fieldName", "")
                base_type = field_name.split(".")[0] if "." in field_name else field_name
                
                is_correct = True  # default: mismatch is correct
                reason = ""
                
                if base_type == "nameDetailsList":
                    # Check if ALL Regulatory aliases are present in DowJones
                    dj_names = extract_all_names_from_dj(dj_rec)
                    reg_names = extract_all_names_from_reg(reg_rec)
                    
                    missing_from_dj = []
                    found_in_dj = []
                    
                    for rn in reg_names:
                        rn_norm = normalize(rn)
                        # Check if this regulatory name exists in DowJones (substring/fuzzy)
                        found = False
                        for djn in dj_names:
                            if rn_norm == djn or rn_norm in djn or djn in rn_norm:
                                found = True
                                break
                        
                        if found:
                            found_in_dj.append(rn)
                        else:
                            missing_from_dj.append(rn)
                    
                    if not missing_from_dj and reg_names:
                        # ALL regulatory names found in DowJones → INCORRECT mismatch
                        is_correct = False
                        reason = f"All {len(reg_names)} Reg aliases found in DJ ({len(dj_names)} names)"
                    elif missing_from_dj:
                        is_correct = True
                        reason = f"{len(missing_from_dj)}/{len(reg_names)} Reg aliases NOT in DJ: {missing_from_dj[:2]}"
                    else:
                        reason = "No Regulatory names to compare"
                
                elif base_type == "dateDetailsList":
                    # Check if Regulatory DOB exists in DowJones
                    dj_dobs = extract_dob_from_dj(dj_rec)
                    reg_dobs = extract_dob_from_reg(reg_rec)
                    
                    if reg_dobs and dj_dobs:
                        # Check if reg DOBs are subset of DJ DOBs (at year level)
                        reg_years = {d.split("-")[0] for d in reg_dobs if d}
                        dj_years = dj_dobs
                        
                        missing_years = reg_years - dj_years
                        if not missing_years:
                            is_correct = False
                            reason = f"Reg DOB years {reg_years} all found in DJ {dj_years}"
                        else:
                            is_correct = True
                            reason = f"Reg DOB {reg_dobs} not fully in DJ {dj_dobs}"
                    else:
                        reason = f"Reg DOB: {reg_dobs}, DJ DOB: {dj_dobs}"
                
                elif base_type == "idDetailsList":
                    # Check if Regulatory ID values exist in DowJones
                    dj_ids = extract_ids_from_dj(dj_rec)
                    reg_ids = extract_ids_from_reg(reg_rec)
                    
                    missing_ids = []
                    for rid in reg_ids:
                        rid_norm = normalize(rid)
                        if rid_norm not in dj_ids:
                            missing_ids.append(rid)
                    
                    if not missing_ids and reg_ids:
                        is_correct = False
                        reason = f"All {len(reg_ids)} Reg IDs found in DJ"
                    elif missing_ids:
                        is_correct = True
                        reason = f"{len(missing_ids)}/{len(reg_ids)} Reg IDs NOT in DJ: {missing_ids[:2]}"
                    else:
                        reason = "No Regulatory IDs to compare"
                
                if is_correct:
                    correct_count += 1
                else:
                    incorrect_count += 1
                
                all_results.append({
                    "listName": list_name,
                    "sourceNaturalKey": snk,
                    "primaryName": doc.get("primaryName", ""),
                    "clSourceNaturalKey": cl_snk,
                    "mismatchField": field_name,
                    "verdict": "CORRECT" if is_correct else "INCORRECT (false positive)",
                    "reason": reason,
                })
    
    total = correct_count + incorrect_count
    pct_correct = (correct_count / total * 100) if total > 0 else 0
    summary[list_name] = {"correct": correct_count, "incorrect": incorrect_count, "total": total}
    
    print(f"\n  Results:")
    print(f"    CORRECT mismatches:   {correct_count} ({pct_correct:.1f}%)")
    print(f"    INCORRECT (false +):  {incorrect_count} ({100-pct_correct:.1f}%)")


# ============================================================
# FINAL SUMMARY
# ============================================================
print("\n\n" + "=" * 80)
print("FINAL SUMMARY: Mismatch Verification Results")
print("=" * 80)
print(f"\n{'List':<35} {'Total':<8} {'Correct':<10} {'Incorrect':<12} {'Accuracy'}")
print("-" * 80)

total_correct = 0
total_incorrect = 0

for list_name in LISTS:
    s = summary.get(list_name, {})
    correct = s.get("correct", 0)
    incorrect = s.get("incorrect", 0)
    total = s.get("total", 0)
    pct = (correct / total * 100) if total > 0 else 0
    total_correct += correct
    total_incorrect += incorrect
    print(f"{list_name:<35} {total:<8} {correct:<10} {incorrect:<12} {pct:.1f}%")

grand_total = total_correct + total_incorrect
grand_pct = (total_correct / grand_total * 100) if grand_total > 0 else 0
print("-" * 80)
print(f"{'TOTAL':<35} {grand_total:<8} {total_correct:<10} {total_incorrect:<12} {grand_pct:.1f}%")

# Save detailed results
print(f"\nSaving detailed results to: {OUTPUT}")
with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["listName", "sourceNaturalKey", "primaryName",
                                            "clSourceNaturalKey", "mismatchField", "verdict", "reason"])
    writer.writeheader()
    writer.writerows(all_results)

# Show sample incorrect mismatches
incorrect_samples = [r for r in all_results if "INCORRECT" in r["verdict"]]
if incorrect_samples:
    print(f"\n{'─' * 80}")
    print(f"SAMPLE INCORRECT MISMATCHES (false positives) - first 10:")
    print(f"{'─' * 80}")
    for r in incorrect_samples[:10]:
        print(f"  {r['listName']} | {r['sourceNaturalKey']} | {r['primaryName']}")
        print(f"    Field: {r['mismatchField']}")
        print(f"    Reason: {r['reason']}")
        print()

client.close()
print("Done.")
