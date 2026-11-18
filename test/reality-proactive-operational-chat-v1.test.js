import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const client=read('reality-chat-proactive-operational-v1.js');
const server=read('api/reality/personal-chat-operational-update.js');
const sql=read('supabase/migrations/20261118_proactive_owner_operational_chat_v25.sql');
const html=read('index.html');
const conversation='a1111111-2222-4333-8444-555555555555';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const success={ok:true,status:'VERIFIED_OPERATIONAL_CHAT_DURABLY_SENT',
 created:true,conversation_id:conversation,
 current_conversation_received_message:true,
 shift_authorized:false,installation_authorized:false,
 production_changed:false};
const noRepeat={ok:true,status:'OPERATIONAL_STATE_ALREADY_DELIVERED_NO_REPEAT',
 created:false,current_conversation_received_message:false,
 shift_authorized:false,installation_authorized:false,production_changed:false};
function boot({signedIn=true,path='/chat',reply=success,busy=false,typing=false}={}){
 const calls=[],callbacks={};let refreshes=0;let observer=null;
 const ready={style:{display:signedIn?'block':'none'}};
 const prompt={value:typing?'I am typing a follow-up':'',addEventListener(name,fn){
  callbacks['prompt:'+name]=fn;
 }};
 const send={disabled:busy};
 const window={
  location:{pathname:path},
  realityActiveConversationId:()=>conversation,
  realityChatRefreshTranscript:async()=>{refreshes++;},
  setInterval:fn=>{callbacks.interval=fn;return 123;},
  addEventListener:(kind,fn)=>{callbacks[kind]=fn}
 };
 const document={visibilityState:'visible',
  activeElement:typing?prompt:null,
  getElementById:id=>({
   privateReady:ready,privatePrompt:prompt,privateSend:send
  })[id]||null,
  addEventListener:(kind,fn)=>{callbacks['document:'+kind]=fn}};
 const context={window,document,console,AbortSignal,Date,
  MutationObserver:class{constructor(fn){observer=fn;}observe(){}},
  fetch:async(url,options)=>{
   calls.push({url,options});
   return {ok:true,json:async()=>reply};
  }};
 runInNewContext(client,context);
 const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
 return {calls,callbacks,ready,prompt,send,document,flush,
  signIn:()=>{ready.style.display='block';observer?.()},
  blur:()=>{document.activeElement=null;callbacks['prompt:blur']?.()},
  get refreshes(){return refreshes}};
}
test('owner Chat opens with one verified actionable work update saved to the original conversation',async()=>{
 const app=boot();await app.flush();
 assert.equal(app.calls.length,1);
 assert.equal(app.calls[0].url,'/api/reality/personal-chat-operational-update');
 assert.equal(app.calls[0].options.method,'POST');
 assert.equal(app.calls[0].options.credentials,'same-origin');
 assert.equal(app.calls[0].options.cache,'no-store');
 assert.deepEqual(JSON.parse(app.calls[0].options.body),{
  action:'CHECK_VERIFIED_OWNER_OPERATIONAL_UPDATES',
  conversation_id:conversation
 });
 assert.equal(app.refreshes,1);
 app.callbacks.pageshow?.();await app.flush();
 assert.equal(app.calls.length,1,'page show alone must never duplicate a greeting');
});
test('signed-out, public landing or Overview do not scan owner operational data',async()=>{
 for(const o of [
  {signedIn:false,path:'/chat'},
  {signedIn:true,path:'/'},
  {signedIn:true,path:'/overview'}]){
  const app=boot(o);await app.flush();assert.equal(app.calls.length,0);
 }
});
test('preexisting unchanged operational state never pushes repeated assistant messages',async()=>{
 const app=boot({reply:noRepeat});await app.flush();
 assert.equal(app.calls.length,1);assert.equal(app.refreshes,0);
 assert.equal(typeof app.callbacks.interval,'function');
 app.callbacks.interval();await app.flush();
 assert.equal(app.calls.length,1);
});
test('typed or in-flight user Chat turn is never overwritten by proactive transcript refresh',async()=>{
 const typing=boot({typing:true});await typing.flush();
 assert.equal(typing.refreshes,0);
 typing.blur();await typing.flush();
 assert.equal(typing.refreshes,1);
 const busy=boot({busy:true});await busy.flush();
 assert.equal(busy.refreshes,0);
 busy.send.disabled=false;
 busy.blur();await busy.flush();
 assert.equal(busy.refreshes,1);
});
test('only exact service-role owner-readback RPC can emit durable evidence-signed operational update',async()=>{
 const db={url:'https://fixture.supabase.co',secretKey:'fixture'};
 let calls=0;
 const result=await shiftRpc(db,'reality_send_owner_operational_chat_digest_v1',{
  p_owner_id:owner,p_conversation_id:conversation
 },{
  fetchImpl:async(url,options)=>{
   calls++;assert.equal(url,db.url+
    '/rest/v1/rpc/reality_send_owner_operational_chat_digest_v1');
   assert.deepEqual(JSON.parse(options.body),{
    p_owner_id:owner,p_conversation_id:conversation
   });
   return {ok:true,json:async()=>({
    status:'OPERATIONAL_STATE_ALREADY_DELIVERED_NO_REPEAT',
    owner_id:owner,created:false,
    shift_authorized:false,installation_authorized:false,
    production_changed:false
   })};
  }
 });
 assert.equal(calls,1);assert.equal(result.created,false);
 await assert.rejects(shiftRpc(db,'reality_auto_install_any_code_v25',{},{
  fetchImpl:async()=>{throw Error('MUST_NOT_REACH_PROVIDER')}
 }),/SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('server binds owner scope to existing signed session and refuses unsanctioned request bodies',()=>{
 assert.match(server,/authenticatedChatSession\(req,res\)/);
 assert.match(server,/assertSameOrigin\(req\)/);
 assert.match(server,/process\.env\.VERCEL_ENV!=='preview'/);
 assert.match(server,/b\.action!=='CHECK_VERIFIED_OWNER_OPERATIONAL_UPDATES'/);
 assert.match(server,/p_owner_id:session\.user_id/);
 assert.match(server,/db\.url!==session\.config\?\.url/);
 assert.match(server,/proof\.installation_authorized!==false/);
 assert.match(server,/proof\.shift_authorized!==false/);
 assert.doesNotMatch(server,/INSERT\s+INTO|UPDATE\s+reality_internal/i);
});
test('durable and owner-isolated digest is event-based and rate-limited, not a daily blank hello',()=>{
 for(const x of [
  'owner_id uuid not null references auth.users(id)',
  'primary key(owner_id,digest_day,evidence_sha256)',
  'enable row level security',
  'revoke all on reality_internal.owner_operational_chat_digest_v1',
  "current_user<>'service_role'",
  'pg_catalog.pg_advisory_xact_lock',
  '90 minutes',
  'OPERATIONAL_STATE_ALREADY_DELIVERED_NO_REPEAT',
  'NO_NEW_ACTIONABLE_VERIFIED_OPERATIONAL_STATE',
  'independent_failure_baseline_receipt_sha256',
  'independent_frozen_test_receipt_sha256',
  'owner_employee_operating_schedule_v1',
  'owner_capability_employee_schedule_v1',
  'active_maintenance_warrant',
  'message_id',
  'insert into public.reality_chat_messages',
  "'assistant',v_text",
  'new approval where existing authority is insufficient'
 ])assert.ok(sql.includes(x),x);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/i);
 assert.doesNotMatch(sql,/update reality_internal\.owner_internal_maintenance_jobs_v1/i);
 assert.doesNotMatch(sql,/grant execute[^;]+to (?:anon|authenticated)/is);
 assert.match(html,/reality-chat-proactive-operational-v1\.js/);
 assert.doesNotThrow(()=>new Script(client));
});
test('source-backed message preserves authority separation, explanation and real next repair steps',()=>{
 assert.match(sql,/There are .*unfinished source-backed maintenance incidents/);
 assert.match(sql,/existing signed maintenance shift/);
 assert.match(sql,/NOT included in that authorization/);
 assert.match(sql,/failure baseline recorded; next obtain an independent frozen CI RED test/);
 assert.match(sql,/not completed or authorized customer-original jobs/);
 assert.match(sql,/possible capability is not an installed upgrade/);
 assert.match(sql,/No repair completion, code installation or measured savings is implied/);
 assert.match(sql,/You can reply here to ask why any job is blocked or what happens next/);
});
