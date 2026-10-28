import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {registerOwnerIsolatedUpgradeCapability,readOwnerIsolatedUpgradeCapability}
 from '../src/reality-owner-upgrade-runtime-registry-v0.1.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-only-not-real-secret',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project};
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'7'.repeat(32);
const session={user_id:owner,config:{url}};
const home=personalGoalScope({userId:owner,conversationId});
const spine=createContinuitySpine({continuityRootId:home.root,worldlineId:home.worldline,subjectId:owner});
const goalId='goal:original',goalRev=randomUUID();
const candidate='3'.repeat(64),head='4'.repeat(40),merge='5'.repeat(40);
const scope={ownerId:owner,conversationId,workId,goalRevision:goalRev,
 candidateSha:candidate,headSha:head,pinnedBaseSha:'6'.repeat(40)};
const plan={owner_id:owner,conversation_id:conversationId,original_work_id:workId,
 original_goal_id:goalId,goal_revision:goalRev,
 continuity_root_id:spine.continuity_root_id,worldline_id:spine.worldline_id,
 candidate_sha256:candidate,github_head_sha:head,capability_id:'extension:test'};
const installed={independent:true,installed:true,original_work_id:workId,
 candidate_sha256:candidate,head_sha:head,base_ref:'experiment/reality-live-durable-adversarial-20261025',
 merge_commit_sha:merge,production_deployment_performed:false,
 exact_candidate_files_verified:true};
const ci=[{run_id:151,run_url:'https://github.com/maloney2323/Reality/actions/runs/151',
 workflow_name:'Governed Autonomous Self-Upgrading Provider v0.1',merge_commit_sha:merge},
 {run_id:152,run_url:'https://github.com/maloney2323/Reality/actions/runs/152',
 workflow_name:'Reality Governed Execution Engine v0.1',merge_commit_sha:merge}];
function mock(){
 const history=[],caps=new Map(),at='2026-10-28T12:00:00.000Z';
 const add=(stage,entityType,payload)=>{
  const last=history.at(-1);
  const e=appendContinuityNode({spine,stage,entityId:workId,eventId:randomUUID(),
   parentEventId:last?.event_id||null,priorLineageHash:last?.lineage_hash||null,
   effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',payload,evidenceRefs:[]});
  const stored={...e,entity_type:entityType,
   provenance:{...e.provenance,continuity_spine:{
    prior_lineage_hash:e.prior_lineage_hash,
    transformation_receipt_id:e.transformation_receipt_id}}};
  history.push(stored);return stored;
 };
 add('RAW_SIGNAL','initial_user_goal',{goal_id:goalId});
 add('WORK','personal_upgrade_draft_pr_verified',{original_work_id:workId,
  candidate_sha256:candidate,github_commit_sha:head});
 const state={eventWrites:0,capWrites:0};
 const createPersistence=()=>({
  reconstruct:async()=>[...history],
  appendEvent:async e=>{
   state.eventWrites++;
   history.push({...e,entity_type:e.entity_type,
    provenance:{...e.provenance,continuity_spine:{
     prior_lineage_hash:e.prior_lineage_hash,
     transformation_receipt_id:e.transformation_receipt_id}}});
   return {status:'PERSISTED'};},
  getCapability:async(id,version)=>caps.get(id+'|'+version)||null,
 });
 const readGoal=async()=>({principal_id:owner,conversation_id:conversationId,
  scope:home,state:{active_goal_id:goalId,
   active_goal:{goal_id:goalId,user_confirmed:true,status:'ACTIVE',
    last_transition_receipt_id:goalRev}}});
 const verifyRuntime=async()=>({owner_id:owner,conversation_id:conversationId,
  original_work_id:workId,goal_revision:goalRev,candidate_sha256:candidate,
  head_sha:head,capability_id:plan.capability_id,merge_commit_sha:merge,
  independently_reobserved:true,isolated_no_network_test_execution_verified:true,
  runtime_kind:'GITHUB_ACTIONS_NO_NETWORK_ISOLATED_EXTENSION_TEST',
  runtime_active:true,registered:false,original_job_completed:false,
  production_deployment_performed:false,post_merge_ci_runs:ci});
 const capabilityWrite=async({row})=>{
  state.capWrites++;caps.set(row.capability_id+'|'+row.capability_version,{...row});
 };
 return {args:{session,scope,plan,installed,env,readGoal,createPersistence,
  verifyRuntime,capabilityWrite},state,caps,history};
}
test('real owner Continuity and existing Universe capabilities are registered and independently reread',async()=>{
 const x=mock();
 const a=await registerOwnerIsolatedUpgradeCapability(x.args);
 assert.equal(a.registered,true);
 assert.equal(a.runtime_active,true);
 assert.equal(a.isolated_only,true);
 assert.equal(a.customer_application_runtime_active,false);
 assert.equal(a.original_job_completed,false);
 assert.equal(x.state.eventWrites,1);
 assert.equal(x.state.capWrites,1);
 assert.equal(x.history.at(-1).parent_event_id,x.history.at(-2).event_id);
 const reloaded=await readOwnerIsolatedUpgradeCapability(x.args);
 assert.equal(reloaded.capability_record_id,a.capability_record_id);
 assert.equal(reloaded.independently_reobserved,true);
 const replay=await registerOwnerIsolatedUpgradeCapability(x.args);
 assert.equal(replay.registered,true);
 assert.equal(x.state.eventWrites,1);
 assert.equal(x.state.capWrites,1);
});
test('an unverified runtime observation does not append or register anything',async()=>{
 for(const mutate of [
  r=>({...r,independently_reobserved:false}),
  r=>({...r,isolated_no_network_test_execution_verified:false}),
  r=>({...r,runtime_kind:'VERCEL_PRODUCTION'}),
  r=>({...r,merge_commit_sha:'a'.repeat(40)}),
  r=>({...r,original_job_completed:true}),
  r=>({...r,post_merge_ci_runs:[]}),
 ]){
  const x=mock(),v=x.args.verifyRuntime;
  await assert.rejects(registerOwnerIsolatedUpgradeCapability({
   ...x.args,verifyRuntime:async()=>mutate(await v())}),
   /UPGRADE_REGISTRY_INDEPENDENT_ISOLATED_RUN_UNVERIFIED/);
  assert.equal(x.state.eventWrites,0);
  assert.equal(x.state.capWrites,0);
 }
});
test('without a source-linked owner draft, registration is blocked',async()=>{
 const x=mock();x.history.pop();
 await assert.rejects(registerOwnerIsolatedUpgradeCapability(x.args),
  /UPGRADE_REGISTRY_SIGNED_OWNER_DRAFT_LINEAGE_REQUIRED/);
 assert.equal(x.state.capWrites,0);
});
test('provider DB failure after owner append is unresolved and never reported active',async()=>{
 const x=mock();
 await assert.rejects(registerOwnerIsolatedUpgradeCapability({
  ...x.args,capabilityWrite:async()=>{throw Error('NETWORK_UNKNOWN')}}),
  /NETWORK_UNKNOWN/);
 assert.equal(x.state.eventWrites,1);
 assert.equal(x.state.capWrites,0);
 await assert.rejects(readOwnerIsolatedUpgradeCapability(x.args),
  /UPGRADE_REGISTRY_ISOLATED_CAPABILITY_NOT_REOBSERVED/);
});
test('torn or altered registry readback does not count as runtime active',async()=>{
 const x=mock();const r=await registerOwnerIsolatedUpgradeCapability(x.args);
 for(const value of x.caps.values())value.procedure.source_commit='b'.repeat(40);
 await assert.rejects(readOwnerIsolatedUpgradeCapability(x.args),
  /UPGRADE_REGISTRY_ISOLATED_CAPABILITY_NOT_REOBSERVED/);
 assert.equal(r.customer_application_runtime_active,false);
});
