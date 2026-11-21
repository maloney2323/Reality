import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=source('supabase/migrations/20261118_owner_first_proactive_business_chat_v23.sql');
const page=source('index.html'),shell=source('reality-unified-shell-v1.js');
const client=source('reality-chat-first-contact-v1.js');
const server=source('api/reality/personal-chat-first-contact.js');
const model=source('api/reality/personal-chat.js');
const allowlist=source('src/reality-governed-shift-boundary-v1.js');
const c='701eb4e5-c572-4248-bfb7-6f9587a24222';
const original={ok:true,status:'OWNER_FIRST_PROACTIVE_CHAT_DURABLY_SENT',
 conversation_id:c,current_conversation_received_message:true,
 saved_message_id:'a5269ad1-8da1-4d2c-afbe-6ca3f20ca9aa',
 contact_kind:'NEW_BUSINESS_WELCOME',
 new_customer_welcome_sent:true,prior_history_preserved:false,
 external_actions_authorized:false,work_shift_authorized:false,
 provider_connected_by_read:false,production_changed:false};
function environment({signedIn=true,response=original,route='/chat'}={}){
 const ready={style:{display:signedIn?'block':'none'}},events=[];
 const view={location:{pathname:route},realityActiveConversationId:()=>c,
  realityChatRefreshTranscript:async()=>{events.push('REREAD_REAL_CHAT')}};
 let calls=[],observer;
 const doc={getElementById:id=>id==='privateReady'?ready:null};
 const f=async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>response};
 };
 runInNewContext(client,{window:view,document:doc,fetch:f,AbortSignal,
  MutationObserver:class{constructor(cb){observer=cb}observe(){}},
  console});
 const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r))};
 return {calls,events,ready,flush,trigger:()=>observer?.()};
}
test('new business gets exactly one real saved message, never a fabricated local banner',async()=>{
 const e=environment();await e.flush();
 assert.equal(e.calls.length,1);
 assert.equal(e.calls[0].url,'/api/reality/personal-chat-first-contact');
 assert.equal(e.calls[0].options.credentials,'same-origin');
 assert.equal(e.calls[0].options.method,'POST');
 assert.deepEqual(JSON.parse(e.calls[0].options.body),{
  action:'SEND_FIRST_OWNER_BUSINESS_CHAT_IF_NEW',conversation_id:c
 });
 assert.deepEqual(e.events,['REREAD_REAL_CHAT']);
 e.trigger();await e.flush();assert.equal(e.calls.length,1);
 assert.doesNotMatch(client,/innerHTML\s*=|bubble\('assistant'/);
 assert.match(client,/window\.realityChatRefreshTranscript\(\)/);
});
test('existing account and earlier signed shifts are never greeted as first-time customer',async()=>{
 const e=environment({response:{...original,
  status:'OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK',
  conversation_id:null,current_conversation_received_message:false,
  new_customer_welcome_sent:false,prior_history_preserved:true}});
 await e.flush();assert.equal(e.calls.length,1);
 assert.deepEqual(e.events,[]);
 assert.match(sql,/exists\(select 1 from public\.reality_chat_messages where user_id=p_owner_id\)/);
 assert.match(sql,/exists\(select 1 from reality_internal\.governed_employee_shifts_v1/);
 assert.match(sql,/exists\(select 1 from reality_internal\.owner_internal_maintenance_jobs_v1/);
 assert.match(sql,/OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK/);
});
test('signed-out public visitor gets NO signed Chat message or side effect',async()=>{
 const e=environment({signedIn:false});await e.flush();
 assert.equal(e.calls.length,0);assert.deepEqual(e.events,[]);
 e.ready.style.display='block';e.trigger();await e.flush();
 assert.equal(e.calls.length,1);
});
test('a prior first welcome in another browser cannot be written again',async()=>{
 const e=environment({response:{...original,
  status:'OWNER_FIRST_CHAT_ALREADY_SENT_NO_DUPLICATE',
  conversation_id:'b1111111-2222-4333-8444-555555555555',
  current_conversation_received_message:false,
  new_customer_welcome_sent:false,prior_history_preserved:true}});
 await e.flush();assert.equal(e.calls.length,1);assert.deepEqual(e.events,[]);
 assert.match(sql,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(sql,/owner_id uuid primary key/);
 assert.match(sql,/message_id uuid not null unique/);
 assert.match(sql,/OWNER_FIRST_CHAT_ALREADY_SENT_NO_DUPLICATE/);
});
test('proactive onboarding is based on actual existing connector states, not implied OAuth',()=>{
 assert.match(sql,/owner_connector_setup_requests_v1/);
 assert.match(sql,/provider_access_verified=true/);
 assert.match(sql,/credential_saved=true/);
 assert.match(sql,/oauth_consent_granted=true/);
 assert.match(sql,/NEW_BUSINESS_WELCOME/);
 assert.match(sql,/NEW_BUSINESS_CONTINUE_CONNECTION_SETUP/);
 assert.match(sql,/NEW_BUSINESS_CONNECTION_VERIFIED_FIRST_WORK/);
 assert.match(sql,/A setup request does not mean the service is connected yet/);
 assert.match(sql,/Automation can feel confusing at first/);
 assert.match(sql,/what kind of business do you run/);
 assert.match(sql,/role,content/);
 assert.match(sql,/v_request:=pg_catalog\.gen_random_uuid\(\)/);
 assert.match(sql,/v_text:=pg_catalog\.replace\(v_text/);
});
test('signed owner boundary, RLS and provider permissions cannot be expanded by a Chat greeting',()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on reality_internal\.owner_first_chat_contact_v1 from public,anon,authenticated/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/from public,anon,authenticated/);
 assert.match(sql,/to service_role/);
 assert.match(sql,/human_request_not_created',true/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/i);
 assert.doesNotMatch(sql,/update reality_internal\.owner_connector_setup_requests_v1/i);
 assert.doesNotMatch(sql,/delete from public\.reality_chat_messages/i);
 assert.doesNotMatch(sql,/grant select on auth\.users/i);
 assert.match(server,/authenticatedChatSession\(req,res\)/);
 assert.match(server,/assertSameOrigin\(req\)/);
 assert.match(server,/shiftDatabase\(process\.env\)/);
 assert.match(server,/db\.url!==session\.config\?\.url/);
 assert.match(server,/reality_send_owner_first_business_chat_v1/);
 assert.match(allowlist,/\\|send_owner_first_business_chat_v1\\|/);
 assert.doesNotMatch(client,/authorization:\s*['"]Bearer|service_role|sb_secret_/);
});
test('Chat is owner homepage while public landing and overview remain available',()=>{
 assert.match(page,/if\(yes&&window\.location\.pathname==='\/'\)window\.location\.assign\('\/chat'\)/);
 assert.match(page,/<script defer src="\/reality-chat-first-contact-v1.js"><\/script>/);
 assert.match(shell,/['"]\/overview['"]:'home'/);
 assert.match(shell,/key:'home',label:'Overview',url:'\/overview'/);
 assert.match(shell,/key:'chat',label:'Home · Chat',url:'\/chat'/);
 const rewrites=JSON.parse(source('vercel.json')).rewrites;
 assert.ok(rewrites.some(r=>r.source==='/overview'&&r.destination==='/index.html'));
 assert.ok(rewrites.some(r=>r.source==='/chat'&&r.destination==='/index.html'));
 assert.match(model,/owner_first_contact_and_conversational_onboarding/);
 assert.match(model,/when_returning:/);
 assert.match(model,/when_setup_partial:/);
});
test('all new browser scripts and endpoint parse',()=>{
 assert.doesNotThrow(()=>new Script(client));
 assert.match(server,/export default async function handler/);
 assert.match(sql,/no_execution_authorized boolean not null default true/);
 assert.match(sql,/no_provider_connection_claimed boolean not null default true/);
});
