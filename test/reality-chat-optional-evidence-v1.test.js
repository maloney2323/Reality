import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectOptionalChatEvidence} from '../src/reality-chat-optional-evidence-v1.js';

test('available context is returned with verified provenance and zero authority',async()=>{
 const result=await collectOptionalChatEvidence([
  {id:'shift',read:async()=>[{shift_id:'signed'}],validate:Array.isArray,fallback:[]},
  {id:'dashboard',read:async()=>({status:'READY'}),validate:x=>x.status==='READY',fallback:null},
 ],{timeoutMs:100});
 assert.equal(result.status,'OPTIONAL_EVIDENCE_READBACKS_VERIFIED');
 assert.deepEqual(result.values.shift,[{shift_id:'signed'}]);
 assert.equal(result.grants_execution_authority,false);
 assert.equal(result.installation_authorized,false);
 assert.deepEqual(result.unavailable,[]);
});
test('failed or invalid dashboard context cannot stop verified chat',async()=>{
 const result=await collectOptionalChatEvidence([
  {id:'work_readback',read:async()=>{throw Error('SECRET_PROVIDER_FAILURE')},
   validate:()=>true,fallback:null},
  {id:'invalid',read:async()=>({status:'unverified'}),
   validate:v=>v?.status==='VERIFIED',fallback:null},
  {id:'verified',read:async()=>['ok'],validate:Array.isArray,fallback:[]}
 ],{timeoutMs:100});
 assert.equal(result.status,'OPTIONAL_EVIDENCE_PARTIALLY_UNAVAILABLE');
 assert.deepEqual(result.unavailable,['work_readback','invalid']);
 assert.equal(result.values.work_readback,null);
 assert.deepEqual(result.values.verified,['ok']);
 assert.ok(!JSON.stringify(result).includes('SECRET_PROVIDER_FAILURE'));
});
test('slow optional provider has a fixed deadline, never turns unverified into no work',async()=>{
 const start=Date.now();
 const result=await collectOptionalChatEvidence([
  {id:'slow_read',read:()=>new Promise(()=>{}),validate:()=>true,fallback:null},
  {id:'fast_read',read:async()=>['signed evidence'],
    validate:Array.isArray,fallback:[]}
 ],{timeoutMs:25});
 assert.ok(Date.now()-start<400);
 assert.deepEqual(result.unavailable,['slow_read']);
 assert.equal(result.values.slow_read,null);
 assert.deepEqual(result.values.fast_read,['signed evidence']);
});
test('invalid registry or timeout is rejected',async()=>{
 await assert.rejects(()=>collectOptionalChatEvidence([
  {id:'duplicate',read:async()=>[],validate:Array.isArray,fallback:[]},
  {id:'duplicate',read:async()=>[],validate:Array.isArray,fallback:[]}
 ]),/CHAT_OPTIONAL_EVIDENCE_CONTRACT_INVALID/);
 await assert.rejects(()=>collectOptionalChatEvidence([
  {id:'fine',read:async()=>[],validate:Array.isArray,fallback:[]}
 ],{timeoutMs:30001}),/CHAT_OPTIONAL_EVIDENCE_CONTRACT_INVALID/);
});
test('authenticated Chat GET and POST use bounded optional evidence, not raw dashboard calls',()=>{
 const source=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 assert.match(source,/if\(req.method==='GET'\)\{\s*const context=await collectOptionalChatEvidence/);
 assert.match(source,/stage='SIGNED_CHAT_WORK_READBACK';[\s\S]*const optionalContextPromise=collectOptionalChatEvidence/);
 assert.match(source,/stage='OWNER_EVIDENCE_COLLECTION';\s*const optionalContext=await optionalContextPromise/);
 assert.match(source,/scopeOwnerOriginalWorkToShift/);
 assert.match(source,/timeoutMs:2500/);
 assert.match(source,/stage='ATOMIC_ASSISTANT_PUBLICATION'/);
 assert.match(source,/publishPrivateAssistantAtomically/);
 assert.match(source,/optional_context_wait_ms:optionalContextWaitMs/);
 assert.match(source,/governed_cognition_ms:governedCognitionMs/);
 assert.match(source,/total_ms:Date.now\(\)-chatStartedAt/);
 assert.match(source,/CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN/);
 assert.match(source,/missing_context_is_not_evidence_of_no_work:true/);
});


test('owner original readback can be narrowed in memory to the authorized shift',async()=>{
 const {scopeOwnerOriginalWorkToShift}=await import(
  '../src/reality-owner-original-work-chat-readback-v1.js');
 const a='9460cfff-937a-4105-9093-2e41ab39a950';
 const b='21dff8db-6f46-444d-a149-ab15f1caf8fe';
 const readback={status:'OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK',
  all_recent_jobs:[
   {shift_id:a,original_work_id:'work:'+'a'.repeat(32),independently_settled:false},
   {shift_id:b,original_work_id:'work:'+'b'.repeat(32),independently_settled:true}
  ]};
 const scoped=scopeOwnerOriginalWorkToShift(readback,a);
 assert.equal(scoped.observed_original_count,1);
 assert.equal(scoped.observed_unfinished_count,1);
 assert.equal(scoped.current_shift_has_unfinished_originals,true);
 assert.equal(scoped.jobs[0].shift_id,a);
 assert.equal(scoped.grants_execution_authority,false);
 assert.equal(scopeOwnerOriginalWorkToShift(readback,null),readback);
 assert.throws(()=>scopeOwnerOriginalWorkToShift(readback,'wrong-shift'),
  /CHAT_ORIGINAL_WORK_SHIFT_SCOPE_INVALID/);
});
