#!/usr/bin/env python3
"""
Create diff test data for facctumRegulatoryList and facctumRegulatoryListHist
Modifies the LATEST version of records that have multiple versions (same sourceNaturalKey)
so that version comparison on UI will show the differences.
Test Cases TC06-TC60 for listId 65 (OFAC Enhanced)
"""
import os, json, logging
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from copy import deepcopy

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('regulatory_diff_test.log', mode='w', encoding='utf-8')])
logger = logging.getLogger(__name__)

MONGO_URI = "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27018/?tls=true&directConnection=true&tlsInsecure=true"
DATABASE = "screenDB"
LIST_ID = 65

# Fields to exclude from updates (system/audit fields)
EXCLUDED_FIELDS = [
    "_id", "effStartDateTime", "effEndDateTime", "addedDateTime", "updatedDateTime",
    "lastUpdatedDateTime", "addedUserId", "updatedUserId", "originalStartDateTime",
    "lastIngestionDatetime", "actionId", "statusId", "listId", "listName", "listEntryId",
    "tags", "sourceNaturalKey", "entityTypeName"
]

# Valid fields from data model:
# Single: primaryName, gender
# Arrays: nameDetailsList, sanctionProgramDetailsList, sanctionImposedIndicatorsList, idNumberTypesList,
#         addressDetailsList, nationalityDetailsList, citizenshipDetailsList, birthDateDetailsList,
#         birthPlaceDetailsList, sanctionListDetails, legalAuthority, errorDetails, keywordList
# Object: vesselDetails

TEST_CASES = {
    "TC06": {"field": "primaryName", "action": "modify_single", "desc": "Only primaryName changed"},
    "TC07": {"field": "sanctionImposedIndicatorsList", "action": "modify_single", "desc": "Only sanctionImposedIndicatorsList changed"},
    "TC08": {"field": "legalAuthority", "action": "modify_single", "desc": "Only legalAuthority changed"},
    "TC09": {"field": "gender", "action": "modify_single", "desc": "Only gender changed"},
    "TC10": {"field": "nameDetailsList", "action": "modify_firstname", "desc": "Only firstName in nameDetailsList changed"},
    "TC11": {"field": "nameDetailsList", "action": "modify_lastname", "desc": "Only lastName in nameDetailsList changed"},
    "TC12": {"field": "birthDateDetailsList", "action": "modify", "desc": "Only birthDateDetailsList date changed"},
    "TC13": {"field": "birthPlaceDetailsList", "action": "modify", "desc": "Only birthPlaceDetailsList changed"},
    "TC14": {"field": "nationalityDetailsList", "action": "modify", "desc": "Only nationalityDetailsList changed"},
    "TC15": {"field": "keywordList", "action": "modify_single", "desc": "Only keywordList changed"},
    "TC16": {"field": "nameDetailsList", "action": "add_one", "desc": "nameDetailsList - add 1 new alias"},
    "TC17": {"field": "nameDetailsList", "action": "add_multiple", "desc": "nameDetailsList - add multiple aliases"},
    "TC18": {"field": "idNumberTypesList", "action": "add", "desc": "idNumberTypesList - add new passport"},
    "TC19": {"field": "idNumberTypesList", "action": "add_id", "desc": "idNumberTypesList - add new ID"},
    "TC20": {"field": "keywordList", "action": "add", "desc": "keywordList - add new values"},
    "TC21": {"field": "addressDetailsList", "action": "add", "desc": "addressDetailsList - add new address"},
    "TC22": {"field": "nationalityDetailsList", "action": "add", "desc": "nationalityDetailsList - add new value"},
    "TC23": {"field": "citizenshipDetailsList", "action": "add", "desc": "citizenshipDetailsList - add new value"},
    "TC24": {"field": "sanctionListDetails", "action": "add", "desc": "sanctionListDetails - add new value"},
    "TC25": {"field": "sanctionProgramDetailsList", "action": "add", "desc": "sanctionProgramDetailsList - add new value"},
    "TC26": {"field": "nameDetailsList", "action": "remove_one", "desc": "nameDetailsList - remove 1 alias"},
    "TC27": {"field": "nameDetailsList", "action": "remove_all_but_one", "desc": "nameDetailsList - remove all but primary"},
    "TC28": {"field": "idNumberTypesList", "action": "remove", "desc": "idNumberTypesList - remove values"},
    "TC29": {"field": "birthDateDetailsList", "action": "remove", "desc": "birthDateDetailsList - remove values"},
    "TC30": {"field": "keywordList", "action": "remove", "desc": "keywordList - remove values"},
    "TC31": {"field": "addressDetailsList", "action": "remove", "desc": "addressDetailsList - remove values"},
    "TC32": {"field": "birthPlaceDetailsList", "action": "remove", "desc": "birthPlaceDetailsList - remove values"},
    "TC33": {"field": "citizenshipDetailsList", "action": "remove", "desc": "citizenshipDetailsList - remove values"},
    "TC34": {"field": "sanctionListDetails", "action": "remove", "desc": "sanctionListDetails - remove values"},
    "TC35": {"field": "sanctionProgramDetailsList", "action": "remove", "desc": "sanctionProgramDetailsList - remove values"},
}

TEST_CASES.update({
    "TC36": {"field": "nameDetailsList", "action": "modify", "desc": "nameDetailsList - modify existing alias"},
    "TC37": {"field": "idNumberTypesList", "action": "modify_passport", "desc": "idNumberTypesList - modify passport"},
    "TC38": {"field": "idNumberTypesList", "action": "modify_id", "desc": "idNumberTypesList - modify ID type/value"},
    "TC39": {"field": "keywordList", "action": "modify", "desc": "keywordList - replace keywords"},
    "TC40": {"field": "addressDetailsList", "action": "modify", "desc": "addressDetailsList - modify city/country"},
    "TC41": {"field": "nationalityDetailsList", "action": "modify", "desc": "nationalityDetailsList - modify country"},
    "TC42": {"field": "citizenshipDetailsList", "action": "modify", "desc": "citizenshipDetailsList - modify country"},
    "TC43": {"field": "sanctionListDetails", "action": "modify", "desc": "sanctionListDetails - modify list name"},
    "TC44": {"field": "sanctionProgramDetailsList", "action": "modify", "desc": "sanctionProgramDetailsList - modify program"},
    "TC45": {"field": "nameDetailsList", "action": "modify_weak", "desc": "nameDetailsList - modify weak alias"},
    "TC46": {"field": "nameDetailsList", "action": "empty_to_pop", "desc": "nameDetailsList - add to empty"},
    "TC47": {"field": "idNumberTypesList", "action": "empty_to_pop", "desc": "idNumberTypesList - add to empty"},
    "TC48": {"field": "keywordList", "action": "empty_to_pop", "desc": "keywordList - add to empty"},
    "TC49": {"field": "sanctionProgramDetailsList", "action": "empty_to_pop", "desc": "sanctionProgramDetailsList - add to empty"},
    "TC50": {"field": "nameDetailsList", "action": "pop_to_empty", "desc": "nameDetailsList - clear except primary"},
    "TC51": {"field": "idNumberTypesList", "action": "pop_to_empty", "desc": "idNumberTypesList - clear all"},
    "TC52": {"field": "keywordList", "action": "pop_to_empty", "desc": "keywordList - clear all"},
    "TC53": {"field": "sanctionProgramDetailsList", "action": "pop_to_empty", "desc": "sanctionProgramDetailsList - clear all"},
    "TC54": {"field": "all_arrays", "action": "empty_to_pop", "desc": "All arrays - add values"},
    "TC55": {"field": "all_arrays", "action": "pop_to_empty", "desc": "All arrays - clear values"},
    "TC56": {"field": "combo", "action": "multi_attr_multi_array", "desc": "Multiple attributes + arrays changed"},
    "TC57": {"field": "combo", "action": "all_attr_no_array", "desc": "All single attributes changed"},
    "TC58": {"field": "combo", "action": "all_array_no_attr", "desc": "All arrays changed"},
    "TC59": {"field": "combo", "action": "half_add_half_remove", "desc": "Half arrays added, half removed"},
    "TC60": {"field": "combo", "action": "mixed", "desc": "Mixed: add, remove, modify"},
})

class RegulatoryDiffTestCreator:
    def __init__(self):
        self.client = MongoClient(MONGO_URI)
        self.db = self.client[DATABASE]
        self.reg_list = self.db["facctumRegulatoryList"]
        self.reg_list_hist = self.db["facctumRegulatoryListHist"]
        self.backup_data = {"facctumRegulatoryList": [], "facctumRegulatoryListHist": []}
        self.report = {"test_cases": {}, "summary": {}}

    def find_records_with_multiple_versions(self):
        # Find records with multiple versions where the latest version has effEndDateTime in the future
        future_date = datetime.utcnow()
        pipeline = [
            {"$match": {"entityTypeName": "Individual", "listId": LIST_ID}},
            {"$sort": {"updatedDateTime": 1}},  # Sort by updatedDateTime ascending
            {"$group": {
                "_id": "$sourceNaturalKey", 
                "count": {"$sum": 1}, 
                "latestId": {"$last": "$_id"},
                "latestEffEndDateTime": {"$last": "$effEndDateTime"},
                "primaryName": {"$last": "$primaryName"}
            }},
            {"$match": {"count": {"$gte": 2}, "latestEffEndDateTime": {"$gt": future_date}}},
            {"$sort": {"count": -1}},
            {"$limit": 60}
        ]
        return list(self.reg_list_hist.aggregate(pipeline))

    def backup_records(self, source_natural_keys):
        logger.info("Creating backup of records...")
        for snk in source_natural_keys:
            for doc in self.reg_list.find({"sourceNaturalKey": snk, "listId": LIST_ID}):
                doc["_id"] = str(doc["_id"])
                self.backup_data["facctumRegulatoryList"].append(doc)
        for snk in source_natural_keys:
            for doc in self.reg_list_hist.find({"sourceNaturalKey": snk, "listId": LIST_ID}):
                doc["_id"] = str(doc["_id"])
                self.backup_data["facctumRegulatoryListHist"].append(doc)
        backup_file = f"regulatory_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(self.backup_data, f, indent=2, default=str)
        logger.info(f"Backup saved to {backup_file}")
        logger.info(f"  facctumRegulatoryList: {len(self.backup_data['facctumRegulatoryList'])} docs")
        logger.info(f"  facctumRegulatoryListHist: {len(self.backup_data['facctumRegulatoryListHist'])} docs")
        return backup_file

    def get_latest_version(self, source_natural_key):
        # Only get records with effEndDateTime in the future
        future_date = datetime.utcnow()
        docs = list(self.reg_list_hist.find({
            "sourceNaturalKey": source_natural_key, 
            "listId": LIST_ID,
            "effEndDateTime": {"$gt": future_date}
        }).sort("updatedDateTime", -1).limit(1))
        return docs[0] if docs else None

    def get_reg_list_record(self, source_natural_key):
        # facctumRegulatoryList contains current active records
        # First try to find with future effEndDateTime, if not found, get any record with same sourceNaturalKey
        future_date = datetime.utcnow()
        doc = self.reg_list.find_one({
            "sourceNaturalKey": source_natural_key, 
            "listId": LIST_ID,
            "effEndDateTime": {"$gt": future_date}
        })
        if not doc:
            # Fallback: get the record without effEndDateTime filter (current active record)
            doc = self.reg_list.find_one({
                "sourceNaturalKey": source_natural_key, 
                "listId": LIST_ID
            })
        return doc

    def modify_single_attribute(self, doc, field, tc):
        if field == "primaryName": doc["primaryName"] = f"MODIFIED_{tc}"
        elif field == "sanctionImposedIndicatorsList": 
            if "sanctionImposedIndicatorsList" in doc and doc["sanctionImposedIndicatorsList"]:
                doc["sanctionImposedIndicatorsList"] = [f"MODIFIED_{tc}"]
            else:
                doc["sanctionImposedIndicatorsList"] = [f"MODIFIED_{tc}"]
        elif field == "legalAuthority":
            if "legalAuthority" in doc and doc["legalAuthority"]:
                doc["legalAuthority"] = [f"MODIFIED_LEGAL_{tc}"]
            else:
                doc["legalAuthority"] = [f"MODIFIED_LEGAL_{tc}"]
        elif field == "gender": doc["gender"] = "Modified"
        elif field == "keywordList":
            if "keywordList" in doc and doc["keywordList"]:
                doc["keywordList"] = [f"MODIFIED_{tc}"]
            else:
                doc["keywordList"] = [f"MODIFIED_{tc}"]
        return doc

    def add_to_array(self, doc, field, action, tc):
        if field == "nameDetailsList":
            new_alias = {"uid": f"NEW_{tc}", "nameType": "A.K.A.", "nameCategory": "strong", "firstName": f"NewFirst_{tc}",
                "lastName": f"NewLast_{tc}", "fullName": f"NewLast_{tc}, NewFirst_{tc}", "originalScriptLanguage": "Latin"}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_alias)
            if action == "add_multiple":
                new_alias2 = deepcopy(new_alias); new_alias2["uid"] = f"NEW2_{tc}"; new_alias2["firstName"] = f"NewFirst2_{tc}"
                new_alias2["fullName"] = f"NewLast_{tc}, NewFirst2_{tc}"
                doc[field].append(new_alias2)
        elif field == "idNumberTypesList":
            id_type = "Passport" if action == "add" else "National ID"
            new_id = {"uid": f"NEW_{tc}", "idType": id_type, "idValue": f"NEW_ID_{tc}",
                "idName": f"NEW_NAME_{tc}", "countryName": "Test Country", "knownExpired": False, "knownFalse": False, "isValid": True}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_id)
        elif field == "keywordList":
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].extend([f"NEW_KEYWORD_{tc}", f"TEST_KEYWORD_{tc}"])
        elif field == "addressDetailsList":
            new_addr = {"uid": f"NEW_{tc}", "addressType": "Primary", "addressLine1": f"New Address Line {tc}",
                "city": f"NewCity_{tc}", "stateOrProvince": "NewState", "countryName": "New Country", "regulationLanguage": "Latin"}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_addr)
        elif field == "nationalityDetailsList":
            new_nat = {"uid": f"NEW_{tc}", "countryName": f"NewCountry_{tc}", "mainEntry": False}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_nat)
        elif field == "citizenshipDetailsList":
            new_cit = {"uid": f"NEW_{tc}", "countryName": f"NewCountry_{tc}", "mainEntry": False}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_cit)
        elif field == "sanctionListDetails":
            new_sanc = {"uid": f"NEW_{tc}", "sanctionsListName": f"New Sanctions List {tc}", "publishedDate": "2026-01-01"}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_sanc)
        elif field == "sanctionProgramDetailsList":
            new_prog = {"uid": f"NEW_{tc}", "programName": f"NEW_PROGRAM_{tc}"}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_prog)
        elif field == "birthDateDetailsList":
            new_dob = {"uid": f"NEW_{tc}", "dateType": "DOB", "date": "1990-01-01", "mainEntry": False, "isDateRange": False, "isApproximate": False}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_dob)
        elif field == "birthPlaceDetailsList":
            new_bp = {"countryName": f"NewBirthPlace_{tc}", "mainEntry": False}
            if field not in doc or not doc[field]: doc[field] = []
            doc[field].append(new_bp)
        return doc

    def remove_from_array(self, doc, field, action, tc):
        if field == "nameDetailsList" and field in doc and doc[field]:
            if action == "remove_one":
                for i, name in enumerate(doc[field]):
                    if name.get("nameType") != "Primary": doc[field].pop(i); break
            elif action == "remove_all_but_one": doc[field] = [n for n in doc[field] if n.get("nameType") == "Primary"]
        elif field == "idNumberTypesList" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        elif field == "keywordList" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        elif field == "addressDetailsList" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        elif field == "birthPlaceDetailsList" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        elif field == "citizenshipDetailsList" and field in doc and doc[field]: doc[field] = []
        elif field == "sanctionListDetails" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        elif field == "sanctionProgramDetailsList" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        elif field == "birthDateDetailsList" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        elif field == "nationalityDetailsList" and field in doc and doc[field] and len(doc[field]) > 1: doc[field] = doc[field][:1]
        return doc

    def modify_array(self, doc, field, action, tc):
        if field == "nameDetailsList" and field in doc and doc[field]:
            if action == "modify_firstname":
                for name in doc[field]:
                    if name.get("nameType") == "Primary":
                        name["firstName"] = f"MODIFIED_{tc}"
                        name["fullName"] = f"{name.get('lastName', '')}, MODIFIED_{tc}"
                        break
            elif action == "modify_lastname":
                for name in doc[field]:
                    if name.get("nameType") == "Primary":
                        name["lastName"] = f"MODIFIED_{tc}"
                        name["fullName"] = f"MODIFIED_{tc}, {name.get('firstName', '')}"
                        break
            else:
                for name in doc[field]:
                    if name.get("nameType") != "Primary":
                        name["firstName"] = f"MODIFIED_{tc}"; name["lastName"] = f"MODIFIED_{tc}"
                        name["fullName"] = f"MODIFIED_{tc}, MODIFIED_{tc}"
                        if action == "modify_weak": name["nameCategory"] = "weak"
                        break
        elif field == "idNumberTypesList" and field in doc and doc[field]:
            for id_doc in doc[field]:
                if action == "modify_passport" and id_doc.get("idType") == "Passport":
                    id_doc["idValue"] = f"MODIFIED_{tc}"; id_doc["countryName"] = f"ModifiedCountry_{tc}"; break
                elif action == "modify_id": id_doc["idValue"] = f"MODIFIED_{tc}"; id_doc["idType"] = f"Modified Type"; break
        elif field == "keywordList" and field in doc and doc[field]: doc[field] = [f"MODIFIED_{tc}_{kw}" for kw in doc[field]]
        elif field == "addressDetailsList" and field in doc and doc[field]:
            doc[field][0]["city"] = f"ModifiedCity_{tc}"; doc[field][0]["countryName"] = f"ModifiedCountry_{tc}"
            doc[field][0]["stateOrProvince"] = f"ModifiedState_{tc}"
        elif field == "nationalityDetailsList" and field in doc and doc[field]: doc[field][0]["countryName"] = f"ModifiedCountry_{tc}"
        elif field == "citizenshipDetailsList" and field in doc and doc[field]: doc[field][0]["countryName"] = f"ModifiedCountry_{tc}"
        elif field == "sanctionListDetails" and field in doc and doc[field]: doc[field][0]["sanctionsListName"] = f"MODIFIED_LIST_{tc}"
        elif field == "sanctionProgramDetailsList" and field in doc and doc[field]: doc[field][0]["programName"] = f"MODIFIED_PROGRAM_{tc}"
        elif field == "birthDateDetailsList" and field in doc and doc[field]: doc[field][0]["date"] = "1999-01-01"
        elif field == "birthPlaceDetailsList" and field in doc and doc[field]: doc[field][0]["countryName"] = f"ModifiedBirthPlace_{tc}"
        return doc

    def empty_to_populated(self, doc, field, tc):
        if field == "all_arrays":
            doc = self.add_to_array(doc, "nameDetailsList", "add_one", tc)
            doc = self.add_to_array(doc, "idNumberTypesList", "add", tc)
            doc = self.add_to_array(doc, "keywordList", "add", tc)
            doc = self.add_to_array(doc, "addressDetailsList", "add", tc)
            doc = self.add_to_array(doc, "sanctionProgramDetailsList", "add", tc)
            doc = self.add_to_array(doc, "citizenshipDetailsList", "add", tc)
            doc = self.add_to_array(doc, "nationalityDetailsList", "add", tc)
        else: doc = self.add_to_array(doc, field, "add_one" if field == "nameDetailsList" else "add", tc)
        return doc

    def populated_to_empty(self, doc, field, tc):
        if field == "all_arrays":
            if "nameDetailsList" in doc: doc["nameDetailsList"] = [n for n in doc["nameDetailsList"] if n.get("nameType") == "Primary"]
            doc["idNumberTypesList"] = []; doc["keywordList"] = []; doc["addressDetailsList"] = []
            doc["sanctionProgramDetailsList"] = []; doc["citizenshipDetailsList"] = []; doc["nationalityDetailsList"] = []
        else:
            if field == "nameDetailsList": doc[field] = [n for n in doc.get(field, []) if n.get("nameType") == "Primary"]
            else: doc[field] = []
        return doc

    def apply_combination_changes(self, doc, action, tc):
        if action == "multi_attr_multi_array":
            doc = self.modify_single_attribute(doc, "primaryName", tc)
            doc = self.modify_single_attribute(doc, "gender", tc)
            doc = self.modify_array(doc, "nameDetailsList", "modify_firstname", tc)
            doc = self.add_to_array(doc, "nameDetailsList", "add_one", tc)
            doc = self.add_to_array(doc, "keywordList", "add", tc)
            doc = self.modify_array(doc, "addressDetailsList", "modify", tc)
        elif action == "all_attr_no_array":
            doc = self.modify_single_attribute(doc, "primaryName", tc)
            doc = self.modify_single_attribute(doc, "gender", tc)
            doc = self.modify_single_attribute(doc, "legalAuthority", tc)
            doc = self.modify_single_attribute(doc, "sanctionImposedIndicatorsList", tc)
        elif action == "all_array_no_attr":
            doc = self.add_to_array(doc, "nameDetailsList", "add_one", tc)
            doc = self.add_to_array(doc, "idNumberTypesList", "add", tc)
            doc = self.add_to_array(doc, "keywordList", "add", tc)
            doc = self.add_to_array(doc, "addressDetailsList", "add", tc)
            doc = self.add_to_array(doc, "sanctionProgramDetailsList", "add", tc)
        elif action == "half_add_half_remove":
            doc = self.add_to_array(doc, "nameDetailsList", "add_one", tc)
            doc = self.add_to_array(doc, "keywordList", "add", tc)
            doc = self.remove_from_array(doc, "idNumberTypesList", "remove", tc)
            doc = self.remove_from_array(doc, "addressDetailsList", "remove", tc)
        elif action == "mixed":
            doc = self.add_to_array(doc, "nameDetailsList", "add_one", tc)
            doc = self.remove_from_array(doc, "idNumberTypesList", "remove", tc)
            doc = self.modify_array(doc, "keywordList", "modify", tc)
            doc = self.modify_single_attribute(doc, "gender", tc)
        return doc

    def apply_test_case(self, doc, tc):
        tc_info = TEST_CASES.get(tc)
        if not tc_info: return doc
        field, action = tc_info["field"], tc_info["action"]
        if action == "modify_single": doc = self.modify_single_attribute(doc, field, tc)
        elif action in ["add", "add_one", "add_multiple", "add_id"]: doc = self.add_to_array(doc, field, action, tc)
        elif action in ["remove", "remove_one", "remove_all_but_one"]: doc = self.remove_from_array(doc, field, action, tc)
        elif action in ["modify", "modify_passport", "modify_id", "modify_weak", "modify_firstname", "modify_lastname"]: 
            doc = self.modify_array(doc, field, action, tc)
        elif action == "empty_to_pop": doc = self.empty_to_populated(doc, field, tc)
        elif action == "pop_to_empty": doc = self.populated_to_empty(doc, field, tc)
        elif action in ["multi_attr_multi_array", "all_attr_no_array", "all_array_no_attr", "half_add_half_remove", "mixed"]:
            doc = self.apply_combination_changes(doc, action, tc)
        return doc

    def update_document(self, collection, doc_id, updates):
        # Remove excluded fields from updates
        for field in EXCLUDED_FIELDS:
            if field in updates:
                del updates[field]
        collection.update_one({"_id": doc_id}, {"$set": updates})

    def run(self):
        logger.info("=" * 70)
        logger.info("REGULATORY DIFF TEST DATA CREATOR")
        logger.info("=" * 70)
        logger.info(f"Database: {DATABASE}, List ID: {LIST_ID}, Test Cases: TC06-TC60 ({len(TEST_CASES)} total)")

        logger.info("\nFinding records with multiple versions...")
        multi_version_records = self.find_records_with_multiple_versions()
        logger.info(f"Found {len(multi_version_records)} records with multiple versions")

        if len(multi_version_records) < len(TEST_CASES):
            logger.warning(f"Not enough records! Need {len(TEST_CASES)}, found {len(multi_version_records)}")
            return

        test_case_assignments = {}
        test_cases_sorted = sorted(TEST_CASES.keys())
        for i, tc in enumerate(test_cases_sorted):
            if i < len(multi_version_records): test_case_assignments[tc] = multi_version_records[i]["_id"]

        source_natural_keys = list(test_case_assignments.values())
        backup_file = self.backup_records(source_natural_keys)

        logger.info("\n" + "=" * 70)
        logger.info("APPLYING MODIFICATIONS")
        logger.info("=" * 70)

        for tc in test_cases_sorted:
            snk = test_case_assignments.get(tc)
            if not snk: continue
            tc_info = TEST_CASES[tc]
            logger.info(f"\n{tc}: sourceNaturalKey={snk}")
            logger.info(f"  Description: {tc_info['desc']}")

            latest_hist = self.get_latest_version(snk)
            if not latest_hist: logger.warning(f"  No hist record found for {snk}"); continue

            reg_list_doc = self.get_reg_list_record(snk)
            if not reg_list_doc: logger.warning(f"  No reg_list record found for {snk}"); continue

            modified_hist = self.apply_test_case(deepcopy(latest_hist), tc)
            modified_reg = self.apply_test_case(deepcopy(reg_list_doc), tc)

            self.update_document(self.reg_list_hist, latest_hist["_id"], modified_hist)
            self.update_document(self.reg_list, reg_list_doc["_id"], modified_reg)

            logger.info(f"  Updated hist doc: {latest_hist['_id']}")
            logger.info(f"  Updated reg_list doc: {reg_list_doc['_id']}")

            self.report["test_cases"][tc] = {
                "sourceNaturalKey": snk, "primaryName": latest_hist.get("primaryName"),
                "description": tc_info["desc"], "field": tc_info["field"], "action": tc_info["action"],
                "hist_id": str(latest_hist["_id"]), "reg_list_id": str(reg_list_doc["_id"])
            }

        self.report["summary"] = {"total_test_cases": len(TEST_CASES), "processed": len(self.report["test_cases"]),
            "backup_file": backup_file, "timestamp": datetime.now().isoformat()}

        report_file = f"regulatory_diff_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f: json.dump(self.report, f, indent=2, default=str)

        logger.info("\n" + "=" * 70)
        logger.info("SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Total test cases: {len(TEST_CASES)}, Processed: {len(self.report['test_cases'])}")
        logger.info(f"Backup file: {backup_file}, Report file: {report_file}")

        logger.info("\n" + "=" * 70)
        logger.info("TEST CASE DETAILS")
        logger.info("=" * 70)
        for tc in test_cases_sorted:
            if tc in self.report["test_cases"]:
                tc_data = self.report["test_cases"][tc]
                logger.info(f"{tc}: {tc_data['sourceNaturalKey']} - {tc_data['primaryName']} - {tc_data['description']}")

        logger.info("\n" + "=" * 70)
        logger.info("COMPLETED SUCCESSFULLY!")
        logger.info("=" * 70)

if __name__ == "__main__":
    creator = RegulatoryDiffTestCreator()
    creator.run()
