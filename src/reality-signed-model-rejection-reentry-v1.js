// Existing Continuity investigator -> independent CI/preview proof ->
// SAME frozen signed Chat original. Read-only provider checks precede one
// canonical DB phase transition; no model can authorize a code write.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/,SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^(repair|reality)\/[A-Za-z0-9/_-]{10,135}$/;
const repo='maloney2323/Reality',base='https://api.github.com/repos/'+repo;
const workflow='.github/workflows/reality-continuity-format-remediation.yml';
const safe=(status,extra={})=>Object.freeze({status,...extra,
 new_original_admitted:false,new_shift_started:false,
 installation_authorized:false,original_job_completed:false,production_changed:false});
export function signedRejectionReentryScope(scope,env,shiftId,runId){
 return scope?.status==='SIGNED_CHAT_REJECTED_ORIGINAL_REENTRY_INDEPENDENT_CI_DUE'&&
  scope.shift_id===shiftId&&scope.worker_run_id===runId&&UUID.test(scope.trigger_id||'')&&
  UUID.test(scope.incident_id||'')&&UUID.test(scope.owner_id||'')&&
  /^work:[a-f0-9]{32}$/.test(scope.original_work_id||'')&&
  HASH.test(scope.source_evidence_sha256||'')&&HASH.test(scope.rejection_receipt_sha256||'')&&
  HASH.test(scope.investigation_receipt_sha256||'')&&HASH.test(scope.spec_sha256||'')&&
  /^[A-Z][A-Z0-9_]{4,110}$/.test(scope.rejection_reason||'')&&
  SHA.test(scope.prior_release_sha||'')&&SHA.test(scope.release_sha||'')&&
  scope.release_sha===env.VERCEL_GIT_COMMIT_SHA&&
  scope.prior_release_sha!==scope.release_sha&&
  scope.installation_authorized===false&&scope.original_job_completed===false&&
  scope.new_original_admitted===false&&scope.production_changed===false;
}
function releaseBranch(b){return typeof b==='string'&&BRANCH.test(b)&&
 !b.includes('..')&&!b.includes('//')&&
 !b.startsWith('reality/chat-recovery/')&&!b.startsWith('reality/chat-development/');}
export function independentlyVerifiedSignedRejectionCi(scope,env,runs,jobs,head,status){
 if(!releaseBranch(env.VERCEL_GIT_COMMIT_REF)||!Array.isArray(runs)||
  !Array.isArray(jobs)||head?.ref!=='refs/heads/'+env.VERCEL_GIT_COMMIT_REF||
  head?.object?.sha!==scope.release_sha||status?.sha!==scope.release_sha||
  !Array.isArray(status.statuses)||!status.statuses.some(s=>
   s.context==='Vercel'&&s.state==='success'&&Number.isSafeInteger(s.id)&&s.id>0&&
   /^https:\/\/vercel\.com\/[A-Za-z0-9_-]+\/reality\/[A-Za-z0-9_-]{10,100}$/.test(s.target_url||'')))
  return null;
 const filtered=runs.filter(x=>x.head_sha===scope.release_sha&&
  x.head_branch===env.VERCEL_GIT_COMMIT_REF&&
  x.event==='push'&&x.status==='completed'&&x.conclusion==='success'&&
  x.path?.split('@')[0]===workflow&&x.repository?.full_name===repo&&
  Number.isSafeInteger(x.id)&&x.id>10000&&
  x.html_url==='https://github.com/'+repo+'/actions/runs/'+x.id&&
  Date.parse(x.run_started_at)>Date.parse(scope.rejected_at)&&
  Date.parse(x.updated_at)>Date.parse(x.run_started_at));
 if(filtered.length!==1)return null;
 const run=filtered[0],found=jobs.filter(x=>x.run_id===run.id&&
  x.head_sha===run.head_sha&&x.status==='completed'&&x.conclusion==='success'&&
  x.name==='verify-format-contract'&&Number.isSafeInteger(x.id)&&x.id>10000&&
  Array.isArray(x.steps)&&x.steps.some(step=>step.name==='Verify bounds and unchanged authority'&&step.conclusion==='success'));
 if(found.length!==1)return null;
 return {schema:'reality-independent-signed-rejection-reentry-ci-v1',
  source_original_work_id:scope.original_work_id,
  rejection_receipt_sha256:scope.rejection_receipt_sha256,
  investigation_receipt_sha256:scope.investigation_receipt_sha256,
  release_sha:scope.release_sha,branch:env.VERCEL_GIT_COMMIT_REF,
  workflow,step:'Verify bounds and unchanged authority',
  run_id:run.id,job_id:found[0].id,event:'push',
  conclusion:'success',job_conclusion:'success',
  run_started_at:run.run_started_at,run_completed_at:run.updated_at,
  candidate_executed:false,installation_authorized:false,
  original_job_completed:false,production_changed:false};
}
async function read(url,token,fetchImpl){
 const r=await fetchImpl(base+url,{
  method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000),
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-signed-model-rejection-independent-reentry',
   ...(/^[A-Za-z0-9_-]{20,}$/.test(token)?{authorization:'Bearer '+token}:{})}});
 if(!r?.ok)return null;return r.json().catch(()=>null);
}
export async function advanceInvestigatedSignedModelRejection({db,env=process.env,
 shiftId,workerRunId,call=shiftRpc,fetchImpl=fetch}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  !SHA.test(env.VERCEL_GIT_COMMIT_SHA||'')||
  !releaseBranch(env.VERCEL_GIT_COMMIT_REF))
  return safe('SIGNED_MODEL_REJECTION_PREVIEW_AND_WORKER_REQUIRED');
 try{
  const s=await call(db,'reality_read_signed_chat_model_rejection_reentry_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId,
   p_release_sha:env.VERCEL_GIT_COMMIT_SHA},{fetchImpl});
  if(s?.status==='NO_INDEPENDENTLY_INVESTIGATED_SIGNED_MODEL_REJECTION_DUE')
   return safe(s.status);
  if(!signedRejectionReentryScope(s,env,shiftId,workerRunId))
   return safe('SIGNED_MODEL_REJECTION_SOURCE_INVESTIGATION_NOT_QUALIFIED');
  const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
  const [list,head,status]=await Promise.all([
   read('/actions/workflows/reality-continuity-format-remediation.yml/runs?head_sha='+
    s.release_sha+'&event=push&status=completed&per_page=10',token,fetchImpl),
   read('/git/ref/heads/'+env.VERCEL_GIT_COMMIT_REF,token,fetchImpl),
   read('/commits/'+s.release_sha+'/status',token,fetchImpl)]);
  if(!Array.isArray(list?.workflow_runs))
   return safe('SIGNED_MODEL_REJECTION_INDEPENDENT_CI_UNAVAILABLE');
  const potential=list.workflow_runs.filter(x=>x.head_sha===s.release_sha&&
   x.head_branch===env.VERCEL_GIT_COMMIT_REF&&x.name==='Reality independent Continuity format remediation'&&
   x.status==='completed'&&x.conclusion==='success');
  if(potential.length!==1)
   return safe('SIGNED_MODEL_REJECTION_INDEPENDENT_CI_NOT_UNIQUE');
  const jobs=await read('/actions/runs/'+potential[0].id+'/jobs?per_page=100',token,fetchImpl);
  const proof=independentlyVerifiedSignedRejectionCi(s,env,list.workflow_runs,jobs?.jobs,head,status);
  if(!proof)return safe('SIGNED_MODEL_REJECTION_INDEPENDENT_CI_OR_PREVIEW_NOT_VERIFIED');
  const saved=await call(db,'reality_reenter_signed_chat_model_rejection_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId,
   p_trigger_id:s.trigger_id,p_release_sha:s.release_sha,p_ci_proof:proof},{fetchImpl});
  if(saved?.status!=='SIGNED_MODEL_REJECTION_INDEPENDENTLY_QUALIFIED_SAME_ORIGINAL_REENTERED'||
   saved.original_work_id!==s.original_work_id||saved.trigger_id!==s.trigger_id||
   saved.shift_id!==shiftId||saved.incident_id!==s.incident_id||
   !HASH.test(saved.rejection_receipt_sha256||'')||
   !HASH.test(saved.investigation_receipt_sha256||'')||
   !HASH.test(saved.ci_receipt_sha256||'')||
   !HASH.test(saved.revised_spec_sha256||'')||
   saved.new_original_admitted!==false||saved.new_shift_started!==false||
   saved.installation_authorized!==false||saved.original_job_completed!==false||
   saved.production_changed!==false)
   return safe('SIGNED_MODEL_REJECTION_DURABLE_REENTRY_RECEIPT_UNVERIFIED');
  return safe(saved.status,{original_work_id:s.original_work_id,
   incident_id:s.incident_id,trigger_id:s.trigger_id,
   rejection_receipt_sha256:saved.rejection_receipt_sha256,
   investigation_receipt_sha256:saved.investigation_receipt_sha256,
   ci_receipt_sha256:saved.ci_receipt_sha256,
   revised_spec_sha256:saved.revised_spec_sha256,
   same_original_reentered:true});
 }catch{return safe('SIGNED_MODEL_REJECTION_REENTRY_PROVIDER_OR_LEDGER_UNVERIFIED');}
}
