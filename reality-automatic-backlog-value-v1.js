// Automatic current-open-issue "what if" labor planning range.
// This module never treats issue count as actual measured labor, verified
// work, avoided loss, earned cash, employee reduction or daily savings.
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const root=$('realityAutoBacklogComparison');
 const auth=$('privateReady'),explanation=$('realityAutoBacklogExplanation');
 const evidence=$('realityAutoBacklogSourceLinks');
 if(!root||!auth||!explanation||!evidence)return;
 const issue=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
 const work=/^catalog:[a-f0-9]{32}$/;
 const signed=()=>auth.style.display==='block';
 const show=(id,value)=>{const x=$(id);if(x)x.textContent=value;};
 const money=v=>'$'+v.toLocaleString('en-US',{
  minimumFractionDigits:2,maximumFractionDigits:2});
 const reset=(message)=>{
  show('realityAutoBacklogDollars','Unknown');
  show('realityAutoBacklogHours','Unknown');
  show('realityAutoBacklogCount','Unknown');
  show('realityAutoBacklogCalibrated','Not verified');
  explanation.textContent=message;
  evidence.replaceChildren();
 };
 let epoch=0;
 const valid=r=>{
  if(r?.ok!==true||
    r.version!=='reality-automatic-backlog-planning-v1'||
    !['AUTOMATIC_UNCALIBRATED_CONDITIONAL_PLANNING',
      'NO_ELIGIBLE_DISTINCT_CURRENT_ISSUES'].includes(r.status)||
    r.source_scope!=='GITHUB_OPEN_ISSUES_WITHIN_WORKDAY_CATALOG_WINDOW'||
    !['COMPLETE_FOR_OPEN_ISSUE_WINDOW','PARTIAL_SOURCE_WINDOW'].includes(r.source_coverage)||
    r.planning_basis!=='UNMEASURED_GENERIC_WHAT_IF_ASSUMPTIONS_NOT_A_TASK_FORECAST'||
    r.wage_basis!=='PUBLIC_NATIONAL_MEDIAN_EMPLOYEE_WAGE_NOT_LOADED_COST'||
    r.wage_source_url!=='https://www.bls.gov/news.release/ocwage.t01.htm'||
    r.transparency?.confidence!=='UNCALIBRATED_VERY_LOW'||
    r.transparency?.assumption_source!==
      'TRANSPARENT_EDITORIAL_PLANNING_PRESET_NOT_OBSERVED_HUMAN_TIMES'||
    r.transparency?.financial_roi_verified!==false||
    r.transparency?.other_issue_overlap_not_ruled_out!==true||
    r.transparency?.cannot_compare_against_customer_labor_baseline!==true||
    r.measured_human_backlog_hours!==null||
    r.independently_verified_discovery_savings_usd!==null||
    r.independently_verified_execution_savings_usd!==null||
    r.verified_financial_savings_usd!==null||
    r.actual_provider_cost_usd!==null||
    r.settled_jobs_from_this_analysis!==0||
    r.owner_approval_granted!==false||
    r.job_started!==false||r.installation_authorized!==false||
    r.production_changed!==false||r.read_only!==true||
    !Array.isArray(r.included_issues)||r.included_issues.length>20||
    !Number.isSafeInteger(r.counts?.included_distinct_leaf_issues)||
    r.counts.included_distinct_leaf_issues<0||
    r.included_issues.length>r.counts.included_distinct_leaf_issues||
    r.counts.independently_validated_current_defects!==0||
    r.counts.independently_calibrated_human_tasks!==0||
    r.counts.current_human_comparator_records!==0||
    !Number.isFinite(r.applied_wage_usd_per_hour)||
    r.applied_wage_usd_per_hour<5||r.applied_wage_usd_per_hour>500||
    !Number.isSafeInteger(r.transparency?.conservative_discovery_minutes_per_issue)||
    !Number.isSafeInteger(r.transparency?.conservative_execution_minutes_per_issue)||
    !Number.isSafeInteger(r.transparency?.extended_discovery_minutes_per_issue)||
    !Number.isSafeInteger(r.transparency?.extended_execution_minutes_per_issue)||
    r.included_issues.some(x=>
     !work.test(String(x?.finding_id||''))||
     !issue.test(String(x?.issue_url||''))||
     x.evidence_status!=='OPEN_PROVIDER_ISSUE_NOT_VALIDATED_AS_ACTIVE_UNFINISHED_JOB'||
     x.human_baseline_verified!==false||
     x.estimated_actual_effort_hours!==null||
     x.realized_value_usd!==null))
   return false;
  const n=r.counts.included_distinct_leaf_issues;
  const accepted=new Set(r.included_issues.map(x=>x.issue_url));
  if(accepted.size!==r.included_issues.length)return false;
  if((n===0)!==(r.status==='NO_ELIGIBLE_DISTINCT_CURRENT_ISSUES'))return false;
  const plans=[
   [r.conditional_conservative,
    r.transparency.conservative_discovery_minutes_per_issue,
    r.transparency.conservative_execution_minutes_per_issue],
   [r.conditional_extended,
    r.transparency.extended_discovery_minutes_per_issue,
    r.transparency.extended_execution_minutes_per_issue]
  ];
  const rate=r.applied_wage_usd_per_hour;
  for(const [s,d,e] of plans){
   if(!Number.isSafeInteger(d)||!Number.isSafeInteger(e)||
    d<=0||e<=0||d>480||e>1440)return false;
   const dollars=n*(d+e)/60*rate;
   if(typeof s?.conditional_total_labor_equivalent_usd!=='number'||
    typeof s?.conditional_total_hours!=='number'||
    typeof s?.conditional_discovery_labor_equivalent_usd!=='number'||
    typeof s?.conditional_execution_labor_equivalent_usd!=='number'||
    typeof s?.conditional_discovery_hours!=='number'||
    typeof s?.conditional_execution_hours!=='number'||
    Math.abs(s.conditional_total_hours-n*(d+e)/60)>0.011||
    Math.abs(s.conditional_discovery_hours-n*d/60)>0.011||
    Math.abs(s.conditional_execution_hours-n*e/60)>0.011||
    Math.abs(s.conditional_total_labor_equivalent_usd-dollars)>0.011||
    Math.abs(s.conditional_discovery_labor_equivalent_usd-n*d/60*rate)>0.011||
    Math.abs(s.conditional_execution_labor_equivalent_usd-n*e/60*rate)>0.011)
    return false;
  }
  return r.conditional_conservative.conditional_total_hours<=
   r.conditional_extended.conditional_total_hours;
 };
 async function load(){
  if(!signed()){
   ++epoch;reset('Sign in to view automatic issue scenarios. No work or savings are inferred.');
   return;
  }
  const id=++epoch;
  explanation.textContent='Checking provider issue state and Reality human labor reference…';
  try{
   const res=await fetch('/api/reality/automatic-backlog-value',{
    method:'GET',credentials:'same-origin',cache:'no-store'});
   if(!res.ok)throw Error('AUTOMATIC_ESTIMATE_UNAVAILABLE');
   const r=await res.json();
   if(id!==epoch||!signed())return;
   if(!valid(r))throw Error('AUTOMATIC_ESTIMATE_PROOF_INVALID');
   if(!r.counts.included_distinct_leaf_issues){
    reset('No distinct current open issue candidates could be modeled. '+
     'That does not establish that Reality has no other useful work.');
    show('realityAutoBacklogCount','0 checked candidates');
    show('realityAutoBacklogCalibrated','0 accepted baselines');
    return;
   }
   show('realityAutoBacklogDollars',
    money(r.conditional_conservative.conditional_total_labor_equivalent_usd)+
    ' – '+money(r.conditional_extended.conditional_total_labor_equivalent_usd));
   show('realityAutoBacklogHours',
    r.conditional_conservative.conditional_total_hours.toFixed(2)+
    ' – '+r.conditional_extended.conditional_total_hours.toFixed(2)+' hrs');
   show('realityAutoBacklogCount',
    String(r.counts.included_distinct_leaf_issues));
   show('realityAutoBacklogCalibrated','0 accepted baselines');
   const t=r.transparency;
   explanation.textContent=
    'ILLUSTRATIVE CONDITIONAL SCENARIO · '+r.counts.included_distinct_leaf_issues+
    ' source-linked, not independently confirmed issues. Assumes '+(t.conservative_discovery_minutes_per_issue/60)+
    '–'+(t.extended_discovery_minutes_per_issue/60)+
    ' hours of discovery and '+(t.conservative_execution_minutes_per_issue/60)+
    '–'+(t.extended_execution_minutes_per_issue/60)+
    ' hours of execution per issue. '+money(r.applied_wage_usd_per_hour)+
    '/hour public median employee wage, not a company rate. '+
    r.counts.explicit_parent_objectives_excluded+
    ' explicit parent objective(s) excluded. '+
    (r.source_coverage==='PARTIAL_SOURCE_WINDOW'?'Source coverage partial. ':'')+
    'Other overlap and finished historical work may remain. '+
    'No measured task duration, guaranteed demand, recurring daily amount or verified dollar savings.';
   evidence.replaceChildren();
   for(const item of r.included_issues.slice(0,5)){
    const a=document.createElement('a');
    a.href=item.issue_url;a.target='_blank';a.rel='noopener noreferrer';
    a.textContent='Issue #'+item.issue_number+' · Source';
    evidence.append(a);
   }
  }catch{
   if(id===epoch&&signed())
    reset('Automatic planning evidence could not be verified. '+
     'No human time, potential value, or savings total claimed.');
  }
 }
 if(typeof MutationObserver==='function')new MutationObserver(()=>{
  if(!signed()){
   ++epoch;reset('Sign in to view automatic economic scenarios.');
  }else void load();
 }).observe(auth,{attributes:true,attributeFilter:['style']});
 if(typeof document.addEventListener==='function')
  document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible'&&signed())void load();
  });
 if(typeof window!=='undefined'&&typeof window.addEventListener==='function')
  window.addEventListener('focus',()=>{if(signed())void load()});
 if(typeof setInterval==='function')
  setInterval(()=>{
   if(signed()&&
    (typeof document.visibilityState!=='string'||
     document.visibilityState==='visible'))void load();
  },90000);
 void load();
})();
