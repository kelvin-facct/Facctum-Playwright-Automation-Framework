"""
Generate SSMS_Delivery_XXXX_ChkSum.csv control file for CSV files in a given directory.

Fast checksum calculation: uses sftp.prefetch() + large chunked reads
(single pass, MD5 + SHA256 computed together) instead of slow line-by-line
or small-chunk reads over the network.

Usage:
  python create_six_checksum_file.py [directory] [delivery_id]
  python create_six_checksum_file.py six
  python create_six_checksum_file.py six/day1
  python create_six_checksum_file.py six/day1 4000
"""
import paramiko
import hashlib
import sys
import os
import time

os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_PORT = 22
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"

CHUNK_SIZE = 8 * 1024 * 1024  # 8MB chunks - large enough to minimize round trips


def connect_sftp():
    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    transport.connect(username=SFTP_USER, password=SFTP_PASS)
    sftp = paramiko.SFTPClient.from_transport(transport)
    return transport, sftp


def count_lines_and_checksums(sftp, filepath, file_size):
    """
    Single pass over the file: count data lines (excluding header)
    AND compute MD5 + SHA256 — all from one sequential read using prefetch.
    """
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    newline_count = 0

    with sftp.open(filepath, "rb") as f:
        f.set_pipelined(True)
        f.prefetch(file_size)  # background bulk read-ahead, avoids per-chunk round trips
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            md5.update(chunk)
            sha256.update(chunk)
            newline_count += chunk.count(b"\n")

    data_lines = max(newline_count - 1, 0)  # exclude header row
    return md5.hexdigest(), sha256.hexdigest(), data_lines


def main():
    directory = sys.argv[1] if len(sys.argv) > 1 else "six"
    delivery_id = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Connecting to {SFTP_USER}@{SFTP_HOST}...")
    transport, sftp = connect_sftp()
    print("Connected!\n")

    all_files = sftp.listdir(directory)
    csv_files = [
        f for f in all_files
        if f.endswith(".csv") and "ChkSum" not in f
    ]
    csv_files.sort()

    if not csv_files:
        print(f"No CSV data files found in '{directory}/'")
        sftp.close()
        transport.close()
        return

    print(f"Directory: {directory}/")
    print(f"Found {len(csv_files)} CSV file(s):")
    for f in csv_files:
        print(f"  {f}")
    print()

    entries = []

    for filename in csv_files:
        filepath = f"{directory}/{filename}"
        stat = sftp.stat(filepath)
        file_size = stat.st_size

        print(f"Processing: {filename}")
        print(f"  Size: {file_size:,} bytes")

        t0 = time.time()
        md5_hash, sha256_hash, data_lines = count_lines_and_checksums(sftp, filepath, file_size)
        elapsed = time.time() - t0

        print(f"  Lines: {data_lines:,}")
        print(f"  MD5:    {md5_hash}")
        print(f"  SHA256: {sha256_hash}")
        print(f"  Time: {elapsed:.1f}s\n")

        entries.append({
            "filename": filename,
            "nr_lines": data_lines,
            "file_size": file_size,
            "md5": md5_hash,
            "sha256": sha256_hash,
        })

    # Determine delivery ID
    if not delivery_id:
        existing_ctrl = [f for f in all_files if "ChkSum" in f and "SSMS_Delivery" in f]
        ids = []
        for cf in existing_ctrl:
            part = cf.replace("SSMS_Delivery_", "").replace("_ChkSum.csv", "")
            try:
                ids.append(int(part))
            except ValueError:
                pass
        delivery_id = max(ids) + 1 if ids else 1000

    control_filename = f"SSMS_Delivery_{delivery_id}_ChkSum.csv"
    control_filepath = f"{directory}/{control_filename}"

    lines = ["File_Name;Nr_Lines;File_Size;md5sum;sha256sum;"]
    for e in entries:
        lines.append(f"{e['filename']};{e['nr_lines']};{e['file_size']};{e['md5']};{e['sha256']};")

    content = "\n".join(lines) + "\n"

    print("=" * 70)
    print(f"Control file: {control_filename}")
    print("=" * 70)
    for line in lines:
        print(f"  {line[:120]}")

    with sftp.open(control_filepath, "w") as f:
        f.write(content)

    print(f"\nUploaded: {control_filepath}")

    sftp.close()
    transport.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
