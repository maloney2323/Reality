// Read-only probe then explicit GitHub workflow dispatch for the ORIGINAL
// frozen acceptance, after a separate atomically leased owner approval and
// independently observed exact installed commit. Never a replacement for
// independent acceptance, owner authority, or settlement.
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-closed-loop-worker-20261031';
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const FLOW='.github/workflows/reality-source-bound-installed-acceptance-v1.yml';
const SHA=/^[a-f0-9]{40}$/;
const fail=c=>{throw Error('REALITY_GOVERNED_ACCEPTANCE_WAKE_'+c)};
export async function ensureIndependentOriginalAcceptance({
 env=process.env,originalWorkId,installedCommitSha,installedBranch,
 fetchImpl=fetch,
}={}){
 if(env.GITHUB_ACTIONS!=='true'||
    !['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||
    env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_REF!=='refs/heads/feature/reality-background-continuation-20261031'||
    env.VERCEL_ENV!=='preview'||
    originalWorkId!==WORK||
    installedBranch!==BRANCH||
    !SHA.test(installedCommitSha))
  fail('ISOLATED_EXACT_ORIGINAL_EXECUTION_SCOPE_REQUIRED');
 const token=env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN;
 if(typeof token!=='string'||token.length<25)
  fail('EPHEMERAL_WORKFLOW_TOKEN_UNAVAILABLE');
 const base='https://api.github.com/repos/'+REPO+
   '/actions/workflows/'+FLOW.split('/').at(-1);
 const headers={accept:'application/vnd.github+json',
   authorization:'Bearer '+token,'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-owner-approved-acceptance-trigger-v1'};
 const list=await fetchImpl(base+'/runs?branch='+encodeURIComponent(BRANCH)+
   '&per_page=100',{method:'GET',redirect:'error',
   cache:'no-store',headers});
 if(!list.ok)fail('INDEPENDENT_ACCEPTANCE_INDEX_READ_UNAVAILABLE');
 const json=await list.json();
 if(!Array.isArray(json?.workflow_runs)||
    json.workflow_runs.length>100)fail('RUN_INDEX_INVALID');
 const existing=json.workflow_runs.filter(run=>
   run.head_sha===installedCommitSha&&run.path===FLOW&&
   run.head_branch===BRANCH&&run.head_repository?.full_name===REPO&&
   ['push','workflow_dispatch'].includes(run.event));
 if(existing.length>1)fail('DUPLICATE_ORIGINAL_EXECUTION_RUNS');
 if(existing.length===1)
  return Object.freeze({status:'INDEPENDENT_ACCEPTANCE_ALREADY_RUNNING_OR_RECORDED',
   run_id:existing[0].id,original_work_id:WORK,
   installed_commit_sha:installedCommitSha,production_changed:false});
 const dispatched=await fetchImpl(base+'/dispatches',{method:'POST',
   cache:'no-store',redirect:'error',
   headers:{...headers,'content-type':'application/json'},
   body:JSON.stringify({ref:BRANCH,inputs:{
    original_work_id:WORK,installed_commit_sha:installedCommitSha,
   }})});
 if(dispatched.status!==204)fail('INDEPENDENT_ACCEPTANCE_DISPATCH_UNCONFIRMED');
 return Object.freeze({status:'INDEPENDENT_ACCEPTANCE_TRIGGER_ACCEPTED',
  original_work_id:WORK,installed_commit_sha:installedCommitSha,
  original_job_completed:false,production_changed:false});
}
