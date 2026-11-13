import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 projectRealitySavedChatEmployeeProposals,readRealitySavedChatEmployeeProposals
} from '../src/reality-saved-chat-employee-proposals-v1.js';
const row={
 id:'a267fc4d-310a-4a42-8eae-376941b07e88',
 conversation_id:'3136186b-89c5-4f6a-bb3f-923969a22937',
 request_id:'87034ce2-4f43-4b95-8101-aa3a1e6f43dc',
 created_at:'2026-11-13T16:52:30Z',
 content:[
 '### Reviewing the Eight AI Employee Roles and Suggested Source-Backed Jobs for Next Week',
 '#### 1. Avery (Product Strategist)',
 '- **Suggested Jobs:**',
 '  - Research customer needs.',
 '  - Prioritize feature roadmap.',
 '- **Why it Matters:** Value.',
 '#### 2. Riley (Software Engineer)',
 '- **Suggested Jobs:**',
 '  - Check issue #263 and #188.',
 '  - Test a repair.',
 '- **Why it Matters:** Reliability.',
 '#### 3. Quinn (Quality & Security)',
 '- **Suggested Jobs:**',
 '  - Independently verify evidence.',
 '- **Why it Matters:** Safety.',
 '#### 4. Taylor (Operations Engineer)',
 '- **Suggested Jobs:**',
 '  - Audit workers.',
 '- **Why it Matters:** Uptime.',
 '#### 5. Casey (Product Experience)',
 '- **Suggested Jobs:**',
 '  - Test onboarding.',
 '- **Why it Matters:** Usability.',
 '#### 6. Morgan (Marketing & Competitive Research)',
 '- **Suggested Jobs:**',
 '  - Research competitors.',
 '- **Why it Matters:** Marketing.'
 ].join('\n')
};
test('an already saved partial Chat role proposal survives as proposals, with missing roles shown',()=>{
 const x=projectRealitySavedChatEmployeeProposals([row]);
 assert.equal(x.roles_with_proposals,6);
 assert.deepEqual(x.missing_employee_roles,['Jordan','Sage']);
 assert.equal(x.roles.find(r=>r.employee_name==='Avery').proposals.length,2);
 assert.equal(x.roles.find(r=>r.employee_name==='Riley').proposals.length,2);
 assert.equal(x.roles.find(r=>r.employee_name==='Riley')
  .proposals[0].may_reference_previously_settled_work,true);
 assert.match(x.source_message_ref,/^supabase:reality_chat_messages:/);
 assert.equal(x.status,'SAVED_CHAT_IDEAS_AWAITING_SOURCE_AND_SETTLEMENT_RECONCILIATION');
 assert.equal(x.execution_authorized,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(x.proposals_not_verified_jobs,true);
 assert.equal(x.read_only,true);
});
test('latest role plan takes precedence; Chat does not fabricate a complete roster',()=>{
 const later={...row,id:'b267fc4d-310a-4a42-8eae-376941b07e88',
  content:row.content.replace('Research customer needs.','Review a customer feedback hypothesis.')};
 const x=projectRealitySavedChatEmployeeProposals([later,row]);
 assert.match(x.roles[0].proposals[0].description,/customer feedback hypothesis/);
 assert.equal(x.source_message_ref,'supabase:reality_chat_messages:'+later.id);
 assert.equal(x.missing_employee_roles.length,2);
 assert.equal(projectRealitySavedChatEmployeeProposals([]).roles.length,0);
});
test('an ordinary Chat reply is not promoted into a fabricated employee plan',()=>{
 const x=projectRealitySavedChatEmployeeProposals([{
  ...row,content:'Job #263 is already settled. Your work is complete.'
 }]);
 assert.equal(x.status,'NO_SAVED_MULTI_EMPLOYEE_CHAT_PROPOSALS_OBSERVED');
 assert.equal(x.execution_authorized,false);
});
test('readback is owner scoped and uses authenticated RLS, never service-role or browser claims',async()=>{
 const session={user_id:'e267fc4d-310a-4a42-8eae-376941b07e88',
  config:{url:'https://preview-example.supabase.co',key:'publishable-test'},
  access_token:'auth-session-test'};
 let observed=null;
 const x=await readRealitySavedChatEmployeeProposals(session,{fetchImpl:async(url,opts)=>{
  observed={url,opts};
  return {ok:true,json:async()=>[row]};
 }});
 assert.equal(x.roles_with_proposals,6);
 assert.match(observed.url,/user_id=eq\.e267fc4d/);
 assert.match(observed.url,/role=eq\.assistant/);
 assert.equal(observed.opts.headers.authorization,'Bearer auth-session-test');
 assert.equal(observed.opts.headers.apikey,'publishable-test');
 assert.equal(observed.opts.method,'GET');
 await assert.rejects(()=>readRealitySavedChatEmployeeProposals({
  ...session,access_token:''
 },{fetchImpl:()=>{throw Error('should not make request')}}),/SESSION_REQUIRED/);
});
test('Employee panel is a read-only projection and cannot dispatch work from Chat suggestions',()=>{
 const route=readFileSync(new URL('../api/reality/personal-employee-roster.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.match(route,/readRealitySavedChatEmployeeProposals\(session\)/);
 assert.match(route,/saved_chat_employee_proposals_status/);
 assert.match(route,/if\(req.method!=='GET'\)/);
 assert.match(html,/Saved Chat recommendations · Review later/);
 assert.match(html,/renderSavedEmployeeChatProposals\(roster\)/);
 assert.match(html,/SAVED_CHAT_IDEAS_AWAITING_SOURCE_AND_SETTLEMENT_RECONCILIATION/);
 assert.match(html,/No assignments invented/);
 assert.doesNotMatch(html,/document\.write\(/);
});
