# Reality Obligation Observation v0.1

**Status:** feature-branch candidate with opt-in authenticated Preview runtime adapter and mocked integration tests. Off by default. Not deployed or verified with real customer data, not present in production UI.

## Why
The first live 2-turn construction test committed both model responses and correctly recalled a homeowner-approval condition. However, the Conversation Drift Spine reported `NO_EXTRACTABLE_CONVERSATION_ANCHOR`, partly because the exact instruction included a contextual preface: "For the construction job, do not send an estimate until the homeowner approves it."

## Contract
- Accept a **server-verified** principal, scoped continuity root, work-item ID and source user-message record.
- Reuse the existing Continuity Spine's explicit-conditional-intent extraction. It can recognize a short topical preface without treating ordinary topic mentions as obligations.
- Create `USER_STATED_CONDITION_OBSERVATION` Universe entries with immutable, evidence-linked condition/action text and source references. These are **observed user instructions**, not independently verified facts, approvals, action authorities or completed outcomes.
- Rehydrate the observations by the verified principal + root + worldline + work-item. Reject tampered stored records and keep scope separation.
- Reuse `inspectConversationDrift` to compare model proposals with earlier observed user instructions. A contradictory proposal is a **candidate** for review only, not automatically proven hallucination or an external action.
- Never automatically mutate Continuity Ledger lifecycle state or call a business tool.
- No percentage claims unless there are independently adjudicated, correctly denominated decision samples and coverage/false-negative evidence.

## Next integration gate
1. **Implemented but not live-verified:** authenticated standalone Preview adapter, gated on `REALITY_STANDALONE_OBLIGATION_OBSERVATION_ENABLED=true`, reads scoped observations from Universe, appends and independently reads back user-stated condition observations only after the cognition path confirms the Signal Cleaner handoff, and returns a tentative proposal assessment in the receipt.
2. **Implemented under mock I/O:** two-turn replay demonstrates that the later model receives the first user's observed rule even when conversation history is bounded.
3. **Next:** deploy only to an isolated, fully configured Preview (never production) and verify real Supabase persistence, cold-readback, auth, and model response. A UI readout and model error/adjudication measurement remain separate.
4. **Not yet implemented:** verified authority-transition path for revising/satisfying/superseding a work-item condition, cross-conversation business work-item identity, unbounded source-history completeness proof, and independently confirmed execution consequences.
5. **Next benchmark:** deliberately conflicting live model proposal, paired reference decisions, evidence-backed before/after model and Reality performance, 100+ turns and restart/recovery without false drift percentages.

**Explicit limitation:** This feature branch proves extraction and contract behavior in mocked tests. It does *not* prove 0% drift, real model-repair efficacy, a verified customer ROI, or live long-horizon obligation persistence. It does not touch production.
