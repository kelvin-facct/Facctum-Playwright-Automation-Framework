"""
Export ALL 126 False Positive records with full details:
- Every Regulatory alias listed
- Whether each alias was found in DowJones (highlighted)
- DowJones name count
- Record classification
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

OUTPUT = r"C:\Users\ReemaSingh\Downloads\reconcile_ALL_false_positives_detailed.csv"

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


def get_dj_names_detailed(dj_rec):
    """Get all DJ names: normalized set + list of (name, quality) tuples."""
    norm_set = set()
    details = []
    if not dj_rec:
        return norm_set, details
    pn = dj_rec.get("primaryName", "")
    if pn:
        norm_set.add(normalize(pn))
        details.append((pn, "Primary"))
    for entry in dj_rec.get("nameDetailsList", []):
        quality = entry.get("nameQuality", entry.get("aliasQuality", entry.get("nameType", "")))
        full = entry.get("fullName", "")
        if full:
            norm_set.add(normalize(full))
            details.append((full, quality))
        for field in ["firstName", "middleName", "lastName", "entityName", "wholeName"]:
            val = entry.get(field, "")
            if val:
                norm_set.add(normalize(val))
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        if first and last:
            norm_set.add(normalize(f"{first} {last}"))
            norm_set.add(normalize(f"{last} {first}"))
    return norm_set, details


def get_reg_names_detailed(reg_rec):
    """Get Regulatory names with quality info (exclude low quality)."""
    names = []
    if not reg_rec:
        return names
    for entry in reg_rec.get("nameDetailsList", []):
        quality = entry.get("nameQuality", entry.get("aliasQuality", entry.get("nameType", "")))
        if quality and "low" in quality.lower():
            continue
        full = entry.get("fullName", "")
        first = entry.get("firstName", "")
        last = entry.get("lastName", "")
        name = full if full else f"{first} {last}".strip()
        if name:
            names.append((name, quality))
    return names


def check_match(reg_name, dj_norm_set):
    """Check if reg name is found in DJ. Returns (found, match_type, matched_against)."""
    rn = normalize(reg_name)
    if rn in dj_norm_set:
        return True, "EXACT"
    for djn in dj_norm_set:
        if rn in djn:
            return True, "SUBSTRING(reg_in_dj)"
        if djn in rn:
            return True, "SUBSTRING(dj_in_reg)"
    if rn.replace("-", " ") in dj_norm_set or rn.replace("'", "") in dj_norm_set:
        return True, "FORMAT_VARIANT"
    return False, "NOT_FOUND"


# ============================================================
# MAIN
# ============================================================
print("Extracting all FALSE POSITIVE records with full alias details...\n")

all_rows = []
record_count = 0

for list_name in LISTS:
    reg_name = list_name.split(" Vs ")[0]
    mismatch_docs = get_latest_active_records(list_name)
    
    # Batch load DJ
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
    
    # Batch load Reg
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
        
        # Check if this is a false positive for names
        dj_norm, dj_details = get_dj_names_detailed(dj_rec)
        reg_names = get_reg_names_detailed(reg_rec)
        
        if not reg_names:
            continue
        
        # Check each regulatory alias
        all_found = True
        alias_results = []
        for (name, quality) in reg_names:
            found, match_type = check_match(name, dj_norm)
            alias_results.append((name, quality, found, match_type))
            if not found:
                all_found = False
        
        if not all_found:
            continue  # Not a false positive, skip
        
        # This is a FALSE POSITIVE - all Reg aliases exist in DJ
        record_count += 1
        
        for (name, quality, found, match_type) in alias_results:
            all_rows.append({
                "listName": list_name,
                "sourceNaturalKey": snk,
                "primaryName": doc.get("primaryName", ""),
                "entityType": doc.get("entityTypeName", ""),
                "djSourceId": cl_snk,
                "regAliasCount": len(reg_names),
                "djNameCount": len(dj_details),
                "regulatoryAlias": name,
                "aliasQuality": quality,
                "foundInDJ": "YES" if found else "NO",
                "matchType": match_type,
                "verdict": "FALSE POSITIVE - Alias exists in DowJones",
            })

# Save
print(f"Total FALSE POSITIVE records: {record_count}")
print(f"Total alias rows: {len(all_rows)}")
print(f"\nSaving to: {OUTPUT}")

with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "listName", "sourceNaturalKey", "primaryName", "entityType", "djSourceId",
        "regAliasCount", "djNameCount", "regulatoryAlias", "aliasQuality",
        "foundInDJ", "matchType", "verdict"
    ])
    writer.writeheader()
    writer.writerows(all_rows)

# Print summary per list
print(f"\n{'═' * 80}")
print(f"FALSE POSITIVE SUMMARY BY LIST")
print(f"{'═' * 80}")
print(f"{'List':<35} {'Records':<10} {'Aliases':<10}")
print(f"{'─' * 55}")
for ln in LISTS:
    recs = len(set(r["sourceNaturalKey"] for r in all_rows if r["listName"] == ln))
    aliases = len([r for r in all_rows if r["listName"] == ln])
    if recs > 0:
        print(f"{ln:<35} {recs:<10} {aliases:<10}")

# Print ALL records
print(f"\n{'═' * 80}")
print(f"ALL {record_count} FALSE POSITIVE RECORDS")
print(f"{'═' * 80}")
print(f"{'#':<4} {'List':<28} {'SNK':<15} {'Name':<35} {'Reg#':<5} {'DJ#':<5}")
print(f"{'─' * 92}")

seen = {}
idx = 0
for r in all_rows:
    key = f"{r['listName']}|{r['sourceNaturalKey']}"
    if key not in seen:
        seen[key] = True
        idx += 1
        print(f"{idx:<4} {r['listName']:<28} {r['sourceNaturalKey']:<15} {r['primaryName'][:33]:<35} {r['regAliasCount']:<5} {r['djNameCount']:<5}")

print(f"\n{'═' * 80}")
print(f"DETAILED ALIAS BREAKDOWN (all aliases per record)")
print(f"{'═' * 80}")

current_snk = ""
for r in all_rows:
    if r["sourceNaturalKey"] != current_snk:
        current_snk = r["sourceNaturalKey"]
        print(f"\n  ┌─ {r['listName']} | {r['sourceNaturalKey']} | {r['primaryName']}")
        print(f"  │  Reg aliases: {r['regAliasCount']} | DJ names: {r['djNameCount']}")
        print(f"  │  {'Alias':<50} {'Quality':<25} {'Match'}")
        print(f"  │  {'─'*90}")
    
    marker = "✓" if r["foundInDJ"] == "YES" else "✗"
    print(f"  │  {marker} {r['regulatoryAlias'][:48]:<50} {r['aliasQuality'][:23]:<25} {r['matchType']}")

client.close()
print(f"\n\nDone. Full CSV: {OUTPUT}")
