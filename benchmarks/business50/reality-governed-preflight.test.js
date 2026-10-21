import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CASES,buildPublicPacket,VERSION} from './business-adversarial-50-six-sector-v0.1.js';
import {classifyPublicControlEvidence} from './source-only-development-policy-v0.1.js';

test('exact original frozen six-sector inputs remain readable',()=>{
  assert.equal(CASES.length,50);
  assert.equal(VERSION,'business-adversarial-50-v0.1');
  assert.equal(new Set(CASES.map(c=>c.id)).size,50);
  const publicCases=CASES.map(buildPublicPacket);
  assert.equal(publicCases.length,50);
  for(const p of publicCases){
    assert.equal(p.expected_disposition,undefined);
    assert.equal(p.oracle_rationale,undefined);
    assert.equal(p.independent_verification,undefined);
  }
});
test('public source classifier never imports or refers to the hidden scoring oracle',()=>{
  const src=readFileSync('benchmarks/business50/source-only-development-policy-v0.1.js','utf8');
  assert.doesNotMatch(src,/scoreDecision\(|\.expected_disposition|\.oracle_rationale|\.attack|\.sector/);
  assert.doesNotMatch(src,/B0[1-9]|B[1-4][0-9]|B50/);
});
test('control-integrity discrepancy requires escalation in unrelated development fixture',()=>{
  const result=classifyPublicControlEvidence({
    question:'May the signed construction evidence be released?',
    evidence:[{id:'proof',source:'registry',authority:'INTEGRITY_AUTHORITY',text:'Recorded SHA-256 digest mismatch for the uploaded item.'}]
  });
  assert.deepEqual(result.findings,['INTEGRITY_FAILURE']);
  assert.equal(result.proof_of_source_independence,false);
});
test('SHA-256 disagreement with stored bytes is a recognized integrity finding',()=>{
  const finding=classifyPublicControlEvidence({
    question:'May this signed site record be used?',
    evidence:[{id:'signature-proof',source:'registry',authority:'INTEGRITY_AUTHORITY',
      text:'Expected SHA-256 differs from uploaded report bytes.'}]
  });
  assert.deepEqual(finding.findings,['INTEGRITY_FAILURE']);
});
test('ordinary authenticated hold is blocking rather than unnecessary escalation',()=>{
  const result=classifyPublicControlEvidence({
    question:'Can the contractor release the payable?',
    evidence:[{id:'hold',source:'signed approval',authority:'CONTROL_AUTHORITY',text:'Current status: NOT_APPROVED; do not release.'}]
  });
  assert.deepEqual(result.findings,['CONTROL_HOLD']);
});
test('unknown evidence remains unclassified and cannot be called safe',()=>{
  const result=classifyPublicControlEvidence({
    question:'Can this new unfamiliar operation proceed?',
    evidence:[{id:'unknown',source:'manual',authority:'UNCERTAIN',text:'Observations do not establish relevant policy.'}]
  });
  assert.deepEqual(result.findings,[]);
  assert.equal(result.classification_status,'UNCLASSIFIED_NEEDS_INDEPENDENT_REVIEW');
});
test('model request format remains identical to historical raw Astra run',()=>{
  const src=readFileSync('benchmarks/business50/reality-governed-astra.mjs','utf8');
  assert.match(src,/model='gpt-6-astra'/);
  assert.match(src,/reasoning:\{effort:'max'\},max_output_tokens:8192/);
  assert.match(src,/store:false/);
  assert.match(src,/type:'json_object'/);
  assert.match(src,/modelGateway|generateDisposition/);
  assert.match(src,/scoreDecision\(c\.id,governed\.publication\)/);
  assert.match(src,/policy_origin:'DEVELOPMENT_RULES_WRITTEN_WITH_FROZEN_BENCHMARK_VISIBLE_NOT_BLINDED'/);
});
