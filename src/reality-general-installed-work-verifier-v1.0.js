// Independent GitHub provider witness. A new source commit is not completion:
// the ORIGINAL frozen job and governance checks must actually execute and
// succeed at the exact owner-approved installed SHA. Not an LLM score.
import {createHash} from 'node:crypto';
const REPO='maloney2323/Reality';
const ROOT='https://api.github.com/repos/'+REPO;
const WORKFLOW='.github/workflows/reality-real-gap-acceptance-before-model-v1.yml';
const fail=code=>{throw Error('REAL_INSTALLED_WORK_'+code)};
const sha40=x=>/^[a-f0-9]{40}$/.test(String(x||''));
const sha64=x=>/^[a-f0-9]{64}$/.test(String(x||''));
const work=x=>/^work:[a-f0-9]{32}$/.test(String(x||''));
const allowed=x=>/^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/.test(String(x||''))&&
 !x.includes('//')&&!x.split('/').includes('..');
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const hash=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const bytesHash=x=>createHash('sha256').update(x).digest('hex');
export function createIndependentInstalledWorkVerifier({
 env=process.env,fetchImpl=fetch,
}={}){
 const token=env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||null;
 async function get(path){
  if(!/^\/[A-Za-z0-9_\/?.=&%-]+$/.test(path))fail('UNTRUSTED_GITHUB_PATH');
  const res=await fetchImpl(ROOT+path,{method:'GET',redirect:'error',
   cache:'no-store',headers:{
    accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-postinstall-original-work-v1',
    ...(typeof token==='string'&&token.length>20?
     {authorization:'Bearer '+token}:{})}});
  const data=await res.json().catch(()=>null);
  if(!res.ok)fail('GITHUB_READBACK_HTTP_'+res.status);
  return data;
 }
 async function inspectInstalled({installed,candidate,expectedBaseSha,originalWorkId}={}){
  if(installed?.kind!=='ISOLATED_GITHUB_SOURCE_INSTALLED'||
   !work(originalWorkId)||installed.original_work_id!==originalWorkId||
   !sha40(installed.installed_commit_sha)||!sha40(expectedBaseSha)||
   !/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(
    String(installed.installed_branch||''))||
   !Array.isArray(candidate?.files)||candidate.files.length<2||
   candidate.files.some(f=>!allowed(f.path)||typeof f.content!=='string')||
   installed.artifact_hash!==hash(candidate.files.map(f=>({
    path:f.path,content:f.content})))||
   installed.provider_bytes_readback_verified!==true||
   installed.production_changed!==false)
   fail('EXACT_INSTALLED_OWNER_ARTIFACT_REQUIRED');
  const commit=await get('/git/commits/'+installed.installed_commit_sha);
  const parent=commit?.parents||[];
  if(parent.length!==1||parent[0]?.sha!==expectedBaseSha)
   fail('INDEPENDENT_INSTALL_PARENT_MISMATCH');
  const ref=await get('/git/ref/heads/'+installed.installed_branch);
  if(ref?.object?.sha!==installed.installed_commit_sha)
   fail('INSTALLED_PREVIEW_BRANCH_ADVANCED');
  for(const file of candidate.files){
   const data=await get('/contents/'+file.path+'?ref='+installed.installed_commit_sha);
   if(data?.encoding!=='base64'||
    Buffer.from(String(data.content||'').replace(/\s/g,''),'base64').toString('utf8')!==file.content)
    fail('INSTALLED_EXTENSION_PROVIDER_SOURCE_MISMATCH');
  }
  return Object.freeze({
   independent_provider_readback:true,verified:true,
   original_work_id:originalWorkId,
   artifact_hash:installed.artifact_hash,
   installed_commit_sha:installed.installed_commit_sha,
   installed_branch:installed.installed_branch,
   source_bytes_sha256:hash(candidate.files),
   production_changed:false,
  });
 }
 async function observeOriginalRun({
  installedCommitSha,installedBranch,originalWorkId,
  expectedFrozenTestPath,expectedFrozenSha,
 }={}){
  if(!sha40(installedCommitSha)||!work(originalWorkId)||
   !/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(String(installedBranch||''))||
   !/^test\/reality-frozen-regressions\/[a-z0-9._/-]+\.test\.js$/.test(
    String(expectedFrozenTestPath||''))||
   !sha64(expectedFrozenSha))fail('PINNED_ORIGINAL_EXECUTION_REQUIRED');
  const frozen=await get('/contents/'+expectedFrozenTestPath+'?ref='+installedCommitSha);
  if(frozen?.encoding!=='base64'||
   bytesHash(Buffer.from(String(frozen.content||'').replace(/\s/g,''),'base64'))!==expectedFrozenSha)
   fail('ORIGINAL_FROZEN_ACCEPTANCE_CHANGED');
  // GitHub's run list is merely an index; inspect exact run+job+steps.
  const result=await get('/actions/workflows/'+WORKFLOW.split('/').at(-1)+
   '/runs?branch='+encodeURIComponent(installedBranch)+'&event=push&per_page=100');
  if(!Array.isArray(result?.workflow_runs)||result.workflow_runs.length>100)
   fail('PROVIDER_RUN_INDEX_UNAVAILABLE');
  const runs=result.workflow_runs.filter(r=>
   r.head_sha===installedCommitSha&&r.event==='push'&&
   r.path===WORKFLOW&&r.head_repository?.full_name===REPO&&
   Number.isSafeInteger(r.id));
  if(runs.length!==1)
   return Object.freeze({status:runs.length?'BLOCKED_DUPLICATE_SOURCE_RUN':
    'AWAITING_INDEPENDENT_INSTALLED_ACCEPTANCE',complete:false,
    original_work_id:originalWorkId,installed_commit_sha:installedCommitSha,
    production_changed:false});
  const run=runs[0];
  if(run.status!=='completed')
   return Object.freeze({status:'AWAITING_INDEPENDENT_INSTALLED_ACCEPTANCE',
    complete:false,original_work_id:originalWorkId,
    installed_commit_sha:installedCommitSha,provider_run_id:run.id,
    production_changed:false});
  if(run.conclusion!=='success')
   fail('INSTALLED_ORIGINAL_ACCEPTANCE_NOT_SUCCESSFUL');
  const jobs=await get('/actions/runs/'+run.id+'/jobs?per_page=100');
  if(!Array.isArray(jobs?.jobs)||jobs.jobs.length!==1)
   fail('INDEPENDENT_ORIGINAL_JOB_NOT_UNIQUE');
  const job=jobs.jobs[0];
  if(job.run_id!==run.id||job.head_sha!==installedCommitSha||
   job.name!=='independent-original-customer-acceptance'||
   job.conclusion!=='success'||job.status!=='completed'||
   !Array.isArray(job.steps))fail('INDEPENDENT_ORIGINAL_JOB_MISMATCH');
  const names=['Frozen same-work missing capability acceptance',
   'Regression: governance and exact-owner installation gates'];
  for(const name of names){
   const steps=job.steps.filter(step=>step.name===name&&step.conclusion==='success');
   if(steps.length!==1)fail('INDEPENDENT_REQUIRED_CHECK_NOT_SUCCESSFUL');
  }
  const receipt={
   original_work_id:originalWorkId,installed_commit_sha:installedCommitSha,
   installed_branch:installedBranch,provider_run_id:run.id,
   provider_job_id:job.id,frozen_test_sha256:expectedFrozenSha,
   frozen_test_path:expectedFrozenTestPath,
   verified_steps:names,
   outcome:'SUCCEEDED',
  };
  return Object.freeze({
   status:'VERIFIED_ORIGINAL_INSTALLED_WORK',
   complete:true,
   independent_provider_readback:true,
   original_frozen_tests_passed:true,
   governance_tests_passed:true,original_work_id:originalWorkId,
   installed_commit_sha:installedCommitSha,
   provider_run_id:run.id,provider_job_id:job.id,
   original_work_run_ref:'github:actions:run:'+run.id+':job:'+job.id,
   evidence_hash:hash(receipt),
   observed_outcome:'SUCCEEDED',
   real_execution_observed:true,
   production_changed:false,
  });
 }
 return Object.freeze({inspectInstalled,observeOriginalRun});
}
