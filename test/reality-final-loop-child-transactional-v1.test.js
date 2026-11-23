import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {advanceOneFinalLoopChildReview}
 from '../src/reality-final-loop-child-review-worker-v1.js';
import {requestFinalLoopChildApprovalFromAcceptedOriginal}
 from '../src/reality-final-loop-child-approval-request-v1.js';
import {inspectLargePrSourceForBoundedReview}
 from '../src/reality-pr-large-source-qualification-v1.js';
const hash=x=>'sha256:'+x.repeat(64);
const digest=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const run='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const other='dddddddd-dddd-4ddd-dddd-dddddddddddd';
const parent='work:'+'1'.repeat(32);
const child='work:'+'2'.repeat(32);
const pr='https://github.com/maloney2323/Reality/pull/1001';
const sourceHash=hash('a'),acceptance=hash('b');
const env={
 VERCEL_ENV:'preview',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'testisolated',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'testisolated',
 REALITY_STANDALONE_OPENAI_API_KEY:'test-openai-key-placeholder',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini'
};
const db={project:'testisolated',strictSecrets:true};
const meta=()=>({
 number:1001,html_url:pr,state:'open',draft:true,
 changed_files:17,head:{sha:'f'.repeat(40)},base:{sha:'e'.repeat(40)}
});
const fullFiles=()=>Array.from({length:17},(_,i)=>({
 filename:'src/file-'+String(i).padStart(2,'0')+'.js',
 status:'modified',sha:'a'.repeat(40),additions:1,deletions:1,
 patch:'@@ -1 +1 @@\n-old\n+new '+i
}));
const provider=output=>async(url,options)=>{
 if(url==='https://api.openai.com/v1/responses'){
  assert.equal(options.method,'POST');
  const request=JSON.parse(options.body);
  assert.equal(request.tool_choice,'none');
  assert.equal(request.tools,undefined);
  return {ok:true,status:200,json:async()=>({
   id:output.id,status:'completed',
   output:[{type:'message',content:[{type:'output_text',text:output.text}]}]
  })};
 }
 assert.match(url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\/pulls\/1001/);
 assert.equal(options.method,'GET');
 return {ok:true,status:200,json:async()=>url.includes('/files?')?
  fullFiles():meta()};
};
async function sourcePlan(){
 return inspectLargePrSourceForBoundedReview({
  job:{source_ref:pr,source_proof_sha256:sourceHash,
   original_work_id:parent,phase:'BLOCKED'},
  ownerId:owner,shiftId:shift,metadata:meta(),
  env,fetchImpl:provider({id:'resp_a1234',text:''})
 });
}
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,plan_fingerprint:hash('c'),
 jobs:[{source_ref:pr,original_work_id:parent,phase:'BLOCKED',
  original_kind:'REAL_PR_REVIEW_ORIGINAL',
  independent_source_proof_verified:true}]};
test('an uninstalled or unisolated child executor cannot claim or call OpenAI',async()=>{
 let calls=0;
 for(const options of [
  {env:{...env,REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false'},db},
  {env,db:{strictSecrets:true,project:'liveproduction'}},
  {env:{...env,VERCEL_ENV:'production'},db}
 ]){
  const r=await advanceOneFinalLoopChildReview({
   ...options,shiftId:shift,workerRunId:run,
   call:async()=>{calls++;throw Error('NO_DB')},
   fetchImpl:async()=>{calls++;throw Error('NO_PROVIDER')}
  });
  assert.equal(r.status,
   'FINAL_LOOP_CHILD_GOVERNED_EXECUTOR_DISABLED_OR_ISOLATED_DB_MISSING');
  assert.equal(r.parent_original_completed,false);
 }
 assert.equal(calls,0);
});
test('missing verified parent acceptance does not mint approval or admit work',async()=>{
 let calls=0;
 const r=await requestFinalLoopChildApprovalFromAcceptedOriginal({
  graph,db,env,workerRunId:run,
  call:async(_db,name)=>{
   calls++;
   assert.equal(name,'reality_read_final_loop_child_approval_preflight_v1');
   return {status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
    owner_id:owner,shift_id:shift,plan_fingerprint:hash('c'),
    read_only:true,execution_authorized:false,
    plans:[{plan_id:'11111111-1111-4111-8111-111111111111',
     source_ref:pr,parent_original_work_id:parent,
     source_manifest_sha256:hash('d'),
     independent_goal_acceptance_verified:false,
     acceptance_contract_sha256:null,pending_exact_owner_approval:false}]};
  }
 });
 assert.equal(calls,1);
 assert.equal(r.pending_exact_approval_count,0);
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.child_originals_admitted,0);
});
test('verified source-bound goal creates only exact owner approval request, never consent',async()=>{
 const calls=[];
 const packet='11111111-1111-4111-8111-111111111111';
 const r=await requestFinalLoopChildApprovalFromAcceptedOriginal({
  graph,db,env,workerRunId:run,
  call:async(_db,name,args)=>{
   calls.push(name);
   if(name==='reality_read_final_loop_child_approval_preflight_v1')
    return {status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
     owner_id:owner,shift_id:shift,plan_fingerprint:hash('c'),
     read_only:true,execution_authorized:false,plans:[{
      plan_id:packet,source_ref:pr,parent_original_work_id:parent,
      source_manifest_sha256:hash('d'),
      independent_goal_acceptance_verified:true,
      acceptance_contract_sha256:acceptance,
      pending_exact_owner_approval:true}]};
   assert.equal(name,'reality_prepare_final_loop_child_approval_v1');
   assert.equal(args.p_worker_run_id,run);
   return {status:'FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED',
    packet_id:packet,owner_id:owner,shift_id:shift,
    parent_original_work_id:parent,source_ref:pr,
    source_manifest_sha256:hash('d'),
    acceptance_contract_sha256:acceptance,
    proposal_fingerprint:hash('e'),
    effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',
    owner_approval_granted:false,execution_authorized:false,
    original_job_completed:false};
  }
 });
 assert.deepEqual(calls,[
  'reality_read_final_loop_child_approval_preflight_v1',
  'reality_prepare_final_loop_child_approval_v1']);
 assert.equal(r.pending_exact_approval_count,1);
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.execution_authorized,false);
});
test('exact approved child claim becomes a prepared draft only via governed model readback',async()=>{
 const plan=await sourcePlan();
 assert.equal(plan.source_manifest_complete,true);
 const scope=plan.bounded_scopes[0];
 const text='Source reviewed: '+scope.files.map(f=>f.path).join(' ; ')+
  '. The patch changes old to new; test each changed behavior and independent regression.';
 const modelId='resp_generated12345';
 let providerCalls=0,prepare=0;
 const mockProvider=provider({id:modelId,text});
 const mock=async(url,options)=>{providerCalls++;return mockProvider(url,options)};
 const claim={
  status:'FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE',
  owner_id:owner,shift_id:shift,
  child_work_id:child,claim_id:'44444444-4444-4444-8444-444444444444',
  claimant_worker_run_id:run,parent_original_work_id:parent,
  source_ref:pr,source_head_sha:plan.live_head_sha,
  source_manifest_sha256:plan.source_manifest_sha256,
  source_proof_sha256:sourceHash,
  acceptance_contract_sha256:acceptance,
  scope_index:0,scope_sha256:scope.proposed_scope_sha256,
  scope,phase:'CLAIMED',child_claimed:true,
  original_job_completed:false,production_changed:false
 };
 const r=await advanceOneFinalLoopChildReview({
  db,env,shiftId:shift,workerRunId:run,fetchImpl:mock,
  call:async(_db,name,args)=>{
   if(name==='reality_read_final_loop_child_verify_v1')
    return {status:'FINAL_LOOP_NO_PREPARED_CHILD_FOR_INDEPENDENT_VERIFICATION'};
   if(name==='reality_claim_final_loop_child_review_v1')return claim;
   if(name==='reality_read_final_loop_child_model_scope_v1')
    return {...claim,status:'FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK',
     worker_run_id:run,phase:'CLAIMED',
     model_response_id:null,model_authorized:true};
   if(name==='reality_prepare_final_loop_child_review_v1'){
    prepare++;
    assert.equal(args.p_review_body,text);
    assert.equal(args.p_model_response_id,modelId);
    return {status:'FINAL_LOOP_CHILD_MODEL_ARTIFACT_PREPARED_NOT_VERIFIED',
     child_work_id:child,review_sha256:digest(text),
     original_job_completed:false};
   }
   throw Error('UNEXPECTED_RPC '+name);
  }
 });
 assert.equal(prepare,1);
 assert.ok(providerCalls>4);
 assert.equal(r.status,'FINAL_LOOP_CHILD_MODEL_ARTIFACT_PREPARED_NOT_VERIFIED');
 assert.equal(r.parent_original_completed,false);
 assert.equal(r.external_effect_performed,false);
});
test('separate signed verifier only verifies the exact pinned source and draft',async()=>{
 const plan=await sourcePlan(),scope=plan.bounded_scopes[0];
 const paths=scope.files.map(f=>f.path);
 const body='Review of '+paths.join(', ')+
  '. Test the change independently and verify regression behavior.';
 const draftId='resp_generated12345';
 const verifierId='resp_independent6789';
 const modelText=JSON.stringify({verdict:'PASS',supported_paths:paths,
  explanation:'Observed changed patch and source-backed test recommendation.'});
 const verified={
  status:'FINAL_LOOP_INDEPENDENT_CHILD_VERIFICATION_CANDIDATE',
  owner_id:owner,shift_id:shift,
  child_work_id:child,parent_original_work_id:parent,
  source_ref:pr,source_head_sha:plan.live_head_sha,
  source_manifest_sha256:plan.source_manifest_sha256,
  source_proof_sha256:sourceHash,
  acceptance_contract_sha256:acceptance,
  scope_index:0,scope_sha256:scope.proposed_scope_sha256,
  scope,model_response_id:draftId,
  review_body:body,review_sha256:digest(body),
  original_generation_worker_run_id:run,
  independent_verifier_run_id:other,
  read_only:true,original_job_completed:false,production_changed:false
 };
 let receipts=0;
 const r=await advanceOneFinalLoopChildReview({
  db,env,shiftId:shift,workerRunId:other,
  fetchImpl:provider({id:verifierId,text:modelText}),
  call:async(_db,name,args)=>{
   if(name==='reality_read_final_loop_child_verify_v1')return verified;
   if(name==='reality_record_final_loop_child_verified_v1'){
    receipts++;
    assert.equal(args.p_evidence.independent_verifier_run_id,other);
    assert.deepEqual(args.p_evidence.verified_paths,paths);
    assert.equal(args.p_review_sha256,digest(body));
    return {status:'FINAL_LOOP_CHILD_REVIEW_INDEPENDENTLY_VERIFIED_PARENT_OPEN',
     child_work_id:child,parent_original_work_id:parent,
     independent_receipt_sha256:hash('9'),
     original_job_completed:false};
   }
   throw Error('UNEXPECTED_RPC '+name);
  }
 });
 assert.equal(receipts,1);
 assert.equal(r.child_review_independently_verified,true);
 assert.equal(r.parent_obligation_remains_open,true);
 assert.equal(r.parent_original_completed,false);
});
test('child SQL and worker integrate without mutating native review admission or settling parent',()=>{
 const sql=readFileSync(new URL(
  '../sql/reality-final-loop-child-transactional-v1.sql',import.meta.url),'utf8');
 for(const name of [
  'reality_prepare_final_loop_child_approval_v1',
  'reality_owner_approve_final_loop_child_v1',
  'reality_claim_final_loop_child_review_v1',
  'reality_read_final_loop_child_model_scope_v1',
  'reality_prepare_final_loop_child_review_v1',
  'reality_read_final_loop_child_verify_v1',
  'reality_record_final_loop_child_verified_v1',
  'reality_read_final_loop_child_recovery_v1'])
  assert.ok(sql.includes(name));
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/owner_approval_receipt_sha256/);
 assert.match(sql,/parent_original_work_id/);
 assert.match(sql,/FOR UPDATE OF a SKIP LOCKED/);
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/advanceOneFinalLoopChildReview/);
 assert.match(worker,/requestFinalLoopChildApprovalFromAcceptedOriginal/);
 const gateway=readFileSync(new URL(
  '../src/reality-governed-openai-gateway-v1.js',import.meta.url),'utf8');
 assert.match(gateway,/finalLoopChildReadOnlyAdvisory/);
 assert.match(gateway,/source_manifest_sha256/);
});
