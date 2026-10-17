"""Fail-closed JWKS retrieval and bounded key-rotation cache.

Uses standard-library HTTPS with the platform CA store. This intentionally does not
hard-pin leaf certificate fingerprints: certificate rotation is operationally expected.
Trust is anchored by an exact configured HTTPS endpoint allowlist, normal TLS
certificate/hostname validation, bounded cache age, and strict JWKS validation.
"""
from __future__ import annotations
import json, time, urllib.request, urllib.error
from dataclasses import dataclass
from typing import Any, Callable, Mapping

class JWKSFetchError(RuntimeError):
    """JWKS retrieval or validation failed; no untrusted keys may be used."""

@dataclass(frozen=True)
class JWKSCacheEntry:
    jwks: Mapping[str, Any]
    fetched_at: float

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class JWKSFetcher:
    def __init__(self, *, endpoint: str, allowed_endpoints: set[str] | frozenset[str],
                 ttl_seconds: int = 3600, timeout_seconds: float = 3.0,
                 max_response_bytes: int = 1_000_000, opener: Any | None = None,
                 clock: Callable[[], float] = time.time) -> None:
        if not endpoint.startswith("https://") or endpoint not in allowed_endpoints:
            raise JWKSFetchError("JWKS_ENDPOINT_NOT_TRUSTED")
        if isinstance(ttl_seconds, bool) or not isinstance(ttl_seconds, int) or not 1 <= ttl_seconds <= 3600:
            raise JWKSFetchError("JWKS_TTL_OUT_OF_RANGE")
        if timeout_seconds <= 0 or max_response_bytes < 1:
            raise JWKSFetchError("JWKS_FETCH_CONFIGURATION_INVALID")
        self.endpoint, self.ttl_seconds = endpoint, ttl_seconds
        self.timeout_seconds, self.max_response_bytes = timeout_seconds, max_response_bytes
        self.clock, self._cache = clock, None
        self._opener = opener or urllib.request.build_opener(_NoRedirect())

    def get_jwks(self, *, force_refresh: bool = False) -> Mapping[str, Any]:
        now = self.clock()
        if not force_refresh and self._cache is not None:
            age = now - self._cache.fetched_at
            if 0 <= age < self.ttl_seconds:
                return self._cache.jwks
        request = urllib.request.Request(self.endpoint, headers={
            "Accept": "application/json", "User-Agent": "Reality-JWKS-Trust/0.1"
        }, method="GET")
        try:
            response = self._opener.open(request, timeout=self.timeout_seconds)
            try:
                if getattr(response, "status", 200) != 200:
                    raise JWKSFetchError("JWKS_HTTP_STATUS_REJECTED")
                raw = response.read(self.max_response_bytes + 1)
            finally:
                response.close()
        except JWKSFetchError:
            raise
        except urllib.error.HTTPError as exc:
            raise JWKSFetchError("JWKS_HTTP_STATUS_REJECTED") from exc
        except Exception as exc:
            raise JWKSFetchError("JWKS_FETCH_FAILED") from exc
        if len(raw) > self.max_response_bytes:
            raise JWKSFetchError("JWKS_RESPONSE_TOO_LARGE")
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception as exc:
            raise JWKSFetchError("JWKS_JSON_INVALID") from exc
        self._validate_jwks(data)
        self._cache = JWKSCacheEntry(data, now)
        return data

    @staticmethod
    def _validate_jwks(data: Any) -> None:
        if not isinstance(data, dict) or not isinstance(data.get("keys"), list) or not data["keys"]:
            raise JWKSFetchError("JWKS_SHAPE_INVALID")
        kids = set()
        for key in data["keys"]:
            if not isinstance(key, dict):
                raise JWKSFetchError("JWKS_KEY_INVALID")
            kid = key.get("kid")
            if not isinstance(kid, str) or not kid:
                raise JWKSFetchError("JWKS_KID_INVALID")
            if kid in kids:
                raise JWKSFetchError("JWKS_KID_DUPLICATE")
            kids.add(kid)
            if key.get("use", "sig") != "sig" or key.get("alg", "RS256") != "RS256":
                raise JWKSFetchError("JWKS_KEY_USAGE_OR_ALGORITHM_INVALID")
            if key.get("kty") != "RSA" or not key.get("n") or not key.get("e"):
                raise JWKSFetchError("JWKS_RSA_KEY_INVALID")

    def get_key(self, kid: str) -> Mapping[str, Any]:
        if not isinstance(kid, str) or not kid:
            raise JWKSFetchError("OIDC_KID_REQUIRED")
        jwks = self.get_jwks()
        matches = [key for key in jwks["keys"] if key["kid"] == kid]
        if not matches:
            jwks = self.get_jwks(force_refresh=True)
            matches = [key for key in jwks["keys"] if key["kid"] == kid]
        if len(matches) != 1:
            raise JWKSFetchError("OIDC_SIGNING_KEY_UNKNOWN_OR_AMBIGUOUS")
        return matches[0]
