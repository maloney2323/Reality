import test from 'node:test';
import assert from 'node:assert/strict';
import {
 projectNative263OwnerTemporalBrief,
 native263ConversationRelevant,
 readVerifiedNative263TemporalForChat
} from '../src/reality-native263-temporal-chat-context-v1.js';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const receipt='681ce4ab-4dd0-47cf-963b-dc65087468fc';
const SOURCE='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const SHA='de45ee4c557339b19aa1f320aba1cd5fba301dbb';
const raw={
 status:'NATIVE263_ORIGINAL_POSTINSTALL_READONLY_CONTEXT',
 owner_id:OWNER,
 original_work_id:'work:873a6e74fd14c6beacc9042dd8021dfc',
 shift_id:'9460cfff-937a-4105-9093-2e41ab39a950',
 source_ref:'https://github.com/maloney2323/Reality/issues/263',
 target_branch:'reality/isolated-openai-governance-gateway-20261108',
 candidate_artifact_sha256:'sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48',
 candidate_commit_sha:SOURCE,
 frozen_verifier_run_id:42525028367,
 production_changed:false,
 state:'ORIGINAL_SETTLED',
 original_phase:'SETTLED',
 original_installed:true,
 installed_commit_sha:SHA,
 original_final_receipt_id:receipt,
 approval_receipt_id:'bdd8ee41-887c-461d-be09-f0c19dbc41fd',
 owner_approved_at:'2026-11-13 12:26:51.192616+00'
};
const fixedNow=new Date('2026-11-13T14:00:00.000Z');
test('settled original produces past/present/future, exact receipt and no execution power',()=>{
 const b=projectNative263OwnerTemporalBrief(raw,{ownerId:OWNER,now:fixedNow});
 assert.equal(b.original_final_receipt_id,receipt);
 assert.equal(b.original_job_completed,true);
 assert.equal(b.independent_original_settlement_verified,true);
 assert.match(b.past,/owner|approval/i);
 assert.match(b.present,/independently settled/);
 assert.match(b.present,/681ce4ab-4dd0-47cf-963b-dc65087468fc/);
 assert.match(b.operational_future,/no more actions/i);
 assert.equal(b.verified_cash_savings_usd,null);
 assert.equal(b.human_labor_saved_minutes,null);
 assert.equal(b.external_execution_authorized,false);
 assert.equal(b.production_changed,false);
});
test('installed but unsettled does not invent a final receipt',()=>{
 const c={...raw,state:'SOURCE_INSTALLED',original_phase:'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',original_installed:false,original_final_receipt_id:null};
 const b=projectNative263OwnerTemporalBrief(c,{ownerId:OWNER,now:fixedNow});
 assert.equal(b.original_job_completed,false);
 assert.equal(b.original_final_receipt_id,null);
 assert.match(b.present,/NOT yet independently recorded/);
 assert.match(b.operational_future,/existing signed worker/);
});
test('cross-owner and source/artifact/receipt drift fails closed',()=>{
 const attempts=[
  [{...raw,owner_id:'c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b'},OWNER],
  [raw,'c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b'],
  [{...raw,candidate_commit_sha:'0'.repeat(40)},OWNER],
  [{...raw,state:'ORIGINAL_SETTLED',original_final_receipt_id:null},OWNER],
  [{...raw,state:'SOURCE_INSTALLED',original_phase:'SETTLED'},OWNER]
 ];
 for(const [c,id] of attempts)assert.throws(()=>projectNative263OwnerTemporalBrief(c,{ownerId:id,now:fixedNow}));
});
test('owner-bound chat read uses existing read-only Supabase context, not an action',async()=>{
 const calls=[];
 const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
  url:'https://hvkfreoagbrphwghjajw.supabase.co',secretKey:'IN_UNIT_TEST_NOT_A_REAL_CREDENTIAL'};
 const observations=await readVerifiedNative263TemporalForChat({
  session:{user_id:OWNER,config:{url:db.url}},
  message:'What happened in original job #263? Explain past, present and future.',
  db,env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project},
  now:fixedNow,
  rpc:async(_db,name,payload)=>{calls.push({name,payload});return raw;}
 });
 assert.equal(observations.length,1);
 assert.equal(observations[0].original_job_completed,true);
 assert.deepEqual(calls,[{name:'reality_read_native263_postinstall_context_v1',payload:{}}]);
});
test('irrelevant, unauthenticated and unavailable readback cannot create invented context',async()=>{
 const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
  url:'https://hvkfreoagbrphwghjajw.supabase.co',secretKey:'UNIT_TEST_ONLY_NOT_REAL'};
 const ctx={db,env:{VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project},now:fixedNow};
 assert.equal(native263ConversationRelevant('Explain job #263'),true);
 assert.equal(native263ConversationRelevant('What is the weather?'),false);
 assert.deepEqual(await readVerifiedNative263TemporalForChat({
  ...ctx,session:{user_id:OWNER,config:{url:db.url}},
  message:'What is the weather?',rpc:async()=>{throw Error('unexpected call')}
 }),[]);
 assert.deepEqual(await readVerifiedNative263TemporalForChat({
  ...ctx,session:{user_id:'c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b',config:{url:db.url}},
  message:'Explain #263',rpc:async()=>raw
 }),[]);
 assert.deepEqual(await readVerifiedNative263TemporalForChat({
  ...ctx,session:{user_id:OWNER,config:{url:db.url}},
  message:'Explain #263',rpc:async()=>{throw Error('provider unavailable')}
 }),[]);
});
