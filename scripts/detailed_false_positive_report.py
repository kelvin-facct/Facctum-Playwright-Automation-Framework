"""
Detailed False Positive & Format Mismatch Report
=================================================
For each of the 184 false positive records:
- Show Regulatory data vs DowJones data side by side
- Classify: FALSE_POSITIVE (data exists) or FORMAT_MISMATCH (data exists but format differs)
- Output: Detailed CSV with all fields for analysis
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

OUTPUT = r"C:\Users\ReemaSingh\Downloads\reconcile_false_positive_detailed_report.csv"

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
    cursor = recon_col.find(
        {"listName": list_name, "reconTypeId": 2, "effEndDateTime": {"$gt": TODAY}},
    ).sort("effStartDateTime", DESCENDING)
    seen = {}
    for doc in cursor:
        snk = doc.get("sourceNaturalKey", "")
        if snk not in seen:
            seen[snk] = doc
    return list(seen.values())


def extract_dj_names(dj_rec):
    """Get all DJ names as normalized set + original list for display."""
    norm_set = set()
    originals = []
    if not dj_rec:
        return norm_set, originals
    pn = dj_rec.get("primaryName", "")
    if pn:
        norm_set.add(normalize(pn))
        originals.append(pn)
    for entry in dj_rec.get("nameDetailsList", []):
        full = entry.get("fullName", "")
        if full:
            norm_set.add(normalize(full))
            originals.append(full)
        for field in ["firstName", "middleName", "lastName", "entityName", "wholeName"]:
            val = entry.get(field, "")
            if val:
                norm_set.add(normalize(val))
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        if first and last:
            norm_set.add(normalize(f"{first} {last}"))
            norm_set.add(normalize(f"{last} {first}"))
    return norm_set, originals


def extract_reg_names(reg_rec):
    """Get Regulatory names (exclude low quality)."""
    names = []
    if not reg_rec:
        return names
    for entry in reg_rec.get("nameDetailsList", []):
        quality = entry.get("nameQuality", entry.get("aliasQuality", entry.get("nameType", ""))).lower()
        if "low" in quality:
            continue
        full = entry.get("fullName", "")
        if full:
            names.append(full)
        else:
            first = entry.get("firstName", "")
            last = entry.get("lastName", "")
            if first and last:
                names.append(f"{first} {last}")
    return names


def check_name_match(reg_name, dj_names_norm):
    """Check if a single reg name matches any DJ name. Returns match type."""
    rn = normalize(reg_name)
    # Exact match
    if rn in dj_names_norm:
        return "EXACT_MATCH"
    # Substring match (reg in dj or dj in reg)
    for djn in dj_names_norm:
        if rn in djn or djn in rn:
            return "SUBSTRING_MATCH"
    # Case/format difference
    for djn in dj_names_norm:
        if rn.replace("-", " ") == djn.replace("-", " "):
            return "FORMAT_MATCH"
        if rn.replace("'", "") == djn.replace("'", ""):
            return "FORMAT_MATCH"
    return "NOT_FOUND"


def analyze_record(doc, reg_rec, dj_rec):
    """Analyze a single mismatched record. Returns detailed analysis."""
    results = []
    
    for mm in doc.get("mismatchList", []):
        cl_snk = mm.get("clSourceNaturalKey", "")
        
        for detail in mm.get("mismatchDtl", []):
            field_name = detail.get("fieldName", "")
            base_type = field_name.split(".")[0] if "." in field_name else field_name
            
            is_false_positive = False
            is_format_mismatch = False
            reg_data = ""
            dj_data = ""
            missing_items = ""
            match_details = ""
            
            if base_type == "nameDetailsList":
                dj_names_norm, dj_names_orig = extract_dj_names(dj_rec)
                reg_names = extract_reg_names(reg_rec)
                
                reg_data = " | ".join(reg_names[:10])
                dj_data = f"{len(dj_names_orig)} names in DJ"
                
                all_found = True
                format_issues = []
                missing = []
                
                for rn in reg_names:
                    match_type = check_name_match(rn, dj_names_norm)
                    if match_type == "NOT_FOUND":
                        all_found = False
                        missing.append(rn)
                    elif match_type == "FORMAT_MATCH":
                        format_issues.append(rn)
                
                if all_found and reg_names:
                    is_false_positive = True
                    if format_issues:
                        is_format_mismatch = True
                        match_details = f"Format issues: {format_issues[:3]}"
                    else:
                        match_details = f"All {len(reg_names)} aliases found (exact/substring)"
                else:
                    missing_items = " | ".join(missing[:5])
            
            elif base_type == "dateDetailsList":
                # Reg DOBs
                reg_dates = reg_rec.get("birthDateDetailsList", []) if reg_rec else []
                reg_dob_strs = []
                reg_years = set()
                for entry in reg_dates:
                    d = entry.get("date", "")
                    if d:
                        reg_dob_strs.append(d)
                        reg_years.add(d.split("-")[0])
                
                # DJ DOBs
                dj_dob_strs = []
                dj_years = set()
                if dj_rec:
                    for entry in dj_rec.get("dateDetailsList", []):
                        if "birth" in entry.get("dateType", "").lower():
                            y = entry.get("year")
                            m = entry.get("month")
                            d = entry.get("day")
                            if y:
                                dj_years.add(str(y))
                                dob_str = str(y)
                                if m:
                                    dob_str += f"-{str(m).zfill(2)}"
                                    if d:
                                        dob_str += f"-{str(d).zfill(2)}"
                                dj_dob_strs.append(dob_str)
                
                reg_data = " | ".join(reg_dob_strs)
                dj_data = " | ".join(dj_dob_strs)
                
                if reg_years and dj_years:
                    missing_years = reg_years - dj_years
                    if not missing_years:
                        is_false_positive = True
                        # Check if it's a format mismatch (full date vs year-only)
                        if reg_dob_strs and dj_dob_strs:
                            reg_has_full = any(len(d) > 4 for d in reg_dob_strs)
                            dj_has_full = any(len(d) > 4 for d in dj_dob_strs)
                            if reg_has_full and not dj_has_full:
                                is_format_mismatch = True
                                match_details = f"Reg has full dates {reg_dob_strs[:3]}, DJ has year-only {dj_dob_strs[:3]}"
                            elif not reg_has_full and dj_has_full:
                                is_format_mismatch = True
                                match_details = f"Reg has year-only, DJ has full dates"
                            else:
                                match_details = f"Years match: {sorted(reg_years)}"
                    else:
                        missing_items = f"Years missing: {sorted(missing_years)}"
                elif not reg_years:
                    match_details = "No Reg DOB"
            
            elif base_type == "idDetailsList":
                # Reg IDs
                reg_ids = []
                if reg_rec:
                    for entry in reg_rec.get("idNumberTypesList", []):
                        t = entry.get("idType", "")
                        v = entry.get("idValue", "")
                        if v:
                            reg_ids.append(f"{t}:{v}")
                
                # DJ IDs
                dj_ids_set = set()
                dj_ids_display = []
                if dj_rec:
                    for entry in dj_rec.get("idNumberTypesList", []):
                        v = entry.get("idValue", "")
                        t = entry.get("idType", "")
                        if v:
                            dj_ids_set.add(normalize(v))
                            dj_ids_display.append(f"{t}:{v}")
                
                reg_data = " | ".join(reg_ids[:8])
                dj_data = f"{len(dj_ids_display)} IDs in DJ"
                
                missing = []
                for rid in reg_ids:
                    val = rid.split(":", 1)[1] if ":" in rid else rid
                    if normalize(val) not in dj_ids_set:
                        missing.append(rid)
                
                if not missing and reg_ids:
                    is_false_positive = True
                    match_details = f"All {len(reg_ids)} Reg IDs found in DJ"
                else:
                    missing_items = " | ".join(missing[:5])
            
            # Classify
            if is_false_positive and is_format_mismatch:
                classification = "FORMAT_MISMATCH"
            elif is_false_positive:
                classification = "FALSE_POSITIVE"
            else:
                classification = "CORRECT_MISMATCH"
            
            results.append({
                "classification": classification,
                "field": field_name,
                "reg_data": reg_data[:200],
                "dj_data": dj_data[:200],
                "missing_from_dj": missing_items[:200],
                "match_details": match_details[:200],
            })
    
    return results


# ============================================================
# MAIN
# ============================================================
print("=" * 80)
print("DETAILED FALSE POSITIVE & FORMAT MISMATCH REPORT")
print("=" * 80)

all_rows = []
class_summary = {"FALSE_POSITIVE": 0, "FORMAT_MISMATCH": 0, "CORRECT_MISMATCH": 0}

for list_name in LISTS:
    reg_name = list_name.split(" Vs ")[0]
    print(f"\n  Processing: {list_name}...")
    
    mismatch_docs = get_latest_active_records(list_name)
    
    # Batch load
    dj_ids = set()
    for doc in mismatch_docs:
        for mm in doc.get("mismatchList", []):
            cl = mm.get("clSourceNaturalKey", "")
            if cl and cl.isdigit():
                dj_ids.add(int(cl))
    
    dj_cache = {}
    if dj_ids:
        for d in dj_col.find({"sourceId": {"$in": list(dj_ids)}, "activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}}):
            dj_cache[str(d["sourceId"])] = d
    
    reg_snks = [doc.get("sourceNaturalKey", "") for doc in mismatch_docs]
    reg_cache = {}
    if reg_snks:
        for r in reg_col.find({"listName": reg_name, "sourceNaturalKey": {"$in": reg_snks}, "effEndDateTime": {"$gt": TODAY}}):
            reg_cache[r["sourceNaturalKey"]] = r
    
    for doc in mismatch_docs:
        snk = doc.get("sourceNaturalKey", "")
        reg_rec = reg_cache.get(snk)
        cl_snk = ""
        for mm in doc.get("mismatchList", []):
            cl_snk = mm.get("clSourceNaturalKey", "")
        dj_rec = dj_cache.get(cl_snk)
        
        analysis = analyze_record(doc, reg_rec, dj_rec)
        
        # Determine overall record classification
        classifications = [a["classification"] for a in analysis]
        if all(c in ("FALSE_POSITIVE", "FORMAT_MISMATCH") for c in classifications):
            record_class = "FORMAT_MISMATCH" if "FORMAT_MISMATCH" in classifications else "FALSE_POSITIVE"
        else:
            record_class = "CORRECT_MISMATCH"
        
        class_summary[record_class] = class_summary.get(record_class, 0) + 1
        
        for a in analysis:
            all_rows.append({
                "listName": list_name,
                "sourceNaturalKey": snk,
                "primaryName": doc.get("primaryName", ""),
                "entityType": doc.get("entityTypeName", ""),
                "djSourceId": cl_snk,
                "recordClassification": record_class,
                "attributeClassification": a["classification"],
                "mismatchField": a["field"],
                "regulatoryData": a["reg_data"],
                "dowjonesData": a["dj_data"],
                "missingFromDJ": a["missing_from_dj"],
                "matchDetails": a["match_details"],
            })
    
    print(f"    Done. ({len(mismatch_docs)} records)")

# Save
print(f"\nSaving detailed report to: {OUTPUT}")
fieldnames = ["listName", "sourceNaturalKey", "primaryName", "entityType", "djSourceId",
              "recordClassification", "attributeClassification", "mismatchField",
              "regulatoryData", "dowjonesData", "missingFromDJ", "matchDetails"]

with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(all_rows)

# Summary
print("\n" + "=" * 80)
print("CLASSIFICATION SUMMARY (per record)")
print("=" * 80)
print(f"  FALSE_POSITIVE (data exists in DJ, not a real mismatch):  {class_summary.get('FALSE_POSITIVE', 0)}")
print(f"  FORMAT_MISMATCH (data exists but format differs):         {class_summary.get('FORMAT_MISMATCH', 0)}")
print(f"  CORRECT_MISMATCH (data genuinely missing from DJ):        {class_summary.get('CORRECT_MISMATCH', 0)}")
print(f"  TOTAL records:                                            {sum(class_summary.values())}")

# Per-list breakdown
print(f"\n{'List':<35} {'Correct':<10} {'False+':<10} {'Format':<10}")
print("-" * 65)
for list_name in LISTS:
    rows_for_list = [r for r in all_rows if r["listName"] == list_name]
    # Unique records per classification
    seen = {}
    for r in rows_for_list:
        key = r["sourceNaturalKey"]
        if key not in seen:
            seen[key] = r["recordClassification"]
    
    correct = sum(1 for v in seen.values() if v == "CORRECT_MISMATCH")
    fp = sum(1 for v in seen.values() if v == "FALSE_POSITIVE")
    fmt = sum(1 for v in seen.values() if v == "FORMAT_MISMATCH")
    print(f"{list_name:<35} {correct:<10} {fp:<10} {fmt:<10}")

# Show FORMAT_MISMATCH samples
fmt_rows = [r for r in all_rows if r["attributeClassification"] == "FORMAT_MISMATCH"]
if fmt_rows:
    print(f"\n{'─' * 80}")
    print(f"FORMAT MISMATCH SAMPLES (first 10):")
    print(f"{'─' * 80}")
    seen_snk = set()
    count = 0
    for r in fmt_rows:
        if r["sourceNaturalKey"] in seen_snk:
            continue
        seen_snk.add(r["sourceNaturalKey"])
        count += 1
        if count > 10:
            break
        print(f"  {r['listName']} | {r['sourceNaturalKey']} | {r['primaryName']}")
        print(f"    Field: {r['mismatchField']}")
        print(f"    Reg:   {r['regulatoryData'][:100]}")
        print(f"    DJ:    {r['dowjonesData'][:100]}")
        print(f"    Issue: {r['matchDetails']}")
        print()

# Show FALSE_POSITIVE samples
fp_rows = [r for r in all_rows if r["attributeClassification"] == "FALSE_POSITIVE"]
if fp_rows:
    print(f"{'─' * 80}")
    print(f"FALSE POSITIVE SAMPLES (first 10):")
    print(f"{'─' * 80}")
    seen_snk = set()
    count = 0
    for r in fp_rows:
        if r["sourceNaturalKey"] in seen_snk:
            continue
        seen_snk.add(r["sourceNaturalKey"])
        count += 1
        if count > 10:
            break
        print(f"  {r['listName']} | {r['sourceNaturalKey']} | {r['primaryName']}")
        print(f"    Field: {r['mismatchField']}")
        print(f"    Reg:   {r['regulatoryData'][:100]}")
        print(f"    DJ:    {r['dowjonesData'][:100]}")
        print(f"    Match: {r['matchDetails']}")
        print()

client.close()
print("Done.")
