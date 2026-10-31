// Actual original-work Continuity settlement for ANY owner-scoped work ID.
// No run, sandbox or model claim is sufficient: separately provider-reobserve
// the resumed original task, require an ACTIVE exact-artifact registry receipt,
// append immutable evidence, and independently read it back.
import {createHash} from 'node:crypto';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
const fail=x=>{throw Error('GENERAL_SETTLEMENT_'+x)};
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const SHA64=/^[0-9a-f]{64}$/,WORK=/^work:[a-f0-9]{32}$/;
export function createGenericVerifiedOriginalWorkSettlement({
 session,scope,db,
 createPersistence=createUniversePostgresPersistence,
 verifyOriginalExecution,
}={}){
 if(!db?.strictSecrets||!db?.secretKey||!session?.user_id||
  scope?.owner_id!==session.user_id||!WORK.test(String(scope?.original_work_id||''))||
  scope.target_environment!=='ISOLATED_PREVIEW'||
  !scope.goal_id||!scope.continuity_root_id||!scope.worldline_id||
  typeof verifyOriginalExecution!=='function')
  fail('VERIFIED_PREVIEW_ORIGINAL_SCOPE_REQUIRED');
 const spine=createContinuitySpine({
  continuityRootId:scope.continuity_root_id,
  worldlineId:scope.worldline_id,subjectId:session.user_id});
 const store=createPersistence({...db});
 const history=async()=>orderContinuityHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id}));
 const receiptId=ref=>continuityUuidFromSource(
  'reality:generic:verified:original-outcome:'+session.user_id+':'+
  scope.original_work_id+':'+ref);
 function validate(registration,execution){
  if(registration?.kind!=='CAPABILITY_REGISTERED'||
   registration.verified!==true||registration.status!=='ACTIVE'||
   registration.owner_id!==session.user_id||
   registration.original_work_id!==scope.original_work_id||
   !SHA64.test(String(registration.artifact_hash||''))||
   !/^supabase:universe_capabilities:[0-9a-f-]{36}$/i.test(
    String(registration.registry_receipt_ref||''))||
   execution?.kind!=='ORIGINAL_JOB_RESUMED'||
   execution.original_work_id!==scope.original_work_id||
   execution.owner_id!==session.user_id||
   execution.installed_commit_sha!==registration.installed_commit_sha||
   execution.independent_provider_readback!==true||
   execution.real_execution_observed!==true||
   execution.observed_outcome!=='SUCCEEDED'||
   !/^[a-f0-9]{64}$/.test(String(execution.evidence_hash||''))||
   typeof execution.executor_run_ref!=='string'||
   execution.executor_run_ref.length<12||
   registration.production_changed!==false||
   execution.production_changed!==false)
   fail('DISTINCT_ORIGINAL_PROVIDER_CONSEQUENCES_REQUIRED');
 }
 const payload=(registration,execution)=>({
  version:'reality-general-original-outcome-v1',
  owner_id:session.user_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,
  worldline_id:scope.worldline_id,
  capability_registry_receipt_ref:registration.registry_receipt_ref,
  installed_artifact_hash:registration.artifact_hash,
  installed_commit_sha:registration.installed_commit_sha,
  original_executor_run_ref:execution.executor_run_ref,
  original_execution_evidence_hash:execution.evidence_hash,
  outcome:'SUCCEEDED',independent_outcome_verified:true,
  customer_acceptance_recorded:false,production_changed:false,
 });
 async function verify({registration,execution}={}){
  validate(registration,execution);
  const id=receiptId(execution.executor_run_ref);
  const match=(await history()).filter(e=>e.event_id===id);
  const p=payload(registration,execution);
  return Object.freeze({
   verified:match.length===1&&
    match[0].entity_type==='reality_generic_verified_original_work_outcome'&&
    digest(match[0].payload)===digest(p),
   receipt_id:id,
   settlement_receipt_ref:'supabase:universe_events:'+id,
   evidence_hash:digest(p),
  });
 }
 async function recordAndReadback({registration,execution}={}){
  validate(registration,execution);
  const checked=await verifyOriginalExecution(Object.freeze({
   owner_id:session.user_id,original_work_id:scope.original_work_id,
   goal_id:scope.goal_id,registry_receipt_ref:registration.registry_receipt_ref,
   artifact_hash:registration.artifact_hash,
   installed_commit_sha:registration.installed_commit_sha,
   executor_run_ref:execution.executor_run_ref,
   expected_execution_evidence_hash:execution.evidence_hash,
  }));
  if(checked?.verified!==true||
    checked?.independent_provider_readback!==true||
    checked?.original_work_id!==scope.original_work_id||
    checked?.executor_run_ref!==execution.executor_run_ref||
    checked?.evidence_hash!==execution.evidence_hash||
    checked?.observed_outcome!=='SUCCEEDED')
   fail('INDEPENDENT_ORIGINAL_EXECUTION_READBACK_REQUIRED');
  const id=receiptId(execution.executor_run_ref);
  const before=await history();
  if(before.filter(x=>x.event_id===id).length>1)
   fail('DUPLICATE_OUTCOME_ID_INVALID');
  if(!before.some(x=>x.event_id===id)){
   const tail=before.at(-1);
   if(!tail?.event_id||!tail?.lineage_hash)
    fail('CANONICAL_CONTINUITY_TAIL_REQUIRED');
   const at=new Date().toISOString(),p=payload(registration,execution);
   const node=appendContinuityNode({
    spine,stage:'OBSERVATION',entityId:scope.original_work_id,eventId:id,
    parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
    effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',
    evidenceRefs:[execution.executor_run_ref,registration.registry_receipt_ref],
    payload:p,provenance:{source:'reality-general-original-work-settlement-v1',
     principal_id:session.user_id},
   });
   await store.appendEvent({...node,
    entity_type:'reality_generic_verified_original_work_outcome'});
  }
  const readback=await verify({registration,execution});
  if(!readback.verified)fail('DURABLE_OUTCOME_READBACK_MISMATCH');
  return Object.freeze({
   kind:'ORIGINAL_JOB_SETTLED',
   ...readback,original_work_id:scope.original_work_id,
   independent_outcome_verified:true,
   durable_settlement_readback:true,
   customer_acceptance_recorded:false,production_changed:false,
  });
 }
 return Object.freeze({recordAndReadback,verify});
}
