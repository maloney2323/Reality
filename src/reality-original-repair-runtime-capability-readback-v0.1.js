// Live, READ-ONLY original-job continuation probe.
// Actually exercises the present owner GitHub execution adapter's operation
// admission and independently reads installed Universe capability inventory.
// It never sends a GitHub write, generates a warrant, grants authority, or
// equates creating an issue with repairing the underlying maintenance fault.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine}
 from './reality-continuity-spine-v2.0.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {assertExactMaintainerIssue}
 from './reality-personal-github-execution-bridge-v0.1.js';
import {classifyWorkItemExecutionEffect}
 from './reality-governed-work-runtime-v0.1.js';
export const ORIGINAL_REPAIR_RUNTIME_READBACK_VERSION='reality-original-repair-runtime-capability-readback-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const REPO='maloney2323/Reality';
const REPAIR_OPERATION='repair_underlying_maintenance';
const REPAIR_CONTRACT='PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE';
const fail=code=>{throw Error(code)};
const API='/rest/v1/universe_capabilities?select=capability_id,status,purpose,preconditions,procedure&limit=100';
export async function inspectAuthenticatedOriginalRepairRuntime({
 session,conversationId,workId,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 fetchImpl=fetch,
}={}){
 if(env?.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(workId||'')))
  fail('ORIGINAL_RUNTIME_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ORIGINAL_RUNTIME_OWNER_DB_NOT_VERIFIED');
 const goal=await readGoal({session,conversationId,env});
 if(goal?.principal_id!==session.user_id||
    goal.conversation_id!==conversationId||
    goal.state?.active_goal?.user_confirmed!==true||
    goal.state?.active_goal?.status!=='ACTIVE'||
    goal.state?.active_goal_id!==goal.state.active_goal.goal_id)
  fail('ORIGINAL_RUNTIME_ORIGINAL_OWNER_GOAL_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id});
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.scope.world!==goal.state.world_id)
  fail('ORIGINAL_RUNTIME_ORIGINAL_CONTINUITY_CHANGED');
 const entries=orderContinuityHistory(await createPersistence({...db}).reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
 }));
 const matching=entries.filter(e=>
  e.entity_type==='personal_discovered_work_handoff'&&
  e.payload?.work_id===workId);
 if(matching.length!==1||
    matching[0].payload?.goal_id!==goal.state.active_goal_id||
    matching[0].provenance?.source!=='reality-personal-discovered-work-handoff-v0.1'||
    matching[0].provenance?.principal_id!==session.user_id||
    matching[0].provenance?.conversation_id!==conversationId)
  fail('ORIGINAL_RUNTIME_VERIFIED_ORIGINAL_HANDOFF_REQUIRED');
 const item=matching[0].payload.work_item;
 const sameSource=assertExactMaintainerIssue(item);
 if(sameSource.work_item_id!==workId||
    sameSource.operation!=='create_issue'||
    sameSource.inputs.repository!==REPO)
  fail('ORIGINAL_RUNTIME_ORIGINAL_ACTION_DIFFERENT');
 // The existing original issue may already exist. It is NOT the repair.
 // Ask the actual live adapter to admit a repair operation, without
 // dispatching anything. Failure is a direct local runtime observation.
 const repairItem={...item,operation:REPAIR_OPERATION};
 const classification=classifyWorkItemExecutionEffect(repairItem);
 if(classification.status!=='UNRECOGNIZED_CONNECTOR_OPERATION'||
    classification.consequential!==true)
  fail('ORIGINAL_RUNTIME_REPAIR_OPERATION_CONTRACT_CHANGED');
 let observedFailure=null;
 try{assertExactMaintainerIssue(repairItem)}
 catch(error){observedFailure=String(error?.message||'')}
 if(observedFailure!==REPAIR_CONTRACT)
  fail('ORIGINAL_RUNTIME_BRIDGE_REPAIR_ADMISSION_NOT_REPRODUCED');
 // Separately read the existing durable capability registry. Do not infer
 // completeness if the bounded query is full, malformed, or unavailable.
 const response=await fetchImpl(db.url+API,{
  method:'GET',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   accept:'application/json'},
 });
 if(!response?.ok)
  fail('ORIGINAL_RUNTIME_CAPABILITY_REGISTRY_UNAVAILABLE');
 const capabilities=await response.json().catch(()=>null);
 if(!Array.isArray(capabilities)||capabilities.length>=100||
    capabilities.some(x=>!x||typeof x!=='object'||Array.isArray(x)||
     typeof x.capability_id!=='string'||typeof x.status!=='string'))
  fail('ORIGINAL_RUNTIME_CAPABILITY_INVENTORY_UNVERIFIED');
 // Empty verified inventory + the actual current owner bridge rejecting a
 // repair operation PROVES this execution path lacks a repair capability.
 // A nonempty inventory demands finer capability matching, never a guess.
 if(capabilities.length>0)
  return Object.freeze({
   original_work_id:workId,independently_reobserved:true,
   executor_status:'INVESTIGATION_REQUIRED',
   evidence_ref:'owner-continuity:'+matching[0].event_id,
   source_work_operation:'github:create_issue',
   repair_operation:REPAIR_OPERATION,
   bridge_admission_failure:observedFailure,
   current_registered_capabilities:capabilities.length,
   original_job_completed:false,authorization_granted:false,
   external_action_performed:false,
  });
 return Object.freeze({
  version:ORIGINAL_REPAIR_RUNTIME_READBACK_VERSION,
  original_work_id:workId,independently_reobserved:true,
  executor_status:'MISSING',
  evidence_ref:'owner-continuity:'+matching[0].event_id,
  source_work_operation:'github:create_issue',
  repair_operation:REPAIR_OPERATION,
  bridge_admission_failure:observedFailure,
  current_registered_capabilities:0,
  missing_scope:'EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH',
  owner_repair_execution_authorized:false,
  original_job_completed:false,authorization_granted:false,
  external_action_performed:false,
 });
}
