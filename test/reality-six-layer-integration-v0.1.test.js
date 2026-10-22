// End-to-end acceptance gate: each architectural layer must do its own job.
// The connector, model and database use deterministic fake transports.
// Nothing in this test is a claim of a live deployed or externally true result.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {createUniverseEntry,validateUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {admitTrustedObservation} from '../src/reality-trusted-observation-admission-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';
import {verifySignalCleanerRecord} from '../src/reality-verified-layer-handoff-v0.1.js';
import {inspectPersistedEpistemicDifferences} from '../src/reality-live-epistemic-diagnostics-v0.1.js';
import {buildContinuityRehydration} from '../src/reality-continuous-continuity-v1.0.js';
import {retrieveCompleteContinuityHistory} from '../src/reality-native-universe-persistence-v1.0.js';

process.env.REALITY_UNIVERSE_PERSISTENCE_KEY ||= 'synthetic-six-layer-test';
const ROOT='root:integrated-owner',OTHER='root:unrelated-owner';
const AT='2026-10-22T10:00:00Z',LATER='2026-10-22T10:05:00Z';
const MESSAGE='  Invoice X-17 says $90.\n  Customer says $100.  Keep this unresolved.  ';
const CONFLICTING_AMOUNT='invoice.amount';

function sourceRecord(id,value,{root=ROOT,when=AT,effective=AT,kind='FACT'}={}){
 return createObservation({
  source:'TRUSTED_INVOICE_CONNECTOR',domain:'BUSINESS',sourceRecordId:id,
  observedAt:when,eventTime:effective,eventType:'INVOICE_CLAIM',
  objectRefs:['invoice:X-17'],provenance:{continuity_root_id:root},
  contentOrMetadata:{epistemic_claims:[
    {target_state_key:CONFLICTING_AMOUNT,value,claim_kind:kind}
  ]},
 });
}
function trustedConnector(){
 return {async verify({observation,authenticatedPrincipalId,continuityRootId,worldlineId}){
  return {verified:true,independent:true,source:observation.source,
   source_record_id:observation.source_record_id,
   observation_id:observation.observation_id,
   observation_hash:observation.observation_hash,
   principal_id:authenticatedPrincipalId,
   continuity_root_id:continuityRootId,worldline_id:worldlineId,
   verification_ref:'synthetic-independent-source-read:'+observation.source_record_id};
 }};
}
function waitingEntry(root=ROOT){
 return createUniverseEntry({
  entry_id:'state:'+root+':waiting',
  continuity_root_id:root,worldline_id:'reality:primary',
  event_kind:'CONTINUITY_STATE_TRANSITION',epistemic_kind:'OBSERVATION',
  effective_time:AT,assertion_time:AT,source_ref:'synthetic:customer-obligation',
  payload:{continuity_state:'WAITING',work_item_id:'invoice-followup:X-17',
   next_continuation_condition:'CUSTOMER_CONFIRMS_CORRECT_AMOUNT'},
  evidence_references:[],provenance:{source:'synthetic:existing-state'},
 });
}
function buildHarness({seed=[],failModel=false,tamperReadBack=false}={}){
 const records=new Map(seed.map(item=>[item.entry_id,item]));
 const modelCalls=[],queries=[],writes=[],reads=[];
 let invocation=0;
 async function fakeFetch(url,options={}){
  const u=new URL(url),method=options.method||'GET';
  if(u.hostname==='api.openai.com'){
   invocation++;
   const item=JSON.parse(JSON.parse(options.body).input[1].content[0].text);
   modelCalls.push(item);
   if(failModel)return {ok:false,status:502,json:async()=>({error:{message:'SYNTHETIC_MODEL_OFFLINE'}})};
   return {ok:true,status:200,json:async()=>({
    id:'synthetic:response:'+invocation,status:'completed',
    output_text:'The two reported invoice amounts differ. Work remains waiting for verification.',
   })};
  }
  if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))
   throw Error('SYNTHETIC_UNKNOWN_ROUTE:'+u.pathname);
  if(method==='POST'){
   const row=JSON.parse(options.body);
   validateUniverseEntry(row);
   if(records.has(row.entry_id))throw Error('SYNTHETIC_DUPLICATE_WRITE');
   records.set(row.entry_id,row);writes.push(row);
   return {ok:true,status:201,json:async()=>[row]};
  }
  if(method!=='GET')throw Error('SYNTHETIC_UNEXPECTED_METHOD');
  const p=u.searchParams;queries.push(Object.fromEntries(p));
  let found=[...records.values()];
  for(const field of ['entry_id','continuity_root_id','worldline_id','event_kind']){
   const filter=p.get(field);
   if(filter?.startsWith('eq.'))found=found.filter(x=>x[field]===filter.slice(3));
  }
  const cutoff=p.get('assertion_time');
  if(cutoff?.startsWith('lte.'))
   found=found.filter(x=>Date.parse(x.assertion_time)<=Date.parse(cutoff.slice(4)));
  const terms=(p.get('order')||'assertion_time.desc').split(',');
  found.sort((a,b)=>{
   for(const expression of terms){
    const [key,direction='asc']=expression.split('.');
    const av=String(a[key]??''),bv=String(b[key]??'');
    const c=av.localeCompare(bv);
    if(c)return direction==='desc'?-c:c;
   }
   return 0;
  });
  found=found.slice(Number(p.get('offset')||0),
    Number(p.get('offset')||0)+Number(p.get('limit')||10000));
  if(tamperReadBack && p.get('entry_id')?.startsWith('eq.') &&
     found[0]?.event_kind==='REALITY_LAYER_HANDOFF' &&
     found[0].payload?.layer_stage==='SIGNAL_CLEANER'){
    found=[{...found[0],payload:{changed:'after-write'}}];
  }
  reads.push({filter:Object.fromEntries(p),size:found.length});
  return {ok:true,status:200,json:async()=>found};
 }
 return {records,modelCalls,queries,writes,reads,fakeFetch};
}
function envOn(){
 const prev=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 return ()=>prev===undefined
  ?delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED
  :process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=prev;
}
async function admitPair(h){
 const inputs=[sourceRecord('source:invoice',90),sourceRecord('source:customer',100,{when:LATER})];
 const admissions=[];
 for(const observation of inputs){
  admissions.push(await admitTrustedObservation({
   observation,authenticatedPrincipalId:'principal:owner',
   continuityRootId:ROOT,sourceVerifier:trustedConnector(),
   fetchImpl:h.fakeFetch,
  }));
 }
 return {inputs,admissions};
}
function persistedRows(h,kind){return [...h.records.values()].filter(e=>e.event_kind===kind);}

test('six-layer end-to-end: exact signal -> durable Universe -> continuity -> verifier -> detector -> intelligence -> next turn',async()=>{
 const reset=envOn();
 try{
  const h=buildHarness({seed:[waitingEntry(),waitingEntry(OTHER)]});
  const {inputs,admissions}=await admitPair(h);
  // LAYER 2: SOURCE -> UNIVERSE. Source observation receipts are real readbacks.
  assert.equal(admissions.length,2);
  for(const a of admissions){
   assert.equal(a.status,'ADMITTED_VERIFIED_SOURCE_READBACK');
   assert.equal(a.authority_granted,false);
   assert.equal(h.records.get(a.entry_id).ledger_entry_hash,a.ledger_entry_hash);
   assert.equal(h.records.get(a.entry_id).payload.source_attestation.truth_established,false);
  }
  const turn=await runLiveIntelligenceOrchestration({
   message:MESSAGE,observedAt:'2026-10-22T10:06:00Z',
   systemContext:{continuity_root_id:ROOT,conversation_id:'conv:owner'},
   apiKey:'synthetic-test',fetchImpl:h.fakeFetch,
  });
  // LAYER 1: SIGNAL CLEANER. Exact raw content survives normalization.
  const verified=verifySignalCleanerRecord(turn.governed_signal);
  assert.equal(verified.status,'VERIFIED');
  assert.equal(turn.governed_signal.packet.raw_content,MESSAGE);
  assert.ok(turn.governed_signal.fragments.length>1);
  // LAYER 2: UNIVERSE. Signal receipt must match independently stored bytes.
  const cleaner=persistedRows(h,'REALITY_LAYER_HANDOFF')
    .find(x=>x.payload.layer_stage==='SIGNAL_CLEANER');
  assert.ok(cleaner);
  assert.equal(cleaner.payload.data.signal.packet.raw_content,MESSAGE);
  assert.equal(cleaner.payload.data.verification.transformation_receipt_id,
    verified.transformation_receipt_id);
  assert.equal(turn.context.continuity.signal_handoff_entry_id,cleaner.entry_id);
  // LAYER 3: CONTINUITY. Older waiting state stays WAITING.
  assert.equal(turn.context.continuity.prior_state,'WAITING');
  assert.equal(turn.context.continuity.current_state,'WAITING');
  const projection=buildContinuityRehydration({
   continuityRootId:ROOT,entries:[...h.records.values()],
  });
  assert.equal(projection.latest_state,'WAITING');
  // LAYER 4: VERIFIER. Actual storage hash and source reference survive cognition.
  assert.equal(turn.context.continuity.cognitive_readback_verified,true);
  const cognitive=persistedRows(h,'CONTINUITY_STATE_TRANSITION')
   .filter(x=>x.continuity_root_id===ROOT)
   .sort((a,b)=>b.assertion_time.localeCompare(a.assertion_time))[0];
  assert.equal(cognitive.payload.signal_handoff_entry_id,cleaner.entry_id);
  assert.equal(cognitive.payload.signal_handoff_ledger_hash,cleaner.ledger_entry_hash);
  assert.equal(cognitive.payload.cleaner_verification.status,'VERIFIED');
  assert.equal(cognitive.payload.state_transition_authorized,false);
  // LAYER 5: DETECTOR. Symmetric fact conflict, no invented truth or enforcement.
  assert.equal(turn.context.epistemic_diagnostics.contradictions.length,1);
  const discrepancy=turn.context.epistemic_diagnostics.contradictions[0];
  assert.equal(discrepancy.classification,'E_FACT_CONFLICT');
  assert.deepEqual(discrepancy.target_state_keys,['invoice.amount']);
  assert.equal(discrepancy.epistemic_truth_established,false);
  assert.equal(turn.context.epistemic_diagnostics.intervention_count,0);
  // LAYER 6: INTELLIGENCE. Evidence, raw source and WAITING state reach model.
  const sent=h.modelCalls.at(-1);
  assert.equal(sent.governed_signal.raw_content_exact,MESSAGE);
  assert.equal(sent.system_context.continuity_latest_state,'WAITING');
  assert.equal(sent.system_context.epistemic_diagnostics.contradictions.length,1);
  assert.ok(sent.system_context.universe_context_entries.some(x=>x.entry_id===cleaner.entry_id)===false);
  assert.equal(turn.authority.granted,false);
  assert.equal(turn.execution.status,'NOT_EXECUTED');
  // Model/session restart simulated: new orchestration call, same persisted store.
  const next=await runLiveIntelligenceOrchestration({
   message:'And the invoice?',observedAt:'2026-10-22T10:07:00Z',
   systemContext:{continuity_root_id:ROOT,conversation_id:'conv:owner'},
   apiKey:'synthetic-test',fetchImpl:h.fakeFetch,
  });
  assert.equal(next.context.continuity.rehydrated,true);
  assert.equal(next.context.continuity.prior_state,'WAITING');
  assert.equal(next.context.continuity.current_state,'WAITING');
  assert.equal(next.context.epistemic_diagnostics.contradictions.length,1);
  assert.equal(h.modelCalls.at(-1).system_context.continuity_latest_state,'WAITING');
  assert.ok(h.queries.filter(q=>q.continuity_root_id==='eq.'+ROOT).length>=2);
  assert.ok(h.queries.every(q=>q.entry_id || q.continuity_root_id==='eq.'+ROOT));
  assert.ok([...h.records.values()].every(r=>r.continuity_root_id===ROOT ||
    r.entry_id===waitingEntry(OTHER).entry_id));
 }finally{reset();}
});
test('a model failure preserves exact signal and error receipt, without fabricated completion',async()=>{
 const reset=envOn();
 try{
  const h=buildHarness({seed:[waitingEntry()],failModel:true});
  await assert.rejects(()=>runLiveIntelligenceOrchestration({
   message:'Invoice X-17 is still unresolved.',observedAt:'2026-10-22T10:10:00Z',
   systemContext:{continuity_root_id:ROOT},apiKey:'synthetic',fetchImpl:h.fakeFetch,
  }),/SYNTHETIC_MODEL_OFFLINE/);
  const signal=persistedRows(h,'REALITY_LAYER_HANDOFF')
   .find(x=>x.payload.layer_stage==='SIGNAL_CLEANER');
  const error=persistedRows(h,'REALITY_LAYER_HANDOFF')
   .find(x=>x.payload.layer_stage==='COGNITION_ERROR');
  assert.ok(signal && error);
  assert.equal(error.payload.parent_entry_id,signal.entry_id);
  assert.equal(error.payload.parent_ledger_hash,signal.ledger_entry_hash);
  assert.equal(error.payload.truth_verification,'NOT_CLAIMED_BY_TRANSPORT');
  assert.equal(persistedRows(h,'CONTINUITY_STATE_TRANSITION').length,1);
  assert.equal(buildContinuityRehydration({
   continuityRootId:ROOT,entries:[...h.records.values()],
  }).latest_state,'WAITING');
 }finally{reset();}
});
test('verifier blocks forged readback before cognition receives false evidence',async()=>{
 const reset=envOn();
 try{
  const h=buildHarness({seed:[waitingEntry()],tamperReadBack:true});
  await assert.rejects(()=>runLiveIntelligenceOrchestration({
   message:'Invoice X-17.',observedAt:'2026-10-22T10:11:00Z',
   systemContext:{continuity_root_id:ROOT},apiKey:'synthetic',fetchImpl:h.fakeFetch,
  }),/UNIVERSE_LEDGER_HASH_MISMATCH|SIGNAL_SOURCE_PACKET_MISSING/);
  assert.equal(h.modelCalls.length,0);
  assert.equal(h.records.has(waitingEntry().entry_id),true);
 }finally{reset();}
});
test('historical Universe survives a 100-record working-context window without losing older WAITING',async()=>{
 const reset=envOn();
 try{
  const seed=[waitingEntry()];
  for(let i=0;i<139;i++){
   const date=new Date(Date.parse(AT)+(i+1)*1000).toISOString();
   seed.push(createUniverseEntry({
    entry_id:'signal:synthetic:'+i,continuity_root_id:ROOT,worldline_id:'reality:primary',
    event_kind:'REALITY_LAYER_HANDOFF',epistemic_kind:'OBSERVATION',
    assertion_time:date,effective_time:date,source_ref:'synthetic:background',
    payload:{layer_stage:'SIGNAL_CLEANER',ordinal:i},
    evidence_references:[],provenance:{source:'synthetic:background'},
   }));
  }
  const h=buildHarness({seed});
  const result=await runLiveIntelligenceOrchestration({
   message:'Status.',observedAt:'2026-10-22T11:00:00Z',
   systemContext:{continuity_root_id:ROOT},apiKey:'synthetic',fetchImpl:h.fakeFetch,
  });
  assert.equal(result.context.continuity.prior_state,'WAITING');
  assert.equal(h.modelCalls.at(-1).system_context.continuity_latest_state,'WAITING');
  assert.ok(h.modelCalls.at(-1).system_context.universe_context_entries.some(
   x=>x.entry_id===waitingEntry().entry_id));
  const all=await retrieveCompleteContinuityHistory({
   continuityRootId:ROOT,pageSize:37,maxEntries:250,
   snapshotAssertionTime:'2026-10-22T12:00:00Z',fetchImpl:h.fakeFetch,
  });
  assert.equal(all.status,'COMPLETE_AT_SNAPSHOT');
  assert.equal(all.count,h.records.size);
  assert.ok(all.count>100);
  assert.equal(all.limit_truncated,false);
 }finally{reset();}
});

test('two parallel job obligations survive 135 later signals and both reach cognition',async()=>{
 const reset=envOn();
 try{
  const waiting=createUniverseEntry({
   entry_id:'job:invoice:WAITING',continuity_root_id:ROOT,worldline_id:'reality:primary',
   event_kind:'CONTINUITY_STATE_TRANSITION',epistemic_kind:'OBSERVATION',
   assertion_time:AT,effective_time:AT,source_ref:'synthetic:invoice',
   payload:{work_item_id:'invoice:unpaid',continuity_state:'WAITING'},
   provenance:{source:'synthetic:test'},evidence_references:[],
  });
  const completed=createUniverseEntry({
   entry_id:'job:cabinet:COMPLETED',continuity_root_id:ROOT,worldline_id:'reality:primary',
   event_kind:'CONTINUITY_STATE_TRANSITION',epistemic_kind:'OBSERVATION',
   assertion_time:LATER,effective_time:LATER,source_ref:'synthetic:cabinet',
   payload:{work_item_id:'cabinets:delivered',continuity_state:'COMPLETED'},
   provenance:{source:'synthetic:test'},evidence_references:[],
  });
  const seed=[waiting,completed];
  for(let i=0;i<135;i++){
   const d=new Date(Date.parse(LATER)+1000*(i+1)).toISOString();
   seed.push(createUniverseEntry({
    entry_id:'unrelated:signal:'+i,continuity_root_id:ROOT,worldline_id:'reality:primary',
    event_kind:'REALITY_LAYER_HANDOFF',epistemic_kind:'OBSERVATION',
    assertion_time:d,effective_time:d,source_ref:'synthetic:latest-signals',
    payload:{ordinal:i},evidence_references:[],provenance:{source:'synthetic:test'},
   }));
  }
  const h=buildHarness({seed});
  const turn=await runLiveIntelligenceOrchestration({
   message:'Which jobs still need attention?',observedAt:'2026-10-22T11:00:00Z',
   systemContext:{continuity_root_id:ROOT},apiKey:'synthetic',fetchImpl:h.fakeFetch,
  });
  const outstanding=turn.context.continuity.unresolved_work_items;
  assert.deepEqual(outstanding.map(x=>x.work_item_id),['invoice:unpaid']);
  const all=turn.context.continuity.work_item_states;
  assert.equal(all.length,2);
  assert.equal(all.find(x=>x.work_item_id==='cabinets:delivered').latest_state,'COMPLETED');
  const model=h.modelCalls.at(-1).system_context;
  assert.deepEqual(model.continuity_unresolved_work_items.map(x=>x.work_item_id),['invoice:unpaid']);
  assert.equal(model.continuity_work_items_complete_snapshot_proven,false);
 }finally{reset();}
});
