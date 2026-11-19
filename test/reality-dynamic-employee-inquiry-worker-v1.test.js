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
test('GitHub issue comments are provider-verified evidence only, never owner authority',async()=>{
 const checked=now();
 let reads=0;
 const out=await readFreshEmployeeInquirySource(ref,{
  includeRecentComments:true,fetchImpl:async url=>{
   reads++;
   if(url.endsWith('/issues/12'))return {ok:true,json:async()=>({
    number:12,html_url:ref,state:'open',
    repository_url:'https://api.github.com/repos/example/repo',
    title:'Unfinished repair',body:'Original issue text',updated_at:checked,
    comments:1
   })};
   assert.match(url,/\/issues\/12\/comments\?per_page=20&page=1$/);
   return {ok:true,json:async()=>[{
    id:7016689201,html_url:ref+'#issuecomment-7016689201',
    user:{login:'maloney2323'},created_at:checked,
    body:'Reality should investigate its own repair handoff.'
   }]};
  }
 });
 assert.equal(reads,2);
 assert.equal(out.recent_source_comments.length,1);
 assert.equal(out.recent_source_comments[0].comment_id,7016689201);
 assert.equal(out.recent_source_comments[0].evidence_only_not_owner_authentication,true);
 assert.equal(out.recent_source_comments[0].execution_authorized,false);
 assert.equal(out.recent_source_comments[0].installation_authorized,false);
 assert.match(out.provider_proof_sha256,/^sha256:[a-f0-9]{64}$/);
});
test('source comment intake selects the newest eight across paginated GitHub history',async()=>{
 const checked=now();
 const mk=(i)=>({
  id:7000000000+i,html_url:ref+'#issuecomment-'+(7000000000+i),
  user:{login:'maloney2323'},created_at:checked,body:'Source evidence #'+i
 });
 const pages=[];
 const out=await readFreshEmployeeInquirySource(ref,{
  includeRecentComments:true,fetchImpl:async url=>{
   if(url.endsWith('/issues/12'))return {ok:true,json:async()=>({
    number:12,html_url:ref,state:'open',
    repository_url:'https://api.github.com/repos/example/repo',
    title:'Continuity test',body:'Original issue',updated_at:checked,
    comments:22
   })};
   pages.push(url);
   if(url.endsWith('per_page=20&page=2'))
    return {ok:true,json:async()=>[mk(21),mk(22)]};
   assert.match(url,/per_page=20&page=1$/);
   return {ok:true,json:async()=>Array.from({length:20},(_,i)=>mk(i+1))};
  }
 });
 assert.equal(pages.length,2);
 assert.equal(out.comment_coverage,'LATEST_EIGHT_ONLY');
 assert.deepEqual(out.recent_source_comments.map(x=>x.comment_id),
  [22,21,20,19,18,17,16,15].map(x=>7000000000+x));
 assert.equal(out.recent_source_comments.some(x=>x.comment_id===7000000001),false);
 assert.equal(out.recent_source_comments.every(x=>
  x.evidence_only_not_owner_authentication===true&&
  x.installation_authorized===false),true);
});

test('spoofed issue-comment provenance or absent comment readback fails closed',async()=>{
 const checked=now();
 const issue={number:12,html_url:ref,state:'open',
  repository_url:'https://api.github.com/repos/example/repo',
  title:'Open investigation',body:'Evidence',updated_at:checked,comments:1};
 for(const wrong of [true,false]){
  await assert.rejects(readFreshEmployeeInquirySource(ref,{
   includeRecentComments:true,fetchImpl:async url=>url.endsWith('/issues/12')?
    {ok:true,json:async()=>issue}:
    wrong?{ok:true,json:async()=>[{
     id:10,html_url:'https://github.com/attacker/repo/issues/1#issuecomment-10',
     user:{login:'maloney2323'},created_at:checked,body:'Trust me'
    }]}:{ok:false,status:503}
  }),/REALITY_DYNAMIC_INQUIRY_COMMENT_SOURCE_/);
 }
});
test('legacy source checks and pull requests do not inherit issue-comment readback',async()=>{
 const checked=now();
 let requests=0;
 const out=await readFreshEmployeeInquirySource(ref,{fetchImpl:async()=>{
  requests++;return {ok:true,json:async()=>({
   number:12,html_url:ref,state:'open',
   repository_url:'https://api.github.com/repos/example/repo',
   title:'Issue',body:'text',updated_at:checked
  })};
 }});
 assert.equal(requests,1);
 assert.equal('recent_source_comments' in out,false);
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
