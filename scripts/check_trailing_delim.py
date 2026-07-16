import paramiko
import sys, os
os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"
DELIMITER = ";"

t = paramiko.Transport((SFTP_HOST, 22))
t.connect(username=SFTP_USER, password=SFTP_PASS)
s = paramiko.SFTPClient.from_transport(t)

files = [
    "sixsecuritytest/GSM_1_020_CH-EU-HK-RU-UK-UN-US_INSTR_FULL_20260313_023118.csv",
    "sixsecuritytest/GSM_1_020_CH-EU-HK-RU-UK-UN-US_ISSUER_FULL_20260313_023118.csv",
]

for path in files:
    print(f"=== {path.split('/')[-1]} ===")
    with s.open(path, "rb") as f:
        f.prefetch()
        data = f.read(3000).decode("utf-8", errors="replace")
    lines = data.split("\n")
    header = lines[0]
    row1 = lines[1] if len(lines) > 1 else ""
    row2 = lines[2] if len(lines) > 2 else ""

    print(f"  Header ends with ';': {header.endswith(';')}")
    print(f"  Header col count (split): {len(header.split(DELIMITER))}")
    print(f"  Row1 ends with ';': {row1.endswith(';')}")
    print(f"  Row1 col count (split): {len(row1.split(DELIMITER))}")
    print(f"  Row1 last 50 chars: ...{row1[-50:]}")
    print(f"  Row2 ends with ';': {row2.endswith(';')}")
    print(f"  Row2 col count (split): {len(row2.split(DELIMITER))}")
    print(f"  Row2 last 50 chars: ...{row2[-50:]}")
    print()

s.close()
t.close()
