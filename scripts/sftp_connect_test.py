"""Quick SFTP connection test."""
import paramiko

HOST = "test.ftp.facctum.ai"
PORT = 22
USER = "sftp-test-user1"
PASS = "f@cctUser1"

print(f"Connecting to {USER}@{HOST}:{PORT}...")
transport = paramiko.Transport((HOST, PORT))
transport.connect(username=USER, password=PASS)
sftp = paramiko.SFTPClient.from_transport(transport)
print("✅ Connected successfully!\n")

print("Root directory listing:")
for item in sftp.listdir_attr("."):
    print(f"  {item.longname}")

sftp.close()
transport.close()
print("\nConnection closed.")
