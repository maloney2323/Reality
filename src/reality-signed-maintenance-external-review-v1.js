// An existing signed Reality worker independently re-inspects external GitHub
// run evidence, then records a narrow Quinn-review receipt. This DOES NOT
// convert someone else's regression into maintenance-specific CI RED.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource} from './reality-dynamic-employee-inquiry-worker-v1.js';

const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const TEST='test/reality-maintenance-prreview-executable-regression.test.js';
const WORKFLOW='.github/workflows/reality-maintenance-prreview-frozen-regression.yml';
const guard=x=>{throw Error('SIGNED_EXTERNAL_REGRESSION_REVIEW_'+x)};
const safe=(status,extra={})=>Object.freeze({status,...extra,
 independent_maintenance_ci_red_attested:false,repair_executed:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false});

async function getGithub({fetchImpl,token,path}){
 const response=await fetchImpl(ROOT+path,{
  method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(7000),
  headers:{accept:'application/vnd.github+json',
   ...(token?{authorization:'Bearer '+token}:{}),
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Signed-Independent-Maintenance-Review'}
 });
 if(!response.ok)throw Error('PROVIDER_READBACK_UNAVAILABLE');
 const data=await response.json();
 if(!data||typeof data!=='object')throw Error('PROVIDER_RESPONSE_INVALID');
 return data;
}
export async function independentlyReviewOneStagedMaintenanceRegression({
 db,env=process.env,shiftId,workerRunId,
 call=shiftRpc,fetchImpl=fetch,readSource=readFreshEmployeeInquirySource
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  typeof call!=='function'||typeof fetchImpl!=='function'||
  typeof readSource!=='function')guard('SIGNED_CONTEXT_REQUIRED');
 const scope=await call(db,'reality_read_next_signed_maintenance_external_review_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(scope?.status==='NO_SIGNED_EXTERNAL_REGRESSION_TO_REVIEW'&&
   scope.read_only===true&&scope.independent_maintenance_ci_red_attested===false)
  return safe(scope.status,{review_attempted:false});
 if(scope?.status!=='SIGNED_EXTERNAL_REGRESSION_NEEDS_INDEPENDENT_GITHUB_RECHECK'||
  scope.shift_id!==shiftId||!UUID.test(scope.owner_id||'')||
  !UUID.test(scope.maintenance_id||'')||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(scope.source_ref||'')||
  !HASH.test(scope.current_provider_sha256||'')||
  !HASH.test(scope.staging_receipt_sha256||'')||
  !HASH.test(scope.source_epoch_receipt_sha256||'')||
  !SHA.test(scope.github_head_sha||'')||
  !SHA.test(scope.frozen_test_blob_sha||'')||
  !SHA.test(scope.frozen_workflow_blob_sha||'')||
  !SHA.test(scope.historical_source_commit_sha||'')||
  !SHA.test(scope.corrected_source_commit_sha||'')||
  !Number.isSafeInteger(scope.external_test_pr_number)||
  !Number.isSafeInteger(scope.github_run_id)||
  !Number.isSafeInteger(scope.github_red_job_id)||
  !Number.isSafeInteger(scope.github_green_job_id)||
  scope.assignee===scope.reviewer||
  typeof scope.reviewer!=='string'||!scope.reviewer||
  scope.read_only!==true||
  scope.independent_maintenance_ci_red_attested!==false||
  scope.original_job_completed!==false||
  scope.installation_authorized!==false||scope.production_changed!==false)
  guard('SIGNED_SCOPE_OR_PROOF_UNTRUSTED');

 const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
 let first,second,pr,run,jobs,testBlob,workflowBlob;
 try{
  [first,second]=await Promise.all([
   readSource(scope.source_ref,{fetchImpl,token}),
   readSource(scope.source_ref,{fetchImpl,token})
  ]);
  [pr,run,jobs,testBlob,workflowBlob]=await Promise.all([
   getGithub({fetchImpl,token,path:'/pulls/'+scope.external_test_pr_number}),
   getGithub({fetchImpl,token,path:'/actions/runs/'+scope.github_run_id}),
   getGithub({fetchImpl,token,path:'/actions/runs/'+scope.github_run_id+'/jobs?per_page=100'}),
   getGithub({fetchImpl,token,path:'/contents/'+TEST+'?ref='+scope.github_head_sha}),
   getGithub({fetchImpl,token,path:'/contents/'+WORKFLOW+'?ref='+scope.github_head_sha})
  ]);
 }catch{
  return safe('SIGNED_EXTERNAL_REVIEW_PROVIDER_UNAVAILABLE',{
   maintenance_id:scope.maintenance_id,review_attempted:true});
 }
 if(first?.source_ref!==scope.source_ref||
  second?.source_ref!==scope.source_ref||
  first.provider_proof_sha256!==scope.current_provider_sha256||
  second.provider_proof_sha256!==scope.current_provider_sha256||
  !HASH.test(first.provider_proof_sha256||'')||
  !Number.isFinite(Date.parse(first.checked_at||''))||
  !Number.isFinite(Date.parse(second.checked_at||'')))
  return safe('SIGNED_EXTERNAL_REVIEW_SOURCE_DRIFT_REQUALIFICATION_REQUIRED',{
   maintenance_id:scope.maintenance_id,review_attempted:true});
 const red=Array.isArray(jobs?.jobs)?
  jobs.jobs.filter(x=>x.id===scope.github_red_job_id):[];
 const green=Array.isArray(jobs?.jobs)?
  jobs.jobs.filter(x=>x.id===scope.github_green_job_id):[];
 const runUrl='https://github.com/maloney2323/Reality/actions/runs/'+scope.github_run_id;
 const workflowText=workflowBlob?.encoding==='base64'&&
    typeof workflowBlob.content==='string'?
    Buffer.from(workflowBlob.content.replace(/\s/g,''),'base64').toString('utf8'):'';
 if(pr?.number!==scope.external_test_pr_number||
  pr?.head?.sha!==scope.github_head_sha||
  pr?.base?.repo?.full_name!=='maloney2323/Reality'||
  run?.id!==scope.github_run_id||
  run?.html_url!==runUrl||runUrl!==scope.github_run_url||
  run?.head_sha!==scope.github_head_sha||
  run?.status!=='completed'||run?.conclusion!=='failure'||
  run?.event!=='pull_request'||
  !String(run?.path||'').includes(WORKFLOW)||
  testBlob?.sha!==scope.frozen_test_blob_sha||
  testBlob?.path!==TEST||
  workflowBlob?.sha!==scope.frozen_workflow_blob_sha||
  workflowBlob?.path!==WORKFLOW||
  !workflowText.includes('ref: '+scope.historical_source_commit_sha)||
  !workflowText.includes('ref: '+scope.corrected_source_commit_sha)||
  red.length!==1||green.length!==1||
  red[0].name!=='historical-independent-red'||
  red[0].status!=='completed'||red[0].conclusion!=='failure'||
  green[0].name!=='repaired-independent-green'||
  green[0].status!=='completed'||green[0].conclusion!=='success'||
  !Array.isArray(red[0].steps)||!red[0].steps.some(s=>
    s.name==='Historical code fails frozen owner-warrant and draft-source regression'&&
    s.conclusion==='failure')||
  !Array.isArray(green[0].steps)||!green[0].steps.some(s=>
    s.name==='Repaired code passes exact same frozen regression'&&
    s.conclusion==='success'))
  return safe('SIGNED_EXTERNAL_REVIEW_GITHUB_PROOF_MISMATCH',{
   maintenance_id:scope.maintenance_id,review_attempted:true});
 const receiptDigest='sha256:'+createHash('sha256').update(
  [scope.maintenance_id,scope.staging_receipt_sha256,
   scope.source_epoch_receipt_sha256,scope.github_head_sha,
   scope.frozen_test_blob_sha,scope.frozen_workflow_blob_sha,
   scope.github_run_id,red[0].id,green[0].id,
   scope.historical_source_commit_sha,scope.corrected_source_commit_sha,
   first.provider_proof_sha256,second.provider_proof_sha256
  ].join('|')).digest('hex');
 const recorded=await call(db,'reality_record_signed_maintenance_external_review_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId,
  p_maintenance_id:scope.maintenance_id,
  p_staging_receipt_sha256:scope.staging_receipt_sha256,
  p_independent_provider_digest:receiptDigest
 },{fetchImpl});
 if(recorded?.status!==
   'SIGNED_EXTERNAL_HISTORICAL_REGRESSION_REVIEW_RECORDED_CASE_RED_STILL_REQUIRED'||
  recorded.shift_id!==shiftId||recorded.owner_id!==scope.owner_id||
  recorded.maintenance_id!==scope.maintenance_id||
  recorded.reviewer!==scope.reviewer||
  recorded.staging_receipt_sha256!==scope.staging_receipt_sha256||
  !HASH.test(recorded.review_receipt_sha256||'')||
  recorded.independent_maintenance_ci_red_attested!==false||
  recorded.original_job_completed!==false||
  recorded.installation_authorized!==false||
  recorded.repair_executed!==false||
  recorded.production_changed!==false)
  guard('DURABLE_INDEPENDENT_REVIEW_UNTRUSTED');
 return Object.freeze({...recorded,review_attempted:true,
  next_action:'CASE_SPECIFIC_INDEPENDENT_FROZEN_CI_RED_REQUIRED',
  independent_maintenance_ci_red_attested:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false,new_shift_started:false});
}
