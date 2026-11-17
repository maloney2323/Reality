import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectSavedReplyForRecovery}
 from '../reality-chat-recover-unanswered-v1.js';
const id='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const request='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const source='supabase:reality_chat_messages:3d5f5555-44e5-4d43-a7ac-af0de70b2c2b';
const now=Date.parse('2026-11-14T16:00:00.000Z');
const msg={role:'user',request_id:request,source_ref:source,
 created_at:'2026-11-14T15:59:00.000Z'};
const pending={request_id:request,user_source_ref:source,
 status:'USER_MESSAGE_SAVED_REPLY_NOT_VERIFIED'};
const args={conversationId:id,messages:[msg],
 unansweredRequests:[pending],now};
test('fresh latest saved unanswered turn is eligible only for same-request recovery',()=>{
 const selected=selectSavedReplyForRecovery(args);
 assert.equal(selected.request_id,request);
 assert.equal(selected.source_ref,source);
 assert.equal(selected.creates_user_message,false);
 assert.equal(selected.execution_authorized,false);
 assert.equal(selected.installation_authorized,false);
});
test('no recovery when a later assistant answer, later user instruction, or no matching receipt',()=>{
 assert.equal(selectSavedReplyForRecovery({...args,messages:[msg,{...msg,
  role:'assistant'}]}),null);
 assert.equal(selectSavedReplyForRecovery({...args,messages:[msg,{...msg,
  request_id:'1a18ee38-3420-4320-93d6-7e22c5c3fdab',
  created_at:'2026-11-14T15:59:40Z'}]}),null);
 assert.equal(selectSavedReplyForRecovery({...args,unansweredRequests:[]}),null);
 assert.equal(selectSavedReplyForRecovery({...args,unansweredRequests:[{
  ...pending,user_source_ref:'supabase:reality_chat_messages:bad'}]}),null);
});
test('stale, future, unknown or malformed history cannot automatically resume',()=>{
 assert.equal(selectSavedReplyForRecovery({...args,now:now+25*60*60*1000}),null);
 assert.equal(selectSavedReplyForRecovery({...args,now:now-10*60*1000}),null);
 assert.equal(selectSavedReplyForRecovery({...args,conversationId:'not-uuid'}),null);
 assert.equal(selectSavedReplyForRecovery({...args,messages:[{
  ...msg,source_ref:'fake:assistant'}]}),null);
});
test('recovery UI wires exact request identity and reuses the existing signed reply-only path',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../reality-chat-recover-unanswered-v1.js',
  import.meta.url),'utf8');
 assert.match(html,/retry\.dataset\.recoverRequestId=message\.request_id/);
 assert.match(html,/window\.dispatchEvent\(new CustomEvent\('reality:saved-chat-readback'/);
 assert.match(html,/src="\/reality-chat-recover-unanswered-v1\.js"/);
 assert.match(html,/body:JSON\.stringify\(\{conversation_id:data\.conversation_id,\s*request_id:message\.request_id,message:message\.text\}\)/);
 assert.match(js,/window\.localStorage\?\.setItem\(key/);
 assert.match(js,/control\.click\(\)/);
 assert.doesNotMatch(js,/\/api\/reality\/personal-chat-intake/);
 assert.doesNotMatch(js,/AUTHORIZE_VERIFIED_ORIGINAL_DISCOVERY/);
});


test('real browser event recovers at most once for the same saved turn',async()=>{
 const listener=new Map(),storage=new Map();
 let clicked=0;
 const button={disabled:false,isConnected:true,textContent:'Retry saved reply',
  click(){clicked++}};
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 globalThis.window={
  location:{pathname:'/chat'},
  addEventListener:(type,handler)=>listener.set(type,handler),
  localStorage:{
   getItem:key=>storage.get(key)||null,
   setItem:(key,val)=>{storage.set(key,val);}
  }
 };
 globalThis.document={
  hidden:false,getElementById:()=>({disabled:false}),
  querySelector:sel=>sel.includes(request)?button:null
 };
 try{
  await import('../reality-chat-recover-unanswered-v1.js?browser-integration-v1');
  const event={detail:{conversation_id:id,messages:[{
   ...msg,created_at:new Date().toISOString()
  }],unanswered_requests:[pending]}};
  const handler=listener.get('reality:saved-chat-readback');
  assert.equal(typeof handler,'function');
  handler(event);
  handler(event);
  assert.equal(clicked,1);
  assert.match(button.textContent,/Recovering saved reply automatically/);
  assert.equal(storage.size,1);
 }finally{
  if(originalWindow===undefined)delete globalThis.window;
  else globalThis.window=originalWindow;
  if(originalDocument===undefined)delete globalThis.document;
  else globalThis.document=originalDocument;
 }
});


test('saved reply recovery waits for disabled Send to release, then retries the SAME request once',async()=>{
 const listeners=new Map(),storage=new Map();
 let clicked=0,mutationHandler=null;
 const sendButton={disabled:true};
 const retryButton={
  disabled:false,isConnected:true,textContent:'Retry original saved reply',
  click(){clicked++;}
 };
 const oldWindow=globalThis.window,oldDocument=globalThis.document,
  oldMutation=globalThis.MutationObserver;
 globalThis.window={
  location:{pathname:'/chat'},
  addEventListener:(event,handler)=>listeners.set(event,handler),
  localStorage:{
   getItem:key=>storage.get(key)||null,
   setItem:(key,value)=>storage.set(key,value)
  }
 };
 globalThis.document={
  hidden:false,
  getElementById:()=>sendButton,
  addEventListener:()=>{},
  querySelector:selector=>selector.includes(request)?retryButton:null
 };
 globalThis.MutationObserver=class {
  constructor(handler){mutationHandler=handler}
  observe(target,config){
   assert.equal(target,sendButton);
   assert.deepEqual(config.attributeFilter,['disabled']);
  }
 };
 try{
  await import('../reality-chat-recover-unanswered-v1.js?deferred-browser-test-v2');
  const event={detail:{conversation_id:id,
   messages:[{...msg,created_at:new Date().toISOString()}],
   unanswered_requests:[pending]}};
  listeners.get('reality:saved-chat-readback')(event);
  assert.equal(clicked,0,'must not drop or prematurely retry while sending');
  assert.equal(storage.size,0,'one-use recovery only when actually ready');
  sendButton.disabled=false;
  mutationHandler();
  mutationHandler();
  assert.equal(clicked,1);
  assert.equal(storage.size,1);
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldMutation===undefined)delete globalThis.MutationObserver;
  else globalThis.MutationObserver=oldMutation;
 }
});
