// Evidence-linked *potential* labor value for Reality's open-issue backlog.
// User-entered discovery and execution hours are not independent time proof.
// Data is session only. A scenario is not an installation or savings receipt.
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const root=$('realityBacklogValuePanel'),status=$('realityBacklogValueStatus');
 const list=$('realityBacklogInputItems'),button=$('realityBacklogCompute');
 const auth=$('privateReady');
 if(!root||!status||!list||!button||!auth)return;
 const issueURL=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
 const ID=/^catalog:[a-f0-9]{32}$/;
 const fmt=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const ready=()=>auth.style.display==='block';
 const put=(id,text)=>{if($(id))$(id).textContent=text};
 let epoch=0,candidates=[],wage=null,inFlight=false;
 const inputs=new Map();
 const resetAmounts=()=>{
  put('realityBacklogDiscoveryValue','Not estimated');
  put('realityBacklogExecutionValue','Not estimated');
  put('realityBacklogTotalValue','Not estimated');
  put('realityBacklogTotalHours','Not estimated');
 };
 const clear=(message)=>{
  ++epoch;candidates=[];wage=null;inputs.clear();inFlight=false;
  list.replaceChildren();button.disabled=true;resetAmounts();
  put('realityBacklogWageContext','Reference occupational rate: awaiting source readback.');
  status.textContent=message;
  put('realityBacklogValueFootnote',
   'No scenario is recorded as an economic receipt. Unknown values are not zero or verified savings.');
 };
 const valid=data=>{
  const w=data?.illustrative_labor_reference;
  return data?.ok===true&&data.read_only===true&&
   data.source_scope==='REALITY_GITHUB_REPOSITORY_ONLY'&&
   ['SOURCE_BACKED_DISCOVERY_PARTIAL','SOURCE_BACKED_DISCOVERY_OBSERVED'].includes(data.status)&&
   data.phase==='DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY'&&
   data.evidence_status==='SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS'&&
   data.job_started===false&&data.installation_authorized===false&&
   data.production_changed===false&&data.shift_completed===false&&
   Array.isArray(data.items)&&data.items.length<=25&&
   w?.version==='HUMAN_LABOR_BENCHMARK_V1_STATIC_SOURCE'&&
   w.status==='PUBLIC_MEDIAN_WAGE_NOT_A_TASK_DURATION_OR_LOADED_COST'&&
   w.source_provider==='BLS'&&
   w.source_url==='https://www.bls.gov/news.release/ocwage.t01.htm'&&
   w.occupation_soc==='15-1252'&&w.calibrated_for_this_business===false&&
   w.estimates_owner_entered_only===true&&w.verified_hours_saved===null&&
   w.verified_cash_savings_usd===null&&
   typeof w.hourly_usd==='number'&&Number.isFinite(w.hourly_usd)&&
   w.hourly_usd>=5&&w.hourly_usd<=500;
 };
 function readIssues(d){
  const chosen=[],seen=new Set(),ids=new Set();
  for(const item of d.items){
   if(item?.finding_type!=='OPEN_ISSUE')continue;
   const url=item.evidence_refs?.[0],id=item.finding_id;
   if(!ID.test(String(id||''))||!issueURL.test(String(url||''))||
    item.state!=='TRACKED_NEEDS_REVIEW'||
    item.verified_current_defect!==false||
    item.authorized_execution!==false||
    item.verified_time_saved_minutes!==null||
    item.verified_financial_value_usd!==null||
    item.human_baseline_minutes!==null||
    ids.has(id))throw Error('UNTRUSTED_ISSUE_READBACK');
   ids.add(id);
   if(seen.has(url))continue;
   seen.add(url);
   chosen.push({id,url,title:String(item.title||'Unverified open issue').slice(0,220)});
  }
  return chosen.slice(0,12);
 }
 const number=value=>{
  if(value==='')return 0;
  const n=Number(value);
  return Number.isFinite(n)&&n>=0&&n<=80&&
   Number.isSafeInteger(n*60)&&n*60%15===0?n*60:null;
 };
 function render(){
  list.replaceChildren();
  for(const candidate of candidates){
   const card=document.createElement('article');
   const name=document.createElement('strong');name.textContent=candidate.title;
   const evidence=document.createElement('a');
   evidence.href=candidate.url;evidence.target='_blank';
   evidence.rel='noopener noreferrer';evidence.textContent='Review open GitHub issue';
   const pair=document.createElement('div');
   pair.className='reality-econ-input-pair';
   const saved=inputs.get(candidate.id)||['',''];
   const controls=[];
   for(const [i,label] of ['Discovery/diagnosis hours','Execution/repair hours'].entries()){
    const wrap=document.createElement('label');wrap.textContent=label;
    const input=document.createElement('input');
    input.type='number';input.inputMode='decimal';input.min='0';
    input.max='80';input.step='0.25';input.placeholder='0.00';
    input.value=saved[i];
    input.setAttribute('aria-label',label+' for '+candidate.title);
    input.addEventListener('input',()=>{
     inputs.set(candidate.id,[controls[0].value,controls[1].value]);
     resetAmounts();
     status.textContent='Assumptions changed. Recalculate to show a new illustrative estimate.';
    });
    wrap.append(input);pair.append(wrap);controls.push(input);
   }
   card.append(name,evidence,pair);list.append(card);
  }
  button.disabled=candidates.length===0;
 }
 async function load(){
  if(!ready()){clear('Sign in to estimate the potential value of source-backed work.');return}
  const token=++epoch;
  status.textContent='Checking current open issues and public occupational wage context…';
  try{
   const r=await fetch('/api/reality/workday-opportunities',{
    method:'GET',credentials:'same-origin',cache:'no-store'});
   if(!r.ok)throw Error('CATALOG_UNAVAILABLE');
   const d=await r.json();
   if(token!==epoch||!ready())return;
   if(!valid(d))throw Error('WAGE_CONTEXT_UNVERIFIED');
   const fresh=readIssues(d);
   // A newly encountered or closed issue invalidates earlier client estimates.
   const currentIds=new Set(fresh.map(x=>x.id));
   for(const id of [...inputs.keys()])if(!currentIds.has(id))inputs.delete(id);
   candidates=fresh;wage=d.illustrative_labor_reference;
   resetAmounts();
   put('realityBacklogWageContext',
    'Illustrative rate: '+fmt(wage.hourly_usd)+'/hour · U.S. national median software developer wage ('+
    String(wage.observation_period)+') · Not employer-loaded cost, task duration, or guaranteed savings.');
   render();
   status.textContent=candidates.length?
    candidates.length+' distinct source-linked issue(s) available for an illustrative scenario. '+
    'Enter your estimated human hours below. No issue has been independently validated by this forecast.':
    'No eligible open issues in the checked source window. This is not evidence that no work exists.';
   put('realityBacklogValueFootnote',
    'Only open issues may be included; pull requests, previous CI failures, and recent commits are excluded. '+
    'Separate issue numbers can still describe overlapping work, so review before entering hours. Estimates are not saved.');
  }catch{
   if(token===epoch&&ready())clear(
    'Current source or wage evidence unavailable; potential backlog value remains unknown.');
  }
 }
 async function calculate(){
  if(!ready()||!wage||inFlight||!candidates.length)return;
  const assumptions=[];
  for(const candidate of candidates){
   const val=inputs.get(candidate.id)||['',''];
   const discovery=number(val[0]),execution=number(val[1]);
   if(discovery===null||execution===null){
    status.textContent='Use quarter-hour increments from 0 to 80 hours for each issue.';
    resetAmounts();return;
   }
   if(discovery+execution>0)assumptions.push({
    finding_id:candidate.id,assumed_discovery_minutes:discovery,
    assumed_execution_minutes:execution});
  }
  if(!assumptions.length){
   status.textContent='Enter at least one source-specific human-time assumption. No hours are invented.';
   resetAmounts();return;
  }
  if(assumptions.length>12)return;
  const token=++epoch;
  inFlight=true;button.disabled=true;
  status.textContent='Calculating a source-checked illustrative scenario. No work or billable action started…';
  try{
   const response=await fetch('/api/reality/backlog-value-scenario',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},body:JSON.stringify({assumptions})});
   if(!response.ok)throw Error('SCENARIO_UNAVAILABLE');
   const value=await response.json();
   if(token!==epoch||!ready())return;
   const ids=new Set(assumptions.map(x=>x.finding_id));
   if(value?.ok!==true||
    value.version!=='reality-backlog-labor-scenario-v1'||
    value.status!=='HYPOTHETICAL_SOURCE_LINKED_OWNER_LABOR_SCENARIO'||
    value.evidence_status!=='HUMAN_ESTIMATE_UNVERIFIED_ISSUE_REQUIRES_VALIDATION'||
    value.assumptions_origin!=='EXPLICIT_OWNER_INPUT_NOT_INDEPENDENTLY_MEASURED'||
    value.assumption_scope!=='ONE_TIME_GROSS_LABOR_EQUIVALENT_NOT_RECURRING_SAVINGS'||
    value.baseline_confidence!=='UNVERIFIED_OWNER_ASSUMPTIONS'||
    value.dollar_savings_verified!==false||value.realized_cash_savings_usd!==null||
    value.net_operating_value_usd!==null||
    value.independently_validated_backlog_hours!==null||
    value.scenario_not_persisted!==true||
    value.read_only!==true||value.job_started!==false||
    value.installation_authorized!==false||value.production_changed!==false||
    value.scenarios_included!==assumptions.length||
    !Array.isArray(value.scenario_issues)||
    value.scenario_issues.length!==assumptions.length||
    value.scenario_issues.some(x=>!ids.has(x.finding_id)||
     x.validated_current_defect!==false||
     x.human_estimate_evidence_status!=='OWNER_INPUT_UNVERIFIED'||
     x.savings_verified!==false)||
    typeof value.illustrative_wage_context?.hourly_usd!=='number'||
    value.illustrative_wage_context.hourly_usd!==wage.hourly_usd||
    !['estimated_discovery_hours','estimated_execution_hours',
     'estimated_combined_human_hours','hypothetical_discovery_labor_equivalent_usd',
     'hypothetical_execution_labor_equivalent_usd',
     'hypothetical_total_labor_equivalent_usd'].every(k=>
      typeof value[k]==='number'&&Number.isFinite(value[k])&&value[k]>=0))
    throw Error('UNTRUSTED_ECONOMIC_PROJECTION');
   const minuteSum=key=>assumptions.reduce((n,x)=>n+x[key],0);
   const minDiscovery=minuteSum('assumed_discovery_minutes');
   const minExecution=minuteSum('assumed_execution_minutes');
   const tolerance=0.011;
   if(Math.abs(value.estimated_discovery_hours-minDiscovery/60)>tolerance||
    Math.abs(value.estimated_execution_hours-minExecution/60)>tolerance||
    Math.abs(value.estimated_combined_human_hours-
     (minDiscovery+minExecution)/60)>tolerance||
    Math.abs(value.hypothetical_total_labor_equivalent_usd-
     (minDiscovery+minExecution)/60*wage.hourly_usd)>tolerance)
    throw Error('ECONOMIC_CALCULATION_MISMATCH');
   put('realityBacklogDiscoveryValue',fmt(value.hypothetical_discovery_labor_equivalent_usd));
   put('realityBacklogExecutionValue',fmt(value.hypothetical_execution_labor_equivalent_usd));
   put('realityBacklogTotalValue',fmt(value.hypothetical_total_labor_equivalent_usd));
   put('realityBacklogTotalHours',value.estimated_combined_human_hours.toFixed(2)+' hrs');
   status.textContent='Illustrative only · '+value.scenarios_included+
    ' source-linked issue(s) · unverified owner-entered time and median wage · no recurring or realized savings established.';
   put('realityBacklogValueFootnote',
    'Gross labor equivalent for the selected source-specific assumptions—not company savings. '+
    'Issue overlap, actual labor time, implementation costs and execution success remain unverified. '+
    'This calculation is session-only; no economic receipt, owner approval, or job was created.');
  }catch{
   if(token===epoch&&ready()){
    resetAmounts();
    status.textContent='Economic scenario could not be independently reconciled with current source evidence. No value claimed.';
   }
  }finally{
   inFlight=false;
   if(ready())button.disabled=candidates.length===0;
  }
 }
 button.addEventListener('click',()=>{void calculate()});
 if(typeof MutationObserver==='function')new MutationObserver(()=>{
  if(!ready())clear('Sign in to see your private estimate inputs.');
  else void load();
 }).observe(auth,{attributes:true,attributeFilter:['style']});
 if(typeof document.addEventListener==='function')
  document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible'&&ready())void load();
  });
 if(typeof window!=='undefined'&&typeof window.addEventListener==='function')
  window.addEventListener('focus',()=>{if(ready())void load()});
 void load();
})();
