import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from schema_gate import GateError, verify_manifest


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


class SchemaGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "schemas").mkdir()
        (self.root / "artifacts").mkdir()
        self.schema = b'{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","required":["value"],"properties":{"value":{"type":"integer"}},"additionalProperties":false}'
        self.payload = b'{"value":7}'
        (self.root / "schemas" / "case.json").write_bytes(self.schema)
        (self.root / "artifacts" / "case.json").write_bytes(self.payload)
        self.entry = {
            "artifact_id": "case-001",
            "path": "artifacts/case.json",
            "sha256": digest(self.payload),
            "schema_path": "schemas/case.json",
            "schema_sha256": digest(self.schema),
        }
        self.write_manifest()

    def tearDown(self):
        self.tmp.cleanup()

    def write_manifest(self, artifacts=None):
        manifest = {"manifest_version": "reality-artifact-manifest-v1", "artifacts": [self.entry] if artifacts is None else artifacts}
        (self.root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    def test_valid_artifact_is_admitted_but_not_scored(self):
        result = verify_manifest(self.root)
        self.assertEqual(result["accepted_count"], 1)
        self.assertEqual(result["rejected_count"], 0)
        self.assertFalse(result["scoring_performed"])
        self.assertEqual(result["accepted_artifacts"][0]["payload"], {"value": 7})

    def test_uppercase_hash_is_rejected_not_normalized(self):
        self.entry["sha256"] = self.entry["sha256"].upper()
        self.write_manifest()
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_malformed_hash_is_rejected(self):
        self.entry["sha256"] = "abc123"
        self.write_manifest()
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_changed_bytes_are_rejected(self):
        (self.root / "artifacts" / "case.json").write_bytes(b'{"value":8}')
        self.assertEqual(verify_manifest(self.root)["rejected_artifacts"][0]["reason"], "ARTIFACT_SHA256_MISMATCH")

    def test_schema_hash_mismatch_is_rejected(self):
        self.entry["schema_sha256"] = "0" * 64
        self.write_manifest()
        self.assertEqual(verify_manifest(self.root)["rejected_artifacts"][0]["reason"], "SCHEMA_SHA256_MISMATCH")

    def test_missing_artifact_is_rejected(self):
        self.entry["path"] = "artifacts/missing.json"
        self.write_manifest()
        self.assertEqual(verify_manifest(self.root)["rejected_artifacts"][0]["reason"], "ARTIFACT_NOT_FOUND")

    def test_path_traversal_is_rejected(self):
        self.entry["path"] = "../outside.json"
        self.write_manifest()
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_schema_failure_is_rejected(self):
        bad_payload = b'{"value":"not-an-integer"}'
        (self.root / "artifacts" / "case.json").write_bytes(bad_payload)
        self.entry["sha256"] = digest(bad_payload)
        self.write_manifest()
        self.assertEqual(verify_manifest(self.root)["rejected_artifacts"][0]["reason"], "SCHEMA_VALIDATION_FAILED")

    def test_bad_artifact_does_not_block_independent_valid_case(self):
        good = dict(self.entry, artifact_id="case-good")
        bad = dict(self.entry, artifact_id="case-bad", sha256="f" * 64)
        self.write_manifest([bad, good])
        result = verify_manifest(self.root)
        self.assertEqual(result["accepted_count"], 1)
        self.assertEqual(result["rejected_count"], 1)
        self.assertEqual(result["accepted_artifacts"][0]["artifact_id"], "case-good")


    def test_unexpected_top_level_field_aborts_manifest(self):
        (self.root / "manifest.json").write_text(json.dumps({
            "manifest_version": "reality-artifact-manifest-v1",
            "artifacts": [self.entry],
            "unauthorized_injection_payload": "malicious",
        }), encoding="utf-8")
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_unexpected_artifact_field_aborts_manifest(self):
        poisoned = dict(self.entry, unauthorized="malicious")
        self.write_manifest([poisoned])
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_artifact_hash_must_be_lowercase_hex(self):
        self.entry["sha256"] = "A" + "a" * 63
        self.write_manifest()
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_manifest_shape_is_validated_before_artifact_access(self):
        self.write_manifest(artifacts=[dict(self.entry, path="../outside.json")])
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_duplicate_ids_are_rejected(self):
        self.write_manifest([self.entry, dict(self.entry)])
        result = verify_manifest(self.root)
        self.assertEqual(result["accepted_count"], 1)
        self.assertEqual(result["rejected_count"], 1)

    def test_invalid_manifest_version_fails_closed(self):
        (self.root / "manifest.json").write_text(json.dumps({"manifest_version": "wrong", "artifacts": []}), encoding="utf-8")
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)


if __name__ == "__main__":
    unittest.main()
