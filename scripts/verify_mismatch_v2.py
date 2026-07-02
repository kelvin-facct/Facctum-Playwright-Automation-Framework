"""
Mismatch Verification v2:
- Only active records (effEndDateTime > today)
- Only LATEST record per sourceNaturalKey (sort by effStartDateTime desc, take first)
- Count per RECORD not per attribute
- Logic: If Regulatory data IS present in DowJones → INCORRECT mismatch
"""

import csv
from datetime import datetime, timezone
from pymongo import MongoClient, DESCENDING

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
client = MongoClient(MONGO_URI)
db = client["screenDB"]
TODAY = datetime.now(timezone.utc)

recon_col = db["fremenbankReconcileList"]
reg_col = db["fremenbankRegulatoryListHist"]
dj_col = db["fremenbankDowjonesListHist"]

OUTPUT = r"C:\Users\ReemaSingh\Downloads\reconcile_mismatch_verification_v2.csv"

LISTS = [
    "UK SANCTIONS Vs Dowjones",
    "EU Vs Dowjones",
    "UN Vs Dowjones",
    "OFAC Vs Dowjones",
    "OFAC Enhanced Vs Dowjones",
]

print(f"Connected. {TODAY.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")


def normalize(text):
    if not text:
        return ""
    return " ".join(str(text).lower().strip().split())


def get_latest_active_records(list_name):
    """Get only the LATEST active record per sourceNaturalKey."""
    # Get all active mismatched, sorted by effStartDateTime desc
    cursor = recon_col.find(
        {"listName": list_name, "reconTypeId": 2, "effEndDateTime": {"$gt": TODAY}},
    ).sort("effStartDateTime", DESCENDING)
    
    # Keep only latest per sourceNaturalKey
    seen = {}
    for doc in cursor:
        snk = doc.get("sourceNaturalKey", "")
        if snk not in seen:
            seen[snk] = doc
    
    return list(seen.values())


def check_names_in_dj(reg_rec, dj_rec):
    """Check if ALL Regulatory names exist in DowJones. Returns (is_correct, reason)."""
    if not reg_rec or not dj_rec:
        return True, "Missing source record"
    
    # Get all DowJones names (normalized)
    dj_names = set()
    pn = dj_rec.get("primaryName", "")
    if pn:
        dj_names.add(normalize(pn))
    for entry in dj_rec.get("nameDetailsList", []):
        for field in ["firstName", "middleName", "lastName", "fullName", "entityName", "wholeName"]:
            val = entry.get(field, "")
            if val:
                dj_names.add(normalize(val))
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        if first and last:
            dj_names.add(normalize(f"{first} {last}"))
            dj_names.add(normalize(f"{last} {first}"))
    
    # Get Regulatory names (exclude low quality)
    reg_names = []
    for entry in reg_rec.get("nameDetailsList", []):
        quality = entry.get("nameQuality", entry.get("aliasQuality", entry.get("nameType", ""))).lower()
        if "low" in quality:
            continue
        full = entry.get("fullName", "")
        if full:
            reg_names.append(full)
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        if first and last:
            reg_names.append(f"{first} {last}")
    
    if not reg_names:
        return True, "No Regulatory names to compare"
    
    # Check each Reg name against DJ
    missing = []
    for rn in reg_names:
        rn_norm = normalize(rn)
        found = any(rn_norm == djn or rn_norm in djn or djn in rn_norm for djn in dj_names)
        if not found:
            missing.append(rn)
    
    if not missing:
        return False, f"All {len(reg_names)} Reg aliases found in DJ ({len(dj_names)} names)"
    else:
        return True, f"{len(missing)}/{len(reg_names)} NOT in DJ: {missing[:2]}"


def check_dob_in_dj(reg_rec, dj_rec):
    """Check if Regulatory DOB exists in DowJones."""
    if not reg_rec or not dj_rec:
        return True, "Missing source record"
    
    # DJ DOBs (years)
    dj_years = set()
    for entry in dj_rec.get("dateDetailsList", []):
        if "birth" in entry.get("dateType", "").lower():
            year = entry.get("year")
            if year:
                dj_years.add(str(year))
    
    # Reg DOBs
    reg_dates = reg_rec.get("birthDateDetailsList", reg_rec.get("dateDetailsList", []))
    reg_years = set()
    for entry in reg_dates:
        date_val = entry.get("date", "")
        if date_val:
            parts = date_val.split("-")
            if parts:
                reg_years.add(parts[0])
    
    if not reg_years:
        return True, "No Reg DOB to compare"
    
    missing = reg_years - dj_years
    if not missing:
        return False, f"Reg DOB years {sorted(reg_years)} all in DJ {sorted(dj_years)}"
    else:
        return True, f"DOB years missing from DJ: {sorted(missing)}"


def check_ids_in_dj(reg_rec, dj_rec):
    """Check if Regulatory ID values exist in DowJones."""
    if not reg_rec or not dj_rec:
        return True, "Missing source record"
    
    # DJ IDs
    dj_ids = set()
    for entry in dj_rec.get("idNumberTypesList", []):
        val = entry.get("idValue", "")
        if val:
            dj_ids.add(normalize(val))
    
    # Reg IDs
    reg_ids = []
    for entry in reg_rec.get("idNumberTypesList", []):
        val = entry.get("idValue", "")
        if val:
            reg_ids.append(val)
    
    if not reg_ids:
        return True, "No Reg IDs to compare"
    
    missing = [rid for rid in reg_ids if normalize(rid) not in dj_ids]
    if not missing:
        return False, f"All {len(reg_ids)} Reg IDs found in DJ"
    else:
        return True, f"{len(missing)}/{len(reg_ids)} Reg IDs NOT in DJ: {missing[:2]}"


# ============================================================
# MAIN
# ============================================================
print("=" * 80)
print("MISMATCH VERIFICATION v2 (Latest active record per sourceNaturalKey)")
print("=" * 80)

all_results = []
summary = {}

for list_name in LISTS:
    reg_name = list_name.split(" Vs ")[0]
    print(f"\n{'━' * 80}")
    print(f"  {list_name}")
    print(f"{'━' * 80}")
    
    # Get latest active mismatch records (deduplicated by sourceNaturalKey)
    mismatch_docs = get_latest_active_records(list_name)
    print(f"  Unique active mismatched records: {len(mismatch_docs)}")
    
    # Batch load DowJones
    dj_source_ids = set()
    for doc in mismatch_docs:
        for mm in doc.get("mismatchList", []):
            cl_snk = mm.get("clSourceNaturalKey", "")
            if cl_snk and cl_snk.isdigit():
                dj_source_ids.add(int(cl_snk))
    
    dj_cache = {}
    if dj_source_ids:
        for dj_doc in dj_col.find({"sourceId": {"$in": list(dj_source_ids)}, "activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}}):
            dj_cache[str(dj_doc["sourceId"])] = dj_doc
    print(f"  DowJones records loaded: {len(dj_cache)}")
    
    # Batch load Regulatory
    reg_snks = [doc.get("sourceNaturalKey", "") for doc in mismatch_docs]
    reg_cache = {}
    if reg_snks:
        for reg_doc in reg_col.find({"listName": reg_name, "sourceNaturalKey": {"$in": reg_snks}, "effEndDateTime": {"$gt": TODAY}}):
            reg_cache[reg_doc["sourceNaturalKey"]] = reg_doc
    print(f"  Regulatory records loaded: {len(reg_cache)}")
    
    correct_count = 0
    incorrect_count = 0
    
    for doc in mismatch_docs:
        snk = doc.get("sourceNaturalKey", "")
        reg_rec = reg_cache.get(snk)
        
        # Determine mismatch types for this record
        record_correct = True  # overall verdict per record
        record_reasons = []
        cl_snk = ""
        
        for mm in doc.get("mismatchList", []):
            cl_snk = mm.get("clSourceNaturalKey", "")
            dj_rec = dj_cache.get(cl_snk)
            
            for detail in mm.get("mismatchDtl", []):
                field_name = detail.get("fieldName", "")
                base_type = field_name.split(".")[0] if "." in field_name else field_name
                
                if base_type == "nameDetailsList":
                    is_correct, reason = check_names_in_dj(reg_rec, dj_rec)
                elif base_type == "dateDetailsList":
                    is_correct, reason = check_dob_in_dj(reg_rec, dj_rec)
                elif base_type == "idDetailsList":
                    is_correct, reason = check_ids_in_dj(reg_rec, dj_rec)
                else:
                    is_correct, reason = True, f"Unknown field: {field_name}"
                
                record_reasons.append(f"{field_name}: {'CORRECT' if is_correct else 'INCORRECT'} - {reason}")
                
                if not is_correct:
                    record_correct = False  # if ANY attribute is incorrect, record is incorrect
        
        # For a record: if ALL mismatched attributes are actually present in DJ → INCORRECT
        # If ANY attribute is genuinely missing from DJ → CORRECT mismatch
        # Flip logic: record_correct=True means mismatch IS correct (data missing from DJ)
        #             record_correct=False means ALL data exists in DJ (false positive)
        
        # Actually re-evaluate: record is INCORRECT mismatch only if ALL checks show data exists
        all_checks_show_present = all("INCORRECT" in r for r in record_reasons) if record_reasons else False
        
        if all_checks_show_present:
            incorrect_count += 1
            verdict = "INCORRECT (false positive)"
        else:
            correct_count += 1
            verdict = "CORRECT"
        
        all_results.append({
            "listName": list_name,
            "sourceNaturalKey": snk,
            "primaryName": doc.get("primaryName", ""),
            "clSourceNaturalKey": cl_snk,
            "verdict": verdict,
            "details": " | ".join(record_reasons),
        })
    
    total = correct_count + incorrect_count
    pct = (correct_count / total * 100) if total > 0 else 0
    summary[list_name] = {"correct": correct_count, "incorrect": incorrect_count, "total": total}
    print(f"\n  CORRECT mismatches:  {correct_count} ({pct:.1f}%)")
    print(f"  INCORRECT (false +): {incorrect_count} ({100-pct:.1f}%)")


# ============================================================
# FINAL SUMMARY
# ============================================================
print("\n\n" + "=" * 80)
print("FINAL SUMMARY (per unique record, latest active only)")
print("=" * 80)
print(f"\n{'List':<35} {'Records':<10} {'Correct':<10} {'Incorrect':<12} {'Accuracy'}")
print("-" * 80)

tc = 0
ti = 0
for list_name in LISTS:
    s = summary.get(list_name, {})
    c = s.get("correct", 0)
    ic = s.get("incorrect", 0)
    t = s.get("total", 0)
    pct = (c / t * 100) if t > 0 else 0
    tc += c
    ti += ic
    print(f"{list_name:<35} {t:<10} {c:<10} {ic:<12} {pct:.1f}%")

gt = tc + ti
gp = (tc / gt * 100) if gt > 0 else 0
print("-" * 80)
print(f"{'TOTAL':<35} {gt:<10} {tc:<10} {ti:<12} {gp:.1f}%")

# Save
print(f"\nSaving to: {OUTPUT}")
with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["listName", "sourceNaturalKey", "primaryName",
                                            "clSourceNaturalKey", "verdict", "details"])
    writer.writeheader()
    writer.writerows(all_results)

# Sample incorrect
incorrect_samples = [r for r in all_results if "INCORRECT" in r["verdict"]]
if incorrect_samples:
    print(f"\nSample INCORRECT mismatches (first 5):")
    for r in incorrect_samples[:5]:
        print(f"  {r['listName']} | {r['sourceNaturalKey']} | {r['primaryName']}")
        print(f"    {r['details'][:150]}")
        print()

client.close()
print("Done.")
