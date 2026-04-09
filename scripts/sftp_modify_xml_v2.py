#!/usr/bin/env python3
"""
Optimized SFTP script to modify XML file
"""

import paramiko
import hashlib
import os
import gzip
import tempfile
import logging
import random
import re
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('xml_modification.log', mode='w')
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


def main():
    logger.info("=" * 60)
    logger.info("STARTING XML MODIFICATION PROCESS")
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
            
            # Read and decompress
            logger.info("Decompressing...")
            with gzip.open(local_gz, 'rt', encoding='utf-8') as f:
                xml_content = f.read()
            
            logger.info(f"XML size: {len(xml_content)} chars")
            
            # Analyze structure - find record pattern
            logger.info("\n--- ANALYZING XML STRUCTURE ---")
            
            # Find all record-like elements (common patterns)
            record_patterns = [
                r'<Record[^>]*>.*?</Record>',
                r'<record[^>]*>.*?</record>',
                r'<Entity[^>]*>.*?</Entity>',
                r'<entity[^>]*>.*?</entity>',
                r'<Person[^>]*>.*?</Person>',
                r'<person[^>]*>.*?</person>',
                r'<Entry[^>]*>.*?</Entry>',
            ]
            
            records = []
            record_tag = None
            
            for pattern in record_patterns:
                matches = re.findall(pattern, xml_content, re.DOTALL | re.IGNORECASE)
                if matches:
                    records = matches
                    record_tag = re.search(r'<(\w+)', pattern).group(1)
                    logger.info(f"Found {len(matches)} records with tag <{record_tag}>")
                    break
            
            if not records:
                # Try to find any repeating top-level elements
                logger.info("Searching for repeating elements...")
                root_match = re.match(r'<\?xml[^>]*\?>\s*<(\w+)[^>]*>', xml_content)
                if root_match:
                    root_tag = root_match.group(1)
                    logger.info(f"Root element: <{root_tag}>")
                    
                    # Find children of root
                    inner_match = re.search(rf'<{root_tag}[^>]*>(.*)</{root_tag}>', xml_content, re.DOTALL)
                    if inner_match:
                        inner = inner_match.group(1)
                        # Find first child tag
                        child_match = re.search(r'<(\w+)[^>]*>', inner)
                        if child_match:
                            child_tag = child_match.group(1)
                            pattern = rf'<{child_tag}[^>]*>.*?</{child_tag}>'
                            records = re.findall(pattern, inner, re.DOTALL)
                            record_tag = child_tag
                            logger.info(f"Found {len(records)} <{child_tag}> elements")
            
            if not records:
                logger.error("Could not identify record structure!")
                # Show sample of XML
                logger.info(f"First 2000 chars:\n{xml_content[:2000]}")
                return
            
            # Show sample record
            logger.info(f"\n--- SAMPLE RECORD (first 500 chars) ---")
            logger.info(records[0][:500] + "...")
            
            changes_log = []
            total_records = len(records)
            
            # Select 10 records to delete
            delete_indices = sorted(random.sample(range(total_records), min(10, total_records)), reverse=True)
            logger.info(f"\n--- DELETING {len(delete_indices)} RECORDS ---")
            
            for idx in delete_indices:
                # Extract ID from record
                id_match = re.search(r'(?:id|ID|Id)=["\']([^"\']+)["\']', records[idx])
                record_id = id_match.group(1) if id_match else f"index_{idx}"
                logger.info(f"DELETED: Record at index {idx}, ID: {record_id}")
                changes_log.append(f"DELETED: index={idx}, id={record_id}")
            
            # Remove deleted records from list
            for idx in delete_indices:
                records.pop(idx)
            
            logger.info(f"Records after deletion: {len(records)}")
            
            # Modify aliases and DOBs in first 20 records
            logger.info(f"\n--- MODIFYING ALIASES AND DOBs ---")
            modify_count = min(20, len(records))
            
            for i in range(modify_count):
                record = records[i]
                modified_record = record
                
                # Extract record ID
                id_match = re.search(r'(?:id|ID|Id)=["\']([^"\']+)["\']', record)
                record_id = id_match.group(1) if id_match else f"index_{i}"
                
                # Modify alias/name
                alias_patterns = [
                    (r'(<(?:Alias|alias|AliasName|aliasName)[^>]*>)([^<]+)(</)', r'\1MODIFIED_\2\3'),
                    (r'(<(?:Name|name|FullName|fullName)[^>]*>)([^<]+)(</)', r'\1MODIFIED_\2\3'),
                    (r'(alias=["\'])([^"\']+)(["\'])', r'\1MODIFIED_\2\3'),
                    (r'(name=["\'])([^"\']+)(["\'])', r'\1MODIFIED_\2\3'),
                ]
                
                for pattern, replacement in alias_patterns:
                    match = re.search(pattern, modified_record, re.IGNORECASE)
                    if match:
                        original = match.group(2)
                        modified_record = re.sub(pattern, replacement, modified_record, count=1, flags=re.IGNORECASE)
                        logger.info(f"Record {record_id}: Alias '{original[:30]}...' -> 'MODIFIED_{original[:30]}...'")
                        changes_log.append(f"ALIAS MODIFIED: id={record_id}, original={original[:50]}")
                        break
                
                # Modify DOB
                dob_patterns = [
                    (r'(<(?:DOB|dob|DateOfBirth|dateOfBirth|BirthDate|birthDate)[^>]*>)(\d{4}-\d{2}-\d{2})(</)', 'date'),
                    (r'(<(?:DOB|dob|DateOfBirth|dateOfBirth|BirthDate|birthDate)[^>]*>)(\d{4})(</)', 'year'),
                    (r'((?:dob|dateOfBirth|birthDate)=["\'])(\d{4}-\d{2}-\d{2})(["\'])', 'date'),
                    (r'((?:dob|dateOfBirth|birthDate)=["\'])(\d{4})(["\'])', 'year'),
                ]
                
                for pattern, date_type in dob_patterns:
                    match = re.search(pattern, modified_record, re.IGNORECASE)
                    if match:
                        original = match.group(2)
                        if date_type == 'date':
                            try:
                                dt = datetime.strptime(original, '%Y-%m-%d')
                                new_dt = dt + timedelta(days=random.randint(30, 365))
                                new_val = new_dt.strftime('%Y-%m-%d')
                            except:
                                new_val = f"{original}_MOD"
                        else:
                            new_val = str(int(original) + random.randint(1, 5))
                        
                        modified_record = re.sub(pattern, rf'\g<1>{new_val}\g<3>', modified_record, count=1, flags=re.IGNORECASE)
                        logger.info(f"Record {record_id}: DOB '{original}' -> '{new_val}'")
                        changes_log.append(f"DOB MODIFIED: id={record_id}, original={original}, new={new_val}")
                        break
                
                records[i] = modified_record
            
            # Reconstruct XML
            logger.info("\n--- RECONSTRUCTING XML ---")
            
            # Get header and footer
            first_record_pos = xml_content.find(f'<{record_tag}')
            last_record_end = xml_content.rfind(f'</{record_tag}>') + len(f'</{record_tag}>')
            
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
            with open(local_md5, 'w') as f:
                f.write(f"{md5}  {new_filename}\n")
            
            # Upload
            logger.info(f"\nUploading files...")
            sftp.put(local_new, f"{SOURCE_PATH}/{new_filename}")
            logger.info(f"Uploaded: {new_filename}")
            sftp.put(local_md5, f"{SOURCE_PATH}/{md5_filename}")
            logger.info(f"Uploaded: {md5_filename}")
            
            # Summary
            logger.info("\n" + "=" * 60)
            logger.info("CHANGE SUMMARY")
            logger.info("=" * 60)
            for change in changes_log:
                logger.info(change)
            
            logger.info("\n" + "=" * 60)
            logger.info("✓ COMPLETED SUCCESSFULLY!")
            logger.info("=" * 60)
            logger.info(f"New file: {new_filename}")
            logger.info(f"MD5: {md5}")
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        ssh.close()
        logger.info("Connection closed.")


if __name__ == "__main__":
    main()
