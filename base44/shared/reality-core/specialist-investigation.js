// Reality Specialist Investigation v0.
//
// Runs job-specialized engines over the exact same canonical evidence packet.
// This is explicitly NOT a consensus layer. The proposer generates hypotheses;
// the falsifier attacks those proposal-only hypotheses while citing only packet
// observations as factual dependencies. Reality does not choose a winner here.

import {
  EngineJob,
  FindingType,
  createEngineRequest,
  validateCanonicalEvidencePacket,
} from './engine-adapter.js';

export const SPECIALIST_INVESTIGATION_VERSION = 'reality-specialist-investigation-v0.1';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hypothesisContext(result) {
  return Object.freeze((result?.findings || [])
    .filter((finding) => finding.type === FindingType.HYPOTHESIS)
    .map((finding, index) => Object.freeze({
      proposal_id: `${result.engine_id}:hypothesis:${index + 1}`,
      text: finding.text,
      source_engine_id: result.engine_id,
      authority: 'PROPOSAL_CONTEXT_ONLY',
    })));
}

export async function runSpecialistInvestigation({
  investigation_id,
  packet,
  question,
  proposer,
  falsifier,
}) {
  if (!nonEmpty(investigation_id)) throw new Error('specialist investigation requires investigation_id');
  if (!nonEmpty(question)) throw new Error('specialist investigation requires question');
  if (!proposer || typeof proposer.run !== 'function') throw new Error('specialist investigation requires proposer adapter');
  if (!falsifier || typeof falsifier.run !== 'function') throw new Error('specialist investigation requires falsifier adapter');
  if (!proposer.supported_jobs?.includes(EngineJob.HYPOTHESIS_GENERATION)) {
    throw new Error('proposer must support HYPOTHESIS_GENERATION only for this investigation role');
  }
  if (!falsifier.supported_jobs?.includes(EngineJob.FALSIFICATION)) {
    throw new Error('falsifier must support FALSIFICATION for this investigation role');
  }

  const canonicalPacket = validateCanonicalEvidencePacket(packet);
  const proposerRequest = createEngineRequest({
    request_id: `${investigation_id}:proposer`,
    job_type: EngineJob.HYPOTHESIS_GENERATION,
    packet: canonicalPacket,
    question: question.trim(),
    constraints: [
      'Generate possible explanations only; do not present hypotheses as established facts.',
      'Every factual dependency must cite canonical observation ids from the packet.',
      'Do not infer source independence merely because sources differ.',
    ],
  });
  const proposerResult = await proposer.run(proposerRequest);
  const proposalContext = hypothesisContext(proposerResult);

  const falsifierRequest = createEngineRequest({
    request_id: `${investigation_id}:falsifier`,
    job_type: EngineJob.FALSIFICATION,
    packet: canonicalPacket,
    question: question.trim(),
    proposal_context: proposalContext,
    constraints: [
      'Attack the proposal-context hypotheses; do not seek agreement.',
      'Proposal context is not evidence and may never appear in dependency_refs.',
      'Every factual dependency must cite canonical observation ids from the packet.',
      'Surface alternative explanations, missing evidence, and causal overreach.',
    ],
  });
  const falsifierResult = await falsifier.run(falsifierRequest);

  return Object.freeze({
    investigation_version: SPECIALIST_INVESTIGATION_VERSION,
    investigation_id: investigation_id.trim(),
    packet_id: canonicalPacket.packet_id,
    question: question.trim(),
    authority: 'INVESTIGATION_PROPOSALS_ONLY',
    consensus_used: false,
    winner_selected: false,
    packet: canonicalPacket,
    proposer: proposerResult,
    falsifier: falsifierResult,
    proposal_context: proposalContext,
  });
}