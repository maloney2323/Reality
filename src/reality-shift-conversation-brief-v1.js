// Deterministic, owner-readback-grounded shift conversation. These are
// evidence-state explanations, NOT fabricated model thoughts or job outcomes.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const VALID=new Set(['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK',
 'ENDED_WITH_BLOCKED_WORK','ENDED_WITH_VERIFIED_JOB','ENDED_READ_ONLY','ESCALATED']);
const STEPS=[
 'Preflight: original-job evidence and overlap',
 'Validate the tracked issue',
 'Check a separate provider observation',
 'Review pending changes and dependencies',
 'Qualify the next source-backed opportunity',
 'Exact governed original-job execution gate',
 'Independent original-job acceptance',
 'End-of-shift evidence report'
];
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const isTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const safeDate=x=>isTime(x)?new Date(x).toISOString():null;
function eventFor(t){
 if(t.state==='SOURCE_CHECKED'){
  const status=typeof t.source_status==='string'&&t.source_status.length<=40?
   t.source_status.replaceAll('_',' ').toLowerCase():'source state observed';
  return {code:'SOURCE_VALIDATED',step_index:t.step_index,
   text:t.step_index===1?
    'Preflight evidence checked; this did not execute or repair an original job.':
    'Checked provider source: '+status+'. This verifies the observation, not that a defect was repaired.',
   observed_at:safeDate(t.completed_at),
   source_url:SOURCE.test(t.source_ref||'')?t.source_ref:null,
   proof_sha256:/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256||'')?t.proof_sha256:null};
 }
 if(t.state==='ORIGINAL_JOB_RECEIPT_VERIFIED')
  return {code:'ORIGINAL_RECEIPT_MATCHED',step_index:t.step_index,
   text:'An original-job final receipt was independently matched to this shift. Human-hours saved remain unmeasured.',
   observed_at:safeDate(t.completed_at),source_url:null,
   proof_sha256:/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256||'')?t.proof_sha256:null};
 if(t.state==='BLOCKED_PROVIDER'&&t.source_status==='VERIFIED_HISTORICAL_NOOP'){
  // A historical verified no-op is not a provider outage, a new original
  // settlement, or completed customer labor. Both gated steps share one proof.
  if(t.step_index!==6)return null;
  return {code:'HISTORICAL_NOOP_VERIFIED',step_index:t.step_index,
   text:'Reality independently verified that the historical reconciliation was already complete. It did not replay the current original job or claim a new final receipt.',
   observed_at:safeDate(t.completed_at),source_url:null,
   proof_sha256:/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256||'')?t.proof_sha256:null};
 }
 if(t.state==='BLOCKED_PROVIDER')
  return {code:'STEP_BLOCKED',step_index:t.step_index,
   text:'Provider evidence could not be completed safely. Reality preserved the blocked observation and continues other authorized work.',
   observed_at:safeDate(t.completed_at),source_url:null,proof_sha256:null};
 if(t.state==='REPORTED')
  return {code:'SHIFT_REPORT_RECORDED',step_index:t.step_index,
   text:'The end-of-shift report was recorded. This is not proof of eight hours saved.',
   observed_at:safeDate(t.completed_at),source_url:null,
   proof_sha256:/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256||'')?t.proof_sha256:null};
 return null;
}
export function buildRealityShiftConversationBrief(shifts,handoffs=[],now=new Date()){
 if(!Array.isArray(shifts)||shifts.length>5||!Array.isArray(handoffs)||
  handoffs.length>12||!Number.isFinite(now.getTime()))
  throw Error('SHIFT_CHAT_SOURCE_UNTRUSTED');
 if(!shifts.length)return Object.freeze({
  version:'reality-shift-conversation-v1',status:'NO_SHIFT_AUTHORIZED',
  shift_id:null,headline:'No employee shift has been authorized yet.',
  what_finished:'The planner can prepare an 8-, 10-, or 12-hour draft, but no shift work has been recorded.',
  current:'Not running.',next:'Build and review a shift, then approve its exact scope.',
  needs_you:'No capability installation approval is pending for a shift.',
  planned_start_at:null,as_of:now.toISOString(),
  verified_source_checks:0,verified_original_job_receipts:0,
  complete_shift_proven:false,verified_human_hours_saved:null,
  events:[],approval_pending:false,read_only:true,
  production_changed:false});
 const s=shifts[0];
 if(!UUID.test(s?.shift_id||'')||!VALID.has(s.status)||
  !isTime(s.planned_start_at)||!isTime(s.planned_end_at)||
  !Array.isArray(s.steps)||s.steps.length!==8||
  s.steps.some((t,i)=>t.step_index!==i+1||
    !['QUEUED','CLAIMED','SOURCE_CHECKED','AWAITING_EXACT_WORK',
       'ORIGINAL_JOB_RECEIPT_VERIFIED','BLOCKED_PROVIDER','REPORTED'].includes(t.state)||
    (t.proof_sha256!==null&&!/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256||''))))
  throw Error('SHIFT_CHAT_SOURCE_UNTRUSTED');
 const start=new Date(s.planned_start_at).getTime();
 const durationHours=(new Date(s.planned_end_at).getTime()-start)/3600000;
 if(![8,10,12].includes(durationHours))throw Error('SHIFT_CHAT_DURATION_INVALID');
 const originalReceipt=s.steps.some(t=>t.step_index===6&&t.state==='ORIGINAL_JOB_RECEIPT_VERIFIED');
 const eventItems=s.steps.map(eventFor).filter(Boolean);
 const recorded=eventItems.filter(x=>x.code==='SOURCE_VALIDATED').length;
 const recent=[...eventItems].sort((a,b)=>{
  const ta=Date.parse(a.observed_at||'')||0,tb=Date.parse(b.observed_at||'')||0;
  return tb-ta||b.step_index-a.step_index;
 }).slice(0,5);
 const historicalNoop=s.steps[5]?.state==='BLOCKED_PROVIDER'&&
  s.steps[5]?.source_status==='VERIFIED_HISTORICAL_NOOP'&&
  s.steps[6]?.state==='BLOCKED_PROVIDER'&&
  s.steps[6]?.source_status==='VERIFIED_HISTORICAL_NOOP';
 const firstPending=s.steps.find(t=>t.state==='QUEUED'||t.state==='CLAIMED'||
  t.state==='AWAITING_EXACT_WORK'||
  (t.state==='BLOCKED_PROVIDER'&&t.source_status!=='VERIFIED_HISTORICAL_NOOP'));
 const timeNext=now.getTime()<start?safeDate(s.planned_start_at):null;
 const exact=handoffs.filter(h=>h?.shift_id===s.shift_id&&
  h.status==='EXACT_VERIFIED_CAPABILITY_APPROVAL_READY_IN_REALITY_CHAT'&&
  h.installation_approved===false&&
  /^work:[a-f0-9]{32}$/.test(h.original_work_id||'')&&
  /^[a-f0-9]{64}$/.test(h.artifact_sha256||''));
 const pending=exact.length>0;
 let current,next;
 if(s.status==='QUEUED'&&now.getTime()<start){
  current='Scheduled, not started. The first source check has not run.';
  next='At the scheduled start, check original-job evidence and duplicate work automatically.';
 }else if(s.status==='QUEUED'){
  current='Scheduled start has passed. No completed source check is recorded yet.';
  next='Await the next trusted worker wake and an actual source-check receipt.';
 }else if(s.status==='AWAITING_EXACT_ORIGINAL_WORK'){
  current='The exact original-job action awaits independent qualification or authorization. Other eligible read-only work proceeds without artificial delays.';
  next=pending?'Review the exact verified upgrade in Reality Chat. After your approval, the existing governed installer handles continuation.':
   'Reality must independently qualify and bind an eligible original job before execution can continue.';
 }else if(historicalNoop&&s.status==='RUNNING'){
  current='Governed recovery verified the historical reconciliation was already completed. Reality safely cleared the conditional execution gate without replaying or settling this original job.';
  next='Continue any remaining authorized work. If no eligible work remains, the signed worker retains the shift boundary and records an honest report at the approved end.';
 }else if(s.status==='ESCALATED'){
  current='A prior source-check or lease problem needs investigation; independent wake/recovery continues within this authorization.';
  next='Review blocked provider evidence. Do not assume that the scheduled workload completed.';
 }else if(s.status.startsWith('ENDED_')){
  current='The scheduled shift window has ended; the database recorded its final state.';
  next='Review recorded receipts and unresolved work before planning another shift.';
 }else if(firstPending?.state==='CLAIMED'){
  current='Worker claimed '+STEPS[firstPending.step_index-1]+'. A provider receipt is still pending.';
  next='Wait for an independently recorded evidence result; a claim alone is not completion.';
 }else if(firstPending){
  current=recorded+' source checks recorded. Eligible work is claimable on the next trusted worker wake, without scheduled gaps.';
  next='Next: '+STEPS[firstPending.step_index-1]+'. No separate start or “Next” button is required.';
 }else{
  current='No further source-validation steps are currently claimable.';
  next='No further authorized source checks remain. The independent worker continues checking for exact original-job receipts and closes the shift at its approved end; it cannot invent additional work.';
 }
 const whatFinished=recent.length?
  (recorded+' recorded source/preflight checks; '+
   (originalReceipt?'one independently matched original-job receipt.':
     'no original-job completion independently matched to this shift.')+
   ' Latest: '+recent[0].text):
  'No task or original-job completion has been independently recorded for this shift.';
 const needs=pending?
  exact.length+' exact capability installation approval request(s) available in Reality Chat. Shift approval does not install anything.':
  'No verified capability-installation request is waiting in Chat for this shift.';
 return Object.freeze({
  version:'reality-shift-conversation-v1',status:s.status,shift_id:s.shift_id,
  headline:s.status==='QUEUED'&&now.getTime()<start?
   'Your '+durationHours+'-hour shift is queued, not running yet.':
   s.status.startsWith('ENDED_')?'Your scheduled shift has ended.':
   s.status==='AWAITING_EXACT_ORIGINAL_WORK'?'Your shift is continuing safely around the original-job gate.':
   s.status==='ESCALATED'?'Your shift needs recovery attention.':
   'Your shift has recorded an activity state.',
  what_finished:whatFinished,current,next,needs_you:needs,
  shift_duration_hours:durationHours,
  planned_start_at:safeDate(s.planned_start_at),
  next_planned_step_at:timeNext,
  as_of:now.toISOString(),
  verified_source_checks:recorded,
  verified_original_job_receipts:originalReceipt?1:0,
  complete_shift_proven:false,verified_human_hours_saved:null,
  events:recent,approval_pending:pending,read_only:true,
  production_changed:false
 });
}
