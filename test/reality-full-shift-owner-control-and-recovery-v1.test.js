import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interpretSignedInChatShiftCommand}
 from '../reality-owner-chat-shift-command-v1.js';
import {buildRealityCapabilityOperatingContext}
 from '../src/reality-capability-operating-context-v1.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('explicit Run Full Shift authorizes exactly one bounded 8-hour shift',()=>{
 for(const text of ["Run Riley's full shift","Run full shift",
  "Reality, run the full shift","Please start Riley’s entire workday",
  "Start the complete engineering shift now"]){
  const c=interpretSignedInChatShiftCommand(text);
  assert.equal(c?.duration_hours,8,text);
  assert.equal(c?.intent,'START_ONE_OWNER_AUTHORIZED_EMPLOYEE_SHIFT');
  assert.equal(c?.authorization_source,'EXPLICIT_SIGNED_IN_CHAT_SEND_ACTION');
  assert.equal(c?.installation_authorized,false);
  assert.equal(c?.production_changed,false);
 }
});
test('questions, future, repeat, denial and simulated full shift never start',()=>{
 for(const text of [
  "Can Riley run a full shift?",
  "Do not start the full shift",
  "Run full shift every day",
  "Run the full shift tomorrow",
  "Run full shift if everything passes",
  "Pretend to run full shift",
  "I want Riley to run a full shift",
  "Can you schedule a full shift?",
  "Run Riley's full shift without starting anything"
 ]){
  assert.equal(interpretSignedInChatShiftCommand(text),null,text);
 }
});
test('one click always uses original authenticated owner shift endpoint',()=>{
 const html=read('reality-chat-simple.html');
 const api=read('api/reality/personal-governed-employee-shift.js');
 assert.match(html,/id="runFullShift" type="button"/);
 assert.match(html,/\$\('runFullShift'\)\.onclick=async\(\)=>/);
 assert.match(html,/id="runShiftHours"/);
 const mainChat=read('index.html');
 assert.match(mainChat,/id="realityRileyShiftLaunchLink" href="\/chat-simple#riley-shift"/);
 assert.match(mainChat,/No shift starts when you set a goal or send an ordinary message/);
 assert.match(html,/window\.location\.hash==='#riley-shift'/);
 assert.doesNotMatch(html,/\$\('runShiftHours'\)\.value='3'/);
 assert.match(html,/Start Riley \+ Taylor Jobs/);
 assert.match(html,/Opening the page does not authorize work or install code/);
 assert.doesNotMatch(mainChat,/realityRileyShiftLaunch[^\n]*onclick/);
 assert.match(html,/Start the jobs until complete/);
 assert.match(html,/command.completion_bound!==true/);
 assert.match(html,/const receipt=await authorizeShiftFromChat\(command\)/);
 assert.match(html,/safeShiftReadbackState\(before/);
 assert.match(html,/expected_fingerprint:draft.expected_fingerprint/);
 assert.match(html,/action:'AUTHORIZE_EXACT_EMPLOYEE_SHIFT'/);
 assert.match(html,/Full-shift authorization uncertain\. Do not create a duplicate shift/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/reality_authorize_employee_shift_v1/);
 assert.match(api,/worker_dispatch_verified:false/);
 assert.doesNotMatch(html,/runFullShift'\)\.onclick.*?installation_authorized:true/s);
});
test('Reality learns shared governed recovery without pretending unlimited authority',()=>{
 const c=buildRealityCapabilityOperatingContext();
 assert.equal(c.underlying_model_role,'RESEARCH_REASON_PROPOSE_CODE_WITHIN_VERIFIED_SCOPE');
 assert.match(c.self_description,/shared governed capability-recovery architecture/);
 assert.match(c.self_description,/do not each have a separate repair engine/);
 assert.match(c.shift_recovery_principle,/not a reason to abandon the whole shift/);
 assert.match(c.shift_recovery_principle,/continue other safe authorized tasks/);
 assert.match(c.shift_recovery_principle,/exact upgrade approval/);
 assert.match(c.shift_recovery_principle,/not proof that any specific recovery or full shift succeeded/);
 assert.ok(c.process.includes('REPEAT_EXISTING_JOB_WORK_CYCLE_UNTIL_AUTHORIZED_SHIFT_END_TIME'));
 assert.equal(c.hard_boundaries.model_cannot_install,true);
 assert.equal(c.hard_boundaries.model_cannot_mint_authority,true);
 assert.equal(c.hard_boundaries.worker_retries_must_not_repeat_uncertain_effects,true);
 assert.equal(c.known_components.find(x=>x.id==='multi_job_full_shift_execution').status,
  'NOT_INDEPENDENTLY_PROVEN');
 assert.equal(c.execution_authorized,false);
 assert.equal(c.customer_job_completed,false);
});
