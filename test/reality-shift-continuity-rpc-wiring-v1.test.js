import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
const db={url:'https://isolated-fixture.supabase.co',
 secretKey:'not_a_real_key_do_not_use'};
const uuid='11111111-2222-4333-8444-555555555555';
for(const [rpc,args] of [
 ['reality_claim_shift_continuity_independent_review_v1',
  {p_shift_id:uuid,p_worker_run_id:uuid}],
 ['reality_record_shift_continuity_independent_review_v1',
  {p_incident_id:uuid,p_claim_id:uuid,p_worker_run_id:uuid,
   p_source_ref:'https://github.com/maloney2323/Reality/pull/308',
   p_provider_sha256:'sha256:'+'a'.repeat(64),
   p_checked_at:'2026-11-17T22:00:00Z'}]
]){
 test('exact signed reviewer RPC reaches the configured database transport: '+rpc,
 async()=>{
  let called=0;
  const res=await shiftRpc(db,rpc,args,{fetchImpl:async(url,options)=>{
   called++;
   assert.equal(url,db.url+'/rest/v1/rpc/'+rpc);
   assert.equal(options.method,'POST');
   assert.deepEqual(JSON.parse(options.body),args);
   assert.equal(options.redirect,'error');
   return{ok:true,json:async()=>({status:'MOCKED_'+rpc})};
  }});
  assert.equal(called,1);
  assert.equal(res.status,'MOCKED_'+rpc);
 });
}
test('unlisted database RPC remains denied before provider fetch',async()=>{
 let fetched=false;
 await assert.rejects(shiftRpc(db,'reality_fake_untrusted_write_v1',{},
  {fetchImpl:async()=>{fetched=true;return{ok:true,json:async()=>({})}}}),
  /SHIFT_RPC_NOT_ALLOWLISTED/);
 assert.equal(fetched,false);
});
test('reviewer catch preserves sanitized transport failure rather than silent status',()=>{
 const source=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(source,/shift_continuity_independent_review:continuityIndependentReview/);
 assert.match(source,/SHARED_RPC_TRANSPORT_NOT_CONNECTED/);
 assert.match(source,/SIGNED_DATABASE_RPC_UNAVAILABLE/);
});
