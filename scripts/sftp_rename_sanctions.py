"""
SFTP Sanctions File Rename
Picks one set of 5 files, renames to today's date. Simple rename only.

Usage:
    python scripts/sftp_rename_sanctions.py
    python scripts/sftp_rename_sanctions.py --dir Sanction03262026 --date 05182026_021500
"""

import paramiko
import re
import stat
import argparse
from datetime import datetime

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_PORT = 22
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"
BASE_DIR = "IHSMarkit"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default="Sanction03262026")
    parser.add_argument("--date", default=None, help="Source date to rename (MMDDYYYY_HHMMSS). If not set, picks oldest.")
    args = parser.parse_args()

    now = datetime.now()
    new_date = f"{now.strftime('%m%d%Y')}_{now.strftime('%H%M%S')}"

    print(f"Connecting to {SFTP_HOST}...")
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    print(f"Connected.")

    try:
        working_dir = f"/home/{SFTP_USER}/{BASE_DIR}/{args.dir}"
        sftp.chdir(working_dir)
        print(f"Dir: {working_dir}")

        # List files
        all_files = sorted([e.filename for e in sftp.listdir_attr() if not stat.S_ISDIR(e.st_mode)])
        dates = sorted(set(m.group(1) for f in all_files if (m := re.search(r'_(\d{8}_\d{6})\.', f))))

        print(f"Files: {len(all_files)} | Date groups: {dates}")

        # Pick source date
        if args.date:
            src_date = args.date
        else:
            src_date = dates[0] if dates else None

        if not src_date:
            print("No date groups found.")
            return

        source_files = [f for f in all_files if src_date in f]
        if not source_files:
            print(f"No files with date {src_date}")
            return

        print(f"\nRenaming {len(source_files)} files: {src_date} -> {new_date}")
        for f in source_files:
            new_name = f.replace(src_date, new_date)
            sftp.rename(f"{working_dir}/{f}", f"{working_dir}/{new_name}")
            print(f"  ✓ {f} -> {new_name}")

        print(f"\nDONE! {len(source_files)} files renamed.")

    finally:
        sftp.close()
        transport.close()
        print("Connection closed.")


if __name__ == "__main__":
    main()
