import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';

const source=readFileSync(new URL('../reality-chat-installation-status-v1.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const HASH='sha256:'+'a'.repeat(64);
const base={
 ok:true,status:'EXACT_SIGNED_OWNER_APPROVAL_RECORDED_READBACK',
 owner_approval_recorded:true,installation_authorized:true,
 retry_owner_approval:false,production_changed:false,
 original_job_completed:false,
 shift_id:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 approval_receipt_sha256:HASH,repair_installed:true,
 installed_commit_sha:'8'.repeat(40),
 decision_state:'INSTALLED',postinstall_verified:false,
 independent_postinstall_receipt_sha256:null
};
class El {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.children=[];
  this.hidden=false;this.id='';this.className='';this.style={display:'block'};
  this.textContent='';this.parentElement=null;this.attributes={};
 }
 append(...children){for(const c of children){
  this.children.push(c);c.parentElement=this;
 }}
 setAttribute(key,value){this.attributes[key]=value}
 contains(node){return this===node||this.children.some(c=>c.contains?.(node))}
 remove(){
  if(!this.parentElement)return;
  this.parentElement.children=this.parentElement.children.filter(c=>c!==this);
  this.parentElement=null;
 }
 replaceChildren(...children){
  this.children=[];this.append(...children);
 }
}
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r))};
function setup({payloads=[base],signedIn=true}={}){
 const ready=new El(),thread=new El();
 ready.style.display=signedIn?'block':'none';
 const timers=[],calls=[],observers=[],listeners=new Map();
 const fetch=async(url,options)=>{
  calls.push({url,options});
  const next=payloads[Math.min(calls.length-1,payloads.length-1)];
  return {ok:next?.ok===true,status:next?.ok===true?200:503,
   json:async()=>next};
 };
 const window={location:{pathname:'/chat'},setInterval:fn=>timers.push(fn),
  addEventListener:(name,fn)=>listeners.set(name,fn)};
 const document={visibilityState:'visible',
  getElementById:id=>id==='privateReady'?ready:id==='privateTranscript'?thread:null,
  createElement:tag=>new El(tag),addEventListener:(name,fn)=>listeners.set(name,fn)};
 runInNewContext(source,{window,document,fetch,AbortSignal,
  MutationObserver:class{
   constructor(fn){observers.push(fn)}
   observe(){}
   disconnect(){}
  }
 });
 return{ready,thread,calls,timers,observers,listeners,flush};
}
test('authenticated inline milestone displays installed source as pending independent proof',async()=>{
 assert.doesNotThrow(()=>new Script(source));
 assert.match(html,/defer src="\/reality-chat-installation-status-v1\.js"/);
 const x=setup();await x.flush();
 assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].url,'/api/reality/signed-maintenance-exact-install-approval');
 assert.equal(x.calls[0].options.method,'GET');
 assert.equal(x.calls[0].options.credentials,'same-origin');
 assert.equal(x.thread.children.length,1);
 const bubble=x.thread.children[0];
 assert.equal(bubble.id,'realityChatVerifiedInstallStatus');
 assert.equal(bubble.hidden,false);
 assert.match(bubble.children[1].textContent,/PR #308 was installed/);
 assert.match(bubble.children[1].textContent,/Independent post-install verification is still pending/);
 assert.match(bubble.children[1].textContent,/original job is not yet complete/);
 assert.doesNotMatch(bubble.children[1].textContent,/independently verified|customer job completed/i);
 assert.match(bubble.style.cssText,/position:static/);
 assert.ok(!/modal|dialog|fixed/i.test(bubble.className));
 assert.ok(x.calls.every(c=>c.options.method==='GET'));
});
test('a later read-only verified receipt upgrades the same bubble without duplicate posting',async()=>{
 const verified={...base,decision_state:'VERIFIED',postinstall_verified:true,
  independent_postinstall_receipt_sha256:'sha256:'+'b'.repeat(64)};
 const x=setup({payloads:[base,verified]});await x.flush();
 const bubble=x.thread.children[0];
 x.timers[0]();await x.flush();
 assert.equal(x.thread.children.length,1);
 assert.equal(x.thread.children[0],bubble);
 assert.match(bubble.children[1].textContent,/separate independent verification receipt/);
 assert.match(bubble.children[1].textContent,/original customer job still needs/);
 assert.ok(x.calls.every(c=>c.options.method==='GET'));
});
test('approval, malformed receipts, failed GET and signed-out state cannot fabricate installed proof',async()=>{
 for(const payload of [
  {...base,decision_state:'APPROVED',repair_installed:false,installed_commit_sha:null},
  {...base,installed_commit_sha:'bad'},
  {...base,source_ref:'https://unknown.example/pull/308'},
  {...base,postinstall_verified:true},
  {...base,decision_state:'VERIFIED',postinstall_verified:true,
   independent_postinstall_receipt_sha256:null},
  {...base,original_job_completed:true},
  {ok:false}
 ]){
  const x=setup({payloads:[payload]});await x.flush();
  assert.equal(x.thread.children.length,0);
 }
 const loggedOut=setup({signedIn:false});await loggedOut.flush();
 assert.equal(loggedOut.calls.length,0);
 assert.equal(loggedOut.thread.children.length,0);
});
test('historical transcript rerender preserves the verified inline milestone without any write',async()=>{
 const x=setup();await x.flush();
 const bubble=x.thread.children[0];
 x.thread.replaceChildren();
 x.observers[1]();await x.flush();
 assert.equal(x.thread.children.length,1);
 assert.equal(x.thread.children[0],bubble);
 assert.ok(x.calls.every(c=>c.options.method==='GET'));
});
