// Riley is a named Reality job duty, NOT a separate authority domain.
// Connects an EXISTING owner-authorized employee shift and an independently
// qualified original job to Reality's EXISTING governed execution engine.
// The executor invokes the shared Genuine Capability Engine only for a proven
// original-job missing instrument. This adapter cannot mint a shift, original
// job, capability approval, model credential, or final settlement receipt.
import {assertShiftReadback} from './reality-governed-shift-boundary-v1.js';
import {executeAuthorizedWork} from './reality-governed-execution-engine-v0.1.js';
import {createGenuineCapabilityExecutionHandoff}
 from './reality-genuine-capability-engine-v1.js';

export const RILEY_GOVERNED_ORIGINAL_JOB_VERSION=
 'reality-riley-shared-governed-original-job-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const fail=code=>{throw Error('RILEY_ORIGINAL_'+code)};
export function establishRileyExistingJobScope({
 shiftReadback,ownerLedgerReadback,ownerId,shiftId,qualifiedOriginal,scope,workItem
}={}){
 assertShiftReadback(shiftReadback);
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  shiftReadback.work_installation_authorized_by_read!==false||
  shiftReadback.production_changed!==false)fail('OWNER_SHIFT_SCOPE_UNVERIFIED');
 const current=shiftReadback.shifts.filter(s=>s.shift_id===shiftId);
 if(current.length!==1)fail('EXACT_SHIFT_NOT_FOUND');
 const shift=current[0];
 if(!['RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(shift.status)||
  shift.steps[5].state!=='AWAITING_EXACT_WORK'||shift.steps[6].state==='ORIGINAL_JOB_RECEIPT_VERIFIED')
  fail('NO_ACTIVE_ORIGINAL_JOB_GATE');
 const original=qualifiedOriginal;
 const ledger=ownerLedgerReadback;
 if(!ledger||ledger.status!=='OWNER_GOVERNED_LOOP_READBACK'||
  ledger.owner_installation_authorized_by_read!==false||
  ledger.external_action_performed!==false||
  ledger.production_changed!==false||
  !Array.isArray(ledger.jobs)||ledger.jobs.length>12)
  fail('OWNER_GOVERNED_LOOP_READBACK_REQUIRED');
 const ledgerMatches=ledger.jobs.filter(j=>j.original_work_id===original?.original_work_id);
 if(ledgerMatches.length!==1||
  ledgerMatches[0].source_issue_number!==original?.source_issue_number||
  ledgerMatches[0].environment!=='ISOLATED_PREVIEW'||
  ledgerMatches[0].independently_settled!==false||
  ledgerMatches[0].owner_install_approved!==false||
  ledgerMatches[0].original_work_id!==scope?.original_work_id)
  fail('EXACT_LEDGER_JOB_NOT_ELIGIBLE');
 if(!original||typeof original!=='object'||
  !WORK.test(original.original_work_id||'')||
  original.owner_id!==ownerId||
  original.original_job_authorized!==true||
  original.independently_qualified!==true||
  original.independently_settled!==false||
  original.provider_effect_may_have_occurred!==false||
  original.production_changed!==false||
  original.environment!=='ISOLATED_PREVIEW'||
  !Number.isSafeInteger(original.source_issue_number)||
  original.source_issue_number<1||
  original.installation_authorized!==false)
  fail('CURRENT_ORIGINAL_JOB_NOT_INDEPENDENTLY_QUALIFIED');
 const matchingSources=shift.steps.filter(t=>{
  const m=ISSUE.exec(String(t.source_ref||''));
  return m&&Number(m[1])===original.source_issue_number;
 });
 if(matchingSources.length!==1||
  !['SOURCE_CHECKED','AWAITING_EXACT_WORK'].includes(matchingSources[0].state)||
  matchingSources[0].state==='SOURCE_CHECKED'&&
   !/^sha256:[a-f0-9]{64}$/.test(matchingSources[0].proof_sha256||''))
  fail('SHIFT_ORIGINAL_SOURCE_NOT_VERIFIED');
 if(!scope||scope.owner_id!==ownerId||
  scope.original_work_id!==original.original_work_id||
  scope.goal_id!==original.goal_id||
  scope.target_environment!=='ISOLATED_PREVIEW'||
  !scope.continuity_root_id||!scope.worldline_id||
  !scope.goal_transition_receipt_ref||!scope.goal_evidence_ref||
  !scope.governance_kernel_hash)
  fail('REALITY_CONTINUITY_SCOPE_MISMATCH');
 if(!workItem||workItem.work_item_id!==original.original_work_id||
  typeof workItem.workflow_id!=='string'||!workItem.workflow_id||
  workItem.connector!==null||
  workItem.consequential!==false)
  fail('NO_CONSEQUENTIAL_PROVIDER_WRITES_IN_RILEY_PILOT');
 return Object.freeze({
  version:RILEY_GOVERNED_ORIGINAL_JOB_VERSION,
  employee_id:'reality-proposed:software_engineering',
  employee_name:'Riley',
  owner_id:ownerId,shift_id:shiftId,
  original_work_id:original.original_work_id,
  original_goal_id:original.goal_id,
  issue_number:original.source_issue_number,
  source_ref:matchingSources[0].source_ref,
  authorized_existing_original_job:true,
  same_continuity_root:true,
  install_approval_from_employee:false,
  production_write_authorized:false,
  final_settlement_not_yet_verified:true,
 });
}
export async function runRileyOriginalJobViaReality({
 shiftReadback,ownerLedgerReadback,ownerId,shiftId,qualifiedOriginal,scope,workItem,
 authorization,connector,independentVerifier,engine,persistAndReadback,
 serverApprovalProof=null,serverFreshGoalAdmission=null,
 serverSingleUseReservation=null,reservationStore=null,
 execute=executeAuthorizedWork
}={}){
 const bound=establishRileyExistingJobScope({
  shiftReadback,ownerLedgerReadback,ownerId,shiftId,qualifiedOriginal,scope,workItem
 });
 if(typeof execute!=='function'||typeof engine?.run!=='function'||
  typeof persistAndReadback!=='function'||
  !connector||typeof connector.execute!=='function'||
  !independentVerifier||typeof independentVerifier.verify!=='function')
  fail('SHARED_REALITY_DRIVER_REQUIRED');
 const handoff=createGenuineCapabilityExecutionHandoff({
  engine,scope,persistAndReadback
 });
 // All job authorization is independently checked again by the existing
 // executor. No agent can choose its own authorization or bypass the ledger.
 const result=await execute({
  workItem,workflowId:workItem.workflow_id,authorization,connector,
  independentVerifier,originalWorkId:bound.original_work_id,
  serverApprovalProof,serverFreshGoalAdmission,
  serverSingleUseReservation,reservationStore,
  onVerifiedCapabilityGap:handoff
 });
 if(!result||!['BLOCKED','UNRESOLVED','VERIFIED'].includes(result.status)||
  result.self_repair?.original_work_id&&
   result.self_repair.original_work_id!==bound.original_work_id||
  result.self_repair?.new_job_created===true||
  result.self_repair?.original_job_completed===true)
  fail('SHARED_EXECUTOR_RESULT_UNVERIFIED');
 return Object.freeze({
  version:RILEY_GOVERNED_ORIGINAL_JOB_VERSION,
  status:result.status==='BLOCKED'?'ORIGINAL_JOB_AUTHORIZATION_BLOCKED':
   result.self_repair?'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF':
   result.status==='VERIFIED'?'ORIGINAL_JOB_OUTCOME_NEEDS_DURABLE_SETTLEMENT':
   'ORIGINAL_JOB_UNRESOLVED_NO_UNSAFE_RETRY',
  employee_name:'Riley',
  employee_function_id:'software_engineering',
  shift_id:bound.shift_id,
  original_work_id:bound.original_work_id,
  original_goal_id:bound.original_goal_id,
  original_execution_status:result.status,
  repair_handoff_status:result.self_repair?.status||null,
  repair_owner_approval_required:result.self_repair?.owner_action_required===true,
  shared_capability_engine_used:!!result.self_repair,
  existing_reality_governed_executor_used:true,
  installation_authorized_by_employee:false,
  original_job_settled:false,
  independently_verified_final_receipt:false,
  no_new_original_job_created:true,
  automatic_provider_retry_performed:false,
  original_job_identity_preserved:true,
  verified_human_hours_saved:null,
  production_changed:false,
 });
}
