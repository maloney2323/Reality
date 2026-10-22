
import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {admitTrustedObservation} from '../src/reality-trusted-observation-admission-v0.1.js';
import {retrieveCompleteContinuityHistory} from '../src/reality-native-universe-persistence-v1.0.js';
import {inspectEpistemicDifferences} from '../src/reality-epistemic-difference-detector-v0.1.js';
process.env.REALITY_UNIVERSE_PERSISTENCE_KEY ||= 'synthetic-soak';
const root='root:100-events-test',t0=Date.parse('2026-10-22T00:00:00Z');
function at(i){return new Date(t0+i*1000).toISOString()}
function obs(i){
 return createObservation({
  source:'INVOICE_SYSTEM',domain:'BUSINESS',
  sourceRecordId:'same-invoice:17',observedAt:at(i),eventTime:at(i),
  eventType:'INVOICE_AMOUNT_UPDATE',objectRefs:['invoice:17'],
  provenance:{continuity_root_id:root},
  contentOrMetadata:{epistemic_claims:[
   {claim_kind:'FACT',target_state_key:'invoice.amount',value:i+100}
  ]},
 });
}
function database(){
 const rows=new Map();let posts=0;
 return {rows,get posts(){return posts},
  async fetchImpl(url,opts={}){
   const u=new URL(url),method=opts.method||'GET';
   if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))throw Error('TEST_ROUTING_FAILURE');
   if(method==='POST'){
    const record=JSON.parse(opts.body);
    if(rows.has(record.entry_id))return {ok:false,status:409,json:async()=>({})};
    rows.set(record.entry_id,record);posts++;
    return {ok:true,status:201,json:async()=>[record]};
   }
   let matches=[...rows.values()],params=u.searchParams;
   for(const key of ['entry_id','continuity_root_id','worldline_id','event_kind']){
    const v=params.get(key);
    if(v?.startsWith('eq.'))matches=matches.filter(x=>x[key]===v.slice(3));
   }
   const cutoff=params.get('assertion_time');
   if(cutoff?.startsWith('lte.'))
    matches=matches.filter(x=>Date.parse(x.assertion_time)<=Date.parse(cutoff.slice(4)));
   const order=params.get('order');
   if(order){
    const rules=order.split(',').map(s=>s.split('.'));
    matches.sort((a,b)=>{
     for(const [key,direction='asc'] of rules){
      const comparison=String(a[key]??'').localeCompare(String(b[key]??''));
      if(comparison)return direction==='desc'?-comparison:comparison;
     }
     return 0;
    });
   }
   const start=Number(params.get('offset')||0),limit=Number(params.get('limit')||10000);
   return {ok:true,status:200,json:async()=>matches.slice(start,start+limit)};
  },
 };
}
function verifier(){
 return {async verify({observation,authenticatedPrincipalId,continuityRootId,worldlineId}){
  return {verified:true,independent:true,principal_id:authenticatedPrincipalId,
   continuity_root_id:continuityRootId,worldline_id:worldlineId,
   observation_id:observation.observation_id,
   observation_hash:observation.observation_hash,
   source_record_id:observation.source_record_id,
   source:observation.source,
   verification_ref:'mock:immutable-source:'+observation.observation_hash};
 }};
}
test('100 evolving observations of the same invoice survive immutable storage and multi-page historical replay',async()=>{
 const store=database(),all=[];
 for(let i=0;i<100;i++){
  const observation=obs(i);all.push(observation);
  const accepted=await admitTrustedObservation({
   observation,continuityRootId:root,worldlineId:'reality:primary',
   authenticatedPrincipalId:'principal:owner',sourceVerifier:verifier(),
   fetchImpl:store.fetchImpl,
  });
  assert.equal(accepted.status,'ADMITTED_VERIFIED_SOURCE_READBACK');
  assert.equal(accepted.authority_granted,false);
  assert.equal(store.rows.get(accepted.entry_id).payload.observation.observation_hash,
   observation.observation_hash);
 }
 assert.equal(new Set(all.map(x=>x.observation_id)).size,100);
 assert.equal(store.rows.size,100);
 assert.equal(store.posts,100);
 const history=await retrieveCompleteContinuityHistory({
  continuityRootId:root,worldlineId:'reality:primary',
  snapshotAssertionTime:at(110),
  pageSize:13,maxEntries:150,fetchImpl:store.fetchImpl,
 });
 assert.equal(history.status,'COMPLETE_AT_SNAPSHOT');
 assert.equal(history.count,100);
 assert.equal(history.pages_read>7,true);
 assert.equal(new Set(history.entries.map(x=>x.entry_id)).size,100);
 const scoped=history.entries.map(x=>x.payload.observation);
 const change=inspectEpistemicDifferences({observations:scoped});
 assert.equal(change.typed_claims_examined,100);
 assert.equal(change.contradictions.length,0);
 assert.equal(change.epistemic_discrepancies.filter(x=>x.classification==='E_DELTA').length,99);
 const repeat=await retrieveCompleteContinuityHistory({
  continuityRootId:root,worldlineId:'reality:primary',
  snapshotAssertionTime:at(110),
  pageSize:27,maxEntries:150,fetchImpl:store.fetchImpl,
 });
 assert.equal(repeat.history_hash,history.history_hash);
});
test('tampering with one historical observation is detected during multi-page scan',async()=>{
 const store=database();
 for(let i=0;i<28;i++){
  await admitTrustedObservation({
   observation:obs(i),continuityRootId:root,
   authenticatedPrincipalId:'principal:owner',sourceVerifier:verifier(),
   fetchImpl:store.fetchImpl,
  });
 }
 const target=[...store.rows.values()][17];
 store.rows.set(target.entry_id,{...target,payload:{observation:obs(17),tampered:'yes'}});
 await assert.rejects(()=>retrieveCompleteContinuityHistory({
  continuityRootId:root,worldlineId:'reality:primary',
  snapshotAssertionTime:at(110),pageSize:7,maxEntries:100,fetchImpl:store.fetchImpl,
 }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});
