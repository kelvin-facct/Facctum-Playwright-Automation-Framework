import paramiko
import sys, os
os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SFTP_HOST = "test.ftp.facctum.ai"
SFTP_USER = "sftp-test-user1"
SFTP_PASS = "f@cctUser1"

t = paramiko.Transport((SFTP_HOST, 22))
t.connect(username=SFTP_USER, password=SFTP_PASS)
s = paramiko.SFTPClient.from_transport(t)

print("six/")
for item in s.listdir_attr("six"):
    print(f"  {item.longname}")

s.close()
t.close()
