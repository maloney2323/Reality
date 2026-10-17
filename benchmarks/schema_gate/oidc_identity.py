"""Strict upstream OIDC JWT verification and fail-closed replay boundary.

This module verifies JWTs against an explicitly supplied trusted JWKS snapshot.
Fetching/authenticating JWKS and durable replay storage are deployment responsibilities.
A missing replay store is a hard failure; a process-local store is test-only.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol
import time

import jwt


class OIDCIdentityError(ValueError):
    """Raised when an upstream OIDC identity cannot be trusted."""


class ReplayStore(Protocol):
    def claim_once(self, token_id: str, expires_at: int) -> bool:
        """Atomically reserve token_id until expires_at; false means already used."""


@dataclass(frozen=True)
class VerifiedOIDCIdentity:
    """Claims verified by verify_oidc_identity; not a raw decoded JWT payload."""
    claims: Mapping[str, Any]
    _proof: object

    def __post_init__(self) -> None:
        if self._proof is not _VERIFIED_PROOF:
            raise OIDCIdentityError("IDENTITY_NOT_VERIFIED")


_VERIFIED_PROOF = object()


def verify_oidc_identity(
    token: str,
    *,
    jwks: Mapping[str, Any],
    expected_issuer: str,
    expected_audience: str,
    allowed_subjects: set[str] | frozenset[str],
    required_workflow_ref: str,
    replay_store: ReplayStore | None,
    now: int | None = None,
    leeway_seconds: int = 0,
) -> VerifiedOIDCIdentity:
    """Verify signature and identity constraints, then atomically consume JWT jti.

    jwks must come from a separately trusted, authenticated JWKS retrieval path.
    Replay protection is fail-closed: without a durable, atomic store this rejects.
    """
    if not isinstance(token, str) or not token:
        raise OIDCIdentityError("OIDC_TOKEN_REQUIRED")
    if replay_store is None:
        raise OIDCIdentityError("REPLAY_STORE_UNAVAILABLE")
    if not isinstance(jwks, Mapping) or not isinstance(jwks.get("keys"), list):
        raise OIDCIdentityError("TRUSTED_JWKS_REQUIRED")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise OIDCIdentityError("OIDC_HEADER_INVALID") from exc
    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg")
    if not isinstance(kid, str) or not kid:
        raise OIDCIdentityError("OIDC_KID_REQUIRED")
    # GitHub Actions OIDC currently uses RS256; disallow algorithm negotiation.
    if alg != "RS256":
        raise OIDCIdentityError("OIDC_ALGORITHM_NOT_ALLOWED")
    matches = [key for key in jwks["keys"] if isinstance(key, Mapping) and key.get("kid") == kid]
    if len(matches) != 1:
        raise OIDCIdentityError("OIDC_SIGNING_KEY_UNKNOWN_OR_AMBIGUOUS")

    try:
        signing_key = jwt.PyJWK.from_dict(dict(matches[0]), algorithm="RS256").key
        options = {"require": ["exp", "iat", "nbf", "iss", "sub", "aud", "jti"]}
        decode_args: dict[str, Any] = {
            "key": signing_key,
            "algorithms": ["RS256"],
            "audience": expected_audience,
            "issuer": expected_issuer,
            "options": options,
            "leeway": leeway_seconds,
        }
        if now is not None:
            # Deterministic test clock: temporal claims are checked below after signature verification.
            decode_args["options"] = {**options, "verify_exp": False, "verify_iat": False, "verify_nbf": False}
        claims = jwt.decode(token, **decode_args)
    except Exception as exc:
        raise OIDCIdentityError("OIDC_JWT_VERIFICATION_FAILED") from exc

    if not isinstance(claims, dict):
        raise OIDCIdentityError("OIDC_CLAIMS_NOT_OBJECT")
    aud = claims.get("aud")
    audiences = aud if isinstance(aud, list) else [aud]
    if expected_audience not in audiences:
        raise OIDCIdentityError("OIDC_AUDIENCE_MISMATCH")
    if claims.get("iss") != expected_issuer:
        raise OIDCIdentityError("OIDC_ISSUER_MISMATCH")
    if claims.get("sub") not in allowed_subjects:
        raise OIDCIdentityError("OIDC_SUBJECT_NOT_ALLOWED")
    if claims.get("workflow_ref") != required_workflow_ref:
        raise OIDCIdentityError("OIDC_WORKFLOW_REF_MISMATCH")

    timestamp = int(time.time()) if now is None else int(now)
    for field in ("iat", "nbf", "exp"):
        if isinstance(claims.get(field), bool) or not isinstance(claims.get(field), int):
            raise OIDCIdentityError("OIDC_TIME_CLAIMS_INVALID")
    if claims["iat"] > timestamp + leeway_seconds or claims["nbf"] > timestamp + leeway_seconds:
        raise OIDCIdentityError("OIDC_TOKEN_NOT_YET_VALID")
    if claims["exp"] <= timestamp - leeway_seconds or claims["exp"] <= claims["iat"]:
        raise OIDCIdentityError("OIDC_TOKEN_EXPIRED_OR_INVALID")
    token_id = claims.get("jti")
    if not isinstance(token_id, str) or not token_id:
        raise OIDCIdentityError("OIDC_JTI_REQUIRED")
    try:
        claimed = replay_store.claim_once(token_id, claims["exp"])
    except Exception as exc:
        raise OIDCIdentityError("REPLAY_STORE_FAILURE") from exc
    if claimed is not True:
        raise OIDCIdentityError("OIDC_TOKEN_REPLAYED")

    selected = {
        "iss": claims["iss"],
        "sub": claims["sub"],
        "aud": claims["aud"],
        "workflow_ref": claims["workflow_ref"],
        "jti": token_id,
        "iat": claims["iat"],
        "nbf": claims["nbf"],
        "exp": claims["exp"],
    }
    return VerifiedOIDCIdentity(selected, _VERIFIED_PROOF)
