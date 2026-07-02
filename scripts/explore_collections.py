"""
Explore screenDB collections to understand structure for reconciliation verification.
Checks: fremenbankDowjonesListHist, fremenbankReconciledListHist, fremenbankRegulatoryListHist
Focus: active data with effEndDateTime > today
"""
from pymongo import MongoClient
from datetime import datetime

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
client = MongoClient(MONGO_URI)
db = client["screenDB"]

TODAY = datetime.utcnow()
print(f"Today (UTC): {TODAY.strftime('%Y-%m-%d %H:%M:%S')}")

# List all fremenbank collections
print("\n" + "=" * 70)
print("ALL FREMENBANK COLLECTIONS IN screenDB")
print("=" * 70)
all_collections = sorted(db.list_collection_names())
fremen_cols = [c for c in all_collections if "fremen" in c.lower()]
for c in fremen_cols:
    count = db[c].estimated_document_count()
    print(f"  {c}: ~{count} docs")

# --- 1. fremenbankDowjonesListHist ---
print("\n" + "=" * 70)
print("1. fremenbankDowjonesListHist - Structure & Active Data")
print("=" * 70)
col1 = db["fremenbankDowjonesListHist"]
print(f"Total documents: ~{col1.estimated_document_count()}")

sample1 = col1.find_one({"activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}})
if not sample1:
    sample1 = col1.find_one()

if sample1:
    print(f"\nTop-level fields: {sorted(sample1.keys())}")
    for key in sorted(sample1.keys()):
        val = sample1[key]
        if isinstance(val, (str, int, float, bool, datetime)):
            print(f"  {key} = {val}")
        elif isinstance(val, list):
            print(f"  {key} = [list, {len(val)} items]")

# Active count
active_count = col1.count_documents({"activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}})
print(f"\nActive records (effEndDateTime > today): {active_count}")

# Distinct refTypeId
ref_types = col1.distinct("refTypeId")
print(f"Distinct refTypeId: {ref_types[:10]}")

# Check tags/list identifiers
tags = col1.distinct("tags")
print(f"Distinct tags: {tags[:10]}")

# --- 2. fremenbankReconciledListHist ---
print("\n" + "=" * 70)
print("2. fremenbankReconciledListHist - Structure & Active Data")
print("=" * 70)
col2 = db["fremenbankReconciledListHist"]
total2 = col2.estimated_document_count()
print(f"Total documents: ~{total2}")

if total2 > 0:
    sample2 = col2.find_one({"activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}})
    if not sample2:
        sample2 = col2.find_one()
    if sample2:
        print(f"\nTop-level fields: {sorted(sample2.keys())}")
        for key in sorted(sample2.keys()):
            val = sample2[key]
            if isinstance(val, (str, int, float, bool, datetime)):
                print(f"  {key} = {val}")
            elif isinstance(val, list):
                print(f"  {key} = [list, {len(val)} items]")
    
    active_count2 = col2.count_documents({"activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}})
    print(f"\nActive records (effEndDateTime > today): {active_count2}")
    ref_types2 = col2.distinct("refTypeId")
    print(f"Distinct refTypeId: {ref_types2[:10]}")
else:
    print("  Collection is empty!")

# --- 3. fremenbankRegulatoryListHist ---
print("\n" + "=" * 70)
print("3. fremenbankRegulatoryListHist - Structure & Active Data")
print("=" * 70)
col3 = db["fremenbankRegulatoryListHist"]
total3 = col3.estimated_document_count()
print(f"Total documents: ~{total3}")

if total3 > 0:
    sample3 = col3.find_one({"activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}})
    if not sample3:
        sample3 = col3.find_one()
    if sample3:
        print(f"\nTop-level fields: {sorted(sample3.keys())}")
        for key in sorted(sample3.keys()):
            val = sample3[key]
            if isinstance(val, (str, int, float, bool, datetime)):
                print(f"  {key} = {val}")
            elif isinstance(val, list):
                print(f"  {key} = [list, {len(val)} items]")
    
    active_count3 = col3.count_documents({"activeStatus": "Active", "effEndDateTime": {"$gt": TODAY}})
    print(f"\nActive records (effEndDateTime > today): {active_count3}")
    
    # Check list names for UKSANC, EU, UN, OFAC
    print("\nChecking list identifiers (tags/listName/sourceNameList)...")
    tags3 = col3.distinct("tags")
    print(f"  Distinct tags: {tags3[:20]}")
    
    list_names = col3.distinct("listName")
    if list_names:
        print(f"  Distinct listName: {list_names[:20]}")
    
    source_names = col3.distinct("sourceName")
    if source_names:
        print(f"  Distinct sourceName: {source_names[:20]}")
    
    ref_types3 = col3.distinct("refTypeId")
    print(f"  Distinct refTypeId: {ref_types3[:10]}")
    
    # Count per list type
    print("\n  Active records by list (tags):")
    for tag in sorted(tags3):
        if any(x in tag.upper() for x in ["UKSANC", "UK", "EU", "UN", "OFAC"]):
            count = col3.count_documents({
                "tags": tag,
                "activeStatus": "Active",
                "effEndDateTime": {"$gt": TODAY}
            })
            print(f"    {tag}: {count}")
else:
    print("  Collection is empty!")

# --- 4. Check fremenbankReconcileList (non-Hist) ---
print("\n" + "=" * 70)
print("4. Other reconcile-related collections")
print("=" * 70)
for c in fremen_cols:
    if "reconcil" in c.lower():
        col = db[c]
        count = col.estimated_document_count()
        print(f"\n  {c}: ~{count} docs")
        if count > 0:
            s = col.find_one()
            if s:
                print(f"    Fields: {sorted(s.keys())[:15]}")
                # Check for refTypeId
                rts = col.distinct("refTypeId")
                if rts:
                    print(f"    Distinct refTypeId: {rts[:10]}")
                # Check activeStatus
                statuses = col.distinct("activeStatus")
                if statuses:
                    print(f"    Distinct activeStatus: {statuses[:10]}")

client.close()
print("\n\nDone!")
