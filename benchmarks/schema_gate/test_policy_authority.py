"""Adversarial tests for independently anchored Policy Authority v1.0."""
from __future__ import annotations

import base64
import copy
import json
import time
import unittest
import uuid

import jwt
from jsonschema import Draft202012Validator
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.asymmetric import rsa

from oidc_identity import VerifiedOIDCIdentity, verify_oidc_identity
from policy_authority import (
    PolicyAuthorityError,
    PolicyAuthorityVerifier,
    canonical_json,
    registry_digest,
    issue_authorized_evaluation_context,
)
from evaluation_context import verify_evaluation_context
from test_evaluation_context import make_policy, identity as make_policy_identity


SUBJECT = "repo:maloney2323/Reality:ref:refs/heads/integration/schema-gate-python-v0.1"
WORKFLOW = "maloney2323/Reality/.github/workflows/schema-gate-integration.yml@refs/heads/integration/schema-gate-python-v0.1"
POLICY_DIGEST = "a" * 64


def make_identity(*, subject=SUBJECT, workflow=WORKFLOW):
    issuer = "https://token.actions.githubusercontent.com"
    audience = "reality-evaluation"
    now = int(time.time())
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()))
    jwk.update({"kid": "oidc-test-key", "use": "sig", "alg": "RS256"})
    token = jwt.encode({
        "iss": issuer, "sub": subject, "aud": audience,
        "iat": now, "nbf": now, "exp": now + 180,
        "jti": str(uuid.uuid4()), "workflow_ref": workflow,
    }, key, algorithm="RS256", headers={"kid": "oidc-test-key"})

    class ReplayStore:
        def __init__(self):
            self.used = set()
        def claim_once(self, token_id, expires_at):
            if token_id in self.used:
                return False
            self.used.add(token_id)
            return True

    return verify_oidc_identity(
        token, jwks={"keys": [jwk]}, expected_issuer=issuer,
        expected_audience=audience, allowed_subjects={subject},
        required_workflow_ref=workflow, replay_store=ReplayStore(),
    )


def make_authority(*, subject=SUBJECT, workflow=WORKFLOW, policy_digest=POLICY_DIGEST, allowed_scopes=None):
    signing_key = Ed25519PrivateKey.generate()
    public_pem = signing_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    registry = {
        "authority_version": "reality-policy-authority-v1.0",
        "authorized_policies": {
            policy_digest: {
                "target_workstream": "ledger_check",
                "max_token_lifetime_seconds": 300,
                "allowed_scopes": allowed_scopes or ["read:evidence", "evaluate:sandbox"],
                "allowed_subjects": [subject],
                "allowed_workflow_refs": [workflow],
            }
        },
    }
    registry["signature"] = base64.urlsafe_b64encode(
        signing_key.sign(canonical_json(registry))
    ).rstrip(b"=").decode()
    pin = registry_digest(registry)
    verifier = PolicyAuthorityVerifier(
        registry=registry,
        trusted_registry_sha256=pin,
        trusted_issuance_public_key_pem=public_pem,
    )
    return verifier, registry, pin, public_pem, signing_key


class PolicyAuthorityTests(unittest.TestCase):
    def setUp(self):
        self.identity = make_identity()
        self.authority, self.registry, self.pin, self.public_pem, self.key = make_authority()

    def authorize(self, **overrides):
        args = {
            "identity": self.identity,
            "requested_policy_digest": POLICY_DIGEST,
            "requested_workstream": "ledger_check",
            "requested_scopes": ["read:evidence"],
            "requested_ttl_seconds": 120,
        }
        args.update(overrides)
        return self.authority.authorize(**args)

    def test_valid_identity_and_policy_returns_narrow_authorized_scope(self):
        result = self.authorize()
        self.assertEqual(result.policy_digest, POLICY_DIGEST)
        self.assertEqual(result.target_workstream, "ledger_check")
        self.assertEqual(result.permissions, ("read:evidence",))
        self.assertEqual(result.max_token_lifetime_seconds, 300)
        self.assertEqual(result.authority_digest, self.pin)

    def test_unknown_policy_digest_rejected(self):
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_DIGEST_NOT_AUTHORIZED"):
            self.authorize(requested_policy_digest="b" * 64)

    def test_registry_content_changed_after_anchor_rejected(self):
        changed = copy.deepcopy(self.registry)
        changed["authorized_policies"][POLICY_DIGEST]["allowed_scopes"].append("production:execute")
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_AUTHORITY_DIGEST_MISMATCH"):
            PolicyAuthorityVerifier(
                registry=changed, trusted_registry_sha256=self.pin,
                trusted_issuance_public_key_pem=self.public_pem,
            )

    def test_registry_signature_tampering_rejected_even_with_recomputed_digest_pin(self):
        changed = copy.deepcopy(self.registry)
        changed["authorized_policies"][POLICY_DIGEST]["allowed_scopes"].append("production:execute")
        changed["signature"] = self.registry["signature"]
        new_pin = registry_digest(changed)
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_AUTHORITY_SIGNATURE_INVALID"):
            PolicyAuthorityVerifier(
                registry=changed, trusted_registry_sha256=new_pin,
                trusted_issuance_public_key_pem=self.public_pem,
            )

    def test_registry_rejects_unknown_top_level_field(self):
        changed = copy.deepcopy(self.registry)
        changed["fallback_policy"] = {"allow": True}
        changed_pin = registry_digest(changed)
        # Re-signing the modified document does not make an unsupported field valid.
        unsigned = {k: v for k, v in changed.items() if k != "signature"}
        changed["signature"] = base64.urlsafe_b64encode(self.key.sign(canonical_json(unsigned))).rstrip(b"=").decode()
        changed_pin = registry_digest(changed)
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_AUTHORITY_FIELDS_INVALID"):
            PolicyAuthorityVerifier(
                registry=changed, trusted_registry_sha256=changed_pin,
                trusted_issuance_public_key_pem=self.public_pem,
            )

    def test_registry_schema_is_strict(self):
        schema = json.loads((Path(__file__).parent / "policy_authority.schema.json").read_text())
        errors = list(Draft202012Validator(schema).iter_errors(self.registry))
        self.assertEqual(errors, [])

    def test_wrong_workstream_rejected(self):
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_WORKSTREAM_MISMATCH"):
            self.authorize(requested_workstream="production_executor")

    def test_wrong_subject_rejected(self):
        wrong = make_identity(subject="repo:attacker/evil:ref:refs/heads/main")
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_IDENTITY_SUBJECT_NOT_AUTHORIZED"):
            self.authorize(identity=wrong)

    def test_wrong_workflow_ref_rejected(self):
        wrong = make_identity(workflow="attacker/evil.yml@refs/heads/main")
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_IDENTITY_WORKFLOW_NOT_AUTHORIZED"):
            self.authorize(identity=wrong)

    def test_scope_escalation_rejected(self):
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_SCOPE_ESCALATION"):
            self.authorize(requested_scopes=["read:evidence", "production:execute"])

    def test_ttl_over_policy_rejected(self):
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_TTL_EXCEEDS_AUTHORITY"):
            self.authorize(requested_ttl_seconds=301)

    def test_duplicate_scope_rejected(self):
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_REQUESTED_SCOPE_DUPLICATE"):
            self.authorize(requested_scopes=["read:evidence", "read:evidence"])

    def test_raw_claims_cannot_authorize(self):
        with self.assertRaisesRegex(PolicyAuthorityError, "OIDC_IDENTITY_NOT_VERIFIED"):
            self.authorize(identity={"sub": SUBJECT, "workflow_ref": WORKFLOW})

    def test_authorized_policy_issues_short_lived_ect_bound_to_authority(self):
        policy, schema, ect_key = make_policy()
        identity = make_policy_identity()
        authority, _registry, authority_pin, _public_pem, _authority_key = make_authority(
            subject=identity.claims["sub"],
            workflow=identity.claims["workflow_ref"],
            policy_digest=policy["policy_sha256"],
            allowed_scopes=["benchmark:execute", "oracle:verify"],
        )
        token = issue_authorized_evaluation_context(
            authority=authority,
            identity=identity,
            requested_policy_digest=policy["policy_sha256"],
            requested_workstream="ledger_check",
            requested_scopes=["benchmark:execute"],
            requested_ttl_seconds=120,
            policy=policy,
            schema=schema,
            issuer="https://reality.example/trust",
            key_id="test-ed25519-key",
            private_key=ect_key,
            audience="reality-benchmark-runner",
            evaluation_boundaries={"case_ids": ["TC-001-DRIFT"]},
            now=1_800_000_000,
        )
        verified = verify_evaluation_context(
            token, policy=policy, schema=schema,
            expected_audience="reality-benchmark-runner",
            required_scope="benchmark:execute", now=1_800_000_050,
        )
        self.assertEqual(
            verified["claims"]["evaluation_boundaries"]["policy_authority_digest"],
            authority_pin,
        )
        self.assertEqual(
            verified["claims"]["evaluation_boundaries"]["target_workstream"],
            "ledger_check",
        )
        self.assertEqual(verified["claims"]["exp"] - verified["claims"]["iat"], 120)

    def test_ect_issuance_rejects_policy_digest_not_matching_policy(self):
        policy, schema, ect_key = make_policy()
        identity = make_policy_identity()
        authority, *_ = make_authority(
            subject=identity.claims["sub"],
            workflow=identity.claims["workflow_ref"],
            policy_digest=policy["policy_sha256"],
            allowed_scopes=["benchmark:execute", "oracle:verify"],
        )
        with self.assertRaisesRegex(PolicyAuthorityError, "REQUESTED_POLICY_DOES_NOT_MATCH_TRUST_POLICY"):
            issue_authorized_evaluation_context(
                authority=authority, identity=identity,
                requested_policy_digest="f" * 64,
                requested_workstream="ledger_check",
                requested_scopes=["benchmark:execute"], requested_ttl_seconds=120,
                policy=policy, schema=schema, issuer="https://reality.example/trust",
                key_id="test-ed25519-key", private_key=ect_key,
                audience="reality-benchmark-runner",
                evaluation_boundaries={"case_ids": ["TC-001-DRIFT"]},
                now=1_800_000_000,
            )

    def test_invalid_anchor_format_rejected(self):
        with self.assertRaisesRegex(PolicyAuthorityError, "POLICY_AUTHORITY_ANCHOR_INVALID"):
            PolicyAuthorityVerifier(
                registry=self.registry, trusted_registry_sha256="not-a-digest",
                trusted_issuance_public_key_pem=self.public_pem,
            )


if __name__ == "__main__":
    unittest.main()
