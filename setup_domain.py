"""
Sky Runner 3D - Local Domain Setup Utility
Maps 'sky-runner-3d.com' and 'www.sky-runner-3d.com' to 127.0.0.1 in Windows hosts file.
Automatically requests Administrator privileges if required.
"""

import os
import sys
import subprocess

HOSTS_PATH = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), r'System32\drivers\etc\hosts')
ENTRIES = [
    "127.0.0.1 sky-runner-3d.com",
    "127.0.0.1 www.sky-runner-3d.com"
]

def is_admin():
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def configure_hosts():
    if not os.path.exists(HOSTS_PATH):
        print(f"[Error] Hosts file not found at: {HOSTS_PATH}")
        return False

    with open(HOSTS_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    if 'sky-runner-3d.com' in content:
        print("[Domain Setup] 'sky-runner-3d.com' is ALREADY configured in your hosts file!")
        return True

    if not is_admin():
        print("[Domain Setup] Administrator privileges required to update hosts file.")
        print("[Domain Setup] Prompting Windows UAC elevation...")
        # Re-run this script with admin rights
        cmd = f'powershell -Command "Start-Process python -ArgumentList \\"{os.path.abspath(__file__)}\\" -Verb RunAs"'
        subprocess.run(cmd, shell=True)
        return True

    # We have admin privileges
    try:
        with open(HOSTS_PATH, 'a', encoding='utf-8') as f:
            f.write("\n\n# Sky Runner 3D Local Domain\n")
            for entry in ENTRIES:
                f.write(f"{entry}\n")

        subprocess.run("ipconfig /flushdns", shell=True, capture_output=True)
        print("=" * 60)
        print(" [SUCCESS] Added sky-runner-3d.com to hosts file!")
        print(" DNS cache flushed.")
        print(" You can now open: https://sky-runner-3d.com")
        print("=" * 60)
        return True
    except Exception as e:
        print(f"[Error writing to hosts file]: {e}")
        return False

if __name__ == '__main__':
    configure_hosts()
