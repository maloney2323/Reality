# Reality Schema Gate (isolated Python evaluator)

Status: integration candidate; not a production gate and not evidence of detector accuracy.

This package verifies a manifest and artifact bytes before any artifact is admitted to evaluation. It is deliberately isolated from Reality's Node.js runtime.

## Contract

Manifest JSON shape:

```json
{
  "manifest_version": "reality-artifact-manifest-v1",
  "artifacts": [
    {
      "artifact_id": "example-case-001",
      "path": "artifacts/case-001.json",
      "sha256": "64 lowercase hexadecimal characters",
      "schema_path": "schemas/case.schema.json",
      "schema_sha256": "64 lowercase hexadecimal characters"
    }
  ]
}
```

All paths are relative to the supplied evidence root. Absolute paths, parent traversal, symlinks, missing files, duplicate IDs, malformed or uppercase hashes, digest mismatches, malformed JSON, and schema failures are rejected. Only accepted artifact records are returned to a caller; rejected records cannot be included in its score unless the caller ignores this contract.

## Run

```sh
python -m pip install -r benchmarks/schema_gate/requirements.txt
python -m unittest discover -s benchmarks/schema_gate -p 'test_*.py' -v
python benchmarks/schema_gate/schema_gate.py --root benchmarks/schema_gate/fixtures --manifest manifest.json
```

The fixture command is a smoke test only. Do not report its fixture counts as Reality performance. Candidate archive provenance and its own original tests remain separate; this harness does not replace or silently rewrite them.
