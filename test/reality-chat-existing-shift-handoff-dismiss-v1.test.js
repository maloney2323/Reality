import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const code=readFileSync(new URL('../reality-chat-existing-shift-status-v1.js',import.meta.url),'utf8');
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const shiftId='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const requestId='e1111111-2222-4333-8444-555555555555';
const convoId='d1111111-2222-4333-8444-555555555555';
const fixtureReceipt={
 ok:true,status:'OWNER_LATEST_SIGNED_SHIFT_CHAT_WAKE_VERIFIED',
 shift_id:shiftId,request_id:requestId,conversation_id:convoId,
 network_request_id:19637,wake_enqueued:true,
 worker_execution_verified_for_this_request:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false,
 last_worker_safe_result:'SIGNED_MAINTENANCE_REPAIR_AND_ORIGINAL_LINEAGE_SEPARATELY_ROUTED'
};
function instance({storage=new Map(),decisionPresent=false}={}){
 const calls=[];
 class Element{
  constructor(tag='section'){
   this.tagName=tag.toUpperCase();this.children=[];
   this.style={};this.textContent='';this.hidden=false;
   this.parentElement=null;this.id='';
   this.events=new Map();this.firstChild=null;
  }
  setAttribute(){}
  append(...children){
   for(const n of children){this.children.push(n);n.parentElement=this}
   this.firstChild=this.children[0]||null;
  }
  contains(el){return this===el||this.children.some(c=>c.contains?.(el))}
  remove(){const p=this.parentElement;if(!p)return;
   p.children=p.children.filter(x=>x!==this);this.parentElement=null;
   p.firstChild=p.children[0]||null;
  }
  addEventListener(name,fn){this.events.set(name,fn)}
  click(){this.events.get('click')?.()}
  scrollIntoView(){}
 }
 const composer=new Element(),thread=new Element();
 const ready=new Element(),existing=new Element();
 ready.append(composer);
 const elements={realityChatComposer:composer,privateTranscript:thread};
 if(decisionPresent){existing.hidden=false;
  elements.realityChatMaintenanceNudge=existing}
 const document={readyState:'complete',
  createElement:tag=>new Element(tag),
  getElementById:id=>elements[id]||thread.children.find(x=>x.id===id)||null,
  addEventListener(){}};
 const events=new Map();
 const window={sessionStorage:{
  getItem:key=>storage.get(key)||null,
  setItem:(key,val)=>storage.set(key,val)
 },addEventListener:(event,fn)=>events.set(event,fn),
  realityActiveConversationId:()=>convoId};
 const fetch=async(url,options)=>{
  calls.push({url,options});
  assert.equal(options.method,'GET');
  return{ok:true,status:200,json:async()=>fixtureReceipt};
 };
 runInNewContext(code,{location:{pathname:'/chat'},document,window,fetch,
  AbortSignal,MutationObserver:class{observe(){} disconnect(){}},
  localStorage:{getItem:()=>null,setItem:()=>{}}});
 const flush=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r))};
 return {storage,calls,thread,composer,flush,events};
}
test('the real signed shift receipt is never mounted above the composer',async()=>{
 assert.match(source,/reality-chat-existing-shift-status-v1\.js/);
 assert.doesNotMatch(code,/composer\.insertBefore\(box/);
 const x=instance();await x.flush();
 assert.equal(x.composer.children.length,0);
 assert.equal(x.thread.children.length,1);
 const box=x.thread.children[0];
 assert.equal(box.id,'realityChatExistingShiftHandoff');
 const close=box.children[0].children[1];
 assert.equal(close.textContent,'×');
 assert.equal(close.id,'realityChatExistingShiftHandoffDismiss');
 assert.equal(close.style.cssText.includes('min-width:44px'),true);
 assert.ok(x.calls.every(r=>r.options.method==='GET'));
 close.click();
 assert.equal(box.hidden,true);
 assert.equal(x.thread.children.length,0);
 assert.equal(x.storage.get('reality.dismissed.latest.shift.handoff.v1'),requestId);
 assert.ok(x.calls.every(r=>r.options.method==='GET'),'the close button cannot approve or restart work');
});
test('dismissing the status survives a reload while preserving its saved ledger receipt',async()=>{
 const storage=new Map();
 const x=instance({storage});await x.flush();
 x.thread.children[0].children[0].children[1].click();
 const y=instance({storage});await y.flush();
 assert.equal(y.thread.children.length,0);
 assert.equal(y.composer.children.length,0);
 assert.equal(y.calls.length,1,'receipt source remains independently readable');
});
test('the old shift receipt is suppressed when Reality already shows the maintenance decision',async()=>{
 const x=instance({decisionPresent:true});await x.flush();
 assert.equal(x.thread.children.length,0);
 assert.equal(x.composer.children.length,0);
 assert.equal(x.calls.length,1);
});
