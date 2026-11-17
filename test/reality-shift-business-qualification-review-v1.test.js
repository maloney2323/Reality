import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {reviewOneSignedBusinessQualificationStall}
 from '../src/reality-shift-business-qualification-review-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const incident='33333333-4444-4555-8666-777777777777';
const claimId='44444444-5555-4666-8777-888888888888';
const run='55555555-6666-4777-8888-999999999999';
const inquiry='66666666-7777-4888-8999-aaaaaaaaaaaa';
const hash=x=>'sha256:'+x.repeat(64);
const ref='https://github.com/maloney2323/Reality/pull/307';
const db={strictSecrets:true,secretKey:'fixture',project:'sandbox',url:'https://sandbox.test'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'sandbox'};
const claim={status:'SIGNED_BUSINESS_QUALIFICATION_REVIEW_CLAIMED',
 incident_id:incident,shift_id:shift,owner_id:owner,source_claim_id:inquiry,
 claim_id:claimId,worker_run_id:run,review_attempt:1,reviewer:'Quinn',
 reviewer_function_id:'quality_security_reliability',
 source_ref:ref,prior_source_sha256:hash('a'),
 investigation_receipt_sha256:hash('b'),
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const rolesBuilder=()=>({roles:[{employee_name:'Quinn',
 function_id:'quality_security_reliability'}]});
const sourceProof=()=>({source_ref:ref,provider_proof_sha256:hash('c'),
 checked_at:'2026-11-17T22:44:00Z'});
function stub({claimed=claim,status='NO_ORIGINAL_ADMISSION_CONFIRMED',originalJobs=0,inquiries=41}={}){
 const calls=[];
 const call=async(_db,method,args)=>{
  calls.push({method,args});
  if(method==='reality_claim_shift_business_qualification_review_v1')
   return claimed;
  if(method==='reality_record_shift_business_qualification_review_v1')
   return {status,incident_id:incident,shift_id:shift,reviewer:'Quinn',
    independent_receipt_sha256:hash('d'),
    provider_source_epoch_changed:true,
    original_job_claims:originalJobs,source_backed_inquiries:inquiries,
    next_action:'DISCOVER_EXACT_AUTHORIZED_ORIGINAL_BUSINESS_WORK_OR_REQUEST_SOURCE_CONNECTION',
    original_job_completed:false,repair_executed:false,
    installation_authorized:false,production_changed:false};
  throw Error('FORBIDDEN_'+method);
 };
 return {call,calls};
}
test('different signed employee independently verifies 41 inquiries but zero original claims',async()=>{
 const f=stub();let readCount=0;
 const x=await reviewOneSignedBusinessQualificationStall({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>{
   readCount++;
   return sourceProof();
  },fetchImpl:async()=>{throw Error('FORBIDDEN_PROVIDER')}
 });
 assert.equal(readCount,2);
 assert.equal(x.status,'NO_ORIGINAL_ADMISSION_CONFIRMED');
 assert.equal(x.independent_qualification_gap_verification_completed,true);
 assert.equal(x.source_backed_inquiries,41);
 assert.equal(x.original_job_claims,0);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.repair_executed,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(f.calls[1].method,'reality_record_shift_business_qualification_review_v1');
});
test('a newly claimed original is recorded only as progress and not final settlement',async()=>{
 const f=stub({status:'ORIGINAL_CLAIM_NOW_EXISTS',originalJobs:1});
 const x=await reviewOneSignedBusinessQualificationStall({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>sourceProof(),
  fetchImpl:async()=>{throw Error('FORBIDDEN_PROVIDER')}
 });
 assert.equal(x.original_job_claims,1);
 assert.equal(x.original_job_completed,false);
 assert.equal(x.status,'ORIGINAL_CLAIM_NOW_EXISTS');
});
test('forged final receipt cannot convert qualification proof into completed customer work',async()=>{
 const f=stub();
 const call=async(...args)=>{
  const x=await f.call(...args);
  if(args[1]==='reality_record_shift_business_qualification_review_v1')
   return {...x,original_job_completed:true};
  return x;
 };
 await assert.rejects(reviewOneSignedBusinessQualificationStall({
  db,env,shiftId:shift,workerRunId:run,call,
  rolesBuilder,readSource:async()=>sourceProof(),
  fetchImpl:async()=>{throw Error('FORBIDDEN_PROVIDER')}
 }),/BUSINESS_QUALIFICATION_INDEPENDENT_INDEPENDENT_QUALIFICATION_VERIFICATION_RECEIPT_INVALID/);
});
test('unavailable or unstable provider cannot mint an independent receipt',async()=>{
 const f=stub();let n=0;
 const x=await reviewOneSignedBusinessQualificationStall({
  db,env,shiftId:shift,workerRunId:run,call:f.call,
  rolesBuilder,readSource:async()=>({...sourceProof(),
   provider_proof_sha256:hash(++n===1?'c':'e')}),
  fetchImpl:async()=>{throw Error('FORBIDDEN_PROVIDER')}
 });
 assert.equal(x.status,'BUSINESS_QUALIFICATION_SOURCE_EPOCH_UNSTABLE');
 assert.equal(f.calls.length,1);
});
test('signed qualification reviewer RPCs reach shared allowlisted transport',async()=>{
 for(const method of ['reality_claim_shift_business_qualification_review_v1',
  'reality_record_shift_business_qualification_review_v1']){
  let called=false;
  const result=await shiftRpc(db,method,{p_shift_id:shift},{
   fetchImpl:async(url,options)=>{
    called=true;
    assert.equal(url,db.url+'/rest/v1/rpc/'+method);
    assert.equal(options.method,'POST');
    return {ok:true,json:async()=>({status:'TEST_ONLY'})};
   }
  });
  assert.equal(called,true);
  assert.equal(result.status,'TEST_ONLY');
 }
});
test('signed reviewer SQL verifies original claims, never evidence job count as original',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261117_shift_business_qualification_independent_review_v10.sql',
  import.meta.url),'utf8');
 assert.match(sql,/reality_internal\.governed_employee_original_claims_v1 c/);
 assert.match(sql,/run\.started_at>inc\.investigated_at/);
 assert.match(sql,/for update of inc skip locked/);
 assert.match(sql,/NO_ORIGINAL_ADMISSION_CONFIRMED/);
 assert.match(sql,/BUSINESS_QUALIFICATION_LEASES_FENCED_/);
 assert.match(sql,/status='PROVIDER_PROOF_UNAVAILABLE'/);
 assert.match(sql,/r\.owner_id/);
 assert.match(sql,/check\(original_job_completed=false\)/);
 assert.doesNotMatch(sql,/cron\.alter_job|cron\.schedule\(/);
 assert.doesNotMatch(sql,/grant execute[^;]*to (anon|authenticated)/is);
});

test('one signed post-failure retry is acceptable but a third is refused',async()=>{
 const ready=stub({claimed:{...claim,review_attempt:2}});
 const passed=await reviewOneSignedBusinessQualificationStall({
  db,env,shiftId:shift,workerRunId:run,call:ready.call,
  rolesBuilder,readSource:async()=>sourceProof(),
  fetchImpl:async()=>{throw Error('FORBIDDEN_PROVIDER')}
 });
 assert.equal(passed.status,'NO_ORIGINAL_ADMISSION_CONFIRMED');
 for(const invalid of [0,3,null]){
  const f=stub({claimed:{...claim,review_attempt:invalid}});
  await assert.rejects(reviewOneSignedBusinessQualificationStall({
   db,env,shiftId:shift,workerRunId:run,call:f.call,
   rolesBuilder,readSource:async()=>{throw Error('SHOULD_NOT_READ')},
   fetchImpl:async()=>{throw Error('SHOULD_NOT_FETCH')}
  }),/BUSINESS_QUALIFICATION_INDEPENDENT_EXACT_OWNER_SOURCE_AND_LEASE_REQUIRED/);
  assert.equal(f.calls.length,1);
 }
});
test('SQL repair preserves prior reviewer claim and allows just one next signed worker',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261117_business_review_signed_write_and_bounded_reclaim_v11.sql',
  import.meta.url),'utf8');
 assert.match(sql,/into shift_state/);
 assert.match(sql,/i\.finished_at>shift_state\.authorized_at/);
 assert.doesNotMatch(sql,/select s\.owner_id,s\.shift_id,s\.authorized_at into s/);
 assert.match(sql,/review_attempts between 1 and 2/);
 assert.match(sql,/review_attempts=2/);
 assert.match(sql,/current_review\.status='PROVIDER_PROOF_UNAVAILABLE'/);
 assert.match(sql,/review_failure_history=review_failure_history/);
 assert.match(sql,/'review_attempt',\(select r\.review_attempts/);
 assert.doesNotMatch(sql,/set\s+review_attempts\s*=\s*0/i);
 assert.doesNotMatch(sql,/cron\.alter_job|cron\.schedule\(/i);
});
