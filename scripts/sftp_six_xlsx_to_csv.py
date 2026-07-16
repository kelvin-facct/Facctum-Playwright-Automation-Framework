"""
Download SIX xlsx files from SFTP, convert to semicolon-delimited CSV,
validate format against expected headers, and upload CSV back to SFTP.
"""
import paramiko
import openpyxl
import os
import tempfile
import hashlib

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_PORT = 22
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"

REMOTE_DIR = "six"
DELIMITER = ";"

# Expected header columns per file type (first key columns for validation)
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


def detect_file_type(filename):
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


def xlsx_to_csv(xlsx_path, csv_path):
    """Convert xlsx to semicolon-delimited CSV. Ensures every row has same column count as header."""
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active

    line_count = 0
    header_col_count = 0

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        for row in ws.iter_rows(values_only=True):
            cells = []
            for cell in row:
                val = str(cell) if cell is not None else ""
                # Remove newlines within cells
                val = val.replace("\n", " ").replace("\r", "")
                # Convert literal "None" from openpyxl to empty
                if val == "None":
                    val = ""
                cells.append(val)

            # First row sets the expected column count
            if line_count == 0:
                header_col_count = len(cells)
            else:
                # Pad with empty strings if row has fewer columns (null trailing cells)
                while len(cells) < header_col_count:
                    cells.append("")
                # Truncate if row somehow has more (shouldn't happen)
                cells = cells[:header_col_count]

            f.write(DELIMITER.join(cells) + "\n")
            line_count += 1

    wb.close()
    return line_count


def validate_csv(csv_path, filename):
    """
    Validate the CSV file format.
    Rules:
      - Header must contain expected columns for the file type
      - Every data row MUST have the same number of columns as header
      - Empty/null values in any column are acceptable
    """
    file_type = detect_file_type(filename)
    if not file_type:
        return False, f"Unknown file type: {filename}"

    errors = []

    with open(csv_path, "r", encoding="utf-8") as f:
        header_line = f.readline().strip()
        headers = header_line.split(DELIMITER)
        # Remove trailing empty from trailing delimiter
        if headers and headers[-1] == "":
            headers = headers[:-1]

        col_count = len(headers)
        print(f"    Columns: {col_count}")
        print(f"    First 5 headers: {headers[:5]}")

        # Check required columns present
        expected = EXPECTED_HEADERS.get(file_type, [])
        for col in expected:
            if col not in headers:
                errors.append(f"Missing required column: '{col}'")

        # Validate ALL data rows for consistent column count
        # (null values are fine, column count must match)
        bad_rows = 0
        total_rows = 0
        for i, line in enumerate(f, start=2):
            line_stripped = line.rstrip("\n").rstrip("\r")
            if not line_stripped:
                continue  # skip empty lines
            total_rows += 1

            cols = line_stripped.split(DELIMITER)
            # Account for trailing delimiter producing extra empty element
            if cols and cols[-1] == "":
                row_col_count = len(cols) - 1
            else:
                row_col_count = len(cols)

            if row_col_count != col_count:
                bad_rows += 1
                if bad_rows <= 5:
                    errors.append(f"Row {i}: got {row_col_count} columns, expected {col_count}")

    print(f"    Data rows: {total_rows}")
    if bad_rows > 5:
        errors.append(f"... and {bad_rows - 5} more rows with wrong column count")

    print(f"    Rows with column mismatch: {bad_rows}")

    if errors:
        return False, "; ".join(errors[:5])
    return True, f"Valid — {col_count} columns, {total_rows} data rows, all rows consistent"


def calculate_checksums(filepath):
    """Calculate MD5 and SHA256."""
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            md5.update(chunk)
            sha256.update(chunk)
    return md5.hexdigest(), sha256.hexdigest()


def main():
    # Connect
    print(f"Connecting to {SFTP_USER}@{SFTP_HOST}...")
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    print("✅ Connected\n")

    # List xlsx files
    all_files = sftp.listdir(REMOTE_DIR)
    xlsx_files = [f for f in all_files if f.endswith(".xlsx") and "day1" not in f]
    xlsx_files.sort()

    print(f"Found {len(xlsx_files)} xlsx files in '{REMOTE_DIR}/':")
    for f in xlsx_files:
        print(f"  {f}")

    tmp_dir = tempfile.mkdtemp()
    results = []

    for xlsx_name in xlsx_files:
        print(f"\n{'='*70}")
        print(f"Processing: {xlsx_name}")
        print(f"{'='*70}")

        remote_xlsx = f"{REMOTE_DIR}/{xlsx_name}"
        local_xlsx = os.path.join(tmp_dir, xlsx_name)
        csv_name = xlsx_name.replace(".xlsx", ".csv")
        local_csv = os.path.join(tmp_dir, csv_name)

        # Download
        print(f"  ⬇️  Downloading xlsx...")
        sftp.get(remote_xlsx, local_xlsx)
        print(f"    Downloaded: {os.path.getsize(local_xlsx):,} bytes")

        # Convert to CSV
        print(f"  🔄 Converting to CSV (semicolon-delimited)...")
        total_lines = xlsx_to_csv(local_xlsx, local_csv)
        csv_size = os.path.getsize(local_csv)
        print(f"    Output: {csv_name}")
        print(f"    Lines: {total_lines} | Size: {csv_size:,} bytes")

        # Validate
        print(f"  🔍 Validating format...")
        is_valid, msg = validate_csv(local_csv, csv_name)

        if is_valid:
            print(f"  ✅ VALID: {msg}")
        else:
            print(f"  ❌ INVALID: {msg}")

        # Calculate checksums
        print(f"  #️⃣  Calculating checksums...")
        md5_hash, sha256_hash = calculate_checksums(local_csv)
        print(f"    MD5:    {md5_hash}")
        print(f"    SHA256: {sha256_hash}")

        # Upload CSV back to SFTP
        remote_csv = f"{REMOTE_DIR}/{csv_name}"
        print(f"  ⬆️  Uploading CSV to SFTP: {remote_csv}")
        sftp.put(local_csv, remote_csv)
        print(f"    Uploaded successfully")

        results.append({
            "filename": csv_name,
            "lines": total_lines - 1,  # exclude header
            "size": csv_size,
            "md5": md5_hash,
            "sha256": sha256_hash,
            "valid": is_valid,
        })

    # Generate control file
    print(f"\n{'='*70}")
    print("GENERATING CONTROL FILE")
    print(f"{'='*70}")

    valid_results = [r for r in results if r["valid"]]
    ctrl_lines = ["File_Name;Nr_Lines;File_Size;md5sum;sha256sum;"]
    for r in valid_results:
        ctrl_lines.append(f"{r['filename']};{r['lines']};{r['size']};{r['md5']};{r['sha256']};")

    ctrl_content = "\n".join(ctrl_lines) + "\n"
    ctrl_name = "SSMS_Delivery_9999_ChkSum.csv"
    ctrl_remote = f"{REMOTE_DIR}/{ctrl_name}"

    print(f"\n  Control file: {ctrl_name}")
    print(f"  Content:")
    for line in ctrl_lines:
        print(f"    {line[:120]}")

    with sftp.open(ctrl_remote, "w") as f:
        f.write(ctrl_content)
    print(f"\n  ✅ Uploaded: {ctrl_remote}")

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    print(f"  Files processed: {len(results)}")
    print(f"  Valid: {len(valid_results)}")
    print(f"  Invalid: {len(results) - len(valid_results)}")

    # Cleanup
    sftp.close()
    transport.close()
    print("\n🔒 Connection closed.")

    # Cleanup temp files
    for f in os.listdir(tmp_dir):
        os.remove(os.path.join(tmp_dir, f))
    os.rmdir(tmp_dir)


if __name__ == "__main__":
    main()
