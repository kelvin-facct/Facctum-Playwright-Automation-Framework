#!/usr/bin/env python3
from lxml import etree

NS = {'ofac': 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ENHANCED_XML'}
SOURCE_FILE = r'C:\Users\ReemaSingh\Downloads\sdn_enhanced.xml'

# Parse source file
tree = etree.parse(SOURCE_FILE)
root = tree.getroot()

# Check entity 2674 features
for entity in root.findall('.//ofac:entity[@id="2674"]', NS):
    print('Entity 2674 features in SOURCE file:')
    for feature in entity.findall('.//ofac:feature', NS):
        type_elem = feature.find('ofac:type', NS)
        value_elem = feature.find('ofac:value', NS)
        feature_type = type_elem.text if type_elem is not None else 'N/A'
        value = value_elem.text if value_elem is not None else 'N/A'
        print(f'  Type: "{feature_type}"')
        print(f'  Value: "{value}"')
        print(f'  "birth" in type.lower(): {"birth" in feature_type.lower()}')
        print()
