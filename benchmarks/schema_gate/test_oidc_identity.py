import json
import unittest

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

from oidc_identity import OIDCIdentityError, VerifiedOIDCIdentity, verify_oidc_identity

ISSUER = "https://token.actions.githubusercontent.com"
AUDIENCE = "https://reality.example/ect"
SUBJECT = "repo:maloney2323/Reality:ref:refs/heads/integration/schema-gate-python-v0.1"
WORKFLOW = "maloney2323/Reality/.github/workflows/schema-gate.yml@refs/heads/integration/schema-gate-python-v0.1"
NOW = 1_800_000_000


class MemoryReplayStore:
    """Test-only atomicity approximation; not suitable for production."""
    def __init__(self):
        self.used = set()

    def claim_once(self, token_id, expires_at):
        if token_id in self.used:
            return False
        self.used.add(token_id)
        return True


class OIDCIdentityTests(unittest.TestCase):
    def setUp(self):
        self.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(self.private_key.public_key()))
        public_jwk.update({"kid": "test-key-1", "use": "sig", "alg": "RS256"})
        self.jwks = {"keys": [public_jwk]}
        self.store = MemoryReplayStore()

    def token(self, **overrides):
        claims = {
            "iss": ISSUER,
            "sub": SUBJECT,
            "aud": AUDIENCE,
            "iat": NOW - 5,
            "nbf": NOW - 5,
            "exp": NOW + 120,
            "jti": "jti-001",
            "workflow_ref": WORKFLOW,
        }
        claims.update(overrides)
        return jwt.encode(claims, self.private_key, algorithm="RS256", headers={"kid": "test-key-1"})

    def verify(self, token=None, **overrides):
        args = {
            "jwks": self.jwks,
            "expected_issuer": ISSUER,
            "expected_audience": AUDIENCE,
            "allowed_subjects": {SUBJECT},
            "required_workflow_ref": WORKFLOW,
            "replay_store": self.store,
            "now": NOW,
        }
        args.update(overrides)
        return verify_oidc_identity(token or self.token(), **args)

    def test_valid_identity_is_verified_and_claims_are_minimized(self):
        identity = self.verify()
        self.assertIsInstance(identity, VerifiedOIDCIdentity)
        self.assertEqual(identity.claims["sub"], SUBJECT)
        self.assertEqual(identity.claims["workflow_ref"], WORKFLOW)
        self.assertNotIn("arbitrary_untrusted_claim", identity.claims)

    def test_identity_cannot_be_constructed_without_verification_proof(self):
        with self.assertRaisesRegex(OIDCIdentityError, "IDENTITY_NOT_VERIFIED"):
            VerifiedOIDCIdentity({"sub": SUBJECT}, object())

    def test_missing_replay_store_fails_closed(self):
        with self.assertRaisesRegex(OIDCIdentityError, "REPLAY_STORE_UNAVAILABLE"):
            self.verify(replay_store=None)

    def test_replayed_jti_is_rejected(self):
        token = self.token()
        self.verify(token)
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_TOKEN_REPLAYED"):
            self.verify(token)

    def test_invalid_signature_rejected(self):
        token = self.token()
        other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        claims = jwt.decode(token, self.private_key.public_key(), algorithms=["RS256"], audience=AUDIENCE, issuer=ISSUER,
                            options={"verify_exp": False, "verify_iat": False, "verify_nbf": False})
        forged = jwt.encode(claims, other, algorithm="RS256", headers={"kid": "test-key-1"})
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_JWT_VERIFICATION_FAILED"):
            self.verify(forged)

    def test_wrong_issuer_rejected(self):
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_JWT_VERIFICATION_FAILED"):
            self.verify(self.token(iss="https://attacker.example"))

    def test_wrong_audience_rejected(self):
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_JWT_VERIFICATION_FAILED"):
            self.verify(self.token(aud="other-audience"))

    def test_unauthorized_subject_rejected(self):
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_SUBJECT_NOT_ALLOWED"):
            self.verify(self.token(sub="repo:attacker/other:ref:refs/heads/main"))

    def test_unauthorized_workflow_rejected(self):
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_WORKFLOW_REF_MISMATCH"):
            self.verify(self.token(workflow_ref="attacker.yml@main"))

    def test_expired_token_rejected(self):
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_TOKEN_EXPIRED_OR_INVALID"):
            self.verify(self.token(exp=NOW - 1, iat=NOW - 20, nbf=NOW - 20))

    def test_not_yet_valid_token_rejected(self):
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_TOKEN_NOT_YET_VALID"):
            self.verify(self.token(iat=NOW + 20, nbf=NOW + 20, exp=NOW + 120))

    def test_non_rs256_algorithm_rejected(self):
        token = jwt.encode(
            {"iss": ISSUER, "sub": SUBJECT, "aud": AUDIENCE, "iat": NOW, "nbf": NOW,
             "exp": NOW + 60, "jti": "alg-jti", "workflow_ref": WORKFLOW},
            "not-a-real-key", algorithm="HS256", headers={"kid": "test-key-1"}
        )
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_ALGORITHM_NOT_ALLOWED"):
            self.verify(token)

    def test_unknown_kid_rejected(self):
        token = jwt.encode(
            {"iss": ISSUER, "sub": SUBJECT, "aud": AUDIENCE, "iat": NOW, "nbf": NOW,
             "exp": NOW + 60, "jti": "unknown-kid", "workflow_ref": WORKFLOW},
            self.private_key, algorithm="RS256", headers={"kid": "unknown"}
        )
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_SIGNING_KEY_UNKNOWN_OR_AMBIGUOUS"):
            self.verify(token)

    def test_duplicate_kid_is_rejected(self):
        self.jwks["keys"].append(dict(self.jwks["keys"][0]))
        with self.assertRaisesRegex(OIDCIdentityError, "OIDC_SIGNING_KEY_UNKNOWN_OR_AMBIGUOUS"):
            self.verify(self.token())


if __name__ == "__main__":
    unittest.main()
