#!/usr/bin/env python3
"""Extract real reference data from World-Check XML file"""

import paramiko
import gzip
import tempfile
import os
from lxml import etree
from collections import Counter

SFTP_HOST = 'test.ftp.facctum.ai'
SFTP_USER = 'sftp-test-user1'
SFTP_PASSWORD = 'f@cctUser1'
SOURCE_PATH = '/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SFTP_HOST, port=22, username=SFTP_USER, password=SFTP_PASSWORD)
sftp = ssh.open_sftp()

with tempfile.TemporaryDirectory() as tmpdir:
    local_path = os.path.join(tmpdir, 'ref.xml.gz')
    sftp.get(f'{SOURCE_PATH}/premium-world-check_8370_EU_PR_latest.xml.gz', local_path)
    
    with gzip.open(local_path, 'rb') as f:
        parser = etree.XMLParser(recover=True)
        tree = etree.parse(f, parser)
    
    root = tree.getroot()
    
    # Extract unique categories
    categories = set()
    sub_categories = set()
    keywords = Counter()
    special_interest_cats = set()
    e_i_values = set()
    update_categories = set()
    
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
    
    print('=== CATEGORIES ===')
    for c in sorted(categories):
        print(f'  "{c}"')
    
    print('\n=== SUB-CATEGORIES ===')
    for sc in sorted(sub_categories):
        print(f'  "{sc}"')
    
    print('\n=== E-I VALUES ===')
    for ei in sorted(e_i_values):
        print(f'  "{ei}"')
    
    print('\n=== UPDATE CATEGORIES ===')
    for uc in sorted(update_categories):
        print(f'  "{uc}"')
    
    print('\n=== TOP 50 KEYWORDS ===')
    for kw, count in keywords.most_common(50):
        print(f'  "{kw}" ({count})')
    
    print('\n=== SPECIAL INTEREST CATEGORIES ===')
    for sic in sorted(special_interest_cats):
        print(f'  "{sic}"')

ssh.close()
