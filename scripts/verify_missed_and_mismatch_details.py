"""
Verify missed records and show detailed mismatch samples.
1. For 9 missed EU records: check if they truly exist in Regulatory but NOT in DowJones
2. For mismatched records: show unique samples per list with full attribute details
"""

from datetime import datetime, timezone
from pymongo import MongoClient

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
client = MongoClient(MONGO_URI)
db = client["screenDB"]

TODAY = datetime.now(timezone.utc)
print(f"Connected. Time: {TODAY.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")

# ============================================================
# PART 1: Verify 9 missed EU records
# ============================================================
print("=" * 80)
print("PART 1: VERIFYING 9 MISSED EU RECORDS")
print("=" * 80)

recon_col = db["fremenbankReconcileList"]
reg_col = db["fremenbankRegulatoryListHist"]
dj_col = db["fremenbankDowjonesListHist"]

# Get the 9 missed records
missed_records = list(recon_col.find({
    "listName": "EU Vs Dowjones",
    "reconTypeId": 1,
    "effEndDateTime": {"$gt": TODAY}
}))

print(f"\nFound {len(missed_records)} missed records in reconcile collection.\n")

for i, rec in enumerate(missed_records, 1):
    snk = rec.get("sourceNaturalKey", "")
    name = rec.get("primaryName", "")
    entity_type = rec.get("entityTypeName", "")
    list_entry_id = rec.get("listEntryId", "")
    
    print(f"--- Record {i}/{len(missed_records)} ---")
    print(f"  sourceNaturalKey: {snk}")
    print(f"  listEntryId:      {list_entry_id}")
    print(f"  primaryName:      {name}")
    print(f"  entityType:       {entity_type}")
    print(f"  statusId:         {rec.get('statusId')}")
    print(f"  addedDateTime:    {rec.get('addedDateTime')}")
    
    # Check 1: Does it exist in fremenbankRegulatoryListHist (EU, active)?
    reg_record = reg_col.find_one({
        "listName": "EU",
        "sourceNaturalKey": snk,
        "effEndDateTime": {"$gt": TODAY}
    })
    
    if reg_record:
        print(f"  ✓ EXISTS in RegulatoryListHist (EU, active)")
        print(f"    Reg primaryName: {reg_record.get('primaryName')}")
        print(f"    Reg statusId:    {reg_record.get('statusId')}")
        # Show ID numbers from regulatory
        ids = reg_record.get("idNumberTypesList", [])
        if ids:
            print(f"    Reg ID types:    {[x.get('idType') for x in ids]}")
    else:
        # Check without active filter
        reg_any = reg_col.find_one({"listName": "EU", "sourceNaturalKey": snk})
        if reg_any:
            print(f"  ⚠ EXISTS in RegulatoryListHist but NOT active (effEndDateTime: {reg_any.get('effEndDateTime')})")
        else:
            print(f"  ✗ NOT FOUND in RegulatoryListHist at all")
    
    # Check 2: Does it exist in DowJones with EU Consolidated Electronic List ID?
    dj_record = dj_col.find_one({
        "activeStatus": "Active",
        "effEndDateTime": {"$gt": TODAY},
        "idNumberTypesList": {
            "$elemMatch": {
                "idType": "EU Consolidated Electronic List ID",
                "idValue": snk
            }
        }
    })
    
    if dj_record:
        print(f"  ⚠ FOUND in DowJones with matching EU ID! (sourceId: {dj_record.get('sourceId')})")
        print(f"    DJ primaryName: {dj_record.get('primaryName')}")
        print(f"    → This may NOT be truly missed!")
    else:
        # Also try partial match on sourceNaturalKey
        dj_partial = dj_col.find_one({
            "activeStatus": "Active",
            "effEndDateTime": {"$gt": TODAY},
            "idNumberTypesList.idValue": snk
        })
        if dj_partial:
            # Find which idType matched
            for id_entry in dj_partial.get("idNumberTypesList", []):
                if id_entry.get("idValue") == snk:
                    print(f"  ⚠ Found in DowJones but with idType: '{id_entry.get('idType')}' (not EU Consolidated)")
                    print(f"    DJ sourceId: {dj_partial.get('sourceId')}, name: {dj_partial.get('primaryName')}")
                    break
        else:
            print(f"  ✓ CONFIRMED MISSED: Not found in DowJones with idValue={snk}")
    
    print()

# ============================================================
# PART 2: Detailed Mismatch Samples (unique per list + type)
# ============================================================
print("\n" + "=" * 80)
print("PART 2: MISMATCHED RECORDS - UNIQUE SAMPLES PER LIST")
print("=" * 80)

LISTS = [
    "UK SANCTIONS Vs Dowjones",
    "EU Vs Dowjones",
    "UN Vs Dowjones",
    "OFAC Vs Dowjones",
    "OFAC Enhanced Vs Dowjones",
]

for list_name in LISTS:
    print(f"\n{'─' * 80}")
    print(f"  {list_name}")
    print(f"{'─' * 80}")
    
    # Get mismatched records for this list
    mismatch_cursor = recon_col.find({
        "listName": list_name,
        "reconTypeId": 2,
        "effEndDateTime": {"$gt": TODAY}
    }).limit(200)  # Get enough to find unique types
    
    # Group by mismatch attribute type, keep one sample per type
    seen_types = {}
    
    for doc in mismatch_cursor:
        mismatch_list = doc.get("mismatchList", [])
        for mm in mismatch_list:
            for detail in mm.get("mismatchDtl", []):
                field_name = detail.get("fieldName", "")
                base_type = field_name.split(".")[0] if "." in field_name else field_name
                
                if base_type not in seen_types:
                    seen_types[base_type] = {
                        "doc": doc,
                        "mm": mm,
                        "detail": detail,
                        "field_name": field_name,
                    }
    
    if not seen_types:
        print("  No mismatched records found.")
        continue
    
    for attr_type, info in sorted(seen_types.items()):
        doc = info["doc"]
        mm = info["mm"]
        detail = info["detail"]
        
        print(f"\n  ▶ Mismatch Type: {info['field_name']}")
        print(f"    sourceNaturalKey (Regulatory): {doc.get('sourceNaturalKey')}")
        print(f"    primaryName (Regulatory):      {doc.get('primaryName')}")
        print(f"    entityType:                    {doc.get('entityTypeName')}")
        print(f"    clSourceNaturalKey (DowJones): {mm.get('clSourceNaturalKey')}")
        print(f"    clPrimaryName (DowJones):      {mm.get('primaryName')}")
        print(f"    Mismatch field:                {detail.get('fieldName')}")
        print(f"    Mismatch value:                {detail.get('value')}")
        
        # Get full details from both source collections for comparison
        snk = doc.get("sourceNaturalKey")
        cl_snk = mm.get("clSourceNaturalKey")
        reg_name = list_name.split(" Vs ")[0]
        
        # Regulatory record
        reg_rec = reg_col.find_one({
            "listName": reg_name,
            "sourceNaturalKey": snk,
            "effEndDateTime": {"$gt": TODAY}
        })
        
        # DowJones record
        dj_rec = None
        if cl_snk:
            dj_rec = dj_col.find_one({
                "sourceId": int(cl_snk) if cl_snk.isdigit() else cl_snk,
                "activeStatus": "Active",
                "effEndDateTime": {"$gt": TODAY}
            })
        
        if attr_type == "nameDetailsList":
            print(f"\n    --- Name Comparison ---")
            if reg_rec:
                reg_names = reg_rec.get("nameDetailsList", [])
                print(f"    Regulatory names ({len(reg_names)}):")
                for n in reg_names[:5]:
                    parts = []
                    for f in ["firstName", "middleName", "lastName", "fullName", "entityName", "wholeName"]:
                        v = n.get(f, "")
                        if v:
                            parts.append(f"{f}={v}")
                    quality = n.get("nameQuality", n.get("aliasQuality", ""))
                    print(f"      {' | '.join(parts)} [quality: {quality}]")
                if len(reg_names) > 5:
                    print(f"      ... +{len(reg_names)-5} more")
            
            if dj_rec:
                dj_names = dj_rec.get("nameDetailsList", [])
                print(f"    DowJones names ({len(dj_names)}):")
                for n in dj_names[:5]:
                    parts = []
                    for f in ["firstName", "middleName", "lastName", "fullName", "entityName", "wholeName"]:
                        v = n.get(f, "")
                        if v:
                            parts.append(f"{f}={v}")
                    quality = n.get("nameQuality", n.get("aliasQuality", ""))
                    print(f"      {' | '.join(parts)} [quality: {quality}]")
                if len(dj_names) > 5:
                    print(f"      ... +{len(dj_names)-5} more")
        
        elif attr_type == "dateDetailsList":
            print(f"\n    --- Date of Birth Comparison ---")
            if reg_rec:
                reg_dates = reg_rec.get("birthDateDetailsList", reg_rec.get("dateDetailsList", []))
                print(f"    Regulatory dates: {reg_dates[:3]}")
            if dj_rec:
                dj_dates = dj_rec.get("dateDetailsList", [])
                dob_entries = [d for d in dj_dates if "birth" in d.get("dateType", "").lower()]
                print(f"    DowJones DOB entries: {dob_entries[:3]}")
        
        elif attr_type == "idDetailsList":
            print(f"\n    --- ID Number Comparison ---")
            if reg_rec:
                reg_ids = reg_rec.get("idNumberTypesList", [])
                print(f"    Regulatory IDs ({len(reg_ids)}):")
                for id_entry in reg_ids[:5]:
                    print(f"      {id_entry.get('idType')}: {id_entry.get('idValue')}")
            if dj_rec:
                dj_ids = dj_rec.get("idNumberTypesList", [])
                print(f"    DowJones IDs ({len(dj_ids)}):")
                for id_entry in dj_ids[:5]:
                    print(f"      {id_entry.get('idType')}: {id_entry.get('idValue')}")
                if len(dj_ids) > 5:
                    print(f"      ... +{len(dj_ids)-5} more")

client.close()
print("\n\nDone.")
