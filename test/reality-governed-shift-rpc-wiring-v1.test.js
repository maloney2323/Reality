import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';

// A malformed alternation previously joined two real worker RPC names:
// read_chat_work_for_owner_v1record_current_shift_weekly_investigation_v1
// This caused the *real* names to be rejected locally before reaching the
// service-role database. The shift wake then reported only a generic failure.
const db=Object.freeze({
 url:'https://isolated-example.supabase.co',
 secretKey:'test-only-service-secret-never-deploy'
});
const allowed=[
 'reality_read_current_shift_weekly_investigations_v1',
 'reality_claim_chat_work_for_shift_v1',
 'reality_record_chat_work_diagnosis_v1',
 'reality_fail_chat_work_claim_v1',
 'reality_reconcile_expired_chat_work_v1',
 'reality_read_chat_work_for_owner_v1',
 'reality_record_current_shift_weekly_investigation_v1',
];
test('every existing Chat-work and weekly investigation RPC crosses the trusted worker allowlist',async()=>{
 const seen=[];
 for(const rpc of allowed){
  const result=await shiftRpc(db,rpc,{proof:'mock-only'},{
   fetchImpl:async(url,options)=>{
    seen.push({url,options});
    return {ok:true,json:async()=>({status:'MOCK_SUCCESS'})};
   }
  });
  assert.equal(result.status,'MOCK_SUCCESS',rpc);
 }
 assert.deepEqual(seen.map(x=>x.url),allowed.map(x=>
  db.url+'/rest/v1/rpc/'+x));
 for(const item of seen){
  assert.equal(item.options.method,'POST');
  assert.equal(item.options.redirect,'error');
  assert.equal(item.options.headers.apikey,db.secretKey);
 }
});
test('an accidentally concatenated, arbitrary, or empty RPC name is rejected without a network call',async()=>{
 const forbidden=[
  'reality_',
  'reality_read_chat_work_for_owner_v1record_current_shift_weekly_investigation_v1',
  'reality_delete_chat_work_for_owner_v1',
  'reality_authorize_unbounded_work_v1',
  'reality_claim_chat_work_for_shift_v1/../../other',
 ];
 let networkCalls=0;
 for(const rpc of forbidden){
  await assert.rejects(
   shiftRpc(db,rpc,{},{
    fetchImpl:async()=>{networkCalls++;throw Error('UNSAFE_PROVIDER_CALL')}
   }),/SHIFT_RPC_NOT_ALLOWLISTED/,rpc
  );
 }
 assert.equal(networkCalls,0);
});
test('RPC allowlist retains distinct exact function names with no empty regex branch',()=>{
 const file=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',
  import.meta.url),'utf8');
 assert.match(file,/\|read_chat_work_for_owner_v1\|record_current_shift_weekly_investigation_v1\|/);
 assert.doesNotMatch(file,/\|\|/);
 assert.doesNotMatch(file,/read_chat_work_for_owner_v1record_current_shift_weekly_investigation_v1/);
});
