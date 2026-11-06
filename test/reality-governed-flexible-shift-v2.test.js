import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildRealityEightHourShiftDraft}
 from '../src/reality-eight-hour-shift-plan-v1.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {computeShiftFingerprint}
 from '../src/reality-governed-shift-boundary-v1.js';
import {buildRealityShiftConversationBrief}
 from '../src/reality-shift-conversation-brief-v1.js';

function catalog(){
 const source=(i,type,url)=>({
  finding_id:'catalog:'+i.repeat(32),finding_type:type,
  source:type==='OPEN_ISSUE'?'github_issues':'github_pull_requests',
  state:type==='OPEN_ISSUE'?'TRACKED_NEEDS_REVIEW':'OPEN_AWAITING_REVIEW',
  title:'Source-backed project item '+i,category:'reliability',
  evidence_refs:['https://github.com/maloney2323/Reality/'+url],
  value_assessment:{triage_score:87},
  execution_work_item:null,authorization_required:false
 });
 return {
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  observed_at:'2026-11-05T18:00:00Z',authority:'NONE_GRANTED',
  execution_enabled:false,
  items:[source('a','OPEN_ISSUE','issues/201'),
   source('b','OPEN_ISSUE','issues/188'),
   source('c','OPEN_PULL_REQUEST','pull/229')],
  source_coverage:{issues:'checked',pull_requests:'checked',
   actions:'checked',commits:'checked',
   customer_feedback:'not_connected',business_operations:'not_connected',
   external_research:'not_connected'}
 };
}
test('existing planner admits 8-, 10-, and 12-hour owner timeboxes without inventing work',()=>{
 const brief=buildRealityWorkdayOpportunityBrief(catalog());
 const plans=[8,10,12].map(durationHours=>
  buildRealityEightHourShiftDraft(brief,{durationHours}));
 for(let i=0;i<plans.length;i++){
  const h=[8,10,12][i],plan=plans[i];
  assert.equal(plan.shift_duration_hours,h);
  assert.equal(plan.shift_duration_minutes,h*60);
  assert.equal(plan.slots.length,8);
  assert.equal(plan.slots[0].offset_start_minutes,0);
  assert.equal(plan.slots.at(-1).offset_end_minutes,h*60);
  assert.ok(plan.slots.every(s=>s.planning_minutes>=1&&s.planning_minutes<=120));
  assert.ok(plan.slots.every((s,i)=>s.offset_end_minutes-s.offset_start_minutes===s.planning_minutes&&
   s.offset_start_minutes===(i?plan.slots[i-1].offset_end_minutes:0)));
  assert.equal(plan.job_started,false);
  assert.equal(plan.shift_started,false);
  assert.equal(plan.financial_roi_verified,false);
  assert.equal(plan.production_changed,false);
  assert.match(computeShiftFingerprint(plan),/^sha256:[a-f0-9]{64}$/);
 }
 assert.equal(new Set(plans.map(computeShiftFingerprint)).size,3);
 assert.equal(computeShiftFingerprint(buildRealityEightHourShiftDraft(brief)),
  computeShiftFingerprint(plans[0]));
});
test('existing eight-hour authorizations retain the original exact SHA256 fingerprint',()=>{
 const plan=buildRealityEightHourShiftDraft(buildRealityWorkdayOpportunityBrief(catalog()));
 const source=plan.slots.map(x=>({
  i:x.sequence,id:x.id,stage:x.stage,
  begin:x.offset_start_minutes,end:x.offset_end_minutes,
  source:x.candidate?.source_url||null,
  finding:x.candidate?.finding_id||null,
  gate:x.required_gate||null
 }));
 const oldHash='sha256:'+createHash('sha256').update(JSON.stringify({
  version:'reality-exact-eight-hour-shift-v1',source_scope:plan.source_scope,
  timebox:480,slots:source
 })).digest('hex');
 assert.equal(computeShiftFingerprint(plan),oldHash);
});

test('duration cannot be manipulated after exact scope fingerprinted',()=>{
 const brief=buildRealityWorkdayOpportunityBrief(catalog());
 assert.throws(()=>buildRealityEightHourShiftDraft(brief,{durationHours:0}),
  /REALITY_EIGHT_HOUR_SHIFT_DURATION_NOT_SUPPORTED/);
 assert.throws(()=>buildRealityEightHourShiftDraft(brief,{durationHours:24}),
  /REALITY_EIGHT_HOUR_SHIFT_DURATION_NOT_SUPPORTED/);
 const valid=buildRealityEightHourShiftDraft(brief,{durationHours:10});
 assert.throws(()=>computeShiftFingerprint({...valid,shift_duration_minutes:720}),
  /SHIFT_FINGERPRINT_UNVERIFIED_PLAN/);
 assert.throws(()=>computeShiftFingerprint({...valid,slots:valid.slots.map((s,i)=>
  i===7?{...s,offset_end_minutes:660}:s)}),/SHIFT_FINGERPRINT_UNVERIFIED_PLAN/);
});
test('owner-bound endpoint exposes read-only selection and checks duration on exact authorization',()=>{
 const api=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 assert.match(api,/requested_shift_draft:draft/);
 assert.match(api,/computeShiftFingerprint\(plan\)/);
 assert.match(api,/b.requested_hours\?\?8/);
 assert.match(api,/!\[8,10,12\]\.includes/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/s.plan_fingerprint===fingerprint/);
 assert.doesNotMatch(api,/installation_authorized:true/);
});
test('database migration widens existing constraints without rewriting prior shift rows',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261105180000_flexible_governed_employee_shifts_v2.sql',import.meta.url),'utf8');
 assert.match(sql,/interval '10 hours',interval '12 hours'/);
 assert.match(sql,/offset_end_minutes <= 720/);
 assert.match(sql,/if v_end not in \(480,600,720\)/);
 assert.match(sql,/p_start_at\+pg_catalog.make_interval\(mins => v_end\)/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/EMPLOYEE_SHIFT_EVIDENCE_REPORT/);
 assert.match(sql,/net_human_equivalent_hours_returned',null/);
 assert.doesNotMatch(sql,/\btruncate\b|\bdelete from\b/i);
});
test('shift Conversation Brief reports configured 10/12-hour plans without claiming savings',()=>{
 const sid='11111111-2222-4333-8444-555555555555';
 for(const hours of [10,12]){
  const start='2026-11-06T08:00:00.000Z';
  const end=new Date(Date.parse(start)+hours*3600000).toISOString();
  const s={shift_id:sid,status:'QUEUED',
   planned_start_at:start,planned_end_at:end,
   steps:Array.from({length:8},(_,i)=>({
    step_index:i+1,state:'QUEUED',proof_sha256:null
   }))};
  const brief=buildRealityShiftConversationBrief([s],[],
   new Date('2026-11-06T07:00:00.000Z'));
  assert.equal(brief.shift_duration_hours,hours);
  assert.match(brief.headline,new RegExp(hours+'-hour shift'));
  assert.equal(brief.verified_human_hours_saved,null);
  assert.equal(brief.complete_shift_proven,false);
 }
});
