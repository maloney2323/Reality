import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 validateDynamicInquiryOutput,readFreshEmployeeInquirySource,
 generateOneEmployeeTemporalInquiry as generate
} from '../src/reality-dynamic-employee-inquiry-worker-v1.js';

const owner='11111111-2222-4333-8444-555555555555';
const claimId='22222222-3333-4444-8555-666666666666';
const ref='https://github.com/example/repo/issues/12';
const proof='sha256:'+'a'.repeat(64);
const now=()=>new Date().toISOString();
const claim={
 status:'OWNER_SOURCE_INQUIRY_CLAIMED',owner_id:owner,
 employee:'Avery',source_ref:ref,source_title:'Open source finding',
 source_family:'GITHUB_ISSUE',evidence_sha256:proof,
 claim_id:claimId,source_scan_at:now(),model_call_leased:true,
 execution_authorized:false,installation_authorized:false,production_changed:false
};
const answer={
 source_ref:ref,
 question:'Which current evidence establishes the reported defect?',
 investigation:'The current source is open, but that does not independently reproduce the reported defect.',
 next_proof:'Run the relevant acceptance test and compare results against the exact original work receipt.',
 recommendation:'INVESTIGATE_MORE'
};
const modelOutput=overrides=>({
 id:'resp_example12345',status:'completed',
 output_text:JSON.stringify({...answer,...overrides})
});
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk_test_12345678901234567890',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini'
};
const db={strictSecrets:true,secretKey:'test',project:'isolated-test'};
const provider={
 source_ref:ref,source_title:'Open source finding',
 current_state:'open',provider_updated_at:now(),
 source_body:'Evidence says one unresolved problem, without independent CI.',
 checked_at:now(),provider_proof_sha256:'sha256:'+'b'.repeat(64),
 body_truncated:false
};
const stub=({claimed=claim,model=modelOutput(),source=provider}={})=>{
 const calls=[];
 const callRpc=async (_db,name,body)=>{
  calls.push({name,body});
  if(name==='reality_claim_owner_employee_time_inquiry_v1')return claimed;
  if(name==='reality_record_owner_employee_time_inquiry_v1')return {
   status:'EMPLOYEE_INQUIRY_DURABLY_RECORDED',
   owner_id:owner,claim_id:claimId,employee:'Avery',
   source_ref:ref,evidence_sha256:proof,
   provider_proof_sha256:provider.provider_proof_sha256,
   question:body.p_question,investigation:body.p_investigation,
   next_proof:body.p_next_proof,recommendation:body.p_recommendation,
   execution_authorized:false,installation_authorized:false,
   new_original_jobs_created:0,production_changed:false
  };
  if(name==='reality_block_owner_employee_time_inquiry_v1')return{
   status:'EMPLOYEE_INQUIRY_BLOCKED_NO_REPLAY',
   execution_authorized:false,installation_authorized:false,
   production_changed:false
  };
  throw Error('UNEXPECTED_RPC');
 };
 let modelCalls=0;
 return {
  calls,
  options:{ownerId:owner,db,env,callRpc,
   readSource:async()=>source,
   readTime:async()=>({past:{status:'INDEPENDENT_HISTORY_VERIFIED',
    verified_final_loop_receipts:1},
    present:{status:'OWNER_SHIFT_HISTORY_READBACK_VERIFIED',active_shift_count:0}}),
   invokeModel:async payload=>{
    modelCalls++;
    assert.equal(payload.tool_choice,'none');
    assert.equal(payload.store,false);
    assert.equal(payload.text.format.type,'json_schema');
    assert.match(JSON.stringify(payload),/Avery/);
    return model;
   }},
  get modelCalls(){return modelCalls;}
 };
};

test('one live source generates an original question and durable non-executable employee receipt',async()=>{
 const f=stub();
 const v=await generate(f.options);
 assert.equal(v.status,'EMPLOYEE_SOURCE_QUESTION_AND_INVESTIGATION_RECORDED');
 assert.equal(v.model_invocations_completed,1);
 assert.equal(f.modelCalls,1);
 assert.equal(v.employee,'Avery');
 assert.equal(v.question,answer.question);
 assert.equal(v.routed_to_existing_employee_role,true);
 assert.equal(v.dispatched_executable_jobs,0);
 assert.equal(v.new_original_jobs_created,0);
 assert.equal(v.execution_authorized,false);
 assert.equal(f.calls.filter(x=>x.name.includes('record_owner_employee')).length,1);
});
test('no fresh current source returns without a model or fabricated question',async()=>{
 const f=stub({claimed:{status:'NO_FRESH_UNSETTLED_EMPLOYEE_INQUIRY_SOURCE'}});
 const out=await generate(f.options);
 assert.equal(out.model_invocations_completed,0);
 assert.equal(f.modelCalls,0);
 assert.equal(out.qualified_executable_jobs,0);
});
test('invalid model source, shape and authority-like output are withheld and the claim is blocked',async()=>{
 for(const output of [
  modelOutput({source_ref:'https://github.com/other/repo/issues/12'}),
  modelOutput({question:'short'}),
  modelOutput({execution_authorized:true}),
  {...modelOutput(),id:'not-a-response'}
 ]){
  const f=stub({model:output});
  const out=await generate(f.options);
  assert.equal(out.status,'EMPLOYEE_INQUIRY_BLOCKED_NO_UNVERIFIED_REPLAY');
  assert.equal(out.original_job_completed,false);
  assert.equal(f.calls.some(x=>x.name==='reality_block_owner_employee_time_inquiry_v1'),true);
  assert.equal(f.calls.some(x=>x.name==='reality_record_owner_employee_time_inquiry_v1'),false);
 }
});
test('source mismatch, wrong owner and missing provider proof never become qualifying work',async()=>{
 const f=stub({source:{...provider,source_ref:'https://github.com/example/repo/issues/13'}});
 const out=await generate(f.options);
 assert.equal(out.status,'EMPLOYEE_INQUIRY_BLOCKED_NO_UNVERIFIED_REPLAY');
 assert.equal(out.model_invocations_completed,0);
 const bad=stub({claimed:{...claim,owner_id:'22222222-2222-4222-8222-222222222222'}});
 await assert.rejects(generate(bad.options),/ATOMIC_OWNER_INQUIRY_CLAIM_UNVERIFIED/);
});
test('live GitHub issue / pull request reads verify repository and allow empty descriptions',async()=>{
 const checked=now();
 const issues=await readFreshEmployeeInquirySource(ref,{fetchImpl:async url=>{
  assert.match(url,/api.github.com\/repos\/example\/repo\/issues\/12$/);
  return {ok:true,json:async()=>({
   number:12,html_url:ref,state:'open',
   repository_url:'https://api.github.com/repos/example/repo',
   title:'Example issue',body:null,updated_at:checked
  })};
 }});
 assert.equal(issues.source_body,'');
 assert.match(issues.provider_proof_sha256,/^sha256:/);
 const pr='https://github.com/example/repo/pull/27';
 const pull=await readFreshEmployeeInquirySource(pr,{fetchImpl:async()=>({
  ok:true,json:async()=>({
   number:27,html_url:pr,state:'open',
   base:{repo:{full_name:'example/repo'}},
   title:'Example PR',body:null,updated_at:checked
  })
 })});
 assert.equal(pull.source_ref,pr);
 assert.equal(pull.body_truncated,false);
});
test('dynamic questioning is connected to the existing signed shift and employee audit, never a new scheduler',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const audit=read('api/reality/personal-employee-work-audit.js');
 const endpoint=read('api/reality/personal-employee-inquiry.js');
 const model=read('src/reality-dynamic-employee-inquiry-worker-v1.js');
 const db=read('supabase/migrations/20261117_dynamic_employee_temporal_inquiries_v1.sql');
 assert.match(worker,/employeeTemporalInquiryPromise/);
 assert.match(worker,/generateOneEmployeeTemporalInquiry/);
 assert.match(audit,/reality_read_owner_employee_time_inquiries_v1/);
 assert.match(endpoint,/assertSameOrigin\(req\)/);
 assert.match(endpoint,/authenticatedChatSession\(req,res\)/);
 assert.match(endpoint,/INVESTIGATE_NEXT_SOURCE/);
 assert.doesNotMatch(model,/const QUESTIONS|const JOB_LIST|role_by_question/i);
 assert.match(db,/for update of o skip locked/i);
 assert.match(db,/security invoker/i);
 assert.match(db,/revoke execute on function public.reality_claim_owner_employee_time_inquiry_v1/);
});
