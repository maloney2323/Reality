import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectPersonalCompletionReports,projectShiftCycleCompletion}
 from '../src/reality-completion-report-v0.1.js';
import {projectAutonomousShiftHome}
 from '../src/reality-autonomous-shift-control-v1.0.js';

const work='work:'+'a'.repeat(32);
const reservation='c7dc57d7-ee65-424e-8ff8-9ff434f10997';
const outcomeId='f8068f2d-7451-5238-bf81-17e85cc2cfd0';
const issue='https://github.com/maloney2323/Reality/issues/143';
const handoff={event_id:'handoff',entity_type:'personal_discovered_work_handoff',
 assertion_time:'2026-10-27T22:01:00.000Z',payload:{
  work_id:work,work_key:'workflow-failure:test',
  work_item:{work_item_id:work,connector:'github',operation:'create_issue',
   inputs:{repository:'maloney2323/Reality',title:'Repair failing workflow'}},
  evidence_refs:['run-1','run-2']
 }};
const event={event_id:outcomeId,entity_type:'personal_issue_execution_outcome',
 epistemic_status:'VERIFIED',assertion_time:'2026-10-27T22:05:00.000Z',
 payload:{work_id:work,reservation_id:reservation,outcome_state:'VERIFIED_OUTCOME',
  independently_verified:true,reservation_state:'VERIFIED',provider_issue_url:issue,
  provider_issue_number:143}};

test('verified issue action gives precise completed-action report and OPEN job',()=>{
 const reports=projectPersonalCompletionReports({events:[event,handoff]});
 assert.equal(reports.length,1);
 const r=reports[0];
 assert.equal(r.status,'ACTION_VERIFIED_JOB_OPEN');
 assert.equal(r.action_completed,true);
 assert.equal(r.full_job_completed,false);
 assert.equal(r.shift_completed,false);
 assert.equal(r.issue_url,issue);
 assert.equal(r.receipt_id,outcomeId);
 assert.equal(r.reservation_id,reservation);
 assert.equal(r.source_evidence_count,2);
 assert.equal(r.measurement.time_saved_seconds,null);
 assert.equal(r.measurement.execution_cost_usd,null);
 assert.match(r.pending_work.join(' '),/Repair the underlying cause/);
});
test('no outcome, ungrounded outcome, duplicate or forged URL cannot prove execution',()=>{
 assert.equal(projectPersonalCompletionReports({events:[handoff]}).length,0);
 assert.equal(projectPersonalCompletionReports({events:[event]}).length,0);
 const invalid={...event,payload:{...event.payload,provider_issue_url:'https://evil.example/issues/143'}};
 assert.equal(projectPersonalCompletionReports({events:[handoff,invalid]})[0].status,'OUTCOME_UNRESOLVED');
 const unsigned={...event,epistemic_status:'UNKNOWN'};
 assert.equal(projectPersonalCompletionReports({events:[handoff,unsigned]})[0].action_completed,false);
 assert.equal(projectPersonalCompletionReports({events:[handoff,event,event]}).length,1);
});
test('reconstructed shift result remains a discovery cycle not a finished shift',()=>{
 const scope={continuity_root_id:'root',worldline_id:'world'};
 const events=[{event_id:'shift:tick:2026-10-27:22:00:MANUAL:result',
  entity_type:'shift_result',event_kind:'observation',
  continuity_root_id:'root',worldline_id:'world',
  assertion_time:'2026-10-27T22:10:00Z',payload:{
   tick_id:'shift:tick:2026-10-27:22:00:MANUAL',phase:'MANUAL',
   evidence_summary:{recent_observation_count:10,
    discovered_work:[{work_id:'x',title:'Item A'},{work_id:'y',title:'Item B'}]}
  }}];
 const home=projectAutonomousShiftHome({events,config:{enabled:true,updated_by:'owner'},
  principalId:'owner',scope});
 assert.equal(home.latest_cycle.discovered_work_count,2);
 assert.equal(home.latest_cycle.discovered_items.length,2);
 assert.equal(home.latest_cycle.discovered_items[0].title,'Item A');
 assert.equal(home.latest_cycle.discovered_items[0].status,'DISCOVERED_NOT_EXECUTED');
 const report=projectShiftCycleCompletion({home});
 assert.equal(report.discovered_items[0].title,'Item A');
 assert.equal(report.shift_completed,false);
 assert.equal(report.full_job_completed,false);
 assert.equal(report.discovered_work_count,2);
 assert.equal(report.verified_execution_count,0);
 assert.equal(report.source_receipt_id,events[0].event_id);
 assert.equal(report.measurement.realized_cash_savings_usd,null);
});
test('no persisted shift or missing latest cycle produces no completion',()=>{
 assert.equal(projectShiftCycleCompletion({home:{status:'NO_RECORDED_SHIFT'}}),null);
 assert.equal(projectShiftCycleCompletion({home:{status:'RECORDED',latest_tick_id:'shift:tick:x'}}),null);
});
test('UI binds completion receipts to both execution paths, session and shift saved readback',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
 assert.ok(js);
 assert.match(html,/id="wcCompletionCenter"/);
 assert.match(html,/id="shiftEndingReceipt"/);
 assert.match(js,/void wcLoadCompletionReports\(\)/);
 assert.match(js,/wcRenderShiftEndingReceipt\(b.home\)/);
 assert.match(js,/\/api\/reality\/personal-completion-reports\?conversation_id=/);
 assert.match(js,/This is not evidence that a 1–8 hour automation shift finished/);
 assert.doesNotThrow(()=>new Function(js));
});
