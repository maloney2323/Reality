> **October 26 update:** The isolated benchmark Supabase migration has since been applied and the experimental preview atomic publication flag enabled. The statements below about SQL being *not yet applied* describe an earlier checkpoint, not the current configuration. See [current verified rollout checkpoint](./reality-assistant-posture-and-atomic-publication-installed-20261026.md). No concurrent-request behavior or semantic drift improvement has been independently tested.

# Reality: longitudinal work direction + atomic goal publication (Oct 26, 2026)

**Branch:** draft PR #140. **Status:** code changes staged; no new paid model calls, manual benchmark runs, production deployment, or live DDL applied. Founder has paused tests pending foundational drift architecture completion.

## Why this change

1. Existing assistant goal protection blocks explicit unauthorized shifts, but long-run recommendation drift is not captured by a ledger of *actual assistant work-direction excerpts*. A fluent assistant can continuously reprioritize the work while still mentioning the user's original objective.
2. The prior authenticated chat path checks user-goal freshness and then saves the answer with a separate REST call. Another legitimate goal command can commit between those two requests. A pre-save readback is not an atomic guarantee.

## Changes made

### A. Assistant-originated work-direction trajectory

- **Existing** `src/reality-assistant-trajectory-boundary-v0.1.js` now projects the first-pass assistant recommendation text (bounded excerpts), source response IDs, controlling user goal and goal-review disposition from **existing append-only proposal/authority receipts**. It includes up to eight source-linked recommendation samples in the same cognition state passed to the existing reviewer.
- Previous semantic misalignment candidates count in the work-direction trend even when they were not emitted as explicit blocked goal mutations. Different user-owned goal IDs still interrupt the old-goal streak.
- **Existing** `src/reality-semantic-review-v0.1.js` compares the meaning of the *successive proposed work*, original/current user-goal evidence and authorized detours. It must find an **exact first-pass answer quote** before reporting assistant-led work redirection. The result remains a review *candidate*, not verified semantic truth, and enters the existing `WRONG_TASK` revision/Verifier boundary. No separate model judge or database.
- Limit: this does **not** inspect private model reasoning or guarantee semantic recall. It measures observable recommendations and proposed action direction. False positives and unnoticed subtle drift still require independent adjudication when testing resumes.

### B. Atomic database freshness — prepared, NOT yet activated

- Added reviewed SQL proposal `sql/reality-atomic-goal-publication-v0.1.sql` scoped ONLY to the isolated preview Supabase project `hvkfreoagbrphwghjajw`. It **has not been applied**.
- The existing `universe_events` remains the authoritative user-goal history. A private per-owner/conversation **revision epoch** is a derived concurrency clock, not a new competing GoalState table.
- In the *same transaction as each authoritative goal event INSERT*, a DB trigger obtains a per-user/per-conversation **transaction advisory lock**, validates owner-scoped authenticated user source linkage, and increments the epoch.
- Authenticated assistant publication uses a **server-only** PostgREST RPC whose DB function obtains that **same lock**, compares the source-projected expected revision and last transition ID and inserts the assistant row before releasing the lock. Execute permission is granted to `service_role` only; `anon` and `authenticated` are explicitly revoked. This removes the two-HTTP-request publication TOCTOU race **when installed and enabled**.
- The authenticated Vercel server first verifies the user session and reads back their RLS-owned original message. It then sends the server-attested owner ID over its **isolated server-only database credential**, never from browser JSON or model output. The database checks the original user message exists for that same owner/conversation/request; direct browser assistant inserts are blocked by the planned tightened RLS policy. This publishes no external business action.
- Existing private-chat API conditionally routes to the RPC when `REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED=true`. When **not** enabled, the legacy preview remains functional and its response explicitly reports `LEGACY_FRESHNESS_CHECK_RACE_NOT_ELIMINATED`; no false atomicity claim. An enabled RPC failure **never silently falls back** to legacy insertion.
- Do **not** apply the SQL on its own while serving legacy preview code: tightening the RLS insert policy will reject older direct assistant writes. Coordinate preview migration and feature activation. Production DB/project must remain untouched.
- The new SQL must be reviewed and migrated into normal Supabase migration history with target/configuration double-checks. Do not claim a concurrency SLA before a separately authorized simultaneous-write validation.

## Remaining foundational gaps

- Work-direction comparisons still depend on a probabilistic reviewer; no verified improvement in drift sensitivity, especially gradual assistant-originated shifts across 50+ turns.
- User-owned multi-goal semantic identity, completion/supersession and promptless discovery remain only partially reconciled. Reviewer labels cannot authorize changes.
- Existing append-only Continuity has separate lineage append-read races under concurrent writers; publication epoch locking covers *goal-event commits versus assistant publication*, not every possible ledger event concurrency bug. Atomic general append semantics require further architecture.
- SQL is staged; **atomic publication is not live** until it is applied only in the isolated preview and activated. The normal preview still uses the prior non-atomic check.
- Paused 50-turn test stays paused; no measured drift rate, no claims of zero drifting, no customer actions.

## Release gate

Before turning on the new RPC: confirm project ID and schema owner; review function security/RLS/source attestation; generate and apply proper Supabase migration for the *isolated preview only*; atomically switch the preview route feature flag; and get user authorization to resume validation later. Do not modify production until that work passes independent verification.
