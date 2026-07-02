"""
DowJones Reconciliation Verification Script (Optimized)
========================================================
Reads directly from fremenbankReconcileList which already has reconciliation results.
Also checks fremenbankRegulatoryListHist for active counts.

Collections:
- fremenbankReconcileList: Reconciliation results (missed/mismatch/matched)
- fremenbankRegulatoryListHist: Regulatory list active data (UK SANCTIONS, EU, UN, OFAC, OFAC Enhanced)
- fremenbankDowjonesListHist: DowJones source data

reconTypeId mapping:
- 1 = Missed record (in Regulatory, NOT in DowJones)
- 2 = Mismatched record (exists in both, attributes differ)
- 3 = Matched record

Only considers active data with effEndDateTime > today.
"""

import csv
from datetime import datetime, timezone
from pymongo import MongoClient

# --- Configuration ---
MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
MONGO_DB = "screenDB"
OUTPUT_MISSED = r"C:\Users\ReemaSingh\Downloads\reconcile_missed_records.csv"
OUTPUT_MISMATCHED = r"C:\Users\ReemaSingh\Downloads\reconcile_mismatched_records.csv"
OUTPUT_SUMMARY = r"C:\Users\ReemaSingh\Downloads\reconcile_summary.csv"

RECONCILE_LIST = "fremenbankReconcileList"
REGULATORY_HIST = "fremenbankRegulatoryListHist"

DOWJONES_RECON_LISTS = [
    "UK SANCTIONS Vs Dowjones",
    "EU Vs Dowjones",
    "UN Vs Dowjones",
    "OFAC Vs Dowjones",
    "OFAC Enhanced Vs Dowjones",
]

REGULATORY_LISTS = ["UK SANCTIONS", "EU", "UN", "OFAC", "OFAC Enhanced"]

RECON_MISSED = 1
RECON_MISMATCH = 2
RECON_MATCHED = 3

TODAY = datetime.now(timezone.utc)


def connect_mongo():
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    db.command("ping")
    print(f"Connected to MongoDB: {MONGO_DB} | {TODAY.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
    return client, db


def get_regulatory_active_counts(db):
    """Get active counts from fremenbankRegulatoryListHist."""
    print("=" * 70)
    print("REGULATORY ACTIVE DATA (effEndDateTime > today)")
    print("=" * 70)
    
    col = db[REGULATORY_HIST]
    reg_counts = {}
    for ln in REGULATORY_LISTS:
        count = col.count_documents({"listName": ln, "effEndDateTime": {"$gt": TODAY}})
        reg_counts[ln] = count
        print(f"  {ln}: {count}")
    return reg_counts


def get_reconcile_summary(db):
    """Get reconciliation summary counts."""
    print("\n" + "=" * 70)
    print("RECONCILIATION SUMMARY (fremenbankReconcileList, active)")
    print("=" * 70)
    
    col = db[RECONCILE_LIST]
    results = {}
    
    for list_name in DOWJONES_RECON_LISTS:
        active_filter = {"listName": list_name, "effEndDateTime": {"$gt": TODAY}}
        total_filter = {"listName": list_name}
        
        total = col.count_documents(total_filter)
        active = col.count_documents(active_filter)
        
        missed = col.count_documents({**active_filter, "reconTypeId": RECON_MISSED})
        mismatch = col.count_documents({**active_filter, "reconTypeId": RECON_MISMATCH})
        matched = col.count_documents({**active_filter, "reconTypeId": RECON_MATCHED})
        
        results[list_name] = {"total": total, "active": active, "missed": missed, "mismatch": mismatch, "matched": matched}
        
        print(f"\n  {list_name}:")
        print(f"    Total: {total} | Active: {active}")
        print(f"    Missed={missed} | Mismatch={mismatch} | Matched={matched}")
    
    return results


def extract_missed_records(db):
    """Extract all active missed records."""
    print("\n" + "=" * 70)
    print("MISSED RECORDS (reconTypeId=1, active)")
    print("=" * 70)
    
    col = db[RECONCILE_LIST]
    missed = []
    
    for list_name in DOWJONES_RECON_LISTS:
        cursor = col.find({
            "listName": list_name,
            "reconTypeId": RECON_MISSED,
            "effEndDateTime": {"$gt": TODAY}
        })
        
        count = 0
        for doc in cursor:
            count += 1
            missed.append({
                "listName": list_name,
                "sourceNaturalKey": doc.get("sourceNaturalKey", ""),
                "listEntryId": doc.get("listEntryId", ""),
                "primaryName": doc.get("primaryName", ""),
                "entityType": doc.get("entityTypeName", ""),
                "statusId": doc.get("statusId", ""),
                "addedDateTime": str(doc.get("addedDateTime", "")),
            })
        
        if count > 0:
            print(f"  {list_name}: {count}")
    
    print(f"\n  TOTAL MISSED: {len(missed)}")
    return missed


def extract_mismatched_records(db):
    """Extract all active mismatched records with attribute highlights."""
    print("\n" + "=" * 70)
    print("MISMATCHED RECORDS (reconTypeId=2, active)")
    print("=" * 70)
    
    col = db[RECONCILE_LIST]
    mismatched = []
    attr_summary = {}
    
    for list_name in DOWJONES_RECON_LISTS:
        cursor = col.find({
            "listName": list_name,
            "reconTypeId": RECON_MISMATCH,
            "effEndDateTime": {"$gt": TODAY}
        })
        
        count = 0
        for doc in cursor:
            count += 1
            mismatch_list = doc.get("mismatchList", [])
            
            mismatch_fields = []
            cl_source_key = ""
            cl_primary_name = ""
            
            for mm in mismatch_list:
                cl_source_key = mm.get("clSourceNaturalKey", "")
                cl_primary_name = mm.get("primaryName", "")
                
                for detail in mm.get("mismatchDtl", []):
                    field_name = detail.get("fieldName", "")
                    value = detail.get("value", "")
                    mismatch_fields.append(f"{field_name}={value}")
                    
                    # Track attribute distribution
                    base_field = field_name.split(".")[0] if "." in field_name else field_name
                    key = f"{list_name}|{base_field}"
                    attr_summary[key] = attr_summary.get(key, 0) + 1
            
            mismatched.append({
                "listName": list_name,
                "sourceNaturalKey": doc.get("sourceNaturalKey", ""),
                "listEntryId": doc.get("listEntryId", ""),
                "primaryName": doc.get("primaryName", ""),
                "entityType": doc.get("entityTypeName", ""),
                "clSourceNaturalKey": cl_source_key,
                "clPrimaryName": cl_primary_name,
                "mismatchedAttributes": " | ".join(mismatch_fields),
                "statusId": doc.get("statusId", ""),
            })
        
        if count > 0:
            print(f"  {list_name}: {count}")
    
    print(f"\n  TOTAL MISMATCHED: {len(mismatched)}")
    
    # Print attribute distribution
    print("\n  Mismatch Attribute Distribution:")
    print(f"  {'List':<35} {'Attribute':<40} {'Count':<8}")
    print("  " + "-" * 83)
    for key in sorted(attr_summary.keys(), key=lambda x: -attr_summary[x]):
        parts = key.split("|")
        ln = parts[0]
        attr = parts[1]
        print(f"  {ln:<35} {attr:<40} {attr_summary[key]:<8}")
    
    return mismatched


def save_results(missed, mismatched, recon_results, reg_counts):
    """Save all results."""
    print("\n" + "=" * 70)
    print("SAVING RESULTS")
    print("=" * 70)
    
    # Missed records
    if missed:
        with open(OUTPUT_MISSED, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["listName", "sourceNaturalKey", "listEntryId",
                                                    "primaryName", "entityType", "statusId", "addedDateTime"])
            writer.writeheader()
            writer.writerows(missed)
        print(f"  Missed records ({len(missed)}): {OUTPUT_MISSED}")
    else:
        print(f"  No active missed records found.")
    
    # Mismatched records
    if mismatched:
        with open(OUTPUT_MISMATCHED, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["listName", "sourceNaturalKey", "listEntryId",
                                                    "primaryName", "entityType", "clSourceNaturalKey",
                                                    "clPrimaryName", "mismatchedAttributes", "statusId"])
            writer.writeheader()
            writer.writerows(mismatched)
        print(f"  Mismatched records ({len(mismatched)}): {OUTPUT_MISMATCHED}")
    else:
        print(f"  No active mismatched records found.")
    
    # Summary
    summary_rows = []
    for list_name in DOWJONES_RECON_LISTS:
        reg_name = list_name.split(" Vs ")[0]
        r = recon_results.get(list_name, {})
        summary_rows.append({
            "listName": list_name,
            "regulatoryList": reg_name,
            "regActiveCount": reg_counts.get(reg_name, 0),
            "totalReconRecords": r.get("total", 0),
            "activeReconRecords": r.get("active", 0),
            "missedRecords": r.get("missed", 0),
            "mismatchedRecords": r.get("mismatch", 0),
            "matchedRecords": r.get("matched", 0),
        })
    
    with open(OUTPUT_SUMMARY, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["listName", "regulatoryList", "regActiveCount",
                                                "totalReconRecords", "activeReconRecords",
                                                "missedRecords", "mismatchedRecords", "matchedRecords"])
        writer.writeheader()
        writer.writerows(summary_rows)
    print(f"  Summary: {OUTPUT_SUMMARY}")


def main():
    client, db = connect_mongo()
    
    try:
        reg_counts = get_regulatory_active_counts(db)
        recon_results = get_reconcile_summary(db)
        missed = extract_missed_records(db)
        mismatched = extract_mismatched_records(db)
        save_results(missed, mismatched, recon_results, reg_counts)
        
        # Final table
        print("\n" + "=" * 70)
        print("FINAL SUMMARY")
        print("=" * 70)
        print(f"{'List':<35} {'Reg Active':<12} {'Missed':<8} {'Mismatch':<10} {'Matched':<10}")
        print("-" * 75)
        for list_name in DOWJONES_RECON_LISTS:
            reg_name = list_name.split(" Vs ")[0]
            r = recon_results.get(list_name, {})
            print(f"{list_name:<35} {reg_counts.get(reg_name, 0):<12} {r.get('missed', 0):<8} {r.get('mismatch', 0):<10} {r.get('matched', 0):<10}")
        
        total_missed = sum(r.get("missed", 0) for r in recon_results.values())
        total_mm = sum(r.get("mismatch", 0) for r in recon_results.values())
        total_match = sum(r.get("matched", 0) for r in recon_results.values())
        print("-" * 75)
        print(f"{'TOTAL':<35} {'':<12} {total_missed:<8} {total_mm:<10} {total_match:<10}")
        
    finally:
        client.close()
        print("\nDone.")


if __name__ == "__main__":
    main()
