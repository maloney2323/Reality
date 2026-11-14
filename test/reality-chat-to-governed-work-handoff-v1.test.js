import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {investigateAuthenticatedChatUnderExistingShift}
 from '../src/reality-signed-chat-to-work-v1.js';
import {readOwnerChatWorkHandoff}
 from '../src/reality-private-chat-work-readback-v1.js';

const uuid=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const owner=uuid(1),shift=uuid(2),conversation=uuid(3),request=uuid(4);
const messageId=uuid(5),claimId=uuid(6);
const issue='https://github.com/examplecorp/Reality/issues/185';
const claim={
 status:'AUTHENTICATED_CHAT_WORK_LEASED_TO_EXISTING_SHIFT',
 owner_id:owner,shift_id:shift,conversation_id:conversation,
 request_id:request,message_id:messageId,claim_id:claimId,
 message:'Investigate why our existing governed employee shift cannot recover and repair its failed code automatically.',
 message_sha256:'f'.repeat(64),plan_fingerprint:'sha256:'+'b'.repeat(64),
 source_scope:[{source_ref:issue,step_index:3}],
 execution_authorized:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
};
const graph={
 status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
 owner_id:owner,shift_id:shift,installation_authorized:false,
 production_changed:false,
 jobs:[{source_ref:issue,phase:'SOURCE_ADMITTED',
  original_work_id:'work:'+'e'.repeat(32),
  next_governed_action:'INDEPENDENT_FROZEN_TEST_REVIEW'}]
};
const db={strictSecrets:true,secretKey:'not-exported',project:'preview'};
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'preview',
 REALITY_STANDALONE_OPENAI_API_KEY:'internal-unshared-openai-token-value',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini'
};
const answer=x=>({
 status:'completed',id:'resp_current_original_intake_1234',
 output_text:JSON.stringify(x)
});
const decision={
 decision:'INVESTIGATE_EXISTING_WORK',
 diagnosis:'The current source-admitted original is blocked at independently replaying the failed frozen test, and should follow its existing warrant rather than starting another shift.',
 selected_source_refs:[issue]
};
test('real signed worker automatically qualifies saved Chat turn under current owner warrant and durably records model investigation',async()=>{
 let work=0,model=0,records=0;
 const result=await investigateAuthenticatedChatUnderExistingShift({
  db,env,
  callRpc:async(db,name,args)=>{
   if(name==='reality_claim_chat_work_for_shift_v1'){work++;return claim}
   if(name==='reality_read_current_shift_execution_graph_v1')return graph;
   if(name==='reality_record_chat_work_diagnosis_v1'){
    records++;
    assert.equal(args.p_message_id,messageId);
    assert.equal(args.p_claim_id,claimId);
    assert.equal(args.p_message_sha256,claim.message_sha256);
    assert.equal(args.p_shift_id,shift);
    assert.deepEqual(args.p_selected_sources,[issue]);
    assert.equal(args.p_decision,'INVESTIGATE_EXISTING_WORK');
    return {status:'SIGNED_CHAT_WORK_DIAGNOSIS_DURABLY_RECORDED',
     message_id:messageId,owner_id:owner,request_id:request,shift_id:shift,
     work_status:'INVESTIGATED_SCOPED',selected_source_count:1,
     model_advisory_recorded:true,execution_authorized:false,
     installation_authorized:false,new_shift_started:false};
   }
   throw Error('UNEXPECTED_RPC_'+name);
  },
  fetchImpl:async(url,opts)=>{
   model++;
   assert.equal(url,'https://api.openai.com/v1/responses');
   const payload=JSON.parse(opts.body);
   assert.equal(payload.tool_choice,'none');
   assert.equal(payload.text.format.type,'json_schema');
   assert.equal(payload.store,false);
   assert.match(JSON.stringify(payload.input),/SOURCE_ADMITTED/);
   return {ok:true,json:async()=>answer(decision)};
  }
 });
 assert.equal(result.status,
  'AUTHENTICATED_CHAT_INSTRUCTION_INVESTIGATED_IN_EXISTING_SHIFT');
 assert.equal(result.work_status,'INVESTIGATED_SCOPED');
 assert.equal(result.installation_authorized,false);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.new_shift_started,false);
 assert.equal(work,1);assert.equal(model,1);assert.equal(records,1);
});
test('no pending or no owner warrant starts no model call and no duplicate shift',async()=>{
 let called=0;
 const result=await investigateAuthenticatedChatUnderExistingShift({
  db,env,callRpc:async(_,name)=>{
   assert.equal(name,'reality_claim_chat_work_for_shift_v1');
   return {status:'NO_PENDING_CHAT_WITH_CURRENT_OWNER_WARRANT'};
  },fetchImpl:async()=>{called++;throw Error('FORBIDDEN')}
 });
 assert.equal(result.status,'NO_PENDING_CHAT_WITH_CURRENT_OWNER_WARRANT');
 assert.equal(called,0);
});
test('model cannot smuggle an unapproved source, new issue or installation',async()=>{
 let accepted=0,failed=0;
 const result=await investigateAuthenticatedChatUnderExistingShift({
  db,env,
  callRpc:async(_,name)=>{
   if(name==='reality_claim_chat_work_for_shift_v1')return claim;
   if(name==='reality_read_current_shift_execution_graph_v1')return graph;
   if(name==='reality_fail_chat_work_claim_v1'){
    failed++;return {status:'CHAT_WORK_FAILURE_DURABLY_RECORDED'}
   }
   accepted++;throw Error('UNAUTHORIZED_WORK');
  },
  fetchImpl:async()=>({ok:true,json:async()=>answer({
   ...decision,selected_source_refs:[
    'https://github.com/examplecorp/Reality/issues/999']
  })})
 });
 assert.equal(result.status,'CHAT_WORK_INVESTIGATION_UNVERIFIED');
 assert.equal(result.reason,'MODEL_SELECTED_SOURCE_NOT_IN_EXISTING_WARRANT');
 assert.equal(accepted,0);assert.equal(failed,1);
});
test('owner work GET readback enforces owner and conversation source refs, no model-based evidence',async()=>{
 const session={user_id:owner,config:{url:'https://preview.example'}};
 const record={
  status:'OWNER_CHAT_WORK_INTAKE_READBACK',
  owner_id:owner,conversation_id:conversation,
  new_shift_started:false,installation_authorized:false,
  production_changed:false,
  items:[{source_message_id:messageId,request_id:request,
   source_ref:'supabase:reality_chat_messages:'+messageId,
   status:'INVESTIGATED_SCOPED',
   execution_authorized_by_chat:false,
   installation_authorized:false,production_changed:false}]
 };
 const dbFactory=()=>({...db,url:session.config.url});
 const verified=await readOwnerChatWorkHandoff({
  session,conversationId:conversation,env,dbFactory,
  callRpc:async(_,name,args)=>{
   assert.equal(name,'reality_read_chat_work_for_owner_v1');
   assert.deepEqual(args,{p_owner_id:owner,p_conversation_id:conversation});
   return record;
  }
 });
 assert.equal(verified.source,'AUTHENTICATED_OWNER_SCOPED_SERVICE_READBACK');
 assert.equal(verified.independent_repair_verified,false);
 const forged=await readOwnerChatWorkHandoff({
  session,conversationId:conversation,env,dbFactory,
  callRpc:async()=>({...record,owner_id:uuid(19)})
 });
 assert.equal(forged,null);
});
test('real SQL trigger and existing worker dispatch are wired, no second shift or direct install',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_authenticated_chat_work_existing_shift_handoff_v1.sql',
  import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-chat.js',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(sql,/after insert on public\.reality_chat_messages/);
 assert.match(sql,/when \(new\.role='user'\)/);
 assert.match(sql,/on conflict\(message_id\) do nothing/);
 assert.match(sql,/for update of i skip locked/);
 assert.match(sql,/reality_internal\.governed_employee_completion_warrants_v1/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/NEEDS_AUTHORIZED_SCOPE/);
 assert.match(sql,/reality_reconcile_expired_chat_work_v1/);
 assert.match(sql,/reality_record_chat_work_diagnosis_v1/);
 assert.match(worker,/await chatWorkPromise/);
 assert.match(worker,/authenticated_chat_work_handoff:chatWorkHandoff/);
 assert.match(api,/work_handoff:await readOwnerChatWorkHandoff/);
 assert.match(html,/GOVERNED WORK · AUTHENTICATED RECEIPT/);
 assert.doesNotMatch(sql,/update reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/insert into reality_internal\.genuine_capability_queue_v1/);
});


test('bounded failure recovery preserves prior evidence and same-shift warrant; never replays ambiguous failures or starts work',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_chat_work_bounded_failed_investigation_recovery_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(sql,/bounded_recovery_count=0/);
 assert.match(sql,/bounded_recovery_count=i\.bounded_recovery_count\+1/);
 assert.match(sql,/previous_failed_investigations=i\.previous_failed_investigations/);
 assert.match(sql,/i\.message_sha256=pg_catalog\.encode/);
 assert.match(sql,/sh\.shift_id=i\.shift_id and sh\.owner_id=i\.owner_id/);
 assert.match(sql,/sh\.plan_fingerprint=i\.plan_fingerprint/);
 assert.match(sql,/w\.state='ACTIVE'/);
 assert.match(sql,/w\.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'/);
 assert.match(sql,/i\.status='PROVIDER_UNVERIFIED'/);
 assert.match(sql,/DIAGNOSIS_PERSISTENCE_UNVERIFIED/);
 assert.match(sql,/MODEL_SELECTED_SOURCES_WITHOUT_WORK_DECISION/);
 assert.match(sql,/where status='CLAIMED' and claim_expires_at<clock_timestamp\(\)/);
 assert.match(sql,/where i\.message_id=e\.message_id and i\.status='PROVIDER_UNVERIFIED'/);
 assert.match(worker,/reality_reconcile_expired_chat_work_v1/);
 assert.match(worker,/const chatWorkPromise=investigateAuthenticatedChatUnderExistingShift/);
 assert.match(worker,/await chatWorkPromise/);
 assert.doesNotMatch(sql,/update reality_internal\.governed_employee_shifts_v1/);
 assert.doesNotMatch(sql,/insert into reality_internal\.genuine_capability_queue_v1/);
 assert.doesNotMatch(sql,/create trigger/);
});


test('saved Chat status projects real source-linked draft, failed independent CI, correction and retest stage without creating authority',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_owner_chat_original_repair_evidence_timeline_v1.sql',
  import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(sql,/i.status='INVESTIGATED_SCOPED'/);
 assert.match(sql,/j.owner_id=i.owner_id/);
 assert.match(sql,/j.shift_id=i.shift_id/);
 assert.match(sql,/j.issue_url=selected.source_ref/);
 assert.match(sql,/riley_native_model_drafts_v1/);
 assert.match(sql,/riley_native_frozen_test_findings_v1/);
 assert.match(sql,/riley_native_model_revisions_v1/);
 assert.match(sql,/riley_native_model_revision_frozen_results_v1/);
 assert.match(sql,/CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI/);
 assert.match(sql,/CORRECTIVE_CI_PASSED_AWAITING_EXACT_INSTALL_GATE/);
 assert.match(sql,/independent_repair_or_settlement_proven_by_chat',false/);
 assert.match(html,/const verifiedStages=new Set/);
 assert.match(html,/handed\.work_chain/);
 assert.match(html,/original\.current_evidence_stage/);
 assert.match(html,/a\.rel='noopener noreferrer'/);
 assert.doesNotMatch(sql,/insert into reality_internal\.riley_unattended_repair_originals_v1/);
 assert.doesNotMatch(sql,/update reality_internal\.governed_employee_shifts_v1/);
});
