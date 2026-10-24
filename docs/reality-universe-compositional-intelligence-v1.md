# Reality Universe Compositional Intelligence Contract V1 — isolated prototype

**Status:** executable sandbox contract only. Not merged, deployed, independently calibrated, or authorized for live business actions.

## Core design decision
Do not build a second "superintelligence" engine beside the Universe. Treat composition, uncertainty, historical simulation, revocation and learning as typed operations on the same rooted, provenance-scoped Universe and Intelligence Form lineage. Make each epistemic transition append-only and preserve original facts.

## Implemented in source
- `src/reality-universe-composition-contract-v1.0.js` exposes `defineAtomicForm`, `compileFormDAG`, `propagateBoundedEpistemicInterval`, `runCompositionSandbox`, `createBitemporalGhostFork`, `makeRevocationSignal`, `computeRevocationClosure`, `createCompositeFormCandidate` and `calculateReasoningDelta`.
- `test/reality-universe-composition-contract-v1.0.test.js` proves three construction forms (inventory, inspection, labor schedule), port type compatibility, dependency ordering, missing-dependency/cycle rejection, output postconditions, deterministic no-send sandbox, ghost cutoff by effective and assertion time, immutable source preservation, revocation descendants, and metric abstention without independent scores.
- The composed schedule handler is always `DRAFT_ONLY` and never has authority to confirm a crew. Even a mistakenly trusted handler that returns a "confirmed" status fails a hard postcondition. This is defense-in-depth for the demo, **not** an OS-level sandbox.
- The higher-order crystallization result is `CANDIDATE_UNVERIFIED`, content-addressed by a SHA-256 digest, not a signature or proof of owner approval.

## Mathematical boundary: intervals are not truth
For marginal event probabilities with defensible calibration, a conjunction of n events with lower bounds L_i and upper bounds U_i has Fréchet bounds:
- lower = max(0, sum(L_i) - (n - 1))
- upper = min(U_i)
No independence is assumed. A 90%, 85%, 70% lower-bound example permits only a 45% conjunction lower bound, not the product of ungrounded confidence scores. Our test fixture calibrations are illustrative inputs, **not measured real source reliability**. Unknown or uncalibrated confidence yields [0,1].

These bounds **never** authorize sending, purchasing, paying, dispatching or official inspection claims. Those operations require separately authenticated sources and independent authorization/effect receipts.

## Ghost and revocation semantics
- Historical fork picks only valid-time and time-known eligible `OPERATIONAL_SNAPSHOT` Universe entries. Stress mutations are to existing fields on an in-memory copy, not the original history.
- Revocation is append-only and time-scoped; a revoked atomic form makes every dependent composition ineligible for that snapshot. Past decisions and source entries remain intact.
- **Not yet implemented:** live DB rehydration, signature verification of calibration/revocation sources, durable revocation notification, signed eligibility caches, production distribution invalidation, or OS/container isolation for arbitrary generated programs. A hash only proves that bytes match a digest; it does not prove who authored or approved them.

## Real model experiment
`scripts/run-reality-3form-live-model-pilot-v1.mjs` runs at most **8 actual OpenAI API calls**: four fictional construction conflicts, two lanes (Mini alone vs Mini+typed 3-form preflight). Both lanes get the same policy-oriented system instructions and case facts. Form input is programmer-defined; the underlying model does **not** discover the DAG.

Measure exact fixture blocker recall, false additional blockers, forbidden "CONFIRM_CREW" replies, tool-effect claims, input/output tokens, and end-to-end model response latency. Preserve every response/ID, facts and grade in downloaded JSON/HTML. The rubric is narrow and scripted, **not independently adjudicated full semantic accuracy**.

## Promotion blockers, not promises
The architecture will require these additional layers before real deployment:
1. Authenticated, replayable source/calibration/approval ledger adapters.
2. Independent held-out evaluations with novel cases and harmless positive controls.
3. A separate isolated sandbox for untrusted model-authored code with no network, filesystem, credentials or production tool access.
4. Version-pinned forms and signed capability provenance and revocation messages, with transactional admission and caching.
5. Pre- and post-execution revalidation and durable distribution gate; revocation races and historical backdating explicitly covered.
6. Model-led *proposal* of new DAGs and automated capability synthesis; no silent promotion until an independent gate.
7. End-to-end human-reviewed baseline-versus-composition quality, latency, and **total** monetary cost. "10× faster" remains a hypothesis, not an achieved result.
8. Scalable hierarchical competence indexing and retention of canonical evidence; neither is part of this V1 prototype.

## One-sentence result
This implements an **executable compositional epistemic substrate prototype**, not a demonstrated self-improving general or superintelligent system.
