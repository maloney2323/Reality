# Reality Obligation Observation v0.1

**Status:** feature-branch candidate, unit-tested; not integrated with the authenticated runtime, persistence API or UI. No customer data was modified.

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
1. Server-side, authenticated admission of actual user-turn source record; readback and append-only persistence only after source integrity verification.
2. Authenticated, bounded retrieval of the user's obligation observations from Universe before cognition, separated by work item, not dependent on the newest 80 chat turns.
3. Verified, material authority-transition path for revising/satisfying/superseding an instruction.
4. Feature-gated integration into the existing Continuity Spine and Intelligence Receipt presentation.
5. Real test of a deliberately conflicting underlying model candidate, with independently recorded pre- and post-Reality outputs, and verified execution consequences.
6. Repeat across >100 turns and interrupted/restarted sessions; measure error capture and escapes independently.

**Explicit limitation:** This feature branch proves extraction and contract behavior in mocked tests. It does *not* prove 0% drift, real model-repair efficacy, a verified customer ROI, or live long-horizon obligation persistence. It does not touch production.
