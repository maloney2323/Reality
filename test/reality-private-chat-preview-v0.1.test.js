import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sessionApi from '../api/reality/personal-session.js';
import chatApi from '../api/reality/personal-chat.js';
const envKeys=['VERCEL_ENV','REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF',
 'REALITY_PERSONAL_CHAT_SUPABASE_URL','REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY',
 'REALITY_CHAT_RECEIPT_HMAC_KEY','REALITY_UNIVERSE_PERSISTENCE_ENABLED',
 'REALITY_CONTINUOUS_RELIABILITY_ENABLED','OPENAI_API_KEY',
 'REALITY_STANDALONE_OPENAI_API_KEY','REALITY_GITHUB_TOKEN'];
function mockResponse(){
 const state={headers:{},status:null,payload:null};
 const r={state,setHeader(k,v){state.headers[k]=v;return r},
 status(n){state.status=n;return r},json(body){state.payload=body;return r},
 end(){return r}};
 return r;
}
function provider(){
 const messages=[],calls=[],user=crypto.randomUUID(),conversation=crypto.randomUUID();
 const access='access-token-fixture',refresh='refresh-token-fixture';
 let rejectHistory=false;
 const fetch=async(url,opts={})=>{
  const u=new URL(String(url)),method=opts.method||'GET';
  calls.push({path:u.pathname,method});
  if(u.hostname==='hvkfreoagbrphwghjajw.supabase.co'){
   if(u.pathname==='/auth/v1/token'){
    const body=JSON.parse(opts.body||'{}');
    if(body.email==='test@example.com'&&body.password==='correct'||body.refresh_token===refresh)
     return new Response(JSON.stringify({access_token:access,refresh_token:refresh,expires_in:3600}),{status:200});
    return new Response(JSON.stringify({error:'invalid'}),{status:400});
   }
   if(u.pathname==='/auth/v1/user'){
    if(opts.headers?.authorization!=='Bearer '+access)return new Response('{}',{status:401});
    return new Response(JSON.stringify({id:user,email:'test@example.com'}),{status:200});
   }
   if(u.pathname==='/auth/v1/logout')return new Response('{}',{status:200});
   if(u.pathname==='/rest/v1/reality_chat_messages'){
    if(rejectHistory)return new Response(JSON.stringify({message:'storage failure'}),{status:503});
    if(opts.headers?.authorization!=='Bearer '+access)return new Response('{}',{status:401});
    if(method==='GET'){
     const id=u.searchParams.get('conversation_id')?.slice(3);
     const uid=u.searchParams.get('user_id')?.slice(3);
     const out=messages.filter(m=>m.conversation_id===id&&m.user_id===uid)
      .slice().reverse().slice(0,Number(u.searchParams.get('limit')||241));
     return new Response(JSON.stringify(out),{status:200});
    }
    if(method==='POST'){
     const msg=JSON.parse(opts.body);
     if(msg.user_id!==user)return new Response('{}',{status:403});
     const record={id:crypto.randomUUID(),created_at:new Date().toISOString(),...msg};
     messages.push(record);
     return new Response(JSON.stringify([record]),{status:201});
    }
   }
  }
  if(u.hostname==='api.openai.com'){
   const body=JSON.parse(opts.body||'{}');
   if(body.input[1].content[0].text.includes('conversation_continuity')){
    const context=JSON.parse(body.input[1].content[0].text).system_context.conversation_continuity;
    if(context.source_message_count>=2&&messages.length>=3)
     return new Response(JSON.stringify({id:'model-two',status:'completed',
      output_text:'I recall the first question from our saved conversation.'}),{status:200});
   }
   return new Response(JSON.stringify({id:'model-one',status:'completed',output_text:'First answer saved.'}),{status:200});
  }
  throw Error('UNEXPECTED_PROVIDER_URL '+url);
 };
 return {fetch,messages,calls,user,conversation,setFailure:v=>{rejectHistory=v}};
}
async function runFixture(fn){
 const saved=Object.fromEntries(envKeys.map(x=>[x,process.env[x]]));
 const before=globalThis.fetch,providerState=provider();
 Object.assign(process.env,{
  VERCEL_ENV:'preview',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
  REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
  REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_fixture',
  REALITY_CHAT_RECEIPT_HMAC_KEY:'a-long-test-only-cookie-encryption-key',
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'false',
  REALITY_CONTINUOUS_RELIABILITY_ENABLED:'false',
  REALITY_STANDALONE_OPENAI_API_KEY:'fixture-only',
 });
 delete process.env.REALITY_GITHUB_TOKEN;
 globalThis.fetch=providerState.fetch;
 const call=async(api,method,body,cookie)=>{
  const response=mockResponse();
  await api({method,headers:{host:'localhost',...(cookie?{cookie}:{}),
    ...(body?{'content-type':'application/json'}:{})},body,
    query:{conversation_id:providerState.conversation}},response);
  return response.state;
 };
 try{await fn({call,provider:providerState})}
 finally{
  globalThis.fetch=before;
  for(const [k,v] of Object.entries(saved)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
 }
}
test('sign in, recover signed-in session, persist two real chat turns, restore history and sign out',async()=>{
 await runFixture(async({call,provider:p})=>{
  let signed=await call(sessionApi,'POST',{email:'test@example.com',password:'correct'});
  assert.equal(signed.status,200,JSON.stringify(signed.payload));
  assert.equal(signed.payload.authenticated,true);
  assert.match(signed.headers['Set-Cookie'],/Secure; HttpOnly; SameSite=Lax/);
  assert.doesNotMatch(signed.headers['Set-Cookie'],/access-token-fixture|refresh-token-fixture/);
  const cookie=signed.headers['Set-Cookie'].split(';')[0];
  assert.equal((await call(sessionApi,'GET',null,cookie)).payload.authenticated,true);
  const first=await call(chatApi,'POST',{
   conversation_id:p.conversation,request_id:crypto.randomUUID(),message:'First question about the estimate.'},cookie);
  assert.equal(first.status,200,JSON.stringify(first.payload));
  assert.equal(first.payload.answer,'First answer saved.');
  assert.equal(first.payload.continuity.current_answer_persisted,true);
  const second=await call(chatApi,'POST',{
   conversation_id:p.conversation,request_id:crypto.randomUUID(),message:'What did we ask first?'},cookie);
  assert.equal(second.status,200,JSON.stringify(second.payload));
  assert.match(second.payload.answer,/recall the first question/i);
  assert.equal(p.messages.length,4);
  const restored=await call(chatApi,'GET',null,cookie);
  assert.equal(restored.status,200);
  assert.equal(restored.payload.messages.length,4);
  assert.equal(restored.payload.continuity.recovered_messages,4);
  assert.ok(restored.payload.messages.every(m=>m.source_ref.startsWith('supabase:reality_chat_messages:')));
  const signedOut=await call(sessionApi,'DELETE',null,cookie);
  assert.equal(signedOut.status,200);
  assert.match(signedOut.headers['Set-Cookie'],/Max-Age=0/);
  assert.equal((await call(chatApi,'GET')).status,401);
 });
});
test('no login and failed storage readback block model calls',async()=>{
 await runFixture(async({call,provider:p})=>{
  assert.equal((await call(chatApi,'POST',{conversation_id:p.conversation,request_id:crypto.randomUUID(),message:'Hello'})).status,401);
  const signed=await call(sessionApi,'POST',{email:'test@example.com',password:'correct'});
  const cookie=signed.headers['Set-Cookie'].split(';')[0];
  p.setFailure(true);
  const outcome=await call(chatApi,'POST',{conversation_id:p.conversation,request_id:crypto.randomUUID(),message:'Hello'},cookie);
  assert.equal(outcome.status,503);
  assert.equal(p.messages.length,0);
  assert.equal(p.calls.some(x=>x.path==='/v1/responses'),false);
 });
});
test('production feature remains hidden and disabled',async()=>{
 await runFixture(async({call})=>{
  process.env.VERCEL_ENV='production';
  assert.equal((await call(sessionApi,'GET')).status,404);
  assert.equal((await call(chatApi,'GET')).status,404);
 });
});
test('preview UI is wired to authenticated chat routes, not client-side access token storage',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="privateChat"/);
 assert.match(html,/api\/reality\/personal-session/);
 assert.match(html,/api\/reality\/personal-chat/);
 assert.match(html,/Start a new conversation/);
 assert.doesNotMatch(html,/localStorage\.setItem\(['"]supabase_access_token/);
});
