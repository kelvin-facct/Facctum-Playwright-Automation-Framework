#!/usr/bin/env python3
"""
SFTP script to:
1. Download premium-world-check_8370_EU_PR_latest.xml.gz
2. Analyze XML structure
3. Modify aliases and DOB attributes
4. Delete 10 records
5. Create new file with MD5 checksum
6. Upload to SFTP
7. Log all changes
"""

import paramiko
import hashlib
import os
import gzip
import tempfile
import logging
import random
from datetime import datetime, timedelta
from lxml import etree

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

# Paths
SOURCE_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"
ORIGINAL_FILE = "premium-world-check_8370_EU_PR_latest.xml.gz"


def generate_md5_for_file(file_path):
    """Generate MD5 checksum for a file"""
    md5_hash = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()


def analyze_xml_structure(root):
    """Analyze and log XML structure"""
    logger.info("=" * 60)
    logger.info("XML STRUCTURE ANALYSIS")
    logger.info("=" * 60)
    
    logger.info(f"Root element: {root.tag}")
    
    # Count children
    children = list(root)
    logger.info(f"Total root children (records): {len(children)}")
    
    if children:
        # Analyze first record structure
        first_record = children[0]
        logger.info(f"\nFirst record tag: {first_record.tag}")
        logger.info(f"First record attributes: {dict(first_record.attrib)}")
        
        # Find all unique element tags in first record
        all_tags = set()
        for elem in first_record.iter():
            all_tags.add(elem.tag)
        logger.info(f"\nUnique element tags in first record: {sorted(all_tags)}")
        
        # Look for alias and DOB related elements
        logger.info("\n--- Searching for Alias and DOB elements ---")
        for elem in first_record.iter():
            tag_lower = elem.tag.lower()
            if 'alias' in tag_lower or 'name' in tag_lower or 'dob' in tag_lower or 'birth' in tag_lower or 'date' in tag_lower:
                logger.info(f"Found: <{elem.tag}> = {elem.text[:100] if elem.text else 'None'}... Attrs: {dict(elem.attrib)}")
    
    return children


def modify_alias(elem, record_id, changes_log):
    """Modify alias/name elements"""
    modified = False
    for name_elem in elem.iter():
        tag_lower = name_elem.tag.lower()
        if ('alias' in tag_lower or 'name' in tag_lower) and name_elem.text:
            original = name_elem.text
            # Add "MODIFIED_" prefix
            name_elem.text = f"MODIFIED_{original}"
            changes_log.append({
                'record_id': record_id,
                'field': name_elem.tag,
                'original': original,
                'new': name_elem.text
            })
            modified = True
            break  # Only modify first alias/name found
    return modified


def modify_dob(elem, record_id, changes_log):
    """Modify DOB/birth date elements"""
    modified = False
    for date_elem in elem.iter():
        tag_lower = date_elem.tag.lower()
        if ('dob' in tag_lower or 'birth' in tag_lower or 'dateofbirth' in tag_lower) and date_elem.text:
            original = date_elem.text
            # Try to parse and modify date
            try:
                # Common date formats
                for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d', '%d/%m/%Y', '%Y']:
                    try:
                        dt = datetime.strptime(original.strip(), fmt)
                        # Add random days (1-365)
                        new_dt = dt + timedelta(days=random.randint(1, 365))
                        date_elem.text = new_dt.strftime(fmt)
                        changes_log.append({
                            'record_id': record_id,
                            'field': date_elem.tag,
                            'original': original,
                            'new': date_elem.text
                        })
                        modified = True
                        break
                    except ValueError:
                        continue
            except Exception:
                # If parsing fails, just append "_MOD"
                date_elem.text = f"{original}_MOD"
                changes_log.append({
                    'record_id': record_id,
                    'field': date_elem.tag,
                    'original': original,
                    'new': date_elem.text
                })
                modified = True
            if modified:
                break
    return modified


def main():
    logger.info("=" * 60)
    logger.info("STARTING XML MODIFICATION PROCESS")
    logger.info("=" * 60)
    logger.info(f"Connecting to SFTP server: {SFTP_HOST}")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = ssh.open_sftp()
        logger.info("Connected successfully!")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Download original file
            remote_file = f"{SOURCE_PATH}/{ORIGINAL_FILE}"
            local_gz_file = os.path.join(tmpdir, ORIGINAL_FILE)
            
            logger.info(f"\nDownloading: {remote_file}")
            sftp.get(remote_file, local_gz_file)
            logger.info(f"Downloaded: {os.path.getsize(local_gz_file)} bytes")
            
            # Decompress and parse XML
            logger.info("\nDecompressing and parsing XML...")
            with gzip.open(local_gz_file, 'rb') as f:
                xml_content = f.read()
            
            logger.info(f"Decompressed XML size: {len(xml_content)} bytes")
            
            # Parse XML
            root = etree.fromstring(xml_content)
            
            # Analyze structure
            records = analyze_xml_structure(root)
            total_records = len(records)
            
            logger.info("\n" + "=" * 60)
            logger.info("STARTING MODIFICATIONS")
            logger.info("=" * 60)
            
            changes_log = []
            deleted_records = []
            alias_modified_count = 0
            dob_modified_count = 0
            
            # Select 10 random records to delete
            if total_records > 10:
                delete_indices = sorted(random.sample(range(total_records), 10), reverse=True)
            else:
                delete_indices = list(range(min(10, total_records)))
            
            logger.info(f"\nRecords to delete (indices): {delete_indices}")
            
            # Delete records (from end to start to maintain indices)
            for idx in delete_indices:
                record = records[idx]
                record_id = record.get('id', record.get('ID', f'index_{idx}'))
                deleted_records.append({
                    'index': idx,
                    'id': record_id,
                    'tag': record.tag
                })
                root.remove(record)
                logger.info(f"DELETED record at index {idx}, ID: {record_id}")
            
            # Refresh records list after deletion
            records = list(root)
            logger.info(f"\nRecords after deletion: {len(records)}")
            
            # Modify aliases and DOBs in first 20 records (or all if less)
            modify_count = min(20, len(records))
            logger.info(f"\nModifying aliases and DOBs in {modify_count} records...")
            
            for i in range(modify_count):
                record = records[i]
                record_id = record.get('id', record.get('ID', f'index_{i}'))
                
                if modify_alias(record, record_id, changes_log):
                    alias_modified_count += 1
                
                if modify_dob(record, record_id, changes_log):
                    dob_modified_count += 1
            
            # Log all changes
            logger.info("\n" + "=" * 60)
            logger.info("CHANGE SUMMARY")
            logger.info("=" * 60)
            logger.info(f"Total records deleted: {len(deleted_records)}")
            logger.info(f"Aliases modified: {alias_modified_count}")
            logger.info(f"DOBs modified: {dob_modified_count}")
            
            logger.info("\n--- DELETED RECORDS ---")
            for dr in deleted_records:
                logger.info(f"  Index: {dr['index']}, ID: {dr['id']}, Tag: {dr['tag']}")
            
            logger.info("\n--- FIELD MODIFICATIONS ---")
            for change in changes_log:
                logger.info(f"  Record: {change['record_id']}")
                logger.info(f"    Field: {change['field']}")
                logger.info(f"    Original: {change['original'][:50]}..." if len(str(change['original'])) > 50 else f"    Original: {change['original']}")
                logger.info(f"    New: {change['new'][:50]}..." if len(str(change['new'])) > 50 else f"    New: {change['new']}")
            
            # Create new file
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            new_filename = f"premium-world-check_8370_EU_PR_modified_{timestamp}.xml.gz"
            local_new_file = os.path.join(tmpdir, new_filename)
            
            logger.info(f"\nCreating new file: {new_filename}")
            
            # Write modified XML to gzip file
            modified_xml = etree.tostring(root, encoding='unicode', pretty_print=True)
            with gzip.open(local_new_file, 'wt', encoding='utf-8') as f:
                f.write(modified_xml)
            
            new_file_size = os.path.getsize(local_new_file)
            logger.info(f"New file size: {new_file_size} bytes")
            
            # Generate MD5
            md5_checksum = generate_md5_for_file(local_new_file)
            logger.info(f"MD5 checksum: {md5_checksum}")
            
            # Create MD5 file
            md5_filename = f"{new_filename}.md5"
            local_md5_file = os.path.join(tmpdir, md5_filename)
            with open(local_md5_file, 'w') as f:
                f.write(f"{md5_checksum}  {new_filename}\n")
            
            # Upload files
            remote_new_file = f"{SOURCE_PATH}/{new_filename}"
            remote_md5_file = f"{SOURCE_PATH}/{md5_filename}"
            
            logger.info(f"\nUploading: {new_filename}")
            sftp.put(local_new_file, remote_new_file)
            logger.info("Modified XML file uploaded!")
            
            logger.info(f"Uploading: {md5_filename}")
            sftp.put(local_md5_file, remote_md5_file)
            logger.info("MD5 file uploaded!")
            
            # Verify
            logger.info("\nVerifying uploads...")
            stat = sftp.stat(remote_new_file)
            logger.info(f"  {new_filename}: {stat.st_size} bytes")
            stat = sftp.stat(remote_md5_file)
            logger.info(f"  {md5_filename}: {stat.st_size} bytes")
            
            logger.info("\n" + "=" * 60)
            logger.info("✓ ALL OPERATIONS COMPLETED SUCCESSFULLY!")
            logger.info("=" * 60)
            logger.info(f"New file: {new_filename}")
            logger.info(f"MD5 file: {md5_filename}")
            logger.info(f"Log file: xml_modification.log")
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        ssh.close()
        logger.info("\nConnection closed.")


if __name__ == "__main__":
    main()
