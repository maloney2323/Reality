// Existing signed Continuity ledger -> independent provider CI readback ->
// existing one-use remediation inquiry. No code write, approval, or retry reset.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {continuityProviderTextSchema,continuityTextContract}
 from './reality-shift-continuity-auto-investigation-v1.js';
const UUID=/^[a-f0-9-]{36}$/i, HASH=/^sha256:[a-f0-9]{64}$/, SHA=/^[a-f0-9]{40}$/;
const repo='maloney2323/Reality';
const workflow='reality-continuity-format-remediation.yml';
const base='https://api.github.com/repos/'+repo;
const safe=(status,detail={})=>Object.freeze({status,...detail,execution_authorized:false,
 installation_authorized:false,original_job_completed:false,production_changed:false});
export function verifiedFormatEvidence(scope){
 if(scope?.investigation_attempts!==3||
  scope.last_failure?.failure_reason!=='MODEL_TEXT_BOUNDS_UNVERIFIED'||
  scope.last_failure?.validation_evidence?.schema!=='reality-continuity-text-validation-v1')return false;
 const guided=['SIGNED_SHIFT_REPEATED_NO_PROGRESS','SIGNED_CHAT_RECOVERY_REVIEW_STALLED'].includes(scope.kind);
 const contract=continuityTextContract(guided), schema=continuityProviderTextSchema(guided);
 const v=scope.last_failure.validation_evidence.violations;
 return Array.isArray(v)&&v.length>0&&v.length<=contract.length&&
  new Set(v.map(x=>x.field)).size===v.length&&v.every(x=>{
   const c=contract.find(y=>y.field===x.field);
   if(!c||c.min!==x.min||c.max!==x.max||typeof schema[x.field]?.pattern!=='string')return false;
   // The independent regression covers each bounded field. Do not authorize a
   // correction for other defects (type/whitespace) this remediation does not fix.
   if(!Number.isSafeInteger(x.length)||x.length<0)return false;
   return (x.reason==='ABOVE_MAX'&&x.length>c.max)||
     (x.reason==='BELOW_MIN'&&x.length<c.min);
  });
}
async function read(path,token,fetchImpl){
 const r=await fetchImpl(base+path,{method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(5000),headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','user-agent':'Reality-continuity-remediation-verifier',
   ...(/^[A-Za-z0-9_-]{20,}$/.test(token||'')?{authorization:'Bearer '+token}:{})}});
 if(!r?.ok)throw Error('INDEPENDENT_CI_PROVIDER_UNAVAILABLE');
 return r.json();
}
export async function qualifyVerifiedInvestigationRemediation({
 db,env=process.env,shiftId,workerRunId,call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  !SHA.test(env.VERCEL_GIT_COMMIT_SHA||''))
  return safe('FORMAT_REMEDIATION_SIGNED_PREVIEW_REQUIRED');
 const scope=await call(db,'reality_read_shift_investigation_remediation_scope_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId},{fetchImpl});
 if(scope?.status==='NO_EXHAUSTED_EVIDENCED_FORMAT_INVESTIGATION')return safe(scope.status);
 if(scope?.status!=='EXHAUSTED_FORMAT_INVESTIGATION_REMEDIATION_SCOPE'||
  scope.shift_id!==shiftId||scope.worker_run_id!==workerRunId||
  !UUID.test(scope.owner_id||'')||!UUID.test(scope.incident_id||'')||
  !HASH.test(scope.evidence_sha256||'')||!HASH.test(scope.failure_history_sha256||'')||
  !verifiedFormatEvidence(scope)||scope.execution_authorized!==false||
  scope.installation_authorized!==false||scope.original_job_completed!==false||
  scope.production_changed!==false)
  return safe('FORMAT_REMEDIATION_EXACT_EVIDENCE_NOT_QUALIFIED');
 // Public repository CI evidence is independently readable without a write token.
 const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
 const sha=env.VERCEL_GIT_COMMIT_SHA, branch=env.VERCEL_GIT_COMMIT_REF;
 if(typeof branch!=='string'||!branch.length)
  return safe('FORMAT_REMEDIATION_DEPLOYMENT_BRANCH_UNAVAILABLE');
 let run,job;
 try{
  const data=await read('/actions/workflows/'+workflow+'/runs?head_sha='+sha+
   '&event=push&status=completed&per_page=5',token,fetchImpl);
  const after=Date.parse(scope.last_failure.failed_at||'');
  if(!Number.isFinite(after))return safe('FORMAT_REMEDIATION_FAILURE_EPOCH_INVALID');
  run=(data?.workflow_runs||[]).find(x=>x.head_sha===sha&&x.head_branch===branch&&
   x.event==='push'&&x.status==='completed'&&x.conclusion==='success'&&
   x.path==='.github/workflows/'+workflow&&x.repository?.full_name===repo&&
   Number.isSafeInteger(x.id)&&x.id>0&&Date.parse(x.run_started_at)>after&&
   Date.parse(x.updated_at)>after);
  if(!run)return safe('FORMAT_REMEDIATION_CURRENT_RELEASE_CI_NOT_VERIFIED');
  const jobs=await read('/actions/runs/'+run.id+'/jobs?per_page=10',token,fetchImpl);
  job=(jobs?.jobs||[]).find(x=>x.name==='verify-format-contract'&&
   x.run_id===run.id&&x.head_sha===sha&&x.status==='completed'&&x.conclusion==='success'&&
   Number.isSafeInteger(x.id)&&x.id>0&&Array.isArray(x.steps)&&
   x.steps.some(s=>s.name==='Verify bounds and unchanged authority'&&s.conclusion==='success'));
  if(!job)return safe('FORMAT_REMEDIATION_INDEPENDENT_JOB_NOT_VERIFIED');
 }catch{return safe('FORMAT_REMEDIATION_CI_READBACK_UNAVAILABLE');}
 const result=await call(db,'reality_record_shift_investigation_remediation_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId,p_incident_id:scope.incident_id,
  p_failure_history_sha256:scope.failure_history_sha256,p_release_sha:sha,
  p_ci_run_id:run.id,p_ci_job_id:job.id,
  p_provider_proof:{schema:'reality-independent-format-contract-ci-v1',
   head_sha:sha,run_id:run.id,job_id:job.id,workflow_path:run.path,
   conclusion:run.conclusion,job_conclusion:job.conclusion,event:run.event,
   completed_at:run.updated_at,format_contract_verified:true,
   authority_expansion_verified_absent:true,failure_history_sha256:scope.failure_history_sha256}
 },{fetchImpl});
 if(result?.status!=='ONE_VERIFIED_FORMAT_REMEDIATION_INQUIRY_READY'||
  result.incident_id!==scope.incident_id||result.shift_id!==shiftId||
  result.owner_id!==scope.owner_id||result.remediation_release_commit!==sha||
  result.remediation_ci_run_id!==run.id||!HASH.test(result.remediation_receipt_sha256||'')||
  result.investigation_attempts!==3||result.execution_authorized!==false||
  result.original_job_completed!==false||result.installation_authorized!==false||
  result.production_changed!==false)return safe('FORMAT_REMEDIATION_RECEIPT_UNVERIFIED');
 return safe(result.status,{incident_id:scope.incident_id,
  remediation_receipt_sha256:result.remediation_receipt_sha256,one_use_inquiry_only:true});
}
