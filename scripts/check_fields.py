from pymongo import MongoClient

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
client = MongoClient(MONGO_URI)
db = client["screenDB"]
col = db["fremenbankDowjonesListHist"]

doc = col.find_one(
    {"idNumberTypesList": {"$elemMatch": {"idType": "UK Sanctions List Unique ID"}}},
    {"_id": 0}
)

if doc:
    print("Top-level fields:")
    for key in sorted(doc.keys()):
        val = doc[key]
        if isinstance(val, (str, int, float, bool)):
            print(f"  {key}: {val}")
        elif isinstance(val, list):
            print(f"  {key}: [list, {len(val)} items]")
        elif isinstance(val, dict):
            print(f"  {key}: {{dict, keys: {list(val.keys())[:5]}}}")
        else:
            print(f"  {key}: {type(val).__name__}")
else:
    print("No document found")

client.close()
