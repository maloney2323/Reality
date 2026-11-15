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
 const action=f.get('realityHomeReviewWork');
 assert.equal(typeof action.listeners.click,'function');
 action.listeners.click();
 assert.equal(f.get('realityHomeExistingEvidence').open,true);
 assert.equal(f.ids.realityEmployeeShiftPlanner.scrolled,true);
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
  read_only:true,execution_authorized:false,
  installation_authorized:false,production_changed:false,
  comparison_is_not_actual_schedule:true,
  remaining_reference_hours_are_not_verified_missing_customer_jobs:true,
  roles:[
   {employee_name:'Role Alpha',role_title:'Source reviewer',
    proposed_review_timebox_hours:2,hypothetical_weekly_comparison_hours:40,
    unallocated_hypothetical_reference_hours:38,
    comparison_coverage_percent:5,source_finding_count:1,deferred_source_count:0,
    week_days:first},
   {employee_name:'Role Beta',role_title:'Verifier',
    proposed_review_timebox_hours:0,hypothetical_weekly_comparison_hours:40,
    unallocated_hypothetical_reference_hours:40,
    comparison_coverage_percent:0,source_finding_count:0,deferred_source_count:0,
    week_days:days()}
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
 const statuses=textOf('rc-weekly-status');
 assert.match(statuses[0],/Week of 2026-11-16 through 2026-11-20/);
 f.ids.privateReady.style.display='none';
 f.seen[0].fn();
 assert.equal(textOf('rc-weekly-amount').length,0);
 assert.match(textOf('rc-weekly-status')[0],/Sign in/);
 f.ids.privateReady.style.display='block';
 f.seen[0].fn();
 assert.equal(textOf('rc-weekly-amount').length,0,
  'a different signed-in account must not inherit the prior owner\'s workload');
});
