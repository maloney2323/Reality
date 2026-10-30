// No secrets or owner authority in this runner. Independently re-read
// the originally failed GitHub run, then execute the newly installed code.
import {createHash} from 'node:crypto';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const PIN='6e6014f38f9fea382ea93b38418ec77e9158c1ef';
const RUN=40962921090;
async function github(path){
 const r=await fetch(ROOT+path,{headers:{
  accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28',
  'user-agent':'Reality-Original178-Source-Replay'}});
 if(!r.ok)throw Error('ORIGINAL178_PUBLIC_PROVIDER_UNAVAILABLE_'+r.status);
 return r.json();
}
const run=await github('/actions/runs/'+RUN);
const page=await github('/actions/runs/'+RUN+'/jobs?per_page=100');
const matching=(page.jobs||[]).filter(x=>x.id===123760052647&&
 x.name==='frozen-customer-acceptance'&&x.conclusion==='failure'&&
 x.head_sha===PIN);
if(run.id!==RUN||run.head_sha!==PIN||run.conclusion!=='failure'||
 run.status!=='completed'||run.repository?.full_name!=='maloney2323/Reality'||
 matching.length!==1)throw Error('ORIGINAL178_PINNED_PROVIDER_NOT_REOBSERVED');
if(process.env.GH_PROVIDER_READ_TOKEN||process.env.OPENAI_API_KEY||
 process.env.SUPABASE_SERVICE_ROLE_KEY)
 throw Error('ORIGINAL178_UNTRUSTED_CODE_MUST_HAVE_NO_CREDENTIALS');
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
 run_id:RUN,job_id:matching[0].id,
 run_status:run.status,run_conclusion:run.conclusion,
 run_url:run.html_url,failure_log_sha256:'b'.repeat(64),
 error_code:'ERR_MODULE_NOT_FOUND',
 missing_capability_id:'reality.ci-failure-evidence-v1',
 current_capability_registry_status:'ABSENT',
 frozen_regression_manifest_ref:'first-ci-evidence-gap-v1',
 frozen_regression_sha256:'7d0c6aee561c6e6ca4360f80789574b9c11f26729f575858861e18ce647cd4be',
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
 work:WORK,run:RUN,sha:PIN,job:matching[0].id,
 decision:result.decision})).digest('hex');
console.log('REALITY_ORIGINAL178_REPLAY_RESULT='+JSON.stringify({
 original_work_id:WORK,provider_run_id:RUN,
 provider_job_id:matching[0].id,pinned_sha:PIN,
 decision:result.decision,evidence_hash:evidence,
 authenticated_owner_execution:false,
 original_job_completed:false,production_changed:false}));
