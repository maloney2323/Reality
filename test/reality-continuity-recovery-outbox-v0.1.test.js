
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {appendContinuityWithRecovery,replayContinuityOutbox} from '../src/reality-continuity-recovery-outbox-v0.1.js';
process.env.REALITY_UNIVERSE_PERSISTENCE_KEY ||= 'synthetic-test-key';
const at='2026-10-22T12:00:00Z', root='root:alice';
const makeEntry=(id,r=root)=>createUniverseEntry({
 entry_id:'continuity:'+id,continuity_root_id:r,worldline_id:'reality:primary',
 event_kind:'CONTINUITY_STATE_TRANSITION',epistemic_kind:'OBSERVATION',
 assertion_time:at,effective_time:at,source_ref:'test:source',
 payload:{continuity_state:'WAITING',work_item_id:id},
 evidence_references:[],provenance:{source:'synthetic'}
});
function outbox({durable=true,independent=true,readTampered=false,failFailure=false,failAppend=false}={}){
 const rows=new Map();
 return {durable,independent_from_primary_ledger:independent,rows,
  async append(r){
   if(failAppend)throw Error('OUTBOX_DOWN');
   if(!rows.has(r.event_id))rows.set(r.event_id,{...r,failures:[],status:'PENDING'});
  },
  async read(id){
   const v=rows.get(id);
   return v ? {...v,ledger_hash:readTampered?'forged':v.ledger_hash} : null;
  },
  async pending({continuityRootId,worldlineId,limit}){
   return [...rows.values()].filter(v=>v.status!=='ACKNOWLEDGED'&&v.root_id===continuityRootId&&v.worldline_id===worldlineId).slice(0,limit);
  },
  async recordFailure(id,e){
   if(failFailure)throw Error('FAILURE_STORAGE_DOWN');
   rows.get(id).failures.push(e);
  },
  async acknowledge(id,receipt){
   if(receipt.primary_ledger_hash!==rows.get(id).ledger_hash)
     throw Error('BAD_ACK_RECEIPT');
   rows.get(id).status='ACKNOWLEDGED';
  }
 };
}
function primary({online=false,failOnePostRead=false}={}){
 const rows=new Map(),o={online,rows,failOnePostRead};
 o.fetchImpl=async(url,opts={})=>{
  if(!o.online)throw Error('PRIMARY_DOWN');
  const u=new URL(url),method=opts.method||'GET';
  if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))throw Error('BAD_URL');
  if(method==='POST'){
   const entry=JSON.parse(opts.body);
   if(rows.has(entry.entry_id))throw Error('DUPLICATE_STORAGE');
   rows.set(entry.entry_id,entry);
   return {ok:true,status:201,json:async()=>[entry]};
  }
  if(o.failOnePostRead && rows.size){
   o.failOnePostRead=false;throw Error('POST_WRITE_READ_DOWN');
  }
  const v=u.searchParams.get('entry_id'),e=v?.startsWith('eq.')?rows.get(v.slice(3)):null;
  return {ok:true,status:200,json:async()=>e?[e]:[]};
 };
 return o;
}
test('requires independently durable outbox before any primary write',async()=>{
 const p=primary({online:true}),entry=makeEntry('x');
 for(const q of [null,outbox({durable:false}),outbox({independent:false}),outbox({failAppend:true}),outbox({readTampered:true})]){
  await assert.rejects(()=>appendContinuityWithRecovery({entry,outbox:q,fetchImpl:p.fetchImpl}),
   /DURABLE_OUTBOX_|OUTBOX_DOWN|OUTBOX_RECORD_INTEGRITY_FAILED/);
 }
 assert.equal(p.rows.size,0);
});
test('outage leaves durable pending; later replay verifies original and appends gap receipt',async()=>{
 const q=outbox(),p=primary(),entry=makeEntry('invoice:pending');
 const pending=await appendContinuityWithRecovery({entry,outbox:q,fetchImpl:p.fetchImpl,assertionTime:at});
 assert.equal(pending.status,'PENDING_DURABLE_REPLAY');
 assert.equal(pending.failure_record_verified,true);
 assert.equal(q.rows.get(entry.entry_id).status,'PENDING');
 p.online=true; // Recovery call represents a different process invocation.
 const replay=await replayContinuityOutbox({outbox:q,continuityRootId:root,fetchImpl:p.fetchImpl});
 assert.equal(replay.replayed,1);assert.equal(replay.pending,0);
 assert.equal(p.rows.size,2);
 assert.deepEqual(p.rows.get(entry.entry_id),entry);
 const gap=[...p.rows.values()].find(x=>x.event_kind==='CONTINUITY_RECOVERY_GAP');
 assert.equal(gap.payload.recovered_event_ledger_hash,entry.ledger_entry_hash);
 assert.equal(gap.payload.action_authorized,false);
 const again=await replayContinuityOutbox({outbox:q,continuityRootId:root,fetchImpl:p.fetchImpl});
 assert.equal(again.attempted,0);assert.equal(p.rows.size,2);
});
test('post-write unknown outcome is retried idempotently after readback fails',async()=>{
 const p=primary({online:true,failOnePostRead:true}),q=outbox(),entry=makeEntry('unknown');
 const v=await appendContinuityWithRecovery({entry,outbox:q,fetchImpl:p.fetchImpl,assertionTime:at});
 assert.equal(v.status,'PENDING_DURABLE_REPLAY');assert.equal(p.rows.size,1);
 const result=await replayContinuityOutbox({outbox:q,continuityRootId:root,fetchImpl:p.fetchImpl});
 assert.equal(result.replayed,1);assert.equal(p.rows.size,2);
 assert.equal([...p.rows.values()].filter(x=>x.entry_id===entry.entry_id).length,1);
});
test('multiple replay failures each receive append-only audit gap records',async()=>{
 const p=primary(),q=outbox(),entry=makeEntry('retry');
 await appendContinuityWithRecovery({entry,outbox:q,fetchImpl:p.fetchImpl,assertionTime:at});
 const fail=await replayContinuityOutbox({outbox:q,continuityRootId:root,fetchImpl:p.fetchImpl});
 assert.equal(fail.pending,1);assert.equal(q.rows.get(entry.entry_id).failures.length,2);
 p.online=true;const success=await replayContinuityOutbox({outbox:q,continuityRootId:root,fetchImpl:p.fetchImpl});
 assert.equal(success.replayed,1);
 assert.equal([...p.rows.values()].filter(x=>x.event_kind==='CONTINUITY_RECOVERY_GAP').length,2);
});
test('strict root isolation prevents other customer pending events from being replayed',async()=>{
 const p=primary(),q=outbox(),mine=makeEntry('a'),other=makeEntry('b','root:bob');
 for(const entry of [mine,other])await appendContinuityWithRecovery({
  entry,outbox:q,fetchImpl:p.fetchImpl,assertionTime:at
 });
 p.online=true;const r=await replayContinuityOutbox({outbox:q,continuityRootId:root,fetchImpl:p.fetchImpl});
 assert.equal(r.replayed,1);assert.equal(q.rows.get(other.entry_id).status,'PENDING');
 assert.equal(p.rows.has(other.entry_id),false);
});
test('unavailable error telemetry does not falsely claim confirmed gap preservation',async()=>{
 const p=primary(),q=outbox({failFailure:true});
 const r=await appendContinuityWithRecovery({entry:makeEntry('telemetry'),
  outbox:q,fetchImpl:p.fetchImpl,assertionTime:at});
 assert.equal(r.status,'PENDING_DURABLE_REPLAY');
 assert.equal(r.failure_record_verified,false);
 assert.equal(q.rows.size,1);
});
