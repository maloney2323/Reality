import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL(
 '../supabase/migrations/20261122170000_fix_signed_fenced_provider_pgnet_alias_v1.sql',
 import.meta.url),'utf8');
test('live observed pg_net ambiguity fixed without weakening the same-original signed fence',()=>{
 assert.match(sql,/end \$function\$;\s*revoke all on function/);
 assert.match(sql,/from net\._http_response response_row/);
 assert.match(sql,/count\(distinct response_row\.content::jsonb/);
 assert.match(sql,/response_row\.created>q\.updated_at/);
 assert.match(sql,/response_row\.content::jsonb->'signed_chat_recovery_quarantine'->>'provider_ref_http_status'='404'/);
 assert.match(sql,/response_row\.content::jsonb->'signed_chat_recovery_quarantine'->>'broker_push_permission_verified'='true'/);
 assert.doesNotMatch(sql,/\bh\.content/);
 assert.doesNotMatch(sql,/from net\._http_response h\b/);
 for(const gate of [
  "current_user<>'service_role'",
  "run.run_id=p_worker_run_id and run.status='STARTED'",
  "warrant.state='ACTIVE'",
  "signed_chat_goal_shift_lineage_v1",
  "quarantine_receipt_sha256 is null",
  "recovery_spec->>'provider_requalification_epoch' is null",
  "p_independent_ref_status<>404",
  "v_broker_count<2",
  "SIGNED_GOVERNED_TRANSITION_STALLED",
  "phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN'",
  "'provider_requalification_limit',1",
  "'original_job_completed',false",
  "'installation_authorized',false",
  "'production_changed',false"
 ])assert.ok(sql.includes(gate),gate);
 assert.doesNotMatch(sql,/security definer|grant execute[^;]+to authenticated/i);
});
