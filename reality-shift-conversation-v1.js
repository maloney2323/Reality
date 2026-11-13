/* Reality Chat and Home · truthful owner-scoped employee-shift summary.
   No model-generated progress, simulated thoughts, or new approval authority. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const home=$('realityShiftHomeBrief'),chat=$('realityChatShiftBrief');
const ready=$('privateReady'),open=$('realityShiftOpenConversation');
const ask=$('realityChatAskShift');
if(!home||!chat||!ready||!open||!ask)return;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SRC=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const STATES=['NO_SHIFT_AUTHORIZED','QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK',
 'ENDED_WITH_BLOCKED_WORK','ENDED_WITH_VERIFIED_JOB','ENDED_READ_ONLY','ESCALATED'];
const EVENTS=['SOURCE_VALIDATED','ORIGINAL_RECEIPT_MATCHED','STEP_BLOCKED','HISTORICAL_NOOP_VERIFIED','SHIFT_REPORT_RECORDED'];
let busy=false,last=null,loggedIn=false;
function valid(d){
 const b=d?.shift_briefing;
 if(d?.ok!==true||d.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
  d.production_changed!==false||d.shift_approval_does_not_authorize_installation!==true||
  !Array.isArray(d.shifts)||d.shifts.length>5||
  !b||b.version!=='reality-shift-conversation-v1'||
  !STATES.includes(b.status)||b.read_only!==true||b.production_changed!==false||
  b.complete_shift_proven!==false||b.verified_human_hours_saved!==null||
  !Number.isSafeInteger(b.verified_source_checks)||
  !Number.isSafeInteger(b.verified_original_job_receipts)||
  b.verified_original_job_receipts>4||
  typeof b.approval_pending!=='boolean'||
  !['headline','what_finished','current','next','needs_you'].every(k=>
    typeof b[k]==='string'&&b[k].length>0&&b[k].length<=850)||
  !Array.isArray(b.events)||b.events.length>5||
  b.events.some(e=>!EVENTS.includes(e.code)||
    !Number.isSafeInteger(e.step_index)||e.step_index<1||e.step_index>8||
    typeof e.text!=='string'||e.text.length>550||
    (e.source_url!==null&&!SRC.test(e.source_url))||
    (e.proof_sha256!==null&&!/^sha256:[a-f0-9]{64}$/.test(e.proof_sha256))))
  return false;
 if(b.status==='NO_SHIFT_AUTHORIZED')return b.shift_id===null&&d.shifts.length===0;
 return UUID.test(b.shift_id||'')&&d.shifts.some(s=>
  s.shift_id===b.shift_id&&s.status===b.status&&
  s.planned_start_at===b.planned_start_at);
}
function el(tag,text){
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=text;
 return n;
}
function render(b){
 last=b;
 const start=b.planned_start_at?new Date(b.planned_start_at):null;
 const pretty=start&&Number.isFinite(start.valueOf())?start.toLocaleString():null;
 $('realityShiftHomeNow').textContent=b.headline+' '+b.current+
  (b.status==='QUEUED'&&pretty?' Scheduled start: '+pretty+'.':'');
 $('realityShiftHomeNext').textContent='Next: '+b.next;
 $('realityChatShiftHeadline').textContent=b.headline+
  (b.status==='QUEUED'&&pretty?' Scheduled start: '+pretty+'.':'');
 $('realityChatShiftDid').textContent=b.what_finished;
 $('realityChatShiftNow').textContent=b.current;
 $('realityChatShiftNext').textContent=b.next;
 $('realityChatShiftNeed').textContent=b.needs_you;
 const list=$('realityChatShiftTimeline');
 list.replaceChildren();
 if(b.events.length===0)list.append(el('li','No completed shift steps have been independently recorded yet.'));
 for(const item of b.events){
  const li=el('li',item.text);
  if(item.observed_at&&Number.isFinite(Date.parse(item.observed_at)))
   li.append(el('span',' · '+new Date(item.observed_at).toLocaleString()));
  if(item.source_url){
   const link=el('a',' · Original source');
   link.href=item.source_url;link.target='_blank';link.rel='noopener noreferrer';
   li.append(link);
  }
  list.append(li);
 }
 $('realityChatShiftReadbackNotice').textContent=
  'Owner-scoped readback checked. '+b.verified_source_checks+
  ' provider/preflight checks recorded; '+b.verified_original_job_receipts+
  ' independently matching original-job receipt(s). Net human-equivalent savings are not measured. Last checked: '+
  new Date(b.as_of).toLocaleString()+'.';
}
async function refresh(){
 if(busy)return;
 if(ready.style.display!=='block'){
  if(!loggedIn){
   $('realityShiftHomeNow').textContent='Sign in to see exactly what your shift did.';
   $('realityShiftHomeNext').textContent='Open Chat and sign in to view the latest verified work and next action.';
   $('realityChatShiftHeadline').textContent='Sign in to see your shift status.';
  }
  return;
 }
 loggedIn=true;busy=true;
 try{
  const response=await fetch('/api/reality/personal-governed-employee-shift',{
   method:'GET',credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('SHIFT_SOURCE_READBACK_UNAVAILABLE');
  const data=await response.json().catch(()=>null);
  if(!valid(data))throw Error('SHIFT_RECEIPT_PROVENANCE_UNVERIFIED');
  render(data.shift_briefing);
 }catch{
  $('realityChatShiftHeadline').textContent='Shift readback unavailable.';
  $('realityChatShiftNow').textContent='Cannot independently verify the latest state.';
  $('realityChatShiftNext').textContent='Retry the authenticated shift status check; no completion is inferred.';
  $('realityChatShiftDid').textContent='Previous work cannot be certified from this readback.';
  $('realityChatShiftNeed').textContent='Check the existing approval inbox; no installation is inferred.';
  $('realityShiftHomeNow').textContent='Shift status could not be verified.';
  $('realityShiftHomeNext').textContent='Open Chat to inspect sign-in and authenticated progress.';
  $('realityChatShiftTimeline').replaceChildren();
  $('realityChatShiftReadbackNotice').textContent='Fail closed: no verified source update was available.';
  last=null;
 }finally{busy=false}
}
open.onclick=()=>window.location.assign('/chat');
ask.onclick=()=>{
 if(ready.style.display!=='block'){
  $('realityChatShiftReadbackNotice').textContent='Sign in to Reality Chat first.';
  $('privateEmail')?.focus?.({preventScroll:true});return;
 }
 const input=$('privatePrompt'),send=$('privateSend');
 if(!input||!send)return;
 input.value='What did Reality actually complete in my employee shift, what is it doing now, what is next, and do I need to approve a verified capability installation? Use only my latest independent receipts.';
 input.focus({preventScroll:true});
 send.click();
};
const refreshButton=$('realityChatShiftRefresh');
if(refreshButton)refreshButton.onclick=()=>{void refresh()};
if(typeof setTimeout==='function')setTimeout(()=>void refresh(),1200);
if(typeof setInterval==='function')setInterval(()=>void refresh(),30000);
window.realityShiftRefreshBriefing=()=>void refresh();
})();
