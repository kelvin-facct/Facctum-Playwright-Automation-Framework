"""Validate files in sixsecuritytest directory on SFTP."""
import sys
import os
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding="utf-8")

import paramiko
import hashlib

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_PORT = 22
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"
DELIMITER = ";"

EXPECTED_HEADERS = {
    "INSTR": ["SANCTIONED", "RECORD_ORIGIN", "OLS_YES", "OLS_NO", "LINK_ENTITY",
              "LINK_CSID", "NAME_DIRECT_ISSUER", "SANCTIONED_PARENT_ENTITY",
              "CONFIDENCE_LEVEL", "ISIN", "INSTR_NAME", "FISN", "CH_VALOR"],
    "ISSUER": ["GK_CODE", "CSID", "SCOPE", "SANCTIONED_PARENT_ENTITY",
               "CONFIDENCE_LEVEL", "INSTI_SHORTNAME", "INSTI_NAME"],
    "STRUCT": ["HOST_CH", "HOST_ISIN", "HOST_GK", "HOST_ISSUER_SHORTNAME",
               "DESCRIPTION", "FISN", "DATE_OPENED_IN_SIX"],
    "OPTIONS": ["CH_OPTION", "ISIN_OPTION", "DESCRIPTION", "FISN",
                "ISSUER_GK", "ISSUER_NAME", "DATE_OPENED_IN_SIX"],
}


def detect_file_type(filename):
    fname_upper = filename.upper()
    if "_INSTR_" in fname_upper: return "INSTR"
    elif "_ISSUER_" in fname_upper: return "ISSUER"
    elif "_STRUCT_" in fname_upper: return "STRUCT"
    elif "_OPTIONS_" in fname_upper: return "OPTIONS"
    return None


def detect_delivery_type(filename):
    fname_upper = filename.upper()
    if "_FULL_" in fname_upper: return "FULL"
    elif "_DELTA_" in fname_upper: return "DELTA"
    return None


def validate_file(sftp, filepath, filename):
    file_type = detect_file_type(filename)
    delivery_type = detect_delivery_type(filename)
    if not file_type:
        return False, "Unknown file type", 0, 0

    stat = sftp.stat(filepath)
    file_size = stat.st_size
    if file_size == 0:
        return False, "File is empty", 0, 0

    errors = []
    line_count = 0
    expected_col_count = 0
    bad_rows = 0

    with sftp.open(filepath, "rb") as f:
        first_line = True
        for raw_line in f:
            line = raw_line.decode("utf-8", errors="replace").rstrip("\n").rstrip("\r")
            if first_line:
                first_line = False
                header_columns = line.split(DELIMITER)
                if header_columns and header_columns[-1] == "":
                    header_columns = header_columns[:-1]
                expected_col_count = len(header_columns)

                # Check required columns
                expected = EXPECTED_HEADERS.get(file_type, [])
                for col in expected:
                    if col not in header_columns:
                        errors.append(f"Missing column: '{col}'")

                if expected_col_count < 5:
                    errors.append(f"Too few columns ({expected_col_count})")
                continue

            line_count += 1

            # Check column count for ALL rows
            cols = line.split(DELIMITER)
            if cols and cols[-1] == "":
                row_col_count = len(cols) - 1
            else:
                row_col_count = len(cols)

            if row_col_count != expected_col_count and line.strip():
                bad_rows += 1
                if bad_rows <= 3:
                    errors.append(f"Row {line_count}: got {row_col_count} cols, expected {expected_col_count}")

    if bad_rows > 3:
        errors.append(f"...and {bad_rows - 3} more rows with column mismatch")

    if delivery_type == "FULL" and line_count == 0:
        errors.append("FULL file has 0 data lines")

    is_valid = len(errors) == 0
    return is_valid, "; ".join(errors[:5]) if errors else "", line_count, file_size


# Main
print("Connecting to SFTP...")
transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
transport.connect(username=SFTP_USER, password=SFTP_PASS)
sftp = paramiko.SFTPClient.from_transport(transport)
print("Connected!\n")

directory = "sixsecuritytest"
print(f"Directory: {directory}/")

all_files = sftp.listdir(directory)
data_files = [f for f in all_files if f.endswith(".csv") and "ChkSum" not in f]
data_files.sort()

print(f"Data files found: {len(data_files)}\n")

for filename in data_files:
    filepath = f"{directory}/{filename}"
    file_type = detect_file_type(filename)
    delivery_type = detect_delivery_type(filename)

    print("=" * 70)
    print(f"  [{file_type} {delivery_type}] {filename}")

    is_valid, error_msg, line_count, file_size = validate_file(sftp, filepath, filename)

    if is_valid:
        print(f"  VALID | Lines: {line_count} | Size: {file_size:,} bytes | Cols consistent")
    else:
        print(f"  INVALID: {error_msg}")
    print()

sftp.close()
transport.close()
print("Done.")
