#!/usr/bin/env python3
from lxml import etree
import os

NS = {'ofac': 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ENHANCED_XML'}
MODIFIED_FILE = r'C:\Users\ReemaSingh\Downloads\ofac_sdn_enhanced_modified.xml'

print(f"Reading file: {MODIFIED_FILE}")
print(f"File size: {os.path.getsize(MODIFIED_FILE):,} bytes")
print(f"Last modified: {os.path.getmtime(MODIFIED_FILE)}")
print()

# Parse fresh
tree = etree.parse(MODIFIED_FILE)
root = tree.getroot()

# Check entities that had features modified: 2674 (TC39), 751 (TC45), 2681 (TC58), 2685 (TC60)
for eid in ['2674', '751', '2681', '2685']:
    for entity in root.findall(f'.//ofac:entity[@id="{eid}"]', NS):
        print(f'Entity {eid} features in MODIFIED file:')
        features = entity.findall('.//ofac:feature', NS)
        if not features:
            print('  (no features)')
        for feature in features:
            type_elem = feature.find('ofac:type', NS)
            value_elem = feature.find('ofac:value', NS)
            feature_type = type_elem.text if type_elem is not None else 'N/A'
            value = value_elem.text if value_elem is not None else 'N/A'
            print(f'  Type: {feature_type}, Value: "{value}" (length: {len(value) if value else 0} bytes)')
        print()
