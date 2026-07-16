"""
Convert all xlsx files in a given SFTP directory to semicolon-delimited CSV.

Handles:
  - Null/empty cells -> written as empty string (not "None")
  - Rows with fewer trailing cells than header -> padded with empty values
  - Rows with more cells than header -> truncated to header length
  - Newlines within cell values -> replaced with space (keeps CSV structure intact)
  - Uses semicolon (;) delimiter to match source format in sixsecuritytest/

After conversion, uploads the CSV back to the same directory on SFTP.

Usage:
  python convert_six_xlsx_to_csv.py            # defaults to six/
  python convert_six_xlsx_to_csv.py six/day1   # convert files in six/day1/
"""
import paramiko
import openpyxl
import tempfile
import os
import sys
import shutil

os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_PORT = 22
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"

DELIMITER = ";"


def cell_to_str(value):
    """Convert a cell value to string, treating None/null as empty string."""
    if value is None:
        return ""
    s = str(value)
    # Remove embedded newlines/carriage returns that would break CSV row structure
    s = s.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
    return s


def xlsx_to_csv(xlsx_path, csv_path):
    """
    Convert xlsx to semicolon-delimited CSV.
    Every row (including ones with trailing nulls) is padded/truncated
    to match the header's column count, so structure stays consistent.
    """
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.active

    header_col_count = 0
    line_count = 0

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        for row in ws.iter_rows(values_only=True):
            cells = [cell_to_str(v) for v in row]

            if line_count == 0:
                # Header row defines the expected column count.
                # openpyxl reports the sheet's used-range width, which should
                # already match the real number of header names — do not trim
                # trailing cells here, since a legitimately empty last header
                # cell would be indistinguishable from an over-reported one.
                header_col_count = len(cells)
            else:
                # Pad short rows (null trailing cells) with empty strings
                if len(cells) < header_col_count:
                    cells = cells + [""] * (header_col_count - len(cells))
                # Truncate rows that report more cells than header (rare, defensive)
                elif len(cells) > header_col_count:
                    cells = cells[:header_col_count]

            # Join with delimiter. If the last column's value is empty/null,
            # this naturally produces a trailing delimiter (e.g. "...;;"),
            # matching the source file convention — no special-casing needed.
            f.write(DELIMITER.join(cells) + "\n")
            line_count += 1

    wb.close()
    return line_count, header_col_count


def main():
    remote_dir = sys.argv[1] if len(sys.argv) > 1 else "six"

    print(f"Connecting to {SFTP_USER}@{SFTP_HOST}...")
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    print("Connected!\n")

    all_files = sftp.listdir(remote_dir)
    xlsx_files = [f for f in all_files if f.endswith(".xlsx")]
    xlsx_files.sort()

    if not xlsx_files:
        print(f"No xlsx files found in '{remote_dir}/'")
        sftp.close()
        transport.close()
        return

    print(f"Found {len(xlsx_files)} xlsx file(s) in '{remote_dir}/':")
    for f in xlsx_files:
        print(f"  {f}")

    tmp_dir = tempfile.mkdtemp()
    results = []

    for xlsx_name in xlsx_files:
        print(f"\n{'=' * 70}")
        print(f"Processing: {xlsx_name}")
        print(f"{'=' * 70}")

        remote_xlsx = f"{remote_dir}/{xlsx_name}"
        local_xlsx = os.path.join(tmp_dir, xlsx_name)
        csv_name = xlsx_name.replace(".xlsx", ".csv")
        local_csv = os.path.join(tmp_dir, csv_name)
        remote_csv = f"{remote_dir}/{csv_name}"

        # Download
        print(f"  Downloading xlsx...")
        sftp.get(remote_xlsx, local_xlsx)
        print(f"    {os.path.getsize(local_xlsx):,} bytes")

        # Convert
        print(f"  Converting to CSV (semicolon-delimited, nulls -> empty)...")
        total_lines, col_count = xlsx_to_csv(local_xlsx, local_csv)
        csv_size = os.path.getsize(local_csv)
        data_rows = total_lines - 1  # exclude header
        print(f"    Columns: {col_count}")
        print(f"    Data rows: {data_rows:,}")
        print(f"    CSV size: {csv_size:,} bytes")

        # Upload
        print(f"  Uploading CSV: {remote_csv}")
        sftp.put(local_csv, remote_csv)
        print(f"    Done")

        results.append({
            "xlsx": xlsx_name,
            "csv": csv_name,
            "columns": col_count,
            "data_rows": data_rows,
            "size": csv_size,
        })

        os.remove(local_xlsx)
        os.remove(local_csv)

    # Summary
    print(f"\n{'=' * 70}")
    print("CONVERSION SUMMARY")
    print(f"{'=' * 70}")
    for r in results:
        print(f"  {r['csv']}")
        print(f"    Columns: {r['columns']} | Data rows: {r['data_rows']:,} | Size: {r['size']:,} bytes")

    sftp.close()
    transport.close()
    shutil.rmtree(tmp_dir)
    print(f"\nDone. CSV files uploaded to {remote_dir}/ with semicolon delimiter.")


if __name__ == "__main__":
    main()
