# Reality: Unified epistemic runtime integration checkpoint

Date: 2026-10-25. Draft PR #140, experimental branch. Production not changed.

## What was really wired
- Existing Signal Cleaner typed user reports, uncertainties and older user-condition candidates flow into one immutable, hashed `CANONICAL_EPISTEMIC_FRAME`, alongside separately source-attested facts (not falsely promoted user statements).
- Existing Continuity Spine persists that frame in `universe_events` as an `OBSERVATION` and requires exact-frame readback before cognition in durable modes.
- Same frame hash and typed claim projection reach the replaceable underlying model and both passes of the existing semantic reviewer. Post-answer reliability records the exact frame's hash and source receipt and refuses a mismatched frame.
- History-backed conversational drift uses the latest 80 messages for its bounded lexical check while the source-linked Cleaner retains typed older conditions from as many as 240 authenticated messages. It no longer crashes above 80 turns; this is NOT general semantic drift coverage beyond 80 turns.
- Current-turn reported claims are typed even when older authenticated chat history is unavailable, without pretending the history is complete.
- Authenticated Vercel private-chat preview now uses the same pipeline on an isolated, explicitly allowlisted Supabase project with user-bound conversation/world/root identity. Normal chat saves owner-scoped messages under RLS; verification saves source-linked Continuity/reliability receipts in the SAME isolated project. Chat refuses mismatched DB or disabled reliability rather than silently running unmonitored. Its UI displays source-frame readback and semantic-review coverage, not a made-up clean score.
- External execution and production code release remain separately unauthorized.

## Offline results
- 160 authenticated-message simulated integration uses the real Signal Cleaner, Continuity ledger adapter, model gateway, and semantic review path with **mocked** external model/database transports. It checks that initial reported external information remains unverified in the common state, frames are persisted/read back, the model receives the same hash, and the reliability assessment carries its source receipt.
- Two-turn authenticated private-chat integration with mocked transports and login also passes, including RLS-scoped message restoration and refusal to downgrade on missing reliability configuration.
- Five standard GitHub checks passed on the latest ordinary-preview commit `798dbfa7c10a13f3612ee9578d777372fd92e1fb`.

## Actual model + database proof
- Two scripted construction questions, **actual GPT-4.1-mini cognition and reviewer model requests**, actual restricted PostgreSQL writes/readbacks, no customer data, no external business actions.
- Run ID `canonical-live-20261025-a`; isolated Vercel report: https://reality-8sfmz417b-maloney2323-5310s-projects.vercel.app/
- **2/2 canonical frames persisted**, **2/2 output assessments persisted**, **2/2 assessments bound to exact frame readback** (separately confirmed by PostgreSQL query).
- **4 real model requests:** two cognition + two semantic review; **18,915 input tokens, 1,446 output tokens**.
- **0 model-answer corrections; 0 conversational-detector findings.** Reviewers reported **partial source coverage on both turns** and one review issue on turn 2.
- That turn-2 issue challenged an unqualified reference to the county permit portal still showing pending; the available source was the user's description of the portal, **not an authenticated read of the permit portal**. It is an unsupported-fact review candidate, not independently established hallucination, and no actual repair was verified.
- No independently adjudicated drift or hallucination rate is available. Failing to find a problem is not a verified 0% error rate.

## What is not finished
1. **Claim reconciliation:** stable semantic identity and supersession for factual claims over arbitrary timelines is not solved by a shared frame alone. No model interpretation should mutate external truth.
2. **Review reliability:** reviewer coverage gaps and earlier false-positive candidates persist. A candidate is not an independently verified detection or repaired answer. Current repair is **disabled** in this preview until checks demonstrate it does not damage good outputs.
3. **Long horizon:** 240-message adapter cap, 20 reported-candidate projection cap, last-80 lexical replay limitation. Needs relevance-aware durable state retrieval beyond the window without arbitrary replay.
4. **Authenticated live sign-in and paying users:** there is not yet a directly verified real user-authenticated, multi-day workday running the same pipeline. Preview is READY, not a completed human login and customer pilot.
5. **Actual autonomous execution:** intentionally NOT enabled. Source truth, approved action scope, fresh pre-execution checks and outcome readback must be independently verified before any execution.
6. **Production:** protected experimental Preview only; draft PR not merged or promoted to customer production.

## Preview and evidence
- Authenticated chat Preview: https://reality-1mjbxx7ns-maloney2323-5310s-projects.vercel.app/
- Real-model read-only report: https://reality-8sfmz417b-maloney2323-5310s-projects.vercel.app/
- GitHub draft PR: https://github.com/maloney2323/Reality/pull/140

**Conclusion:** one actual source-linked architectural pathway now exists through ingestion, canonical state, storage, cognition, review, and receipt, and it is exercised in both benchmark and authenticated private-chat code. This is a meaningful **integration milestone**, not proof Reality presently prevents most conversational drift, nor that every legacy entry point and production system uses the new contract.
