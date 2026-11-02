import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=page.indexOf('const wcGenuineStarted=new Set();');
const end=page.indexOf('let wcUnfinishedReadSerial=0;',start);
assert.ok(start>0&&end>start,'REALITY_OWNER_INVESTIGATION_UI_MISSING');
const code=page.slice(start,end);
const job={work_id:'work:'+'a'.repeat(32),conversation_id:'11111111-1111-4111-8111-111111111111'};

function ui(fetchImpl,{shortTimer=false}={}){
 const box={element:{dataset:{unfinishedFeedback:job.work_id},textContent:''}};
 const panel={querySelectorAll:()=>[box.element]};
 const mock={
  fetch:fetchImpl,AbortController,Set,Map,Object,String,JSON,RegExp,Error,
  $:name=>name==='wcUnfinishedList'?panel:null,
  setTimeout:shortTimer?(cb)=>setTimeout(cb,2):setTimeout,
  clearTimeout,
 };
 vm.createContext(mock);
 vm.runInContext(code+';globalThis.controller={wcStartVerifiedGenuineGap,wcShowGenuineFeedback,wcBoundedJson};',mock);
 return {controller:mock.controller,box,panel};
}
test('one auto-investigation POST only and evidence feedback survives DOM replacement',async()=>{
 let calls=0;
 const h=ui(async()=>{
  calls++;
  return {ok:true,json:async()=>({
   ok:true,original_work_id:job.work_id,
   original_job_completed:false,new_job_created:false,production_changed:false,
   capability_response:'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED',
   queue_trigger_id:'22222222-2222-4222-8222-222222222222',
   worker_wake_status:'WORKER_WAKE_NEEDS_RECONCILIATION',
  })};
 });
 await h.controller.wcStartVerifiedGenuineGap(job);
 assert.equal(calls,1);
 assert.match(h.box.element.textContent,/durably queued/);
 h.box.element={dataset:{unfinishedFeedback:job.work_id},textContent:''};
 await h.controller.wcStartVerifiedGenuineGap(job);
 assert.equal(calls,1);
 assert.match(h.box.element.textContent,/durably queued/);
});
test('timed-out investigation becomes visible, uncertain, and never automatically repeats POST',async()=>{
 let calls=0;
 const h=ui((_url,{signal})=>new Promise((_resolve,reject)=>{
  calls++;
  signal.addEventListener('abort',()=>{
   const e=new Error('Aborted');e.name='AbortError';reject(e);
  },{once:true});
 }),{shortTimer:true});
 await h.controller.wcStartVerifiedGenuineGap(job);
 assert.equal(calls,1);
 assert.match(h.box.element.textContent,/outcome is uncertain/);
 assert.match(h.box.element.textContent,/No automatic retry/);
 h.box.element={dataset:{unfinishedFeedback:job.work_id},textContent:''};
 await h.controller.wcStartVerifiedGenuineGap(job);
 assert.equal(calls,1);
 assert.match(h.box.element.textContent,/outcome is uncertain/);
});
test('read-only unfinished scan is bounded and reports timeout instead of claiming completed work',()=>{
 assert.match(page,/wcBoundedJson\([\s\S]*?'\/api\/reality\/personal-unfinished-work',[\s\S]*?20000\)/);
 assert.match(page,/Unfinished Work read exceeded 20 seconds/);
 assert.match(page,/wcGenuineFeedback\.get\(job\.work_id\+'\|'\+job\.conversation_id\)/);
});
