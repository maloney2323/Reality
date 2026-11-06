// Independent settlement worker: only runs after prior original-job execution succeeded.
// Provider's job status and artifact are independently re-read by the trusted broker.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const env=process.env,repo='maloney2323/Reality';
const fail=x=>{throw Error('REALITY_ORIGINAL_SETTLEMENT_'+x)};
if(env.GITHUB_ACTIONS!=='true'||!['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||
 env.GITHUB_REPOSITORY!==repo||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 fail('EXACT_ISOLATED_WORKFLOW_REQUIRED');
const jwtUrl=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
jwtUrl.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const jwtResponse=await fetch(jwtUrl,{cache:'no-store',headers:{
 authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!jwtResponse.ok)fail('SIGNER_UNAVAILABLE');
const jwt=(await jwtResponse.json()).value;
if(typeof jwt!=='string'||jwt.length<300)fail('GITHUB_SIGNED_PROOF_MISSING');
const token=env.GH_TOKEN;
if(typeof token!=='string'||token.length<20)fail('PROVIDER_READ_AUTHORITY_MISSING');
const proof=JSON.parse(readFileSync('artifact/resume/reality-original-resumption.json','utf8'));
if(proof?.schema!=='reality-original-job-execution-proof-v1'||
 proof?.github_run_id!==env.GITHUB_RUN_ID||
 proof?.production_changed!==false||
 proof?.frozen_suite_passed!==true)fail('EXACT_PRIOR_JOB_ARTIFACT_REQUIRED');
const resp=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
 'x-reality-github-provider-token':token},
 body:JSON.stringify({action:'original_settle',
  scope:{repository_sha:env.GITHUB_SHA},proof})});
const result=await resp.json().catch(()=>null);
if(!resp.ok||result?.ok!==true||
 result?.status!=='SETTLED_ISOLATED'||
 result?.original_work_id!==proof.original_work_id||
 result?.installed_commit_sha!==proof.installed_commit_sha||
 result?.provider_outcome_digest!==proof.provider_outcome_digest||
 result?.independent_outcome_verified!==true||
 result?.original_job_completed!==true||
 result?.full_probation_complete!==false||
 result?.production_changed!==false)
 fail('DURABLE_INDEPENDENT_SETTLEMENT_'+String(result?.error||'REFUSED').slice(0,70));
if(proof.extension_protocol==='TRUSTED_ORIGINAL_SETTLEMENT_RECONCILIATION_V1'&&(
 result.universe_settlement_verified!==true||
 result.universe_receipt?.status!=='VERIFIED_UNIVERSE_SETTLED'||
 result.universe_receipt?.original_work_id!==proof.reconciliation_target_original_work_id||
 result.universe_receipt?.independent_database_readback!==true||
 result.universe_receipt?.production_changed!==false))
 fail('RECONCILIATION_DURABLE_UNIVERSE_READBACK_REQUIRED');
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-original-final-settlement.json',JSON.stringify(result,null,2)+'\n');
console.log('REALITY_ORIGINAL_JOB_DURABLY_SETTLED',JSON.stringify({
 original_work_id:result.original_work_id,installed_commit_sha:result.installed_commit_sha,
 status:result.status,independent_outcome_verified:true,
 full_probation_complete:false,production_changed:false
}));
