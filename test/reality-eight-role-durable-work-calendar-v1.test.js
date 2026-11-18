import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';

const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261117_eight_role_durable_work_calendar_v20.sql');
const api=read('api/reality/personal-employee-roster.js');
const html=read('reality-chat-simple.html');
const roles=['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'];
test('existing eight roles are reconnected to original discovery and independent evidence',()=>{
 for(const name of roles)assert.ok(sql.includes("'"+name+"'"),name);
 assert.match(sql,/employee_discovery_observations_v1/);
 assert.match(sql,/owner_qualified_employee_evidence_jobs_v1/);
 assert.match(sql,/owner_internal_maintenance_jobs_v1/);
 assert.match(sql,/owner_employee_operating_schedule_v1/);
 assert.match(sql,/EVIDENCE_REVIEW_VERIFIED/);
 assert.match(sql,/MAINTENANCE_AWAITING_SIGNED_SHIFT/);
 assert.match(sql,/MAINTENANCE_IN_SIGNED_SHIFT/);
 assert.match(sql,/MAINTENANCE_VERIFIED/);
 assert.match(sql,/independent_review_receipt_sha256/);
});
test('do not replay previously independently receipted PR reviews based on unrelated discovery scan hashes',()=>{
 assert.match(sql,/j\.first_source_updated_at=o\.source_observed_at/);
 assert.match(sql,/j\.first_source_proof_sha256=j\.reviewed_source_sha256/);
 assert.match(sql,/j\.verified_at>=j\.first_source_checked_at/);
 assert.match(sql,/j\.independent_receipt_sha256~'/);
 assert.match(sql,/SOURCE_SETTLED_NO_REPLAY/);
 assert.match(sql,/SOURCE_NO_LONGER_CURRENT/);
 assert.match(sql,/SOURCE_EPOCH_REVIEW_REQUIRED/);
});
test('maintenance is persisted as the SAME original incident and not a new customer claim',()=>{
 assert.match(sql,/m\.origin_shift_id as origin_shift,m\.incident_id/);
 assert.match(sql,/scope->>'maintenance_id'=m\.incident_id::text/);
 assert.match(sql,/m\.original_job_completed=false/);
 assert.match(sql,/planned_business_date/);
 assert.match(sql,/owner_shift_authorized_by_schedule boolean not null default false/);
 assert.match(sql,/original_customer_job_created boolean not null default false/);
 assert.match(sql,/installation_authorized boolean not null default false/);
 assert.match(sql,/production_changed boolean not null default false/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1/i);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_original_claims_v1/i);
 assert.doesNotMatch(sql,/update reality_internal\.owner_internal_maintenance_jobs_v1/i);
});
test('owner-granted evidence-only scheduling does not invent hours or force fill quota',()=>{
 assert.match(sql,/g\.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'/);
 assert.match(sql,/g\.enabled=true/);
 assert.match(sql,/g\.expires_at>v_now/);
 assert.match(sql,/employee_discovery_role_coverage_v1/);
 assert.match(sql,/having count\(distinct c\.employee\)=8/);
 assert.match(sql,/extract\(isodow from gs\) between 1 and 5/);
 assert.match(sql,/planned_days_not_verified_work_hours/);
 assert.match(sql,/scheduled_executable_original_jobs',0/);
 assert.match(sql,/reconcile_frequency/);
 assert.doesNotMatch(sql,/verified_cash_savings_usd\s*[:=]\s*[1-9]/);
});
test('durable schedule remains in private RLS schema with service role only',()=>{
 assert.match(sql,/create table if not exists reality_internal\.owner_employee_operating_schedule_v1/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on reality_internal\.owner_employee_operating_schedule_v1/);
 assert.match(sql,/grant select,insert,update on reality_internal\.owner_employee_operating_schedule_v1\s+to service_role/);
 assert.match(sql,/current_user not in \('service_role','postgres'\)/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/grant execute on function public\.reality_read_owner_employee_operating_schedule_v1\(uuid\)\s+to service_role/);
 assert.doesNotMatch(sql,/grant execute[^;]+to (?:authenticated|anon)/is);
});
test('reuse existing unattended source scanner and reconcile schedule without new AI worker',()=>{
 assert.match(sql,/reality-employee-operating-schedule-reconciliation-v1/);
 assert.match(sql,/\*\/15 \* \* \* \*/);
 assert.match(sql,/on conflict\(owner_id,work_key\) do update/);
 assert.match(sql,/source_evidence_sha256=excluded\.source_evidence_sha256/);
 assert.match(sql,/first_recorded_at/);
 assert.doesNotMatch(sql,/create or replace function public\.reality_authorize_employee_shift_v1/);
});
test('signed-in owner roster readback and UI preserve role/source identity and independently verified status',()=>{
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/reality_read_owner_employee_operating_schedule_v1/);
 assert.match(api,/schedule\.owner_id!==session\.user_id/);
 assert.match(api,/schedule\.role_count!==8/);
 assert.match(api,/roleSum\('work_records'\)/);
 assert.match(api,/schedule\.production_changed!==false/);
 assert.match(api,/employee_operating_schedule_status/);
 assert.match(html,/id="employeeOperatingSchedule"/);
 assert.match(html,/renderEmployeeOperatingSchedule\(roster\)/);
 assert.match(html,/id="operatingScheduleRoles"/);
 assert.match(html,/Original maintenance incident:/);
 assert.match(html,/previous_independent_evidence_receipt_sha256/);
 assert.match(html,/SOURCE_SETTLED_NO_REPLAY/);
 assert.match(html,/No new customer shift, installation or cash savings authorized/);
});
test('read RPC uses existing strictly allowlisted service-only transport',async()=>{
 const db={url:'https://reality-private-test.supabase.co',secretKey:'example-private'};
 const p_owner_id='85eeae0b-2988-43c4-b20c-590fb51da70d';
 const value=await shiftRpc(db,'reality_read_owner_employee_operating_schedule_v1',
  {p_owner_id},{fetchImpl:async(url,init)=>{
   assert.equal(url,db.url+'/rest/v1/rpc/reality_read_owner_employee_operating_schedule_v1');
   assert.equal(init.method,'POST');
   assert.equal(JSON.parse(init.body).p_owner_id,p_owner_id);
   return {ok:true,json:async()=>({status:'OWNER_EIGHT_ROLE_WORK_CALENDAR_CURRENT'})};
  }});
 assert.equal(value.status,'OWNER_EIGHT_ROLE_WORK_CALENDAR_CURRENT');
 await assert.rejects(shiftRpc(db,'reality_autorun_customer_work_v99',{},{
  fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')}}),
  /SHIFT_RPC_NOT_ALLOWLISTED/);
});
