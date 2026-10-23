# Reality Recovery — Pre-Release Security Audit (2026-10-23)

**Disposition: HOLD — review only, not authorized for live data.**

## Read-only live Supabase findings

- The isolated `public.reality_universe_entries` and `public.reality_conversation_turn_fences` tables have RLS enabled, no visible RLS policies, and owner `postgres`. This is consistent with the intentionally server-only model, NOT by itself a data-exposure finding. Do not create permissive policies merely to silence the linter.
- Visible grants to `service_role`: Universe SELECT/INSERT, fence SELECT/INSERT/UPDATE; no grants to `anon` or `authenticated` on those tables.
- Existing claim/finish/reconcile RPCs are SECURITY INVOKER, not callable by `anon` or `authenticated`, and executable by `service_role`.
- Supabase Security Advisor reports INFO `rls_enabled_no_policy` for these and two other server-only tables; password leaked-protection setting is disabled (WARN). The latter is a **separate authentication hardening item**, not fixed by PR #95.
- Live database was inspected with read-only queries. No migration, RPC invocation or fence update performed.

## Changes made in PR #95 draft only

1. Explicit owner resolution challenge now cryptographically binds to **the exact bearer token fingerprint** and **the exact currently active fence claim fingerprint**, including sequence, token and predecessor pointers; changed session or replaced claim fails closed.
2. Existing five-minute HMAC challenge still requires explicit typed acknowledgment of possible model execution and billing.
3. Disposable PostgreSQL fixture now reproduces RLS-enabled tables, a BYPASSRLS server role, and denied browser roles. Executable SQL checks reject exposed table grants, a publicly callable recovery function, SECURITY DEFINER recovery, or missing late-output trigger.
4. Existing synthetic tests verify atomic receipt writes, concurrency, tamper rejection, rollback, and preservation of the original user instruction.

## Still required before enabling

- **Step-up authentication:** Current `verifyStandaloneUser` validates the bearer at Supabase Auth but does not prove recently reauthenticated identity, MFA, or an `auth.sessions` recency check. A token fingerprint alone is NOT step-up auth. Decide and implement a current, independently verified step-up session boundary (and rate limits).
- **Source-receipt hash verification in PostgreSQL:** The transaction verifies new approval/resolution entries and cross-references original hashes, but does not independently recompute hash integrity of all three original user, PROCESSING, and INTERRUPTED records inside the atomic SQL transaction. A consistency match is NOT independently verified source truth. Add canonical row-hash verification and adversarial tamper tests.
- **Secret privilege exposure:** Ensure the service key and HMAC signing key are server-only, branch-scoped, never rendered in responses or logs. Verify gateway/RPC schemas and role grants on the exact target project before enabling.
- **Migration safety:** Review trigger impact on existing COMMITTED and assistant insert paths, statement timeout, row-lock contention, search_path, permissions, extension location, and backward compatibility. Include lock ordering/race evidence.
- **Audited authorization UX:** Build a two-step, explicit irreversible-action confirmation that refers to the selected original user message and unresolved model state. Never infer approval from ordinary `Send`, chat text or this PR review.
- **Post-transaction independent readback:** Verify exact original source hashes, immutable owner approval, resolution receipt, idle fence and predecessor index. A server timeout must not trigger another model generation.
- **Limited Preview release:** Only on separate explicit owner approval to deploy the migration and, later, to resolve a *specified* interrupted turn. The older user-only interruption is categorically not eligible for this pathway.
- **Production remains out of scope.**

## Release decision

**BLOCKED** until the items above are completed and independently tested. Green CI is evidence of tested scenarios, not authorization to abandon real work.

Relevant platform documentation:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
