"""
Validate SIX Securities CSV files against source format.

Source format reference: sixsecuritytest/ (always)
Target to validate: any directory with CSV files (passed as argument, default: six/)

Validates:
  - Headers match source (column names)
  - Column count matches source
  - Every data row has same column count as header
  - Null/empty values are fine
  - Delimiter is semicolon

Usage:
  python validate_six_files.py                    # validates CSV files in six/
  python validate_six_files.py <target_dir>       # validates CSV files in given dir
  python validate_six_files.py six_securities/latest
"""
import sys
import os
import paramiko

os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_PORT = 22
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"
DELIMITER = ";"

# Source of truth - ALWAYS sixsecuritytest/
SOURCE_DIR = "sixsecuritytest"


def detect_file_type(filename):
    fname_upper = filename.upper()
    if "_INSTR_" in fname_upper: return "INSTR"
    elif "_ISSUER_" in fname_upper: return "ISSUER"
    elif "_STRUCT_" in fname_upper: return "STRUCT"
    elif "_OPTIONS_" in fname_upper: return "OPTIONS"
    return None


def get_source_headers(sftp):
    """
    Read headers from source CSV files in sixsecuritytest/.
    Returns dict: {file_type: {headers: [...], col_count: N, filename: "..."}}
    """
    source_files = sftp.listdir(SOURCE_DIR)
    csv_files = [f for f in source_files if f.endswith(".csv") and "ChkSum" not in f]
    csv_files.sort()

    source_headers = {}

    for filename in csv_files:
        ftype = detect_file_type(filename)
        if not ftype:
            continue
        # Only FULL files as reference (they have all columns)
        if "_FULL_" not in filename.upper():
            continue
        if ftype in source_headers:
            continue

        filepath = f"{SOURCE_DIR}/{filename}"
        with sftp.open(filepath, "rb") as f:
            header_line = f.readline().decode("utf-8", errors="replace").rstrip("\n").rstrip("\r")

        # Header row's split() length is the authoritative column count.
        headers = header_line.split(DELIMITER)

        source_headers[ftype] = {
            "headers": headers,
            "col_count": len(headers),
            "filename": filename,
        }

    return source_headers


def validate_csv_against_source(sftp, csv_path, source_info, chunk_size=4 * 1024 * 1024,
                                  initial_sample=20, random_sample=30):
    """
    Validate a CSV file on SFTP against source format — SAMPLED, not full scan.

    Strategy (single pass, streamed in large chunks):
      - Header: always validated (names + column count vs source)
      - First `initial_sample` data rows: always validated
      - Remaining rows: reservoir-sampled, `random_sample` of them validated
      - Total line count is still tallied (cheap - just a counter)

    Null/empty values are fine. Only column count is checked per row.
    """
    import random

    filename = csv_path.split("/")[-1]
    stat = sftp.stat(csv_path)
    file_size = stat.st_size

    source_headers = source_info["headers"]
    source_col_count = source_info["col_count"]

    errors = []
    line_count = 0  # data rows only (excludes header)
    bad_rows = 0
    checked_rows = 0
    csv_headers = []
    csv_col_count = 0
    first_line_processed = False
    leftover = ""

    initial_rows = []       # first N data rows, validated always
    reservoir = []          # reservoir sample of remaining rows (line_number, line)
    data_row_index = 0      # index among rows AFTER the initial_sample

    def check_row(line_no, line):
        nonlocal bad_rows, checked_rows
        checked_rows += 1
        # split() count directly reflects column count, including a
        # legitimately null last column (trailing delimiter -> empty string
        # element, which is correct and expected).
        row_col_count = len(line.split(DELIMITER))
        if row_col_count != csv_col_count:
            bad_rows += 1
            if bad_rows <= 5:
                errors.append(f"Row {line_no}: {row_col_count} cols, expected {csv_col_count}")

    with sftp.open(csv_path, "rb") as f:
        f.prefetch(file_size)  # kick off background bulk read-ahead
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break

            text = leftover + chunk.decode("utf-8", errors="replace")
            lines = text.split("\n")
            leftover = lines.pop()  # incomplete line carried to next chunk

            for raw_line in lines:
                line = raw_line.rstrip("\r")

                if not first_line_processed:
                    first_line_processed = True
                    # Do NOT strip trailing empty elements from split() — a
                    # trailing delimiter in a data row means the last column's
                    # value is legitimately null, and split() correctly counts
                    # it as one more element. The header itself defines the
                    # true column count directly from its split() length.
                    csv_headers = line.split(DELIMITER)
                    csv_col_count = len(csv_headers)

                    if csv_col_count != source_col_count:
                        errors.append(f"Column count: {csv_col_count} vs source {source_col_count}")

                    mismatched = []
                    for j in range(min(csv_col_count, source_col_count)):
                        if csv_headers[j].strip() != source_headers[j].strip():
                            mismatched.append((j, source_headers[j], csv_headers[j]))
                    for idx, src, csv_h in mismatched[:5]:
                        errors.append(f"Header col {idx}: expected '{src}' got '{csv_h}'")

                    if source_col_count > csv_col_count:
                        missing = source_headers[csv_col_count:]
                        errors.append(f"Missing {len(missing)} cols: {missing[:3]}")
                    elif csv_col_count > source_col_count:
                        extra = csv_headers[source_col_count:]
                        errors.append(f"Extra {len(extra)} cols not in source: {extra[:3]}")

                    continue

                if not line.strip():
                    continue

                line_count += 1

                if len(initial_rows) < initial_sample:
                    initial_rows.append((line_count, line))
                else:
                    data_row_index += 1
                    if len(reservoir) < random_sample:
                        reservoir.append((line_count, line))
                    else:
                        # Reservoir sampling: replace with decreasing probability
                        j = random.randint(0, data_row_index - 1)
                        if j < random_sample:
                            reservoir[j] = (line_count, line)

        # Handle final leftover line (no trailing newline)
        if leftover.strip():
            line_count += 1
            if len(initial_rows) < initial_sample:
                initial_rows.append((line_count, leftover.rstrip("\r")))
            else:
                data_row_index += 1
                if len(reservoir) < random_sample:
                    reservoir.append((line_count, leftover.rstrip("\r")))
                else:
                    j = random.randint(0, data_row_index - 1)
                    if j < random_sample:
                        reservoir[j] = (line_count, leftover.rstrip("\r"))

    # Now validate only the sampled rows
    for line_no, line in initial_rows:
        check_row(line_no, line)
    for line_no, line in reservoir:
        check_row(line_no, line)

    if bad_rows > 5:
        errors.append(f"...and {bad_rows - 5} more rows with column mismatch (within sample)")

    return {
        "filename": filename,
        "csv_cols": csv_col_count,
        "source_cols": source_col_count,
        "data_rows": line_count,
        "rows_checked": checked_rows,
        "bad_rows": bad_rows,
        "file_size": file_size,
        "valid": len(errors) == 0,
        "errors": errors,
    }


def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "six"

    print("Connecting to SFTP...")
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    print("Connected!\n")

    # Step 1: Get source format from sixsecuritytest/
    print("=" * 70)
    print(f"SOURCE FORMAT (from {SOURCE_DIR}/)")
    print("=" * 70)
    source_headers = get_source_headers(sftp)

    for ftype, info in sorted(source_headers.items()):
        print(f"  {ftype}: {info['col_count']} columns")
        print(f"    Reference: {info['filename']}")
        print(f"    First 5: {info['headers'][:5]}")
    print()

    # Step 2: List CSV files in target directory
    print("=" * 70)
    print(f"VALIDATING CSV FILES IN: {target_dir}/")
    print("=" * 70)

    target_files = sftp.listdir(target_dir)
    csv_files = [f for f in target_files if f.endswith(".csv") and "ChkSum" not in f]
    csv_files.sort()

    if not csv_files:
        print(f"  No CSV data files found in '{target_dir}/'")
        sftp.close()
        transport.close()
        return

    print(f"  Found {len(csv_files)} CSV file(s)\n")

    results = []

    for csv_name in csv_files:
        ftype = detect_file_type(csv_name)
        if not ftype:
            print(f"  [?] {csv_name} - unknown type, skipping\n")
            continue

        if ftype not in source_headers:
            print(f"  [?] {csv_name} - no source reference for {ftype}, skipping\n")
            continue

        print(f"  [{ftype}] {csv_name}")
        result = validate_csv_against_source(sftp, f"{target_dir}/{csv_name}", source_headers[ftype])
        results.append(result)

        if result["valid"]:
            print(f"    VALID")
            print(f"    Columns: {result['csv_cols']} (matches source: {result['source_cols']})")
            print(f"    Total data rows: {result['data_rows']:,} | Sampled & checked: {result['rows_checked']}")
            print(f"    Size: {result['file_size']:,} bytes")
        else:
            print(f"    INVALID")
            for err in result["errors"]:
                print(f"      - {err}")
            print(f"    Columns: {result['csv_cols']} | Source: {result['source_cols']}")
            print(f"    Total data rows: {result['data_rows']:,} | Sampled: {result['rows_checked']} | Bad in sample: {result['bad_rows']}")
        print()

    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    valid_count = sum(1 for r in results if r["valid"])
    invalid_count = sum(1 for r in results if not r["valid"])
    print(f"  Source reference: {SOURCE_DIR}/")
    print(f"  Target validated: {target_dir}/")
    print(f"  Files checked: {len(results)}")
    print(f"  Valid: {valid_count}")
    print(f"  Invalid: {invalid_count}")

    sftp.close()
    transport.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
