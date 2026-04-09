#!/usr/bin/env python3
"""
Script to create two XML files for diff testing:
1. Base file (premium-world-check_diff_base.xml.gz)
2. Modified file (premium-world-check_diff_modified.xml.gz)

Requirements:
- 50+ base records with 2-3 values in each array field
- Various permutations of differences at attribute and data level
- One mega record with 100 values in each array field
- Differences in single attribute fields and array fields
"""

import paramiko
import hashlib
import os
import gzip
import tempfile
import logging
import random
import string
from datetime import datetime
from lxml import etree

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('diff_test_creation.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_USER = "sftp-test-user1"
SFTP_PASSWORD = "f@cctUser1"
SFTP_PORT = 22
SOURCE_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"

# Real World-Check Categories (from premium-world-check_8370_EU_PR_latest.xml.gz)
CATEGORIES = [
    "BANK", "CORPORATE", "COUNTRY", "CRIME - FINANCIAL", "CRIME - NARCOTICS",
    "CRIME - ORGANIZED", "CRIME - OTHER", "CRIME - TERROR", "CRIME - WAR",
    "DIPLOMAT", "EMBARGO", "INDIVIDUAL", "LEGAL", "MILITARY", "ORGANISATION",
    "POLITICAL INDIVIDUAL", "POLITICAL PARTY", "RELIGION", "TRADE UNION", "VESSEL"
]

# Real World-Check Sub-Categories
SUB_CATEGORIES = [
    "IOS", "PEP IO", "PEP IO-R", "PEP L", "PEP L-R", "PEP N", "PEP N-A",
    "PEP N-AE", "PEP N-R", "PEP NG", "PEP NG-R", "PEP RO", "PEP RO-R",
    "PEP SN", "PEP SN-A", "PEP SN-AE", "PEP SN-R", "SIE", "SOE N", "SOE SN"
]

E_I_VALUES = ["E", "F", "M", "U"]
UPDATE_CATEGORIES = ["C1", "C2", "C3", "C4", "C6"]

KEYWORDS = [
    "OFAC", "RUMID", "CANS", "TWBFT-SHTC", "IOMSO", "DFAT", "MFSANC", "JERSANC",
    "SEC", "UE", "KYSANC", "UKHMT", "UKSANC", "LGB", "EU", "DBB", "MINEFI",
    "CSSF", "UANSDC", "SICCFIN", "SECO", "JMOF", "USDOJ", "DFAT-AS", "HKMA",
    "CANSEMRUS", "ACB-SANC", "IRAQ.2", "SDGT", "NZ-MFAT-RUS", "FBI", "JPSIA",
    "KGFIU", "KOFIU", "BYKGB", "DFAT-UN", "UN", "PBC", "IMOD"
]

SPECIAL_INTEREST_CATEGORIES = [
    "Absconder or Fugitive", "Abuse of Office", "Aiding and Abetting",
    "Arms and Ammunition Trafficking", "Bribery and Corruption", "Cybercrime",
    "Explicit Sanctions", "Fraud", "Frozen and Seized Assets", "Human Trafficking",
    "Implicit Sanctions", "Insider Trading", "Money Laundering", "Narcotics Trafficking",
    "Organized Crime", "Sanctions Related", "Securities Violation", "Terror Related",
    "Theft and Embezzlement", "Violent Crime", "War Crime"
]

COUNTRIES = ["US", "UK", "DE", "FR", "IT", "ES", "JP", "CN", "IN", "BR", "CA", "AU", "RU", "KR", "MX"]
ID_TYPES = ["SSN", "NID", "TIN", "PASSPORT", "DL", "CURP", "CNP", "CI", "CC", "BIC"]


def generate_md5(file_path):
    md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5.update(chunk)
    return md5.hexdigest()


def random_string(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def random_date(start_year=1950, end_year=2000):
    year = random.randint(start_year, end_year)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return f"{year:04d}-{month:02d}-{day:02d}"


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
    record.set('entered', random_date(2020, 2024))
    record.set('updated', random_date(2024, 2026))
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


def create_base_records():
    """Create 50+ base records with 2-3 values in each array field"""
    records = []
    
    # Records 90001-90010: Will be DELETED in modified file
    for i in range(10):
        uid = 90001 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[i % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[i % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[i % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[i % len(UPDATE_CATEGORIES)],
            first_name=f"DELETE_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"DelAlias{i}_1", f"DelAlias{i}_2"],
            passports=[{'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"DEL{uid}PP1"}],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)]],
            countries=[f"Country_{i}_1", f"Country_{i}_2"],
            special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)]]
        ))
    
    # Records 90011-90020: Single attribute changes (category, sub_category, e_i, updatecategory)
    for i in range(10):
        uid = 90011 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[i % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[i % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[i % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[i % len(UPDATE_CATEGORIES)],
            first_name=f"ATTR_CHANGE_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"AttrAlias{i}_1", f"AttrAlias{i}_2", f"AttrAlias{i}_3"],
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"ATTR{uid}PP1"},
                {'country': COUNTRIES[(i+1) % len(COUNTRIES)], 'number': f"ATTR{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"ATTRID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"ATTRID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)], KEYWORDS[(i+2) % len(KEYWORDS)]],
            locations=[
                {'city': f'City{i}_1', 'country': 'US', 'state': f'State{i}_1', 'text': f'Location {i}_1'},
                {'city': f'City{i}_2', 'country': 'UK', 'state': f'State{i}_2', 'text': f'Location {i}_2'}
            ],
            companies=[f"Company{i}_1 Ltd", f"Company{i}_2 Inc"],
            citizenships=[f"Citizenship{i}_1", f"Citizenship{i}_2"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+1) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Records 90021-90030: Array field additions (new values added in modified)
    for i in range(10):
        uid = 90021 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[(i+5) % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[(i+5) % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[(i+1) % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[(i+1) % len(UPDATE_CATEGORIES)],
            first_name=f"ARRAY_ADD_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"AddAlias{i}_1"],  # Will have more added
            passports=[{'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"ADD{uid}PP1"}],  # Will have more added
            id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"ADDID{uid}_1", 'loc': 'US'}],
            keywords=[KEYWORDS[i % len(KEYWORDS)]],  # Will have more added
            locations=[{'city': f'AddCity{i}', 'country': 'US', 'state': f'AddState{i}', 'text': f'Add Location {i}'}],
            companies=[f"AddCompany{i} Ltd"],
            citizenships=[f"AddCitizenship{i}"],
            external_sources=[f"https://add{i}.example.com"],
            special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)]]
        ))
    
    # Records 90031-90040: Array field removals (values removed in modified)
    for i in range(10):
        uid = 90031 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[(i+10) % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[(i+10) % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[(i+2) % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[(i+2) % len(UPDATE_CATEGORIES)],
            first_name=f"ARRAY_REMOVE_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"RemAlias{i}_1", f"RemAlias{i}_2", f"RemAlias{i}_3"],  # Some will be removed
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"REM{uid}PP1"},
                {'country': COUNTRIES[(i+1) % len(COUNTRIES)], 'number': f"REM{uid}PP2"},
                {'country': COUNTRIES[(i+2) % len(COUNTRIES)], 'number': f"REM{uid}PP3"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"REMID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"REMID{uid}_2", 'loc': 'UK'},
                {'type': ID_TYPES[(i+2) % len(ID_TYPES)], 'value': f"REMID{uid}_3", 'loc': 'DE'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)], KEYWORDS[(i+2) % len(KEYWORDS)]],
            locations=[
                {'city': f'RemCity{i}_1', 'country': 'US', 'state': f'RemState{i}_1', 'text': f'Rem Location {i}_1'},
                {'city': f'RemCity{i}_2', 'country': 'UK', 'state': f'RemState{i}_2', 'text': f'Rem Location {i}_2'},
                {'city': f'RemCity{i}_3', 'country': 'DE', 'state': f'RemState{i}_3', 'text': f'Rem Location {i}_3'}
            ],
            companies=[f"RemCompany{i}_1 Ltd", f"RemCompany{i}_2 Inc", f"RemCompany{i}_3 Corp"],
            citizenships=[f"RemCitizenship{i}_1", f"RemCitizenship{i}_2", f"RemCitizenship{i}_3"],
            external_sources=[f"https://rem{i}_1.example.com", f"https://rem{i}_2.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+1) % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+2) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Records 90041-90050: Array field modifications (values changed in modified)
    for i in range(10):
        uid = 90041 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[(i+15) % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[(i+15) % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[(i+3) % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[(i+3) % len(UPDATE_CATEGORIES)],
            first_name=f"ARRAY_MODIFY_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"ModAlias{i}_ORIG_1", f"ModAlias{i}_ORIG_2"],
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"MOD{uid}PP_ORIG1"},
                {'country': COUNTRIES[(i+1) % len(COUNTRIES)], 'number': f"MOD{uid}PP_ORIG2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"MODID{uid}_ORIG1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"MODID{uid}_ORIG2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)]],
            locations=[
                {'city': f'ModCity{i}_ORIG1', 'country': 'US', 'state': f'ModState{i}_ORIG1', 'text': f'Mod Location ORIG {i}_1'},
                {'city': f'ModCity{i}_ORIG2', 'country': 'UK', 'state': f'ModState{i}_ORIG2', 'text': f'Mod Location ORIG {i}_2'}
            ],
            companies=[f"ModCompany{i}_ORIG1 Ltd", f"ModCompany{i}_ORIG2 Inc"],
            citizenships=[f"ModCitizenship{i}_ORIG1", f"ModCitizenship{i}_ORIG2"],
            external_sources=[f"https://mod{i}_orig1.example.com", f"https://mod{i}_orig2.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+1) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Records 90051-90055: UNCHANGED records
    for i in range(5):
        uid = 90051 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[i % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[i % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[i % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[i % len(UPDATE_CATEGORIES)],
            first_name=f"UNCHANGED_{i+1}",
            last_name="PERSON",
            dob="1980-01-15",
            aliases=[f"UnchAlias{i}_1", f"UnchAlias{i}_2"],
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"UNCH{uid}PP1"},
                {'country': COUNTRIES[(i+1) % len(COUNTRIES)], 'number': f"UNCH{uid}PP2"}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)]],
            special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)]]
        ))
    
    # Record 99999: MEGA record with 100 values in each array field
    logger.info("Creating mega record with uid=99999 and 100 values in arrays...")
    records.append(create_record(
        uid=99999,
        category="POLITICAL INDIVIDUAL",
        sub_category="PEP N",
        e_i="M",
        updatecategory="C1",
        first_name="MEGA_FIRST",
        last_name="MEGA_LAST",
        dob="1975-06-15",
        title="Dr.",
        position="Chief Executive",
        ssn="123-45-6789",
        age=50,
        place_of_birth="Mega City, Mega Country",
        further_info="This is a MEGA record with 100 values in all array fields.",
        aliases=[f"MegaAlias_{i}" for i in range(100)],
        low_quality_aliases=[f"MegaLQA_{i}" for i in range(100)],
        alt_spelling="MEGA ALTERNATIVE SPELLING",
        passports=[{'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"MEGAPP{i:03d}"} for i in range(100)],
        id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"MEGAID{i:03d}", 'loc': COUNTRIES[i % len(COUNTRIES)]} for i in range(100)],
        countries=[f"MegaCountry_{i}" for i in range(100)],
        keywords=[KEYWORDS[i % len(KEYWORDS)] for i in range(100)],
        locations=[{'city': f'MegaCity_{i}', 'country': COUNTRIES[i % len(COUNTRIES)], 'state': f'MegaState_{i}', 'text': f'Mega Location {i}'} for i in range(100)],
        companies=[f"MegaCompany_{i} LLC" for i in range(100)],
        citizenships=[f"MegaCitizenship_{i}" for i in range(100)],
        linked_uids=list(range(100001, 100101)),
        external_sources=[f"https://mega{i}.example.com" for i in range(100)],
        special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)] for i in range(100)]
    ))
    
    return records


def create_modified_records():
    """Create modified records with various differences"""
    records = []
    
    # Records 90001-90010: DELETED - not included in modified file
    
    # Records 90011-90020: Single attribute changes
    for i in range(10):
        uid = 90011 + i
        # Change different attributes for each record
        new_category = CATEGORIES[(i+5) % len(CATEGORIES)]  # Changed category
        new_sub_category = SUB_CATEGORIES[(i+5) % len(SUB_CATEGORIES)]  # Changed sub-category
        new_e_i = E_I_VALUES[(i+2) % len(E_I_VALUES)]  # Changed e_i
        new_updatecategory = UPDATE_CATEGORIES[(i+2) % len(UPDATE_CATEGORIES)]  # Changed updatecategory
        
        records.append(create_record(
            uid=uid,
            category=new_category,
            sub_category=new_sub_category,
            e_i=new_e_i,
            updatecategory=new_updatecategory,
            first_name=f"ATTR_CHANGE_{i+1}_MOD",  # Changed first_name
            last_name="PERSON_MOD",  # Changed last_name
            dob=random_date(),  # Changed dob
            aliases=[f"AttrAlias{i}_1", f"AttrAlias{i}_2", f"AttrAlias{i}_3"],  # Same
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"ATTR{uid}PP1"},
                {'country': COUNTRIES[(i+1) % len(COUNTRIES)], 'number': f"ATTR{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"ATTRID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"ATTRID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)], KEYWORDS[(i+2) % len(KEYWORDS)]],
            locations=[
                {'city': f'City{i}_1', 'country': 'US', 'state': f'State{i}_1', 'text': f'Location {i}_1'},
                {'city': f'City{i}_2', 'country': 'UK', 'state': f'State{i}_2', 'text': f'Location {i}_2'}
            ],
            companies=[f"Company{i}_1 Ltd", f"Company{i}_2 Inc"],
            citizenships=[f"Citizenship{i}_1", f"Citizenship{i}_2"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+1) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Records 90021-90030: Array field additions
    for i in range(10):
        uid = 90021 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[(i+5) % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[(i+5) % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[(i+1) % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[(i+1) % len(UPDATE_CATEGORIES)],
            first_name=f"ARRAY_ADD_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"AddAlias{i}_1", f"AddAlias{i}_NEW2", f"AddAlias{i}_NEW3"],  # Added 2 new
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"ADD{uid}PP1"},
                {'country': COUNTRIES[(i+3) % len(COUNTRIES)], 'number': f"ADD{uid}PP_NEW2"},
                {'country': COUNTRIES[(i+5) % len(COUNTRIES)], 'number': f"ADD{uid}PP_NEW3"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"ADDID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+3) % len(ID_TYPES)], 'value': f"ADDID{uid}_NEW2", 'loc': 'FR'},
                {'type': ID_TYPES[(i+5) % len(ID_TYPES)], 'value': f"ADDID{uid}_NEW3", 'loc': 'JP'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+5) % len(KEYWORDS)], KEYWORDS[(i+10) % len(KEYWORDS)]],
            locations=[
                {'city': f'AddCity{i}', 'country': 'US', 'state': f'AddState{i}', 'text': f'Add Location {i}'},
                {'city': f'AddCity{i}_NEW', 'country': 'FR', 'state': f'AddState{i}_NEW', 'text': f'Add Location NEW {i}'}
            ],
            companies=[f"AddCompany{i} Ltd", f"AddCompany{i}_NEW Inc"],
            citizenships=[f"AddCitizenship{i}", f"AddCitizenship{i}_NEW"],
            external_sources=[f"https://add{i}.example.com", f"https://add{i}_new.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+5) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Records 90031-90040: Array field removals
    for i in range(10):
        uid = 90031 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[(i+10) % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[(i+10) % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[(i+2) % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[(i+2) % len(UPDATE_CATEGORIES)],
            first_name=f"ARRAY_REMOVE_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"RemAlias{i}_1"],  # Removed 2
            passports=[{'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"REM{uid}PP1"}],  # Removed 2
            id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"REMID{uid}_1", 'loc': 'US'}],  # Removed 2
            keywords=[KEYWORDS[i % len(KEYWORDS)]],  # Removed 2
            locations=[{'city': f'RemCity{i}_1', 'country': 'US', 'state': f'RemState{i}_1', 'text': f'Rem Location {i}_1'}],  # Removed 2
            companies=[f"RemCompany{i}_1 Ltd"],  # Removed 2
            citizenships=[f"RemCitizenship{i}_1"],  # Removed 2
            external_sources=[f"https://rem{i}_1.example.com"],  # Removed 1
            special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)]]  # Removed 2
        ))
    
    # Records 90041-90050: Array field modifications
    for i in range(10):
        uid = 90041 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[(i+15) % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[(i+15) % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[(i+3) % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[(i+3) % len(UPDATE_CATEGORIES)],
            first_name=f"ARRAY_MODIFY_{i+1}",
            last_name="PERSON",
            dob=random_date(),
            aliases=[f"ModAlias{i}_CHANGED_1", f"ModAlias{i}_CHANGED_2"],  # Modified values
            passports=[
                {'country': COUNTRIES[(i+5) % len(COUNTRIES)], 'number': f"MOD{uid}PP_CHANGED1"},  # Modified
                {'country': COUNTRIES[(i+7) % len(COUNTRIES)], 'number': f"MOD{uid}PP_CHANGED2"}   # Modified
            ],
            id_numbers=[
                {'type': ID_TYPES[(i+3) % len(ID_TYPES)], 'value': f"MODID{uid}_CHANGED1", 'loc': 'FR'},  # Modified
                {'type': ID_TYPES[(i+5) % len(ID_TYPES)], 'value': f"MODID{uid}_CHANGED2", 'loc': 'JP'}   # Modified
            ],
            keywords=[KEYWORDS[(i+10) % len(KEYWORDS)], KEYWORDS[(i+15) % len(KEYWORDS)]],  # Modified
            locations=[
                {'city': f'ModCity{i}_CHANGED1', 'country': 'FR', 'state': f'ModState{i}_CHANGED1', 'text': f'Mod Location CHANGED {i}_1'},
                {'city': f'ModCity{i}_CHANGED2', 'country': 'JP', 'state': f'ModState{i}_CHANGED2', 'text': f'Mod Location CHANGED {i}_2'}
            ],
            companies=[f"ModCompany{i}_CHANGED1 Ltd", f"ModCompany{i}_CHANGED2 Inc"],
            citizenships=[f"ModCitizenship{i}_CHANGED1", f"ModCitizenship{i}_CHANGED2"],
            external_sources=[f"https://mod{i}_changed1.example.com", f"https://mod{i}_changed2.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[(i+5) % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+10) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Records 90051-90055: UNCHANGED records (same as base)
    for i in range(5):
        uid = 90051 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[i % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[i % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[i % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[i % len(UPDATE_CATEGORIES)],
            first_name=f"UNCHANGED_{i+1}",
            last_name="PERSON",
            dob="1980-01-15",
            aliases=[f"UnchAlias{i}_1", f"UnchAlias{i}_2"],
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"UNCH{uid}PP1"},
                {'country': COUNTRIES[(i+1) % len(COUNTRIES)], 'number': f"UNCH{uid}PP2"}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)]],
            special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)]]
        ))
    
    # NEW Records 90056-90065: Added in modified file only
    for i in range(10):
        uid = 90056 + i
        records.append(create_record(
            uid=uid,
            category=CATEGORIES[(i+3) % len(CATEGORIES)],
            sub_category=SUB_CATEGORIES[(i+3) % len(SUB_CATEGORIES)],
            e_i=E_I_VALUES[i % len(E_I_VALUES)],
            updatecategory=UPDATE_CATEGORIES[i % len(UPDATE_CATEGORIES)],
            first_name=f"NEW_RECORD_{i+1}",
            last_name="ADDED",
            dob=random_date(),
            aliases=[f"NewAlias{i}_1", f"NewAlias{i}_2"],
            passports=[
                {'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"NEW{uid}PP1"},
                {'country': COUNTRIES[(i+2) % len(COUNTRIES)], 'number': f"NEW{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"NEWID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+2) % len(ID_TYPES)], 'value': f"NEWID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+3) % len(KEYWORDS)]],
            locations=[
                {'city': f'NewCity{i}_1', 'country': 'US', 'state': f'NewState{i}_1', 'text': f'New Location {i}_1'},
                {'city': f'NewCity{i}_2', 'country': 'UK', 'state': f'NewState{i}_2', 'text': f'New Location {i}_2'}
            ],
            companies=[f"NewCompany{i}_1 Ltd", f"NewCompany{i}_2 Inc"],
            citizenships=[f"NewCitizenship{i}_1", f"NewCitizenship{i}_2"],
            external_sources=[f"https://new{i}_1.example.com", f"https://new{i}_2.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+3) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Record 99999: MEGA record with modifications
    logger.info("Creating modified mega record with uid=99999...")
    records.append(create_record(
        uid=99999,
        category="INDIVIDUAL",  # Changed from POLITICAL INDIVIDUAL
        sub_category="SIE",  # Changed from PEP N
        e_i="F",  # Changed from M
        updatecategory="C2",  # Changed from C1
        first_name="MEGA_FIRST_MODIFIED",  # Changed
        last_name="MEGA_LAST_MODIFIED",  # Changed
        dob="1975-08-20",  # Changed
        title="Prof.",  # Changed
        position="Chairman",  # Changed
        ssn="987-65-4321",  # Changed
        age=51,  # Changed
        place_of_birth="Modified City, Modified Country",  # Changed
        further_info="This is a MODIFIED MEGA record with changes in array fields.",  # Changed
        aliases=[f"MegaAlias_{i}" for i in range(50)] + [f"MegaAlias_NEW_{i}" for i in range(50)],  # 50 same, 50 new
        low_quality_aliases=[f"MegaLQA_{i}" for i in range(50)] + [f"MegaLQA_NEW_{i}" for i in range(50)],
        alt_spelling="MEGA ALTERNATIVE SPELLING MODIFIED",  # Changed
        passports=[{'country': COUNTRIES[i % len(COUNTRIES)], 'number': f"MEGAPP{i:03d}"} for i in range(50)] + 
                  [{'country': COUNTRIES[(i+5) % len(COUNTRIES)], 'number': f"MEGAPP_NEW{i:03d}"} for i in range(50)],
        id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"MEGAID{i:03d}", 'loc': COUNTRIES[i % len(COUNTRIES)]} for i in range(50)] +
                   [{'type': ID_TYPES[(i+3) % len(ID_TYPES)], 'value': f"MEGAID_NEW{i:03d}", 'loc': COUNTRIES[(i+5) % len(COUNTRIES)]} for i in range(50)],
        countries=[f"MegaCountry_{i}" for i in range(50)] + [f"MegaCountry_NEW_{i}" for i in range(50)],
        keywords=[KEYWORDS[i % len(KEYWORDS)] for i in range(50)] + [KEYWORDS[(i+20) % len(KEYWORDS)] for i in range(50)],
        locations=[{'city': f'MegaCity_{i}', 'country': COUNTRIES[i % len(COUNTRIES)], 'state': f'MegaState_{i}', 'text': f'Mega Location {i}'} for i in range(50)] +
                  [{'city': f'MegaCity_NEW_{i}', 'country': COUNTRIES[(i+5) % len(COUNTRIES)], 'state': f'MegaState_NEW_{i}', 'text': f'Mega Location NEW {i}'} for i in range(50)],
        companies=[f"MegaCompany_{i} LLC" for i in range(50)] + [f"MegaCompany_NEW_{i} Corp" for i in range(50)],
        citizenships=[f"MegaCitizenship_{i}" for i in range(50)] + [f"MegaCitizenship_NEW_{i}" for i in range(50)],
        linked_uids=list(range(100001, 100051)) + list(range(200001, 200051)),  # 50 same, 50 new
        external_sources=[f"https://mega{i}.example.com" for i in range(50)] + [f"https://mega_new{i}.example.com" for i in range(50)],
        special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)] for i in range(50)] +
                              [SPECIAL_INTEREST_CATEGORIES[(i+10) % len(SPECIAL_INTEREST_CATEGORIES)] for i in range(50)]
    ))
    
    return records
