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
 assert.match(source,/stage='OWNER_EVIDENCE_COLLECTION';\s*const evidence=await collectOptionalChatEvidence/);
 assert.match(source,/timeoutMs:2500/);
 assert.match(source,/stage='ATOMIC_ASSISTANT_PUBLICATION'/);
 assert.match(source,/publishPrivateAssistantAtomically/);
 assert.match(source,/CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN/);
 assert.match(source,/missing_context_is_not_evidence_of_no_work:true/);
});
