import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectRealitySavedChatEmployeeProposals}
 from '../src/reality-saved-chat-employee-proposals-v1.js';
import {deriveRealityApprovedChatRoleTasks,
 verifyRealityOwnerApprovedChatJobList}
 from '../src/reality-owner-approved-chat-assignments-v1.js';
const uuid='a267fc4d-310a-4a42-8eae-376941b07e88';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversation='3136186b-89c5-4f6a-bb3f-923969a22937';
const content=[
'### Eight Employee Roles · Suggested Jobs for Next Week',
'#### 1. Avery (Product Strategist)',
'- **Suggested Jobs:**',
'  - Review customer research and use source references.',
'  - Rank product opportunities based on proven demand.',
'- **Benefits:** Value',
'#### 2. Riley (Software Engineer)',
'- **Suggested Jobs:**',
'  - Investigate issue #263 without repeating settled work.',
'  - Prepare a source-backed engineering acceptance test.',
'- **Benefits:** Reliability',
'#### 3. Quinn (Quality & Security)',
'- **Suggested Jobs:**',
'  - Independently check frozen acceptance evidence.',
'- **Benefits:** Safety',
'#### 4. Taylor (Operations Engineer)',
'- **Suggested Jobs:**',
'  - Audit worker transport and durable wake receipts.',
'- **Benefits:** Uptime',
'#### 5. Casey (Product Experience)',
'- **Suggested Jobs:**',
'  - Test guided onboarding and report friction.',
'- **Benefits:** Usability',
'#### 6. Morgan (Marketing & Competitive Research)',
'- **Suggested Jobs:**',
'  - Research customer competition and comparison evidence.',
'- **Benefits:** Marketing'
].join('\n');
const row={id:uuid,conversation_id:conversation,
 request_id:'87034ce2-4f43-4b95-8101-aa3a1e6f43dc',
 created_at:'2026-11-13T16:52:30Z',content};
const file=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('exact saved assistant message is SHA-bound before employee proposal approval',()=>{
 const p=projectRealitySavedChatEmployeeProposals([row]);
 assert.equal(p.roles_with_proposals,6);
 assert.deepEqual(p.missing_employee_roles,['Jordan','Sage']);
 assert.equal(p.source_content_sha256,
  'sha256:'+createHash('sha256').update(content,'utf8').digest('hex'));
 const entries=deriveRealityApprovedChatRoleTasks(p);
 assert.equal(entries.length,6);
 assert.equal(entries[0].employee_name,'Avery');
 assert.equal(entries[1].tasks.length,2);
 assert.match(entries[1].tasks[0],/issue #263/);
 assert.equal(entries.reduce((n,x)=>n+x.tasks.length,0),8);
 assert.equal(entries.some(x=>x.employee_name==='Jordan'),false);
 assert.equal(entries.some(x=>x.employee_name==='Sage'),false);
 assert.equal(p.execution_authorized,false);
});
test('a database-approved list stays distinct from worker execution and installed capabilities',()=>{
 const p=projectRealitySavedChatEmployeeProposals([row]);
 const roles=deriveRealityApprovedChatRoleTasks(p);
 const x={status:'OWNER_APPROVED_CHAT_EMPLOYEE_JOB_LIST_READBACK',
  owner_scope_verified:true,read_only:true,
  work_execution_authorized_by_read:false,
  installation_authorized:false,production_changed:false,
  approvals_count:1,approvals:[{
   approval_id:'d267fc4d-310a-4a42-8eae-376941b07e88',
   source_message_id:uuid,conversation_id:conversation,
   source_content_sha256:p.source_content_sha256,
   roles,role_count:6,task_count:8,
   approval_status:'APPROVED_ASSIGNMENTS_AWAITING_QUALIFICATION',
   shift_execution_authorized:false,
   installation_authorized:false,production_changed:false
  }]};
 assert.equal(verifyRealityOwnerApprovedChatJobList(x),x);
 for(const bad of [
  {...x,installation_authorized:true},
  {...x,approvals_count:2},
  {...x,approvals:[{...x.approvals[0],shift_execution_authorized:true}]},
  {...x,approvals:[{...x.approvals[0],task_count:9}]},
  {...x,approvals:[{...x.approvals[0],
   roles:[...roles,{employee_name:'Avery',tasks:['Repeat the settled task']}] }]},
 ])assert.throws(()=>verifyRealityOwnerApprovedChatJobList(bad),
  /REALITY_CHAT_ASSIGNMENT_/);
});
test('chat source is not an authorization or a fabricated full employee roster',()=>{
 const p=projectRealitySavedChatEmployeeProposals([row]);
 for(const changed of [
  {...p,execution_authorized:true},
  {...p,plan_authorized:true},
  {...p,source_content_sha256:'sha256:'+'f'.repeat(63)},
  {...p,roles:p.roles.map((r,i)=>i===0?
    {...r,proposals:[{...r.proposals[0],authorized_execution:true}]}:r)},
 ])assert.throws(()=>deriveRealityApprovedChatRoleTasks(changed),
  /REALITY_CHAT_ASSIGNMENT_/);
});
test('owner POST approves only the pinned saved message after explicit user click',()=>{
 const api=file('api/reality/personal-employee-chat-assignments.js');
 const adapter=file('src/reality-owner-approved-chat-assignments-v1.js');
 const roster=file('api/reality/personal-employee-roster.js');
 const main=file('reality-chat-approved-assignments-v1.js');
 const simple=file('reality-chat-simple.html');
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/req\.method==='POST'/);
 assert.match(api,/APPROVE_EXACT_SAVED_CHAT_EMPLOYEE_ASSIGNMENTS/);
 assert.match(api,/expected_content_sha256/);
 assert.match(adapter,/readRealitySavedChatEmployeeProposals\(session/);
 assert.match(adapter,/proposal\.source_content_sha256!==expectedContentSha256/);
 assert.match(adapter,/reality_record_owner_chat_employee_assignments_v1/);
 assert.match(roster,/readOwnerApprovedChatEmployeeAssignments\(session\)/);
 assert.match(roster,/approved_chat_employee_assignments/);
 assert.match(main,/approve\.addEventListener\('click'/);
 assert.match(main,/owner_approval_consumed|Approve /);
 assert.match(simple,/Approve .*Chat assignments/);
 assert.match(simple,/Owner-approved Chat job list/);
 assert.doesNotMatch(api+adapter,/reality_authorize_employee_shift_v1|reality_authorize_employee_completion_shift_v1|install_capability/);
});
test('DB checks original assistant archive content hash and protects owner-only approvals',()=>{
 const sql=file('supabase/migrations/20261113_chat_employee_approved_job_list_v1.sql');
 assert.match(sql,/security invoker/g);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/m\.role='assistant'/);
 assert.match(sql,/m\.user_id=p_owner_id/);
 assert.match(sql,/pg_catalog\.sha256/);
 assert.match(sql,/unique\(owner_id,source_message_id\)/);
 assert.match(sql,/on conflict \(owner_id,source_message_id\) do nothing/);
 assert.match(sql,/revoke all on function public\.reality_record_owner_chat_employee_assignments_v1/);
 assert.match(sql,/execution_authorized boolean not null default false/);
 assert.match(sql,/installation_authorized boolean not null default false/);
 assert.match(sql,/production_changed boolean not null default false/);
 assert.doesNotMatch(sql,/insert into reality_internal\.governed_employee_shifts_v1|update reality_internal\.genuine_capability_queue_v1/);
});
