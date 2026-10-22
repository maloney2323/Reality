
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {persistUniverseEntry} from '../src/reality-native-universe-persistence-v1.0.js';
process.env.REALITY_UNIVERSE_PERSISTENCE_KEY ||= 'test-key-only';
const date='2026-10-22T12:00:00Z';
const event=(amount,id='invoice:17')=>createUniverseEntry({
 entry_id:id,continuity_root_id:'customer:17',worldline_id:'reality:primary',
 event_kind:'OBSERVATION',epistemic_kind:'OBSERVATION',
 assertion_time:date,effective_time:date,source_ref:'synthetic:invoice',
 payload:{amount},evidence_references:[],provenance:{source:'synthetic:test'},
});
function database({initial=[],noReadback=false,alterEcho=false,alterStored=false,down=false,race=false}={}){
 const records=new Map(initial.map(e=>[e.entry_id,e]));
 const operations=[],pendingReads=[];
 let posts=0,gets=0,barrier=null,open=null;
 if(race)barrier=new Promise(r=>{open=r});
 async function fetchImpl(url,opt={}){
  const u=new URL(url),method=opt.method||'GET';
  if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))throw Error('TEST_WRONG_ROUTE');
  operations.push(method);
  if(method==='GET'){
   gets++;
   const requested=u.searchParams.get('entry_id')?.slice(3);
   // Two initial GETs both see absence; a DB uniqueness constraint decides.
   if(race&&pendingReads.length<2){
    pendingReads.push(requested);
    if(pendingReads.length===2)open();
    await barrier;
    return {ok:true,status:200,json:async()=>[]};
   }
   if(noReadback&&posts>0)return {ok:true,status:200,json:async()=>[]};
   let row=records.get(requested);
   if(alterStored&&posts>0&&row)row={...row,payload:{amount:123456}};
   return {ok:true,status:200,json:async()=>row?[row]:[]};
  }
  if(method==='POST'){
   if(down)return {ok:false,status:503,json:async()=>({error:'offline'})};
   posts++;
   const row=JSON.parse(opt.body);
   if(records.has(row.entry_id))return {ok:false,status:409,json:async()=>({code:'23505'})};
   records.set(row.entry_id,row);
   return {ok:true,status:201,json:async()=>[alterEcho?{...row,ledger_entry_hash:'fake'}:row]};
  }
  throw Error('TEST_WRONG_METHOD');
 }
 return {fetchImpl,records,operations,get posts(){return posts},get gets(){return gets}};
}
test('immutable event write requires an independent matching readback',async()=>{
 const store=database(),e=event(90);
 const saved=await persistUniverseEntry(e,{fetchImpl:store.fetchImpl});
 assert.equal(saved.status,'PERSISTED');
 assert.deepEqual(saved.entry,e);
 assert.equal(store.gets,2);
 assert.equal(store.posts,1);
});
test('forged input is rejected before touching database',async()=>{
 const store=database();
 await assert.rejects(()=>persistUniverseEntry({...event(90),payload:{amount:100}},
 {fetchImpl:store.fetchImpl}),/UNIVERSE_LEDGER_HASH_MISMATCH/);
 assert.deepEqual(store.operations,[]);
});
test('missing post-write durable readback fails instead of claiming saved',async()=>{
 const store=database({noReadback:true});
 await assert.rejects(()=>persistUniverseEntry(event(90),{fetchImpl:store.fetchImpl}),
 /UNIVERSE_WRITE_READBACK_NOT_UNIQUE/);
});
test('forged returned row and tampered independently read row are both rejected',async()=>{
 await assert.rejects(()=>persistUniverseEntry(event(90),{
  fetchImpl:database({alterEcho:true}).fetchImpl
 }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
 await assert.rejects(()=>persistUniverseEntry(event(90),{
  fetchImpl:database({alterStored:true}).fetchImpl
 }),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});
test('retries of the exact same durable ID are idempotent',async()=>{
 const store=database(),e=event(90);
 await persistUniverseEntry(e,{fetchImpl:store.fetchImpl});
 const repeated=await persistUniverseEntry(e,{fetchImpl:store.fetchImpl});
 assert.equal(repeated.status,'DUPLICATE_IDENTICAL');
 assert.equal(store.records.size,1);
 assert.equal(store.posts,1);
});
test('same ID with different contents never mutates original ledger',async()=>{
 const prior=event(90,'collision'),store=database({initial:[prior]});
 await assert.rejects(()=>persistUniverseEntry(event(100,'collision'),{
  fetchImpl:store.fetchImpl
 }),/UNIVERSE_IMMUTABLE_ENTRY_VIOLATION/);
 assert.deepEqual(store.records.get('collision'),prior);
});
test('two concurrent identical writes resolve via database uniqueness + readback',async()=>{
 const store=database({race:true}),e=event(90);
 const results=await Promise.all([
  persistUniverseEntry(e,{fetchImpl:store.fetchImpl}),
  persistUniverseEntry(e,{fetchImpl:store.fetchImpl}),
 ]);
 assert.deepEqual(results.map(x=>x.status).sort(),
  ['DUPLICATE_IDENTICAL_CONCURRENT','PERSISTED']);
 assert.equal(store.records.size,1);
});
test('two concurrent conflicting writes cannot both be verified',async()=>{
 const store=database({race:true});
 const results=await Promise.allSettled([
  persistUniverseEntry(event(90,'race'),{fetchImpl:store.fetchImpl}),
  persistUniverseEntry(event(100,'race'),{fetchImpl:store.fetchImpl}),
 ]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(results.filter(x=>x.status==='rejected').length,1);
 assert.match(String(results.find(x=>x.status==='rejected').reason),/UNIVERSE_IMMUTABLE_ENTRY_VIOLATION/);
 assert.equal(store.records.size,1);
});
test('primary storage outage never yields a verified write',async()=>{
 const store=database({down:true});
 await assert.rejects(()=>persistUniverseEntry(event(90),{
  fetchImpl:store.fetchImpl
 }),/UNIVERSE_PERSISTENCE_UNAVAILABLE/);
 assert.equal(store.records.size,0);
});
