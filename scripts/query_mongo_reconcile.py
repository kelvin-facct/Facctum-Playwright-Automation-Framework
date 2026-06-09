"""
Query MongoDB: fremenbankDowjonesListHist collection
- Reads sourceNaturalKey values from CSV
- Queries for documents where:
    idNumberTypesList.idType = 'UK Sanctions List Unique ID'
    idNumberTypesList.idValue IN (sourceNaturalKey values from CSV)
- Returns: sanctionsReferencesList.listProviderCode, sourceId, matched idValue
"""

import csv
import sys
from pymongo import MongoClient

# --- Configuration ---
MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
MONGO_DB = "screenDB"
COLLECTION = "fremenbankDowjonesListHist"
CSV_PATH = r"C:\Users\ReemaSingh\Downloads\screenDB.fremenbankReconcileList.csv"
OUTPUT_PATH = r"C:\Users\ReemaSingh\Downloads\reconcile_matching_sourceIDs.csv"

# --- Step 1: Read sourceNaturalKey values from CSV ---
print(f"Reading CSV: {CSV_PATH}")
source_natural_keys = []
with open(CSV_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = row.get("sourceNaturalKey", "").strip()
        if key:
            source_natural_keys.append(key)

print(f"Loaded {len(source_natural_keys)} sourceNaturalKey values from CSV")
print(f"Sample values: {source_natural_keys[:5]}")

# Convert to set for fast lookup
source_natural_keys_set = set(source_natural_keys)

# --- Step 2: Connect to MongoDB ---
print(f"\nConnecting to MongoDB: {MONGO_DB}")
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
collection = db[COLLECTION]

# Quick connectivity check
doc_count = collection.estimated_document_count()
print(f"Collection '{COLLECTION}' has ~{doc_count} documents")

# --- Step 3: Query MongoDB ---
print(f"\nQuerying for documents matching:")
print(f"  idNumberTypesList.idType = 'UK Sanctions List Unique ID'")
print(f"  idNumberTypesList.idValue IN ({len(source_natural_keys)} values from CSV)")

query = {
    "idNumberTypesList": {
        "$elemMatch": {
            "idType": "UK Sanctions List Unique ID",
            "idValue": {"$in": source_natural_keys}
        }
    }
}

# Project required fields
projection = {
    "sourceId": 1,
    "sanctionsReferencesList.listProviderCode": 1,
    "idNumberTypesList.idType": 1,
    "idNumberTypesList.idValue": 1,
    "_id": 0
}

results = list(collection.find(query, projection))
print(f"\nFound {len(results)} matching documents")

# --- Step 4: Extract required fields ---
output_rows = []
for doc in results:
    source_id = doc.get("sourceId", "N/A")
    
    # Get matched idValue (UK Sanctions List Unique ID that matches CSV)
    matched_id_value = ""
    for id_entry in doc.get("idNumberTypesList", []):
        if (id_entry.get("idType") == "UK Sanctions List Unique ID" 
            and id_entry.get("idValue") in source_natural_keys_set):
            matched_id_value = id_entry.get("idValue", "")
            break
    
    # Get all listProviderCode values from sanctionsReferencesList
    list_provider_codes = []
    for ref in doc.get("sanctionsReferencesList", []):
        code = ref.get("listProviderCode", "")
        if code:
            list_provider_codes.append(code)
    
    # Join multiple codes with pipe separator
    list_provider_code_str = " | ".join(sorted(set(list_provider_codes)))
    
    output_rows.append({
        "sourceId": source_id,
        "matchedIdValue": matched_id_value,
        "listProviderCode": list_provider_code_str
    })

# --- Step 5: Print results ---
print(f"\n{'='*80}")
print(f"{'sourceId':<15} {'matchedIdValue':<15} {'listProviderCode'}")
print(f"{'='*80}")
for item in output_rows[:50]:
    print(f"{str(item['sourceId']):<15} {item['matchedIdValue']:<15} {item['listProviderCode']}")

if len(output_rows) > 50:
    print(f"... and {len(output_rows) - 50} more records")

# --- Step 6: Save to CSV ---
print(f"\nSaving all {len(output_rows)} results to: {OUTPUT_PATH}")
with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sourceId", "matchedIdValue", "listProviderCode"])
    writer.writeheader()
    writer.writerows(output_rows)

print(f"Done! Results saved to {OUTPUT_PATH}")

# --- Cleanup ---
client.close()
