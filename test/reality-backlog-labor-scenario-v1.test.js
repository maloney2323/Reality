import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildRealityWorkdayOpportunityBrief} from '../src/reality-workday-opportunity-brief-v1.js';
import {summarizeSourceBackedIssueCandidates,projectBacklogLaborScenario}
 from '../src/reality-backlog-labor-scenario-v1.js';
const work=(type,id,source,state,ref)=>({
 finding_id:'catalog:'+id.repeat(32),finding_type:type,source,state,
 title:'Source-backed '+type+' '+id,category:'bugs',
 evidence_refs:[ref],value_assessment:{triage_score:55},
 execution_work_item:null,authorization_required:false
});
const issue=work('OPEN_ISSUE','a','github_issues','TRACKED_NEEDS_REVIEW',
 'https://github.com/maloney2323/Reality/issues/201');
const issue2=work('OPEN_ISSUE','b','github_issues','TRACKED_NEEDS_REVIEW',
 'https://github.com/maloney2323/Reality/issues/188');
const pr=work('OPEN_PULL_REQUEST','c','github_pull_requests','OPEN_AWAITING_REVIEW',
 'https://github.com/maloney2323/Reality/pull/211');
const ci=work('RECURRING_FAILURE','d','github_actions','DISCOVERED_REQUIRES_REVIEW',
 'https://github.com/maloney2323/Reality/actions/runs/41845464426');
const catalog=(items=[issue,issue2,pr,ci])=>({
 version:'reality-work-catalog-v0.1',status:'OBSERVED',
 observed_at:'2026-11-04T15:00:00.000Z',authority:'NONE_GRANTED',
 execution_enabled:false,items,source_coverage:{
  issues:'checked',pull_requests:'checked',actions:'checked',commits:'checked',
  customer_feedback:'not_connected',business_operations:'not_connected',
  external_research:'not_connected'
 }
});
const brief=(items)=>buildRealityWorkdayOpportunityBrief(catalog(items));
const assumptions=[
 {finding_id:issue.finding_id,assumed_discovery_minutes:30,assumed_execution_minutes:120},
 {finding_id:issue2.finding_id,assumed_discovery_minutes:90,assumed_execution_minutes:240}
];
test('Reality existing BLS human labor benchmark is source-bound and no actual hours are inferred',()=>{
 const b=brief();
 const w=b.illustrative_labor_reference;
 assert.equal(w.version,'HUMAN_LABOR_BENCHMARK_V1_STATIC_SOURCE');
 assert.equal(w.source_provider,'BLS');
 assert.equal(w.hourly_usd,65.38);
 assert.equal(w.observation_period,'2025-05');
 assert.equal(w.calibrated_for_this_business,false);
 assert.equal(w.estimates_owner_entered_only,true);
 assert.equal(w.verified_hours_saved,null);
 assert.equal(b.value_measurement.verified_cash_savings_usd,null);
});
test('scenario compares discovery and execution separately using user source-specific hours',()=>{
 const b=brief();
 const s=projectBacklogLaborScenario({brief:b,assumptions});
 assert.equal(s.scenarios_included,2);
 assert.equal(s.unique_open_issues_currently_visible,2);
 assert.equal(s.estimated_discovery_hours,2);
 assert.equal(s.estimated_execution_hours,6);
 assert.equal(s.estimated_combined_human_hours,8);
 assert.equal(s.hypothetical_discovery_labor_equivalent_usd,130.76);
 assert.equal(s.hypothetical_execution_labor_equivalent_usd,392.28);
 assert.equal(s.hypothetical_total_labor_equivalent_usd,523.04);
 assert.equal(s.dollar_savings_verified,false);
 assert.equal(s.independently_validated_backlog_hours,null);
 assert.equal(s.realized_cash_savings_usd,null);
 assert.equal(s.net_operating_value_usd,null);
 assert.equal(s.scenario_not_persisted,true);
 assert.equal(s.job_started,false);
 assert.equal(s.installation_authorized,false);
 assert.equal(s.production_changed,false);
 for(const j of s.scenario_issues){
  assert.equal(j.validated_current_defect,false);
  assert.equal(j.savings_verified,false);
  assert.equal(j.human_estimate_evidence_status,'OWNER_INPUT_UNVERIFIED');
 }
});
test('closed work, PRs, CI failures and identical issue links cannot multiply economic value',()=>{
 const copy={...issue2,finding_id:'catalog:'+'f'.repeat(32),
  evidence_refs:issue.evidence_refs};
 const b=brief([issue,copy,pr,ci]);
 const list=summarizeSourceBackedIssueCandidates(b);
 assert.equal(list.length,1);
 assert.equal(list[0].issue_url,issue.evidence_refs[0]);
 assert.throws(()=>projectBacklogLaborScenario({brief:b,
  assumptions:[assumptions[1]]}),/SOURCE_BOUND/);
 const other=brief([{...issue,state:'SETTLED_ISOLATED'},pr]);
 assert.equal(summarizeSourceBackedIssueCandidates(other).length,0);
});
test('unknown, duplicate, negative, fractional, absent or excessive human-hour assumptions rejected',()=>{
 const b=brief();
 for(const bad of [
  [],
  [{...assumptions[0],assumed_execution_minutes:-10}],
  [{...assumptions[0],assumed_discovery_minutes:7.5}],
  [{...assumptions[0],assumed_execution_minutes:4801}],
  [{...assumptions[0],assumed_discovery_minutes:4800}],
  [{...assumptions[0],assumed_execution_minutes:0,assumed_discovery_minutes:0}],
  [{...assumptions[0],finding_id:pr.finding_id}],
  [assumptions[0],assumptions[0]],
  [{...assumptions[0],extra_approval:true}],
  Array(13).fill(assumptions[0])
 ])assert.throws(()=>projectBacklogLaborScenario({brief:b,assumptions:bad}),/REALITY_BACKLOG_VALUE_/);
});
test('backend must reject tampered source links, untrusted briefing and fake execution authority',()=>{
 const b=brief();
 assert.throws(()=>summarizeSourceBackedIssueCandidates({...b,job_started:true}),
  /TRUSTED_CURRENT_SOURCE/);
 assert.throws(()=>summarizeSourceBackedIssueCandidates({
  ...b,items:b.items.map(x=>x.finding_id===issue.finding_id?
   {...x,evidence_refs:['https://evil.example/issues/201']}:x)}),
  /ISSUE_SOURCE_UNVERIFIED/);
 const v=projectBacklogLaborScenario({brief:b,assumptions:[assumptions[0]]});
 assert.equal(v.estimated_combined_human_hours,2.5);
});
test('dashboard includes potential value as a non-approved hypothetical scenario',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../reality-backlog-value-scenario-v1.js',import.meta.url),'utf8');
 assert.match(html,/id="realityBacklogTotalValue">Not estimated/);
 assert.match(html,/id="realityBacklogDiscoveryValue">Not estimated/);
 assert.match(html,/id="realityBacklogExecutionValue">Not estimated/);
 assert.ok(html.indexOf('id="realityBacklogValuePanel"')<
  html.indexOf('id="simpleRunFullLoop"'));
 assert.match(html,/src="\/reality-backlog-value-scenario-v1\.js"/);
 assert.doesNotMatch(script,/localStorage|OWNER_APPROVE_EXACT_VERIFIED|INSTALL_CAPABILITY|githubWrite/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
function node(tag='div'){
 return {tag,textContent:'',children:[],value:'',style:{display:'block'},listeners:{},
  disabled:false,href:'',append(...c){this.children.push(...c)},
  replaceChildren(...c){this.children=c},
  addEventListener(name,fn){this.listeners[name]=fn},
  setAttribute(){}};
}
const ids=['realityBacklogValuePanel','realityBacklogValueStatus','realityBacklogInputItems',
 'realityBacklogCompute','privateReady','realityBacklogDiscoveryValue','realityBacklogExecutionValue',
 'realityBacklogTotalValue','realityBacklogTotalHours','realityBacklogWageContext',
 'realityBacklogValueFootnote'];
function fixture({signed=true,data=brief(),badScenario=false}={}){
 const elements=Object.fromEntries(ids.map(id=>[id,node()]));
 elements.privateReady.style.display=signed?'block':'none';
 let observer=null;
 const calls=[],listeners={};
 class FakeObserver{
  constructor(fn){observer=fn}
  observe(){}
 }
 const context={
  document:{getElementById:id=>elements[id],createElement:node,visibilityState:'visible',
   addEventListener(name,fn){listeners[name]=fn}},
  window:{addEventListener(name,fn){listeners['window:'+name]=fn}},
  MutationObserver:FakeObserver,
  fetch:async(url,options)=>{
   calls.push({url,options});
   if(url==='/api/reality/workday-opportunities')
    return {ok:true,json:async()=>({ok:true,...data})};
   if(url==='/api/reality/backlog-value-scenario'){
    const a=JSON.parse(options.body).assumptions;
    const s={ok:true,...projectBacklogLaborScenario({brief:data,assumptions:a})};
    if(badScenario)s.hypothetical_total_labor_equivalent_usd=999999;
    return {ok:true,json:async()=>s};
   }
   return {ok:false,json:async()=>({ok:false})};
  }
 };
 const script=readFileSync(new URL('../reality-backlog-value-scenario-v1.js',import.meta.url),'utf8');
 vm.runInNewContext(script,context);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {elements,calls,listeners,flush,
  changeSigned:async yes=>{elements.privateReady.style.display=yes?'block':'none';
   observer?.();await flush()}};
}
test('browser makes no economic or execution POST until explicit task-specific assumptions exist',async()=>{
 const f=fixture();await f.flush();
 assert.equal(f.calls.length,1);
 assert.equal(f.elements.realityBacklogInputItems.children.length,2);
 assert.equal(f.elements.realityBacklogTotalValue.textContent,'Not estimated');
 const button=f.elements.realityBacklogCompute;
 button.listeners.click();await f.flush();
 assert.equal(f.calls.length,1);
 assert.match(f.elements.realityBacklogValueStatus.textContent,/at least one source-specific/);
 const card=f.elements.realityBacklogInputItems.children[0];
 const pair=card.children[2];
 const a=pair.children[0].children[0],b=pair.children[1].children[0];
 a.value='1';a.listeners.input();
 b.value='3';b.listeners.input();
 button.listeners.click();await f.flush();
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[1].url,'/api/reality/backlog-value-scenario');
 assert.equal(f.calls[1].options.method,'POST');
 assert.equal(f.elements.realityBacklogTotalValue.textContent,'$261.52');
 assert.equal(f.elements.realityBacklogTotalHours.textContent,'4.00 hrs');
 assert.match(f.elements.realityBacklogValueStatus.textContent,/Illustrative only/);
});
test('forged financial scenario is rejected; sign out clears owner-entered and projected assumptions',async()=>{
 const f=fixture({badScenario:true});await f.flush();
 const card=f.elements.realityBacklogInputItems.children[0];
 const a=card.children[2].children[0].children[0];
 a.value='2';a.listeners.input();
 f.elements.realityBacklogCompute.listeners.click();await f.flush();
 assert.equal(f.elements.realityBacklogTotalValue.textContent,'Not estimated');
 assert.match(f.elements.realityBacklogValueStatus.textContent,/could not be independently reconciled/);
 await f.changeSigned(false);
 assert.equal(f.elements.realityBacklogInputItems.children.length,0);
 assert.equal(f.elements.realityBacklogTotalValue.textContent,'Not estimated');
 assert.equal(f.calls.length,2);
});
