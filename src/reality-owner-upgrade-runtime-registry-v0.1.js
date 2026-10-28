// Real owner-scoped isolated-extension capability registry, using Reality's
// EXISTING Universe tables and original Continuity. Never equate GitHub CI
// runtime verification with Vercel/production activation or customer work.
// Executable capability is limited to the isolated no-network GitHub runner.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,continuityUuidFromSource,appendContinuityNode,
 validateContinuityChain} from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {verifyOwnerIsolatedExtensionRuntime}
 from './reality-owner-upgrade-isolated-runtime-readback-v0.1.js';
export const OWNER_UPGRADE_RUNTIME_REGISTRY_VERSION='reality-owner-upgrade-runtime-registry-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error(x)};
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):
 Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
async function scopeSource({session,scope,plan,env,readGoal,createPersistence}){
 if(env?.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(scope?.conversationId)||
    !WORK.test(String(scope?.workId||''))||
    scope.ownerId!==session.user_id||
    plan?.owner_id!==session.user_id||
    plan?.conversation_id!==scope.conversationId||
    plan?.original_work_id!==scope.workId||
    plan?.goal_revision!==scope.goalRevision||
    plan?.candidate_sha256!==scope.candidateSha||
    plan?.github_head_sha!==scope.headSha)
  fail('UPGRADE_REGISTRY_EXACT_AUTHENTICATED_SCOPE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_REGISTRY_ISOLATED_OWNER_DB_REQUIRED');
 const goal=await readGoal({session,conversationId:scope.conversationId,env});
 if(goal?.principal_id!==session.user_id||
    goal?.conversation_id!==scope.conversationId||
    goal?.state?.active_goal_id!==plan.original_goal_id||
    goal?.state?.active_goal?.user_confirmed!==true||
    goal?.state?.active_goal?.status!=='ACTIVE'||
    goal?.state?.active_goal?.last_transition_receipt_id!==plan.goal_revision)
  fail('UPGRADE_REGISTRY_FRESH_ORIGINAL_GOAL_MISSING');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id});
 if(spine.continuity_root_id!==plan.continuity_root_id||
    spine.worldline_id!==plan.worldline_id)
  fail('UPGRADE_REGISTRY_ORIGINAL_WORLDLINE_MISMATCH');
 const dbStore=createPersistence({...db});
 const read=async()=>{
  const history=orderContinuityHistory(await dbStore.reconstruct({
   continuityRootId:spine.continuity_root_id,
   worldlineId:spine.worldline_id}));
  const checked=validateContinuityChain(history.map(e=>({...e,
   prior_lineage_hash:e.prior_lineage_hash??
    e.provenance?.continuity_spine?.prior_lineage_hash??null})));
  if(!checked.valid)fail('UPGRADE_REGISTRY_OWNER_CONTINUITY_UNVERIFIED');
  return history;
 };
 return {db,spine,dbStore,read};
}
function projected({plan,scope,installed,runtime}){
 if(runtime?.original_work_id!==scope.workId||
    runtime.owner_id!==scope.ownerId||
    runtime.conversation_id!==scope.conversationId||
    runtime.goal_revision!==scope.goalRevision||
    runtime.candidate_sha256!==scope.candidateSha||
    runtime.head_sha!==scope.headSha||
    runtime.capability_id!==plan.capability_id||
    runtime.merge_commit_sha!==installed.merge_commit_sha||
    runtime.independently_reobserved!==true||
    runtime.isolated_no_network_test_execution_verified!==true||
    runtime.runtime_kind!=='GITHUB_ACTIONS_NO_NETWORK_ISOLATED_EXTENSION_TEST'||
    runtime.runtime_active!==true||
    runtime.registered!==false||
    runtime.production_deployment_performed!==false||
    runtime.original_job_completed!==false||
    !Array.isArray(runtime.post_merge_ci_runs)||runtime.post_merge_ci_runs.length!==2)
  fail('UPGRADE_REGISTRY_INDEPENDENT_ISOLATED_RUN_UNVERIFIED');
 return Object.freeze({
  version:OWNER_UPGRADE_RUNTIME_REGISTRY_VERSION,
  original_work_id:scope.workId,owner_id:scope.ownerId,
  conversation_id:scope.conversationId,goal_revision:scope.goalRevision,
  original_goal_id:plan.original_goal_id,
  continuity_root_id:plan.continuity_root_id,
  worldline_id:plan.worldline_id,
  candidate_sha256:scope.candidateSha,head_sha:scope.headSha,
  capability_id:plan.capability_id,
  merge_commit_sha:installed.merge_commit_sha,
  runtime_kind:'GITHUB_ACTIONS_NO_NETWORK_ISOLATED_EXTENSION_TEST',
  isolated_no_network_test_execution_verified:true,
  post_merge_ci_runs:runtime.post_merge_ci_runs,
  original_job_completed:false,production_deployment_performed:false,
 });
}
function registryParts(payload){
 const id=continuityUuidFromSource('owner-isolated-extension-capability:'+
  payload.original_work_id+':'+payload.candidate_sha256);
 const version='isolated-runtime:'+payload.merge_commit_sha;
 const eventId=continuityUuidFromSource('owner-isolated-extension-registered:'+
  payload.original_work_id+':'+payload.merge_commit_sha);
 const row={
  capability_id:id,capability_version:version,status:'verified',
  purpose:'Exact owner-scoped extension available only in no-network GitHub Actions isolated test runtime',
  preconditions:[{original_work_id:payload.original_work_id,
   owner_id:payload.owner_id,conversation_id:payload.conversation_id,
   goal_revision:payload.goal_revision,
   candidate_sha256:payload.candidate_sha256}],
  procedure:{runtime_kind:payload.runtime_kind,isolated_only:true,
   production_deployed:false,original_job_completed:false,
   source_commit:payload.merge_commit_sha,
   candidate_sha256:payload.candidate_sha256,
   original_work_id:payload.original_work_id,
   capability_id:payload.capability_id},
  failure_modes:[],
  verification_basis:{post_merge_ci_runs:payload.post_merge_ci_runs,
   verified_from:'independent GitHub postmerge push and isolated Docker test job'},
  performance:{},admitted_event_id:eventId,
 };
 return {id,version,eventId,row};
}
function verifiedEvent(e,scope,payload,eventId){
 return e?.event_id===eventId&&
  e?.entity_type==='personal_upgrade_runtime_verified'&&
  e?.epistemic_status==='VERIFIED'&&
  e?.event_kind==='VERIFICATION'&&
  e?.provenance?.source===OWNER_UPGRADE_RUNTIME_REGISTRY_VERSION&&
  e?.provenance?.principal_id===scope.ownerId&&
  e?.provenance?.conversation_id===scope.conversationId&&
  equal(e.payload,payload);
}
function checkedRow(row,expected){
 return row?.capability_id===expected.capability_id&&
  row?.capability_version===expected.capability_version&&
  row?.status==='verified'&&
  row?.admitted_event_id===expected.admitted_event_id&&
  equal(row.preconditions,expected.preconditions)&&
  equal(row.procedure,expected.procedure)&&
  equal(row.verification_basis,expected.verification_basis);
}
async function putCapability({db,row,fetchImpl=fetch}){
 const response=await fetchImpl(db.url+'/rest/v1/universe_capabilities',{
  method:'POST',headers:{apikey:db.secretKey,
   Authorization:'Bearer '+db.secretKey,
   'Content-Type':'application/json',Prefer:'return=minimal'},
  body:JSON.stringify(row),
 });
 if(!response?.ok)fail('UPGRADE_REGISTRY_CAPABILITY_DATABASE_INSERT_UNCONFIRMED');
}
export async function registerOwnerIsolatedUpgradeCapability({
 session,scope,plan,installed,env=process.env,
 verifyRuntime=verifyOwnerIsolatedExtensionRuntime,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 capabilityWrite=putCapability,
}={}){
 const ctx=await scopeSource({session,scope,plan,env,readGoal,createPersistence});
 const runtime=await verifyRuntime({session,scope,plan,installed,env});
 const payload=projected({plan,scope,installed,runtime});
 const {id,version,eventId,row}=registryParts(payload);
 const history=await ctx.read();
 const matching=history.filter(e=>e.entity_type==='personal_upgrade_runtime_verified'&&
   e.payload?.original_work_id===scope.workId);
 if(matching.length>1||matching.length===1&&
    !verifiedEvent(matching[0],scope,payload,eventId))
  fail('UPGRADE_REGISTRY_CONFLICTING_PREVIOUS_ACTIVATION');
 if(!matching.length){
  if(!history.some(e=>e.entity_type==='personal_upgrade_draft_pr_verified'&&
      e.payload?.original_work_id===scope.workId&&
      e.payload?.candidate_sha256===scope.candidateSha&&
      e.payload?.github_commit_sha===scope.headSha))
   fail('UPGRADE_REGISTRY_SIGNED_OWNER_DRAFT_LINEAGE_REQUIRED');
  const last=history.at(-1);
  if(!last?.event_id||!last.lineage_hash)
   fail('UPGRADE_REGISTRY_OWNER_CONTINUITY_TAIL_UNVERIFIED');
  const now=new Date().toISOString();
  const node=appendContinuityNode({
   spine:ctx.spine,stage:'VERIFICATION',
   entityId:scope.workId,eventId,
   parentEventId:last.event_id,priorLineageHash:last.lineage_hash,
   assertionTime:now,effectiveTime:now,epistemicStatus:'VERIFIED',
   payload,evidenceRefs:runtime.post_merge_ci_runs.map(x=>x.run_url),
   provenance:{source:OWNER_UPGRADE_RUNTIME_REGISTRY_VERSION,
    principal_id:session.user_id,conversation_id:scope.conversationId}});
  await ctx.dbStore.appendEvent({...node,entity_type:'personal_upgrade_runtime_verified'});
 }
 const after=await ctx.read();
 const saved=after.filter(e=>e.event_id===eventId);
 if(saved.length!==1||!verifiedEvent(saved[0],scope,payload,eventId))
  fail('UPGRADE_REGISTRY_EVENT_NOT_DURABLY_REOBSERVED');
 const existing=await ctx.dbStore.getCapability(id,version);
 if(existing&&!checkedRow(existing,row))
  fail('UPGRADE_REGISTRY_CAPABILITY_CONFLICT');
 if(!existing)await capabilityWrite({db:ctx.db,row});
 const observed=await ctx.dbStore.getCapability(id,version);
 if(!checkedRow(observed,row))
  fail('UPGRADE_REGISTRY_DB_READBACK_UNVERIFIED');
 return Object.freeze({...payload,
  registered:true,runtime_active:true,
  isolated_only:true,independently_reobserved:true,
  admitted_event_id:eventId,capability_record_id:id,
  customer_application_runtime_active:false});
}
export async function readOwnerIsolatedUpgradeCapability({
 session,scope,plan,installed,env=process.env,
 verifyRuntime=verifyOwnerIsolatedExtensionRuntime,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 const ctx=await scopeSource({session,scope,plan,env,readGoal,createPersistence});
 const runtime=await verifyRuntime({session,scope,plan,installed,env});
 const payload=projected({plan,scope,installed,runtime});
 const {id,version,eventId,row}=registryParts(payload);
 const history=await ctx.read();
 const matched=history.filter(e=>e.event_id===eventId);
 if(matched.length!==1||!verifiedEvent(matched[0],scope,payload,eventId))
  fail('UPGRADE_REGISTRY_OWNER_VERIFIED_ACTIVATION_MISSING');
 const record=await ctx.dbStore.getCapability(id,version);
 if(!checkedRow(record,row))
  fail('UPGRADE_REGISTRY_ISOLATED_CAPABILITY_NOT_REOBSERVED');
 return Object.freeze({...payload,
  registered:true,runtime_active:true,
  isolated_only:true,independently_reobserved:true,
  admitted_event_id:eventId,capability_record_id:id,
  customer_application_runtime_active:false});
}
