import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {projectChatContinuityActivity} from '../src/reality-chat-continuity-activity-v1.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const h=n=>'sha256:'+String(n).repeat(64);
const ownerId=id(1),shift=id(2),work='work:'+'a'.repeat(32),ref='https://github.com/example/project/issues/7';
const obs={shift_id:shift,original_work_id:work,source_ref:ref,continuity_revision:3,
 continuity_head_sha256:h(1),shift_status:'AWAITING_EXACT_ORIGINAL_WORK',
 unresolved_proof_gates:['EXACT_CANONICAL_REVIEW_CLAIM_REQUIRED'],operational_next_action:'INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY',
 verified_investigation:{incident_id:id(3),investigation_event_id:id(4),suspension_receipt_sha256:h(2),investigation_receipt_sha256:h(3)},
 verified_independent_review:null,independent_original_outcome_verified:false,universe_return_verified:false,
 current_events:[{event_id:id(4),signal_kind:'VERIFIED_SUSPENSION_INVESTIGATION',state:'SHADOW_OBSERVED',worker_status:'COMPLETED',source_receipt_sha256:h(2),governed_wake_worker_run_id:id(5)}]};
const current={observed_at:'2026-11-27T14:00:00Z',active_shift_count:1,unverified_guard_count:0,observations:[{current_operational_facts:obs}]};
const incidentReadback={status:'OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY',owner_id:ownerId,owner_scope_verified:true,read_only:true,execution_authorized:false,installation_authorized:false,production_changed:false,items:[{incident_id:id(3),shift_id:shift,investigation_receipt_sha256:h(3),diagnosis:'Recorded diagnosis',proposed_upgrade:'Reconnect existing capability',assigned_employee:'Engineer',independent_reviewer:'Reviewer'}]};
const historyByShift={[shift]:{status:'FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY',shift_id:shift,execution_authorized:false,installation_authorized:false,production_changed:false,events:[]}};
const finalReadback={status:'INDEPENDENT_FINAL_RECEIPT_READBACK',does_not_authorize_actions:true,receipts:[]};
const input={current,incidentReadback,finalReadback,historyByShift,ownerId};
test('shows verified investigation and advisory proposal, not completion',()=>{
 const r=projectChatContinuityActivity(input),j=r.obligations[0];
 assert.equal(r.partial,false);assert.equal(r.execution_authorized,false);
 assert.deepEqual(j.steps.map(s=>s.state),['blocked','verified','proposal']);
 assert.equal(j.steps[2].proposal,'Reconnect existing capability');
 assert.equal(j.original_complete,false);
 assert.match(j.next_action,/independently review/);
});
test('foreign owner or mismatched incident receipt cannot contribute a proposal',()=>{
 for(const i of [{...incidentReadback,owner_id:id(9)},{...incidentReadback,items:[{...incidentReadback.items[0],investigation_receipt_sha256:h(9)}]}]){
  const j=projectChatContinuityActivity({...input,incidentReadback:i}).obligations[0];
  assert.equal(j.proposal_available,false);
 }
});
test('pending or failed worker is never presented as independently verified',()=>{
 const event={...obs.current_events[0],event_id:id(6),signal_kind:'VERIFIED_INVESTIGATION_REVIEW',state:'SHADOW_PENDING',worker_status:'FAILED',worker_stage:'INDEPENDENT_REVIEW_READ_FAILED'};
 const r=projectChatContinuityActivity({...input,current:{...current,observations:[{current_operational_facts:{...obs,current_events:[event]}}]}});
 const s=r.obligations[0].steps.find(s=>s.id===id(6));
 assert.equal(s.state,'blocked');assert.match(s.detail,/independent review read failed/);
});
test('retains exact historical observations without treating them as completion',()=>{
 const e={event_id:id(8),original_work_id:work,source_ref:ref,continuity_revision:2,event_state:'SHADOW_OBSERVED',event_kind:'QUALIFIER_PROOF_CHANGED',source_receipt_sha256:h(8)};
 const r=projectChatContinuityActivity({...input,historyByShift:{[shift]:{...historyByShift[shift],events:[e,{...e,event_id:id(9),original_work_id:'work:'+'b'.repeat(32)}]}}});
 assert.equal(r.obligations[0].steps[0].state,'historical');
 assert.equal(r.obligations[0].steps.some(s=>s.id===id(9)),false);
 assert.equal(r.obligations[0].original_complete,false);
});
test('missing evidence is unavailable, not no work, and closed shift can retain final receipts',()=>{
 assert.equal(projectChatContinuityActivity({...input,current:null}),null);
 const r=projectChatContinuityActivity({...input,current:{...current,observations:[],active_shift_count:0},finalReadback:{...finalReadback,receipts:[{status:'FULL_LOOP_INDEPENDENTLY_VERIFIED',original_work_id:work,settlement_event_id:id(7),artifact_sha256:'a'.repeat(64),installed_commit_sha:'b'.repeat(40),verifier_artifact_digest:h(4),provider_run_id:1,production_changed:false}]}});
 assert.equal(r.final_receipts.length,1);
 assert.equal(r.installation_authorized,false);
});

const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
const digest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
function terminalFixture(){
 const root=id(11),head=h(4),qualifier=h(6),parent=id(12);
 const ob={...obs,continuity_revision:4,continuity_root_id:root,continuity_head_sha256:head,qualifier_receipt_sha256:qualifier,
 verified_investigation:null,verified_independent_review:null,current_events:[]};
 const payload={owner_id:ownerId,shift_id:shift,original_work_id:work,source_ref:ref,qualifier_receipt_sha256:qualifier,
 prior_revision:3,prior_head_sha256:h(1),review_receipt_sha256:h(7),investigation_receipt_sha256:h(3),
 technical_evidence_only:true,previous_attempt_budget_preserved:true,replay_authorized:false,new_attempt_authorized:false,
 original_job_completed:false,original_business_red_verified:false,execution_authorized:false,installation_authorized:false,production_changed:false,
 terminal_recovery_history:{original_work_id:work,attempt_count:3,remaining_attempts:0,new_attempt_authorized:false,replay_permitted:false},
 next_action:'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED',
 technical_provider_proof:{status:'RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED',owner_id:ownerId,shift_id:shift,
 obligation_id:work,source_ref:ref,qualifier_receipt_sha256:qualifier,independent_technical_ci_verified:true,
 frozen_technical_red_verified:true,independent_ci_provider_observation:true,original_business_case_red_verified:false,
 original_job_completed:false,execution_authorized:false,production_changed:false,previous_attempt_budget_preserved:true,
 new_attempt_authorized:false,repeat_prior_ci_dispatch_permitted:false,github_artifact_digest:h(8)}};
 const row={event_id:id(13),parent_event_id:parent,continuity_root_id:root,lineage_hash:head.slice(7),
 entity_type:'reality_final_loop_terminal_technical_observation_v1',event_kind:'OBSERVATION',epistemic_status:'OBSERVED',
 assertion_time:current.observed_at,payload,content_hash:digest(payload),provenance:{source:'SIGNED_TERMINAL_TECHNICAL_CI_READBACK',
 principal_id:ownerId,worker_run_id:id(14),continuity_spine:{source_event_id:parent,prior_lineage_hash:h(1).slice(7)}}};
 return {row,ob};
}
test('exact accepted technical return shows revision progress and source-attributed actions, never original completion',()=>{
 const {row,ob}=terminalFixture();
 const r=projectChatContinuityActivity({...input,current:{...current,observations:[{current_operational_facts:ob}]},terminalRows:[row]});
 const j=r.obligations[0];
 assert.equal(j.terminal_evidence.revision,4);
 assert.equal(j.terminal_evidence.prior_revision,3);
 assert.equal(j.terminal_evidence.remaining_attempts,0);
 assert.equal(j.original_complete,false);
 assert.deepEqual(j.steps.filter(x=>x.state==='verified'&&x.employee).map(x=>x.employee),['Engineer','Reviewer']);
 const technical=j.steps.find(x=>x.id===row.event_id);
 assert.equal(technical.state,'verified');assert.equal(technical.employee,undefined);
 assert.equal(r.execution_authorized,false);
});
test('wrong owner, head, original, digest, or expanded budget cannot display accepted technical evidence',()=>{
 const {row,ob}=terminalFixture();
 const changes=[{...row,lineage_hash:h(9).slice(7)},{...row,content_hash:h(9).slice(7)}];
 for(const delta of [{owner_id:id(99)},{original_work_id:'work:'+'b'.repeat(32)},{new_attempt_authorized:true},
 {terminal_recovery_history:{...row.payload.terminal_recovery_history,remaining_attempts:1}}]){
  const payload={...row.payload,...delta};changes.push({...row,payload,content_hash:digest(payload)});
 }
 for(const invalid of changes){
  const j=projectChatContinuityActivity({...input,current:{...current,observations:[{current_operational_facts:ob}]},terminalRows:[invalid]}).obligations[0];
  assert.equal(j.terminal_evidence,null);assert.equal(j.steps.some(x=>x.id===row.event_id),false);
 }
});
test('shared signed-in activity refresh covers Chat and Employees without another timer or execution request',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="realityEmployeeLiveActivity"/);
 assert.match(html,/function renderEmployeeLiveActivity\(data\)/);
 assert.match(html,/x\.step\.employee===card\.dataset\.homeEmployee/);
 assert.match(html,/\['chat','employees'\]\.includes\(realityCurrentRoute\(\)\)/);
 assert.equal((html.match(/setTimeout\(refreshLiveActivity,8000\)/g)||[]).length,1);
 assert.equal((html.match(/fetch\('\/api\/reality\/personal-continuity-activity'/g)||[]).length,1);
 assert.match(html,/No currently verified action attributed to this employee/);
});
