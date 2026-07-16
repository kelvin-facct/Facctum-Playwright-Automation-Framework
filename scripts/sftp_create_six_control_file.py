"""
SIX Securities Control File Generator
=======================================
Connects to SFTP, validates data files for correct format (headers, delimiter,
column count), then generates the SSMS_Delivery_XXXX_ChkSum.csv control file.

Supports all 4 file types:
  - INSTR (instruments) — FULL and DELTA
  - ISSUER — FULL and DELTA
  - STRUCT (structured products) — FULL and DELTA
  - OPTIONS — FULL and DELTA

Usage:
  python sftp_create_six_control_file.py <sftp_directory> [delivery_id]
  python sftp_create_six_control_file.py six_securities/latest
  python sftp_create_six_control_file.py six_securities/latest 3900

The script will:
  1. List all CSV data files in the directory
  2. Validate each file's format (header columns, delimiter, consistency)
  3. Calculate line count, file size, MD5, SHA256
  4. Generate and upload the control file
"""

import paramiko
import hashlib
import sys
import os
from datetime import datetime

# --- SFTP Configuration ---
SFTP_HOST = "test.ftp.facctum.ai"
SFTP_PORT = 22
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"

# --- Expected Headers for each file type ---
# These are the first few key columns that MUST be present for validation
EXPECTED_HEADERS = {
    "INSTR": [
        "SANCTIONED", "RECORD_ORIGIN", "OLS_YES", "OLS_NO", "LINK_ENTITY",
        "LINK_CSID", "NAME_DIRECT_ISSUER", "SANCTIONED_PARENT_ENTITY",
        "CONFIDENCE_LEVEL", "ISIN", "INSTR_NAME", "FISN", "CH_VALOR",
    ],
    "ISSUER": [
        "GK_CODE", "CSID", "SCOPE", "SANCTIONED_PARENT_ENTITY",
        "CONFIDENCE_LEVEL", "INSTI_SHORTNAME", "INSTI_NAME",
    ],
    "STRUCT": [
        "HOST_CH", "HOST_ISIN", "HOST_GK", "HOST_ISSUER_SHORTNAME",
        "DESCRIPTION", "FISN", "DATE_OPENED_IN_SIX",
    ],
    "OPTIONS": [
        "CH_OPTION", "ISIN_OPTION", "DESCRIPTION", "FISN",
        "ISSUER_GK", "ISSUER_NAME", "DATE_OPENED_IN_SIX",
    ],
}

DELIMITER = ";"


def connect_sftp():
    """Connect to SFTP server."""
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    print(f"✅ Connected to {SFTP_USER}@{SFTP_HOST}")
    return transport, sftp


def detect_file_type(filename):
    """Detect file type from filename: INSTR, ISSUER, STRUCT, OPTIONS."""
    fname_upper = filename.upper()
    if "_INSTR_" in fname_upper:
        return "INSTR"
    elif "_ISSUER_" in fname_upper:
        return "ISSUER"
    elif "_STRUCT_" in fname_upper:
        return "STRUCT"
    elif "_OPTIONS_" in fname_upper:
        return "OPTIONS"
    return None


def detect_delivery_type(filename):
    """Detect if FULL or DELTA."""
    fname_upper = filename.upper()
    if "_FULL_" in fname_upper:
        return "FULL"
    elif "_DELTA_" in fname_upper:
        return "DELTA"
    return None


def validate_file(sftp, filepath, filename):
    """
    Validate a data file for correct format.
    Returns (is_valid, error_message, line_count, file_size)
    """
    file_type = detect_file_type(filename)
    if not file_type:
        return False, f"Unknown file type: {filename}", 0, 0

    delivery_type = detect_delivery_type(filename)
    if not delivery_type:
        return False, f"Cannot determine FULL/DELTA: {filename}", 0, 0

    # Get file size
    stat = sftp.stat(filepath)
    file_size = stat.st_size

    if file_size == 0:
        return False, f"File is empty (0 bytes): {filename}", 0, 0

    # Read file for validation (stream to handle large files)
    errors = []
    line_count = 0
    header_columns = []
    expected_col_count = 0
    sample_errors = 0
    max_sample_lines = 100  # validate first 100 data lines for consistency

    with sftp.open(filepath, "rb") as f:
        first_line = True
        for raw_line in f:
            line = raw_line.decode("utf-8", errors="replace").rstrip("\n").rstrip("\r")

            if first_line:
                # Validate header
                first_line = False
                header_columns = line.split(DELIMITER)
                # Remove trailing empty column if line ends with delimiter
                if header_columns and header_columns[-1] == "":
                    header_columns = header_columns[:-1]
                expected_col_count = len(header_columns)

                # Check required columns exist
                expected = EXPECTED_HEADERS.get(file_type, [])
                for col in expected:
                    if col not in header_columns:
                        errors.append(f"Missing required column: '{col}'")

                if expected_col_count < 5:
                    errors.append(f"Too few columns ({expected_col_count}), expected 5+")

                # Verify delimiter is semicolon
                if ";" not in line and "," in line:
                    errors.append("File appears to use comma delimiter instead of semicolon")

                continue

            line_count += 1

            # Validate column count consistency (sample first N lines)
            if sample_errors < 5 and line_count <= max_sample_lines:
                cols = line.split(DELIMITER)
                if cols and cols[-1] == "":
                    cols = cols[:-1]
                if len(cols) != expected_col_count and line.strip():
                    sample_errors += 1
                    errors.append(
                        f"Line {line_count + 1}: column count {len(cols)} != header count {expected_col_count}"
                    )

    # For DELTA files, 0 lines is valid (no changes)
    if delivery_type == "FULL" and line_count == 0:
        errors.append("FULL file has 0 data lines")

    is_valid = len(errors) == 0
    error_msg = "; ".join(errors[:5]) if errors else ""

    return is_valid, error_msg, line_count, file_size


def calculate_checksums(sftp, filepath):
    """Calculate MD5 and SHA256 for a remote file."""
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()

    with sftp.open(filepath, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            md5.update(chunk)
            sha256.update(chunk)

    return md5.hexdigest(), sha256.hexdigest()


def generate_control_file(sftp, directory, delivery_id=None):
    """
    Main function: validate all data files and generate control file.
    """
    print(f"\n📁 Directory: {directory}")

    # List CSV files (exclude existing control/checksum files)
    all_files = sftp.listdir(directory)
    data_files = [
        f for f in all_files
        if f.endswith(".csv")
        and "ChkSum" not in f
        and "CLF_" not in f
        and detect_file_type(f) is not None
    ]

    if not data_files:
        print("❌ No valid SIX Securities data files found in directory.")
        return

    data_files.sort()
    print(f"   Found {len(data_files)} data file(s):\n")

    # Step 1: Validate all files
    print("=" * 70)
    print("STEP 1: VALIDATING FILE FORMAT")
    print("=" * 70)

    valid_files = []
    all_valid = True

    for filename in data_files:
        filepath = f"{directory}/{filename}"
        file_type = detect_file_type(filename)
        delivery_type = detect_delivery_type(filename)

        print(f"\n  [{file_type} {delivery_type}] {filename}")

        is_valid, error_msg, line_count, file_size = validate_file(sftp, filepath, filename)

        if is_valid:
            print(f"    ✅ Valid | Lines: {line_count} | Size: {file_size:,} bytes")
            valid_files.append({
                "filename": filename,
                "filepath": filepath,
                "line_count": line_count,
                "file_size": file_size,
            })
        else:
            print(f"    ❌ INVALID: {error_msg}")
            all_valid = False

    if not all_valid:
        print("\n⚠️  Some files failed validation. Control file will still be generated for valid files.")

    if not valid_files:
        print("\n❌ No valid files to create control file for.")
        return

    # Step 2: Calculate checksums
    print(f"\n{'=' * 70}")
    print("STEP 2: CALCULATING CHECKSUMS")
    print("=" * 70)

    control_entries = []
    for vf in valid_files:
        print(f"\n  Hashing: {vf['filename']}...", end="", flush=True)
        md5_hash, sha256_hash = calculate_checksums(sftp, vf["filepath"])
        print(f" done")
        print(f"    MD5:    {md5_hash}")
        print(f"    SHA256: {sha256_hash}")

        control_entries.append({
            "filename": vf["filename"],
            "nr_lines": vf["line_count"],
            "file_size": vf["file_size"],
            "md5": md5_hash,
            "sha256": sha256_hash,
        })

    # Step 3: Generate control file
    print(f"\n{'=' * 70}")
    print("STEP 3: GENERATING CONTROL FILE")
    print("=" * 70)

    # Auto-generate delivery ID if not provided
    if not delivery_id:
        # Find existing control files to determine next ID
        existing_ctrl = [f for f in all_files if "ChkSum" in f and "SSMS_Delivery" in f]
        if existing_ctrl:
            # Extract max delivery ID
            ids = []
            for cf in existing_ctrl:
                parts = cf.replace("SSMS_Delivery_", "").replace("_ChkSum.csv", "")
                try:
                    ids.append(int(parts))
                except ValueError:
                    pass
            delivery_id = max(ids) + 1 if ids else 9999
        else:
            delivery_id = 9999

    control_filename = f"SSMS_Delivery_{delivery_id}_ChkSum.csv"
    control_filepath = f"{directory}/{control_filename}"

    # Build content
    lines = ["File_Name;Nr_Lines;File_Size;md5sum;sha256sum;"]
    for entry in control_entries:
        lines.append(
            f"{entry['filename']};{entry['nr_lines']};{entry['file_size']};"
            f"{entry['md5']};{entry['sha256']};"
        )

    content = "\n".join(lines) + "\n"

    print(f"\n  Control file: {control_filename}")
    print(f"  Entries: {len(control_entries)}")
    print(f"\n  Content:")
    print(f"  {'-' * 60}")
    for line in lines:
        print(f"  {line[:120]}")

    # Upload
    with sftp.open(control_filepath, "w") as f:
        f.write(content)

    print(f"\n  ✅ Uploaded to: {control_filepath}")
    return control_filepath


def main():
    if len(sys.argv) < 2:
        print("Usage: python sftp_create_six_control_file.py <sftp_directory> [delivery_id]")
        print("Example: python sftp_create_six_control_file.py six_securities/latest")
        print("         python sftp_create_six_control_file.py six_securities/latest 3900")
        sys.exit(1)

    directory = sys.argv[1].rstrip("/")
    delivery_id = int(sys.argv[2]) if len(sys.argv) > 2 else None

    transport, sftp = connect_sftp()
    try:
        generate_control_file(sftp, directory, delivery_id)
    finally:
        sftp.close()
        transport.close()
        print("\n🔒 Connection closed.")


if __name__ == "__main__":
    main()
