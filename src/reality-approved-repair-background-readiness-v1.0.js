// Read-only server prerequisite for one exact owner-install approval.
// The governed GitHub scheduler is signed and runs on the repository default
// branch; it polls only previously consumed owner approval records.
// No dispatcher PAT or database key is needed by the customer's browser.
const REPO='maloney2323/Reality';
const BRANCH='main';
const PREVIEW='feature/reality-closed-loop-worker-20261031';
const WORKFLOW='.github/workflows/reality-governed-approved-scheduler-v1.yml';
const WORKER='.github/workflows/reality-approved-repair-background-v1.yml';
const status=(code,ready=false)=>Object.freeze({
 ready,code,installation_authorized:false,original_job_completed:false,
 production_changed:false,
});
export async function verifyApprovedBackgroundReadiness({
 env=process.env,fetchImpl=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==PREVIEW||
    env.REALITY_GOVERNED_SCHEDULER_ENABLED!=='true')
  return status('EXACT_ISOLATED_SCHEDULER_PREVIEW_REQUIRED');
 try{
  const header={accept:'application/vnd.github+json',
   'user-agent':'Reality-signed-governed-scheduler-readiness-v1'};
  const get=async path=>{
   const res=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
    method:'GET',cache:'no-store',redirect:'error',headers:header});
   if(!res.ok)return null;
   return res.json().catch(()=>null);
  };
  const [registered,worker,runs]=await Promise.all([
   get('/actions/workflows/'+WORKFLOW.split('/').at(-1)),
   get('/actions/workflows/'+WORKER.split('/').at(-1)),
   get('/actions/workflows/'+WORKFLOW.split('/').at(-1)+
    '/runs?branch='+encodeURIComponent(BRANCH)+'&per_page=12'),
  ]);
  if(registered?.state!=='active'||registered.path!==WORKFLOW||
     worker?.state!=='active'||worker.path!==WORKER)
   return status('GOVERNED_SCHEDULER_OR_WORKER_NOT_ACTIVE');
  if(!Array.isArray(runs?.workflow_runs))
   return status('GOVERNED_SCHEDULER_RUN_READBACK_UNAVAILABLE');
  const matches=runs.workflow_runs.filter(x=>
   x.path===WORKFLOW&&x.head_branch===BRANCH&&
   x.head_repository?.full_name===REPO&&
   ['push','schedule','workflow_dispatch'].includes(x.event)&&
   Number.isSafeInteger(x.id));
  if(!matches.length)return status('GOVERNED_SCHEDULER_NEVER_VERIFIED');
  const latest=matches.sort((a,b)=>Number(b.run_number||0)-
    Number(a.run_number||0))[0];
  if(latest.status!=='completed'||latest.conclusion!=='success')
   return status('GOVERNED_SCHEDULER_LAST_RUN_NOT_GREEN');
  if(!Number.isFinite(Date.parse(latest.updated_at))||
     Date.now()-Date.parse(latest.updated_at)>2*60*60*1000)
   return status('GOVERNED_SCHEDULER_HEARTBEAT_STALE');
  return status('GOVERNED_AUTO_WAKE_VERIFIED',true);
 }catch{return status('GOVERNED_SCHEDULER_INDEPENDENT_READBACK_FAILED');}
}
