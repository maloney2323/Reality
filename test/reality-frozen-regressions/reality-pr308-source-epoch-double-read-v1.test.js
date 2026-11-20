// Frozen original-job PR308 source epoch regression.
// RUN SAME TEST against PRE-REPAIR source (RED) and FIXED source (GREEN).
// The historical incident remains independently unsettled until its
// separate signed case-specific gate accepts adequate original evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {requalifyOneChangedEmployeeSource}
 from '../../src/reality-qualified-source-requalification-v1.js';

const ids={
 shift:'ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce',
 worker:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
 owner:'85eeae0b-2988-43c4-b20c-590fb51da70d',
 job:'9296b5c7-c0db-4dc8-99a0-271302a7b905',
 lease:'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'
};
const sha=x=>'sha256:'+x.repeat(64);
const source='https://github.com/maloney2323/Reality/pull/308';
const claim={
 status:'CHANGED_QUALIFIED_SOURCE_SIGNED_REQUALIFICATION_CLAIMED',
 job_id:ids.job,owner_id:ids.owner,shift_id:ids.shift,
 claim_id:ids.lease,worker_run_id:ids.worker,source_ref:source,
 original_title:'Original signed source review',
 original_source_updated_at:'2026-11-17T15:30:00Z',
 first_source_sha256:sha('a'),changed_review_sha256:sha('b'),
 original_independent_receipt_sha256:sha('c'),
 requalification_attempts_remaining:1,
 installation_authorized:false,production_changed:false,
 original_customer_job_completed:false
};
const data=(checksum,title='Source review',updated='2026-11-17T16:00:00Z')=>({
 source_ref:source,source_title:title,provider_updated_at:updated,
 provider_proof_sha256:checksum,checked_at:'2026-11-17T16:20:00Z'
});
const db={strictSecrets:true,secretKey:'signed-fixture-unused',project:'preview'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'preview'};
function runtime({snapshots,recorded=true}){
 let reads=0,records=0;
 const call=async(_db,name)=>{
  if(name==='reality_claim_changed_qualified_evidence_source_v1')
   return claim;
  if(name==='reality_record_changed_qualified_evidence_source_v1'){
   records++;
   return {
    status:'SAME_QUALIFIED_EVIDENCE_JOB_REQUALIFIED',
    job_id:ids.job,owner_id:ids.owner,shift_id:ids.shift,
    requalification_receipt_sha256:sha('d'),
    original_failed_receipt_preserved:true,
    execution_authorized_by_existing_shift:true,
    independent_final_verification_required:true,
    installation_authorized:false,production_changed:false,
    original_customer_job_completed:false
   };
  }
  throw Error('UNEXPECTED_RPC_'+name);
 };
 return {
  counts:()=>({reads,records}),
  run:()=>requalifyOneChangedEmployeeSource({
   db,env,shiftId:ids.shift,workerRunId:ids.worker,call,
   readSource:async()=>{
    const at=Math.min(reads,snapshots.length-1);
    reads++;
    return snapshots[at];
   },
   fetchImpl:async()=>{throw Error('NO_EXTERNAL_EFFECTS')}
  })
 };
}
test('PR308 frozen RED: changed signed source between consecutive independent provider observations must not be requalified',async()=>{
 const t=runtime({snapshots:[data(sha('b')),data(sha('e'))]});
 const result=await t.run();
 assert.equal(t.counts().reads,2,
  'two independently observed source snapshots required');
 assert.equal(t.counts().records,0,
  'a changed second source epoch must not be recorded as requalified');
 assert.equal(result.status,'CHANGED_SOURCE_REQUALIFICATION_NOT_STABLE');
 assert.equal(result.original_customer_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.code_self_repair_proven,false);
});
test('PR308 stable same source across two independent reads may requalify only as evidence, not settle customer job',async()=>{
 const t=runtime({snapshots:[data(sha('b')),data(sha('b'))]});
 const result=await t.run();
 assert.deepEqual(t.counts(),{reads:2,records:1});
 assert.equal(result.status,'SAME_QUALIFIED_EVIDENCE_JOB_REQUALIFIED');
 assert.equal(result.old_failed_receipt_preserved,true);
 assert.equal(result.independent_final_verification_required,true);
 assert.equal(result.original_customer_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.code_self_repair_proven,false);
});
test('PR308 same checksum but title or time changes between signed reads is not a stable source epoch',async()=>{
 for(const second of [
  data(sha('b'),'Different title'),
  data(sha('b'),'Source review','2026-11-17T16:01:00Z')
 ]){
  const t=runtime({snapshots:[data(sha('b')),second]});
  const result=await t.run();
  assert.equal(t.counts().records,0);
  assert.equal(result.status,'CHANGED_SOURCE_REQUALIFICATION_NOT_STABLE');
 }
});
