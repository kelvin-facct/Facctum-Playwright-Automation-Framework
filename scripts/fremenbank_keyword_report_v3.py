#!/usr/bin/env python3
"""
Generate Excel report with count of active records from fremenbankRefinitivListHist
- Sheet 1: Count per individual keyword
- Sheet 2: Count per keyword combination (for records with multiple keywords)
Uses indexed filters and throttled reads to reduce MongoDB load.
"""
from datetime import datetime, timezone
from pymongo import MongoClient
from collections import defaultdict
import pandas as pd
import time

MONGO_PORTS = [27017, 27018, 27019]
MONGO_USER = "qasaasuserrw"
MONGO_PASS = "ZnTwAy0eTbaNdX1U"
DATABASE = "screenDB"

def get_secondary_connection():
    """Try all ports and return connection to secondary node"""
    from pymongo.errors import ServerSelectionTimeoutError
    
    for port in MONGO_PORTS:
        try:
            uri = f"mongodb://{MONGO_USER}:{MONGO_PASS}@127.0.0.1:{port}/?tls=true&directConnection=true&tlsInsecure=true"
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            # Check if this is secondary
            is_master = client.admin.command('isMaster')
            if is_master.get('secondary', False):
                print(f"  Found SECONDARY node on port {port}")
                return client
            elif is_master.get('ismaster', False):
                print(f"  Port {port} is PRIMARY, skipping...")
            else:
                print(f"  Port {port} connected but role unclear")
        except ServerSelectionTimeoutError:
            print(f"  Port {port} not available")
        except Exception as e:
            print(f"  Port {port} error: {e}")
    
    # Fallback: try any available port with secondary read preference
    for port in MONGO_PORTS:
        try:
            uri = f"mongodb://{MONGO_USER}:{MONGO_PASS}@127.0.0.1:{port}/?tls=true&directConnection=true&tlsInsecure=true&readPreference=secondaryPreferred"
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            print(f"  Using port {port} with secondaryPreferred")
            return client
        except:
            pass
    
    raise Exception("No MongoDB connection available on ports 27017, 27018, 27019")
COLLECTION = "fremenbankRefinitivListHist"
OUTPUT_DIR = r"C:\Users\ReemaSingh\Downloads"
BATCH_SIZE = 1000
THROTTLE_DELAY = 0.1  # seconds between batches

def main():
    # Generate timestamp for output file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"{OUTPUT_DIR}\\Fremenbank_Keyword_Report_{timestamp}.xlsx"
    
    print(f"Connecting to MongoDB (looking for secondary node)...")
    client = get_secondary_connection()
    db = client[DATABASE]
    collection = db[COLLECTION]
    
    future_date = datetime.now(timezone.utc)
    print(f"Current UTC time: {future_date}")
    
    # Step 1: Get distinct keywords using indexed field
    print(f"\nStep 1: Getting distinct keywords...")
    all_keywords = collection.distinct("keywords", {"effEndDateTime": {"$gt": future_date}})
    print(f"  Found {len(all_keywords)} unique keywords")
    
    # Count per single keyword
    single_keyword_counts = {}
    # Track wcIds per keyword
    keyword_wcids = defaultdict(set)
    # Count per keyword combination
    combo_keyword_counts = defaultdict(int)
    
    # Step 2: For each keyword, count records using indexed query
    print(f"\nStep 2: Counting records per keyword (throttled)...")
    for i, kw in enumerate(all_keywords):
        # Use indexed filter on keywords array
        query = {
            "keywords": kw,
            "effEndDateTime": {"$gt": future_date}
        }
        
        # Get count for this keyword
        count = collection.count_documents(query)
        single_keyword_counts[kw] = count
        
        print(f"  [{i+1}/{len(all_keywords)}] {kw}: {count:,}")
        time.sleep(THROTTLE_DELAY)  # Throttle reads
    
    # Step 3: Get records with multiple keywords for combination counting
    print(f"\nStep 3: Counting keyword combinations (throttled)...")
    query = {
        "effEndDateTime": {"$gt": future_date},
        "keywords.1": {"$exists": True}  # Has at least 2 keywords
    }
    projection = {"keywords": 1, "_id": 0}
    
    cursor = collection.find(query, projection).batch_size(BATCH_SIZE)
    batch_count = 0
    
    for doc in cursor:
        keywords = doc.get("keywords", [])
        if len(keywords) > 1:
            combo_key = tuple(sorted(keywords))
            combo_keyword_counts[combo_key] += 1
        
        batch_count += 1
        if batch_count % BATCH_SIZE == 0:
            print(f"  Processed {batch_count:,} multi-keyword records...")
            time.sleep(THROTTLE_DELAY)
    
    print(f"  Total multi-keyword records: {batch_count:,}")
    
    if not single_keyword_counts:
        print("No active records found!")
        return
    
    # Create DataFrames
    # Sheet 1: Single keyword counts
    single_data = [{"Keyword": k, "Count": v} for k, v in single_keyword_counts.items()]
    df_single = pd.DataFrame(single_data).sort_values("Count", ascending=False)
    
    # Sheet 2: Keyword combinations (records with multiple keywords)
    combo_data = [{"Keyword_Combination": " + ".join(k), "Count": v} 
                  for k, v in combo_keyword_counts.items()]
    df_combo = pd.DataFrame(combo_data).sort_values("Count", ascending=False) if combo_data else pd.DataFrame()
    
    # Save to Excel with multiple sheets
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df_single.to_excel(writer, index=False, sheet_name="Per Keyword")
        if not df_combo.empty:
            df_combo.to_excel(writer, index=False, sheet_name="Keyword Combinations")
    
    print(f"\nReport Summary:")
    print(f"  Unique keywords: {len(single_keyword_counts):,}")
    print(f"  Total single keyword count: {sum(single_keyword_counts.values()):,}")
    print(f"  Records with multiple keywords: {sum(combo_keyword_counts.values()):,}")
    print(f"  Unique keyword combinations: {len(combo_keyword_counts):,}")
    print(f"\nTop 10 keywords:")
    for kw, cnt in sorted(single_keyword_counts.items(), key=lambda x: -x[1])[:10]:
        print(f"  {kw}: {cnt:,}")
    print(f"\nReport saved to: {output_file}")

if __name__ == "__main__":
    main()
