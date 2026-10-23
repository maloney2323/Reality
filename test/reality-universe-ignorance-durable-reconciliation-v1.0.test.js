import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {createUniverseEntry,validateUniverseEntry}
 from '../src/reality-universe-persistence-contract-v1.0.js';
import {TRUSTED_OBSERVATION_ADMISSION_VERSION as TRUSTED}
 from '../src/reality-trusted-observation-admission-v0.1.js';
import {recordVerifiedIgnoranceInUniverse}
 from '../src/reality-universe-ignorance-durable-reconciliation-v1.0.js';

const root='pilot:juan:owned',world='reality:primary';
const scope={continuity_root_id:root,worldline_id:world,
 entity_ref:'job:WR-41',state_key:'inspection.status',as_of:'2026-10-23T19:00:00.000Z'};
const principalId='principal:juan';
function sample(id,value,extra={}){
 const obs=createObservation({
  source:id,domain:'BUSINESS',sourceRecordId:id,
  observedAt:extra.observedAt||'2026-10-23T17:00:00Z',
  eventTime:extra.eventTime||'2026-10-23T16:00:00Z',
  eventType:'INSPECTION_STATUS_RECORD',objectRefs:[scope.entity_ref],
  provenance:{continuity_root_id:extra.root||root},
  contentOrMetadata:{epistemic_claims:[
   {target_state_key:'inspection.status',claim_kind:'FACT',value}]},
 });
 return createUniverseEntry({
  entry_id:'source:'+id,continuity_root_id:extra.root||root,
  worldline_id:world,event_kind:'SOURCE_OBSERVATION',
  epistemic_kind:'OBSERVATION',assertion_time:obs.observed_at,
  effective_time:obs.event_time,source_ref:obs.source,
  payload:{observation:obs,source_attestation:{
    independently_source_read:extra.attested!==false,
    verification_ref:'verified-read:'+id,observation_hash:obs.observation_hash}},
  evidence_references:['verified-read:'+id],
  provenance:{source:extra.trusted===false?'USER_CONTEXT':TRUSTED},
 });
}
function harness(rows=[],extra={}){
 const sources=new Map(rows.map(x=>[x.entry_id,x]));
 const stored=new Map();const calls={principal:0,source:0,append:0,readback:0};
 const principalScopeVerifier={
  verify:async ({authenticatedPrincipalId,continuityRootId,worldlineId})=>{
   calls.principal++;
   return extra.unauthorized?{verified:false}:{
    verified:true,independent:true,principal_id:authenticatedPrincipalId,
    continuity_root_id:continuityRootId,worldline_id:worldlineId,
    allow_record_ignorance:true,verification_ref:'trusted-session-identity:juan',
   };
  },
 };
 const loadSource=async({entryId})=>{calls.source++;
  if(!sources.has(entryId))throw Error('MISSING_SOURCE_ENTRY');
  return sources.get(entryId);
 };
 const append=async(entry)=>{calls.append++;
  validateUniverseEntry(entry);
  if(extra.failAppend)throw Error('APPEND_FAILED');
  if(stored.has(entry.entry_id)){
   return {status:'DUPLICATE_IDENTICAL',entry:stored.get(entry.entry_id)};
  }
  stored.set(entry.entry_id,entry);
  return {status:'PERSISTED',entry};
 };
 const readBack=async({entryId})=>{calls.readback++;
  const entry=stored.get(entryId);
  if(extra.corruptReadback)return {...entry,payload:{evil:true}};
  if(extra.missingReadback)throw Error('PERSISTED_ENTRY_MISSING');
  return entry;
 };
 const run=(patch={})=>recordVerifiedIgnoranceInUniverse({
  authenticatedPrincipalId:principalId,scope,
  sourceEntryIds:rows.map(x=>x.entry_id),
  requiredValue:'PASSED',requiredEvidenceKind:'AUTHENTICATED_CITY_INSPECTOR_PASS',
  requiredEvidence:'Independently verify inspection PASS on authenticated city record',
  consequentialActions:['DISPATCH_INSTALLATION_CREW'],
  discoveryProbe:{operation:'GET_INSPECTION_STATUS',access:'READ_ONLY'},
  principalScopeVerifier,loadSource,append,readBack,...patch,
 });
 return {calls,run,stored};
}
test('conflicting city/crew claims append exactly one immutable Universe gap with separate readback',async()=>{
 const {run,calls,stored}=harness([sample('CREW','PASSED'),sample('CITY','PENDING')]);
 const result=await run();
 assert.equal(result.status,'VERIFIED_APPEND_READBACK');
 assert.equal(result.epistemic_state,'CONFLICTING');
 assert.equal(result.source_readback_entry_ids.length,2);
 assert.equal(result.effect_gate_changed,false);
 assert.equal(result.automatic_capability_upgrade,false);
 assert.equal(result.external_tool_action_executed,false);
 assert.deepEqual(calls,{principal:1,source:2,append:1,readback:1});
 assert.equal(stored.size,1);
 const entry=[...stored.values()][0];
 assert.equal(entry.epistemic_kind,'UNCERTAINTY');
 assert.equal(entry.payload.manifest.customer_action_authorized,false);
 assert.equal(entry.payload.manifest.permitted_intelligence.includes('DRAFT'),true);
 assert.match(result.reconciliation_receipt_hash,/^sha256:[0-9a-f]{64}$/);
});
test('replaying same request is idempotent, never changes original conflict records',async()=>{
 const rows=[sample('CREW','PASSED'),sample('CITY','PENDING')];
 const {run,stored}=harness(rows);
 const a=await run(),b=await run();
 assert.equal(a.entry_id,b.entry_id);
 assert.equal(a.ledger_entry_hash,b.ledger_entry_hash);
 assert.equal(b.append_status,'DUPLICATE_IDENTICAL');
 assert.equal(stored.size,1);
 assert.equal(rows[0].payload.observation.content_or_metadata.epistemic_claims[0].value,'PASSED');
});
test('no source means UNKNOWN persists only after session verification and explicit missing evidence',async()=>{
 const {run,stored}=harness([]);
 const r=await run();
 assert.equal(r.epistemic_state,'UNKNOWN');
 assert.equal(stored.size,1);
 assert.deepEqual([...stored.values()][0].payload.manifest.supporting_sources,[]);
});
test('cross-tenant entries rejected without an append',async()=>{
 const {run,calls}=harness([sample('CROSS','PASSED',{root:'pilot:attacker'})]);
 await assert.rejects(run(),/IGNORANCE_SOURCE_OUT_OF_SCOPE_OR_NOT_OBSERVATION/);
 assert.equal(calls.append,0);
});
test('untrusted sources and altered hashes fail without creating false evidence',async()=>{
 for(const s of [sample('BAD','PASSED',{trusted:false}),
  sample('UNATTESTED','PASSED',{attested:false}),
  {...sample('BROKEN','PASSED'),payload:{fake:true}}]){
   const {run,calls}=harness([s]);
   await assert.rejects(run());
   assert.equal(calls.append,0);
 }
});
test('trusted scope verifier is required even when manifest inputs sound correct',async()=>{
 const {run,calls}=harness([sample('CITY','PENDING')],{unauthorized:true});
 await assert.rejects(run(),/IGNORANCE_PRINCIPAL_SCOPE_NOT_VERIFIED/);
 assert.equal(calls.source,0);
 assert.equal(calls.append,0);
 await assert.rejects(run({principalScopeVerifier:null}),
   /IGNORANCE_TRUSTED_IDENTITY_VERIFIER_REQUIRED/);
});
test('mismatched or tampered readback cannot claim durable persistence',async()=>{
 const {run,calls}=harness([sample('CITY','PENDING')],{corruptReadback:true});
 await assert.rejects(run(),/UNIVERSE_LEDGER_HASH_MISMATCH/);
 assert.equal(calls.append,1);
 assert.equal(calls.readback,1);
});
test('a failed append cannot be reported as a saved manifest',async()=>{
 const {run,calls}=harness([],{failAppend:true});
 await assert.rejects(run(),/APPEND_FAILED/);
 assert.equal(calls.readback,0);
});
test('cross-workline sources are rejected, even with same entity and text',async()=>{
 const wrong={...sample('CITY','PASSED')};
 const alternate=createUniverseEntry({...wrong,worldline_id:'reality:foreign'});
 const {run,calls}=harness([alternate]);
 await assert.rejects(run(),/IGNORANCE_SOURCE_OUT_OF_SCOPE_OR_NOT_OBSERVATION/);
 assert.equal(calls.append,0);
});
test('untrusted browser cannot inject write-capable discovery permission',async()=>{
 const {run,calls}=harness([]);
 await assert.rejects(run({discoveryProbe:{operation:'SEND_EMAIL',access:'WRITE',authorized:true}}),
  /IGNORANCE_DISCOVERY_PROBE_NOT_PROVEN_SAFE/);
 assert.equal(calls.append,0);
});
