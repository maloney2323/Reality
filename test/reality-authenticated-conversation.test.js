import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  requireConversationSelector, derivePrincipalScopedContinuityRoot
} from '../src/reality-authenticated-conversation-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';

test('thread selector is non-authoritative, mandatory, and bounded',()=>{
  assert.equal(requireConversationSelector({conversation_id:'thread-001'}),'thread-001');
  for(const body of [null,{}, {conversation_id:''},
    {conversation_id:'../other-user'}, {conversation_id:'a'.repeat(130)},
    {conversation_id:{continuity_root_id:'injected'}},
    {conversation_id:'thread 1'}]){
    assert.throws(()=>requireConversationSelector(body),
      error=>error.status===400&&error.message==='CONVERSATION_ID_REQUIRED_OR_INVALID');
  }
});
test('continuity roots are stable within account and distinct by account/thread',()=>{
  const a=derivePrincipalScopedContinuityRoot({principalId:'base44:user-A',conversationId:'thread-1'});
  assert.equal(a,derivePrincipalScopedContinuityRoot({principalId:'base44:user-A',conversationId:'thread-1'}));
  assert.notEqual(a,derivePrincipalScopedContinuityRoot({principalId:'base44:user-B',conversationId:'thread-1'}));
  assert.notEqual(a,derivePrincipalScopedContinuityRoot({principalId:'base44:user-A',conversationId:'thread-2'}));
  assert.match(a,/^continuity:principal:[0-9a-f]{64}$/);
  assert.throws(()=>derivePrincipalScopedContinuityRoot({principalId:'pretend-admin',conversationId:'thread-1'}),
    /VERIFIED_BASE44_PRINCIPAL_REQUIRED_FOR_CONTINUITY/);
});
test('HTTP chat accepts a selector, not a client-provided memory root',()=>{
  const api=readFileSync('api/chat.js','utf8');
  assert.match(api,/await verifyBase44Principal\(req\)/);
  assert.match(api,/requireNoClientSystemContext\(req\.body\)/);
  assert.match(api,/requireConversationSelector\(req\.body\)/);
  assert.match(api,/conversationId,/);
  assert.doesNotMatch(api,/conversationId: req\.body\.systemContext/);
  const ui=readFileSync('index.html','utf8');
  assert.match(ui,/conversation_id:REALITY_CONVERSATION_ID/);
});

test('100 simulated server turns retrieve the same scoped continuity and never cross users',async()=>{
  const save={
    enabled:process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED,
    key:process.env.REALITY_UNIVERSE_PERSISTENCE_KEY,
    url:process.env.REALITY_UNIVERSE_PERSISTENCE_URL,
  };
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='unit-test-only-key';
  process.env.REALITY_UNIVERSE_PERSISTENCE_URL='https://synthetic-durable-store.example';
  const ledger=[];
  let modelCalls=0;
  const mockFetch=async(url,options={})=>{
    if(url==='https://api.openai.com/v1/responses'){
      modelCalls++;
      return {ok:true,status:200,json:async()=>({
        id:'synthetic-response-'+modelCalls,status:'completed',
        output_text:'No external outcome is established by this model response.'
      })};
    }
    if(!url.startsWith('https://synthetic-durable-store.example/rest/v1/reality_universe_entries')){
      throw Error('UNEXPECTED_NETWORK_ADDRESS:'+url);
    }
    if(options.method==='POST'){
      const row=JSON.parse(options.body);
      if(ledger.some(x=>x.entry_id===row.entry_id))throw Error('DUPLICATE_INSERT');
      ledger.push(row);
      return {ok:true,status:201,json:async()=>[row]};
    }
    const parsed=new URL(url);
    const idCondition=parsed.searchParams.get('entry_id');
    if(idCondition){
      const key=idCondition.replace(/^eq\./,'');
      return {ok:true,status:200,json:async()=>ledger.filter(x=>x.entry_id===key)};
    }
    const rootCondition=parsed.searchParams.get('continuity_root_id');
    const root=rootCondition?.replace(/^eq\./,'');
    const limit=Number(parsed.searchParams.get('limit')||100);
    const selected=(root?ledger.filter(x=>x.continuity_root_id===root):ledger)
      .slice().sort((a,b)=>b.assertion_time.localeCompare(a.assertion_time)).slice(0,limit);
    return {ok:true,status:200,json:async()=>selected};
  };
  try{
    let firstRoot=null;
    for(let i=0;i<100;i++){
      const result=await runLiveIntelligenceOrchestration({
        message:i===0
          ? 'Send an email to the customer confirming the appointment.'
          : 'Checkpoint '+i+' in the same conversation.',
        observedAt:new Date(Date.UTC(2026,9,21,12,0,i)).toISOString(),
        requestedBy:'base44:account-A',conversationId:'audit-thread-100',
        apiKey:'synthetic-key',fetchImpl:mockFetch,
      });
      const r=result.context.continuity.root_id;
      if(i===0)firstRoot=r;
      assert.equal(r,firstRoot,'100 turns must retain the same principal-bound root');
      assert.equal(result.execution.status,'NOT_EXECUTED');
      assert.equal(result.context.continuity.rehydrated,i>0);
      assert.equal(result.context.universe.count,i);
      assert.equal(result.context.continuity.current_state,'WAITING');
      assert.equal(result.context.continuity.pending_obligation_count,1,
        'unfinished customer work must remain open for all 100 turns');
      assert.equal(result.context.continuity.unresolved_action_claims_not_verified,true);
      assert.equal(result.intelligence.publication_gate.status,'RELEASED');
    }
    assert.equal(ledger.length,100);
    assert.equal(ledger[99].payload.pending_obligations.length,1);
    assert.equal(ledger[99].payload.pending_obligations[0].status,'UNRESOLVED');
    assert.equal(ledger[99].payload.pending_obligations[0].outcome_verified,false);
    // The next consequential request must be tracked separately without
    // replacing the first unresolved promise to the customer.
    const second=await runLiveIntelligenceOrchestration({
      message:'Send a separate appointment confirmation to another customer.',
      observedAt:'2026-10-21T12:02:59.000Z',
      requestedBy:'base44:account-A',conversationId:'audit-thread-100',
      apiKey:'synthetic-key',fetchImpl:mockFetch,
    });
    assert.equal(second.context.continuity.pending_obligation_count,2);
    assert.equal(second.context.continuity.current_state,'WAITING');
    assert.equal(new Set(second.context.continuity.pending_obligation_refs).size,2);
    const other=await runLiveIntelligenceOrchestration({
      message:'A separate user must not receive the other account history.',
      observedAt:'2026-10-21T12:03:00.000Z',
      requestedBy:'base44:account-B',conversationId:'audit-thread-100',
      apiKey:'synthetic-key',fetchImpl:mockFetch,
    });
    assert.notEqual(other.context.continuity.root_id,firstRoot);
    assert.equal(other.context.universe.count,0);
    assert.equal(other.context.continuity.rehydrated,false);
    assert.equal(other.context.continuity.pending_obligation_count,0);
    assert.equal(modelCalls,102);
  }finally{
    for(const [k,v] of Object.entries({
      REALITY_UNIVERSE_PERSISTENCE_ENABLED:save.enabled,
      REALITY_UNIVERSE_PERSISTENCE_KEY:save.key,
      REALITY_UNIVERSE_PERSISTENCE_URL:save.url,
    })){
      if(v===undefined)delete process.env[k];else process.env[k]=v;
    }
  }
});
