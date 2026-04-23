#!/usr/bin/env python3
"""
SFTP script to create MD5 checksum file for world-check-native-character-names.xml.gz
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
TARGET_PATH = "/home/sftp-test-user1/Handcrafted_LSEG_PRE/RefinitiveHandcraftedData"
TARGET_FILE = "world-check-native-character-names.xml.gz"

def generate_md5_for_file(file_path):
    """Generate MD5 checksum for a file"""
    md5_hash = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()

def main():
    print(f"Connecting to SFTP server: {SFTP_HOST}")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(SFTP_HOST, port=SFTP_PORT, username=SFTP_USER, password=SFTP_PASSWORD)
        sftp = ssh.open_sftp()
        print("Connected successfully!")
        
        remote_file = f"{TARGET_PATH}/{TARGET_FILE}"
        print(f"\nTarget file: {remote_file}")
        
        # Check if file exists
        try:
            file_stat = sftp.stat(remote_file)
            print(f"File found! Size: {file_stat.st_size} bytes")
        except FileNotFoundError:
            print(f"ERROR: File not found: {remote_file}")
            return
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Download file
            local_file = os.path.join(tmpdir, TARGET_FILE)
            print(f"\nDownloading {TARGET_FILE}...")
            sftp.get(remote_file, local_file)
            print("Download complete!")
            
            # Generate MD5
            md5_checksum = generate_md5_for_file(local_file)
            print(f"MD5 checksum: {md5_checksum}")
            
            # Create MD5 file
            md5_filename = f"{TARGET_FILE}.md5"
            local_md5_file = os.path.join(tmpdir, md5_filename)
            with open(local_md5_file, 'w') as f:
                f.write(f"{md5_checksum}  {TARGET_FILE}\n")
            
            # Upload MD5 file
            remote_md5_file = f"{TARGET_PATH}/{md5_filename}"
            print(f"\nUploading: {md5_filename}")
            sftp.put(local_md5_file, remote_md5_file)
            print("MD5 file uploaded successfully!")
            
            # Verify
            md5_stat = sftp.stat(remote_md5_file)
            print(f"Verified: {md5_filename} ({md5_stat.st_size} bytes)")
        
        print("\n✓ MD5 file created successfully!")
        
    except paramiko.AuthenticationException:
        print("Authentication failed.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    main()
