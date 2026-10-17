"""Fail-closed Evaluation Context Token (ECT) issuer/verifier for Reality trust-policy v0.1.

Trust boundary: identity_claims MUST come from a separately authenticated OIDC verifier.
This module does not validate OIDC JWT signatures, fetch JWKS, check live revocation feeds,
or persist token IDs for replay prevention. Callers must supply those controls.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import time
import uuid
from typing import Any, Mapping

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from jsonschema import Draft202012Validator


class TrustContextError(ValueError):
    """Raised when trust policy or an Evaluation Context Token fails closed."""


def _canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _unb64u(value: str) -> bytes:
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        raise TrustContextError("MALFORMED_BASE64URL")
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def policy_digest(policy: Mapping[str, Any]) -> str:
    """Digest canonical policy content excluding its policy_sha256 field."""
    payload = dict(policy)
    payload.pop("policy_sha256", None)
    return hashlib.sha256(_canonical(payload)).hexdigest()


def validate_policy(policy: Mapping[str, Any], schema: Mapping[str, Any]) -> None:
    errors = sorted(Draft202012Validator(schema).iter_errors(policy), key=lambda e: list(e.path))
    if errors:
        raise TrustContextError("TRUST_POLICY_SCHEMA_INVALID: " + "; ".join(e.message for e in errors))
    if policy.get("policy_sha256") != policy_digest(policy):
        raise TrustContextError("TRUST_POLICY_DIGEST_MISMATCH")
    key_ids = [entry["key_id"] for entry in policy["keys"]]
    if len(key_ids) != len(set(key_ids)):
        raise TrustContextError("DUPLICATE_TRUST_KEY_ID")
    for key in policy["keys"]:
        if key["issuer"] not in policy["issuers"]:
            raise TrustContextError("KEY_ISSUER_NOT_AUTHORIZED")
        try:
            parsed = serialization.load_pem_public_key(key["public_key_pem"].encode("utf-8"))
        except Exception as exc:
            raise TrustContextError("INVALID_PUBLIC_KEY") from exc
        if not isinstance(parsed, Ed25519PublicKey):
            raise TrustContextError("UNSUPPORTED_PUBLIC_KEY_ALGORITHM")


def _key(policy: Mapping[str, Any], key_id: str, issuer: str) -> Mapping[str, Any]:
    matches = [k for k in policy["keys"] if k["key_id"] == key_id]
    if len(matches) != 1:
        raise TrustContextError("UNKNOWN_OR_AMBIGUOUS_KEY_ID")
    key = matches[0]
    if key["status"] != "ACTIVE" or key_id in policy["revoked_key_ids"]:
        raise TrustContextError("SIGNING_KEY_NOT_ACTIVE")
    if issuer not in policy["issuers"] or key["issuer"] != issuer:
        raise TrustContextError("ISSUER_NOT_AUTHORIZED")
    return key


def _validated_identity(identity_claims: Mapping[str, Any], policy: Mapping[str, Any]) -> dict[str, Any]:
    """Accept claims only from a separately authenticated OIDC verifier."""
    constraints = policy.get("oidc_constraints")
    if not constraints:
        raise TrustContextError("OIDC_CONSTRAINTS_NOT_CONFIGURED")
    required = ("iss", "sub", "aud", "workflow_ref")
    if any(not identity_claims.get(field) for field in required):
        raise TrustContextError("OIDC_IDENTITY_CLAIMS_MISSING")
    if identity_claims["iss"] not in constraints["allowed_issuers"]:
        raise TrustContextError("OIDC_ISSUER_NOT_ALLOWED")
    if identity_claims["sub"] not in constraints["allowed_subjects"]:
        raise TrustContextError("OIDC_SUBJECT_NOT_ALLOWED")
    aud = identity_claims["aud"]
    audiences = aud if isinstance(aud, list) else [aud]
    if constraints["required_audience"] not in audiences:
        raise TrustContextError("OIDC_AUDIENCE_MISMATCH")
    if identity_claims["workflow_ref"] != constraints["required_workflow_ref"]:
        raise TrustContextError("OIDC_WORKFLOW_REF_MISMATCH")
    return {field: identity_claims[field] for field in required}


def issue_evaluation_context(
    *,
    policy: Mapping[str, Any],
    schema: Mapping[str, Any],
    issuer: str,
    key_id: str,
    private_key: Ed25519PrivateKey,
    identity_claims: Mapping[str, Any],
    audience: str,
    scope: list[str],
    evaluation_boundaries: Mapping[str, Any],
    now: int | None = None,
    ttl_seconds: int = 300,
) -> str:
    """Issue a compact EdDSA-signed ECT; never broadens requested scope."""
    validate_policy(policy, schema)
    if not isinstance(private_key, Ed25519PrivateKey):
        raise TrustContextError("UNSUPPORTED_PRIVATE_KEY_ALGORITHM")
    _key(policy, key_id, issuer)
    identity = _validated_identity(identity_claims, policy)
    if audience not in policy["audiences"]:
        raise TrustContextError("AUDIENCE_NOT_ALLOWED")
    if not isinstance(scope, list) or not scope or len(scope) != len(set(scope)):
        raise TrustContextError("INVALID_SCOPE")
    if any(item not in policy["allowed_scopes"] for item in scope):
        raise TrustContextError("SCOPE_ESCALATION")
    if not isinstance(evaluation_boundaries, Mapping) or not evaluation_boundaries:
        raise TrustContextError("EVALUATION_BOUNDARIES_REQUIRED")
    if isinstance(ttl_seconds, bool) or not isinstance(ttl_seconds, int) or ttl_seconds < 1 or ttl_seconds > policy["max_context_ttl_seconds"]:
        raise TrustContextError("TTL_OUT_OF_POLICY")
    issued_at = int(time.time()) if now is None else int(now)
    claims = {
        "contract_version": "reality-evaluation-context-v0.1",
        "iss": issuer,
        "sub": identity["sub"],
        "aud": audience,
        "iat": issued_at,
        "nbf": issued_at,
        "exp": issued_at + ttl_seconds,
        "jti": str(uuid.uuid4()),
        "key_id": key_id,
        "policy_id": policy["policy_id"],
        "policy_sha256": policy["policy_sha256"],
        "identity": identity,
        "scope": sorted(scope),
        "evaluation_boundaries": dict(evaluation_boundaries),
    }
    header = {"alg": "EdDSA", "typ": "ECT", "kid": key_id}
    signing_input = _b64u(_canonical(header)) + "." + _b64u(_canonical(claims))
    signature = private_key.sign(signing_input.encode("ascii"))
    return signing_input + "." + _b64u(signature)


def verify_evaluation_context(
    token: str,
    *,
    policy: Mapping[str, Any],
    schema: Mapping[str, Any],
    expected_audience: str,
    required_scope: str | None = None,
    now: int | None = None,
    clock_skew_seconds: int = 0,
) -> dict[str, Any]:
    """Verify ECT signature, current policy binding, audience, expiry and scope.

    Replay prevention requires a trusted durable jti store outside this pure verifier.
    """
    validate_policy(policy, schema)
    if not isinstance(token, str):
        raise TrustContextError("TOKEN_MUST_BE_STRING")
    parts = token.split(".")
    if len(parts) != 3:
        raise TrustContextError("MALFORMED_TOKEN")
    try:
        header = json.loads(_unb64u(parts[0]))
        claims = json.loads(_unb64u(parts[1]))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise TrustContextError("MALFORMED_TOKEN_PAYLOAD") from exc
    if header.get("alg") != "EdDSA" or header.get("typ") != "ECT" or header.get("kid") != claims.get("key_id"):
        raise TrustContextError("TOKEN_HEADER_INVALID")
    key = _key(policy, claims.get("key_id", ""), claims.get("iss", ""))
    try:
        public_key = serialization.load_pem_public_key(key["public_key_pem"].encode("utf-8"))
        public_key.verify(_unb64u(parts[2]), (parts[0] + "." + parts[1]).encode("ascii"))
    except InvalidSignature as exc:
        raise TrustContextError("TOKEN_SIGNATURE_INVALID") from exc
    except TrustContextError:
        raise
    except Exception as exc:
        raise TrustContextError("TOKEN_SIGNATURE_INVALID") from exc

    timestamp = int(time.time()) if now is None else int(now)
    if claims.get("contract_version") != "reality-evaluation-context-v0.1":
        raise TrustContextError("CONTEXT_CONTRACT_VERSION_INVALID")
    if claims.get("policy_id") != policy["policy_id"] or claims.get("policy_sha256") != policy["policy_sha256"]:
        raise TrustContextError("CONTEXT_POLICY_BINDING_MISMATCH")
    if claims.get("aud") != expected_audience or expected_audience not in policy["audiences"]:
        raise TrustContextError("TOKEN_AUDIENCE_MISMATCH")
    if not isinstance(claims.get("iat"), int) or not isinstance(claims.get("nbf"), int) or not isinstance(claims.get("exp"), int):
        raise TrustContextError("TOKEN_TIME_CLAIMS_INVALID")
    if claims["iat"] > timestamp + clock_skew_seconds or claims["nbf"] > timestamp + clock_skew_seconds:
        raise TrustContextError("TOKEN_NOT_YET_VALID")
    if claims["exp"] <= timestamp - clock_skew_seconds or claims["exp"] <= claims["iat"]:
        raise TrustContextError("TOKEN_EXPIRED_OR_INVALID")
    if claims["exp"] - claims["iat"] > policy["max_context_ttl_seconds"]:
        raise TrustContextError("TOKEN_TTL_EXCEEDS_POLICY")
    scope = claims.get("scope")
    if not isinstance(scope, list) or not scope or any(item not in policy["allowed_scopes"] for item in scope):
        raise TrustContextError("TOKEN_SCOPE_INVALID")
    if required_scope is not None and required_scope not in scope:
        raise TrustContextError("REQUIRED_SCOPE_MISSING")
    if not claims.get("jti") or not isinstance(claims.get("evaluation_boundaries"), dict) or not claims["evaluation_boundaries"]:
        raise TrustContextError("CONTEXT_BOUNDARIES_OR_ID_MISSING")
    _validated_identity(claims.get("identity", {}), policy)
    if claims.get("sub") != claims["identity"]["sub"]:
        raise TrustContextError("SUBJECT_BINDING_MISMATCH")
    return {
        "status": "VERIFIED_CONTEXT_SIGNATURE_AND_POLICY",
        "claims": claims,
        "production_containment_verified": False,
        "limitations": [
            "OIDC token signature and issuer discovery must be verified upstream before claims are passed to the issuer.",
            "This verifier does not persist jti values; replay prevention requires a trusted durable store.",
            "Trust-policy distribution, key rotation, and revocation freshness are operational responsibilities.",
            "A verified ECT establishes evaluation authorization only, not deployment identity or production safety."
        ]
    }
