# Reality — Preview Authentication and Approval-Store Integration Proof

Date: **2026-10-21**. Scope: **Preview + isolated benchmark database**. No production deployment, paid model call, customer data manipulation, external connector write, or owner-signing-key creation was performed.

## Verified Vercel Preview runtime

- Vercel project `reality`, project ID `prj_5A3b0WG9IuvzyEUBw9tD9v8jcha8`.
- Preview SHA initially verified: `f9e770f5ce170f1b353205842800a0f568934cfe`.
- Dedicated Preview: `dpl_Croxfw8qGsvZJSSXBERUtJ3kunu9`, `https://reality-duuqfbgyd-maloney2323-5310s-projects.vercel.app`.
- `GET /api/health` → HTTP 200, exact deployment ID/commit, `VERCEL_ENV=preview`.
- `GET /api/reality/execute` → HTTP 405 (previous crash fixed).
- Via a temporary Vercel-authenticated Preview access link, real `POST` calls to `/api/chat`, `/api/reality/execute`, and `/api/reality/authority`:
  - No Bearer credentials → HTTP **401 AUTHENTICATION_REQUIRED** on all three routes.
  - Intentionally invalid Bearer → HTTP **401 INVALID_SESSION** on all three routes.
  - Included forged approval in unauthenticated execution request; no execution occurred.
- Branch-scoped Preview environment variable `REALITY_GOVERNED_EXECUTION_ENABLED=false` explicitly configured. Health confirms `governed_execution_endpoint_enabled:false`.
- Health also reports `model_configured:false`, `server_execution_bridge_configured:false`, and `owner_promotion_public_key_configured:false`. This is a deliberate incomplete integration environment, not production-readiness evidence.

## Live, separate Supabase benchmark database: owner consent

**Project:** `reality-continuity-benchmark` (ID `hvkfreoagbrphwghjajw`). This is a distinct project from Reality's `reality-universe` production-facing database. Only the benchmark project was modified.

- Applied migration `reality_owner_approval_consumptions_benchmark_v01`: private `reality_governance.owner_approval_consumptions`, unique `approval_key`, RLS, no `anon` or `authenticated` privileges.
- Applied migration `reality_benchmark_insert_only_owner_approval_role_v01`: `reality_preview_approval_writer` **NOLOGIN**, schema USAGE, table INSERT, insert-only RLS policy, no SELECT/UPDATE/DELETE. Test administrator role membership was also granted **within this benchmark project only**, to support `SET LOCAL ROLE` checks.
- Verified PostgreSQL ACLs:
  - `anon`/ `authenticated`: no schema usage, no INSERT.
  - Restricted writer: schema USAGE and INSERT yes; SELECT no.
- **Administrator-path replay test:** eight concurrent `INSERT ... ON CONFLICT DO NOTHING` attempts for the same approval key → one persisted record.
- **Restricted-role replay test:** eight concurrent attempts for the same separate key using `SET LOCAL ROLE reality_preview_approval_writer` → all SQL calls returned without error; administrator readback showed exactly one persisted record.
- **Permission denial test:** restricted writer `SELECT` from the table failed with PostgreSQL permission denied (42501).
- **Expiry test:** restricted writer attempted an expired approval; persisted row count was zero.
- Important discovery: `RETURNING` and `ON CONFLICT (approval_key) DO NOTHING` demanded SELECT permissions; the final GitHub adapter now uses `ON CONFLICT DO NOTHING`, no `RETURNING`, relying on a trusted PostgreSQL driver's integer rowCount. That driver interface still needs a live Vercel-to-DB integration test.

## Scope boundaries / release prerequisites

1. Positive authenticated Base44 session has **not** yet been exercised from Preview; no user bearer token was retrieved, generated, or copied. A real session must be tested through the legitimate app login without sharing a token in chat.
2. Preview has no dedicated OpenAI key, so no real generated answer was produced. Do not copy production credentials without separate scope and ownership review.
3. The private benchmark DB is proven in isolation. The Vercel server has **not** been wired to a dedicated restricted database role or a trusted Postgres driver.
4. Owner's human signing key and key custody are not yet provisioned; no capability upgrade or promotion was authorized.
5. The execution flag is **off**, so provider side effects and successful independent readback are still untested.
6. Green GitHub CI and Vercel `READY` are not evidence of end-to-end success, general hallucination elimination, or a complete original-customer-task recovery loop.

**Verdict:** `PREVIEW_RUNNING` + `AUTH_NEGATIVE_PATH_VERIFIED` + `PRIVATE_DB_ATOMICITY_VERIFIED`; `AUTH_POSITIVE_PATH_NOT_VERIFIED`; `DB_DRIVER_NOT_WIRED`; `PRODUCTION_RELEASE_BLOCKED`.
