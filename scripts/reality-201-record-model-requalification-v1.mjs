// Only a signed GitHub Actions job can submit independently tested model bytes.
// The broker re-reads GitHub jobs and artifact digests; this file never owns
// the Supabase service key and never grants installation authority.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const env=process.env;
const fail=x=>{throw Error('REALITY_201_DURABLE_REQUALIFICATION_'+x)};
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
 !/^[1-9][0-9]{6,17}$/.test(env.GITHUB_RUN_ID||''))
 fail('PINNED_GITHUB_RUN_REQUIRED');
const proposal=JSON.parse(readFileSync('candidate/genuine-capability-model-proposal.json','utf8'));
const proof=JSON.parse(readFileSync('proof/genuine-capability-sandbox-verification.json','utf8'));
if(proposal?.source!=='REAL_OPENAI_MODEL_GENERATION'||
 proposal?.candidate?.original_work_id!=='work:bf17f1716f7c9550680d761e64f8b591'||
 proposal?.installation_authorized!==false||
 proof?.passed!==true||proof?.artifact_sha256!==proposal?.candidate?.artifact_sha256||
 proof?.workflow_run_id!==env.GITHUB_RUN_ID||
 proof?.runner_git_sha!==env.GITHUB_SHA||
 proof?.installation_authorized!==false)
 fail('PREVIOUS_INDEPENDENT_VERIFICATION_REQUIRED');
const idUrl=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
idUrl.searchParams.set('audience','reality-genuine-requalification-v1');
const identity=await fetch(idUrl,{redirect:'error',cache:'no-store',headers:{
 authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!identity.ok)fail('GITHUB_ISSUED_IDENTITY_REQUIRED');
const jwt=(await identity.json()).value;
if(typeof jwt!=='string'||jwt.length<300)fail('SIGNED_IDENTITY_UNAVAILABLE');
const endpoint='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-requalification-v1';
const response=await fetch(endpoint,{method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':env.GH_TOKEN},
 body:JSON.stringify({action:'requalify',scope:{
  repository_sha:env.GITHUB_SHA,
  trigger_id:'c074d3d1-adab-4291-b3ce-88d02d8bfe5a'
 },proposal,proof})});
const result=await response.json().catch(()=>null);
if(!response.ok||result?.ok!==true)
 fail('SIGNED_SERVICE_REJECTED_'+String(result?.error||'UNVERIFIED').slice(0,80));
if(result.status!=='AWAITING_OWNER_APPROVAL'||
 result.original_work_id!==proposal.candidate.original_work_id||
 result.artifact_sha256!==proposal.candidate.artifact_sha256||
 result.real_provider_holdout_verified!==true||
 result.installation_authorized!==false||
 result.original_job_completed!==false||
 result.production_changed!==false)
 fail('INDEPENDENT_DURABLE_REQUALIFICATION_READBACK_MISMATCH');
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-201-durable-requalification.json',
 JSON.stringify(result,null,2)+'\n');
console.log('REALITY_201_INDEPENDENTLY_REQUALIFIED_FOR_OWNER_APPROVAL',
 JSON.stringify({original_work_id:result.original_work_id,
  artifact_sha256:result.artifact_sha256,model_response_id:result.model_response_id,
  replaced_prior_artifact:result.prior_artifact_sha256,
  independent_provider_run_id:result.provider_run_id,
  qualification_status:result.status,
  installation_authorized:false,original_job_completed:false,
  production_changed:false}));
