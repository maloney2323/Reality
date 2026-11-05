// Existing Reality signed capability workflow: record failed ORIGINAL worker
// into one durable owner/goal-bound evidence ledger. Never a second AI agent.
import {mkdirSync,writeFileSync} from 'node:fs';
const env=process.env;
const REF='refs/heads/feature/reality-general-capability-engine-20261101';
const fail=x=>{throw Error('GENUINE_AUTONOMIC_FEEDBACK_'+x)};
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
   env.GITHUB_REPOSITORY!=='maloney2323/Reality'||env.GITHUB_REF!==REF||
   !/^[a-f0-9]{40}$/.test(String(env.GITHUB_SHA||''))||
   typeof env.GH_TOKEN!=='string'||env.GH_TOKEN.length<20||
   !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||!env.ACTIONS_ID_TOKEN_REQUEST_URL)
  fail('EXACT_SIGNED_EXISTING_WORKFLOW_REQUIRED');
const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const id=await fetch(u,{method:'GET',cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!id.ok)fail('GITHUB_OIDC_UNAVAILABLE');
const jwt=(await id.json())?.value;
if(typeof jwt!=='string'||jwt.length<300)fail('TRUSTED_SIGNED_IDENTITY_MISSING');
const r=await fetch('https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':env.GH_TOKEN},
 body:JSON.stringify({action:'observe_worker_failure',scope:{repository_sha:env.GITHUB_SHA}})});
const data=await r.json().catch(()=>null);
if(!r.ok||data?.ok!==true||
   !['NO_VERIFIED_ESCALATED_ORIGINAL_WORK','SIGNED_WORKER_FAILURE_RECORDED'].includes(data.status)||
   data.model_invoked!==false||data.installation_authorized!==false||
   data.original_job_completed!==false||data.production_changed!==false)
 fail('SIGNED_EXISTING_ORIGINAL_FAILURE_READBACK_UNAVAILABLE');
if(data.status==='SIGNED_WORKER_FAILURE_RECORDED'&&(
   !/^[a-f0-9-]{36}$/.test(String(data.observation_id||''))||
   !/^work:[a-f0-9]{32}$/.test(String(data.original_work_id||''))||
   !/^[a-f0-9-]{36}$/.test(String(data.trigger_id||''))||
   !/^[a-f0-9]{64}$/.test(String(data.provider_evidence_sha256||''))||
   !Number.isSafeInteger(data.failed_run_id)||data.failed_run_id<1||
   !Number.isSafeInteger(data.failed_job_id)||data.failed_job_id<1||
   !['HISTORICAL_RECONCILIATION_ALREADY_VERIFIED',
     'SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS'].includes(data.finding)||
   data.frozen_missing_capability_verified!==false||
   data.new_customer_job_created!==false||
   data.retry_external_effects_authorized!==false))
 fail('IMMUTABLE_FAILURE_RECEIPT_INVALID');
const output={
 schema:'reality-genuine-worker-failure-evidence-v1',
 status:data.status,
 observation_id:data.observation_id||null,
 original_work_id:data.original_work_id||null,
 trigger_id:data.trigger_id||null,
 failed_run_id:data.failed_run_id||null,
 failed_job_id:data.failed_job_id||null,
 provider_evidence_sha256:data.provider_evidence_sha256||null,
 finding:data.finding||null,
 investigation_lifecycle:data.investigation_lifecycle||null,
 independent_github_readback:data.independent_github_readback===true,
 already_recorded:data.already_recorded===true,
 model_findings_are_hypotheses:true,
 model_invoked:false,frozen_missing_capability_verified:false,
 new_customer_job_created:false,retry_external_effects_authorized:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false
};
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/genuine-worker-failure-evidence.json',
 JSON.stringify(output,null,2)+'\n');
console.log('REALITY_GOVERNED_WORKER_FAILURE_FEEDBACK',JSON.stringify(output));
