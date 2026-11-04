// Client-only view of EXISTING Reality economic/work categories and owner's
// separate capability gap ledger. No job, approval, installation or billing
// actions. Provider observations and owner records must never be summed as
// independent jobs because the same underlying repair can appear twice.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const root=$('realityCategoryEconomics'),auth=$('privateReady');
const status=$('realityCategoryEconomicsStatus'),grid=$('realityCategoryList');
const owner=$('realityCategoryOwnerList'),ownerStatus=$('realityCategoryOwnerStatus');
if(!root||!auth||!status||!grid||!owner||!ownerStatus)return;
const issue=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const ownerUrl=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const key=/^(?:research|ci|candidate|queue):[a-f0-9-]{32,64}$/;
const knownCategory=new Map([
 ['customer','Customer issues & feedback'],['bugs','Bug fixes'],
 ['upgrades','Upgrades & improvements'],['features','New features'],
 ['reliability','Performance & reliability'],
 ['integrations','Integrations & deployment'],['security','Security, governance & evidence'],
 ['operations','Operations & workflow'],['research','Research & opportunities'],
 ['automation','Automation & time returned']
]);
const kinds={
 RESEARCH_OPPORTUNITY:'Assessed research / improvement',
 CI_FAILURE_INVESTIGATION:'Provider failure requiring investigation',
 INDEPENDENTLY_TESTED_CANDIDATE:'Prior tested candidate awaiting exact work binding',
 GOVERNED_ORIGINAL_JOB_GAP:'Governed original-job capability gap'
};
const statuses=new Set([
 'INSPECTED_NEEDS_INDEPENDENT_GAP_TEST',
 'OBSERVED_PROVIDER_FAILURE_ROOT_CAUSE_UNKNOWN',
 'TESTED_AWAITING_FRESH_OWNER_WORK_BINDING',
 'PENDING_FROZEN_REPRODUCTION','LEASED_FOR_INDEPENDENT_REPRODUCTION',
 'FROZEN_REPRODUCED_AWAITING_CANDIDATE','AWAITING_OWNER_APPROVAL',
 'AWAITING_INSTALLATION_APPROVAL',
 'IMPLEMENTATION_DEFECT_REPRODUCED_REPAIR_TESTED_OWNER_REVIEW'
]);
const number=x=>Number.isSafeInteger(x)&&x>=0;
const fmt=x=>'$'+x.toLocaleString('en-US',{
 minimumFractionDigits:2,maximumFractionDigits:2});
const signed=()=>auth.style.display==='block';
const set=(id,s)=>{if($(id))$(id).textContent=s};
let epoch=0;
function reset(note){
 set('realityCategorySignalCount','Unknown');
 set('realityCategoryOwnerCount','Unknown');
 set('realityCategoryVerifiedRepairs','Unknown');
 set('realityCategoryReviewValue','Unknown');
 set('realityCategoryScope',
  'Review-labor scenarios are not verified business impact. Different categories may refer to the same original problem; savings, completed work, and actual repair hours require separate receipts.');
 grid.replaceChildren();owner.replaceChildren();
 ownerStatus.textContent='Private owner upgrade intake not independently read back.';
 status.textContent=note;
}
function validPortfolio(d){
 const c=d?.counts,a=d?.assumptions;
 const g=d?.categories;
 if(d?.ok!==true||d.version!=='reality-category-evidence-economics-v1'||
  !['SOURCE_BACKED_CATEGORIES_OBSERVED','PARTIAL_CATEGORY_SOURCE_COVERAGE'].includes(d.status)||
  d.source_scope!=='REALITY_GITHUB_WORK_CENTER_TEN_CATEGORIES'||
  d.source_evidence_stages!=='GITHUB_SOURCE_OBSERVATIONS_NOT_ALL_VERIFIED_GAPS'||
  d.owner_upgrade_ledger_separately_required!==true||
  d.original_work_independent_settlements_included!==false||
  d.measured_human_hours!==null||
  d.independently_verified_discovery_time_saved_usd!==null||
  d.independently_verified_execution_time_saved_usd!==null||
  d.verified_cash_savings_usd!==null||
  d.read_only!==true||d.owner_approval_granted!==false||
  d.job_started!==false||d.installation_authorized!==false||
  d.production_changed!==false||!Array.isArray(g)||g.length!==10||
  !number(c?.provider_observations)||
  !number(c?.open_issues)||!number(c?.pending_pr_review)||
  !number(c?.previous_failure_signals)||
  !number(c?.recent_commits_excluded)||
  c.provider_observations!==(c.open_issues+c.pending_pr_review+
    c.previous_failure_signals)||
  a?.provenance!=='TRANSPARENT_EDITORIAL_ASSUMPTIONS_UNCALIBRATED_VERY_LOW_CONFIDENCE'||
  a.task_completion_effort_estimated!==false||
  a.source_links_do_not_prove_business_impact!==true||
  a.overlap_between_distinct_source_urls_not_ruled_out!==true||
  typeof a.public_wage_usd_per_hour!=='number'||
  !Number.isFinite(a.public_wage_usd_per_hour)||
  a.public_wage_usd_per_hour<5||a.public_wage_usd_per_hour>500||
  !Array.isArray(a.open_issue_review_minutes)||
  !Array.isArray(a.pending_pr_review_minutes)||
  !Array.isArray(a.prior_failure_validation_minutes))
  return false;
 const ids=new Set();
 let total=0,low=0,high=0;
 for(const item of g){
  if(!knownCategory.has(item?.id)||ids.has(item.id)||
   item.label!==knownCategory.get(item.id)||
   !number(item.provider_observations)||
   !number(item.issue_count)||!number(item.pending_change_count)||
   !number(item.prior_failure_signal_count)||
   item.provider_observations!==item.issue_count+
    item.pending_change_count+item.prior_failure_signal_count||
   item.triage_rank_not_business_value!==true||
   item.actual_job_value_usd!==null||
   item.saved_discovery_cost_usd!==null||
   item.verified_savings_usd!==null||
   !Array.isArray(item.top_evidence)||item.top_evidence.length>3||
   item.top_evidence.length>item.provider_observations||
   item.top_evidence.some(x=>
    !issue.test(String(x?.source_url||''))||
    x.category!==item.id||
    !number(x.priority_heuristic)||
    x.independently_verified_current_defect!==false||
    x.human_review_duration_measured!==false||
    x.is_settled_original_job!==false)||
   item.review_workload_what_if?.evidence_status!==
    'UNMEASURED_REVIEW_PRESETS_NOT_HUMAN_WORK_MEASUREMENT'||
   !['conditional_low_hours','conditional_high_hours',
    'conditional_low_gross_wage_usd',
    'conditional_high_gross_wage_usd'].every(x=>
     typeof item.review_workload_what_if[x]==='number'&&
     Number.isFinite(item.review_workload_what_if[x])&&
     item.review_workload_what_if[x]>=0))
   return false;
  ids.add(item.id);total+=item.provider_observations;
  low+=item.review_workload_what_if.conditional_low_gross_wage_usd;
  high+=item.review_workload_what_if.conditional_high_gross_wage_usd;
 }
 return ids.size===10&&total===c.provider_observations&&
  typeof d.human_review_what_if?.conditional_low_gross_wage_usd==='number'&&
  typeof d.human_review_what_if?.conditional_high_gross_wage_usd==='number'&&
  Math.abs(low-d.human_review_what_if.conditional_low_gross_wage_usd)<0.1&&
  Math.abs(high-d.human_review_what_if.conditional_high_gross_wage_usd)<0.1;
}
function validOwner(d){
 if(d?.ok!==true||d.status!=='OWNER_GAP_INTAKE_RECONCILED'||
  d.source_basis!=='PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH'||
  d.read_only!==true||d.installation_authorized!==false||
  d.work_started!==false||d.production_changed!==false||
  !Array.isArray(d.items)||d.items.length>30||
  !Array.isArray(d.settled_history)||d.settled_history.length>12||
  !number(d.counts?.current_candidates)||d.counts.current_candidates!==d.items.length||
  !number(d.counts.historical_completed)||
  d.counts.historical_completed!==d.settled_history.length||
  !number(d.counts.verified_current_gaps)||
  !number(d.counts.verified_implementation_defects)||
  !number(d.counts.independently_tested_research_repairs)||
  d.counts.verified_implementation_defects!==
   d.counts.independently_tested_research_repairs||
  d.counts.verified_current_gaps!==
   d.items.filter(x=>x.verified_missing_capability===true).length||
  d.counts.verified_implementation_defects!==
   d.items.filter(x=>x.repair_proof?.status==='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED').length||
  new Set(d.items.map(x=>x.key)).size!==d.items.length)
  return false;
 return d.items.every(x=>
  Object.hasOwn(kinds,x?.kind)&&
  key.test(String(x.key||''))&&
  statuses.has(x.stage)&&
  typeof x.title==='string'&&x.title.length>=5&&x.title.length<=220&&
  typeof x.next_proof==='string'&&x.next_proof.length>=20&&
  x.verified_missing_capability===true||false /* repaired below */);
}
function validateOwnerRecords(d){
 if(!validOwnerBase(d))return false;
 return d.items.every(x=>
  Object.hasOwn(kinds,x?.kind)&&
  key.test(String(x.key||''))&&statuses.has(x.stage)&&
  typeof x.title==='string'&&x.title.length>=5&&x.title.length<=220&&
  typeof x.next_proof==='string'&&x.next_proof.length>=20&&
  typeof x.verified_missing_capability==='boolean'&&
  (x.verified_missing_capability!==true||x.kind==='GOVERNED_ORIGINAL_JOB_GAP')&&
  x.installation_authorized===false&&x.executable_job===false&&
  (x.repair_proof==null||
   (x.kind==='RESEARCH_OPPORTUNITY'&&
    x.stage==='IMPLEMENTATION_DEFECT_REPRODUCED_REPAIR_TESTED_OWNER_REVIEW'&&
    x.repair_proof.status==='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'&&
    x.repair_proof.proof_kind==='EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT'&&
    x.repair_proof.owner_install_authorized===false&&
    x.repair_proof.fresh_original_work_verified===false&&
    x.repair_proof.installed===false&&
    x.verified_missing_capability===false))
 );
}
function validOwnerBase(d){
 if(d?.ok!==true||d.status!=='OWNER_GAP_INTAKE_RECONCILED'||
  d.source_basis!=='PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH'||
  d.read_only!==true||d.installation_authorized!==false||
  d.work_started!==false||d.production_changed!==false||
  !Array.isArray(d.items)||d.items.length>30||
  !Array.isArray(d.settled_history)||d.settled_history.length>12||
  !number(d.counts?.current_candidates)||d.counts.current_candidates!==d.items.length||
  !number(d.counts.historical_completed)||
  d.counts.historical_completed!==d.settled_history.length||
  !number(d.counts.verified_current_gaps)||
  !number(d.counts.verified_implementation_defects)||
  !number(d.counts.independently_tested_research_repairs)||
  d.counts.verified_implementation_defects!==
   d.counts.independently_tested_research_repairs||
  d.counts.verified_current_gaps!==
   d.items.filter(x=>x.verified_missing_capability===true).length||
  d.counts.verified_implementation_defects!==
   d.items.filter(x=>x.repair_proof?.status==='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED').length||
  new Set(d.items.map(x=>x.key)).size!==d.items.length)
  return false;
 return true;
}
function paragraph(target,value){
 const p=document.createElement('p');p.textContent=value;target.append(p);
}
function providerRender(data){
 grid.replaceChildren();
 set('realityCategorySignalCount',String(data.counts.provider_observations));
 set('realityCategoryReviewValue',
  fmt(data.human_review_what_if.conditional_low_gross_wage_usd)+
  ' – '+fmt(data.human_review_what_if.conditional_high_gross_wage_usd));
 set('realityCategoryScope',
  'Conditional gross cost to review and validate observed findings only · using publicly sourced software-developer wages and uncalibrated 15–120 minute triage presets. '+
  data.counts.recent_commits_excluded+' past commits excluded; '+
  data.counts.duplicate_source_observations_excluded+
  ' duplicate provider records filtered. Distinct records can still overlap. '+
  (data.source_catalog_truncated?'Catalog truncated: count not exhaustive. ':'')+
  'Actual repair hours, customer outcome value, human time saved and dollars saved are not established.');
 for(const item of data.categories){
  const el=document.createElement('article');el.className='reality-category-card';
  const header=document.createElement('h4');header.textContent=item.label;
  const num=document.createElement('p');
  num.textContent=item.provider_observations+' source-backed observation(s) · '+
   item.issue_count+' open issue(s), '+item.pending_change_count+
   ' pending PR(s), '+item.prior_failure_signal_count+' prior failure signal(s)';
  const value=document.createElement('p');
  value.textContent='Human triage workload what-if: '+
   fmt(item.review_workload_what_if.conditional_low_gross_wage_usd)+
   ' – '+fmt(item.review_workload_what_if.conditional_high_gross_wage_usd)+
   ' · NOT measured savings';
  const caveat=document.createElement('p');
  caveat.textContent=item.category_has_unconnected_business_source?
   'Additional business source not connected; absence of findings is not evidence of no work.':
   item.provider_observations===0?
    'No qualifying source observation in this checked window.':
    'Findings still need independent current-impact verification.';
  el.append(header,num,value,caveat);
  for(const f of item.top_evidence.slice(0,2)){
   const link=document.createElement('a');
   link.href=f.source_url;link.target='_blank';link.rel='noopener noreferrer';
   link.textContent=String(f.title||'Inspect source').slice(0,90);
   el.append(link);
  }
  grid.append(el);
 }
}
function ownerRender(data){
 set('realityCategoryOwnerCount',String(data.counts.current_candidates));
 set('realityCategoryVerifiedRepairs',
  String(data.counts.verified_implementation_defects));
 owner.replaceChildren();
 ownerStatus.textContent=
  data.counts.current_candidates+' saved current owner intake record(s) · '+
  data.counts.verified_current_gaps+' independently verified missing capability gap(s) · '+
  data.counts.verified_implementation_defects+' independently tested existing-code repair(s) · '+
  data.counts.historical_completed+' previous settlement(s) excluded from current work. '+
  'Owner intake and GitHub observations can describe the same underlying work; their counts are NOT added or priced twice.';
 for(const item of data.items.slice(0,8)){
  const el=document.createElement('article');
  const heading=document.createElement('strong');
  heading.textContent=String(item.title).slice(0,160);
  const kind=document.createElement('p');
  kind.textContent=(item.repair_proof?
   'Independently reproduced implementation defect · repair candidate tests passed; not installed':
   item.verified_missing_capability===true?
    'Verified current missing capability · exact original job still governed':
    kinds[item.kind])+
    ' · '+item.stage.replaceAll('_',' ').toLowerCase();
  const next=document.createElement('p');
  next.textContent='Next proof: '+String(item.next_proof).slice(0,220);
  const value=document.createElement('p');
  value.textContent='Potential completion value: not yet measured. Labor equivalent requires task-scoped human baseline and no double counting.';
  el.append(heading,kind,next,value);
  if(ownerUrl.test(String(item.source_url||''))){
   const link=document.createElement('a');
   link.href=item.source_url;link.target='_blank';
   link.rel='noopener noreferrer';link.textContent='Open existing source evidence';
   el.append(link);
  }
  owner.append(el);
 }
 if(data.items.length>8)paragraph(owner,
  'Additional owner category findings are available in Reality Work Center.');
}
async function request(path){
 const res=await fetch(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
 if(!res.ok)throw Error('SOURCE_UNAVAILABLE');
 const data=await res.json();
 if(data?.ok!==true)throw Error('SOURCE_UNVERIFIED');
 return data;
}
async function refresh(){
 if(!signed()){
  ++epoch;reset('Sign in to examine the business value evidence in Reality’s existing categories.');
  return;
 }
 const n=++epoch;
 status.textContent='Reading the existing Work Center categories and private owner capability findings…';
 const fetched=await Promise.allSettled([
  request('/api/reality/personal-category-economics'),
  request('/api/reality/personal-gap-intake')
 ]);
 if(n!==epoch||!signed())return;
 reset('Loading checked category evidence…');
 const c=fetched[0].status==='fulfilled'&&validPortfolio(fetched[0].value)?
  fetched[0].value:null;
 const o=fetched[1].status==='fulfilled'&&validateOwnerRecords(fetched[1].value)?
  fetched[1].value:null;
 if(c)providerRender(c);
 else paragraph(grid,'The current Work Center catalog could not be independently validated. No source count or labor value is inferred.');
 if(o)ownerRender(o);
 else{
  ownerStatus.textContent='Private owner upgrade intake could not be independently verified. Counts are unknown, not zero.';
  paragraph(owner,'Saved research, verified repair candidates and governed capability gaps remain preserved in Reality. Their value is not inferred from this unavailable readback.');
 }
 status.textContent=c&&o?
  'Both source readbacks validated · Work Center categories and owner upgrade intake shown separately. No new work or economic receipt created.':
  (c||o)?
   'Partial category evidence · '+(c?'Public Work Center checked. ':'Owner ledger checked. ')+
   'Missing source totals remain unknown.':
   'Category and owner evidence readbacks unavailable. No work, hours, or savings claimed.';
}
if(typeof MutationObserver==='function')
 new MutationObserver(()=>{if(!signed()){++epoch;reset('Sign in for owner-protected category evidence.');}
  else void refresh();}).observe(auth,{attributes:true,attributeFilter:['style']});
if(typeof document.addEventListener==='function')
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&signed())void refresh();
 });
if(typeof window!=='undefined'&&typeof window.addEventListener==='function')
 window.addEventListener('focus',()=>{if(signed())void refresh()});
if(typeof setInterval==='function')
 setInterval(()=>{if(signed()&&
  (typeof document.visibilityState!=='string'||document.visibilityState==='visible'))
  void refresh()},90000);
void refresh();
})();
