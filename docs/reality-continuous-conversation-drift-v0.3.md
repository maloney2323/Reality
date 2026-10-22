# Reality Continuous Integrity Spine v0.3: Early Conversation Drift
October 22, 2026 | Draft PR #85 | Not merged or deployed

## Purpose

The core risk is conversational meaning drift the customer may not notice: a user-established condition weakens during an assistant paraphrase on Turn 2 and disappears in Turn 3. The Integrity Spine must compare the model's actual answer with original user intent and its sourced evolution, not treat the assistant's previous summary as authoritative.

Illustrative sequence:
- Turn 1 user: "Do not send the estimate until the customer approves it."
- Turn 1 assistant: "I will prepare the draft and wait."
- Turn 2 assistant: "We'll send the estimate when it's ready." This silently substitutes internal readiness for customer approval.
- Turn 3 assistant: "I'll send the estimate now." The approval precondition is lost.

The new conversation continuity check is embedded in the existing src/reality-continuous-integrity-spine-v0.1.js, under inspectConversationDrift(). **No standalone detector, second ledger, or new guardrail framework.**

## What is actually implemented

1. Existing API api/reality/intelligence.js passes prior user/assistant turns as authenticated, role-tagged records from the user's Base44 PersonalMessage records with source references. No parsing arbitrary history labels as if they were provenance.
2. The Spine extracts *selected explicit conditional-action instructions* from earlier authentic user turns and the current user message, preserving source reference, action, condition and turn origin.
3. Actual model output is compared against those user-intent anchors. If the model affirmatively proposes an action without retaining the user-stated condition, it yields CONVERSATIONAL_PRECONDITION_DRIFT at COGNITION.
4. If a user explicitly changes the relevant condition, the Spine yields CONVERSATIONAL_REVISION_REQUIRES_REVIEW, not an automatically confirmed model hallucination or grant of action authority.
5. Findings join preexisting epistemic model-output observations at the **same Cognition checkpoint**, and remain unresolved in its Continuity Spine receipt.
6. Live orchestration carries the observation in the original Continuity Ledger event and checks readback when durable persistence is enabled. The original model output remains intact, with an explicit review notice. Any already-proposed consequential work awaits independent review instead of interpreting a questionable plan as a completed instruction.
7. Existing Reality Brief displays the prior condition, the model's new proposal, provenance references and the limitation that these are *potential* meaning shifts.

## Architectural rules

- User-origin instructions define *conversational intent*, not externally verified world facts. A past assistant message cannot authorize or revise the user's intent.
- Only server-authenticated prior conversation messages are eligible as historical anchors. Ephemeral sessions can inspect the current message but **cannot claim reliable previous-turn coverage**.
- The Continuity Ledger owns persistence, work states and authorized revisions. The Spine observes and proposes; it cannot mutate state or grant authority.
- Earlier intent does not silently disappear. A later explicit user revision must be represented as a versioned candidate pending the appropriate evidence/authority.
- All diagnostic events include their origin turn/source reference, earliest detected stage, original meaning condition, and proposed change. No invented savings.
- The existing source-fact comparisons, verifier, publication and execution boundaries remain unchanged.

## Accuracy disclosure

**Current scope:** explicit human conditions such as "do not X until Y", "only X after Y", and "wait to X until Y", with affirmative assistant action proposals. Generic action/object token matching applies across business domains. Several ordinary paraphrases, compound instructions, implicit commitments, missing obligations, entity aliases, negations, and cross-language statements still escape this narrow parser.

The comparison is **heuristic**, not independent semantic ground truth. Positive findings can be false alarms. No measured detector precision, recall, false-negative rate, sub-5% drift score, or real customer ROI is established. "No issue flagged" means **no flagged issue within limited coverage**, not zero drift.

## Tests

- test/reality-conversation-drift-spine-v0.3.test.js covers the same user condition across Turns 1, 2 and 3, sufficient restatements, preparation-only messages, explicit revisions, hallucinated authority via assistant history, and source scope.
- test/reality-live-model-output-integrity-v0.1.test.js adds live-orchestration synthetic readback, review notice, proposed-work hold and client-supplied history rejection.
- The existing Reality Spine Live Model Output Continuity v0.2 workflow runs the new tests alongside its old source-integrity, continuity and live orchestration suites. There are no paid LLM calls in these synthetic tests.

## Next foundation upgrades

- Versioned semantic proposition and intent-state contract from the Signal Cleaner, capable of richer paraphrases, implied commitments and priority changes.
- Independent meaning comparison and adjudication against the exact user turn, active continuity state and genuine authorized revision events.
- Explicit extraction/assessment coverage (including abstentions), false-positive and false-negative grading on independent held-out two- and three-turn scenarios.
- Customer-facing evidence and ROI telemetry from independently reviewed outcomes, not heuristically flagged mistakes.
- Training Ground promotion candidates only after verified recurring failure patterns, independent regression proof and owner authorization.

**Disposition:** early cross-turn conversational drift mechanism implemented and under CI; not production-proven and not yet a general semantic drift solution.
