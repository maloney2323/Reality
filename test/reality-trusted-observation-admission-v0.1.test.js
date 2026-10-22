import test from 'node:test';
import assert from 'node:assert/strict';
import { createObservation } from '../src/reality-world-observation-fabric-v0.1.js';
import { createUniverseEntry } from '../src/reality-universe-persistence-contract-v1.0.js';
import { inspectEpistemicDifferences } from '../src/reality-epistemic-difference-detector-v0.1.js';
import { appendVerifiedDiscrepancy } from '../src/reality-epistemic-discrepancy-ledger-v0.1.js';
import { admitTrustedObservation,verifyObservationEnvelope } from '../src/reality-trusted-observation-admission-v0.1.js';
import { retrieveCompleteContinuityHistory } from '../src/reality-native-universe-persistence-v1.0.js';

if(!process.env.REALITY_UNIVERSE_PERSISTENCE_KEY)
  process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='synthetic-tests-only';
const now='2026-10-22T10:00:00Z',later='2026-10-22T10:10:00Z';
const root='root:alice',principal='principal:alice',worldline='reality:primary';

function observation(id,value,{seen=now,effective=now,continuityRootId=root}={}){
 return createObservation({
  source:'INVOICE_SYSTEM',domain:'BUSINESS',sourceRecordId:id,
  observedAt:seen,eventTime:effective,eventType:'STRUCTURED_CLAIM',
  objectRefs:['invoice:17'],provenance:{continuity_root_id:continuityRootId},
  contentOrMetadata:{epistemic_claims:[{
    target_state_key:'invoice.amount',claim_kind:'FACT',value,
  }]},
 });
}
function verifier({tamper=false,independent=true}={}){
 return {verify:async({observation:obs,authenticatedPrincipalId,
    continuityRootId,worldlineId})=>({
    verified:true,independent,source:obs.source,
    source_record_id:obs.source_record_id,
    observation_id:obs.observation_id,
    observation_hash:tamper?'bad-hash':obs.observation_hash,
    principal_id:authenticatedPrincipalId,
    continuity_root_id:continuityRootId,
    worldline_id:worldlineId,
    verification_ref:'source-readback:'+obs.source_record_id,
  })};
}
function database({entries=[],tamperId=null,overlap=false}={}){
 const rows=new Map(entries.map(x=>[x.entry_id,x]));
 const queries=[];
 async function fakeFetch(url,options={}){
  const u=new URL(url),method=options.method||'GET';
  if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))
    throw Error('UNEXPECTED_FAKE_NETWORK_CALL');
  if(method==='POST'){
    const row=JSON.parse(options.body);
    if(rows.has(row.entry_id))throw Error('TEST_DUPLICATE_WRITE');
    rows.set(row.entry_id,row);
    return {ok:true,status:201,json:async()=>[row]};
  }
  if(method!=='GET')throw Error('TEST_UNEXPECTED_METHOD');
  const q=u.searchParams;queries.push(Object.fromEntries(q));
  let subset=Array.from(rows.values());
  for(const field of ['entry_id','continuity_root_id','worldline_id','event_kind']){
    const v=q.get(field);
    if(v?.startsWith('eq.'))subset=subset.filter(x=>x[field]===v.slice(3));
  }
  const cutoff=q.get('assertion_time');
  if(cutoff?.startsWith('lte.'))
    subset=subset.filter(x=>Date.parse(x.assertion_time)<=Date.parse(cutoff.slice(4)));
  subset.sort((a,b)=>a.assertion_time.localeCompare(b.assertion_time)||
    a.effective_time.localeCompare(b.effective_time)||
    a.ledger_entry_hash.localeCompare(b.ledger_entry_hash));
  let offset=Number(q.get('offset')||0);
  if(overlap&&offset>0) offset=0;
  const limit=Number(q.get('limit')||10000);
  subset=subset.slice(offset,offset+limit);
  if(tamperId)subset=subset.map(x=>x.entry_id===tamperId?
    {...x,payload:{...x.payload,modified:true}}:x);
  return {ok:true,status:200,json:async()=>subset};
 }
 return {rows,queries,fakeFetch};
}
function row(i,{continuityRootId=root,worldlineId=worldline}={}){
 return createUniverseEntry({
  entry_id:'history:'+continuityRootId+':'+i,
  continuity_root_id:continuityRootId,worldline_id:worldlineId,
  event_kind:'OBSERVATION',epistemic_kind:'OBSERVATION',
  assertion_time:new Date(Date.parse(now)+i*1000).toISOString(),
  effective_time:new Date(Date.parse(now)+i*1000).toISOString(),
  source_ref:'test:timeline',payload:{number:i},
  evidence_references:[],provenance:{source:'synthetic:history'},
 });
}
test('verified connector source is admitted, stored, read back, and identity-bound',async()=>{
 const io=database(),obs=observation('source-a',90);
 const result=await admitTrustedObservation({
  observation:obs,continuityRootId:root,
  authenticatedPrincipalId:principal,worldlineId:worldline,
  sourceVerifier:verifier(),fetchImpl:io.fakeFetch,
 });
 assert.equal(result.status,'ADMITTED_VERIFIED_SOURCE_READBACK');
 assert.equal(result.authority_granted,false);
 const stored=io.rows.get(result.entry_id);
 assert.equal(stored.payload.observation.observation_hash,obs.observation_hash);
 assert.equal(stored.payload.source_attestation.truth_established,false);
 assert.equal(result.evidence_binding[obs.observation_id],result.entry_id);
 const repeat=await admitTrustedObservation({
  observation:obs,continuityRootId:root,
  authenticatedPrincipalId:principal,sourceVerifier:verifier(),
  fetchImpl:io.fakeFetch,
 });
 assert.equal(repeat.ledger_entry_hash,result.ledger_entry_hash);
 assert.equal(io.rows.size,1);
});
test('forged signal, cross-root observation, or unverified connector cannot enter ledger',async()=>{
 const io=database(),obs=observation('source-a',90);
 assert.throws(()=>verifyObservationEnvelope({...obs,observation_hash:'forged'},
   {continuityRootId:root}),/TRUSTED_OBSERVATION_ENVELOPE_INTEGRITY_FAILED/);
 for(const failed of [
  {sourceVerifier:null},
  {sourceVerifier:verifier({independent:false})},
  {sourceVerifier:verifier({tamper:true})},
  {continuityRootId:'root:bob',sourceVerifier:verifier()},
 ]){
  await assert.rejects(()=>admitTrustedObservation({
   observation:obs,authenticatedPrincipalId:principal,
   continuityRootId:root,fetchImpl:io.fakeFetch,...failed,
  }),/TRUSTED_SOURCE_VERIFIER_REQUIRED|TRUSTED_SOURCE_READBACK_NOT_ESTABLISHED|TRUSTED_OBSERVATION_ROOT_MISMATCH/);
 }
 assert.equal(io.rows.size,0);
});
test('trusted source admission binds observations to the discrepancy dual-read handshake',async()=>{
 const io=database(),one=observation('source-a',90),
   two=observation('source-b',100,{seen:later});
 const admitted=[];
 for(const obs of [one,two])admitted.push(await admitTrustedObservation({
  observation:obs,continuityRootId:root,worldlineId:worldline,
  authenticatedPrincipalId:principal,sourceVerifier:verifier(),fetchImpl:io.fakeFetch,
 }));
 const detected=inspectEpistemicDifferences({observations:[one,two]});
 assert.equal(detected.contradictions.length,1);
 const binding=Object.assign({},...admitted.map(x=>x.evidence_binding));
 const proof=await appendVerifiedDiscrepancy({
  discrepancy:detected.contradictions[0],
  continuityRootId:root,worldlineId:worldline,evidenceBindings:binding,fetchImpl:io.fakeFetch,
 });
 assert.equal(proof.verification_status,'VERIFIED_DURABLE_LINEAGE');
 assert.equal(proof.entry.evidence_references.length,2);
 assert.equal(io.rows.size,3);
});
test('complete root-scoped read returns all records past the previous 100-entry window',async()=>{
 const data=Array.from({length:237},(_,i)=>row(i));
 const unrelated=Array.from({length:20},(_,i)=>row(i,{continuityRootId:'root:bob'}));
 const io=database({entries:[...data,...unrelated]});
 const output=await retrieveCompleteContinuityHistory({
  continuityRootId:root,snapshotAssertionTime:'2026-10-22T10:59:00Z',
  pageSize:32,maxEntries:300,fetchImpl:io.fakeFetch,
 });
 assert.equal(output.status,'COMPLETE_AT_SNAPSHOT');
 assert.equal(output.count,237);
 assert.equal(output.limit_truncated,false);
 assert.equal(new Set(output.entries.map(x=>x.entry_id)).size,237);
 assert.ok(output.pages_read>7);
 assert.ok(io.queries.every(q=>q.continuity_root_id==='eq.'+root));
 assert.equal(output.entries.some(x=>x.continuity_root_id==='root:bob'),false);
 const second=await retrieveCompleteContinuityHistory({
  continuityRootId:root,snapshotAssertionTime:'2026-10-22T10:59:00Z',
  pageSize:50,maxEntries:300,fetchImpl:io.fakeFetch,
 });
 assert.equal(second.history_hash,output.history_hash);
});
test('scan refuses to call a truncated result complete',async()=>{
 const io=database({entries:Array.from({length:14},(_,i)=>row(i))});
 await assert.rejects(()=>retrieveCompleteContinuityHistory({
  continuityRootId:root,snapshotAssertionTime:'2026-10-22T10:59:00Z',
  pageSize:5,maxEntries:10,fetchImpl:io.fakeFetch,
 }),/CONTINUITY_FULL_HISTORY_LIMIT_REACHED/);
});
test('overlapping pages or a tampered row cannot pass a complete scan',async()=>{
 const entries=Array.from({length:12},(_,i)=>row(i));
 await assert.rejects(()=>retrieveCompleteContinuityHistory({
  continuityRootId:root,snapshotAssertionTime:'2026-10-22T10:59:00Z',
  pageSize:4,fetchImpl:database({entries,overlap:true}).fakeFetch,
 }),/CONTINUITY_FULL_HISTORY_DUPLICATE_ENTRY/);
 await assert.rejects(()=>retrieveCompleteContinuityHistory({
  continuityRootId:root,snapshotAssertionTime:'2026-10-22T10:59:00Z',
  pageSize:4,fetchImpl:database({entries,tamperId:entries[5].entry_id}).fakeFetch,
 }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});
test('snapshot excludes observations recorded after cutoff, not retrospectively backdated observations',async()=>{
 const entries=[row(1),row(2),row(20)];
 const io=database({entries});
 const output=await retrieveCompleteContinuityHistory({
  continuityRootId:root,snapshotAssertionTime:'2026-10-22T10:00:03Z',
  pageSize:2,fetchImpl:io.fakeFetch,
 });
 assert.deepEqual(output.entries.map(x=>x.entry_id),[entries[0].entry_id,entries[1].entry_id]);
});
