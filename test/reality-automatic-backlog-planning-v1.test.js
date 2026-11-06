import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildRealityWorkdayOpportunityBrief} from '../src/reality-workday-opportunity-brief-v1.js';
import {deriveAutomaticBacklogPlanning} from '../src/reality-automatic-backlog-planning-v1.js';
const repo='https://github.com/maloney2323/Reality';
const issue=(number,hex)=>({
 finding_id:'catalog:'+hex.repeat(32),
 title:'Open issue #'+number,
 category:'bugs',finding_type:'OPEN_ISSUE',state:'TRACKED_NEEDS_REVIEW',
 source:'github_issues',evidence_refs:[repo+'/issues/'+number],
 value_assessment:{triage_score:55},
 execution_work_item:null,authorization_required:false
});
const issue185=issue(185,'a'),issue188=issue(188,'b'),issue201=issue(201,'c');
const pr={...issue(211,'d'),finding_type:'OPEN_PULL_REQUEST',
 state:'OPEN_AWAITING_REVIEW',source:'github_pull_requests',
 evidence_refs:[repo+'/pull/211']};
const catalog=(items=[issue185,issue188,issue201,pr])=>({
 version:'reality-work-catalog-v0.1',status:'OBSERVED',
 authority:'NONE_GRANTED',execution_enabled:false,
 observed_at:'2026-11-04T15:00:00Z',items,
 source_coverage:{
  issues:'checked',pull_requests:'checked',actions:'checked',
  commits:'checked',customer_feedback:'not_connected',
  business_operations:'not_connected',external_research:'not_connected'
 }
});
const brief=(items)=>buildRealityWorkdayOpportunityBrief(catalog(items));
const live=[
 {html_url:repo+'/issues/185',number:185,state:'open',body:'Full loop parent objective',updated_at:'2026-11-02T12:00:00Z'},
 {html_url:repo+'/issues/188',number:188,state:'open',body:'Parent business objective: #185.',updated_at:'2026-11-02T12:00:00Z'},
 {html_url:repo+'/issues/201',number:201,state:'open',body:'Genuine continuation failure',updated_at:'2026-11-03T12:00:00Z'},
 {html_url:repo+'/pull/211',number:211,state:'open',pull_request:{url:'x'},body:'PR never counts'},
];
const model=(b=brief(),issues=live)=>deriveAutomaticBacklogPlanning({brief:b,liveIssues:issues});
test('automatic conditional planning uses existing Reality labor model and removes explicit parent objective',()=>{
 const v=model();
 assert.equal(v.status,'AUTOMATIC_UNCALIBRATED_CONDITIONAL_PLANNING');
 assert.equal(v.counts.open_issues_with_catalog_evidence,3);
 assert.equal(v.counts.open_provider_issues_seen,3);
 assert.equal(v.counts.explicit_parent_objectives_excluded,1);
 assert.equal(v.counts.included_distinct_leaf_issues,2);
 assert.deepEqual(v.included_issues.map(x=>x.issue_number),[188,201]);
 assert.equal(v.applied_wage_usd_per_hour,65.38);
 assert.equal(v.conditional_conservative.conditional_discovery_hours,1);
 assert.equal(v.conditional_conservative.conditional_execution_hours,4);
 assert.equal(v.conditional_conservative.conditional_total_hours,5);
 assert.equal(v.conditional_conservative.conditional_total_labor_equivalent_usd,326.9);
 assert.equal(v.conditional_extended.conditional_total_hours,20);
 assert.equal(v.conditional_extended.conditional_total_labor_equivalent_usd,1307.6);
 assert.equal(v.transparency.confidence,'UNCALIBRATED_VERY_LOW');
 assert.equal(v.measured_human_backlog_hours,null);
 assert.equal(v.verified_financial_savings_usd,null);
 assert.equal(v.counts.independently_calibrated_human_tasks,0);
 assert.equal(v.job_started,false);
 assert.equal(v.owner_approval_granted,false);
 assert.equal(v.installation_authorized,false);
 assert.equal(v.production_changed,false);
});
test('draft PR and duplicate provider source cannot inflate backlog scenario',()=>{
 const x=model(brief(),[...live,live[1],{...live[0],pull_request:{url:'x'}}]);
 assert.equal(x.counts.included_distinct_leaf_issues,2);
 assert.equal(x.counts.open_provider_issues_seen,3);
 assert.equal(x.conditional_conservative.conditional_total_labor_equivalent_usd,326.9);
});
test('missing source, incomplete coverage and stale issue data must never become confident economic claims',()=>{
 assert.throws(()=>model(brief(),null),/FRESH_ISSUE_PROVIDER_COVERAGE_REQUIRED/);
 const b=brief();
 assert.throws(()=>model({...b,source_coverage:{...b.source_coverage,issues:'unavailable'}},live),
  /FRESH_ISSUE_PROVIDER_COVERAGE_REQUIRED/);
 const incomplete=model(brief([issue185,pr]),live);
 assert.equal(incomplete.source_coverage,'PARTIAL_SOURCE_WINDOW');
 assert.equal(incomplete.counts.open_provider_issues_seen,3);
 assert.equal(incomplete.counts.unrepresented_provider_issues,2);
 assert.equal(incomplete.conditional_conservative.conditional_total_hours,2.5);
 const none=model(brief([pr]),live);
 assert.equal(none.status,'NO_ELIGIBLE_DISTINCT_CURRENT_ISSUES');
 assert.equal(none.counts.included_distinct_leaf_issues,0);
 assert.equal(none.verified_financial_savings_usd,null);
});
test('old closed issues are excluded even if catalog still lists them',()=>{
 const closed=live.map(x=>x.number===201?{...x,state:'closed'}:x);
 const x=model(brief(),closed);
 assert.equal(x.counts.included_distinct_leaf_issues,1);
 assert.equal(x.included_issues[0].issue_number,188);
});
test('UI shows uncalibrated assumption range above manual inputs and requires no buttons',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const src=readFileSync(new URL('../reality-automatic-backlog-value-v1.js',import.meta.url),'utf8');
 assert.ok(html.indexOf('id="realityAutoBacklogComparison"')>0);
 assert.ok(html.indexOf('id="realityAutoBacklogComparison"')<
  html.indexOf('id="realityBacklogInputs"'));
 assert.ok(html.indexOf('id="realityAutoBacklogComparison"')>
  html.indexOf('id="simpleRunFullLoop"'));
 assert.ok(html.indexOf('id="realityAutoBacklogComparison"')>
  html.indexOf('id="realityHomePlanning"'));
 assert.match(html,/id="realityAutoBacklogDollars">Unknown/);
 assert.match(html,/src="\/reality-automatic-backlog-value-v1\.js"/);
 assert.doesNotMatch(src,/method:\s*['"]POST|INSTALL_CAPABILITY|OWNER_APPROVE_EXACT_VERIFIED|localStorage/);
 assert.doesNotThrow(()=>new vm.Script(src));
});
const ids=['realityAutoBacklogComparison','privateReady','realityAutoBacklogExplanation',
 'realityAutoBacklogSourceLinks','realityAutoBacklogDollars','realityAutoBacklogHours',
 'realityAutoBacklogCount','realityAutoBacklogCalibrated'];
function el(tag='div'){
 return {tag,style:{display:'block'},textContent:'',children:[],
  href:'',append(...items){this.children.push(...items)},
  replaceChildren(...items){this.children=items}};
}
function fixture({signed=true,forged=false,fail=false}={}){
 const dom=Object.fromEntries(ids.map(id=>[id,el()]));
 dom.privateReady.style.display=signed?'block':'none';
 let notify=null;
 class FakeMutationObserver{constructor(fn){notify=fn}observe(){}}
 const calls=[],timers=[];
 const modelData={ok:true,...model()};
 if(forged)modelData.conditional_extended.conditional_total_labor_equivalent_usd=999999;
 const source=readFileSync(new URL('../reality-automatic-backlog-value-v1.js',import.meta.url),'utf8');
 vm.runInNewContext(source,{
  document:{getElementById:id=>dom[id],createElement:el,visibilityState:'visible',addEventListener(){}},
  window:{addEventListener(){}},MutationObserver:FakeMutationObserver,
  setInterval:(fn,ms)=>{timers.push({fn,ms})},
  fetch:async(url,options)=>{
   calls.push({url,options});if(fail)throw Error('network');
   return {ok:true,json:async()=>modelData};
  }
 });
 return {dom,calls,timers,flush:async()=>{await new Promise(resolve=>setImmediate(resolve))},
  toggle:async yes=>{dom.privateReady.style.display=yes?'block':'none';notify?.();
   await new Promise(resolve=>setImmediate(resolve))}};
}
test('client presents conditional dollar and hour range, evidence links, but never verified savings',async()=>{
 const f=fixture();await f.flush();
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].url,'/api/reality/automatic-backlog-value');
 assert.equal(f.calls[0].options.method,'GET');
 assert.equal(f.dom.realityAutoBacklogDollars.textContent,'$326.90 – $1,307.60');
 assert.equal(f.dom.realityAutoBacklogHours.textContent,'5.00 – 20.00 hrs');
 assert.equal(f.dom.realityAutoBacklogCount.textContent,'2');
 assert.equal(f.dom.realityAutoBacklogCalibrated.textContent,'0 accepted baselines');
 assert.match(f.dom.realityAutoBacklogExplanation.textContent,/No measured task duration/);
 assert.equal(f.dom.realityAutoBacklogSourceLinks.children.length,2);
 assert.equal(f.timers[0].ms,90000);
});
test('forged economic range rejected; sign-out clears private records and disables polling',async()=>{
 const f=fixture({forged:true});await f.flush();
 assert.equal(f.dom.realityAutoBacklogDollars.textContent,'Unknown');
 assert.match(f.dom.realityAutoBacklogExplanation.textContent,/could not be verified/);
 await f.toggle(false);
 assert.equal(f.dom.realityAutoBacklogSourceLinks.children.length,0);
 assert.equal(f.dom.realityAutoBacklogDollars.textContent,'Unknown');
 f.timers[0].fn();await f.flush();
 assert.equal(f.calls.length,1);
});
test('anonymous client never calls economic source and displays no estimates',async()=>{
 const f=fixture({signed:false});await f.flush();
 assert.equal(f.calls.length,0);
 assert.equal(f.dom.realityAutoBacklogDollars.textContent,'Unknown');
 await f.toggle(true);
 assert.equal(f.calls.length,1);
 assert.equal(f.dom.realityAutoBacklogCount.textContent,'2');
});

test('automatic value scans source catalog beyond the 25 highlighted workday cards',()=>{
 const many=Array.from({length:40},(_,i)=>({
  ...issue(i+100,'a'),
  finding_id:'catalog:'+(i+2).toString(16).padStart(32,'0'),
  value_assessment:{
   score_definition:'HEURISTIC_TRIAGE_REVIEW_ORDER_ONLY_NOT_BUSINESS_IMPACT',
   business_impact:{status:'UNMEASURED'},
   execution_authorized:false
  }
 }));
 const full={...catalog(many),total_findings:many.length};
 const short=buildRealityWorkdayOpportunityBrief(full);
 assert.equal(short.items.length,25);
 const fresh=many.map((x,i)=>({
  number:i+100,html_url:repo+'/issues/'+(i+100),
  state:'open',body:'Independently tracked issue '+i
 }));
 const result=deriveAutomaticBacklogPlanning({
  brief:short,liveIssues:fresh,sourceCatalog:full
 });
 assert.equal(result.counts.open_provider_issues_seen,40);
 assert.equal(result.counts.included_distinct_leaf_issues,40);
 assert.equal(result.counts.unrepresented_provider_issues,0);
 assert.equal(result.source_coverage,'COMPLETE_FOR_OPEN_ISSUE_WINDOW');
 assert.equal(result.conditional_conservative.conditional_total_hours,100);
 assert.equal(result.conditional_conservative.conditional_total_labor_equivalent_usd,6538);
 assert.equal(result.measured_human_backlog_hours,null);
 assert.equal(result.verified_financial_savings_usd,null);
});
