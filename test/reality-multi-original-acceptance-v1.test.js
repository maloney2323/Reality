import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=src('../supabase/migrations/20261121142500_owner_multi_original_shift_preflight_v1.sql');
const api=src('../api/reality/personal-multi-original-shift-preflight.js');
const ui=src('../reality-chat-continuous-qualification-v1.js');
const boundary=src('../src/reality-governed-shift-boundary-v1.js');

test('multi-original work is sourced only from the signed current owner Continuity and canonical work',()=>{
 for(const value of [
  'owner_continuous_qualification_inbox_v1',
  'owner_continuity_qualification_routes_v1',
  'governed_employee_original_claims_v1',
  'governed_employee_completion_warrants_v1',
  'governed_employee_shifts_v1',
  'governed_original_independent_final_receipts_v1',
  'public.universe_events',
  'owner_qualified_chat_original_review_packets_v1',
  'original_final_independent_receipt',
  'exact_business_warrant_verified',
  'verified_original_goal_acceptance_worldline'
 ])assert.ok(sql.includes(value),'missing '+value);
 assert.match(sql,/p_target_original_count not between 2 and 12/);
 assert.match(sql,/where i.owner_id=p_owner_id/);
 assert.match(sql,/w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'/);
 assert.match(sql,/c.source_ref=r.source_ref and c.shift_id=v_shift/);
 assert.match(sql,/sc->>'source_ref'=i.source_ref/);
 assert.doesNotMatch(sql,/issues\/\d+|pull\/\d+|source_scope :=|INSERT INTO reality_internal\./i);
});
test('preflight cannot authorize a new shift, an LLM, a final job or business permission',()=>{
 for(const v of [
  "'ready_to_start_multi_original_execution',false",
  "'current_shift_scope_is_not_general_business_permission',true",
  "'source_qualification_is_not_authority',true",
  "'original_receipts_not_evidence_jobs',true",
  "'no_fabricated_job_success',true",
  "'original_customer_jobs_completed_by_preflight',0",
  "'new_shift_started',false",
  "'owner_approval_granted',false",
  "'model_execution_authorized',false",
  "'installation_authorized',false",
  "'production_changed',false",
  "'read_only',true"
 ])assert.ok(sql.includes(v),'missing failure-closed invariant '+v);
 assert.match(sql,/revoke all on function public\.reality_read_owner_multi_original_shift_preflight_v1\(uuid,integer\)/);
 assert.match(sql,/grant execute on function public\.reality_read_owner_multi_original_shift_preflight_v1\(uuid,integer\)\s+to service_role/);
 assert.match(sql,/current_user<>'service_role'/);
});
test('Reality Chat reads owner-only independent preflight, not a hardcoded executable batch',()=>{
 assert.match(boundary,/read_owner_multi_original_shift_preflight_v1/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/p_owner_id:session.user_id/);
 assert.match(api,/ready_to_start_multi_original_execution!==false/);
 assert.match(api,/original_customer_jobs_completed_by_preflight!==0/);
 assert.match(api,/req\.method!=='GET'/);
 assert.match(ui,/Multi-original shift · acceptance/);
 assert.match(ui,/Verify multi-job readiness/);
 assert.match(ui,/source_bound_originals/);
 assert.match(ui,/acceptance_gate/);
 assert.match(ui,/No blanket execution authority/);
 assert.doesNotMatch(ui,/MULTI_ORIGINAL_AUTO_AUTHORIZE|START_FIVE_JOBS/);
});
