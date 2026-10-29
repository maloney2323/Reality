import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/reality/intelligence.js';

const stableUser='history-fixture-user';
const stored=Array.from({length:175},(_,i)=>({
 id:'api-test-'+i,user_id:stableUser,thought_id:'thought-abc',
 conversation_id:'conversation-abc',
 role:i%2?'assistant':'user',
 text:i===0?'For this job, do not send an estimate until the homeowner approves.':
    (i%2?'Model earlier observation.':'We talked about supplies at turn '+i),
 created_date:new Date(Date.UTC(2026,9,20,12,i)).toISOString(),
}));
function response(){
 const state={body:null,statusCode:null,headers:{}};
 return {state,
  setHeader(k,v){state.headers[k]=v;return this},
  status(n){state.statusCode=n;return this},
  json(b){state.body=b;return this},
  end(){return this},
 };
}
async function runApi({failAfterFirstPage=false}={}){
 const prior={
  fetch:globalThis.fetch,
  hmac:process.env.REALITY_CHAT_RECEIPT_HMAC_KEY,
  openai:process.env.OPENAI_API_KEY,
  universe:process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED,
  reliability:process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED,
  github:process.env.REALITY_GITHUB_TOKEN,
 };
 const calls=[],modelInputs=[];
 process.env.REALITY_CHAT_RECEIPT_HMAC_KEY='offline-unit-test-key-not-a-secret';
 process.env.OPENAI_API_KEY='fixture-not-real';
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='false';
 process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED='false';
 delete process.env.REALITY_GITHUB_TOKEN;
 globalThis.fetch=async(input,opts={})=>{
  const u=new URL(String(input));
  calls.push(u.toString());
  if(u.hostname==='base44.app'){
   if(u.pathname.endsWith('/User/me'))
    return new Response(JSON.stringify({id:stableUser}),{status:200});
   if(u.pathname.endsWith('/PersonalProfile'))
    return new Response(JSON.stringify({data:[]}),{status:200});
   if(u.pathname.endsWith('/PersonalMessage')){
    const query=JSON.parse(u.searchParams.get('q'));
    if(query.thought_id==='thought-abc'){
     const skip=Number(u.searchParams.get('skip')||0);
     if(failAfterFirstPage&&skip>=80)return new Response('offline failure',{status:503});
     const limit=Number(u.searchParams.get('limit')||80);
     return new Response(JSON.stringify({data:stored.slice().reverse().slice(skip,skip+limit)}),{status:200});
    }
    return new Response(JSON.stringify({data:[]}),{status:200});
   }
   throw Error('UNEXPECTED_BASE44_PATH '+u.pathname);
  }
  if(u.hostname==='api.openai.com'){
   modelInputs.push(JSON.parse(opts.body));
   return new Response(JSON.stringify({
    id:'offline:model:1',status:'completed',
    output_text:'The inventory can be discussed. The earlier estimate restriction remains context, not send authority.',
   }),{status:200});
  }
  if(u.hostname==='reality-blond.vercel.app')
   return new Response('Ready',{status:200});
  throw Error('UNEXPECTED_FETCH '+u);
 };
 const res=response();
 try{
  await handler({method:'POST',
   headers:{authorization:'Bearer fixture-token'},
   body:{message:'What should we do about the materials inventory?',
    thought_id:'thought-abc',conversation_id:'conversation-abc'},
  },res);
  return {result:res.state,calls,modelInputs};
 }finally{
  globalThis.fetch=prior.fetch;
  for(const [key,name] of [['hmac','REALITY_CHAT_RECEIPT_HMAC_KEY'],
    ['openai','OPENAI_API_KEY'],['universe','REALITY_UNIVERSE_PERSISTENCE_ENABLED'],
    ['reliability','REALITY_CONTINUOUS_RELIABILITY_ENABLED'],['github','REALITY_GITHUB_TOKEN']]){
   if(prior[key]===undefined)delete process.env[name];else process.env[name]=prior[key];
  }
 }
}
test('actual Vercel Reality API pages 175 stored messages and passes old condition to cognitive model',async()=>{
 const got=await runApi();
 assert.equal(got.result.statusCode,200,JSON.stringify(got.result.body));
 assert.equal(got.result.body.continuity.conversation_history_retrieved_count,175);
 assert.equal(got.result.body.continuity.conversation_history_coverage,'COMPLETE_WITHIN_QUERY_SCOPE');
 const pages=got.calls.filter(x=>x.includes('/PersonalMessage')&&x.includes('thought_id'))
  .map(x=>Number(new URL(x).searchParams.get('skip')||0));
 assert.deepEqual(pages,[0,80,160]);
 assert.ok(got.modelInputs.length>0);
 const system=JSON.parse(got.modelInputs[0].input[1].content[0].text).system_context;
 const continuity=system.conversation_continuity;
 assert.equal(continuity.source_message_count,175);
 assert.ok(continuity.older_user_conditions.some(x=>
   x.source_ref==='base44:PersonalMessage:api-test-0'));
 assert.equal(system.authenticated_conversation_turns,undefined);
 assert.equal(system.verified_conversation_context,undefined);
 assert.equal(continuity.current_user_message,'What should we do about the materials inventory?');
 assert.equal(got.result.body.result.execution.status,'NOT_EXECUTED');
});
test('real API reports authenticated provider lookup failure instead of inventing empty history',async()=>{
 const got=await runApi({failAfterFirstPage:true});
 assert.notEqual(got.result.statusCode,200);
 assert.equal(got.result.body.ok,false);
 assert.match(got.result.body.error,/BASE44_CONTEXT_HTTP_503/);
 assert.equal(got.modelInputs.length,0);
});
