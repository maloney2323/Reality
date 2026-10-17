import copy
import json
import unittest
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from evaluation_context import (
    TrustContextError,
    issue_evaluation_context,
    policy_digest,
    verify_evaluation_context,
)

ROOT = Path(__file__).parent


def make_policy(private_key=None):
    private_key = private_key or Ed25519PrivateKey.generate()
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    policy = {
        "contract_version": "reality-trust-policy-v0.1",
        "policy_id": "test-policy-v0.1",
        "policy_sha256": "0" * 64,
        "issuers": ["https://reality.example/trust"],
        "audiences": ["reality-benchmark-runner"],
        "keys": [{
            "key_id": "test-ed25519-key",
            "issuer": "https://reality.example/trust",
            "algorithm": "EdDSA",
            "public_key_pem": public_pem,
            "status": "ACTIVE",
        }],
        "oidc_constraints": {
            "allowed_issuers": ["https://token.actions.githubusercontent.com"],
            "allowed_subjects": ["repo:maloney2323/Reality:ref:refs/heads/integration/schema-gate-python-v0.1"],
            "required_audience": "https://reality.example/ect",
            "required_workflow_ref": "maloney2323/Reality/.github/workflows/schema-gate.yml@refs/heads/integration/schema-gate-python-v0.1",
        },
        "max_context_ttl_seconds": 300,
        "allowed_scopes": ["benchmark:execute", "oracle:verify"],
        "revoked_key_ids": [],
    }
    policy["policy_sha256"] = policy_digest(policy)
    schema = json.loads((ROOT / "trust_policy.schema.json").read_text(encoding="utf-8"))
    return policy, schema, private_key


def identity():
    return {
        "iss": "https://token.actions.githubusercontent.com",
        "sub": "repo:maloney2323/Reality:ref:refs/heads/integration/schema-gate-python-v0.1",
        "aud": "https://reality.example/ect",
        "workflow_ref": "maloney2323/Reality/.github/workflows/schema-gate.yml@refs/heads/integration/schema-gate-python-v0.1",
    }


def issue(policy, schema, key, **overrides):
    args = {
        "policy": policy,
        "schema": schema,
        "issuer": "https://reality.example/trust",
        "key_id": "test-ed25519-key",
        "private_key": key,
        "identity_claims": identity(),
        "audience": "reality-benchmark-runner",
        "scope": ["benchmark:execute"],
        "evaluation_boundaries": {"case_ids": ["TC-001-DRIFT"], "mode": "read-only"},
        "now": 1_800_000_000,
        "ttl_seconds": 120,
    }
    args.update(overrides)
    return issue_evaluation_context(**args)


class EvaluationContextTests(unittest.TestCase):
    def setUp(self):
        self.policy, self.schema, self.key = make_policy()

    def test_valid_context_verifies_and_does_not_claim_containment(self):
        token = issue(self.policy, self.schema, self.key)
        result = verify_evaluation_context(
            token, policy=self.policy, schema=self.schema,
            expected_audience="reality-benchmark-runner",
            required_scope="benchmark:execute", now=1_800_000_050,
        )
        self.assertEqual(result["status"], "VERIFIED_CONTEXT_SIGNATURE_AND_POLICY")
        self.assertFalse(result["production_containment_verified"])
        self.assertEqual(result["claims"]["evaluation_boundaries"]["case_ids"], ["TC-001-DRIFT"])

    def test_tampered_claim_is_rejected(self):
        token = issue(self.policy, self.schema, self.key)
        header, payload, signature = token.split(".")
        import base64
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        claims["scope"] = ["benchmark:execute", "oracle:verify"]
        encoded = base64.urlsafe_b64encode(json.dumps(claims, sort_keys=True, separators=(",", ":")).encode()).rstrip(b"=").decode()
        tampered = header + "." + encoded + "." + signature
        with self.assertRaisesRegex(TrustContextError, "TOKEN_SIGNATURE_INVALID"):
            verify_evaluation_context(tampered, policy=self.policy, schema=self.schema,
                expected_audience="reality-benchmark-runner", now=1_800_000_050)

    def test_expired_context_rejected(self):
        token = issue(self.policy, self.schema, self.key)
        with self.assertRaisesRegex(TrustContextError, "TOKEN_EXPIRED_OR_INVALID"):
            verify_evaluation_context(token, policy=self.policy, schema=self.schema,
                expected_audience="reality-benchmark-runner", now=1_800_000_121)

    def test_wrong_audience_rejected(self):
        token = issue(self.policy, self.schema, self.key)
        with self.assertRaisesRegex(TrustContextError, "TOKEN_AUDIENCE_MISMATCH"):
            verify_evaluation_context(token, policy=self.policy, schema=self.schema,
                expected_audience="production-executor", now=1_800_000_050)

    def test_scope_escalation_rejected_at_issuance(self):
        with self.assertRaisesRegex(TrustContextError, "SCOPE_ESCALATION"):
            issue(self.policy, self.schema, self.key, scope=["production:execute"])

    def test_revoked_key_rejected(self):
        token = issue(self.policy, self.schema, self.key)
        revoked = copy.deepcopy(self.policy)
        revoked["keys"][0]["status"] = "REVOKED"
        revoked["revoked_key_ids"] = ["test-ed25519-key"]
        revoked["policy_sha256"] = policy_digest(revoked)
        with self.assertRaisesRegex(TrustContextError, "SIGNING_KEY_NOT_ACTIVE"):
            verify_evaluation_context(token, policy=revoked, schema=self.schema,
                expected_audience="reality-benchmark-runner", now=1_800_000_050)

    def test_oidc_subject_not_allowed(self):
        bad_identity = identity()
        bad_identity["sub"] = "repo:attacker/other:ref:refs/heads/main"
        with self.assertRaisesRegex(TrustContextError, "OIDC_SUBJECT_NOT_ALLOWED"):
            issue(self.policy, self.schema, self.key, identity_claims=bad_identity)

    def test_policy_digest_tampering_rejected(self):
        tampered = copy.deepcopy(self.policy)
        tampered["allowed_scopes"].append("production:execute")
        with self.assertRaisesRegex(TrustContextError, "TRUST_POLICY_DIGEST_MISMATCH"):
            issue(tampered, self.schema, self.key)

    def test_ttl_above_policy_rejected(self):
        with self.assertRaisesRegex(TrustContextError, "TTL_OUT_OF_POLICY"):
            issue(self.policy, self.schema, self.key, ttl_seconds=301)

    def test_empty_boundaries_rejected(self):
        with self.assertRaisesRegex(TrustContextError, "EVALUATION_BOUNDARIES_REQUIRED"):
            issue(self.policy, self.schema, self.key, evaluation_boundaries={})


if __name__ == "__main__":
    unittest.main()
