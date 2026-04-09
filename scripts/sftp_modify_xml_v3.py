#!/usr/bin/env python3
"""
SFTP script to modify XML file:
- Change ID values for 100 records
- Add/update passport numbers
- Add/update national IDs
- Modify aliases and DOBs
- Delete 10 records
"""

import paramiko
import hashlib
import os
import gzip
import tempfile
import logging
import random
import re
import string
from datetime import datetime, timedelta

# Setup logging with UTF-8 encoding
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('xml_modification_v3.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# SFTP Configuration
SFTP_HOST = "test.ftp.facctum.ai"
SFTP_USER = "sftp-test-user1"
SFTP_PASSWORD = "f@cctUser1"
SFTP_PORT = 22

SOURCE_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"
ORIGINAL_FILE = "premium-world-check_8370_EU_PR_latest.xml.gz"


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


def generate_national_id():
    """Generate a random national ID"""
    return ''.join(random.choices(string.digits, k=12))


def main():
    logger.info("=" * 60)
    logger.info("STARTING XML MODIFICATION PROCESS V3")
    logger.info("=" * 60)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        logger.info(f"Connecting to {SFTP_HOST}...")
        ssh.connect(SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = ssh.open_sftp()
        logger.info("Connected!")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            remote_file = f"{SOURCE_PATH}/{ORIGINAL_FILE}"
            local_gz = os.path.join(tmpdir, ORIGINAL_FILE)
            
            logger.info(f"Downloading {ORIGINAL_FILE}...")
            sftp.get(remote_file, local_gz)
            logger.info(f"Downloaded: {os.path.getsize(local_gz)} bytes")
            
            logger.info("Decompressing...")
            with gzip.open(local_gz, 'rt', encoding='utf-8') as f:
                xml_content = f.read()
            
            logger.info(f"XML size: {len(xml_content)} chars")
            
            # Find records
            logger.info("\n--- ANALYZING XML STRUCTURE ---")
            record_pattern = r'<record[^>]*>.*?</record>'
            records = re.findall(record_pattern, xml_content, re.DOTALL | re.IGNORECASE)
            
            if not records:
                logger.error("No records found!")
                return
            
            logger.info(f"Found {len(records)} records")
            
            # Show sample to understand structure
            logger.info("\n--- SAMPLE RECORD STRUCTURE ---")
            sample = records[0][:1500]
            logger.info(sample)
            
            changes_log = {
                'deleted': [],
                'id_changed': [],
                'alias_modified': [],
                'dob_modified': [],
                'passport_modified': [],
                'national_id_modified': []
            }
            
            total_records = len(records)
            
            # Select 10 records to delete
            delete_indices = sorted(random.sample(range(total_records), min(10, total_records)), reverse=True)
            logger.info(f"\n--- DELETING {len(delete_indices)} RECORDS ---")
            
            for idx in delete_indices:
                id_match = re.search(r'uid=["\'](\d+)["\']', records[idx])
                record_id = id_match.group(1) if id_match else f"index_{idx}"
                logger.info(f"DELETED: index={idx}, uid={record_id}")
                changes_log['deleted'].append({'index': idx, 'uid': record_id})
            
            for idx in delete_indices:
                records.pop(idx)
            
            logger.info(f"Records after deletion: {len(records)}")
            
            # Select 100 records to modify (IDs, passport, national ID)
            modify_count = min(100, len(records))
            modify_indices = random.sample(range(len(records)), modify_count)
            
            logger.info(f"\n--- MODIFYING {modify_count} RECORDS ---")
            logger.info("Changes: ID, Passport, National ID, Alias, DOB")
            
            for i in modify_indices:
                record = records[i]
                modified_record = record
                
                # Get original UID
                uid_match = re.search(r'uid=["\'](\d+)["\']', record)
                original_uid = uid_match.group(1) if uid_match else f"index_{i}"
                
                # 1. CHANGE ID (uid attribute)
                if uid_match:
                    new_uid = str(int(original_uid) + 900000)  # Add 900000 to make it unique
                    modified_record = re.sub(
                        r'(uid=["\'])(\d+)(["\'])',
                        rf'\g<1>{new_uid}\g<3>',
                        modified_record,
                        count=1
                    )
                    logger.info(f"ID CHANGED: {original_uid} -> {new_uid}")
                    changes_log['id_changed'].append({
                        'original': original_uid,
                        'new': new_uid
                    })
                
                # 2. ADD/UPDATE PASSPORT NUMBER
                new_passport = generate_passport_number()
                
                # Check if passport exists
                passport_patterns = [
                    r'(<passport[^>]*>)([^<]*)(</passport>)',
                    r'(<PassportNumber[^>]*>)([^<]*)(</PassportNumber>)',
                    r'(<id_number[^>]*type=["\']passport["\'][^>]*>)([^<]*)(</id_number>)',
                ]
                
                passport_updated = False
                for pattern in passport_patterns:
                    match = re.search(pattern, modified_record, re.IGNORECASE)
                    if match:
                        original_passport = match.group(2)
                        modified_record = re.sub(
                            pattern,
                            rf'\g<1>{new_passport}\g<3>',
                            modified_record,
                            count=1,
                            flags=re.IGNORECASE
                        )
                        logger.info(f"  PASSPORT UPDATED: '{original_passport}' -> '{new_passport}'")
                        changes_log['passport_modified'].append({
                            'uid': new_uid if uid_match else original_uid,
                            'original': original_passport,
                            'new': new_passport,
                            'action': 'updated'
                        })
                        passport_updated = True
                        break
                
                # If no passport found, try to add one in identification section
                if not passport_updated:
                    # Look for identification or ids section
                    id_section_patterns = [
                        (r'(</identifications>)', f'<identification type="passport">{new_passport}</identification>\\1'),
                        (r'(</ids>)', f'<id type="passport">{new_passport}</id>\\1'),
                        (r'(<identifications[^>]*>)', f'\\1<identification type="passport">{new_passport}</identification>'),
                    ]
                    
                    for pattern, replacement in id_section_patterns:
                        if re.search(pattern, modified_record, re.IGNORECASE):
                            modified_record = re.sub(pattern, replacement, modified_record, count=1, flags=re.IGNORECASE)
                            logger.info(f"  PASSPORT ADDED: '{new_passport}'")
                            changes_log['passport_modified'].append({
                                'uid': new_uid if uid_match else original_uid,
                                'original': None,
                                'new': new_passport,
                                'action': 'added'
                            })
                            passport_updated = True
                            break
                
                # 3. ADD/UPDATE NATIONAL ID
                new_national_id = generate_national_id()
                
                national_id_patterns = [
                    r'(<national_id[^>]*>)([^<]*)(</national_id>)',
                    r'(<NationalId[^>]*>)([^<]*)(</NationalId>)',
                    r'(<id_number[^>]*type=["\']national["\'][^>]*>)([^<]*)(</id_number>)',
                    r'(<ssn[^>]*>)([^<]*)(</ssn>)',
                ]
                
                national_id_updated = False
                for pattern in national_id_patterns:
                    match = re.search(pattern, modified_record, re.IGNORECASE)
                    if match:
                        original_national_id = match.group(2)
                        modified_record = re.sub(
                            pattern,
                            rf'\g<1>{new_national_id}\g<3>',
                            modified_record,
                            count=1,
                            flags=re.IGNORECASE
                        )
                        logger.info(f"  NATIONAL ID UPDATED: '{original_national_id}' -> '{new_national_id}'")
                        changes_log['national_id_modified'].append({
                            'uid': new_uid if uid_match else original_uid,
                            'original': original_national_id,
                            'new': new_national_id,
                            'action': 'updated'
                        })
                        national_id_updated = True
                        break
                
                # If no national ID found, try to add one
                if not national_id_updated:
                    id_section_patterns = [
                        (r'(</identifications>)', f'<identification type="national_id">{new_national_id}</identification>\\1'),
                        (r'(</ids>)', f'<id type="national_id">{new_national_id}</id>\\1'),
                        (r'(<identifications[^>]*>)', f'\\1<identification type="national_id">{new_national_id}</identification>'),
                    ]
                    
                    for pattern, replacement in id_section_patterns:
                        if re.search(pattern, modified_record, re.IGNORECASE):
                            modified_record = re.sub(pattern, replacement, modified_record, count=1, flags=re.IGNORECASE)
                            logger.info(f"  NATIONAL ID ADDED: '{new_national_id}'")
                            changes_log['national_id_modified'].append({
                                'uid': new_uid if uid_match else original_uid,
                                'original': None,
                                'new': new_national_id,
                                'action': 'added'
                            })
                            national_id_updated = True
                            break
                
                # 4. MODIFY ALIAS
                alias_pattern = r'(<alias[^>]*>)([^<]+)(</alias>)'
                alias_match = re.search(alias_pattern, modified_record, re.IGNORECASE)
                if alias_match:
                    original_alias = alias_match.group(2)
                    new_alias = f"MODIFIED_{original_alias}"
                    modified_record = re.sub(
                        alias_pattern,
                        rf'\g<1>{new_alias}\g<3>',
                        modified_record,
                        count=1,
                        flags=re.IGNORECASE
                    )
                    logger.info(f"  ALIAS: '{original_alias[:30]}...' -> '{new_alias[:40]}...'")
                    changes_log['alias_modified'].append({
                        'uid': new_uid if uid_match else original_uid,
                        'original': original_alias[:50],
                        'new': new_alias[:50]
                    })
                
                # 5. MODIFY DOB
                dob_pattern = r'(<dob[^>]*>)(\d{4}-\d{2}-\d{2})(</dob>)'
                dob_match = re.search(dob_pattern, modified_record, re.IGNORECASE)
                if dob_match:
                    original_dob = dob_match.group(2)
                    try:
                        dt = datetime.strptime(original_dob, '%Y-%m-%d')
                        new_dt = dt + timedelta(days=random.randint(30, 365))
                        new_dob = new_dt.strftime('%Y-%m-%d')
                    except:
                        new_dob = f"{original_dob}_MOD"
                    
                    modified_record = re.sub(
                        dob_pattern,
                        rf'\g<1>{new_dob}\g<3>',
                        modified_record,
                        count=1,
                        flags=re.IGNORECASE
                    )
                    logger.info(f"  DOB: '{original_dob}' -> '{new_dob}'")
                    changes_log['dob_modified'].append({
                        'uid': new_uid if uid_match else original_uid,
                        'original': original_dob,
                        'new': new_dob
                    })
                
                records[i] = modified_record
            
            # Reconstruct XML
            logger.info("\n--- RECONSTRUCTING XML ---")
            
            # Get header and footer
            first_record_pos = xml_content.lower().find('<record')
            last_record_end = xml_content.lower().rfind('</record>') + len('</record>')
            
            header = xml_content[:first_record_pos]
            footer = xml_content[last_record_end:]
            
            new_xml = header + '\n'.join(records) + footer
            logger.info(f"New XML size: {len(new_xml)} chars")
            
            # Create new file
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            new_filename = f"premium-world-check_8370_EU_PR_modified_{timestamp}.xml.gz"
            local_new = os.path.join(tmpdir, new_filename)
            
            logger.info(f"\nCompressing to: {new_filename}")
            with gzip.open(local_new, 'wt', encoding='utf-8') as f:
                f.write(new_xml)
            
            file_size = os.path.getsize(local_new)
            logger.info(f"Compressed size: {file_size} bytes")
            
            # MD5
            md5 = generate_md5_for_file(local_new)
            logger.info(f"MD5: {md5}")
            
            md5_filename = f"{new_filename}.md5"
            local_md5 = os.path.join(tmpdir, md5_filename)
            # MD5 file format: checksum followed by two spaces and filename (binary mode indicator)
            # Standard format: <md5hash> *<filename> for binary or <md5hash>  <filename> for text
            with open(local_md5, 'w') as f:
                f.write(f"{md5} *{new_filename}\n")
            
            logger.info(f"MD5 file content: {md5} *{new_filename}")
            
            # Upload (disable confirm to avoid size mismatch issues)
            logger.info(f"\nUploading files...")
            sftp.put(local_new, f"{SOURCE_PATH}/{new_filename}", confirm=False)
            logger.info(f"Uploaded: {new_filename}")
            sftp.put(local_md5, f"{SOURCE_PATH}/{md5_filename}", confirm=False)
            logger.info(f"Uploaded: {md5_filename}")
            
            # Verify upload
            remote_stat = sftp.stat(f"{SOURCE_PATH}/{new_filename}")
            logger.info(f"Remote file size: {remote_stat.st_size} bytes")
            
            # Summary
            logger.info("\n" + "=" * 60)
            logger.info("CHANGE SUMMARY")
            logger.info("=" * 60)
            logger.info(f"Records deleted: {len(changes_log['deleted'])}")
            logger.info(f"IDs changed: {len(changes_log['id_changed'])}")
            logger.info(f"Passports modified: {len(changes_log['passport_modified'])}")
            logger.info(f"National IDs modified: {len(changes_log['national_id_modified'])}")
            logger.info(f"Aliases modified: {len(changes_log['alias_modified'])}")
            logger.info(f"DOBs modified: {len(changes_log['dob_modified'])}")
            
            logger.info("\n--- DELETED RECORDS ---")
            for item in changes_log['deleted']:
                logger.info(f"  index={item['index']}, uid={item['uid']}")
            
            logger.info("\n--- ID CHANGES (first 20) ---")
            for item in changes_log['id_changed'][:20]:
                logger.info(f"  {item['original']} -> {item['new']}")
            
            logger.info("\n--- PASSPORT CHANGES (first 20) ---")
            for item in changes_log['passport_modified'][:20]:
                logger.info(f"  uid={item['uid']}: {item['action']} - {item.get('original', 'N/A')} -> {item['new']}")
            
            logger.info("\n--- NATIONAL ID CHANGES (first 20) ---")
            for item in changes_log['national_id_modified'][:20]:
                logger.info(f"  uid={item['uid']}: {item['action']} - {item.get('original', 'N/A')} -> {item['new']}")
            
            logger.info("\n" + "=" * 60)
            logger.info("COMPLETED SUCCESSFULLY!")
            logger.info("=" * 60)
            logger.info(f"New file: {new_filename}")
            logger.info(f"MD5: {md5}")
            logger.info(f"Log file: xml_modification_v3.log")
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        ssh.close()
        logger.info("Connection closed.")


if __name__ == "__main__":
    main()
