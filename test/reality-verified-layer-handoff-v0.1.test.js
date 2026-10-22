import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { verifySignalCleanerRecord, recordVerifiedLayerHandoff } from '../src/reality-verified-layer-handoff-v0.1.js';
import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';

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
  stage:'COGNITION_ERROR',continuityRootId:'root:one',observedAt,sourceRef:'reality:cognition',
  output:{error_code:'stub'},parent:parentBad,fetchImpl:io.fakeFetch,
 }),/HANDOFF_PARENT_ROOT_MISMATCH/);
});

test('tampered durable readback does not become a verified next-layer receipt',async()=>{
 const io=memoryAdapter({modifyReadback:row=>({...row,payload:{replaced:'false evidence'}})});
 await assert.rejects(()=>recordVerifiedLayerHandoff({
  stage:'SIGNAL_CLEANER',continuityRootId:'root:one',observedAt,
  sourceRef:'reality:signal-cleaner',output:{signal},
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
