import json, unittest
from unittest.mock import Mock
from jwks_fetcher import JWKSFetchError, JWKSFetcher

ENDPOINT = "https://issuer.example/.well-known/jwks.json"
JWKS = {"keys": [{"kid": "k1", "kty": "RSA", "use": "sig", "alg": "RS256", "n": "abc", "e": "AQAB"}]}

class Clock:
    def __init__(self, now=1000): self.now = now
    def __call__(self): return self.now

class Response:
    status = 200
    def __init__(self, payload): self.payload, self.closed = payload, False
    def read(self, limit): return self.payload[:limit]
    def close(self): self.closed = True

class JWKSFetcherTests(unittest.TestCase):
    def setUp(self):
        self.clock, self.opener = Clock(), Mock()
        self.opener.open.return_value = Response(json.dumps(JWKS).encode())
        self.fetcher = JWKSFetcher(endpoint=ENDPOINT, allowed_endpoints={ENDPOINT},
                                   ttl_seconds=60, opener=self.opener, clock=self.clock)

    def test_rejects_untrusted_or_http_endpoint(self):
        with self.assertRaisesRegex(JWKSFetchError, "JWKS_ENDPOINT_NOT_TRUSTED"):
            JWKSFetcher(endpoint="http://evil.example/keys", allowed_endpoints={"http://evil.example/keys"})

    def test_uses_fresh_cache(self):
        self.fetcher.get_jwks(); self.clock.now += 59; self.fetcher.get_jwks()
        self.assertEqual(self.opener.open.call_count, 1)

    def test_refreshes_at_ttl_boundary(self):
        self.fetcher.get_jwks(); self.clock.now += 60; self.fetcher.get_jwks()
        self.assertEqual(self.opener.open.call_count, 2)

    def test_does_not_use_stale_cache_when_refresh_fails(self):
        self.fetcher.get_jwks(); self.clock.now += 61
        self.opener.open.side_effect = TimeoutError("injected timeout")
        with self.assertRaisesRegex(JWKSFetchError, "JWKS_FETCH_FAILED"): self.fetcher.get_jwks()

    def test_unknown_kid_triggers_one_refresh_then_rejects(self):
        with self.assertRaisesRegex(JWKSFetchError, "OIDC_SIGNING_KEY_UNKNOWN_OR_AMBIGUOUS"):
            self.fetcher.get_key("not-present")
        self.assertEqual(self.opener.open.call_count, 2)

    def test_duplicate_kids_rejected(self):
        duplicate = {"keys": [JWKS["keys"][0], dict(JWKS["keys"][0])]}
        self.opener.open.return_value = Response(json.dumps(duplicate).encode())
        with self.assertRaisesRegex(JWKSFetchError, "JWKS_KID_DUPLICATE"): self.fetcher.get_jwks()

    def test_oversized_response_rejected(self):
        fetcher = JWKSFetcher(endpoint=ENDPOINT, allowed_endpoints={ENDPOINT}, max_response_bytes=10,
                              opener=Mock(), clock=self.clock)
        fetcher._opener.open.return_value = Response(b"x" * 11)
        with self.assertRaisesRegex(JWKSFetchError, "JWKS_RESPONSE_TOO_LARGE"): fetcher.get_jwks()

    def test_bad_json_rejected(self):
        self.opener.open.return_value = Response(b"not-json")
        with self.assertRaisesRegex(JWKSFetchError, "JWKS_JSON_INVALID"): self.fetcher.get_jwks()

if __name__ == "__main__": unittest.main()
