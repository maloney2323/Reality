import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerCompletedWorkForChat,readVerifiedOwnerCompletedWorkForChat}
 from '../src/reality-owner-completed-work-chat-context-v1.js';
import {mergeCurrentAndDurableUniverseForCognition}
 from '../src/reality-native-universe-v1.0.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const otherOwner='c24a6ba0-24bf-4cad-a153-d4e45fcd8b4b';
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',secretKey:'TEST_ONLY_NOT_A_REAL_SECRET'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const read={status:'INDEPENDENT_FINAL_RECEIPT_READBACK',
 does_not_authorize_actions:true,receipts:[{
  status:'FULL_LOOP_INDEPENDENTLY_VERIFIED',
  original_work_id:'work:0123456789abcdef0123456789abcdef',
  artifact_sha256:'a'.repeat(64),installed_commit_sha:'b'.repeat(40),
  provider_run_id:43425254534,
  settlement_event_id:'8a9fb2de-8895-45ab-8e02-92316be5a2d7',
  verified_at:'2026-11-13T14:05:00.000Z',production_changed:false
 }]};
test('generic past completed-job evidence is owner-scoped, bounded, read only and does not authorize anything',()=>{
 const projected=projectOwnerCompletedWorkForChat(read,{ownerId:owner});
 assert.equal(projected.length,1);
 assert.equal(projected[0].original_job_completed,true);
 assert.equal(projected[0].production_changed,false);
 assert.equal(projected[0].execution_authorized,false);
 assert.equal(projected[0].installation_authorized,false);
 assert.equal(projected[0].verified_cash_savings_usd,null);
 assert.match(projected[0].summary,/independent|verified|settled/i);
 assert.throws(()=>projectOwnerCompletedWorkForChat({...read,does_not_authorize_actions:false},{ownerId:owner}));
 assert.throws(()=>projectOwnerCompletedWorkForChat({...read,receipts:[{...read.receipts[0],installed_commit_sha:'0'}]},{ownerId:owner}));
});
test('read-only verified owner memory loads for all message phrasings without a lexical gate',async()=>{
 const requests=[];
 for(const message of [
  'This is a big milestone. Tell me more.',
  'What did you just finish?',
  'Do you remember what you did?',
  'You have evidence for that, right?',
  'Two sixty three?',
  'How is my company doing?'
 ]){
  const result=await readVerifiedOwnerCompletedWorkForChat({
   session:{user_id:owner,config:{url:db.url}},db,env,
   message,rpc:async(_db,name,payload)=>{
    requests.push({name,payload});
    assert.equal(name,'reality_read_owner_final_receipts_v1');
    assert.deepEqual(payload,{p_owner_id:owner});
    return read;
   }});
  assert.equal(result.length,1);
 }
 assert.equal(requests.length,6);
});
test('cross-owner/invalid-session and failed provider cannot invent shared operational memory',async()=>{
 const invalid=await readVerifiedOwnerCompletedWorkForChat({
  session:{user_id:otherOwner,config:{url:'https://otherproject.supabase.co'}},db,env,
  rpc:async()=>{throw Error('cross-project must be rejected before DB call')}
 });
 assert.deepEqual(invalid,[]);
 const failed=await readVerifiedOwnerCompletedWorkForChat({
  session:{user_id:owner,config:{url:db.url}},db,env,
  rpc:async()=>{throw Error('provider unavailable')}
 });
 assert.deepEqual(failed,[]);
});
test('chat hands recent verified work and original evidence into cognition on every turn',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/reality-model-gateway-v0.1.js',import.meta.url),'utf8');
 const native=readFileSync(new URL('../src/reality-native263-temporal-chat-context-v1.js',import.meta.url),'utf8');
 assert.match(api,/readVerifiedNative263TemporalForChat\(\{session,db:isolated\}\)/);
 assert.match(api,/readVerifiedOwnerCompletedWorkForChat\(\{session,db:isolated\}\)/);
 assert.match(api,/\.\.\.native263TemporalObservations,\.\.\.ownerCompletedWorkObservations/);
 assert.match(api,/owner_completed_work_context_status:/);
 assert.match(model,/VERIFIED OWNER WORK MEMORY CONTRACT/);
 assert.match(model,/No exact job ID, keyword phrase, or repeated user-provided evidence is required/);
 assert.doesNotMatch(native,/native263ConversationRelevant|if\(!native263ConversationRelevant/);
 assert.doesNotMatch(api,/readVerifiedNative263TemporalForChat\(\{session,message:text/);
});

test('current authenticated evidence survives a full historical Universe context window',()=>{
 const past=Array.from({length:100},(_,i)=>({entry_id:'historical:'+i,event_kind:'prior',summary:'History '+i}));
 const recent=[
  {entry_id:'owner:verified-original:recent',event_kind:'owner_independent_original_job_final_receipt',summary:'Independently settled original'},
  {entry_id:'owner:verified-original:recent',event_kind:'duplicate',summary:'Old duplicate'}
 ];
 const result=mergeCurrentAndDurableUniverseForCognition({current:recent,durable:past,limit:100});
 assert.equal(result.length,100);
 assert.equal(result[0].summary,'Independently settled original');
 assert.equal(result[1].entry_id,'historical:0');
 assert.equal(result.at(-1).entry_id,'historical:98');
 assert.equal(Object.isFrozen(result),true);
 const orchestration=readFileSync(new URL('../src/reality-live-intelligence-orchestration-v0.1.js',import.meta.url),'utf8');
 assert.match(orchestration,/entries: mergeCurrentAndDurableUniverseForCognition\(/);
 assert.match(orchestration,/current:requestContext\.entries,durable:durable\.entries,limit:100/);
 assert.throws(()=>mergeCurrentAndDurableUniverseForCognition({current:'untrusted'}));
});
