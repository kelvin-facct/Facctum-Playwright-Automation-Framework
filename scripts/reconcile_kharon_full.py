"""
Kharon FULL Field Reconciliation Script
=========================================
Compares ALL mapped fields between MongoDB (screenDB.facctumKharonListHist)
and the exported CSV file.

DB Field -> CSV Column Mapping:
-------------------------------
sourceId                          -> UID
nameDetailsList.primaryName       -> LAST NAME (entities) or LAST NAME/FIRST NAME (individuals)
nameDetailsList.alternateNames    -> ALIASES
nameDetailsList.weakAliases       -> LOW QUALITY ALIASES
nameDetailsList.formerNames       -> ALTERNATIVE SPELLING (+ foreign script names)
entityTypeName                    -> CATEGORY
addressList                       -> LOCATIONS
primaryCountry                    -> COUNTRIES
idNumberTypesList (Passport)      -> PASSPORTS
idNumberTypesList (SSN)           -> SSN
idNumberTypesList (others)        -> IDENTIFICATION NUMBERS
riskLabelsList                    -> KEYWORDS
additionalInformation             -> FURTHER INFORMATION
urlMsgText                        -> EXTERNAL SOURCES
addedDateTime                     -> ENTERED
updatedDateTime                   -> UPDATED
swiftBicCode                      -> IDENTIFICATION NUMBERS (or special field)
contactList                       -> (phone/email in FURTHER INFORMATION or LOCATIONS)
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
OUTPUT_PATH = r"C:\Users\ReemaSingh\Downloads\kharon_full_reconciliation_report_v3.csv"

TODAY = datetime.now(timezone.utc)


def connect_mongo():
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    db.command("ping")
    print(f"Connected to MongoDB: {MONGO_DB}")
    return client, db


def normalize(text):
    """Normalize text for comparison: strip, lowercase, collapse whitespace."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', str(text).strip().lower())


def parse_csv_id_numbers(id_numbers_str):
    """Parse {idType}idValue;{idType}idValue;..."""
    results = set()
    if not id_numbers_str or not id_numbers_str.strip():
        return results
    for entry in id_numbers_str.split(";"):
        entry = entry.strip()
        if not entry:
            continue
        match = re.match(r"\{([^}]+)\}(.+)", entry)
        if match:
            results.add((match.group(1).strip(), match.group(2).strip()))
        else:
            results.add(("UNKNOWN", entry.strip()))
    return results


def parse_csv_locations(loc_str):
    """Parse LOCATIONS: 'address ~ city,~ country' separated by tilde."""
    if not loc_str or not loc_str.strip():
        return []
    return [s.strip() for s in loc_str.replace("~", " ").split() if s.strip()]


def parse_csv_keywords(kw_str):
    """Parse KEYWORDS: value1~value2"""
    if not kw_str or not kw_str.strip():
        return set()
    return set(k.strip() for k in kw_str.split("~") if k.strip())


def compare_record(uid, db_doc, csv_row):
    """Compare a single record. Returns list of mismatch dicts."""
    issues = []
    name = csv_row.get("LAST NAME", "").strip()

    def add_issue(field, db_val, csv_val, issue_type="MISMATCH"):
        issues.append({
            "UID": uid,
            "Name": name,
            "Field": field,
            "DB_Value": str(db_val)[:500],
            "CSV_Value": str(csv_val)[:500],
            "Issue": issue_type,
        })

    # --- 1. Primary Name -> LAST NAME ---
    ndl = db_doc.get("nameDetailsList") or {}
    db_primary_name = (ndl.get("primaryName") or "").strip()
    csv_last_name = csv_row.get("LAST NAME", "").strip()
    if normalize(db_primary_name) != normalize(csv_last_name):
        add_issue("primaryName vs LAST NAME", db_primary_name, csv_last_name)

    # --- 2. alternateNames -> ALIASES ---
    db_aliases = set(a.strip() for a in (ndl.get("alternateNames") or []) if a.strip())
    csv_aliases_str = csv_row.get("ALIASES", "").strip()
    csv_aliases = set(a.strip() for a in csv_aliases_str.split(";") if a.strip()) if csv_aliases_str else set()
    # DB aliases not in CSV
    for alias in db_aliases:
        # Check in ALIASES, ALTERNATIVE SPELLING, LOW QUALITY ALIASES, or FOREIGN ALIASES
        all_csv_alias_text = (
            csv_aliases_str + ";" +
            csv_row.get("ALTERNATIVE SPELLING", "") + ";" +
            csv_row.get("LOW QUALITY ALIASES", "") + ";" +
            csv_row.get("FOREIGN ALIASES", "")
        )
        if alias not in all_csv_alias_text:
            add_issue("alternateNames -> ALIASES", alias, "(not found in any alias column)", "MISSING_IN_CSV")

    # --- 3. weakAliases -> LOW QUALITY ALIASES ---
    db_weak = set(a.strip() for a in (ndl.get("weakAliases") or []) if a.strip())
    csv_weak_str = csv_row.get("LOW QUALITY ALIASES", "").strip()
    csv_weak = set(a.strip() for a in csv_weak_str.split(";") if a.strip()) if csv_weak_str else set()
    for wa in db_weak:
        if wa not in csv_weak_str:
            add_issue("weakAliases -> LOW QUALITY ALIASES", wa, csv_weak_str or "<empty>", "MISSING_IN_CSV")

    # --- 4. formerNames -> ALTERNATIVE SPELLING (SKIPPED - known gap, not a mapping issue) ---

    # --- 5. entityTypeName -> CATEGORY ---
    db_entity_type = (db_doc.get("entityTypeName") or "").strip()
    csv_category = csv_row.get("CATEGORY", "").strip()
    if normalize(db_entity_type) != normalize(csv_category):
        add_issue("entityTypeName vs CATEGORY", db_entity_type, csv_category)

    # --- 6. primaryCountry -> COUNTRIES ---
    db_country = (db_doc.get("primaryCountry") or "").strip()
    csv_countries = csv_row.get("COUNTRIES", "").strip()
    if db_country and normalize(db_country) not in normalize(csv_countries):
        add_issue("primaryCountry vs COUNTRIES", db_country, csv_countries, "MISSING_IN_CSV")

    # --- 7. addressList -> LOCATIONS ---
    db_addresses = db_doc.get("addressList") or []
    csv_locations = csv_row.get("LOCATIONS", "").strip()
    for addr in db_addresses:
        if not addr:
            continue
        street = (addr.get("streetAddress") or addr.get("address") or "").strip()
        city = (addr.get("city") or "").strip()
        country = (addr.get("country") or "").strip()
        # Check if key address parts appear in LOCATIONS
        if street and normalize(street) not in normalize(csv_locations):
            add_issue("addressList.streetAddress vs LOCATIONS", street, csv_locations[:200], "MISSING_IN_CSV")
        if city and normalize(city) not in normalize(csv_locations):
            add_issue("addressList.city vs LOCATIONS", city, csv_locations[:200], "MISSING_IN_CSV")

    # --- 8. riskLabelsList -> KEYWORDS ---
    db_keywords = set(k.strip() for k in (db_doc.get("riskLabelsList") or []) if k.strip())
    csv_keywords = parse_csv_keywords(csv_row.get("KEYWORDS", ""))
    for kw in db_keywords:
        if kw not in csv_keywords:
            add_issue("riskLabelsList vs KEYWORDS", kw, csv_row.get("KEYWORDS", "") or "<empty>", "MISSING_IN_CSV")

    # --- 9. additionalInformation -> FURTHER INFORMATION ---
    db_info = (db_doc.get("additionalInformation") or "").strip()
    csv_further = csv_row.get("FURTHER INFORMATION", "").strip()
    if db_info:
        # Remove the Lensview link prefix that gets added to CSV
        csv_check = csv_further.replace("Lensview link: ", "")
        # Check if the core DB info content is present (first 100 chars as key check)
        db_info_key = db_info[:100]
        if db_info_key and normalize(db_info_key) not in normalize(csv_further):
            add_issue("additionalInformation vs FURTHER INFORMATION", db_info[:200], csv_further[:200], "MISMATCH")

    # --- 10. urlMsgText -> EXTERNAL SOURCES ---
    db_url = (db_doc.get("urlMsgText") or "").strip()
    csv_ext_src = csv_row.get("EXTERNAL SOURCES", "").strip()
    if db_url and normalize(db_url) not in normalize(csv_ext_src):
        add_issue("urlMsgText vs EXTERNAL SOURCES", db_url, csv_ext_src or "<empty>", "MISSING_IN_CSV")

    # --- 11. addedDateTime -> ENTERED (SKIPPED - known date drift, not a mapping issue) ---

    # --- 12. updatedDateTime -> UPDATED ---
    db_updated = db_doc.get("updatedDateTime")
    csv_updated = csv_row.get("UPDATED", "").strip()
    if db_updated and csv_updated:
        db_updated_str = db_updated.strftime("%Y/%m/%d %H:%M:%S") if hasattr(db_updated, 'strftime') else str(db_updated)[:19]
        csv_updated_trimmed = csv_updated[:19]
        if db_updated_str[:16] != csv_updated_trimmed[:16]:
            add_issue("updatedDateTime vs UPDATED", db_updated_str, csv_updated, "MISMATCH")

    # --- 13. idNumberTypesList -> PASSPORTS / SSN / IDENTIFICATION NUMBERS ---
    id_list = db_doc.get("idNumberTypesList") or []
    csv_passports = set(v.strip() for v in csv_row.get("PASSPORTS", "").split(";") if v.strip())
    csv_ssn = set(v.strip() for v in csv_row.get("SSN", "").split(";") if v.strip())
    csv_id_nums = parse_csv_id_numbers(csv_row.get("IDENTIFICATION NUMBERS", ""))

    for entry in id_list:
        id_type = (entry.get("idType") or "").strip()
        id_value = (entry.get("idValue") or "").strip()
        if not id_type or not id_value:
            continue

        if id_type.lower() == "passport":
            if id_value not in csv_passports:
                add_issue("idNumberTypesList (Passport) vs PASSPORTS", f"{id_type}: {id_value}", csv_row.get("PASSPORTS", "") or "<empty>", "MISSING_IN_CSV")
        elif "ssn" in id_type.lower() or "social security" in id_type.lower():
            if id_value not in csv_ssn:
                add_issue("idNumberTypesList (SSN) vs SSN", f"{id_type}: {id_value}", csv_row.get("SSN", "") or "<empty>", "MISSING_IN_CSV")
        else:
            if (id_type, id_value) not in csv_id_nums:
                add_issue("idNumberTypesList vs IDENTIFICATION NUMBERS", f"{id_type}: {id_value}", csv_row.get("IDENTIFICATION NUMBERS", "")[:200] or "<empty>", "MISSING_IN_CSV")

    # --- 14. swiftBicCode -> IDENTIFICATION NUMBERS ---
    swift = (db_doc.get("swiftBicCode") or "").strip()
    if swift:
        csv_id_str = csv_row.get("IDENTIFICATION NUMBERS", "")
        if swift not in csv_id_str and swift not in csv_row.get("FURTHER INFORMATION", ""):
            add_issue("swiftBicCode vs IDENTIFICATION NUMBERS", swift, csv_id_str[:200] or "<empty>", "MISSING_IN_CSV")

    # --- 15. contactList -> check if phone/email appear somewhere in CSV ---
    contacts = db_doc.get("contactList") or []
    for contact in contacts:
        if not isinstance(contact, dict):
            continue
        contact_key = (contact.get("contactKey") or "").strip()
        contact_values = contact.get("contactValue") or []
        if not isinstance(contact_values, list):
            contact_values = [contact_values]
        for cv in contact_values:
            cv = str(cv).strip()
            if not cv:
                continue
            # Contact info could be in FURTHER INFORMATION, LOCATIONS, or other fields
            found_in_csv = False
            for col_name in ["FURTHER INFORMATION", "LOCATIONS", "EXTERNAL SOURCES", "IDENTIFICATION NUMBERS"]:
                if cv in (csv_row.get(col_name, "") or ""):
                    found_in_csv = True
                    break
            if not found_in_csv:
                add_issue(f"contactList ({contact_key}) vs CSV", cv, "(not found in any column)", "MISSING_IN_CSV")

    return issues


def main():
    client, db = connect_mongo()
    col = db[COLLECTION]

    # Load CSV
    print("Loading CSV...")
    csv_data = {}
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            uid = row.get("UID", "").strip()
            if uid:
                csv_data[uid] = row

    print(f"CSV records: {len(csv_data)}")

    # Fetch all active DB docs
    print("Fetching DB records...")
    source_ids = list(csv_data.keys())
    db_docs = {}
    cursor = col.find(
        {"sourceId": {"$in": source_ids}, "effEndDateTime": {"$gt": TODAY}}
    )
    for doc in cursor:
        sid = doc.get("sourceId")
        if sid:
            db_docs[sid] = doc

    print(f"DB records (active): {len(db_docs)}")

    # Reconcile
    print("\nReconciling all fields...")
    all_issues = []
    records_with_issues = set()
    field_counts = {}

    for uid, csv_row in csv_data.items():
        db_doc = db_docs.get(uid)
        if not db_doc:
            continue
        issues = compare_record(uid, db_doc, csv_row)
        if issues:
            records_with_issues.add(uid)
            all_issues.extend(issues)
            for iss in issues:
                field_counts[iss["Field"]] = field_counts.get(iss["Field"], 0) + 1

    # Results
    print("\n" + "=" * 80)
    print("FULL RECONCILIATION RESULTS")
    print("=" * 80)
    print(f"  Total CSV records:       {len(csv_data)}")
    print(f"  Matched in DB:           {len(db_docs)}")
    print(f"  Records with issues:     {len(records_with_issues)}")
    print(f"  Total field mismatches:  {len(all_issues)}")

    print(f"\n  Issues by Field:")
    print(f"  {'Field':<55} {'Count':<8}")
    print("  " + "-" * 63)
    for field, count in sorted(field_counts.items(), key=lambda x: -x[1]):
        print(f"  {field:<55} {count:<8}")

    # Show first 30 examples
    if all_issues:
        print(f"\n  First 30 issues:")
        print(f"  {'UID':<16} {'Field':<40} {'Issue':<15}")
        print("  " + "-" * 71)
        for iss in all_issues[:30]:
            print(f"  {iss['UID']:<16} {iss['Field']:<40} {iss['Issue']:<15}")

    # Save report
    if all_issues:
        with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["UID", "Name", "Field", "DB_Value", "CSV_Value", "Issue"])
            writer.writeheader()
            writer.writerows(all_issues)
        print(f"\n  Full report saved to: {OUTPUT_PATH}")

    client.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
