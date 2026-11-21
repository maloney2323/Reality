import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';

const migration=readFileSync(new URL(
 '../supabase/migrations/20261121204000_signed_continuity_governed_recovery_action_v1.sql',
 import.meta.url),'utf8');
const worker=readFileSync(new URL(
 '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');

test('same signed worker consumes exact persisted LLM recovery decision; no new shift or work is invented',()=>{
 for(const token of [
  "i.proposed_upgrade,'[GOVERNED_ACTION:'",
  "i.proposed_upgrade,'[BLOCKER_CLASS:'",
  "v_action<>'REQUALIFY_EXISTING_CONTINUITY_SOURCE'",
  "public.reality_reconcile_continuity_qualification_routes_v1(p_worker_run_id)",
  "public.reality_read_owner_multi_original_shift_preflight_v1(v_owner,2)",
  "'model_execution_authorized'<>'false'",
  "'owner_approval_granted'<>'false'",
  "original_resumed',false",
  "original_job_completed',false",
  "original_claim_count",
  "independent_final_receipt_count",
  "EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED_NO_SCOPE_EXPANSION"
 ])assert.ok(migration.includes(token),'missing exact recovery boundary '+token);
 assert.doesNotMatch(migration,
  /insert into reality_internal\.governed_employee_original_claims_v1|update reality_internal\.governed_employee_completion_warrants_v1|security definer/i);
 assert.doesNotMatch(migration,/github\.com\/maloney2323|issues\/378|#307|owner_id\s*:\s*'[0-9a-f]{8}/i);
});

test('independent recovery review requires a distinct later signed worker and preserves original incompleteness',()=>{
 for(const token of [
  'action_worker_run_id<>p_worker_run_id',
  "phase='ACTION_RECORDED_AWAITING_DISTINCT_WORKER'",
  "r.started_at>clock_timestamp()-interval '3 minutes'",
  'independent_review_receipt_sha256',
  "'SOURCE_REQUALIFICATION_VERIFIED_BUSINESS_WARRANT_STILL_MISSING'",
  "'SIGNED_SOURCE_REQUALIFICATION_VERIFIED_NEW_ORIGINAL_ADMITTED'",
  "original_job_completed_by_review',false",
  "source_requalification_action_verified',true"
 ])assert.ok(migration.includes(token),'missing reviewer evidence '+token);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.reality_execute_signed_continuity_recovery_v1/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.reality_verify_signed_continuity_recovery_v1/);
 assert.match(worker,/shift_continuity_incident_investigation:shiftContinuityInvestigation/);
 assert.match(worker,/signed_continuity_recovery_action:signedContinuityRecoveryAction/);
 assert.match(worker,/signed_continuity_recovery_verification:signedContinuityRecoveryVerification/);
 assert.ok(worker.indexOf("reality_verify_signed_continuity_recovery_v1")<
  worker.indexOf("reality_execute_signed_continuity_recovery_v1"));
});
const db={url:'https://isolated-fixture.supabase.co',secretKey:'not-a-real-key'};
const uuid='11111111-2222-4333-8444-555555555555';
for(const method of ['reality_execute_signed_continuity_recovery_v1',
 'reality_verify_signed_continuity_recovery_v1']){
 test('only allowlisted signed recovery RPC can use the existing database transport: '+method,
  async()=>{
   let n=0;
   const args={p_shift_id:uuid,p_worker_run_id:uuid};
   const reply=await shiftRpc(db,method,args,{
    fetchImpl:async(url,options)=>{
     n++;
     assert.equal(url,db.url+'/rest/v1/rpc/'+method);
     assert.equal(options.method,'POST');
     assert.deepEqual(JSON.parse(options.body),args);
     return{ok:true,json:async()=>({status:'SIGNED_MOCKED_READBACK'})};
    }
   });
   assert.equal(n,1);
   assert.equal(reply.status,'SIGNED_MOCKED_READBACK');
  });
}
