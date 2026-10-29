import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFoundationalBuildTicket,createSandboxEvidenceCandidate}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {createConstitutionalGenerationSandboxAdapters}
 from '../src/reality-foundational-constitutional-adapters-v1.0.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canon):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const digest=x=>sha(JSON.stringify(canon(x)));
const root={owner_id:'owner:verified',goal_id:'goal:source-linked',
 original_work_id:'work:'+'a'.repeat(32),
 goal_transition_receipt_ref:'universe:goal:verified',
 goal_evidence_ref:'supabase:rls:user-message',
 continuity_root_id:'root:one',worldline_id:'world:one',
 confirmed_gap_receipt_ref:'provider:confirmed-gap',
 confirmed_gap_evidence_hash:'digest:verified-gap',
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_manifest_ref:'pinned-suite',
 frozen_regression_sha256:'a'.repeat(64),repository_base_sha:'b'.repeat(40),
 environment:'ISOLATED_PREVIEW',max_attempts:3,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/']};
const ticket=createFoundationalBuildTicket(root);
const files=[{path:'src/reality-extensions/capability.mjs',content:'export const check=true;'},
 {path:'test/reality-extensions/capability.test.js',content:'import test from "node:test";test("verified",()=>{});'}];
function setup(pass=true){
 const provenance=new Map();const calls=[];
 const modelGenerate=async ctx=>{calls.push(ctx);return {
  ticket_hash:ticket.ticket_hash,original_work_id:ticket.original_work_id,
  files,rationale:'Gap-bound improvement',model_response_id:'resp_original'}};
 const isolatedSandbox=async ctx=>{
  const report={ticket_hash:ticket.ticket_hash,artifact_sha256:ctx.candidate.artifact_sha256,
   environment:'ISOLATED_NO_SECRET_CONTAINER',network_disabled:true,secrets_mounted:false,
   production_write_permitted:false,frozen_suite_sha256:ticket.frozen_regression_sha256,
   frozen_test_manifest_ref:ticket.frozen_regression_manifest_ref,
   frozen_test_count:3,frozen_test_pass_count:pass?3:2,exit_code:pass?0:1,
   test_results:[{passed:pass}],log_excerpt:pass?'# pass 3':'not ok 2 - missing check',
   runner_receipt_ref:'github:runner:independent'};
  const e=createSandboxEvidenceCandidate(ticket,ctx.candidate,report);
  provenance.set(e.report_hash,e);
  return report;
 };
 const independentReadback=async q=>{
  const actual=provenance.get(q.report_hash);
  if(!actual||actual.artifact_sha256!==q.artifact_sha256)
   return {independent_provider_readback:false};
  return {...q,independent_provider_readback:true,
   attestation_ref:'github:independent:'+q.report_hash};
 };
 return {adapters:createConstitutionalGenerationSandboxAdapters({
  ticket,modelGenerate,isolatedSandbox,independentReadback}),calls};
}
const start={goal_id:ticket.goal_id,original_work_id:ticket.original_work_id,
 no_execution_authority:true,current_attempt:1,previous_candidate:null,
 previous_independent_failure:null};
function constitutionalCandidate(generated){
 // The authoritative spine strips unknown metadata but preserves tested source
 // and computes exactly this canonical fingerprint.
 const candidate={files:generated.files,rationale:generated.rationale,
  verification_plan_ref:generated.verification_plan_ref,
  model_response_ref:generated.model_response_ref};
 return {candidate,artifact_hash:digest(candidate.files.map(f=>({path:f.path,content:f.content})))};
}
test('generateCandidate is a proposal consumed by the one existing constitutional spine',async()=>{
 const h=setup();
 const generated=await h.adapters.generateCandidate(start);
 assert.equal(generated.files.length,2);
 assert.equal(generated.verification_plan_ref,ticket.frozen_regression_manifest_ref);
 assert.equal(generated.model_response_ref,'resp_original');
 assert.equal(h.calls[0].execution_authority,false);
});
test('constitutional adapter refuses foreign user goal or original job',async()=>{
 const h=setup();
 await assert.rejects(h.adapters.generateCandidate({...start,goal_id:'different'}),
  /FOUNDATION_CONSTITUTIONAL_SCOPE_CHANGED/);
 await assert.rejects(h.adapters.generateCandidate({...start,original_work_id:'different'}),
  /FOUNDATION_CONSTITUTIONAL_SCOPE_CHANGED/);
});
test('authoritative sandbox produces source-bound receipt but never authorizes install',async()=>{
 const h=setup(),generated=await h.adapters.generateCandidate(start);
 const frozen=constitutionalCandidate(generated);
 const out=await h.adapters.runIsolatedSandbox({
  ...frozen,attempt:1,original_work_id:ticket.original_work_id,
  network_access:false,production_write_permitted:false});
 assert.equal(out.kind,'SANDBOX_VERIFIED');
 assert.equal(out.artifact_hash,frozen.artifact_hash);
 assert.equal(out.owner_id,ticket.owner_id);
 assert.equal(out.goal_id,ticket.goal_id);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.installation_authorized,false);
 assert.ok(out.evidence_ref.startsWith('github:independent:'));
});
test('failed candidate is reported as independently proven failure, not success',async()=>{
 const h=setup(false),generated=await h.adapters.generateCandidate(start);
 const c=constitutionalCandidate(generated);
 const out=await h.adapters.runIsolatedSandbox({
  ...c,attempt:1,original_work_id:ticket.original_work_id,
  network_access:false,production_write_permitted:false});
 assert.equal(out.kind,'SANDBOX_FAILED');
 assert.equal(out.independent_tests_passed,false);
 assert.equal(out.diagnostics.code,'TEST_FAILED');
});
test('tampered code is rejected against the constitutional source artifact hash',async()=>{
 const h=setup(),generated=await h.adapters.generateCandidate(start);
 const c=constitutionalCandidate(generated);
 c.candidate.files[0]={...c.candidate.files[0],content:'export const unsafe=true;'};
 await assert.rejects(h.adapters.runIsolatedSandbox({
  ...c,attempt:1,original_work_id:ticket.original_work_id,
  network_access:false,production_write_permitted:false}),
  /FOUNDATION_CONSTITUTIONAL_MODEL_SOURCE_CHANGED/);
});
test('next model attempt requires independent failure receipt, not LLM feedback',async()=>{
 const h=setup();
 await assert.rejects(h.adapters.generateCandidate({...start,current_attempt:2,
  previous_candidate:null,previous_independent_failure:{diagnostics:{output:'not ok 1'}}}),
  /FOUNDATION_REPAIR_REQUIRES_INDEPENDENT_FAILURE/);
});
