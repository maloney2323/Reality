import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL(
 '../supabase/migrations/20261116_shift_closure_all_frozen_receipts_v1.sql',
 import.meta.url),'utf8');
test('shift closeout is the existing owner shift, not another one',()=>{
 assert.match(sql,/reality_close_employee_completion_shift_v1\(\)/);
 assert.match(sql,/UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/s\.closed_at is null/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/v_verified<>v_total/);
 assert.match(sql,/v_work=any\(v_work_ids\)/);
 assert.match(sql,/COMPLETION_WAITING_FOR_FINAL_JOB_RECEIPTS/);
 assert.doesNotMatch(sql,/INSERT INTO reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/OWNER_APPROVE_ONE_EXACT/);
});
test('generalized original requires settled same source, proof, installed commit, independent checks',()=>{
 assert.match(sql,/governed_original_independent_final_receipts_v1/);
 assert.match(sql,/governed_original_install_reviews_v1/);
 assert.match(sql,/a\.original_final_receipt_id=f\.receipt_id/);
 assert.match(sql,/a\.installed_commit_sha=f\.installed_commit_sha/);
 assert.match(sql,/n\.original_settlement_receipt_ref=/);
 assert.match(sql,/f\.source_ref=v_source and f\.source_proof_sha256=v_proof/);
 assert.match(sql,/f\.recorded_at>=v_shift\.authorized_at/);
 assert.match(sql,/f\.independent_original_acceptance_run_id>0/);
 assert.match(sql,/f\.official_vercel_app_check_run_id>0/);
 assert.match(sql,/f\.vercel_deployment_status_id>0/);
});
test('source-specific commit triage proof is preserved without claiming autonomy',()=>{
 assert.match(sql,/riley_commit_reference_triage_originals_v1/);
 assert.match(sql,/t\.source_ref=v_source and t\.source_proof_sha256=v_proof/);
 assert.match(sql,/t\.provider_comment_body_sha256~/);
 assert.match(sql,/t\.final_receipt_id is not null/);
 assert.match(sql,/t\.execution_origin is not null/);
 assert.match(sql,/owner_directed_jobs_in_scope/);
 assert.match(sql,/fully_unattended_shift_verified',false/);
 assert.match(sql,/MIXED_EXECUTION_EVIDENCE_NOT_UNATTENDED_SHIFT_PROOF/);
 assert.match(sql,/human_hours_saved',null/);
 assert.match(sql,/realized_cash_savings_usd',null/);
});
