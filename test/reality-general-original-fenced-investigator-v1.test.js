import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {investigateGeneralOriginalFencedRecovery}
 from '../src/reality-general-original-fenced-investigator-v1.js';

const id='11111111-1111-4111-8111-111111111111';
const claim={status:'FENCED_INSTALL_INVESTIGATION_MODEL_LEASED',
 investigation_id:id,model_request_id:'22222222-2222-4222-8222-222222222222',
 attempt_id:'33333333-3333-4333-8333-333333333333',
 shift_id:'44444444-4444-4444-8444-444444444444',
 original_work_id:'work:45206a326ddf406b1c083a819da24aaa',
 provider_evidence_sha256:'a'.repeat(64),
 candidate_artifact_sha256:'sha256:'+'b'.repeat(64),
 expected_parent_sha:'c'.repeat(40),
 finding:'FENCED_BASELINE_AND_APPROVED_GIT_OBJECTS_STILL_READABLE',
 target_branch:'reality/chat-resilient-signed-response-20261114',
 model_invocation_authorized:true,external_retry_authorized:false,
 original_job_completed:false,production_changed:false};
const env={VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_SHA:'e'.repeat(40),
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-test-not-real-provider-token-value',
 REALITY_OPENAI_MODEL:'gpt-5.6'};
const db={strictSecrets:true,project:'isolated'};
function response(data,status=200){
 return new Response(JSON.stringify(data),{status,
  headers:{'content-type':'application/json'}});
}
function fixture({reply=null,claimResult=claim}={}){
 const source=readFileSync(new URL(
 '../supabase/functions/reality-governed-general-original-installer-v1/index.ts',
 import.meta.url));
 const blob=createHash('sha1').update('blob '+source.length+'\0')
  .update(source).digest('hex');
 const calls=[],requests=[];
 const fetchImpl=async(url,opts)=>{
  requests.push([url,opts]);
  if(url.includes('/contents/'))
   return response({path:'supabase/functions/reality-governed-general-original-installer-v1/index.ts',
    encoding:'base64',sha:blob,size:source.length,
    content:source.toString('base64')});
  if(url==='https://api.openai.com/v1/responses')
   return response(reply??{
    status:'completed',id:'resp_verified_demo_1234',
    output_text:JSON.stringify({
     suspected_failure_stage:'Unknown Git Data API write stage after the fence',
     repair_proposal:'Prepare a bounded exact-artifact Contents API fallback behind fresh exact owner consent.',
     independent_test_plan:'Independently test the isolated write with hash, parent, and same-original receipt assertions.'
    })
   });
  throw Error('unexpected URL '+url);
 };
 const callRpc=async(_db,procedure,args)=>{
  calls.push({procedure,args});
  if(procedure==='reality_claim_general_original_fenced_investigation_v1')
   return claimResult;
  if(procedure==='reality_record_general_original_fenced_hypothesis_v1')
   return {status:'FENCED_ORIGINAL_RILEY_MODEL_HYPOTHESIS_RECORDED',
    original_work_id:claim.original_work_id,investigation_id:claim.investigation_id,
    model_response_id:'resp_verified_demo_1234',model_findings_are_hypotheses:true,
    independently_tested:false,external_retry_authorized:false,
    original_job_completed:false,production_changed:false,
    next_gate:'INDEPENDENT_REPAIR_TEST_AND_EXACT_RECOVERY_AUTHORITY'};
  if(procedure==='reality_mark_general_original_fenced_model_uncertain_v1')
   return {status:'FENCED_MODEL_PROVIDER_UNCERTAIN_NO_AUTOMATIC_REPLAY'};
  throw Error('unexpected RPC '+procedure);
 };
 return {calls,requests,fetchImpl,callRpc};
}
test('one signed original model lease produces only a durable advisory diagnosis',async()=>{
 const f=fixture();
 const r=await investigateGeneralOriginalFencedRecovery({
  db,env,fetchImpl:f.fetchImpl,callRpc:f.callRpc});
 assert.equal(r.status,'FENCED_ORIGINAL_RILEY_MODEL_HYPOTHESIS_RECORDED');
 assert.equal(r.independently_tested,false);
 assert.equal(r.external_retry_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.deepEqual(f.calls.map(x=>x.procedure),[
  'reality_claim_general_original_fenced_investigation_v1',
  'reality_record_general_original_fenced_hypothesis_v1']);
 const req=f.requests.find(([url])=>url==='https://api.openai.com/v1/responses');
 assert.ok(req);
 const body=JSON.parse(req[1].body);
 assert.equal(body.store,false);assert.equal(body.tool_choice,'none');
 assert.doesNotMatch(f.requests.map(([url])=>url).join('|'),/\/git\/refs\//);
});
test('an existing claim never invokes the model again',async()=>{
 const f=fixture({claimResult:{status:
  'FENCED_INSTALL_MODEL_INVESTIGATION_ALREADY_CLAIMED_NO_REPLAY',
  original_work_id:claim.original_work_id}});
 const r=await investigateGeneralOriginalFencedRecovery({
  db,env,fetchImpl:f.fetchImpl,callRpc:f.callRpc});
 assert.equal(r.status,
  'FENCED_INSTALL_MODEL_INVESTIGATION_ALREADY_CLAIMED_NO_REPLAY');
 assert.equal(f.requests.length,0);assert.equal(f.calls.length,1);
});
test('invalid model output records uncertainty and cannot be counted as repair',async()=>{
 const f=fixture({reply:{status:'completed',id:'resp_verified_demo_1234',
  output_text:'{"not":"a safe model proposal"}'}});
 const r=await investigateGeneralOriginalFencedRecovery({
  db,env,fetchImpl:f.fetchImpl,callRpc:f.callRpc});
 assert.equal(r.status,'FENCED_RECOVERY_MODEL_OR_SOURCE_UNVERIFIED');
 assert.equal(r.independently_tested,false);
 assert.equal(r.external_retry_authorized,false);
 assert.equal(f.calls.at(-1).procedure,
  'reality_mark_general_original_fenced_model_uncertain_v1');
});
test('missing model key stops before claiming the original investigation',async()=>{
 const f=fixture();
 const r=await investigateGeneralOriginalFencedRecovery({
  db,env:{...env,REALITY_STANDALONE_OPENAI_API_KEY:'',OPENAI_API_KEY:''},
  fetchImpl:f.fetchImpl,callRpc:f.callRpc});
 assert.equal(r.status,'FENCED_RECOVERY_GOVERNED_MODEL_PROVIDER_UNAVAILABLE');
 assert.equal(f.calls.length,0);assert.equal(f.requests.length,0);
});
