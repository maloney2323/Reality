"""Independent, fail-closed Policy Authority for Evaluation Context Token issuance.

The authority registry is accepted only when its canonical content hash matches a
deployment-supplied digest pin AND its signature verifies against a public key
supplied through a separately trusted configuration channel. The registry file
must not be allowed to supply its own trust root.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any, Mapping

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from oidc_identity import VerifiedOIDCIdentity


class PolicyAuthorityError(ValueError):
    """Raised when independent policy authority cannot authorize a request."""


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def registry_digest(registry: Mapping[str, Any]) -> str:
    unsigned = dict(registry)
    unsigned.pop("signature", None)
    return hashlib.sha256(canonical_json(unsigned)).hexdigest()


def _decode_signature(value: str) -> bytes:
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        raise PolicyAuthorityError("POLICY_AUTHORITY_SIGNATURE_ENCODING_INVALID")
    try:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except Exception as exc:
        raise PolicyAuthorityError("POLICY_AUTHORITY_SIGNATURE_ENCODING_INVALID") from exc


@dataclass(frozen=True)
class AuthorizedScope:
    policy_digest: str
    target_workstream: str
    permissions: tuple[str, ...]
    max_token_lifetime_seconds: int
    authority_digest: str


class PolicyAuthorityVerifier:
    """Verify an externally anchored signed registry and authorize verified identities.

    trusted_registry_sha256 and trusted_issuance_public_key_pem MUST arrive through
    deployment controls independent of the registry file and request payload.
    """

    def __init__(
        self,
        *,
        registry: Mapping[str, Any],
        trusted_registry_sha256: str,
        trusted_issuance_public_key_pem: str,
    ) -> None:
        if not re.fullmatch(r"[0-9a-f]{64}", trusted_registry_sha256 or ""):
            raise PolicyAuthorityError("POLICY_AUTHORITY_ANCHOR_INVALID")
        actual_digest = registry_digest(registry)
        if actual_digest != trusted_registry_sha256:
            raise PolicyAuthorityError("POLICY_AUTHORITY_DIGEST_MISMATCH")
        signature = registry.get("signature")
        if not isinstance(signature, str):
            raise PolicyAuthorityError("POLICY_AUTHORITY_SIGNATURE_REQUIRED")
        try:
            public_key = serialization.load_pem_public_key(trusted_issuance_public_key_pem.encode("utf-8"))
        except Exception as exc:
            raise PolicyAuthorityError("POLICY_AUTHORITY_PUBLIC_KEY_INVALID") from exc
        if not isinstance(public_key, Ed25519PublicKey):
            raise PolicyAuthorityError("POLICY_AUTHORITY_ALGORITHM_NOT_ALLOWED")
        try:
            public_key.verify(_decode_signature(signature), canonical_json({k: v for k, v in registry.items() if k != "signature"}))
        except InvalidSignature as exc:
            raise PolicyAuthorityError("POLICY_AUTHORITY_SIGNATURE_INVALID") from exc
        except PolicyAuthorityError:
            raise
        except Exception as exc:
            raise PolicyAuthorityError("POLICY_AUTHORITY_SIGNATURE_INVALID") from exc

        if registry.get("authority_version") != "reality-policy-authority-v1.0":
            raise PolicyAuthorityError("POLICY_AUTHORITY_VERSION_UNSUPPORTED")
        policies = registry.get("authorized_policies")
        if not isinstance(policies, dict) or not policies:
            raise PolicyAuthorityError("POLICY_AUTHORITY_POLICIES_INVALID")
        for digest, entry in policies.items():
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                raise PolicyAuthorityError("POLICY_DIGEST_INVALID")
            if not isinstance(entry, dict):
                raise PolicyAuthorityError("POLICY_AUTHORITY_ENTRY_INVALID")
            if not isinstance(entry.get("target_workstream"), str) or not entry["target_workstream"]:
                raise PolicyAuthorityError("POLICY_WORKSTREAM_INVALID")
            scopes = entry.get("allowed_scopes")
            if (not isinstance(scopes, list) or not scopes
                    or any(not isinstance(s, str) or not s for s in scopes)
                    or len(scopes) != len(set(scopes))):
                raise PolicyAuthorityError("POLICY_AUTHORITY_SCOPES_INVALID")
            ttl = entry.get("max_token_lifetime_seconds")
            if isinstance(ttl, bool) or not isinstance(ttl, int) or not 1 <= ttl <= 900:
                raise PolicyAuthorityError("POLICY_AUTHORITY_TTL_INVALID")
            subjects = entry.get("allowed_subjects")
            workflows = entry.get("allowed_workflow_refs")
            if (not isinstance(subjects, list) or not subjects
                    or any(not isinstance(x, str) or not x for x in subjects)):
                raise PolicyAuthorityError("POLICY_AUTHORITY_SUBJECTS_INVALID")
            if (not isinstance(workflows, list) or not workflows
                    or any(not isinstance(x, str) or not x for x in workflows)):
                raise PolicyAuthorityError("POLICY_AUTHORITY_WORKFLOWS_INVALID")
        self._policies = json.loads(json.dumps(policies))
        self.authority_digest = actual_digest

    def authorize(
        self,
        *,
        identity: VerifiedOIDCIdentity,
        requested_policy_digest: str,
        requested_workstream: str,
        requested_scopes: list[str],
        requested_ttl_seconds: int,
    ) -> AuthorizedScope:
        if not isinstance(identity, VerifiedOIDCIdentity):
            raise PolicyAuthorityError("OIDC_IDENTITY_NOT_VERIFIED")
        if not re.fullmatch(r"[0-9a-f]{64}", requested_policy_digest or ""):
            raise PolicyAuthorityError("POLICY_DIGEST_INVALID")
        entry = self._policies.get(requested_policy_digest)
        if entry is None:
            raise PolicyAuthorityError("POLICY_DIGEST_NOT_AUTHORIZED")
        if requested_workstream != entry["target_workstream"]:
            raise PolicyAuthorityError("POLICY_WORKSTREAM_MISMATCH")
        claims = identity.claims
        if claims.get("sub") not in entry["allowed_subjects"]:
            raise PolicyAuthorityError("POLICY_IDENTITY_SUBJECT_NOT_AUTHORIZED")
        if claims.get("workflow_ref") not in entry["allowed_workflow_refs"]:
            raise PolicyAuthorityError("POLICY_IDENTITY_WORKFLOW_NOT_AUTHORIZED")
        if not isinstance(requested_scopes, list) or not requested_scopes:
            raise PolicyAuthorityError("POLICY_REQUESTED_SCOPE_INVALID")
        if len(requested_scopes) != len(set(requested_scopes)):
            raise PolicyAuthorityError("POLICY_REQUESTED_SCOPE_DUPLICATE")
        if any(scope not in entry["allowed_scopes"] for scope in requested_scopes):
            raise PolicyAuthorityError("POLICY_SCOPE_ESCALATION")
        if (isinstance(requested_ttl_seconds, bool) or not isinstance(requested_ttl_seconds, int)
                or not 1 <= requested_ttl_seconds <= entry["max_token_lifetime_seconds"]):
            raise PolicyAuthorityError("POLICY_TTL_EXCEEDS_AUTHORITY")
        return AuthorizedScope(
            policy_digest=requested_policy_digest,
            target_workstream=entry["target_workstream"],
            permissions=tuple(sorted(requested_scopes)),
            max_token_lifetime_seconds=entry["max_token_lifetime_seconds"],
            authority_digest=self.authority_digest,
        )
