import test from 'node:test';
import assert from 'node:assert/strict';
import {processStandaloneChat,getStandaloneConversationHistory} from '../src/reality-standalone-chat-v0.1.js';

// Full existing chat transport -> authenticated principal -> scoped Universe ->
// real Signal Cleaner / Continuity / Model Gateway / Integrity Spine / replay ->
// verified append/readback of user + model text. ALL external providers are
// deterministic in-memory stubs. This does not measure actual LLM reliability.
const principal='e83340ec-4266-4c95-a6cd-929bc58b445e';
const env={
  SUPABASE_URL:'https://reality-example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example_public_key',
  REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
  REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',
  REALITY_STANDALONE_CHAT_ENABLED:'true',
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
  VERCEL_ENV:'preview',
};
const script=[
 ['Do not send the estimate until the customer approves it.',
  "I'll prepare the estimate draft and wait for approval."],
 ['How is the draft progressing?',
  "We'll send the estimate when it is ready."],
 ['Please confirm the original condition.',
  "We'll send the estimate after the customer approves it."],
 ['The homeowner has not approved the estimate. What remains open?',
  'Customer approval is still required; no external send has occurred.'],
 ['The design notes mention blue cabinets, but that is only a possibility.',
  'Blue cabinets remain an unverified possibility, not a confirmed selection.'],
 ['What is the status of the cabinets?',
  'The final cabinet color has not been approved.'],
 ['I want to keep the original estimate approval condition.',
  'The estimate must wait for customer approval.'],
 ['Let us discuss the next workday without placing orders.',
  'I can prepare a draft workday plan without placing orders.'],
 ['Are we allowed to send the estimate now?',
  'No, customer approval has not been recorded.'],
 ['The customer approved reviewing, not sending, the estimate.',
  'Review approval is different from permission to send.'],
 ['Show what drifted earlier and what remained unresolved.',
  'An earlier response suggested sending when ready. Customer approval remains the required condition.'],
 ['Summarize the original rule and whether any action was executed.',
  'Do not send the estimate until customer approval. No external action was executed.'],
];
test('12-turn standalone construction lifecycle rehydrates persistent user intent, preserves receipts, and discovers prior drift',async()=>{
 const priorKey=process.env.REALITY_STANDALONE_OPENAI_API_KEY;
 const priorPersistence=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
 const priorStorage=process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
 const priorPersistenceUrl=process.env.REALITY_UNIVERSE_PERSISTENCE_URL;
 process.env.REALITY_STANDALONE_OPENAI_API_KEY='SYNTHETIC_OFFLINE_KEY_DO_NOT_USE';
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='SYNTHETIC_OFFLINE_KEY_DO_NOT_USE';
 process.env.REALITY_UNIVERSE_PERSISTENCE_URL=env.SUPABASE_URL;
 const entries=new Map(),snapshots=[],calls=[],messages=[];
 const fakeFetch=async(url,opts={})=>{
  const u=new URL(url);
  if(u.origin===env.SUPABASE_URL&&u.pathname==='/auth/v1/user'){
   assert.match(opts.headers.Authorization,/^Bearer /);
   return {ok:true,status:200,json:async()=>({id:principal,is_anonymous:false})};
  }
  if(u.hostname==='api.openai.com'){
   const input=JSON.parse(JSON.parse(opts.body).input[1].content[0].text);
   const n=calls.length;
   if(n>=script.length)throw Error('UNEXPECTED_MODEL_CALL');
   const canonical=script[n][1];
   calls.push({turn:n+1,modelInput:input,answer:canonical});
   return {ok:true,status:200,json:async()=>({
    id:'synthetic-model-response-'+(n+1),
    status:'completed',output_text:canonical,
   })};
  }
  if(u.origin!==env.SUPABASE_URL||
      u.pathname!=='/rest/v1/reality_universe_entries')
   throw Error('UNEXPECTED_EXTERNAL_NETWORK_DESTINATION:'+u.origin+u.pathname);
  if(opts.method==='POST'){
   const record=JSON.parse(opts.body);
   if(entries.has(record.entry_id))
    return {ok:false,status:409,json:async()=>({message:'duplicate'})};
   entries.set(record.entry_id,record);
   return {ok:true,status:201,json:async()=>[record]};
  }
  let list=[...entries.values()];
  for(const key of ['entry_id','continuity_root_id','worldline_id','event_kind']){
   const filter=u.searchParams.get(key);
   if(filter?.startsWith('eq.'))list=list.filter(x=>x[key]===filter.slice(3));
  }
  const assertionFilter=u.searchParams.get('assertion_time');
  if(assertionFilter?.startsWith('lte.'))
   list=list.filter(x=>Date.parse(x.assertion_time)<=Date.parse(assertionFilter.slice(4)));
  const sorted=u.searchParams.get('order')||'';
  list.sort((a,b)=>sorted.startsWith('assertion_time.asc')?
    a.assertion_time.localeCompare(b.assertion_time)||a.entry_id.localeCompare(b.entry_id):
    b.assertion_time.localeCompare(a.assertion_time)||a.entry_id.localeCompare(b.entry_id));
  const offset=Number(u.searchParams.get('offset')||0);
  const limit=Number(u.searchParams.get('limit')||1000);
  return {ok:true,status:200,json:async()=>list.slice(offset,offset+limit)};
 };
 try{
  for(let index=0;index<script.length;index++){
   const [prompt,expected]=script[index];
   const req={
    headers:{authorization:'Bearer synthetic-test-jwt-do-not-use-anywhere'},
    body:{message:prompt,conversation_id:'construction-12-turn-test',
     thought_id:'personal',turn_id:'test-turn-'+(index+1)},
   };
   const result=await processStandaloneChat(req,{
    env,fetchImpl:fakeFetch,
    now:()=>new Date(Date.UTC(2026,9,22,20,index,0)).toISOString(),
   });
   assert.equal(result.ok,true);
   assert.equal(result.response.includes(expected),true);
   assert.equal(result.receipt.cognitive_readback_verified,true);
   assert.equal(result.external_action_executed,false);
   assert.equal(result.receipt.history_window_count,index*2);
   const c=result.result.context;
   assert.equal(c.continuity.cognitive_readback_verified,true);
   assert.equal(c.continuity.root_id,result.continuity_root_id);
   assert.equal(c.integrity_spine.checkpoint_count,4);
   if(index===1){
    assert.equal(c.conversation_drift.findings.some(
      x=>x.classification==='CONVERSATIONAL_PRECONDITION_DRIFT'),true,
      'Turn 2 should catch the missing original precondition');
   }
   if(index===2){
    assert.equal(c.conversation_trajectory.findings.some(
      x=>x.apparent_origin_turn===2 &&
      x.classification==='CONVERSATIONAL_RETROSPECTIVE_DRIFT'),true,
      'Turn 3 should retrospectively attribute a prior deviation to Turn 2');
    assert.equal(c.conversation_trajectory.recovery.assessments.some(
      x=>x.assessment==='MODEL_RESTATED_USER_CONDITION_UNVERIFIED'),true,
      'Recovery is a restatement and not independently verified');
    assert.equal(calls[index].modelInput.system_context.conversation_trajectory_reconciliation
      .prior_drift_candidates.length>0,true,
      'Turn 3 cognition must see the original user condition before generation');
   }
   const currentHistory=await getStandaloneConversationHistory({
    headers:req.headers,query:{conversation_id:'construction-12-turn-test',thought_id:'personal'},
   },{env,fetchImpl:fakeFetch});
   assert.equal(currentHistory.messages.length,(index+1)*2);
   assert.equal(currentHistory.messages.at(-2).text,prompt);
   assert.equal(currentHistory.messages.at(-1).text,result.response);
   messages.push(currentHistory.messages.length);
   snapshots.push({turn:index+1,trajectory:c.conversation_trajectory.status,
    early:c.conversation_drift.status,ledger:c.continuity.event_id});
  }
  assert.equal(calls.length,12);
  assert.deepEqual(messages,[2,4,6,8,10,12,14,16,18,20,22,24]);
  const final=[...entries.values()];
  assert.equal(final.filter(x=>x.event_kind==='AUTHENTICATED_CONVERSATION_MESSAGE').length,24);
  assert.equal(final.filter(x=>x.event_kind==='CONTINUITY_STATE_TRANSITION').length,12);
  const roots=new Set(final.filter(x=>x.event_kind==='AUTHENTICATED_CONVERSATION_MESSAGE').map(x=>x.continuity_root_id));
  assert.equal(roots.size,1);
  assert.equal(snapshots.every(x=>x.ledger),true);
 }finally{
  if(priorKey===undefined)delete process.env.REALITY_STANDALONE_OPENAI_API_KEY;else process.env.REALITY_STANDALONE_OPENAI_API_KEY=priorKey;
  if(priorPersistence===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=priorPersistence;
  if(priorStorage===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=priorStorage;
  if(priorPersistenceUrl===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_URL;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_URL=priorPersistenceUrl;
 }
});
