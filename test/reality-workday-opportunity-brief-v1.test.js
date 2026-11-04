import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildRealityWorkdayOpportunityBrief} from '../src/reality-workday-opportunity-brief-v1.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const browser=readFileSync(new URL('../reality-workday-brief-v1.js',import.meta.url),'utf8');
const work=(type,id,source,state,link,score)=>({
 finding_id:'catalog:'+id.repeat(32),
 finding_type:type,source,state,evidence_refs:[link],
 title:'Provider-backed candidate '+id,category:'bugs',
 value_assessment:{triage_score:score},
 authorization_required:false,execution_work_item:null
});
const issue=work('OPEN_ISSUE','a','github_issues','TRACKED_NEEDS_REVIEW',
 'https://github.com/maloney2323/Reality/issues/208',80);
const pr=work('OPEN_PULL_REQUEST','b','github_pull_requests','OPEN_AWAITING_REVIEW',
 'https://github.com/maloney2323/Reality/pull/211',70);
const ci=work('RECURRING_FAILURE','c','github_actions','DISCOVERED_REQUIRES_REVIEW',
 'https://github.com/maloney2323/Reality/actions/runs/41845464426',60);
const recent=work('RECENT_CHANGE_TO_VERIFY','d','github_commits','OBSERVED_NOT_AN_OPEN_DEFECT',
 'https://github.com/maloney2323/Reality/commit/'+'c'.repeat(40),99);
const catalog=(items=[issue,pr,ci,recent])=>({
 version:'reality-work-catalog-v0.1',status:'OBSERVED',
 observed_at:'2026-11-04T13:00:00.000Z',authority:'NONE_GRANTED',
 execution_enabled:false,items,source_coverage:{
  issues:'checked',pull_requests:'checked',actions:'checked',commits:'checked',
  customer_feedback:'not_connected',business_operations:'not_connected',
  external_research:'not_connected'
 }
});
test('source-backed workday excludes historical commits, separates backlog types and never invents savings',()=>{
 const result=buildRealityWorkdayOpportunityBrief(catalog());
 assert.equal(result.status,'SOURCE_BACKED_DISCOVERY_OBSERVED');
 assert.equal(result.counts.source_backed_opportunities,3);
 assert.equal(result.counts.open_issues,1);
 assert.equal(result.counts.open_pull_requests,1);
 assert.equal(result.counts.historical_failure_signals,1);
 assert.equal(result.counts.excluded_recent_commits,1);
 assert.deepEqual(result.items.map(x=>x.finding_type),
  ['OPEN_ISSUE','OPEN_PULL_REQUEST','RECURRING_FAILURE']);
 assert.ok(result.items.every(x=>x.priority_is_measured_business_impact===false));
 assert.ok(result.items.every(x=>x.verified_current_defect===false));
 assert.ok(result.items.every(x=>x.authorized_execution===false));
 assert.ok(result.items.every(x=>x.verified_time_saved_minutes===null));
 assert.ok(result.items.every(x=>x.human_baseline_minutes===null));
 assert.equal(result.value_measurement.verified_cash_savings_usd,null);
 assert.equal(result.value_measurement.financial_roi_verified,false);
 assert.equal(result.job_started,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.shift_completed,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.source_coverage.business_operations,'not_connected');
});
test('fail closed on unknown authority, unknown contract, excessive items, or unsupported status',()=>{
 assert.throws(()=>buildRealityWorkdayOpportunityBrief({...catalog(),authority:'OWNER_AUTHORIZED'}));
 assert.throws(()=>buildRealityWorkdayOpportunityBrief({...catalog(),execution_enabled:true}));
 assert.throws(()=>buildRealityWorkdayOpportunityBrief({...catalog(),version:'fake-v2'}));
 assert.throws(()=>buildRealityWorkdayOpportunityBrief({...catalog(),items:Array(1201).fill(issue)}));
 assert.throws(()=>buildRealityWorkdayOpportunityBrief({...catalog(),status:'DONE'}));
});
test('tampered evidence, source mismatch and completed-state records never appear as verified work',()=>{
 const bad={...issue,evidence_refs:['https://evil.example/Reality/issues/208']};
 const mismatched={...pr,source:'github_issues'};
 const closed={...issue,finding_id:'catalog:'+'e'.repeat(32),state:'SETTLED_ISOLATED'};
 const result=buildRealityWorkdayOpportunityBrief(catalog([bad,mismatched,closed]));
 assert.equal(result.items.length,0);
 assert.equal(result.counts.rejected_untrusted_candidates,3);
 assert.equal(result.counts.verified_current_defects,0);
});
test('duplicate provider item IDs count once; partial source coverage is not reported as no work',()=>{
 const a=catalog([issue,issue,pr]);
 a.status='PARTIAL';a.source_coverage.issues='unavailable';
 const result=buildRealityWorkdayOpportunityBrief(a);
 assert.equal(result.status,'SOURCE_BACKED_DISCOVERY_PARTIAL');
 assert.equal(result.counts.source_backed_opportunities,2);
});
test('home renders an auto-loading preview-only discovery panel before research, without any buttons or writes',()=>{
 const ix=html.indexOf('id="simpleWorkdayBrief"');
 assert.ok(ix>0);
 assert.ok(ix<html.indexOf('id="simpleResearchList"'));
 assert.match(html,/src="\/reality-workday-brief-v1\.js"/);
 assert.doesNotMatch(browser,/method:\s*'POST'|personal-qualified-capability-approve|OWNER_APPROVE_EXACT_VERIFIED/);
 assert.doesNotThrow(()=>new vm.Script(browser));
});
test('browser renders only independently checked source observations; adversarial data is rejected',async()=>{
 const slots={};
 const element=tag=>({tag,children:[],textContent:'',hidden:true,
  append(...items){this.children.push(...items)},
  replaceChildren(...items){this.children=items}});
 for(const id of ['simpleWorkdayBrief','simpleWorkdayStatus','simpleWorkdayMetrics','simpleWorkdayCandidates'])
  slots[id]=element('div');
 const valid={ok:true,...buildRealityWorkdayOpportunityBrief(catalog())};
 let calls=0;
 const sandbox={document:{getElementById:id=>slots[id],
  createElement:element},
 fetch:async(path,opts)=>{calls++;
  assert.equal(path,'/api/reality/workday-opportunities');
  assert.equal(opts.method,'GET');
  return {ok:true,json:async()=>valid};}
 };
 vm.runInNewContext(browser,sandbox);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,1);
 assert.equal(slots.simpleWorkdayBrief.hidden,false);
 assert.match(slots.simpleWorkdayStatus.textContent,/opportunities to validate/);
 assert.equal(slots.simpleWorkdayCandidates.children.length,3);
 assert.match(slots.simpleWorkdayCandidates.children[0].children[3].textContent,/not measured/);
 assert.match(slots.simpleWorkdayMetrics.children[3].textContent,/Not measured/);
 assert.match(slots.simpleWorkdayCandidates.children[0].children[4].href,/github.com/);
});
test('untrusted workday API payload produces no claimed opportunities or value',async()=>{
 const slots={},element=tag=>({tag,children:[],textContent:'',hidden:true,
  append(...items){this.children.push(...items)},
  replaceChildren(...items){this.children=items}});
 for(const id of ['simpleWorkdayBrief','simpleWorkdayStatus','simpleWorkdayMetrics','simpleWorkdayCandidates'])
  slots[id]=element('div');
 const invalid={ok:true,...buildRealityWorkdayOpportunityBrief(catalog())};
 invalid.items[0]={...invalid.items[0],verified_current_defect:true};
 vm.runInNewContext(browser,{document:{getElementById:id=>slots[id],
  createElement:element},
 fetch:async()=>({ok:true,json:async()=>invalid})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(slots.simpleWorkdayStatus.textContent,/not verified/);
 assert.equal(slots.simpleWorkdayCandidates.children.length,0);
});
