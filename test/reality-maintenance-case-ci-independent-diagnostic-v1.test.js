import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {independentlyReviewOneClaimBoundMaintenanceCiDiagnostic as review}
 from '../src/reality-signed-maintenance-external-review-v1.js';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const maintenance='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const oldWorker='a6c2ad3c-9ae9-4c9e-b3cb-2cf00b59d1aa';
const newWorker='aaaabbbb-cccc-4ddd-8eee-ffffffffffff';
const trigger='046186de28b7ab634ad3c75e64ee7ef09475f6dc';
const head=trigger;
const hash=x=>'sha256:'+x.repeat(64);
const runId=44633511608,artifactId=14581204621;
const digest='sha256:1e414f302fff9cd3c1ba3302b63fe2b504fcc86b01e8b6f9b5379bc3c89a5d32';
const scope={status:'SIGNED_MAINTENANCE_DIAGNOSTIC_NEEDS_INDEPENDENT_GITHUB_RECHECK',
 maintenance_id:maintenance,owner_id:'85eeae0b-2988-43c4-b20c-590fb51da70d',
 shift_id:shift,source_ref:'https://github.com/maloney2323/Reality/pull/307',
 source_epoch_receipt_sha256:hash('a'),trigger_commit_sha:trigger,
 trigger_receipt_sha256:hash('b'),
 ci_dispatched_at:new Date(Date.now()-120000).toISOString(),
 first_worker_run_id:oldWorker,independent_worker_run_id:newWorker,
 read_only:true,frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,production_changed:false};
const runner=readFileSync(new URL('../scripts/reality-maintenance-signed-case-ci-runner-v1.mjs',import.meta.url),'utf8');
const triggerItem={
 schema:'reality-signed-maintenance-case-ci-trigger-v1',
 maintenance_id:maintenance,shift_id:shift,worker_run_id:oldWorker,
 source_ref:scope.source_ref,source_epoch_receipt_sha256:scope.source_epoch_receipt_sha256,
 historical_failure_kind:'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
 frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false
};
const triggerBytes=Buffer.from(JSON.stringify(triggerItem,null,2)+'\n');
const triggerGitBlob=createHash('sha1').update('blob '+triggerBytes.length)
 .update(Buffer.from([0])).update(triggerBytes).digest('hex');
const providers={
 list:{workflow_runs:[{id:runId,name:'Reality registered signed maintenance executor',
   path:'.github/workflows/reality-registered-signed-maintenance-executor-v1.yml',
   event:'pull_request',head_branch:'repair/maintenance-warrant-scope-handoff-20261119',
   head_repository:{full_name:'maloney2323/Reality'},
   head_sha:head,status:'completed',conclusion:'success',
   created_at:new Date(Date.now()-50000).toISOString(),
   html_url:'https://github.com/maloney2323/Reality/actions/runs/'+runId}]},
 jobs:{jobs:[{id:135946061761,run_id:runId,name:'verify-exact-registered-handoff',
   status:'completed',conclusion:'success',steps:[
    {name:'Run independent claim-bound case-CI diagnostics on GitHub trigger',conclusion:'success'},
    {name:'Preserve independent diagnostic artifact without claiming RED',conclusion:'success'}]}]},
 artifacts:{artifacts:[{id:artifactId,
   name:'reality-maintenance-case-ci-diagnostic-'+runId,
   expired:false,size_in_bytes:951,digest,
   workflow_run:{head_branch:'repair/maintenance-warrant-scope-handoff-20261119',
    head_sha:head}}]},
 source:{path:'scripts/reality-maintenance-signed-case-ci-runner-v1.mjs',
  sha:'a'.repeat(40),encoding:'base64',
  content:Buffer.from(runner).toString('base64')},
 trigger:{path:'reality-maintenance-ci-triggers/'+maintenance+'.json',
  sha:triggerGitBlob,encoding:'base64',
  content:triggerBytes.toString('base64')}
};
const saved={status:'SIGNED_MAINTENANCE_CI_DIAGNOSTIC_REVIEWED_CASE_RED_STILL_REQUIRED',
 maintenance_id:maintenance,shift_id:shift,
 independent_worker_run_id:newWorker,github_run_id:runId,
 artifact_id:artifactId,artifact_digest:digest,
 independent_diagnostic_receipt_sha256:hash('d'),
 frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,production_changed:false};
function mock({scoped=scope,provider=providers,record=saved}={}){
 const calls=[],urls=[];
 return {calls,urls,
  call:async(_db,name,args)=>{
   calls.push({name,args});
   if(name==='reality_read_next_signed_maintenance_ci_diagnostic_v1')
    return scoped;
   if(name==='reality_record_signed_maintenance_ci_diagnostic_v1')
    return record;
   throw Error('UNKNOWN_RPC_'+name);
  },
  fetchImpl:async(url)=>{
   urls.push(url);
   const pick=url.includes('/actions/runs?')?provider.list:
    url.includes('/jobs?')?provider.jobs:
    url.includes('/artifacts?')?provider.artifacts:
    url.includes('/contents/reality-maintenance-ci-triggers/')?provider.trigger:
    provider.source;
   return {ok:true,json:async()=>pick};
  }
 };
}
const db={strictSecrets:true,secretKey:'mock',project:'hvkfreoagbrphwghjajw'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
test('separate signed worker verifies real GitHub job and artifact, records diagnostic only',async()=>{
 const f=mock();
 const result=await review({db,env,shiftId:shift,workerRunId:newWorker,...f});
 assert.equal(result.status,saved.status);
 assert.equal(result.independent_diagnostic_verified,true);
 assert.equal(result.independent_diagnostic_receipt_sha256,hash('d'));
 assert.equal(result.github_run_id,runId);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.independent_maintenance_ci_red_attested,false);
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[1].name,'reality_record_signed_maintenance_ci_diagnostic_v1');
 assert.equal(f.calls[1].args.p_github_run_id,runId);
 assert.equal(f.calls[1].args.p_artifact_id,artifactId);
 assert.equal(f.calls[1].args.p_artifact_digest,digest);
 assert.equal(f.calls[1].args.p_worker_run_id,newWorker);
 assert.equal(f.urls.length,5);
});
test('unrelated CI commits are not the exact signed maintenance trigger',async()=>{
 const wrong={...providers.list,workflow_runs:
  providers.list.workflow_runs.map(x=>({...x,head_sha:'f'.repeat(40)}))};
 const f=mock({provider:{...providers,list:wrong}});
 const result=await review({db,env,shiftId:shift,workerRunId:newWorker,...f});
 assert.equal(result.status,'MAINTENANCE_CI_DIAGNOSTIC_INDEPENDENT_RUN_NOT_YET_FOUND');
 assert.equal(result.original_job_completed,false);
 assert.deepEqual(f.calls.map(x=>x.name),
  ['reality_read_next_signed_maintenance_ci_diagnostic_v1']);
});
test('an artifact for the wrong maintenance identity cannot be reconciled',async()=>{
 const forged={...triggerItem,
  maintenance_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611'};
 const bytes=Buffer.from(JSON.stringify(forged,null,2)+'\n');
 const sha=createHash('sha1').update('blob '+bytes.length)
  .update(Buffer.from([0])).update(bytes).digest('hex');
 const f=mock({provider:{...providers,trigger:{...providers.trigger,
  sha,content:bytes.toString('base64')}}});
 const result=await review({db,env,shiftId:shift,workerRunId:newWorker,...f});
 assert.equal(result.status,'MAINTENANCE_CI_DIAGNOSTIC_SIGNED_TRIGGER_IDENTITY_UNVERIFIED');
 assert.equal(result.original_job_completed,false);
 assert.equal(f.calls.length,1);
});
test('missing artifact is not evidence of diagnostic execution',async()=>{
 const f=mock({provider:{...providers,artifacts:{artifacts:[]}}});
 const result=await review({db,env,shiftId:shift,workerRunId:newWorker,...f});
 assert.equal(result.status,'MAINTENANCE_CI_DIAGNOSTIC_CASE_EVIDENCE_UNTRUSTED');
 assert.equal(result.original_job_completed,false);
 assert.equal(f.calls.length,1);
});
test('claimed first worker cannot self-review or settle its own CI',async()=>{
 const f=mock({scoped:{...scope,first_worker_run_id:newWorker}});
 await assert.rejects(review({db,env,shiftId:shift,workerRunId:newWorker,...f}),
  /CASE_CI_SIGNED_OWNER_SOURCE_OR_DISPATCH_UNTRUSTED/);
 assert.equal(f.urls.length,0);
});
test('a provider response claiming completed repair is rejected',async()=>{
 const f=mock({record:{...saved,repair_executed:true}});
 await assert.rejects(review({db,env,shiftId:shift,workerRunId:newWorker,...f}),
  /CASE_CI_INDEPENDENT_DURABLE_DIAGNOSTIC_NOT_VERIFIED/);
});
test('no outstanding diagnostic does not call GitHub or mint authority',async()=>{
 const f=mock({scoped:{status:'NO_SIGNED_MAINTENANCE_DIAGNOSTIC_TO_REVIEW',
  frozen_ci_red_verified:false,repair_executed:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false}});
 const result=await review({db,env,shiftId:shift,workerRunId:newWorker,...f});
 assert.equal(result.status,'NO_SIGNED_MAINTENANCE_DIAGNOSTIC_TO_REVIEW');
 assert.equal(f.urls.length,0);
 assert.equal(result.original_job_completed,false);
});
test('SQL and worker continue same shift with independent diagnostic, not a case RED',()=>{
 const migration=readFileSync(new URL('../supabase/migrations/20261119235900_signed_maintenance_case_ci_independent_review_v1.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const boundary=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(migration,/w\.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'/);
 assert.match(migration,/worker_run_id<>p_worker_run_id/);
 assert.match(migration,/frozen_ci_red_verified',false/);
 assert.doesNotMatch(migration,/UPDATE reality_internal\.owner_internal_maintenance_jobs_v1\s+SET/i);
 assert.match(worker,/independentlyReviewOneClaimBoundMaintenanceCiDiagnostic\(\{/);
 assert.match(boundary,/read_next_signed_maintenance_ci_diagnostic_v1/);
 assert.match(boundary,/record_signed_maintenance_ci_diagnostic_v1/);
});
