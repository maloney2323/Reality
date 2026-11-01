import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createGenuineSourceBackedJobAdapters}
 from '../src/reality-genuine-source-backed-job-v1.js';
import {appendContinuityNode,createContinuitySpine}
 from '../src/reality-continuity-spine-v2.0.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const owner='11111111-1111-4111-8111-111111111111';
const conversation='22222222-2222-4222-8222-222222222222';
const transition='33333333-3333-4333-8333-333333333333';
const work='work:'+'a'.repeat(32),runId=99887766,jobId=667788;
const sourceSha='6e6014f38f9fea382ea93b38418ec77e9158c1ef';
const deployedSha='b'.repeat(40);
const sourcePath='src/reality-extensions/real-business-helper.mjs';
const suitePath='test/reality-frozen-regressions/real-business-helper.test.js';
const frozen=Buffer.from("import './real-business-helper.mjs';\n",'utf8');
const hash=createHash('sha256').update(frozen).digest('hex');
const env={
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:deployedSha,
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-secret-isolated-only',
};
const session={user_id:owner,config:{url}};
const spine=createContinuitySpine({continuityRootId:'root:test',
 worldlineId:'world:test',subjectId:owner});
const first=appendContinuityNode({spine,stage:'RAW_SIGNAL',
 entityId:'first',eventId:'11111111-1111-4111-8111-111111111112',
 payload:{message:'test only'},effectiveTime:'2026-11-01T10:00:00.000Z',
 assertionTime:'2026-11-01T10:00:00.000Z',provenance:{}});
const source=Object.freeze({
 ...appendContinuityNode({spine,stage:'OBSERVATION',entityId:work,
  eventId:'55555555-5555-4555-8555-555555555555',
  parentEventId:first.event_id,priorLineageHash:first.lineage_hash,
  effectiveTime:'2026-11-01T11:00:00.000Z',
  assertionTime:'2026-11-01T11:00:00.000Z',epistemicStatus:'VERIFIED',
  payload:{
   version:'reality-original-source-backed-repair-v1',
   original_work_id:work,owner_id:owner,
   original_goal_id:'goal:example',
   goal_transition_receipt_ref:transition,
   owner_authorized_investigation:true,owner_authorized_installation:false,
   original_job_completed:false,production_changed:false,
   original_source_sha:sourceSha,frozen_test_sha256:hash,
   frozen_test_path:suitePath,source_path:sourcePath,
   original_provider_failed_run_id:runId,
   original_provider_failed_job_id:jobId,
  },provenance:{principal_id:owner,conversation_id:conversation},
 }),entity_type:'reality_original_source_backed_repair_work',
 provenance:{principal_id:owner,conversation_id:conversation,
  continuity_spine:{prior_lineage_hash:first.lineage_hash}}});
const state={
 principal_id:owner,conversation_id:conversation,
 persisted_source:'ISOLATED_CONTINUITY_VERIFIED_READBACK',
 scope:{root:spine.continuity_root_id,worldline:spine.worldline_id},
 state:{active_goal_id:'goal:example',active_goal:{
  goal_id:'goal:example',user_confirmed:true,status:'ACTIVE',
  last_transition_receipt_id:transition,
 }},
};
const root='https://api.github.com/repos/maloney2323/Reality';
function harness({events=[first,source],providerOK=true,goal=state,
 currentCapabilityPresent=false,currentSuiteChanged=false}={}){
 let calls=[];
 const fetchImpl=async input=>{
  calls.push(input);
  if(input===root+'/actions/runs/'+runId)
   return {ok:true,json:async()=>({id:runId,head_sha:sourceSha,
    head_repository:{full_name:'maloney2323/Reality'},
    status:'completed',conclusion:providerOK?'failure':'success'})};
  if(input===root+'/actions/runs/'+runId+'/jobs?per_page=100')
   return {ok:true,json:async()=>({jobs:[{id:jobId,run_id:runId,
    head_sha:sourceSha,conclusion:'failure',
    steps:[{name:'Frozen test',conclusion:'failure'}]}]})};
  if(input===root+'/contents/'+suitePath+'?ref='+sourceSha)
   return {ok:true,json:async()=>({path:suitePath,encoding:'base64',
    content:frozen.toString('base64')})};
  if(input===root+'/contents/'+sourcePath+'?ref='+sourceSha)
   return {ok:false,status:404};
  if(input===root+'/contents/'+suitePath+'?ref='+deployedSha)
   return {ok:true,json:async()=>({path:suitePath,encoding:'base64',
    content:(currentSuiteChanged?Buffer.from('tampered'):frozen).toString('base64')})};
  if(input===root+'/contents/'+sourcePath+'?ref='+deployedSha)
   return currentCapabilityPresent?{ok:true,json:async()=>({path:sourcePath})}:
    {ok:false,status:404};
  throw Error('UNEXPECTED_PROVIDER_URL');
 };
 return {
  calls,
  adapters:createGenuineSourceBackedJobAdapters({
   session,conversationId:conversation,env,fetchImpl,
   readGoal:async()=>goal,
   createPersistence:()=>({reconstruct:async()=>events}),
  }),
 };
}
test('current owner source-backed original work makes only provider GETs, returns verifiable missing capability',async()=>{
 const h=harness();
 const job=await h.adapters.loadAuthorizedInternalJob({
  original_work_id:work,owner_id:owner,conversation_id:conversation,read_only:true,
 });
 assert.equal(job.work_item.connector,null);
 assert.equal(job.work_item.operation,'read');
 assert.equal(job.original_job_settled,false);
 const original=await job.connector.execute();
 assert.equal(original.observation.historical_failure_verified,true);
 const verified=await job.independent_verifier.verify();
 assert.equal(verified.independent,true);
 assert.equal(verified.independently_verified,true);
 assert.equal(verified.blocker_class,'MISSING_INSTRUMENT');
 assert.equal(verified.verified,false);
 assert.equal(verified.capability_id,'real-business-helper');
 assert.equal(verified.external_action_performed,false);
 const again=await h.adapters.makeProviderReadback(job)({
  original_work_id:work,capability_id:'real-business-helper',
  source_ref:verified.source_ref,read_only:true,
 });
 assert.deepEqual(again,verified);
 assert.equal(h.calls.length,12);
});
test('settled original work is never restarted as a new capability job',async()=>{
 const done={...source,
  event_id:'99999999-9999-4999-8999-999999999999',
  entity_type:'reality_generic_verified_original_work_outcome',
  payload:{original_work_id:work,original_job_completed:true,
    independent_outcome_verified:true,outcome:'SUCCEEDED'},
 };
 const h=harness({events:[first,source,done]});
 await assert.rejects(h.adapters.loadAuthorizedInternalJob({
  original_work_id:work,owner_id:owner,conversation_id:conversation,read_only:true,
 }),/RELIABILITY_HISTORY_|ORIGINAL_JOB_ALREADY_SETTLED/);
});
test('missing owner source, different actor, or changed goal cannot start investigation',async()=>{
 for(const options of [
  {events:[first]},
  {goal:{...state,state:{...state.state,
   active_goal:{...state.state.active_goal,last_transition_receipt_id:
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}}}},
 ]){
  const h=harness(options);
  await assert.rejects(h.adapters.loadAuthorizedInternalJob({
   original_work_id:work,owner_id:owner,conversation_id:conversation,read_only:true,
  }),/GENUINE_SOURCE_JOB_UNIQUE_OWNER_SOURCE_BACKED_UNFINISHED_JOB_REQUIRED/);
 }
 const h=harness();
 await assert.rejects(h.adapters.loadAuthorizedInternalJob({
  original_work_id:work,owner_id:'attacker',
  conversation_id:conversation,read_only:true,
 }),/GENUINE_SOURCE_JOB_ORIGINAL_OWNER_SCOPE_CHANGED/);
});
test('provider now green cannot be misreported as missing capability',async()=>{
 const h=harness({providerOK:false});
 const job=await h.adapters.loadAuthorizedInternalJob({
  original_work_id:work,owner_id:owner,conversation_id:conversation,read_only:true,
 });
 await assert.rejects(job.independent_verifier.verify(),
  /GENUINE_SOURCE_JOB_ORIGINAL_PROVIDER_RUN_NOT_VERIFIED/);
});

test('already installed current capability must not enqueue stale historical failure',async()=>{
 const h=harness({currentCapabilityPresent:true});
 const job=await h.adapters.loadAuthorizedInternalJob({
  original_work_id:work,owner_id:owner,conversation_id:conversation,read_only:true,
 });
 await assert.rejects(job.independent_verifier.verify(),
  /GENUINE_SOURCE_JOB_CURRENT_PREVIEW_CAPABILITY_ALREADY_PRESENT/);
});
test('altered current frozen acceptance cannot be passed off as original job proof',async()=>{
 const h=harness({currentSuiteChanged:true});
 const job=await h.adapters.loadAuthorizedInternalJob({
  original_work_id:work,owner_id:owner,conversation_id:conversation,read_only:true,
 });
 await assert.rejects(job.independent_verifier.verify(),
  /GENUINE_SOURCE_JOB_CURRENT_PREVIEW_FROZEN_SUITE_CHANGED/);
});
