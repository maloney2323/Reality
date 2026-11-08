import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL(
 '../supabase/migrations/20261107_riley_finish_when_all_job_receipts_verified_v1.sql',
 import.meta.url),'utf8');

test('finish is a bounded postgres-only isolated settlement supervisor, not a clock target',()=>{
 assert.match(src,/reality_internal\.reality_finish_riley_verified_batch_v1\(\)/);
 assert.match(src,/if current_user<>'postgres' then/);
 assert.match(src,/planned_start_at<=v_now/);
 assert.match(src,/planned_end_at>v_now/);
 assert.match(src,/status in \('RUNNING','AWAITING_EXACT_ORIGINAL_WORK'\)/);
 assert.match(src,/for update skip locked/);
 assert.match(src,/v_targets<1 or v_targets>4/);
 assert.match(src,/v_verified<>v_targets/);
 assert.match(src,/v_outstanding<>0/);
 assert.match(src,/reality-riley-finish-verified-work-v1/);
 assert.match(src,/\* \* \* \* \*/);
 assert.match(src,/revoke all on function reality_internal\.reality_finish_riley_verified_batch_v1\(\)/);
 assert.match(src,/from public,anon,authenticated,service_role/);
});
test('no source-only or partial settlement may produce a completed shift',()=>{
 assert.match(src,/t\.step_index between 1 and 5/);
 assert.match(src,/t\.state='SOURCE_CHECKED'/);
 assert.match(src,/c\.phase='RECEIPT_INDEPENDENTLY_RECONCILED'/);
 assert.match(src,/c\.independent_receipt_event_id is not null/);
 assert.match(src,/r\.verified_settlement_event_id=c\.independent_receipt_event_id/);
 assert.match(src,/r\.verified_at>=c\.created_at/);
 assert.match(src,/q\.phase='SETTLED_ISOLATED'/);
 assert.match(src,/q\.qualified_candidate->>'artifact_sha256'=r\.artifact_sha256/);
 assert.match(src,/q\.claim_id is null/);
 assert.match(src,/t\.proof_sha256=c\.source_proof_sha256/);
 assert.match(src,/ALL_ADMITTED_ORIGINAL_JOB_RECEIPTS_INDEPENDENTLY_VERIFIED/);
 assert.match(src,/independent_final_receipt_event_ids/);
 assert.match(src,/status='ENDED_WITH_VERIFIED_JOB'/);
 assert.match(src,/actual_elapsed_minutes/);
 assert.match(src,/scheduled_shift_hours_guardrail/);
});
test('supervisor never mints a new original, model permission, money saved, or installation',()=>{
 assert.doesNotMatch(src,/\b(?:insert into|grant execute|create trigger|net\.http_post)\b/i);
 assert.match(src,/'work_installation_authorized',false/);
 assert.match(src,/'realized_cash_savings_usd',null/);
 assert.match(src,/'net_human_equivalent_hours_returned',null/);
 assert.match(src,/'production_changed',false/);
 assert.match(src,/'original_job_completed',false/);
});

const deadline=readFileSync(new URL(
 '../supabase/migrations/20261107_riley_deadline_never_means_completed_v1.sql',
 import.meta.url),'utf8');
test('authorization deadline is a truthful unfinished-work report, not a success receipt',()=>{
 assert.match(deadline,/v_claims between 1 and 4/);
 assert.match(deadline,/v_claims=v_verified and v_unclaimed=0/);
 assert.match(deadline,/v_all_verified then 'ENDED_WITH_VERIFIED_JOB'/);
 assert.match(deadline,/SHIFT_AUTHORIZATION_WINDOW_EXPIRED_WITH_UNFINISHED_OR_UNVERIFIED_WORK/);
 assert.match(deadline,/r.verified_settlement_event_id=c.independent_receipt_event_id/);
 assert.match(deadline,/q.phase='SETTLED_ISOLATED'/);
 assert.match(deadline,/v_historical_noop/);
 assert.doesNotMatch(deadline,/set status=case when exists\(select 1 from reality_internal\.governed_employee_shift_steps_v1 t/);
});
