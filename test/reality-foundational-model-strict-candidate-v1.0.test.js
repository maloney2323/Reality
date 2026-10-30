import test from 'node:test';
import assert from 'node:assert/strict';
import {createFoundationalBuildTicket}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createFoundationalModelGenerator}
 from '../src/reality-foundational-model-provider-v1.0.js';
const t=createFoundationalBuildTicket({
 owner_id:'11111111-1111-4111-8111-111111111111',
 goal_id:'confirmed:goal',goal_transition_receipt_ref:'goal:receipt',
 goal_evidence_ref:'user:verified',
 original_work_id:'work:'+'e'.repeat(32),
 continuity_root_id:'root:only',worldline_id:'world:only',
 confirmed_gap_receipt_ref:'trusted:gap',
 confirmed_gap_evidence_hash:'a'.repeat(64),
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_manifest_ref:'first-ci-evidence-gap-v1',
 frozen_regression_sha256:'b'.repeat(64),
 repository_base_sha:'c'.repeat(40),
 environment:'ISOLATED_PREVIEW',max_attempts:3,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
});
function actualFiles(){return [
 {path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
  content:'export function classifyVerifiedCiFailure(){return "MISSING_CAPABILITY"}'},
 {path:'test/reality-extensions/candidate.test.js',
  content:'import test from "node:test";test("model proposal",()=>{})'},
]}
test('replaceable model receives strict source-and-test schema, frozen test data and no authority',async()=>{
 let requests=0;
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  readFrozenRegression:async()=>({
   source:'GITHUB_PINNED_READ_ONLY_TEST_FILES',
   repository_base_sha:t.repository_base_sha,
   frozen_regression_sha256:t.frozen_regression_sha256,
   files:[{path:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
    content:'test frozen independently'}],
  }),
  fetchImpl:async(_endpoint,options)=>{
   requests++;
   const b=JSON.parse(options.body);
   assert.equal(b.text.format.type,'json_schema');
   assert.equal(b.text.format.strict,true);
   assert.deepEqual(b.text.format.schema.required,
    ['ticket_hash','original_work_id','rationale','files']);
   assert.equal(b.text.format.schema.properties.files.type,'array');
   assert.equal(b.input[1].role,'user');
   assert.ok(JSON.stringify(b.input).includes('verified_frozen_test_source'));
   assert.ok(!JSON.stringify(b.input).includes('installation_authorized":true'));
   return {ok:true,json:async()=>({id:'resp_fixture_valid',
    output_text:JSON.stringify({ticket_hash:t.ticket_hash,
     original_work_id:t.original_work_id,
     rationale:'Implement missing CI failure evidence contract',
     files:actualFiles()})})};
  }
 });
 const got=await gen({ticket:t,attempt:1,previous_candidate:null,
  verified_feedback:null,execution_authority:false});
 assert.equal(got.files.length,2);
 assert.equal(got.model_response_id,'resp_fixture_valid');
 assert.equal(got.installed,false);
 assert.equal(got.authority_granted,false);
 assert.equal(requests,1);
});
test('model JSON without generated source AND tests is rejected as unaccepted proposal',async()=>{
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  fetchImpl:async()=>({ok:true,json:async()=>({
   id:'resp_fixture_empty',
   output_text:JSON.stringify({ticket_hash:t.ticket_hash,
    original_work_id:t.original_work_id,rationale:'No actual file source',files:[]}),
  })}),
 });
 await assert.rejects(gen({ticket:t,attempt:1,
  execution_authority:false}),
  /FOUNDATION_CANDIDATE_FILES_REQUIRED/);
});
test('model cannot substitute a different goal or write protected paths',async()=>{
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  fetchImpl:async()=>({ok:true,json:async()=>({
   id:'resp_fixture_drift',
   output_text:JSON.stringify({ticket_hash:'f'.repeat(64),
    original_work_id:t.original_work_id,rationale:'Switch authorization',
    files:actualFiles()}),
  })}),
 });
 await assert.rejects(gen({ticket:t,attempt:1,
  execution_authority:false}),
  /FOUNDATION_GENERATION_GOAL_DRIFT/);
});
