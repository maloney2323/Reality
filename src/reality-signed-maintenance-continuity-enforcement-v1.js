// Exact signed maintenance -> EXISTING immutable Continuity Spine.
// NOT a new ledger, classifier, installer, approval service or job.
// The verified owner shift and target are checked again from the service RPC.
// A classifier label / Chat message / worker pulse never grants installation.
// Every new stage is hash-linked, written, independently reconstructed, and
// verified BEFORE it can authorize progression to an existing governed adapter.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {createContinuitySpine,appendContinuityNode,advanceSpine}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';

const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const GIT=/^[a-f0-9]{40}$/;
const safe=(status,extra={})=>Object.freeze({
 status,continuity_committed:false,
 next_authorized_action:'NO_NEW_AUTHORITY',
 install_eligible_from_continuity:false,
 installer_reconcile_only_from_continuity:false,
 original_job_completed:false,new_shift_started:false,
 production_changed:false,...extra
});
const bad=code=>{throw Error('SIGNED_CONTINUITY_'+code)};
const rootSource=({ownerId,shiftId})=>
 'reality:owner:'+ownerId+':existing-signed-shift:'+shiftId;

export async function enforceSignedMaintenanceReceiptContinuity({
 db,env=process.env,originalGate,shiftId,fetchImpl=fetch,
 call=shiftRpc,persistenceFactory=createUniversePostgresPersistence,
 now=()=>new Date().toISOString(),
}={}){
 const ownerId=originalGate?.owner_id;
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !db?.strictSecrets||!UUID.test(shiftId||'')||!UUID.test(ownerId||'')||
  originalGate?.status!=='EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'||
  originalGate.shift_id!==shiftId||originalGate.read_only!==true||
  originalGate.warrant_mode!=='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'||
  originalGate.installation_authorized!==false||
  originalGate.original_job_completed!==false||
  originalGate.production_changed!==false)
  return safe('SIGNED_CONTINUITY_SIGNED_PREVIEW_OWNER_WARRANT_REQUIRED');

 const card=await call(db,'reality_read_owner_signed_maintenance_install_decision_v1',{
  p_owner_id:ownerId
 },{fetchImpl});
 if(card?.status==='NO_EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_READY')
  return safe('SIGNED_CONTINUITY_NO_EXACT_VERIFIED_TARGET');
 if(!['EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY',
       'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED'].includes(card?.status)||
  card.owner_id!==ownerId||card.shift_id!==shiftId||
  !UUID.test(card.maintenance_id||'')||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(card.source_ref||'')||
  !HASH.test(card.target_review_receipt_sha256||'')||
  !HASH.test(card.artifact_receipt_sha256||'')||
  !HASH.test(card.case_ci_receipt_sha256||'')||
  !GIT.test(card.candidate_commit_sha||'')||
  !GIT.test(card.candidate_source_blob_sha||'')||
  !GIT.test(card.target_head_sha||'')||
  !GIT.test(card.expected_old_blob_sha||'')||
  card.target_branch!=='reality/chat-direct-work-handoff-20261115'||
  card.target_path!=='src/reality-qualified-source-requalification-v1.js'||
  card.original_job_completed!==false||card.production_changed!==false||
  card.new_shift_started!==false)
  bad('INDEPENDENT_OWNER_TARGET_SCOPE_UNVERIFIED');

 const decided=card.status==='EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED';
 if(decided?(
   !['APPROVED','FENCED','INSTALLED','VERIFIED'].includes(card.decision_state)||
   !UUID.test(card.approval_id||'')||!HASH.test(card.approval_receipt_sha256||'')||
   card.installation_authorized!==true||card.owner_approval_ready!==false
  ):(
   card.decision_state!==null||card.approval_id!==null||
   card.approval_receipt_sha256!==null||
   card.installation_authorized!==false||card.owner_approval_ready!==true||
   card.repair_installed!==false))
  bad('OWNER_APPROVAL_AND_SOURCE_AUTHORITY_CONTRADICT');

 const spineSource=rootSource({ownerId,shiftId});
 const baseSpine=createContinuitySpine({
  continuityRootId:spineSource,
  worldlineId:'reality:signed-maintenance:existing-shift',
  subjectId:ownerId
 });
 const store=persistenceFactory({
  url:db.url,secretKey:db.secretKey,
  strictSecrets:true,fetchImpl
 });
 const read=async()=> {
  const events=await store.reconstruct({
   continuityRootId:baseSpine.continuity_root_id,
   worldlineId:baseSpine.worldline_id
  });
  return orderContinuityHistory(events);
 };
 let history=await read();
 if(history.some(e=>e.continuity_root_id!==baseSpine.continuity_root_id||
  e.worldline_id!==baseSpine.worldline_id))
  bad('DURABLE_UNIVERSE_CONTINUITY_SCOPE_DRIFT');
 let spine=history.length?Object.freeze({
  ...baseSpine,last_event_id:history.at(-1).event_id,
  last_lineage_hash:history.at(-1).lineage_hash,
  current_stage:history.at(-1).event_kind
 }):baseSpine;
 let newlyRecorded=0;
 async function commit({stage,step,receipt,refs,payload}){
  if(!HASH.test(receipt))bad('TRANSITION_EVIDENCE_RECEIPT_REQUIRED');
  // A verified repair can remain unchanged while the independently read
  // original obligation advances. Preserve the old event, and bind each
  // return observation to the exact work, source and authorized next step.
  // Existing matching receipts remain idempotent, including legacy IDs.
  const isOriginalReturn=step==='NEXT_SIGNED_ORIGINAL_OBLIGATION_RECONCILED';
  const matchesOriginalReturn=e=>!isOriginalReturn||(
    e.payload?.original_work_id===payload.original_work_id&&
    e.payload?.original_source_ref===payload.original_source_ref&&
    e.payload?.next_required_action===payload.next_required_action);
  const identity=card.maintenance_id+':'+step+(isOriginalReturn?
    ':'+JSON.stringify([payload.original_work_id,payload.original_source_ref,
      payload.next_required_action]):'');
  const previous=history.filter(e=>e.payload?.signed_maintenance_step===step&&
    e.payload?.maintenance_id===card.maintenance_id&&matchesOriginalReturn(e));
  if(previous.length>1)bad('DUPLICATE_MILESTONE_IN_CANONICAL_LEDGER');
  if(previous.length){
   const old=previous[0];
   if(old.payload?.receipt_sha256!==receipt||
    old.payload?.owner_id!==ownerId||
    old.payload?.shift_id!==shiftId||
    old.payload?.candidate_commit_sha!==card.candidate_commit_sha||
    old.payload?.target_review_receipt_sha256!==card.target_review_receipt_sha256||
    old.event_kind!==stage)
    bad('TRANSITION_EVIDENCE_CHANGED_AFTER_COMMIT');
   return old;
  }
  const attestedAt=now();
  const node=appendContinuityNode({
   spine,stage,
   entityId:'maintenance:'+identity,
   eventId:'reality:signed-maintenance:'+shiftId+':'+identity+':'+receipt,
   parentEventId:spine.last_event_id,priorLineageHash:spine.last_lineage_hash,
   evidenceRefs:refs,epistemicStatus:'VERIFIED',
   effectiveTime:attestedAt,assertionTime:attestedAt,
   payload:Object.freeze({
    contract:'signed-maintenance-continuity-enforcement-v1',
    signed_maintenance_step:step,
    receipt_sha256:receipt,maintenance_id:card.maintenance_id,
    owner_id:ownerId,shift_id:shiftId,
    candidate_commit_sha:card.candidate_commit_sha,
    target_review_receipt_sha256:card.target_review_receipt_sha256,
    original_job_completed:false,production_changed:false,
    new_shift_started:false,...payload
   }),
   provenance:{
    source:'independently_read_owner_maintenance_rpc',
    authoritative_source:'service_role_existing_signed_shift',
    original_work_scope:'EXACT_ALREADY_SIGNED_WARRANT',
    classifier_grants_authority:false
   }
  });
  await store.appendEvent(node);
  history=await read();
  const admitted=history.find(x=>x.event_id===node.event_id);
  if(!admitted||admitted.lineage_hash!==node.lineage_hash||
   admitted.payload?.receipt_sha256!==receipt)
   bad('DURABLE_CONTINUITY_WRITE_READBACK_NOT_VERIFIED');
  spine=advanceSpine(spine,node);
  newlyRecorded++;
  return admitted;
 }
 // Worker event is evidence of the original owner-signed shift, not a
 // fabricated customer message or a new authorization.
 if(!history.length){
  const initialAt=now();
  const genesis=appendContinuityNode({
   spine,stage:'RAW_SIGNAL',
   entityId:'existing-shift:'+shiftId,
   eventId:'reality:signed-maintenance:'+shiftId+':signed-warrant-source',
   epistemicStatus:'OBSERVED',
   effectiveTime:initialAt,assertionTime:initialAt,
   payload:{
    contract:'signed-maintenance-continuity-enforcement-v1',
    source_kind:'EXISTING_AUTHORIZED_SHIFT_SERVICE_READBACK',
    owner_id:ownerId,shift_id:shiftId,
    source_ref:card.source_ref,
    // No approval, installation or business settlement follows from this.
    execution_authorized_by_signal:false,
    installation_authorized_by_signal:false,
    original_job_completed:false,new_shift_started:false
   },
   provenance:{
    source:'existing_owner_signed_shift_service_readback',
    classifier_grants_authority:false
   }
  });
  await store.appendEvent(genesis);
  history=await read();
  if(history.length!==1||history[0]?.event_id!==genesis.event_id||
   history[0]?.lineage_hash!==genesis.lineage_hash)
   bad('SIGNED_WARRANT_GENESIS_NOT_INDEPENDENTLY_RECONSTRUCTED');
  spine=advanceSpine(spine,genesis);
  newlyRecorded++;
 }
 const target=await commit({
  stage:'VERIFICATION',step:'INDEPENDENT_INSTALL_TARGET_REVIEW',
  receipt:card.target_review_receipt_sha256,
  refs:[card.artifact_receipt_sha256,card.case_ci_receipt_sha256,
        card.target_review_receipt_sha256],
  payload:{
   verified_fact:'EXACT_TESTED_REPAIR_TARGET_INDEPENDENTLY_REVIEWED',
   target_branch:card.target_branch,target_path:card.target_path,
   target_head_sha:card.target_head_sha,
   candidate_source_blob_sha:card.candidate_source_blob_sha,
   next_required_action:'OWNER_EXACT_ONE_USE_INSTALL_APPROVAL'
  }
 });
 if(!decided)return safe('CONTINUITY_VERIFIED_TARGET_AWAITING_OWNER_CLICK',{
  continuity_committed:true,
  continuity_root_id:spine.continuity_root_id,
  latest_event_id:target.event_id,
  newly_recorded_events:newlyRecorded,
  next_authorized_action:'AWAIT_EXACT_OWNER_APPROVAL'
 });
 const authority=await commit({
  stage:'AUTHORITY',step:'OWNER_EXACT_APPROVAL',
  receipt:card.approval_receipt_sha256,
  refs:[card.target_review_receipt_sha256,card.approval_receipt_sha256],
  payload:{
   verified_fact:'EXACT_ONE_USE_OWNER_INSTALL_APPROVAL_IN_EXISTING_LEDGER',
   approval_id:card.approval_id,
   install_scope:'ISOLATED_PREVIEW_EXACT_SOURCE_ONLY',
   target_branch:card.target_branch,target_path:card.target_path,
   next_required_action:'EXISTING_GOVERNED_INSTALLER_ONLY'
  }
 });
 const approved=history.some(e=>
  e.event_id===authority.event_id&&
  e.payload?.signed_maintenance_step==='OWNER_EXACT_APPROVAL'&&
  e.payload?.receipt_sha256===card.approval_receipt_sha256);
 if(!approved)bad('APPROVAL_NOT_IN_DURABLE_CONTINUITY');
 // A recorded installer source write is NOT an independently accepted
 // repair. Preserve that distinction and let the separate postinstall
 // verifier establish actual bytes, GitHub CI and preview delivery.
 if(card.decision_state==='INSTALLED')
  return safe('CONTINUITY_INSTALLED_PENDING_INDEPENDENT_POSTINSTALL',{
   continuity_committed:true,continuity_root_id:spine.continuity_root_id,
   latest_event_id:authority.event_id,newly_recorded_events:newlyRecorded,
   next_authorized_action:'VERIFY_INSTALLED_SOURCE_WITH_SEPARATE_PROVIDER'
  });
 if(card.decision_state==='VERIFIED'){
  // The service-only owner readback is joined to the same exact previously
  // fenced one-use decision. This receipt is written only after the verifier
  // independently accepts installed bytes, GitHub CI and Vercel delivery.
  if(!GIT.test(card.installed_commit_sha||'')||
   !HASH.test(card.independent_postinstall_receipt_sha256||'')||
   !Number.isSafeInteger(card.independent_ci_run_id)||
   card.independent_ci_run_id<1||
   !Number.isSafeInteger(card.independent_vercel_check_id)||
   card.independent_vercel_check_id<1||
   card.repair_installed!==true)
   bad('INDEPENDENT_POSTINSTALL_RECEIPT_INCOMPLETE');
  const final=await commit({
   stage:'VERIFICATION',step:'INDEPENDENT_POSTINSTALL_ACCEPTED',
   receipt:card.independent_postinstall_receipt_sha256,
   refs:[card.target_review_receipt_sha256,card.approval_receipt_sha256,
    card.independent_postinstall_receipt_sha256],
   payload:{
    verified_fact:'INDEPENDENT_INSTALLED_SOURCE_GITHUB_CI_AND_VERCEL',
    installed_commit_sha:card.installed_commit_sha,
    independent_ci_run_id:card.independent_ci_run_id,
    independent_vercel_check_id:card.independent_vercel_check_id,
    // Repairing an internal capability does NOT settle a customer original.
    repair_verified:true,original_customer_job_completed:false,
    next_required_action:'RECONCILE_UNFINISHED_SAME_SIGNED_SHIFT'
   }
  });
  // Classifier consumes the verified receipt; the signed original-work
  // gate alone supplies the next obligation. Never invent an executable
  // customer job or grant additional authority from the classifier.
  const next=originalGate.next_action;
  const validNext=new Set([
   'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
   'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
   'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
  ]);
  if(validNext.has(next)&&
   /^work:[a-f0-9]{32}$/.test(originalGate.original_work_id||'')&&
   /^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(
    originalGate.source_ref||'')){
   const nextWork=await commit({
    stage:'WORK',step:'NEXT_SIGNED_ORIGINAL_OBLIGATION_RECONCILED',
    receipt:card.independent_postinstall_receipt_sha256,
    refs:[final.event_id,card.independent_postinstall_receipt_sha256],
    payload:{
     verified_fact:'CURRENT_ORIGINAL_REMAINS_UNFINISHED',
     original_work_id:originalGate.original_work_id,
     original_source_ref:originalGate.source_ref,
     next_required_action:next,
     work_executed_by_classification:false,
     next_external_action_authorized_by_classification:false,
     original_customer_job_completed:false
    }
   });
   return safe('CONTINUITY_INDEPENDENT_REPAIR_VERIFIED_SAME_SHIFT_RECONCILED',{
    continuity_committed:true,
    verified_maintenance_repair_only:true,
    continuity_root_id:spine.continuity_root_id,
    latest_event_id:nextWork.event_id,
    newly_recorded_events:newlyRecorded,
    next_authorized_action:next,
    original_work_id:originalGate.original_work_id
   });
  }
  return safe('CONTINUITY_INDEPENDENT_REPAIR_VERIFIED_NEXT_WORK_UNQUALIFIED',{
   continuity_committed:true,verified_maintenance_repair_only:true,
   continuity_root_id:spine.continuity_root_id,
   latest_event_id:final.event_id,newly_recorded_events:newlyRecorded,
   next_authorized_action:'VERIFY_ORIGINAL_WORK_SCOPE_BEFORE_NEXT_EXECUTION'
  });
 }
 return safe(card.decision_state==='APPROVED'?
  'CONTINUITY_VERIFIED_APPROVAL_RECEIPTED_INSTALL_ELIGIBLE':
  'CONTINUITY_VERIFIED_APPROVAL_FENCED_OR_INSTALLED',{
   continuity_committed:true,
   continuity_root_id:spine.continuity_root_id,
   latest_event_id:authority.event_id,
   newly_recorded_events:newlyRecorded,
   next_authorized_action:card.decision_state==='APPROVED'?
    'CONTINUE_PREVIOUSLY_APPROVED_EXACT_INSTALL':
    'GET_ONLY_RECONCILE_PREVIOUSLY_FENCED_INSTALL',
   // The independent install service STILL atomically fences the exact
   // source write. This does not install, approve or authorize other work.
   install_eligible_from_continuity:card.decision_state==='APPROVED',
   installer_reconcile_only_from_continuity:card.decision_state==='FENCED'
 });
}
