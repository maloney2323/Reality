"""End-to-end key rollover and endpoint-failure tests using a controlled HTTPS server."""
from __future__ import annotations

import base64
import time
import unittest

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from jwks_fetcher import JWKSFetchError, JWKSFetcher
from oidc_identity import verify_oidc_identity
from replay_store import ReplayStoreError
from test_jwks_server import ControlledJWKSServer


def b64u_int(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def make_key(kid: str):
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    numbers = private.public_key().public_numbers()
    jwk = {
        "kty": "RSA", "kid": kid, "use": "sig", "alg": "RS256",
        "n": b64u_int(numbers.n), "e": b64u_int(numbers.e),
    }
    return private, jwk


def make_token(private, kid: str, *, jti: str):
    now = int(time.time())
    claims = {
        "iss": "https://issuer.example", "sub": "repo:maloney2323/Reality:ref:refs/heads/main",
        "aud": "reality-evaluation", "workflow_ref": "maloney2323/Reality/.github/workflows/ci.yml@refs/heads/main",
        "iat": now, "nbf": now, "exp": now + 120, "jti": jti,
    }
    return jwt.encode(claims, private, algorithm="RS256", headers={"kid": kid})


class MemoryReplayStore:
    """Only for key-resolution tests; not evidence of distributed replay atomicity."""
    def __init__(self):
        self.seen = set()

    def claim_once(self, token_id, expires_at):
        if token_id in self.seen:
            return False
        self.seen.add(token_id)
        return True


class JWKSRotationIntegrationTests(unittest.TestCase):
    def test_key_a_verifies_then_unknown_key_refreshes_rotated_key_b(self):
        private_a, jwk_a = make_key("key-2026-v1")
        private_b, jwk_b = make_key("key-2026-v2")
        with ControlledJWKSServer({"keys": [jwk_a]}) as server:
            fetcher = JWKSFetcher(
                endpoint=server.endpoint, allowed_endpoints={server.endpoint},
                ttl_seconds=300, timeout_seconds=2, opener=server.opener,
            )
            key_a = fetcher.get_key("key-2026-v1")
            identity_a = verify_oidc_identity(
                make_token(private_a, "key-2026-v1", jti="rollover-a"),
                jwks={"keys": [key_a]}, expected_issuer="https://issuer.example",
                expected_audience="reality-evaluation",
                allowed_subjects={"repo:maloney2323/Reality:ref:refs/heads/main"},
                required_workflow_ref="maloney2323/Reality/.github/workflows/ci.yml@refs/heads/main",
                replay_store=MemoryReplayStore(),
            )
            self.assertEqual(identity_a.claims["jti"], "rollover-a")

            server.set_jwks({"keys": [jwk_b]})
            # Cache is still fresh, so unknown kid must cause exactly one forced refresh.
            key_b = fetcher.get_key("key-2026-v2")
            identity_b = verify_oidc_identity(
                make_token(private_b, "key-2026-v2", jti="rollover-b"),
                jwks={"keys": [key_b]}, expected_issuer="https://issuer.example",
                expected_audience="reality-evaluation",
                allowed_subjects={"repo:maloney2323/Reality:ref:refs/heads/main"},
                required_workflow_ref="maloney2323/Reality/.github/workflows/ci.yml@refs/heads/main",
                replay_store=MemoryReplayStore(),
            )
            self.assertEqual(identity_b.claims["jti"], "rollover-b")

    def test_expired_cache_and_unavailable_endpoint_fail_closed(self):
        _, jwk_a = make_key("key-2026-v1")
        with ControlledJWKSServer({"keys": [jwk_a]}) as server:
            clock = [1000.0]
            fetcher = JWKSFetcher(
                endpoint=server.endpoint, allowed_endpoints={server.endpoint},
                ttl_seconds=1, timeout_seconds=0.25, opener=server.opener,
                clock=lambda: clock[0],
            )
            self.assertEqual(fetcher.get_key("key-2026-v1")["kid"], "key-2026-v1")
            server.stop()
            clock[0] += 2
            with self.assertRaisesRegex(JWKSFetchError, "JWKS_FETCH_FAILED"):
                fetcher.get_key("key-2026-v1")

    def test_http_500_and_oversized_payload_are_rejected(self):
        _, jwk_a = make_key("key-2026-v1")
        with ControlledJWKSServer({"keys": [jwk_a]}) as server:
            fetcher = JWKSFetcher(
                endpoint=server.endpoint, allowed_endpoints={server.endpoint},
                ttl_seconds=10, opener=server.opener, max_response_bytes=256,
            )
            server.set_response(b"upstream unavailable", status=500)
            with self.assertRaisesRegex(JWKSFetchError, "JWKS_HTTP_STATUS_REJECTED"):
                fetcher.get_jwks(force_refresh=True)
            server.set_response(b"x" * 257, status=200)
            with self.assertRaisesRegex(JWKSFetchError, "JWKS_RESPONSE_TOO_LARGE"):
                fetcher.get_jwks(force_refresh=True)


if __name__ == "__main__":
    unittest.main()
