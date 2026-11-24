import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL(
 '../supabase/migrations/20261122175000_bounded_second_signed_provider_source_epoch_v1.sql',
 import.meta.url),'utf8');
test('one source-bound second attempt is distinct, retains history and never replays a ref',()=>{
 assert.equal((s.match(/end \$function\$/g)||[]).length,1);
 for(const part of [
  "coalesce(recovery_spec->>'provider_requalification_epoch','0') ~ '^[01]$'",
  "q.recovery_spec->>'source_changed_no_same_write_replay' is distinct from 'true'",
  "q.qualification_receipt->'provider_requalification_memory'->>'new_expected_quarantine_branch'",
  "reality-broker-read-only-credential-provenance-v1",
  "broker_credential_readback",
  "v_broker_count<2",
  "signed_chat_goal_shift_lineage_v1",
  "warrant.state='ACTIVE'",
  "run.run_id=p_worker_run_id and run.status='STARTED'",
  "previous_branch",
  "coalesce((q.recovery_spec->>'provider_requalification_epoch')::int,0)+1",
  "'provider_requalification_history'",
  "'provider_requalification_limit',2",
  "quarantine_receipt_sha256 is null",
  "'new_shift_started',false",
  "'installation_authorized',false",
  "'original_job_completed',false",
  "'production_changed',false"
 ])assert.ok(s.includes(part),part);
 assert.doesNotMatch(s,/security definer|update\s+public\.reality_chat_messages|insert\s+into\s+reality_internal\.governed_employee_shifts_v1/i);
});
