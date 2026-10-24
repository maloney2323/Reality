import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDrift,proposeDriftRecovery,verifyDriftRecovery,gradeDriftCases,persistDriftRecoveryReceipt}
  from '../src/reality-drift-recovery-v0.1.js';

import {buildConstructionDriftFixtures} from '../src/reality-drift-adversarial-fixture-v0.1.js';

const world='construction:site-a';
function snapshot(turn=1){
  return {
    world_id:world,as_of:'2026-10-24T14:00:00Z',
    facts:[
      {key:'estimate_approved',value:false,world_id:world,evidence_ref:'homeowner:approval:not_received:'+turn},
      {key:'cabinet_delivery_date',value:'2026-10-27',world_id:world,evidence_ref:'supplier:delivery:update:'+turn},
      {key:'sink_color',value:'UNRESOLVED',world_id:world,evidence_ref:'site:open_question:'+turn},
    ],
    obligations:[
      {id:'never_send_estimate_before_approval',active:true,world_id:world,evidence_ref:'policy:owner_instruction'},
      {id:'verify_delivery_before_promising_install',active:true,world_id:world,evidence_ref:'policy:delivery_commitment'},
    ],
    authorities:[],receipts:[],
  };
}
function candidate(s=snapshot()){
  return {
    world_id:s.world_id,scope:'OPERATIONAL',
    carried_obligation_ids:s.obligations.filter(o=>o.active).map(o=>o.id),
    claims:s.facts.map(f=>({key:f.key,value:f.value,evidence_refs:[f.evidence_ref]})),
    actions:[],
  };
}
function inspect(s,c){
  const before=assessDrift({trustedSnapshot:s,candidate:c});
  const m=proposeDriftRecovery({trustedSnapshot:s,candidate:c,assessment:before});
  return {before,manifest:m,proof:verifyDriftRecovery({trustedSnapshot:s,manifest:m})};
}
test('clean claims plus active obligations remain clean',()=>{
 const r=inspect(snapshot(),candidate());assert.equal(r.before.status,'NO_TYPED_DRIFT_DETECTED');
 assert.equal(r.proof.corrected,false);
});
test('changed homeowner approval is detected and restored to trusted evidence',()=>{
 const s=snapshot(),c=candidate(s);c.claims[0].value=true;
 const r=inspect(s,c);assert.ok(r.before.codes.includes('FACT_DRIFT'));
 assert.equal(r.proof.verdict,'STRUCTURAL_RECOVERY_VERIFIED');
 assert.equal(r.manifest.original.claims[0].value,true);
 assert.equal(r.manifest.proposed.claims[0].value,false);
});
test('forgotten no-estimate instruction rehydrated without granting authority',()=>{
 const s=snapshot(),c=candidate(s);c.carried_obligation_ids=[];
 const r=inspect(s,c);assert.ok(r.before.codes.includes('OBLIGATION_LOSS'));
 assert.equal(r.proof.corrected,true);
 assert.equal(r.proof.external_action_permitted,false);
});
test('fabricated citation reattached to real source',()=>{
 const s=snapshot(),c=candidate(s);c.claims[1].evidence_refs=['fake:receipt'];
 const r=inspect(s,c);assert.ok(r.before.codes.includes('EVIDENCE_PROVENANCE_DRIFT'));
 assert.deepEqual(r.manifest.proposed.claims[1].evidence_refs,['supplier:delivery:update:1']);
});
test('invented customer price is quarantined instead of upgraded to fact',()=>{
 const s=snapshot(),c=candidate(s);c.claims.push({key:'customer_price',value:40000,evidence_refs:['fake']});
 const r=inspect(s,c);assert.ok(r.before.codes.includes('UNSUPPORTED_CLAIM'));
 assert.equal(r.manifest.proposed.claims.find(x=>x.key==='customer_price'),undefined);
 assert.ok(r.manifest.changes.some(x=>x.type==='QUARANTINE_UNSUPPORTED_CLAIM'));
});
test('unauthorized estimate action blocked instead of executed',()=>{
 const s=snapshot(),c=candidate(s);
 c.actions=[{action_id:'send-estimate',action_type:'send',target:'homeowner-a',status:'EXECUTING',authority_ref:'model-approval'}];
 const r=inspect(s,c);assert.ok(r.before.codes.includes('AUTHORITY_ESCALATION'));
 assert.equal(r.manifest.proposed.actions[0].status,'BLOCKED_PENDING_AUTHORITY_OR_VERIFICATION');
 assert.equal(r.proof.corrected,true);
});
test('fabricated completion blocked until independent outcome exists',()=>{
 const s=snapshot(),c=candidate(s);
 s.authorities=[{id:'owner:scope:estimate',active:true,world_id:world,action_id:'send-estimate',action_type:'send',target:'homeowner-a'}];
 c.actions=[{action_id:'send-estimate',action_type:'send',target:'homeowner-a',status:'COMPLETED',
  authority_ref:'owner:scope:estimate',verification_ref:'model:verified'}];
 const r=inspect(s,c);assert.ok(r.before.codes.includes('FALSE_COMPLETION'));
 assert.equal(r.proof.corrected,true);assert.equal(r.proof.independent_outcome_verified,false);
});
test('an independently verified receipt with correct scoped authority is not hallucination',()=>{
 const s=snapshot(),c=candidate(s);
 s.authorities=[{id:'owner:send-a',active:true,world_id:world,action_id:'send-estimate',action_type:'send',target:'homeowner-a'}];
 s.receipts=[{id:'receipt:readback-a',independent:true,verified:true,world_id:world,action_id:'send-estimate',target:'homeowner-a'}];
 c.actions=[{action_id:'send-estimate',action_type:'send',target:'homeowner-a',status:'COMPLETED',
 authority_ref:'owner:send-a',verification_ref:'receipt:readback-a'}];
 assert.equal(inspect(s,c).before.detected_count,0);
});
test('cross-customer world mismatch cannot be silently rewritten',()=>{
 const s=snapshot(),c=candidate(s);c.world_id='construction:site-b';
 const r=inspect(s,c);assert.ok(r.before.codes.includes('WORLD_SCOPE_DRIFT'));
 assert.equal(r.manifest.status,'BLOCKED_SCOPE_RECONCILIATION');
 assert.equal(r.proof.verdict,'BLOCKED');
});
test('unresolved trusted fact version conflict fails closed',()=>{
 const s=snapshot(),c=candidate(s);s.facts.push({...s.facts[0],value:true});
 assert.throws(()=>assessDrift({trustedSnapshot:s,candidate:c}),/UNRESOLVED_FACT_VERSION_CONFLICT/);
});
test('no trusted evidence means no arbitrary model-based correction',()=>{
 const s=snapshot(),c=candidate(s);s.facts[0].evidence_ref='';
 assert.throws(()=>assessDrift({trustedSnapshot:s,candidate:c}),/TRUSTED_EVIDENCE_REF_REQUIRED/);
});
test('stale recovery manifest is not accepted after trusted facts change',()=>{
 const s=snapshot(),c=candidate(s);c.claims[0].value=true;
 const m=proposeDriftRecovery({trustedSnapshot:s,candidate:c});
 s.facts[0].value=true;
 assert.throws(()=>verifyDriftRecovery({trustedSnapshot:s,manifest:m}),/RECOVERY_BASELINE_MISMATCH/);
});
test('100-position deterministic construction gauntlet: distinguish detect, repair, and block',()=>{
 const report=gradeDriftCases(buildConstructionDriftFixtures());
 assert.equal(report.cases,100);
 assert.equal(report.confusion.tp,80);
 assert.equal(report.confusion.tn,20);
 assert.equal(report.confusion.fp,0);
 assert.equal(report.confusion.fn,0);
 assert.equal(report.recovered,70);
 assert.equal(report.residual_structured_drift_pct,12.5);
 assert.equal(report.unauthorized_actions,0);
 assert.equal(report.results.filter(x=>x.recovery==='BLOCKED').length,10);
});

test('persisted recovery receipt is only confirmed after exact readback',async()=>{
 const s=snapshot(),c=candidate(s);c.claims[0].value=true;
 const manifest=proposeDriftRecovery({trustedSnapshot:s,candidate:c});
 const events=[];
 const persistence={
  appendEvent:async event=>{events.push(structuredClone(event));},
  reconstruct:async()=>structuredClone(events),
 };
 const saved=await persistDriftRecoveryReceipt({
  persistence,continuityRootId:'root:construction',worldlineId:'line:construction',
  eventId:'drift:receipt:1',trustedSnapshot:s,manifest,
 });
 assert.equal(saved.persisted,true);
 assert.equal(saved.readback_verified,true);
 assert.equal(saved.external_effects_executed,false);
 assert.equal(events[0].entity_type,'drift_recovery_receipt');
 assert.equal(events[0].payload.independent_outcome_verified,false);
});
test('ledger write alone is never counted as verified recovery',async()=>{
 const s=snapshot(),c=candidate(s);c.claims[0].value=true;
 const m=proposeDriftRecovery({trustedSnapshot:s,candidate:c});
 await assert.rejects(()=>persistDriftRecoveryReceipt({
  persistence:{appendEvent:async()=>({status:'PERSISTED'}),reconstruct:async()=>[]},
  continuityRootId:'r',worldlineId:'w',eventId:'drift:no-readback',
  trustedSnapshot:s,manifest:m,
 }),/DRIFT_RECEIPT_READBACK_UNVERIFIED/);
});
test('a repeated prior mistake is detected on a later turn, not erased by prior recovery',()=>{
 const s=snapshot(),prior=candidate(s);prior.claims[0].value=true;
 const first=inspect(s,prior);
 assert.equal(first.proof.corrected,true);
 const later=structuredClone(first.manifest.proposed);
 later.claims[0].value=true;
 const again=inspect(s,later);
 assert.ok(again.before.codes.includes('FACT_DRIFT'));
 assert.equal(again.proof.corrected,true);
 assert.equal(first.manifest.original.claims[0].value,true);
});
