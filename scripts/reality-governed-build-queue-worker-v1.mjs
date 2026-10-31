// Read-only, owner-requested worker. No historical job special cases.
// Owner identity, approval and goal are never accepted from request files.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {observeRealityIssueFailure} from '../src/reality-general-provider-failure-observer-v1.0.js';
const changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
if(changed.length!==1||!/^reality-requests\/[0-9a-f-]{36}\.json$/.test(changed[0]))
 throw Error('REALITY_WORKER_ONE_PINNED_REQUEST_REQUIRED');
const request=JSON.parse(readFileSync(changed[0],'utf8'));
if(Object.keys(request).sort().join(',')!=='issue_number,original_work_id,queue_id,schema'||
 request.schema!=='reality-isolated-build-request-v1'||
 !/^[0-9a-f]{8}-[0-9a-f-]{27,28}$/.test(String(request.queue_id||''))||
 !/^work:[a-f0-9]{32}$/.test(String(request.original_work_id||''))||
 !Number.isInteger(request.issue_number)||request.issue_number<1||
 request.issue_number>100000)throw Error('REALITY_WORKER_REQUEST_SCOPE_INVALID');
const requestSha=createHash('sha256').update(JSON.stringify(request)).digest('hex');
let result;
try{
 result=await observeRealityIssueFailure({issueNumber:request.issue_number,
  originalWorkId:request.original_work_id,token:process.env.GH_PROVIDER_READ_TOKEN});
}catch(error){
 const code=String(error?.message||'');
 result={state:'BLOCKED_PROVIDER_READBACK_UNAVAILABLE',
  error:/^GENERAL_WORKER_[A-Z0-9_]+$/.test(code)?code:'GENERAL_WORKER_PROVIDER_UNKNOWN',
  independently_verified_provider_failure:false,
  independently_verified_missing_capability:false,
  model_generated:false,installed:false,original_job_settled:false,
  production_changed:false};
}
const receipt=Object.freeze({
 version:'reality-isolated-worker-discovery-v2',
 queue_id:request.queue_id,original_work_id:request.original_work_id,
 issue_number:request.issue_number,request_sha256:requestSha,
 repository_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 provider_observation:result,
 model_code_generation_performed:false,owner_installation_authorized:false,
 github_writes_by_worker:false,production_changed:false,
 capability_registered:false,original_job_settled:false});
mkdirSync('reality-worker-result',{recursive:true});
writeFileSync('reality-worker-result/receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log('REALITY_GOVERNED_WORKER_DISCOVERY',JSON.stringify({
 queue_id:receipt.queue_id,original_work_id:receipt.original_work_id,
 issue_number:receipt.issue_number,request_sha256:receipt.request_sha256,
 phase:result.state,provider_run_id:result.run_id||null,
 source_evidence_sha256:result.source_evidence_sha256||null,
 independently_verified_provider_failure:
  result.independently_verified_provider_failure===true,
 independently_verified_missing_capability:false,
 model_code_generation_performed:false,original_job_settled:false,
 production_changed:false}));
