"""
Sky Runner 3D - Local HTTPS Server for https://sky-runner-3d.com
Serves the game securely over SSL / HTTPS on port 443 (or 8443 fallback).
Auto-generates SSL certificates with Subject Alternative Names for sky-runner-3d.com.
"""

import os
import ssl
import sys
import time
import socket
import datetime
import webbrowser
from http.server import ThreadingHTTPServer

# Import existing request handler and utilities
from server import GameRequestHandler, quit_event, get_local_ip

CERT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cert.pem')
KEY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'key.pem')

def ensure_ssl_certificates():
    """Generate self-signed SSL certificates for sky-runner-3d.com if not present."""
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        return

    print("[SSL] Generating local SSL certificates for sky-runner-3d.com...")
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import ipaddress

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, u'sky-runner-3d.com'),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, u'Sky Runner 3D')
        ])

        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
            .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365))
            .add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName(u'sky-runner-3d.com'),
                    x509.DNSName(u'www.sky-runner-3d.com'),
                    x509.DNSName(u'localhost'),
                    x509.IPAddress(ipaddress.IPv4Address('127.0.0.1'))
                ]),
                critical=False,
            )
            .sign(key, hashes.SHA256())
        )

        with open(KEY_FILE, 'wb') as f:
            f.write(key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ))

        with open(CERT_FILE, 'wb') as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

        print("[SSL] Successfully generated cert.pem and key.pem.")
    except Exception as e:
        print(f"[SSL Error]: {e}")
        sys.exit(1)

def run_https_server():
    ensure_ssl_certificates()

    # Determine available HTTPS port (prefer 443, fallback to 8443)
    port = 443
    try:
        test_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_sock.bind(('0.0.0.0', 443))
        test_sock.close()
    except Exception:
        port = 8443

    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)

    server = ThreadingHTTPServer(('0.0.0.0', port), GameRequestHandler)
    server.socket = ssl_context.wrap_socket(server.socket, server_side=True)

    url = f"https://sky-runner-3d.com" if port == 443 else f"https://sky-runner-3d.com:{port}"
    local_url = f"https://localhost:{port}"

    print("=" * 68)
    print("      [SECURE] SKY RUNNER 3D - HTTPS SERVER [SECURE]")
    print("=" * 68)
    print(f" [Custom Domain URL] : {url}")
    print(f" [Localhost URL]     : {local_url}")
    print("-" * 68)
    print(" Note: If this is your first time using https://sky-runner-3d.com:")
    print(" 1. Run 'setup_local_domain.bat' (as Administrator) to map the domain to your PC.")
    print(" 2. Your browser will display a standard self-signed certificate warning;")
    print("    click 'Advanced' -> 'Proceed to sky-runner-3d.com (unsafe)'.")
    print("=" * 68)

    # Automatically open the URL in the browser
    webbrowser.open(url)

    try:
        while not quit_event.is_set():
            server.handle_request()
    except KeyboardInterrupt:
        print("\n[HTTPS Server] Stopping...")
    finally:
        server.server_close()
        print("[HTTPS Server] Stopped successfully.")

if __name__ == '__main__':
    run_https_server()
