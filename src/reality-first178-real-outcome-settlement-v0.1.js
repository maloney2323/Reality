// Distinct original-work outcome observation. A passing test or model claim
// cannot create this receipt: it requires independent original execution plus
// an active, owner-approved capability registry record.
import {createHash} from 'node:crypto';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
const fail=x=>{throw Error('FIRST178_REAL_SETTLEMENT_'+x)};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
export function createOriginal178VerifiedSettlement({
 session,scope,db,createPersistence=createUniversePostgresPersistence,
}={}){
 if(!db?.strictSecrets||!db.secretKey||
  !session?.user_id||scope?.owner_id!==session.user_id||
  scope.original_work_id!==WORK||
  scope.target_environment!=='ISOLATED_PREVIEW'||
  !scope.continuity_root_id||!scope.worldline_id)
  fail('AUTHENTICATED_PREVIEW_ORIGINAL_SCOPE_REQUIRED');
 const spine=createContinuitySpine({
  continuityRootId:scope.continuity_root_id,
  worldlineId:scope.worldline_id,subjectId:session.user_id});
 const store=createPersistence({...db});
 const read=()=>store.reconstruct({continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id});
 const receiptId=ref=>continuityUuidFromSource(
  'first178:independent-original-outcome:'+session.user_id+':'+WORK+':'+ref);
 const expected=({registration,execution})=>({
  version:'reality-first178-independent-outcome-v1',
  original_work_id:WORK,owner_id:session.user_id,
  goal_id:scope.goal_id,worldline_id:scope.worldline_id,
  original_provider_run_id:execution.provider_run_id,
  original_provider_job_id:execution.provider_job_id,
  original_provider_evidence_hash:execution.evidence_hash,
  original_provider_receipt_ref:execution.executor_run_ref,
  pinned_original_run_id:40962921090,
  capability_registry_receipt_ref:registration.registry_receipt_ref,
  installed_artifact_hash:registration.artifact_hash,
  classification_verified:'MISSING_CAPABILITY',
  customer_acceptance_recorded:false,
  production_changed:false,
 });
 const validate=({registration,execution})=>{
  if(registration?.verified!==true||registration.status!=='ACTIVE'||
   registration.original_work_id!==WORK||
   !/^supabase:universe_capabilities:[0-9a-f-]{36}$/i.test(
    registration.registry_receipt_ref||'')||
   execution?.verified!==true||execution.original_work_id!==WORK||
   !/^github:actions:run:[0-9]+:job:[0-9]+$/.test(execution.executor_run_ref||'')||
   execution.pinned_failure_run_id!==40962921090||
   !/^[a-f0-9]{64}$/.test(execution.evidence_hash||'')||
   registration.production_changed!==false||
   execution.production_changed!==false)
   fail('DISTINCT_ACTUAL_PROVIDER_CONSEQUENCES_REQUIRED');
 };
 const verify=async({registration,execution}={})=>{
  validate({registration,execution});
  const id=receiptId(execution.executor_run_ref);
  const payload=expected({registration,execution});
  const history=orderContinuityHistory(await read());
  const events=history.filter(x=>x.event_id===id);
  const event=events.length===1?events[0]:null;
  return Object.freeze({
   verified:Boolean(event&&
    event.entity_type==='personal_first_178_verified_original_outcome'&&
    hash(event.payload)===hash(payload)&&
    event.payload?.original_provider_receipt_ref===execution.executor_run_ref&&
    event.payload?.capability_registry_receipt_ref===registration.registry_receipt_ref),
   receipt_id:id,settlement_receipt_ref:'supabase:universe_events:'+id,
   evidence_hash:hash(payload)});
 };
 const recordAndReadback=async({registration,execution}={})=>{
  validate({registration,execution});
  const id=receiptId(execution.executor_run_ref);
  const before=orderContinuityHistory(await read());
  const existing=before.filter(e=>e.event_id===id);
  if(existing.length>1)fail('DUPLICATED_OUTCOME_RECEIPT');
  const payload=expected({registration,execution});
  if(!existing.length){
   const tail=before.at(-1);
   if(!tail?.event_id||!tail?.lineage_hash)
    fail('CONTINUITY_PROVENANCE_TAIL_MISSING');
   const at=new Date().toISOString();
   const node=appendContinuityNode({
    spine,stage:'OBSERVATION',entityId:WORK,eventId:id,
    parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
    effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',
    evidenceRefs:[execution.executor_run_ref,registration.registry_receipt_ref],
    payload,provenance:{source:'reality-first178-independent-provider-outcome-v1',
     principal_id:session.user_id},
   });
   await store.appendEvent({...node,
    entity_type:'personal_first_178_verified_original_outcome'});
  }
  const verified=await verify({registration,execution});
  if(!verified.verified)fail('INDEPENDENT_OUTCOME_READBACK_MISMATCH');
  return Object.freeze({...verified,original_work_id:WORK,
   independent_outcome_verified:true,durable_settlement_readback:true,
   customer_acceptance_recorded:false,
   production_changed:false});
 };
 return Object.freeze({recordAndReadback,verify});
}
