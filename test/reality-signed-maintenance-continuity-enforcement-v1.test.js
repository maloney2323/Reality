import test from 'node:test';
import assert from 'node:assert/strict';
import {enforceSignedMaintenanceReceiptContinuity}
 from '../src/reality-signed-maintenance-continuity-enforcement-v1.js';
import {orderContinuityHistory}
 from '../src/reality-continuous-reliability-v0.1.js';
import {readFileSync} from 'node:fs';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const maintenance='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const HASH=(n)=>'sha256:'+n.repeat(64);
const db={url:'https://isolated-benchmark.supabase.co',secretKey:'fixture-only',strictSecrets:true};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true'};
const gate={
 status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
 owner_id:owner,shift_id:shift,
 warrant_mode:'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
 read_only:true,installation_authorized:false,original_job_completed:false,
 original_work_id:'work:315562fe1bd66b30a48bb9be4f1d162a',
 source_ref:'https://github.com/maloney2323/Reality/pull/307',
 next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
 production_changed:false
};
const ready={
 status:'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY',
 owner_id:owner,shift_id:shift,maintenance_id:maintenance,
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 target_path:'src/reality-qualified-source-requalification-v1.js',
 target_branch:'reality/chat-direct-work-handoff-20261115',
 target_head_sha:'c'.repeat(40),expected_old_blob_sha:'b'.repeat(40),
 candidate_commit_sha:'6'.repeat(40),candidate_source_blob_sha:'a'.repeat(40),
 artifact_receipt_sha256:HASH('1'),case_ci_receipt_sha256:HASH('2'),
 target_review_receipt_sha256:HASH('3'),
 approval_id:null,approval_receipt_sha256:null,decision_state:null,
 owner_approval_ready:true,installation_authorized:false,
 repair_installed:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
};
const approved={...ready,
 status:'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED',
 approval_id:'11111111-2222-4333-8444-555555555555',
 approval_receipt_sha256:HASH('4'),decision_state:'APPROVED',
 owner_approval_ready:false,installation_authorized:true
};
function fixture(initial=ready){
 let card=initial,writes=0,failed=false;
 const events=[];
 const call=async(_db,name,p)=>{
  assert.equal(name,'reality_read_owner_signed_maintenance_install_decision_v1');
  assert.deepEqual(p,{p_owner_id:owner});
  return card;
 };
 const persistenceFactory=()=>({
  reconstruct:async()=>events.map(x=>({...x})),
  appendEvent:async n=>{
   if(failed)throw Error('PROVIDER_NOT_RELIABLE');
   writes++;
   events.push({...n,payload:structuredClone(n.payload),
    provenance:{...n.provenance,continuity_spine:{
     prior_lineage_hash:n.prior_lineage_hash,
     transformation_receipt_id:n.transformation_receipt_id
    }}
   });
   return {status:'PERSISTED'};
  }
 });
 const callLoop=(g=gate,e=env)=>enforceSignedMaintenanceReceiptContinuity({
  db,env:e,originalGate:g,shiftId:shift,
  call,persistenceFactory,now:()=> '2026-11-20T20:45:00.000Z'
 });
 return {events,callLoop,setCard:x=>{card=x},get writes(){return writes},
  failWrites:()=>{failed=true}};
}

test('independent target enters EXISTING hash-verified Spine; owner permission remains absent',async()=>{
 const f=fixture();
 const one=await f.callLoop();
 assert.equal(one.status,'CONTINUITY_VERIFIED_TARGET_AWAITING_OWNER_CLICK');
 assert.equal(one.continuity_committed,true);
 assert.equal(one.install_eligible_from_continuity,false);
 assert.equal(one.next_authorized_action,'AWAIT_EXACT_OWNER_APPROVAL');
 assert.equal(one.new_shift_started,false);
 assert.equal(f.writes,2,'one signed-warrant source + one verified target');
 assert.deepEqual(f.events.map(e=>e.event_kind),['RAW_SIGNAL','VERIFICATION']);
 assert.equal(f.events[1].payload.receipt_sha256,ready.target_review_receipt_sha256);
 assert.equal(f.events[1].payload.owner_id,owner);
 assert.equal(f.events[1].payload.shift_id,shift);
 assert.equal(orderContinuityHistory(f.events).length,2);
 const second=await f.callLoop();
 assert.equal(second.continuity_committed,true);
 assert.equal(second.newly_recorded_events,0,'same receipts must not create a new ledger branch');
 assert.equal(f.writes,2);
});
test('real independently read owner approval becomes hash-linked AUTHORITY before installer becomes eligible',async()=>{
 const f=fixture();
 await f.callLoop();
 f.setCard(approved);
 const result=await f.callLoop();
 assert.equal(result.status,'CONTINUITY_VERIFIED_APPROVAL_RECEIPTED_INSTALL_ELIGIBLE');
 assert.equal(result.install_eligible_from_continuity,true);
 assert.equal(result.next_authorized_action,'CONTINUE_PREVIOUSLY_APPROVED_EXACT_INSTALL');
 assert.equal(result.continuity_committed,true);
 assert.equal(f.events.length,3);
 const event=f.events[2];
 assert.equal(event.event_kind,'AUTHORITY');
 assert.equal(event.payload.receipt_sha256,approved.approval_receipt_sha256);
 assert.equal(event.payload.target_review_receipt_sha256,
  ready.target_review_receipt_sha256);
 assert.equal(event.payload.approval_id,approved.approval_id);
 assert.equal(event.parent_event_id,f.events[1].event_id);
 assert.equal(orderContinuityHistory(f.events).length,3);
 const repeated=await f.callLoop();
 assert.equal(repeated.newly_recorded_events,0);
 assert.equal(f.events.length,3);
});
test('owner-approved fence is read-only reconciliation, not a second write',async()=>{
 const f=fixture({...approved,decision_state:'FENCED'});
 const r=await f.callLoop();
 assert.equal(r.install_eligible_from_continuity,false);
 assert.equal(r.installer_reconcile_only_from_continuity,true);
 assert.equal(r.next_authorized_action,'GET_ONLY_RECONCILE_PREVIOUSLY_FENCED_INSTALL');
 assert.equal(f.events.length,3);
});
test('missing or forged source never acquires installation authority',async()=>{
 const cases=[
  {...approved,approval_receipt_sha256:null},
  {...approved,owner_id:'11111111-2222-4333-8444-555555555555'},
  {...approved,installation_authorized:false},
  {...approved,case_ci_receipt_sha256:'claimed'},
  {...approved,owner_approval_ready:true},
  {...approved,source_ref:'https://github.com/maloney2323/Reality/pull/999',target_path:'src/random.js'},
 ];
 for(const x of cases){
  const f=fixture(x);
  await assert.rejects(f.callLoop(),/SIGNED_CONTINUITY_/);
  assert.equal(f.events.length,0);
 }
 const f=fixture(approved);
 const r=await f.callLoop({...gate,installation_authorized:true});
 assert.equal(r.install_eligible_from_continuity,false);
 assert.equal(f.events.length,0);
 const production=await f.callLoop(gate,{...env,VERCEL_ENV:'production'});
 assert.equal(production.install_eligible_from_continuity,false);
 assert.equal(f.events.length,0);
});
test('Universe persistence failure or tampering refuses progression even after owner approval',async()=>{
 const unavailable=fixture(approved);
 unavailable.failWrites();
 await assert.rejects(unavailable.callLoop(),/PROVIDER_NOT_RELIABLE/);
 assert.equal(unavailable.events.length,0);
 const altered=fixture(ready);
 await altered.callLoop();
 altered.events[1].payload.receipt_sha256='sha256:'+'9'.repeat(64);
 altered.setCard(approved);
 await assert.rejects(altered.callLoop(),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
 assert.equal(altered.events.length,2);
});
test('worker must refuse automatic installation until canonical approval receipt readback succeeds',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const i=worker.indexOf('SIGNED_VERIFIED_MAINTENANCE_CONTINUITY_RECEIPT_ADMISSION');
 const j=worker.indexOf('EXACT_OWNER_APPROVED_MAINTENANCE_AUTOMATIC_INSTALL');
 assert.ok(i>=0&&j>i,'canonical continuity stage precedes installer');
 assert.match(worker,/signedMaintenanceCanonicalContinuity\.continuity_committed===true/);
 assert.match(worker,/signedMaintenanceCanonicalContinuity\.install_eligible_from_continuity===true/);
 assert.match(worker,/signedMaintenanceCanonicalContinuity\.installer_reconcile_only_from_continuity===true/);
 assert.match(worker,/signed_maintenance_canonical_continuity:signedMaintenanceCanonicalContinuity/);
 assert.doesNotMatch(worker,/source_installed:true,original_job_completed:true/);
});

test('independent install proof returns to Universe and carries next original work in same shift',async()=>{
 const verified={...approved,decision_state:'VERIFIED',
  repair_installed:true,installed_commit_sha:'d'.repeat(40),
  independent_postinstall_receipt_sha256:HASH('5'),
  independent_ci_run_id:44809001999,independent_vercel_check_id:981203};
 const f=fixture(verified);
 const x=await f.callLoop();
 assert.equal(x.status,'CONTINUITY_INDEPENDENT_REPAIR_VERIFIED_SAME_SHIFT_RECONCILED');
 assert.equal(x.verified_maintenance_repair_only,true);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.original_work_id,gate.original_work_id);
 assert.equal(x.next_authorized_action,gate.next_action);
 assert.equal(x.install_eligible_from_continuity,false);
 assert.deepEqual(f.events.map(e=>e.event_kind),[
  'RAW_SIGNAL','VERIFICATION','AUTHORITY','VERIFICATION','WORK'
 ]);
 assert.equal(f.events[3].payload.installed_commit_sha,verified.installed_commit_sha);
 assert.equal(f.events[3].payload.independent_ci_run_id,verified.independent_ci_run_id);
 assert.equal(f.events[3].payload.receipt_sha256,
  verified.independent_postinstall_receipt_sha256);
 assert.equal(f.events[4].payload.original_work_id,gate.original_work_id);
 assert.equal(f.events[4].payload.work_executed_by_classification,false);
 assert.equal(f.events[4].payload.original_customer_job_completed,false);
 assert.equal(orderContinuityHistory(f.events).length,5);
 const repeat=await f.callLoop();
 assert.equal(repeat.newly_recorded_events,0);
 assert.equal(f.events.length,5);
});
test('missing postinstall independent receipt fails closed instead of pretending original work resumed',async()=>{
 for(const v of [
  {...approved,decision_state:'VERIFIED',repair_installed:true},
  {...approved,decision_state:'VERIFIED',repair_installed:true,
   installed_commit_sha:'d'.repeat(40),
   independent_postinstall_receipt_sha256:HASH('5'),
   independent_ci_run_id:0,independent_vercel_check_id:981203}
 ]){
  const f=fixture(v);
  await assert.rejects(f.callLoop(),/SIGNED_CONTINUITY_INDEPENDENT_POSTINSTALL_RECEIPT_INCOMPLETE/);
  assert.equal(f.events.length,3,'only original signal, target and approval can be committed');
 }
});
test('signed worker reconciles independent repair receipt into Universe after verifier but before classifier',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const verification=worker.indexOf('EXACT_SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_VERIFICATION');
 const universe=worker.indexOf('SIGNED_MAINTENANCE_POSTINSTALL_UNIVERSE_RECONCILIATION');
 const classification=worker.indexOf('GOVERNED_CONTINUITY_VERIFIED_EVIDENCE_CLASSIFICATION');
 assert.ok(verification>=0&&universe>verification&&classification>universe);
 assert.match(worker,/signedMaintenanceIndependentPostinstall\.repair_verified===true/);
 assert.match(worker,/signed_maintenance_universe_postinstall_return:signedMaintenanceUniverseReconciliation/);
});
