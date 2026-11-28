// Durable, same-original-job governed trigger. Existing owner-confirmed work
// may initiate investigation automatically; it cannot authorize installation.
// Database RPCs independently re-read owner goal epoch and source Continuity.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {resolveQualifiedCapabilityKey} from './reality-evidence-driven-capability-router-v1.js';

export const GOVERNED_AUTO_TRIGGER_VERSION='reality-governed-auto-trigger-v1.0';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error('GOVERNED_AUTO_TRIGGER_'+code)};
export function capabilityFromSourcePath(path){
 if(typeof path!=='string'||
    !/^src\/reality-extensions\/[a-z0-9._/-]+\.mjs$/.test(path)||
    path.includes('//')||path.split('/').includes('..'))
  fail('SOURCE_PATH_UNVERIFIED');
 const name=path.split('/').at(-1).replace(/\.mjs$/,'').replace(/[._-]+/g,'_');
 if(!/^[a-z][a-z0-9_]{2,90}$/.test(name))fail('SOURCE_CAPABILITY_ID_INVALID');
 return name;
}
function database({session,env}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||
    session.config?.url!=='https://'+env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF+'.supabase.co')
  fail('AUTHENTICATED_ISOLATED_PREVIEW_ONLY');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
     db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('TRUSTED_DATABASE_BOUNDARY_REQUIRED');
 return db;
}
async function call(db,name,args,fetchImpl=fetch){
 const r=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',headers:{
   apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args),
 });
 if(!r.ok)fail('DATABASE_RPC_REJECTED_'+r.status);
 const result=await r.json().catch(()=>null);
 if(result===null||typeof result!=='object')fail('RPC_RECEIPT_REQUIRED');
 return result;
}
export async function registerOriginalJobCapabilityAutoTrigger({
 session,conversationId,originalWorkId,originalWorkEventId,
 goalTransitionEventId,evidence,
 env=process.env,invoke=call,
}={}){
 const db=database({session,env});
 if(!validUuid(conversationId)||!WORK.test(originalWorkId)||
    !validUuid(originalWorkEventId)||!validUuid(goalTransitionEventId)||
    evidence?.independently_verified!==true||
    !SHA.test(evidence.source_sha)||
    !Number.isSafeInteger(evidence.original_provider_failed_run_id)||
    evidence.original_provider_failed_run_id<1)
  fail('PINNED_INDEPENDENT_ORIGINAL_FAILURE_REQUIRED');
 const capabilityId=capabilityFromSourcePath(evidence.source_path);
 const response=await invoke(db,'reality_enqueue_governed_auto_trigger_v1',{
  p_owner_id:session.user_id,
  p_conversation_id:conversationId,
  p_original_work_id:originalWorkId,
  p_original_work_event_id:originalWorkEventId,
  p_goal_transition_event_id:goalTransitionEventId,
  p_capability_id:capabilityId,
 });
 if(!validUuid(response.trigger_id)||
    response.original_work_id!==originalWorkId||
    response.source_event_id!==originalWorkEventId||
    !['PENDING_VERIFIED_GAP_REOBSERVATION',
      'CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
      'EVIDENCE_RECONCILIATION_REQUIRED'].includes(response.phase)||
    response.installation_authorized!==false||
    response.original_job_completed!==false||
    response.production_changed!==false||
    response.new_customer_job_created!==false)
  fail('DURABLE_PROVIDER_RECEIPT_MISMATCH');
 return Object.freeze({
  status:response.phase,trigger_id:response.trigger_id,
  original_work_id:originalWorkId,
  capability_id:capabilityId,
  owner_action_required:false,new_customer_job_created:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
export async function claimOriginalJobCapabilityAutoTrigger({
 session,triggerId,originalWorkId,env=process.env,invoke=call,
}={}){
 const db=database({session,env});
 if(!validUuid(triggerId)||!WORK.test(originalWorkId))
  fail('CLAIM_SCOPE_INVALID');
 const result=await invoke(db,'reality_claim_governed_auto_trigger_v1',{
  p_trigger_id:triggerId,p_owner_id:session.user_id,
  p_original_work_id:originalWorkId,
 });
 if(result.trigger_id!==triggerId||!validUuid(result.claim_id)||
    result.original_work_id!==originalWorkId||
    !validUuid(result.original_work_event_id)||
    result.phase!=='CLAIMED_FOR_INDEPENDENT_INVESTIGATION'||
    result.reobserve_before_generation!==true||
    result.installation_authorized!==false||
    result.original_job_completed!==false||
    result.production_changed!==false||
    result.new_customer_job_created!==false)
  fail('CLAIMED_TRUST_BOUNDARY_INVALID');
 return Object.freeze({
  ...result,source:'SERVICE_ROLE_ATOMIC_CLAIM',
  model_generation_authorized:false,
  installation_authorized:false,original_job_completed:false,
 });
}


const signedShiftUUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const signedShiftSHA=/^sha256:[a-f0-9]{64}$/;
const signedShiftWORK=/^work:[a-f0-9]{32}$/;
const signedShiftISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const signedFrozenTEST=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const signedInvestigationRECEIPT=/^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$/;
const denyOriginalAdmit=code=>{throw Error('GOVERNED_AUTO_TRIGGER_'+code)};
// Reuse an EXISTING frozen owner shift: investigation -> independent RED ->
// service-only exact ORIGINAL. Neither the model nor this module can install.
export async function runAuthorizedShiftSourceRepairAutoTrigger({
 graph,investigation,independentFrozenFailure,admit
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !signedShiftUUID.test(graph.shift_id||'')||
    !signedShiftUUID.test(graph.owner_id||'')||
    !signedShiftSHA.test(graph.plan_fingerprint||'')||
    !Array.isArray(graph.jobs)||graph.jobs.length<1||graph.jobs.length>4||
    typeof admit!=='function')
  denyOriginalAdmit('TRUSTED_OWNER_SHIFT_REQUIRED');
 const ref=investigation?.source_ref;
 const match=signedShiftISSUE.exec(ref||'');
 const exact=graph.jobs.filter(x=>x.source_ref===ref);
 if(!match||exact.length!==1||
    exact[0].original_kind!=='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'||
    exact[0].original_work_id!==null||exact[0].phase!=='NOT_ADMITTED'||
    exact[0].independent_source_proof_verified!==true||
    !signedShiftSHA.test(exact[0].source_proof_sha256||'')||
    investigation.issue_number!==Number(match[1])||
    !['Riley','Taylor','Quinn'].includes(investigation.employee)||
    !signedInvestigationRECEIPT.test(investigation.investigation_receipt_ref||'')||
    !signedShiftSHA.test(investigation.provider_evidence_sha256||'')||
    !['CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST',
      'HISTORICAL_PROVIDER_FAILURE_VERIFIED_FRESH_REPRODUCTION_REQUIRED'
     ].includes(investigation.investigation_status))
  denyOriginalAdmit('EXACT_SOURCE_AND_INVESTIGATION_REQUIRED');
 const proof=independentFrozenFailure,run=proof?.run,id=run?.id;
 if(proof?.source_verified!==true||proof.failed_test_verified!==true||
    proof.failure_signature!=='CURRENT_SHIFT_AUTO_ADMISSION_MISSING'||
    !signedFrozenTEST.test(proof.test_path||'')||
    !/^[a-f0-9]{64}$/.test(proof.test_sha256||'')||
    !Number.isSafeInteger(id)||id<1||
    run.status!=='completed'||run.conclusion!=='failure'||
    !/^[a-f0-9]{40}$/.test(run.head_sha||'')||
    run.head_repository?.full_name!=='maloney2323/Reality'||
    run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+id||
    !['Reality current-shift original qualification acceptance',
      'Reality current shift governed auto-admission frozen contract'].includes(run.name))
  denyOriginalAdmit('CURRENT_INDEPENDENT_FROZEN_RED_REQUIRED');
 const request={
  p_owner_id:graph.owner_id,p_shift_id:graph.shift_id,
  p_plan_fingerprint:graph.plan_fingerprint,
  p_source_ref:ref,p_source_proof_sha256:exact[0].source_proof_sha256,
  p_evidence_receipt_ref:investigation.investigation_receipt_ref,
  p_provider_evidence_sha256:investigation.provider_evidence_sha256,
  p_frozen_failure_run_id:id,p_failure_source_sha:run.head_sha,
  p_frozen_test_path:proof.test_path,
  p_frozen_test_sha256:proof.test_sha256,
  p_failure_signature:proof.failure_signature
 };
 const result=await admit(Object.freeze(request));
 if(result?.status!=='EXACT_OWNER_SHIFT_REPAIR_ORIGINAL_ADMITTED'||
    result.shift_id!==graph.shift_id||result.owner_id!==graph.owner_id||
    result.source_ref!==ref||
    !signedShiftWORK.test(result.original_work_id||'')||
    result.installation_authorized!==false||
    result.production_changed!==false||
    result.original_job_completed!==false)
  denyOriginalAdmit('SERVICE_FENCED_ORIGINAL_RECEIPT_INVALID');
 return Object.freeze({...result,
  investigation_receipt_ref:investigation.investigation_receipt_ref,
  frozen_failure_run_id:id,independent_red_acceptance_verified:true,
  owner_warrant_reused:true,new_shift_created:false,
  installation_authorized:false,production_changed:false});
}

// The same existing governor also brokers independently failed original-repair
// continuations. The service-only durable claim remains the authority source;
// no model prompt or Chat answer can mint a shift, job, install or settlement.
export {continueSameOriginalRecoveryAfterVerifiedFailure}
 from './reality-same-original-recovery-attempt-v2.js';

// Existing signed maintenance Universe -> Governed Trigger policy.
// This DOES NOT create a trigger service, owner authority, or another shift.
// It consumes a *durably admitted and independently read* Spine transition.
// Only a real one-use owner receipt permits the existing installer to be
// dispatched; the installer still performs its own atomic authorization fence.
export function routeSignedMaintenanceContinuityTrigger({
 continuity,originalGate,ownerId,shiftId
}={}){
 const blocked=(reason)=>Object.freeze({
  status:'SIGNED_MAINTENANCE_TRIGGER_BLOCKED',
  reason,trigger_source:'CANONICAL_CONTINUITY_SPINE',
  owner_action_required:false,installer_dispatch_permitted:false,
  installer_reconcile_only:false,independent_postinstall_due:false,
  same_original_work_due:false,execution_authorized_by_trigger:false,
  original_job_completed:false,new_shift_started:false,
  production_changed:false
 });
 if(!signedShiftUUID.test(ownerId||'')||!signedShiftUUID.test(shiftId||'')||
  originalGate?.owner_id!==ownerId||originalGate?.shift_id!==shiftId||
  originalGate?.status!=='EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'||
  originalGate.read_only!==true||
  originalGate.warrant_mode!=='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'||
  originalGate.installation_authorized!==false||
  originalGate.original_job_completed!==false||
  originalGate.production_changed!==false)
  return blocked('ORIGINAL_SIGNED_OWNER_SHIFT_NOT_VERIFIED');
 if(continuity?.continuity_committed!==true||
  !signedShiftUUID.test(continuity.continuity_root_id||'')||
  !signedShiftUUID.test(continuity.latest_event_id||'')||
  continuity.original_job_completed!==false||
  continuity.new_shift_started!==false||continuity.production_changed!==false)
  return blocked('INDEPENDENT_UNIVERSE_CONTINUITY_RECEIPT_REQUIRED');
 const routes={
  CONTINUITY_VERIFIED_TARGET_AWAITING_OWNER_CLICK:{
   next_action:'AWAIT_EXACT_OWNER_APPROVAL',owner_action_required:true
  },
  CONTINUITY_VERIFIED_APPROVAL_RECEIPTED_INSTALL_ELIGIBLE:{
   next_action:'CONTINUE_PREVIOUSLY_APPROVED_EXACT_INSTALL',
   installer_dispatch_permitted:true
  },
  CONTINUITY_VERIFIED_APPROVAL_FENCED_OR_INSTALLED:{
   next_action:'GET_ONLY_RECONCILE_PREVIOUSLY_FENCED_INSTALL',
   installer_reconcile_only:true
  },
  CONTINUITY_INSTALLED_PENDING_INDEPENDENT_POSTINSTALL:{
   next_action:'VERIFY_INSTALLED_SOURCE_WITH_SEPARATE_PROVIDER',
   independent_postinstall_due:true
  },
  CONTINUITY_INDEPENDENT_REPAIR_VERIFIED_SAME_SHIFT_RECONCILED:{
   next_action:originalGate.next_action,same_original_work_due:true
  },
  CONTINUITY_INDEPENDENT_REPAIR_VERIFIED_NEXT_WORK_UNQUALIFIED:{
   next_action:'VERIFY_ORIGINAL_WORK_SCOPE_BEFORE_NEXT_EXECUTION'
  }
 };
 const stage=routes[continuity.status];
 if(!stage||continuity.next_authorized_action!==stage.next_action)
  return blocked('UNRECOGNIZED_OR_CONTRADICTORY_LEDGER_TRANSITION');
 if(stage.installer_dispatch_permitted&&
    continuity.install_eligible_from_continuity!==true||
   stage.installer_reconcile_only&&
    continuity.installer_reconcile_only_from_continuity!==true||
   !stage.installer_dispatch_permitted&&
    continuity.install_eligible_from_continuity===true||
   !stage.installer_reconcile_only&&
    continuity.installer_reconcile_only_from_continuity===true)
  return blocked('INSTALL_SCOPE_NOT_MATCHED_TO_DURABLE_AUTHORITY');
 if(stage.same_original_work_due&&
  (!signedShiftWORK.test(continuity.original_work_id||'')||
   continuity.original_work_id!==originalGate.original_work_id||
   !['VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
    'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
    'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'].includes(
     originalGate.next_action)))
  return blocked('ORIGINAL_JOB_RESTART_SCOPE_NOT_VERIFIED');
 return Object.freeze({
  status:'SIGNED_MAINTENANCE_GOVERNED_TRIGGER_READY',
  trigger_source:'CANONICAL_CONTINUITY_SPINE',
  continuity_root_id:continuity.continuity_root_id,
  continuity_event_id:continuity.latest_event_id,
  shift_id:shiftId,owner_id:ownerId,
  next_action:stage.next_action,
  owner_action_required:stage.owner_action_required===true,
  installer_dispatch_permitted:stage.installer_dispatch_permitted===true,
  installer_reconcile_only:stage.installer_reconcile_only===true,
  independent_postinstall_due:stage.independent_postinstall_due===true,
  same_original_work_due:stage.same_original_work_due===true,
  original_work_id:stage.same_original_work_due?continuity.original_work_id:null,
  // Triggers may route an already authorized action, never grant authority.
  execution_authorized_by_trigger:false,
  original_job_completed:false,new_shift_started:false,
  production_changed:false
 });
}


// Existing governor: choose only an independently verified, current event.
// The service broker remains responsible for its own atomic warrant and proof.
export function routeVerifiedFinalLoopResumeTrigger({continuity:c,shiftId,claimedEventId=null,stagedActions=null}={}){
 const safe=(status,extra={})=>Object.freeze({status,...extra,
  execution_authorized_by_trigger:false,installation_authorized:false,
  original_job_completed:false,production_changed:false,new_shift_started:false});
 const reject=reason=>safe('FINAL_LOOP_GOVERNED_TRIGGER_BLOCKED',{
  reason,dispatch_permitted:false,resume_event:null});
 const g=c?.shared_continuity_guard,e=c?.event_resume_shadow;
 if(c?.status!=='FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'||
    !signedShiftUUID.test(shiftId||'')||c.shift_id!==shiftId||
    !signedShiftUUID.test(c.owner_id||'')||
    c.read_only!==true||c.transition_committed!==false||
    c.executor_invoked!==false||c.owner_approval_granted!==false||
    c.installation_authorized!==false||c.production_changed!==false||
    c.original_job_completed!==false||c.execution_authorized===true||
    g?.status!=='FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
    g.shift_id!==shiftId||g.owner_id!==c.owner_id||g.read_only!==true||
    g.execution_authorized!==false||g.original_job_completed!==false||
    !signedShiftUUID.test(g.continuity_root_id||'')||
    !signedShiftSHA.test(g.continuity_head_sha256||'')||
    g.continuity_head_sha256!==c.continuity_head_sha256||
    !Number.isSafeInteger(g.revision)||g.revision<1||g.revision!==c.revision||
    !Array.isArray(g.handoffs)||!Array.isArray(c.governed_qualification_handoffs))
  return reject('FRESH_CANONICAL_CONTINUITY_REQUIRED');
 if(e?.status!=='FINAL_LOOP_VERIFIED_EVENT_SHADOW_CONSUMED_NO_DISPATCH'||
    e.event_dispatch_enabled!==false||e.execution_authorized!==false||
    !Array.isArray(e.ready_event_refs)||
    e.shadow_ready_event_count!==e.ready_event_refs.length)
  return reject('INDEPENDENT_EVENT_READBACK_REQUIRED');
 if(e.ready_event_refs.length===0)return reject('NO_CURRENT_VERIFIED_EVENT');
 // A canonical RESUME delivery already owns one exact event. Unrelated
 // qualified events remain queued rather than creating an ambiguous shift.
 if(claimedEventId!==null&&!signedShiftUUID.test(claimedEventId||''))
  return reject('CLAIMED_EVENT_ID_INVALID');
 const selected=claimedEventId===null?e.ready_event_refs:
  e.ready_event_refs.filter(item=>item?.event_id===claimedEventId);
 if(selected.length!==1)return reject(claimedEventId===null?'AMBIGUOUS_EVENT_SCOPE':'CLAIMED_EVENT_NOT_CURRENT_OR_AMBIGUOUS');
 const r=selected[0];
 if(!r||!signedShiftUUID.test(r.event_id||'')||
    !signedShiftWORK.test(r.original_work_id||'')||
    !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(r.source_ref||'')||
    !signedShiftSHA.test(r.event_causality_sha256||'')||
    !signedShiftSHA.test(r.source_receipt_sha256||'')||
    r.continuity_revision!==g.revision||
    r.continuity_head_sha256!==g.continuity_head_sha256||
    r.would_resume_suspended_obligation!==true||
    r.executor_invoked!==false||r.execution_authorized!==false)
  return reject('EVENT_IDENTITY_OR_REVISION_UNVERIFIED');
 const matches=g.handoffs.filter(h=>h?.source_ref===r.source_ref&&
  h.original_work_id===r.original_work_id);
 if(matches.length!==1||matches[0].continuity_identity_verified!==true||
    matches[0].qualifier_digest_verified!==true||
    matches[0].execution_authorized!==false||
    matches[0].original_job_completed!==false)
  return reject('ORIGINAL_HANDOFF_UNVERIFIED');
 const h=matches[0],base={owner_id:c.owner_id,shift_id:shiftId,
  original_work_id:r.original_work_id,source_ref:r.source_ref,
  continuity_root_id:g.continuity_root_id,continuity_revision:g.revision,
  continuity_head_sha256:g.continuity_head_sha256,event_id:r.event_id};
 // A suspension receipt is routed only through the signed claim's exact
 // investigation-only branch. Never reinterpret it as a review/CI event.
 if(r.event_kind==='VERIFIED_REVIEW_TECHNICAL_EVIDENCE')
  return reject('VERIFIED_REVIEW_REQUIRES_EXACT_TERMINAL_TECHNICAL_LANE');
 if(r.event_kind==='VERIFIED_INVESTIGATION_REVIEW')
  return reject('VERIFIED_INVESTIGATION_REQUIRES_EXACT_INDEPENDENT_REVIEW_LANE');
 if(r.event_kind==='VERIFIED_SUSPENSION_INVESTIGATION')
  return reject('VERIFIED_SUSPENSION_REQUIRES_EXACT_INVESTIGATION_LANE');
 if(r.event_kind==='INDEPENDENT_FROZEN_CI_RECEIPT'){
  if(h.independent_internal_ci_verified!==true)return reject('CI_PROOF_NOT_RECONCILED');
  return safe('FINAL_LOOP_GOVERNED_TRIGGER_RECONCILIATION_DUE',{
   ...base,dispatch_permitted:false,resume_event:null,
   next_action:'RECONCILE_SIGNED_RED_RECEIPT_WITH_DURABLE_RECOVERY_CONTRACT'});
 }
 const qualified=c.governed_qualification_handoffs.filter(q=>
  q?.source_ref===r.source_ref&&q.original_work_id===r.original_work_id);
 const reviewAction='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM';
 const terminalAction='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY';
 const action='VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC';
 // Existing installed capability types, not an execution sequence. The
 // exact current qualifier and event select the type; each adapter below
 // independently enforces its own effect/authority contract.
 const selectedCapability=resolveQualifiedCapabilityKey({event:r,handoff:h,
  qualifications:qualified,registeredActionKeys:[reviewAction,terminalAction,action]});
 // An exact review route is independently accepted, READ-ONLY review scope.
 // Its trigger is not the maintenance verifier and cannot renew repair budget.
 if(r.event_kind==='QUALIFIER_PROOF_CHANGED'&&r.next_qualified_action===reviewAction){
  if(claimedEventId===null||selectedCapability!==reviewAction||h.next_qualified_action!==reviewAction||
     !Array.isArray(h.unresolved_proof_gates)||
     h.unresolved_proof_gates.includes('OWNER_GOAL_ACCEPTANCE_EVENT_MISSING')||
     h.unresolved_proof_gates.includes('EXACT_ACCEPTANCE_APPROVAL_MISSING'))
   return reject('EXACT_REVIEW_EVENT_QUALIFICATION_REQUIRED');
  if(stagedActions?.status!=='FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED'||
     stagedActions.read_only!==true||stagedActions.action_dispatched!==false||
     stagedActions.model_execution_authorized!==false||stagedActions.original_job_completed!==false||
     !Array.isArray(stagedActions.routes))
   return reject('CURRENT_CATEGORIZED_REVIEW_SCOPE_REQUIRED');
  const routes=stagedActions.routes.filter(x=>x?.source_ref===r.source_ref&&
   x.parent_original_work_id===r.original_work_id);
  if(routes.length!==1)return reject('EXACT_CATEGORIZED_REVIEW_ROUTE_REQUIRED');
  const route=routes[0],scope=route.canonical_execution_handoff;
  if(route.operation_category!=='EXECUTION'||route.authority_scope!=='EXACT_ACCEPTED_READ_ONLY_REVIEW'||
     route.next_governed_action!==reviewAction||route.next_registered_handler!==reviewAction||
     route.existing_owner_goal_acceptance_verified!==true||route.owner_action_required!==false||
     route.child_execution_authorized!==false||route.handler_dispatched!==false||
     route.original_job_completed!==false||route.parent_source_phase!=='BLOCKED'||
     scope?.status!=='CANONICAL_APPROVED_REVIEW_SCOPE_BOUND_CLAIM_REQUIRED'||
     scope.schema!=='reality-canonical-approved-review-scope-v1'||
     scope.owner_id!==c.owner_id||scope.shift_id!==shiftId||
     scope.parent_original_work_id!==r.original_work_id||scope.source_ref!==r.source_ref||
     !signedShiftUUID.test(scope.plan_id||'')||scope.plan_id!==route.plan_id||
     !signedShiftUUID.test(scope.packet_id||'')||
     !signedShiftSHA.test(scope.owner_approval_receipt_sha256||'')||
     !signedShiftSHA.test(scope.plan_fingerprint||'')||
     !/^[a-f0-9]{40}$/.test(scope.source_head_sha||'')||scope.source_head_sha!==route.source_head_sha||
     !signedShiftSHA.test(scope.source_manifest_sha256||'')||
     scope.source_manifest_sha256!==route.source_manifest_sha256||
     !signedShiftSHA.test(scope.acceptance_contract_sha256||'')||
     scope.acceptance_contract_sha256!==route.acceptance_contract_sha256||
     scope.continuity_root_id!==g.continuity_root_id||
     scope.continuity_head_sha256!==g.continuity_head_sha256||scope.revision!==g.revision||
     scope.effect_type!=='READ_ONLY_INTERNAL_PR_REVIEW'||scope.canonical_claim_required!==true||
     scope.next_governed_action!=='CLAIM_EXACT_CANONICAL_CHILD_REVIEW_THROUGH_EXISTING_SIGNED_WORKER'||
     scope.read_only!==true||scope.execution_authorized!==false||
     scope.original_job_completed!==false||scope.production_changed!==false)
   return reject('CATEGORIZED_REVIEW_AUTHORITY_OR_CONTINUITY_DRIFT');
  return safe('FINAL_LOOP_GOVERNED_TRIGGER_EXACT_REVIEW_CLAIM_ROUTE_READY',{
   ...base,operation_category:'EXECUTION',authority_scope:'EXACT_ACCEPTED_READ_ONLY_REVIEW',
   next_action:reviewAction,qualifier_receipt_sha256:r.source_receipt_sha256,
   // This is permission to route to the existing canonical claim boundary,
   // not a claim, live execution grant, or the maintenance CI resume event.
   dispatch_permitted:false,resume_event:null,review_claim_route_ready:true,
   canonical_claim_handoff:scope,canonical_claim_required:true,
   previous_attempt_budget_preserved:true,new_attempt_authorized:false,
   repeat_prior_ci_dispatch_permitted:false});
 }
 // The exhausted builder may qualify DISTINCT evidence, not replay CI or
 // lease another build. The existing verifier is the only permitted reader.
 if(r.event_kind==='QUALIFIER_PROOF_CHANGED'&&r.next_qualified_action===terminalAction){
  if(selectedCapability!==terminalAction||h.next_qualified_action!==terminalAction||
     !Array.isArray(h.unresolved_proof_gates)||
     !h.unresolved_proof_gates.includes('TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED')||
     !h.unresolved_proof_gates.includes('CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED')||
     h.independent_internal_ci_verified!==false)
   return reject('TERMINAL_RECOVERY_CURRENT_EVIDENCE_UNVERIFIED');
  return safe('FINAL_LOOP_GOVERNED_TRIGGER_TERMINAL_EVIDENCE_REQUALIFICATION_DUE',{
   ...base,operation_category:'RECOVERY',authority_scope:'DISTINCT_EVIDENCE_ONLY',
   dispatch_permitted:false,resume_event:null,
   evidence_readback_permitted:true,next_action:terminalAction,
   qualifier_receipt_sha256:r.source_receipt_sha256,
   previous_attempt_budget_preserved:true,new_attempt_authorized:false,
   repeat_prior_ci_dispatch_permitted:false});
 }
 if(selectedCapability!==action||
    !Array.isArray(h.unresolved_proof_gates)||
    !h.unresolved_proof_gates.includes('CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED')||
    h.unresolved_proof_gates.includes('TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED')||
    h.independent_internal_ci_verified!==false)
  return reject('CURRENT_QUALIFIED_ACTION_OR_PROOF_MISMATCH');
 return safe('FINAL_LOOP_GOVERNED_TRIGGER_EXISTING_CASE_VERIFIER_READY',{
  ...base,dispatch_permitted:true,next_action:action,
  resume_event:Object.freeze({event_id:r.event_id,source_ref:r.source_ref})});
}


// A transport receipt is not a worker, authority or outcome receipt.
export function finalLoopEventTriggerEnabled(db,env=process.env){
 const canonical=env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW';
 const runtimeBound=canonical?
  (env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED!=='true'&&
   env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED==='true'&&
   env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='true'&&env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED!=='true'&&
   signedShiftUUID.test(env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID||'')&&signedShiftUUID.test(env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID||'')&&
   db?.project===env.REALITY_RELEASE_CONTROL_DB_PROJECT_REF&&db?.project===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
   db?.project!==env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF):
  (env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&db?.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF&&db?.project!==env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF);
 return runtimeBound&& env.VERCEL_ENV==='preview'&&
  env.REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_EVENT_RESUME_SHADOW_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_PREVIEW_SOURCE_PLAN_WAKE_ONLY!=='true'&&
  db?.strictSecrets===true&&typeof db.project==='string'&&
  db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
  typeof env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF==='string'&&
  env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF.length>0&&
  db.url==='https://'+db.project+'.supabase.co';
}
export function parseFinalLoopGovernedWake(headers={}){
 const owner_id=headers['x-reality-governed-owner-id'];
 const shift_id=headers['x-reality-governed-shift-id'];
 const plan_fingerprint=headers['x-reality-governed-plan-fingerprint'];
 if([owner_id,shift_id,plan_fingerprint].every(v=>v===undefined))return null;
 if(typeof owner_id!=='string'||typeof shift_id!=='string'||
    typeof plan_fingerprint!=='string'||!signedShiftUUID.test(owner_id)||
    !signedShiftUUID.test(shift_id)||!signedShiftSHA.test(plan_fingerprint))
  fail('WAKE_SCOPE_INVALID');
 const event_id=headers['x-reality-governed-event-id'],nonce=headers['x-reality-governed-wake-nonce'],
  kind=headers['x-reality-governed-wake-kind'],release_sha=headers['x-reality-governed-release-sha'];
 if([event_id,nonce,kind,release_sha].every(v=>v===undefined))return Object.freeze({owner_id,shift_id,plan_fingerprint});
 if(typeof event_id!=='string'||!signedShiftUUID.test(event_id)||typeof nonce!=='string'||!signedShiftUUID.test(nonce)||
  !['START','RESUME'].includes(kind)||typeof release_sha!=='string'||!/^[a-f0-9]{40}$/.test(release_sha))fail('WAKE_EVENT_INVALID');
 return Object.freeze({owner_id,shift_id,plan_fingerprint,event_id,nonce,kind,release_sha});
}
export function verifyCanonicalGovernedWakeDelivery(scope,env=process.env){
 return env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW'&&!!scope&&
  scope.owner_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID&&scope.shift_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID&&
  scope.release_sha===env.VERCEL_GIT_COMMIT_SHA&&/^[a-f0-9]{40}$/.test(scope.release_sha||'')&&
  signedShiftUUID.test(scope.event_id||'')&&signedShiftUUID.test(scope.nonce||'')&&
  (scope.kind==='RESUME'||(scope.kind==='START'&&scope.event_id===scope.shift_id));
}
export function verifyFinalLoopGovernedWakeScope(scope,graph){
 return !!scope&&graph?.status==='OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'&&
  graph.owner_id===scope.owner_id&&graph.shift_id===scope.shift_id&&
  graph.plan_fingerprint===scope.plan_fingerprint&&graph.completion_bound===true&&
  graph.execution_scope_from_owner_warrant_only===true&&
  graph.new_job_created===false&&graph.installation_authorized===false&&
  graph.production_changed===false;
}
export async function readFinalLoopGovernedShiftStart({db,ownerId,shift,env=process.env,
 invoke=shiftRpc}={}){
 const safe=(status,extra={})=>Object.freeze({status,...extra,
  execution_authorized_by_trigger:false,installation_authorized:false,
  original_job_completed:false,production_changed:false});
 if(!finalLoopEventTriggerEnabled(db,env))
  return safe('GOVERNED_START_TRANSPORT_NOT_ENABLED');
 if(!signedShiftUUID.test(ownerId||'')||!signedShiftUUID.test(shift?.shift_id||'')||
    !signedShiftSHA.test(shift.plan_fingerprint||'')||shift.planned_end_at!=='infinity')
  return safe('GOVERNED_START_SCOPE_UNVERIFIED');
 try{
  const r=await invoke(db,'reality_read_final_loop_governed_start_v1',{
   p_owner_id:ownerId,p_shift_id:shift.shift_id,p_plan_fingerprint:shift.plan_fingerprint});
  if(r?.owner_id!==ownerId||r.shift_id!==shift.shift_id||
     r.plan_fingerprint!==shift.plan_fingerprint||r.read_only!==true||
     r.execution_authorized!==false||r.installation_authorized!==false||
     r.original_job_completed!==false||r.production_changed!==false||
     !['GOVERNED_START_NOT_QUEUED','GOVERNED_START_WAKE_QUEUED',
        'GOVERNED_START_WORKER_OBSERVED','GOVERNED_START_SCHEDULED'].includes(r.status))
   return safe('GOVERNED_START_READBACK_UNVERIFIED');
  if(r.status==='GOVERNED_START_WAKE_QUEUED'||r.status==='GOVERNED_START_WORKER_OBSERVED'){
   if(!Number.isSafeInteger(r.network_request_id)||r.network_request_id<1||
      !Number.isFinite(Date.parse(r.queued_at||'')))
    return safe('GOVERNED_START_READBACK_UNVERIFIED');
  }
  if(r.status==='GOVERNED_START_WORKER_OBSERVED'&&
     (!Number.isFinite(Date.parse(r.last_worker_seen_at||''))||
      Date.parse(r.last_worker_seen_at)<Date.parse(r.queued_at)))
   return safe('GOVERNED_START_READBACK_UNVERIFIED');
  return safe(r.status,{shift_id:r.shift_id,
   wake_queued:['GOVERNED_START_WAKE_QUEUED','GOVERNED_START_WORKER_OBSERVED'].includes(r.status),
   worker_observed:r.status==='GOVERNED_START_WORKER_OBSERVED',
   queued_at:r.queued_at||null,last_worker_seen_at:r.last_worker_seen_at||null});
 }catch{return safe('GOVERNED_START_READBACK_UNAVAILABLE');}
}

// The server clock, not a phone's clock, defines an immediate start.
// Legacy callers keep their supplied timestamp; scheduling remains explicit.
export function resolveFinalLoopShiftStart(mode,plannedStart,nowMs=Date.now()){
 if(![undefined,'START_NOW','SCHEDULE'].includes(mode)||
    typeof plannedStart!=='string'||!Number.isFinite(nowMs))
  fail('START_MODE_INVALID');
 const chosen=new Date(mode==='START_NOW'?nowMs:plannedStart);
 if(!Number.isFinite(chosen.valueOf())||
    chosen.valueOf()<nowMs-120000||chosen.valueOf()>nowMs+7*86400000||
    (mode==='SCHEDULE'&&chosen.valueOf()<=nowMs))
  fail('START_TIME_INVALID');
 return chosen;
}
