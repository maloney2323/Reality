import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261118_owner_first_proactive_business_chat_v23.sql');
const welcomeV24=read('supabase/migrations/20261118_first_chat_purpose_welcome_v24.sql');
const api=read('api/reality/personal-chat-first-contact.js');
const client=read('reality-chat-first-contact-v1.js');
const html=read('index.html');
const shell=read('reality-unified-shell-v1.js');
const routes=JSON.parse(read('vercel.json'));
const historyApi=read('api/reality/personal-chat.js');

const cid='a1111111-2222-4333-8444-555555555555';
const success={ok:true,status:'OWNER_FIRST_PROACTIVE_CHAT_DURABLY_SENT',
 conversation_id:cid,current_conversation_received_message:true,
 external_actions_authorized:false,work_shift_authorized:false,
 provider_connected_by_read:false,production_changed:false};
const returning={ok:true,status:'OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK',
 current_conversation_received_message:false,
 external_actions_authorized:false,work_shift_authorized:false,
 provider_connected_by_read:false,production_changed:false};
const already={ok:true,status:'OWNER_FIRST_CHAT_ALREADY_SENT_NO_DUPLICATE',
 current_conversation_received_message:false,
 external_actions_authorized:false,work_shift_authorized:false,
 provider_connected_by_read:false,production_changed:false};
function boot({response=success,signedIn=false,path='/chat'}={}){
 let observer;
 const requests=[];let refreshed=0;
 const ready={style:{display:signedIn?'block':'none'}};
 const win={location:{pathname:path},
  realityActiveConversationId:()=>cid,
  realityChatRefreshTranscript:async()=>{refreshed++}};
 const doc={getElementById:id=>id==='privateReady'?ready:null};
 const context={window:win,document:doc,
  fetch:async(url,init)=>{
   requests.push({url,init});
   return {ok:true,json:async()=>response};
  },
  AbortSignal,MutationObserver:class{
   constructor(callback){observer=callback;}
   observe(){}},console};
 runInNewContext(client,context);
 const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
 return {requests,ready,flush,
  signIn:()=>{ready.style.display='block';observer?.()},
  signOut:()=>{ready.style.display='none';observer?.()},
  get refreshed(){return refreshed}};
}
test('Reality sends first Chat itself only AFTER a verified signed-in account state',async()=>{
 const app=boot();await app.flush();
 assert.equal(app.requests.length,0);
 app.signIn();await app.flush();
 assert.equal(app.requests.length,1);
 assert.equal(app.requests[0].url,'/api/reality/personal-chat-first-contact');
 assert.equal(app.requests[0].init.credentials,'same-origin');
 assert.equal(app.requests[0].init.cache,'no-store');
 const body=JSON.parse(app.requests[0].init.body);
 assert.equal(body.action,'SEND_FIRST_OWNER_BUSINESS_CHAT_IF_NEW');
 assert.equal(body.conversation_id,cid);
 assert.equal(app.refreshed,1,'exact saved assistant message is loaded into real chat');
 app.signIn();await app.flush();
 assert.equal(app.requests.length,1,'same session does not repeat welcome');
});
test('returning business is never given a fabricated new-account welcome',async()=>{
 const app=boot({signedIn:true,response:returning});await app.flush();
 assert.equal(app.requests.length,1);
 assert.equal(app.refreshed,0);
});
test('old already-sent welcome is not duplicated on browser or conversation restart',async()=>{
 const app=boot({signedIn:true,response:already});await app.flush();
 assert.equal(app.requests.length,1);
 assert.equal(app.refreshed,0);
});
test('new greeting never fires on public landing or employee pages',async()=>{
 for(const path of ['/','/overview','/employees','/work']){
  const app=boot({path,signedIn:true});await app.flush();
  assert.equal(app.requests.length,0,path);
 }
});
test('first-contact server uses existing authenticated owner, same-origin, no client business facts or model authority',()=>{
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/sec-fetch-site/);
 assert.match(api,/application\\\/json/);
 assert.match(api,/Object\.keys\(b\)\.sort\(\)\.join\('\|'\)!=='action\|conversation_id'/);
 assert.match(api,/shiftDatabase\(process\.env\)/);
 assert.match(api,/db\.url!==session\.config\?\.url/);
 assert.match(api,/reality_send_owner_first_business_chat_v1/);
 assert.match(api,/p_owner_id:session\.user_id/);
 assert.match(api,/work_shift_authorized!==false/);
 assert.match(api,/external_actions_authorized!==false/);
 assert.doesNotMatch(api,/\bOpenAI\b|model\.generate|executeEmployeeShift|installPatch/);
 assert.doesNotThrow(()=>new Script(client));
});
test('actual signed first-contact RPC transports through the exact existing allowlist',async()=>{
 const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
 const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',secretKey:'isolated-fixture'};
 let observed=0;
 const response=await shiftRpc(db,'reality_send_owner_first_business_chat_v1',{
  p_owner_id:owner,p_conversation_id:cid
 },{
  fetchImpl:async(url,options)=>{
   observed++;
   assert.equal(url,db.url+'/rest/v1/rpc/reality_send_owner_first_business_chat_v1');
   assert.equal(options.method,'POST');
   assert.deepEqual(JSON.parse(options.body),{
    p_owner_id:owner,p_conversation_id:cid
   });
   return {ok:true,json:async()=>({
    status:'OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK',
    owner_id:owner,created:false
   })};
  }
 });
 assert.equal(observed,1);
 assert.equal(response.owner_id,owner);
 assert.equal(response.created,false);
 await assert.rejects(shiftRpc(db,
  'reality_allow_any_user_to_install_v999',{},{
   fetchImpl:async()=>{throw Error('A DISALLOWED CALL CANNOT REACH THE DATABASE')}
  }),/SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('new business greeting goes into durable owner RLS conversation, exactly once per user across tabs',()=>{
 assert.match(sql,/create table if not exists reality_internal\.owner_first_chat_contact_v1/);
 assert.match(sql,/owner_id uuid primary key/);
 assert.match(sql,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(sql,/from public\.reality_chat_messages where user_id=p_owner_id/);
 assert.match(sql,/from reality_internal\.governed_employee_shifts_v1/);
 assert.match(sql,/from reality_internal\.owner_internal_maintenance_jobs_v1/);
 assert.match(sql,/insert into public\.reality_chat_messages/);
 assert.match(sql,/values\(p_owner_id,p_conversation_id,v_request,'assistant',v_text\)/);
 assert.match(sql,/insert into reality_internal\.owner_first_chat_contact_v1/);
 assert.match(sql,/revoke all on reality_internal\.owner_first_chat_contact_v1 from public,anon,authenticated/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/NEW_BUSINESS_CONTINUE_CONNECTION_SETUP/);
 assert.match(sql,/provider_access_verified=true/);
 assert.match(sql,/credential_saved=true and oauth_consent_granted=true/);
 assert.match(sql,/setup request does not mean the service is connected yet/);
 assert.match(welcomeV24,/business, personal goals, or both/i);
 assert.match(welcomeV24,/If it is for a business, what kind do you run/i);
 assert.match(welcomeV24,/OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK/);
 assert.match(welcomeV24,/pg_catalog\.pg_advisory_xact_lock/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/grant execute[^;]+to authenticated/is);
 assert.doesNotMatch(sql,/grant select on auth\.users/);
});
test('existing Chat history is the persistence and reply path, not a floating unsaved banner',()=>{
 assert.match(html,/reality-chat-first-contact-v1\.js/);
 assert.match(html,/window\.realityChatRefreshTranscript=async/);
 assert.match(historyApi,/readPrivateChat\(session,conversationId\)/);
 assert.match(client,/window\.realityChatRefreshTranscript\(\)/);
 assert.doesNotMatch(client,/innerHTML\s*=|\.insertAdjacentHTML\(/);
 assert.match(client,/checked=true/);
});
test('signed-in Chat is home, but public landing and original dashboard remain available',()=>{
 assert.match(html,/if\(yes&&window\.location\.pathname==='\/'\)window\.location\.assign\('\/chat'\)/);
 assert.doesNotMatch(html,/if\(realityCurrentRoute\(\)==='chat'&&!confirmedActiveGoal\)jumpToWorkSetup\('goal'\)/);
 assert.match(shell,/if\(kind==='mobile'&&entry\.key==='chat'\).*textContent='Home'/);
 assert.match(shell,/\{key:'home',label:'Overview',url:'\/overview'/);
 assert.match(shell,/\{key:'chat',label:'Home · Chat',url:'\/chat'/);
 assert.ok(routes.rewrites.some(x=>x.source==='/overview'&&x.destination==='/index.html'));
 assert.ok(routes.rewrites.some(x=>x.source==='/chat'&&x.destination==='/index.html'));
 assert.ok(!routes.rewrites.some(x=>x.source==='/'&&x.destination==='/chat'),
  'public landing remains available to visitors');
});
