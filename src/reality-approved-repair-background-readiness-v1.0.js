// Read-only preview readiness. A model, browser, or GitHub Actions test
// cannot grant install approval; a failed prerequisite MUST block its
// consumption before a single-use owner reservation is created.
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-closed-loop-worker-20261031';
const WORKFLOW='.github/workflows/reality-owner-approved-continuation-readiness-v1.yml';
const status=(code,ready=false)=>Object.freeze({
  ready,code,installation_authorized:false,original_job_completed:false,
  production_changed:false,
});
export async function verifyApprovedBackgroundReadiness({
 env=process.env,fetchImpl=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==BRANCH)
  return status('EXACT_ISOLATED_PREVIEW_REQUIRED');
 const token=env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN;
 if(typeof token!=='string'||token.length<25)
  return status('GITHUB_BACKGROUND_DISPATCH_CREDENTIAL_UNAVAILABLE');
 try{
  const url='https://api.github.com/repos/'+REPO+
    '/actions/workflows/'+WORKFLOW.split('/').at(-1)+
    '/runs?branch='+encodeURIComponent(BRANCH)+'&event=push&per_page=20';
  const res=await fetchImpl(url,{
   method:'GET',cache:'no-store',redirect:'error',headers:{
    accept:'application/vnd.github+json',
    authorization:'Bearer '+token,'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-original-178-no-blind-owner-approval-v1',
   },
  });
  if(!res.ok)return status('GITHUB_ACTIONS_PREREQUISITE_READBACK_UNAVAILABLE');
  const result=await res.json();
  if(!Array.isArray(result?.workflow_runs)||!result.workflow_runs.length)
   return status('GITHUB_ACTIONS_PREREQUISITE_RUN_MISSING');
  const runs=result.workflow_runs.filter(x=>
   x.path===WORKFLOW&&x.event==='push'&&x.head_branch===BRANCH&&
   x.head_repository?.full_name===REPO&&Number.isSafeInteger(x.id));
  if(!runs.length)return status('GITHUB_ACTIONS_PREREQUISITE_RUN_UNVERIFIED');
  // A previously green test can become stale after credentials change. This is
  // only a minimum prerequisite, not a substitute for the worker's live checks.
  const newest=runs.sort((a,b)=>Number(b.run_number||0)-Number(a.run_number||0))[0];
  if(newest.status!=='completed'||newest.conclusion!=='success')
   return status('GITHUB_ACTIONS_BACKGROUND_SECRETS_NOT_VERIFIED');
  return status('GITHUB_BACKGROUND_PREREQUISITES_REPORTED_READY',true);
 }catch{return status('GITHUB_ACTIONS_PREREQUISITE_READBACK_FAILED');}
}
