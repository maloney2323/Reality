import test from 'node:test';
import assert from 'node:assert/strict';
import {resumeOriginal178OwnerRecovery}
 from '../api/reality/personal-first-upgrade-178-recovery.js';

const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const ready=Object.freeze({status:'GOVERNED_RECOVERY_READY',
 original_work_id:WORK,original_claim_preserved:true,
 autonomous_recovery_eligible:true,installation_authorized:false,
 original_job_completed:false});
const result=Object.freeze({status:'AWAITING_OWNER_APPROVAL',
 verified_server_dispatch:true,original_work_id:WORK,installed:false,
 original_job_completed:false,production_changed:false});

test('original #178 owner recovery invokes existing direct preview worker only after verified durable grant',async()=>{
 let called=0;
 const out=await resumeOriginal178OwnerRecovery({
  session:{user_id:'verified'},env:{VERCEL_ENV:'preview'},
  readView:async()=>ready,
  dispatch:async()=>{called++;return result},
 });
 assert.equal(called,1);
 assert.equal(out.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(out.original_work_id,WORK);
 assert.equal(out.installed,false);
});

test('cannot execute or mint delegation with non-original, exhausted or unauthorized status',async()=>{
 for(const view of [
  {...ready,status:'EXHAUSTED_CORRECTION_ATTEMPTS'},
  {...ready,original_work_id:'work:00000000000000000000000000000000'},
  {...ready,autonomous_recovery_eligible:false},
  {...ready,original_claim_preserved:false},
  {...ready,installation_authorized:true},
  {...ready,original_job_completed:true},
 ]){
  let called=false;
  await assert.rejects(()=>resumeOriginal178OwnerRecovery({
   session:{user_id:'verified'},readView:async()=>view,
   dispatch:async()=>{called=true;return result},
  }),/FIRST178_RECOVERY_DURABLE_GRANT_NOT_READY/);
  assert.equal(called,false);
 }
});

test('rejects false installation or counterfeit final settlement as recovery receipt',async()=>{
 for(const forged of [
  {...result,installed:true},
  {...result,original_job_completed:true},
  {...result,production_changed:true},
  {...result,verified_server_dispatch:false},
  {...result,original_work_id:'work:00000000000000000000000000000000'},
 ]){
  await assert.rejects(()=>resumeOriginal178OwnerRecovery({
   session:{user_id:'verified'},readView:async()=>ready,
   dispatch:async()=>forged,
  }),/FIRST178_RECOVERY_PROVIDER_RESULT_NOT_VERIFIED/);
 }
});
