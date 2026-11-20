// Build an exact, inspectable source repair artifact from the SAME signed
// maintenance CI run that independently reproduced RED and GREEN.
// This is a candidate release package; NO model or GitHub run authorizes
// installation, changes production, or settles the original customer job.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {basename,join} from 'node:path';
const fail=x=>{throw Error('REALITY_MAINTENANCE_ARTIFACT_'+x)};
const digest=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const paths={dir:'artifact'};
function git(args){
 const r=spawnSync('git',args,{encoding:'utf8',timeout:15000});
 if(r.status!==0)fail('GIT_SOURCE_VERSION_UNVERIFIED');
 return r.stdout.trim();
}
function build(){
 if(process.env.GITHUB_ACTIONS!=='true'||
  process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
  !['push','pull_request'].includes(process.env.GITHUB_EVENT_NAME)||
  process.env.GITHUB_EVENT_NAME==='push'&&
   process.env.GITHUB_REF!=='refs/heads/repair/maintenance-warrant-scope-handoff-20261119'||
  process.env.GITHUB_EVENT_NAME==='pull_request'&&
   process.env.GITHUB_HEAD_REF!=='repair/maintenance-warrant-scope-handoff-20261119'||
  !/^\d{5,15}$/.test(process.env.GITHUB_RUN_ID||''))
  fail('INDEPENDENT_REGISTERED_CI_REQUIRED');
 const head=git(['rev-parse','HEAD']);
 if(!SHA.test(head)||process.env.GITHUB_EVENT_NAME==='push'&&
  head!==process.env.GITHUB_SHA)
  fail('CURRENT_REPAIR_COMMIT_NOT_PINNED');
 const id='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
 const specFile='reality-maintenance-case-specs/'+id+'.json';
 const triggerFile='reality-maintenance-ci-triggers/'+id+'.json';
 const proofFile=join(paths.dir,'maintenance-sourcebound-red-green-'+id+'.json');
 const specText=readFileSync(specFile),triggerText=readFileSync(triggerFile);
 const evidenceText=readFileSync(proofFile);
 let spec,trigger,evidence;
 try{
  spec=JSON.parse(specText);
  trigger=JSON.parse(triggerText);
  evidence=JSON.parse(evidenceText);
 }catch{fail('PINNED_CI_EVIDENCE_JSON_INVALID')}
 if(!UUID.test(spec.maintenance_id||'')||spec.maintenance_id!==id||
  spec.schema!=='reality-maintenance-case-frozen-ci-v1'||
  !UUID.test(spec.shift_id||'')||
  spec.source_ref!=='https://github.com/maloney2323/Reality/pull/308'||
  !SOURCE.test(spec.source_ref)||
  !SHA.test(spec.historical_commit_sha||'')||
  !/^src\/[a-z0-9_/-]+\.js$/.test(spec.target_source_path||'')||
  spec.target_source_path.includes('..')||
  !/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/.test(spec.frozen_test_path||'')||
  spec.frozen_test_path.includes('..')||
  spec.installation_authorized!==false||
  spec.original_customer_execution_proven!==false||
  spec.case_regression_only!==true)
  fail('SIGNED_SOURCE_CASE_SPEC_INVALID');
 if(trigger.maintenance_id!==id||trigger.shift_id!==spec.shift_id||
  trigger.source_ref!==spec.source_ref||
  trigger.historical_failure_kind!==spec.historical_failure_kind||
  trigger.installation_authorized!==false||
  trigger.original_job_completed!==false||
  trigger.repair_executed!==false||
  trigger.production_changed!==false)
  fail('SIGNED_TRIGGER_AND_CASE_DRIFT');
 if(evidence.schema!=='reality-existing-shift-case-specific-ci-red-green-v1'||
  evidence.maintenance_id!==id||
  evidence.shift_id!==spec.shift_id||
  evidence.source_ref!==spec.source_ref||
  evidence.historical_failure_kind!==spec.historical_failure_kind||
  evidence.historical_commit_sha!==spec.historical_commit_sha||
  evidence.corrected_commit_sha!==head||
  String(evidence.github_run_id)!==process.env.GITHUB_RUN_ID||
  evidence.target_source_path!==spec.target_source_path||
  evidence.case_spec_sha256!==digest(specText)||
  evidence.signed_trigger_sha256!==digest(triggerText)||
  evidence.same_frozen_test_on_both_versions!==true||
  evidence.case_specific_source_epoch_regression_verified!==true||
  evidence.historical_red?.failed<1||
  evidence.corrected_green?.failed!==0||
  evidence.corrected_green?.passed<3||
  evidence.existing_requalification_green?.failed!==0||
  evidence.existing_requalification_green?.passed<3||
  evidence.original_customer_execution_proven!==false||
  evidence.maintenance_installation_authorized!==false||
  evidence.original_job_completed!==false||
  evidence.production_changed!==false)
  fail('SIGNED_CI_RED_GREEN_NOT_INDEPENDENTLY_PROVEN');
 const frozen=readFileSync(spec.frozen_test_path);
 if(evidence.frozen_test_sha256!==digest(frozen))
  fail('CI_FROZEN_TEST_BLOB_MISMATCH');
 const current=readFileSync(spec.target_source_path);
 const historical=spawnSync('git',['show',
  spec.historical_commit_sha+':'+spec.target_source_path],
  {encoding:null,timeout:15000});
 if(historical.status!==0||
  !Buffer.isBuffer(historical.stdout))fail('HISTORICAL_FILE_UNVERIFIED');
 const previous=historical.stdout;
 if(!previous.toString('utf8').includes(spec.historical_defect_marker)||
   previous.toString('utf8').includes(spec.corrected_defect_guard)||
   !current.toString('utf8').includes(spec.corrected_defect_guard)||
   digest(previous)===digest(current))
  fail('CODE_CORRECTION_NOT_DIFFERENT_OR_RELEVANT');
 if(git(['rev-parse','HEAD:'+spec.target_source_path])!==blob(current))
  fail('CURRENT_COMMIT_SOURCE_BLOB_DRIFT');
 const base={
  schema:'reality-owner-reviewable-maintenance-artifact-v1',
  source:'EXISTING_SIGNED_MAINTENANCE_CI_RUN',
  shift_id:spec.shift_id,maintenance_id:id,source_ref:spec.source_ref,
  original_failure_kind:spec.historical_failure_kind,
  file_path:spec.target_source_path,
  historical_commit_sha:spec.historical_commit_sha,
  historical_blob_sha:blob(previous),
  historical_file_sha256:digest(previous),
  exact_candidate_commit_sha:head,
  candidate_blob_sha:blob(current),
  candidate_source_sha256:digest(current),
  exact_frozen_test_path:spec.frozen_test_path,
  frozen_test_sha256:digest(frozen),
  case_spec_sha256:digest(specText),
  signed_trigger_sha256:digest(triggerText),
  independent_case_ci_receipt_sha256:digest(evidenceText),
  github_run_id:Number(process.env.GITHUB_RUN_ID),
  historical_red:evidence.historical_red,
  repaired_green:evidence.corrected_green,
  existing_regression_green:evidence.existing_requalification_green,
  artifact_is_reviewable:true,
  independently_tested_source_candidate:true,
  owner_exact_install_approval_required:true,
  owner_install_approval_receipt_id:null,
  install_executed:false,
  original_customer_job_completed:false,
  production_changed:false,
  autonomous_full_shift_proven:false,
  next_action:'PRESENT_EXACT_REPAIR_ARTIFACT_TO_OWNER_AND_REQUEST_PINNED_APPROVAL'
 };
 const manifest={...base,manifest_hash_sha256:digest(JSON.stringify(base))};
 if(!HASH.test(manifest.manifest_hash_sha256))
  fail('MANIFEST_DIGEST_INVALID');
 mkdirSync(paths.dir,{recursive:true});
 const stem='maintenance-verified-repair-'+id;
 const sourceOutput=join(paths.dir,stem+'.js');
 copyFileSync(spec.target_source_path,sourceOutput);
 const output=join(paths.dir,stem+'.json');
 writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
 const reread=JSON.parse(readFileSync(output,'utf8'));
 if(reread.candidate_source_sha256!==digest(readFileSync(sourceOutput))||
    reread.manifest_hash_sha256!==digest(JSON.stringify(base)))
  fail('REVIEWABLE_SOURCE_AND_MANIFEST_NOT_MATCHED');
 console.log('REALITY_SIGNED_MAINTENANCE_EXACT_ARTIFACT_BUILT',JSON.stringify({
  maintenance_id:id,source_ref:spec.source_ref,
  candidate_commit:head,source_sha256:manifest.candidate_source_sha256,
  artifact_manifest_sha256:manifest.manifest_hash_sha256,
  independent_frozen_green:evidence.corrected_green.passed,
  owner_install_approval_receipt_id:null,
  installation_authorized:false,install_executed:false,
  original_customer_job_completed:false,production_changed:false
 }));
}
build();
