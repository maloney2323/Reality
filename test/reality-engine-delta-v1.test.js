import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../reality-engine-delta-v1.js',import.meta.url),'utf8');
const W='work:'+'a'.repeat(32);
const ids=['realityEngineDelta','privateReady','realityEngineDeltaStatus',
 'realityEngineSignals','realityEngineSignalsNote','realityEngineOwnerFindings',
 'realityEngineTestedRepairs','realityEngineFinalReceipts',
 'realityEngineDeltaProofNote','realityEngineReceiptLink'];
const node=(tag='div')=>({
 tag,textContent:'',href:'',target:'',rel:'',children:[],
 style:{display:'block'},append(...x){this.children.push(...x)},
 replaceChildren(...x){this.children=x}
});
function discovery(){
 return {ok:true,read_only:true,
  source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',
  phase:'DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY',
  evidence_status:'SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS',
  status:'SOURCE_BACKED_DISCOVERY_OBSERVED',
  job_started:false,installation_authorized:false,
  production_changed:false,shift_completed:false,
  counts:{source_backed_opportunities:123,open_issues:6,
   open_pull_requests:116,historical_failure_signals:1,
   verified_current_defects:0,completed_customer_jobs_from_this_report:0},
  value_measurement:{financial_roi_verified:false,verified_cash_savings_usd:null},
  items:[{verified_current_defect:false,authorized_execution:false}]
 };
}
function owner(){
 return {ok:true,status:'OWNER_GAP_INTAKE_RECONCILED',
  source_basis:'PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH',
  read_only:true,installation_authorized:false,work_started:false,
  production_changed:false,
  counts:{current_candidates:2,verified_current_gaps:0,
   verified_implementation_defects:1,independently_tested_research_repairs:1},
  items:[
   {key:'research:'+'b'.repeat(64),kind:'RESEARCH_OPPORTUNITY',
    verified_missing_capability:false,executable_job:false,
    installation_authorized:false,
    repair_proof:{status:'FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED',
     proof_kind:'EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT',
     owner_install_authorized:false,installed:false,
     fresh_original_work_verified:false}},
   {key:'candidate:'+'c'.repeat(32),kind:'INDEPENDENTLY_TESTED_CANDIDATE',
    verified_missing_capability:false,executable_job:false,
    installation_authorized:false}
  ]
 };
}
function loop(){
 return {ok:true,status:'OWNER_GOVERNED_LOOP_READBACK',
  owner_installation_authorized_by_read:false,
  external_action_performed:false,production_changed:false,
  full_loop_proof_not_inferred_from_settlement:true,
  jobs:[{original_work_id:W,independently_settled:true,
   universe_settlement_verified:true,full_loop_independently_verified:true}],
  independent_final_receipts:[{
   status:'FULL_LOOP_INDEPENDENTLY_VERIFIED',original_work_id:W,
   production_changed:false,artifact_sha256:'e'.repeat(64),
   verifier_artifact_digest:'sha256:'+'f'.repeat(64)
  }]
 };
}
function fixture({signed=true,sources={}}={}){
 const nodes=Object.fromEntries(ids.map(id=>[id,node()]));
 nodes.privateReady.style.display=signed?'block':'none';
 let observer=null;
 class Observer{constructor(fn){observer=fn}observe(){}}
 const map={
  '/api/reality/workday-opportunities':discovery(),
  '/api/reality/personal-gap-intake':owner(),
  '/api/reality/personal-genuine-loop-status':loop(),
  ...sources
 };
 const calls=[],intervals=[],listeners={};
 vm.runInNewContext(script,{
  document:{getElementById:id=>nodes[id],createElement:node,
   visibilityState:'visible',addEventListener:(type,fn)=>{listeners[type]=fn}},
  window:{addEventListener:(type,fn)=>{listeners['window:'+type]=fn}},
  MutationObserver:Observer,
  setInterval:(fn,ms)=>intervals.push({fn,ms}),
  fetch:async(path,options)=>{
   calls.push({path,options});
   const data=map[path];
   if(data instanceof Error)throw data;
   return {ok:!!data,json:async()=>data||{ok:false}};
  },encodeURIComponent
 });
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {nodes,calls,intervals,listeners,flush,
  toggle:async value=>{
   nodes.privateReady.style.display=value?'block':'none';
   observer?.();await flush();
  }};
}
test('Engine Delta makes the OpenAI-plus-Reality distinction clear without exclusivity or fabricated metrics',()=>{
 assert.ok(html.indexOf('id="realityEngineDelta"')>0);
 assert.ok(html.indexOf('id="realityEngineDelta"')<
  html.indexOf('id="realityCategoryEconomics"'));
 assert.ok(html.indexOf('id="realityEngineDelta"')>
  html.indexOf('id="simpleRunFullLoop"'));
 assert.ok(html.indexOf('id="realityEngineDelta"')>
  html.indexOf('id="realityPublishedRepairEvidence"'));
 assert.match(html,/OpenAI intelligence\. Reality operational control\./);
 assert.match(html,/Architecture \+ actual evidence/);
 assert.match(html,/Separate evidence sets · Not a conversion funnel/);
 assert.match(html,/not claimed/);
 assert.match(html,/src="\/reality-engine-delta-v1\.js"/);
 assert.doesNotMatch(html,/Reality has no competitors|zero hallucinations|100% safety guaranteed/i);
 assert.doesNotMatch(script,/method:\s*['"]POST|INSTALL_CAPABILITY|OWNER_APPROVE_EXACT_VERIFIED|githubWrite|localStorage|100% success/i);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('real source, repair, owner and exact final receipts are displayed as SEPARATE evidence cohorts',async()=>{
 const f=fixture();await f.flush();
 assert.equal(f.calls.length,3);
 assert.ok(f.calls.every(x=>x.options.method==='GET'&&
  x.options.credentials==='same-origin'&&x.options.cache==='no-store'));
 assert.equal(f.nodes.realityEngineSignals.textContent,'123');
 assert.equal(f.nodes.realityEngineOwnerFindings.textContent,'2');
 assert.equal(f.nodes.realityEngineTestedRepairs.textContent,'1');
 assert.equal(f.nodes.realityEngineFinalReceipts.textContent,'1');
 assert.match(f.nodes.realityEngineDeltaStatus.textContent,/3\/3 owner-scoped evidence sources validated/);
 assert.match(f.nodes.realityEngineDeltaProofNote.textContent,/isolated ledger/);
 assert.equal(f.nodes.realityEngineReceiptLink.children.length,1);
 const receipt=f.nodes.realityEngineReceiptLink.children[0];
 assert.equal(receipt.href,'/api/reality/personal-genuine-final-receipt-pdf?work_id='+encodeURIComponent(W));
 assert.equal(receipt.rel,'noopener noreferrer');
 assert.equal(f.intervals[0].ms,180000);
});
test('partial provider source never substitutes zero or infers savings from other datasets',async()=>{
 const f=fixture({sources:{
  '/api/reality/workday-opportunities':new Error('source offline')
 }});
 await f.flush();
 assert.equal(f.nodes.realityEngineSignals.textContent,'—');
 assert.equal(f.nodes.realityEngineOwnerFindings.textContent,'2');
 assert.equal(f.nodes.realityEngineFinalReceipts.textContent,'1');
 assert.match(f.nodes.realityEngineDeltaStatus.textContent,/2\/3 sources validated/);
});
test('forged owner repair proof is rejected; technical verification does not count as installation',async()=>{
 const corrupted=owner();
 corrupted.items[0].repair_proof.installed=true;
 const f=fixture({sources:{'/api/reality/personal-gap-intake':corrupted}});
 await f.flush();
 assert.equal(f.nodes.realityEngineSignals.textContent,'123');
 assert.equal(f.nodes.realityEngineOwnerFindings.textContent,'—');
 assert.equal(f.nodes.realityEngineTestedRepairs.textContent,'—');
 assert.match(f.nodes.realityEngineDeltaStatus.textContent,/2\/3 sources validated/);
});
test('unmatched or unverified settlement never generates an independent final receipt link',async()=>{
 const incomplete=loop();
 incomplete.jobs[0].full_loop_independently_verified=false;
 const f=fixture({sources:{
  '/api/reality/personal-genuine-loop-status':incomplete
 }});
 await f.flush();
 assert.equal(f.nodes.realityEngineFinalReceipts.textContent,'0');
 assert.equal(f.nodes.realityEngineReceiptLink.children.length,0);
 assert.match(f.nodes.realityEngineDeltaProofNote.textContent,/No exact matching final-loop receipt/);
});
test('owner logout clears private evidence immediately and prohibits anonymous polling',async()=>{
 const f=fixture({signed:false});
 await f.flush();
 assert.equal(f.calls.length,0);
 assert.equal(f.nodes.realityEngineOwnerFindings.textContent,'—');
 await f.toggle(true);
 assert.equal(f.calls.length,3);
 assert.equal(f.nodes.realityEngineFinalReceipts.textContent,'1');
 await f.toggle(false);
 assert.equal(f.nodes.realityEngineSignals.textContent,'—');
 assert.equal(f.nodes.realityEngineOwnerFindings.textContent,'—');
 assert.equal(f.nodes.realityEngineTestedRepairs.textContent,'—');
 assert.equal(f.nodes.realityEngineFinalReceipts.textContent,'—');
 assert.equal(f.nodes.realityEngineReceiptLink.children.length,0);
 f.intervals[0].fn();await f.flush();
 assert.equal(f.calls.length,3);
});
