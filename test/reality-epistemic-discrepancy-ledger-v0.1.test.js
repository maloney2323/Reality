import test from 'node:test';
import assert from 'node:assert/strict';
import { createObservation } from '../src/reality-world-observation-fabric-v0.1.js';
import { inspectEpistemicDifferences } from '../src/reality-epistemic-difference-detector-v0.1.js';
import { createUniverseEntry } from '../src/reality-universe-persistence-contract-v1.0.js';
import {
  appendVerifiedDiscrepancy,projectVerifiedDiscrepancyKeys,
} from '../src/reality-epistemic-discrepancy-ledger-v0.1.js';
import { reconstructUniverse } from '../src/reality-universe-reconstruction-v0.1.js';

// All network calls are synthetic. No external DB, Base44 or model call.
if(!process.env.REALITY_UNIVERSE_PERSISTENCE_KEY)
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='mock-test-only';

const time0='2026-10-20T10:00:00Z',time1='2026-10-21T10:00:00Z';
function observed(name,value,{key='invoice.amount',entity='invoice:17',
  root='user:owner1',effective=time0,recorded=effective,kind='FACT',extra={},
}={}) {
  return createObservation({
    source:'TEST_INVOICE',domain:'BUSINESS',sourceRecordId:name,
    observedAt:recorded,eventTime:effective,
    objectRefs:[entity],eventType:'STRUCTURED_CLAIM',
    provenance:{continuity_root_id:root},
    contentOrMetadata:{epistemic_claims:[{
      target_state_key:key,claim_kind:kind,value,...extra,
    }]},
  });
}
function sourceEntry(obs,{root='user:owner1',worldline='reality:primary'}={}) {
  return createUniverseEntry({
    entry_id:'observation:stored:'+obs.observation_id,
    continuity_root_id:root,worldline_id:worldline,
    event_kind:'SOURCE_OBSERVATION',epistemic_kind:'OBSERVATION',
    assertion_time:obs.observed_at,effective_time:obs.event_time,
    source_ref:'TEST_INVOICE',payload:{observation:obs},
    evidence_references:[],provenance:{source:'synthetic:ledger-evidence'},
  });
}
function store({entries=[],tamperEventReadback=false,swapAfterWrite=false}={}) {
  const rows=new Map(entries.map(e=>[e.entry_id,e]));
  let sourceReadsAfterWrite=0;
  async function fakeFetch(url,{method='GET',body}={}) {
    const u=new URL(url);
    if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))
      throw Error('UNEXPECTED_URL:'+u.pathname);
    if(method==='POST') {
      const entry=JSON.parse(body);
      if(rows.has(entry.entry_id))
        throw Error('TEST_IMMUTABILITY_COLLISION');
      rows.set(entry.entry_id,entry);
      return {ok:true,status:201,json:async()=>[entry]};
    }
    if(method!=='GET') throw Error('UNEXPECTED_METHOD:'+method);
    const selector=u.searchParams.get('entry_id');
    const id=selector?.startsWith('eq.')?selector.slice(3):null;
    const row=id?rows.get(id):null;
    if(row && row.event_kind==='DISCREPANCY_DETECTED' && tamperEventReadback)
      return {ok:true,status:200,json:async()=>[{...row,ledger_entry_hash:'forged-event-hash'}]};
    if(row && row.event_kind==='SOURCE_OBSERVATION' &&
      Array.from(rows.values()).some(x=>x.event_kind==='DISCREPANCY_DETECTED')) {
      sourceReadsAfterWrite++;
      if(swapAfterWrite && sourceReadsAfterWrite===1)
        return {ok:true,status:200,json:async()=>[createUniverseEntry({
          ...row,source_ref:'SWAPPED_EVIDENCE_SOURCE',
        })]};
    }
    return {ok:true,status:200,json:async()=>row?[row]:[]};
  }
  return {rows,fakeFetch};
}
function setup(a,b) {
  const obs=b?[a,b]:[a];
  const evidence=obs.map(x=>sourceEntry(x));
  const discrepancy=inspectEpistemicDifferences({observations:obs})
    .epistemic_discrepancies[0];
  const evidenceBindings=Object.fromEntries(evidence.map((e,i)=>[
    obs[i].observation_id,e.entry_id,
  ]));
  return {
    obs,evidence,discrepancy,evidenceBindings,
    args:{discrepancy,continuityRootId:'user:owner1',
      worldlineId:'reality:primary',evidenceBindings},
  };
}
test('append-only conflict event survives two-sided source and event readback',async()=>{
  const {evidence,discrepancy,args}=setup(
    observed('prior',90),
    observed('incoming',100,{recorded:time1}),
  );
  const io=store({entries:evidence});
  const r=await appendVerifiedDiscrepancy({...args,fetchImpl:io.fakeFetch});
  assert.equal(r.verification_status,'VERIFIED_DURABLE_LINEAGE');
  assert.equal(r.verification_scope,'STORAGE_INTEGRITY_NOT_SEMANTIC_TRUTH');
  assert.equal(r.entry.event_kind,'DISCREPANCY_DETECTED');
  assert.equal(r.entry.payload.discrepancy.discrepancy_id,discrepancy.discrepancy_id);
  assert.equal(r.entry.payload.scope.entity_ref,'invoice:17');
  assert.deepEqual(r.entry.evidence_references,evidence.map(e=>e.entry_id));
  assert.deepEqual(r.entry.payload.evidence_manifest.map(e=>e.ledger_entry_hash),
    evidence.map(e=>e.ledger_entry_hash));
  assert.equal(io.rows.size,3);
  assert.deepEqual(io.rows.get(evidence[0].entry_id),evidence[0]);
  const again=await appendVerifiedDiscrepancy({...args,fetchImpl:io.fakeFetch});
  assert.equal(again.ledger_entry_hash,r.ledger_entry_hash);
  assert.equal(io.rows.size,3);
});
test('only the conflicted entity-field becomes CONTESTED, not its neighbors',async()=>{
  const main=setup(observed('amount1',90),observed('amount2',100,{recorded:time1}));
  const other=setup(observed('status1','PENDING',{key:'invoice.status'}),
    observed('status2','COMPLETED',{key:'invoice.status',effective:time1}));
  const io=store({entries:[...main.evidence,...other.evidence]});
  const receiptA=await appendVerifiedDiscrepancy({...main.args,fetchImpl:io.fakeFetch});
  const receiptB=await appendVerifiedDiscrepancy({...other.args,fetchImpl:io.fakeFetch});
  const projection=projectVerifiedDiscrepancyKeys({verifiedReceipts:[receiptA,receiptB]});
  assert.equal(projection.state_keys.length,2);
  const byKey=Object.fromEntries(projection.state_keys.map(x=>[x.target_state_key,x]));
  assert.equal(byKey['invoice.amount'].status,'CONTESTED');
  assert.equal(byKey['invoice.status'].status,'EVOLVING');
  assert.equal(byKey['invoice.status'].fact_conflict_entry_ids.length,0);
  assert.equal(projection.intervened,false);
  assert.equal(projection.authority_granted,false);
  const reconstructed=reconstructUniverse({
    observations:[...main.obs,...other.obs],verifiedDiscrepancyReceipts:[receiptA,receiptB],
    now:time1,
  });
  assert.deepEqual(reconstructed.persisted_epistemic_state.state_keys,
    projection.state_keys);
});
test('missing durable source observation prevents an authenticated handshake',async()=>{
  const pair=setup(observed('a',90),observed('b',100,{recorded:time1}));
  const io=store({entries:pair.evidence.slice(0,1)});
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,fetchImpl:io.fakeFetch,
  }),/UNIVERSE_ENTRY_READBACK_NOT_UNIQUE/);
  assert.equal(io.rows.size,1);
});
test('cross-worldline, cross-root or swapped bindings fail before ledger append',async()=>{
  const pair=setup(observed('a',90),observed('b',100,{recorded:time1}));
  const differentWorld=sourceEntry(pair.obs[1],{worldline:'different:worldline'});
  const worldStore=store({entries:[pair.evidence[0],differentWorld]});
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,fetchImpl:worldStore.fakeFetch,
  }),/DISCREPANCY_EVIDENCE_SCOPE_MISMATCH/);
  const io=store({entries:pair.evidence});
  const swapped={...pair.evidenceBindings,
    [pair.obs[1].observation_id]:pair.evidence[0].entry_id};
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,evidenceBindings:swapped,fetchImpl:io.fakeFetch,
  }),/DISCREPANCY_OBSERVATION_LINEAGE_MISMATCH/);
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,continuityRootId:'someone:else',fetchImpl:io.fakeFetch,
  }),/DISCREPANCY_EVIDENCE_SCOPE_MISMATCH/);
  assert.equal(io.rows.size,2);
});
test('event-body tampering and source replacement after write cannot produce verified receipt',async()=>{
  const pair=setup(observed('a',90),observed('b',100,{recorded:time1}));
  const eventIo=store({entries:pair.evidence,tamperEventReadback:true});
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,fetchImpl:eventIo.fakeFetch,
  }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
  const sourceIo=store({entries:pair.evidence,swapAfterWrite:true});
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,fetchImpl:sourceIo.fakeFetch,
  }),/DISCREPANCY_POST_WRITE_LINEAGE_MISMATCH/);
});
test('forged discrepancy classification or values are not reproducible from evidence',async()=>{
  const pair=setup(observed('a',90),observed('b',100,{recorded:time1}));
  const io=store({entries:pair.evidence});
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,
    discrepancy:{...pair.discrepancy,classification:'E_DELTA'},
    fetchImpl:io.fakeFetch,
  }),/DISCREPANCY_DIAGNOSIS_NOT_REPRODUCIBLE/);
  await assert.rejects(()=>appendVerifiedDiscrepancy({
    ...pair.args,discrepancy:{...pair.discrepancy,incoming_value:500},
    fetchImpl:io.fakeFetch,
  }),/DISCREPANCY_DIAGNOSIS_NOT_REPRODUCIBLE/);
  assert.equal(io.rows.size,2);
});
test('unverified synthetic receipts cannot influence the active key projection',()=>{
  const pair=setup(observed('a',90),observed('b',100,{recorded:time1}));
  assert.throws(()=>projectVerifiedDiscrepancyKeys({
    verifiedReceipts:[{verification_status:'VERIFIED_DURABLE_LINEAGE',
      ledger_entry_hash:'unbound',entry:{ledger_entry_hash:'forged'}}],
  }),/UNIVERSE_|DISCREPANCY_/);
  assert.deepEqual(projectVerifiedDiscrepancyKeys().state_keys,[]);
});
test('unattested completion remains a diagnostic without promoting it to truth',async()=>{
  const pair=setup(observed('completed','COMPLETED',{
    kind:'EXECUTION_COMPLETION',extra:{verification_receipt_id:'unknown:self-claim'},
  }));
  const io=store({entries:pair.evidence});
  const receipt=await appendVerifiedDiscrepancy({...pair.args,fetchImpl:io.fakeFetch});
  const state=projectVerifiedDiscrepancyKeys({verifiedReceipts:[receipt]});
  assert.equal(state.state_keys[0].status,'UNATTESTED');
  assert.equal(state.intervened,false);
  assert.equal(receipt.entry.payload.epistemic_truth_established,false);
});
