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
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
function finalReceiptValid(b,s){
 const f=b.final_receipt,c=s?.close_report,n=b.verified_final_original_job_count;
 return b.complete_shift_proven===true&&b.status==='ENDED_WITH_VERIFIED_JOB'&&b.completion_bound===true&&s?.planned_end_at==='infinity'&&
  f?.status==='EMPLOYEE_SHIFT_EVIDENCE_REPORT'&&f.shift_id===b.shift_id&&f.completion_bound===true&&
  f.completion_reason==='ALL_AUTHORIZED_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED'&&f.production_changed===false&&
  Number.isSafeInteger(n)&&n>=1&&n<=4&&f.authorized_source_job_count===n&&f.original_jobs_independently_settled_in_this_shift===n&&b.verified_original_job_receipts===n&&
  Array.isArray(f.verified_original_receipts)&&f.verified_original_receipts.length===n&&
  new Set(f.verified_original_receipts.map(x=>x.original_work_id)).size===n&&
  f.verified_original_receipts.every(x=>x.independent_final_receipt_verified===true&&WORK.test(x.original_work_id||'')&&HASH.test(x.source_proof_sha256||''))&&
  c?.shift_id===f.shift_id&&c.completion_reason===f.completion_reason&&c.production_changed===false&&c.authorized_source_job_count===n&&c.original_jobs_independently_settled_in_this_shift===n&&
  Array.isArray(c.verified_original_receipts)&&c.verified_original_receipts.length===n&&
  f.verified_original_receipts.every(x=>c.verified_original_receipts.some(y=>y.original_work_id===x.original_work_id&&y.source_proof_sha256===x.source_proof_sha256&&y.independent_final_receipt_verified===true));
}
function valid(d){
 const b=d?.shift_briefing;
 if(d?.ok!==true||d.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
  d.production_changed!==false||d.shift_approval_does_not_authorize_installation!==true||
  !Array.isArray(d.shifts)||d.shifts.length>5||
  !b||b.version!=='reality-shift-conversation-v1'||
  !STATES.includes(b.status)||b.read_only!==true||b.production_changed!==false||
  typeof b.complete_shift_proven!=='boolean'||b.verified_human_hours_saved!==null||
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
 if(b.status==='NO_SHIFT_AUTHORIZED')return b.shift_id===null&&d.shifts.length===0&&b.complete_shift_proven===false;
 const s=d.shifts.find(s=>s.shift_id===b.shift_id&&s.status===b.status&&s.planned_start_at===b.planned_start_at);
 if(!UUID.test(b.shift_id||'')||!s)return false;
 return b.complete_shift_proven?finalReceiptValid(b,s):b.final_receipt==null;
}
function el(tag,text){
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=text;
 return n;
}
const compact=el('p');compact.id='realityChatCompactShiftState';compact.hidden=true;compact.setAttribute('role','status');compact.setAttribute('aria-live','polite');
const thread=$('privateTranscript'),header=$('realityChatConversation')?.querySelector('.reality-chat-thread-heading');
if(header)header.after(compact);
const finalCard=el('article');finalCard.id='realityChatFinalShiftReceipt';finalCard.className='bubble';finalCard.hidden=true;finalCard.setAttribute('aria-label','Independently verified final shift receipt');
function attachReceipt(){if(thread&&!finalCard.hidden&&!thread.contains(finalCard))thread.append(finalCard);}
if(thread&&typeof MutationObserver==='function')new MutationObserver(attachReceipt).observe(thread,{childList:true});
function clearCompact(){compact.hidden=true;finalCard.hidden=true;finalCard.remove();}
function compactRender(b){
 if(b.status==='NO_SHIFT_AUTHORIZED'){clearCompact();return;}
 const labels={QUEUED:'Authorized · waiting for worker',RUNNING:'Shift in progress',AWAITING_EXACT_ORIGINAL_WORK:'Shift open · original work not yet settled',ESCALATED:'Shift needs recovery',ENDED_WITH_BLOCKED_WORK:'Shift ended · unfinished work',ENDED_READ_ONLY:'Shift ended · read-only',ENDED_WITH_VERIFIED_JOB:'Shift ended · review receipts'};
 compact.hidden=false;compact.textContent=b.complete_shift_proven?'Shift complete · '+b.verified_final_original_job_count+' independently verified job receipt(s)':labels[b.status]||'Shift status unverified';
 if(!b.complete_shift_proven){finalCard.hidden=true;finalCard.remove();return;}
 finalCard.hidden=false;
 const evidence=el('details');evidence.append(el('summary','View independent receipt evidence'));
 for(const r of b.final_receipt.verified_original_receipts)evidence.append(el('p',r.original_work_id+' · '+r.source_proof_sha256));
 finalCard.replaceChildren(el('strong','Shift complete · verified receipt'),el('p',b.verified_final_original_job_count+' authorized job(s) independently settled. All selected work is accounted for.'),evidence,el('p','Human time savings are not measured.'));
 attachReceipt();
}
function render(b,supervisor=null){
 last=b;compactRender(b);
 let triage='';
 if(supervisor?.status==='AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY'&&
    supervisor.read_only===true&&supervisor.production_changed===false&&
    supervisor.shift_id===b.shift_id&&
    supervisor.install_approval_authorized_by_triage===false&&
    supervisor.original_job_admission_authorized_by_triage===false&&
    supervisor.shift_completed_by_triage===false&&
    Number.isSafeInteger(supervisor.independently_settled_originals)&&
    Number.isSafeInteger(supervisor.sources_needing_distinct_qualification)&&
    supervisor.independently_settled_originals>=0&&
    supervisor.sources_needing_distinct_qualification>=0){
  const done=supervisor.independently_settled_originals;
  const pending=supervisor.sources_needing_distinct_qualification;
  triage=' Automatic supervisor: '+done+' independently receipted job'+
   (done===1?'':'s')+'; '+pending+' source'+(pending===1?'':'s')+
   ' still need'+(pending===1?'s':'')+
   ' a qualified original job before execution. No duplicate work or new approval inferred.';
 }
 const start=b.planned_start_at?new Date(b.planned_start_at):null;
 const pretty=start&&Number.isFinite(start.valueOf())?start.toLocaleString():null;
 $('realityShiftHomeNow').textContent=b.headline+' '+b.current+triage+
  (b.status==='QUEUED'&&pretty?' Scheduled start: '+pretty+'.':'');
 $('realityShiftHomeNext').textContent='Next: '+b.next;
 $('realityChatShiftHeadline').textContent=b.headline+
  (b.status==='QUEUED'&&pretty?' Scheduled start: '+pretty+'.':'');
 $('realityChatShiftDid').textContent=b.what_finished;
 $('realityChatShiftNow').textContent=b.current+triage;
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
  clearCompact();
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
   method:'GET',credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('SHIFT_SOURCE_READBACK_UNAVAILABLE');
  const data=await response.json().catch(()=>null);
  if(!valid(data))throw Error('SHIFT_RECEIPT_PROVENANCE_UNVERIFIED');
  render(data.shift_briefing,
   data.shift_automatic_supervisor_status===
    'EXACT_OWNER_SOURCE_TRIAGE_READ_ONLY_VERIFIED'?
    data.shift_automatic_supervisor:null);
 }catch{
  finalCard.hidden=true;finalCard.remove();compact.hidden=false;compact.textContent='Shift status unavailable · no new completion verified';
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
const shiftVisibleRoute=()=>['/','/chat','/shifts'].includes(window.location.pathname);
const onlineVisible=()=>typeof document.visibilityState!=='string'||
 document.visibilityState==='visible';
if(typeof setTimeout==='function')setTimeout(()=>{
 if(shiftVisibleRoute()&&onlineVisible())void refresh();
},1200);
// Page visibility and route scope bound the read-only polling load; this
// does not stop a server-side authorized shift or independent workers.
if(typeof setInterval==='function')setInterval(()=>{
 if(window.location.pathname!=='/chat'&&shiftVisibleRoute()&&onlineVisible())void refresh();
},60000);
window.addEventListener('reality:chat-work-opened',()=>{if(onlineVisible())void refresh()});
if(typeof MutationObserver==='function')
 new MutationObserver(()=>{
  if(ready.style.display==='block'&&shiftVisibleRoute()&&onlineVisible())
   void refresh();
  else if(ready.style.display!=='block')clearCompact();
 }).observe(ready,{attributes:true,attributeFilter:['style']});
window.realityShiftRefreshBriefing=()=>void refresh();
})();
