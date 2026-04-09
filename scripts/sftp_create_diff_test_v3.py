#!/usr/bin/env python3
"""
Script to create two XML files for diff testing with comprehensive test cases.
Downloads reference data from premium-world-check_8370_EU_PR_latest.xml.gz

Test Cases Covered:
1. Record DELETED (exists in base, not in modified)
2. Record ADDED (exists in modified, not in base)
3. Single attribute changes (category, sub-category, e-i, updatecategory, dob, name, title, position)
4. Array field: values ADDED
5. Array field: values REMOVED
6. Array field: values MODIFIED
7. Array field: completely empty in base, has values in modified
8. Array field: has values in base, completely empty in modified
9. Combination changes (multiple attributes + multiple arrays)
10. UNCHANGED records
11. MEGA record with 100 values in each array
"""

import paramiko
import hashlib
import os
import gzip
import tempfile
import logging
import random
from lxml import etree
from collections import Counter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('diff_test_creation_v3.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_USER = "sftp-test-user1"
SFTP_PASSWORD = "f@cctUser1"
SFTP_PORT = 22
SOURCE_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"
REFERENCE_FILE = "premium-world-check_8370_EU_PR_latest.xml.gz"


class ReferenceData:
    """Holds reference data extracted from the real World-Check file"""
    categories = []
    sub_categories = []
    e_i_values = []
    update_categories = []
    keywords = []
    special_interest_cats = []
    countries = []
    id_types = []


def extract_reference_data(sftp):
    """Download and extract reference data from the real World-Check file"""
    logger.info(f"Downloading {REFERENCE_FILE} to extract reference data...")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        local_path = os.path.join(tmpdir, 'ref.xml.gz')
        sftp.get(f'{SOURCE_PATH}/{REFERENCE_FILE}', local_path)
        
        with gzip.open(local_path, 'rb') as f:
            parser = etree.XMLParser(recover=True)
            tree = etree.parse(f, parser)
        
        root = tree.getroot()
        
        categories = set()
        sub_categories = set()
        e_i_values = set()
        update_categories = set()
        keywords = Counter()
        special_interest_cats = set()
        countries = set()
        id_types = set()
        
        for record in root.iter('record'):
            cat = record.get('category')
            sub_cat = record.get('sub-category')
            upd_cat = record.get('updatecategory')
            if cat:
                categories.add(cat)
            if sub_cat:
                sub_categories.add(sub_cat)
            if upd_cat:
                update_categories.add(upd_cat)
            
            for person in record.iter('person'):
                ei = person.get('e-i')
                if ei:
                    e_i_values.add(ei)
            
            for kw in record.iter('keyword'):
                if kw.text:
                    keywords[kw.text] += 1
            
            for sic in record.iter('special_interest_category'):
                if sic.text:
                    special_interest_cats.add(sic.text)
            
            for passport in record.iter('passport'):
                country = passport.get('country')
                if country:
                    countries.add(country)
            
            for id_elem in record.iter('id'):
                id_type = id_elem.get('type')
                if id_type:
                    id_types.add(id_type)
        
        ReferenceData.categories = sorted(list(categories))
        ReferenceData.sub_categories = sorted(list(sub_categories))
        ReferenceData.e_i_values = sorted(list(e_i_values))
        ReferenceData.update_categories = sorted(list(update_categories))
        ReferenceData.keywords = [kw for kw, _ in keywords.most_common(50)]
        ReferenceData.special_interest_cats = sorted(list(special_interest_cats))
        ReferenceData.countries = sorted(list(countries)) if countries else ['US', 'UK', 'DE', 'FR', 'IT']
        ReferenceData.id_types = sorted(list(id_types)) if id_types else ['SSN', 'NID', 'TIN', 'PASSPORT']
        
        logger.info(f"Extracted: {len(ReferenceData.categories)} categories, "
                    f"{len(ReferenceData.sub_categories)} sub-categories, "
                    f"{len(ReferenceData.e_i_values)} e-i values, "
                    f"{len(ReferenceData.update_categories)} update categories, "
                    f"{len(ReferenceData.keywords)} keywords, "
                    f"{len(ReferenceData.special_interest_cats)} special interest categories")


def generate_md5(file_path):
    md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5.update(chunk)
    return md5.hexdigest()


def random_date(start_year=1950, end_year=2000):
    year = random.randint(start_year, end_year)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return f"{year:04d}-{month:02d}-{day:02d}"


def fixed_date(uid):
    """Generate a deterministic date based on UID to ensure consistency between base and modified"""
    year = 1950 + (uid % 50)
    month = 1 + (uid % 12)
    day = 1 + (uid % 28)
    return f"{year:04d}-{month:02d}-{day:02d}"


def get_ref(lst, idx):
    """Safely get item from reference list"""
    if not lst:
        return ""
    return lst[idx % len(lst)]


def create_record(uid, category, sub_category, e_i, updatecategory,
                  first_name, last_name, dob,
                  aliases=None, low_quality_aliases=None, alt_spelling="",
                  passports=None, id_numbers=None, countries=None,
                  keywords=None, locations=None, companies=None,
                  citizenships=None, linked_uids=None, external_sources=None,
                  special_interest_cats=None, further_info="", place_of_birth="",
                  title="", position="", ssn="", age=None, deceased=""):
    """Create a complete record element"""
    
    record = etree.Element('record')
    record.set('uid', str(uid))
    record.set('category', category)
    record.set('sub-category', sub_category)
    record.set('editor', 'DIFF_TEST')
    # Use deterministic dates based on UID for consistency
    entered_year = 2020 + (uid % 5)
    entered_month = 1 + (uid % 12)
    entered_day = 1 + (uid % 28)
    record.set('entered', f"{entered_year:04d}-{entered_month:02d}-{entered_day:02d}")
    updated_year = 2024 + (uid % 3)
    updated_month = 1 + ((uid + 3) % 12)
    updated_day = 1 + ((uid + 5) % 28)
    record.set('updated', f"{updated_year:04d}-{updated_month:02d}-{updated_day:02d}")
    record.set('updatecategory', updatecategory)
    
    person = etree.SubElement(record, 'person')
    person.set('e-i', e_i)
    if ssn:
        person.set('ssn', ssn)
    
    if title:
        etree.SubElement(person, 'title').text = title
    if position:
        etree.SubElement(person, 'position').text = position
    
    names = etree.SubElement(person, 'names')
    etree.SubElement(names, 'first_name').text = first_name
    etree.SubElement(names, 'last_name').text = last_name
    
    if aliases:
        aliases_elem = etree.SubElement(names, 'aliases')
        for alias in aliases:
            etree.SubElement(aliases_elem, 'alias').text = alias
    
    if low_quality_aliases:
        lqa_elem = etree.SubElement(names, 'low_quality_aliases')
        for lqa in low_quality_aliases:
            etree.SubElement(lqa_elem, 'alias').text = lqa
    
    if alt_spelling:
        etree.SubElement(names, 'alternative_spelling').text = alt_spelling
    
    agedata = etree.SubElement(person, 'agedata')
    if age:
        etree.SubElement(agedata, 'age').text = str(age)
    etree.SubElement(agedata, 'dob').text = dob
    if deceased:
        etree.SubElement(agedata, 'deceased').text = deceased
    
    details = etree.SubElement(record, 'details')
    
    if further_info:
        etree.SubElement(details, 'further_information').text = further_info
    
    if passports:
        passports_elem = etree.SubElement(details, 'passports')
        for pp in passports:
            p = etree.SubElement(passports_elem, 'passport')
            p.set('country', pp['country'])
            p.text = pp['number']
    
    if id_numbers:
        ids_elem = etree.SubElement(details, 'id_numbers')
        for idn in id_numbers:
            i = etree.SubElement(ids_elem, 'id')
            i.set('type', idn['type'])
            if idn.get('loc'):
                i.set('loc', idn['loc'])
            i.text = idn['value']
    
    if place_of_birth:
        etree.SubElement(details, 'place_of_birth').text = place_of_birth
    
    if locations:
        locs_elem = etree.SubElement(details, 'locations')
        for loc in locations:
            l = etree.SubElement(locs_elem, 'location')
            l.set('city', loc.get('city', ''))
            l.set('country', loc.get('country', ''))
            l.set('state', loc.get('state', ''))
            l.text = loc.get('text', '')
    
    if countries:
        countries_elem = etree.SubElement(details, 'countries')
        for c in countries:
            etree.SubElement(countries_elem, 'country').text = c
    
    if citizenships:
        cit_elem = etree.SubElement(details, 'citizenships')
        for cit in citizenships:
            etree.SubElement(cit_elem, 'citizenship').text = cit
    
    if companies:
        comp_elem = etree.SubElement(details, 'companies')
        for comp in companies:
            etree.SubElement(comp_elem, 'company').text = comp
    
    if linked_uids:
        linked = etree.SubElement(details, 'linked_to')
        for lu in linked_uids:
            etree.SubElement(linked, 'uid').text = str(lu)
    
    if keywords:
        kw_elem = etree.SubElement(details, 'keywords')
        for kw in keywords:
            etree.SubElement(kw_elem, 'keyword').text = kw
    
    if external_sources:
        es_elem = etree.SubElement(details, 'external_sources')
        for es in external_sources:
            etree.SubElement(es_elem, 'uri').text = es
    
    if special_interest_cats:
        sic_elem = etree.SubElement(details, 'special_interest_categories')
        for sic in special_interest_cats:
            etree.SubElement(sic_elem, 'special_interest_category').text = sic
    
    return record


# ============================================================================
# TEST CASE DEFINITIONS
# ============================================================================

TEST_CASES = """
TEST CASES FOR DIFF TESTING:

GROUP 1: RECORD-LEVEL CHANGES (90001-90005)
  TC01: Record DELETED (in base, not in modified)
  TC02: Record DELETED with all array fields populated
  TC03: Record DELETED with minimal data
  TC04: Record DELETED with special characters in names
  TC05: Record DELETED with maximum array values

GROUP 2: SINGLE ATTRIBUTE CHANGES (90006-90015)
  TC06: Only category changed
  TC07: Only sub-category changed
  TC08: Only e-i changed
  TC09: Only updatecategory changed
  TC10: Only first_name changed
  TC11: Only last_name changed
  TC12: Only dob changed
  TC13: Only title changed
  TC14: Only position changed
  TC15: Only further_info changed

GROUP 3: ARRAY FIELD ADDITIONS (90016-90025)
  TC16: aliases - add 1 new value
  TC17: aliases - add multiple new values
  TC18: passports - add new values
  TC19: id_numbers - add new values
  TC20: keywords - add new values
  TC21: locations - add new values
  TC22: companies - add new values
  TC23: citizenships - add new values
  TC24: external_sources - add new values
  TC25: special_interest_cats - add new values

GROUP 4: ARRAY FIELD REMOVALS (90026-90035)
  TC26: aliases - remove 1 value
  TC27: aliases - remove all but 1
  TC28: passports - remove values
  TC29: id_numbers - remove values
  TC30: keywords - remove values
  TC31: locations - remove values
  TC32: companies - remove values
  TC33: citizenships - remove values
  TC34: external_sources - remove values
  TC35: special_interest_cats - remove values

GROUP 5: ARRAY FIELD MODIFICATIONS (90036-90045)
  TC36: aliases - modify existing values
  TC37: passports - modify country and number
  TC38: id_numbers - modify type and value
  TC39: keywords - replace with different keywords
  TC40: locations - modify city, country, state
  TC41: companies - modify company names
  TC42: citizenships - modify values
  TC43: external_sources - modify URLs
  TC44: special_interest_cats - modify categories
  TC45: low_quality_aliases - modify values

GROUP 6: EMPTY TO POPULATED / POPULATED TO EMPTY (90046-90055)
  TC46: aliases - empty in base, populated in modified
  TC47: passports - empty in base, populated in modified
  TC48: keywords - empty in base, populated in modified
  TC49: special_interest_cats - empty in base, populated in modified
  TC50: aliases - populated in base, empty in modified
  TC51: passports - populated in base, empty in modified
  TC52: keywords - populated in base, empty in modified
  TC53: special_interest_cats - populated in base, empty in modified
  TC54: All arrays empty in base, all populated in modified
  TC55: All arrays populated in base, all empty in modified

GROUP 7: COMBINATION CHANGES (90056-90060)
  TC56: Multiple attributes + multiple arrays changed
  TC57: All single attributes changed, arrays unchanged
  TC58: All arrays changed, single attributes unchanged
  TC59: Half arrays added, half removed
  TC60: Mixed: some added, some removed, some modified

GROUP 8: UNCHANGED RECORDS (90061-90065)
  TC61-65: Records that should be identical in both files

GROUP 9: NEW RECORDS (90066-90070)
  TC66-70: Records that only exist in modified file

GROUP 10: MEGA RECORD (99999)
  TC71: Record with 100 values in each array field, with partial modifications
"""


def create_base_records():
    """Create base records for all test cases"""
    records = []
    R = ReferenceData
    
    # GROUP 1: Records to be DELETED (90001-90005)
    # TC01: Basic delete
    records.append(create_record(
        uid=90001, category=get_ref(R.categories, 0), sub_category=get_ref(R.sub_categories, 0),
        e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
        first_name="DELETE_BASIC", last_name="PERSON", dob="1970-01-15",
        aliases=["DelAlias1", "DelAlias2"],
        keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)]
    ))
    
    # TC02: Delete with all arrays populated
    records.append(create_record(
        uid=90002, category=get_ref(R.categories, 1), sub_category=get_ref(R.sub_categories, 1),
        e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
        first_name="DELETE_FULL", last_name="ARRAYS", dob="1975-05-20",
        aliases=["DelFullAlias1", "DelFullAlias2", "DelFullAlias3"],
        passports=[{'country': get_ref(R.countries, 0), 'number': 'DEL90002PP1'},
                   {'country': get_ref(R.countries, 1), 'number': 'DEL90002PP2'}],
        id_numbers=[{'type': get_ref(R.id_types, 0), 'value': 'DELID90002_1', 'loc': 'US'}],
        keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1), get_ref(R.keywords, 2)],
        locations=[{'city': 'DelCity1', 'country': 'US', 'state': 'CA', 'text': 'Del Location 1'}],
        companies=["DelCompany1 Ltd", "DelCompany2 Inc"],
        citizenships=["DelCitizenship1", "DelCitizenship2"],
        external_sources=["https://del1.example.com", "https://del2.example.com"],
        special_interest_cats=[get_ref(R.special_interest_cats, 0), get_ref(R.special_interest_cats, 1)]
    ))
    
    # TC03: Delete with minimal data
    records.append(create_record(
        uid=90003, category=get_ref(R.categories, 2), sub_category=get_ref(R.sub_categories, 2),
        e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
        first_name="DELETE_MINIMAL", last_name="DATA", dob="1980-12-01"
    ))
    
    # TC04: Delete with special characters
    records.append(create_record(
        uid=90004, category=get_ref(R.categories, 3), sub_category=get_ref(R.sub_categories, 3),
        e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
        first_name="DELETE_SPECIAL", last_name="O'CONNOR-SMITH", dob="1965-07-14",
        aliases=["Del-Special_Alias", "Del.Special.Alias"]
    ))
    
    # TC05: Delete with max array values
    records.append(create_record(
        uid=90005, category=get_ref(R.categories, 4), sub_category=get_ref(R.sub_categories, 4),
        e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
        first_name="DELETE_MAX", last_name="ARRAYS", dob="1955-03-22",
        aliases=[f"DelMaxAlias{i}" for i in range(10)],
        passports=[{'country': get_ref(R.countries, i), 'number': f'DELMAX90005PP{i}'} for i in range(5)],
        keywords=[get_ref(R.keywords, i) for i in range(10)]
    ))
    
    # GROUP 2: Single attribute changes (90006-90015)
    for i, tc_name in enumerate([
        "CATEGORY_CHANGE", "SUBCAT_CHANGE", "EI_CHANGE", "UPDCAT_CHANGE", "FNAME_CHANGE",
        "LNAME_CHANGE", "DOB_CHANGE", "TITLE_CHANGE", "POSITION_CHANGE", "FURTHERINFO_CHANGE"
    ]):
        uid = 90006 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i), sub_category=get_ref(R.sub_categories, i),
            e_i=get_ref(R.e_i_values, i % len(R.e_i_values)), 
            updatecategory=get_ref(R.update_categories, i % len(R.update_categories)),
            first_name=tc_name, last_name="PERSON", dob="1972-06-15",
            title="Mr." if i == 7 else "", position=f"Position{i}" if i == 8 else "",
            further_info=f"Original info {i}" if i == 9 else "",
            aliases=[f"SingleAttr{i}_Alias1", f"SingleAttr{i}_Alias2"],
            keywords=[get_ref(R.keywords, i), get_ref(R.keywords, i+1)]
        ))
    
    # GROUP 3: Array field additions (90016-90025)
    array_fields = ["aliases", "aliases_multi", "passports", "id_numbers", "keywords",
                    "locations", "companies", "citizenships", "external_sources", "special_interest_cats"]
    for i, field in enumerate(array_fields):
        uid = 90016 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+5), sub_category=get_ref(R.sub_categories, i+5),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"ADD_{field.upper()}", last_name="PERSON", dob=fixed_date(uid),
            aliases=[f"AddBase{i}_Alias1"] if "alias" in field else [f"Add{i}_Alias1", f"Add{i}_Alias2"],
            passports=[{'country': get_ref(R.countries, 0), 'number': f'ADD{uid}PP1'}] if field == "passports" else None,
            id_numbers=[{'type': get_ref(R.id_types, 0), 'value': f'ADDID{uid}_1', 'loc': 'US'}] if field == "id_numbers" else None,
            keywords=[get_ref(R.keywords, 0)] if field == "keywords" else [get_ref(R.keywords, i), get_ref(R.keywords, i+1)],
            locations=[{'city': f'AddCity{i}', 'country': 'US', 'state': 'CA', 'text': f'Add Loc {i}'}] if field == "locations" else None,
            companies=[f"AddCompany{i} Ltd"] if field == "companies" else None,
            citizenships=[f"AddCitizenship{i}"] if field == "citizenships" else None,
            external_sources=[f"https://add{i}.example.com"] if field == "external_sources" else None,
            special_interest_cats=[get_ref(R.special_interest_cats, 0)] if field == "special_interest_cats" else None
        ))
    
    # GROUP 4: Array field removals (90026-90035)
    for i, field in enumerate(array_fields):
        uid = 90026 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+10), sub_category=get_ref(R.sub_categories, i+10),
            e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
            first_name=f"REMOVE_{field.upper()}", last_name="PERSON", dob=fixed_date(uid),
            aliases=[f"RemBase{i}_Alias1", f"RemBase{i}_Alias2", f"RemBase{i}_Alias3"],
            passports=[{'country': get_ref(R.countries, j), 'number': f'REM{uid}PP{j}'} for j in range(3)],
            id_numbers=[{'type': get_ref(R.id_types, j), 'value': f'REMID{uid}_{j}', 'loc': 'US'} for j in range(3)],
            keywords=[get_ref(R.keywords, j) for j in range(3)],
            locations=[{'city': f'RemCity{j}', 'country': 'US', 'state': 'CA', 'text': f'Rem Loc {j}'} for j in range(3)],
            companies=[f"RemCompany{j} Ltd" for j in range(3)],
            citizenships=[f"RemCitizenship{j}" for j in range(3)],
            external_sources=[f"https://rem{j}.example.com" for j in range(3)],
            special_interest_cats=[get_ref(R.special_interest_cats, j) for j in range(min(3, len(R.special_interest_cats)))]
        ))
    
    # GROUP 5: Array field modifications (90036-90045)
    for i in range(10):
        uid = 90036 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+15), sub_category=get_ref(R.sub_categories, i+15),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"MODIFY_ARRAY_{i+1}", last_name="PERSON", dob=fixed_date(uid),
            aliases=[f"ModOrig{i}_Alias1", f"ModOrig{i}_Alias2"],
            low_quality_aliases=[f"ModOrigLQA{i}_1", f"ModOrigLQA{i}_2"] if i == 9 else None,
            passports=[{'country': get_ref(R.countries, 0), 'number': f'MODORIG{uid}PP1'},
                       {'country': get_ref(R.countries, 1), 'number': f'MODORIG{uid}PP2'}],
            id_numbers=[{'type': get_ref(R.id_types, 0), 'value': f'MODORIGID{uid}_1', 'loc': 'US'},
                        {'type': get_ref(R.id_types, 1), 'value': f'MODORIGID{uid}_2', 'loc': 'UK'}],
            keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)],
            locations=[{'city': f'ModOrigCity{i}_1', 'country': 'US', 'state': 'CA', 'text': f'Mod Orig Loc {i}_1'},
                       {'city': f'ModOrigCity{i}_2', 'country': 'UK', 'state': 'London', 'text': f'Mod Orig Loc {i}_2'}],
            companies=[f"ModOrigCompany{i}_1 Ltd", f"ModOrigCompany{i}_2 Inc"],
            citizenships=[f"ModOrigCitizenship{i}_1", f"ModOrigCitizenship{i}_2"],
            external_sources=[f"https://modorig{i}_1.example.com", f"https://modorig{i}_2.example.com"],
            special_interest_cats=[get_ref(R.special_interest_cats, 0), get_ref(R.special_interest_cats, 1)]
        ))
    
    # GROUP 6: Empty to populated / Populated to empty (90046-90055)
    # TC46-49: Empty in base (will be populated in modified)
    for i, field in enumerate(["aliases", "passports", "keywords", "special_interest_cats"]):
        uid = 90046 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i), sub_category=get_ref(R.sub_categories, i),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"EMPTY_TO_POP_{field.upper()}", last_name="PERSON", dob=fixed_date(uid)
            # No array fields - they will be added in modified
        ))
    
    # TC50-53: Populated in base (will be empty in modified)
    for i, field in enumerate(["aliases", "passports", "keywords", "special_interest_cats"]):
        uid = 90050 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+4), sub_category=get_ref(R.sub_categories, i+4),
            e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
            first_name=f"POP_TO_EMPTY_{field.upper()}", last_name="PERSON", dob=fixed_date(uid),
            aliases=[f"PopToEmpty{i}_Alias1", f"PopToEmpty{i}_Alias2"] if field == "aliases" else None,
            passports=[{'country': get_ref(R.countries, 0), 'number': f'PTE{uid}PP1'}] if field == "passports" else None,
            keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)] if field == "keywords" else None,
            special_interest_cats=[get_ref(R.special_interest_cats, 0)] if field == "special_interest_cats" else None
        ))
    
    # TC54: All arrays empty in base
    records.append(create_record(
        uid=90054, category=get_ref(R.categories, 8), sub_category=get_ref(R.sub_categories, 8),
        e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
        first_name="ALL_EMPTY_TO_POP", last_name="PERSON", dob=fixed_date(uid)
    ))
    
    # TC55: All arrays populated in base
    records.append(create_record(
        uid=90055, category=get_ref(R.categories, 9), sub_category=get_ref(R.sub_categories, 9),
        e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
        first_name="ALL_POP_TO_EMPTY", last_name="PERSON", dob=fixed_date(uid),
        aliases=["AllPopAlias1", "AllPopAlias2"],
        passports=[{'country': get_ref(R.countries, 0), 'number': 'ALLPOP90055PP1'}],
        id_numbers=[{'type': get_ref(R.id_types, 0), 'value': 'ALLPOPID90055_1', 'loc': 'US'}],
        keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)],
        locations=[{'city': 'AllPopCity', 'country': 'US', 'state': 'CA', 'text': 'All Pop Loc'}],
        companies=["AllPopCompany Ltd"],
        citizenships=["AllPopCitizenship"],
        external_sources=["https://allpop.example.com"],
        special_interest_cats=[get_ref(R.special_interest_cats, 0)]
    ))
    
    # GROUP 7: Combination changes (90056-90060)
    for i in range(5):
        uid = 90056 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i), sub_category=get_ref(R.sub_categories, i),
            e_i=get_ref(R.e_i_values, i % len(R.e_i_values)), 
            updatecategory=get_ref(R.update_categories, i % len(R.update_categories)),
            first_name=f"COMBO_CHANGE_{i+1}", last_name="PERSON", dob="1978-04-10",
            title="Mr.", position=f"OrigPosition{i}",
            aliases=[f"ComboOrig{i}_Alias1", f"ComboOrig{i}_Alias2"],
            passports=[{'country': get_ref(R.countries, 0), 'number': f'COMBO{uid}PP1'}],
            keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)],
            special_interest_cats=[get_ref(R.special_interest_cats, 0)]
        ))
    
    # GROUP 8: Unchanged records (90061-90065)
    for i in range(5):
        uid = 90061 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+10), sub_category=get_ref(R.sub_categories, i+10),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"UNCHANGED_{i+1}", last_name="PERSON", dob="1980-01-15",
            aliases=[f"Unchanged{i}_Alias1", f"Unchanged{i}_Alias2"],
            passports=[{'country': get_ref(R.countries, 0), 'number': f'UNCH{uid}PP1'}],
            keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)],
            special_interest_cats=[get_ref(R.special_interest_cats, 0)]
        ))
    
    # GROUP 10: MEGA record (99999)
    logger.info("Creating MEGA record with 100 values in each array...")
    records.append(create_record(
        uid=99999, category=get_ref(R.categories, 0), sub_category=get_ref(R.sub_categories, 0),
        e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
        first_name="MEGA_FIRST", last_name="MEGA_LAST", dob="1975-06-15",
        title="Dr.", position="Chief Executive", ssn="123-45-6789", age=50,
        place_of_birth="Mega City", further_info="MEGA record with 100 values in arrays",
        aliases=[f"MegaAlias_{i}" for i in range(100)],
        low_quality_aliases=[f"MegaLQA_{i}" for i in range(100)],
        alt_spelling="MEGA ALTERNATIVE SPELLING",
        passports=[{'country': get_ref(R.countries, i), 'number': f"MEGAPP{i:03d}"} for i in range(100)],
        id_numbers=[{'type': get_ref(R.id_types, i), 'value': f"MEGAID{i:03d}", 'loc': get_ref(R.countries, i)} for i in range(100)],
        countries=[f"MegaCountry_{i}" for i in range(100)],
        keywords=[get_ref(R.keywords, i) for i in range(100)],
        locations=[{'city': f'MegaCity_{i}', 'country': get_ref(R.countries, i), 'state': f'MegaState_{i}', 'text': f'Mega Loc {i}'} for i in range(100)],
        companies=[f"MegaCompany_{i} LLC" for i in range(100)],
        citizenships=[f"MegaCitizenship_{i}" for i in range(100)],
        linked_uids=list(range(100001, 100101)),
        external_sources=[f"https://mega{i}.example.com" for i in range(100)],
        special_interest_cats=[get_ref(R.special_interest_cats, i) for i in range(100)]
    ))
    
    return records


def create_modified_records():
    """Create modified records for all test cases"""
    records = []
    R = ReferenceData
    
    # GROUP 1: Records DELETED - NOT included in modified file (90001-90005)
    # These records are intentionally omitted
    
    # GROUP 2: Single attribute changes (90006-90015)
    tc_changes = [
        {"category": get_ref(R.categories, 5)},  # TC06: category changed
        {"sub_category": get_ref(R.sub_categories, 5)},  # TC07: sub-category changed
        {"e_i": get_ref(R.e_i_values, 2) if len(R.e_i_values) > 2 else get_ref(R.e_i_values, 0)},  # TC08: e-i changed
        {"updatecategory": get_ref(R.update_categories, 2) if len(R.update_categories) > 2 else get_ref(R.update_categories, 0)},  # TC09: updatecategory changed
        {"first_name": "FNAME_CHANGED"},  # TC10: first_name changed
        {"last_name": "LNAME_CHANGED"},  # TC11: last_name changed
        {"dob": "1985-12-25"},  # TC12: dob changed
        {"title": "Dr."},  # TC13: title changed
        {"position": "NewPosition"},  # TC14: position changed
        {"further_info": "Modified info text"},  # TC15: further_info changed
    ]
    
    for i, changes in enumerate(tc_changes):
        uid = 90006 + i
        tc_name = ["CATEGORY_CHANGE", "SUBCAT_CHANGE", "EI_CHANGE", "UPDCAT_CHANGE", "FNAME_CHANGE",
                   "LNAME_CHANGE", "DOB_CHANGE", "TITLE_CHANGE", "POSITION_CHANGE", "FURTHERINFO_CHANGE"][i]
        
        # Start with base values
        rec_data = {
            "uid": uid,
            "category": get_ref(R.categories, i),
            "sub_category": get_ref(R.sub_categories, i),
            "e_i": get_ref(R.e_i_values, i % len(R.e_i_values)),
            "updatecategory": get_ref(R.update_categories, i % len(R.update_categories)),
            "first_name": tc_name,
            "last_name": "PERSON",
            "dob": "1972-06-15",
            "title": "Mr." if i == 7 else "",
            "position": f"Position{i}" if i == 8 else "",
            "further_info": f"Original info {i}" if i == 9 else "",
            "aliases": [f"SingleAttr{i}_Alias1", f"SingleAttr{i}_Alias2"],
            "keywords": [get_ref(R.keywords, i), get_ref(R.keywords, i+1)]
        }
        
        # Apply the specific change for this test case
        rec_data.update(changes)
        records.append(create_record(**rec_data))
    
    # GROUP 3: Array field additions (90016-90025)
    array_fields = ["aliases", "aliases_multi", "passports", "id_numbers", "keywords",
                    "locations", "companies", "citizenships", "external_sources", "special_interest_cats"]
    for i, field in enumerate(array_fields):
        uid = 90016 + i
        
        # Base arrays with additions
        aliases = [f"AddBase{i}_Alias1", f"AddBase{i}_Alias_NEW1", f"AddBase{i}_Alias_NEW2"] if "alias" in field else [f"Add{i}_Alias1", f"Add{i}_Alias2"]
        passports = [{'country': get_ref(R.countries, 0), 'number': f'ADD{uid}PP1'},
                     {'country': get_ref(R.countries, 1), 'number': f'ADD{uid}PP_NEW1'}] if field == "passports" else None
        id_numbers = [{'type': get_ref(R.id_types, 0), 'value': f'ADDID{uid}_1', 'loc': 'US'},
                      {'type': get_ref(R.id_types, 1), 'value': f'ADDID{uid}_NEW1', 'loc': 'UK'}] if field == "id_numbers" else None
        keywords = [get_ref(R.keywords, 0), get_ref(R.keywords, 5), get_ref(R.keywords, 10)] if field == "keywords" else [get_ref(R.keywords, i), get_ref(R.keywords, i+1)]
        locations = [{'city': f'AddCity{i}', 'country': 'US', 'state': 'CA', 'text': f'Add Loc {i}'},
                     {'city': f'AddCity{i}_NEW', 'country': 'UK', 'state': 'London', 'text': f'Add Loc NEW {i}'}] if field == "locations" else None
        companies = [f"AddCompany{i} Ltd", f"AddCompany{i}_NEW Inc"] if field == "companies" else None
        citizenships = [f"AddCitizenship{i}", f"AddCitizenship{i}_NEW"] if field == "citizenships" else None
        external_sources = [f"https://add{i}.example.com", f"https://add{i}_new.example.com"] if field == "external_sources" else None
        special_interest_cats = [get_ref(R.special_interest_cats, 0), get_ref(R.special_interest_cats, 5)] if field == "special_interest_cats" else None
        
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+5), sub_category=get_ref(R.sub_categories, i+5),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"ADD_{field.upper()}", last_name="PERSON", dob=fixed_date(uid),
            aliases=aliases, passports=passports, id_numbers=id_numbers, keywords=keywords,
            locations=locations, companies=companies, citizenships=citizenships,
            external_sources=external_sources, special_interest_cats=special_interest_cats
        ))
    
    # GROUP 4: Array field removals (90026-90035)
    for i, field in enumerate(array_fields):
        uid = 90026 + i
        
        # Reduced arrays (keeping only first element)
        aliases = [f"RemBase{i}_Alias1"]  # Removed 2
        passports = [{'country': get_ref(R.countries, 0), 'number': f'REM{uid}PP0'}]  # Removed 2
        id_numbers = [{'type': get_ref(R.id_types, 0), 'value': f'REMID{uid}_0', 'loc': 'US'}]  # Removed 2
        keywords = [get_ref(R.keywords, 0)]  # Removed 2
        locations = [{'city': 'RemCity0', 'country': 'US', 'state': 'CA', 'text': 'Rem Loc 0'}]  # Removed 2
        companies = ["RemCompany0 Ltd"]  # Removed 2
        citizenships = ["RemCitizenship0"]  # Removed 2
        external_sources = ["https://rem0.example.com"]  # Removed 2
        special_interest_cats = [get_ref(R.special_interest_cats, 0)]  # Removed 2
        
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+10), sub_category=get_ref(R.sub_categories, i+10),
            e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
            first_name=f"REMOVE_{field.upper()}", last_name="PERSON", dob=fixed_date(uid),
            aliases=aliases, passports=passports, id_numbers=id_numbers, keywords=keywords,
            locations=locations, companies=companies, citizenships=citizenships,
            external_sources=external_sources, special_interest_cats=special_interest_cats
        ))
    
    # GROUP 5: Array field modifications (90036-90045)
    for i in range(10):
        uid = 90036 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+15), sub_category=get_ref(R.sub_categories, i+15),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"MODIFY_ARRAY_{i+1}", last_name="PERSON", dob=fixed_date(uid),
            aliases=[f"ModChanged{i}_Alias1", f"ModChanged{i}_Alias2"],  # Modified
            low_quality_aliases=[f"ModChangedLQA{i}_1", f"ModChangedLQA{i}_2"] if i == 9 else None,
            passports=[{'country': get_ref(R.countries, 5), 'number': f'MODCHG{uid}PP1'},
                       {'country': get_ref(R.countries, 6), 'number': f'MODCHG{uid}PP2'}],  # Modified
            id_numbers=[{'type': get_ref(R.id_types, 2), 'value': f'MODCHGID{uid}_1', 'loc': 'FR'},
                        {'type': get_ref(R.id_types, 3), 'value': f'MODCHGID{uid}_2', 'loc': 'DE'}],  # Modified
            keywords=[get_ref(R.keywords, 10), get_ref(R.keywords, 11)],  # Modified
            locations=[{'city': f'ModChgCity{i}_1', 'country': 'FR', 'state': 'Paris', 'text': f'Mod Chg Loc {i}_1'},
                       {'city': f'ModChgCity{i}_2', 'country': 'DE', 'state': 'Berlin', 'text': f'Mod Chg Loc {i}_2'}],  # Modified
            companies=[f"ModChgCompany{i}_1 Ltd", f"ModChgCompany{i}_2 Inc"],  # Modified
            citizenships=[f"ModChgCitizenship{i}_1", f"ModChgCitizenship{i}_2"],  # Modified
            external_sources=[f"https://modchg{i}_1.example.com", f"https://modchg{i}_2.example.com"],  # Modified
            special_interest_cats=[get_ref(R.special_interest_cats, 5), get_ref(R.special_interest_cats, 6)]  # Modified
        ))
    
    # GROUP 6: Empty to populated / Populated to empty (90046-90055)
    # TC46-49: Now populated (was empty in base)
    for i, field in enumerate(["aliases", "passports", "keywords", "special_interest_cats"]):
        uid = 90046 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i), sub_category=get_ref(R.sub_categories, i),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"EMPTY_TO_POP_{field.upper()}", last_name="PERSON", dob=fixed_date(uid),
            aliases=[f"NewAlias{i}_1", f"NewAlias{i}_2"] if field == "aliases" else None,
            passports=[{'country': get_ref(R.countries, 0), 'number': f'NEWPP{uid}'}] if field == "passports" else None,
            keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)] if field == "keywords" else None,
            special_interest_cats=[get_ref(R.special_interest_cats, 0)] if field == "special_interest_cats" else None
        ))
    
    # TC50-53: Now empty (was populated in base)
    for i, field in enumerate(["aliases", "passports", "keywords", "special_interest_cats"]):
        uid = 90050 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+4), sub_category=get_ref(R.sub_categories, i+4),
            e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
            first_name=f"POP_TO_EMPTY_{field.upper()}", last_name="PERSON", dob=fixed_date(uid)
            # All arrays now empty
        ))
    
    # TC54: All arrays now populated (was empty in base)
    records.append(create_record(
        uid=90054, category=get_ref(R.categories, 8), sub_category=get_ref(R.sub_categories, 8),
        e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
        first_name="ALL_EMPTY_TO_POP", last_name="PERSON", dob=fixed_date(uid),
        aliases=["NewAllAlias1", "NewAllAlias2"],
        passports=[{'country': get_ref(R.countries, 0), 'number': 'NEWALL90054PP1'}],
        id_numbers=[{'type': get_ref(R.id_types, 0), 'value': 'NEWALLID90054_1', 'loc': 'US'}],
        keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)],
        locations=[{'city': 'NewAllCity', 'country': 'US', 'state': 'CA', 'text': 'New All Loc'}],
        companies=["NewAllCompany Ltd"],
        citizenships=["NewAllCitizenship"],
        external_sources=["https://newall.example.com"],
        special_interest_cats=[get_ref(R.special_interest_cats, 0)]
    ))
    
    # TC55: All arrays now empty (was populated in base)
    records.append(create_record(
        uid=90055, category=get_ref(R.categories, 9), sub_category=get_ref(R.sub_categories, 9),
        e_i=get_ref(R.e_i_values, 1), updatecategory=get_ref(R.update_categories, 1),
        first_name="ALL_POP_TO_EMPTY", last_name="PERSON", dob=fixed_date(uid)
        # All arrays now empty
    ))
    
    # GROUP 7: Combination changes (90056-90060)
    combo_changes = [
        # TC56: Multiple attributes + multiple arrays changed
        {"category": get_ref(R.categories, 5), "first_name": "COMBO_CHANGED_1", "dob": "1990-01-01",
         "aliases": ["ComboNew1_Alias1", "ComboNew1_Alias2", "ComboNew1_Alias3"],
         "keywords": [get_ref(R.keywords, 10), get_ref(R.keywords, 11), get_ref(R.keywords, 12)]},
        # TC57: All single attributes changed, arrays unchanged
        {"category": get_ref(R.categories, 6), "sub_category": get_ref(R.sub_categories, 6),
         "e_i": get_ref(R.e_i_values, 1), "first_name": "COMBO_ALLATTR_2", "dob": "1988-05-05", "title": "Prof."},
        # TC58: All arrays changed, single attributes unchanged
        {"aliases": ["ComboArr3_Alias1"], "passports": [{'country': get_ref(R.countries, 5), 'number': 'COMBOARR90058PP1'}],
         "keywords": [get_ref(R.keywords, 20)]},
        # TC59: Half arrays added, half removed
        {"aliases": ["ComboHalf4_Alias1", "ComboHalf4_Alias2", "ComboHalf4_NEW"],  # Added
         "keywords": [get_ref(R.keywords, 0)]},  # Removed
        # TC60: Mixed changes
        {"first_name": "COMBO_MIXED_5", "aliases": ["ComboMix5_Alias1"],  # Removed
         "passports": [{'country': get_ref(R.countries, 0), 'number': 'COMBO90060PP1'},
                       {'country': get_ref(R.countries, 1), 'number': 'COMBO90060PP_NEW'}]}  # Added
    ]
    
    for i, changes in enumerate(combo_changes):
        uid = 90056 + i
        rec_data = {
            "uid": uid,
            "category": get_ref(R.categories, i),
            "sub_category": get_ref(R.sub_categories, i),
            "e_i": get_ref(R.e_i_values, i % len(R.e_i_values)),
            "updatecategory": get_ref(R.update_categories, i % len(R.update_categories)),
            "first_name": f"COMBO_CHANGE_{i+1}",
            "last_name": "PERSON",
            "dob": "1978-04-10",
            "title": "Mr.",
            "position": f"OrigPosition{i}",
            "aliases": [f"ComboOrig{i}_Alias1", f"ComboOrig{i}_Alias2"],
            "passports": [{'country': get_ref(R.countries, 0), 'number': f'COMBO{uid}PP1'}],
            "keywords": [get_ref(R.keywords, 0), get_ref(R.keywords, 1)],
            "special_interest_cats": [get_ref(R.special_interest_cats, 0)]
        }
        rec_data.update(changes)
        records.append(create_record(**rec_data))
    
    # GROUP 8: Unchanged records (90061-90065) - SAME as base
    for i in range(5):
        uid = 90061 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+10), sub_category=get_ref(R.sub_categories, i+10),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"UNCHANGED_{i+1}", last_name="PERSON", dob="1980-01-15",
            aliases=[f"Unchanged{i}_Alias1", f"Unchanged{i}_Alias2"],
            passports=[{'country': get_ref(R.countries, 0), 'number': f'UNCH{uid}PP1'}],
            keywords=[get_ref(R.keywords, 0), get_ref(R.keywords, 1)],
            special_interest_cats=[get_ref(R.special_interest_cats, 0)]
        ))
    
    # GROUP 9: NEW records (90066-90070) - Only in modified
    for i in range(5):
        uid = 90066 + i
        records.append(create_record(
            uid=uid, category=get_ref(R.categories, i+15), sub_category=get_ref(R.sub_categories, i+15),
            e_i=get_ref(R.e_i_values, 0), updatecategory=get_ref(R.update_categories, 0),
            first_name=f"NEW_RECORD_{i+1}", last_name="ADDED", dob=fixed_date(uid),
            aliases=[f"NewRec{i}_Alias1", f"NewRec{i}_Alias2"],
            passports=[{'country': get_ref(R.countries, i), 'number': f'NEWREC{uid}PP1'}],
            id_numbers=[{'type': get_ref(R.id_types, i), 'value': f'NEWRECID{uid}_1', 'loc': 'US'}],
            keywords=[get_ref(R.keywords, i), get_ref(R.keywords, i+1)],
            locations=[{'city': f'NewRecCity{i}', 'country': 'US', 'state': 'CA', 'text': f'New Rec Loc {i}'}],
            companies=[f"NewRecCompany{i} Ltd"],
            citizenships=[f"NewRecCitizenship{i}"],
            external_sources=[f"https://newrec{i}.example.com"],
            special_interest_cats=[get_ref(R.special_interest_cats, i)]
        ))
    
    # GROUP 10: MEGA record with modifications (99999)
    logger.info("Creating modified MEGA record...")
    records.append(create_record(
        uid=99999, 
        category=get_ref(R.categories, 1),  # Changed
        sub_category=get_ref(R.sub_categories, 1),  # Changed
        e_i=get_ref(R.e_i_values, 1) if len(R.e_i_values) > 1 else get_ref(R.e_i_values, 0),  # Changed
        updatecategory=get_ref(R.update_categories, 1) if len(R.update_categories) > 1 else get_ref(R.update_categories, 0),  # Changed
        first_name="MEGA_FIRST_MODIFIED",  # Changed
        last_name="MEGA_LAST_MODIFIED",  # Changed
        dob="1975-08-20",  # Changed
        title="Prof.",  # Changed
        position="Chairman",  # Changed
        ssn="987-65-4321",  # Changed
        age=51,  # Changed
        place_of_birth="Modified Mega City",  # Changed
        further_info="MODIFIED MEGA record",  # Changed
        # 50 same + 50 new values in arrays
        aliases=[f"MegaAlias_{i}" for i in range(50)] + [f"MegaAlias_NEW_{i}" for i in range(50)],
        low_quality_aliases=[f"MegaLQA_{i}" for i in range(50)] + [f"MegaLQA_NEW_{i}" for i in range(50)],
        alt_spelling="MEGA ALTERNATIVE SPELLING MODIFIED",
        passports=[{'country': get_ref(R.countries, i), 'number': f"MEGAPP{i:03d}"} for i in range(50)] +
                  [{'country': get_ref(R.countries, i+5), 'number': f"MEGAPP_NEW{i:03d}"} for i in range(50)],
        id_numbers=[{'type': get_ref(R.id_types, i), 'value': f"MEGAID{i:03d}", 'loc': get_ref(R.countries, i)} for i in range(50)] +
                   [{'type': get_ref(R.id_types, i+3), 'value': f"MEGAID_NEW{i:03d}", 'loc': get_ref(R.countries, i+5)} for i in range(50)],
        countries=[f"MegaCountry_{i}" for i in range(50)] + [f"MegaCountry_NEW_{i}" for i in range(50)],
        keywords=[get_ref(R.keywords, i) for i in range(50)] + [get_ref(R.keywords, i+20) for i in range(50)],
        locations=[{'city': f'MegaCity_{i}', 'country': get_ref(R.countries, i), 'state': f'MegaState_{i}', 'text': f'Mega Loc {i}'} for i in range(50)] +
                  [{'city': f'MegaCity_NEW_{i}', 'country': get_ref(R.countries, i+5), 'state': f'MegaState_NEW_{i}', 'text': f'Mega Loc NEW {i}'} for i in range(50)],
        companies=[f"MegaCompany_{i} LLC" for i in range(50)] + [f"MegaCompany_NEW_{i} Corp" for i in range(50)],
        citizenships=[f"MegaCitizenship_{i}" for i in range(50)] + [f"MegaCitizenship_NEW_{i}" for i in range(50)],
        linked_uids=list(range(100001, 100051)) + list(range(200001, 200051)),
        external_sources=[f"https://mega{i}.example.com" for i in range(50)] + [f"https://mega_new{i}.example.com" for i in range(50)],
        special_interest_cats=[get_ref(R.special_interest_cats, i) for i in range(50)] + [get_ref(R.special_interest_cats, i+10) for i in range(50)]
    ))
    
    return records


def build_xml(records):
    """Build complete XML document from records"""
    root = etree.Element('records')
    for record in records:
        root.append(record)
    return root


def main():
    logger.info("=" * 70)
    logger.info("CREATING COMPREHENSIVE DIFF TEST FILES (V3)")
    logger.info("=" * 70)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        logger.info(f"Connecting to {SFTP_HOST}...")
        ssh.connect(SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = ssh.open_sftp()
        logger.info("Connected!")
        
        # Extract reference data from real World-Check file
        extract_reference_data(sftp)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            
            # ============ CREATE BASE FILE ============
            logger.info("\n--- CREATING BASE FILE ---")
            
            base_records = create_base_records()
            logger.info(f"Created {len(base_records)} base records")
            
            base_root = build_xml(base_records)
            base_xml = etree.tostring(base_root, encoding='utf-8', xml_declaration=True, pretty_print=True)
            logger.info(f"Base XML size: {len(base_xml)} bytes")
            
            base_filename = "premium-world-check_diff_base_v1.xml.gz"
            base_path = os.path.join(tmpdir, base_filename)
            with gzip.open(base_path, 'wb') as f:
                f.write(base_xml)
            
            base_size = os.path.getsize(base_path)
            base_md5 = generate_md5(base_path)
            logger.info(f"Base file compressed: {base_size} bytes, MD5: {base_md5}")
            
            base_md5_filename = f"{base_filename}.md5"
            base_md5_path = os.path.join(tmpdir, base_md5_filename)
            with open(base_md5_path, 'w') as f:
                f.write(f"{base_md5} *{base_filename}\n")
            
            # ============ CREATE MODIFIED FILE ============
            logger.info("\n--- CREATING MODIFIED FILE ---")
            
            mod_records = create_modified_records()
            logger.info(f"Created {len(mod_records)} modified records")
            
            mod_root = build_xml(mod_records)
            mod_xml = etree.tostring(mod_root, encoding='utf-8', xml_declaration=True, pretty_print=True)
            logger.info(f"Modified XML size: {len(mod_xml)} bytes")
            
            mod_filename = "premium-world-check_diff_modified_v1.xml.gz"
            mod_path = os.path.join(tmpdir, mod_filename)
            with gzip.open(mod_path, 'wb') as f:
                f.write(mod_xml)
            
            mod_size = os.path.getsize(mod_path)
            mod_md5 = generate_md5(mod_path)
            logger.info(f"Modified file compressed: {mod_size} bytes, MD5: {mod_md5}")
            
            mod_md5_filename = f"{mod_filename}.md5"
            mod_md5_path = os.path.join(tmpdir, mod_md5_filename)
            with open(mod_md5_path, 'w') as f:
                f.write(f"{mod_md5} *{mod_filename}\n")
            
            # ============ UPLOAD FILES ============
            logger.info("\n--- UPLOADING FILES ---")
            
            sftp.put(base_path, f"{SOURCE_PATH}/{base_filename}", confirm=False)
            logger.info(f"Uploaded: {base_filename}")
            
            sftp.put(base_md5_path, f"{SOURCE_PATH}/{base_md5_filename}", confirm=False)
            logger.info(f"Uploaded: {base_md5_filename}")
            
            sftp.put(mod_path, f"{SOURCE_PATH}/{mod_filename}", confirm=False)
            logger.info(f"Uploaded: {mod_filename}")
            
            sftp.put(mod_md5_path, f"{SOURCE_PATH}/{mod_md5_filename}", confirm=False)
            logger.info(f"Uploaded: {mod_md5_filename}")
            
            # ============ SUMMARY ============
            logger.info("\n" + "=" * 70)
            logger.info("DIFF TEST FILES SUMMARY")
            logger.info("=" * 70)
            
            logger.info(f"\nBASE FILE: {base_filename}")
            logger.info(f"  Records: {len(base_records)}, Size: {base_size} bytes, MD5: {base_md5}")
            
            logger.info(f"\nMODIFIED FILE: {mod_filename}")
            logger.info(f"  Records: {len(mod_records)}, Size: {mod_size} bytes, MD5: {mod_md5}")
            
            logger.info("\n" + TEST_CASES)
            
            logger.info("\n" + "=" * 70)
            logger.info("COMPLETED SUCCESSFULLY!")
            logger.info("=" * 70)
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        ssh.close()
        logger.info("Connection closed.")


if __name__ == "__main__":
    main()
