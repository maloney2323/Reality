# Reality: end-to-end authenticated goal and assistant publication boundary
**Date:** October 26, 2026. **Branch:** `experiment/reality-live-durable-adversarial-20261025`. Draft PR #140. No production deployment, new goal tables, paid model calls, or continuation of the paused founder benchmark.

## Reuse the already built foundation

Reality's verified source-identity stack is Signal Cleaner → existing append-only Supabase Continuity → authenticated user-owned goal projection → Cognition → structured assistant proposal → existing semantic Verifier and Integrity Spine → exact-text final publication decision → atomic authenticated assistant save.

There is **no need** to create mutable duplicate `GoalState` and `GoalTransition` tables. The isolated project's source-linked `universe_events` stores authenticated user goal transitions. A private revision epoch is a derived concurrency lock, not a competing source of authority.

Read-only schema confirmation on October 26:
- `public.universe_events` exists.
- `reality_internal.goal_publication_epochs` exists.
- `public.reality_publish_assistant_if_goal_current(p_user_id uuid, p_conversation_id uuid, p_request_id uuid, p_content text, p_expected_goal_revision bigint, p_expected_last_goal_event_id uuid)` exists.
- EXECUTE permitted for `service_role`, denied to `authenticated`.

## This integration pass's concrete publication fix

Previous code already verified the final output inside `runLiveIntelligenceOrchestration`, then `api/reality/personal-chat.js` called `.trim()` on that text before database publication. This created a gap between the bytes in the final source-linked direction receipt and the bytes published to the customer's persistent conversation. The same route also retained a non-atomic legacy assistant insert branch, even though the isolated database's tightened RLS only supports the installed server-only atomic RPC.

Added `src/reality-final-chat-publication-proof-v0.1.js` and wired it into the signed-in chat route:
1. Require a durably read-back canonical source frame and exact final direction-release receipt.
2. Compare a fresh SHA-256 hash of the **actual text to be published**, including whitespace, to the final Integrity receipt's exact text hash. Reject any replacement or trimming.
3. Verify the server's authoritative goal-revision snapshot exists. A model cannot supply this source.
4. If the final release was **withheld for an off-goal proposal**, only the existing safe rewritten explanation can be published.
5. Require `REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED=true` for private chat; **do not fall back** to the old two-HTTP-request/directed-insert route.
6. Commit exact verified bytes via the server-only `reality_publish_assistant_if_goal_current` RPC, which checks the latest user message and same-conversation goal revision atomically before inserting. Read back the actual saved assistant message.
7. Expose a source-linked final-publication proof and the existing goal governance / direction-review disposition in the authenticated chat response.

No new guardrail model, no second ledger, no duplicate goal table, no broader execution grant.

## Verification scope

- Six GitHub CI jobs passed on commit `73e874e76e8762245e20577a9cc44dfe4d2b8a1b`. This includes existing authenticated-chat fixture and new no-cost exact-final-publication contract cases for whitespace mismatch, missing source receipt, unassessed authority snapshot, unsafe release and absent atomic publication.
- Isolated Vercel Preview READY at https://reality-7mh45x04j-maloney2323-5310s-projects.vercel.app/.
- A live signed-in human conversation, actual simultaneous user-goal edits, semantic drift recall and real customer execution **were not exercised in this pass**. A READY preview and passing mocked-integration tests do not prove a complete real-world service-level guarantee.

**Truth boundary:** this prevents a known assistant-led goal proposal from acquiring authority or being published as unreviewed different text. It does not prove the probabilistic reviewer detects every gradual semantic deviation or that externally reported business work actually occurred. Drift rates remain unknown, not zero. Keep draft PR and do not resume paid benchmarks until the founder explicitly agrees.
