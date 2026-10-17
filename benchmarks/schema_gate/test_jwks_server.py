"""Controlled HTTPS JWKS endpoint for deterministic integration tests.

The server uses a short-lived test-only self-signed CA certificate. The test client
trusts that certificate explicitly; production trust still requires platform CA
validation and an independently configured HTTPS endpoint allowlist.
"""
from __future__ import annotations

import json
import ssl
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Mapping

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
import datetime
import urllib.request


class ControlledJWKSServer:
    def __init__(self, initial_jwks: Mapping[str, Any] | None = None):
        self._lock = threading.Lock()
        self._payload = json.dumps(initial_jwks or {"keys": []}).encode("utf-8")
        self._status = 200
        self._content_type = "application/json"
        self._temp = tempfile.TemporaryDirectory(prefix="reality-jwks-test-")
        self._cert_path = Path(self._temp.name) / "server.pem"
        self._key_path = Path(self._temp.name) / "server-key.pem"
        self._write_test_certificate()

        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path != "/jwks.json":
                    self.send_response(404)
                    self.end_headers()
                    return
                with outer._lock:
                    payload, status, content_type = outer._payload, outer._status, outer._content_type
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                try:
                    self.wfile.write(payload)
                except (BrokenPipeError, ConnectionResetError):
                    pass

            def log_message(self, *_args):
                return

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self._server.daemon_threads = True
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(str(self._cert_path), str(self._key_path))
        self._server.socket = context.wrap_socket(self._server.socket, server_side=True)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        self.endpoint = f"https://localhost:{self._server.server_port}/jwks.json"
        client_context = ssl.create_default_context(cafile=str(self._cert_path))
        self.opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=client_context))

    def _write_test_certificate(self):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
        now = datetime.datetime.now(datetime.timezone.utc)
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(subject)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(minutes=1))
            .not_valid_after(now + datetime.timedelta(days=1))
            .add_extension(x509.SubjectAlternativeName([x509.DNSName("localhost")]), critical=False)
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
            .sign(key, hashes.SHA256())
        )
        self._cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
        self._key_path.write_bytes(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ))

    def set_jwks(self, jwks: Mapping[str, Any]) -> None:
        self.set_response(json.dumps(jwks).encode("utf-8"), status=200, content_type="application/json")

    def set_response(self, payload: bytes, *, status: int = 200, content_type: str = "application/json") -> None:
        with self._lock:
            self._payload, self._status, self._content_type = payload, status, content_type

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=2)
        self._temp.cleanup()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.stop()
