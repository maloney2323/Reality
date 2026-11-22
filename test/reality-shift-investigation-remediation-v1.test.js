import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continuityTextContract,continuityProviderTextSchema}
 from '../src/reality-shift-continuity-auto-investigation-v1.js';
import {verifiedFormatEvidence,qualifyVerifiedInvestigationRemediation}
 from '../src/reality-shift-investigation-remediation-v1.js';
const id=n=>'11111111-2222-4333-8444-'+String(n).padStart(12,'0');
const hash='sha256:'+'a'.repeat(64), sha='b'.repeat(40);
const flags={execution_authorized:false,installation_authorized:false,original_job_completed:false,production_changed:false};
const db={strictSecrets:true,project:'fixture'};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'fixture',
 REALITY_GITHUB_TOKEN:'fixture-not-a-real-token',VERCEL_GIT_COMMIT_SHA:sha,VERCEL_GIT_COMMIT_REF:'preview-fixture'};
const failedAt='2026-01-01T00:00:00Z',later='2026-01-01T01:00:00Z';
const scope={status:'EXHAUSTED_FORMAT_INVESTIGATION_REMEDIATION_SCOPE',
 owner_id:id(1),shift_id:id(2),incident_id:id(3),worker_run_id:id(4),
 kind:'SIGNED_CHAT_RECOVERY_REVIEW_STALLED',investigation_attempts:3,
 evidence_sha256:hash,failure_history_sha256:hash,last_failure:{failed_at:failedAt,
 failure_reason:'MODEL_TEXT_BOUNDS_UNVERIFIED',validation_evidence:{
 schema:'reality-continuity-text-validation-v1',violations:[
 {field:'resume_acceptance_condition',min:30,max:300,length:313,reason:'ABOVE_MAX'}]}},...flags};
const run={id:101,head_sha:sha,head_branch:env.VERCEL_GIT_COMMIT_REF,event:'push',
 status:'completed',conclusion:'success',path:'.github/workflows/reality-continuity-format-remediation.yml',
 repository:{full_name:'maloney2323/Reality'},run_started_at:later,updated_at:later};
const job={id:102,run_id:run.id,head_sha:sha,name:'verify-format-contract',status:'completed',
 conclusion:'success',steps:[{name:'Verify bounds and unchanged authority',conclusion:'success'}]};
test('provider constraints derive from every existing field; reject all one-off bounds violations',()=>{
 for(const guided of [false,true]){
  const schema=continuityProviderTextSchema(guided);
  for(const {field,min,max} of continuityTextContract(guided)){
   assert.ok(schema[field].pattern);
   const re=new RegExp(schema[field].pattern);
   for(const n of [min,max])assert.equal(re.test('x'.repeat(n)),true,field);
   for(const n of [min-1,max+1,max+13])assert.equal(re.test('x'.repeat(n)),false,field);
  }
 }
 assert.equal(verifiedFormatEvidence(scope),true);
 for(const p of [{reason:'OUTER_WHITESPACE'},{length:299},{max:999},{field:'unknown'}]){
  const invalid=structuredClone(scope);Object.assign(invalid.last_failure.validation_evidence.violations[0],p);
  assert.equal(verifiedFormatEvidence(invalid),false);
 }
});
test('independent exact release CI proof unlocks only existing one-use investigation',async()=>{
 const seen=[];
 const result=await qualifyVerifiedInvestigationRemediation({db,env,shiftId:scope.shift_id,workerRunId:scope.worker_run_id,
  call:async(_db,method,args)=>{
   seen.push(method);
   if(method==='reality_read_shift_investigation_remediation_scope_v1')return scope;
   assert.equal(method,'reality_record_shift_investigation_remediation_v1');
   assert.equal(args.p_incident_id,scope.incident_id);
   assert.equal(args.p_failure_history_sha256,hash);
   assert.equal(args.p_provider_proof.head_sha,sha);
   return {status:'ONE_VERIFIED_FORMAT_REMEDIATION_INQUIRY_READY',owner_id:scope.owner_id,
    incident_id:scope.incident_id,shift_id:scope.shift_id,remediation_release_commit:sha,
    remediation_ci_run_id:run.id,remediation_receipt_sha256:hash,investigation_attempts:3,...flags};
  },fetchImpl:async url=>({ok:true,json:async()=>url.includes('/jobs?')?{jobs:[job]}:{workflow_runs:[run]}})});
 assert.equal(result.one_use_inquiry_only,true);
 for(const k of Object.keys(flags))assert.equal(result[k],false);
 assert.equal(seen.length,2);
});
test('wrong release, failed CI, old run, wrong job, missing scope and unproved cause do not unlock retry',async()=>{
 for(const variant of [
  {r:{...run,head_sha:'c'.repeat(40)}},{r:{...run,conclusion:'failure'}},
  {r:{...run,run_started_at:failedAt}},{j:{...job,conclusion:'failure'}},
  {j:{...job,steps:[]}},{s:{...scope,execution_authorized:true}},
  {s:{...scope,investigation_attempts:4}},{s:{...scope,last_failure:{failure_reason:'MODEL_PROVIDER_TIMEOUT'}}}
 ]){
  let recorded=false;
  const result=await qualifyVerifiedInvestigationRemediation({db,env,shiftId:scope.shift_id,workerRunId:scope.worker_run_id,
   call:async(_db,method)=>{if(method.includes('record_'))recorded=true;return variant.s||scope;},
   fetchImpl:async url=>({ok:true,json:async()=>url.includes('/jobs?')?{jobs:[variant.j||job]}:{workflow_runs:[variant.r||run]}})});
  assert.equal(recorded,false);assert.equal(result.execution_authorized,false);
 }
});
test('same ledger, signed wake, immutable attempts and no authority grants',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261122021030_shift_investigation_verified_remediation_v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 for(const v of ['investigation_attempts=3','remediation_used_at is null','r.started_at',
  'failure_history_sha256','for update','one_use_inquiry_only','p_worker_run_id',
  'grant execute on function public.reality_record_shift_investigation_remediation_v1'])assert.ok(sql.includes(v),v);
 assert.doesNotMatch(sql,/security definer|set investigation_attempts\s*=|installation_authorized',true|insert into reality_internal\.governed_employee_original_claims/);
 assert.ok(worker.indexOf('await qualifyVerifiedInvestigationRemediation')<worker.indexOf('await investigateOneSignedShiftContinuityIncident'));
});
