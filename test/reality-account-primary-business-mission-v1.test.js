import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {personalAccountMissionScope,personalGoalScope}
 from '../src/reality-personal-goal-readback-v0.1.js';

const a='85eeae0b-2988-43c4-b20c-590fb51da70d';
const b='11111111-1111-4111-8111-111111111111';
const chat1='22222222-2222-4222-8222-222222222222';
const chat2='33333333-3333-4333-8333-333333333333';
const source=x=>readFileSync(new URL(x,import.meta.url),'utf8');
test('primary mission is owner-account scoped, not tied to any conversation',()=>{
 const original=personalAccountMissionScope({userId:a});
 const afterNewChat=personalAccountMissionScope({userId:a});
 assert.deepEqual(afterNewChat,original);
 assert.match(original.root,/^personal:owner-business-mission:[a-f0-9]{64}$/);
 assert.notEqual(original.root,personalAccountMissionScope({userId:b}).root);
 assert.notEqual(personalGoalScope({userId:a,conversationId:chat1}).root,
  personalGoalScope({userId:a,conversationId:chat2}).root);
 assert.notEqual(personalGoalScope({userId:a,conversationId:chat1}).root,original.root);
 assert.throws(()=>personalAccountMissionScope({userId:'guest'}),
  /ACCOUNT_MISSION_AUTHENTICATED_OWNER_REQUIRED/);
});
test('account-wide mission requires exact signed user request; does not grant shift, install or release approval',()=>{
 const api=source('../api/reality/personal-goals.js');
 assert.match(api,/owner-primary-business-mission:v1:/);
 assert.match(api,/mode==='account'/);
 assert.match(api,/req\.body\?\.operation!=='SET_ACTIVE'/);
 assert.match(api,/ACCOUNT_MISSION_EXPLICIT_SET_ACTIVE_ONLY/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/recordPrivateMessage\(session/);
 assert.match(api,/readPrivateChat\(session,conversationId\)/);
 assert.match(api,/x\.source_ref===saved\.source_ref&&x\.text===text/);
 assert.match(api,/appendAuthenticatedUserGoalCommand/);
 assert.match(api,/external_execution_authorized:false/);
 assert.doesNotMatch(api,/reality_start_employee_shift|approve_new_installation|merge_to_production/);
});
test('Chat sees verified account mission as observation, not as an execution warrant',()=>{
 const read=source('../src/reality-personal-goal-readback-v0.1.js');
 const chat=source('../api/reality/personal-chat.js');
 assert.match(read,/OWNER_ACCOUNT_SCOPED_SIGNED_CONTINUITY/);
 assert.match(read,/projectAuthoritativeUserGoals/);
 assert.match(read,/scope=personalAccountMissionScope|const scope=personalAccountMissionScope/);
 assert.match(chat,/readFreshPersonalAccountMissionState/);
 assert.match(chat,/owner_confirmed_account_primary_business_mission/);
 assert.match(chat,/OWNER_CONFIRMED_OBJECTIVE_NOT_BUSINESS_OUTCOME/);
 assert.match(chat,/grants_execution_authority:false/);
 assert.match(chat,/installation_authorized:false/);
 assert.match(chat,/currentObservations:observations,reconciledOriginals/);
 assert.match(chat,/makeOwnerUniverseReadModel\(\{\s*observations:ownerCurrentUniverseObservations,reconciledOriginals/);
 assert.match(chat,/\.\.\.\(primaryMissionObservation\?\[primaryMissionObservation\]:\[\]\)/);
});
test('Chat restores saved permanent mission across logins and never silently saves its default proposal',()=>{
 const html=source('../index.html');
 assert.match(html,/id="privateAccountMissionBanner"/);
 assert.match(html,/id="privateMissionConfirm"/);
 assert.match(html,/loadPermanentMission\(\)/);
 assert.match(html,/scope=account&conversation_id=/);
 assert.match(html,/saveGoalCommand\('SET_ACTIVE',message,null,'account'\)/);
 assert.match(html,/if\(!confirm\('Confirm this exact mission/);
 assert.match(html,/saved\.goal_state\?\.active_goal\?\.title!==message/);
 assert.match(html,/confirmedPermanentMission\?\.text!==message/);
 assert.match(html,/No owner-confirmed permanent mission recorded/);
 assert.match(html,/id="privateMissionAdoptHere"/);
 assert.match(html,/Use your already-confirmed permanent business mission as this conversation/);
 assert.match(html,/saveGoalCommand\('SET_ACTIVE',mission\)/);
 assert.match(html,/CONVERSATION_MISSION_BINDING_READBACK_UNVERIFIED/);
 assert.match(html,/Customer Zero/);
 assert.match(html,/residential remodeling and construction companies/);
 assert.match(html,/Past, Present, and Future/);
 assert.doesNotMatch(html,/autoConfirmPermanentMission|confirmMissionAtStartup/);
});
