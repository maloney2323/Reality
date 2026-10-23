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
5. NEW: provider-authenticated JWT AMR recency guard, fail-closed stale/foreign-session tests; SQL source-hash recalculation and three executed adversarial PostgreSQL source-tamper tests. Both CI workflows passed on this draft branch.

## Still required before enabling

- **Step-up authentication (code guard added; live UX still pending):** Recovery now uses the *same* bearer already validated via Supabase Auth `/auth/v1/user`, then requires a matching Supabase provider-issued JWT `amr` authentication-method timestamp within five minutes. Merely refreshed `iat` is insufficient. JWT identity, issuer, audience, role, expiry and session ID are validated, and the approval challenge remains bound to that exact token and claim. Synthetic tests pass; live reauthentication flow, actual AMR format, MFA/recovery options, anti-abuse rate limiting and secure confirmation UX still require validation. This is a recent-authentication gate, NOT an independently verified live MFA enrollment or `auth.sessions` recency proof.
- **Source-receipt hash verification (implemented in draft, disposable PostgreSQL verified):** Atomic SQL recomputes original source hashes from stored Universe columns. Separate synthetic modifications to the user, PROCESSING, and INTERRUPTED payloads each cause `REALITY_ABANDONMENT_SOURCE_HASH_INVALID`, roll back cleanly and retain the original busy fence. JS/Supabase timestamp variations must still be checked against real Preview rows read-only before enabling.
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
