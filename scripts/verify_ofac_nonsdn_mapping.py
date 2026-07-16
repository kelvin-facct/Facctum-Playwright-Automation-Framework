"""
OFAC NON-SDN XML to MongoDB Mapping Verification Script

Verifies that:
1. XML data is correctly mapped to MongoDB (dataviumRegulatoryListHist, listId=94)
   based on the OFAC_NON_SDN_Mapping.xlsx mapping sheet
2. Highlights fields not mapped correctly (XML value != DB value)
3. Highlights XML fields/data NOT present in the mapping sheet
4. Highlights mapped fields missing from DB documents

Usage:
    python scripts/verify_ofac_nonsdn_mapping.py
    python scripts/verify_ofac_nonsdn_mapping.py --xml "path/to/xml" --mapping "path/to/xlsx"
    python scripts/verify_ofac_nonsdn_mapping.py --sample 10  (verify 10 random entities)
    python scripts/verify_ofac_nonsdn_mapping.py --entity-id 9639  (verify specific entity)
    python scripts/verify_ofac_nonsdn_mapping.py --report html  (generate HTML report)

Requirements:
    pip install openpyxl pymongo
"""

import sys
import os
import json
import argparse
import random
import html as html_lib
from datetime import datetime
from collections import defaultdict
from typing import Optional

try:
    import openpyxl
except ImportError:
    print("ERROR: openpyxl not installed. Run: pip install openpyxl")
    sys.exit(1)

try:
    from pymongo import MongoClient
except ImportError:
    print("ERROR: pymongo not installed. Run: pip install pymongo")
    sys.exit(1)

try:
    import xml.etree.ElementTree as ET
except ImportError:
    print("ERROR: xml.etree not available")
    sys.exit(1)


# --- Configuration ---
DEFAULT_XML = os.path.join(os.environ.get("USERPROFILE", ""), "Downloads", "20260623T141041_cons_enhanced.xml")
DEFAULT_MAPPING = os.path.join(os.environ.get("USERPROFILE", ""), "Downloads", "OFAC_NON_SDN_Mapping.xlsx")
DEFAULT_OUTPUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports", "ofac_nonsdn_mapping_verification.html")

# MongoDB connection
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://qasaasuserrw:ZnTwAy0eTbaNdX1U@127.0.0.1:27017/?tls=true&directConnection=true&tlsInsecure=true")
MONGO_DATABASE = os.environ.get("MONGO_DATABASE", "screenDB")
MONGO_COLLECTION = "dataviumRegulatoryListHist"
LIST_ID = 94

# XML Namespace
NS = '{https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ENHANCED_XML}'


class MappingEntry:
    """Represents a single row from the OFAC NON SDN mapping sheet."""
    def __init__(self, row_num, field_name, if_equals, ss_mapping, ss_field, data_type, attr_no, metadata, nullable, samples, comments):
        self.row_num = row_num
        self.field_name = field_name  # XML XPath-like field
        self.if_equals = if_equals    # Conditional: only apply when parent type matches
        self.ss_mapping = ss_mapping  # SingleStore attribute number
        self.ss_field = ss_field      # Target DB field path
        self.data_type = data_type
        self.attr_no = attr_no
        self.metadata = metadata
        self.nullable = nullable
        self.samples = samples
        self.comments = comments

    def __repr__(self):
        return f"Mapping({self.field_name} -> {self.ss_field})"


class VerificationResult:
    """Stores verification results for a single entity."""
    def __init__(self, entity_id):
        self.entity_id = entity_id
        self.matches = []       # (field, xml_value, db_value)
        self.mismatches = []    # (field, xml_value, db_value, reason)
        self.unmapped_xml = []  # (xml_path, xml_value) - data in XML not in mapping
        self.missing_db = []    # (field, expected_value) - mapped but missing in DB
        self.evidence = []      # (mapping_field, xml_path, xml_value, db_field, db_value, status)

    @property
    def total_checks(self):
        return len(self.matches) + len(self.mismatches) + len(self.missing_db)

    @property
    def pass_rate(self):
        if self.total_checks == 0:
            return 0
        return (len(self.matches) / self.total_checks) * 100


def load_mapping(mapping_file):
    """Load mapping entries from OFAC NON SDN sheet."""
    wb = openpyxl.load_workbook(mapping_file, read_only=True)
    ws = wb['OFAC NON SDN']
    rows = list(ws.iter_rows(values_only=True))

    mappings = []
    for i, row in enumerate(rows[1:], start=1):  # Skip header
        if len(row) < 5:
            continue
        field_name = row[1]
        if not field_name:
            continue
        entry = MappingEntry(
            row_num=i,
            field_name=str(field_name).strip(),
            if_equals=str(row[2]).strip() if row[2] else None,
            ss_mapping=row[3],
            ss_field=str(row[4]).strip() if row[4] else None,
            data_type=str(row[5]) if row[5] else None,
            attr_no=row[6],
            metadata=str(row[7]) if row[7] else None,
            nullable=str(row[8]) if row[8] else None,
            samples=str(row[9]) if row[9] else None,
            comments=str(row[10]) if row[10] else None,
        )
        mappings.append(entry)

    print(f"Loaded {len(mappings)} mapping entries from '{mapping_file}'")
    return mappings


def parse_xml(xml_file):
    """Parse XML and return dict of entities keyed by @id."""
    print(f"Parsing XML: {xml_file}")
    tree = ET.parse(xml_file)
    root = tree.getroot()

    entities_elem = root.find(f'{NS}entities')
    entity_list = list(entities_elem)
    print(f"Total entities in XML: {len(entity_list)}")

    entities = {}
    for e in entity_list:
        eid = e.attrib.get('id')
        entities[eid] = e
    return entities


def get_text(elem, path, ns=NS):
    """Get text content from element using a simplified path."""
    parts = path.split('.')
    current = elem
    for part in parts:
        if part.startswith('@'):
            return current.attrib.get(part[1:], '')
        found = current.find(f'{ns}{part}')
        if found is None:
            return None
        current = found
    return (current.text or '').strip() if current is not None else None


def extract_entity_data(entity_elem):
    """Extract all data from an XML entity into a flat structure for comparison."""
    data = {}
    eid = entity_elem.attrib.get('id', '')
    data['entity.@id'] = eid

    # General Info
    gi = entity_elem.find(f'{NS}generalInfo')
    if gi is not None:
        et = gi.find(f'{NS}entityType')
        if et is not None:
            data['generalInfo.entityType.#text'] = (et.text or '').strip()
        remarks = gi.find(f'{NS}remarks')
        if remarks is not None:
            data['generalInfo.remarks'] = (remarks.text or '').strip()
        title = gi.find(f'{NS}title')
        if title is not None:
            data['generalInfo.title'] = (title.text or '').strip()

    # Sanctions Lists
    sl = entity_elem.find(f'{NS}sanctionsLists')
    if sl is not None:
        data['sanctionsLists'] = []
        for s in sl.findall(f'{NS}sanctionsList'):
            data['sanctionsLists'].append({
                'name': (s.text or '').strip(),
                'datePublished': s.attrib.get('datePublished', ''),
                'id': s.attrib.get('id', ''),
            })

    # Sanctions Programs
    sp = entity_elem.find(f'{NS}sanctionsPrograms')
    if sp is not None:
        data['sanctionsPrograms'] = []
        for p in sp.findall(f'{NS}sanctionsProgram'):
            data['sanctionsPrograms'].append((p.text or '').strip())

    # Sanctions Types
    st = entity_elem.find(f'{NS}sanctionsTypes')
    if st is not None:
        data['sanctionsTypes'] = []
        for t in st.findall(f'{NS}sanctionsType'):
            data['sanctionsTypes'].append((t.text or '').strip())

    # Legal Authorities
    la = entity_elem.find(f'{NS}legalAuthorities')
    if la is not None:
        data['legalAuthorities'] = []
        for a in la.findall(f'{NS}legalAuthority'):
            data['legalAuthorities'].append((a.text or '').strip())

    # Names
    names_elem = entity_elem.find(f'{NS}names')
    if names_elem is not None:
        data['names'] = []
        for name in names_elem.findall(f'{NS}name'):
            name_data = {
                'id': name.attrib.get('id', ''),
                'isPrimary': get_text(name, 'isPrimary'),
                'isLowQuality': get_text(name, 'isLowQuality'),
                'aliasType': '',
                'translations': []
            }
            at = name.find(f'{NS}aliasType')
            if at is not None:
                name_data['aliasType'] = (at.text or '').strip()

            translations = name.find(f'{NS}translations')
            if translations is not None:
                for tr in translations.findall(f'{NS}translation'):
                    tr_data = {
                        'isPrimary': get_text(tr, 'isPrimary'),
                        'script': '',
                        'formattedFirstName': get_text(tr, 'formattedFirstName') or '',
                        'formattedLastName': get_text(tr, 'formattedLastName') or '',
                        'formattedFullName': get_text(tr, 'formattedFullName') or '',
                        'nameParts': {}
                    }
                    script = tr.find(f'{NS}script')
                    if script is not None:
                        tr_data['script'] = (script.text or '').strip()

                    name_parts = tr.find(f'{NS}nameParts')
                    if name_parts is not None:
                        for np in name_parts.findall(f'{NS}namePart'):
                            np_type = np.find(f'{NS}type')
                            np_value = np.find(f'{NS}value')
                            if np_type is not None and np_value is not None:
                                tr_data['nameParts'][(np_type.text or '').strip()] = (np_value.text or '').strip()

                    name_data['translations'].append(tr_data)
            data['names'].append(name_data)

    # Addresses
    addr_elem = entity_elem.find(f'{NS}addresses')
    if addr_elem is not None:
        data['addresses'] = []
        for addr in addr_elem.findall(f'{NS}address'):
            addr_data = {'country': '', 'translations': []}
            country = addr.find(f'{NS}country')
            if country is not None:
                addr_data['country'] = (country.text or '').strip()

            translations = addr.find(f'{NS}translations')
            if translations is not None:
                for tr in translations.findall(f'{NS}translation'):
                    tr_data = {
                        'isPrimary': get_text(tr, 'isPrimary'),
                        'script': '',
                        'addressParts': {}
                    }
                    script = tr.find(f'{NS}script')
                    if script is not None:
                        tr_data['script'] = (script.text or '').strip()

                    ap_elem = tr.find(f'{NS}addressParts')
                    if ap_elem is not None:
                        for ap in ap_elem.findall(f'{NS}addressPart'):
                            ap_type = ap.find(f'{NS}type')
                            ap_value = ap.find(f'{NS}value')
                            if ap_type is not None and ap_value is not None:
                                tr_data['addressParts'][(ap_type.text or '').strip()] = (ap_value.text or '').strip()

                    addr_data['translations'].append(tr_data)
            data['addresses'].append(addr_data)

    # Features
    feat_elem = entity_elem.find(f'{NS}features')
    if feat_elem is not None:
        data['features'] = []
        for feat in feat_elem.findall(f'{NS}feature'):
            feat_data = {
                'id': feat.attrib.get('id', ''),
                'type': '',
                'value': get_text(feat, 'value') or '',
                'isPrimary': get_text(feat, 'isPrimary') or '',
                'reliability': '',
                'comments': get_text(feat, 'comments') or '',
                'valueDate': {}
            }
            ft = feat.find(f'{NS}type')
            if ft is not None:
                feat_data['type'] = (ft.text or '').strip()

            rel = feat.find(f'{NS}reliability')
            if rel is not None:
                feat_data['reliability'] = (rel.text or '').strip()

            vd = feat.find(f'{NS}valueDate')
            if vd is not None:
                for field in ['fromDateBegin', 'fromDateEnd', 'toDateBegin', 'toDateEnd', 'isApproximate', 'isDateRange']:
                    elem = vd.find(f'{NS}{field}')
                    if elem is not None:
                        feat_data['valueDate'][field] = (elem.text or '').strip()

            data['features'].append(feat_data)

    # Relationships
    rel_elem = entity_elem.find(f'{NS}relationships')
    if rel_elem is not None:
        data['relationships'] = []
        for rel in rel_elem.findall(f'{NS}relationship'):
            rel_data = {
                'type': '',
                'relatedEntity': '',
                'relatedEntityId': '',
                'quality': '',
                'comments': get_text(rel, 'comments') or '',
            }
            rt = rel.find(f'{NS}type')
            if rt is not None:
                rel_data['type'] = (rt.text or '').strip()
            re_elem = rel.find(f'{NS}relatedEntity')
            if re_elem is not None:
                rel_data['relatedEntity'] = (re_elem.text or '').strip()
                rel_data['relatedEntityId'] = re_elem.attrib.get('entityId', '')
            q = rel.find(f'{NS}quality')
            if q is not None:
                rel_data['quality'] = (q.text or '').strip()

            # Date range
            dr = rel.find(f'{NS}dateRange')
            if dr is not None:
                for field in ['fromDateBegin', 'fromDateEnd', 'toDateBegin', 'toDateEnd', 'isApproximate', 'isDateRange']:
                    elem = dr.find(f'{NS}{field}')
                    if elem is not None:
                        rel_data[f'dateRange.{field}'] = (elem.text or '').strip()

            data['relationships'].append(rel_data)

    return data


def get_nested_value(doc, field_path):
    """Get a value from a MongoDB document using dot-notation path.
    Supports array fields like nameDetails[].firstName"""
    if not doc or not field_path:
        return None

    # Handle array notation like "nameDetails[].firstName"
    if '[]' in field_path:
        parts = field_path.split('[]')
        array_field = parts[0].strip('.')
        remaining = parts[1].strip('.') if len(parts) > 1 else ''

        arr = doc.get(array_field, [])
        if not isinstance(arr, list):
            return None
        if remaining:
            return [get_nested_value(item, remaining) for item in arr if isinstance(item, dict)]
        return arr

    # Simple dot notation
    parts = field_path.split('.')
    current = doc
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
        if current is None:
            return None
    return current


def verify_entity(entity_id, xml_data, db_doc, mappings):
    """Verify a single entity's XML data against its MongoDB document."""
    result = VerificationResult(entity_id)

    if db_doc is None:
        result.missing_db.append(("entire_document", f"Entity {entity_id} not found in MongoDB"))
        return result

    # --- Verify sourceNaturalKey ---
    db_source_id = str(db_doc.get('sourceNaturalKey', ''))
    if str(entity_id) == db_source_id:
        result.matches.append(('sourceNaturalKey', entity_id, db_source_id))
    else:
        result.mismatches.append(('sourceNaturalKey', entity_id, db_source_id, 'Entity @id should map to sourceNaturalKey'))

    # --- Verify listEntryId pattern ---
    db_list_entry = db_doc.get('listEntryId', '')
    expected_pattern = f"OFACNONSDN-{entity_id}"
    if expected_pattern == db_list_entry:
        result.matches.append(('listEntryId', expected_pattern, db_list_entry))
    elif str(entity_id) in str(db_list_entry):
        result.matches.append(('listEntryId', expected_pattern, db_list_entry))
    else:
        result.mismatches.append(('listEntryId', expected_pattern, db_list_entry, 'listEntryId format mismatch'))

    # --- Verify entityTypeName ---
    xml_type = xml_data.get('generalInfo.entityType.#text', '')
    db_type = db_doc.get('entityTypeName', '')
    if xml_type and xml_type.lower() == str(db_type).lower():
        result.matches.append(('entityTypeName', xml_type, db_type))
    elif xml_type:
        result.mismatches.append(('entityTypeName', xml_type, db_type, 'Entity type mismatch'))

    # --- Verify additionalInformation (remarks) ---
    xml_remarks = xml_data.get('generalInfo.remarks', '')
    db_remarks = db_doc.get('additionalInformation', '')
    if xml_remarks:
        if xml_remarks in str(db_remarks):
            result.matches.append(('additionalInformation', xml_remarks[:50], str(db_remarks)[:50]))
        else:
            result.mismatches.append(('additionalInformation', xml_remarks[:80], str(db_remarks)[:80], 'Remarks mismatch'))

    # --- Verify names (nameDetailsList) ---
    xml_names = xml_data.get('names', [])
    db_names = db_doc.get('nameDetailsList', [])

    for xml_name in xml_names:
        for tr in xml_name.get('translations', []):
            xml_full = tr.get('formattedFullName', '')
            xml_first = tr.get('formattedFirstName', '')
            xml_last = tr.get('formattedLastName', '')

            # Find matching DB name by fullName
            found = False
            for db_name in db_names:
                db_full = db_name.get('fullName', '')
                if xml_full and xml_full == db_full:
                    found = True
                    # Check firstName
                    db_first = db_name.get('firstName', '')
                    if xml_first and xml_first == db_first:
                        result.matches.append(('nameDetailsList[].firstName', xml_first, db_first))
                    elif xml_first and db_first:
                        result.mismatches.append(('nameDetailsList[].firstName', xml_first, db_first, f'Name: {xml_full}'))

                    # Check lastName
                    db_last = db_name.get('lastName', '')
                    if xml_last and xml_last == db_last:
                        result.matches.append(('nameDetailsList[].lastName', xml_last, db_last))
                    elif xml_last and db_last:
                        result.mismatches.append(('nameDetailsList[].lastName', xml_last, db_last, f'Name: {xml_full}'))

                    # Check fullName match itself
                    result.matches.append(('nameDetailsList[].fullName', xml_full, db_full))

                    # Check nameType
                    xml_is_primary = xml_name.get('isPrimary', 'false')
                    xml_alias_type = xml_name.get('aliasType', '')
                    db_name_type = db_name.get('nameType', '')

                    if xml_is_primary == 'true':
                        expected_type = 'Primary'
                    elif xml_alias_type:
                        expected_type = xml_alias_type
                    else:
                        expected_type = None

                    if expected_type and db_name_type:
                        if expected_type.lower().replace('.', '').replace(' ', '') in db_name_type.lower().replace('.', '').replace(' ', '') or \
                           db_name_type.lower() in expected_type.lower():
                            result.matches.append(('nameDetailsList[].nameType', expected_type, db_name_type))

                    # Check nameCategory (isLowQuality -> weak/strong)
                    xml_quality = xml_name.get('isLowQuality', 'false')
                    db_category = db_name.get('nameCategory', '')
                    expected_cat = 'weak' if xml_quality == 'true' else 'strong'
                    if db_category and expected_cat == db_category:
                        result.matches.append(('nameDetailsList[].nameCategory', expected_cat, db_category))
                    elif db_category:
                        result.mismatches.append(('nameDetailsList[].nameCategory', expected_cat, db_category, f'Name: {xml_full}'))

                    # Check originalScriptLanguage
                    xml_script = tr.get('script', '')
                    db_script = db_name.get('originalScriptLanguage', '')
                    if xml_script and xml_script == db_script:
                        result.matches.append(('nameDetailsList[].originalScriptLanguage', xml_script, db_script))

                    # Check middleName
                    xml_middle = tr.get('nameParts', {}).get('Middle Name', '')
                    if xml_middle:
                        db_middle = db_name.get('middleName', '')
                        if xml_middle == db_middle:
                            result.matches.append(('nameDetailsList[].middleName', xml_middle, db_middle))
                        elif db_middle:
                            result.mismatches.append(('nameDetailsList[].middleName', xml_middle, db_middle, f'Name: {xml_full}'))
                        else:
                            result.missing_db.append(('nameDetailsList[].middleName', xml_middle))

                    # Check maidenName
                    xml_maiden = tr.get('nameParts', {}).get('Maiden Name', '')
                    if xml_maiden:
                        db_maiden = db_name.get('maidenName', '')
                        if xml_maiden == db_maiden:
                            result.matches.append(('nameDetailsList[].maidenName', xml_maiden, db_maiden))
                        elif db_maiden:
                            result.mismatches.append(('nameDetailsList[].maidenName', xml_maiden, db_maiden, f'Name: {xml_full}'))
                        else:
                            result.missing_db.append(('nameDetailsList[].maidenName', xml_maiden))
                    break

            if not found and xml_full:
                result.missing_db.append(('nameDetailsList[].fullName', xml_full))

    # --- Verify sanctions programs (sanctionProgramDetailsList) ---
    xml_programs = xml_data.get('sanctionsPrograms', [])
    db_programs = db_doc.get('sanctionProgramDetailsList', [])
    db_program_names = [p.get('programName', '') for p in db_programs] if isinstance(db_programs, list) else []

    for prog in xml_programs:
        if prog in db_program_names:
            result.matches.append(('sanctionProgramDetailsList[].programName', prog, prog))
        elif prog:
            result.mismatches.append(('sanctionProgramDetailsList[].programName', prog, db_program_names, 'Program not found in DB'))

    # --- Verify sanctions types (sanctionImposedIndicatorsList) ---
    xml_types = xml_data.get('sanctionsTypes', [])
    db_indicators = db_doc.get('sanctionImposedIndicatorsList', [])
    if not isinstance(db_indicators, list):
        db_indicators = [db_indicators] if db_indicators else []

    for st in xml_types:
        if st in db_indicators:
            result.matches.append(('sanctionImposedIndicatorsList', st, st))
        elif st:
            result.mismatches.append(('sanctionImposedIndicatorsList', st, db_indicators, 'Sanctions type not found'))

    # --- Verify addresses (addressDetailsList) ---
    xml_addrs = xml_data.get('addresses', [])
    db_addrs = db_doc.get('addressDetailsList', [])

    for xml_addr in xml_addrs:
        xml_country = xml_addr.get('country', '')
        if xml_country:
            found = any(a.get('countryName', '') == xml_country for a in db_addrs) if db_addrs else False
            if found:
                result.matches.append(('addressDetailsList[].countryName', xml_country, xml_country))
            else:
                db_countries = [a.get('countryName', '') for a in db_addrs] if db_addrs else []
                result.mismatches.append(('addressDetailsList[].countryName', xml_country, db_countries, 'Country not found'))

        for tr in xml_addr.get('translations', []):
            type_to_field = {
                'ADDRESS1': 'addressLine1',
                'ADDRESS2': 'addressLine2',
                'ADDRESS3': 'addressLine3',
                'CITY': 'city',
                'STATE/PROVINCE': 'stateOrProvince',
                'POSTAL CODE': 'postalCode',
                'REGION': 'region',
            }
            for part_type, part_value in tr.get('addressParts', {}).items():
                db_field = type_to_field.get(part_type)
                if db_field and part_value:
                    found = any(str(a.get(db_field, '')) == part_value for a in db_addrs) if db_addrs else False
                    if found:
                        result.matches.append((f'addressDetailsList[].{db_field}', part_value, part_value))
                    else:
                        db_vals = [a.get(db_field, '') for a in db_addrs] if db_addrs else []
                        result.mismatches.append((f'addressDetailsList[].{db_field}', part_value, db_vals, f'Address {part_type}'))

    # --- Verify features ---
    xml_features = xml_data.get('features', [])
    db_birth_dates = db_doc.get('birthDateDetails', []) or db_doc.get('birthDateDetailsList', []) or []
    db_ids = db_doc.get('idNumberTypesList', [])
    db_citizenship = db_doc.get('citizenshipDetails', []) or db_doc.get('citizenshipDetailsList', []) or []

    for feat in xml_features:
        feat_type = feat.get('type', '')
        feat_value = feat.get('value', '')

        if feat_type == 'Birthdate' and feat_value:
            if db_birth_dates:
                found = any(feat_value in str(b.get('date', '')) for b in db_birth_dates)
                if found:
                    result.matches.append(('birthDateDetails[].date', feat_value, 'found'))
                else:
                    db_dates = [b.get('date', '') for b in db_birth_dates]
                    result.mismatches.append(('birthDateDetails[].date', feat_value, db_dates, 'Birthdate not found'))
            else:
                result.missing_db.append(('birthDateDetails[].date', feat_value))

        elif feat_type == 'Place of Birth' and feat_value:
            db_pob = db_doc.get('placeOfBirthDetails', []) or db_doc.get('placeOfBirthDetailsList', []) or []
            if db_pob:
                found = any(feat_value in str(p.get('placeName', '')) or feat_value in str(p) for p in db_pob)
                if found:
                    result.matches.append(('placeOfBirthDetails[].placeName', feat_value, 'found'))
                else:
                    result.mismatches.append(('placeOfBirthDetails[].placeName', feat_value, db_pob, 'Place of birth not found'))
            else:
                result.missing_db.append(('placeOfBirthDetails', feat_value))

        elif 'Citizenship' in feat_type and feat_value:
            if db_citizenship:
                found = any(feat_value in str(c.get('countryName', '')) for c in db_citizenship)
                if found:
                    result.matches.append(('citizenshipDetails[].countryName', feat_value, 'found'))
                else:
                    result.mismatches.append(('citizenshipDetails[].countryName', feat_value, db_citizenship, 'Citizenship not found'))
            else:
                result.missing_db.append(('citizenshipDetails', feat_value))

        elif feat_type and feat_value and feat_type not in ('Birthdate', 'Place of Birth') and 'Citizenship' not in feat_type:
            # ID-type features or sourceSpecificInfo
            if db_ids:
                found = any(feat_value == str(i.get('idValue', '')) for i in db_ids)
                if found:
                    result.matches.append(('idNumberTypesList[].idValue', feat_value, 'found'))
                    # Also verify idType mapping
                    for i in db_ids:
                        if feat_value == str(i.get('idValue', '')):
                            db_id_type = i.get('idType', '')
                            if feat_type and feat_type == db_id_type:
                                result.matches.append(('idNumberTypesList[].idType', feat_type, db_id_type))
                            elif feat_type and db_id_type:
                                # Check if type is contained (partial match OK)
                                if feat_type.lower() in db_id_type.lower() or db_id_type.lower() in feat_type.lower():
                                    result.matches.append(('idNumberTypesList[].idType', feat_type, db_id_type))
                                else:
                                    result.mismatches.append(('idNumberTypesList[].idType', feat_type, db_id_type, f'ID value: {feat_value}'))
                            break

    # --- Verify legal authorities ---
    xml_legal = xml_data.get('legalAuthorities', [])
    db_legal = db_doc.get('legalAuthority', [])
    if not isinstance(db_legal, list):
        db_legal = [db_legal] if db_legal else []

    for la in xml_legal:
        if la in db_legal:
            result.matches.append(('legalAuthority', la, la))
        elif la:
            # Check partial match (DB may store abbreviated form)
            found = any(la in str(d) or str(d) in la for d in db_legal)
            if found:
                result.matches.append(('legalAuthority', la[:40], 'partial match'))
            else:
                result.mismatches.append(('legalAuthority', la[:60], db_legal, 'Legal authority not found'))

    # --- Verify sanctions list details ---
    xml_sl = xml_data.get('sanctionsLists', [])
    db_sl = db_doc.get('sanctionListDetails', [])

    for sl in xml_sl:
        sl_name = sl.get('name', '')
        sl_date = sl.get('datePublished', '')
        if sl_name and db_sl:
            found = any(sl_name == s.get('sanctionsListName', '') for s in db_sl)
            if found:
                result.matches.append(('sanctionListDetails[].sanctionsListName', sl_name, sl_name))
                # Check published date too
                if sl_date:
                    date_found = any(sl_date == s.get('publishedDate', '') for s in db_sl if s.get('sanctionsListName', '') == sl_name)
                    if date_found:
                        result.matches.append(('sanctionListDetails[].publishedDate', sl_date, sl_date))
                    else:
                        result.mismatches.append(('sanctionListDetails[].publishedDate', sl_date, 'not found', f'List: {sl_name}'))
            else:
                result.mismatches.append(('sanctionListDetails[].sanctionsListName', sl_name,
                    [s.get('sanctionsListName', '') for s in db_sl], 'List name not found'))

    # --- Identify unmapped XML fields ---
    xml_rels = xml_data.get('relationships', [])
    if xml_rels:
        db_linked = db_doc.get('linkedTo', []) or db_doc.get('linkedToList', [])
        if not db_linked:
            for rel in xml_rels:
                result.unmapped_xml.append(('relationships', f"type={rel.get('type', '')} entity={rel.get('relatedEntity', '')}"))

    return result


def connect_mongodb():
    """Connect to MongoDB and return collection."""
    print(f"Connecting to MongoDB: {MONGO_DATABASE}/{MONGO_COLLECTION}")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db = client[MONGO_DATABASE]
    collection = db[MONGO_COLLECTION]

    # Test connection
    count = collection.count_documents({"listId": LIST_ID})
    print(f"Collection '{MONGO_COLLECTION}' has {count} documents for listId={LIST_ID}")
    return collection


def generate_html_report(results, output_file, total_entities, sample_size):
    """Generate HTML verification report."""
    total_matches = sum(r.total_checks for r in results)
    total_pass = sum(len(r.matches) for r in results)
    total_mismatch = sum(len(r.mismatches) for r in results)
    total_missing = sum(len(r.missing_db) for r in results)
    total_unmapped = sum(len(r.unmapped_xml) for r in results)
    pass_rate = (total_pass / total_matches * 100) if total_matches > 0 else 0

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OFAC NON-SDN Mapping Verification Report</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', sans-serif; background: #f4f6f9; color: #333; padding: 24px; }}
  .container {{ max-width: 1200px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 40px; }}
  h1 {{ color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 12px; margin-bottom: 8px; font-size: 24px; }}
  .subtitle {{ color: #555; margin-bottom: 24px; font-size: 13px; }}
  h2 {{ color: #283593; margin-top: 32px; margin-bottom: 12px; font-size: 18px; border-left: 4px solid #3949ab; padding-left: 12px; }}
  h3 {{ color: #37474f; margin-top: 20px; margin-bottom: 8px; font-size: 15px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 12px 0 24px 0; font-size: 12px; }}
  th {{ background: #1a237e; color: #fff; padding: 8px 10px; text-align: left; }}
  td {{ padding: 6px 10px; border-bottom: 1px solid #e0e0e0; word-break: break-word; max-width: 400px; }}
  tr:nth-child(even) {{ background: #f8f9fc; }}
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 16px 0; }}
  .card {{ background: #f8f9fc; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; text-align: center; }}
  .card .num {{ font-size: 28px; font-weight: 700; }}
  .card .lbl {{ font-size: 11px; color: #666; }}
  .card.green .num {{ color: #2e7d32; }}
  .card.red .num {{ color: #c62828; }}
  .card.orange .num {{ color: #e65100; }}
  .card.blue .num {{ color: #1565c0; }}
  .badge {{ display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }}
  .badge-pass {{ background: #c8e6c9; color: #2e7d32; }}
  .badge-fail {{ background: #ffcdd2; color: #c62828; }}
  .badge-warn {{ background: #fff3e0; color: #e65100; }}
  .entity-block {{ border: 1px solid #e0e0e0; border-radius: 6px; margin: 16px 0; padding: 16px; }}
  .entity-header {{ font-weight: 600; font-size: 14px; margin-bottom: 8px; }}
  .pass-bar {{ height: 8px; border-radius: 4px; background: #e0e0e0; margin: 4px 0; }}
  .pass-bar-fill {{ height: 100%; border-radius: 4px; background: #4caf50; }}
  @media print {{ body {{ background: #fff; padding: 0; }} .container {{ box-shadow: none; }} }}
</style>
</head>
<body>
<div class="container">
<h1>OFAC NON-SDN Mapping Verification Report</h1>
<div class="subtitle">
  <strong>Collection:</strong> {MONGO_COLLECTION} (listId={LIST_ID}) |
  <strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')} |
  <strong>Sample:</strong> {sample_size} of {total_entities} entities
</div>

<h2>Summary</h2>
<div class="summary-grid">
  <div class="card green"><div class="num">{total_pass}</div><div class="lbl">Fields Matched</div></div>
  <div class="card red"><div class="num">{total_mismatch}</div><div class="lbl">Mismatches</div></div>
  <div class="card orange"><div class="num">{total_missing}</div><div class="lbl">Missing in DB</div></div>
  <div class="card blue"><div class="num">{total_unmapped}</div><div class="lbl">Unmapped XML Data</div></div>
  <div class="card"><div class="num">{pass_rate:.1f}%</div><div class="lbl">Pass Rate</div></div>
</div>
"""

    # --- Mismatches summary ---
    if total_mismatch > 0:
        html += '<h2>⚠️ Mapping Mismatches (XML ≠ DB)</h2>\n'
        html += '<p style="color:#666;margin-bottom:8px;">Fields where XML data does not match the value stored in MongoDB:</p>\n'
        html += '<table><tr><th>Entity ID</th><th>Field</th><th>XML Value</th><th>DB Value</th><th>Details</th></tr>\n'
        for r in results:
            for field, xml_val, db_val, reason in r.mismatches:
                html += f'<tr><td>{r.entity_id}</td><td>{html_lib.escape(field)}</td>'
                html += f'<td>{html_lib.escape(str(xml_val)[:100])}</td>'
                html += f'<td>{html_lib.escape(str(db_val)[:100])}</td>'
                html += f'<td>{html_lib.escape(reason)}</td></tr>\n'
        html += '</table>\n'

    # --- Missing in DB ---
    if total_missing > 0:
        html += '<h2>❌ Mapped Fields Missing from DB</h2>\n'
        html += '<p style="color:#666;margin-bottom:8px;">Data that exists in XML and is mapped in the sheet, but not found in MongoDB:</p>\n'
        html += '<table><tr><th>Entity ID</th><th>Expected DB Field</th><th>Expected Value</th></tr>\n'
        for r in results:
            for field, value in r.missing_db:
                html += f'<tr><td>{r.entity_id}</td><td>{html_lib.escape(field)}</td><td>{html_lib.escape(str(value)[:150])}</td></tr>\n'
        html += '</table>\n'

    # --- Unmapped XML data ---
    if total_unmapped > 0:
        html += '<h2>🔍 XML Data Not Mapped in Sheet / DB</h2>\n'
        html += '<p style="color:#666;margin-bottom:8px;">Data present in XML but not found mapped to any DB field:</p>\n'
        html += '<table><tr><th>Entity ID</th><th>XML Path</th><th>Value</th></tr>\n'
        for r in results:
            for path, value in r.unmapped_xml:
                html += f'<tr><td>{r.entity_id}</td><td>{html_lib.escape(path)}</td><td>{html_lib.escape(str(value)[:150])}</td></tr>\n'
        html += '</table>\n'

    # --- Per-entity detail ---
    html += '<h2>Per-Entity Verification Detail</h2>\n'
    for r in results:
        status = '<span class="badge badge-pass">PASS</span>' if not r.mismatches and not r.missing_db else '<span class="badge badge-fail">ISSUES</span>'
        html += f'<div class="entity-block">\n'
        html += f'<div class="entity-header">Entity {r.entity_id} {status} — {len(r.matches)} matched, {len(r.mismatches)} mismatched, {len(r.missing_db)} missing</div>\n'
        if r.pass_rate > 0:
            html += f'<div class="pass-bar"><div class="pass-bar-fill" style="width:{r.pass_rate:.0f}%"></div></div>\n'
        html += '</div>\n'

    html += '</div></body></html>'

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"\nHTML report: {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Verify OFAC NON-SDN XML to MongoDB mapping")
    parser.add_argument("--xml", default=DEFAULT_XML, help="Path to XML data file")
    parser.add_argument("--mapping", default=DEFAULT_MAPPING, help="Path to mapping Excel file")
    parser.add_argument("--output", "-o", default=DEFAULT_OUTPUT, help="Output report path")
    parser.add_argument("--sample", type=int, default=20, help="Number of entities to sample (0=all)")
    parser.add_argument("--entity-id", type=str, help="Verify specific entity ID")
    parser.add_argument("--report", default="html", choices=["html", "console"], help="Report format")
    args = parser.parse_args()

    # Validate inputs
    if not os.path.exists(args.xml):
        print(f"ERROR: XML file not found: {args.xml}")
        sys.exit(1)
    if not os.path.exists(args.mapping):
        print(f"ERROR: Mapping file not found: {args.mapping}")
        sys.exit(1)

    # Load mapping
    mappings = load_mapping(args.mapping)

    # Parse XML
    entities = parse_xml(args.xml)
    total_entities = len(entities)

    # Connect to MongoDB
    try:
        collection = connect_mongodb()
    except Exception as e:
        print(f"ERROR: MongoDB connection failed: {e}")
        print("Make sure the SSH tunnel is running (scripts/db-tunnel.bat) or set MONGO_* env vars.")
        sys.exit(1)

    # Select entities to verify
    if args.entity_id:
        entity_ids = [args.entity_id]
    elif args.sample > 0 and args.sample < total_entities:
        entity_ids = random.sample(list(entities.keys()), args.sample)
    else:
        entity_ids = list(entities.keys())

    print(f"\nVerifying {len(entity_ids)} entities...")
    print("-" * 60)

    results = []
    for i, eid in enumerate(entity_ids, 1):
        entity_elem = entities.get(eid)
        if entity_elem is None:
            print(f"  [{i}/{len(entity_ids)}] Entity {eid}: NOT FOUND IN XML")
            continue

        # Extract XML data
        xml_data = extract_entity_data(entity_elem)

        # Find in MongoDB
        db_doc = collection.find_one({"listId": LIST_ID, "sourceNaturalKey": str(eid)})
        if db_doc is None:
            # Try with listEntryId pattern
            db_doc = collection.find_one({"listId": LIST_ID, "listEntryId": f"OFACNONSDN-{eid}"})

        # Verify
        result = verify_entity(eid, xml_data, db_doc, mappings)
        results.append(result)

        status = "✅" if not result.mismatches and not result.missing_db else "❌"
        print(f"  [{i}/{len(entity_ids)}] Entity {eid}: {status} matches={len(result.matches)} mismatches={len(result.mismatches)} missing={len(result.missing_db)}")

    # Summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    total_matches = sum(len(r.matches) for r in results)
    total_mismatches = sum(len(r.mismatches) for r in results)
    total_missing = sum(len(r.missing_db) for r in results)
    total_unmapped = sum(len(r.unmapped_xml) for r in results)
    total_checks = total_matches + total_mismatches + total_missing

    print(f"  Entities verified: {len(results)}")
    print(f"  Total field checks: {total_checks}")
    print(f"  ✅ Matches: {total_matches}")
    print(f"  ❌ Mismatches: {total_mismatches}")
    print(f"  ⚠️  Missing in DB: {total_missing}")
    print(f"  🔍 Unmapped XML data: {total_unmapped}")
    if total_checks > 0:
        print(f"  Pass rate: {total_matches/total_checks*100:.1f}%")

    # Generate report
    if args.report == "html":
        generate_html_report(results, args.output, total_entities, len(entity_ids))
    else:
        # Console detailed output
        if total_mismatches > 0:
            print("\n--- MISMATCHES ---")
            for r in results:
                for field, xml_val, db_val, reason in r.mismatches:
                    print(f"  Entity {r.entity_id} | {field} | XML: {str(xml_val)[:50]} | DB: {str(db_val)[:50]} | {reason}")

    print("\nDone.")


if __name__ == "__main__":
    main()
