#!/usr/bin/env python3
"""
SFTP script to:
1. Connect to SFTP server
2. Analyze the original file premium-world-check_8370_EU_PR_latest.xml.gz
3. Create a zero-byte file with a similar naming pattern
4. Generate MD5 checksum for the zero-byte file
5. Upload both files to the target path
"""

import paramiko
import hashlib
import os
import tempfile
from datetime import datetime

# SFTP Configuration
SFTP_HOST = "test.ftp.facctum.ai"
SFTP_USER = "sftp-test-user1"
SFTP_PASSWORD = "f@cctUser1"
SFTP_PORT = 22

# Paths
SOURCE_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"
TARGET_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"
ORIGINAL_FILE = "premium-world-check_8370_EU_PR_latest.xml.gz"

def generate_md5_for_file(file_path):
    """Generate MD5 checksum for a file"""
    md5_hash = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()

def create_zero_byte_filename(original_name):
    """Create a new filename based on original pattern"""
    # Pattern: premium-world-check_8370_EU_PR_latest.xml.gz
    # New: premium-world-check_0000_EU_PR_test.xml.gz
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"premium-world-check_0000_EU_PR_test_{timestamp}.xml.gz"

def main():
    print(f"Connecting to SFTP server: {SFTP_HOST}")
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Connect to SFTP
        ssh.connect(SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = ssh.open_sftp()
        print("Connected successfully!")
        
        # List files in source directory
        print(f"\nListing files in: {SOURCE_PATH}")
        try:
            files = sftp.listdir(SOURCE_PATH)
            print(f"Files found: {len(files)}")
            for f in files:
                print(f"  - {f}")
        except Exception as e:
            print(f"Error listing directory: {e}")
        
        # Check if original file exists
        original_full_path = f"{SOURCE_PATH}/{ORIGINAL_FILE}"
        print(f"\nChecking original file: {original_full_path}")
        try:
            file_stat = sftp.stat(original_full_path)
            print(f"Original file found!")
            print(f"  Size: {file_stat.st_size} bytes")
            print(f"  Modified: {datetime.fromtimestamp(file_stat.st_mtime)}")
        except FileNotFoundError:
            print(f"Original file not found at {original_full_path}")
        
        # Create zero-byte file locally
        new_filename = create_zero_byte_filename(ORIGINAL_FILE)
        print(f"\nCreating zero-byte file: {new_filename}")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create zero-byte file
            local_zero_file = os.path.join(tmpdir, new_filename)
            with open(local_zero_file, 'wb') as f:
                pass  # Creates empty file
            
            # Generate MD5 for zero-byte file
            md5_checksum = generate_md5_for_file(local_zero_file)
            print(f"MD5 checksum: {md5_checksum}")
            
            # Create MD5 file
            md5_filename = f"{new_filename}.md5"
            local_md5_file = os.path.join(tmpdir, md5_filename)
            with open(local_md5_file, 'w') as f:
                f.write(f"{md5_checksum}  {new_filename}\n")
            
            print(f"Created MD5 file: {md5_filename}")
            
            # Upload zero-byte file
            remote_zero_file = f"{TARGET_PATH}/{new_filename}"
            print(f"\nUploading: {new_filename} -> {remote_zero_file}")
            sftp.put(local_zero_file, remote_zero_file)
            print("Zero-byte file uploaded successfully!")
            
            # Upload MD5 file
            remote_md5_file = f"{TARGET_PATH}/{md5_filename}"
            print(f"Uploading: {md5_filename} -> {remote_md5_file}")
            sftp.put(local_md5_file, remote_md5_file)
            print("MD5 file uploaded successfully!")
            
            # Verify uploads
            print("\nVerifying uploads...")
            uploaded_stat = sftp.stat(remote_zero_file)
            print(f"  {new_filename}: {uploaded_stat.st_size} bytes")
            md5_stat = sftp.stat(remote_md5_file)
            print(f"  {md5_filename}: {md5_stat.st_size} bytes")
        
        print("\n✓ All operations completed successfully!")
        
    except paramiko.AuthenticationException:
        print("Authentication failed. Check username/password.")
    except paramiko.SSHException as e:
        print(f"SSH error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    main()
