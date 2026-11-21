import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261121230000_business_original_source_executor_contract_v1.sql');
const api=read('../api/reality/personal-business-original-admission-contract.js');
const ui=read('../reality-chat-continuous-qualification-v1.js');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');

test('real business originals require owner-source, independently installed executor and original acceptance proof',()=>{
 for(const x of [
 'owner_connector_setup_requests_v1','provider_access_verified is true',
 'credential_saved is true','owner_continuous_qualification_inbox_v1',
 'owner_continuity_qualification_routes_v1',
 'owner_qualified_employee_evidence_jobs_v1',
 'COMPLETED_INDEPENDENTLY_VERIFIED',
 'original_customer_job_completed is false',
 'business_original_executor_contracts_v1',
 'independently_verified_acceptance_sha256',
 'independent_verifier_ref','effect_authority_policy_sha256',
 'registered_execution_adapter','owner_approved_employee_task_lists_not_execution_permissions'
 ])assert.ok(sql.includes(x),x);
 assert.doesNotMatch(sql,/issues\/[0-9]+|pull\/[0-9]+|insert into reality_internal\.owner_continuity_qualification_routes_v1/i);
 assert.doesNotMatch(sql,/insert into reality_internal\.business_original_executor_contracts_v1/i);
});
test('source connections, source evidence, employee list and original execution never collapse into one permission',()=>{
 for(const x of [
  "'itemized_originals_ready_for_exact_approval',0",
  "'itemized_originals_ready_for_execution',0",
  "'source_observation_is_not_an_original',true",
  "'approved_employee_list_is_not_an_execution_warrant',true",
  "'owner_approval_granted',false",
  "'model_execution_authorized',false",
  "'new_shift_started',false",
  "'installation_authorized',false",
  "'production_changed',false",
  "'read_only',true"
 ])assert.ok(sql.includes(x),x);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_read_owner_business_original_source_executor_contract_v1/);
 assert.match(sql,/grant execute on function public\.reality_read_owner_business_original_source_executor_contract_v1/);
});
test('owner Chat accepts only signed-in independent readback and configurable lanes not fake customer work',()=>{
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/req\.method!=='GET'/);
 assert.match(api,/p_owner_id:session.user_id/);
 assert.match(api,/p_job_classes:classes/);
 assert.match(api,/itemized_originals_ready_for_exact_approval!==0/);
 assert.match(ui,/Five business work lanes · source & executor proof/);
 assert.match(ui,/loadBusinessSourceExecutorContract\(\)/);
 assert.match(ui,/verified_owner_provider_source_connections/);
 assert.match(ui,/independently_verified_installed_business_executor_manifests/);
 assert.match(ui,/current connected source proof/);
 assert.match(boundary,/read_owner_business_original_source_executor_contract_v1/);
});
