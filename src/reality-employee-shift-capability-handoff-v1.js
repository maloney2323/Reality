// Read-only join across independently trusted owner-scoped DB readbacks.
// A verified candidate is offered through EXISTING Reality Chat approval.
// No new installation button, auto-consent, model authority or fabricated job.
import {assessTwoAuthorizationExecutionPreflight} from './reality-two-authorization-execution-preflight-v1.js';
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9][0-9]*)$/;
export function findEmployeeShiftCapabilityHandoffs({ownerShifts,qualified,loop}){
 if(!Array.isArray(ownerShifts)||ownerShifts.length>5||
   !Array.isArray(qualified)||qualified.length>20||
   !loop||loop.status!=='OWNER_GOVERNED_LOOP_READBACK'||
   loop.owner_installation_authorized_by_read!==false||
   loop.external_action_performed!==false||loop.production_changed!==false||
   !Array.isArray(loop.jobs)||loop.jobs.length>12)
   throw Error('SHIFT_CAPABILITY_OWNER_SOURCE_UNTRUSTED');
 const out=[];
 for(const shift of ownerShifts){
  if(!['RUNNING','AWAITING_EXACT_ORIGINAL_WORK','QUEUED'].includes(shift.status))continue;
  for(const step of shift.steps){
   const m=ISSUE.exec(step.source_ref||'');
   if(!m)continue;
   const issue=Number(m[1]);
   const matchingJobs=loop.jobs.filter(j=>j.source_issue_number===issue&&
    WORK.test(j.original_work_id||'')&&j.candidate_verified===true&&
    j.environment==='ISOLATED_PREVIEW'&&j.owner_install_approved===false&&
    j.independently_settled!==true);
   for(const job of matchingJobs){
    const eligible=qualified.filter(q=>
     q.original_work_id===job.original_work_id&&
     q.approval==null&&q.phase==='AWAITING_OWNER_APPROVAL'&&
     HASH.test(q.qualification?.artifact_sha256||'')&&
     assessTwoAuthorizationExecutionPreflight(q).approval_gate_open===true);
    if(eligible.length!==1)continue;
    out.push(Object.freeze({
     status:'EXACT_VERIFIED_CAPABILITY_APPROVAL_READY_IN_REALITY_CHAT',
     shift_id:shift.shift_id,step_index:step.step_index,
     original_work_id:job.original_work_id,
     capability_id:eligible[0].capability_id,
     artifact_sha256:eligible[0].qualification.artifact_sha256,
     source_issue_number:issue,source_ref:step.source_ref,
     installation_approved:false,
     approval_action:'OPEN_EXISTING_REALITY_CHAT_EXACT_UPGRADE_APPROVAL',
     automatic_installation_without_owner:false,
     continuation_after_installation:'EXISTING_GOVERNED_WAKE_AND_INDEPENDENT_RECEIPT',
     shift_job_completion_verified:false
    }));
   }
  }
 }
 if(out.length>12)throw Error('SHIFT_TOO_MANY_APPROVAL_REQUESTS');
 return Object.freeze(out);
}
