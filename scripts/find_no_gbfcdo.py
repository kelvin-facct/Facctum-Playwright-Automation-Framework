import csv

f = open(r'C:\Users\ReemaSingh\Downloads\reconcile_matching_sourceIDs.csv', 'r')
reader = csv.DictReader(f)
rows = [row for row in reader if 'GB-FCDO' not in row['listProviderCode']]
f.close()

print(f"Rows WITHOUT GB-FCDO: {len(rows)}\n")
print(f"{'sourceId':<15} {'matchedIdValue':<15} {'listProviderCode'}")
print("=" * 60)
for r in rows:
    print(f"{r['sourceId']:<15} {r['matchedIdValue']:<15} {r['listProviderCode']}")
