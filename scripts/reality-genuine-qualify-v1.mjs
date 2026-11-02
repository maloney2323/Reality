// Only after an independent GitHub verification job has succeeded, Reality
// qualifies the exact candidate for owner review. This NEVER installs code.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const env=process.env;
const die=x=>{throw Error('GENUINE_CANDIDATE_QUALIFY_'+x)};
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101')
 die('EXACT_SIGNED_ISOLATED_RUN_REQUIRED');
const admission=JSON.parse(readFileSync(
 'admission/genuine-capability-admitted-queue.json','utf8'));
const proposal=JSON.parse(readFileSync(
 'candidate/genuine-capability-model-proposal.json','utf8'));
const proof=JSON.parse(readFileSync(
 'proof/genuine-capability-sandbox-verification.json','utf8'));
if(admission.repository_sha!==env.GITHUB_SHA||
 !Array.isArray(admission.previously_claimed)||
 admission.installation_authorized!==false||
 proof.workflow_run_id!==env.GITHUB_RUN_ID||
 proof.runner_git_sha!==env.GITHUB_SHA||
 proof.passed!==true||
 proof.original_work_id!==proposal.ticket?.original_work_id||
 proof.artifact_sha256!==proposal.candidate?.artifact_sha256||
 proposal.installation_authorized!==false||
 proof.installation_authorized!==false||
 proof.original_job_completed!==false)
 die('INDEPENDENT_GREEN_SOURCE_INVALID');
const matches=[...(admission.previously_claimed||[]),...(admission.queued||[])]
 .filter(x=>x.original_work_id===proof.original_work_id);
if(matches.length!==1)die('EXACT_ORIGINAL_QUEUE_REQUIRED');
const row=matches[0];
const oidcUrl=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
oidcUrl.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const id=await fetch(oidcUrl,{redirect:'error',cache:'no-store',headers:{
 authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!id.ok)die('GITHUB_SIGNER_UNAVAILABLE');
const jwt=(await id.json()).value;
if(typeof jwt!=='string'||jwt.length<300)die('SIGNED_RUN_REQUIRED');
const endpoint=
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit';
async function rpc(body){
 const r=await fetch(endpoint,{method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':env.GH_TOKEN||''},
 body:JSON.stringify(body)});
 const result=await r.json().catch(()=>null);
 if(!r.ok||result?.ok!==true)
  die('SIGNED_BROKER_'+String(result?.error||'UNAVAILABLE').slice(0,90));
 return result;
}
const prepared=await rpc({action:'prepare',scope:{
 trigger_id:row.trigger_id,gap_event_id:row.source_event_id,
 repository_sha:env.GITHUB_SHA}});
if(prepared.status!=='VERIFIED_FROZEN_READY_FOR_MODEL'||
 prepared.original_work_id!==proof.original_work_id||
 prepared.owner_id!==proposal.ticket.owner_id||
 prepared.frozen_sha256!==proposal.ticket.frozen_regression_sha256||
 prepared.original_job_completed!==false||
 prepared.installation_authorized!==false)
 die('CURRENT_OWNER_SCOPE_NOT_RECONFIRMED');
const qualified=await rpc({action:'qualify',proposal,
 proof:{...proof,trigger_id:row.trigger_id,claim_id:prepared.claim_id}});
if(qualified.status!=='AWAITING_OWNER_APPROVAL'||
 qualified.original_work_id!==proof.original_work_id||
 qualified.artifact_sha256!==proof.artifact_sha256||
 !/^[a-f0-9]{64}$/.test(qualified.pre_state_hash||'')||
 !/^[a-f0-9]{64}$/.test(qualified.post_state_hash||'')||
 !qualified.valid_time||!qualified.transaction_time||
 qualified.installation_authorized!==false||
 qualified.original_job_completed!==false)
 die('DURABLE_DUAL_CLOCK_QUALIFICATION_MISSING');
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/genuine-capability-owner-review.json',
 JSON.stringify(qualified,null,2)+'\n');
console.log('REALITY_VERIFIED_CAPABILITY_AWAITING_OWNER_APPROVAL',JSON.stringify({
 original_work_id:qualified.original_work_id,
 artifact_sha256:qualified.artifact_sha256,
 frozen_pass:qualified.frozen_pass,
 candidate_pass:qualified.candidate_pass,
 valid_time:qualified.valid_time,
 transaction_time:qualified.transaction_time,
 installation_authorized:false,original_job_completed:false,
}));
