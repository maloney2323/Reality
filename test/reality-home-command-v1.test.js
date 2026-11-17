import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const js=read('reality-home-command-v1.js');
const css=read('reality-home-command-v1.css');

test('command center is attached only to original Home; original controls remain exactly once',()=>{
 assert.match(html,/<link rel="stylesheet" href="\/reality-home-command-v1.css">/);
 assert.match(html,/<script defer src="\/reality-home-command-v1.js"><\/script>/);
 assert.ok(html.indexOf('reality-home-command-v1.js')>html.indexOf('reality-home-employee-brief-v1.js'));
 for(const id of ['realitySimpleHome','realityHomeEmployees','simpleEconomicEvidenceDashboard',
  'realityShiftHomeNow','realityEmployeeShiftPlanner','realityAuthorizeEmployeeShift',
  'simpleRunFullLoop','realityEconReceipts','realityEconCash','simpleWorkdayCandidates',
  'realityHomeWorkday','realityEconSignals','privateChat'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('only provider-validated readback text becomes Home data; no new work or ROI engine',()=>{
 for(const source of ['realityEconSignals','realityEconReceipts','realityEconCash',
  'realityEconCapacity','realityShiftHomeNow','simpleWorkdayCandidates',
  'simpleWorkdayStatus','realityHomeEmployees'])
  assert.ok(js.includes(source),source);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/);
 assert.doesNotMatch(js,/AUTHORIZE_EXACT_EMPLOYEE_SHIFT|OWNER_APPROVE_EXACT|\$6,480|142 hours|71%|48%/i);
 assert.ok(js.includes("metrics.ready.value.textContent='Not verified'"));
 assert.ok(js.includes("title.textContent=found!==null&&Number(found)>0"));
 assert.ok(js.includes("details.open=true"));
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.ok(css.includes('safe-area-inset-bottom'));
});

class Node {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;
  this.className='';this.id='';this.attributes={};this.listeners={};
  this.style={display:'block'};this.hidden=false;this.open=false;
  this.textContent='';this.href='';
  this.classList={values:new Set(),add:k=>this.classList.values.add(k)};
 }
 append(...nodes){for(const n of nodes){
  if(n.parentElement){const p=n.parentElement;p.children.splice(p.children.indexOf(n),1);}
  this.children.push(n);n.parentElement=this;
 }}
 replaceChildren(...nodes){
  for(const old of this.children)old.parentElement=null;
  this.children=[];
  this.append(...nodes);
 }
 insertBefore(n,ref){
  if(n.parentElement){const p=n.parentElement;p.children.splice(p.children.indexOf(n),1);}
  const at=this.children.indexOf(ref);
  if(at<0)throw Error('BAD_MOUNT');
  this.children.splice(at,0,n);n.parentElement=this;
 }
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(type,fn){this.listeners[type]=fn}
 scrollIntoView(){this.scrolled=true}
 querySelector(){return null}
 querySelectorAll(){return []}
}
function fixture(){
 const ids={};const body=new Node('body');
 const add=id=>{const n=new Node();n.id=id;ids[id]=n;return n};
 const home=add('realitySimpleHome');body.append(home);
 const team=add('realityHomeEmployees'),econ=add('simpleEconomicEvidenceDashboard');
 home.append(team,econ);
 const auth=add('privateReady');auth.style.display='block';
 const defaults={
  realityEconomicStatus:'Read-only source check complete · 4/4 evidence sources validated.',
  realityEconSignals:'24',realityEconSignalsNote:'Provider observations · current defects not yet verified',
  realityEconReceipts:'1 independently reconciled',
  realityEconCash:'Not established',realityEconCapacity:'Not measured',
  realityShiftHomeNow:'Shift status could not be verified.',
  realityShiftHomeNext:'Next shift action unknown.',
  realityEmployeeShiftStatus:'No shift planned yet.',
  realityHomeEmployeesStatus:'8 proposed AI roles · source check complete',
  simpleWorkdayStatus:'Checked connected provider sources. These are opportunities to validate.'
 };
 for(const [id,value] of Object.entries(defaults))add(id).textContent=value;
 add('simpleWorkdayCandidates');
 const planner=add('realityEmployeeShiftPlanner');econ.append(planner);
 const work=add('realityHomeWorkday');econ.append(work);
 const seen=[],windowListeners={};
 const context={
  document:{body,createElement:t=>new Node(t),
   getElementById:id=>{
    if(ids[id])return ids[id];
    const find=n=>n.id===id?n:n.children.map(find).find(Boolean);
    return find(body)||null;
   }},
  window:{location:{pathname:'/'},addEventListener:(name,fn)=>{windowListeners[name]=fn}},
  MutationObserver:class {constructor(fn){this.fn=fn;seen.push(this)}
   observe(){}}
 };
 vm.runInNewContext(js,context);
 return {body,ids,seen,get:context.document.getElementById,
  emitWeekly:detail=>windowListeners['reality:weekly-workload-readback']?.({detail})};
}
test('renders verified source signals and final receipts while suppressing readiness/ROI inventions',()=>{
 const f=fixture();
 const command=f.get('realityHomeCommand');
 assert.ok(command,'command exists');
 assert.equal(f.get('realityHomeExistingEvidence').children[1],f.ids.simpleEconomicEvidenceDashboard);
 assert.ok(f.ids.realityHomeEmployees.parentElement!==f.ids.realitySimpleHome);
 const find=(root,cls)=>root.className?.split(' ').includes(cls)?root:
  root.children.map(x=>find(x,cls)).find(Boolean);
 const values=(root,cls)=>{
  const out=[];function scan(n){if(n.className?.split(' ').includes(cls))out.push(n.textContent);
   for(const c of n.children)scan(c);
  }scan(root);return out;
 };
 assert.ok(values(command,'rc-stat-value').includes('24'));
 assert.ok(values(command,'rc-stat-value').includes('1'));
 assert.ok(values(command,'rc-stat-value').includes('Not verified'));
 assert.ok(values(command,'rc-cash').includes('Not established'));
 // Home explains valuable work without starting or approving a shift.
 assert.equal(f.get('realityHomeReviewWork'),null);
 assert.ok(js.includes('rc-hero-foot'));
 assert.ok(!js.includes('Review & Start Ready Work'));
 assert.ok(!css.includes('.rc-start{'));
 // The original governed planner remains for the Shifts section.
 assert.ok(f.ids.realityEmployeeShiftPlanner);
 assert.equal(f.get('realityHomeExistingEvidence').open,false);
});
test('Refresh source discoveries on Home reuses read-only evidence without starting a shift',()=>{
 const f=fixture();
 const original=new Node('button');original.id='findWork';
 f.ids.simpleEconomicEvidenceDashboard.append(original);
 let workRefreshes=0;original.click=()=>{workRefreshes++};
 const find=root=>root.className?.split(' ').includes('rc-home-find-work')?root:
  root.children.map(find).find(Boolean);
 const button=find(f.get('realityHomeCommand'));
 assert.ok(button,'Read-only source refresh is visible on Home');
 assert.equal(button.textContent,'Refresh source discoveries');
 assert.match(js,/const existing=\$\('findWork'\)/);
 assert.match(js,/existing\.click\(\)/);
 assert.doesNotMatch(js,/AUTHORIZE_EXACT_EMPLOYEE_SHIFT|ADMIT_QUALIFIED_WORK_IN_EXACT_AUTHORIZED_RILEY_SHIFT/);
 button.listeners.click();
 assert.equal(workRefreshes,1);
 assert.equal(f.get('realityHomeExistingEvidence').open,true);
 assert.equal(original.scrolled,true);
 original.disabled=true;
 button.listeners.click();
 assert.equal(workRefreshes,1,'a running scan must not be duplicated');
});
test('signout and unavailable economic evidence never leave old owner counts on Home',()=>{
 const f=fixture();
 f.ids.privateReady.style.display='none';
 f.seen[0].fn();
 const values=[];
 function scan(n){if(n.className?.split(' ').includes('rc-stat-value'))values.push(n.textContent);
  for(const c of n.children)scan(c);
 }
 scan(f.get('realityHomeCommand'));
 assert.equal(values[0],'—');
 assert.equal(values[4],'Not verified');
});

test('weekly source-review gap becomes visible as per-role bars and clears on sign-out',()=>{
 const f=fixture();
 const days=()=>['Monday','Tuesday','Wednesday','Thursday','Friday'].map(weekday=>({
  weekday,provisional_review_timebox_hours:0,source_findings:[]
 }));
 const first=days();
 first[0].provisional_review_timebox_hours=2;
 first[0].source_findings=[{title:'Review source-backed issue',
  source_url:'https://github.com/maloney2323/Reality/issues/263'}];
 const insight={
  version:'reality-weekly-workload-insight-v1',
  status:'PROVISIONAL_REVIEW_COVERAGE_GAP_NOT_VERIFIED_EMPLOYEE_SCHEDULE',
  week_start:'2026-11-16',week_end:'2026-11-20',
  source_finding_count:1,role_count:2,
  provisional_review_timebox_hours:2,
  hypothetical_weekly_reference_hours:80,
  unallocated_hypothetical_reference_hours:78,
  source_work_role_count:1,roles_without_source_work_count:1,
  source_work_roles_provisional_hours:2,
  source_work_roles_hypothetical_reference_hours:40,
  source_work_roles_unallocated_reference_hours:38,
  source_work_comparison_available:true,
  nasa_bls_repair_comparator:{
   evidence_status:'PUBLISHED_HUMAN_REPAIR_COMPARATOR_NOT_A_REALITY_JOB_ESTIMATE',
   source_scope:'SINGLE_NASA_MISSION_SOFTWARE_FAULT_REPAIR_ONLY',
   investigation_median_hours:2,implementation_median_hours:3,
   sum_of_separate_medians_hours:5,sum_of_medians_not_median_total:true,
   bls_national_median_hourly_wage_usd:65.38,
   bls_observation_period:'2025-05',
   illustrative_gross_wage_equivalent_usd_per_confirmed_comparable_repair:326.9,
   nasa_study_url:'https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf',
   bls_wage_source_url:'https://www.bls.gov/news.release/ocwage.t01.htm',
   source_review_candidates_needing_fault_validation:1,
   verified_comparable_repairs_from_this_plan:0,
   counted_as_weekly_proposed_review_hours:false,
   forecast_human_effort_hours:null,measured_human_hours_saved:null,
   verified_cash_savings_usd:null,source_benchmark_does_not_authorize_execution:true
  },
  read_only:true,execution_authorized:false,
  installation_authorized:false,production_changed:false,
  comparison_is_not_actual_schedule:true,
  remaining_reference_hours_are_not_verified_missing_customer_jobs:true,
  roles:[
   {employee_name:'Role Alpha',role_title:'Source reviewer',
    proposed_review_timebox_hours:2,hypothetical_weekly_comparison_hours:40,
    unallocated_hypothetical_reference_hours:38,
    comparison_coverage_percent:5,source_finding_count:1,deferred_source_count:0,
    nasa_fault_candidates_needing_validation:1,week_days:first},
   {employee_name:'Role Beta',role_title:'Verifier',
    proposed_review_timebox_hours:0,hypothetical_weekly_comparison_hours:40,
    unallocated_hypothetical_reference_hours:40,
    comparison_coverage_percent:0,source_finding_count:0,deferred_source_count:0,
    nasa_fault_candidates_needing_validation:0,week_days:days()}
  ]
 };
 f.emitWeekly(insight);
 const weekly=f.get('realityHomeWeeklyWorkload');
 assert.ok(weekly);
 function textOf(cls){
  const out=[];function visit(node){
   if(node.className?.split(' ').includes(cls))out.push(node.textContent);
   node.children.forEach(visit);
  }visit(weekly);return out;
 }
 assert.ok(textOf('rc-weekly-amount').includes('2 / 40 h'));
 assert.ok(textOf('rc-weekly-remaining').includes(
  '38 h unallocated in hypothetical comparison · 1 source for review'));
 assert.ok(textOf('rc-weekly-remaining').includes(
  'No source-backed review work assigned to this role. No missing business work inferred.'));
 assert.match(textOf('rc-nasa-heading')[0],/NASA \+ BLS/);
 assert.match(textOf('rc-nasa-foot')[0],/NOT scheduled AI work/);
 assert.match(textOf('rc-nasa-foot')[0],/\$326\.90/);
 assert.match(textOf('rc-weekly-nasa-note')[0],/independently validated/);
 assert.equal(textOf('rc-weekly-amount')[0],'2 / 40 h',
  'NASA comparison must never modify the proposed workload bar');
 const statuses=textOf('rc-weekly-status');
 assert.match(statuses[0],/Week of 2026-11-16 through 2026-11-20/);
 f.ids.privateReady.style.display='none';
 f.seen[0].fn();
 assert.equal(textOf('rc-weekly-amount').length,0);
 assert.equal(textOf('rc-nasa-heading').length,0,
  'source-linked benchmark must clear with owner evidence');
 assert.match(textOf('rc-weekly-status')[0],/Sign in/);
 f.ids.privateReady.style.display='block';
 f.seen[0].fn();
 assert.equal(textOf('rc-weekly-amount').length,0,
  'a different signed-in account must not inherit the prior owner\'s workload');
});

test('mobile screenshot layout prioritizes workforce bars and side-by-side value proof',()=>{
 assert.match(css,/\.rc-stats\s*\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.rc-stat\.rc-verified\s*\{[\s\S]*?grid-column:1\/-1/);
 assert.match(css,/\.rc-impacts\s*\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.rc-weekly-track/);
 assert.match(css,/\.rc-weekly-fill/);
 assert.match(css,/\.rc-nasa-reference\[hidden\]/);
 assert.match(js,/nasa_bls_repair_comparator/);
 assert.doesNotMatch(js,/total_nasa_savings|verified_nasa_savings/);
 assert.match(js,/featured=ordered\.filter/);
 assert.match(js,/\.slice\(0,3\)/);
 assert.match(js,/rc-weekly-more/);
 assert.match(js,/How workload hours are calculated/);
 assert.match(js,/Ask Reality to assess this workweek gap/);
 assert.match(js,/if\(isSignedIn!==authWasSignedIn\)/);
 assert.doesNotMatch(js,/Review & Start Ready Work|rc-start|realityHomeReviewWork/);
});
