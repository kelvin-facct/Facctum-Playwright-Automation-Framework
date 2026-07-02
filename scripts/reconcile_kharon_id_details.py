"""
Kharon ID Details Reconciliation Script
========================================
Compares idNumberTypesList from MongoDB (screenDB.facctumKharonListHist)
against PASSPORTS, SSN, and IDENTIFICATION NUMBERS columns in the exported CSV.

Reports:
- DB records with ID data that is missing or incorrectly mapped in the CSV
- Summary of mismatches by idType

CSV format (tab-separated):
  PASSPORTS: value1;value2  (plain passport numbers)
  SSN: value1;value2  (plain SSN numbers)
  IDENTIFICATION NUMBERS: {idType}idValue;{idType}idValue;...

DB field: idNumberTypesList = [{idType, idValue, idCategory}, ...]

Mapping logic:
  - idType == "Passport" -> should appear in PASSPORTS column
  - idType contains "SSN" or "Social Security" -> should appear in SSN column
  - All other idTypes -> should appear in IDENTIFICATION NUMBERS column as {idType}idValue
"""

import csv
import re
from datetime import datetime, timezone
from pymongo import MongoClient

# --- Configuration ---
MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
MONGO_DB = "screenDB"
COLLECTION = "facctumKharonListHist"
CSV_PATH = r"C:\Users\ReemaSingh\Downloads\kharon-50-plus-multitag_a_full_records_20260617035552.csv"
OUTPUT_PATH = r"C:\Users\ReemaSingh\Downloads\kharon_id_reconciliation_report.csv"

TODAY = datetime.now(timezone.utc)


def connect_mongo():
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    db.command("ping")
    print(f"Connected to MongoDB: {MONGO_DB}")
    return client, db


def parse_csv_id_numbers(id_numbers_str):
    """
    Parse IDENTIFICATION NUMBERS column: {idType}idValue;{idType}idValue;...
    Returns set of (idType, idValue) tuples.
    """
    results = set()
    if not id_numbers_str or not id_numbers_str.strip():
        return results
    
    # Split by semicolon
    entries = id_numbers_str.split(";")
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue
        # Pattern: {Type}Value
        match = re.match(r"\{([^}]+)\}(.+)", entry)
        if match:
            id_type = match.group(1).strip()
            id_value = match.group(2).strip()
            results.add((id_type, id_value))
        else:
            # Plain value without type prefix
            results.add(("UNKNOWN", entry.strip()))
    
    return results


def parse_csv_passports(passports_str):
    """Parse PASSPORTS column: value1;value2 -> set of values."""
    results = set()
    if not passports_str or not passports_str.strip():
        return results
    for val in passports_str.split(";"):
        val = val.strip()
        if val:
            results.add(val)
    return results


def parse_csv_ssn(ssn_str):
    """Parse SSN column: value1;value2 -> set of values."""
    results = set()
    if not ssn_str or not ssn_str.strip():
        return results
    for val in ssn_str.split(";"):
        val = val.strip()
        if val:
            results.add(val)
    return results


def is_passport_type(id_type):
    """Check if idType should map to PASSPORTS column."""
    return id_type.lower() == "passport"


def is_ssn_type(id_type):
    """Check if idType should map to SSN column."""
    lower = id_type.lower()
    return "ssn" in lower or "social security" in lower


def load_csv_data(csv_path):
    """Load CSV and return dict of {uid: {passports, ssn, id_numbers}}."""
    csv_data = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            uid = row.get("UID", "").strip()
            if not uid:
                continue
            csv_data[uid] = {
                "passports": parse_csv_passports(row.get("PASSPORTS", "")),
                "ssn": parse_csv_ssn(row.get("SSN", "")),
                "id_numbers": parse_csv_id_numbers(row.get("IDENTIFICATION NUMBERS", "")),
                "last_name": row.get("LAST NAME", ""),
                "first_name": row.get("FIRST NAME", ""),
            }
    return csv_data


def reconcile(db, csv_data):
    """
    For each record in CSV, fetch from DB and find IDs in DB
    that are missing or incorrectly placed in the CSV columns.
    Checks:
    - idNumberTypesList (all types: Passport, IMO, registration numbers, etc.)
    - swiftBicCode (separate top-level field)
    """
    col = db[COLLECTION]
    mismatches = []
    stats = {"total_csv": 0, "found_in_db": 0, "records_with_issues": 0, "total_missing_ids": 0}
    type_miss_counts = {}

    source_ids = list(csv_data.keys())
    stats["total_csv"] = len(source_ids)
    print(f"\nTotal records in CSV: {stats['total_csv']}")

    # Batch fetch from DB - include swiftBicCode
    print("Fetching records from MongoDB...")
    db_docs = {}
    cursor = col.find(
        {"sourceId": {"$in": source_ids}, "effEndDateTime": {"$gt": TODAY}},
        {"sourceId": 1, "idNumberTypesList": 1, "nameDetailsList": 1, "swiftBicCode": 1}
    )
    for doc in cursor:
        sid = doc.get("sourceId")
        if sid:
            db_docs[sid] = doc

    stats["found_in_db"] = len(db_docs)
    print(f"Records found in DB (active): {stats['found_in_db']}")
    not_in_db = set(source_ids) - set(db_docs.keys())
    if not_in_db:
        print(f"Records in CSV but NOT in DB (or inactive): {len(not_in_db)}")

    # Compare each record
    print("\nReconciling ID details...")
    for uid, csv_rec in csv_data.items():
        db_doc = db_docs.get(uid)
        if not db_doc:
            continue

        id_list = db_doc.get("idNumberTypesList", []) or []
        if not id_list:
            continue

        for id_entry in id_list:
            id_type = id_entry.get("idType", "").strip()
            id_value = id_entry.get("idValue", "").strip()
            id_category = id_entry.get("idCategory", "").strip()

            if not id_type or not id_value:
                continue

            found = False
            expected_column = ""

            if is_passport_type(id_type):
                expected_column = "PASSPORTS"
                if id_value in csv_rec["passports"]:
                    found = True
            elif is_ssn_type(id_type):
                expected_column = "SSN"
                if id_value in csv_rec["ssn"]:
                    found = True
            else:
                expected_column = "IDENTIFICATION NUMBERS"
                # Check if (idType, idValue) exists in parsed ID numbers
                if (id_type, id_value) in csv_rec["id_numbers"]:
                    found = True

            if not found:
                stats["total_missing_ids"] += 1
                type_miss_counts[id_type] = type_miss_counts.get(id_type, 0) + 1

                # Check if it's in a WRONG column instead
                in_wrong_column = ""
                if expected_column != "PASSPORTS" and id_value in csv_rec["passports"]:
                    in_wrong_column = "PASSPORTS"
                elif expected_column != "SSN" and id_value in csv_rec["ssn"]:
                    in_wrong_column = "SSN"
                elif expected_column != "IDENTIFICATION NUMBERS":
                    for csv_type, csv_val in csv_rec["id_numbers"]:
                        if csv_val == id_value:
                            in_wrong_column = f"IDENTIFICATION NUMBERS (as {csv_type})"
                            break

                mismatches.append({
                    "UID": uid,
                    "Name": f"{csv_rec.get('last_name', '')} {csv_rec.get('first_name', '')}".strip(),
                    "DB_idType": id_type,
                    "DB_idValue": id_value,
                    "DB_idCategory": id_category,
                    "Expected_Column": expected_column,
                    "Found_In_Wrong_Column": in_wrong_column,
                    "Issue": "MISSING" if not in_wrong_column else "WRONG_COLUMN",
                })

        # Also check swiftBicCode (separate DB field, should appear in IDENTIFICATION NUMBERS)
        swift_bic = (db_doc.get("swiftBicCode") or "").strip()
        if swift_bic:
            # Check if SWIFT/BIC is anywhere in the CSV row
            found_swift = False
            # Could be in IDENTIFICATION NUMBERS as {SWIFT/BIC}value or similar
            for csv_type, csv_val in csv_rec["id_numbers"]:
                if csv_val == swift_bic:
                    found_swift = True
                    break
            # Also check passports/ssn columns just in case
            if not found_swift and swift_bic in csv_rec["passports"]:
                found_swift = True
            if not found_swift and swift_bic in csv_rec["ssn"]:
                found_swift = True

            if not found_swift:
                stats["total_missing_ids"] += 1
                type_miss_counts["SWIFT/BIC Code"] = type_miss_counts.get("SWIFT/BIC Code", 0) + 1
                mismatches.append({
                    "UID": uid,
                    "Name": f"{csv_rec.get('last_name', '')} {csv_rec.get('first_name', '')}".strip(),
                    "DB_idType": "SWIFT/BIC Code",
                    "DB_idValue": swift_bic,
                    "DB_idCategory": "Bank accounts",
                    "Expected_Column": "IDENTIFICATION NUMBERS",
                    "Found_In_Wrong_Column": "",
                    "Issue": "MISSING",
                })

    records_with_issues = len(set(m["UID"] for m in mismatches))
    stats["records_with_issues"] = records_with_issues

    return mismatches, stats, type_miss_counts


def save_report(mismatches, stats, type_miss_counts):
    """Save reconciliation report."""
    print("\n" + "=" * 70)
    print("RECONCILIATION RESULTS")
    print("=" * 70)
    print(f"  Total CSV records:         {stats['total_csv']}")
    print(f"  Found in DB (active):      {stats['found_in_db']}")
    print(f"  Records with issues:       {stats['records_with_issues']}")
    print(f"  Total missing/wrong IDs:   {stats['total_missing_ids']}")

    if type_miss_counts:
        print("\n  Missing by idType:")
        print(f"  {'idType':<60} {'Count':<8}")
        print("  " + "-" * 68)
        for id_type, count in sorted(type_miss_counts.items(), key=lambda x: -x[1]):
            print(f"  {id_type:<60} {count:<8}")

    if mismatches:
        with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "UID", "Name", "DB_idType", "DB_idValue", "DB_idCategory",
                "Expected_Column", "Found_In_Wrong_Column", "Issue"
            ])
            writer.writeheader()
            writer.writerows(mismatches)
        print(f"\n  Report saved to: {OUTPUT_PATH}")
    else:
        print("\n  No mismatches found - all DB ID data is correctly mapped in CSV!")


def main():
    client, db = connect_mongo()
    try:
        csv_data = load_csv_data(CSV_PATH)
        mismatches, stats, type_miss_counts = reconcile(db, csv_data)
        save_report(mismatches, stats, type_miss_counts)
    finally:
        client.close()
        print("\nDone.")


if __name__ == "__main__":
    main()
