import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceSignedRepairScopeOwnerHandoff}
 from '../src/reality-signed-repair-scope-handoff-v1.js';
import {verifyOwnerRepairScopeCard}
 from '../api/reality/owner-repair-scope-approval.js';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const worker='1bc0bb5b-9e8d-4e9d-ae08-7f00d7ace511';
const handoff='2bc0bb5b-9e8d-4e9d-ae08-7f00d7ace512';
const fp='sha256:'+'f'.repeat(64),approval='sha256:'+'e'.repeat(64);
const candidate='8368c5db6d5d5e3546b69ab2b86b022e40a00ed9';
const oldBlob='67f1b13a2263d448b19c9c4daedb4726a41e72fc';
const newBlob='d58c6dc605da1eceea0e6f9ad6f7c0ef0656cc6e';
const url='https://github.com/maloney2323/Reality/pull/211';
const w={
 status:'REPAIR_REQUIRES_EXACT_OWNER_ORIGINAL_WORK_BINDING',
 owner_scope_decision_ready:true,
 exact_owner_work_binding_required:true,
 inside_existing_original_warrant:false,shift_id:shift,
 source_ref:url,candidate_commit_sha:candidate,
 source_current_blob_sha:oldBlob,candidate_blob_sha:newBlob,
 frozen_test_sha256:'a'.repeat(64),
 installation_authorized:false,production_changed:false,
 original_job_completed:false,external_effect_performed:false
};
const qualification={
 status:'AUTOMATIC_VERIFIED_REPAIR_OPPORTUNITIES_QUALIFIED',
 owner_id:owner,shift_id:shift,installation_authorized:false,
 production_changed:false,work_orders:[w]
};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',owner_id:owner,shift_id:shift};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw'};
const staged={status:'SIGNED_REPAIR_OWNER_WORK_SCOPE_HANDOFF_DURABLE',
 owner_id:owner,shift_id:shift,source_ref:url,handoff_id:handoff,
 work_order_fingerprint:fp,installation_authorized:false,
 production_changed:false};
const approved={status:'APPROVED_EXACT_REPAIR_SCOPE_AWAITING_INDEPENDENT_WORK',
 owner_id:owner,shift_id:shift,source_ref:url,handoff_id:handoff,
 candidate_commit_sha:candidate,current_blob_sha:oldBlob,
 candidate_blob_sha:newBlob,work_order_fingerprint:fp,
 approval_receipt_sha256:approval,
 installation_authorized:false,production_changed:false};
const continuation={status:'EXACT_OWNER_REPAIR_SOURCE_RECHECKED_SAME_SHIFT',
 handoff_id:handoff,shift_id:shift,approval_receipt_sha256:approval,
 independent_frozen_tests_rerun:false,installation_authorized:false,
 original_job_completed:false,production_changed:false};
const params={db,env,graph,qualification,shiftId:shift,workerRunId:worker};
test('signed verified #211 stage reaches durable Reality Chat scope card, no installation',async()=>{
 const calls=[];
 const receipt=await advanceSignedRepairScopeOwnerHandoff({...params,
  call:async(_db,proc,args)=>{
   calls.push(proc);
   if(proc==='reality_stage_signed_repair_scope_handoff_v1'){
    assert.equal(args.p_owner_id,owner);
    assert.equal(args.p_shift_id,shift);
    assert.equal(args.p_source_ref,url);
    assert.equal(args.p_candidate_commit_sha,candidate);
    return staged;
   }
   if(proc==='reality_read_signed_approved_repair_scope_v1')
    return {status:'NO_APPROVED_EXACT_REPAIR_SCOPE'};
   throw Error('Unexpected RPC '+proc);
  }
 });
 assert.deepEqual(calls,[
  'reality_stage_signed_repair_scope_handoff_v1',
  'reality_read_signed_approved_repair_scope_v1']);
 assert.equal(receipt.outcomes[0].status,'SIGNED_REPAIR_OWNER_WORK_SCOPE_DECISION_READY');
 assert.equal(receipt.outcomes[0].next_action,
  'PRESENT_EXACT_REPAIR_WORK_SCOPE_IN_REALITY_CHAT');
 assert.equal(receipt.installation_authorized,false);
 assert.equal(receipt.original_job_completed,false);
});
test('approved exact owner work resumes source recheck only on same original shift',async()=>{
 const calls=[];
 const receipt=await advanceSignedRepairScopeOwnerHandoff({...params,
  call:async(_db,proc,args)=>{
   calls.push(proc);
   if(proc==='reality_stage_signed_repair_scope_handoff_v1')return staged;
   if(proc==='reality_read_signed_approved_repair_scope_v1')return approved;
   if(proc==='reality_record_signed_repair_scope_continuation_v1'){
    assert.equal(args.p_shift_id,shift);
    assert.equal(args.p_handoff_id,handoff);
    assert.equal(args.p_worker_run_id,worker);
    assert.equal(args.p_current_blob_sha,oldBlob);
    return continuation;
   }
   throw Error('Unexpected RPC '+proc);
  }
 });
 assert.equal(calls.length,3);
 assert.equal(receipt.outcomes[0].status,
  'SIGNED_REPAIR_SCOPE_APPROVED_WORK_RECHECKED_SAME_SHIFT');
 assert.equal(receipt.outcomes[0].independent_frozen_tests_rerun,false);
 assert.equal(receipt.outcomes[0].next_action,
  'RUN_NEW_INDEPENDENT_FROZEN_TESTS_BEFORE_INSTALL_REVIEW');
 assert.equal(receipt.installation_authorized,false);
 assert.equal(receipt.new_shift_started,false);
});
test('mismatched owner approval cannot resume source or call recording RPC',async()=>{
 let recorded=false;
 const receipt=await advanceSignedRepairScopeOwnerHandoff({...params,
  call:async(_db,proc)=>{
   if(proc==='reality_stage_signed_repair_scope_handoff_v1')return staged;
   if(proc==='reality_read_signed_approved_repair_scope_v1')
    return {...approved,candidate_blob_sha:'1'.repeat(40)};
   recorded=true;return continuation;
  }
 });
 assert.equal(recorded,false);
 assert.equal(receipt.outcomes[0].status,
  'SIGNED_REPAIR_APPROVED_SCOPE_SOURCE_DRIFT_BLOCKED');
});
test('no approved scope or stale candidate means no install, claim, continuation or new shift',async()=>{
 for(const bad of [
  {...w,inside_existing_original_warrant:true},
  {...w,installation_authorized:true},
  {...w,source_current_blob_sha:newBlob},
  {...w,owner_scope_decision_ready:false}
 ]){
  const receipt=await advanceSignedRepairScopeOwnerHandoff({
   ...params,qualification:{...qualification,work_orders:[bad]},
   call:async()=>{throw Error('No DB call permitted');}
  });
  assert.equal(receipt.status,'NO_NEW_EXACT_REPAIR_WORK_SCOPE_CARD_REQUIRED');
  assert.equal(receipt.installation_authorized,false);
 }
 await assert.rejects(advanceSignedRepairScopeOwnerHandoff({
  ...params,env:{...env,VERCEL_ENV:'production'},
  call:async()=>{throw Error('must not call');}
 }),/SIGNED_REPAIR_SCOPE_HANDOFF_EXACT_SIGNED_WORKER_REQUIRED/);
});
const card={
 status:'EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVAL_READY',
 handoff_id:handoff,shift_id:shift,owner_id:owner,
 source_ref:url,source_file:'src/reality-cognitive-research-engine-v0.1.js',
 candidate_commit_sha:candidate,current_blob_sha:oldBlob,candidate_blob_sha:newBlob,
 frozen_test_sha256:'a'.repeat(64),baseline_run_id:41712961166,
 green_run_id:41713111625,work_order_fingerprint:fp,
 owner_approval_ready:true,owner_work_scope_approved:false,
 approval_receipt_sha256:null,continuation_state:'PREPARED',
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false,read_only:true
};
test('owner chat card never accepts model-supplied install authority or counterfeit decision',()=>{
 assert.equal(verifyOwnerRepairScopeCard(card,owner).owner_scope_action,
  'APPROVE_WORK_SCOPE_ONLY');
 assert.equal(verifyOwnerRepairScopeCard({...card,installation_authorized:true},owner),null);
 assert.equal(verifyOwnerRepairScopeCard({...card,owner_id:shift},owner),null);
 assert.equal(verifyOwnerRepairScopeCard({...card,source_ref:'https://evil.test/a'},owner),null);
 assert.equal(verifyOwnerRepairScopeCard({...card,
  status:'EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED',
  owner_approval_ready:false,owner_work_scope_approved:true,
  approval_receipt_sha256:approval,continuation_state:'APPROVED'},owner)
  .owner_scope_action,'ALREADY_APPROVED_NO_REPLAY');
});
test('new scope RPC names remain exact, other write/alias names blocked',async()=>{
 const allowed=[
  'reality_stage_signed_repair_scope_handoff_v1',
  'reality_read_owner_repair_scope_decision_v1',
  'reality_record_owner_repair_scope_decision_v1',
  'reality_read_signed_approved_repair_scope_v1',
  'reality_record_signed_repair_scope_continuation_v1'
 ];
 for(const name of allowed){
  let invoked=false;
  await shiftRpc({url:'https://example.supabase.co',secretKey:'inert'},
   name,{}, {fetchImpl:async()=>{invoked=true;return{ok:true,json:async()=>({status:'OK'})}}});
  assert.equal(invoked,true);
  await assert.rejects(shiftRpc(
   {url:'https://example.supabase.co',secretKey:'inert'},
   name+'_grant_install',{},
   {fetchImpl:async()=>{throw Error('never call')}}),/SHIFT_RPC_NOT_ALLOWLISTED/);
 }
});
test('existing signed worker and Chat UI contain new exact decision route',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL(
  '../reality-chat-repair-scope-approval-v1.js',import.meta.url),'utf8');
 assert.match(worker,/await advanceSignedRepairScopeOwnerHandoff\(/);
 assert.match(worker,/signed_repair_owner_scope_handoff:/);
 assert.match(html,/reality-chat-repair-scope-approval-v1\.js/);
 assert.match(ui,/OWNER_APPROVE_EXACT_REPAIR_INVESTIGATION_AND_INDEPENDENT_TESTING/);
 assert.match(ui,/approve\.addEventListener\('click'/);
 assert.doesNotMatch(ui,/installApprove|AUTHORIZE_EXACT_EMPLOYEE_SHIFT/);
});
