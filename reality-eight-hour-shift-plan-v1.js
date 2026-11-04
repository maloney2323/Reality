/* Read-only Reality eight-hour human workday planning UI. One-click draft
   creation is a GET of actual provider observations, never execution authority. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const root=$('realityEmployeeShiftPlanner'),btn=$('realityBuildEmployeeShift'),
 status=$('realityEmployeeShiftStatus'),view=$('realityEmployeeShiftSchedule'),
 start=$('realityEmployeeShiftStart');
if(!root||!btn||!status||!view||!start)return;
const allowed=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const stageNames={
 SOURCE_RECONCILIATION:'Preflight · source evidence & overlap',
 VERIFY_OPEN_ISSUE:'Validate an outstanding issue',
 VERIFY_PROVIDER_EVIDENCE:'Reproduce or validate provider evidence',
 REVIEW_INDEPENDENT_EVIDENCE:'Review code and dependencies',
 QUALIFY_NEXT_WORK:'Qualify the next distinct opportunity',
 CONDITIONAL_EXECUTION_WINDOW:'Governed execution · only if authorized',
 CONDITIONAL_VERIFICATION_WINDOW:'Independent acceptance & settlement',
 EVIDENCE_AND_VALUE_REPORT:'End-of-shift evidence & value report'
};
const stages=Object.keys(stageNames);
const approvalPanel=$('realityEmployeeShiftAuthorization'),
 approvalButton=$('realityAuthorizeEmployeeShift'),
 approvalScope=$('realityEmployeeShiftAuthorizationScope'),
 approvalStatus=$('realityEmployeeShiftApprovalStatus'),
 shiftChatHandoff=$('realityChatShiftHandoff');
let approvedShiftId=null,lastDraft=null,observingShift=false;
function plannedStart(){
 const time=/^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(String(start.value||'09:00'));
 if(!time)throw Error('SHIFT_LOCAL_TIME_INVALID');
 const local=new Date();
 local.setHours(Number(time[1]),Number(time[2]),0,0);
 if(local.getTime()<Date.now()-60000)local.setDate(local.getDate()+1);
 if(!Number.isFinite(local.getTime()))throw Error('SHIFT_LOCAL_TIME_INVALID');
 return local;
}
function refreshScope(){
 if(!lastDraft||!approvalScope)return;
 const date=plannedStart();
 approvalScope.textContent='Proposed local shift: '+date.toLocaleString()+
  ' for 8 hours. Your first approval permits Reality to investigate the exact listed source observations. '+
  'Only a separately verified, original-job-bound capability request can trigger your second, exact installation approval in Reality Chat. No general installation authority is granted.';
}
function validApprovalReceipt(x){
 return x?.ok===true&&
  ['SHIFT_DURABLY_AUTHORIZED','SHIFT_ALREADY_AUTHORIZED'].includes(x.status)&&
  /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(x.shift_id||'')&&
  x.initial_authorization_recorded===true&&x.installation_authorized===false&&
  x.existing_chat_approval_required_for_exact_capabilities===true&&
  x.worker_dispatch_verified===false&&x.production_changed===false;
}
async function observeShift(){
 if(observingShift||!approvedShiftId)return;
 observingShift=true;
 try{
  const res=await fetch('/api/reality/personal-governed-employee-shift',{
   method:'GET',credentials:'same-origin',cache:'no-store'});
  const data=await res.json().catch(()=>null);
  if(!res.ok||data?.ok!==true||
   data.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
   data.production_changed!==false||
   data.shift_approval_does_not_authorize_installation!==true||
   !Array.isArray(data.shifts)||!Array.isArray(data.capability_approval_handoffs))
   throw Error('SHIFT_READBACK_UNAVAILABLE');
  const shift=data.shifts.find(x=>x.shift_id===approvedShiftId);
  if(!shift)throw Error('SHIFT_OWNER_SCOPE_NOT_FOUND');
  if(shift.status==='AWAITING_EXACT_ORIGINAL_WORK')
   approvalStatus.textContent='Shift has reached a governed execution gate. Only existing, individually authorized work may proceed; outstanding work remains blocked.';
  else if(shift.status==='ENDED_WITH_BLOCKED_WORK')
   approvalStatus.textContent='Shift ended with a durable evidence report and blocked/unqualified work. This is not an eight-hour savings receipt.';
  else approvalStatus.textContent='Shift state: '+shift.status.replaceAll('_',' ').toLowerCase()+
    '. Plan and source validation are distinct from real-job execution.';
  const handoffs=data.capability_approval_handoffs.filter(x=>x.shift_id===approvedShiftId&&
   x.status==='EXACT_VERIFIED_CAPABILITY_APPROVAL_READY_IN_REALITY_CHAT'&&
   x.installation_approved===false);
  if(handoffs.length){
   if(shiftChatHandoff){
    shiftChatHandoff.hidden=false;
    shiftChatHandoff.textContent='This authorized shift encountered '+handoffs.length+
     ' independently verified capability candidate(s). Review the exact artifact and original job in the approval below. Your approval is required before installation; authorized work can then resume through the governed worker.';
   }
   approvalStatus.textContent='Exact upgrade approval is ready in Reality Chat. No installation has been authorized by the shift.';
   if(typeof window.homeOwnerRefresh==='function')window.homeOwnerRefresh();
  }else if(shiftChatHandoff){
   shiftChatHandoff.hidden=true;
   shiftChatHandoff.textContent='';
  }
 }catch{
  approvalStatus.textContent='Shift readback could not be verified. No approval or job completion is inferred.';
 }finally{observingShift=false}
}
if(approvalButton)approvalButton.onclick=async()=>{
 if(!lastDraft||!/^sha256:[a-f0-9]{64}$/.test(lastDraft.plan_fingerprint||'')){
  approvalStatus.textContent='Rebuild the exact source-backed plan before authorizing.';return;
 }
 approvalButton.disabled=true;
 approvalStatus.textContent='Recording one owner-bound eight-hour shift authorization...';
 try{
  const startAt=plannedStart().toISOString();
  const r=await fetch('/api/reality/personal-governed-employee-shift',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({action:'AUTHORIZE_EXACT_EMPLOYEE_SHIFT',
    expected_fingerprint:lastDraft.plan_fingerprint,planned_start_at:startAt})
  });
  const data=await r.json().catch(()=>null);
  if(!r.ok||!validApprovalReceipt(data))throw Error('SHIFT_RECEIPT_UNVERIFIED');
  approvedShiftId=data.shift_id;
  approvalButton.hidden=true;
  approvalStatus.textContent='Exact shift authorization recorded and independently read back. '+ 
   'No worker dispatch has been verified yet. Verified capability requests will appear in Reality Chat with a separate approval.';
  await observeShift();
 }catch{
  approvalStatus.textContent='Shift authorization was not independently verified. No installation or job execution is claimed; rebuild the plan before retrying.';
  lastDraft=null;approvalButton.hidden=true;
 }finally{approvalButton.disabled=false}
};
if(start)start.addEventListener('change',()=>{if(lastDraft)refreshScope()});
setInterval(()=>{if(approvedShiftId)void observeShift()},30000);

const expected=[45,60,60,60,60,90,60,45];
const valid=x=>Number.isSafeInteger(x)&&x>=0;
function validPlan(d){
 const c=d?.counts,steps=d?.slots;
 if(d?.ok!==true||d.version!=='reality-eight-hour-employee-shift-draft-v1'||
   d.status!=='DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED'||
   !['SOURCE_BACKED_DISCOVERY_PARTIAL','SOURCE_BACKED_DISCOVERY_OBSERVED'].includes(d.source_status)||
   d.source_scope!=='REALITY_GITHUB_REPOSITORY_ONLY'||
   d.shift_duration_minutes!==480||d.shift_duration_hours!==8||
   d.timing!=='RELATIVE_START_TIMEBOXES_NOT_MEASURED_TASK_DURATIONS'||
   d.scheduling_state!=='PROPOSED_AGENDA_NOT_PERSISTED_TO_WORKER_OR_CALENDAR'||
   d.allocation!=='EVIDENCE_FIRST_THEN_CONDITIONAL_GOVERNED_EXECUTION'||
   d.ready_to_execute_batch!==false||d.read_only!==true||
   d.job_started!==false||d.shift_started!==false||
   d.owner_approval_created!==false||d.installation_authorized!==false||
   d.production_changed!==false||d.human_equivalent_hours_verified!==null||
   d.measured_human_effort_minutes!==null||
   d.verified_cash_savings_usd!==null||d.financial_roi_verified!==false||
   d.benchmark_source_url!=='https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf'||
   !valid(c?.source_backed_opportunities)||
   !valid(c?.selected_distinct_source_records)||
   c.selected_distinct_source_records>4||!valid(c?.unassigned_validation_slots)||
   c.unassigned_validation_slots!==4-c.selected_distinct_source_records||
   !valid(c?.dropped_duplicate_source_records)||
   c.qualified_executable_jobs!==0||c.validated_human_equivalent_hours!==0||
   !Array.isArray(steps)||steps.length!==8)return false;
 const refs=new Set(),ids=new Set();let previous=0,count=0;
 for(let i=0;i<steps.length;i++){
  const step=steps[i];
  if(step?.sequence!==i+1||step.id!==[
   'preflight','issue_validation','failure_reproduction','change_review',
   'additional_triage','governed_execution','independent_acceptance','shift_close'][i]||
    step.stage!==stages[i]||step.planning_minutes!==expected[i]||
    step.offset_start_minutes!==previous||
    step.offset_end_minutes!==previous+expected[i]||
    step.elapsed_minutes_not_human_labor!==true||
    typeof step.action!=='string'||step.action.length<15||step.action.length>500)
   return false;
  previous=step.offset_end_minutes;
  if(step.candidate!==null){
   const item=step.candidate;count++;
   if(i===0||i>=5||step.status!=='SOURCE_OBSERVED_REQUIRES_VALIDATION'||
      step.required_gate!==null||!/^catalog:[a-f0-9]{32}$/.test(String(item?.finding_id||''))||
      !allowed.test(String(item.source_url||''))||
      !['OPEN_ISSUE','OPEN_PULL_REQUEST','RECURRING_FAILURE'].includes(item.finding_type)||
      typeof item.title!=='string'||!item.title.trim()||item.title.length>300||
      item.verified_current_defect!==false||item.authorized_execution!==false||
      ids.has(item.finding_id)||refs.has(item.source_url))return false;
   ids.add(item.finding_id);refs.add(item.source_url);
  }else{
   if(i>=1&&i<=4&&step.status!=='READ_ONLY_PLANNED')return false;
   if(i>=5&&i<=6&&
      (step.status!=='CONDITIONAL_NOT_EXECUTION_READY'||
       typeof step.required_gate!=='string'||step.required_gate.length<20))
    return false;
  }
 }
 return previous===480&&count===c.selected_distinct_source_records;
}
function el(tag,text,cls){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 if(cls)node.className=cls;
 return node;
}
function toClock(offset){
 const value=String(start.value||'09:00');
 const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
 const base=match?Number(match[1])*60+Number(match[2]):9*60;
 const minutes=base+offset,h=Math.floor(minutes/60)%24,m=minutes%60;
 const stamp=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
 return stamp+(minutes>=1440?' (+1 day)':'');
}
function render(d){
 lastDraft=/^sha256:[a-f0-9]{64}$/.test(d.plan_fingerprint||'')?d:null;
 if(approvalPanel&&approvalButton){
  approvalPanel.hidden=!lastDraft;
  approvalButton.hidden=!lastDraft;
  if(lastDraft)refreshScope();
 }

 view.replaceChildren();
 const info=el('p',d.counts.source_backed_opportunities+
   ' source-backed observations examined · '+d.counts.selected_distinct_source_records+
   ' distinct records assigned for validation · 0 verified execution-ready jobs.',
   'reality-employee-shift-note');
 const risk=el('p',
   'Eight hours is the proposed shift window, NOT eight measured human labor-hours. '+
   'Items still require fresh validation, original-work authorization and separate exact upgrade approval if needed.',
   'reality-employee-shift-note');
 const list=el('ol',undefined,'reality-employee-shift-list');
 for(const item of d.slots){
  const li=el('li',undefined,'reality-employee-shift-item');
  const time=el('span',toClock(item.offset_start_minutes)+' – '+
    toClock(item.offset_end_minutes),'reality-employee-shift-time');
  const body=el('div');
  body.append(el('strong',stageNames[item.stage]),
    el('p',item.action));
  if(item.candidate){
   const link=el('a',item.candidate.title);
   link.href=item.candidate.source_url;link.target='_blank';
   link.rel='noopener noreferrer';
   body.append(link,el('small','Needs independent current-work verification · Not approved'));
  }else if(item.required_gate){
   body.append(el('small','Gated: no execution without required authorization and verified prior stages.'));
  }
  li.append(time,body);list.append(li);
 }
 const note=el('p',
   'This is a planning agenda until your exact shift authorization is durably recorded. The existing governed worker still requires independent current-work qualification. A missing capability is presented as a separate exact approval in Reality Chat; shift authority never installs code. '+d.overlap_note,
   'reality-employee-shift-note');
 const source=el('a','NASA-hosted repair-effort study · comparison source only');
 source.href=d.benchmark_source_url;source.target='_blank';
 source.rel='noopener noreferrer';
 const footer=el('p','Actual human-equivalent capacity and cash savings: not measured.');
 view.append(info,risk,list,note,source,footer);
 view.hidden=false;
 status.textContent=d.source_status==='SOURCE_BACKED_DISCOVERY_PARTIAL'?
  'Draft prepared with partial provider coverage; verify missing sources before any authorization.':
  'Eight-hour draft prepared from source observations. No job started, approval created, or worker shift scheduled.';
}
btn.onclick=async()=>{
 lastDraft=null;if(approvalPanel)approvalPanel.hidden=true;
 btn.disabled=true;view.hidden=true;view.replaceChildren();
 status.textContent='Checking current work, selecting distinct items and arranging the shift...';
 try{
  const response=await fetch('/api/reality/eight-hour-employee-shift-plan',{
   method:'GET',credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('SOURCE_READBACK_UNAVAILABLE');
  const data=await response.json().catch(()=>null);
  if(!validPlan(data))throw Error('PLAN_PROVENANCE_INVALID');
  render(data);
 }catch{
  status.textContent='No trustworthy workday draft could be produced. Nothing was scheduled or authorized.';
  view.replaceChildren();view.hidden=true;
 }finally{btn.disabled=false}
};
})();
