import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../reality-economic-evidence-dashboard-v1.js',import.meta.url),'utf8');
const W='work:'+'a'.repeat(32);
function node(tag='div'){
 return {tag,children:[],style:{display:'block'},hidden:false,textContent:'',
  href:'',target:'',rel:'',append(...x){this.children.push(...x)},
  replaceChildren(...x){this.children=x}};
}
const ids=['simpleEconomicEvidenceDashboard','realityEconomicStatus','realityEconWorkHistory',
 'realityEconSignals','realityEconSignalsNote','realityEconSettled','realityEconHuman',
 'realityEconCapacity','realityEconCash','realityEconRisk','realityEconInputs',
 'realityEconReceipts','privateReady'];
function work(){
 return {ok:true,read_only:true,
  status:'SOURCE_BACKED_DISCOVERY_OBSERVED',
  phase:'DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY',
  evidence_status:'SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS',
  source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',job_started:false,
  installation_authorized:false,production_changed:false,shift_completed:false,
  counts:{source_backed_opportunities:3,open_issues:1,open_pull_requests:1,
   historical_failure_signals:1,verified_current_defects:0,
   completed_customer_jobs_from_this_report:0},
  value_measurement:{financial_roi_verified:false,verified_cash_savings_usd:null,
   human_discovery_baseline_minutes:null},
  items:[{verified_current_defect:false,authorized_execution:false,
   verified_time_saved_minutes:null}]};
}
function roi(){
 return {ok:true,version:'reality-operational-roi-evidence-v2',
  endpoint_scope:'SIGNED_IN_OWNER_ISOLATED_PREVIEW_READ_ONLY',
  scope:'ISOLATED_SETTLEMENT_NOT_ENTIRE_BUSINESS_WORKFLOW',
  status:'VERIFIED_ISOLATED_SETTLEMENT_EVIDENCE',
  production_changed:false,owner_authorization_granted:false,
  installation_authorized:false,work_executed_by_read:false,
  financial_roi_verified:false,verified_customer_financial_roi:false,
  job_execution_authorized_by_analysis:false,distinct_isolated_jobs_verified:1,
  collection_state:{jobs_with_recorded_economic_inputs:0,
   comparable_human_work_verified:0,billable_provider_cost_verified:0,
   verified_cash_savings_usd:null},
  jobs:[{original_work_id:W,capability_id:'reality-general-execution-receipt',
   technical_settlement_status:'INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW',
   production_changed:false,source_run_url:'https://github.com/maloney2323/Reality/actions/runs/41845464426',
   measured:{claim_to_settlement_ms:29100,full_job_duration_ms:null},
   economic_value:{verified_hours_returned:{value:null},
    verified_cash_savings_usd:{value:null}},
   human_labor_context:{human_task_effort_hours:{value:null}},
   economic_observations:[]}]};
}
function loop(){
 return {ok:true,status:'OWNER_GOVERNED_LOOP_READBACK',
  owner_installation_authorized_by_read:false,external_action_performed:false,
  production_changed:false,full_loop_proof_not_inferred_from_settlement:true,
  jobs:[{original_work_id:W,phase:'SETTLED_ISOLATED',
   capability_id:'reality-general-execution-receipt',
   independently_settled:true,universe_settlement_verified:true,
   full_loop_independently_verified:true}],
  independent_final_receipts:[{status:'FULL_LOOP_INDEPENDENTLY_VERIFIED',
   original_work_id:W,production_changed:false,
   artifact_sha256:'b'.repeat(64),
   verifier_artifact_digest:'sha256:'+'c'.repeat(64)}]};
}
function fixture({signed=true,routes={}}={}){
 const elements=Object.fromEntries(ids.map(id=>[id,node()]));
 elements.privateReady.style.display=signed?'block':'none';
 const calls=[],listeners={},intervals=[];let observed=null;
 class MutationObserverFake {
  constructor(fn){observed=fn}
  observe(){}
 }
 const map={
  '/api/reality/workday-opportunities':work(),
  '/api/reality/personal-operational-roi-v2':roi(),
  '/api/reality/personal-genuine-loop-status':loop(),
  ...routes
 };
 const context={
  document:{getElementById:id=>elements[id],createElement:node,
   visibilityState:'visible',addEventListener:(name,fn)=>{listeners[name]=fn}},
  window:{addEventListener:(name,fn)=>{listeners['window:'+name]=fn}},
  MutationObserver:MutationObserverFake,
  setInterval:(fn,ms)=>intervals.push({fn,ms}),
  fetch:async(url,options)=>{calls.push({url,options});
   if(!Object.hasOwn(map,url))return {ok:false,json:async()=>({ok:false})};
   if(map[url] instanceof Error)throw map[url];
   return {ok:true,json:async()=>map[url]};
  },encodeURIComponent
 };
 vm.runInNewContext(source,context);
 const flush=async()=>{await new Promise(resolve=>setImmediate(resolve))};
 return {elements,calls,context,listeners,intervals,flush,signOut:async()=>{
  elements.privateReady.style.display='none';observed?.();await flush()},
  signIn:async()=>{elements.privateReady.style.display='block';observed?.();await flush()}};
}
test('economic dashboard precedes action button and lists technical/economic evidence separately',()=>{
 const a=home.indexOf('id="simpleEconomicEvidenceDashboard"');
 const b=home.indexOf('id="simpleRunFullLoop"');
 assert.ok(a>0&&b>a);
 assert.match(home,/id="realityEconCash">Not established/);
 assert.match(home,/id="realityEconCapacity">Not measured/);
 assert.match(home,/src="\/reality-economic-evidence-dashboard-v1\.js"/);
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.doesNotMatch(source,/method:\s*['"]POST|OWNER_APPROVE_EXACT_VERIFIED|INSTALL_CAPABILITY|githubWrite|localStorage/);
});
test('verified owner readbacks show real technical receipts, never hypothetical labor or cash',async()=>{
 const f=fixture();await f.flush();
 assert.equal(f.calls.length,3);
 assert.ok(f.calls.every(c=>c.options.method==='GET'&&
  c.options.credentials==='same-origin'&&c.options.cache==='no-store'));
 assert.equal(f.elements.realityEconSignals.textContent,'3');
 assert.equal(f.elements.realityEconSettled.textContent,'1');
 assert.equal(f.elements.realityEconHuman.textContent,'Not measured');
 assert.equal(f.elements.realityEconCapacity.textContent,'Not measured');
 assert.equal(f.elements.realityEconCash.textContent,'Not established');
 assert.equal(f.elements.realityEconRisk.textContent,'Not established');
 assert.equal(f.elements.realityEconInputs.textContent,'0 job(s) · not verified savings');
 assert.equal(f.elements.realityEconReceipts.textContent,'1 independently reconciled');
 assert.match(f.elements.realityEconomicStatus.textContent,/3\/3 evidence sources validated/);
 const card=f.elements.realityEconWorkHistory.children[0];
 assert.equal(card.children[2].href,
  '/api/reality/personal-genuine-final-receipt-pdf?work_id='+encodeURIComponent(W));
 assert.match(card.children[1].textContent,/Exact final-loop receipt independently verified/);
 assert.equal(f.intervals[0].ms,90000);
});
test('missing provider result never becomes zero, partial readback keeps verified surviving facts',async()=>{
 const f=fixture({routes:{'/api/reality/workday-opportunities':new Error('offline'),
 '/api/reality/personal-genuine-loop-status':new Error('offline')}});
 await f.flush();
 assert.equal(f.elements.realityEconSignals.textContent,'—');
 assert.equal(f.elements.realityEconSettled.textContent,'1');
 assert.equal(f.elements.realityEconReceipts.textContent,'Unverified');
 assert.match(f.elements.realityEconomicStatus.textContent,/1\/3 evidence sources validated/);
});
test('untrusted ROI cannot certify settlement, cash savings or labor hours',async()=>{
 const bad=roi();
 bad.jobs[0].economic_value.verified_cash_savings_usd.value=7800;
 const f=fixture({routes:{'/api/reality/personal-operational-roi-v2':bad}});
 await f.flush();
 assert.equal(f.elements.realityEconSettled.textContent,'—');
 assert.equal(f.elements.realityEconCash.textContent,'Not established');
 assert.equal(f.elements.realityEconCapacity.textContent,'Not measured');
 assert.match(f.elements.realityEconomicStatus.textContent,/2\/3/);
});
test('technical settlement without a matching full-loop proof does not claim a receipt',async()=>{
 const other=loop();
 other.jobs[0].full_loop_independently_verified=false;
 const f=fixture({routes:{'/api/reality/personal-genuine-loop-status':other}});
 await f.flush();
 assert.equal(f.elements.realityEconReceipts.textContent,'0 independently reconciled');
 const record=f.elements.realityEconWorkHistory.children[0];
 assert.equal(record.children.length,2);
 assert.match(record.children[1].textContent,/No matching final-loop PDF/);
});
test('private data clears on sign-out, no queries when anonymous, owner reconnect restores readback',async()=>{
 const f=fixture({signed:false});await f.flush();
 assert.equal(f.calls.length,0);
 assert.equal(f.elements.realityEconSettled.textContent,'—');
 await f.signIn();
 assert.equal(f.elements.realityEconSettled.textContent,'1');
 assert.equal(f.calls.length,3);
 await f.signOut();
 assert.equal(f.elements.realityEconSettled.textContent,'—');
 assert.equal(f.elements.realityEconReceipts.textContent,'Unverified');
 assert.equal(f.elements.realityEconWorkHistory.children.length,1);
 assert.match(f.elements.realityEconomicStatus.textContent,/Sign in/);
 f.intervals[0].fn();await f.flush();
 assert.equal(f.calls.length,3,'signed out polling must not fetch owner data');
});
test('fake discovery verification claims are rejected and no claimed savings appear',async()=>{
 const d=work();d.counts.verified_current_defects=12;
 const f=fixture({routes:{'/api/reality/workday-opportunities':d}});
 await f.flush();
 assert.equal(f.elements.realityEconSignals.textContent,'—');
 assert.equal(f.elements.realityEconSettled.textContent,'1');
 assert.equal(f.elements.realityEconHuman.textContent,'Not measured');
});
