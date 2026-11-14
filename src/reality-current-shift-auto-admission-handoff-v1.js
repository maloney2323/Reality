// Reality's existing authenticated employee worker: verified source investigation
// -> exact signed shift -> independently reproduced frozen CI RED -> service-role
// fenced original admission. Never installs, re-authorizes, or settles work.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {runAuthorizedShiftSourceRepairAutoTrigger}
 from './reality-governed-auto-trigger-v1.0.js';

const BASE='https://api.github.com/repos/maloney2323/Reality';
const BRANCH='reality/native263-temporal-chat-proof-20261113';
const PATH='.github/workflows/reality-current-shift-auto-admission-proof.yml';
const TEST='test/reality-frozen-regressions/reality-current-shift-auto-admission-v1.test.js';
const WORKFLOW='Reality current shift governed auto-admission frozen contract';
const SOURCE='https://github.com/maloney2323/Reality/issues/185';
const SHA=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const BASE64=/^[A-Za-z0-9+\/=\s]+$/;
const fail=x=>{throw Error('SHIFT_AUTO_ADMISSION_'+x)};
const safe=(status)=>Object.freeze({status,original_job_admitted:false,
 installation_authorized:false,production_changed:false});
async function api(path,{fetchImpl,token}){
 let res;
 try{
  res=await fetchImpl(BASE+path,{method:'GET',cache:'no-store',
   redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-signed-shift-frozen-auto-admission',
    ...(token?{authorization:'Bearer '+token}:{})}});
 }catch{fail('PROVIDER_GET_UNAVAILABLE')}
 if(!res?.ok)fail('PROVIDER_READBACK_UNAVAILABLE');
 const out=await res.json().catch(()=>null);
 if(!out||typeof out!=='object'||Array.isArray(out))
  fail('PROVIDER_JSON_UNVERIFIED');
 return out;
}
function blob(x,path){
 if(x?.path!==path||x.encoding!=='base64'||
    typeof x.content!=='string'||x.size<200||x.size>30000||
    !SHA.test(x.sha||'')||!BASE64.test(x.content))
  fail('FROZEN_SOURCE_GIT_BLOB_UNVERIFIED');
 const bytes=Buffer.from(x.content.replace(/\s/g,''),'base64');
 const git= createHash('sha1').update('blob '+bytes.length+'\0')
  .update(bytes).digest('hex');
 if(bytes.length!==x.size||git!==x.sha)
  fail('GIT_BLOB_HASH_MISMATCH');
 return {sha256:createHash('sha256').update(bytes).digest('hex'),
  text:bytes.toString('utf8')};
}
export async function admitCurrentShiftInvestigatedSourceWithFrozenProof({
 db,graph,investigations,env=process.env,fetchImpl=fetch,token=null,
 callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !Array.isArray(graph.jobs)||graph.jobs.length!==4||
    investigations?.status!=='WEEKLY_ASSIGNED_SOURCE_INVESTIGATIONS_ALREADY_INSPECTED'&&
    investigations?.status!=='WEEKLY_EMPLOYEE_SOURCE_INVESTIGATIONS_INDEPENDENTLY_RECORDED'||
    !Array.isArray(investigations.source_receipts)||
    typeof fetchImpl!=='function'||typeof callRpc!=='function')
  fail('EXACT_ISOLATED_SIGNED_WORKER_SCOPE_REQUIRED');
 const matches=graph.jobs.filter(x=>
  x.source_ref===SOURCE&&
  x.original_kind==='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'&&
  x.phase==='NOT_ADMITTED'&&x.original_work_id===null&&
  x.independent_source_proof_verified===true);
 if(!matches.length)return safe('NO_NEW_QUALIFIABLE_CURRENT_SHIFT_SOURCE');
 if(matches.length!==1)fail('EXACT_SOURCE_AMBIGUOUS');
 const receipt=investigations.source_receipts.filter(x=>
  x.source_ref===SOURCE&&x.issue_number===185&&x.employee==='Riley'&&
  x.investigation_status==='CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST');
 if(receipt.length!==1)
  return safe('CURRENT_SHIFT_SOURCE_INVESTIGATION_RECEIPT_NOT_YET_AVAILABLE');
 const current=String(env.VERCEL_GIT_COMMIT_SHA||'');
 if(!SHA.test(current))return safe('ISOLATED_DEPLOYED_GIT_COMMIT_NOT_VERIFIED');
 // Discover the actual GitHub-issued RED run, never accept a caller-supplied
 // URL, result, SHA or test as a source of authority.
 const runs=[];
 for(let page=1;page<=3;page++){
  const result=await api('/actions/runs?branch='+BRANCH+
   '&per_page=100&page='+page,{fetchImpl,token});
  if(!Array.isArray(result.workflow_runs)||result.workflow_runs.length>100)
   fail('BOUNDED_GITHUB_ACTIONS_CENSUS_INVALID');
  const found=result.workflow_runs.filter(r=>
   r?.name===WORKFLOW&&r.path===PATH&&
   r.head_branch===BRANCH&&r.head_repository?.full_name==='maloney2323/Reality'&&
   r.status==='completed'&&r.conclusion==='failure'&&SHA.test(r.head_sha||'')&&
   Number.isSafeInteger(r.id)&&r.id>0);
  runs.push(...found);
  if(found.length||result.workflow_runs.length<100)break;
 }
 if(!runs.length)return safe('CURRENT_SIGNED_FROZEN_RED_RUN_NOT_OBSERVED');
 const candidate=runs.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
 if(!Number.isFinite(Date.parse(candidate.created_at))||
    Date.now()-Date.parse(candidate.created_at)>72*3600000||
    candidate.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+candidate.id)
  return safe('FROZEN_RED_RUN_STALE_OR_UNVERIFIED');
 const [run,jobs,redFile,currentFile]=await Promise.all([
  api('/actions/runs/'+candidate.id,{fetchImpl,token}),
  api('/actions/runs/'+candidate.id+'/jobs?per_page=100',{fetchImpl,token}),
  api('/contents/'+TEST+'?ref='+candidate.head_sha,{fetchImpl,token}),
  api('/contents/'+TEST+'?ref='+current,{fetchImpl,token})
 ]);
 if(run.id!==candidate.id||run.name!==WORKFLOW||
    run.head_sha!==candidate.head_sha||
    run.conclusion!=='failure'||run.status!=='completed'||
    run.head_branch!==BRANCH||run.path!==PATH||
    run.head_repository?.full_name!=='maloney2323/Reality'||
    !Array.isArray(jobs.jobs)||jobs.jobs.length<1||jobs.jobs.length>100)
  fail('FROZEN_CI_RUN_PROVIDER_MISMATCH');
 const job=jobs.jobs.filter(j=>
  j.run_id===run.id&&j.name==='current-shift-frozen-acceptance'&&
  j.conclusion==='failure'&&Array.isArray(j.steps)&&
  j.steps.some(s=>s.name==='Frozen current shift auto-admission acceptance'&&
   s.conclusion==='failure')&&
  j.steps.some(s=>s.name.startsWith('Run actions/checkout@')&&s.conclusion==='success')&&
  j.steps.some(s=>s.name.startsWith('Run actions/setup-node@')&&s.conclusion==='success'));
 if(job.length!==1)fail('INDEPENDENT_FROZEN_TEST_STEP_NOT_VERIFIED');
 const before=blob(redFile,TEST),now=blob(currentFile,TEST);
 if(before.sha256!==now.sha256||!SHA64.test(before.sha256)||
    !before.text.includes('runAuthorizedShiftSourceRepairAutoTrigger')||
    !before.text.includes('CURRENT_SHIFT_AUTO_ADMISSION_MISSING'))
  fail('FROZEN_TEST_DRIFT_OR_WRONG_ACCEPTANCE');
 const qualified=await runAuthorizedShiftSourceRepairAutoTrigger({
  graph,
  investigation:receipt[0],
  independentFrozenFailure:{
   run:{id:run.id,status:run.status,conclusion:run.conclusion,
    name:'Reality current shift governed auto-admission frozen contract',
    head_sha:run.head_sha,head_repository:run.head_repository,
    html_url:run.html_url},
   test_path:TEST,test_sha256:before.sha256,
   source_verified:true,failed_test_verified:true,
   failure_signature:'CURRENT_SHIFT_AUTO_ADMISSION_MISSING'
  },
  admit:args=>callRpc(db,'reality_admit_current_shift_verified_repair_v1',args,
   {fetchImpl})
 });
 return Object.freeze({...qualified,
  status:'SIGNED_SHIFT_FROZEN_REPAIR_ORIGINAL_AUTO_ADMITTED',
  exact_source_ref:SOURCE,independent_frozen_red_provider_url:run.html_url,
  original_job_admitted:true,installation_authorized:false,
  production_changed:false,original_job_completed:false});
}
