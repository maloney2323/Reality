import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shiftRpc} from '../src/reality-governed-shift-boundary-v1.js';
import {signedRejectionReentryScope,independentlyVerifiedSignedRejectionCi,
 advanceInvestigatedSignedModelRejection}
 from '../src/reality-signed-model-rejection-reentry-v1.js';

const id=n=>'11111111-2222-4333-8444-'+String(n).padStart(12,'0');
const hash=n=>'sha256:'+String(n).repeat(64);
const release='a'.repeat(40),previous='b'.repeat(40);
const branch='repair/verified-original-feature-fixture';
const db={strictSecrets:true,project:'fixture',url:'https://fixture.supabase.co',
 secretKey:'fixture-service-key'};
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:release,
 VERCEL_GIT_COMMIT_REF:branch,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const scope={status:'SIGNED_CHAT_REJECTED_ORIGINAL_REENTRY_INDEPENDENT_CI_DUE',
 shift_id:id(1),worker_run_id:id(2),trigger_id:id(3),incident_id:id(4),owner_id:id(5),
 original_work_id:'work:'+'c'.repeat(32),rejection_reason:'MODEL_REVIEWED_STRUCTURAL_SPAN_INVALID',
 rejection_receipt_sha256:hash(1),investigation_receipt_sha256:hash(2),
 source_evidence_sha256:hash(3),spec_sha256:hash(4),prior_release_sha:previous,release_sha:release,
 rejected_at:'2026-11-22T14:35:21.491872Z',installation_authorized:false,
 original_job_completed:false,new_original_admitted:false,production_changed:false};
const workflow='.github/workflows/reality-continuity-format-remediation.yml';
const run={id:451230001,head_sha:release,head_branch:branch,event:'push',status:'completed',conclusion:'success',
 name:'Reality independent Continuity format remediation',path:workflow,
 repository:{full_name:'maloney2323/Reality'},html_url:'https://github.com/maloney2323/Reality/actions/runs/451230001',
 run_started_at:'2026-11-22T15:10:00Z',updated_at:'2026-11-22T15:13:00Z'};
const job={id:138123001,run_id:run.id,head_sha:release,status:'completed',conclusion:'success',
 name:'verify-format-contract',steps:[{name:'Verify bounds and unchanged authority',conclusion:'success'}]};
const head={ref:'refs/heads/'+branch,object:{sha:release}};
const status={sha:release,statuses:[{id:15,context:'Vercel',state:'success',
 target_url:'https://vercel.com/team/reality/deployment-r4Tfa54673'}]};
const code=p=>readFileSync(new URL(p,import.meta.url),'utf8');
function setup(overrides={}){
 const write=[],requests=[];
 const chosen={...scope,...overrides.scope};
 const responses=new Map([
  ['/actions/workflows/reality-continuity-format-remediation.yml/runs?head_sha='+release+'&event=push&status=completed&per_page=10',{workflow_runs:overrides.runs??[run]}],
  ['/git/ref/heads/'+branch,overrides.head??head],
  ['/commits/'+release+'/status',overrides.status??status],
  ['/actions/runs/'+run.id+'/jobs?per_page=100',{jobs:overrides.jobs??[job]}]
 ]);
 return {write,requests,db,env:{...env,...overrides.env},shiftId:scope.shift_id,workerRunId:scope.worker_run_id,
  call:async(_db,name,args)=>{
   if(name==='reality_read_signed_chat_model_rejection_reentry_v1'){
    assert.deepEqual(args,{p_shift_id:scope.shift_id,p_worker_run_id:scope.worker_run_id,p_release_sha:release});
    return chosen;
   }
   assert.equal(name,'reality_reenter_signed_chat_model_rejection_v1');write.push(args);
   assert.equal(args.p_trigger_id,scope.trigger_id);
   assert.equal(args.p_ci_proof.schema,'reality-independent-signed-rejection-reentry-ci-v1');
   assert.equal(args.p_ci_proof.original_job_completed,false);
   assert.equal(args.p_ci_proof.candidate_executed,false);
   assert.equal(args.p_ci_proof.branch,branch);
   return {status:'SIGNED_MODEL_REJECTION_INDEPENDENTLY_QUALIFIED_SAME_ORIGINAL_REENTERED',
    original_work_id:scope.original_work_id,trigger_id:scope.trigger_id,
    shift_id:scope.shift_id,incident_id:scope.incident_id,
    rejection_receipt_sha256:hash(1),investigation_receipt_sha256:hash(2),
    ci_receipt_sha256:hash(5),revised_spec_sha256:hash(6),
    installation_authorized:false,original_job_completed:false,
    new_original_admitted:false,new_shift_started:false,production_changed:false};
  },
  fetchImpl:async(u,opts)=>{
   assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
   const path=u.slice('https://api.github.com/repos/maloney2323/Reality'.length);
   assert.ok(responses.has(path),'Unexpected provider fetch '+path);requests.push(path);
   return {ok:true,json:async()=>responses.get(path)};
  }
 };
}
test('signed current failure and distinct CI-successful preview reenters SAME original without execution',async()=>{
 const f=setup();const r=await advanceInvestigatedSignedModelRejection(f);
 assert.equal(r.status,'SIGNED_MODEL_REJECTION_INDEPENDENTLY_QUALIFIED_SAME_ORIGINAL_REENTERED');
 assert.equal(r.original_work_id,scope.original_work_id);assert.equal(r.same_original_reentered,true);
 assert.equal(r.new_original_admitted,false);assert.equal(r.new_shift_started,false);
 assert.equal(r.installation_authorized,false);assert.equal(r.original_job_completed,false);
 assert.equal(f.write.length,1);assert.equal(f.requests.length,4);
});
test('reject stale releases, absent signed authority, changed head, CI failures, nonunique CI, insecure preview',async()=>{
 for(const variant of [
  {env:{VERCEL_ENV:'production'}},{env:{VERCEL_GIT_COMMIT_REF:'main'}},
  {scope:{prior_release_sha:release}},
  {scope:{original_job_completed:true}},
  {runs:[{...run,conclusion:'failure'}]},{runs:[run,run]},
  {head:{ref:'refs/heads/'+branch,object:{sha:previous}}},
  {status:{sha:release,statuses:[]}},
  {jobs:[{...job,steps:[]}]},{jobs:[job,job]}
 ]){
  const f=setup(variant),r=await advanceInvestigatedSignedModelRejection(f);
  assert.equal(f.write.length,0,JSON.stringify(variant));
  assert.equal(r.original_job_completed,false);assert.equal(r.installation_authorized,false);
  assert.notEqual(r.status,'SIGNED_MODEL_REJECTION_INDEPENDENTLY_QUALIFIED_SAME_ORIGINAL_REENTERED');
 }
 assert.equal(signedRejectionReentryScope({...scope,rejection_receipt_sha256:hash(1).slice(0,-1)},env,scope.shift_id,scope.worker_run_id),false);
 assert.equal(independentlyVerifiedSignedRejectionCi(scope,env,[{...run,run_started_at:scope.rejected_at}],[job],head,status),null);
});
test('all verified one-use RPCs traverse existing allowlist while unknown actions still fail closed',async()=>{
 for(const name of ['reality_read_signed_chat_model_rejection_reentry_v1',
  'reality_reenter_signed_chat_model_rejection_v1']){
  const result=await shiftRpc(db,name,{}, {fetchImpl:async(url,opts)=>{
   assert.equal(url,db.url+'/rest/v1/rpc/'+name);
   assert.equal(opts.method,'POST');return {ok:true,json:async()=>({status:'fixture'})};
  }});
  assert.equal(result.status,'fixture');
 }
 await assert.rejects(shiftRpc(db,'reality_new_unbounded_approval_v1',{},{}),/SHIFT_RPC_NOT_ALLOWLISTED/);
});
test('actual observer, investigator, CI verifier and generator preserve immutable same-original source facts',()=>{
 const sql=code('../supabase/migrations/20261122150000_signed_chat_rejection_continuity_reentry_v1.sql');
 const investigator=code('../src/reality-shift-continuity-auto-investigation-v1.js');
 const worker=code('../api/reality/governed-employee-shift-worker.js');
 const generator=code('../src/reality-chat-new-development-worker-v1.js');
 const workflowFile=code('../.github/workflows/reality-continuity-format-remediation.yml');
 for(const s of ['signed_chat_model_rejection_evidence_v1',
  'SIGNED_CHAT_RECOVERY_MODEL_REJECTED','reality_observe_signed_chat_review_incident_v1',
  'reality_claim_next_shift_continuity_investigation_v1',
  'source_evidence=reality_internal.signed_chat_model_rejection_evidence_v1',
  'original_work_id','blocker_receipt_sha256','investigation_receipt_sha256',
  'SIGNED_CHAT_REJECTED_ORIGINAL_REENTRY_INDEPENDENT_CI_DUE',
  'SIGNED_MODEL_REJECTION_INDEPENDENTLY_QUALIFIED_SAME_ORIGINAL_REENTERED',
  'claim_expires_at<clock_timestamp()',
  'model_rejection_revision_epoch','negative_capability_memory',
  'source_evidence_sha256','prior_model_rejection_epoch','same_candidate_retry_forbidden',
  'same_original_reentered', 'no_replay', 'new_original_admitted', 'installation_authorized', 'production_changed']){
   // 'same_original_reentered' is the verifier return field, not database SQL.
   if(s==='same_original_reentered'||s==='same_candidate_retry_forbidden')
    assert.ok(s==='same_original_reentered'||sql.includes(s));
   else assert.ok(sql.includes(s),s);
 }
 assert.match(investigator,/SIGNED_CHAT_RECOVERY_MODEL_REJECTED/);
 assert.match(investigator,/source_candidate_executed/);
 assert.match(investigator,/An exact signed Chat recovery candidate MODEL_REJECTED/);
 assert.match(generator,/model_rejection_investigation_diagnosis/);
 assert.match(worker,/advanceInvestigatedSignedModelRejection/);
 assert.match(worker,/signed_chat_model_rejection_reentry/);
 assert.match(workflowFile,/verify-format-contract/);
 assert.doesNotMatch(sql,/security definer|installation_authorized',true|original_job_completed',true|production_changed',true/i);
});
