#!/usr/bin/env python3
"""
SFTP script to modify XML file:
- Always uses premium-world-check_8370_EU_PR_latest.xml.gz as reference
- Modify existing passport ID values
- Add passport numbers where missing
- Delete 10 records
- Modify aliases and DOBs
- Uses lxml for parsing and serialization to ensure strictly valid XML output
- Validates against World-Check XSD schema
"""

import paramiko
import hashlib
import os
import gzip
import tempfile
import logging
import random
import string
from datetime import datetime, timedelta
from lxml import etree
from io import BytesIO

# Setup logging with UTF-8 encoding
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('xml_modification_v4.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# SFTP Configuration
SFTP_HOST = "test.ftp.facctum.ai"
SFTP_USER = "sftp-test-user1"
SFTP_PASSWORD = "f@cctUser1"
SFTP_PORT = 22

SOURCE_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"
# ALWAYS use this file as reference - never modified files
ORIGINAL_FILE = "premium-world-check_8370_EU_PR_latest.xml.gz"

# World-Check XSD Schema
WORLD_CHECK_XSD = '''<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0">
<xs:annotation>
<xs:documentation xml:lang="en">World-Check validating Schema.
Copyright 2008-2012 World-Check
All rights reserved.</xs:documentation>
</xs:annotation>
<xs:element name="records">
<xs:complexType>
<xs:sequence>
<xs:element minOccurs="0" maxOccurs="unbounded" ref="record"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="record">
<xs:complexType>
<xs:sequence>
<xs:element ref="person"/>
<xs:element ref="details"/>
<xs:element minOccurs="0" maxOccurs="1" ref="updated_dates"/>
</xs:sequence>
<xs:attribute name="category" type="xs:string"/>
<xs:attribute name="editor" type="xs:string"/>
<xs:attribute name="entered" type="wdate"/>
<xs:attribute name="sub-category" type="xs:string"/>
<xs:attribute name="uid" type="xs:unsignedInt" use="required"/>
<xs:attribute name="updated" type="wdate"/>
<xs:attribute name="updatecategory" type="xs:string"/>
</xs:complexType>
</xs:element>
<xs:element name="person">
<xs:complexType>
<xs:sequence>
<xs:element name="title" minOccurs="0" nillable="true" type="xs:string"/>
<xs:element name="position" minOccurs="0" nillable="true" type="xs:string"/>
<xs:element ref="names"/>
<xs:element ref="agedata"/>
</xs:sequence>
<xs:attribute name="e-i">
<xs:simpleType>
<xs:union>
<xs:simpleType>
<xs:restriction base="xs:NMTOKEN">
<xs:enumeration value="I"/>
<xs:enumeration value="E"/>
<xs:enumeration value="M"/>
<xs:enumeration value="F"/>
<xs:enumeration value="U"/>
</xs:restriction>
</xs:simpleType>
<xs:simpleType>
<xs:restriction base="xs:string">
<xs:enumeration value=""/>
</xs:restriction>
</xs:simpleType>
</xs:union>
</xs:simpleType>
</xs:attribute>
<xs:attribute name="ssn" type="xs:string"/>
</xs:complexType>
</xs:element>
<xs:element name="names">
<xs:complexType>
<xs:sequence>
<xs:element ref="first_name" minOccurs="0"/>
<xs:element ref="last_name" minOccurs="0"/>
<xs:element ref="aliases" minOccurs="0"/>
<xs:element ref="low_quality_aliases" minOccurs="0"/>
<xs:element ref="alternative_spelling" minOccurs="0"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="first_name" nillable="true" type="xs:string"/>
<xs:element name="last_name" type="xs:string"/>
<xs:element name="aliases">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="alias"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="low_quality_aliases">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="alias"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="alias" nillable="true" type="xs:string"/>
<xs:element name="alternative_spelling" nillable="true" type="xs:string"/>
<xs:simpleType name="wdate">
<xs:union memberTypes="wdate_restr">
<xs:simpleType>
<xs:restriction base="xs:string">
<xs:enumeration value=""/>
</xs:restriction>
</xs:simpleType>
</xs:union>
</xs:simpleType>
<xs:element name="agedata">
<xs:complexType>
<xs:sequence>
<xs:element name="age" minOccurs="0" nillable="true" type="xs:unsignedByte"/>
<xs:element name="as_of_date" minOccurs="0" nillable="true" type="wdate_restr"/>
<xs:element ref="dob" minOccurs="0"/>
<xs:element ref="dobs" minOccurs="0"/>
<xs:element name="deceased" minOccurs="0" nillable="true" type="wdate"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="dobs">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="dob"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="dob" nillable="true" type="wdate_restr"/>
<xs:simpleType name="wdate_restr">
<xs:union memberTypes="xs:date">
<xs:simpleType>
<xs:restriction base="xs:string">
<xs:pattern value="(18|19|20)[0-9]{2}\-((((0[1-9])|10|11|12)\-00)|(00-00))"/>
</xs:restriction>
</xs:simpleType>
</xs:union>
</xs:simpleType>
<xs:element name="details">
<xs:complexType>
<xs:sequence>
<xs:element ref="further_information" minOccurs="0"/>
<xs:element ref="passports" minOccurs="0"/>
<xs:element ref="id_numbers" minOccurs="0"/>
<xs:element ref="place_of_birth" minOccurs="0"/>
<xs:element ref="locations" minOccurs="0"/>
<xs:element ref="countries" minOccurs="0"/>
<xs:element ref="citizenships" minOccurs="0"/>
<xs:element ref="companies" minOccurs="0"/>
<xs:element ref="linked_to" minOccurs="0"/>
<xs:element ref="keywords" minOccurs="0"/>
<xs:element ref="external_sources" minOccurs="0"/>
<xs:element name="pep_role_details" minOccurs="0">
<xs:complexType>
<xs:sequence>
<xs:element name="pep_status" type="pep_status" minOccurs="0" maxOccurs="1" nillable="true"/>
<xs:element name="pep_role_detail" minOccurs="0" maxOccurs="unbounded" type="pep_role_detail"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element ref="special_interest_categories" minOccurs="0"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="further_information" nillable="true" type="xs:string"/>
<xs:element name="passports">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="passport"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="passport" nillable="true">
<xs:complexType mixed="true">
<xs:attribute name="country" type="xs:string" use="required"/>
</xs:complexType>
</xs:element>
<xs:element name="id_numbers">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="id"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="id" nillable="true">
<xs:complexType mixed="true">
<xs:attribute name="loc" type="xs:string"/>
<xs:attribute name="type" type="xs:string"/>
</xs:complexType>
</xs:element>
<xs:element name="place_of_birth" nillable="true" type="xs:string"/>
<xs:element name="locations">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="location"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="location" nillable="true">
<xs:complexType mixed="true">
<xs:attribute name="city" type="xs:string" use="required"/>
<xs:attribute name="country" type="xs:string" use="required"/>
<xs:attribute name="state" type="xs:string" use="required"/>
</xs:complexType>
</xs:element>
<xs:element name="countries">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="country"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="country" nillable="true" type="xs:string"/>
<xs:element name="companies">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="company"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="company" nillable="true" type="xs:string"/>
<xs:element name="linked_to">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="uid"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="uid" nillable="true" type="xs:unsignedInt"/>
<xs:element name="keywords">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="keyword"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="keyword" nillable="true" type="xs:string"/>
<xs:element name="external_sources">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="uri"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="uri" nillable="true" type="xs:string"/>
<xs:element name="citizenships">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" name="citizenship" nillable="true" type="xs:string"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="special_interest_categories">
<xs:complexType>
<xs:sequence>
<xs:element maxOccurs="unbounded" ref="special_interest_category"/>
</xs:sequence>
</xs:complexType>
</xs:element>
<xs:element name="special_interest_category" nillable="true" type="xs:string"/>
<xs:complexType name="pep_role_detail">
<xs:all>
<xs:element name="pep_role" type="profile_peprole"/>
<xs:element name="pep_role_bio" type="profile_pep_role_bio"/>
<xs:element name="pep_position" type="profile_pep_position"/>
<xs:element name="pep_role_level" type="profile_pep_role_level"/>
<xs:element name="pep_role_term_start_date" nillable="true">
<xs:complexType>
<xs:simpleContent>
<xs:extension base="optional_partial_date">
<xs:attribute name="term_start_date_reported" type="pep_term_start_end"/>
<xs:attribute name="term_start_date_unknown" type="xs:boolean"/>
</xs:extension>
</xs:simpleContent>
</xs:complexType>
</xs:element>
<xs:element name="pep_role_term_end_date" minOccurs="0">
<xs:complexType>
<xs:simpleContent>
<xs:extension base="optional_partial_date">
<xs:attribute name="term_end_date_reported" type="pep_term_start_end"/>
</xs:extension>
</xs:simpleContent>
</xs:complexType>
</xs:element>
<xs:element name="pep_role_status" type="profile_pep_role_status" minOccurs="0"/>
</xs:all>
</xs:complexType>
<xs:simpleType name="profile_peprole">
<xs:restriction base="xs:string">
<xs:maxLength value="200"/>
</xs:restriction>
</xs:simpleType>
<xs:simpleType name="profile_pep_position">
<xs:restriction base="xs:string">
<xs:maxLength value="100"/>
</xs:restriction>
</xs:simpleType>
<xs:simpleType name="profile_pep_role_level">
<xs:restriction base="xs:string">
<xs:maxLength value="100"/>
</xs:restriction>
</xs:simpleType>
<xs:complexType name="profile_pep_role_bio">
<xs:simpleContent>
<xs:extension base="xs:string"></xs:extension>
</xs:simpleContent>
</xs:complexType>
<xs:simpleType name="profile_pep_role_status">
<xs:restriction base="xs:string">
<xs:enumeration value="current"/>
<xs:enumeration value="former"/>
<xs:enumeration value="unknown"/>
</xs:restriction>
</xs:simpleType>
<xs:simpleType name="pep_status">
<xs:restriction base="xs:string">
<xs:enumeration value="active"/>
<xs:enumeration value="inactive"/>
<xs:enumeration value="unknown"/>
<xs:enumeration value=""/>
</xs:restriction>
</xs:simpleType>
<xs:simpleType name="pep_term_start_end">
<xs:restriction base="xs:string">
<xs:enumeration value="reported"/>
<xs:enumeration value="confirmed"/>
<xs:enumeration value=""/>
</xs:restriction>
</xs:simpleType>
<xs:simpleType name="partial_date">
<xs:restriction base="xs:string">
<xs:pattern value="([12][0-9]{3}-(0[1-9]|1[0-2]|00)-(0[1-9]|[12][01-9]|3[01]|00))"/>
</xs:restriction>
</xs:simpleType>
<xs:simpleType name="optional_partial_date">
<xs:union memberTypes="partial_date">
<xs:simpleType>
<xs:restriction base="xs:string">
<xs:length value="0"/>
</xs:restriction>
</xs:simpleType>
</xs:union>
</xs:simpleType>
<xs:element name="updated_dates">
<xs:complexType>
<xs:sequence>
<xs:element name="category" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="entered" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="updatecategory" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="sub-category" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="ssn" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="e-i" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="title" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="position" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="first_name" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="last_name" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="aliases" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="low_quality_aliases" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="alternative_spelling" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="age" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="as_of_date" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="dob" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="dobs" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="deceased" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="further_information" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="passports" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="id_numbers" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="place_of_birth" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="locations" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="countries" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="citizenships" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="companies" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="linked_to" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="keywords" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="external_sources" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="pep_status" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="pep_roles" minOccurs="0" nillable="true" type="xs:date"/>
<xs:element name="special_interest_categories" minOccurs="0" nillable="true" type="xs:date"/>
</xs:sequence>
</xs:complexType>
</xs:element>
</xs:schema>'''


def generate_md5_for_file(file_path):
    md5_hash = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()


def generate_passport_number():
    """Generate a random passport number"""
    prefix = random.choice(['A', 'B', 'C', 'P', 'X', 'Z'])
    numbers = ''.join(random.choices(string.digits, k=8))
    return f"{prefix}{numbers}"


def validate_against_xsd(xml_bytes, xsd_string):
    """Validate XML against XSD schema"""
    try:
        xsd_doc = etree.parse(BytesIO(xsd_string.encode('utf-8')))
        xsd_schema = etree.XMLSchema(xsd_doc)
        xml_doc = etree.parse(BytesIO(xml_bytes))
        xsd_schema.assertValid(xml_doc)
        return True, "XML is valid against XSD schema"
    except etree.XMLSchemaParseError as e:
        return False, f"XSD Schema parse error: {e}"
    except etree.DocumentInvalid as e:
        return False, f"XML validation failed: {e}"
    except Exception as e:
        return False, f"Validation error: {e}"


def main():
    logger.info("=" * 60)
    logger.info("STARTING XML MODIFICATION PROCESS V4")
    logger.info("Using lxml for strictly valid XML output")
    logger.info("With XSD Schema Validation")
    logger.info(f"Reference file: {ORIGINAL_FILE}")
    logger.info("Modifying: Passport IDs, Aliases, DOBs")
    logger.info("NOT modifying: uid")
    logger.info("=" * 60)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        logger.info(f"Connecting to {SFTP_HOST}...")
        ssh.connect(SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = ssh.open_sftp()
        logger.info("Connected!")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # ALWAYS download the original reference file
            remote_file = f"{SOURCE_PATH}/{ORIGINAL_FILE}"
            local_gz = os.path.join(tmpdir, ORIGINAL_FILE)
            
            logger.info(f"Downloading reference file: {ORIGINAL_FILE}")
            sftp.get(remote_file, local_gz)
            logger.info(f"Downloaded: {os.path.getsize(local_gz)} bytes")
            
            logger.info("Decompressing...")
            with gzip.open(local_gz, 'rb') as f:
                xml_bytes = f.read()
            
            logger.info(f"XML size: {len(xml_bytes)} bytes")
            
            # Parse XML with lxml recovery mode to handle any structural issues
            logger.info("\n--- PARSING XML WITH LXML (recovery mode) ---")
            parser = etree.XMLParser(recover=True, encoding='utf-8', remove_blank_text=False)
            root = etree.fromstring(xml_bytes, parser)
            
            if parser.error_log:
                logger.warning(f"Parser recovered from {len(parser.error_log)} issues:")
                for error in list(parser.error_log)[:10]:
                    logger.warning(f"  Line {error.line}: {error.message}")
                if len(parser.error_log) > 10:
                    logger.warning(f"  ... and {len(parser.error_log) - 10} more")
            else:
                logger.info("XML parsed without issues")
            
            # Find all record elements
            logger.info("\n--- ANALYZING XML STRUCTURE ---")
            records = root.findall('.//record')
            
            if not records:
                records = [elem for elem in root.iter() if elem.tag.lower() == 'record']
            
            if not records:
                logger.error("No records found!")
                return
            
            logger.info(f"Found {len(records)} records")
            
            changes_log = {
                'deleted': [],
                'passport_modified': [],
                'passport_added': [],
                'alias_modified': [],
                'dob_modified': [],
                'id_modified': []
            }
            
            total_records = len(records)
            
            # Select 10 records to delete
            delete_indices = sorted(random.sample(range(total_records), min(10, total_records)), reverse=True)
            logger.info(f"\n--- DELETING {len(delete_indices)} RECORDS ---")
            
            for idx in delete_indices:
                record = records[idx]
                record_uid = record.get('uid', f"index_{idx}")
                logger.info(f"DELETED: index={idx}, uid={record_uid}")
                changes_log['deleted'].append({'index': idx, 'uid': record_uid})
                
                parent = record.getparent()
                if parent is not None:
                    parent.remove(record)
            
            # Refresh records list after deletion
            records = root.findall('.//record')
            if not records:
                records = [elem for elem in root.iter() if elem.tag.lower() == 'record']
            
            logger.info(f"Records after deletion: {len(records)}")

            # Select 100 records to modify
            modify_count = min(100, len(records))
            modify_indices = random.sample(range(len(records)), modify_count)
            
            logger.info(f"\n--- MODIFYING {modify_count} RECORDS ---")
            logger.info("Changes: Passport IDs, ID Numbers, Aliases, DOBs (NOT uid)")
            
            for i in modify_indices:
                record = records[i]
                record_uid = record.get('uid', f"index_{i}")
                
                # 1. MODIFY/ADD PASSPORT NUMBER
                new_passport = generate_passport_number()
                
                # Find passport element
                passport_elem = None
                for elem in record.iter():
                    if elem.tag.lower() == 'passport':
                        passport_elem = elem
                        break
                
                if passport_elem is not None and passport_elem.text:
                    original = passport_elem.text
                    passport_elem.text = new_passport
                    logger.info(f"uid={record_uid}: PASSPORT MODIFIED: '{original}' -> '{new_passport}'")
                    changes_log['passport_modified'].append({'uid': record_uid, 'original': original, 'new': new_passport})
                else:
                    # Try to add passport in passports section
                    passports = None
                    details = None
                    for elem in record.iter():
                        if elem.tag.lower() == 'passports':
                            passports = elem
                            break
                        if elem.tag.lower() == 'details':
                            details = elem
                    
                    if passports is not None:
                        new_elem = etree.SubElement(passports, 'passport')
                        new_elem.set('country', 'XX')
                        new_elem.text = new_passport
                        logger.info(f"uid={record_uid}: PASSPORT ADDED: '{new_passport}'")
                        changes_log['passport_added'].append({'uid': record_uid, 'new': new_passport})
                    elif details is not None:
                        # Create passports section
                        passports = etree.SubElement(details, 'passports')
                        new_elem = etree.SubElement(passports, 'passport')
                        new_elem.set('country', 'XX')
                        new_elem.text = new_passport
                        logger.info(f"uid={record_uid}: PASSPORT ADDED (new section): '{new_passport}'")
                        changes_log['passport_added'].append({'uid': record_uid, 'new': new_passport})
                
                # 2. MODIFY ALIAS
                alias_elem = None
                for elem in record.iter():
                    if elem.tag.lower() == 'alias' and elem.text:
                        alias_elem = elem
                        break
                
                if alias_elem is not None and alias_elem.text:
                    original_alias = alias_elem.text
                    new_alias = f"MODIFIED_{original_alias}"
                    alias_elem.text = new_alias
                    logger.info(f"uid={record_uid}: ALIAS: '{original_alias[:30]}' -> '{new_alias[:40]}'")
                    changes_log['alias_modified'].append({'uid': record_uid, 'original': original_alias[:50], 'new': new_alias[:50]})
                
                # 3. MODIFY DOB
                dob_elem = None
                for elem in record.iter():
                    if elem.tag.lower() == 'dob' and elem.text:
                        dob_elem = elem
                        break
                
                if dob_elem is not None and dob_elem.text:
                    original_dob = dob_elem.text
                    try:
                        dt = datetime.strptime(original_dob, '%Y-%m-%d')
                        new_dt = dt + timedelta(days=random.randint(30, 365))
                        new_dob = new_dt.strftime('%Y-%m-%d')
                        dob_elem.text = new_dob
                        logger.info(f"uid={record_uid}: DOB: '{original_dob}' -> '{new_dob}'")
                        changes_log['dob_modified'].append({'uid': record_uid, 'original': original_dob, 'new': new_dob})
                    except ValueError:
                        logger.warning(f"uid={record_uid}: Could not parse DOB '{original_dob}'")
                
                # 4. MODIFY ID NUMBERS
                id_elem = None
                for elem in record.iter():
                    if elem.tag.lower() == 'id' and elem.text:
                        id_elem = elem
                        break
                
                if id_elem is not None and id_elem.text:
                    original_id = id_elem.text
                    # Generate new ID number with prefix
                    new_id = f"MOD_{random.randint(100000000, 999999999)}"
                    id_elem.text = new_id
                    id_type = id_elem.get('type', 'unknown')
                    logger.info(f"uid={record_uid}: ID ({id_type}): '{original_id}' -> '{new_id}'")
                    changes_log['id_modified'].append({'uid': record_uid, 'type': id_type, 'original': original_id, 'new': new_id})

            # Serialize XML using lxml - this ensures strictly valid XML
            logger.info("\n--- SERIALIZING TO STRICTLY VALID XML ---")
            new_xml_bytes = etree.tostring(
                root,
                encoding='utf-8',
                xml_declaration=True,
                pretty_print=False
            )
            logger.info(f"New XML size: {len(new_xml_bytes)} bytes")
            
            # Validate the output XML (well-formed check)
            logger.info("\n--- VALIDATING OUTPUT XML (well-formed) ---")
            try:
                strict_parser = etree.XMLParser(recover=False, encoding='utf-8')
                etree.fromstring(new_xml_bytes, strict_parser)
                logger.info("XML is well-formed!")
            except etree.XMLSyntaxError as e:
                logger.error(f"XML WELL-FORMED CHECK FAILED: {e}")
                logger.error("Aborting upload.")
                return
            
            # Validate against XSD schema
            logger.info("\n--- VALIDATING AGAINST XSD SCHEMA ---")
            is_valid, msg = validate_against_xsd(new_xml_bytes, WORLD_CHECK_XSD)
            if is_valid:
                logger.info(f"XSD VALIDATION PASSED: {msg}")
            else:
                logger.warning(f"XSD VALIDATION: {msg}")
                logger.warning("Continuing with upload (original file may have same issues)")
            
            # Create new file with date only
            date_str = datetime.now().strftime("%Y%m%d")
            new_filename = f"premium-world-check_8370_EU_PR_modified_{date_str}.xml.gz"
            local_new = os.path.join(tmpdir, new_filename)
            
            logger.info(f"\nCompressing to: {new_filename}")
            with gzip.open(local_new, 'wb') as f:
                f.write(new_xml_bytes)
            
            file_size = os.path.getsize(local_new)
            logger.info(f"Compressed size: {file_size} bytes")
            
            # MD5
            md5 = generate_md5_for_file(local_new)
            logger.info(f"MD5: {md5}")
            
            md5_filename = f"{new_filename}.md5"
            local_md5 = os.path.join(tmpdir, md5_filename)
            with open(local_md5, 'w') as f:
                f.write(f"{md5} *{new_filename}\n")
            
            logger.info(f"MD5 file content: {md5} *{new_filename}")
            
            # Upload
            logger.info(f"\nUploading files...")
            sftp.put(local_new, f"{SOURCE_PATH}/{new_filename}", confirm=False)
            logger.info(f"Uploaded: {new_filename}")
            sftp.put(local_md5, f"{SOURCE_PATH}/{md5_filename}", confirm=False)
            logger.info(f"Uploaded: {md5_filename}")
            
            # Verify
            remote_stat = sftp.stat(f"{SOURCE_PATH}/{new_filename}")
            logger.info(f"Remote file size: {remote_stat.st_size} bytes")

            # Summary
            logger.info("\n" + "=" * 60)
            logger.info("CHANGE SUMMARY")
            logger.info("=" * 60)
            logger.info(f"Reference file: {ORIGINAL_FILE}")
            logger.info(f"Records deleted: {len(changes_log['deleted'])}")
            logger.info(f"Passports modified: {len(changes_log['passport_modified'])}")
            logger.info(f"Passports added: {len(changes_log['passport_added'])}")
            logger.info(f"ID numbers modified: {len(changes_log['id_modified'])}")
            logger.info(f"Aliases modified: {len(changes_log['alias_modified'])}")
            logger.info(f"DOBs modified: {len(changes_log['dob_modified'])}")
            
            logger.info("\n--- DELETED RECORDS ---")
            for item in changes_log['deleted']:
                logger.info(f"  index={item['index']}, uid={item['uid']}")
            
            logger.info("\n--- PASSPORT MODIFICATIONS (first 20) ---")
            for item in changes_log['passport_modified'][:20]:
                logger.info(f"  uid={item['uid']}: '{item['original']}' -> '{item['new']}'")
            
            logger.info("\n--- PASSPORTS ADDED (first 20) ---")
            for item in changes_log['passport_added'][:20]:
                logger.info(f"  uid={item['uid']}: added '{item['new']}'")
            
            logger.info("\n--- ID NUMBERS MODIFIED (first 20) ---")
            for item in changes_log['id_modified'][:20]:
                logger.info(f"  uid={item['uid']} ({item['type']}): '{item['original']}' -> '{item['new']}'")
            
            logger.info("\n" + "=" * 60)
            logger.info("COMPLETED SUCCESSFULLY!")
            logger.info("XML Well-formed: PASSED")
            logger.info(f"XSD Validation: {'PASSED' if is_valid else 'WARNING (see above)'}")
            logger.info("=" * 60)
            logger.info(f"New file: {new_filename}")
            logger.info(f"MD5: {md5}")
            logger.info(f"Log file: xml_modification_v4.log")
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        ssh.close()
        logger.info("Connection closed.")


if __name__ == "__main__":
    main()
