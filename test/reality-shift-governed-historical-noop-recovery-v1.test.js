import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityShiftConversationBrief} from '../src/reality-shift-conversation-brief-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261104_shift_governed_historical_noop_auto_recovery_v1.sql');
const edge=read('supabase/functions/reality-governed-employee-shift-wake-v1/index.ts');
const client=read('reality-shift-conversation-v1.js');

test('existing signed shift worker invokes governing reconciler, not a new agent',()=>{
 assert.match(edge,/reality_reconcile_employee_shift_historical_noop_v1/);
 assert.match(edge,/SHIFT_GOVERNED_HISTORICAL_NOOP_RECONCILED/);
 assert.match(edge,/GOVERNED_HISTORICAL_NOOP_READBACK_UNTRUSTED/);
 assert.match(edge,/new_research_agent_started:false/);
 assert.match(edge,/installation_authorized:false,original_job_completed:false/);
 assert.doesNotMatch(edge,/api\.openai\.com|OPENAI_API_KEY|REALITY_SHIFT_RESEARCH_MODEL/);
});
test('historical no-op requires original owner-scoped queue, hashed live source and independently verified Universe evidence',()=>{
 for(const pattern of [
  /current_user<>'service_role'/,
  /reality_reconcile_employee_shift_original_v1\(\)/,
  /EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY/,
  /source_proof_sha256/,
  /governed_queue_phase/,
  /ISOLATED_INSTALLED_PROBATION/,
  /reality_read_genuine_reconciliation_target_v1/,
  /RECONCILIATION_ALREADY_SATISFIED_BY_VERIFIED_UNIVERSE/,
  /independent_database_readback/,
  /previous_original_universe_event_id/,
  /previous_target_universe_event_id/,
  /unresolved_reconciliation_targets/,
  /planned_start_at<=v_at and planned_end_at>v_at/,
  /for update skip locked/,
  /AWAITING_EXACT_WORK/,
  /v_step_count<>2/,
  /proof_sha256=v_digest/,
  /source_status='VERIFIED_HISTORICAL_NOOP'/,
  /original_job_execution_replayed',false/,
  /new_customer_job_created',false/,
  /original_job_completed',false/,
  /installation_authorized',false/
 ])assert.match(sql,pattern);
 assert.doesNotMatch(sql,/api\.openai\.com|github\.com\/repos\/maloney2323\/Reality\/dispatches|insert into reality_internal\.genuine_capability_queue/);
});
test('missing JSON evidence fails closed; other blocked work is not erased by a historical no-op',()=>{
 assert.match(sql,/coalesce\(v_link->>'governed_existing_work_status',''\)/);
 assert.match(sql,/coalesce\(v_link->>'governed_original_work_id',''\) !~/);
 assert.match(sql,/coalesce\(v_target->>'independent_database_readback',''\)/);
 assert.match(sql,/coalesce\(v_target->>'previous_original_universe_event_id',''\) !~/);
 assert.match(sql,/source_status is distinct from 'VERIFIED_HISTORICAL_NOOP'/);
 assert.match(sql,/when v_historical_noop and not exists\(/);
});

test('no-op is not a final original-job receipt and preserves the approved shift boundary',()=>{
 assert.match(sql,/status='RUNNING',last_progress_at=v_at/);
 assert.match(sql,/END[ED_]+READ_ONLY/);
 assert.match(sql,/new_original_job_completed_by_noop',false/);
 assert.match(sql,/original_jobs_independently_settled_in_this_shift/);
 assert.match(sql,/net_human_equivalent_hours_returned',null/);
 assert.match(sql,/realized_cash_savings_usd',null/);
 assert.match(sql,/exact_original_job_binding_verified/);
 assert.equal(sql.split('create or replace function public.reality_close_employee_shift_v1()').length-1,1);
 assert.equal(sql.split('create or replace function public.reality_reconcile_employee_shift_historical_noop_v1()').length-1,1);
 assert.equal(sql.split('end $fn$;').length-1,2);
});
const uuid='11111111-2222-4333-8444-555555555555',hash='sha256:'+'a'.repeat(64);
const steps=Array.from({length:8},(_,i)=>({
 step_index:i+1,stage:['SOURCE_RECONCILIATION','VERIFY_OPEN_ISSUE','VERIFY_PROVIDER_EVIDENCE',
 'REVIEW_INDEPENDENT_EVIDENCE','QUALIFY_NEXT_WORK','CONDITIONAL_EXECUTION_WINDOW',
 'CONDITIONAL_VERIFICATION_WINDOW','EVIDENCE_AND_VALUE_REPORT'][i],
 state:i<5?'SOURCE_CHECKED':i<7?'BLOCKED_PROVIDER':'QUEUED',
 source_status:i<5?'OPEN_ISSUE':i<7?'VERIFIED_HISTORICAL_NOOP':null,
 source_ref:null,proof_sha256:i<7?hash:null,completed_at:i<7?'2026-11-05T00:42:00Z':null,
}));
const shift={shift_id:uuid,status:'RUNNING',
 planned_start_at:'2026-11-04T20:25:00Z',planned_end_at:'2026-11-05T04:25:00Z',
 steps};
test('Chat truthfully reports verified historical no-op once and no final receipt or fabricated savings',()=>{
 const brief=buildRealityShiftConversationBrief([shift],[],new Date('2026-11-05T01:00:00Z'));
 assert.equal(brief.status,'RUNNING');
 assert.equal(brief.verified_source_checks,5);
 assert.equal(brief.verified_original_job_receipts,0);
 assert.equal(brief.complete_shift_proven,false);
 assert.equal(brief.verified_human_hours_saved,null);
 assert.equal(brief.events.filter(e=>e.code==='HISTORICAL_NOOP_VERIFIED').length,1);
 assert.match(brief.current,/safely cleared the conditional execution gate/);
 assert.match(brief.what_finished,/no original-job completion independently matched/);
 assert.match(brief.next,/remaining authorized work/);
 assert.match(client,/HISTORICAL_NOOP_VERIFIED/);
});
test('a partial or nonverified no-op never becomes a complete historic recovery',()=>{
 const b={...shift,steps:steps.map((x,i)=>i===6?{...x,state:'AWAITING_EXACT_WORK',
    source_status:null,proof_sha256:null}:x)};
 const brief=buildRealityShiftConversationBrief([b],[],new Date('2026-11-05T01:00:00Z'));
 assert.doesNotMatch(brief.current,/safely cleared the conditional execution gate/);
 assert.equal(brief.verified_original_job_receipts,0);
});
