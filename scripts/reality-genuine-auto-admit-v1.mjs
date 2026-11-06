// Autonomous bridge: GitHub-signed discovery receipt -> service-verified
// owner Continuity -> existing atomic queue. No GitHub token or DB secret.
import {readFileSync,writeFileSync} from 'node:fs';
const err=x=>{throw Error('GENUINE_AUTO_ADMISSION_'+x)};
const report=JSON.parse(readFileSync('artifact/genuine-capability-auto-trigger.json','utf8'));
const REF='refs/heads/feature/reality-general-capability-engine-20261101';
if(process.env.GITHUB_ACTIONS!=='true'||
   process.env.GITHUB_EVENT_NAME!=='push'||
   process.env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
   process.env.GITHUB_REF!==REF||
   process.env.GITHUB_SHA!==report.repository_sha)
 err('PINNED_WORKFLOW_OR_SOURCE_CHANGED');
if(!Array.isArray(report.findings)||report.findings.length>30||
  report.schema!=='reality-genuine-auto-trigger-observation-v1')
 err('SOURCE_BOUND_DETECTION_REPORT_REQUIRED');
if(!report.findings.length){
 console.log('REALITY_AUTO_ADMISSION_NO_CANDIDATES');process.exit(0);
}
const issuer=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const signed=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!issuer||!signed)err('GITHUB_OIDC_SIGNED_WORKFLOW_REQUIRED');
const url=new URL(issuer);
url.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const issue=await fetch(url,{method:'GET',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+signed}});
if(!issue.ok)err('SIGNED_WORKFLOW_IDENTITY_PROVIDER_UNAVAILABLE');
const identity=await issue.json();
if(typeof identity?.value!=='string'||identity.value.length<300)
 err('SIGNED_WORKFLOW_TOKEN_UNAVAILABLE');
const res=await fetch(
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+identity.value,'content-type':'application/json'},
 body:JSON.stringify({action:'admit',report}),
});
const outcome=await res.json().catch(()=>null);
if(!res.ok||outcome?.ok!==true||
 outcome.status!=='GENUINE_ORIGINAL_GAPS_RECONCILED'||
 outcome.observed_candidate_count!==report.findings.length||
 !Number.isInteger(outcome.verified_already_settled_count)||
 outcome.verified_already_settled_count<0||
 !Array.isArray(outcome.queued)||
 !Number.isInteger(outcome.verified_already_claimed_count)||
 outcome.verified_already_claimed_count<0||
 !Number.isInteger(outcome.verified_awaiting_owner_binding_count)||
 outcome.verified_awaiting_owner_binding_count<0||
 !Array.isArray(outcome.awaiting_owner_binding)||
 outcome.verified_awaiting_owner_binding_count!==outcome.awaiting_owner_binding.length||
 outcome.verified_queue_count!==outcome.queued.length||
 outcome.verified_queue_count+outcome.verified_already_claimed_count+
 outcome.verified_already_settled_count+
 outcome.verified_awaiting_owner_binding_count!==report.findings.length||
 outcome.installation_authorized!==false||
 outcome.original_job_completed!==false||
 outcome.production_changed!==false)
 err(/^AUTO_ADMIT_[A-Z0-9_]+$/.test(String(outcome?.error||''))?
  outcome.error:'SIGNED_PROVIDER_OR_DURABLE_QUEUE_UNVERIFIED');
writeFileSync('artifact/genuine-capability-admitted-queue.json',
 JSON.stringify({schema:'reality-genuine-admitted-queue-v1',
 repository_sha:report.repository_sha,queued:outcome.queued,
 previously_claimed:outcome.previously_claimed||[],
 awaiting_owner_binding:outcome.awaiting_owner_binding||[],
 installation_authorized:false,original_job_completed:false})+'\n');
console.log('REALITY_SIGNED_AUTO_ADMISSION',JSON.stringify({
 status:outcome.status,discovered:report.findings.length,
 queued:outcome.queued,
 previously_claimed:outcome.verified_already_claimed_count,
 skipped_independently_settled:outcome.verified_already_settled_count,
 awaiting_owner_work_binding:outcome.verified_awaiting_owner_binding_count,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,
}));
