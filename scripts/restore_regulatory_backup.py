#!/usr/bin/env python3
"""Restore regulatory list data from backup"""
import json
from pymongo import MongoClient
from bson import ObjectId

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
DATABASE = "screenDB"
BACKUP_FILE = "regulatory_backup_20260410_210435.json"

def restore():
    client = MongoClient(MONGO_URI)
    db = client[DATABASE]
    
    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        backup = json.load(f)
    
    # Restore facctumRegulatoryList
    for doc in backup["facctumRegulatoryList"]:
        doc_id = ObjectId(doc["_id"])
        del doc["_id"]
        db["facctumRegulatoryList"].replace_one({"_id": doc_id}, doc)
        print(f"Restored reg_list: {doc_id}")
    
    # Restore facctumRegulatoryListHist
    for doc in backup["facctumRegulatoryListHist"]:
        doc_id = ObjectId(doc["_id"])
        del doc["_id"]
        db["facctumRegulatoryListHist"].replace_one({"_id": doc_id}, doc)
        print(f"Restored hist: {doc_id}")
    
    print(f"\nRestored {len(backup['facctumRegulatoryList'])} reg_list docs")
    print(f"Restored {len(backup['facctumRegulatoryListHist'])} hist docs")

if __name__ == "__main__":
    restore()
