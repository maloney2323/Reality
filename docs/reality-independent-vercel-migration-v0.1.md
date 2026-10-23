# Reality — GitHub/Vercel independent customer path: migration proof v0.1
October 22, 2026. Review-only draft. No production aliases, Base44 code, users, database records, OAuth grants or credentials were changed.

## Purpose
Demonstrate an actual, server-owned authenticated Vercel path into the **existing** Reality foundation without relying on Base44 integration credits or its chat endpoints. This is NOT a completed move of the customer's Base44 frontend/data, nor a production release.

- Canonical code: https://github.com/maloney2323/Reality
- Existing Vercel project: \`reality\`, production alias \`reality-blond.vercel.app\` (old commit).
- Isolated new page: \`/standalone.html\`, not a replacement for root \`/\`. The full Base44 UI is **not** reproduced or copied.
- New API: \`POST /api/reality/standalone-chat\`, \`GET /api/reality/standalone-config\`.
- Both endpoints are disabled until \`REALITY_STANDALONE_CHAT_ENABLED=true\`.
- Server demands \`REALITY_UNIVERSE_PERSISTENCE_ENABLED=true\`, Supabase Auth \`SUPABASE_URL\` and public \`SUPABASE_PUBLISHABLE_KEY\`, plus Reality's existing server-only Universe persistence secret and OpenAI key. Do not expose \`SUPABASE_SECRET_KEY\` in browser.
- Preview currently has names \`SUPABASE_URL\`, \`SUPABASE_PUBLISHABLE_KEY\`, \`SUPABASE_SECRET_KEY\`, \`REALITY_UNIVERSE_PERSISTENCE_ENABLED\` in Vercel settings. Their correctness and the actual persistence outcome are **not** established by seeing variable names. No migration preview toggle was enabled by this PR.

## Authentication and continuity
1. A browser signs in with a separate Supabase Auth user account using the project's public key (not Base44 credentials); server independently calls \`GET /auth/v1/user\` using the user's JWT, per Supabase docs. Unverified/anonymous users are refused. No trust in decoded-but-unverified JWT claims or browser-provided principal, role, root, history, authority, evidence or connected records.
2. The server derives its own continuity root from **verified Supabase user ID + Thought selector + conversation selector**, so another user supplying the same selectors cannot access that root.
3. The existing scoped Universe API retrieves immutable, persisted message events, filters by authenticated user/root/worldline, and reconstructs a **bounded** 60-turn window of original speaker-scoped messages. This window does NOT prove all older commitments were selected.
4. A user message is appended to the Universe and independently read back BEFORE the model call. Actual Reality cognition then receives the server-authoritative root, restored user/assistant messages and verified identity. The existing Integrity Spine, source checks and retrospective drift assessment run without Base44 service calls.
5. Existing cognition/Continuity Ledger handoffs must also return independent readback receipts. Then the raw model response is appended as an assistant conversation observation with readback. The outward answer is only acknowledged as successful if all these steps succeed.
6. Conversation entries are OBSERVATIONS, never claims of independently confirmed external truth or permission to execute work.
7. No external work executor is called from the new chat transport. Autonomous operations still require independent authorization and verification.

## Intentional exclusions
- **Base44 data migration and account migration:** not performed. Supabase users have new independent identities; no implicit mapping between Base44 IDs and Supabase UUIDs.
- **Existing application UX:** Base44's full Personal/Business/Team interface is still only available through the Base44 app. The new page is a proof console, not design parity.
- **Long conversation recovery:** live reply consumes at most 60 stored chat events from the scoped 100-entry retrieval window; it cannot certify global continuity. Work-item ledger retrieval is separately scoped inside Reality.
- **Turn retry semantics:** duplicate \`turn_id\` fails rather than silently overwriting an existing message. A later release requires idempotent request receipts/recovery for interrupted turns.
- **Sign-up and email verification:** depend on Supabase Auth project policies and redirect configuration. No account was created or credentials sent during CI.
- **Independent model evaluation:** no real model used in tests. The new code reuses existing, incomplete drift extraction; does not establish a verified hallucination percentage, 100-turn performance, or ROI.
- **Deployment:** no merge or production alias reassignment. Auto-created Vercel previews may be deployment-protected.

## Live preview isolation check — 2026-10-22

Read-only checks confirmed two Supabase projects: **reality-universe** (existing main Universe; 1 Auth user and 2 ledger entries) and **reality-continuity-benchmark** (separate benchmark project; 0 Auth users, compatible `reality_universe_entries` table). Both have row-level security enabled. The main Universe exposes a service-role-only policy; the benchmark has no public table policies.

The draft migration branch has its own Vercel **Preview-only** public configuration pointing Auth and Universe to the benchmark Supabase project (`hvkfreoagbrphwghjajw`). This update did **not** touch production environments, add a server secret, create any user, or write a database row. `REALITY_STANDALONE_CHAT_ENABLED=false` remains explicitly set for that preview branch.

The pilot now fails closed unless all the following hold before even calling authentication:
- it is **not** a Vercel production runtime;
- `REALITY_STANDALONE_EXPECTED_PROJECT_REF` is explicitly set;
- the Supabase Auth URL and Reality Universe persistence URL **exactly match** that selected project;
- separate server-only persistence credentials and the chat flag are configured.

**Important:** The preview build will be redeployed to pick up these Preview-only environment settings, but signing in and running full live cognition will remain disabled until the sandbox server secret, correct role permissions, retry behavior, and live account tests are independently verified. Never copy the main Universe database's secret into the benchmark preview.

## Cold-start continuity and UI readback hardening (draft)

- The standalone transport now retrieves `AUTHENTICATED_CONVERSATION_MESSAGE` entries with an explicit owner-root/worldline/event-kind query rather than naively selecting the most recent 100 events of *all* types. Work diagnostics and other Universe events cannot evict chat messages from that bounded history window.
- The existing Universe retrieval function supports an optional exact validated `eventKind` filter; unrecognized filter syntax is rejected, and unfiltered existing callers continue to behave as before.
- The server refuses both synthetic and concurrent duplicate `turn_id` persistence outcomes before triggering a second model call, and refuses to acknowledge an assistant reply until its own message write is confirmed. A durable, exact-once request-recovery protocol is **not** yet implemented.
- Each assistant message stores the **unmodified raw model output** for retrospective drift comparison and the **exact displayed reply** (including an integrity notice) for the customer-facing transcript. This prevents a customer reopening a thought from seeing a different message from the one previously displayed.
- The read-only `GET /api/reality/standalone-history?conversation_id=...&thought_id=...` endpoint verifies the server-side Supabase user and derives the exact same owner-scoped root as POST. It refuses extra query fields and returns only that principal's bounded previous messages; the frontend reloads them when the user signs in.
- A recovered 60-message window is **not** a verified complete history, global memory, or proof all business commitments survived selection. The canonical Universe/Continuity remains separate from the customer-visible transcript.
- New mocked tests simulate two calls across fresh handler instances while preserving only a durable ledger map, two authenticated users with identical conversation selectors, storage conflicts, output readback failures, and historical drift notices. All external providers are stubbed; independent live sign-in and real Supabase write/readback remain **unverified**.
- No real accounts were created, no benchmark DB records were changed, and no production alias was reassigned. `REALITY_STANDALONE_CHAT_ENABLED=false` remains the Preview-branch default.

## Approval/release path
1. Review PR changes and merge dependencies: this draft branches from the earlier unmerged drift/continuity stack (#77, #79–86). Must establish the single canonical release commit before promotion.
2. Confirm \`SUPABASE_URL\` and public key refer to the same dedicated Reality Auth project, and server-only persistence uses the intended tenant-isolated Universe. Do not read or paste secrets into chat.
3. Enable \`REALITY_STANDALONE_CHAT_ENABLED\` **in an isolated Preview environment only**, once ready; never enable production until approval.
4. Test actual sign-in, fixed-identity two-turn continuity, cold restart, cross-account isolation and unauthenticated refusal, using consented synthetic accounts and no real customer data.
5. Demonstrate a Turn 1→2→3 subtle drift and retrospective recovery with real persisted history and a capped OpenAI budget.
6. Recover or recreate Base44 interface and migrate existing data only after export scope/consent and source-to-source evidence audit. Keep Base44 customer app running during transition.
7. Promote **exact tested commit** to Vercel production with rollback and owner authorization; use existing free \`vercel.app\` address until a paid domain is justified.

## Tested automatically (no provider charges)
\`node --test test/reality-standalone-chat-v0.1.test.js\`
Existing model integrity and early/retrospective drift regression suites also run.

**Success criterion for this PR:** the standalone identity and continuity boundary works under mocked network/persistence, rejects spoofing/cross-tenant history, and requires independent durable receipts. Not an assertion of live product readiness.
