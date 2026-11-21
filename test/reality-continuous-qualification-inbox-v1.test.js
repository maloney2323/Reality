import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=source('../supabase/migrations/20261121132000_continuous_evidence_qualification_inbox_v1.sql');
const worker=source('../api/reality/governed-employee-shift-worker.js');
const api=source('../api/reality/personal-continuous-qualification.js');
const ui=source('../reality-chat-continuous-qualification-v1.js');
const home=source('../index.html');
const boundary=source('../src/reality-governed-shift-boundary-v1.js');

test('every existing source family reaches a single signed qualification inbox, not a new dispatcher',()=>{
 for(const table of [
  'owner_employee_operating_schedule_v1',
  'employee_discovery_observations_v1',
  'owner_capability_employee_schedule_v1',
  'genuine_capability_queue_v1',
  'owner_worker_recovery_incidents_v1',
  'chat_work_handoffs_v1',
  'governed_employee_shift_steps_v1']){
  assert.ok(sql.includes(table),'missing qualification source '+table);
 }
 for(const family of [
  'EMPLOYEE_SCHEDULE','EMPLOYEE_DISCOVERY','EMPLOYEE_CAPABILITY',
  'GOVERNED_CAPABILITY','RECOVERY_INCIDENT','AUTHENTICATED_CHAT',
  'SIGNED_SHIFT_SOURCE']){
  assert.ok(sql.includes(family),'missing source family '+family);
 }
 assert.match(sql,/primary key\(owner_id,intake_family,intake_key\)/);
 assert.match(sql,/on conflict\(owner_id,intake_family,intake_key\) do update/);
 assert.match(sql,/where g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'/);
 assert.match(sql,/r.status='STARTED'/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/security definer/i);
 assert.doesNotMatch(sql,/grant execute .* to (?:anon|authenticated)/i);
});

test('qualification is triage, not a fake executable original or installation permission',()=>{
 for(const flag of [
  "'new_shift_started',false","'new_original_job_admitted',false",
  "'owner_approval_granted',false","'execution_authorized',false",
  "'installation_authorized',false","'production_changed',false"]){
  assert.ok(sql.includes(flag),flag);
 }
 assert.match(sql,/HISTORICAL_OR_TERMINAL_NO_REPLAY/);
 assert.match(sql,/ISOLATED_SETTLEMENT_RECONCILE_WITH_UNIVERSE/);
 assert.match(sql,/AMBIGUOUS_PROVIDER_EFFECTS_NO_REPLAY/);
 assert.match(sql,/PRESENT_EXACT_SOURCE_AND_OWNER_APPROVAL_ONLY_AFTER_QUALIFICATION/);
 assert.match(sql,/SOURCE_RECONCILIATION_STALE_RECHECK_REQUIRED/);
 assert.match(sql,/revoke all on function public\.reality_read_owner_continuous_qualification_inbox_v1/);
 assert.match(sql,/grant execute on function public\.reality_read_owner_continuous_qualification_inbox_v1\(uuid\) to service_role/);
});

test('signed worker invokes exactly the source-neutral durable qualifier and never grants authority',()=>{
 assert.match(worker,/reality_reconcile_continuous_qualification_inbox_v1/);
 assert.match(boundary,/reconcile_continuous_qualification_inbox_v1/);
 assert.match(boundary,/read_owner_continuous_qualification_inbox_v1/);
 assert.match(worker,/p_worker_run_id:actualWorkerRunId/);
 assert.match(worker,/continuous_qualification_inbox:continuousQualificationInbox/);
 assert.match(worker,/new_original_job_admitted!==false/);
 assert.match(worker,/owner_approval_granted!==false/);
 assert.match(worker,/status:'CONTINUOUS_QUALIFICATION_INBOX_RECONCILIATION_UNVERIFIED'/);
 assert.doesNotMatch(worker,/const continuousQualificationInbox=.*reality_authorize_employee_shift_v1/);
});

test('owner Chat readback takes only authenticated owner identity and cannot accept client source or scope',()=>{
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/Object\.keys\(req\.query\|\|\{\}\)\.length/);
 assert.match(api,/p_owner_id:session\.user_id/);
 assert.match(api,/db\.project!==process\.env\.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF/);
 assert.match(api,/items_are_qualifier_inputs_not_approved_jobs!==true/);
 assert.match(api,/result\.execution_authorized!==false/);
 assert.match(api,/result\.installation_authorized!==false/);
 assert.doesNotMatch(api,/reality_authorize_employee_shift_v1|reality_owner_approve_qualified_preview_v1/);
});

test('Reality Chat displays next source proof and does not silently approve or start work',()=>{
 assert.match(home,/reality-chat-continuous-qualification-v1\.js/);
 assert.match(ui,/realityChatPanelWork/);
 assert.match(ui,/privateReady/);
 assert.match(ui,/\/api\/reality\/personal-continuous-qualification/);
 assert.match(ui,/Discuss next qualification in Chat/);
 assert.match(ui,/A specific, current, independently qualified job/);
 assert.match(ui,/setInterval\(\(\)=>\{if\(isReady\(\)\)void load\(\);\},120000\)/);
 assert.doesNotMatch(ui,/reality_authorize_employee_shift_v1|AUTHORIZE_EXACT_EMPLOYEE_SHIFT|reality_owner_approve/);
});
