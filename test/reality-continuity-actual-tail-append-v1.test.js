import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversePostgresPersistence}
 from '../src/reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';

const spine=createContinuitySpine({
 continuityRootId:'reality:tail-order:regression',
 worldlineId:'reality:tail-order:regression',
 subjectId:'22222222-2222-4222-8222-222222222222',
});
const base=appendContinuityNode({spine,stage:'RAW_SIGNAL',
 entityId:'work:regression',eventId:'33333333-3333-4333-8333-333333333333',
 effectiveTime:'2026-11-01T07:41:25.584Z',
 assertionTime:'2026-11-01T07:41:25.584Z',
 payload:{kind:'parent'}});
const laterChild=appendContinuityNode({spine,stage:'OBSERVATION',
 entityId:'work:regression',eventId:'44444444-4444-4444-8444-444444444444',
 parentEventId:base.event_id,priorLineageHash:base.lineage_hash,
 effectiveTime:'2026-11-01T07:41:19.262Z',
 assertionTime:'2026-11-01T07:41:19.262Z',
 payload:{kind:'actual-tip'}});
function provider(rows){
 const writes=[],seen=[];
 const fetchImpl=async(url,options={})=>{
  const parsed=new URL(url);
  const q=parsed.searchParams;
  const method=options.method||'GET';
  seen.push({method,path:parsed.pathname,query:String(q)});
  if(method==='POST'){
   const body=JSON.parse(options.body);
   writes.push(body);
   return {ok:true,status:201,text:async()=>JSON.stringify([body])};
  }
  let results=[];
  if(q.has('event_id'))results=[];
  else if(q.has('select')){
   const offset=Number(q.get('offset')||0),limit=Number(q.get('limit')||400);
   results=rows.slice(offset,offset+limit);
  }else throw Error('Unexpected GET '+url);
  return {ok:true,status:200,text:async()=>JSON.stringify(results)};
 };
 return {writes,seen,store:createUniversePostgresPersistence({
  url:'https://test.supabase.co',secretKey:'test-only-secret',
  strictSecrets:true,fetchImpl})};
}
function next(){
 return appendContinuityNode({spine,stage:'OBSERVATION',
  entityId:'work:regression',eventId:'55555555-5555-4555-8555-555555555555',
  parentEventId:laterChild.event_id,priorLineageHash:laterChild.lineage_hash,
  effectiveTime:'2026-11-01T07:42:00.000Z',
  assertionTime:'2026-11-01T07:42:00.000Z',
  payload:{kind:'checkpoint'}});
}
test('timestamp inversion never selects an ancestor as append tail',async()=>{
 const p=provider([base,laterChild]);
 const result=await p.store.appendEvent({...next(),entity_type:'reality_general_constitutional_checkpoint'});
 assert.equal(result.status,'PERSISTED');
 assert.equal(p.writes.length,1);
 assert.equal(p.writes[0].parent_event_id,laterChild.event_id);
 assert.equal(p.writes[0].provenance.continuity_spine.prior_lineage_hash,laterChild.lineage_hash);
});
test('forked and missing-parent histories fail closed before writes',async()=>{
 const fork=appendContinuityNode({spine,stage:'OBSERVATION',
  entityId:'work:regression',eventId:'66666666-6666-4666-8666-666666666666',
  parentEventId:base.event_id,priorLineageHash:base.lineage_hash,
  effectiveTime:'2026-11-01T07:41:23.000Z',
  assertionTime:'2026-11-01T07:41:23.000Z',
  payload:{kind:'other-tip'}});
 const a=provider([base,laterChild,fork]);
 await assert.rejects(a.store.appendEvent({...next(),entity_type:'x'}),
  /CONTINUITY_TAIL_FORKED/);
 assert.equal(a.writes.length,0);
 const b=provider([laterChild]);
 await assert.rejects(b.store.appendEvent({...next(),entity_type:'x'}),
  /CONTINUITY_TAIL_PARENT_MISSING/);
 assert.equal(b.writes.length,0);
});
test('lineage tip selection pages past PostgREST row limits',async()=>{
 const n=401;
 const rows=Array.from({length:n},(_,i)=>({
  event_id:'event-'+i,
  parent_event_id:i?'event-'+(i-1):null,
  lineage_hash:'hash-'+i,
 }));
 const p=provider(rows);
 await assert.rejects(p.store.appendEvent({...next(),entity_type:'x'}),
  /CONTINUITY_APPEND_NOT_TAIL/);
 const pageRequests=p.seen.filter(x=>x.query.includes('select='));
 assert.equal(pageRequests.length,2);
 assert.equal(p.writes.length,0);
});
