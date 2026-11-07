// Read-only signed-in source inventory for the MAIN Reality Chat page.
// No forms, POST, action dispatch, guessed authority or realized ROI.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
if(document.body?.dataset?.realityRoute!=='chat'||!$('realityRileySourceWork'))return;
const status=$('realityRileySourceStatus'),list=$('realityRileySourceList');
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9][0-9]{0,7})$/;
let readEpoch=0;
const reset=message=>{
 status.textContent=message;
 list.replaceChildren();
};
function check(data){
 if(data?.ok!==true||data.version!=='reality-riley-source-work-v1'||
   data.status!=='RILEY_CURRENT_SOURCE_BACKLOG_UNQUALIFIED'||
   data.source_scope!=='maloney2323/Reality'||
   data.owner_scope_verified!==true||
   data.job_started_by_read!==false||
   data.shift_started_by_read!==false||
   data.shift_execution_authorized!==false||
   data.original_job_qualified!==false||
   data.installation_authorized!==false||
   data.production_changed!==false||
   data.current_open_issue_count_is_not_authorized_job_count!==true||
   !Number.isSafeInteger(data.open_issue_count)||
   data.open_issue_count<0||data.open_issue_count>150||
   !Array.isArray(data.source_issues)||data.source_issues.length>12||
   !Number.isSafeInteger(data.omitted_source_issue_count)||
   data.omitted_source_issue_count<0||
   data.open_issue_count!==data.source_issues.length+data.omitted_source_issue_count||
   !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.source_prepared_at||'')||
   !Number.isFinite(Date.parse(data.source_prepared_at))||
   !/^[a-f0-9]{64}$/.test(data.source_sha256||''))
  throw Error('RILEY_SOURCE_EVIDENCE_UNVERIFIED');
 const ids=new Set();
 for(const issue of data.source_issues){
  const m=ISSUE.exec(issue?.issue_url||'');
  if(!m||!Number.isSafeInteger(issue.issue_number)||
    issue.issue_number!==Number(m[1])||ids.has(issue.issue_number)||
    typeof issue.title!=='string'||!issue.title.trim()||
    issue.title.length>200||
    issue.source_status!=='OPEN_PROVIDER_OBSERVATION_UNQUALIFIED'||
    issue.executable_original_job_verified!==false||
    issue.owner_approval_recorded!==false||
    issue.measured_business_value_usd!==null)
   throw Error('RILEY_SOURCE_ITEM_EVIDENCE_UNVERIFIED');
  ids.add(issue.issue_number);
 }
 return data;
}
async function refresh(){
 const epoch=++readEpoch;
 if($('privateReady')?.style?.display!=='block'){
  reset('Sign in to view Riley\'s source-backed work. No automation has started.');
  return;
 }
 reset('Reading verified work sources independently of whether a shift is active…');
 try{
  const response=await fetch('/api/reality/personal-riley-source-work',{
   method:'GET',credentials:'same-origin',cache:'no-store',
   headers:{accept:'application/json'},signal:AbortSignal.timeout(30000)
  });
  if(!response.ok)throw Error('SOURCE_READBACK_NOT_AVAILABLE');
  const data=check(await response.json());
  if(epoch!==readEpoch||$('privateReady')?.style?.display!=='block')return;
  const fragment=document.createDocumentFragment();
  for(const issue of data.source_issues){
   const li=document.createElement('li');
   const link=document.createElement('a');
   link.href=issue.issue_url;link.target='_blank';link.rel='noopener noreferrer';
   link.textContent='#'+issue.issue_number+' · '+issue.title;
   li.append(link);fragment.append(li);
  }
  list.replaceChildren(fragment);
  status.textContent=data.open_issue_count+
   ' open GitHub issue observation(s) in Reality\'s prepared source inventory (checked '+
   data.source_prepared_at+'). These require independent qualification; historical settled jobs must not be retried. '+
   'An issue is NOT an authorized original job. Start authority remains the separate signed-in shift button.';
 }catch{
  if(epoch!==readEpoch)return;
  reset('Riley source readback unavailable. This does NOT mean there is no work. Retry after verifying the signed-in session.');
 }
}
window.realityRefreshRileyWork=refresh;
if($('privateReady')?.style?.display==='block')void refresh();
})();
