import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertWakeIdentity,assessMaterialWakeDrift,mintDeliveryWarrant,
  verifyDeliveryWarrant,mayTransitionWake,WAKE_STATES}
 from '../src/reality-governed-execution-wake-protocol-v1.js';
const snapshot={
 approval_id:'11111111-1111-4111-8111-111111111111',
 original_work_id:'work:'+'a'.repeat(32),
 artifact_sha256:'b'.repeat(64),
 pre_state_hash:'c'.repeat(64),
 valid_time:'2026-11-03T12:51:58.096Z',
 target_environment:'ISOLATED_PREVIEW',
 goal_transition_event_id:'22222222-2222-4222-8222-222222222222',
 provider_failure_hash:'d'.repeat(64),
};
const current={...snapshot,source_verified:true,
 approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
 approval_consumed:false,original_job_settled:false};
const keys=generateKeyPairSync('ed25519');
const now=Date.parse('2026-11-03T14:00:00Z');
test('exact bitemporal identity requires signed source, preview and 64-byte hash',()=>{
 assert.deepEqual(assertWakeIdentity(snapshot),snapshot);
 for(const candidate of [
  {...snapshot,original_work_id:'work:bad'},
  {...snapshot,artifact_sha256:'tampered'},
  {...snapshot,valid_time:'not-a-date'},
  {...snapshot,target_environment:'production'},
  {...snapshot,goal_transition_event_id:'bad'},
  {...snapshot,pre_state_hash:null},
 ])assert.throws(()=>assertWakeIdentity(candidate),/REALITY_WAKE_EXACT_APPROVAL_SNAPSHOT_REQUIRED/);
});
test('material drift blocks, innocuous telemetry is ignored, unknown context fails closed',()=>{
 assert.equal(assessMaterialWakeDrift(snapshot,current).status,'FRESH_EVIDENCE_RECHECKED');
 assert.equal(assessMaterialWakeDrift(snapshot,{...current,unrelated_cpu_usage:0.72}).status,
  'FRESH_EVIDENCE_RECHECKED');
 for(const field of ['artifact_sha256','pre_state_hash','valid_time',
   'goal_transition_event_id','provider_failure_hash','target_environment']){
  const r=assessMaterialWakeDrift(snapshot,{...current,[field]:'changed'});
  assert.equal(r.status,'STALE_APPROVAL_BLOCKED',field);
  assert.equal(r.governance_ready,false);
 }
 for(const tampered of [
  null,{...current,approval_origin:'MODEL_CLAIM'},
  {...current,approval_consumed:true},
  {...current,original_job_settled:true},
  {...current,source_verified:false},
 ]){
  assert.equal(assessMaterialWakeDrift(snapshot,tampered).status,
   'EVIDENCE_UNAVAILABLE_BLOCKED');
 }
});
test('Ed25519 delivery JWT binds job, approval, candidate, state and fencing',()=>{
 const token=mintDeliveryWarrant({snapshot,fence:7,
  privateKey:keys.privateKey,kid:'preview-main-1',now});
 const verified=verifyDeliveryWarrant({token,publicKey:keys.publicKey,
  kid:'preview-main-1',expected:{...snapshot,fence:7},now:now+1000});
 assert.equal(verified.delivery_only,true);
 assert.equal(verified.execution_authorized,false);
 assert.equal(verified.needs_atomic_nonce_consume,true);
 assert.equal(verified.needs_fresh_governance_and_execution_reservation,true);
 assert.equal(verified.original_work_id,snapshot.original_work_id);
 assert.equal(verified.artifact_sha256,snapshot.artifact_sha256);
 assert.throws(()=>verifyDeliveryWarrant({token,publicKey:keys.publicKey,
   kid:'preview-main-1',expected:{...snapshot,fence:7},now:now+91000}),/EXPIRED/);
 assert.throws(()=>verifyDeliveryWarrant({token,publicKey:keys.publicKey,
   kid:'preview-main-1',expected:{...snapshot,fence:8},now}),/FENCE_MISMATCH/);
 assert.throws(()=>verifyDeliveryWarrant({token,publicKey:keys.publicKey,
   kid:'preview-main-1',expected:{...snapshot,artifact_sha256:'e'.repeat(64),fence:7},now}),
   /APPROVAL_MISMATCH/);
 const tampered=token.split('.');
 tampered[1]=Buffer.from(JSON.stringify({...verified,execution_authorized:true}))
   .toString('base64url');
 assert.throws(()=>verifyDeliveryWarrant({token:tampered.join('.'),
   publicKey:keys.publicKey,kid:'preview-main-1',expected:{...snapshot,fence:7},now}),
   /SIGNATURE_INVALID|SCOPE_INVALID/);
});
test('expiry or invalid key inputs fail without new approval or implicit authority',()=>{
 assert.throws(()=>mintDeliveryWarrant({snapshot,fence:0,privateKey:keys.privateKey,
  kid:'preview-main-1',now}),/DISPATCH_LEASE/);
 assert.throws(()=>mintDeliveryWarrant({snapshot,fence:1,privateKey:keys.privateKey,
  kid:'preview-main-1',now,ttlSeconds:3600}),/DISPATCH_LEASE/);
 assert.throws(()=>mintDeliveryWarrant({snapshot,fence:1,privateKey:keys.privateKey,
  kid:'preview-main-1',now,nonce:'replay'}),/DISPATCH_LEASE/);
});
test('state machine denies skipping governance, replaying execution or self-authorization',()=>{
 assert.ok(WAKE_STATES.includes('STALE_APPROVAL_BLOCKED'));
 assert.equal(mayTransitionWake('DISPATCH_ACCEPTED','EXECUTING'),false);
 assert.equal(mayTransitionWake('WORKER_ALIVE','EXECUTING'),false);
 assert.equal(mayTransitionWake('GOVERNANCE_READY','EXECUTING'),true);
 assert.equal(mayTransitionWake('EXECUTING','EXECUTING'),false);
 assert.equal(mayTransitionWake('RETRY_PENDING','DISPATCH_CLAIMED'),true);
 assert.equal(mayTransitionWake('STALE_APPROVAL_BLOCKED','EXECUTING'),false);
 assert.equal(mayTransitionWake('SETTLED','RECEIPT_VERIFIED'),true);
});
test('SQL outbox is created only on exact owner approval and enforces locks',()=>{
 const sql=readFileSync(new URL('../sql/reality-governed-execution-wake-outbox-v1.sql',import.meta.url),'utf8');
 assert.match(sql,/AFTER INSERT ON reality_internal\.genuine_preview_install_approvals_v1/);
 assert.match(sql,/WAKE_PENDING/);
 assert.match(sql,/FOR UPDATE SKIP LOCKED/);
 assert.match(sql,/dispatch_fence=next_fence/);
 assert.match(sql,/STALE_APPROVAL_BLOCKED/);
 assert.match(sql,/last_transition_event_id IS DISTINCT FROM w\.goal_transition_event_id/);
 assert.match(sql,/MAX_DELIVERY_ATTEMPTS/);
 assert.match(sql,/wake_state='DISPATCH_ACCEPTED'/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.reality_claim_governed_wake_v1\(\)/);
 assert.doesNotMatch(sql,/SECURITY DEFINER/);
 assert.doesNotMatch(sql,/github\.com\/repos|api\.github\.com/);
});
