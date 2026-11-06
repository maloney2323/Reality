// Honest, authenticated readiness for Riley's FULL Reality-governed job loop.
// Readbacks are evidence, never a model instruction or employee execution
// warrant. No queue admission, shifts, installation, or settlement here.
export const RILEY_LOOP_READINESS_VERSION='reality-riley-live-loop-readiness-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9][0-9]*)$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const phases=new Set(['PENDING_FROZEN_REPRODUCTION',
 'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE']);
const result=(status,extra={})=>Object.freeze({
 version:RILEY_LOOP_READINESS_VERSION,
 status,diagnostic_only:true,worker_wake_dispatched_by_read:false,
 original_job_started_by_read:false,installation_authorized:false,
 original_job_settled_by_read:false,independent_final_receipt_recorded_by_read:false,
 production_changed:false,verified_human_hours_saved:null,...extra
});
export function identifyExactRileyOriginalCandidates({shiftReadback,loop}={}){
 if(shiftReadback?.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
  shiftReadback?.work_installation_authorized_by_read!==false||
  shiftReadback.production_changed!==false||
  !Array.isArray(shiftReadback.shifts)||shiftReadback.shifts.length>5||
  loop?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
  loop.owner_installation_authorized_by_read!==false||
  loop.external_action_performed!==false||
  loop.production_changed!==false||
  !Array.isArray(loop.jobs)||loop.jobs.length>12)
  throw Error('RILEY_READINESS_OWNER_READBACK_UNVERIFIED');
 const active=shiftReadback.shifts.filter(s=>
  ['RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)&&
  UUID.test(s.shift_id||'')&&Array.isArray(s.steps)&&s.steps.length===8&&
  s.steps[5].state==='AWAITING_EXACT_WORK');
 const seen=new Set(),matches=[];
 for(const shift of active){
  for(const step of shift.steps){
   const m=ISSUE.exec(step.source_ref||'');
   if(!m||step.state!=='SOURCE_CHECKED'||!SHA.test(step.proof_sha256||''))continue;
   const issue=Number(m[1]);
   const jobs=loop.jobs.filter(j=>
    j.source_issue_number===issue&&WORK.test(j.original_work_id||'')&&
    UUID.test(j.trigger_id||'')&&phases.has(j.phase)&&
    j.independently_settled===false&&j.owner_install_approved===false&&
    j.environment==='ISOLATED_PREVIEW');
   if(jobs.length!==1)continue;
   const job=jobs[0],key=shift.shift_id+':'+job.original_work_id;
   if(seen.has(key))continue;
   seen.add(key);
   matches.push(Object.freeze({
    shift_id:shift.shift_id,original_work_id:job.original_work_id,
    trigger_id:job.trigger_id,source_ref:step.source_ref,
    proof_sha256:step.proof_sha256,source_issue_number:issue
   }));
  }
 }
 if(matches.length>12)throw Error('RILEY_READINESS_TOO_MANY_CANDIDATES');
 return {active_shifts:active.length,candidates:matches};
}
export function renderRileyLoopReadiness({activeShiftCount,candidates,verified=[]}={}){
 if(!Number.isInteger(activeShiftCount)||activeShiftCount<0||activeShiftCount>5||
   !Array.isArray(candidates)||candidates.length>12||
   !Array.isArray(verified)||verified.length>12)
  throw Error('RILEY_READINESS_SOURCE_INVALID');
 if(!activeShiftCount)return result('NO_ACTIVE_AUTHORIZED_RILEY_SHIFT',{
  missing_gate:'OWNER_SIGNED_SHIFT_AND_CURRENT_ORIGINAL_JOB',
  explanation:'No active authorized shift. Historical read-only shifts are not executable original jobs.'});
 if(!candidates.length)return result('NO_NEW_QUALIFIED_SHIFT_BOUND_ORIGINAL_JOB',{
  missing_gate:'QUALIFIED_OWNER_AUTHORIZED_ORIGINAL_JOB',
  explanation:'An employee shift alone does not authorize a new original job or capability installation.'});
 if(candidates.length!==1)return result('AMBIGUOUS_ORIGINAL_JOB_NO_AUTO_SELECTION',{
  missing_gate:'ONE_EXACT_ORIGINAL_JOB',
  explanation:'Multiple candidate jobs cannot be selected automatically.'});
 const candidate=candidates[0];
 const approved=verified.filter(x=>
  x?.status==='EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE'&&
  x.shift_id===candidate.shift_id&&
  x.original_work_id===candidate.original_work_id&&
  x.trigger_id===candidate.trigger_id&&
  x.source_ref===candidate.source_ref&&
  x.source_proof_sha256===candidate.proof_sha256&&
  x.existing_job_only===true&&x.installation_authorized===false&&
  x.original_job_completed===false&&x.production_changed===false);
 if(approved.length!==1)return result('EXACT_ORIGINAL_WAKE_NOT_CURRENTLY_ELIGIBLE',{
  missing_gate:'SERVICE_ROLE_INDEPENDENT_ORIGINAL_WORK_READBACK',
  explanation:'Current database authority does not permit this candidate to wake.'});
 return result('EXACT_AUTHORIZED_EXISTING_JOB_ELIGIBLE_FOR_WAKE',{
  missing_gate:null,
  original_work_id:candidate.original_work_id,
  shift_id:candidate.shift_id,
  explanation:'Eligibility is verified. Worker dispatch, atomic claim, actual execution and final receipt are separate proofs.',
  worker_claim_acknowledged:false
 });
}
