// Multi-job shift ORCHESTRATOR, not a new worker or authority.
 // Trusted server adapters and Reality's existing governed executor are the
 // only path to execution. Service-role SQL claims are atomic and global
 // per original work, preventing duplicate execution across worker restarts.
 // This module never installs upgrades, changes production, or fabricates ROI.
import {assertShiftReadback,shiftRpc}
 from './reality-governed-shift-boundary-v1.js';
import {runRileyOriginalJobViaReality}
 from './reality-riley-governed-original-job-v1.js';
export const RILEY_MULTI_JOB_SHIFT_VERSION='reality-riley-governed-multi-job-shift-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const RESULT=new Set(['ORIGINAL_JOB_AUTHORIZATION_BLOCKED',
 'ORIGINAL_JOB_OUTCOME_NEEDS_DURABLE_SETTLEMENT',
 'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF',
 'ORIGINAL_JOB_UNRESOLVED_NO_UNSAFE_RETRY',
 'EXECUTION_PROVIDER_EFFECT_UNKNOWN']);
const fail=x=>{throw Error('RILEY_MULTI_JOB_'+x)};
const guardJob=(c,shiftId,ownerId)=>c?.shift_id===shiftId&&
 c.owner_id===ownerId&&WORK.test(c.original_work_id||'')&&
 UUID.test(c.trigger_id||'')&&UUID.test(c.source_event_id||'')&&
 ISSUE.test(c.source_ref||'')&&SHA.test(c.source_proof_sha256||'')&&
 Number.isInteger(c.source_step_index)&&c.source_step_index>=2&&
 c.source_step_index<=5&&c.current_owner_scope_verified===true&&
 c.independently_settled===false&&c.installation_authorized===false&&
 c.production_changed===false;
export function verifyRileyMultiJobEligibility({
 shiftReadback,ownerLedgerReadback,ownerId,shiftId,eligibility,now=new Date()
}={}){
 assertShiftReadback(shiftReadback);
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !Number.isFinite(now?.getTime?.())||
  ownerLedgerReadback?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
  ownerLedgerReadback.owner_installation_authorized_by_read!==false||
  ownerLedgerReadback.external_action_performed!==false||
  ownerLedgerReadback.production_changed!==false||
  !Array.isArray(ownerLedgerReadback.jobs)||ownerLedgerReadback.jobs.length>12)
  fail('TRUSTED_OWNER_SCOPE_REQUIRED');
 const selected=shiftReadback.shifts.filter(x=>x.shift_id===shiftId);
 if(selected.length!==1)fail('EXACT_SHIFT_REQUIRED');
 const shift=selected[0];
 const within=Number(new Date(shift.planned_start_at))<=now.getTime()&&
  Number(new Date(shift.planned_end_at))>now.getTime();
 if(!within||!['RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(shift.status)||
   shift.steps[5].state!=='AWAITING_EXACT_WORK')
  fail('CURRENT_EXECUTION_SHIFT_GATE_REQUIRED');
 if(eligibility?.status!=='EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED'||
  eligibility.shift_id!==shiftId||
  eligibility.execution_authorized!==false||
  eligibility.installation_authorized!==false||
  eligibility.production_changed!==false||
  !Array.isArray(eligibility.candidates)||eligibility.candidates.length>4||
  eligibility.candidate_count!==eligibility.candidates.length)
  fail('SERVICE_ONLY_MULTI_JOB_DISCOVERY_REQUIRED');
 const seen=new Set(),result=[];
 for(const c of eligibility.candidates){
  if(!guardJob(c,shiftId,ownerId)||seen.has(c.original_work_id))
   fail('EXACT_UNIQUE_GOVERNED_ORIGINAL_REQUIRED');
  seen.add(c.original_work_id);
  const step=shift.steps[c.source_step_index-1];
  if(step.state!=='SOURCE_CHECKED'||step.source_ref!==c.source_ref||
     step.proof_sha256!==c.source_proof_sha256)
   fail('LIVE_PROVIDER_SOURCE_DIGEST_CHANGED');
  const jobs=ownerLedgerReadback.jobs.filter(j=>
   j.original_work_id===c.original_work_id);
  if(jobs.length!==1||
    jobs[0].source_issue_number!==Number(ISSUE.exec(c.source_ref)?.[0]?.split('/').at(-1))||
    jobs[0].environment!=='ISOLATED_PREVIEW'||
    jobs[0].independently_settled!==false||
    jobs[0].owner_install_approved!==false||
    !['PENDING_FROZEN_REPRODUCTION','EVIDENCE_RECONCILIATION_REQUIRED',
     'FROZEN_REPRODUCED_AWAITING_CANDIDATE'].includes(jobs[0].phase))
   fail('ORIGINAL_OWNER_LEDGER_NOT_ELIGIBLE');
  result.push(Object.freeze({...c}));
 }
 // Multiple genuinely independent original IDs may be worked in one shift;
 // this is NOT a single step-six job receipt or permission to reuse old work.
 return Object.freeze(result);
}
const rpc=async({db,name,args,fetchImpl})=>shiftRpc(db,name,args,{fetchImpl});
export async function runRileyGovernedMultiJobShiftTick({
 db,ownerId,shiftId,fetchImpl=fetch,
 loadShiftReadback,loadOwnerLedgerReadback,
 loadTrustedAuthorizedOriginal,
 callRpc=rpc,runOriginal=runRileyOriginalJobViaReality,
 now=()=>new Date(),maxJobs=4
}={}){
 if(!db||!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !Number.isInteger(maxJobs)||maxJobs<1||maxJobs>4||
  [loadShiftReadback,loadOwnerLedgerReadback,
   loadTrustedAuthorizedOriginal,callRpc,runOriginal,now]
   .some(x=>typeof x!=='function'))
  fail('TRUSTED_SERVER_ADAPTERS_REQUIRED');
 const shiftReadback=await loadShiftReadback({db,ownerId});
 const ownerLedgerReadback=await loadOwnerLedgerReadback({db,ownerId});
 const raw=await callRpc({db,fetchImpl,
  name:'reality_read_eligible_shift_originals_v1',
  args:{p_shift_id:shiftId}});
 if(raw?.status==='NO_ACTIVE_OWNER_SHIFT_FOR_MULTI_JOB')
  return Object.freeze({version:RILEY_MULTI_JOB_SHIFT_VERSION,
   status:'NO_ACTIVE_SHIFT_NO_WORK_EXECUTED',
   shift_id:shiftId,attempted:0,independently_settled:0,
   installation_authorized:false,production_changed:false});
 const eligible=verifyRileyMultiJobEligibility({
  shiftReadback,ownerLedgerReadback,ownerId,shiftId,eligibility:raw,now:now()});
 const outcomes=[],count=Math.min(eligible.length,maxJobs);
 for(let i=0;i<count;i++){
  const c=eligible[i];
  // Validate the exact trusted, owner-bound original BEFORE taking the
  // globally unique one-shot DB claim. Missing execution adapters must not
  // consume a job or leave it permanently stuck as an uncertain effect.
  let job;
  try{
   job=await loadTrustedAuthorizedOriginal(Object.freeze({
    owner_id:ownerId,shift_id:shiftId,
    original_work_id:c.original_work_id,
    trigger_id:c.trigger_id,claim_id:null,
    source_ref:c.source_ref,read_only:true,preflight_only:true
   }));
   if(!job||job.qualifiedOriginal?.original_work_id!==c.original_work_id||
     job.qualifiedOriginal.owner_id!==ownerId||
     job.qualifiedOriginal.source_issue_number!==
      Number(c.source_ref.split('/').at(-1))||
     job.scope?.original_work_id!==c.original_work_id||
     job.scope.owner_id!==ownerId||
     job.workItem?.work_item_id!==c.original_work_id)
    fail('TRUSTED_ORIGINAL_JOB_LOADER_MISMATCH');
   if(runOriginal===runRileyOriginalJobViaReality&&
     (typeof job.engine?.run!=='function'||
      typeof job.persistAndReadback!=='function'||
      typeof job.connector?.execute!=='function'||
      typeof job.independentVerifier?.verify!=='function'||
      typeof job.authorization!=='object'))
    fail('REALITY_SHARED_EXECUTION_ADAPTERS_UNAVAILABLE');
  }catch{
   outcomes.push(Object.freeze({
    original_work_id:c.original_work_id,
    status:'ORIGINAL_TRUSTED_PREFLIGHT_BLOCKED_NO_CLAIM',
    original_job_settled:false,owner_approval_required:false
   }));
   continue;
  }
  // Claim must precede ANY consequential executor effect. Provider and
  // owner readbacks inside that claim recheck eligibility after preflight.
  const claim=await callRpc({db,fetchImpl,
   name:'reality_claim_exact_shift_original_v1',
   args:{p_shift_id:shiftId,p_original_work_id:c.original_work_id,
    p_trigger_id:c.trigger_id}});
  if(claim?.status==='ORIGINAL_ALREADY_CLAIMED_NO_AUTOMATIC_REPLAY'||
     claim?.status==='EXACT_SHIFT_JOB_CLAIM_DENIED'){
   outcomes.push(Object.freeze({original_work_id:c.original_work_id,
    status:'ORIGINAL_NOT_REEXECUTED',original_job_settled:false}));
   continue;
  }
  if(claim?.status!=='EXACT_EXISTING_SHIFT_ORIGINAL_CLAIMED'||
    claim.shift_id!==shiftId||claim.owner_id!==ownerId||
    claim.trigger_id!==c.trigger_id||
    claim.original_work_id!==c.original_work_id||
    !UUID.test(claim.claim_id||'')||
    claim.original_execution_completed!==false||
    claim.owner_installation_authorized!==false||
    claim.production_changed!==false)
   fail('ATOMIC_CLAIM_UNTRUSTED_NO_EXECUTION');
  // Trusted server-side loader must supply all credentials, execution
  // approval, goal and same-original-job scope from provider DB, never from
  // browser, model or GitHub text. The shared executor re-verifies all.
  let status='EXECUTION_PROVIDER_EFFECT_UNKNOWN';
  try{
   const result=await runOriginal({
    ...job,ownerId,shiftId,shiftReadback,ownerLedgerReadback
   });
   if(result?.original_work_id!==c.original_work_id||
      result.shift_id!==shiftId||
      result.installation_authorized_by_employee!==false||
      result.original_job_settled!==false||
      result.independently_verified_final_receipt!==false||
      result.no_new_original_job_created!==true||
      result.production_changed!==false||
      !RESULT.has(result.status)||
      result.status==='EXECUTION_PROVIDER_EFFECT_UNKNOWN')
    fail('REALITY_SHARED_EXECUTOR_RESULT_UNVERIFIED');
   status=result.status;
  }catch{
   // Never retry an uncertain effect. Durably reconcile this original,
   // then continue with separately authorized work only if write succeeds.
   status='EXECUTION_PROVIDER_EFFECT_UNKNOWN';
  }
  const receipt=await callRpc({db,fetchImpl,
   name:'reality_record_exact_shift_original_outcome_v1',
   args:{p_shift_id:shiftId,p_original_work_id:c.original_work_id,
    p_claim_id:claim.claim_id,p_status:status}});
  if(receipt?.status!=='SHIFT_ORIGINAL_OUTCOME_DURABLY_RECORDED'||
     receipt.original_work_id!==c.original_work_id||
     receipt.claim_id!==claim.claim_id||
     receipt.last_execution_status!==status||
     receipt.original_job_settled!==false||
     receipt.installation_authorized!==false||
     receipt.production_changed!==false)
   fail('DURABLE_ORIGINAL_OUTCOME_READBACK_REQUIRED_STOP_SHIFT_TICK');
  const reconciliation=await callRpc({db,fetchImpl,
    name:'reality_reconcile_exact_shift_original_receipt_v1',
    args:{p_shift_id:shiftId,p_original_work_id:c.original_work_id}});
  if(!['NO_INDEPENDENT_ORIGINAL_RECEIPT_YET',
    'EXACT_ORIGINAL_RECEIPT_INDEPENDENTLY_RECONCILED'].includes(reconciliation?.status)||
     reconciliation.original_work_id!==c.original_work_id||
     reconciliation.installation_authorized!==false||
     reconciliation.production_changed!==false)
   fail('INDEPENDENT_FINAL_RECEIPT_READBACK_REQUIRED_STOP_SHIFT_TICK');
  outcomes.push(Object.freeze({
   original_work_id:c.original_work_id,
   status:reconciliation.status==='EXACT_ORIGINAL_RECEIPT_INDEPENDENTLY_RECONCILED'?
    'INDEPENDENT_ORIGINAL_SETTLEMENT_CONFIRMED':status,
   original_job_settled:reconciliation.status==='EXACT_ORIGINAL_RECEIPT_INDEPENDENTLY_RECONCILED',
   owner_approval_required:status==='SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF',
   uncertain_provider_effect:status==='EXECUTION_PROVIDER_EFFECT_UNKNOWN'
  }));
 }
 return Object.freeze({
  version:RILEY_MULTI_JOB_SHIFT_VERSION,
  status:'SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK',
  shift_id:shiftId,candidates_seen:eligible.length,
  attempted:outcomes.filter(x=>!['ORIGINAL_NOT_REEXECUTED',
   'ORIGINAL_TRUSTED_PREFLIGHT_BLOCKED_NO_CLAIM'].includes(x.status)).length,
  independently_settled:outcomes.filter(x=>x.original_job_settled).length,
  outcomes:Object.freeze(outcomes),
  shift_finished:false,full_shift_proven:false,
  installation_authorized:false,production_changed:false,
  verified_human_hours_saved:null
 });
}
