// Independent owner-scoped observation of the one existing isolated worker
// request. GitHub run success proves DISCOVERY EXECUTED, not a capability gap,
// generated model source, installation, or original-job settlement.
export const GOVERNED_BUILD_WORKER_READBACK_VERSION=
 'reality-governed-build-worker-readback-v1.0';
const WORKER='reality/worker/foundational-build-queue-v1';
const WORKFLOW='.github/workflows/reality-governed-build-worker-v1.yml';
const REPO='maloney2323/Reality';
const uuid=x=>typeof x==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const result=(state,details={})=>Object.freeze({
 state,independent_gap_verified:false,model_generated:false,
 sandbox_verified:false,installation_authorized:false,
 capability_installed:false,original_job_resumed:false,
 original_job_settled:false,production_changed:false,...details,
});
export async function observeGovernedBuildWorker({
 queue,env=process.env,fetchImpl=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview')return result('PREVIEW_ONLY');
 if(!uuid(queue?.queue_id)||!sha(queue?.dispatch_commit_sha)||
   queue.request_path!=='reality-requests/'+queue.queue_id+'.json')
  return result('DISPATCH_RECEIPT_NOT_VERIFIED');
 const token=String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'');
 if(token.length<25)return result('WORKER_READ_CREDENTIAL_UNAVAILABLE');
 const endpoint='https://api.github.com/repos/'+REPO+
  '/actions/runs?head_sha='+queue.dispatch_commit_sha+
  '&event=push&per_page=20';
 let response;
 try{
  response=await fetchImpl(endpoint,{method:'GET',redirect:'error',
   cache:'no-store',headers:{
    accept:'application/vnd.github+json',
    authorization:'Bearer '+token,
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-independent-governed-build-readback',
   }});
  if(!response.ok)return result('WORKER_PROVIDER_READBACK_UNAVAILABLE');
  const payload=await response.json();
  if(!Array.isArray(payload?.workflow_runs)||
     payload.workflow_runs.length>20)
   return result('WORKER_PROVIDER_RESPONSE_INVALID');
  const matching=payload.workflow_runs.filter(run=>
   run?.head_sha===queue.dispatch_commit_sha&&
   run?.head_branch===WORKER&&run?.event==='push'&&
   run?.path===WORKFLOW&&
   Number.isSafeInteger(run?.id)&&run.id>0&&
   run?.html_url==='https://github.com/'+REPO+'/actions/runs/'+run.id&&
   ['queued','in_progress','completed'].includes(run?.status));
  if(matching.length!==1)
   return result(matching.length?'WORKER_RUN_AMBIGUOUS':'WORKER_RUN_NOT_OBSERVED');
  const run=matching[0];
  if(run.status==='completed'&&run.conclusion==='success')
   return result('DISCOVERY_WORKER_SUCCESS_OBSERVED',{
    worker_run_ref:run.html_url,worker_run_id:run.id,
    exact_dispatch_sha:queue.dispatch_commit_sha,
    worker_run_status:'completed',worker_run_conclusion:'success',
   });
  if(run.status==='completed')
   return result('DISCOVERY_WORKER_FAILED',{
    worker_run_ref:run.html_url,worker_run_id:run.id,
    exact_dispatch_sha:queue.dispatch_commit_sha,
    worker_run_status:'completed',worker_run_conclusion:'failure_or_cancelled',
   });
  return result('DISCOVERY_WORKER_PENDING',{
   worker_run_ref:run.html_url,worker_run_id:run.id,
   exact_dispatch_sha:queue.dispatch_commit_sha,
   worker_run_status:run.status,worker_run_conclusion:null,
  });
 }catch{
  return result('WORKER_PROVIDER_READBACK_UNAVAILABLE');
 }
}
