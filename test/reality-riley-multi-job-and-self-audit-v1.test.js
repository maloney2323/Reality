import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyRileyMultiJobEligibility,runRileyGovernedMultiJobShiftTick}
 from '../src/reality-riley-multi-job-shift-controller-v1.js';
import {buildRealityEvidenceGroundedSelfAudit,summarizeRealitySelfAuditForModel}
 from '../src/reality-evidence-grounded-self-audit-v1.js';
const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const S1='https://github.com/maloney2323/Reality/issues/263';
const S2='https://github.com/maloney2323/Reality/issues/185';
const W1='work:'+'a'.repeat(32),W2='work:'+'b'.repeat(32);
const J1='33333333-4444-4555-8666-777777777777';
const J2='44444444-5555-4666-8777-888888888888';
const E1='55555555-6666-4777-8888-999999999999';
const E2='66666666-7777-4888-8999-aaaaaaaaaaaa';
const HASH='sha256:'+'a'.repeat(64);
const now=new Date('2026-11-06T14:30:00Z');
const claimId1='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const claimId2='bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
function shift(){
 return {
  status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  work_installation_authorized_by_read:false,production_changed:false,
  verified_human_hours_saved:null,
  shifts:[{shift_id:SHIFT,status:'AWAITING_EXACT_ORIGINAL_WORK',
   plan_fingerprint:HASH,planned_start_at:'2026-11-06T14:00:00Z',
   planned_end_at:'2026-11-06T22:00:00Z',
   steps:Array.from({length:8},(_,i)=>({
    step_index:i+1,state:i===1||i===2?'SOURCE_CHECKED':
       i===5?'AWAITING_EXACT_WORK':'QUEUED',
    source_ref:i===1?S1:i===2?S2:null,
    proof_sha256:i===1||i===2?HASH:null
   }))}]
 };
}
function loop(){
 return {status:'OWNER_GOVERNED_LOOP_READBACK',
  owner_installation_authorized_by_read:false,
  external_action_performed:false,production_changed:false,
  jobs:[
   {source_issue_number:263,original_work_id:W1,
    environment:'ISOLATED_PREVIEW',independently_settled:false,
    owner_install_approved:false,phase:'PENDING_FROZEN_REPRODUCTION'},
   {source_issue_number:185,original_work_id:W2,
    environment:'ISOLATED_PREVIEW',independently_settled:false,
    owner_install_approved:false,phase:'PENDING_FROZEN_REPRODUCTION'}
  ]};
}
function eligibility(){
 return {status:'EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED',
  shift_id:SHIFT,execution_authorized:false,installation_authorized:false,
  production_changed:false,candidate_count:2,
  candidates:[
   {shift_id:SHIFT,owner_id:OWNER,original_work_id:W1,
    trigger_id:J1,source_event_id:E1,source_ref:S1,
    source_step_index:2,source_proof_sha256:HASH,
    current_owner_scope_verified:true,
    independently_settled:false,installation_authorized:false,
    production_changed:false},
   {shift_id:SHIFT,owner_id:OWNER,original_work_id:W2,
    trigger_id:J2,source_event_id:E2,source_ref:S2,
    source_step_index:3,source_proof_sha256:HASH,
    current_owner_scope_verified:true,
    independently_settled:false,installation_authorized:false,
    production_changed:false}
  ]};
}
test('multi-job selector preserves owner, source hash, goal ledger and unique originals',()=>{
 const got=verifyRileyMultiJobEligibility({
  shiftReadback:shift(),ownerLedgerReadback:loop(),
  eligibility:eligibility(),ownerId:OWNER,shiftId:SHIFT,now
 });
 assert.equal(got.length,2);assert.equal(got[0].original_work_id,W1);
 assert.equal(got[1].original_work_id,W2);
 assert.throws(()=>verifyRileyMultiJobEligibility({
  shiftReadback:shift(),ownerLedgerReadback:loop(),
  eligibility:{...eligibility(),candidates:[eligibility().candidates[0],
   eligibility().candidates[0]]},
  ownerId:OWNER,shiftId:SHIFT,now
 }),/RILEY_MULTI_JOB_EXACT_UNIQUE_GOVERNED_ORIGINAL_REQUIRED/);
 const bad=eligibility();bad.candidates[0].source_proof_sha256='sha256:'+'b'.repeat(64);
 assert.throws(()=>verifyRileyMultiJobEligibility({
  shiftReadback:shift(),ownerLedgerReadback:loop(),
  eligibility:bad,ownerId:OWNER,shiftId:SHIFT,now
 }),/RILEY_MULTI_JOB_LIVE_PROVIDER_SOURCE_DIGEST_CHANGED/);
});
test('two distinct jobs in one shift: verified first receipt, second remains pending',async()=>{
 const calls=[],executed=[];
 const result=await runRileyGovernedMultiJobShiftTick({
  db:{url:'isolated'},ownerId:OWNER,shiftId:SHIFT,now:()=>now,
  loadShiftReadback:async()=>shift(),loadOwnerLedgerReadback:async()=>loop(),
  loadTrustedAuthorizedOriginal:async x=>{
   calls.push(['load',x.original_work_id]);
   return {qualifiedOriginal:{owner_id:OWNER,
    source_issue_number:x.original_work_id===W1?263:185,
    original_work_id:x.original_work_id},
    scope:{original_work_id:x.original_work_id,owner_id:OWNER},
    workItem:{work_item_id:x.original_work_id}};
  },
  runOriginal:async x=>{
   executed.push(x.qualifiedOriginal.original_work_id);
   return {status:'ORIGINAL_JOB_OUTCOME_NEEDS_DURABLE_SETTLEMENT',
    original_work_id:x.qualifiedOriginal.original_work_id,
    shift_id:SHIFT,installation_authorized_by_employee:false,
    original_job_settled:false,independently_verified_final_receipt:false,
    no_new_original_job_created:true,production_changed:false};
  },
  callRpc:async({name,args})=>{
   calls.push([name,args]);
   if(name==='reality_read_eligible_shift_originals_v1')return eligibility();
   if(name==='reality_claim_exact_shift_original_v1')return {
    status:'EXACT_EXISTING_SHIFT_ORIGINAL_CLAIMED',
    shift_id:SHIFT,owner_id:OWNER,original_work_id:args.p_original_work_id,
    trigger_id:args.p_trigger_id,claim_id:args.p_original_work_id===W1?
     claimId1:claimId2,original_execution_completed:false,
    owner_installation_authorized:false,production_changed:false};
   if(name==='reality_record_exact_shift_original_outcome_v1')return {
    status:'SHIFT_ORIGINAL_OUTCOME_DURABLY_RECORDED',
    original_work_id:args.p_original_work_id,claim_id:args.p_claim_id,
    last_execution_status:args.p_status,original_job_settled:false,
    installation_authorized:false,production_changed:false};
   if(name==='reality_reconcile_exact_shift_original_receipt_v1')return {
    status:args.p_original_work_id===W1?
     'EXACT_ORIGINAL_RECEIPT_INDEPENDENTLY_RECONCILED':
     'NO_INDEPENDENT_ORIGINAL_RECEIPT_YET',
    original_work_id:args.p_original_work_id,
    installation_authorized:false,production_changed:false};
   throw Error('UNEXPECTED_RPC_'+name);
  }
 });
 assert.deepEqual(executed,[W1,W2]);
 assert.equal(result.attempted,2);
 assert.equal(result.independently_settled,1);
 assert.equal(result.shift_finished,false);
 assert.equal(result.full_shift_proven,false);
 assert.equal(result.outcomes[1].original_job_settled,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.verified_human_hours_saved,null);
 assert.equal(calls.filter(x=>x[0]==='reality_record_exact_shift_original_outcome_v1').length,2);
});
test('existing or forbidden claimed work is not executed again',async()=>{
 let loaded=0;
 const result=await runRileyGovernedMultiJobShiftTick({
  db:{},ownerId:OWNER,shiftId:SHIFT,now:()=>now,
  loadShiftReadback:async()=>shift(),loadOwnerLedgerReadback:async()=>loop(),
  loadTrustedAuthorizedOriginal:async x=>{loaded++;return {
   qualifiedOriginal:{owner_id:OWNER,original_work_id:x.original_work_id,
    source_issue_number:x.original_work_id===W1?263:185},
   scope:{owner_id:OWNER,original_work_id:x.original_work_id},
   workItem:{work_item_id:x.original_work_id}
  }},
  callRpc:async({name,args})=>{
   if(name==='reality_read_eligible_shift_originals_v1')return eligibility();
   if(name==='reality_claim_exact_shift_original_v1')return {
    status:'ORIGINAL_ALREADY_CLAIMED_NO_AUTOMATIC_REPLAY'};
   throw Error('UNEXPECTED_RPC');
  }
 });
 assert.equal(loaded,2); // trusted read-only preflight without execution
 assert.equal(result.attempted,0);
 assert.deepEqual(result.outcomes.map(x=>x.status),
  ['ORIGINAL_NOT_REEXECUTED','ORIGINAL_NOT_REEXECUTED']);
});
test('missing trusted executor never consumes a real original-work claim',async()=>{
 let claims=0;
 const result=await runRileyGovernedMultiJobShiftTick({
  db:{},ownerId:OWNER,shiftId:SHIFT,now:()=>now,
  loadShiftReadback:async()=>shift(),loadOwnerLedgerReadback:async()=>loop(),
  loadTrustedAuthorizedOriginal:async()=>{throw Error('TRUSTED_ADAPTER_NOT_CONFIGURED')},
  callRpc:async({name})=>{
   if(name==='reality_read_eligible_shift_originals_v1')return eligibility();
   if(name==='reality_claim_exact_shift_original_v1')claims++;
   throw Error('NO_CLAIM_PERMITTED');
  }
 });
 assert.equal(claims,0);
 assert.equal(result.attempted,0);
 assert.deepEqual(result.outcomes.map(x=>x.status),[
  'ORIGINAL_TRUSTED_PREFLIGHT_BLOCKED_NO_CLAIM',
  'ORIGINAL_TRUSTED_PREFLIGHT_BLOCKED_NO_CLAIM']);
 assert.equal(result.shift_finished,false);
 assert.equal(result.production_changed,false);
});
test('provider uncertainty is marked durable; loss of readback stops tick',async()=>{
 const base={
  db:{},ownerId:OWNER,shiftId:SHIFT,now:()=>now,maxJobs:1,
  loadShiftReadback:async()=>shift(),loadOwnerLedgerReadback:async()=>loop(),
  loadTrustedAuthorizedOriginal:async x=>({
   qualifiedOriginal:{owner_id:OWNER,original_work_id:x.original_work_id,
    source_issue_number:x.original_work_id===W1?263:185},
   scope:{owner_id:OWNER,original_work_id:x.original_work_id},
   workItem:{work_item_id:x.original_work_id}
  }),
  runOriginal:async()=>{throw Error('PROVIDER_UNCERTAIN')},
  callRpc:async({name,args})=>{
   if(name==='reality_read_eligible_shift_originals_v1')return eligibility();
   if(name==='reality_claim_exact_shift_original_v1')return {
    status:'EXACT_EXISTING_SHIFT_ORIGINAL_CLAIMED',
    shift_id:SHIFT,owner_id:OWNER,original_work_id:W1,
    trigger_id:J1,claim_id:claimId1,original_execution_completed:false,
    owner_installation_authorized:false,production_changed:false};
   if(name==='reality_record_exact_shift_original_outcome_v1')return {
    status:'SHIFT_ORIGINAL_OUTCOME_DURABLY_RECORDED',
    original_work_id:W1,claim_id:claimId1,
    last_execution_status:args.p_status,original_job_settled:false,
    installation_authorized:false,production_changed:false};
   if(name==='reality_reconcile_exact_shift_original_receipt_v1')return {
    status:'NO_INDEPENDENT_ORIGINAL_RECEIPT_YET',
    original_work_id:W1,installation_authorized:false,
    production_changed:false};
  }
 };
 const outcome=await runRileyGovernedMultiJobShiftTick(base);
 assert.equal(outcome.outcomes[0].uncertain_provider_effect,true);
 assert.equal(outcome.independently_settled,0);
 await assert.rejects(runRileyGovernedMultiJobShiftTick({
  ...base,callRpc:async args=>
   args.name==='reality_record_exact_shift_original_outcome_v1'?
     {status:'UNVERIFIED'}:base.callRpc(args)
 }),/RILEY_MULTI_JOB_DURABLE_ORIGINAL_OUTCOME_READBACK_REQUIRED_STOP_SHIFT_TICK/);
});
test('self-audit distinguishes source-implemented from current runtime proof',()=>{
 const read=shift();read.shifts[0].status='ENDED_READ_ONLY';
 const audit=buildRealityEvidenceGroundedSelfAudit({
  shiftReadback:read,ownerLoopReadback:loop(),
  sourceVerifiedAt:'2026-11-06T14:30:00Z'});
 assert.equal(audit.exact_current_owner_shift_count,0);
 assert.equal(audit.full_shift_automation_proven,false);
 assert.equal(audit.capabilities.find(x=>x.id==='employee_capability_wake').proof_level,
  'TRIGGER_INSPECTION_ONLY_NO_PROVIDER_REPAIR_EXECUTION');
 assert.equal(audit.capabilities.find(x=>x.id==='multi_job_shift_controller').proof_level,
  'CONTRACT_PREPARED_NOT_LIVE_WORKER_CONNECTED');
 assert.equal(audit.all_problems_solvable_guaranteed,false);
 assert.match(summarizeRealitySelfAuditForModel(audit),/not claim unlimited problem solving/);
 const chat=readFileSync(new URL('../src/reality-employee-shift-chat-context-v1.js',
  import.meta.url),'utf8');
 assert.match(chat,/buildRealityEvidenceGroundedSelfAudit/);
 assert.match(chat,/summarizeRealitySelfAuditForModel/);
});
test('migration never grants ordinary users original job authority or client writes',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261106155000_riley_multi_original_shift_claim_v1.sql',import.meta.url),'utf8');
 assert.match(sql,/security invoker/g);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/read_shift_capability_wake_v1/);
 assert.match(sql,/for update/);
 assert.match(sql,/unique \(original_work_id\)/);
 assert.match(sql,/genuine_independent_final_receipts_v1/);
 assert.match(sql,/claim_id/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on function public.reality_claim_exact_shift_original_v1/);
 assert.doesNotMatch(sql,/grant .* to authenticated/);
});

test('self audit API is owner-authenticated and read-only, linked to real Reality Chat',()=>{
 const api=readFileSync(new URL('../api/reality/personal-capability-self-audit.js',
  import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',
  import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/VERCEL_ENV!=='preview'/);
 assert.match(api,/req.method!=='GET'/);
 assert.match(api,/reality_read_owner_employee_shifts_v1/);
 assert.match(api,/reality_read_owner_genuine_loop_v1/);
 assert.match(api,/buildRealityEvidenceGroundedSelfAudit/);
 assert.match(api,/execution_authorized_by_read:false/);
 assert.doesNotMatch(api,/executeAuthorizedWork|reality_claim_exact_shift_original_v1/);
 assert.match(ui,/id="realitySelfAwareness"/);
 assert.match(ui,/Reality's verified self-understanding/);
 assert.match(ui,/refreshRealitySelfAudit/);
 assert.match(ui,/REALITY_SELF_AUDIT_PROVIDER_UNVERIFIED/);
 assert.match(ui,/full_shift_automation_proven!==false/);
});
