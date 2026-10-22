import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { verifySignalCleanerRecord, recordVerifiedLayerHandoff } from '../src/reality-verified-layer-handoff-v0.1.js';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';

// All I/O in this file is a fake in-memory fetch, not an external database.
if(!process.env.REALITY_UNIVERSE_PERSISTENCE_KEY)
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='test-only-mocked-supabase-key';

const observed='2026-10-22T10:00:00.000Z';
const signal=buildGovernedChatSignal({
  message:'Customer  says $100. But  invoice says $90.\nInvoice number X-17 remains disputed.',
  observedAt:observed,
});
function memoryAdapter({modifyReadback=null,failModel=false}={}) {
  const rows=new Map(),modelCalls=[],requests=[];
  async function fakeFetch(url,options={}) {
    const uri=new URL(url),method=options.method||'GET';
    requests.push({path:uri.pathname,method});
    if(uri.hostname==='api.openai.com') {
      modelCalls.push(JSON.parse(options.body));
      if(failModel) return {ok:false,status:500,json:async()=>({error:{message:'OPENAI_TEST_FAILURE'}})};
      return {ok:true,status:200,json:async()=>({
        id:'model:stub:'+modelCalls.length,status:'completed',
        output_text:'The customer reported $100 and the invoice reported $90. The contradiction is unresolved.'
      })};
    }
    if(!uri.pathname.endsWith('/rest/v1/reality_universe_entries'))
      throw Error('UNEXPECTED_TEST_NETWORK:'+url);
    if(method==='POST') {
      const body=JSON.parse(options.body);
      if(rows.has(body.entry_id)) throw Error('DUPLICATE_TEST_WRITE');
      rows.set(body.entry_id,body);
      return {ok:true,status:201,json:async()=>[body]};
    }
    if(method!=='GET') throw Error('UNEXPECTED_TEST_METHOD:'+method);
    let found=Array.from(rows.values());
    const id=uri.searchParams.get('entry_id');
    const root=uri.searchParams.get('continuity_root_id');
    const kind=uri.searchParams.get('event_kind');
    if(id?.startsWith('eq.'))found=found.filter(row=>row.entry_id===id.slice(3));
    if(root?.startsWith('eq.'))found=found.filter(row=>row.continuity_root_id===root.slice(3));
    if(kind?.startsWith('eq.'))found=found.filter(row=>row.event_kind===kind.slice(3));
    found.sort((a,b)=>String(b.assertion_time).localeCompare(String(a.assertion_time)));
    found=found.slice(0,Number(uri.searchParams.get('limit'))||1000);
    if(modifyReadback && id?.startsWith('eq.'))found=found.map(row=>modifyReadback(row));
    return {ok:true,status:200,json:async()=>found};
  }
  return {fakeFetch,rows,modelCalls,requests};
}

test('signal cleaner reconstructs exact raw bytes and all fragment transformation receipts',()=>{
  const verification=verifySignalCleanerRecord(signal);
  assert.equal(verification.status,'VERIFIED');
  assert.equal(verification.semantic_truth_evaluated,false);
  assert.equal(verification.contradictions_evaluated,false);
  assert.equal(verification.fragment_count,signal.fragments.length);
  assert.equal(verification.transformation_receipt_id,signal.transformation_receipt.receipt_id);
  assert.throws(()=>verifySignalCleanerRecord({
    ...signal,packet:{...signal.packet,raw_content:'tampered $500'},
  }),/SIGNAL_RAW_PACKET_INTEGRITY_FAILED/);
  assert.throws(()=>verifySignalCleanerRecord({
    ...signal,fragments:signal.fragments.map((f,i)=>i?f:{...f,cleaned_text:'rewritten source'}),
  }),/SIGNAL_FRAGMENT_LINEAGE_INTEGRITY_FAILED/);
  assert.throws(()=>verifySignalCleanerRecord({
    ...signal,transformation_receipt:{...signal.transformation_receipt,output_digest:'sha256:forged'},
  }),/SIGNAL_TRANSFORMATION_RECEIPT_INTEGRITY_FAILED/);
});

test('signal ingress writes complete evidence and verifies independent storage readback before handoff',async()=>{
 const io=memoryAdapter();
 const outcome=await recordVerifiedLayerHandoff({
  stage:'SIGNAL_CLEANER',continuityRootId:'root:one',observedAt:observed,
  sourceRef:'reality:signal-cleaner',
  output:{signal,verification:verifySignalCleanerRecord(signal)},
  evidenceReferences:[signal.transformation_receipt.receipt_id],fetchImpl:io.fakeFetch,
 });
 assert.equal(outcome.status,'STORED_AND_READ_BACK');
 const stored=io.rows.get(outcome.entry_id);
 assert.equal(stored.payload.data.signal.packet.raw_content,signal.packet.raw_content);
 assert.deepEqual(stored.payload.data.signal.fragments,signal.fragments);
 assert.equal(stored.payload.data.signal.transformation_receipt.receipt_id,signal.transformation_receipt.receipt_id);
 assert.equal(stored.payload.diagnostic_state.contradictions,'NOT_SEMANTICALLY_EVALUATED_BY_THIS_TRANSPORT');
 assert.equal(outcome.entry.ledger_entry_hash,outcome.ledger_entry_hash);
 const parentBad={...outcome.entry,continuity_root_id:'root:other'};
 await assert.rejects(()=>recordVerifiedLayerHandoff({
  stage:'COGNITION_ERROR',continuityRootId:'root:one',observedAt:observed,sourceRef:'reality:cognition',
  output:{error_code:'stub'},parent:parentBad,fetchImpl:io.fakeFetch,
 }),/HANDOFF_PARENT_ROOT_MISMATCH/);
});

test('an identical verified handoff is idempotent and does not lose the original packet',async()=>{
 const io=memoryAdapter();
 const args={stage:'SIGNAL_CLEANER',continuityRootId:'root:duplicate',observedAt:observed,
   sourceRef:'reality:signal-cleaner',
   output:{signal,verification:verifySignalCleanerRecord(signal)},
   fetchImpl:io.fakeFetch};
 const first=await recordVerifiedLayerHandoff(args);
 const second=await recordVerifiedLayerHandoff(args);
 assert.equal(first.entry_id,second.entry_id);
 assert.equal(first.ledger_entry_hash,second.ledger_entry_hash);
 assert.equal(io.rows.size,1);
});

test('tampered durable readback does not become a verified next-layer receipt',async()=>{
 const io=memoryAdapter({modifyReadback:row=>({...row,payload:{replaced:'false evidence'}})});
 await assert.rejects(()=>recordVerifiedLayerHandoff({
  stage:'SIGNAL_CLEANER',continuityRootId:'root:one',observedAt:observed,
  sourceRef:'reality:signal-cleaner',output:{signal,verification:verifySignalCleanerRecord(signal)},
  fetchImpl:io.fakeFetch,
 }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});

test('two real orchestration turns transport cleaner history and complete cognition through the durable ledger',async()=>{
 const io=memoryAdapter(),priorEnable=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED,
       priorKey=process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='test-local-only';
 try {
  const context={continuity_root_id:'root:verified-two-turns',conversation_id:'conversation:one'};
  const first=await runLiveIntelligenceOrchestration({
    message:signal.packet.raw_content,systemContext:context,
    observedAt:observed,apiKey:'mock-api-key',fetchImpl:io.fakeFetch,
  });
  assert.equal(first.context.continuity.signal_handoff_status,'STORED_AND_READ_BACK');
  assert.equal(first.context.continuity.cognitive_readback_verified,true);
  assert.equal(io.rows.size,2);
  const signalEvent=Array.from(io.rows.values()).find(x=>x.payload?.layer_stage==='SIGNAL_CLEANER');
  const cognitionEvent=Array.from(io.rows.values()).find(x=>x.event_kind==='CONTINUITY_STATE_TRANSITION');
  assert.equal(signalEvent.payload.data.signal.packet.raw_content,signal.packet.raw_content);
  assert.equal(cognitionEvent.payload.signal_handoff_ledger_hash,signalEvent.ledger_entry_hash);
  assert.match(cognitionEvent.payload.cognitive_output.answer,/contradiction is unresolved/);
  const second=await runLiveIntelligenceOrchestration({
    message:'The amount remains disputed.',systemContext:context,
    observedAt:'2026-10-22T10:01:00.000Z',apiKey:'mock-api-key',fetchImpl:io.fakeFetch,
  });
  assert.equal(second.context.continuity.rehydrated,true);
  assert.equal(io.rows.size,4);
  const latestBody=io.modelCalls.at(-1);
  const parsed=JSON.parse(latestBody.input[1].content[0].text);
  const prior=parsed.system_context.universe_context_entries;
  assert.ok(prior.some(x=>x.entry_id===signalEvent.entry_id));
  assert.ok(prior.some(x=>x.entry_id===cognitionEvent.entry_id));
  assert.ok(prior.some(x=>x.payload?.data?.signal?.packet?.raw_content===signal.packet.raw_content));
 } finally {
  if(priorEnable===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=priorEnable;
  if(priorKey===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=priorKey;
 }
});

test('a failed model call retains the signal evidence and a linked error event',async()=>{
 const io=memoryAdapter({failModel:true});
 const prevOn=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED,prevKey=process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='test-local-only';
 try{
  await assert.rejects(()=>runLiveIntelligenceOrchestration({
    message:'Record this observation without losing errors.',observedAt:observed,
    systemContext:{continuity_root_id:'root:model-failure'},
    apiKey:'mock-api-key',fetchImpl:io.fakeFetch,
  }),/OPENAI_TEST_FAILURE/);
  assert.equal(io.rows.size,2);
  const signalRecord=Array.from(io.rows.values()).find(x=>x.payload?.layer_stage==='SIGNAL_CLEANER');
  const errorRecord=Array.from(io.rows.values()).find(x=>x.payload?.layer_stage==='COGNITION_ERROR');
  assert.ok(signalRecord);
  assert.equal(errorRecord.payload.parent_ledger_hash,signalRecord.ledger_entry_hash);
  assert.match(errorRecord.payload.data.error_code,/OPENAI_TEST_FAILURE/);
 } finally{
  if(prevOn===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=prevOn;
  if(prevKey===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=prevKey;
 }
});

test('consequential observation does not skip the evidence-established layer',async()=>{
 const io=memoryAdapter();
 const result=await runLiveIntelligenceOrchestration({
   message:'Send the customer an email about the invoice discrepancy.',
   apiKey:'mock-api-key',fetchImpl:io.fakeFetch,
 });
 assert.equal(result.mode,'ACTION_CANDIDATE');
 assert.equal(result.situation.state,'ACTION_PROPOSED');
 assert.ok(result.situation.transitions.some(t=>t.to==='EVIDENCE_ESTABLISHED'));
 assert.equal(result.situation.evidence[0].kind,'OBSERVED_USER_REQUEST_NOT_INDEPENDENT_WORLD_TRUTH');
 assert.equal(result.authority.granted,false);
});


test('long-lived WAITING state is retained even after over 100 newer ordinary signals',async()=>{
 const prevOn=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
 const prevKey=process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='synthetic-test-key';
 try{
   const root='root:old-state-survives';
   const rows=new Map();
   const stamp=i=>new Date(Date.parse('2026-10-22T10:00:00Z')+i*1000).toISOString();
   const {createUniverseEntry}=await import('../src/reality-universe-persistence-contract-v1.0.js');
   const older=createUniverseEntry({
     entry_id:'state:waiting',continuity_root_id:root,
     worldline_id:'reality:primary',event_kind:'CONTINUITY_STATE_TRANSITION',
     epistemic_kind:'OBSERVATION',assertion_time:stamp(0),effective_time:stamp(0),
     source_ref:'test:continuity',payload:{continuity_state:'WAITING',work_item_id:'work:unresolved'},
     evidence_references:[],provenance:{source:'synthetic:test'},
   });
   rows.set(older.entry_id,older);
   for(let i=1;i<=140;i++){
     const obs=createUniverseEntry({
       entry_id:'signal:'+i,continuity_root_id:root,worldline_id:'reality:primary',
       event_kind:'REALITY_LAYER_HANDOFF',epistemic_kind:'OBSERVATION',
       assertion_time:stamp(i),effective_time:stamp(i),source_ref:'test:signal',
       payload:{ordinal:i},evidence_references:[],provenance:{source:'synthetic:test'},
     });rows.set(obs.entry_id,obs);
   }
   let wrote=0,unscopedReads=0;
   async function mocked(url,options={}){
     const u=new URL(url),method=options.method||'GET',q=u.searchParams;
     if(u.hostname==='api.openai.com')return {ok:true,json:async()=>({
       id:'model:stub',status:'completed',output_text:'The invoice follow-up remains waiting.'
     })};
     if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))throw Error('UNEXPECTED_ROUTE');
     if(method==='POST'){
       const entry=JSON.parse(options.body);rows.set(entry.entry_id,entry);wrote++;
       return {ok:true,status:201,json:async()=>[entry]};
     }
     if(method!=='GET')throw Error('UNEXPECTED_METHOD');
     let items=Array.from(rows.values());
     for(const key of ['entry_id','continuity_root_id','worldline_id','event_kind']){
       const criterion=q.get(key);
       if(criterion?.startsWith('eq.'))items=items.filter(x=>x[key]===criterion.slice(3));
     }
     if(!q.get('entry_id')&&!q.get('continuity_root_id'))unscopedReads++;
     items.sort((a,b)=>b.assertion_time.localeCompare(a.assertion_time));
     return {ok:true,json:async()=>items.slice(0,Number(q.get('limit')||1000))};
   }
   const result=await runLiveIntelligenceOrchestration({
     message:'What work are we still waiting on?',
     systemContext:{continuity_root_id:root},
     observedAt:stamp(141),apiKey:'synthetic',
     fetchImpl:mocked,
   });
   assert.equal(result.context.continuity.rehydrated,true);
   assert.equal(result.context.continuity.prior_state,'WAITING');
   assert.equal(unscopedReads,0);
   assert.ok(wrote>=2);
 }finally{
   if(prevOn===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
   else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=prevOn;
   if(prevKey===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
   else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=prevKey;
 }
});

test('verifier performs two independent predecessor reads across a layer handoff',async()=>{
 const io=memoryAdapter();
 const first=await recordVerifiedLayerHandoff({
  stage:'SIGNAL_CLEANER',continuityRootId:'root:linked',
  observedAt:observed,sourceRef:'reality:cleaner',
  output:{signal,verification:verifySignalCleanerRecord(signal)},
  fetchImpl:io.fakeFetch,
 });
 const second=await recordVerifiedLayerHandoff({
  stage:'COGNITION_ERROR',continuityRootId:'root:linked',
  observedAt:'2026-10-22T10:01:00Z',sourceRef:'reality:cognition',
  output:{error_code:'MODEL_UNAVAILABLE'},parent:first.entry,
  fetchImpl:io.fakeFetch,
 });
 assert.equal(second.parent_integrity_verified,true);
 assert.equal(second.parent_ledger_hash,first.ledger_entry_hash);
 assert.equal(io.rows.size,2);
 assert.equal(io.requests.filter(x=>x.method==='GET').length>=6,true);
});
test('forged/missing parent cannot yield verified child despite valid-looking root',async()=>{
 const io=memoryAdapter();
 const actual=await recordVerifiedLayerHandoff({
  stage:'SIGNAL_CLEANER',continuityRootId:'root:protected',
  observedAt:observed,sourceRef:'reality:cleaner',
  output:{signal,verification:verifySignalCleanerRecord(signal)},fetchImpl:io.fakeFetch,
 });
 const common={stage:'COGNITION_ERROR',continuityRootId:'root:protected',
 observedAt:'2026-10-22T10:02:00Z',sourceRef:'reality:cognition',
 output:{error_code:'TEST'},fetchImpl:io.fakeFetch};
 await assert.rejects(()=>recordVerifiedLayerHandoff({
  ...common,parent:{...actual.entry,ledger_entry_hash:'forged'},
 }),/HANDOFF_PARENT_READBACK_MISMATCH/);
 await assert.rejects(()=>recordVerifiedLayerHandoff({
  ...common,parent:{...actual.entry,entry_id:'missing-parent'},
 }),/UNIVERSE_ENTRY_READBACK_NOT_UNIQUE/);
 await assert.rejects(()=>recordVerifiedLayerHandoff({
  ...common,worldlineId:'worldline:other',parent:actual.entry,
 }),/HANDOFF_PARENT_WORLDLINE_MISMATCH/);
 assert.equal(io.rows.size,1);
});
test('if parent changes between append and post-write readback, child is not VERIFIED',async()=>{
 const io=memoryAdapter();
 const first=await recordVerifiedLayerHandoff({
  stage:'SIGNAL_CLEANER',continuityRootId:'root:tamper',
  observedAt:observed,sourceRef:'reality:cleaner',
  output:{signal,verification:verifySignalCleanerRecord(signal)},fetchImpl:io.fakeFetch,
 });
 let reads=0;
 const modified=async (url,opts={})=>{
  const u=new URL(url);
  if(u.searchParams.get('entry_id')==='eq.'+first.entry_id && (opts.method||'GET')==='GET'){
    reads++;
    if(reads===2) {
      const copy=io.rows.get(first.entry_id);
      return {ok:true,status:200,json:async()=>[{...copy,ledger_entry_hash:'forged:hash'}]};
    }
  }
  return io.fakeFetch(url,opts);
 };
 await assert.rejects(()=>recordVerifiedLayerHandoff({
  stage:'COGNITION_ERROR',continuityRootId:'root:tamper',
  observedAt:'2026-10-22T10:02:00Z',sourceRef:'reality:cognition',
  output:{error_code:'DISCONNECTED'},parent:first.entry,fetchImpl:modified,
 }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});

test('an ordinary chat observation cannot silently change a WAITING state to ACTIVE',async()=>{
 const oldEnable=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
 const oldKey=process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='test-waiting-state';
 const {createUniverseEntry}=await import('../src/reality-universe-persistence-contract-v1.0.js');
 const rows=new Map();
 const root='root:state-preservation';
 const older=createUniverseEntry({
  entry_id:'old:waiting',continuity_root_id:root,worldline_id:'reality:primary',
  event_kind:'CONTINUITY_STATE_TRANSITION',epistemic_kind:'OBSERVATION',
  assertion_time:'2026-10-22T09:00:00Z',effective_time:'2026-10-22T09:00:00Z',
  source_ref:'test:external',payload:{continuity_state:'WAITING',work_item_id:'work:still-unpaid'},
  evidence_references:[],provenance:{source:'test:state'},
 });rows.set(older.entry_id,older);
 async function mock(url,opt={}){
  const u=new URL(url),method=opt.method||'GET';
  if(u.hostname==='api.openai.com')return {ok:true,status:200,json:async()=>({
   id:'stub',output_text:'I can discuss the work while it remains waiting.',status:'completed',
  })};
  if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))throw Error('UNEXPECTED_PATH');
  if(method==='POST'){const row=JSON.parse(opt.body);rows.set(row.entry_id,row);
   return {ok:true,status:201,json:async()=>[row]};}
  let values=[...rows.values()],q=u.searchParams;
  for(const k of ['entry_id','continuity_root_id','event_kind']){
   const v=q.get(k);if(v?.startsWith('eq.'))values=values.filter(x=>x[k]===v.slice(3));
  }
  values.sort((a,b)=>b.assertion_time.localeCompare(a.assertion_time));
  return {ok:true,status:200,json:async()=>values.slice(0,Number(q.get('limit')||1000))};
 }
 try{
  const first=await runLiveIntelligenceOrchestration({
   message:'Explain the project timeline.',systemContext:{continuity_root_id:root},
   observedAt:'2026-10-22T10:00:00Z',apiKey:'synthetic',fetchImpl:mock,
  });
  assert.equal(first.context.continuity.prior_state,'WAITING');
  assert.equal(first.context.continuity.current_state,'WAITING');
  const events=[...rows.values()].filter(x=>x.event_kind==='CONTINUITY_STATE_TRANSITION');
  const newest=events.sort((a,b)=>b.assertion_time.localeCompare(a.assertion_time))[0];
  assert.equal(newest.payload.continuity_state,'WAITING');
  assert.equal(newest.payload.state_transition_authorized,false);
  const second=await runLiveIntelligenceOrchestration({
   message:'Tell me more about the options.',systemContext:{continuity_root_id:root},
   observedAt:'2026-10-22T11:00:00Z',apiKey:'synthetic',fetchImpl:mock,
  });
  assert.equal(second.context.continuity.prior_state,'WAITING');
  assert.equal(second.context.continuity.current_state,'WAITING');
  assert.equal(second.authority.granted,false);
 }finally{
  if(oldEnable===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=oldEnable;
  if(oldKey===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=oldKey;
 }
});
