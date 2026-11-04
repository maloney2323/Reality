import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {assessEvidenceBackedWork} from '../src/reality-work-value-assessment-v0.1.js';
import {buildCategoryEconomicPortfolio}
 from '../src/reality-category-economic-portfolio-v1.js';
const base='https://github.com/maloney2323/Reality';
const sample=(n,typ,category,ref)=>{
 const source={OPEN_ISSUE:'github_issues',OPEN_PULL_REQUEST:'github_pull_requests',
  RECURRING_FAILURE:'github_actions'};
 const state={OPEN_ISSUE:'TRACKED_NEEDS_REVIEW',
  OPEN_PULL_REQUEST:'OPEN_AWAITING_REVIEW',
  RECURRING_FAILURE:'DISCOVERED_REQUIRES_REVIEW'};
 const record={
  finding_id:'catalog:'+String(n).padStart(32,'a'),
  title:typ+' '+n,category,source:source[typ],finding_type:typ,
  state:state[typ],evidence_refs:[ref],execution_work_item:null,
  authorization_required:false
 };
 return {...record,value_assessment:assessEvidenceBackedWork(record)};
};
const issue=sample(1,'OPEN_ISSUE','bugs',base+'/issues/201');
const pr=sample(2,'OPEN_PULL_REQUEST','upgrades',base+'/pull/211');
const ci=sample(3,'RECURRING_FAILURE','reliability',
 base+'/actions/runs/41845464426');
const recent={...issue,finding_id:'catalog:'+'c'.repeat(32),
 finding_type:'RECENT_CHANGE_TO_VERIFY',source:'github_commits'};
const catalog=(items=[issue,pr,ci,recent])=>({
 version:'reality-work-catalog-v0.1',status:'OBSERVED',
 authority:'NONE_GRANTED',execution_enabled:false,items,
 total_findings:items.length,
 source_coverage:{
  issues:'checked',pull_requests:'checked',actions:'checked',commits:'checked',
  customer_feedback:'not_connected',business_operations:'not_connected',
  external_research:'not_connected'
 }
});
test('all ten real Work Center categories appear with source observations and explicit uncalibrated review-only value',()=>{
 const r=buildCategoryEconomicPortfolio(catalog());
 assert.equal(r.version,'reality-category-evidence-economics-v1');
 assert.equal(r.status,'SOURCE_BACKED_CATEGORIES_OBSERVED');
 assert.equal(r.categories.length,10);
 assert.equal(r.counts.provider_observations,3);
 assert.equal(r.counts.recent_commits_excluded,1);
 assert.equal(r.counts.open_issues,1);
 assert.equal(r.counts.pending_pr_review,1);
 assert.equal(r.counts.previous_failure_signals,1);
 assert.equal(r.categories.find(x=>x.id==='bugs').provider_observations,1);
 assert.equal(r.categories.find(x=>x.id==='upgrades').provider_observations,1);
 assert.equal(r.categories.find(x=>x.id==='reliability').provider_observations,1);
 assert.equal(r.categories.find(x=>x.id==='customer').category_has_unconnected_business_source,true);
 assert.equal(r.categories.find(x=>x.id==='operations').category_has_unconnected_business_source,true);
 assert.equal(r.categories.find(x=>x.id==='research').category_has_unconnected_business_source,true);
 assert.equal(r.human_review_what_if.conditional_low_hours,1.25);
 assert.equal(r.human_review_what_if.conditional_high_hours,4.5);
 assert.equal(r.human_review_what_if.conditional_low_gross_wage_usd,81.73);
 assert.equal(r.human_review_what_if.conditional_high_gross_wage_usd,294.21);
 assert.equal(r.assumptions.public_wage_usd_per_hour,65.38);
 assert.equal(r.assumptions.task_completion_effort_estimated,false);
 assert.equal(r.measured_human_hours,null);
 assert.equal(r.verified_cash_savings_usd,null);
 assert.equal(r.owner_upgrade_ledger_separately_required,true);
 assert.equal(r.job_started,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
});
test('duplicates, historical commits and unsupported source records are excluded',()=>{
 const duplicate={...issue,finding_id:'catalog:'+'d'.repeat(32)};
 const bad={...issue,finding_id:'catalog:'+'e'.repeat(32),
  evidence_refs:['https://evil.example/issues/201']};
 const r=buildCategoryEconomicPortfolio(catalog([issue,duplicate,bad,pr,recent]));
 assert.equal(r.counts.provider_observations,2);
 assert.equal(r.counts.duplicate_source_observations_excluded,1);
 assert.equal(r.counts.invalid_untrusted_source_observations_excluded,1);
 assert.equal(r.counts.recent_commits_excluded,1);
 assert.equal(r.categories.find(x=>x.id==='bugs').provider_observations,1);
});
test('partial source catalog never claims exhaustive discovery or existing work completed',()=>{
 const original=catalog([issue,pr]);
 original.status='PARTIAL';original.total_findings=51;
 original.source_coverage.issues='unavailable';
 const r=buildCategoryEconomicPortfolio(original);
 assert.equal(r.source_catalog_truncated,true);
 assert.equal(r.status,'PARTIAL_CATEGORY_SOURCE_COVERAGE');
 assert.equal(r.original_work_independent_settlements_included,false);
 assert.equal(r.categories.find(x=>x.id==='bugs').actual_job_value_usd,null);
});
test('invalid catalog authority and spoofed measured impact are rejected or excluded',()=>{
 const original=catalog();
 assert.throws(()=>buildCategoryEconomicPortfolio({...original,authority:'OWNER_APPROVED'}),
  /UNTRUSTED_CATALOG/);
 assert.throws(()=>buildCategoryEconomicPortfolio({...original,execution_enabled:true}),
  /UNTRUSTED_CATALOG/);
 const forged={...issue,value_assessment:{
  ...issue.value_assessment,
  labor:{status:'MEASURED_EFFORT',manual_minutes:2}
 }};
 const r=buildCategoryEconomicPortfolio(catalog([forged]));
 assert.equal(r.counts.provider_observations,0);
 assert.equal(r.counts.invalid_untrusted_source_observations_excluded,1);
});
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const browser=readFileSync(new URL('../reality-category-economic-bridge-v1.js',import.meta.url),'utf8');
function el(tag='div'){
 return {tag,textContent:'',children:[],style:{display:'block'},disabled:false,
  append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x}};
}
const ids=['realityCategoryEconomics','privateReady','realityCategoryEconomicsStatus',
 'realityCategoryList','realityCategoryOwnerList','realityCategoryOwnerStatus',
 'realityCategorySignalCount','realityCategoryOwnerCount',
 'realityCategoryVerifiedRepairs','realityCategoryReviewValue','realityCategoryScope'];
const ownerItem=(kind,key,proof=false)=>({
 key,title:'Original owner verified work '+key.slice(0,8),
 kind,stage:proof?'IMPLEMENTATION_DEFECT_REPRODUCED_REPAIR_TESTED_OWNER_REVIEW':
  kind==='GOVERNED_ORIGINAL_JOB_GAP'?'FROZEN_REPRODUCED_AWAITING_CANDIDATE':
  'INSPECTED_NEEDS_INDEPENDENT_GAP_TEST',
 next_proof:'Verify the corresponding original job in an isolated environment',
 verified_missing_capability:kind==='GOVERNED_ORIGINAL_JOB_GAP',
 executable_job:false,installation_authorized:false,
 source_url:base+'/issues/188',
 ...(proof?{repair_proof:{status:'FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED',
  proof_kind:'EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT',
  owner_install_authorized:false,fresh_original_work_verified:false,
  installed:false}}:{})
});
const ownerFeed=()=>({
 ok:true,status:'OWNER_GAP_INTAKE_RECONCILED',
 source_basis:'PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH',
 read_only:true,installation_authorized:false,
 work_started:false,production_changed:false,
 items:[ownerItem('RESEARCH_OPPORTUNITY','research:'+'a'.repeat(64),true),
  ownerItem('GOVERNED_ORIGINAL_JOB_GAP','queue:'+'b'.repeat(32))],
 settled_history:[{stage:'SETTLED_ISOLATED'}],
 counts:{current_candidates:2,historical_completed:1,verified_current_gaps:1,
  verified_implementation_defects:1,independently_tested_research_repairs:1}
});
function fixture({signed=true,source=null,ownerSource=null}={}){
 const nodes=Object.fromEntries(ids.map(id=>[id,el()]));
 nodes.privateReady.style.display=signed?'block':'none';
 const map={
  '/api/reality/personal-category-economics':{ok:true,...buildCategoryEconomicPortfolio(catalog())},
  '/api/reality/personal-gap-intake':ownerFeed()
 };
 if(source!==null)map['/api/reality/personal-category-economics']=source;
 if(ownerSource!==null)map['/api/reality/personal-gap-intake']=ownerSource;
 let notify=null;const calls=[],timers=[];
 class Observer{constructor(fn){notify=fn}observe(){}}
 vm.runInNewContext(browser,{
  document:{getElementById:id=>nodes[id],createElement:el,
   visibilityState:'visible',addEventListener(){}},
  window:{addEventListener(){}},MutationObserver:Observer,
  setInterval:(fn,ms)=>{timers.push({fn,ms})},
  fetch:async(path,opt)=>{calls.push({path,opt});
   const data=map[path];
   if(data instanceof Error)throw data;
   return {ok:true,json:async()=>data};
  }
 });
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {nodes,calls,timers,flush,toggle:async yes=>{
  nodes.privateReady.style.display=yes?'block':'none';
  notify?.();await flush();
 }};
}
test('category dashboard renders Work Center categories and real owner-protected repair evidence separately',async()=>{
 assert.ok(html.indexOf('id="realityCategoryEconomics"')<
  html.indexOf('id="realityBacklogValuePanel"'));
 assert.match(html,/src="\/reality-category-economic-bridge-v1\.js"/);
 assert.doesNotMatch(browser,/method:\s*['"]POST|OWNER_APPROVE_EXACT_VERIFIED|INSTALL_CAPABILITY|localStorage/);
 assert.doesNotThrow(()=>new vm.Script(browser));
 const f=fixture();await f.flush();
 assert.equal(f.calls.length,2);
 assert.ok(f.calls.every(x=>x.opt.method==='GET'&&
  x.opt.credentials==='same-origin'&&x.opt.cache==='no-store'));
 assert.equal(f.nodes.realityCategoryList.children.length,10);
 assert.equal(f.nodes.realityCategoryOwnerList.children.length,2);
 assert.equal(f.nodes.realityCategorySignalCount.textContent,'3');
 assert.equal(f.nodes.realityCategoryOwnerCount.textContent,'2');
 assert.equal(f.nodes.realityCategoryVerifiedRepairs.textContent,'1');
 assert.equal(f.nodes.realityCategoryReviewValue.textContent,'$81.73 – $294.21');
 assert.match(f.nodes.realityCategoryOwnerStatus.textContent,/NOT added or priced twice/);
 assert.match(f.nodes.realityCategoryScope.textContent,/NOT measured savings|not established/i);
 assert.equal(f.timers[0].ms,90000);
});
test('partial readback does not invent owner counts or erase provider source evidence',async()=>{
 const f=fixture({ownerSource:new Error('offline')});await f.flush();
 assert.equal(f.nodes.realityCategorySignalCount.textContent,'3');
 assert.equal(f.nodes.realityCategoryOwnerCount.textContent,'Unknown');
 assert.equal(f.nodes.realityCategoryVerifiedRepairs.textContent,'Unknown');
 assert.match(f.nodes.realityCategoryOwnerStatus.textContent,/Counts are unknown/);
 assert.match(f.nodes.realityCategoryEconomicsStatus.textContent,/Partial category evidence/);
});
test('fake owner verification cannot be counted as tested repair',async()=>{
 const bad=ownerFeed();
 bad.items[0].repair_proof.installed=true;
 const f=fixture({ownerSource:bad});await f.flush();
 assert.equal(f.nodes.realityCategoryOwnerCount.textContent,'Unknown');
 assert.equal(f.nodes.realityCategoryVerifiedRepairs.textContent,'Unknown');
});
test('sign out clears all private owner data; anonymous users never fetch provider or owner records',async()=>{
 const f=fixture({signed:false});await f.flush();
 assert.equal(f.calls.length,0);
 await f.toggle(true);
 assert.equal(f.nodes.realityCategoryOwnerCount.textContent,'2');
 await f.toggle(false);
 assert.equal(f.nodes.realityCategoryOwnerCount.textContent,'Unknown');
 assert.equal(f.nodes.realityCategoryOwnerList.children.length,0);
 f.timers[0].fn();await f.flush();
 assert.equal(f.calls.length,2);
});
