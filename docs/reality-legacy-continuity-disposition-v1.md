# Legacy Continuity Chain Disposition v1

**Status:** Proposed non-destructive disposition for review  
**Scope:** The legacy two-event production chain identified in the read-only continuity audit.  
**Production changes:** None. This document does not authorize a database write, migration, deployment, or history rewrite.

## Decision

Quarantine the legacy chain as **LEGACY_UNVERIFIABLE**. Preserve every original row and its original payload, timestamps, event IDs, parent references, and lineage hashes exactly as stored. Do not reinterpret the legacy placeholder hashes as valid cryptographic attestations.

The chain is not eligible to seed, resume, or be extended by the current verified continuity runtime. In particular, the legacy `CAPABILITY_VERIFIED` event kind is not silently mapped to the current `CAPABILITY` stage: the labels do not establish semantic equivalence, and the historical hash cannot currently be verified against the current contract.

## Why

The read-only audit found a two-event legacy chain with tied `created_at` timestamps and legacy placeholder lineage hashes. The current contract reconstructs order from parent links, but parent topology alone does not prove event integrity. Automatically promoting this chain would overstate what the available evidence establishes.

## Required runtime behavior

1. Preserve the legacy rows as immutable historical records.
2. Return a specific fail-closed disposition such as `LEGACY_UNVERIFIABLE` / `CONTINUITY_HISTORY_INVALID` when the chain is presented to the current verifier.
3. Do not append a current-contract event to that chain, repair hashes in place, rewrite timestamps, or delete rows.
4. Start new verified workflows on a clean continuity root/worldline, with their own complete evidence and lineage.
5. Keep any future compatibility importer read-only and separate from the authoritative verifier. It may produce a derived migration report, but must not convert a legacy assertion into verified evidence without an independently supported migration contract.

## Release gates

- The legacy disposition is represented in operator-facing diagnostics and covered by a test.
- The current continuity-specific tests pass.
- The PostgreSQL atomic append suite passes against a non-production database.
- The persistence adapter is confirmed to call the atomic append RPC before the migration is applied anywhere persistent.
- The 15 failures in the recorded full-regression run are compared against the base branch; pre-existing failures must be documented separately, and no continuity regression may be waived as baseline noise.
- No production migration, deployment, or external execution occurs without separate explicit authorization.

## Evidence boundary

This is a policy decision based on the recorded read-only audit, not a claim that the production chain has been repaired or re-verified. The production database remains unchanged.
