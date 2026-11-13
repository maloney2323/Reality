import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runRealityCognitiveRuntime} from '../src/reality-cognitive-runtime-v1.0.js';
import {buildRealityProposedEmployeeRoleDiscussionContext}
 from '../src/reality-employee-identity-roster-v1.js';

const signal={
 cleaner_version:'0.1.0',
 packet:{packet_id:'rsp:weekly-conversation-test',
  raw_content_digest:'sha256:test'},
 fragments:[{fragment_id:'msg:weekly-test',
  cleaned_text:'Do you have suggestions for jobs for each employee next week?'}],
 transformation_receipt:{receipt_id:'tr:weekly-test',
  meaning_change_claimed:false},
 lineage:{packet_id:'rsp:weekly-conversation-test',
  transformation_receipt_id:'tr:weekly-test',continuity_required:true}
};
test('normal read-only employee planning generates ONE model call, with no keyword-triggered deep lanes',async()=>{
 const requests=[];
 const fetchImpl=async(url,options)=>{
  requests.push({url,payload:JSON.parse(options.body)});
  return {ok:true,json:async()=>({
   id:'resp:weekly-planning-test',status:'completed',
   output_text:'We can discuss proposed weekly jobs by role. Nothing was authorized or scheduled.'
  })};
 };
 const r=await runRealityCognitiveRuntime({
  message:'Do you think we should discuss our eight employees and plan useful jobs for Monday through Friday next week?',
  governedSignal:signal,
  cognitionEffort:'CONVERSATION',
  apiKey:'test-only',model:'test-model',fetchImpl
 });
 assert.equal(requests.length,1,'Normal conversational planning is one model response');
 assert.equal(requests[0].url,'https://api.openai.com/v1/responses');
 assert.equal(requests[0].payload.max_output_tokens,950);
 assert.equal(r.mode,'FAST');
 assert.equal(r.authority_granted,false);
 assert.equal(r.execution_authorized,false);
 assert.match(r.answer,/proposed weekly jobs/);
});
test('trusted conversation effort cannot disable governance with unknown modes',async()=>{
 await assert.rejects(
  ()=>runRealityCognitiveRuntime({
   message:'What should each employee do next week?',
   governedSignal:signal,cognitionEffort:'NO_VERIFICATION',
   apiKey:'test-only',model:'test-model',fetchImpl:async()=>{throw Error('unexpected provider')}
  }),/COGNITION_EFFORT_NOT_AUTHORIZED/);
});
test('existing eight employee roles are available for free planning discussion without live-work claims',()=>{
 const context=buildRealityProposedEmployeeRoleDiscussionContext({
  observedAt:new Date('2026-11-13T16:30:00Z')
 });
 assert.equal(context.roles.length,8);
 assert.deepEqual(context.roles.map(x=>x.employee_name),
  ['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage']);
 assert.equal(context.weekly_plan_generated_by_this_read,false);
 assert.equal(context.job_started,false);
 assert.equal(context.external_execution_authorized,false);
 assert.equal(context.business_days_customizable,true);
 assert.equal(context.shift_hours_customizable,true);
 assert.ok(context.roles.every(r=>r.status==='PROPOSED_ROLE_NOT_AN_ACTIVE_WORKER'));
 assert.ok(context.roles.every(r=>r.actual_assigned_source_jobs===null));
 assert.match(context.summary,/NOT eight independent/);
});
test('authenticated chat chooses conversation lane and includes standing roster while retaining final publication',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const orch=readFileSync(new URL('../src/reality-live-intelligence-orchestration-v0.1.js',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/reality-model-gateway-v0.1.js',import.meta.url),'utf8');
 assert.match(api,/cognitionEffort:'CONVERSATION'/);
 assert.match(api,/buildRealityProposedEmployeeRoleDiscussionContext\(\)/);
 assert.match(api,/publishPrivateAssistantAtomically\(session/);
 assert.match(api,/assertFinalChatPublicationProof\(/);
 assert.match(orch,/cognitionEffort,/);
 assert.match(model,/WEEKLY WORK DISCUSSION CONTRACT/);
 assert.match(model,/No separate permission is required merely to talk about the plan/);
});
