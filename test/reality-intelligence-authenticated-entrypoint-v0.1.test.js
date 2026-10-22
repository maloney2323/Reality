// The Vercel intelligence entrypoint must never turn browser-provided
// project selectors into durable identity without verified authentication.
// MOCKED Base44, OpenAI and production-URL reads; no paid/live provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/reality/intelligence.js';
import { deriveContinuityRootId } from '../src/reality-continuous-continuity-v1.0.js';

const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function result(status, json) {
  return { ok: status>=200 && status<300, status, json: async()=>json };
}
function fakeResponse() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(k,v) { this.headers[k]=v; return this; },
    status(n) { this.statusCode=n; return this; },
    json(payload) { this.body=payload; return this; },
    end() { return this; },
  };
}
test('main intelligence route obeys authenticated project root and honest persistence labels',async()=>{
  const prevFetch=globalThis.fetch;
  const prevEnv=Object.fromEntries(['OPENAI_API_KEY','REALITY_CHAT_RECEIPT_HMAC_KEY','REALITY_UNIVERSE_PERSISTENCE_ENABLED','REALITY_GITHUB_TOKEN']
    .map(k=>[k,process.env[k]]));
  const calls=[];
  process.env.OPENAI_API_KEY='MOCK_KEY_NOT_A_REAL_CREDENTIAL';
  process.env.REALITY_CHAT_RECEIPT_HMAC_KEY='mock-test-hmac-key';
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='false';
  process.env.REALITY_GITHUB_TOKEN='';
  globalThis.fetch=async(url,options={})=>{
    const u=String(url);
    if(u.startsWith('https://base44.app/api/')) {
      const auth=options.headers?.Authorization;
      if(auth==='Bearer invalid')return result(403,{error:'permission denied'});
      const user=auth==='Bearer user-two'?'user:two':'user:one';
      if(u.endsWith('/entities/User/me'))return result(200,{id:user});
      if(u.includes('/entities/PersonalMessage'))return result(200,[]);
      if(u.includes('/entities/PersonalProfile'))return result(200,[]);
      throw Error('UNEXPECTED_BASE44_PATH:'+u);
    }
    if(u==='https://reality-blond.vercel.app')return result(200,{});
    if(u==='https://api.openai.com/v1/responses'){
      const body=JSON.parse(options.body);
      const packet=JSON.parse(body.input[1].content[0].text);
      calls.push(packet.system_context);
      return result(200,{id:'response:mock',status:'completed',
        output_text:'No external action has been performed.'});
    }
    throw Error('UNEXPECTED_FETCH:'+u);
  };
  const invoke=async({authorization,conversation_id,thought_id}={})=>{
    const req={method:'POST',headers:authorization?{authorization:'Bearer '+authorization}:{},
      body:{message:'Explain the project state without changing anything.',
        ...(conversation_id===undefined?{}:{conversation_id}),
        ...(thought_id===undefined?{}:{thought_id})}};
    const res=fakeResponse();
    await handler(req,res);
    return res;
  };
  try {
    const anonymous=await invoke();
    assert.equal(anonymous.statusCode,200,JSON.stringify(anonymous.body));
    assert.equal(anonymous.body.continuity.mode,'EPHEMERAL_NO_HISTORY');
    assert.equal(anonymous.body.continuity.durable_readback_verified,false);
    assert.equal(anonymous.body.continuity.root_id,null);
    assert.equal(anonymous.body.result.context.continuity.root_id,null);
    assert.equal(calls.at(-1)?.ephemeral_no_history,true);
    assert.equal(calls.at(-1)?.continuity_root_id,null);

    const beforeBad=calls.length;
    const forged=await invoke({conversation_id:'guessable-conversation',thought_id:'guessable-thought'});
    assert.equal(forged.statusCode,401);
    assert.equal(forged.body.error,'AUTHENTICATED_SESSION_REQUIRED_FOR_DURABLE_CONTINUITY');
    const partial=await invoke({thought_id:'thought'});
    assert.equal(partial.statusCode,400);
    assert.equal(partial.body.error,'REALITY_CHAT_TRACE_REQUIRED');
    const badBearer=await invoke({authorization:'invalid',thought_id:'t',conversation_id:'c'});
    assert.equal(badBearer.statusCode,400);
    assert.match(badBearer.body.error,/BASE44_CONTEXT_HTTP_403/);
    assert.equal(calls.length,beforeBad,'no model invocation on invalid identity');

    const first=await invoke({authorization:'user-one',conversation_id:'c1',thought_id:'t1'});
    assert.equal(first.statusCode,200,JSON.stringify(first.body));
    assert.equal(first.body.continuity.authenticated_user_context,true);
    assert.equal(first.body.continuity.mode,'AUTHENTICATED_PERSISTENCE_NOT_VERIFIED');
    assert.equal(first.body.continuity.durable_readback_verified,false);
    const root=first.body.continuity.root_id;
    assert.match(root,/^continuity:/);
    assert.equal(root,deriveContinuityRootId({
      conversationId:'principal:user:one:thought:t1:conversation:c1'}));
    assert.equal(first.body.result.context.continuity.root_id,root);
    assert.equal(calls.at(-1)?.continuity_root_id,root);
    assert.equal(calls.at(-1)?.ephemeral_no_history,undefined);

    const same=await invoke({authorization:'user-one',conversation_id:'c1',thought_id:'t1'});
    assert.equal(same.body.continuity.root_id,root);
    const other=await invoke({authorization:'user-two',conversation_id:'c1',thought_id:'t1'});
    assert.notEqual(other.body.continuity.root_id,root,'no cross-user root collision');
    const differentThought=await invoke({authorization:'user-one',conversation_id:'c1',thought_id:'t2'});
    assert.notEqual(differentThought.body.continuity.root_id,root,'Thoughts are isolated');
    const differentConversation=await invoke({authorization:'user-one',conversation_id:'c2',thought_id:'t1'});
    assert.notEqual(differentConversation.body.continuity.root_id,root,'conversations are isolated');

    const verifiedSingleTurn=await invoke({authorization:'user-one'});
    assert.equal(verifiedSingleTurn.body.continuity.mode,'EPHEMERAL_NO_HISTORY');
    assert.equal(verifiedSingleTurn.body.continuity.root_id,null);
    assert.equal(calls.at(-1)?.ephemeral_no_history,true);
  } finally {
    globalThis.fetch=prevFetch;
    for(const [k,v] of Object.entries(prevEnv)) {
      if(v===undefined)delete process.env[k]; else process.env[k]=v;
    }
  }
});
test('UI reports scoped continuity and passive typed discrepancies without inventing a hallucination score',()=>{
  for(const id of ['continuityMode','continuityDetail','epistemicSummary','epistemicEventsPanel','epistemicEvents']) {
    assert.ok(page.includes('id="'+id+'"'),'missing '+id);
  }
  assert.match(page,/b\\.continuity\\|\\|\\{\\}/);
  assert.match(page,/AUTHENTICATED_PERSISTENCE_NOT_VERIFIED/);
  assert.match(page,/These are structured evidence differences, not verified model-output hallucination catches/);
  assert.match(page,/Status: OBSERVATION_ONLY/);
  assert.match(page,/Truth not adjudicated/);
  assert.match(page,/No trusted structured-source discrepancies were returned in the retrieved window/);
  assert.ok(page.includes('esc(compactValue(e.previous_value))'));
  assert.ok(page.includes('esc(compactValue(e.incoming_value))'));
  assert.doesNotMatch(page,/100% hallucination-free/);
});
