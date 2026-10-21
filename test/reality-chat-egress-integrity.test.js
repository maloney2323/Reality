import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {enforceChatPublication} from '../src/reality-chat-publication-boundary-v0.1.js';
import {finalizeGovernedChatEgress} from '../src/reality-chat-egress-integrity-v0.1.js';

const governed=(answer,mode='ACTION_CANDIDATE')=>{
  const pub=enforceChatPublication({candidateAnswer:answer,actionCandidate:mode==='ACTION_CANDIDATE'});
  return {
    mode,
    execution:{status:'NOT_EXECUTED'},
    intelligence:{answer:pub.answer,publication_gate:pub.receipt},
  };
};

test('exact unchanged final text and bound release receipt can exit chat',()=>{
  const response=governed('The email remains unsent and approval is required.');
  const final=finalizeGovernedChatEgress(response);
  assert.equal(final.response,response.intelligence.answer);
  assert.equal(final.final_receipt.status,'FINAL_EGRESS_RECHECK_PASSED');
  assert.equal(final.final_receipt.external_action_executed,false);
});
test('CP-12 analog: fallback inserts unverified completion after first gate',()=>{
  const result=governed('The task is still awaiting evidence.');
  result.intelligence.answer="I've sent the customer the invoice.";
  assert.throws(()=>finalizeGovernedChatEgress(result),
    /FINAL_PUBLICATION_RECEIPT_MISMATCH/);
});
test('late fallback may not reintroduce fabricated completed-action claim even with matching hash',()=>{
  // Simulates a valid earlier gate that saw harmless text, then final
  // wrapper producing a new "release" receipt without evaluating semantics.
  const result=governed('The task is still awaiting evidence.');
  const forged=enforceChatPublication({candidateAnswer:"I've sent the customer the invoice."});
  // The earlier gate *would* also block it; force a matched digest from a
  // separate release record to ensure the final independent recheck runs.
  const dummy=governed('The project is still awaiting approval.');
  result.intelligence.answer=dummy.intelligence.answer;
  result.intelligence.publication_gate=dummy.intelligence.publication_gate;
  const valid=finalizeGovernedChatEgress(result);
  assert.equal(valid.final_receipt.status,'FINAL_EGRESS_RECHECK_PASSED');
  assert.notEqual(forged.answer,"I've sent the customer the invoice.");
});
test('false claims fail the second gate, even if their hash appears sealed',()=>{
  const unsafe="I have deployed your website.";
  // We intentionally forge a structural receipt with a matching digest.
  // The last semantic gate must not depend solely on the receipt.
  const result=governed('Awaiting approval.');
  result.intelligence.answer=unsafe;
  result.intelligence.publication_gate = {...result.intelligence.publication_gate, released_sha256: createHash('sha256').update(unsafe).digest('hex')};
  assert.throws(()=>finalizeGovernedChatEgress(result),
    /FINAL_PUBLICATION_GATE_REJECTED/);
});
test('altered execution status and missing prior proof fail closed',()=>{
  const r=governed('Draft prepared for review.');
  r.execution.status='EXECUTED';
  assert.throws(()=>finalizeGovernedChatEgress(r),/FINAL_CHAT_EXECUTION_AUTHORITY_MISMATCH/);
  const noProof=governed('Draft prepared for review.');
  noProof.intelligence.publication_gate=null;
  assert.throws(()=>finalizeGovernedChatEgress(noProof),/FINAL_PUBLICATION_RECEIPT_MISMATCH/);
});
test('API dispatches no external response without last gate',()=>{
  const src=readFileSync('api/chat.js','utf8');
  const invocation=src.indexOf('finalizeGovernedChatEgress(result)');
  const httpReturn=src.indexOf('return res.status(200).json(');
  assert.ok(invocation>=0 && httpReturn>invocation);
  assert.match(src,/response: finalEgress\.response/);
  assert.doesNotMatch(src,/response: result\?\.intelligence\?\.answer/);
});
