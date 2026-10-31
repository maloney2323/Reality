// Independently replay the REAL pinned GitHub failure using the installed
// capability. The provider-fetch step is isolated from model-authored code.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {observeFirstGapFromGithub,FIRST_GAP_PROOF} from '../src/reality-first-gap-handoff-v0.1.js';
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const F='.reality-original178-provider-observation.json';
const token=String(process.env.GH_PROVIDER_READ_TOKEN||'');
const scope={owner_id:'CI_PROVIDER_NOT_OWNER_ID',goal_id:'CI_PROVIDER_NOT_USER_GOAL',
 original_work_id:WORK,original_issue_number:178,
 continuity_root_id:'CI_PROVIDER_NOT_WORLD',worldline_id:'CI_PROVIDER_NOT_WORLDLINE',
 goal_transition_receipt_ref:'CI_PROVIDER_NOT_GOAL_RECEIPT',
 goal_evidence_ref:'CI_PROVIDER_NOT_USER_MESSAGE',environment:'ISOLATED_PREVIEW',
 user_confirmed:true,owner_session_verified:true,goal_current_verified:true};
if(process.argv[2]==='observe'){
 if(token.length<20)throw Error('REALITY_PROVIDER_READ_TOKEN_REQUIRED');
 const p=await observeFirstGapFromGithub({scope,apiToken:token});
 if(p.status!=='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'||
   p.run_id!==FIRST_GAP_PROOF.run_id||p.run_sha!==FIRST_GAP_PROOF.run_head_sha||
   !/^[a-f0-9]{64}$/.test(p.log_sha256||'')||
   p.provider_receipt_ref!=='github:actions:run:40962921090:job:123760052647')
  throw Error('ORIGINAL178_PINNED_GITHUB_READBACK_MISMATCH');
 const d={original_work_id:WORK,run_id:p.run_id,run_head_sha:p.run_sha,
  source:'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK',
  log_sha256:p.log_sha256,job_id:p.job_id,
  manifest_sha256:p.manifest_sha256,provider_receipt_ref:p.provider_receipt_ref};
 writeFileSync(F,JSON.stringify(d));
 console.log('ORIGINAL178_LIVE_PROVIDER_SOURCE_CONFIRMED',JSON.stringify({
  run_id:p.run_id,job_id:p.job_id,log_sha256:p.log_sha256}));
}else if(process.argv[2]==='execute'){
 if(token||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.OPENAI_API_KEY)
  throw Error('ORIGINAL178_UNTRUSTED_SOURCE_MUST_RUN_WITHOUT_SECRETS');
 const d=JSON.parse(readFileSync(F,'utf8'));
 if(d.original_work_id!==WORK||d.run_id!==FIRST_GAP_PROOF.run_id||
  d.run_head_sha!==FIRST_GAP_PROOF.run_head_sha||
  d.provider_receipt_ref!=='github:actions:run:40962921090:job:123760052647'||
  !/^[a-f0-9]{64}$/.test(d.log_sha256||''))
  throw Error('ORIGINAL178_PROVIDER_OBSERVATION_CHANGED');
 const {classifyVerifiedCiFailure}=await import(
  '../src/reality-extensions/reality-ci-failure-evidence.mjs');
 const input={owner_id:scope.owner_id,goal_id:scope.goal_id,original_work_id:WORK,
  repository:'maloney2323/Reality',
  source:d.source,provider_readback_verified:true,original_goal_verified:true,
  repository_base_sha:d.run_head_sha,run_head_sha:d.run_head_sha,
  latest_head_sha:d.run_head_sha,run_id:d.run_id,job_id:d.job_id,
  run_status:'completed',run_conclusion:'failure',
  run_url:'https://github.com/maloney2323/Reality/actions/runs/'+d.run_id,
  failure_log_sha256:d.log_sha256,error_code:'ERR_MODULE_NOT_FOUND',
  missing_capability_id:'reality.ci-failure-evidence-v1',
  current_capability_registry_status:'ABSENT',
  frozen_regression_manifest_ref:FIRST_GAP_PROOF.manifest_ref,
  frozen_regression_sha256:d.manifest_sha256,
  source_receipt_ref:d.provider_receipt_ref+':verified',
  superseding_success:null};
 const result=classifyVerifiedCiFailure(input);
 if(result?.decision!=='MISSING_CAPABILITY'||
    result?.can_generate_candidate!==true||result?.original_work_id!==WORK||
    result?.source_receipt_ref!==input.source_receipt_ref||
    result?.failure_log_sha256!==d.log_sha256||
    result?.installation_authorized!==false||
    result?.external_execution_authorized!==false||
    result?.original_job_completed!==false||
    result?.production_changed!==false)
  throw Error('ORIGINAL178_REAL_PROVIDER_CLASSIFICATION_FAILED');
 const source_hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
 console.log('REALITY_ORIGINAL178_EXECUTION_RECEIPT='+JSON.stringify({
  kind:'REAL_PROVIDER_CLASSIFICATION',original_work_id:WORK,
  provider_run_id:d.run_id,provider_job_id:d.job_id,
  observed_log_sha256:d.log_sha256,source_hash,
  decision:result.decision,installation_authorized:false,
  original_job_completed:false,production_changed:false}));
}else throw Error('ORIGINAL178_MODE_INVALID');
