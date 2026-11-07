import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {unavailableRoleHandoff,COMBINED_ROLE_HANDOFF_VERSION}
 from './reality-one-openai-combined-role-handoff-v1.js';
import {wakeExistingRileyCapabilityJob}
 from './reality-employee-shared-capability-wake-v1.js';
import {wakeExistingRileyShiftCapabilityBatch}
 from './reality-riley-existing-multi-job-wake-v1.js';
const REPO='maloney2323/Reality';
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(issues|pull|actions\/runs)\/([1-9][0-9]{0,15})$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const noProduction=x=>x?.production_changed===false;
async function readProviderSource(source,{fetchImpl=fetch}={}){
 const parsed=URL.exec(String(source||''));
 if(!parsed)throw Error('SHIFT_SOURCE_REF_NOT_ALLOWED');
 const category=parsed[1],id=parsed[2],endpoint=
  category==='issues'?'issues':category==='pull'?'pulls':'actions/runs';
 const target='https://api.github.com/repos/'+REPO+'/'+endpoint+'/'+id;
 const r=await fetchImpl(target,{
  method:'GET',redirect:'error',cache:'no-store',
  headers:{accept:'application/vnd.github+json','user-agent':'Reality-Employee-Shift-ReadOnly/1.0',
   'x-github-api-version':'2022-11-28'},
  signal:AbortSignal.timeout(10000)
 });
 if(r.status===404)return {
  kind:'GITHUB_SOURCE_READBACK',source_url:source,provider_status:'NOT_FOUND',
  provider_checked:true,read_only:true,production_changed:false,
  observed_at:new Date().toISOString()};
 if(!r.ok)throw Error('SHIFT_GITHUB_PROVIDER_READBACK_UNAVAILABLE');
 const data=await r.json();
 if(!data||Number(data.id)<=0||String(data.html_url||'')!==source)
  throw Error('SHIFT_GITHUB_IDENTITY_MISMATCH');
 let state;
 if(category==='issues'){
  if(data.pull_request)throw Error('SHIFT_ISSUE_IS_PR_MISMATCH');
  state=data.state==='open'?'OPEN_ISSUE':data.state==='closed'?'CLOSED':null;
 }else if(category==='pull'){
  state=data.state==='open'?'OPEN_PULL_REQUEST':data.state==='closed'?'CLOSED':null;
 }else state=data.status==='completed'?
   (data.conclusion==='failure'?'FAILED_WORKFLOW':'COMPLETED_WORKFLOW'):null;
 if(!state)throw Error('SHIFT_GITHUB_STATUS_UNRECOGNIZED');
 return {kind:'GITHUB_SOURCE_READBACK',source_url:source,
  provider_status:state,provider_checked:true,read_only:true,
  production_changed:false,observed_at:new Date().toISOString(),
  provider_id:data.id,
  source_title:String(data.title||data.name||'').replace(/[\u0000-\u001f]/g,' ').slice(0,180)};
}
async function readPreflight(db,{fetchImpl=fetch}={}){
 const claim=await shiftRpc(db,'reality_read_owner_genuine_loop_v1',
  {p_owner_id:db._claimed_owner_id},{fetchImpl});
 const receipts=await shiftRpc(db,'reality_read_owner_final_receipts_v1',
  {p_owner_id:db._claimed_owner_id},{fetchImpl});
 if(claim.status!=='OWNER_GOVERNED_LOOP_READBACK'||
  !Array.isArray(claim.jobs)||claim.jobs.length>12||
  claim.owner_installation_authorized_by_read!==false||
  claim.external_action_performed!==false||!noProduction(claim)||
  receipts.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
  !Array.isArray(receipts.receipts)||receipts.receipts.length>12||
  receipts.does_not_authorize_actions!==true)
  throw Error('SHIFT_ORIGINAL_OWNER_PROVIDER_PREFLIGHT_UNTRUSTED');
 return {kind:'ORIGINAL_LEDGER_READBACK',provider_checked:true,
  owner_scope_verified:true,read_only:true,production_changed:false,
  observed_at:new Date().toISOString(),
  checked_original_jobs:claim.jobs.length,
  independent_final_receipts_read:receipts.receipts.length,
  no_new_authority_granted:true};
}
// A wake is NOT execution authority. This handoff is only eligible after an
// independently matched source/shift/queue readback, a matching wake receipt,
// and the shift's exact step-six gate. The injected trusted driver must
// independently recheck owner, time window, goal, provider effects and make
// its own globally single-use claim BEFORE invoking the shared executor.
function qualifiedOriginalDriverScope(reconciled,wake,claimed){
 if(reconciled?.status!=='EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED'||
  reconciled.governed_existing_work_status!==
   'EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY'||
  !UUID.test(reconciled.shift_id||'')||
  !/^work:[a-f0-9]{32}$/.test(reconciled.governed_original_work_id||'')||
  !UUID.test(reconciled.governed_trigger_id||'')||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/.test(reconciled.shift_observation_source_ref||'')||
  !/^sha256:[a-f0-9]{64}$/.test(reconciled.shift_observation_proof_sha256||'')||
  reconciled.governed_cycle_dispatched_by_shift!==false||
  reconciled.model_invoked_by_shift!==false||
  reconciled.new_customer_job_created!==false||
  reconciled.installation_authorized!==false||
  reconciled.production_changed!==false||
  wake?.status!=='EXISTING_REALITY_CAPABILITY_WAKE_RECORDED'||
  wake.shift_id!==reconciled.shift_id||
  wake.original_work_id!==reconciled.governed_original_work_id||
  wake.worker_execution_acknowledged!==false||
  wake.installation_authorized!==false||
  wake.original_job_completed!==false||
  wake.production_changed!==false||
  claimed?.status!=='EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED'||
  claimed.shift_id!==reconciled.shift_id)
  return null;
 return Object.freeze({
  shift_id:reconciled.shift_id,
  original_work_id:reconciled.governed_original_work_id,
  trigger_id:reconciled.governed_trigger_id,
  source_ref:reconciled.shift_observation_source_ref,
  source_proof_sha256:reconciled.shift_observation_proof_sha256,
  read_only:false,preflight_only:false,
  shift_read_does_not_grant_execution_authority:true,
  exact_trusted_original_preflight_required:true
 });
}
function assertOriginalDriverOutcome(out,scope){
 if(out?.status!=='SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK'||
  out.shift_id!==scope.shift_id||
  !Number.isSafeInteger(out.attempted)||out.attempted<0||out.attempted>4||
  !Number.isSafeInteger(out.independently_settled)||
  out.independently_settled<0||out.independently_settled>out.attempted||
  !Array.isArray(out.outcomes)||out.outcomes.length>4||
  !out.outcomes.some(x=>x?.original_work_id===scope.original_work_id)||
  out.outcomes.some(x=>!/^work:[a-f0-9]{32}$/.test(x?.original_work_id||'')||
   typeof x.status!=='string'||x.status.length>110||
   typeof x.original_job_settled!=='boolean')||
  new Set(out.outcomes.map(x=>x.original_work_id)).size!==out.outcomes.length||
  out.outcomes.filter(x=>x.original_job_settled).length!==out.independently_settled||
  out.installation_authorized!==false||
  out.production_changed!==false||
  out.shift_finished!==false||out.full_shift_proven!==false)
  throw Error('SHIFT_ORIGINAL_DRIVER_INDEPENDENT_OUTCOME_UNVERIFIED');
 return Object.freeze({
  status:out.status,shift_id:scope.shift_id,original_work_id:scope.original_work_id,
  attempted:out.attempted,independently_settled:out.independently_settled,
  outcomes:out.outcomes.map(x=>({
   original_work_id:x.original_work_id,status:x.status,
   original_job_settled:x.original_job_settled===true
  })),
  installation_authorized:false,production_changed:false,
  full_shift_proven:false
 });
}
export async function processGovernedEmployeeShiftTick(db,{fetchImpl=fetch,
 wakeCapability=wakeExistingRileyCapabilityJob,
 wakeMultiple=wakeExistingRileyShiftCapabilityBatch,
 executeQualifiedOriginals=null,coordinateRoleWork=null}={}){
 if(typeof wakeCapability!=='function'||typeof wakeMultiple!=='function')
  throw Error('SHIFT_CAPABILITY_WAKE_ADAPTER_REQUIRED');
 if(executeQualifiedOriginals!==null&&typeof executeQualifiedOriginals!=='function')
  throw Error('SHIFT_ORIGINAL_DRIVER_ADAPTER_INVALID');
 if(coordinateRoleWork!==null&&typeof coordinateRoleWork!=='function')
  throw Error('SHIFT_SHARED_MODEL_ROLE_ADAPTER_INVALID');
 // An isolated one-step invocation; no arbitrary scheduling or execution.
 const closed=await shiftRpc(db,'reality_close_employee_shift_v1',{}, {fetchImpl});
 if(!['NO_SHIFT_DUE_FOR_CLOSE','EIGHT_HOUR_SHIFT_EVIDENCE_REPORT','EMPLOYEE_SHIFT_EVIDENCE_REPORT'].includes(closed.status))
  throw Error('SHIFT_CLOSE_READBACK_UNVERIFIED');
 const reconciled=await shiftRpc(db,'reality_reconcile_employee_shift_original_v1',
  {},{fetchImpl});
 if(!['NO_SHIFT_AWAITING_EXACT_WORK',
      'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
      'EXACT_SHIFT_ORIGINAL_RECEIPT_RECONCILED'].includes(reconciled.status))
  throw Error('SHIFT_FINAL_RECEIPT_RECONCILIATION_UNTRUSTED');
 // The reconciler identifies already-approved, still-unsettled original
 // work. A second service-only DB prewake readback checks that exact source
 // and capability queue before sending an idempotent wake. The existing
 // worker remains the ONLY capability executor and install authority is never
 // minted by the employee shift.
 let capabilityWake=null;
 if(reconciled.status==='EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED'){
  try{
   capabilityWake=reconciled.governed_existing_work_status===
    'AMBIGUOUS_ORIGINAL_SCOPE_NO_AUTOMATIC_SELECTION'?
     await wakeMultiple({db,reconciliation:reconciled,fetchImpl}):
     await wakeCapability({db,reconciliation:reconciled,fetchImpl});
  }catch(e){
   const raw=String(e?.message||'');
   capabilityWake={
    status:'EXACT_CAPABILITY_WAKE_REQUIRES_RECONCILIATION',
    reason_code:/^(?:RILEY_SHARED_WAKE_|RILEY_MULTI_WAKE_|RILEY_MULTI_JOB_|SHIFT_DATABASE_RPC_|GENUINE_WAKE_DISPATCH_)[A-Z0-9_]{3,110}$/.test(raw)?
     raw:'TRUSTED_WAKE_READBACK_UNAVAILABLE',
    worker_execution_acknowledged:false,installation_authorized:false,
    original_job_completed:false,production_changed:false
   };
  }
 }
 const claimed=await shiftRpc(db,'reality_claim_employee_shift_step_v1',{}, {fetchImpl});
 if(['NO_DUE_AUTHORIZED_SHIFT','NO_CLAIMABLE_STEP','INFLIGHT_LEASE_UNEXPIRED',
   'LEASE_EXHAUSTED_ESCALATED','STEP_BLOCKED_SHIFT_CONTINUES',
   'SHIFT_STEP_NOT_YET_DUE','EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',
   'SHIFT_FINAL_REPORT_NOT_DUE'].includes(claimed.status)){
  const scope=qualifiedOriginalDriverScope(reconciled,capabilityWake,claimed);
  // Absence of a trusted driver is a visible blocker, not a successful shift.
  // A wake/notification is never mistaken for a real executor result.
  const originalJobDriver=!scope?null:executeQualifiedOriginals===null?
   {status:'TRUSTED_ORIGINAL_DRIVER_NOT_CONNECTED',
    shift_id:scope.shift_id,original_work_id:scope.original_work_id,
    attempted:0,independently_settled:0,installation_authorized:false,
    production_changed:false}:
   assertOriginalDriverOutcome(await executeQualifiedOriginals(scope),scope);
  return {ok:true,status:claimed.status,
   shift_id:claimed.shift_id||null,
   upgrade_approval_channel:'EXISTING_REALITY_CHAT_ONLY',
   capability_wake:capabilityWake,
   original_job_driver:originalJobDriver,
   installation_authorized:false,job_completed:false,production_changed:false};
 }
 if(claimed.status!=='READ_ONLY_STEP_CLAIMED'||!UUID.test(claimed.shift_id||'')||
  !UUID.test(claimed.claim_id||'')||!UUID.test(claimed.owner_id||'')||
  !Number.isSafeInteger(claimed.step_index)||claimed.step_index<1||
  claimed.step_index>5||claimed.no_external_write_authority!==true)
  throw Error('SHIFT_WORKER_CLAIM_UNTRUSTED');
 let proof;
 if(claimed.step_index===1){
  if(claimed.source_ref!=null)throw Error('SHIFT_PREFLIGHT_SOURCE_MUST_BE_EMPTY');
  proof=await readPreflight({...db,_claimed_owner_id:claimed.owner_id},{fetchImpl});
 }else if(claimed.source_ref===null){
  proof={kind:'NO_SOURCE_AVAILABLE',source_available:false,
   source_url:null,provider_status:'UNASSIGNED_NO_SOURCE',
   provider_checked:false,read_only:true,
   production_changed:false,observed_at:new Date().toISOString()};
 }else proof=await readProviderSource(claimed.source_ref,{fetchImpl});
 if(claimed.step_index>=2&&claimed.step_index<=5&&
    proof.kind==='GITHUB_SOURCE_READBACK'){
  const ctx=Object.freeze({
   shift_id:claimed.shift_id,claim_id:claimed.claim_id,owner_id:claimed.owner_id,
   step_index:claimed.step_index,stage:claimed.stage,
   source_ref:claimed.source_ref,provider:proof,
   shift_step_claimed:true,read_only:true,
   installation_authorized:false,production_changed:false
  });
  let handoff;
  try{
   handoff=coordinateRoleWork?await coordinateRoleWork(ctx):
    unavailableRoleHandoff(ctx);
   if(handoff?.version!==COMBINED_ROLE_HANDOFF_VERSION||
      !['SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK',
       'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM'].includes(handoff.status)||
      handoff.shift_id!==claimed.shift_id||
      handoff.step_index!==claimed.step_index||
      handoff.source_ref!==claimed.source_ref||
      handoff.one_shared_openai_provider!==true||
      handoff.independent_verification_performed!==false||
      handoff.original_job_completed!==false||
      handoff.installation_authorized!==false||
      handoff.production_changed!==false||
      handoff.read_only!==true||
      !Array.isArray(handoff.roles)||handoff.roles.length<2||
      handoff.roles.length>3||
      !Number.isSafeInteger(handoff.model_invocations_completed)||
      handoff.model_invocations_completed<0||
      handoff.model_invocations_completed>1)
     throw Error('SHIFT_MODEL_ROLE_UNTRUSTED');
  }catch{
   // A model outage or malformed advisory does not falsify an independently
   // checked Github source. Record the missing advisory, not a fake success.
   handoff=unavailableRoleHandoff(ctx);
  }
  proof={...proof,combined_role_handoff:handoff};
 }
 const settled=await shiftRpc(db,'reality_settle_employee_shift_step_v1',{
  p_shift_id:claimed.shift_id,p_step_index:claimed.step_index,
  p_claim_id:claimed.claim_id,p_proof:proof},{fetchImpl});
 if(settled.status!=='READ_ONLY_PROVIDER_EVIDENCE_RECORDED'||
  settled.step_index!==claimed.step_index||
  !/^sha256:[a-f0-9]{64}$/.test(settled.proof_sha256||'')||
  settled.production_changed!==false||settled.original_job_completed!==false||
  settled.human_hours_saved!==null)
  throw Error('SHIFT_STEP_INDEPENDENT_SETTLEMENT_UNVERIFIED');
 return {ok:true,status:'READ_ONLY_SHIFT_STEP_SETTLED',
  shift_id:claimed.shift_id,step_index:claimed.step_index,
  source_status:proof.provider_status||'OWNER_LEDGER_CHECKED',
  evidence_digest:settled.proof_sha256,
  role_handoff_status:proof.combined_role_handoff?.status||
   'NO_SOURCE_ROLE_HANDOFF_APPLICABLE',
  role_handoff_function_labels:proof.combined_role_handoff?.roles||[],
  role_handoff_model_calls:proof.combined_role_handoff?.model_invocations_completed||0,
  role_handoff_not_independent_verification:true,
  capability_wake:capabilityWake,
  installation_authorized:false,job_completed:false,
  verified_human_hours_saved:null,production_changed:false};
}
