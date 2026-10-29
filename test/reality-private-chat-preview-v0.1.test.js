import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import sessionApi from '../api/reality/personal-session.js';
import chatApi from '../api/reality/personal-chat.js';
const envKeys=['VERCEL_ENV','REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF',
 'REALITY_PERSONAL_CHAT_SUPABASE_URL','REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY',
 'REALITY_CHAT_RECEIPT_HMAC_KEY','REALITY_UNIVERSE_PERSISTENCE_ENABLED',
 'REALITY_CONTINUOUS_RELIABILITY_ENABLED','REALITY_SEMANTIC_REVIEW_ENABLED',
 'REALITY_DETECTOR_REPAIR_ENABLED','REALITY_RELIABILITY_EXTRACTION_ENABLED',
 'REALITY_DETECTOR_SHADOW_ENABLED','SUPABASE_URL','SUPABASE_SECRET_KEY',
 'REALITY_RELIABILITY_BENCHMARK_PROJECT_REF','REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF',
 'REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL','REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED','OPENAI_API_KEY',
 'REALITY_STANDALONE_OPENAI_API_KEY','REALITY_GITHUB_TOKEN'];
function mockResponse(){
 const state={headers:{},status:null,payload:null};
 const r={state,setHeader(k,v){state.headers[k]=v;return r},
 status(n){state.status=n;return r},json(body){state.payload=body;return r},
 end(){return r}};
 return r;
}
function provider(){
 const messages=[],ledger=[],calls=[],user=crypto.randomUUID(),conversation=crypto.randomUUID();
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
   if(u.pathname==='/rest/v1/rpc/reality_publish_assistant_if_goal_current'){
    const params=JSON.parse(opts.body||'{}');
    // Matches the signed-in user's saved request and atomically stores exactly
    // the answer bound to the final direction Integrity receipt.
    const matching=messages.find(m=>m.user_id===params.p_user_id&&
     m.conversation_id===params.p_conversation_id&&
     m.request_id===params.p_request_id&&m.role==='user');
    if(!matching||params.p_user_id!==user||
       !Number.isSafeInteger(params.p_expected_goal_revision))
     return new Response(JSON.stringify({message:'CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN'}),{status:409});
    const id=crypto.randomUUID();
    messages.push({id,user_id:user,conversation_id:params.p_conversation_id,
     request_id:params.p_request_id,role:'assistant',content:params.p_content,
     created_at:new Date().toISOString()});
    return new Response(JSON.stringify(id),{status:200});
   }
   if(u.pathname==='/rest/v1/universe_events'){
    if(method==='POST'){
     const evt=JSON.parse(opts.body);ledger.push(evt);
     return new Response(JSON.stringify([evt]),{status:201});
    }
    const id=u.searchParams.get('event_id')?.replace(/^eq\./,'');
    const root=u.searchParams.get('continuity_root_id')?.replace(/^eq\./,'');
    const worldline=u.searchParams.get('worldline_id')?.replace(/^eq\./,'');
    let subset=ledger.filter(e=>(!id||e.event_id===id)&&
      (!root||e.continuity_root_id===root)&&(!worldline||e.worldline_id===worldline));
    if(u.searchParams.get('limit')==='1')subset=subset.slice(-1);
    return new Response(JSON.stringify(subset),{status:200});
   }
   if(u.pathname==='/rest/v1/reality_universe_entries')
    return new Response('[]',{status:200});
   if(u.pathname==='/rest/v1/reality_chat_messages'){
    if(rejectHistory)return new Response(JSON.stringify({message:'storage failure'}),{status:503});
    if(opts.headers?.authorization!=='Bearer '+access)return new Response('{}',{status:401});
    if(method==='GET'){
     const id=u.searchParams.get('conversation_id')?.slice(3);
     const uid=u.searchParams.get('user_id')?.slice(3);
     const out=messages.filter(m=>(!id||m.conversation_id===id)&&m.user_id===uid)
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
   if(body.text?.format?.name==='reality_semantic_review'){
    const payload=JSON.parse(body.input[1].content[0].text);
    const items=payload.conversation_evidence?.candidates||[];
    return new Response(JSON.stringify({id:'review-model',status:'completed',
      output_text:JSON.stringify({
       addresses_current_request:true,issues:[],claims:[],actions:[],
       provenance_checks:items.map(item=>({
        source_ref:item.source_ref,clause_id:item.clause_id,
        relation:'NOT_MENTIONED',answer_quote:'',verified_source_ref:'',
        reason:'Not stated in the model answer.',
       })),
      }),
    }),{status:200});
   }
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
 return {fetch,messages,ledger,calls,user,conversation,setFailure:v=>{rejectHistory=v}};
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
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
  REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
  REALITY_SEMANTIC_REVIEW_ENABLED:'true',
  REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED:'true',
  REALITY_DETECTOR_REPAIR_ENABLED:'false',
  REALITY_RELIABILITY_EXTRACTION_ENABLED:'false',
  REALITY_DETECTOR_SHADOW_ENABLED:'false',
  SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
  SUPABASE_SECRET_KEY:'test-only-preview-service-key',
  REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
  REALITY_STANDALONE_OPENAI_API_KEY:'fixture-only',
 });
 delete process.env.REALITY_GITHUB_TOKEN;
 globalThis.fetch=providerState.fetch;
 const call=async(api,method,body,cookie,queryOverride=null)=>{
  const response=mockResponse();
  await api({method,headers:{host:'localhost',...(cookie?{cookie}:{}),
    ...(body?{'content-type':'application/json'}:{})},body,
    query:queryOverride||{conversation_id:providerState.conversation}},response);
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
  assert.equal(first.payload.reliability.canonical_epistemic_state.status,'PERSISTED_AND_READBACK_VERIFIED');
  assert.equal(first.payload.reliability.independently_verified_semantic_correctness,false);
  assert.ok(p.ledger.some(x=>x.payload?.event_type==='CANONICAL_EPISTEMIC_FRAME'));
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
  const listing=await call(chatApi,'GET',null,cookie,{list:'1'});
  assert.equal(listing.status,200);
  assert.equal(listing.payload.conversations.length,1);
  assert.equal(listing.payload.conversations[0].conversation_id,p.conversation);
  assert.match(listing.payload.conversations[0].last_message,/recall the first question/i);
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
test('isolated database or missing reliability never silently downgrades the personal chat to unmonitored mode',async()=>{
 await runFixture(async({call,provider:p})=>{
  const login=await call(sessionApi,'POST',{email:'test@example.com',password:'correct'});
  const cookie=login.headers['Set-Cookie'].split(';')[0];
  process.env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF='wrongprojectwrongpr';
  const response=await call(chatApi,'POST',{
   conversation_id:p.conversation,request_id:crypto.randomUUID(),message:'Do not lose this context.'},cookie);
  assert.equal(response.status,503);
  assert.match(response.payload.error,/RELIABILITY_BENCHMARK_PROJECT_NOT_ALLOWLISTED/);
  process.env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF='hvkfreoagbrphwghjajw';
  process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED='false';
  const downgraded=await call(chatApi,'POST',{
   conversation_id:p.conversation,request_id:crypto.randomUUID(),message:'Do not lose this context.'},cookie);
  assert.equal(downgraded.status,503);
  assert.equal(downgraded.payload.error,'CHAT_UNIFIED_RELIABILITY_REQUIRED');
  assert.equal(p.messages.length,0);
 });
});
test('preview UI is wired to authenticated chat routes, not client-side access token storage',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="privateChat"/);
 assert.match(html,/api\/reality\/personal-session/);
 assert.match(html,/api\/reality\/personal-chat/);
 assert.match(html,/Start a new conversation/);
 assert.match(html,/id="privateConversations"/);
 assert.match(html,/api\/reality\/personal-chat\?list=1/);
 assert.doesNotMatch(html,/localStorage\.setItem\(['"]supabase_access_token/);
});
