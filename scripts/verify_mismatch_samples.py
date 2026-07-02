"""
Show unique mismatch samples per list with full attribute comparison.
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

LISTS = [
    "UK SANCTIONS Vs Dowjones",
    "EU Vs Dowjones",
    "UN Vs Dowjones",
    "OFAC Vs Dowjones",
    "OFAC Enhanced Vs Dowjones",
]

print("=" * 80)
print("MISMATCHED RECORDS - UNIQUE SAMPLES PER LIST & ATTRIBUTE TYPE")
print("=" * 80)

for list_name in LISTS:
    print(f"\n{'━' * 80}")
    print(f"  {list_name}")
    print(f"{'━' * 80}")
    
    # Get mismatched records
    mismatch_docs = list(recon_col.find({
        "listName": list_name,
        "reconTypeId": 2,
        "effEndDateTime": {"$gt": TODAY}
    }).limit(100))
    
    # Group by mismatch attribute type, keep one sample per type
    seen_types = {}
    for doc in mismatch_docs:
        for mm in doc.get("mismatchList", []):
            for detail in mm.get("mismatchDtl", []):
                field_name = detail.get("fieldName", "")
                base_type = field_name.split(".")[0] if "." in field_name else field_name
                if base_type not in seen_types:
                    seen_types[base_type] = {"doc": doc, "mm": mm, "detail": detail, "field": field_name}
    
    if not seen_types:
        print("  No mismatched records.")
        continue
    
    for attr_type, info in sorted(seen_types.items()):
        doc = info["doc"]
        mm = info["mm"]
        detail = info["detail"]
        reg_name = list_name.split(" Vs ")[0]
        snk = doc.get("sourceNaturalKey", "")
        cl_snk = mm.get("clSourceNaturalKey", "")
        
        print(f"\n  ▶ MISMATCH TYPE: {info['field']}")
        print(f"    ┌─ Reconcile Record ─────────────────────────────────────")
        print(f"    │ sourceNaturalKey (Reg): {snk}")
        print(f"    │ primaryName (Reg):      {doc.get('primaryName')}")
        print(f"    │ entityType:             {doc.get('entityTypeName')}")
        print(f"    │ clSourceNaturalKey (DJ): {cl_snk}")
        print(f"    │ clPrimaryName (DJ):      {mm.get('primaryName')}")
        print(f"    │ mismatchField:           {detail.get('fieldName')}")
        print(f"    │ mismatchValue:           {detail.get('value')}")
        print(f"    └────────────────────────────────────────────────────────")
        
        # Get regulatory source record
        reg_rec = reg_col.find_one({
            "listName": reg_name,
            "sourceNaturalKey": snk,
            "effEndDateTime": {"$gt": TODAY}
        })
        
        # Get DowJones source record
        dj_rec = None
        if cl_snk and cl_snk.isdigit():
            dj_rec = dj_col.find_one({
                "sourceId": int(cl_snk),
                "activeStatus": "Active",
                "effEndDateTime": {"$gt": TODAY}
            })
        
        if attr_type == "nameDetailsList":
            print(f"\n    ── NAME COMPARISON ──")
            if reg_rec:
                names = reg_rec.get("nameDetailsList", [])
                print(f"    Regulatory ({len(names)} names):")
                for n in names[:6]:
                    parts = []
                    for f in ["firstName", "middleName", "lastName", "fullName", "entityName", "wholeName"]:
                        v = n.get(f, "")
                        if v: parts.append(f"{f}={v}")
                    q = n.get("nameQuality", n.get("aliasQuality", n.get("nameType", "")))
                    print(f"      {' | '.join(parts)}  [{q}]")
                if len(names) > 6:
                    print(f"      ... +{len(names)-6} more aliases")
            
            if dj_rec:
                names = dj_rec.get("nameDetailsList", [])
                print(f"    DowJones ({len(names)} names):")
                for n in names[:6]:
                    parts = []
                    for f in ["firstName", "middleName", "lastName", "fullName", "entityName", "wholeName"]:
                        v = n.get(f, "")
                        if v: parts.append(f"{f}={v}")
                    q = n.get("nameQuality", n.get("aliasQuality", n.get("nameType", "")))
                    print(f"      {' | '.join(parts)}  [{q}]")
                if len(names) > 6:
                    print(f"      ... +{len(names)-6} more aliases")
            
            # Highlight difference
            if reg_rec and dj_rec:
                reg_count = len(reg_rec.get("nameDetailsList", []))
                dj_count = len(dj_rec.get("nameDetailsList", []))
                print(f"    → DIFFERENCE: Regulatory has {reg_count} names, DowJones has {dj_count} names")
                print(f"    → Mismatch detail says: {detail.get('fieldName')}={detail.get('value')}")
        
        elif attr_type == "dateDetailsList":
            print(f"\n    ── DATE OF BIRTH COMPARISON ──")
            if reg_rec:
                dates = reg_rec.get("birthDateDetailsList", [])
                print(f"    Regulatory DOB ({len(dates)} entries):")
                for d in dates[:5]:
                    print(f"      {d}")
            
            if dj_rec:
                all_dates = dj_rec.get("dateDetailsList", [])
                dob = [d for d in all_dates if "birth" in d.get("dateType", "").lower()]
                print(f"    DowJones DOB ({len(dob)} entries):")
                for d in dob[:5]:
                    print(f"      type={d.get('dateType')} | year={d.get('year')} | month={d.get('month')} | day={d.get('day')} | value={d.get('dateValue','')}")
            
            if reg_rec and dj_rec:
                print(f"    → Mismatch detail says: {detail.get('fieldName')}={detail.get('value')}")
        
        elif attr_type == "idDetailsList":
            print(f"\n    ── ID NUMBER COMPARISON ──")
            if reg_rec:
                ids = reg_rec.get("idNumberTypesList", [])
                print(f"    Regulatory IDs ({len(ids)} entries):")
                for entry in ids[:8]:
                    print(f"      {entry.get('idType', 'N/A')}: {entry.get('idValue', 'N/A')}")
                if len(ids) > 8:
                    print(f"      ... +{len(ids)-8} more")
            
            if dj_rec:
                ids = dj_rec.get("idNumberTypesList", [])
                print(f"    DowJones IDs ({len(ids)} entries):")
                for entry in ids[:8]:
                    print(f"      {entry.get('idType', 'N/A')}: {entry.get('idValue', 'N/A')}")
                if len(ids) > 8:
                    print(f"      ... +{len(ids)-8} more")
            
            if reg_rec and dj_rec:
                print(f"    → Mismatch detail says: {detail.get('fieldName')}={detail.get('value')}")

client.close()
print("\n\nDone.")
