// Recover settlement for an already-claimed, provider-successful original job.
// Never reruns original execution, installation or owner authorization.
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const env=process.env;
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const fail=c=>{throw Error('REALITY_SIGNED_SETTLEMENT_RECOVERY_'+c)};
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=='refs/heads/'+BRANCH||
 !SHA40.test(env.GITHUB_SHA||'')||
 !env.ACTIONS_ID_TOKEN_REQUEST_URL||!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||
 typeof env.GH_TOKEN!=='string'||env.GH_TOKEN.length<20)
 fail('PINNED_SIGNED_ISOLATED_WORKFLOW_REQUIRED');
const aud='reality-genuine-capability-auto-admit-v1';
async function oidc(){
 const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
 url.searchParams.set('audience',aud);
 const r=await fetch(url,{headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},
  cache:'no-store',redirect:'error'});
 if(!r.ok)fail('GITHUB_OIDC_UNAVAILABLE');
 const jwt=(await r.json()).value;
 if(typeof jwt!=='string'||jwt.length<300)fail('INVALID_GITHUB_OIDC');
 return jwt;
}
const jwt=await oidc();
async function broker(action,proof){
 const r=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
   'x-reality-github-provider-token':env.GH_TOKEN},
  body:JSON.stringify({action,scope:{repository_sha:env.GITHUB_SHA},
   ...(proof?{proof}:{})})});
 const result=await r.json().catch(()=>null);
 if(!r.ok||result?.ok!==true)fail('TRUSTED_BROKER_'+String(result?.error||'REJECTED').slice(0,100));
 return result;
}
const prepared=await broker('original_settlement_recover_prepare');
if(prepared.status==='NO_CLAIMED_ORIGINAL_SETTLEMENT_RECOVERY'){
 console.log('REALITY_SETTLEMENT_RECOVERY_NONE_PENDING');
 if(env.GITHUB_OUTPUT)appendFileSync(env.GITHUB_OUTPUT,'performed=false\n');
 process.exit(0);
}
const run=Number(prepared.original_claim_run_id);
if(prepared.status!=='SIGNED_ORIGINAL_SETTLEMENT_RECOVERY_REQUIRED'||
 !WORK.test(prepared.original_work_id)||!WORK.test(prepared.target_original_work_id)||
 !SHA40.test(prepared.original_claim_runner_sha)||
 !SHA40.test(prepared.installed_commit_sha)||!SHA64.test(prepared.artifact_sha256)||
 !/^sha256:[a-f0-9]{64}$/.test(prepared.provider_artifact_digest||'')||
 !Number.isSafeInteger(run)||run<1||
 prepared.installation_replay_authorized!==false||
 prepared.original_job_completed!==false||prepared.production_changed!==false)
 fail('CURRENT_CLAIMED_SCOPE_INVALID');
// GitHub CLI retrieves the previously uploaded immutable run artifact.
// The prior run is never dispatched, replayed or re-executed.
mkdirSync('artifact/claimed',{recursive:true});
const dl=spawnSync('gh',['run','download',String(run),'--repo',REPO,
 '--name','reality-original-resumption-'+run,'--dir','artifact/claimed'],
 {encoding:'utf8',timeout:90000,maxBuffer:200000,
  env:{...env,GH_TOKEN:env.GH_TOKEN}});
if(dl.status!==0)fail('HISTORICAL_PROVIDER_ARTIFACT_DOWNLOAD_FAILED');
let proof;
try{proof=JSON.parse(readFileSync('artifact/claimed/reality-original-resumption.json','utf8'))}
catch{fail('HISTORICAL_PROVIDER_ARTIFACT_INVALID')}
if(proof?.schema!=='reality-original-job-execution-proof-v1'||
 proof.original_work_id!==prepared.original_work_id||
 proof.trigger_id!==prepared.trigger_id||
 proof.approval_id!==prepared.approval_id||
 proof.github_run_id!==String(run)||
 proof.installed_commit_sha!==prepared.installed_commit_sha||
 proof.artifact_sha256!==prepared.artifact_sha256||
 proof.reconciliation_target_original_work_id!==prepared.target_original_work_id||
 proof.extension_protocol!=='TRUSTED_ORIGINAL_SETTLEMENT_RECONCILIATION_V1'||
 proof.classification!=='RECONCILIATION_REQUIRED'||
 proof.original_provider_failure_verified!==true||
 proof.frozen_suite_passed!==true||proof.isolated_execution!==true||
 proof.production_changed!==false||proof.original_job_completed!==false||
 !SHA64.test(String(proof.provider_outcome_digest||'')))
 fail('HISTORICAL_EXECUTION_PROOF_MISMATCH');
// The broker separately verifies the GitHub provider job/step and immutable
// artifact identity, plus the original owner/installed/claim database state.
const result=await broker('original_settlement_recover_finish',{
 ...proof,provider_artifact_digest:prepared.provider_artifact_digest});
if(result.status!=='SETTLED_ISOLATED'||
 result.original_work_id!==prepared.original_work_id||
 result.installed_commit_sha!==prepared.installed_commit_sha||
 result.universe_settlement_verified!==true||
 result.universe_receipt?.status!=='VERIFIED_UNIVERSE_SETTLED'||
 result.universe_receipt?.original_work_id!==prepared.target_original_work_id||
 result.universe_receipt?.independent_database_readback!==true||
 result.original_job_completed!==true||
 result.independent_outcome_verified!==true||
 result.production_changed!==false||result.full_probation_complete!==false)
 fail('INDEPENDENT_ATOMIC_UNIVERSE_SETTLEMENT_NOT_VERIFIED');
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-original-final-settlement.json',JSON.stringify(result,null,2)+'\n');
if(env.GITHUB_OUTPUT)appendFileSync(env.GITHUB_OUTPUT,'performed=true\n');
console.log('REALITY_ORIGINAL_CLAIMED_SETTLEMENT_DURABLY_RECONCILED',
 JSON.stringify({original_work_id:result.original_work_id,
 target_original_work_id:result.universe_receipt.original_work_id,
 verified_universe_event_id:result.universe_receipt.verified_event_id,
 historical_provider_run_id:run,production_changed:false}));
