#!/usr/bin/env python3
import os, json, logging
from lxml import etree
from copy import deepcopy
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('ofac_diff_test_creation.log', mode='w', encoding='utf-8')])
logger = logging.getLogger(__name__)

SOURCE_FILE = r"C:\Users\ReemaSingh\Downloads\sdn_enhanced.xml"
OUTPUT_DIR = r"C:\Users\ReemaSingh\Downloads"
BASE_FILE = os.path.join(OUTPUT_DIR, "ofac_sdn_enhanced_base.xml")
MODIFIED_FILE = os.path.join(OUTPUT_DIR, "ofac_sdn_enhanced_modified.xml")
REPORT_FILE = os.path.join(OUTPUT_DIR, "ofac_diff_test_report.json")

NS = {'ofac': 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ENHANCED_XML'}
OFAC_NS = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ENHANCED_XML'

TEST_CASE_MAPPING = {
    "TC36": {"field": "aliases", "action": "modify", "desc": "aliases - modify existing values"},
    "TC37": {"field": "addresses", "action": "modify", "desc": "addresses - modify city and country"},
    "TC38": {"field": "identityDocuments", "action": "modify", "desc": "identityDocuments - modify number"},
    "TC39": {"field": "features", "action": "modify", "desc": "features - modify values"},
    "TC40": {"field": "sanctionsPrograms", "action": "modify", "desc": "sanctionsPrograms - modify values"},
    "TC41": {"field": "sanctionsTypes", "action": "modify", "desc": "sanctionsTypes - modify values"},
    "TC42": {"field": "legalAuthorities", "action": "modify", "desc": "legalAuthorities - modify values"},
    "TC43": {"field": "title", "action": "modify", "desc": "title - modify value"},
    "TC44": {"field": "primaryName", "action": "modify", "desc": "primaryName - modify first/last name"},
    "TC45": {"field": "multipleArrays", "action": "modify", "desc": "multiple arrays - modify all"},
    "TC46": {"field": "aliases", "action": "empty_to_pop", "desc": "aliases - empty to populated"},
    "TC47": {"field": "addresses", "action": "empty_to_pop", "desc": "addresses - empty to populated"},
    "TC48": {"field": "features", "action": "empty_to_pop", "desc": "features - empty to populated"},
    "TC49": {"field": "identityDocuments", "action": "empty_to_pop", "desc": "identityDocuments - empty to populated"},
    "TC50": {"field": "aliases", "action": "pop_to_empty", "desc": "aliases - populated to empty"},
    "TC51": {"field": "addresses", "action": "pop_to_empty", "desc": "addresses - populated to empty"},
    "TC52": {"field": "features", "action": "pop_to_empty", "desc": "features - populated to empty"},
    "TC53": {"field": "identityDocuments", "action": "pop_to_empty", "desc": "identityDocuments - populated to empty"},
    "TC54": {"field": "allArrays", "action": "empty_to_pop", "desc": "All arrays empty to populated"},
    "TC55": {"field": "allArrays", "action": "pop_to_empty", "desc": "All arrays populated to empty"},
    "TC56": {"field": "combo", "action": "multi_attr_multi_array", "desc": "Multiple attrs + arrays changed"},
    "TC57": {"field": "combo", "action": "all_attr_no_array", "desc": "All attrs changed, arrays unchanged"},
    "TC58": {"field": "combo", "action": "all_array_no_attr", "desc": "All arrays changed, attrs unchanged"},
    "TC59": {"field": "combo", "action": "half_add_half_remove", "desc": "Half arrays added, half removed"},
    "TC60": {"field": "combo", "action": "mixed", "desc": "Mixed: add, remove, modify"},
}

class EntitySelector:
    def __init__(self):
        self.entities_with_aliases = []
        self.entities_with_addresses = []
        self.entities_with_features = []
        self.entities_with_id_docs = []
        self.entities_without_aliases = []
        self.entities_without_addresses = []
        self.entities_without_features = []
        self.entities_without_id_docs = []
        self.entities_rich = []
        self.all_entities = {}

    def analyze_source(self, source_file):
        logger.info(f"Analyzing source file: {source_file}")
        context = etree.iterparse(source_file, events=('end',), tag=f'{{{OFAC_NS}}}entity')
        count = 0
        for event, elem in context:
            entity_id = int(elem.get('id'))
            aliases = elem.findall('.//ofac:name[ofac:isPrimary="false"]', NS)
            addresses = elem.findall('.//ofac:address', NS)
            features = elem.findall('.//ofac:feature', NS)
            id_docs = elem.findall('.//ofac:identityDocument', NS)
            legal_auths = elem.findall('.//ofac:legalAuthority', NS)
            
            has_aliases = len(aliases) > 0
            has_addresses = len(addresses) > 0
            has_features = len(features) > 0
            has_id_docs = len(id_docs) > 0
            has_legal_auth = len(legal_auths) > 0
            
            self.all_entities[entity_id] = {'has_aliases': has_aliases, 'has_addresses': has_addresses,
                'has_features': has_features, 'has_id_docs': has_id_docs, 'has_legal_auth': has_legal_auth}
            
            if has_aliases: self.entities_with_aliases.append(entity_id)
            else: self.entities_without_aliases.append(entity_id)
            if has_addresses: self.entities_with_addresses.append(entity_id)
            else: self.entities_without_addresses.append(entity_id)
            if has_features: self.entities_with_features.append(entity_id)
            else: self.entities_without_features.append(entity_id)
            if has_id_docs: self.entities_with_id_docs.append(entity_id)
            else: self.entities_without_id_docs.append(entity_id)
            
            array_count = sum([has_aliases, has_addresses, has_features, has_id_docs, has_legal_auth])
            if array_count >= 3: self.entities_rich.append(entity_id)
            elem.clear()
            count += 1
        
        logger.info(f"Analyzed {count} entities")
        logger.info(f"  With aliases: {len(self.entities_with_aliases)}, With addresses: {len(self.entities_with_addresses)}")
        logger.info(f"  With features: {len(self.entities_with_features)}, With ID docs: {len(self.entities_with_id_docs)}")
        logger.info(f"  Without aliases: {len(self.entities_without_aliases)}, Rich entities: {len(self.entities_rich)}")


    def select_entities_for_test_cases(self):
        s = {}
        used_entities = set()
        
        def get_unique(lst, start_idx=0):
            for i in range(start_idx, len(lst)):
                if lst[i] not in used_entities:
                    used_entities.add(lst[i])
                    return lst[i]
            return None
        
        # GROUP 5: ARRAY FIELD MODIFICATIONS
        s['TC36'] = get_unique(self.entities_with_aliases)
        s['TC37'] = get_unique(self.entities_with_addresses)
        s['TC38'] = get_unique(self.entities_with_id_docs)
        s['TC39'] = get_unique(self.entities_with_features)
        s['TC40'] = get_unique(self.entities_with_aliases)
        s['TC41'] = get_unique(self.entities_with_aliases)
        s['TC42'] = get_unique(self.entities_with_aliases)
        s['TC43'] = get_unique(self.entities_with_features)
        s['TC44'] = get_unique(self.entities_with_aliases)
        s['TC45'] = get_unique(self.entities_rich)
        
        # GROUP 6: EMPTY TO POPULATED
        s['TC46'] = get_unique(self.entities_without_aliases)
        s['TC47'] = get_unique(self.entities_without_addresses)
        s['TC48'] = get_unique(self.entities_without_features)
        s['TC49'] = get_unique(self.entities_without_id_docs)
        
        # GROUP 6: POPULATED TO EMPTY
        s['TC50'] = get_unique(self.entities_with_aliases)
        s['TC51'] = get_unique(self.entities_with_addresses)
        s['TC52'] = get_unique(self.entities_with_features)
        s['TC53'] = get_unique(self.entities_with_id_docs)
        s['TC54'] = get_unique(self.entities_without_aliases)
        s['TC55'] = get_unique(self.entities_rich)
        
        # GROUP 7: COMBINATION CHANGES
        s['TC56'] = get_unique(self.entities_rich)
        s['TC57'] = get_unique(self.entities_with_features)
        s['TC58'] = get_unique(self.entities_rich)
        s['TC59'] = get_unique(self.entities_rich)
        s['TC60'] = get_unique(self.entities_rich)
        return s


class EntityModifier:
    @staticmethod
    def modify_aliases(entity):
        for name in entity.findall('.//ofac:name[ofac:isPrimary="false"]', NS):
            for translation in name.findall('.//ofac:translation', NS):
                for elem in translation.findall('ofac:formattedLastName', NS):
                    if elem.text: elem.text = "MODIFIED_" + elem.text
                for elem in translation.findall('ofac:formattedFullName', NS):
                    if elem.text: elem.text = "MODIFIED_" + elem.text
                for name_part in translation.findall('.//ofac:namePart/ofac:value', NS):
                    if name_part.text: name_part.text = "MODIFIED_" + name_part.text
        return entity

    @staticmethod
    def modify_addresses(entity):
        for addr_part in entity.findall('.//ofac:addressPart', NS):
            type_elem = addr_part.find('ofac:type', NS)
            value_elem = addr_part.find('ofac:value', NS)
            if type_elem is not None and value_elem is not None:
                if 'CITY' in (type_elem.text or ''): value_elem.text = "MODIFIED_CITY"
                elif 'ADDRESS' in (type_elem.text or ''): value_elem.text = "MODIFIED_ADDRESS"
        return entity

    @staticmethod
    def modify_identity_documents(entity):
        for id_doc in entity.findall('.//ofac:identityDocument', NS):
            doc_num = id_doc.find('ofac:documentNumber', NS)
            if doc_num is not None: doc_num.text = "MODIFIED_" + (doc_num.text or "DOC")
        return entity

    @staticmethod
    def modify_features(entity):
        for feature in entity.findall('.//ofac:feature', NS):
            value_elem = feature.find('ofac:value', NS)
            if value_elem is not None and value_elem.text: value_elem.text = "MODIFIED_" + value_elem.text
        return entity

    @staticmethod
    def modify_sanctions_programs(entity):
        for prog in entity.findall('.//ofac:sanctionsProgram', NS):
            if prog.text: prog.text = "MODIFIED_" + prog.text
        return entity

    @staticmethod
    def modify_sanctions_types(entity):
        for st in entity.findall('.//ofac:sanctionsType', NS):
            if st.text: st.text = "MODIFIED_" + st.text
        return entity

    @staticmethod
    def modify_legal_authorities(entity):
        for la in entity.findall('.//ofac:legalAuthority', NS):
            if la.text: la.text = "MODIFIED_" + la.text
        return entity

    @staticmethod
    def modify_title(entity):
        general_info = entity.find('ofac:generalInfo', NS)
        if general_info is not None:
            title = general_info.find('ofac:title', NS)
            if title is not None and title.text: title.text = "MODIFIED_" + title.text
            else:
                title = etree.SubElement(general_info, f'{{{OFAC_NS}}}title')
                title.text = "MODIFIED_TITLE"
        return entity

    @staticmethod
    def modify_primary_name(entity):
        for name in entity.findall('.//ofac:name[ofac:isPrimary="true"]', NS):
            for translation in name.findall('.//ofac:translation', NS):
                for elem in ['formattedFirstName', 'formattedLastName', 'formattedFullName']:
                    e = translation.find(f'ofac:{elem}', NS)
                    if e is not None and e.text: e.text = "MODIFIED_" + e.text
        return entity

    @staticmethod
    def modify_multiple_arrays(entity):
        EntityModifier.modify_aliases(entity)
        EntityModifier.modify_addresses(entity)
        EntityModifier.modify_features(entity)
        EntityModifier.modify_sanctions_programs(entity)
        return entity

    @staticmethod
    def add_alias(entity, alias_text="NEW_ALIAS"):
        names = entity.find('ofac:names', NS)
        if names is None: names = etree.SubElement(entity, f'{{{OFAC_NS}}}names')
        name = etree.SubElement(names, f'{{{OFAC_NS}}}name')
        name.set('id', '999999')
        etree.SubElement(name, f'{{{OFAC_NS}}}isPrimary').text = 'false'
        alias_type = etree.SubElement(name, f'{{{OFAC_NS}}}aliasType')
        alias_type.set('refId', '1400')
        alias_type.text = 'A.K.A.'
        etree.SubElement(name, f'{{{OFAC_NS}}}isLowQuality').text = 'false'
        translations = etree.SubElement(name, f'{{{OFAC_NS}}}translations')
        translation = etree.SubElement(translations, f'{{{OFAC_NS}}}translation')
        translation.set('id', '999999')
        etree.SubElement(translation, f'{{{OFAC_NS}}}isPrimary').text = 'true'
        script = etree.SubElement(translation, f'{{{OFAC_NS}}}script')
        script.set('refId', '20122')
        script.text = 'Latin'
        etree.SubElement(translation, f'{{{OFAC_NS}}}formattedLastName').text = alias_text
        etree.SubElement(translation, f'{{{OFAC_NS}}}formattedFullName').text = alias_text
        return entity

    @staticmethod
    def add_address(entity, city="NEW_CITY", country="NEW_COUNTRY"):
        addresses = entity.find('ofac:addresses', NS)
        if addresses is None: addresses = etree.SubElement(entity, f'{{{OFAC_NS}}}addresses')
        address = etree.SubElement(addresses, f'{{{OFAC_NS}}}address')
        address.set('id', '999998')
        country_elem = etree.SubElement(address, f'{{{OFAC_NS}}}country')
        country_elem.set('refId', '11211')
        country_elem.text = country
        translations = etree.SubElement(address, f'{{{OFAC_NS}}}translations')
        translation = etree.SubElement(translations, f'{{{OFAC_NS}}}translation')
        translation.set('id', '999998')
        etree.SubElement(translation, f'{{{OFAC_NS}}}isPrimary').text = 'true'
        script = etree.SubElement(translation, f'{{{OFAC_NS}}}script')
        script.set('refId', '20122')
        script.text = 'Latin'
        addr_parts = etree.SubElement(translation, f'{{{OFAC_NS}}}addressParts')
        addr_part = etree.SubElement(addr_parts, f'{{{OFAC_NS}}}addressPart')
        addr_part.set('id', '999997')
        type_elem = etree.SubElement(addr_part, f'{{{OFAC_NS}}}type')
        type_elem.set('refId', '1454')
        type_elem.text = 'CITY'
        etree.SubElement(addr_part, f'{{{OFAC_NS}}}value').text = city
        return entity

    @staticmethod
    def add_feature(entity, feature_type="Birthdate", value="01 Jan 1970"):
        features = entity.find('ofac:features', NS)
        if features is None: features = etree.SubElement(entity, f'{{{OFAC_NS}}}features')
        feature = etree.SubElement(features, f'{{{OFAC_NS}}}feature')
        feature.set('id', '999996')
        type_elem = etree.SubElement(feature, f'{{{OFAC_NS}}}type')
        type_elem.set('featureTypeId', '8')
        type_elem.text = feature_type
        etree.SubElement(feature, f'{{{OFAC_NS}}}versionId').text = '999996'
        etree.SubElement(feature, f'{{{OFAC_NS}}}value').text = value
        etree.SubElement(feature, f'{{{OFAC_NS}}}isPrimary').text = 'true'
        return entity

    @staticmethod
    def add_identity_document(entity, doc_type="Passport", doc_number="NEW_DOC_123"):
        id_docs = entity.find('ofac:identityDocuments', NS)
        if id_docs is None: id_docs = etree.SubElement(entity, f'{{{OFAC_NS}}}identityDocuments')
        id_doc = etree.SubElement(id_docs, f'{{{OFAC_NS}}}identityDocument')
        id_doc.set('id', '999995')
        type_elem = etree.SubElement(id_doc, f'{{{OFAC_NS}}}type')
        type_elem.set('refId', '1571')
        type_elem.text = doc_type
        etree.SubElement(id_doc, f'{{{OFAC_NS}}}documentNumber').text = doc_number
        etree.SubElement(id_doc, f'{{{OFAC_NS}}}isValid').text = 'true'
        return entity

    @staticmethod
    def remove_aliases(entity):
        names = entity.find('ofac:names', NS)
        if names is not None:
            for name in list(names.findall('ofac:name', NS)):
                is_primary = name.find('ofac:isPrimary', NS)
                if is_primary is not None and is_primary.text == 'false': names.remove(name)
        return entity

    @staticmethod
    def remove_addresses(entity):
        addresses = entity.find('ofac:addresses', NS)
        if addresses is not None:
            for address in list(addresses): addresses.remove(address)
        return entity

    @staticmethod
    def remove_features(entity):
        features = entity.find('ofac:features', NS)
        if features is not None:
            for feature in list(features): features.remove(feature)
        return entity

    @staticmethod
    def remove_identity_documents(entity):
        id_docs = entity.find('ofac:identityDocuments', NS)
        if id_docs is not None:
            for id_doc in list(id_docs): id_docs.remove(id_doc)
        return entity

def apply_test_case_modification(entity, test_case):
    tc_info = TEST_CASE_MAPPING.get(test_case)
    if not tc_info: return entity
    action, field = tc_info['action'], tc_info['field']
    
    if action == 'modify':
        if field == 'aliases': return EntityModifier.modify_aliases(entity)
        elif field == 'addresses': return EntityModifier.modify_addresses(entity)
        elif field == 'identityDocuments': return EntityModifier.modify_identity_documents(entity)
        elif field == 'features': return EntityModifier.modify_features(entity)
        elif field == 'sanctionsPrograms': return EntityModifier.modify_sanctions_programs(entity)
        elif field == 'sanctionsTypes': return EntityModifier.modify_sanctions_types(entity)
        elif field == 'legalAuthorities': return EntityModifier.modify_legal_authorities(entity)
        elif field == 'title': return EntityModifier.modify_title(entity)
        elif field == 'primaryName': return EntityModifier.modify_primary_name(entity)
        elif field == 'multipleArrays': return EntityModifier.modify_multiple_arrays(entity)
    elif action == 'empty_to_pop':
        if field == 'aliases': return EntityModifier.add_alias(entity, f"NEW_ALIAS_{test_case}")
        elif field == 'addresses': return EntityModifier.add_address(entity, f"NEW_CITY_{test_case}", f"NEW_COUNTRY_{test_case}")
        elif field == 'features': return EntityModifier.add_feature(entity, "Birthdate", "01 Jan 1980")
        elif field == 'identityDocuments': return EntityModifier.add_identity_document(entity, "Passport", f"NEW_PASSPORT_{test_case}")
        elif field == 'allArrays':
            EntityModifier.add_alias(entity, f"NEW_ALIAS_{test_case}")
            EntityModifier.add_address(entity, f"NEW_CITY_{test_case}", f"NEW_COUNTRY_{test_case}")
            EntityModifier.add_feature(entity, "Birthdate", "01 Jan 1985")
            EntityModifier.add_identity_document(entity, "Passport", f"NEW_PASSPORT_{test_case}")
            return entity
    elif action == 'pop_to_empty':
        if field == 'aliases': return EntityModifier.remove_aliases(entity)
        elif field == 'addresses': return EntityModifier.remove_addresses(entity)
        elif field == 'features': return EntityModifier.remove_features(entity)
        elif field == 'identityDocuments': return EntityModifier.remove_identity_documents(entity)
        elif field == 'allArrays':
            EntityModifier.remove_aliases(entity)
            EntityModifier.remove_addresses(entity)
            EntityModifier.remove_features(entity)
            EntityModifier.remove_identity_documents(entity)
            return entity
    elif action == 'multi_attr_multi_array':
        EntityModifier.modify_title(entity)
        EntityModifier.modify_primary_name(entity)
        EntityModifier.modify_aliases(entity)
        EntityModifier.modify_addresses(entity)
        return entity
    elif action == 'all_attr_no_array':
        EntityModifier.modify_title(entity)
        EntityModifier.modify_primary_name(entity)
        return entity
    elif action == 'all_array_no_attr':
        EntityModifier.modify_aliases(entity)
        EntityModifier.modify_addresses(entity)
        EntityModifier.modify_features(entity)
        return entity
    elif action == 'half_add_half_remove':
        EntityModifier.add_alias(entity, f"NEW_ALIAS_{test_case}")
        EntityModifier.remove_addresses(entity)
        return entity
    elif action == 'mixed':
        EntityModifier.add_alias(entity, f"NEW_ALIAS_{test_case}")
        EntityModifier.modify_features(entity)
        EntityModifier.remove_identity_documents(entity)
        return entity
    return entity

def create_diff_test_files():
    logger.info("=" * 70)
    logger.info("OFAC SDN ENHANCED DIFF TEST FILE CREATOR")
    logger.info("=" * 70)
    
    selector = EntitySelector()
    selector.analyze_source(SOURCE_FILE)
    test_case_entities = selector.select_entities_for_test_cases()
    
    logger.info("\nSelected entities for test cases:")
    for tc, entity_id in sorted(test_case_entities.items()):
        tc_info = TEST_CASE_MAPPING.get(tc, {})
        logger.info(f"  {tc}: Entity ID {entity_id} - {tc_info.get('desc', '')}")
    
    entities_to_modify = {eid for eid in test_case_entities.values() if eid is not None}
    entity_to_tc = {eid: tc for tc, eid in test_case_entities.items() if eid is not None}
    
    logger.info(f"\nParsing source file: {SOURCE_FILE}")
    parser = etree.XMLParser(remove_blank_text=True)
    tree = etree.parse(SOURCE_FILE, parser)
    root = tree.getroot()
    
    base_root = deepcopy(root)
    modified_root = deepcopy(root)
    
    logger.info("\nApplying modifications to selected entities...")
    report = {
        "summary": {"source_file": SOURCE_FILE, "base_file": BASE_FILE, "modified_file": MODIFIED_FILE,
            "total_entities": len(selector.all_entities), "test_cases_count": len([tc for tc in test_case_entities.values() if tc is not None])},
        "test_cases": {}, "by_attribute": defaultdict(list)
    }
    
    for entity in modified_root.findall('.//ofac:entity', NS):
        entity_id = int(entity.get('id'))
        if entity_id in entities_to_modify:
            test_case = entity_to_tc[entity_id]
            tc_info = TEST_CASE_MAPPING.get(test_case, {})
            logger.info(f"  Modifying entity {entity_id} for {test_case}: {tc_info.get('desc', '')}")
            apply_test_case_modification(entity, test_case)
            report["test_cases"][test_case] = {"entity_id": entity_id, "description": tc_info.get('desc', ''),
                "field": tc_info.get('field', ''), "action": tc_info.get('action', '')}
            field = tc_info.get('field', 'unknown')
            report["by_attribute"][field].append({"test_case": test_case, "entity_id": entity_id, "action": tc_info.get('action', '')})
    
    logger.info(f"\nWriting base file: {BASE_FILE}")
    base_xml = etree.tostring(base_root, encoding='utf-8', xml_declaration=True, pretty_print=True)
    with open(BASE_FILE, 'wb') as f: f.write(base_xml)
    logger.info(f"  Base file size: {os.path.getsize(BASE_FILE):,} bytes")
    
    logger.info(f"\nWriting modified file: {MODIFIED_FILE}")
    modified_xml = etree.tostring(modified_root, encoding='utf-8', xml_declaration=True, pretty_print=True)
    with open(MODIFIED_FILE, 'wb') as f: f.write(modified_xml)
    logger.info(f"  Modified file size: {os.path.getsize(MODIFIED_FILE):,} bytes")
    
    logger.info(f"\nWriting report: {REPORT_FILE}")
    report["by_attribute"] = dict(report["by_attribute"])
    with open(REPORT_FILE, 'w', encoding='utf-8') as f: json.dump(report, f, indent=2)
    
    logger.info("\n" + "=" * 70)
    logger.info("SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Total entities: {len(selector.all_entities):,}")
    logger.info(f"Test cases: {len([tc for tc in test_case_entities.values() if tc is not None])}")
    logger.info(f"\nOutput files:\n  Base: {BASE_FILE}\n  Modified: {MODIFIED_FILE}\n  Report: {REPORT_FILE}")
    
    logger.info("\n" + "=" * 70)
    logger.info("TEST CASE DETAILS")
    logger.info("=" * 70)
    for tc in sorted(report["test_cases"].keys()):
        tc_data = report["test_cases"][tc]
        logger.info(f"\n{tc}: Entity ID {tc_data['entity_id']}")
        logger.info(f"  {tc_data['description']} | Field: {tc_data['field']} | Action: {tc_data['action']}")
    
    logger.info("\n" + "=" * 70)
    logger.info("BY ATTRIBUTE/FIELD")
    logger.info("=" * 70)
    for field, entries in sorted(report["by_attribute"].items()):
        logger.info(f"\n{field}:")
        for entry in entries:
            logger.info(f"  {entry['test_case']}: Entity {entry['entity_id']} ({entry['action']})")
    
    logger.info("\n" + "=" * 70)
    logger.info("COMPLETED SUCCESSFULLY!")
    logger.info("=" * 70)
    return report

if __name__ == "__main__":
    create_diff_test_files()

