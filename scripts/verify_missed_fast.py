"""
Fast verification: show missed records details and verify against DowJones in batch.
"""
from datetime import datetime, timezone
from pymongo import MongoClient

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
client = MongoClient(MONGO_URI)
db = client["screenDB"]
TODAY = datetime.now(timezone.utc)

recon_col = db["fremenbankReconcileList"]
reg_col = db["fremenbankRegulatoryListHist"]
dj_col = db["fremenbankDowjonesListHist"]

# ============================================================
# PART 1: Get all 9 missed EU records and batch-check DowJones
# ============================================================
print("=" * 80)
print("MISSED EU RECORDS - VERIFICATION")
print("=" * 80)

missed = list(recon_col.find({
    "listName": "EU Vs Dowjones",
    "reconTypeId": 1,
    "effEndDateTime": {"$gt": TODAY}
}))

print(f"Found {len(missed)} missed records.\n")

# Collect all sourceNaturalKey values
snk_values = [r.get("sourceNaturalKey", "") for r in missed]
print(f"sourceNaturalKeys to verify: {snk_values}\n")

# Batch check DowJones: do any of these exist with EU ID type?
dj_matches = list(dj_col.find({
    "activeStatus": "Active",
    "effEndDateTime": {"$gt": TODAY},
    "idNumberTypesList": {
        "$elemMatch": {
            "idType": "EU Consolidated Electronic List ID",
            "idValue": {"$in": snk_values}
        }
    }
}, {"sourceId": 1, "primaryName": 1, "idNumberTypesList.idType": 1, "idNumberTypesList.idValue": 1, "_id": 0}))

print(f"DowJones matches found: {len(dj_matches)}")
dj_matched_ids = set()
for m in dj_matches:
    for id_entry in m.get("idNumberTypesList", []):
        if id_entry.get("idType") == "EU Consolidated Electronic List ID" and id_entry.get("idValue") in snk_values:
            dj_matched_ids.add(id_entry["idValue"])
            print(f"  Found in DJ: {id_entry['idValue']} -> sourceId={m.get('sourceId')}, name={m.get('primaryName')}")

print(f"\n{'─' * 80}")
print(f"{'#':<4} {'sourceNaturalKey':<18} {'primaryName':<35} {'entityType':<12} {'In DJ?'}")
print(f"{'─' * 80}")

for i, rec in enumerate(missed, 1):
    snk = rec.get("sourceNaturalKey", "")
    in_dj = "YES ⚠" if snk in dj_matched_ids else "NO ✓ (missed)"
    print(f"{i:<4} {snk:<18} {rec.get('primaryName', ''):<35} {rec.get('entityTypeName', ''):<12} {in_dj}")

truly_missed = [r for r in missed if r.get("sourceNaturalKey") not in dj_matched_ids]
print(f"\n✓ CONFIRMED: {len(truly_missed)} records are truly missed (exist in EU Regulatory but NOT in DowJones)")
if dj_matched_ids:
    print(f"⚠ WARNING: {len(dj_matched_ids)} records DO exist in DowJones - may be false positives")

# Also verify they exist in Regulatory
print(f"\n--- Checking Regulatory presence ---")
for rec in missed:
    snk = rec.get("sourceNaturalKey", "")
    reg = reg_col.find_one({"listName": "EU", "sourceNaturalKey": snk, "effEndDateTime": {"$gt": TODAY}})
    status = "✓ Active in Regulatory" if reg else "✗ NOT in Regulatory (active)"
    print(f"  {snk}: {status}")

client.close()
print("\nDone.")
