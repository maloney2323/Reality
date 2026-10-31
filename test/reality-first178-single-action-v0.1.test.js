import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {runFirst178SingleAction}
 from '../src/reality-first178-single-action-v0.1.js';
const scope={
 issue_number:178,original_work_id:'work:'+'b'.repeat(32),
 goal_id:'user-confirmed:178',installation_authorized:false,
 job_completed:false,
};
const session={user_id:'11111111-1111-4111-8111-111111111111'};
const conversationId='22222222-2222-4222-8222-222222222222';
const env={VERCEL_ENV:'preview'};
const queueId='33333333-3333-4333-8333-333333333333';
const receiptId='44444444-4444-4444-8444-444444444444';
const validated={
 status:'AWAITING_OWNER_APPROVAL',owner_approval_required:true,
 original_work_id:scope.original_work_id,
 queue_id:queueId,checkpoint_receipt_id:receiptId,
 checkpoint_hash:'c'.repeat(64),
 verified_candidate_artifact_hash:'d'.repeat(64),
 installation_authorized:false,capability_installed:false,
 original_job_completed:false,production_changed:false,
};
test('one owner call admits exact original work once then invokes constitutional executor',async()=>{
 const calls=[];
 const response=await runFirst178SingleAction({
  session,conversationId,env,resolveOriginal:async()=>null,
  inspect:async args=>{
   assert.equal(args.conversationId,conversationId);
   calls.push('READ');
   return {...scope,status:'READY_FOR_EXACT_OWNER_CONFIRMATION'};
  },
  start:async()=>{
   calls.push('SOURCE_WORK_THEN_QUEUE');
   return {...scope,status:'QUEUED_DIRECT_CONSTITUTIONAL',queue_id:queueId,
    continuity_work_receipt_id:receiptId};
  },
  execute:async()=>{calls.push('CONSTITUTIONAL_DRIVER');return validated},
 });
 assert.deepEqual(calls,['READ','SOURCE_WORK_THEN_QUEUE','CONSTITUTIONAL_DRIVER']);
 assert.equal(response.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(response.owner_approval_required,true);
 assert.equal(response.installation_authorized,false);
 assert.equal(response.original_job_completed,false);
});
test('canonical owner work from an earlier conversation wins without changing its goal or requeuing',async()=>{
 const originalConversation='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const calls=[];
 const result=await runFirst178SingleAction({
  session,conversationId,env,
  resolveOriginal:async()=>({
   verified_owner:session.user_id,issue_number:178,
   conversation_id:originalConversation,queue_id:queueId,
   original_work_id:scope.original_work_id,goal_id:scope.goal_id,
   installation_authorized:false,original_job_completed:false,
  }),
  inspect:async req=>{
   calls.push('READ:'+req.conversationId);
   return {...scope,status:'ALREADY_QUEUED',queue_id:queueId,
    queue_phase:'QUEUED_DISCOVERY'};
  },
  start:async()=>{throw Error('MUST_NOT_ENQUEUE_ANOTHER_CONVERSATION')},
  execute:async req=>{calls.push('RUN:'+req.conversationId);return validated},
 });
 assert.deepEqual(calls,['READ:'+originalConversation,'RUN:'+originalConversation]);
 assert.equal(result.existing_work,true);
 assert.equal(result.original_work_id,scope.original_work_id);
 assert.equal(result.installation_authorized,false);
});
test('canonical owner mismatch fails before execution',async()=>{
 let called=false;
 await assert.rejects(runFirst178SingleAction({
  session,conversationId,env,
  resolveOriginal:async()=>({
   conversation_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   original_work_id:'work:'+'f'.repeat(32),goal_id:scope.goal_id,
   queue_id:queueId,
  }),
  inspect:async()=>{called=true;return {...scope,status:'ALREADY_QUEUED',queue_id:queueId}},
  execute:async()=>{throw Error('NO_EXECUTION')},
 }),/FIRST178_SINGLE_ACTION_CANONICAL_ORIGINAL_OWNER_GOAL_CHANGED/);
 assert.equal(called,true);
});
test('previous queued exact #178 continues without re-creating source work',async()=>{
 let startCalls=0,executeCalls=0;
 const result=await runFirst178SingleAction({
  session,conversationId,env,resolveOriginal:async()=>null,
  inspect:async()=>({...scope,status:'ALREADY_QUEUED',queue_id:queueId,
   queue_phase:'QUEUED_DISCOVERY'}),
  start:async()=>{startCalls++;throw Error('DUPLICATE_JOB')},
  execute:async()=>{executeCalls++;return validated},
 });
 assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(startCalls,0);
 assert.equal(executeCalls,1);
});
test('previously claimed GAP may continue once only through server recovery reservation',async()=>{
 let execution=0;
 const r=await runFirst178SingleAction({
  session,conversationId,env,resolveOriginal:async()=>null,
  inspect:async()=>({...scope,status:'ALREADY_QUEUED',
   queue_id:queueId,queue_phase:'RUNNING_CONSTITUTIONAL'}),
  start:async()=>{throw Error('MUST_NOT_CREATE_THIRD_JOB')},
  execute:async()=>{execution++;return validated},
 });
 assert.equal(execution,1);
 assert.equal(r.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(r.installation_authorized,false);
});
test('awaiting approval or unresolved execution never replays work',async()=>{
 for(const phase of ['AWAITING_OWNER_APPROVAL',
  'EXECUTION_UNRESOLVED']){
  const result=await runFirst178SingleAction({
   session,conversationId,env,resolveOriginal:async()=>null,
   inspect:async()=>({...scope,status:'ALREADY_QUEUED',
    queue_id:queueId,queue_phase:phase,
    checkpoint_receipt_id:receiptId,checkpoint_hash:'c'.repeat(64),
    owner_approval_required:phase==='AWAITING_OWNER_APPROVAL'}),
   start:async()=>{throw Error('SECOND_QUEUE_FORBIDDEN')},
   execute:async()=>{throw Error('SECOND_EXECUTION_FORBIDDEN')},
  });
  assert.equal(result.status,phase);
  assert.equal(result.existing_work,true);
  assert.equal(result.do_not_retry,true);
  assert.equal(result.installation_authorized,false);
 }
});
test('exhausted original work delegates only to trusted same-job recovery executor',async()=>{
 let calls=0;
 const result=await runFirst178SingleAction({
  session,conversationId,env,resolveOriginal:async()=>null,
  inspect:async()=>({...scope,status:'ALREADY_QUEUED',
   queue_id:queueId,queue_phase:'ESCALATED'}),
  start:async()=>{throw Error('SECOND_ORIGINAL_QUEUE_FORBIDDEN')},
  execute:async()=>{calls++;return validated},
 });
 assert.equal(calls,1);
 assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.original_work_id,scope.original_work_id);
 assert.equal(result.installation_authorized,false);
});
test('missing prerequisite returns exact blocker without attempting generation',async()=>{
 await assert.rejects(()=>runFirst178SingleAction({
  session,conversationId,env,resolveOriginal:async()=>null,
  inspect:async()=>({...scope,status:'BLOCKED_GITHUB_READ_ONLY_CREDENTIAL'}),
  start:async()=>{throw Error('SHOULD_NOT_QUEUE')},
  execute:async()=>{throw Error('SHOULD_NOT_GENERATE')},
 }),/FIRST178_SINGLE_ACTION_NOT_READY_BLOCKED_GITHUB_READ_ONLY_CREDENTIAL/);
});
test('foreign original work or forged installed state fails closed',async()=>{
 await assert.rejects(()=>runFirst178SingleAction({
  session,conversationId,env,resolveOriginal:async()=>null,
  inspect:async()=>({...scope,issue_number:143,status:'READY_FOR_EXACT_OWNER_CONFIRMATION'}),
  start:async()=>{throw Error('MUST_NOT_QUEUE')},
 }),/FIRST178_SINGLE_ACTION_VERIFIED_ORIGINAL_SCOPE_REQUIRED/);
 await assert.rejects(()=>runFirst178SingleAction({
  session,conversationId,env,resolveOriginal:async()=>null,
  inspect:async()=>({...scope,status:'READY_FOR_EXACT_OWNER_CONFIRMATION'}),
  start:async()=>({...scope,status:'QUEUED_DIRECT_CONSTITUTIONAL',queue_id:queueId,
   continuity_work_receipt_id:receiptId}),
  execute:async()=>({...validated,installation_authorized:true}),
 }),/FIRST178_SINGLE_ACTION_CONSTITUTIONAL_EXECUTION_RESULT_UNVERIFIED/);
});
test('historic single-job endpoint stays authenticated but generic Work Center no longer invokes it',()=>{
 const html=readFileSync('index.html','utf8');
 for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
  new vm.Script(script);
 assert.doesNotMatch(html,/wcStartFirstGap178|personal-first-upgrade-178|wcFirstUpgrade178/);
 assert.match(html,/id="wcInspectGovernedBuild"/);
 assert.match(html,/id="wcStartGovernedBuild"[^>]*disabled/);
 assert.match(html,/QUEUE_SAFE_AUTONOMOUS_DISCOVERY/);
 const cron=JSON.parse(readFileSync('vercel.json','utf8'));
 assert.equal(cron.crons.some(entry=>/178/.test(entry.path)),false);
 const endpoint=readFileSync('api/reality/personal-first-upgrade-178-run.js','utf8');
 // Legacy readback and authorization are preserved for historical receipts,
 // but are not the primary UI or scheduled worker.
 assert.match(endpoint,/authenticatedChatSession/);
 assert.match(endpoint,/assertSameOrigin/);
 assert.match(endpoint,/maxDuration=300/);
});
