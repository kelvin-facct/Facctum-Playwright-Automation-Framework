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

COUNTRIES_CODE = ["US", "UK", "DE", "FR", "IT", "ES", "JP", "CN", "IN", "BR", "CA", "AU", "RU", "KR", "MX"]
ID_TYPES = ["SSN", "NID", "TIN", "PASSPORT", "DL", "CURP", "CNP", "CI", "CC", "BIC"]


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
            passports=[
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"DEL{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+1) % len(COUNTRIES_CODE)], 'number': f"DEL{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"DELID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"DELID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)]],
            countries=[f"Country_{i}_1", f"Country_{i}_2"],
            locations=[
                {'city': f'DelCity{i}_1', 'country': 'US', 'state': f'DelState{i}_1', 'text': f'Del Location {i}_1'},
                {'city': f'DelCity{i}_2', 'country': 'UK', 'state': f'DelState{i}_2', 'text': f'Del Location {i}_2'}
            ],
            companies=[f"DelCompany{i}_1 Ltd", f"DelCompany{i}_2 Inc"],
            citizenships=[f"DelCitizenship{i}_1", f"DelCitizenship{i}_2"],
            external_sources=[f"https://del{i}_1.example.com", f"https://del{i}_2.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+1) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
        ))
    
    # Records 90011-90020: Single attribute changes (category, sub_category, e_i, updatecategory, dob, name)
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
            dob="1970-05-15",
            title="Mr.",
            position=f"Position_{i}",
            aliases=[f"AttrAlias{i}_1", f"AttrAlias{i}_2", f"AttrAlias{i}_3"],
            passports=[
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"ATTR{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+1) % len(COUNTRIES_CODE)], 'number': f"ATTR{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"ATTRID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"ATTRID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)], KEYWORDS[(i+2) % len(KEYWORDS)]],
            locations=[
                {'city': f'AttrCity{i}_1', 'country': 'US', 'state': f'AttrState{i}_1', 'text': f'Attr Location {i}_1'},
                {'city': f'AttrCity{i}_2', 'country': 'UK', 'state': f'AttrState{i}_2', 'text': f'Attr Location {i}_2'}
            ],
            companies=[f"AttrCompany{i}_1 Ltd", f"AttrCompany{i}_2 Inc"],
            citizenships=[f"AttrCitizenship{i}_1", f"AttrCitizenship{i}_2"],
            external_sources=[f"https://attr{i}_1.example.com", f"https://attr{i}_2.example.com"],
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
            aliases=[f"AddAlias{i}_1"],
            passports=[{'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"ADD{uid}PP1"}],
            id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"ADDID{uid}_1", 'loc': 'US'}],
            keywords=[KEYWORDS[i % len(KEYWORDS)]],
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
            aliases=[f"RemAlias{i}_1", f"RemAlias{i}_2", f"RemAlias{i}_3"],
            passports=[
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"REM{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+1) % len(COUNTRIES_CODE)], 'number': f"REM{uid}PP2"},
                {'country': COUNTRIES_CODE[(i+2) % len(COUNTRIES_CODE)], 'number': f"REM{uid}PP3"}
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
            external_sources=[f"https://rem{i}_1.example.com", f"https://rem{i}_2.example.com", f"https://rem{i}_3.example.com"],
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
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"MOD{uid}PP_ORIG1"},
                {'country': COUNTRIES_CODE[(i+1) % len(COUNTRIES_CODE)], 'number': f"MOD{uid}PP_ORIG2"}
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
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"UNCH{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+1) % len(COUNTRIES_CODE)], 'number': f"UNCH{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"UNCHID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"UNCHID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)]],
            locations=[
                {'city': f'UnchCity{i}_1', 'country': 'US', 'state': f'UnchState{i}_1', 'text': f'Unch Location {i}_1'},
                {'city': f'UnchCity{i}_2', 'country': 'UK', 'state': f'UnchState{i}_2', 'text': f'Unch Location {i}_2'}
            ],
            companies=[f"UnchCompany{i}_1 Ltd", f"UnchCompany{i}_2 Inc"],
            citizenships=[f"UnchCitizenship{i}_1", f"UnchCitizenship{i}_2"],
            external_sources=[f"https://unch{i}_1.example.com", f"https://unch{i}_2.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+1) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
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
        passports=[{'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"MEGAPP{i:03d}"} for i in range(100)],
        id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"MEGAID{i:03d}", 'loc': COUNTRIES_CODE[i % len(COUNTRIES_CODE)]} for i in range(100)],
        countries=[f"MegaCountry_{i}" for i in range(100)],
        keywords=[KEYWORDS[i % len(KEYWORDS)] for i in range(100)],
        locations=[{'city': f'MegaCity_{i}', 'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'state': f'MegaState_{i}', 'text': f'Mega Location {i}'} for i in range(100)],
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
        # Change different single attributes for each record
        new_category = CATEGORIES[(i+5) % len(CATEGORIES)]
        new_sub_category = SUB_CATEGORIES[(i+5) % len(SUB_CATEGORIES)]
        new_e_i = E_I_VALUES[(i+2) % len(E_I_VALUES)]
        new_updatecategory = UPDATE_CATEGORIES[(i+2) % len(UPDATE_CATEGORIES)]
        
        records.append(create_record(
            uid=uid,
            category=new_category,  # Changed
            sub_category=new_sub_category,  # Changed
            e_i=new_e_i,  # Changed
            updatecategory=new_updatecategory,  # Changed
            first_name=f"ATTR_CHANGE_{i+1}_MOD",  # Changed
            last_name="PERSON_MOD",  # Changed
            dob="1985-10-20",  # Changed
            title="Dr.",  # Changed
            position=f"Position_{i}_MOD",  # Changed
            # Array fields remain the same
            aliases=[f"AttrAlias{i}_1", f"AttrAlias{i}_2", f"AttrAlias{i}_3"],
            passports=[
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"ATTR{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+1) % len(COUNTRIES_CODE)], 'number': f"ATTR{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"ATTRID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"ATTRID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)], KEYWORDS[(i+2) % len(KEYWORDS)]],
            locations=[
                {'city': f'AttrCity{i}_1', 'country': 'US', 'state': f'AttrState{i}_1', 'text': f'Attr Location {i}_1'},
                {'city': f'AttrCity{i}_2', 'country': 'UK', 'state': f'AttrState{i}_2', 'text': f'Attr Location {i}_2'}
            ],
            companies=[f"AttrCompany{i}_1 Ltd", f"AttrCompany{i}_2 Inc"],
            citizenships=[f"AttrCitizenship{i}_1", f"AttrCitizenship{i}_2"],
            external_sources=[f"https://attr{i}_1.example.com", f"https://attr{i}_2.example.com"],
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
            # Added new values to arrays
            aliases=[f"AddAlias{i}_1", f"AddAlias{i}_NEW2", f"AddAlias{i}_NEW3"],
            passports=[
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"ADD{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+3) % len(COUNTRIES_CODE)], 'number': f"ADD{uid}PP_NEW2"},
                {'country': COUNTRIES_CODE[(i+5) % len(COUNTRIES_CODE)], 'number': f"ADD{uid}PP_NEW3"}
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
            # Removed values from arrays (keeping only first)
            aliases=[f"RemAlias{i}_1"],
            passports=[{'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"REM{uid}PP1"}],
            id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"REMID{uid}_1", 'loc': 'US'}],
            keywords=[KEYWORDS[i % len(KEYWORDS)]],
            locations=[{'city': f'RemCity{i}_1', 'country': 'US', 'state': f'RemState{i}_1', 'text': f'Rem Location {i}_1'}],
            companies=[f"RemCompany{i}_1 Ltd"],
            citizenships=[f"RemCitizenship{i}_1"],
            external_sources=[f"https://rem{i}_1.example.com"],
            special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)]]
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
            # Modified values in arrays
            aliases=[f"ModAlias{i}_CHANGED_1", f"ModAlias{i}_CHANGED_2"],
            passports=[
                {'country': COUNTRIES_CODE[(i+5) % len(COUNTRIES_CODE)], 'number': f"MOD{uid}PP_CHANGED1"},
                {'country': COUNTRIES_CODE[(i+7) % len(COUNTRIES_CODE)], 'number': f"MOD{uid}PP_CHANGED2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[(i+3) % len(ID_TYPES)], 'value': f"MODID{uid}_CHANGED1", 'loc': 'FR'},
                {'type': ID_TYPES[(i+5) % len(ID_TYPES)], 'value': f"MODID{uid}_CHANGED2", 'loc': 'JP'}
            ],
            keywords=[KEYWORDS[(i+10) % len(KEYWORDS)], KEYWORDS[(i+15) % len(KEYWORDS)]],
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
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"UNCH{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+1) % len(COUNTRIES_CODE)], 'number': f"UNCH{uid}PP2"}
            ],
            id_numbers=[
                {'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"UNCHID{uid}_1", 'loc': 'US'},
                {'type': ID_TYPES[(i+1) % len(ID_TYPES)], 'value': f"UNCHID{uid}_2", 'loc': 'UK'}
            ],
            keywords=[KEYWORDS[i % len(KEYWORDS)], KEYWORDS[(i+1) % len(KEYWORDS)]],
            locations=[
                {'city': f'UnchCity{i}_1', 'country': 'US', 'state': f'UnchState{i}_1', 'text': f'Unch Location {i}_1'},
                {'city': f'UnchCity{i}_2', 'country': 'UK', 'state': f'UnchState{i}_2', 'text': f'Unch Location {i}_2'}
            ],
            companies=[f"UnchCompany{i}_1 Ltd", f"UnchCompany{i}_2 Inc"],
            citizenships=[f"UnchCitizenship{i}_1", f"UnchCitizenship{i}_2"],
            external_sources=[f"https://unch{i}_1.example.com", f"https://unch{i}_2.example.com"],
            special_interest_cats=[
                SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)],
                SPECIAL_INTEREST_CATEGORIES[(i+1) % len(SPECIAL_INTEREST_CATEGORIES)]
            ]
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
                {'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"NEW{uid}PP1"},
                {'country': COUNTRIES_CODE[(i+2) % len(COUNTRIES_CODE)], 'number': f"NEW{uid}PP2"}
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
        category="INDIVIDUAL",  # Changed
        sub_category="SIE",  # Changed
        e_i="F",  # Changed
        updatecategory="C2",  # Changed
        first_name="MEGA_FIRST_MODIFIED",  # Changed
        last_name="MEGA_LAST_MODIFIED",  # Changed
        dob="1975-08-20",  # Changed
        title="Prof.",  # Changed
        position="Chairman",  # Changed
        ssn="987-65-4321",  # Changed
        age=51,  # Changed
        place_of_birth="Modified City, Modified Country",  # Changed
        further_info="This is a MODIFIED MEGA record with changes.",  # Changed
        # 50 same + 50 new aliases
        aliases=[f"MegaAlias_{i}" for i in range(50)] + [f"MegaAlias_NEW_{i}" for i in range(50)],
        low_quality_aliases=[f"MegaLQA_{i}" for i in range(50)] + [f"MegaLQA_NEW_{i}" for i in range(50)],
        alt_spelling="MEGA ALTERNATIVE SPELLING MODIFIED",
        passports=[{'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'number': f"MEGAPP{i:03d}"} for i in range(50)] + 
                  [{'country': COUNTRIES_CODE[(i+5) % len(COUNTRIES_CODE)], 'number': f"MEGAPP_NEW{i:03d}"} for i in range(50)],
        id_numbers=[{'type': ID_TYPES[i % len(ID_TYPES)], 'value': f"MEGAID{i:03d}", 'loc': COUNTRIES_CODE[i % len(COUNTRIES_CODE)]} for i in range(50)] +
                   [{'type': ID_TYPES[(i+3) % len(ID_TYPES)], 'value': f"MEGAID_NEW{i:03d}", 'loc': COUNTRIES_CODE[(i+5) % len(COUNTRIES_CODE)]} for i in range(50)],
        countries=[f"MegaCountry_{i}" for i in range(50)] + [f"MegaCountry_NEW_{i}" for i in range(50)],
        keywords=[KEYWORDS[i % len(KEYWORDS)] for i in range(50)] + [KEYWORDS[(i+20) % len(KEYWORDS)] for i in range(50)],
        locations=[{'city': f'MegaCity_{i}', 'country': COUNTRIES_CODE[i % len(COUNTRIES_CODE)], 'state': f'MegaState_{i}', 'text': f'Mega Location {i}'} for i in range(50)] +
                  [{'city': f'MegaCity_NEW_{i}', 'country': COUNTRIES_CODE[(i+5) % len(COUNTRIES_CODE)], 'state': f'MegaState_NEW_{i}', 'text': f'Mega Location NEW {i}'} for i in range(50)],
        companies=[f"MegaCompany_{i} LLC" for i in range(50)] + [f"MegaCompany_NEW_{i} Corp" for i in range(50)],
        citizenships=[f"MegaCitizenship_{i}" for i in range(50)] + [f"MegaCitizenship_NEW_{i}" for i in range(50)],
        linked_uids=list(range(100001, 100051)) + list(range(200001, 200051)),
        external_sources=[f"https://mega{i}.example.com" for i in range(50)] + [f"https://mega_new{i}.example.com" for i in range(50)],
        special_interest_cats=[SPECIAL_INTEREST_CATEGORIES[i % len(SPECIAL_INTEREST_CATEGORIES)] for i in range(50)] +
                              [SPECIAL_INTEREST_CATEGORIES[(i+10) % len(SPECIAL_INTEREST_CATEGORIES)] for i in range(50)]
    ))
    
    return records


def build_xml(records):
    """Build complete XML document from records"""
    root = etree.Element('records')
    for record in records:
        root.append(record)
    return root


def main():
    logger.info("=" * 60)
    logger.info("CREATING DIFF TEST FILES (V2)")
    logger.info("=" * 60)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        logger.info(f"Connecting to {SFTP_HOST}...")
        ssh.connect(SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = ssh.open_sftp()
        logger.info("Connected!")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            
            # ============ CREATE BASE FILE ============
            logger.info("\n--- CREATING BASE FILE ---")
            
            base_records = create_base_records()
            logger.info(f"Created {len(base_records)} base records")
            
            base_root = build_xml(base_records)
            base_xml = etree.tostring(base_root, encoding='utf-8', xml_declaration=True, pretty_print=True)
            logger.info(f"Base XML size: {len(base_xml)} bytes")
            
            base_filename = "premium-world-check_diff_base.xml.gz"
            base_path = os.path.join(tmpdir, base_filename)
            with gzip.open(base_path, 'wb') as f:
                f.write(base_xml)
            
            base_size = os.path.getsize(base_path)
            base_md5 = generate_md5(base_path)
            logger.info(f"Base file compressed: {base_size} bytes, MD5: {base_md5}")
            
            # Create MD5 file for base
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
            
            mod_filename = "premium-world-check_diff_modified.xml.gz"
            mod_path = os.path.join(tmpdir, mod_filename)
            with gzip.open(mod_path, 'wb') as f:
                f.write(mod_xml)
            
            mod_size = os.path.getsize(mod_path)
            mod_md5 = generate_md5(mod_path)
            logger.info(f"Modified file compressed: {mod_size} bytes, MD5: {mod_md5}")
            
            # Create MD5 file for modified
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
            logger.info("\n" + "=" * 60)
            logger.info("DIFF TEST FILES SUMMARY")
            logger.info("=" * 60)
            
            logger.info("\nBASE FILE:")
            logger.info(f"  Filename: {base_filename}")
            logger.info(f"  Records: {len(base_records)}")
            logger.info(f"  Size: {base_size} bytes")
            logger.info(f"  MD5: {base_md5}")
            
            logger.info("\nMODIFIED FILE:")
            logger.info(f"  Filename: {mod_filename}")
            logger.info(f"  Records: {len(mod_records)}")
            logger.info(f"  Size: {mod_size} bytes")
            logger.info(f"  MD5: {mod_md5}")
            
            logger.info("\nDIFFERENCES SUMMARY:")
            logger.info("  BASE FILE RECORDS:")
            logger.info("    - 90001-90010 (10 records): Will be DELETED in modified")
            logger.info("    - 90011-90020 (10 records): Single attribute changes")
            logger.info("    - 90021-90030 (10 records): Array fields will have ADDITIONS")
            logger.info("    - 90031-90040 (10 records): Array fields will have REMOVALS")
            logger.info("    - 90041-90050 (10 records): Array fields will be MODIFIED")
            logger.info("    - 90051-90055 (5 records): UNCHANGED")
            logger.info("    - 99999 (1 record): MEGA record with 100 values in each array")
            logger.info("  MODIFIED FILE RECORDS:")
            logger.info("    - 90001-90010: DELETED (not present)")
            logger.info("    - 90011-90020: category, sub-category, e-i, updatecategory, name, dob CHANGED")
            logger.info("    - 90021-90030: Array fields have NEW values ADDED")
            logger.info("    - 90031-90040: Array fields have values REMOVED")
            logger.info("    - 90041-90050: Array field values MODIFIED")
            logger.info("    - 90051-90055: UNCHANGED")
            logger.info("    - 90056-90065 (10 records): NEW records ADDED")
            logger.info("    - 99999: MEGA record with attribute changes + 50 same/50 new array values")
            
            logger.info("\n" + "=" * 60)
            logger.info("COMPLETED SUCCESSFULLY!")
            logger.info("=" * 60)
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        ssh.close()
        logger.info("Connection closed.")


if __name__ == "__main__":
    main()
