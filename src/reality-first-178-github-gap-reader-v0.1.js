// Read-only, independently verified missing capability on issue #178.
// Runs inside Reality's dedicated GitHub Actions worker with ephemeral
// read-only GITHUB_TOKEN. This is provider evidence, NOT proof of a user goal,
// installation authority, or completed job.
import {createHash} from 'node:crypto';
const fail=s=>{throw Error('REALITY_WORKER_178_'+s)};
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const RUN=40962921090,JOB=123760052647;
const HEAD='6e6014f38f9fea382ea93b38418ec77e9158c1ef';
const PATH='.github/workflows/reality-first-customer-self-upgrade-red-v1.yml';
const MANIFEST='test/reality-frozen-regressions/first-ci-evidence-gap-v1.json';
const EXPECTED='7d0c6aee561c6e6ca4360f80789574b9c11f26729f575858861e18ce647cd4be';
const FILE='src/reality-extensions/reality-ci-failure-evidence.mjs';
const TEST='test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
export async function observePinnedReality178Failure({token,fetchImpl=fetch}={}){
 if(typeof token!=='string'||token.length<20)fail('READ_CREDENTIAL_REQUIRED');
 const headers={accept:'application/vnd.github+json',
  authorization:'Bearer '+token,'x-github-api-version':'2022-11-28',
  'user-agent':'Reality-first-real-self-upgrade-isolated-readback'};
 const get=async(path,raw=false)=>{
  const res=await fetchImpl(ROOT+path,{method:'GET',cache:'no-store',
   redirect:'follow',headers});
  if(!res?.ok)fail('PROVIDER_UNAVAILABLE');
  const len=Number(res.headers?.get?.('content-length')||0);
  if(!Number.isFinite(len)||len>800000)fail('OVERSIZE');
  const data=raw?await res.text():await res.json();
  if(raw&&(typeof data!=='string'||data.length>800000))fail('OVERSIZE');
  return data;
 };
 const run=await get('/actions/runs/'+RUN);
 if(run?.id!==RUN||run?.head_sha!==HEAD||run?.path!==PATH||
   run?.head_branch!=='proof/first-self-upgrade-red-contract-20261029'||
   run?.event!=='push'||run?.status!=='completed'||
   run?.conclusion!=='failure'||run?.repository?.full_name!=='maloney2323/Reality')
  fail('PINNED_RUN_MISMATCH');
 const jobs=await get('/actions/runs/'+RUN+'/jobs?per_page=100');
 if(jobs?.total_count!==1||!Array.isArray(jobs.jobs)||jobs.jobs.length!==1)
  fail('JOB_LIST_MISMATCH');
 const job=jobs.jobs[0];
 if(job?.id!==JOB||job.run_id!==RUN||job.head_sha!==HEAD||
    job.name!=='frozen-customer-acceptance'||job.status!=='completed'||
    job.conclusion!=='failure'||!job.steps?.some(s=>
     s.name==='Independently check the constitutional baseline'&&s.conclusion==='success')||
    !job.steps?.some(s=>s.name?.startsWith('Frozen customer acceptance')&&
     s.conclusion==='failure'))
  fail('PINNED_FAILED_JOB_MISMATCH');
 const log=await get('/actions/jobs/'+JOB+'/logs',true);
 if(!log.includes('ERR_MODULE_NOT_FOUND')||!log.includes(FILE)||
    !log.includes(TEST)||!/# pass 26\b/.test(log)||
    !/# fail 0\b/.test(log)||!/# fail 1\b/.test(log))
  fail('MISSING_CAPABILITY_FAILURE_NOT_OBSERVED');
 const data=await get('/contents/'+MANIFEST+'?ref='+HEAD);
 if(data?.encoding!=='base64'||data.path!==MANIFEST||
    typeof data.content!=='string')fail('MANIFEST_SOURCE_INVALID');
 const raw=Buffer.from(data.content.replace(/\s/g,''),'base64').toString('utf8');
 if(hash(raw)!==EXPECTED)fail('FROZEN_SUITE_CHANGED');
 const parsed=JSON.parse(raw);
 if(parsed.manifest_ref!=='first-ci-evidence-gap-v1'||
    !Array.isArray(parsed.tests)||parsed.tests.length!==2||
    !parsed.tests.includes(TEST))fail('FROZEN_SUITE_SCOPE_INVALID');
 return Object.freeze({
  status:'PINNED_178_MISSING_EXTENSION_INDEPENDENTLY_OBSERVED',
  capability_gap_id:'reality.ci-failure-evidence-v1',
  pinned_provider_run:'https://github.com/maloney2323/Reality/actions/runs/'+RUN,
  pinned_source_sha:HEAD,failed_job_id:JOB,
  frozen_manifest_sha256:EXPECTED,failed_log_sha256:hash(log),
  observed_missing_file:FILE,
  owner_goal_verified:false,independent_source_verified:true,
  model_generated:false,installation_authorized:false,
  original_job_completed:false,production_changed:false,
 });
}
