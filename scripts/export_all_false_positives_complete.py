"""
Export ALL False Positive records - covering ALL mismatch types:
- nameDetailsList.aliases: Every Reg alias checked against DJ names
- dateDetailsList.dobs: Every Reg DOB checked against DJ DOBs
- idDetailsList.idValue: Every Reg ID value checked against DJ IDs

Logic: If Regulatory attribute value IS found in DowJones → FALSE POSITIVE
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

OUTPUT = r"C:\Users\ReemaSingh\Downloads\reconcile_ALL_false_positives_complete.csv"

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


# === NAME HELPERS ===
def get_dj_names_norm(dj_rec):
    norm_set = set()
    if not dj_rec:
        return norm_set
    pn = dj_rec.get("primaryName", "")
    if pn:
        norm_set.add(normalize(pn))
    for entry in dj_rec.get("nameDetailsList", []):
        for field in ["firstName", "middleName", "lastName", "fullName", "entityName", "wholeName"]:
            val = entry.get(field, "")
            if val:
                norm_set.add(normalize(val))
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        if first and last:
            norm_set.add(normalize(f"{first} {last}"))
            norm_set.add(normalize(f"{last} {first}"))
    return norm_set


def get_reg_names(reg_rec):
    names = []
    if not reg_rec:
        return names
    for entry in reg_rec.get("nameDetailsList", []):
        quality = entry.get("nameQuality", entry.get("aliasQuality", entry.get("nameType", ""))).lower()
        if "low" in quality:
            continue
        full = entry.get("fullName", "")
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        name = full if full else f"{first} {last}".strip()
        q = entry.get("nameQuality", entry.get("aliasQuality", entry.get("nameType", "")))
        if name:
            names.append((name, q))
    return names


def check_name_in_dj(reg_name, dj_norm):
    rn = normalize(reg_name)
    if rn in dj_norm:
        return True, "EXACT"
    for djn in dj_norm:
        if rn in djn:
            return True, "SUBSTRING(reg_in_dj)"
        if djn in rn:
            return True, "SUBSTRING(dj_in_reg)"
    return False, "NOT_FOUND"


# === DOB HELPERS ===
def get_dj_dobs(dj_rec):
    """Get DJ DOBs as set of years and full dates."""
    years = set()
    full_dates = set()
    if not dj_rec:
        return years, full_dates
    for entry in dj_rec.get("dateDetailsList", []):
        if "birth" in entry.get("dateType", "").lower():
            y = entry.get("year")
            m = entry.get("month")
            d = entry.get("day")
            if y:
                years.add(str(y))
                date_str = str(y)
                if m:
                    date_str = f"{y}-{str(m).zfill(2)}"
                    if d:
                        date_str = f"{y}-{str(m).zfill(2)}-{str(d).zfill(2)}"
                full_dates.add(date_str)
    return years, full_dates


def get_reg_dobs(reg_rec):
    """Get Regulatory DOBs as list of (date_string, remarks)."""
    dobs = []
    if not reg_rec:
        return dobs
    dates = reg_rec.get("birthDateDetailsList", reg_rec.get("dateDetailsList", []))
    for entry in dates:
        date_val = entry.get("date", "")
        remarks = entry.get("remarks", "")
        if date_val:
            dobs.append((date_val, remarks))
    return dobs


def check_dob_in_dj(reg_date, dj_years, dj_full_dates):
    """Check if regulatory DOB is found in DowJones."""
    if not reg_date:
        return False, "EMPTY"
    # Check full date match
    if reg_date in dj_full_dates:
        return True, "EXACT_DATE"
    # Check year match
    year = reg_date.split("-")[0] if "-" in reg_date else reg_date
    if year in dj_years:
        if len(reg_date) > 4:
            return True, "YEAR_MATCH(format_diff)"
        else:
            return True, "EXACT_YEAR"
    return False, "NOT_FOUND"


# === ID HELPERS ===
def get_dj_ids(dj_rec):
    """Get DJ ID values as normalized set + type map."""
    ids_norm = set()
    ids_by_type = {}
    if not dj_rec:
        return ids_norm, ids_by_type
    for entry in dj_rec.get("idNumberTypesList", []):
        id_type = entry.get("idType", "")
        id_val = entry.get("idValue", "")
        if id_val:
            ids_norm.add(normalize(id_val))
            if id_type not in ids_by_type:
                ids_by_type[id_type] = []
            ids_by_type[id_type].append(id_val)
    return ids_norm, ids_by_type


def get_reg_ids(reg_rec):
    """Get Regulatory IDs as list of (type, value)."""
    ids = []
    if not reg_rec:
        return ids
    for entry in reg_rec.get("idNumberTypesList", []):
        id_type = entry.get("idType", "")
        id_val = entry.get("idValue", "")
        if id_val:
            ids.append((id_type, id_val))
    return ids


def check_id_in_dj(reg_id_val, dj_ids_norm):
    """Check if regulatory ID value is found in DowJones."""
    val_norm = normalize(reg_id_val)
    if val_norm in dj_ids_norm:
        return True, "EXACT"
    # Partial match
    for djid in dj_ids_norm:
        if val_norm in djid or djid in val_norm:
            return True, "SUBSTRING"
    return False, "NOT_FOUND"


# ============================================================
# MAIN
# ============================================================
print("=" * 80)
print("EXTRACTING ALL FALSE POSITIVES (Names + DOB + IDs)")
print("=" * 80)

all_rows = []
fp_records = 0
fp_by_type = {"names": 0, "dob": 0, "ids": 0}

for list_name in LISTS:
    reg_name = list_name.split(" Vs ")[0]
    print(f"\n  Processing: {list_name}...")
    
    mismatch_docs = get_latest_active_records(list_name)
    
    # Batch load DJ
    dj_ids_set = set()
    for doc in mismatch_docs:
        for mm in doc.get("mismatchList", []):
            cl = mm.get("clSourceNaturalKey", "")
            if cl and cl.isdigit():
                dj_ids_set.add(int(cl))
    dj_cache = {}
    if dj_ids_set:
        for d in dj_col.find({"sourceId": {"$in": list(dj_ids_set)}, "activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}}):
            dj_cache[str(d["sourceId"])] = d
    
    # Batch load Reg
    reg_snks = [doc.get("sourceNaturalKey", "") for doc in mismatch_docs]
    reg_cache = {}
    if reg_snks:
        for r in reg_col.find({"listName": reg_name, "sourceNaturalKey": {"$in": reg_snks}, "effEndDateTime": {"$gt": TODAY}}):
            reg_cache[r["sourceNaturalKey"]] = r
    
    list_fp = 0
    for doc in mismatch_docs:
        snk = doc.get("sourceNaturalKey", "")
        reg_rec = reg_cache.get(snk)
        cl_snk = ""
        for mm in doc.get("mismatchList", []):
            cl_snk = mm.get("clSourceNaturalKey", "")
        dj_rec = dj_cache.get(cl_snk)
        
        # Determine mismatch types for this record
        mismatch_types = set()
        for mm in doc.get("mismatchList", []):
            for detail in mm.get("mismatchDtl", []):
                base = detail.get("fieldName", "").split(".")[0]
                mismatch_types.add(base)
        
        record_is_fp = True  # assume FP until proven otherwise
        record_rows = []
        
        # CHECK NAMES
        if "nameDetailsList" in mismatch_types:
            dj_names = get_dj_names_norm(dj_rec)
            reg_names = get_reg_names(reg_rec)
            
            all_names_found = True
            for (name, quality) in reg_names:
                found, match_type = check_name_in_dj(name, dj_names)
                if not found:
                    all_names_found = False
                record_rows.append({
                    "mismatchType": "ALIAS",
                    "regulatoryValue": name,
                    "valueQuality": quality,
                    "foundInDJ": "YES" if found else "NO",
                    "matchType": match_type,
                    "djCount": str(len(dj_names)),
                    "regCount": str(len(reg_names)),
                })
            
            if not all_names_found:
                record_is_fp = False
            elif reg_names:
                fp_by_type["names"] += 1
        
        # CHECK DOB
        if "dateDetailsList" in mismatch_types:
            dj_years, dj_full_dates = get_dj_dobs(dj_rec)
            reg_dobs = get_reg_dobs(reg_rec)
            
            all_dobs_found = True
            for (date_val, remarks) in reg_dobs:
                found, match_type = check_dob_in_dj(date_val, dj_years, dj_full_dates)
                if not found:
                    all_dobs_found = False
                record_rows.append({
                    "mismatchType": "DOB",
                    "regulatoryValue": date_val,
                    "valueQuality": remarks[:50] if remarks else "",
                    "foundInDJ": "YES" if found else "NO",
                    "matchType": match_type,
                    "djCount": f"years:{sorted(dj_years)}",
                    "regCount": str(len(reg_dobs)),
                })
            
            if not all_dobs_found:
                record_is_fp = False
            elif reg_dobs:
                fp_by_type["dob"] += 1
        
        # CHECK IDs
        if "idDetailsList" in mismatch_types:
            dj_id_norms, dj_id_by_type = get_dj_ids(dj_rec)
            reg_id_list = get_reg_ids(reg_rec)
            
            all_ids_found = True
            for (id_type, id_val) in reg_id_list:
                found, match_type = check_id_in_dj(id_val, dj_id_norms)
                if not found:
                    all_ids_found = False
                record_rows.append({
                    "mismatchType": "ID_VALUE",
                    "regulatoryValue": f"{id_type}: {id_val}",
                    "valueQuality": id_type,
                    "foundInDJ": "YES" if found else "NO",
                    "matchType": match_type,
                    "djCount": str(len(dj_id_norms)),
                    "regCount": str(len(reg_id_list)),
                })
            
            if not all_ids_found:
                record_is_fp = False
            elif reg_id_list:
                fp_by_type["ids"] += 1
        
        if record_is_fp and record_rows:
            fp_records += 1
            list_fp += 1
            for row in record_rows:
                all_rows.append({
                    "listName": list_name,
                    "sourceNaturalKey": snk,
                    "primaryName": doc.get("primaryName", ""),
                    "entityType": doc.get("entityTypeName", ""),
                    "djSourceId": cl_snk,
                    **row,
                    "verdict": "FALSE POSITIVE",
                })
    
    print(f"    False positives: {list_fp} / {len(mismatch_docs)}")

# Save
print(f"\n\nTotal FALSE POSITIVE records: {fp_records}")
print(f"  By type: names={fp_by_type['names']}, dob={fp_by_type['dob']}, ids={fp_by_type['ids']}")
print(f"Total detail rows: {len(all_rows)}")
print(f"\nSaving to: {OUTPUT}")

with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "listName", "sourceNaturalKey", "primaryName", "entityType", "djSourceId",
        "mismatchType", "regulatoryValue", "valueQuality", "foundInDJ", "matchType",
        "djCount", "regCount", "verdict"
    ])
    writer.writeheader()
    writer.writerows(all_rows)

# Print all records grouped
print(f"\n{'═' * 90}")
print(f"ALL {fp_records} FALSE POSITIVE RECORDS - DETAILED BREAKDOWN")
print(f"{'═' * 90}")

current_snk = ""
current_list = ""
for r in all_rows:
    key = f"{r['listName']}|{r['sourceNaturalKey']}"
    if r["sourceNaturalKey"] != current_snk or r["listName"] != current_list:
        current_snk = r["sourceNaturalKey"]
        current_list = r["listName"]
        print(f"\n  ┌─ {r['listName']} | {r['sourceNaturalKey']} | {r['primaryName']} | DJ:{r['djSourceId']}")
        print(f"  │  {'Type':<10} {'Regulatory Value':<55} {'Found':<6} {'Match Type'}")
        print(f"  │  {'─'*95}")
    
    marker = "✓" if r["foundInDJ"] == "YES" else "✗"
    print(f"  │  {marker} {r['mismatchType']:<8} {r['regulatoryValue'][:53]:<55} {r['foundInDJ']:<6} {r['matchType']}")

client.close()
print(f"\n\nDone. Full CSV: {OUTPUT}")
