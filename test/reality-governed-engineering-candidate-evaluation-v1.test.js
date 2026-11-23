import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {inspectPinnedEngineeringCandidate,compareIsolatedEngineeringProbes}
 from '../src/reality-governed-engineering-candidate-evaluation-v1.js';
import {independentlyReviewSignedMaintenanceTarget as original}
 from '../src/reality-signed-maintenance-candidate-target-review-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const maintenance='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const path='src/reality-signed-maintenance-candidate-target-review-v1.js';
const sourceRef='https://github.com/maloney2323/Reality/pull/307';
const originalFile=new URL('../'+path,import.meta.url);
const pin={
 sourceBlobSha:'ddbb3317f76cf2c06deacb968c08f9f388f245af',
 sourceFileSha256:
  'sha256:09e6b72bc855de99572430a4ac2178f64f737e30b6ae81183188aa3b14294edc',
 proposedSha256:
  'sha256:30a57a2740cb572491a3e9daa15418f77cec1d8986ad8b0287a28287f8a15706',
 candidateReceiptSha256:
  'sha256:689fe8c93515dc94073de55a90680f28629af83660dbb0ee31f3bc6bec343fd7'
};
// Exact uninstalled REALITY MODEL candidate retrieved from the current signed
// maintenance ledger. Not assistant-written repair code or a fabricated fix.
const patch={
 find:" const targetInGraph=manifest.files.some(f=>f.path===c.source_path);\n const r=await call(db,'reality_record_signed_maintenance_candidate_target_review_v1',{\n",
 replace:" const targetInGraph=manifest.files.some(f=>f.path===c.source_path);\n const sourceMatchesOriginal=c.source_ref===env.REALITY_ORIGINAL_ISSUE_URL;\n const r=await call(db,'reality_record_signed_maintenance_candidate_target_review_v1',{\n",
 reason:'Add an explicit original-authority check at the narrow review point so downstream verdicting can distinguish a PR-scoped source from the authorized original. This is the smallest bounded correction candidate in the selected file for a handoff stall around historical zero-original-claims with signed inquiries, without claiming reproduction or broadening PR authority.'
};
const config=()=>({
 workId:work,maintenanceId:maintenance,sourceRef,sourcePath:path,
 sourceText:readFileSync(originalFile,'utf8'),
 sourceBlobSha:pin.sourceBlobSha,
 sourceFileSha256:pin.sourceFileSha256,
 patch,proposedSha256:pin.proposedSha256,
 candidateReceiptSha256:pin.candidateReceiptSha256
});
const sha=c=>'sha256:'+c.repeat(64);
const UUID='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const claim={
 status:'SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_CLAIMED',
 maintenance_id:maintenance,owner_id:owner,shift_id:shift,
 source_ref:sourceRef,source_path:path,
 model_request_id:'e078c059-250b-4ae0-b81f-c154c829d76e',
 reviewer_request_id:'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
 release_sha:'a'.repeat(40),
 candidate_receipt_sha256:pin.candidateReceiptSha256,
 source_review_authorized:true,target_repair_proven:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
};
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolatedmockproject',
 REALITY_ORIGINAL_ISSUE_URL:
  'https://github.com/maloney2323/Reality/issues/211'
};
const db={strictSecrets:true,project:env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF};
async function probe(review,caseId,graphMatch){
 const pathInGraph=graphMatch?path:'src/independent-other-worker.js';
 const manifest={
  source_tree_sha:'b'.repeat(40),
  worker_source_blob_sha:'c'.repeat(40),
  runtime_imports_count:1,
  files:[{path:pathInGraph,sha:'d'.repeat(40),size:1901}]
 };
 const calls=[];
 const r=await review({
  db,env,shiftId:shift,workerRunId:UUID,
  fetchImpl:async()=>{throw Error('NETWORK_DENIED')},
  readBroker:async()=>manifest,
  call:async(_db,name,payload)=>{
   calls.push({name,payload});
   if(name==='reality_claim_signed_maintenance_candidate_target_review_v1')
    return claim;
   if(name==='reality_record_signed_maintenance_candidate_target_review_v1')
    return {
     status:payload.p_target_in_worker_graph?
      'SIGNED_WORKER_DEPENDENCY_ONLY_FROZEN_RED_STILL_REQUIRED':
      'OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY',
     maintenance_id:maintenance,owner_id:owner,shift_id:shift,
     source_path:path,review_receipt_sha256:sha('f'),
     target_in_worker_graph:payload.p_target_in_worker_graph,
     independent_target_review_recorded:true,
     candidate_is_verified_repair:false,
     independent_frozen_red_verified:false,
     independent_ci_verified:false,repair_executed:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false
    };
   throw Error('UNREGISTERED_RPC_DENIED');
  }
 });
 assert.equal(calls.length,2);
 assert.equal(r.independent_frozen_red_verified,false);
 assert.equal(r.candidate_is_verified_repair,false);
 return {case_id:caseId,status:r.status,
  original_job_completed:r.original_job_completed,
  installation_authorized:r.installation_authorized,
  production_changed:r.production_changed};
}
test('Reality PR307 model candidate has an exact pinned immutable source and one patch span',()=>{
 const result=inspectPinnedEngineeringCandidate(config());
 assert.equal(result.status,'ENGINEERING_CANDIDATE_EXACT_SOURCE_READY_FOR_ISOLATED_PROBE');
 assert.equal(result.source_blob_sha,pin.sourceBlobSha);
 assert.equal(result.proposed_source_sha256,pin.proposedSha256);
 assert.equal(result.model_candidate_not_verified_fix,true);
 assert.equal(result.source_installed,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
});
test('actual model candidate is replayed only in an isolated temporary source file and does NOT change its claimed behavior',async()=>{
 const inspect=inspectPinnedEngineeringCandidate(config());
 assert.equal(inspect.status,
  'ENGINEERING_CANDIDATE_EXACT_SOURCE_READY_FOR_ISOLATED_PROBE');
 const baseline=[
  await probe(original,'authorized-original-dependency',true),
  await probe(original,'off-target-dependency',false)
 ];
 const file=join(dirname(fileURLToPath(originalFile)),
  '.reality-isolated-candidate-'+randomUUID()+'.js');
 try{
  // This is the ONLY write: an untracked temporary source file in the
  // ephemeral GitHub Actions checkout. It is never committed or installed.
  writeFileSync(file,inspect.proposed_source_text,{mode:0o600,flag:'wx'});
  const candidate=(await import(pathToFileURL(file).href))
   .independentlyReviewSignedMaintenanceTarget;
  assert.equal(typeof candidate,'function');
  const after=[
   await probe(candidate,'authorized-original-dependency',true),
   await probe(candidate,'off-target-dependency',false)
  ];
  assert.deepEqual(after,baseline);
  const verdict=compareIsolatedEngineeringProbes({
   inspection:inspect,baseline,candidate:after
  });
  assert.equal(verdict.status,'ENGINEERING_CANDIDATE_NO_OBSERVED_BEHAVIOR_CHANGE');
  assert.equal(verdict.behavioral_change_observed,false);
  assert.equal(verdict.frozen_case_red_independently_verified,false);
  assert.equal(verdict.actual_original_acceptance_passed,false);
  assert.equal(verdict.original_job_completed,false);
  assert.equal(verdict.next_governed_action,
   'REQUALIFY_CANDIDATE_AGAINST_FROZEN_FAILURE_REQUIREMENTS');
  assert.match(verdict.isolated_probe_receipt_sha256,/^sha256:[a-f0-9]{64}$/);
  console.log('REALITY_CODING_PROOF '+JSON.stringify({
   work_id:work,maintenance_id:maintenance,
   source_blob_sha:pin.sourceBlobSha,
   candidate_receipt_sha256:pin.candidateReceiptSha256,
   isolated_probe_receipt_sha256:verdict.isolated_probe_receipt_sha256,
   status:verdict.status,case_count:verdict.probe_count,
   source_installed:false,original_job_completed:false
  }));
  // Machine-readable independent CI result. GitHub Actions publishes this
  // evidence artifact; no runtime or Supabase database receives a write.
  // The owner work stays OPEN even when the regression test succeeds.
  if(process.env.GITHUB_ACTIONS==='true'&&
     typeof process.env.RUNNER_TEMP==='string'&&
     process.env.RUNNER_TEMP.startsWith('/')){
   const receipt={
    schema:'reality-governed-engineering-ci-candidate-evaluation-v1',
    provider:'GITHUB_ACTIONS_ISOLATED_RUNNER',
    github_run_id:process.env.GITHUB_RUN_ID||null,
    github_head_sha:process.env.GITHUB_SHA||null,
    original_work_id:work,maintenance_id:maintenance,
    source_ref:sourceRef,
    source_blob_sha:pin.sourceBlobSha,
    proposed_source_sha256:pin.proposedSha256,
    candidate_receipt_sha256:pin.candidateReceiptSha256,
    isolated_probe_receipt_sha256:verdict.isolated_probe_receipt_sha256,
    probe_count:verdict.probe_count,
    verdict:verdict.status,
    next_governed_action:verdict.next_governed_action,
    execution_authorized:false,
    source_installed:false,
    original_job_completed:false,
    independent_original_acceptance_verified:false
   };
   writeFileSync(join(process.env.RUNNER_TEMP,
    'reality-engineering-candidate-evidence.json'),
    JSON.stringify(receipt,null,2)+'\\n',{mode:0o600,flag:'w'});
  }
 }finally{
  if(existsSync(file))unlinkSync(file);
 }
 assert.equal(existsSync(file),false);
});
test('a stale source, replayed stale candidate or forged source prevents temporary execution',()=>{
 const input=config();
 for(const invalid of [
  {...input,sourceBlobSha:'e'.repeat(40)},
  {...input,sourceFileSha256:sha('0')},
  {...input,proposedSha256:sha('0')},
  {...input,patch:{...patch,find:patch.find+'not present'}},
  {...input,workId:'work:'+'2'.repeat(31)}
 ]){
  assert.notEqual(inspectPinnedEngineeringCandidate(invalid).status,
   'ENGINEERING_CANDIDATE_EXACT_SOURCE_READY_FOR_ISOLATED_PROBE');
 }
});
