// No secrets or owner authority in this runner. Independently re-read
// the originally failed GitHub run, then execute the newly installed code.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {observeFirstGapFromGithub,FIRST_GAP_PROOF}
 from '../src/reality-first-gap-handoff-v0.1.js';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const PIN='6e6014f38f9fea382ea93b38418ec77e9158c1ef';
const RUN=40962921090;
const proofFile='.reality-first178-reobserved-provider.json';
const fixture={owner_id:'CI_REPLAY_NOT_CUSTOMER_OWNER',
 goal_id:'CI_REPLAY_NOT_CUSTOMER_GOAL',
 original_work_id:WORK,original_issue_number:178,
 continuity_root_id:'CI_REPLAY_NOT_CUSTOMER_WORLD',
 worldline_id:'CI_REPLAY_NOT_CUSTOMER_WORLDLINE',
 goal_transition_receipt_ref:'CI_REPLAY_NOT_GOAL_RECEIPT',
 goal_evidence_ref:'CI_REPLAY_NOT_USER_MESSAGE',
 environment:'ISOLATED_PREVIEW',user_confirmed:true,
 owner_session_verified:true,goal_current_verified:true};
if(process.argv[2]==='observe'){
 const token=String(process.env.GH_PROVIDER_READ_TOKEN||'');
 // Public provider resources may be readable anonymously. A denied log
 // read fails closed rather than trusting a fixture or adding a new secret.
 const observed=await observeFirstGapFromGithub({scope:fixture,apiToken:token});
 if(observed?.status!=='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'||
  observed.run_id!==RUN||observed.run_sha!==PIN||
  observed.provider_receipt_ref!=='github:actions:run:40962921090:job:123760052647'||
  !/^[a-f0-9]{64}$/.test(observed.log_sha256||''))
  throw Error('ORIGINAL178_PROVIDER_ATTESTATION_MISMATCH');
 writeFileSync(proofFile,JSON.stringify({
  original_work_id:WORK,run_id:RUN,run_head_sha:PIN,
  provider_job_id:observed.job_id,log_sha256:observed.log_sha256,
  frozen_manifest_sha256:observed.manifest_sha256,
  provider_receipt_ref:observed.provider_receipt_ref,
  source:'INDEPENDENT_GITHUB_PROVIDER_READBACK'}));
 console.log('ORIGINAL178_PROVIDER_OBSERVED',JSON.stringify({run_id:RUN}));
 process.exit(0);
}
if(process.argv[2]!=='execute')throw Error('ORIGINAL178_EXECUTION_MODE_REQUIRED');
if(process.env.GH_PROVIDER_READ_TOKEN||process.env.SUPABASE_SERVICE_ROLE_KEY||
 process.env.OPENAI_API_KEY||process.env.VERCEL_TOKEN)
 throw Error('ORIGINAL178_MODEL_CODE_MUST_RUN_WITHOUT_PRIVILEGED_CREDENTIALS');
const observed=JSON.parse(readFileSync(proofFile,'utf8'));
if(observed.original_work_id!==WORK||observed.run_id!==RUN||
 observed.run_head_sha!==PIN||
 observed.provider_job_id!==123760052647||
 observed.provider_receipt_ref!=='github:actions:run:40962921090:job:123760052647'||
 !/^[a-f0-9]{64}$/.test(observed.log_sha256||'')||
 observed.frozen_manifest_sha256!==FIRST_GAP_PROOF.manifest_sha256)
 throw Error('ORIGINAL178_PROVIDER_INPUT_TAMPERED');
const {classifyVerifiedCiFailure}=await import(
 '../src/reality-extensions/reality-ci-failure-evidence.mjs');
// These owner/goal fields are intentionally test scope. The trusted Vercel
// owner adapter must bind a resulting GH workflow receipt to the actual
// authenticated Continuity scope before considering it customer execution.
const input={owner_id:'ORIGINAL178_REPLAY_FIXTURE_ONLY',
 goal_id:'ORIGINAL178_REPLAY_FIXTURE_ONLY',
 original_work_id:WORK,repository:'maloney2323/Reality',
 source:'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK',
 provider_readback_verified:true,original_goal_verified:true,
 repository_base_sha:PIN,run_head_sha:PIN,latest_head_sha:PIN,
 run_id:RUN,job_id:observed.provider_job_id,
 run_status:'completed',run_conclusion:'failure',
 run_url:'https://github.com/maloney2323/Reality/actions/runs/'+RUN,
 failure_log_sha256:observed.log_sha256,
 error_code:'ERR_MODULE_NOT_FOUND',
 missing_capability_id:'reality.ci-failure-evidence-v1',
 current_capability_registry_status:'ABSENT',
 frozen_regression_manifest_ref:'first-ci-evidence-gap-v1',
 frozen_regression_sha256:observed.frozen_manifest_sha256,
 source_receipt_ref:'github:actions:run:40962921090:job:123760052647:verified',
 superseding_success:null};
const result=classifyVerifiedCiFailure(input);
if(result?.decision!=='MISSING_CAPABILITY'||
 result.can_generate_candidate!==true||
 result.original_work_id!==WORK||
 result.installation_authorized!==false||
 result.external_execution_authorized!==false||
 result.original_job_completed!==false||
 result.production_changed!==false)
 throw Error('ORIGINAL178_INSTALLED_SOURCE_FAILED_REAL_PROVIDER_REPLAY');
const evidence=createHash('sha256').update(JSON.stringify({
 work:WORK,run:RUN,sha:PIN,job:observed.provider_job_id,log:observed.log_sha256,
 decision:result.decision})).digest('hex');
console.log('REALITY_ORIGINAL178_REPLAY_RESULT='+JSON.stringify({
 original_work_id:WORK,provider_run_id:RUN,
 provider_job_id:observed.provider_job_id,pinned_sha:PIN,
 observed_log_sha256:observed.log_sha256,
 decision:result.decision,evidence_hash:evidence,
 authenticated_owner_execution:false,
 original_job_completed:false,production_changed:false}));
