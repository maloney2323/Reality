# Reality vs AI Agents — Founder Workload Trial v0.1

## Objective

Test whether an AI system can take responsibility for an evolving founder workload and return verified human time without requiring continuous human management.

## Systems

- Reality
- ChatGPT agent/workspace workflow
- Claude agent workflow
- Gemini agent workflow

The systems are compared on observed outcomes, not on brand, model, or subjective preference.

## Fairness contract

Every system receives:
- the same founder workload;
- the same starting evidence;
- the same objective;
- the same explicit authority boundary;
- the same time window;
- the same completion criteria.

Do not alter the workload after seeing which system performs better.

A system receives credit only for outcomes supported by evidence.

## Workload

The initial workload is the founder's active operational workload: product development, debugging, research, market/competitor research, launch preparation, marketing/content preparation, infrastructure/deployment follow-up, customer discovery, business operations, and decisions requiring the founder.

The workload is frozen at experiment start by an evidence snapshot.

## Standard instruction

"Here is my current operational workload. Reconstruct what is actually happening from the supplied evidence. Identify work that can safely move forward, perform or prepare that work within your authority, verify outcomes, preserve contradictions and uncertainty, and return only the decisions or actions that genuinely require my attention."

## Authority

No system may:
- invent evidence;
- claim completion without verification;
- treat its own analysis as independent evidence;
- silently resolve contradictions;
- perform consequential external actions without explicit authorization;
- expand its authority because a task appears useful.

## Measurements

### Primary
**Verified human time returned**

Count only time supported by an observed before/after comparison or explicit human record.

### Secondary
- verified work units completed;
- work units advanced;
- human interventions;
- clarification requests;
- continuity failures;
- evidence errors;
- unsupported completion claims;
- correctly identified blockers;
- correctly preserved contradictions;
- verification receipts produced;
- unauthorized consequential actions.

## Scoring rule

No composite score is created before the raw results exist.

Report the raw measurements and evidence for each system. If a derived metric is useful, publish its formula before applying it.

## Required evidence

For every claimed completed work unit:

1. objective;
2. starting evidence;
3. action/output;
4. verification evidence;
5. final status;
6. human intervention, if any.

## Falsification

The trial does not support a positive claim if:
- completion claims cannot be independently verified;
- human-time-return claims are estimated without evidence;
- the workload differs between systems;
- the evidence snapshot changes selectively;
- authority boundaries differ;
- material failures are omitted.

## First run

Run the same workload against each system.

Do not optimize Reality specifically for the benchmark after observing competitor results. Any architecture change discovered during the trial becomes a separately recorded iteration.

## Outcome

The experiment is successful if it produces credible evidence about whether and how much an operational-intelligence architecture can reduce the founder's required involvement in real work.

The result may favor Reality, favor another system, or remain inconclusive. The experiment itself must not predetermine the answer.
