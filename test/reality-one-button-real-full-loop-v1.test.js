import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const browser=readFileSync(new URL('../public/one-button-full-loop-v1.js',import.meta.url),'utf8');
const UUID='85eeae0b-2988-43c4-b20c-590fb51da70d';
const WORK='work:'+'a'.repeat(32);
function el(tag='div'){
 return {tag,textContent:'',children:[],disabled:false,listeners:{},
  addEventListener(type,fn){this.listeners[type]=fn},
  append(x){this.children.push(x)},replaceChildren(){this.children=[]}
 };
}
function fixture({signed=true,conv=UUID,routes={}}={}){
 const nodes={simpleRunFullLoop:el('button'),simpleFullLoopStatus:el(),
 simpleFullLoopReceipt:el()};
 const calls=[],timers=[],chat={opened:0,refreshed:0};
 const fakeFetch=async(url,options)=>{
  calls.push({url,options});
  const value=routes[url];
  if(value instanceof Error)throw value;
  if(!value)return {ok:false,json:async()=>({ok:false,error:'UNEXPECTED_ROUTE'})};
  return {ok:true,json:async()=>({...value})};
 };
 const ctx={document:{getElementById:id=>nodes[id],
  createElement:tag=>el(tag)},window:{
  homeOwnerSignedIn:()=>signed,
  realityActiveConversationId:()=>conv,
  realityOpenChatDock:()=>{chat.opened++},
  homeOwnerRefresh:()=>{chat.refreshed++}
 },fetch:fakeFetch,encodeURIComponent,setInterval:fn=>{timers.push(fn);return 1}};
 vm.runInNewContext(browser,ctx,{filename:'one-button-full-loop-v1.js'});
 return {nodes,calls,timers,chat,click:async()=>await nodes.simpleRunFullLoop.listeners.click()};
}
const noActive={ok:true,jobs:[],independent_final_receipts:[],production_changed:false,
 external_action_performed:false};
const noWork={ok:true,phase:'NO_VERIFIED_ELIGIBLE_WORK',queued:false};
const base={
 '/api/reality/personal-genuine-loop-status':noActive,
 '/api/reality/personal-governed-build':noWork,
 '/api/reality/personal-real-repair-opportunities':{ok:true,opportunities:[]}
};
test('prominent single button and ordinary secure worker API only',()=>{
 assert.match(home,/id="simpleRunFullLoop" class="simple-primary">Run Full Loop/);
 assert.match(home,/id="simpleFullLoopStatus"/);
 assert.match(home,/src="\/one-button-full-loop-v1\.js"/);
 assert.doesNotMatch(browser,/localStorage|github\.com\/repos|token=|authorization:'Bearer/);
 assert.doesNotMatch(browser,/personal-qualified-capability-approve|OWNER_APPROVE_EXACT_VERIFIED/);
 assert.doesNotThrow(()=>new vm.Script(browser));
});
test('one click adopts one real source-backed failure and dispatches only original investigation',async()=>{
 const source={independently_verified:true,issue_number:188,
  original_provider_failed_run_id:41547631404,source_sha:'a'.repeat(40),
  source_path:'src/reality-extensions/new-repair-v1.js'};
 const routes={...base,
  '/api/reality/personal-real-repair-opportunities':{ok:true,opportunities:[source]},
  };
 const f=fixture({routes});
 // Route responds based on verified exact payload, not a second button.
 const adopted={ok:true,original_work_id:WORK,worker_dispatch_started:true,
  installation_authorized:false,original_job_completed:false,production_changed:false};
 // Re-initialize with a fetch interception for the one POST.
 const c=[],nodes={simpleRunFullLoop:el('button'),simpleFullLoopStatus:el(),
  simpleFullLoopReceipt:el()};
 const window={
  homeOwnerSignedIn:()=>true,realityActiveConversationId:()=>UUID,
  realityOpenChatDock:()=>{},homeOwnerRefresh:()=>{}
 };
 const ctx={document:{getElementById:id=>nodes[id],createElement:tag=>el(tag)},
  window,setInterval:()=>{},encodeURIComponent,
  fetch:async(url,opt)=>{
   c.push({url,opt});
   if(url==='/api/reality/personal-real-repair-opportunities'&&opt.method==='POST')
    return {ok:true,json:async()=>adopted};
   return {ok:true,json:async()=>routes[url]};
  }};
 vm.runInNewContext(browser,ctx);
 await nodes.simpleRunFullLoop.listeners.click();
 assert.equal(c.filter(x=>x.opt.method==='POST').length,1);
 const action=c.find(x=>x.opt.method==='POST');
 assert.equal(action.url,'/api/reality/personal-real-repair-opportunities');
 const payload=JSON.parse(action.opt.body);
 assert.equal(payload.intent,'AUTHORIZE_SOURCE_VERIFIED_ORIGINAL_REPAIR');
 assert.equal(payload.conversation_id,UUID);
 assert.equal(payload.issue_number,188);
 assert.equal(payload.expected_failed_run_id,41547631404);
 assert.equal(payload.expected_source_sha,'a'.repeat(40));
 assert.match(nodes.simpleFullLoopStatus.textContent,/worker dispatched/i);
 assert.equal(nodes.simpleRunFullLoop.disabled,false);
});
test('existing original queue prevents any new customer job admission',async()=>{
 const f=fixture({routes:{...base,
 '/api/reality/personal-governed-build':{
  ok:true,queued:true,phase:'DISPATCHED_TO_ISOLATED_WORKER',original_work_id:WORK
 }}});
 await f.click();
 assert.deepEqual(f.calls.map(x=>x.url),
 ['/api/reality/personal-genuine-loop-status','/api/reality/personal-governed-build']);
 assert.equal(f.calls.filter(x=>x.options.method==='POST').length,0);
 assert.match(f.nodes.simpleFullLoopStatus.textContent,/without creating another authorization/);
});
test('existing active original work never creates another job',async()=>{
 const f=fixture({routes:{...base,
  '/api/reality/personal-genuine-loop-status':{
   ...noActive,jobs:[{original_work_id:WORK,phase:'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
    independently_settled:false,candidate_verified:false}]
  }
 }});
 await f.click();
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].options.method,'GET');
 assert.match(f.nodes.simpleFullLoopStatus.textContent,/working on the original job/);
});
test('no genuine failure does not invent a candidate or job',async()=>{
 const f=fixture({routes:base});
 await f.click();
 assert.equal(f.calls.filter(x=>x.options.method==='POST').length,0);
 assert.match(f.nodes.simpleFullLoopStatus.textContent,/stopped safely/);
});
test('existing eligible original work dispatches once via governed owner queue',async()=>{
 const routes={...base,
  '/api/reality/personal-governed-build':{
   ok:true,queued:false,phase:'NOT_QUEUED',eligible_for_investigation:true,
   original_work_id:WORK
  }};
 const calls=[],nodes={simpleRunFullLoop:el('button'),simpleFullLoopStatus:el(),
  simpleFullLoopReceipt:el()};
 vm.runInNewContext(browser,{
  document:{getElementById:id=>nodes[id],createElement:tag=>el(tag)},
  window:{homeOwnerSignedIn:()=>true,realityActiveConversationId:()=>UUID},
  setInterval:()=>{},encodeURIComponent,
  fetch:async(url,opt)=>{calls.push({url,opt});
   const v=opt.method==='POST'?{ok:true,original_work_id:WORK,
    worker_dispatch_started:true,installation_authorized:false,production_changed:false}
   :routes[url];return {ok:true,json:async()=>v}}
 });
 await nodes.simpleRunFullLoop.listeners.click();
 const writes=calls.filter(x=>x.opt.method==='POST');
 assert.equal(writes.length,1);
 assert.equal(writes[0].url,'/api/reality/personal-governed-build');
 assert.equal(JSON.parse(writes[0].opt.body).expected_original_work_id,WORK);
 assert.match(nodes.simpleFullLoopStatus.textContent,/worker dispatched/);
});
test('eligible candidate opens in-chat approval only after independent preflight ready',async()=>{
 const f=fixture({routes:{
  ...base,
  '/api/reality/personal-genuine-loop-status':{
   ...noActive,jobs:[{original_work_id:WORK,phase:'AWAITING_OWNER_APPROVAL',
     independently_settled:false,candidate_verified:true,owner_install_approved:false}]
  },
  '/api/reality/personal-qualified-capabilities':{
   ok:true,entries:[{original_work_id:WORK,full_loop_preflight:{approval_gate_open:true}}]
  }
 }});
 await f.click();
 assert.match(f.nodes.simpleFullLoopStatus.textContent,/READY FOR APPROVAL in Reality Chat/);
 assert.equal(f.chat.opened,1);
 assert.equal(f.chat.refreshed,1);
 assert.equal(f.calls.filter(x=>x.options.method==='POST').length,0);
});
test('only matching independent final receipt exposes a PDF after resumed work',async()=>{
 let phase=0;
 const nodes={simpleRunFullLoop:el('button'),simpleFullLoopStatus:el(),
  simpleFullLoopReceipt:el()},timer=[];
 const ctx={document:{getElementById:id=>nodes[id],createElement:tag=>el(tag)},
  window:{homeOwnerSignedIn:()=>true},
  setInterval:fn=>{timer.push(fn)},encodeURIComponent,
  fetch:async url=>{
   if(url==='/api/reality/personal-genuine-loop-status'){
    return {ok:true,json:async()=>phase===0?{
     ...noActive,jobs:[{original_work_id:WORK,phase:'PENDING_FROZEN_REPRODUCTION',
      independently_settled:false,candidate_verified:false}]}:{
     ...noActive,independent_final_receipts:[{
      original_work_id:WORK,status:'FULL_LOOP_INDEPENDENTLY_VERIFIED',
      production_changed:false
     }]
    }};
   }
   return {ok:true,json:async()=>({...base[url]})};
  }
 };
 vm.runInNewContext(browser,ctx);
 await nodes.simpleRunFullLoop.listeners.click();
 phase=1;timer[0]();
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(nodes.simpleFullLoopStatus.textContent,/FULL LOOP COMPLETED/);
 assert.equal(nodes.simpleFullLoopReceipt.children.length,1);
 assert.equal(nodes.simpleFullLoopReceipt.children[0].href,
  '/api/reality/personal-genuine-final-receipt-pdf?work_id='+encodeURIComponent(WORK));
});
test('anonymous click opens sign-in and never dispatches or installs',async()=>{
 const f=fixture({signed:false,routes:base});
 await f.click();
 assert.equal(f.chat.opened,1);
 assert.equal(f.calls.length,0);
 assert.match(f.nodes.simpleFullLoopStatus.textContent,/Sign in/);
});
