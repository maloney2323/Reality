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


test('repair generation sends actual frozen failures and provenance conditions, not a blind retry',async()=>{
 let seen=false;
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  fetchImpl:async(_endpoint,options)=>{
   const request=JSON.parse(options.body);
   const task=JSON.parse(request.input[1].content[0].text);
   assert.equal(task.attempt,2);
   assert.ok(task.independently_verified_failure.log_excerpt.includes('not ok 6'));
   assert.ok(task.correction_acceptance_criteria.some(s=>s.includes('same field')));
   assert.ok(task.correction_acceptance_criteria.some(s=>s.includes('SHA')));
   assert.ok(task.correction_acceptance_criteria.some(s=>s.includes('attestation')));
   seen=true;
   return {ok:true,json:async()=>({id:'response:repair',
    output_text:JSON.stringify({ticket_hash:t.ticket_hash,
     original_work_id:t.original_work_id,
     rationale:'Repair actual negative controls',files:actualFiles()})})};
  },
 });
 await gen({ticket:t,attempt:2,
  previous_candidate:{artifact_sha256:'previous',files:actualFiles()},
  verified_feedback:{kind:'INDEPENDENT_SANDBOX_FAILURE',
   attestation_ref:'provider:independent',
   log_excerpt:'not ok 6 - foreign repository was accepted\n expected: false\n actual: true'},
  execution_authority:false});
 assert.equal(seen,true);
});

test('Reality asks the coding model to correct tautological provenance before sandbox attempts',async()=>{
 let calls=0;
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  fetchImpl:async(_endpoint,options)=>{
   calls++;
   const req=JSON.parse(options.body);
   const task=JSON.parse(req.input[1].content[0].text);
   if(calls===2)assert.ok(task.rejected_proposal_reason.includes('compared with itself'));
   const files=actualFiles();
   files[0].content=calls===1?
    'export function classifyVerifiedCiFailure(evidence){if(evidence.repository !== evidence.repository)return false;return true;}':
    'export function classifyVerifiedCiFailure(evidence){return evidence.repository === "maloney2323/Reality";}';
   return {ok:true,json:async()=>({id:'proposal:'+calls,
    output_text:JSON.stringify({ticket_hash:t.ticket_hash,original_work_id:t.original_work_id,
     rationale:'Repair evidence comparisons',files})})};
  }
 });
 const output=await gen({ticket:t,attempt:1,execution_authority:false});
 assert.equal(calls,2);
 assert.ok(!output.files[0].content.includes('evidence.repository !== evidence.repository'));
 assert.equal(output.installed,false);
});
test('invalid self-comparisons fail closed after four bounded model proposals',async()=>{
 let calls=0;
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  fetchImpl:async()=>{
   calls++;
   const files=actualFiles();
   files[0].content='export function classifyVerifiedCiFailure(evidence){return evidence.run_head_sha === evidence.run_head_sha;}';
   return {ok:true,json:async()=>({id:'proposal:bad',output_text:JSON.stringify({
    ticket_hash:t.ticket_hash,original_work_id:t.original_work_id,
    rationale:'Still invalid',files})})};
  },
 });
 await assert.rejects(gen({ticket:t,attempt:1,execution_authority:false}),
  /FOUNDATION_MODEL_UNCORRECTED_SELF_COMPARISON/);
 assert.equal(calls,4);
});


test('provider-verified frozen regression drives four bounded model draft corrections',async()=>{
 let modelCalls=0,independentChecks=0;
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  verifyDraftCandidate:async ({ticket,candidate,attempt,proposal})=>{
   independentChecks++;
   assert.equal(ticket.original_work_id,t.original_work_id);
   assert.equal(attempt,1);
   assert.equal(proposal,independentChecks);
   assert.equal(candidate.installed,false);
   return {independent_provider_readback:true,
    passed:independentChecks===3,classification:'TEST_REGRESSION',
    artifact_sha256:candidate.artifact_sha256,
    attestation_ref:'vercel:provider-verified:reality-draft:'+independentChecks,
    log_excerpt:'not ok 2 - absent provider evidence\\n actual: MISSING_CAPABILITY\\n expected: INSUFFICIENT_EVIDENCE'};
  },
  fetchImpl:async(_url,options)=>{
   modelCalls++;
   const task=JSON.parse(JSON.parse(options.body).input[1].content[0].text);
   if(modelCalls>1){
    assert.ok(task.rejected_proposal_reason.includes('Independent isolated sandbox FAILED'));
    assert.ok(task.rejected_proposal_reason.includes('not ok 2'));
    assert.ok(Array.isArray(task.rejected_proposal_files));
    assert.equal(task.rejected_proposal_files.length,2);
   }
   const files=actualFiles();
   files[0].content='export function classifyVerifiedCiFailure(evidence){return evidence.repository==="maloney2323/Reality"?'+modelCalls+':0;}';
   return {ok:true,json:async()=>({
    id:'draft_response:'+modelCalls,output_text:JSON.stringify({
     ticket_hash:t.ticket_hash,original_work_id:t.original_work_id,
     rationale:'Correct independent frozen failure '+modelCalls,files})})};
  },
 });
 const out=await gen({ticket:t,attempt:1,execution_authority:false});
 assert.equal(modelCalls,3);
 assert.equal(independentChecks,3);
 assert.equal(out.installed,false);
 assert.equal(out.model_response_id,'draft_response:3');
});
test('unproven or unverifiable provider result cannot be counted as a successful draft',async()=>{
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  verifyDraftCandidate:async ({candidate})=>({independent_provider_readback:false,
   passed:true,artifact_sha256:candidate.artifact_sha256,
   attestation_ref:'model-claim:not-verification'}),
  fetchImpl:async()=>({ok:true,json:async()=>({
   id:'draft:unverified',output_text:JSON.stringify({
    ticket_hash:t.ticket_hash,original_work_id:t.original_work_id,
    rationale:'Trust only provider readback',files:actualFiles()})})}),
 });
 await assert.rejects(gen({ticket:t,attempt:1,execution_authority:false}),
  /FOUNDATION_DRAFT_INDEPENDENT_VERIFICATION_REQUIRED/);
});
test('draft repair cannot bypass missing dependency or owner authority',async()=>{
 const gen=createFoundationalModelGenerator({
  model:'gpt-6',apiKey:'fake-isolated-key-not-real',
  verifyDraftCandidate:async ({candidate})=>({independent_provider_readback:true,
   passed:false,artifact_sha256:candidate.artifact_sha256,
   classification:'AUTHORITY_REQUIRED',
   attestation_ref:'vercel:provider-verified:authority-block'}),
  fetchImpl:async()=>({ok:true,json:async()=>({
   id:'draft:blocked',output_text:JSON.stringify({
    ticket_hash:t.ticket_hash,original_work_id:t.original_work_id,
    rationale:'Do not fabricate authority',files:actualFiles()})})}),
 });
 await assert.rejects(gen({ticket:t,attempt:1,execution_authority:false}),
  /FOUNDATION_DRAFT_NON_REPAIRABLE_FAILURE/);
});
