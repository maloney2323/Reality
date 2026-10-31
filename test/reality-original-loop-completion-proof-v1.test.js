import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readOriginalLoopCompletion}
 from '../src/reality-original-loop-completion-proof-v1.0.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversation='592a7ab6-290f-43c3-82d0-1aaa9179fb65';
const sourceId='42b83e35-4128-541b-8141-0f53c8b720c3';
const outcomeId='01234567-89ab-4def-89ab-0123456789ab';
const finalId='12345678-9abc-4def-89ab-0123456789ab';
const original='work:9b9578b3c65427589c4c6da68fe0fc87',goal='goal:original',
 goalTransition='e70d60e6-6a67-56f5-b625-62e9d2099bbf';
const hash='a'.repeat(64),sha='c'.repeat(40),frozen='b'.repeat(64);
const at='root-original-work',session={user_id:owner,config:{url}};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'synthetic-in-memory-test-not-real',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project};
const source={event_id:sourceId,entity_type:'personal_first_self_upgrade_customer_work',
 event_kind:'WORK',epistemic_status:'OBSERVED',
 continuity_root_id:at,worldline_id:at,
 provenance:{principal_id:owner,conversation_id:conversation},
 payload:{original_work_id:original,issue_number:178,original_goal_id:goal,
  goal_transition_receipt_ref:goalTransition,
  installation_authorized:false,original_job_completed:false}};
const approval={status:'SETTLED',owner_id:owner,conversation_id:conversation,
 original_work_id:original,original_work_event_id:sourceId,
 goal_id:goal,goal_transition_event_id:goalTransition,
 candidate_hash:hash,installed_commit_sha:sha,frozen_test_sha256:frozen,
 install_branch:'feature/reality-closed-loop-worker-20261031',
 reservation_id:'34567890-abcd-4def-89ab-0123456789ab',consumed_once:true};
const outcome={event_id:outcomeId,entity_type:'reality_generic_verified_original_work_outcome',
 event_kind:'OBSERVATION',epistemic_status:'VERIFIED',
 continuity_root_id:at,worldline_id:at,
 payload:{owner_id:owner,original_work_id:original,outcome:'SUCCEEDED',
  independent_outcome_verified:true,production_changed:false,
  installed_artifact_hash:hash,installed_commit_sha:sha,
  original_executor_run_ref:'github:actions:run:555:job:999'}};
const checkpoint={event_id:finalId,entity_type:'reality_general_constitutional_checkpoint',
 event_kind:'WORK',epistemic_status:'OBSERVED',
 continuity_root_id:at,worldline_id:at,
 payload:{owner_id:owner,original_work_id:original,
  constitutional_phase:'SETTLED',original_job_completed:true,
  driver_state:{phase:'SETTLED',candidate:{artifact_hash:hash},
   settlement:{settlement_receipt_ref:'supabase:universe_events:'+outcomeId}}}};
function harness({sourceRows=[source],approvalRow=approval,outcomeRows=[outcome],
 checkpointRows=[checkpoint],acceptance=true}={}){
 let verifierCalls=0,rpcCalls=0;
 const fetchImpl=async(raw,opts)=>{
  const path=new URL(raw);
  assert.equal(path.origin,url);
  if(path.pathname.endsWith('/rpc/reality_read_general_repair_progress_v2')){
   assert.equal(opts.method,'POST');
   const body=JSON.parse(opts.body);
   assert.deepEqual(body,{p_owner_id:owner,p_conversation_id:conversation,
    p_original_work_id:original});
   rpcCalls++;
   return {ok:true,json:async()=>approvalRow};
  }
  assert.equal(path.pathname,'/rest/v1/universe_events');
  assert.equal(opts.method,'GET');
  const entity=path.searchParams.get('entity_type');
  const payload=entity?.startsWith('in.')?sourceRows:
    entity==='eq.reality_generic_verified_original_work_outcome'?outcomeRows:
    entity==='eq.reality_general_constitutional_checkpoint'?checkpointRows:[];
  return {ok:true,json:async()=>payload};
 };
 const createVerifier=()=>({observeOriginalRun:async params=>{
  verifierCalls++;
  assert.equal(params.originalWorkId,original);
  assert.equal(params.installedCommitSha,sha);
  assert.equal(params.expectedFrozenSha,frozen);
  if(!acceptance)return {complete:false};
  return {complete:true,status:'VERIFIED_ORIGINAL_INSTALLED_WORK',
   original_work_id:original,installed_commit_sha:sha,
   original_work_run_ref:outcome.payload.original_executor_run_ref,
   original_frozen_tests_passed:true,governance_tests_passed:true,
   independent_provider_readback:true};
 }});
 return {execute:()=>readOriginalLoopCompletion({
  session,env,originalWorkId:original,fetchImpl,createVerifier}),
  verifierCalls:()=>verifierCalls,rpcCalls:()=>rpcCalls};
}
test('no owner approval can never create LOOP COMPLETE or execute provider work',async()=>{
 const h=harness({approvalRow:{status:'NOT_APPROVED'}});
 const result=await h.execute();
 assert.equal(result.status,'LOOP_NOT_COMPLETE');
 assert.equal(result.loop_complete,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.external_action_performed,false);
 assert.equal(h.verifierCalls(),0);
});
test('exact signed owner original source + settled ledger + independent GitHub original job is LOOP COMPLETE',async()=>{
 const h=harness();const result=await h.execute();
 assert.equal(result.status,'LOOP_COMPLETE_VERIFIED');
 assert.equal(result.loop_complete,true);
 assert.equal(result.original_job_completed,true);
 assert.equal(result.installed_artifact_hash,hash);
 assert.equal(result.settlement_receipt_ref,'supabase:universe_events:'+outcomeId);
 assert.equal(result.final_checkpoint_receipt_ref,'supabase:universe_events:'+finalId);
 assert.equal(result.production_changed,false);
 assert.equal(result.external_action_performed,false);
 assert.equal(h.verifierCalls(),1);
 assert.equal(h.rpcCalls(),1);
});
test('even fully settled database without independently successful original Github run remains incomplete',async()=>{
 const h=harness({acceptance:false});const result=await h.execute();
 assert.equal(result.loop_complete,false);
 assert.equal(result.status,'INDEPENDENT_ORIGINAL_EXECUTION_UNVERIFIED');
});
test('a forged settlement or changed installed artifact never completes',async()=>{
 for(const altered of [
  {checkpointRows:[{...checkpoint,payload:{...checkpoint.payload,
    driver_state:{...checkpoint.payload.driver_state,
     settlement:{settlement_receipt_ref:'supabase:universe_events:'+finalId}}}}]},
  {outcomeRows:[{...outcome,payload:{...outcome.payload,installed_artifact_hash:'f'.repeat(64)}}]},
  {approvalRow:{...approval,status:'CLAIMED'}},
  {sourceRows:[{...source,provenance:{...source.provenance,principal_id:'99999999-9999-4999-8999-999999999999'}}]},
 ]){
  const h=harness(altered),result=await h.execute();
  assert.equal(result.loop_complete,false);
  assert.equal(result.original_job_completed,false);
 }
});
test('new API only reads and UI has receipt-bound LOOP COMPLETE label',()=>{
 const api=readFileSync(new URL('../api/reality/personal-loop-completion.js',
  import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(api,/req.method!=='GET'/);
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/readOriginalLoopCompletion/);
 assert.doesNotMatch(api,/ownerApproveAndQueue|continueAfterInstall|installVerifiedGenericPreviewExtension/);
 const start=html.indexOf('async function wcReadOriginal178LoopComplete()');
 assert.ok(start>0);
 const proofBlock=html.slice(start,html.indexOf('// A previously approved exact installation',start));
 assert.match(proofBlock,/result.status!=='LOOP_COMPLETE_VERIFIED'/);
 assert.match(proofBlock,/result.independently_verified!==true/);
 assert.match(proofBlock,/result.final_checkpoint_receipt_ref/);
 assert.match(proofBlock,/wcRepairSetBadge\('LOOP COMPLETE','ready'\)/);
});
