import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionPrincipal,getOrCreateSessionPrincipal,
 verifySessionPrincipal} from '../src/reality-session-principal-v0.1.js';

test('signed identity persists regardless of cookie position or spacing',()=>{
 const old=process.env.REALITY_CHAT_RECEIPT_HMAC_KEY;
 process.env.REALITY_CHAT_RECEIPT_HMAC_KEY='unit-test-key-longer-than-thirty-two-chars!';
 try{
  const token=createSessionPrincipal({principalId:'session:persisted'});
  let writeCount=0;
  const res={setHeader:()=>{writeCount++}};
  for(const cookies of [
   'reality_principal='+encodeURIComponent(token),
   'theme=dark; reality_principal='+encodeURIComponent(token),
   'theme=dark;other=123;reality_principal='+encodeURIComponent(token)+'; preference=on'
  ]){
   const p=getOrCreateSessionPrincipal({headers:{cookie:cookies}},res);
   assert.equal(p.principal_id,'session:persisted');
  }
  assert.equal(writeCount,0,'must not mint replacement principals');
  assert.equal(verifySessionPrincipal(token).principal_id,'session:persisted');
 }finally{if(old===undefined)delete process.env.REALITY_CHAT_RECEIPT_HMAC_KEY;
   else process.env.REALITY_CHAT_RECEIPT_HMAC_KEY=old}
});
