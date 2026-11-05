import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyReadOnlyChatFork,resolvePrivateChatContinuity}
 from '../src/reality-private-chat-continuity-recovery-v1.js';
import {createContinuitySpine,continuityUuidFromSource,computeContinuityLineageHash}
 from '../src/reality-continuity-spine-v2.0.js';

const origin='personal:chat:'+'a'.repeat(64);
const principal='11111111-1111-4111-8111-111111111111';
const spine=createContinuitySpine({
 continuityRootId:origin,worldlineId:origin,subjectId:'test'
});
const stamp='2026-11-05T15:41:38.000Z';
function event(label,stage,parent=null,options={}){
 const id=continuityUuidFromSource('test:fork:'+label);
 const entityId=continuityUuidFromSource('test:entity:'+label);
 const provenance={source:'verified-fixture'};
 const prior=parent?.lineage_hash||null;
 const status=options.epistemicStatus||'OBSERVED';
 const payload=options.payload||{origin:label};
 const hash=computeContinuityLineageHash({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
  parentEventId:parent?.event_id||null,priorLineageHash:prior,
  stage,entityId,effectiveTime:stamp,assertionTime:stamp,
  epistemicStatus:status,payload,provenance,
 });
 return {
  event_id:id,parent_event_id:parent?.event_id||null,
  continuity_root_id:spine.continuity_root_id,worldline_id:spine.worldline_id,
  event_kind:stage,entity_id:entityId,epistemic_status:status,
  effective_time:stamp,assertion_time:stamp,payload,
  evidence_refs:[],lineage_hash:hash,
  provenance:{...provenance,continuity_spine:{
   prior_lineage_hash:prior,transformation_receipt_id:null}},
 };
}
const raw=event('raw','RAW_SIGNAL');
const transformation=event('transform','TRANSFORMATION',raw);
const observation=event('observe','OBSERVATION',transformation);
const verify=event('verification','VERIFICATION',observation,{
 epistemicStatus:'UNVERIFIED',payload:{external_action_executed:false},
});
const collided=event('next-raw','RAW_SIGNAL',observation);
const history=[verify,observation,collided,raw,transformation];
const args={rootId:spine.continuity_root_id,worldlineId:spine.worldline_id};

test('the observed 2-leaf fork is detected and both separate chains independently hash-verify',()=>{
 const a=verifyReadOnlyChatFork(history,args);
 assert.equal(a.status,'TWO_IMMUTABLE_TERMINAL_SIBLINGS_INDEPENDENTLY_VERIFIED');
 assert.equal(a.verified_event_count,5);
 assert.equal(a.independent_tip_hashes.length,2);
 assert.equal(a.parent_event_id,observation.event_id);
 assert.equal(a.prior_goal_authority_transferred,false);
 assert.equal(a.installation_authorized,false);
 assert.equal(a.external_execution_authorized,false);
 assert.equal(a.previous_history_modified,false);
 assert.deepEqual(history,[verify,observation,collided,raw,transformation]);
});
test('tampering either branch, weakening hash or changing parent cannot yield recovery',()=>{
 const tampered=[...history.map(x=>({...x}))];
 tampered[2]={...tampered[2],payload:{origin:'changed'}};
 assert.throws(()=>verifyReadOnlyChatFork(tampered,args),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
 const missing=history.filter(x=>x!==transformation);
 assert.throws(()=>verifyReadOnlyChatFork(missing,args),/CHAT_FORK_AUDIT_MISSING_PARENT/);
});
test('only exact non-authority terminal siblings are recoverable',()=>{
 const e=event('authority','AUTHORITY',observation);
 const actions=[verify,observation,e,raw,transformation];
 assert.throws(()=>verifyReadOnlyChatFork(actions,args),/CHAT_FORK_AUDIT_CONSEQUENTIAL_BRANCH/);
 const extra=event('third-tip','OBSERVATION',observation);
 assert.throws(()=>verifyReadOnlyChatFork([...history,extra],args),
  /CHAT_FORK_AUDIT_REQUIRES_TWO_TIPS/);
});
test('already-linear continuity is not reset and fork is never reported as clean',async()=>{
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push(url);
  const q=new URL(url).searchParams;
  assert.equal(q.get('continuity_root_id'),'eq.'+spine.continuity_root_id);
  return {ok:true,text:async()=>JSON.stringify([raw,transformation,observation])};
 };
 const resolved=await resolvePrivateChatContinuity({
  scopedRoot:origin,principalId:principal,
  db:{url:'https://example.supabase.co',secretKey:'secret-key'},
  fetchImpl
 });
 assert.equal(resolved.scopedRoot,origin);
 assert.equal(resolved.fork_recovery,null);
 assert.equal(calls.length,1);
});
test('fork recovery uses stable distinct root and independently verifies future recovery chain',async()=>{
 const calls=[];
 const fetchImpl=async(url)=>{
  calls.push(url);
  const root=new URL(url).searchParams.get('continuity_root_id');
  return {ok:true,text:async()=>JSON.stringify(root==='eq.'+spine.continuity_root_id?history:[])};
 };
 const p={scopedRoot:origin,principalId:principal,
   db:{url:'https://example.supabase.co',secretKey:'secret-key'},fetchImpl};
 const r1=await resolvePrivateChatContinuity(p);
 const r2=await resolvePrivateChatContinuity(p);
 assert.equal(r1.scopedRoot,r2.scopedRoot);
 assert.notEqual(r1.scopedRoot,origin);
 assert.match(r1.scopedRoot,/fork-recovery-v1:/);
 assert.equal(r1.fork_recovery.verified_event_count,5);
 assert.equal(r1.verified_prior_goal_cas.expected_revision,0);
 assert.equal(r1.verified_prior_goal_cas.expected_last_goal_event_id,null);
 assert.equal(r1.verified_prior_goal_cas.recovery_grants_execution_authority,false);
 assert.equal(calls.length,4);
});
test('Chat resolves fork before saving the next user message and blocks goal mutation',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../src/reality-continuity-spine-runtime-v0.1.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261105174000_chat_single_successor_preview.sql',import.meta.url),'utf8');
 assert.ok(api.indexOf('resolvePrivateChatContinuity(')<api.indexOf('recordPrivateMessage(session'));
 assert.match(api,/CHAT_FORK_GOAL_MUTATION_REQUIRES_INDEPENDENT_RECONCILIATION/);
 assert.match(api,/fork_recovery_audit:continuity.fork_recovery/);
 assert.match(api,/expectedRevision:continuity.verified_prior_goal_cas\?/);
 assert.match(api,/expectedLastEventId:continuity.verified_prior_goal_cas\?/);
 assert.match(runtime,/recoveryAudit.independent_tip_hashes.map\(x=>x.event_id\)/);
 assert.match(runtime,/orderContinuityHistory\(rows\)/);
 assert.match(runtime,/\['RAW_SIGNAL','TRANSFORMATION','OBSERVATION'\]/);
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS reality_universe_single_successor_preview_v1/);
 assert.match(sql,/CREATE UNIQUE INDEX IF NOT EXISTS reality_universe_single_genesis_preview_v1/);
});
