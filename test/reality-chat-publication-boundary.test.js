import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enforceChatPublication} from '../src/reality-chat-publication-boundary-v0.1.js';

for(const sentence of [
  "I've sent your email.",
  'I have already deployed the application.',
  'I verified the provider payment.',
  'We committed the code.',
  'Your email has been sent.',
  'The database was updated.',
  'The payment is now completed.',
]){
  test('unverified completion must not be published: '+sentence,()=>{
    const result=enforceChatPublication({candidateAnswer:sentence,actionCandidate:true});
    assert.equal(result.receipt.status,'HELD_AND_REPLACED');
    assert.equal(result.receipt.external_execution_verified,false);
    assert.equal(result.receipt.reason_code,'UNSUPPORTED_EXTERNAL_COMPLETION_CLAIM');
    assert.doesNotMatch(result.answer,/I.have.already.deployed|Your email has been sent|database was updated/i);
  });
}
test('Done! is held only for actionable requests',()=>{
  assert.equal(enforceChatPublication({candidateAnswer:'Done!',actionCandidate:true}).receipt.status,'HELD_AND_REPLACED');
  assert.equal(enforceChatPublication({candidateAnswer:'Done!',actionCandidate:false}).receipt.status,'RELEASED');
});
for(const sentence of [
  'Here is a draft you can review.',
  'I have not sent the email; approval is still required.',
  'You can choose to escalate this unsupported claim.',
  'The provided ledger lists two unresolved entries.',
]) {
  test('legitimate useful reasoning remains available: '+sentence,()=>{
    const result=enforceChatPublication({candidateAnswer:sentence,actionCandidate:true});
    assert.equal(result.receipt.status,'RELEASED');
    assert.equal(result.answer,sentence);
    assert.equal(result.receipt.changed,false);
  });
}
test('empty responses and requests to treat chat as executing fail closed',()=>{
  assert.equal(enforceChatPublication({candidateAnswer:''}).receipt.reason_code,'EMPTY_MODEL_ANSWER');
  assert.throws(()=>enforceChatPublication({candidateAnswer:'Done',executionStatus:'EXECUTED'}),
    /CHAT_PUBLICATION_REQUIRES_PROPOSAL_ONLY_EXECUTION_STATUS/);
});
test('receipt binds source and released text to different hashes for a correction',()=>{
  const r=enforceChatPublication({candidateAnswer:"I've deployed the build."});
  assert.match(r.receipt.original_sha256,/^[0-9a-f]{64}$/);
  assert.match(r.receipt.released_sha256,/^[0-9a-f]{64}$/);
  assert.notEqual(r.receipt.original_sha256,r.receipt.released_sha256);
});
test('governed egress runs before learning and continuity mutation',()=>{
  const source=readFileSync('src/reality-live-intelligence-orchestration-v0.1.js','utf8');
  const guard=source.indexOf('const publication = enforceChatPublication(');
  const training=source.indexOf('const trainingExperience = createIntelligenceTrainingExperience(');
  const continuity=source.indexOf('const continuityEvent =');
  assert.ok(guard>0 && training>guard && continuity>guard);
  assert.match(source,/answer: publication\.answer/);
  assert.match(source,/publication_gate: publication\.receipt/);
  assert.match(source,/UNVERIFIED_MODEL_ANALYSIS/);
});
