import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const routing=file('../supabase/migrations/20261121193000_continuity_qualification_governed_routes_v1.sql');
const readback=file('../supabase/migrations/20261121194500_continuity_routes_owner_chat_readback_v1.sql');
const worker=file('../api/reality/governed-employee-shift-worker.js');
const boundary=file('../src/reality-governed-shift-boundary-v1.js');
const api=file('../api/reality/personal-continuous-qualification.js');
const chat=file('../reality-chat-continuous-qualification-v1.js');
test('all qualifications reconcile through one owner-bound stable continuity identity',()=>{
 assert.match(routing,/owner_continuous_qualification_inbox_v1 i/);
 assert.match(routing,/foreign key\(owner_id,intake_family,intake_key\)/);
 assert.match(routing,/primary key\(owner_id,intake_family,intake_key\)/);
 assert.match(routing,/owner_id::text\|\|'\|'\|\|intake_family\|\|'\|'\|\|intake_key/);
 assert.match(routing,/on conflict\(owner_id,intake_family,intake_key\) do update/);
 assert.match(routing,/current_user<>'service_role'/);
 assert.match(routing,/r.status='STARTED'/);
 assert.match(routing,/g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'/);
 assert.doesNotMatch(routing,/security definer|auth\.uid\(\)/i);
 assert.doesNotMatch(routing,/maloney2323|issues\/378|issues\/263|const OWNER=/i);
});
test('source observations cannot impersonate canonical original, authorization or independent receipt',()=>{
 for(const token of [
  'governed_employee_original_claims_v1',
  'governed_employee_completion_warrants_v1',
  'governed_original_independent_final_receipts_v1',
  'genuine_capability_queue_v1',
  'approved_chat_employee_assignments_v1',
  'SOURCE_EPOCH_REVALIDATION_REQUIRED',
  'SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION',
  'INDEPENDENT_ORIGINAL_RECEIPT_RECONCILE_UNIVERSE',
  'EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER',
  'OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED'
 ])assert.ok(routing.includes(token),'missing governance proof '+token);
 for(const token of [
  "'model_execution_authorized',false",
  "'owner_approval_granted',false",
  "'new_original_admitted',false",
  "'new_shift_started',false",
  "'installation_authorized',false",
  "'production_changed',false"
 ])assert.ok(routing.includes(token),'missing no-authority fence '+token);
 assert.match(routing,/grant execute on function public\.reality_reconcile_continuity_qualification_routes_v1\(uuid\) to service_role/);
 assert.match(routing,/revoke all on function public\.reality_reconcile_continuity_qualification_routes_v1\(uuid\) from public,anon,authenticated/);
 assert.doesNotMatch(routing,/\b(?:update|insert into)\s+reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(routing,/\b(?:update|insert into)\s+reality_internal\.genuine_preview_install_approvals_v1/i);
});
test('existing signed worker advances after durable intake, never on model message or client permission',()=>{
 assert.match(boundary,/reconcile_continuity_qualification_routes_v1/);
 assert.match(worker,/continuousQualificationInbox.status===/);
 assert.match(worker,/reality_reconcile_continuity_qualification_routes_v1/);
 assert.match(worker,/p_worker_run_id:actualWorkerRunId/);
 assert.match(worker,/continuity_qualification_routes:continuityQualificationRoutes/);
 assert.match(worker,/status:'CONTINUITY_QUALIFICATION_ROUTE_UNVERIFIED'/);
 assert.match(worker,/new_original_admitted!==false/);
 assert.doesNotMatch(worker,/const continuityQualificationRoutes=.*reality_authorize_employee_shift_v1/);
});
test('owner readback projects independently routed status and retains approval barriers',()=>{
 assert.match(readback,/left join reality_internal\.owner_continuity_qualification_routes_v1 r/);
 assert.match(readback,/r\.owner_id=i\.owner_id and r\.intake_family=i\.intake_family/);
 for(const x of ['governed_route_state','governed_next_action','continuity_ref','matched_original_work_id','existing_approval_adapter'])
  assert.ok(readback.includes(x),'missing route readback '+x);
 assert.match(readback,/items_are_qualifier_inputs_not_approved_jobs',true/);
 assert.match(readback,/approval_ready',false/);
 assert.match(readback,/executable_original_admitted',false/);
 assert.match(api,/x\.governed_route_state/);
 assert.match(api,/x\.governed_next_action/);
 assert.match(api,/x\.continuity_ref/);
 assert.match(api,/x\.approval_ready!==false/);
 assert.match(chat,/Reality must recheck its existing authenticated approval preflight/);
 assert.match(chat,/Next governed check:/);
 assert.doesNotMatch(chat,/AUTHORIZE_EXACT_EMPLOYEE_SHIFT|OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
});
