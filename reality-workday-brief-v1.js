/* Reality source-backed Workday Discovery brief, view-only.
   A tracked provider record is never declared a proven active defect, real
   labor savings, an approved original job or a completed work shift. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const root=$('simpleWorkdayBrief'),status=$('simpleWorkdayStatus'),
 summary=$('simpleWorkdayMetrics'),list=$('simpleWorkdayCandidates');
if(!root||!status||!summary||!list)return;
const base='https://github.com/maloney2323/Reality/';
const allowed=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const labels={
 OPEN_ISSUE:'Open tracked issue · Needs independent validation',
 OPEN_PULL_REQUEST:'Open PR · Implementation under review',
 RECURRING_FAILURE:'Repeated CI failure · Fresh reproduction required'
};
const fail=message=>{status.textContent=message;summary.replaceChildren();list.replaceChildren()};
function validate(data){
 const c=data?.counts;
 return data?.ok===true&&data.read_only===true&&
  data.installation_authorized===false&&data.job_started===false&&
  data.production_changed===false&&data.shift_completed===false&&
  data.phase==='DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY'&&
  data.evidence_status==='SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS'&&
  ['SOURCE_BACKED_DISCOVERY_PARTIAL','SOURCE_BACKED_DISCOVERY_OBSERVED'].includes(data.status)&&
  data.source_scope==='REALITY_GITHUB_REPOSITORY_ONLY'&&
  data.value_measurement?.human_discovery_baseline_minutes===null&&
  data.value_measurement?.measured_discovery_time_saved_minutes===null&&
  data.value_measurement?.verified_cash_savings_usd===null&&
  data.value_measurement?.financial_roi_verified===false&&
  Number.isSafeInteger(c?.source_backed_opportunities)&&
  Number.isSafeInteger(c?.open_issues)&&Number.isSafeInteger(c?.open_pull_requests)&&
  Number.isSafeInteger(c?.historical_failure_signals)&&
  c.verified_current_defects===0&&
  c.approved_autonomous_repairs===0&&c.completed_customer_jobs_from_this_report===0&&
  c.source_backed_opportunities>=0&&
  c.open_issues+c.open_pull_requests+c.historical_failure_signals===
    c.source_backed_opportunities&&
  Array.isArray(data.items)&&data.items.length<=25&&
  data.items.length<=c.source_backed_opportunities&&
  data.items.every(x=>/^[a-z0-9:]{1,75}$/.test(String(x.finding_id||''))&&
   Object.hasOwn(labels,x.finding_type)&&typeof x.title==='string'&&
   Array.isArray(x.evidence_refs)&&x.evidence_refs.length>0&&
   x.evidence_refs.every(url=>typeof url==='string'&&allowed.test(url))&&
   x.verified_current_defect===false&&x.authorized_execution===false&&
   x.verified_time_saved_minutes===null&&x.verified_financial_value_usd===null);
}
function line(parent,name,value){
 const el=document.createElement('span');el.className='simple-info';
 el.textContent=name+': '+value;parent.append(el);
}
function render(data){
 if(!validate(data)){
  fail('Opportunity source readback was not verified. No claim about available work or savings can be made.');
  return;
 }
 root.hidden=false;
 status.textContent=(data.status==='SOURCE_BACKED_DISCOVERY_PARTIAL'?
   'Partial source coverage · more business systems may have work. ':
   'Checked connected provider sources. ')+
   'These are opportunities to validate, NOT proven active defects or a completed workday.';
 summary.replaceChildren();list.replaceChildren();
 const c=data.counts;
 line(summary,'Open issues',String(c.open_issues));
 line(summary,'Open PRs',String(c.open_pull_requests));
 line(summary,'Repeated-failure signals',String(c.historical_failure_signals));
 line(summary,'Human discovery time saved','Not measured');
 if(!data.items.length){
  const p=document.createElement('p');p.textContent=
   'No qualified source observations in the checked window. Unconnected sources and older records may still contain work.';
  list.append(p);
 }else for(const item of data.items.slice(0,6)){
  const card=document.createElement('article');card.className='simple-finding';
  const heading=document.createElement('h3');heading.textContent=item.title;
  const kind=document.createElement('p');
  kind.textContent=labels[item.finding_type];
  const method=document.createElement('p');
  method.textContent='Next validation: '+String(item.next_validation_step||'Independent provider readback required');
  const value=document.createElement('p');
  value.textContent='Potential value: to be measured · Human labor baseline: not measured · Actual savings: not measured.';
  const link=document.createElement('a');
  link.href=item.evidence_refs[0];link.target='_blank';link.rel='noopener noreferrer';
  link.textContent='Review source evidence';
  card.append(heading,kind,method,value,link);list.append(card);
 }
 if(data.truncated||c.source_backed_opportunities>6){
  const extra=document.createElement('p');
  extra.textContent='Showing the top source-backed observations. See the full Work Center for other categories and evidence.';
  list.append(extra);
 }
}
async function refresh(){
 fail('Inspecting source-backed work across the connected Reality repository…');
 try{
  const response=await fetch('/api/reality/workday-opportunities',{
   method:'GET',credentials:'same-origin',cache:'no-store'});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Error('WORKDAY_PROVIDER_UNAVAILABLE');
  render(data);
 }catch{fail('Workday discovery readback unavailable. No work, hours, or savings are inferred.')}
}
void refresh();
})();
