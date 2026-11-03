import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../sql/'+name,import.meta.url),'utf8');
const hardened=read('reality-governed-wake-atomic-install-and-recovery-v1.sql');
const receipt=read('reality-governed-wake-receipt-settlement-v1.sql');
const owner=read('reality-governed-wake-owner-readback-v1.sql');
const route=readFileSync(new URL('../api/reality/personal-qualified-capability-approve.js',import.meta.url),'utf8');
test('failed edge notification cannot roll back an otherwise durable owner approval',()=>{
 assert.match(hardened,/EXCEPTION WHEN OTHERS THEN/);
 assert.match(hardened,/WAKE_NOTIFICATION_FAILED_OUTBOX_RETAINED/);
 assert.match(hardened,/RETURN NEW;/);
});
test('legacy owner approval handoff is replaced by database atomic outbox',()=>{
 assert.match(route,/reality_owner_approve_qualified_preview_v1/);
 assert.match(route,/reality_read_owner_governed_wakes_v1/);
 assert.match(route,/SIGNED_DB_OUTBOX_EDGE_WATCHDOG_V1/);
 assert.match(route,/entry\.approval_id===receipt\.approval_id/);
 assert.match(route,/entry\.artifact_sha256===receipt\.artifact_sha256/);
 assert.doesNotMatch(route,/wakeApprovedIsolatedInstall/);
 assert.match(route,/retry_owner_approval:false/);
});
test('original installation reservation consumes only current signed worker and fence',()=>{
 assert.match(hardened,/BEFORE UPDATE OF consumed_at/);
 assert.match(hardened,/w\.wake_state <> 'GOVERNANCE_READY'/);
 assert.match(hardened,/w\.worker_run_id::text IS DISTINCT FROM NEW\.installer_run_id/);
 assert.match(hardened,/w\.dispatch_lease_expires_at<=clock_timestamp/);
 assert.match(hardened,/GOVERNED_INSTALL_SIGNED_WORKER_OR_FENCE_REQUIRED/);
 assert.match(hardened,/AFTER UPDATE OF consumed_at/);
 assert.match(hardened,/wake_state='EXECUTING'/);
 assert.match(hardened,/interval '90 minutes'/);
});
test('a stalled worker is escalated without blind execution retries',()=>{
 assert.match(hardened,/WORKER_ALIVE','GOVERNANCE_READY','EXECUTING'/);
 assert.match(hardened,/WAKE_WATCHDOG_NOTIFICATION_FAILED_RETRY_PERSISTED/);
 assert.match(hardened,/SIGNED_WORKER_STALLED_EFFECTS_UNKNOWN/);
 assert.match(hardened,/'automatic_execution_retry',false/);
});
test('settled status requires independently verified original work outcome',()=>{
 assert.match(receipt,/AFTER UPDATE OF settlement_receipt/);
 assert.match(receipt,/original_job_completed'<>'true'/);
 assert.match(receipt,/independent_outcome_verified'<>'true'/);
 assert.match(receipt,/production_changed'<>'false'/);
 assert.match(receipt,/wake_state='SETTLED'/);
});
test('final state advances only from independent verified final receipt insertion',()=>{
 assert.match(receipt,/AFTER INSERT ON reality_internal\.genuine_independent_final_receipts_v1/);
 assert.match(receipt,/NEW\.verifier_artifact_digest/);
 assert.match(receipt,/NEW\.provider_run_id IS DISTINCT FROM w\.worker_run_id/);
 assert.match(receipt,/NEW\.production_changed IS DISTINCT FROM false/);
 assert.match(receipt,/wake_state='RECEIPT_VERIFIED'/);
});
test('owner readback includes exact evidence-bound approval ID and candidate',()=>{
 assert.match(owner,/'approval_id',s\.approval_id/);
 assert.match(owner,/'artifact_sha256',s\.artifact_sha256/);
 assert.match(owner,/WHERE w\.owner_id=p_owner_id/);
 assert.match(owner,/AND a\.owner_id=p_owner_id/);
 assert.match(owner,/read_only',true/);
});
