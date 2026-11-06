// Reality's PRE-AUTOMATION business case, read-only and source-bound.
// The owner may compare a hypothetical software repair against human wage
// research BEFORE authorizing any worker. No scenario is a measured ROI.
(function(){
'use strict';
const root=document.getElementById('realityBeforeAutomationValue');
if(!root)return;
const el=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',
 minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d*$/;
const NASA='https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf';
const BLS='https://www.bls.gov/news.release/ocwage.t01.htm';
let basis=null,roster=null;
function verify(data){
 const v=data?.value_preview,team=v?.team,r=v?.comparable_software_repair;
 if(data?.ok!==true||data.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
   data.owner_scope_verified!==true||
   data.worker_execution_authorized!==false||
   data.active_ai_employee_count!==0||
   data.installation_authorized!==false||
   data.production_changed!==false||
   v?.status!=='SOURCE_BACKED_WORKFORCE_POTENTIAL_NOT_MEASURED_ROI'||
   v.job_started!==false||v.installation_authorized!==false||
   v.evidence?.verified_net_roi_usd!==null||
   v.evidence?.actual_automation_cost_usd!==null||
   v.evidence?.verified_staff_reduction!==null||
   v.evidence?.verified_net_hours_saved!==null||
   team?.proposed_virtual_role_count!==8||
   team?.active_verified_employee_workers!==0||
   team?.source_backed_work_center_findings!==data.existing_work_center_candidates||
   team?.independently_measured_human_fte_replaced!==null||
   team?.all_findings_are_confirmed_repairs!==false||
   !Number.isSafeInteger(data.existing_work_center_candidates)||
   data.existing_work_center_candidates<0||data.existing_work_center_candidates>1000||
   !Array.isArray(data.proposed_employees)||data.proposed_employees.length!==8||
   new Set(data.proposed_employees.map(x=>x.function_id)).size!==8||
   r?.study_source_url!==NASA||r?.wage_source_url!==BLS||
   r?.study_year!==2017||r?.wage_observation_period!=='2025-05'||
   r?.investigation_median_hours!==2||r?.implementation_median_hours!==3||
   r?.illustrative_sum_of_medians_hours!==5||
   r?.sum_of_medians_not_median_total!==true||
   r?.scenario_not_shift_throughput_forecast!==true||
   r?.scenario_not_cash_savings!==true||
   !Number.isFinite(r?.developer_median_wage_usd_per_hour)||
   r.developer_median_wage_usd_per_hour<=0||
   r.one_fault_example?.independently_verified_current_faults!==0||
   r.one_fault_example?.realized_cash_savings_usd!==null||
   r.one_fault_example?.sum_of_separate_median_effort_hours!==5||
   !Number.isFinite(r.one_fault_example.illustrative_gross_human_wage_equivalent_usd)||
   Math.abs(r.one_fault_example.illustrative_gross_human_wage_equivalent_usd-
     r.developer_median_wage_usd_per_hour*5)>0.01)
  throw Error('PRE_AUTOMATION_SOURCE_OR_FINANCIAL_EVIDENCE_UNVERIFIED');
 let total=0;
 for(const employee of data.proposed_employees){
  if(typeof employee.display_name!=='string'||!employee.display_name||
     employee.activation_status!=='PROPOSED_NOT_DEPLOYED'||
     employee.active_worker_id!==null||
     employee.worker_shift_id!==null||
     employee.independently_completed_jobs!==0||
     employee.realized_savings_usd!==null||
     !Array.isArray(employee.candidate_jobs)||
     employee.candidate_count!==employee.candidate_jobs.length)
   throw Error('PRE_AUTOMATION_ROLE_READBACK_UNVERIFIED');
  for(const job of employee.candidate_jobs){
   if(!SOURCE.test(job.source_url||'')||
      !/^catalog:[a-f0-9]{32}$/.test(job.finding_id||'')||
      typeof job.title!=='string'||!job.title||
      job.authorized_execution!==false||
      job.independently_verified_done!==false)
    throw Error('PRE_AUTOMATION_WORK_FINDING_NOT_QUALIFIED');
   total++;
  }
 }
 if(total!==data.existing_work_center_candidates)
  throw Error('PRE_AUTOMATION_CATALOG_COUNT_MISMATCH');
 return r;
}
function renderRoles(){
 const holder=document.createDocumentFragment();
 for(const role of roster.proposed_employees){
  const row=document.createElement('article');row.className='pre-roi-role';
  const heading=document.createElement('strong');
  heading.textContent=role.display_name+' · '+role.role+' · '+
   role.candidate_count+' source finding(s)';
  row.append(heading);
  const p=document.createElement('p');
  p.textContent=role.candidate_count?
    'Observed work to validate; not an authorized or completed task.':
    'No current source findings assigned. Reality should discover more work, not fill hours artificially.';
  row.append(p);
  for(const job of role.candidate_jobs.slice(0,2)){
   const a=document.createElement('a');
   a.href=job.source_url;a.target='_blank';a.rel='noopener noreferrer';
   a.textContent=job.title.length>95?job.title.slice(0,95)+'…':job.title;
   row.append(a);
  }
  holder.append(row);
 }
 el('realityPreROIRoles').replaceChildren(holder);
}
function renderScenario(){
 if(!basis){
  el('realityPreROIManual').textContent='Not verified';
  el('realityPreROINet').textContent='Not calculated';
  el('realityPreROIPercent').textContent='Not calculated';
  el('realityPreROIAssumptions').textContent=
   'Authenticate and verify current source and wage evidence before a scenario is shown.';
  return;
 }
 const count=Number(el('realityPreROIRepairs').value);
 const costRaw=el('realityPreROICost').value.trim();
 if(!Number.isSafeInteger(count)||count<1||count>10||
   (costRaw!==''&&(!/^\d+(?:\.\d{1,2})?$/.test(costRaw)||
      !Number.isFinite(Number(costRaw))||Number(costRaw)>1000000))){
  el('realityPreROINet').textContent='Invalid assumption';
  el('realityPreROIPercent').textContent='Not calculated';
  return;
 }
 const gross=Number((count*basis.one_fault_example.illustrative_gross_human_wage_equivalent_usd).toFixed(2));
 el('realityPreROIManual').textContent=money(gross);
 const hours=count*basis.illustrative_sum_of_medians_hours;
 if(!costRaw||Number(costRaw)<=0){
  el('realityPreROINet').textContent='Enter a positive cost';
  el('realityPreROIPercent').textContent='Unknown without costs';
 }else{
  const cost=Number(costRaw);
  const net=Number((gross-cost).toFixed(2));
  el('realityPreROINet').textContent=money(net);
  el('realityPreROIPercent').textContent=
   ((net/cost)*100).toFixed(1)+'% hypothetical';
 }
 el('realityPreROIAssumptions').textContent=
  'Scenario only: '+count+' ASSUMED genuinely comparable human software-fault repairs × '+
  basis.illustrative_sum_of_medians_hours+'h per fault = '+hours+
  ' illustrative human hours at '+money(basis.developer_median_wage_usd_per_hour)+
  '/hour. Assumes the entire gross wage equivalent would be avoidable, which is unverified. '+
  'Cost must include OpenAI usage, infrastructure, human review and any operation costs. '+
  'No return, cash saving, or accepted customer job is verified by these inputs.';
}
function noEvidence(){
 basis=null;roster=null;
 el('realityPreROIStatus').textContent=
  'Source-backed business case not independently available. Sign in and refresh; no value or ROI inferred.';
 el('realityPreROIRolesCount').textContent='Unverified';
 el('realityPreROIFindings').textContent='Unverified';
 el('realityPreROIRepair').textContent='Unverified';
 el('realityPreROIRoles').replaceChildren();
 renderScenario();
}
async function refresh(){
 el('realityPreROIStatus').textContent='Checking current signed-in work and published benchmark…';
 try{
  const response=await fetch('/api/reality/personal-employee-roster',{
   method:'GET',credentials:'same-origin',cache:'no-store',
   headers:{accept:'application/json'},
   signal:AbortSignal.timeout(35000)
  });
  if(!response.ok)throw Error('SOURCE_READBACK_UNAVAILABLE');
  const data=await response.json();
  const ref=verify(data);
  roster=data;basis=ref;
  el('realityPreROIRolesCount').textContent='8 proposed roles';
  el('realityPreROIFindings').textContent=
   String(data.existing_work_center_candidates);
  el('realityPreROIRepair').textContent=
   money(ref.one_fault_example.illustrative_gross_human_wage_equivalent_usd);
  el('realityPreROIStatus').textContent=
   'Signed-in source readback: '+data.existing_work_center_candidates+
   ' distinct categorized GitHub findings routed among eight proposed AI functions. '+
   'These are work observations, NOT '+data.existing_work_center_candidates+
   ' validated automations, confirmed faults or staffed employees.';
  renderRoles();renderScenario();
 }catch{
  noEvidence();
 }
}
el('realityPreROIRefresh').onclick=()=>{void refresh();};
el('realityPreROIRepairs').onchange=renderScenario;
el('realityPreROICost').oninput=renderScenario;
void refresh();
})();
