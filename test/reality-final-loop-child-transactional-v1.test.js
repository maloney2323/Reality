import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {createHash} from 'node:crypto';
import {advanceOneFinalLoopChildReview,verifyFinalLoopChildPatch,computeClaimedFinalLoopChildAdvisory,advanceCanonicalFinalLoopChildReview,qualifyBoundedChildReviewStrategy,assembleBoundedChildReview}
 from '../src/reality-final-loop-child-review-worker-v1.js';
import {connectExistingIsolatedChildTransport,handleExistingChildTransport}
 from '../src/reality-final-loop-child-transport-v1.js';
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
// Reproduce the oversized PR307 patch class without a provider call.
const largePatch='@@ -0,0 +1,695 @@\n'+Array.from({length:695},
 (_,i)=>'+.row-'+i+'{color:inherit;display:flex;gap:12px}').join('\n');
const completeLargeFiles=()=>{
 const files=fullFiles();
 files[0]={...files[0],status:'added',additions:695,deletions:0,
  patch:largePatch};
 return files;
};
const structuredReview=scope=>JSON.stringify({files:scope.files.map((f,index)=>({
 index,finding:'Review proposed change to the pinned source.',test:'Test the changed behavior and regression.'
}))});
const assembledReview=scope=>'Source-backed review (proposed tests; not executed)\n'+scope.files.map(f=>
 f.path+'\nFinding: Review proposed change to the pinned source.\nProposed test: Test the changed behavior and regression.\n').join('');
const provider=(output,files=fullFiles(),checkRequest=()=>{})=>async(url,options)=>{
 if(url==='https://api.openai.com/v1/responses'){
  assert.equal(options.method,'POST');
  const request=JSON.parse(options.body);
  assert.equal(request.tool_choice,'none');
  assert.equal(request.tools,undefined);
  checkRequest(request);
  return {ok:true,status:200,json:async()=>({
   id:output.id,status:'completed',
   output:[{type:'message',content:[{type:'output_text',text:output.text}]}]
  })};
 }
 assert.match(url,/^https:\/\/api\.github\.com\/repos\/maloney2323\/Reality\/pulls\/1001/);
 assert.equal(options.method,'GET');
 return {ok:true,status:200,json:async()=>url.includes('/files?')?
  files:meta()};
};
async function sourcePlan(files=fullFiles()){
 return inspectLargePrSourceForBoundedReview({
  job:{source_ref:pr,source_proof_sha256:sourceHash,
   original_work_id:parent,phase:'BLOCKED'},
  ownerId:owner,shiftId:shift,metadata:meta(),
  env,fetchImpl:provider({id:'resp_a1234',text:''},files)
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
test('missing source-derived parent contract does not mint approval or admit work',async()=>{
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
test('verified source-bound goal proposal creates exact owner approval request, never consent',async()=>{
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
      verified_signed_source_goal_contract_prepared:true,
      owner_goal_acceptance_pending:true,
      independent_goal_acceptance_verified:false,
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
test('exact approved child with oversized complete patch reaches governed model without truncation',async()=>{
 const files=completeLargeFiles();
 assert.ok(largePatch.length>18000);
 const plan=await sourcePlan(files);
 assert.equal(plan.source_manifest_complete,true);
 const scope=plan.bounded_scopes[0];
 const text=structuredReview(scope),artifact=assembledReview(scope);
 const modelId='resp_generated12345';
 let providerCalls=0,prepare=0;
 const mockProvider=provider({id:modelId,text},files,request=>{
  const input=JSON.parse(request.input[1].content[0].text);
  assert.equal(input.files[0].patch,largePatch);
  assert.ok(JSON.stringify(request).length>26000);
 });
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
   if(name==='reality_reconcile_final_loop_child_premodel_v1')
    return {status:'FINAL_LOOP_NO_SAFE_PREMODEL_CHILD_RECOVERY_READY'};
   if(name==='reality_read_final_loop_child_verify_v1')
    return {status:'FINAL_LOOP_NO_PREPARED_CHILD_FOR_INDEPENDENT_VERIFICATION'};
   if(name==='reality_claim_final_loop_child_review_v1')return claim;
   if(name==='reality_read_final_loop_child_model_scope_v1')
    return {...claim,status:'FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK',
     worker_run_id:run,phase:'CLAIMED',
     model_response_id:null,model_authorized:true};
   if(name==='reality_prepare_final_loop_child_review_v1'){
    prepare++;
    assert.equal(args.p_review_body,artifact);
    assert.equal(args.p_model_response_id,modelId);
    return {status:'FINAL_LOOP_CHILD_MODEL_ARTIFACT_PREPARED_NOT_VERIFIED',
     child_work_id:child,review_sha256:digest(artifact),
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
test('separate signed verifier only verifies the exact pinned full source and draft',async()=>{
 const files=completeLargeFiles();
 const plan=await sourcePlan(files),scope=plan.bounded_scopes[0];
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
  fetchImpl:provider({id:verifierId,text:modelText},files,request=>{
   assert.equal(JSON.parse(request.input[1].content[0].text).files[0].patch,largePatch);
  }),
  call:async(_db,name,args)=>{
   if(name==='reality_reconcile_final_loop_child_premodel_v1')
    return {status:'FINAL_LOOP_NO_SAFE_PREMODEL_CHILD_RECOVERY_READY'};
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
  'reality_reconcile_final_loop_child_premodel_v1',
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

test('unverified recovery cannot be used to mint a second child claim',async()=>{
 let calls=0;
 const r=await advanceOneFinalLoopChildReview({
  db,env,shiftId:shift,workerRunId:run,
  fetchImpl:async()=>{throw Error('NO_PROVIDER')},
  call:async(_db,name)=>{
   calls++;
   assert.equal(name,'reality_reconcile_final_loop_child_premodel_v1');
   return {status:'FINAL_LOOP_RECOVERY_SIGNED_WORKER_REQUIRED'};
  }
 });
 assert.equal(calls,1);
 assert.equal(r.status,'FINAL_LOOP_CHILD_PREMODEL_RECOVERY_SCOPE_UNVERIFIED');
 assert.equal(r.parent_original_completed,false);
 assert.equal(r.external_effect_performed,false);
});

test('truncated, mismatched and oversized patches do not qualify as full source',()=>{
 const file=completeLargeFiles()[0];
 assert.equal(verifyFinalLoopChildPatch(file.patch,file),true);
 assert.equal(verifyFinalLoopChildPatch(file.patch.split('\n').slice(0,-1).join('\n'),file),false);
 assert.equal(verifyFinalLoopChildPatch(file.patch,{...file,additions:694}),false);
 assert.equal(verifyFinalLoopChildPatch('x'.repeat(40001),file),false);
});

test('canonical handoff overload delegates the same atomic claim and rejects stale authority without another ledger',()=>{
 const sql=readFileSync(new URL('../sql/reality-final-loop-child-transactional-v1.sql',import.meta.url),'utf8');
 const scope=sql.slice(sql.indexOf('-- Canonical scope-bound overload'),sql.indexOf('-- Exact owner-facing packet readback'));
 assert.match(scope,/p_shift_id uuid,p_worker_run_id uuid,p_canonical_handoff jsonb/);
 assert.match(scope,/reality_read_final_loop_child_approval_preflight_v1\(p_shift_id\)/);
 assert.match(scope,/current_scope IS DISTINCT FROM/);
 assert.match(scope,/reality_read_final_loop_shared_continuity_guard_v1\(p_shift_id\)/);
 assert.match(scope,/reality_read_current_final_loop_proof_envelope_v1\(p_shift_id\)/);
 assert.match(scope,/l\.lease_expires_at>pg_catalog\.clock_timestamp\(\)/);
 assert.match(scope,/a\.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'/);
 assert.match(scope,/e\.governed_wake_worker_run_id=r\.run_id/);
 assert.match(scope,/c:=public\.reality_claim_final_loop_child_review_v1\(p_shift_id,p_worker_run_id\)/);
 assert.match(scope,/x\.packet_id::text=h->>'packet_id'/);
 assert.match(scope,/RAISE EXCEPTION 'FINAL_LOOP_CANONICAL_CHILD_ATOMIC_CLAIM_SCOPE_MISMATCH'/);
 assert.match(scope,/FROM PUBLIC,anon,authenticated/);
 assert.match(scope,/'isolated_model_invoked',false/);
 assert.doesNotMatch(scope,/CREATE TABLE|INSERT INTO|UPDATE reality_internal/);
});

test('already claimed isolated computation uses only fresh canonical readback and returns unverified advisory',async()=>{
 const files=completeLargeFiles(),plan=await sourcePlan(files),scope=plan.bounded_scopes[0];
 const body=structuredReview(scope);
 const claim={
  status:'FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE',
  owner_id:owner,shift_id:shift,child_work_id:child,
  claim_id:'44444444-4444-4444-8444-444444444444',
  claimant_worker_run_id:run,parent_original_work_id:parent,source_ref:pr,
  source_head_sha:plan.live_head_sha,source_manifest_sha256:plan.source_manifest_sha256,
  source_proof_sha256:sourceHash,acceptance_contract_sha256:acceptance,
  scope_index:0,scope_sha256:scope.proposed_scope_sha256,scope,
  phase:'CLAIMED',child_claimed:true,original_job_completed:false,
  production_changed:false,canonical_scope_bound:true
 };
 const current={...claim,status:'FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK',
  worker_run_id:run,model_response_id:null,model_authorized:true};
 let reads=0,modelCalls=0;
 const fetchImpl=provider({id:'resp_claimed123456',text:body},files,()=>modelCalls++);
 const base={claim,mode:'PREPARE',shiftId:shift,workerRunId:run,env,
  executionProject:db.project,fetchImpl};
 const r=await computeClaimedFinalLoopChildAdvisory({...base,readCurrentChild:async()=>{reads++;return current;}});
 assert.equal(r.status,'FINAL_LOOP_CHILD_CLAIMED_ADVISORY_UNTRUSTED');
 assert.equal(r.candidate,body);
 assert.equal(r.child_work_id,child);
 assert.equal(r.parent_original_work_id,parent);
 assert.equal(r.model_response_id,'resp_claimed123456');
 assert.match(r.provider_evidence_sha256,/^sha256:[a-f0-9]{64}$/);
 assert.equal(r.independent_verification_committed,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.external_effect_performed,false);
 assert.equal(reads,2);
 assert.equal(modelCalls,1);
 for(const options of [
  {claim:{...claim,claimant_worker_run_id:other}},
  {executionProject:'wrongproject'},
  {env:{...env,REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:db.project}},
  {readCurrentChild:async()=>({...current,model_authorized:false})},
  {readCurrentChild:async()=>({...current,parent_original_work_id:'work:'+'3'.repeat(32)})}
 ]){
  const blocked=await computeClaimedFinalLoopChildAdvisory({...base,readCurrentChild:async()=>current,...options});
  assert.notEqual(blocked.status,'FINAL_LOOP_CHILD_CLAIMED_ADVISORY_UNTRUSTED');
 }
 assert.equal(modelCalls,1);
 let staleReads=0;
 const stale=await computeClaimedFinalLoopChildAdvisory({...base,readCurrentChild:async()=>
  ++staleReads===1?current:{...current,model_authorized:false}});
 assert.equal(stale.status,'FINAL_LOOP_CHILD_GATEWAY_CURRENT_AUTHORITY_OR_SOURCE_REJECTED');
 assert.equal(stale.candidate,undefined);
 assert.equal(modelCalls,2);
});

test('canonical claim, isolated computation and independent return preserve one Continuity scope',async()=>{
 const files=completeLargeFiles(),plan=await sourcePlan(files),scope=plan.bounded_scopes[0];
 const paths=scope.files.map(f=>f.path);
 const body=assembledReview(scope),raw=structuredReview(scope);
 const packet='11111111-1111-4111-8111-111111111111',root='33333333-3333-4333-8333-333333333333';
 const claimId='44444444-4444-4444-8444-444444444444';
 const event='55555555-5555-4555-8555-555555555555';
 const h={schema:'reality-canonical-approved-review-scope-v1',
  status:'CANONICAL_APPROVED_REVIEW_SCOPE_BOUND_CLAIM_REQUIRED',
  owner_id:owner,shift_id:shift,plan_id:packet,packet_id:packet,
  plan_fingerprint:hash('c'),parent_original_work_id:parent,source_ref:pr,
  source_head_sha:plan.live_head_sha,source_proof_sha256:sourceHash,
  source_manifest_sha256:plan.source_manifest_sha256,acceptance_contract_sha256:acceptance,
  owner_approval_receipt_sha256:hash('d'),scope_count:plan.bounded_scopes.length,
  scope_fingerprints:plan.bounded_scopes.map(x=>({index:x.index,scope_sha256:x.proposed_scope_sha256})),
  continuity_root_id:root,continuity_head_sha256:hash('e'),revision:2,
  effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',canonical_claim_required:true,
  next_governed_action:'CLAIM_EXACT_CANONICAL_CHILD_REVIEW_THROUGH_EXISTING_SIGNED_WORKER',
  read_only:true,execution_authorized:false,original_job_completed:false,production_changed:false};
 const trigger={status:'FINAL_LOOP_GOVERNED_TRIGGER_EXACT_REVIEW_CLAIM_ROUTE_READY',
  review_claim_route_ready:true,dispatch_permitted:false,execution_authorized_by_trigger:false,
  owner_id:owner,shift_id:shift,event_id:event,original_work_id:parent,source_ref:pr,
  continuity_head_sha256:h.continuity_head_sha256,continuity_revision:h.revision,
  qualifier_receipt_sha256:hash('f'),canonical_claim_handoff:h};
 const continuity={status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',owner_id:owner,shift_id:shift,
  original_job_completed:false,execution_authorized:false,
  shared_continuity_guard:{status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
   owner_id:owner,shift_id:shift,continuity_root_id:root,continuity_head_sha256:h.continuity_head_sha256,
   revision:2,execution_authorized:false,handoffs:[{source_ref:pr,original_work_id:parent,
    continuity_identity_verified:true,qualifier_digest_verified:true,
    qualifier_receipt_sha256:trigger.qualifier_receipt_sha256,
    next_qualified_action:'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',
    independent_original_outcome_verified:false,original_job_completed:false,
    execution_spine_readback:{status:'NO_FENCED_CHILD_INVOCATION_OBSERVED',fenced_count:0,
     signed_observation_count:0,observations:[],canonical_return_committed:false}}]}};
 const {status,continuity_root_id,continuity_head_sha256,revision,next_governed_action,read_only,...accepted}=h;
 const preflight={status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
  owner_id:owner,shift_id:shift,plan_fingerprint:h.plan_fingerprint,
  execution_authorized:false,original_job_completed:false,
  plans:[{plan_id:packet,independent_goal_acceptance_verified:true,owner_approval_claim_window_current:true,
   canonical_review_handoff:accepted}]};
 const claim={status:'FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE',
  owner_id:owner,shift_id:shift,child_work_id:child,parent_original_work_id:parent,source_ref:pr,
  claim_id:claimId,claimant_worker_run_id:run,phase:'CLAIMED',child_claimed:true,
  source_head_sha:h.source_head_sha,source_proof_sha256:sourceHash,source_manifest_sha256:h.source_manifest_sha256,
  acceptance_contract_sha256:acceptance,scope_index:scope.index,scope_sha256:scope.proposed_scope_sha256,scope,
  original_job_completed:false,production_changed:false,canonical_scope_bound:true,
  packet_id:packet,plan_id:packet,continuity_head_sha256:h.continuity_head_sha256,revision:2};
 const current={...claim,status:'FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK',
  worker_run_id:run,model_authorized:true,model_response_id:null};
 const verify={...claim,status:'FINAL_LOOP_INDEPENDENT_CHILD_VERIFICATION_CANDIDATE',
  original_generation_worker_run_id:run,independent_verifier_run_id:other,
  review_body:body,review_sha256:digest(body),model_response_id:'resp_prepared1234',read_only:true};
 delete verify.claim_id;delete verify.claimant_worker_run_id;
 const canonicalDb={strictSecrets:true,project:'testcanonical'};
 const canonicalEnv={...env,REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:canonicalDb.project,
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:canonicalDb.project,
  REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false',REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'false'};
 let reads=0,claims=0,prepares=0,verifies=0,modelCalls=0,drift=false,verificationMode=false;
 let returnDrift=false,rejectionObservation=null;
 const fetchImpl=()=>{throw Error('CANONICAL_WORKER_MUST_NOT_CALL_MODEL_DIRECTLY')};
 const call=async(_db,name,args)=>{
  if(name==='reality_read_final_loop_child_approval_preflight_v1')return preflight;
  if(name==='reality_read_final_loop_child_recovery_v1')return {
   status:'FINAL_LOOP_CANONICAL_CHILD_RECOVERY_PROOF_NOT_PARENT_SETTLEMENT',
   independent_service_readback_verified:true,owner_id:owner,shift_id:shift,
   parent_original_work_id:parent,parent_source_ref:pr,source_manifest_sha256:h.source_manifest_sha256,
   source_head_sha:h.source_head_sha,acceptance_contract_sha256:acceptance,
   original_job_completed:false,production_changed:false,
   children:[{child_original_work_id:child,phase:'VERIFIED',parent_original_work_id:parent,
    advisory_rejection_receipts:rejectionObservation?{PREPARE:rejectionObservation}:{},
    scope_sha256:scope.proposed_scope_sha256,independently_verified:true,verifier_independent:true,
    independent_receipt_sha256:hash('9'),canonical_continuity_binding:{continuity_root_id:root,
     continuity_head_sha256:returnDrift?hash('a'):h.continuity_head_sha256,revision:2,
     owner_approval_receipt_sha256:h.owner_approval_receipt_sha256}}]};
  assert.deepEqual(args.p_canonical_handoff,h);
  if(name==='reality_record_final_loop_child_rejection_v1'){
   rejectionObservation={...args.p_evidence,invocation_id:event,
    observation_receipt_sha256:hash('8'),observation_only:true,independent_recovery_verified:false,
    continuity_head_sha256:h.continuity_head_sha256,owner_approval_receipt_sha256:h.owner_approval_receipt_sha256};
   return {status:'FINAL_LOOP_CHILD_REJECTION_OBSERVATION_RECORDED',child_work_id:child,
    observation_receipt_sha256:hash('8'),invocation_id:event};
  }
  if(name==='reality_read_final_loop_child_verify_v1')return verificationMode?verify:
   {status:'FINAL_LOOP_NO_PREPARED_CHILD_FOR_INDEPENDENT_VERIFICATION'};
  if(name==='reality_claim_final_loop_child_review_v1'){claims++;return claim;}
  if(name==='reality_read_final_loop_child_model_scope_v1')return current;
  if(name==='reality_prepare_final_loop_child_review_v1'){prepares++;
   return {status:'FINAL_LOOP_CHILD_MODEL_ARTIFACT_PREPARED_NOT_VERIFIED',
    child_work_id:child,parent_original_work_id:parent,review_sha256:digest(body),original_job_completed:false};}
  if(name==='reality_record_final_loop_child_verified_v1'){verifies++;
   assert.equal(args.p_evidence.independent_verifier_run_id,other);
   assert.deepEqual(args.p_evidence.verified_paths,paths);
   return {status:'FINAL_LOOP_CHILD_REVIEW_INDEPENDENTLY_VERIFIED_PARENT_OPEN',
    child_work_id:child,parent_original_work_id:parent,independent_receipt_sha256:hash('9'),original_job_completed:false};}
  throw Error('UNEXPECTED '+name);
 };
 const readCurrentContinuity=async()=>{reads++;return drift?
  {...continuity,shared_continuity_guard:{...continuity.shared_continuity_guard,revision:3}}:continuity;};
 const runIsolatedAdvisory=async({claim,mode,shiftId,workerRunId,readCurrentChild})=>
  computeClaimedFinalLoopChildAdvisory({claim,mode,shiftId,workerRunId,readCurrentChild,env,
   executionProject:db.project,fetchImpl:provider({id:mode==='VERIFY'?'resp_verifier1234':'resp_prepared1234',
    text:mode==='VERIFY'?JSON.stringify({verdict:'PASS',supported_paths:paths}):raw},files,()=>modelCalls++)});
 const base={db:canonicalDb,trigger,workerRunId:run,env:canonicalEnv,readCurrentContinuity,runIsolatedAdvisory,call,fetchImpl};
 const observedHead=hash('7'),returnedEvent='77777777-7777-4777-8777-777777777777';
 const pendingObservation={status:'SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN',
  fenced_count:1,signed_observation_count:1,observations:[{model_artifact_recorded:false}],
  canonical_return_committed:false};
 const withObservation=(e,head=h.continuity_head_sha256,revision=2)=>({...continuity,
  shared_continuity_guard:{...continuity.shared_continuity_guard,continuity_head_sha256:head,revision,
   handoffs:[{...continuity.shared_continuity_guard.handoffs[0],execution_spine_readback:e}]}});
 const failedGateway=await advanceCanonicalFinalLoopChildReview({...base,
  readCurrentContinuity:async()=>withObservation(pendingObservation),
  call:async(db,name,args)=>{
   if(name==='reality_return_final_loop_invocation_observations_v1')throw Error('SHIFT_RPC_NOT_ALLOWLISTED');
   return call(db,name,args);
  }});
 assert.equal(failedGateway.continuity_blocker_code,'FINAL_LOOP_CONTINUITY_RPC_NOT_REGISTERED_UNVERIFIED');
 assert.equal(claims,0);assert.equal(modelCalls,0);
 const missingEvidence=await advanceCanonicalFinalLoopChildReview({...base,readCurrentContinuity:async()=>withObservation(null)});
 assert.equal(missingEvidence.status,'FINAL_LOOP_CANONICAL_EXECUTION_SPINE_READBACK_REQUIRED_NO_CLAIM');
 let returned=false;
 const returnedEvidence={...pendingObservation,status:'SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',
  canonical_return_committed:true,canonical_return_event_id:returnedEvent,canonical_return_head_sha256:observedHead,
  observation_sha256:hash('6')};
 const returnCall=async(db,name,args)=>{
  if(name!=='reality_return_final_loop_invocation_observations_v1')return call(db,name,args);
  assert.equal(args.p_original_work_id,parent);assert.equal(args.p_expected_revision,2);
  // Exercise the actual production RPC allowlist, request encoding and
  // transport contract. Inject only the remote HTTP response.
  return shiftRpc({url:'https://fixture.invalid',secretKey:'test-key'},name,args,{
   fetchImpl:async(url,options)=>{
    assert.equal(url,'https://fixture.invalid/rest/v1/rpc/reality_return_final_loop_invocation_observations_v1');
    assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),args);
    returned=true;
    return {ok:true,status:200,json:async()=>({
     status:'FINAL_LOOP_SPINE_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',canonical_return_committed:true,
     execution_authorized:false,replay_authorized:false,original_job_completed:false,event_id:returnedEvent,
     observation_sha256:hash('6'),continuity_head_sha256:observedHead,revision:3})};
   }});
 };
 const observationReturn=await advanceCanonicalFinalLoopChildReview({...base,call:returnCall,
  readCurrentContinuity:async()=>returned?withObservation(returnedEvidence,observedHead,3):withObservation(pendingObservation)});
 assert.equal(observationReturn.status,'FINAL_LOOP_CANONICAL_SPINE_RETURN_INDEPENDENTLY_OBSERVED_ORIGINAL_OPEN');
 assert.equal(observationReturn.child_claimed,false);assert.equal(observationReturn.model_invoked,false);
 assert.equal(claims,0);assert.equal(modelCalls,0);
 const unresolved=await advanceCanonicalFinalLoopChildReview({...base,readCurrentContinuity:async()=>withObservation(returnedEvidence)});
 assert.equal(unresolved.status,'FINAL_LOOP_CANONICAL_UNRESOLVED_INVOCATION_RECOVERY_REQUIRED_NO_CLAIM');
 returned=false;
 const unconfirmedReturn=await advanceCanonicalFinalLoopChildReview({...base,call:returnCall,
  readCurrentContinuity:async()=>withObservation(pendingObservation)});
 assert.equal(unconfirmedReturn.status,'FINAL_LOOP_CANONICAL_SPINE_RETURN_INDEPENDENT_READBACK_REQUIRED_NO_CLAIM');
 assert.equal(claims,0);assert.equal(modelCalls,0);
 const missing=await advanceCanonicalFinalLoopChildReview({...base,runIsolatedAdvisory:null});
 assert.equal(missing.status,'FINAL_LOOP_CANONICAL_ISOLATED_EXECUTOR_CONNECTION_REQUIRED');
 assert.equal(claims,0);
 const prepared=await advanceCanonicalFinalLoopChildReview(base);
 assert.equal(prepared.status,'FINAL_LOOP_CHILD_MODEL_ARTIFACT_PREPARED_NOT_VERIFIED');
 assert.equal(prepared.canonical_continuity_head_sha256,h.continuity_head_sha256);
 assert.equal(claims,1);assert.equal(prepares,1);assert.equal(modelCalls,1);assert.ok(reads>=4);
 verificationMode=true;
 const verified=await advanceCanonicalFinalLoopChildReview({...base,workerRunId:other});
 assert.equal(verified.status,'FINAL_LOOP_CHILD_REVIEW_INDEPENDENTLY_VERIFIED_PARENT_OPEN');
 assert.equal(verified.parent_obligation_remains_open,true);assert.equal(verified.canonical_continuity_head_sha256,h.continuity_head_sha256);
 assert.equal(verified.canonical_verifier_receipt_readback_verified,true);
 assert.equal(claims,1);assert.equal(verifies,1);assert.equal(modelCalls,2);
 returnDrift=true;
 const unconfirmed=await advanceCanonicalFinalLoopChildReview({...base,workerRunId:other});
 assert.equal(unconfirmed.status,'FINAL_LOOP_CANONICAL_VERIFIER_RECEIPT_READBACK_REQUIRED_NO_REPLAY');
 assert.equal(unconfirmed.child_review_independently_verified,undefined);
 assert.equal(verifies,2);assert.equal(modelCalls,3);returnDrift=false;
 const stale=await advanceCanonicalFinalLoopChildReview({...base,workerRunId:other,runIsolatedAdvisory:async x=>{
  const r=await runIsolatedAdvisory(x);drift=true;return r;
 }});
 assert.equal(stale.status,'FINAL_LOOP_CHILD_CONTINUITY_DRIFT_NO_RECEIPT_REPLAY');
 assert.equal(verifies,2);assert.equal(modelCalls,4);
 // A valid provider envelope and signed original can still carry an
 // oversized advisory. Rejection must identify content, not imply
 // authority drift or silently truncate, and must never write a receipt.
 drift=false;verificationMode=false;
 const originalAdvisory=await runIsolatedAdvisory({claim,mode:'PREPARE',shiftId:shift,
  workerRunId:run,readCurrentChild:async()=>current});
 const beforeWrites=prepares;
 for(const size of [4001,8001]){
  const oversized=body+' '.repeat(size-body.length-1)+'x';
  const result=await advanceCanonicalFinalLoopChildReview({...base,
   runIsolatedAdvisory:async()=>({...originalAdvisory,candidate:oversized})});
  assert.equal(result.status,'FINAL_LOOP_CHILD_MODEL_REVIEW_NOT_SOURCE_COMPLETE');
  assert.equal(result.advisory_reconciliation_evidence.reason,'ADVISORY_CONTENT_OVER_CHARACTER_BUDGET');
  assert.equal(result.advisory_reconciliation_evidence.candidate_chars,size);
  assert.equal(result.advisory_rejection_readback_verified,true);
  assert.equal(result.advisory_rejection_receipt_sha256,hash('8'));
  assert.equal(result.advisory_reconciliation_evidence.candidate_sha256,digest(oversized));
  assert.equal(result.advisory_reconciliation_evidence.child_work_id,child);
  assert.equal(result.advisory_reconciliation_evidence.parent_original_work_id,parent);
  assert.equal(result.advisory_reconciliation_evidence.accepted_artifact,false);
  assert.equal(result.provider_effect_replay_authorized,false);
  assert.equal(result.candidate,undefined);
 }
 const badAuthority=await advanceCanonicalFinalLoopChildReview({...base,
  runIsolatedAdvisory:async()=>({...originalAdvisory,external_effect_performed:true})});
 assert.equal(badAuthority.status,'FINAL_LOOP_CHILD_ADVISORY_IDENTITY_OR_AUTHORITY_DRIFT');
 assert.equal(badAuthority.advisory_reconciliation_evidence.reason,'ADVISORY_AUTHORITY_FLAGS_INVALID');
 assert.equal(badAuthority.provider_effect_replay_authorized,false);
 assert.equal(prepares,beforeWrites);
});

test('canonical SQL reads and writes share the same continuity and signed release check',()=>{
 const sql=readFileSync(new URL('../sql/reality-final-loop-child-transactional-v1.sql',import.meta.url),'utf8');
 assert.match(sql,/check_final_loop_canonical_child_scope_v1\(p_shift_id,p_worker_run_id,h\)/);
 assert.match(sql,/check_final_loop_canonical_child_scope_v1\(p_shift_id,p_verifier_run_id,p_canonical_handoff\)/);
 assert.match(sql,/e\.continuity_head_sha256=h->>'continuity_head_sha256'/);
 assert.match(sql,/o->>'qualifier_receipt_sha256'=e.source_receipt_sha256/);
 assert.match(sql,/FOR UPDATE OF s,w/);
 assert.match(sql,/'canonical_continuity_head_sha256',p_canonical_handoff->'continuity_head_sha256'/);
 assert.match(sql,/'canonical_continuity_head_sha256',p_evidence->'canonical_continuity_head_sha256'/);
 assert.match(sql,/FINAL_LOOP_CANONICAL_VERIFIER_CONTINUITY_DRIFT_NO_REPLAY/);
});

test('actual signed transport connects the canonical claim to isolated model computation, fences replay and returns evidence',async()=>{
 const files=completeLargeFiles(),plan=await sourcePlan(files),scope=plan.bounded_scopes[0];
 const body=structuredReview(scope);
 const packet='11111111-1111-4111-8111-111111111111';
 const h={schema:'reality-canonical-approved-review-scope-v1',
  owner_id:owner,shift_id:shift,plan_id:packet,packet_id:packet,
  parent_original_work_id:parent,source_ref:pr,source_head_sha:plan.live_head_sha,
  source_proof_sha256:sourceHash,source_manifest_sha256:plan.source_manifest_sha256,
  acceptance_contract_sha256:acceptance,scope_fingerprints:plan.bounded_scopes.map(x=>({index:x.index,scope_sha256:x.proposed_scope_sha256})),
  continuity_root_id:'33333333-3333-4333-8333-333333333333',continuity_head_sha256:hash('e'),revision:2,
  effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',canonical_claim_required:true,
  execution_authorized:false,original_job_completed:false,production_changed:false};
 const claim={status:'FINAL_LOOP_EXACT_SIGNED_CHILD_CLAIMED_ONCE',owner_id:owner,shift_id:shift,
  child_work_id:child,claim_id:'44444444-4444-4444-8444-444444444444',claimant_worker_run_id:run,
  parent_original_work_id:parent,source_ref:pr,source_head_sha:h.source_head_sha,source_proof_sha256:sourceHash,
  source_manifest_sha256:h.source_manifest_sha256,acceptance_contract_sha256:acceptance,
  scope_index:scope.index,scope_sha256:scope.proposed_scope_sha256,scope,phase:'CLAIMED',child_claimed:true,
  canonical_scope_bound:true,plan_id:packet,packet_id:packet,continuity_head_sha256:h.continuity_head_sha256,
  revision:2,original_job_completed:false,production_changed:false};
 const current={...claim,status:'FINAL_LOOP_CHILD_CURRENT_SIGNED_MODEL_READBACK',worker_run_id:run,
  model_authorized:true,model_response_id:null};
 const canonicalDb={strictSecrets:true,project:'canonicaltestproject'};
 const isolatedDb={strictSecrets:true,project:'isolatedtestprojectx'};
 const common={...env,REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ENABLED:'true',
  REALITY_FINAL_LOOP_REVIEW_CANONICAL_HOST:'canonical-test-deploy.vercel.app',
  REALITY_SIGNED_WORKER_STABLE_ALIAS:'canonical-test-deploy.vercel.app',
  REALITY_FINAL_LOOP_REVIEW_ISOLATED_DEPLOYMENT_ID:'dpl_isolatedtest1234',
  REALITY_FINAL_LOOP_REVIEW_ISOLATED_HOST:'isolated-test-deploy.vercel.app',
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:canonicalDb.project,
  REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:isolatedDb.project,
  REALITY_FINAL_LOOP_REVIEW_TRANSPORT_KEY:'b'.repeat(64),
  REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'false',VERCEL_GIT_COMMIT_SHA:'f'.repeat(40)};
 const canonicalEnv={...common,REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ROLE:'CANONICAL',
  VERCEL_URL:'canonical-immutable-build.vercel.app',
  VERCEL_DEPLOYMENT_ID:'dpl_canonicaltest1234',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:canonicalDb.project,
  REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
  REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false'};
 const isolatedEnv={...common,REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ROLE:'ISOLATED',
  VERCEL_URL:common.REALITY_FINAL_LOOP_REVIEW_ISOLATED_HOST,
  VERCEL_DEPLOYMENT_ID:'dpl_isolatedtest1234',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:isolatedDb.project};
 const now=()=>1234567890000;
 let nonce=null,begins=0,checks=0,modelCalls=0,recordedCompute,drift=false,dbProof=true,foreignGraph=false,rateLimited=false;
 const call=async(_db,name,args)=>{
  if(name==='reality_read_final_loop_governed_start_v1')return {status:dbProof?'GOVERNED_START_SCOPE_UNVERIFIED':'NOT_AUTHORIZED'};
  if(name==='reality_read_current_shift_execution_graph_v1'){
   assert.equal(_db,isolatedDb);return {status:foreignGraph?'UNEXPECTED_ACTIVE_SHIFT':'NO_CURRENT_OWNER_SHIFT_EXECUTION_GRAPH'};
  }
  if(name==='reality_fence_final_loop_child_transport_v1'&&args.p_child_work_id===null)
   return {status:'FINAL_LOOP_CHILD_TRANSPORT_SCOPE_INVALID'};
  assert.equal(_db,canonicalDb);assert.equal(name,'reality_fence_final_loop_child_transport_v1');
  assert.deepEqual(args.p_canonical_handoff,h);
  assert.equal(args.p_child_work_id,child);assert.equal(args.p_worker_run_id,run);
  if(args.p_begin){begins++;if(nonce!==null)return {status:'FINAL_LOOP_CHILD_TRANSPORT_ALREADY_FENCED_NO_REPLAY'};nonce=args.p_invocation_id;}
  else{checks++;if(drift||nonce!==args.p_invocation_id)return {status:'STALE'};}
  return current;
 };
 const mockProvider=provider({id:'resp_transport1234',text:body},files,()=>modelCalls++);
 const fetchImpl=async(url,options)=>{
  if(rateLimited&&url.startsWith('https://api.openai.com/')){
   modelCalls++;return {ok:false,status:429};
  }
  if(url.startsWith('https://api.github.com/')||url.startsWith('https://api.openai.com/'))return mockProvider(url,options);
  assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
  assert.equal(options.headers.authorization,undefined);
  assert.equal(options.headers.apikey,undefined);
  const req=JSON.parse(options.body);const p=JSON.parse(req.payload);
  const canonical=url==='https://'+canonicalEnv.REALITY_SIGNED_WORKER_STABLE_ALIAS+'/api/reality/governed-final-loop-child-transport';
  assert.ok(canonical||url==='https://'+isolatedEnv.VERCEL_URL+'/api/reality/governed-final-loop-child-transport');
  if(p.action==='COMPUTE')recordedCompute=req;
  const r=await handleExistingChildTransport({db:canonical?canonicalDb:isolatedDb,body:req,
   env:canonical?canonicalEnv:isolatedEnv,call,fetchImpl,now});
  return {ok:r.http===200,status:r.http,json:async()=>r.body};
 };
 const base={db:canonicalDb,handoff:h,env:canonicalEnv,fetchImpl,call,now};
 dbProof=false;
 assert.equal((await connectExistingIsolatedChildTransport(base)).ready,undefined);
 dbProof=true;foreignGraph=true;
 assert.equal((await connectExistingIsolatedChildTransport(base)).ready,undefined);
 foreignGraph=false;
 assert.equal(begins,0);assert.equal(modelCalls,0);
 const missing=await connectExistingIsolatedChildTransport({...base,env:{...canonicalEnv,REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ENABLED:'false'}});
 assert.equal(missing.ready,undefined);assert.equal(begins,0);
 const wrongPeer=await connectExistingIsolatedChildTransport({...base,env:{...canonicalEnv,
  REALITY_FINAL_LOOP_REVIEW_ISOLATED_DEPLOYMENT_ID:'dpl_foreignpeer1234'}});
 assert.equal(wrongPeer.ready,undefined);assert.equal(begins,0);
 const connected=await connectExistingIsolatedChildTransport(base);
 assert.equal(connected.ready,true);
 assert.equal(connected.database_contract_verified,true);
 assert.equal(connected.probe_only,false);
 assert.equal(connected.isolated_deployment_id,isolatedEnv.VERCEL_DEPLOYMENT_ID);
 assert.equal(connected.canonical_deployment_id,canonicalEnv.VERCEL_DEPLOYMENT_ID);assert.equal(begins,0);assert.equal(modelCalls,0);
 const input={claim,mode:'PREPARE',shiftId:shift,workerRunId:run};
 const result=await connected.runIsolatedAdvisory(input);
 assert.equal(result.status,'FINAL_LOOP_CHILD_CLAIMED_ADVISORY_UNTRUSTED');
 assert.equal(result.candidate,body);assert.equal(result.original_job_completed,false);
 assert.equal(begins,1);assert.equal(checks,1);assert.equal(modelCalls,1);
 await assert.rejects(()=>connected.runIsolatedAdvisory(input),/NO_REPLAY/);
 const replay=await handleExistingChildTransport({db:isolatedDb,body:recordedCompute,env:isolatedEnv,call,fetchImpl,now});
 assert.equal(JSON.parse(replay.body.payload).status,'FINAL_LOOP_ISOLATED_CHILD_ADVISORY_UNVERIFIED_NO_REPLAY');
 assert.equal(modelCalls,1);
 const forged=await handleExistingChildTransport({db:isolatedDb,body:{...recordedCompute,signature:'0'.repeat(64)},env:isolatedEnv,call,fetchImpl,now});
 assert.equal(forged.http,403);assert.equal(modelCalls,1);
 const probeFlags={REALITY_FINAL_LOOP_REVIEW_TRANSPORT_PROBE_ONLY:'true',
  REALITY_CONTINUOUS_RELIABILITY_ENABLED:'false',REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED:'false',
  REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false'};
 const probeEnv={...canonicalEnv,...probeFlags};
 const probeFetch=async(url,options)=>{
  const req=JSON.parse(options.body);
  const r=await handleExistingChildTransport({db:isolatedDb,body:req,
   env:{...isolatedEnv,...probeFlags},call,now,fetchImpl:()=>{throw Error('PROBE_MUST_NOT_CALL_PROVIDER');}});
  return {ok:r.http===200,status:r.http,json:async()=>r.body};
 };
 const readOnly=await connectExistingIsolatedChildTransport({...base,env:probeEnv,fetchImpl:probeFetch});
 assert.equal(readOnly.ready,true);
 assert.equal(readOnly.probe_only,true);
 await assert.rejects(()=>readOnly.runIsolatedAdvisory(input),/PROBE_ONLY/);
 assert.equal(modelCalls,1);
 const computeAttempt=await handleExistingChildTransport({db:isolatedDb,body:recordedCompute,
  env:{...isolatedEnv,...probeFlags},call,now,compute:()=>{throw Error('PROBE_MUST_NOT_COMPUTE');}});
 assert.equal(computeAttempt.http,403);assert.equal(modelCalls,1);
 nonce=null;drift=true;
 const next=await connectExistingIsolatedChildTransport(base);
 await assert.rejects(()=>next.runIsolatedAdvisory(input),error=>{
  assert.match(error.message,/ADVISORY_UNVERIFIED/);
  assert.equal(error.child_failure_reason,'FINAL_LOOP_CHILD_GATEWAY_CURRENT_AUTHORITY_OR_SOURCE_REJECTED');
  assert.equal(error.child_authority_read_attempts,2);return true;
 });
 assert.equal(modelCalls,2); // inference may happen, but drift prevents any return/receipt
 nonce=null;drift=false;rateLimited=true;
 const limited=await connectExistingIsolatedChildTransport(base);
 await assert.rejects(()=>limited.runIsolatedAdvisory(input),error=>{
  assert.match(error.message,/ADVISORY_UNVERIFIED/);
  assert.equal(error.child_failure_reason,'OPENAI_RATE_OR_QUOTA_LIMIT');
  assert.equal(error.child_authority_read_attempts,1);return true;
 });
 assert.equal(modelCalls,3);
 await assert.rejects(()=>limited.runIsolatedAdvisory(input),/NO_REPLAY/);
 assert.equal(modelCalls,3);
});

test('transport is attached to existing signed worker and canonical service-only fence',()=>{
 const sql=readFileSync(new URL('../sql/reality-final-loop-child-transactional-v1.sql',import.meta.url),'utf8');
 assert.match(sql,/canonical_prepare_invocation_id IS NULL/);
 assert.match(sql,/canonical_verify_invocation_id IS NULL/);
 assert.match(sql,/premodel_recovery_count=greatest\(premodel_recovery_count,1\)/);
 assert.match(sql,/reality_fence_final_loop_child_transport_v1\(text,uuid,uuid,text,uuid,boolean,jsonb\)[\s\n]+FROM PUBLIC,anon,authenticated/);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/signedWorkerDurableReleaseWake\.status==='SIGNED_WORKER_RELEASE_WAKE_DURABLY_RECORDED'/);
 assert.match(worker,/runIsolatedAdvisory:transport\.runIsolatedAdvisory/);
});

test('release continuation retains qualifier evidence and one-use historical invocation fences',()=>{
 const sql=readFileSync(new URL('../sql/reality-final-loop-release-continuation-v1.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS final_loop_release_continuation_once_v1/);
 assert.match(sql,/prev\.running_release_sha<>a\.release_sha/);
 assert.match(sql,/old_event\.source_receipt_sha256/);
 assert.match(sql,/c\.phase='ADMITTED' AND c\.canonical_prepare_invocation_id IS NULL/);
 assert.match(sql,/ev\.release_continuation_claim_id=release_claim/);
 assert.match(sql,/a\.claim_id=e\.release_continuation_claim_id AND a\.release_sha=p_release_sha/);
 assert.match(sql,/e\.governed_wake_queued_at>=a\.claimed_at/);
 assert.doesNotMatch(sql,/UPDATE reality_internal\.final_loop_child_review_work_v1/);
});

test('child rejection stays on existing work and is not a new authorization',()=>{
 const sql=readFileSync(new URL('../sql/reality-final-loop-child-rejection-continuity-v1.sql',import.meta.url),'utf8');
 assert.match(sql,/ALTER TABLE reality_internal\.final_loop_child_review_work_v1/);
 assert.match(sql,/check_final_loop_canonical_child_scope_v1/);
 assert.match(sql,/canonical_prepare_invocation_id/);
 assert.match(sql,/FINAL_LOOP_CHILD_REJECTION_RECEIPT_CONFLICT_NO_REPLAY/);
 assert.match(sql,/advisory_rejection_receipts=advisory_rejection_receipts/);
 assert.doesNotMatch(sql,/CREATE TABLE/);
});

test('Reality owns exact indexed source coverage and the review output budget',async()=>{
 const plan=await sourcePlan(completeLargeFiles()),scope=plan.bounded_scopes[0];
 const b=qualifyBoundedChildReviewStrategy(scope);
 assert.equal(b.max_provider_calls,1);
 assert.equal(b.max_output_tokens,1800);
 assert.equal(b.changed_files,0);
 assert.equal(b.replay_authorized,false);
 const raw=structuredReview(scope);
 assert.equal(assembleBoundedChildReview(raw,scope),assembledReview(scope));
 const base=JSON.parse(raw).files;
 assert.equal(assembleBoundedChildReview(JSON.stringify({files:[...base].reverse()}),scope),assembledReview(scope));
 for(const files of [base.slice(1),[base[0],...base.slice(1).map(x=>({...x,index:0}))],
  [{...base[0],finding:'x'.repeat(b.field_max_chars+1)},...base.slice(1)],
  [{...base[0],test:'\nUnsafe multiline content'},...base.slice(1)],
  [{...base[0],path:'foreign.js'},...base.slice(1)]]){
  assert.equal(assembleBoundedChildReview(JSON.stringify({files}),scope),null);
 }
 assert.equal(assembleBoundedChildReview(raw+' '.repeat(4000),scope),null);
 assert.equal(assembleBoundedChildReview(JSON.stringify({files:base,approved:true}),scope),null);
 const longScope={...scope,files:scope.files.map((f,i)=>({...f,path:'src/'+String(i)+'x'.repeat(340)+'.js'}))};
 const lb=qualifyBoundedChildReviewStrategy(longScope);
 assert.ok(lb.field_max_chars<160);
 const maximal=JSON.stringify({files:longScope.files.map((f,index)=>({index,finding:'x'.repeat(lb.field_max_chars),test:'y'.repeat(lb.field_max_chars)}))});
 assert.ok(assembleBoundedChildReview(maximal,longScope).length<=4000);
});

test('canonical continuity RPCs use the existing exact gateway allowlist',async()=>{
 const db={url:'https://fixture.invalid',secretKey:'test-key'};
 const called=[];
 const fetchImpl=async(url,options)=>{
  called.push(url.split('/').at(-1));assert.equal(options.method,'POST');
  return {ok:true,status:200,json:async()=>({status:'FIXTURE_ONLY'})};
 };
 for(const name of ['reality_return_final_loop_invocation_observations_v1','reality_record_final_loop_child_rejection_v1'])
  assert.equal((await shiftRpc(db,name,{}, {fetchImpl})).status,'FIXTURE_ONLY');
 await assert.rejects(shiftRpc(db,'reality_return_final_loop_invocation_observations_v2',{}, {fetchImpl}),/SHIFT_RPC_NOT_ALLOWLISTED/);
 await assert.rejects(shiftRpc(db,'reality_unregistered_effect_v1',{}, {fetchImpl}),/SHIFT_RPC_NOT_ALLOWLISTED/);
 assert.deepEqual(called,['reality_return_final_loop_invocation_observations_v1','reality_record_final_loop_child_rejection_v1']);
});

test('signed child failure reaches the existing incident observer before wake completion',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../sql/reality-final-loop-blocker-incident-handoff-v1.sql',import.meta.url),'utf8');
 assert.match(worker,/p_safe_result:verifiedSuspensionInvestigationDue\?[\s\S]*?finalLoopChildReview\.continuity_blocker_code/);
 assert.match(worker,/final_loop_blocker_incident:finalLoopBlockerIncident/);
 assert.match(sql,/SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED/);
 assert.match(sql,/e.governed_wake_worker_run_id=p_worker_run_id/);
 assert.match(sql,/e.original_work_id=a.runtime_scope->>'original_work_id'/);
 assert.match(sql,/'replay_authorized',false/);
 assert.doesNotMatch(sql,/net\.http_post|DELETE FROM/);
});


test('verified suspension reaches existing investigation without replay or a second wake',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../sql/reality-final-loop-blocker-incident-handoff-v1.sql',import.meta.url),'utf8');
 const investigator=readFileSync(new URL('../src/reality-shift-continuity-auto-investigation-v1.js',import.meta.url),'utf8');
 const start=worker.indexOf('const verifiedSuspensionInvestigationDue=');
 const stop=worker.indexOf('let finalLoopParentIntegration=',start);
 assert.ok(start>=0&&stop>start);
 const route=worker.slice(start,stop);
 for(const marker of ['FINAL_LOOP_CANONICAL_SPINE_RETURN_INDEPENDENTLY_OBSERVED_ORIGINAL_OPEN','QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY','child_claimed===false','model_invoked===false','original_job_completed===false','FINAL_LOOP_VERIFIED_SUSPENSION_INVESTIGATION_REQUIRED','reality_observe_signed_shift_no_progress_v1','investigateOneSignedShiftContinuityIncident']) assert.ok(route.includes(marker),marker);
 assert.ok(route.indexOf('reality_observe_signed_shift_no_progress_v1')<route.indexOf('investigateOneSignedShiftContinuityIncident'));
 const fence=sql.slice(sql.indexOf("IF p_safe_result='FINAL_LOOP_VERIFIED_SUSPENSION_INVESTIGATION_REQUIRED' THEN"),sql.indexOf("evidence:=pg_catalog.jsonb_build_object('schema','reality-signed-final-loop-blocker-v1'"));
 for(const marker of ["r.decision='SUSPEND'","r.reason_code='PROVIDER_EFFECT_UNCERTAIN'","u.payload->>'replay_authorized'='false'","u.payload->'terminal_recovery_history'->>'remaining_attempts'='0'","current_guard->>'continuity_head_sha256'='sha256:'||u.lineage_hash","sub.state='SUSPENDED'","FINAL_LOOP_VERIFIED_SUSPENSION_SOURCE_UNVERIFIED"]) assert.ok(fence.includes(marker),marker);
 assert.match(sql,/ON CONFLICT\(owner_id,shift_id,kind,evidence_key\) DO NOTHING/);
 assert.match(investigator,/previous_attempt_budget_preserved!==true/);
 assert.match(investigator,/new_attempt_authorized!==false/);
 assert.doesNotMatch(fence,/INSERT INTO|UPDATE reality_internal|net\.http_post/);
});
