#!/usr/bin/env python3
"""
Query fremenbankPressReleaseList collection for listID 93
Validates data against IList Excel template requirements (30 columns A-AD)

Usage: python scripts/query_press_release_list93.py
"""
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from datetime import datetime, timezone
import json

MONGO_PORTS = [27017, 27018, 27019, 27023]
MONGO_USER = "qasaasuserrw"
MONGO_PASS = "ZnTwAy0eTbaNdX1U"
DATABASE = "screenDB"
COLLECTION = "fremenbankPressReleaseList"
LIST_ID = 93


def get_connection():
    """Try all ports and return first successful connection"""
    for port in MONGO_PORTS:
        try:
            uri = f"mongodb://{MONGO_USER}:{MONGO_PASS}@127.0.0.1:{port}/?tls=true&directConnection=true&tlsInsecure=true"
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            print(f"  ✅ Connected on port {port}")
            return client
        except ServerSelectionTimeoutError:
            print(f"  Port {port} not available")
        except Exception as e:
            print(f"  Port {port} error: {e}")

    # Try without TLS (local tunnel)
    for port in MONGO_PORTS:
        try:
            uri = f"mongodb://127.0.0.1:{port}/?directConnection=true"
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            print(f"  ✅ Connected on port {port} (no auth/TLS)")
            return client
        except:
            pass

    raise Exception("No MongoDB connection available")


def main():
    print("=" * 70)
    print(f"  Query: {COLLECTION} | listID: {LIST_ID}")
    print("=" * 70)

    print("\nConnecting to MongoDB...")
    client = get_connection()
    db = client[DATABASE]
    collection = db[COLLECTION]

    # 1. Get total count for listID 93
    print(f"\n--- Collection Stats for listID {LIST_ID} ---")
    total_count = collection.count_documents({"listId": LIST_ID})
    print(f"  Total documents: {total_count}")

    if total_count == 0:
        # Try string version of listId
        total_count = collection.count_documents({"listId": str(LIST_ID)})
        print(f"  Total documents (listId as string): {total_count}")
        if total_count == 0:
            # Try listID (capital D)
            total_count = collection.count_documents({"listID": LIST_ID})
            print(f"  Total documents (listID capital): {total_count}")

    # 2. Get sample document to understand structure
    print(f"\n--- Sample Document Structure ---")
    sample = collection.find_one({"listId": LIST_ID}) or collection.find_one({"listId": str(LIST_ID)}) or collection.find_one({"listID": LIST_ID})
    if not sample:
        # Try without filter to see what's in the collection
        sample = collection.find_one()
        if sample:
            print(f"  No docs with listId={LIST_ID}. Sample doc keys: {list(sample.keys())}")
            # Check what listId values exist
            distinct_list_ids = collection.distinct("listId")
            print(f"  Distinct listId values (first 20): {distinct_list_ids[:20]}")
            distinct_list_ids2 = collection.distinct("listID")
            if distinct_list_ids2:
                print(f"  Distinct listID values (first 20): {distinct_list_ids2[:20]}")
        else:
            print(f"  Collection is empty!")
            # List all collections
            all_collections = db.list_collection_names()
            press_collections = [c for c in all_collections if 'press' in c.lower() or 'Press' in c]
            print(f"  Press-related collections: {press_collections}")
            print(f"  All collections (first 30): {sorted(all_collections)[:30]}")
        client.close()
        return

    print(f"  Document keys: {list(sample.keys())}")
    # Print sample without _id (too long)
    sample_clean = {k: v for k, v in sample.items() if k != '_id'}
    # Truncate long values
    for k, v in sample_clean.items():
        if isinstance(v, str) and len(v) > 200:
            sample_clean[k] = v[:200] + "..."
        elif isinstance(v, list) and len(v) > 5:
            sample_clean[k] = v[:5] + ["... (truncated)"]
        elif isinstance(v, dict):
            sample_clean[k] = {sk: sv for sk, sv in list(v.items())[:10]}
    print(f"  Sample: {json.dumps(sample_clean, default=str, indent=2)}")

    # 3. Get distinct entity types
    print(f"\n--- Entity Types ---")
    entity_types = collection.distinct("type", {"listId": LIST_ID})
    if not entity_types:
        entity_types = collection.distinct("entityType", {"listId": LIST_ID})
    if not entity_types:
        entity_types = collection.distinct("type")
    print(f"  Types: {entity_types}")

    # 4. Count by type
    print(f"\n--- Count by Type ---")
    for t in entity_types:
        count = collection.count_documents({"listId": LIST_ID, "type": t})
        if count == 0:
            count = collection.count_documents({"type": t})
        print(f"  {t}: {count}")

    # 5. Check for key fields needed by IList Excel template
    print(f"\n--- IList Excel Template Field Availability ---")
    required_fields = [
        "recordId", "wcId", "uid", "type", "entityType",
        "lastName", "primaryName", "name", "firstName",
        "akas", "aliases", "otherNames",
        "addresses", "address",
        "ids", "identifiers", "idNumbers",
        "additionalInfo", "supplementaryInfo",
        "keywords", "nationality", "occupation", "dateOfBirth", "dob",
        "listCode", "designation", "action",
        "effStartDateTime", "effEndDateTime", "createdDate", "updatedDate",
    ]

    for field in required_fields:
        # Check if field exists in any document
        exists_count = collection.count_documents({field: {"$exists": True}, "listId": LIST_ID})
        if exists_count == 0:
            exists_count = collection.count_documents({field: {"$exists": True}})
        if exists_count > 0:
            print(f"  ✅ {field}: {exists_count} docs")
        # Don't print missing fields to reduce noise

    # 6. Get 5 sample records with full data
    print(f"\n--- First 5 Records (listId={LIST_ID}) ---")
    cursor = collection.find({"listId": LIST_ID}).limit(5)
    records = list(cursor)
    if not records:
        cursor = collection.find().limit(5)
        records = list(cursor)

    for i, rec in enumerate(records):
        print(f"\n  Record {i+1}:")
        for k, v in rec.items():
            if k == '_id':
                continue
            val_str = str(v)
            if len(val_str) > 150:
                val_str = val_str[:150] + "..."
            print(f"    {k}: {val_str}")

    # 7. Check delta records (recently modified)
    print(f"\n--- Recent Delta Records (last 7 days) ---")
    from datetime import timedelta
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    delta_fields = ["updatedDate", "effStartDateTime", "lastModified", "modifiedDate"]
    for field in delta_fields:
        delta_count = collection.count_documents({field: {"$gte": week_ago}, "listId": LIST_ID})
        if delta_count > 0:
            print(f"  {field} >= 7 days ago: {delta_count} records")

    print(f"\n{'=' * 70}")
    print(f"  Query complete. Collection: {COLLECTION}, listId: {LIST_ID}")
    print(f"{'=' * 70}")

    client.close()


if __name__ == "__main__":
    main()
