import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSingleUseExecutionReservationStore }
 from '../src/reality-single-use-execution-reservation-v0.1.js';
import { reserveAuthenticatedPersonalExecution }
 from '../src/reality-personal-execution-reservation-service-v0.1.js';
import admissionApi from '../api/reality/personal-execution-admission.js';

const project='hvkfreoagbrphwghjajw';
const env={
 VERCEL_ENV:'preview',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://'+project+'.supabase.co',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'mock-secret-db-key-only',
};
const user=randomUUID(),conversation=randomUUID(),goalEvent=randomUUID(),lastRequest=randomUUID();
const session={user_id:user,config:{url:env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL}};
const fingerprint='sha256:'+('b'.repeat(64));
const goalId='goal:active';
const policyId='goal-bound-policy:test';
const workItem={work_item_id:'w1',workflow_id:'workflow1',connector:'github',
 operation:'create_issue',inputs:{repository:'maloney2323/Reality',title:'test'},
 action:'write exact case',consequential:true};
const epoch=()=>({
 goal_revision:1,goal_transition_event_id:goalEvent,
 user_message_revision:3,latest_user_request_id:lastRequest,
});
function rpcMock(){
 const claims=new Map(),status=new Map(),calls=[];
 let current=epoch();
 const fetchImpl=async (url,opts)=>{
  const operation=String(url).split('/').at(-1);
  const payload=JSON.parse(opts.body);
  calls.push({operation,payload});
  const ok=value=>new Response(JSON.stringify(value),{status:200});
  const bad=message=>new Response(JSON.stringify({message}),{status:409});
  if(opts.headers.apikey!==env.REALITY_UNIVERSE_PERSISTENCE_KEY)
   return bad('NO_SECRET');
  if(payload.p_user_id!==user||payload.p_conversation_id!==conversation)
   return bad('WRONG_OWNER');
  if(operation==='reality_read_execution_epoch')return ok([current]);
  if(operation==='reality_claim_execution_once'){
   if(payload.p_expected_goal_revision!==current.goal_revision||
      payload.p_expected_goal_event_id!==current.goal_transition_event_id)
    return bad('EXECUTION_GOAL_REVISION_STALE');
   if(payload.p_expected_user_message_revision!==current.user_message_revision||
      payload.p_expected_latest_user_request_id!==current.latest_user_request_id)
    return bad('EXECUTION_NEWER_USER_MESSAGE_REQUIRES_RECONCILIATION');
   const key=[payload.p_action_policy_id,payload.p_work_fingerprint].join('|');
   if(claims.has(key))return bad('EXECUTION_ALREADY_RESERVED_NO_AUTOMATIC_RETRY');
   const id=randomUUID();claims.set(key,id);status.set(id,'RESERVED');return ok(id);
  }
  if(operation==='reality_begin_reserved_execution'){
   const id=payload.p_reservation_id;
   if(status.get(id)!=='RESERVED')return bad('EXECUTION_RESERVATION_ALREADY_CONSUMED');
   if(current.goal_revision!==1||current.user_message_revision!==3)
    return bad('EXECUTION_DISPATCH_GROUNDING_CHANGED');
   status.set(id,'DISPATCHING');return ok(true);
  }
  if(operation==='reality_settle_execution_reservation'){
   const id=payload.p_reservation_id;
   if(status.get(id)!=='DISPATCHING')
    return bad('EXECUTION_RESERVATION_CANNOT_REARM_OR_RESET');
   status.set(id,payload.p_outcome);return ok(true);
  }
  throw Error('UNEXPECTED_RPC:'+operation);
 };
 return {fetchImpl,calls,claims,status,setEpoch:v=>{current=v}};
}
function store(backend){
 return createSingleUseExecutionReservationStore({
  session,conversationId:conversation,env,fetchImpl:backend.fetchImpl,
 });
}
function claimArgs(){
 return {policyId,workFingerprint:fingerprint,goalId,
  expectedGoalRevision:1,expectedGoalEventId:goalEvent,
  expectedUserMessageRevision:3,expectedLatestUserRequestId:lastRequest};
}

test('isolated service-role adapter reads existing revision clock and consumes same exact work once',async()=>{
 const b=rpcMock(),s=store(b);
 assert.deepEqual(await s.readEpoch(),epoch());
 const first=await s.claim(claimArgs());
 assert.equal(first.status,'RESERVED_NOT_DISPATCHED');
 assert.equal(first.external_action_performed,false);
 await assert.rejects(s.claim(claimArgs()),/EXECUTION_ALREADY_RESERVED_NO_AUTOMATIC_RETRY/);
 assert.equal((await s.begin({reservationId:first.reservation_id})).status,'DISPATCHING');
 await assert.rejects(s.begin({reservationId:first.reservation_id}),
  /EXECUTION_RESERVATION_ALREADY_CONSUMED/);
 assert.equal((await s.settle({
  reservationId:first.reservation_id,outcome:'UNCERTAIN',
  verificationReceiptRef:'verification:not-yet-confirmed',
 })).status,'UNCERTAIN');
 await assert.rejects(s.settle({reservationId:first.reservation_id,
  outcome:'VERIFIED',verificationReceiptRef:'verification:forged-later'}),
  /EXECUTION_RESERVATION_CANNOT_REARM_OR_RESET/);
});

test('atomic RPC rejects both goal and user-message revision changes',async()=>{
 const b=rpcMock(),s=store(b);
 b.setEpoch({...epoch(),goal_revision:2});
 await assert.rejects(s.claim(claimArgs()),/EXECUTION_GOAL_REVISION_STALE/);
 b.setEpoch({...epoch(),user_message_revision:4});
 await assert.rejects(s.claim(claimArgs()),
  /EXECUTION_NEWER_USER_MESSAGE_REQUIRES_RECONCILIATION/);
 assert.equal(b.claims.size,0);
});

test('isolated adapter cannot fall back to production, unverified identity or project',()=>{
 assert.throws(()=>createSingleUseExecutionReservationStore({
  session,conversationId:conversation,env:{...env,VERCEL_ENV:'production'},
 }),/EXECUTION_RESERVATION_AUTHENTICATED_PREVIEW_REQUIRED/);
 assert.throws(()=>createSingleUseExecutionReservationStore({
  session:{...session,config:{url:'https://wrong.supabase.co'}},
  conversationId:conversation,env,
 }),/EXECUTION_RESERVATION_ISOLATED_DB_SCOPE_INVALID/);
 assert.throws(()=>createSingleUseExecutionReservationStore({
  session:{user_id:'not-a-uuid',config:session.config},
  conversationId:conversation,env,
 }),/EXECUTION_RESERVATION_AUTHENTICATED_PREVIEW_REQUIRED/);
});

test('reservation service rejects mismatched goal ledger epoch before claim',async()=>{
 const b=rpcMock();b.setEpoch({...epoch(),goal_transition_event_id:randomUUID()});
 const prepare=async()=>({
  status:'GOAL_AND_ACTION_ADMITTED_PENDING_EXECUTION_LEASE',
  action_policy_id:policyId,work_item_fingerprint:fingerprint,goal_id:goalId,
  internal:{serverFreshGoalAdmission:{
   goal_revision:1,goal_transition_receipt_id:goalEvent,
  }},
 });
 await assert.rejects(reserveAuthenticatedPersonalExecution({
  session,conversationId:conversation,workItem,groundingProof:{},
  env,prepare,storeFactory:()=>store(b),
 }),/EXECUTION_RESERVATION_GOAL_EPOCH_MISMATCH/);
 assert.equal(b.claims.size,0);
});

test('reservation service returns a single-use receipt and does no provider action',async()=>{
 const b=rpcMock();
 const prepare=async()=>({
  status:'GOAL_AND_ACTION_ADMITTED_PENDING_EXECUTION_LEASE',
  action_policy_id:policyId,work_item_fingerprint:fingerprint,goal_id:goalId,
  internal:{serverFreshGoalAdmission:{
   goal_revision:1,goal_transition_receipt_id:goalEvent,
  }},
 });
 const params={session,conversationId:conversation,workItem,
  groundingProof:{},env,prepare,storeFactory:()=>store(b)};
 const first=await reserveAuthenticatedPersonalExecution(params);
 assert.equal(first.status,'SINGLE_USE_RESERVED_PENDING_DISPATCH');
 assert.equal(first.external_action_performed,false);
 assert.equal(first.reservation_claimed_once,true);
 assert.ok(first.internal.store);
 await assert.rejects(reserveAuthenticatedPersonalExecution(params),
  /EXECUTION_ALREADY_RESERVED_NO_AUTOMATIC_RETRY/);
});

function response(){
 const result={status:200,payload:null};
 const res={setHeader:()=>res,status(n){result.status=n;return res},
 json(value){result.payload=value;return res}};
 return {res,result};
}
test('public reservation API requires explicit RESERVE confirmation',async()=>{
 process.env.VERCEL_ENV='preview';
 process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF=project;
 process.env.REALITY_PERSONAL_CHAT_SUPABASE_URL='https://'+project+'.supabase.co';
 process.env.REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY='sb_publishable_test';
 process.env.REALITY_CHAT_RECEIPT_HMAC_KEY='mock-only-not-secret-000000000000000000000';
 const {res,result}=response();
 await admissionApi({method:'POST',headers:{origin:'https://example.test',
  host:'example.test','content-type':'application/json'},
  body:{conversation_id:conversation,work_item:workItem,intent:'RESERVE',
   confirmation:'assistant-auto-approved'}},res);
 assert.equal(result.status,400);
 assert.equal(result.payload.error,'EXECUTION_RESERVATION_EXPLICIT_CONFIRMATION_REQUIRED');
 assert.equal(result.payload.external_action_performed,false);
});
