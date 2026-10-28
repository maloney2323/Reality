import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope}
 from '../src/reality-personal-goal-readback-v0.1.js';
import {inspectAuthenticatedOriginalRepairRuntime}
 from '../src/reality-original-repair-runtime-capability-readback-v0.1.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-only-scoped-secret',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project};
const user=randomUUID(),conversationId=randomUUID(),goalId='user-goal:test-real';
const workId='work:24cda9611404e9bcb47909976067605c';
const session={user_id:user,config:{url}};
const scope=personalGoalScope({userId:user,conversationId});
const spine=createContinuitySpine({
 continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:user});
const item={work_item_id:workId,workflow_id:'workflow:'+workId,
 connector:'github',operation:'create_issue',consequential:true,
 inputs:{repository:'maloney2323/Reality',
 title:'Reality recurring work: repair repeated workflow failures',
 body:'<!-- Reality recurring work -->\n### Evidence\n- CI failures\n### Required work\nRepair the cause',
 }};
function harness(capabilities=[]){
 const at='2026-10-28T13:50:00.000Z',events=[];
 function add(type,payload,stage='OBSERVATION',epistemic='OBSERVED',provenance={}){
  const tail=events.at(-1);
  const n=appendContinuityNode({spine,stage,entityId:workId,eventId:randomUUID(),
   parentEventId:tail?.event_id||null,
   priorLineageHash:tail?.lineage_hash||null,
   assertionTime:at,effectiveTime:at,epistemicStatus:epistemic,
   evidenceRefs:[],payload,provenance});
  events.push({...n,entity_type:type,provenance:{
   ...n.provenance,continuity_spine:{
    prior_lineage_hash:n.prior_lineage_hash,
    transformation_receipt_id:n.transformation_receipt_id,
   },
  }});
 }
 add('original_goal',{goal_id:goalId},'RAW_SIGNAL');
 add('personal_discovered_work_handoff',{
  work_id:workId,goal_id:goalId,work_item:structuredClone(item),
 },'OBSERVATION','OBSERVED',{
  source:'reality-personal-discovered-work-handoff-v0.1',
  principal_id:user,conversation_id:conversationId});
 const grounded={principal_id:user,conversation_id:conversationId,scope,
  state:{world_id:scope.world,continuity_root_id:spine.continuity_root_id,
   active_goal_id:goalId,
   active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true}}};
 const requests=[];
 const args={session,conversationId,workId,env,
  readGoal:async()=>grounded,
  createPersistence:()=>({reconstruct:async()=>events}),
  fetchImpl:async(uri,init)=>{
   requests.push({uri,init});
   return {ok:true,json:async()=>capabilities};
  },
 };
 return {args,events,requests};
}
test('real current owner Github adapter rejects underlying repair and registry independently confirms no available registered executable capability',async()=>{
 const h=harness();
 const r=await inspectAuthenticatedOriginalRepairRuntime(h.args);
 assert.equal(r.executor_status,'MISSING');
 assert.equal(r.missing_scope,'EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH');
 assert.equal(r.bridge_admission_failure,'PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE');
 assert.equal(r.current_registered_capabilities,0);
 assert.equal(r.source_work_operation,'github:create_issue');
 assert.equal(r.repair_operation,'repair_underlying_maintenance');
 assert.equal(r.original_work_id,workId);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.owner_repair_execution_authorized,false);
 assert.equal(r.external_action_performed,false);
 assert.equal(h.requests.length,1);
 assert.equal(h.requests[0].init.method,'GET');
 assert.match(h.requests[0].uri,/\/rest\/v1\/universe_capabilities\?/);
});
test('existing capabilities prevent unsupported global inference of missing original executor',async()=>{
 const h=harness([{capability_id:randomUUID(),status:'ACTIVE',
  purpose:'repair runner',preconditions:{},procedure:{}}]);
 const r=await inspectAuthenticatedOriginalRepairRuntime(h.args);
 assert.equal(r.executor_status,'INVESTIGATION_REQUIRED');
 assert.equal(r.current_registered_capabilities,1);
 assert.equal(r.external_action_performed,false);
});
test('foreign or changed signed-in source never triggers the diagnosis',async()=>{
 for(const mutate of [
  h=>{h.events[1].payload.work_item.operation='repair_underlying_maintenance'},
  h=>{h.events[1].provenance.principal_id=randomUUID()},
  h=>{h.events[1].payload.goal_id='other-goal'},
 ]){
  const h=harness();mutate(h);
  await assert.rejects(inspectAuthenticatedOriginalRepairRuntime(h.args),
   /ORIGINAL_RUNTIME_|RELIABILITY_HISTORY_/);
  assert.equal(h.requests.length,0);
 }
});
test('unavailable or full registry never becomes a confirmed missing capability',async()=>{
 const h=harness();
 h.args.fetchImpl=async()=>({ok:false,status:403});
 await assert.rejects(inspectAuthenticatedOriginalRepairRuntime(h.args),
  /ORIGINAL_RUNTIME_CAPABILITY_REGISTRY_UNAVAILABLE/);
 const k=harness();
 k.args.fetchImpl=async()=>({ok:true,json:async()=>Array.from({length:100},
  ()=>({capability_id:randomUUID(),status:'ACTIVE'}))});
 await assert.rejects(inspectAuthenticatedOriginalRepairRuntime(k.args),
  /ORIGINAL_RUNTIME_CAPABILITY_INVENTORY_UNVERIFIED/);
});
test('server-only scoped read cannot execute with unverified account or deployment',async()=>{
 const h=harness();
 await assert.rejects(inspectAuthenticatedOriginalRepairRuntime({
  ...h.args,session:{user_id:randomUUID(),config:{url}},
 }),/ORIGINAL_RUNTIME_ORIGINAL_OWNER_GOAL_CHANGED/);
 await assert.rejects(inspectAuthenticatedOriginalRepairRuntime({
  ...h.args,env:{...env,VERCEL_ENV:'production'},
 }),/ORIGINAL_RUNTIME_AUTHENTICATED_PREVIEW_REQUIRED/);
 assert.equal(h.requests.length,0);
});
test('signed-in 3/7 recovery reuses genuine runtime readback rather than an empty no-gap projection',async()=>{
 const {inspectAuthenticatedOriginalJobRecoveryLoop}=
  await import('../src/reality-real-recovery-coordinator-v0.1.js');
 const h=harness(),live={
  original_work_id:workId,
  recovery_receipt_id:randomUUID(),
  original_job_completed:false,external_action_performed:false,
  execution_authorized:false,
  status:'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED',
  later_success:{run_url:'https://github.com/maloney2323/Reality/actions/runs/40605639502'},
  historical_run_urls:['https://github.com/maloney2323/Reality/actions/runs/40591283500'],
 };
 const report=await inspectAuthenticatedOriginalJobRecoveryLoop({
  session,conversationId,workId,env,
  inspectEvidence:async()=>live,
  readGoal:h.args.readGoal,
  inspectRuntime:async p=>inspectAuthenticatedOriginalRepairRuntime(h.args),
 });
 assert.equal(report.completed_stages,3);
 assert.equal(report.continuation_probe.state,
  'CAPABILITY_GAP_CANDIDATE_NEEDS_SANDBOX_VERIFICATION');
 assert.equal(report.continuation_probe.original_work_id,workId);
 assert.equal(report.continuation_probe.authorization_granted,false);
 assert.equal(report.original_job_completed,false);
 assert.equal(h.requests.length,1);
});
