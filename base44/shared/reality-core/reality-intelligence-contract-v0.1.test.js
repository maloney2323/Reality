import {
  COGNITIVE_OPERATIONS,
  EPISTEMIC_STATUSES,
  INTELLIGENCE_INVARIANT,
  classifyCognitiveOutput,
  canThink,
  separatesCognitionFromAuthority
} from './reality-intelligence-contract-v0.1.js';

const assertions = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  assertions.push(message);
}

assert(INTELLIGENCE_INVARIANT === 'FULL_INTELLIGENCE_GOVERNED_CONSEQUENCE', 'full intelligence invariant is explicit');
assert(COGNITIVE_OPERATIONS.includes('FORM_OPINION'), 'opinion formation is a cognitive operation');
assert(COGNITIVE_OPERATIONS.includes('CHALLENGE'), 'challenging assumptions is a cognitive operation');
assert(EPISTEMIC_STATUSES.includes('OPINION'), 'opinion is an epistemic status');
assert(canThink('RESEARCH') === true, 'research is permitted cognition');
assert(canThink('FORM_OPINION') === true, 'opinion formation is permitted cognition');
assert(canThink('DEPLOY') === false, 'deploy is not cognition');
const opinion = classifyCognitiveOutput({
  status: 'OPINION',
  claim: 'Candidate market warrants further investigation.',
  evidence_refs: ['e1'],
  reasoning: 'Capability and demand signals appear aligned.',
  uncertainty: 'Demand evidence remains incomplete.'
});
assert(separatesCognitionFromAuthority(opinion), 'opinion remains non-authorizing');
assert(opinion.action_authority_granted === false, 'cognition cannot grant action authority');

console.log(`PASS: ${assertions.length} intelligence contract assertions`);
