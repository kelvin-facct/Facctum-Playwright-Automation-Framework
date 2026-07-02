"""
Deep explore: active data in regulatory and reconcile collections.
"""
from pymongo import MongoClient
from datetime import datetime, timezone

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
client = MongoClient(MONGO_URI)
db = client["screenDB"]

TODAY = datetime.now(timezone.utc)

print("=" * 70)
print("A. fremenbankRegulatoryList (non-Hist) - Current Active Data")
print("=" * 70)
col_reg = db["fremenbankRegulatoryList"]
print(f"Total: ~{col_reg.estimated_document_count()}")

sample = col_reg.find_one()
if sample:
    print(f"Fields: {sorted(sample.keys())}")
    for key in sorted(sample.keys()):
        val = sample[key]
        if isinstance(val, (str, int, float, bool, datetime)):
            print(f"  {key} = {val}")

# Check effEndDateTime distribution
active_reg = col_reg.count_documents({"effEndDateTime": {"$gt": TODAY}})
print(f"\nActive (effEndDateTime > today): {active_reg}")

# Count by listName
list_names = col_reg.distinct("listName")
print(f"\nDistinct listName values: {list_names}")
print("\nActive counts per list:")
for ln in sorted(list_names):
    count = col_reg.count_documents({"listName": ln, "effEndDateTime": {"$gt": TODAY}})
    print(f"  {ln}: {count}")

print("\n" + "=" * 70)
print("B. fremenbankRegulatoryListHist - Check statusId for active")
print("=" * 70)
col_reg_hist = db["fremenbankRegulatoryListHist"]

# Check statusId values (2000 = active typically)
status_ids = col_reg_hist.distinct("statusId")
print(f"Distinct statusId values: {status_ids}")

# Count by listName and statusId=2000 (active)
print("\nRecords with statusId=2000 per list:")
for ln in ["UK SANCTIONS", "EU", "UN", "OFAC", "OFAC Enhanced"]:
    count = col_reg_hist.count_documents({"listName": ln, "statusId": 2000})
    print(f"  {ln}: {count}")

# Check with effEndDateTime > today
print("\nRecords with effEndDateTime > today per list:")
for ln in ["UK SANCTIONS", "EU", "UN", "OFAC", "OFAC Enhanced"]:
    count = col_reg_hist.count_documents({"listName": ln, "effEndDateTime": {"$gt": TODAY}})
    print(f"  {ln}: {count}")

# Max effEndDateTime
from pymongo import DESCENDING
latest = col_reg_hist.find_one({"listName": "UK SANCTIONS"}, sort=[("effEndDateTime", DESCENDING)])
if latest:
    print(f"\nLatest effEndDateTime for UK SANCTIONS: {latest.get('effEndDateTime')}")

print("\n" + "=" * 70)
print("C. fremenbankReconcileList - Reconciliation Data")
print("=" * 70)
col_recon = db["fremenbankReconcileList"]
print(f"Total: ~{col_recon.estimated_document_count()}")

sample_r = col_recon.find_one()
if sample_r:
    print(f"\nSample document:")
    for key in sorted(sample_r.keys()):
        val = sample_r[key]
        if isinstance(val, (str, int, float, bool, datetime)):
            print(f"  {key} = {val}")
        elif isinstance(val, list):
            print(f"  {key} = [list, {len(val)} items]")
            if len(val) > 0 and len(val) <= 3:
                for item in val[:2]:
                    print(f"    {item}")

# reconTypeId values (1 = missed, 2 = mismatch?)
recon_types = col_recon.distinct("reconTypeId")
print(f"\nDistinct reconTypeId: {recon_types}")
for rt in sorted(recon_types):
    count = col_recon.count_documents({"reconTypeId": rt})
    print(f"  reconTypeId={rt}: {count}")

# By listName
recon_lists = col_recon.distinct("listName")
print(f"\nDistinct listName in reconcile: {recon_lists}")
print("\nCounts per listName and reconTypeId:")
for ln in sorted(recon_lists):
    for rt in sorted(recon_types):
        count = col_recon.count_documents({"listName": ln, "reconTypeId": rt})
        if count > 0:
            print(f"  {ln} | reconTypeId={rt}: {count}")

# Check mismatchList structure
print("\nSample mismatchList:")
mismatch_sample = col_recon.find_one({"mismatchList": {"$ne": []}, "mismatchList": {"$exists": True}})
if mismatch_sample:
    print(f"  reconTypeId: {mismatch_sample.get('reconTypeId')}")
    print(f"  listName: {mismatch_sample.get('listName')}")
    print(f"  primaryName: {mismatch_sample.get('primaryName')}")
    print(f"  mismatchList: {mismatch_sample.get('mismatchList')[:3]}")

print("\n" + "=" * 70)
print("D. fremenbankDowjonesListHist - Active with idNumberTypesList")
print("=" * 70)
col_dj = db["fremenbankDowjonesListHist"]

# Count active DowJones records that have relevant ID types
for id_type in ["OFAC Unique ID", "EU Consolidated Electronic List ID", 
                "UN Permanent Reference No.", "UK Sanctions List Unique ID"]:
    count = col_dj.count_documents({
        "activeStatus": "Active",
        "effEndDateTime": {"$gt": TODAY},
        "idNumberTypesList.idType": id_type
    })
    print(f"  Active with '{id_type}': {count}")

# Check sanctionsReferencesList.listProviderCode distribution for active
print("\nSample active record with UK Sanctions ID:")
uk_sample = col_dj.find_one({
    "activeStatus": "Active",
    "effEndDateTime": {"$gt": TODAY},
    "idNumberTypesList.idType": "UK Sanctions List Unique ID"
}, {"sourceId": 1, "primaryName": 1, "idNumberTypesList": 1, "sanctionsReferencesList.listProviderCode": 1, "_id": 0})
if uk_sample:
    print(f"  sourceId: {uk_sample.get('sourceId')}")
    print(f"  primaryName: {uk_sample.get('primaryName')}")
    id_vals = [e.get('idValue') for e in uk_sample.get('idNumberTypesList', []) if e.get('idType') == 'UK Sanctions List Unique ID']
    print(f"  UK Sanctions IDs: {id_vals[:5]}")
    providers = [e.get('listProviderCode') for e in uk_sample.get('sanctionsReferencesList', [])]
    print(f"  Provider codes: {sorted(set(providers))}")

client.close()
print("\n\nDone!")
