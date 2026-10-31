// Provider-attested recovery of the already-generated, sandbox-passing #178
// candidate after a NON-FAST-FORWARD publication failure. No new model authority.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const fail=x=>{throw Error('REALITY_MODEL_PUBLICATION_RECOVERY_'+x)};
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-closed-loop-worker-20261031';
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const RUN=41217180993, JOB=124584489310;
const SOURCE='ae169df1a33705059a2f6d0f4fb6c6346566b448';
const RESPONSE='resp_0fa66a8bbbf80757006ae61002ee8887d1964292bf8f15c559';
const ARTIFACT='105c2c59bde7ae12e4e6e74d6ec8ccf6c159a32fcaaa34db9ff5e4ae358e409a';
const requestPath='reality-model-response-recoveries/issue-178.json';
const ticket={
 schema:'reality-source-verified-repair-job-v1',
 queue_id:'abf4d0ee-f0a9-4d0f-8285-02a516feddc1',
 claim_id:'cc025258-2c94-4d7b-9392-2b5f061047c1',
 original_queue_id:'8811cc00-77cc-4a18-a61c-391eb7a4bff1',
 original_work_id:WORK,issue_number:178,failed_run_id:40962921090,
 baseline_source_sha:'6e6014f38f9fea382ea93b38418ec77e9158c1ef',
 frozen_test_path:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
 frozen_test_sha256:'b42935d7300333ac7f1ecfce0aded8d2c7698bb88a55cbd413a96ebe0d73afdd',
 expected_source_path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
 original_model_response_id:RESPONSE,original_model_run_id:RUN,
 expected_candidate_sha256:ARTIFACT,
 authorizing_scope:'ORIGINAL_178_ALREADY_CLAIMED_OWNER_INVESTIGATION_PUBLISH_SAME_ARTIFACT_ONLY',
 installation_authorized:false,original_job_completed:false,production_changed:false,
};
async function github(path,token,logs=false){
 const response=await fetch('https://api.github.com/repos/'+REPO+'/'+path,{
  headers:{authorization:'Bearer '+token,
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-exact-previous-model-candidate-proof-v1'},
  redirect:'follow',cache:'no-store'});
 if(!response.ok)fail('GITHUB_PROVENANCE_READBACK_'+response.status);
 return logs?response.text():response.json();
}
function logReceipt(log,label){
 const occurrences=[...log.matchAll(new RegExp(label+' (\\{[^\\r\\n]*\\})','g'))];
 if(occurrences.length!==1)fail('SINGLE_PROVIDER_'+label+'_REQUIRED');
 try{return JSON.parse(occurrences[0][1])}catch{fail('PROVIDER_LOG_RECEIPT_NOT_JSON')}
}
export async function verifyOriginalCandidatePublicationSource({
 env=process.env,request,checkoutSha,changed,githubRead=github,
}={}){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
  env.GITHUB_REPOSITORY!==REPO||
  env.GITHUB_REF!=='refs/heads/'+BRANCH||
  env.GITHUB_SHA!==checkoutSha||
  !/^[a-f0-9]{40}$/.test(checkoutSha)||
  !Array.isArray(changed)||changed.length!==1||changed[0]!==requestPath||
  !env.GITHUB_TOKEN||env.GITHUB_TOKEN.length<20)
  fail('SIGNED_GITHUB_WORKER_OR_PROVENANCE_ACCESS_REQUIRED');
 if(!request||Object.keys(request).sort().join(',')!==
 'artifact_sha256,issue_number,model_response_id,original_work_id,source_job_id,source_run_id,source_sha,version'||
  request.version!=='reality-previous-verified-response-publish-v1'||
  request.issue_number!==178||request.original_work_id!==WORK||
  request.source_run_id!==RUN||request.source_job_id!==JOB||
  request.source_sha!==SOURCE||request.model_response_id!==RESPONSE||
  request.artifact_sha256!==ARTIFACT)
  fail('EXACT_FAILED_PUBLICATION_EVIDENCE_ONLY');
 const run=await githubRead('actions/runs/'+RUN,env.GITHUB_TOKEN);
 const job=await githubRead('actions/jobs/'+JOB,env.GITHUB_TOKEN);
 if(run.id!==RUN||run.head_sha!==SOURCE||run.event!=='push'||
  run.path!=='.github/workflows/reality-source-bound-model-generation-v1.yml'||
  run.status!=='completed'||run.conclusion!=='failure'||
  job.id!==JOB||job.run_id!==RUN||job.head_sha!==SOURCE||
  job.conclusion!=='failure')
  fail('ORIGINAL_GITHUB_ACTIONS_FAILURE_NOT_VERIFIED');
 const step=name=>job.steps?.find(s=>s.name===name);
 if(step('Atomically claim unchanged owner-approved original work')?.conclusion!=='success'||
  step('Actual model generation, correction, and independent secret-free Docker verification')?.conclusion!=='success'||
  step('Commit inert candidate and unchanged original test for OWNER review only')?.conclusion!=='failure')
  fail('ORIGINAL_MODEL_PASSED_BUT_PUBLICATION_FAILED_RECEIPT_REQUIRED');
 const log=await githubRead('actions/jobs/'+JOB+'/logs',env.GITHUB_TOKEN,true);
 const claim=logReceipt(log,'REALITY_TRUSTED_MODEL_TICKET');
 const generated=logReceipt(log,'REALITY_GENERATION_RECEIPT');
 const verified=logReceipt(log,'REALITY_VERIFICATION_RECEIPT');
 const ready=logReceipt(log,'REALITY_INERT_MODEL_CANDIDATE_READY');
 if(claim.original_work_id!==WORK||claim.queue_id!==ticket.queue_id||
  claim.original_provider_run_id!==ticket.failed_run_id||
  claim.baseline_source_sha!==ticket.baseline_source_sha||
  generated.model_response_id!==RESPONSE||generated.attempt!==1||
  generated.artifact_sha256!==ARTIFACT||
  generated.original_run_id!==ticket.failed_run_id||
  verified.attempt!==1||verified.passed!==true||
  verified.artifact_sha256!==ARTIFACT||
  ready.original_work_id!==WORK||ready.artifact_sha256!==ARTIFACT||
  ready.owner_approval_required!==true||
  claim.installation_authorized!==false||ready.installation_authorized!==false)
  fail('ORIGINAL_PROVIDER_MODEL_SANDBOX_EVIDENCE_MISMATCH');
 return Object.freeze({...ticket});
}
async function main(){
 const checkoutSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],
  {encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 const request=JSON.parse(readFileSync(requestPath,'utf8'));
 const t=await verifyOriginalCandidatePublicationSource({
  request,checkoutSha,changed});
 mkdirSync('reality-worker-result',{recursive:true});
 writeFileSync('reality-worker-result/ticket.json',JSON.stringify(t,null,2)+'\n');
 console.log('REALITY_PRIOR_MODEL_AND_SANDBOX_VERIFIED',JSON.stringify({
  original_work_id:t.original_work_id,model_response_id:t.original_model_response_id,
  artifact_sha256:t.expected_candidate_sha256,
  original_run_id:t.original_model_run_id,
  installation_authorized:false,original_job_completed:false}));
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 try{await main()}catch(e){const code=String(e?.message||'');
  console.error(/^REALITY_MODEL_PUBLICATION_RECOVERY_[A-Z0-9_]+$/.test(code)?
   code:'REALITY_MODEL_PUBLICATION_RECOVERY_PROVIDER_READBACK_FAILED');
  process.exitCode=1;}
}
