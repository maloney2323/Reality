// Evidence-bound diagnosis of Riley's shift continuation handoff.
// This does not synthesize a repair, admit a job, install code or wake workers.
// The governed capability engine owns repair and same-original-job continuation.
export const EMPLOYEE_RECOVERY_ROUTE_VERSION='reality-employee-recovery-route-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{64}$/;
const statuses=new Set(['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK',
 'ENDED_WITH_BLOCKED_WORK','ENDED_WITH_VERIFIED_JOB','ENDED_READ_ONLY','ESCALATED']);
const states=new Set(['QUEUED','CLAIMED','SOURCE_CHECKED','AWAITING_EXACT_WORK',
 'ORIGINAL_JOB_RECEIPT_VERIFIED','BLOCKED_PROVIDER','REPORTED']);
function safeShift(s){
 return UUID.test(s?.shift_id||'')&&statuses.has(s?.status)&&
  Array.isArray(s.steps)&&s.steps.length===8&&
  s.steps.every((x,i)=>x?.step_index===i+1&&states.has(x.state));
}
const response=(shift_id,status,next,extra={})=>Object.freeze({
 version:EMPLOYEE_RECOVERY_ROUTE_VERSION,
 status,shift_id,diagnostic_only:true,
 next_verified_action:next,
 existing_capability_engine:'REALITY_GENUINE_CAPABILITY_ENGINE_V1',
 worker_has_direct_original_job_execution_connection:false,
 original_job_identity_preserved:true,
 eligible_for_auto_install:false,
 owner_installation_approval_bypassed:false,
 worker_wake_executed_by_diagnosis:false,
 new_original_job_created:false,
 model_generation_started_by_diagnosis:false,
 real_job_completed_by_diagnosis:false,
 verified_human_hours_saved:null,
 production_changed:false,...extra
});
export function diagnoseRealityEmployeeRecovery({shifts,handoffs=[]}={}){
 if(!Array.isArray(shifts)||shifts.length>5||shifts.some(s=>!safeShift(s))||
    !Array.isArray(handoffs)||handoffs.length>12)
  throw Error('EMPLOYEE_RECOVERY_SOURCE_UNTRUSTED');
 if(!shifts.length)return response(null,'NO_EMPLOYEE_SHIFT_AUTHORIZED',
  'Authorize an exact owner-scoped shift before expecting employee execution.');
 const shift=shifts[0],id=shift.shift_id;
 const approvals=handoffs.filter(h=>
  h?.shift_id===id&&h.status==='EXACT_VERIFIED_CAPABILITY_APPROVAL_READY_IN_REALITY_CHAT'&&
  h.installation_approved===false&&WORK.test(h.original_work_id||'')&&
  SHA.test(h.artifact_sha256||''));
 if(approvals.length>1&&new Set(approvals.map(h=>h.original_work_id)).size!==approvals.length)
  throw Error('EMPLOYEE_RECOVERY_DUPLICATE_APPROVAL');
 const originalVerified=shift.steps[5]?.state==='ORIGINAL_JOB_RECEIPT_VERIFIED';
 if(shift.status==='ENDED_WITH_VERIFIED_JOB'){
  if(!originalVerified)throw Error('EMPLOYEE_RECOVERY_SETTLEMENT_CONTRADICTION');
  return response(id,'ORIGINAL_JOB_SETTLEMENT_EVIDENCED',
    'Preserve final original-job receipt; do not replay settled work.',
    {matched_original_job_receipt:true});
 }
 if(['ENDED_READ_ONLY','ENDED_WITH_BLOCKED_WORK'].includes(shift.status))
  return response(id,'SHIFT_ENDED_NOT_AUTONOMOUSLY_COMPLETED',
   'Review original-job and provider receipts. Start no duplicate job or shift without a fresh governed authorization.');
 if(shift.status==='ESCALATED')
  return response(id,'LEASE_OR_PROVIDER_ESCALATED',
   'Keep the durable claim and provider-failure evidence. Investigate and recover only after proving no uncertain side effect or duplicate execution.');
 if(approvals.length)
  return response(id,'VERIFIED_UPGRADE_WAITING_EXACT_OWNER_APPROVAL',
   'Present the exact independently verified candidate in existing Reality Chat. After one approval, rely on the existing governed installer and original-job receipt.',
   {pending_exact_owner_approvals:approvals.map(h=>({
     original_work_id:h.original_work_id,capability_id:h.capability_id,
     artifact_sha256:h.artifact_sha256
   }))});
 if(shift.status==='AWAITING_EXACT_ORIGINAL_WORK'||
    shift.steps.some(x=>x.state==='AWAITING_EXACT_WORK'))
  return response(id,'ORIGINAL_JOB_HANDOFF_NOT_CONNECTED',
   'Independently qualify an outstanding original job, prove owner authorization and connect it to the existing governed capability-engine execution handoff. Continue safe read-only work while this gate is unresolved.');
 if(shift.status==='QUEUED')
  return response(id,'WAITING_TRUSTED_SCHEDULED_WORKER',
   'Await a signed worker claim and source-readback receipt; a queued shift is not a running employee.');
 if(shift.steps.some(x=>x.state==='BLOCKED_PROVIDER'))
  return response(id,'PROVIDER_BLOCKED_CONTINUE_BOUNDED_WORK',
   'Retain failure evidence, reobserve through the trusted provider, and continue only other eligible authorized work. Never infer a missing capability from a transient outage.');
 return response(id,'READ_ONLY_SHIFT_EXECUTING',
  'Continue existing signed source checks; verify an exact original job before invoking the governed capability engine.');
}
