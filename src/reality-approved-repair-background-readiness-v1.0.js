// Read-only infrastructure heartbeat: one exact isolated customer preview.
// This confirms that the automatic signed scheduler is alive and the worker
// exists; it never grants installation, spends a customer approval, or
// asserts the original job is complete.
const REPO='maloney2323/Reality';
const PREVIEW='feature/reality-closed-loop-worker-20261031';
const SCHEDULER='reality-governed-approved-scheduler-v1.yml';
const WORKER='reality-approved-repair-background-v1.yml';
const reply=(code,ready=false)=>Object.freeze({
 ready,code,installation_authorized:false,
 original_job_completed:false,production_changed:false,
});
export async function verifyApprovedBackgroundReadiness({
 env=process.env,fetchImpl=fetch,now=Date.now(),
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.VERCEL_GIT_COMMIT_REF!==PREVIEW||
    env.REALITY_GOVERNED_SCHEDULER_ENABLED!=='true')
  return reply('EXACT_ISOLATED_SIGNED_SCHEDULER_REQUIRED');
 try{
  const headers={accept:'application/vnd.github+json',
   'user-agent':'Reality-governed-wake-readiness-v1'};
  const get=async path=>{
   const res=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
    method:'GET',headers,cache:'no-store',redirect:'error'});
   if(!res.ok)return null;
   return res.json().catch(()=>null);
  };
  const [scheduler,worker,runs]=await Promise.all([
   get('/actions/workflows/'+SCHEDULER),
   get('/actions/workflows/'+WORKER),
   get('/actions/workflows/'+SCHEDULER+'/runs?branch=main&per_page=20'),
  ]);
  if(scheduler?.state!=='active'||
     scheduler?.path!=='.github/workflows/'+SCHEDULER||
     worker?.state!=='active'||
     worker?.path!=='.github/workflows/'+WORKER)
   return reply('GOVERNED_SCHEDULER_OR_WORKER_NOT_ACTIVE');
  if(!Array.isArray(runs?.workflow_runs))
   return reply('GOVERNED_SCHEDULER_RUN_READBACK_UNAVAILABLE');
  const found=runs.workflow_runs.filter(x=>
   x.path==='.github/workflows/'+SCHEDULER&&
   x.head_branch==='main'&&
   x.head_repository?.full_name===REPO&&
   ['push','schedule','workflow_dispatch'].includes(x.event)&&
   Number.isSafeInteger(x.id));
  if(!found.length)return reply('GOVERNED_SCHEDULER_NEVER_VERIFIED');
  const latest=found.sort((a,b)=>
   Number(b.run_number||0)-Number(a.run_number||0))[0];
  if(latest.status!=='completed'||latest.conclusion!=='success'||
     !Number.isFinite(Date.parse(latest.updated_at))||
     now-Date.parse(latest.updated_at)>2*60*60*1000||
     now<Date.parse(latest.updated_at)-60000)
   return reply('GOVERNED_SCHEDULER_LAST_SUCCESS_STALE_OR_FAILED');
  return reply('GOVERNED_AUTO_WAKE_VERIFIED',true);
 }catch{return reply('GOVERNED_SCHEDULER_INDEPENDENT_READBACK_FAILED');}
}
