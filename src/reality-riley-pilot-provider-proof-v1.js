// Read-only, provider-derived proof for Riley's FIRST investigation.
// Employee execution is not equated with a completed original job or savings.
// Never trust issue titles, model output, logs alone, or client-supplied run IDs.
export const RILEY_PILOT_PROVIDER_PROOF_VERSION='reality-riley-pilot-provider-proof-v1';
const REPO='maloney2323/Reality';
const API='https://api.github.com/repos/'+REPO;
const RUN_URL=/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/([1-9]\d*)$/;
const SHA=/^[a-f0-9]{40}$/;
const TARGET_WORKFLOW='Reality flexible governed employee shifts';
const ROLES=Object.freeze([
 'verify-duration-and-authority',
 'riley-live-investigation',
 'riley-independent-verification'
]);
const fail=x=>{throw Error('RILEY_PROOF_'+x)};
async function get(path,fetchImpl){
 if(!/^\/actions\/(?:runs\?per_page=100|runs\/[1-9]\d*\/jobs\?per_page=100)$/.test(path))
  fail('SOURCE_PATH_FORBIDDEN');
 const res=await fetchImpl(API+path,{
  method:'GET',redirect:'error',cache:'no-store',
  headers:{accept:'application/vnd.github+json',
   'user-agent':'Reality-Riley-Public-Readback',
   'x-github-api-version':'2022-11-28'},
  signal:AbortSignal.timeout(12000)
 });
 if(!res.ok)fail('GITHUB_READBACK_UNAVAILABLE');
 const data=await res.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('SOURCE_DATA_INVALID');
 return data;
}
function exactRun(x){
 return Number.isSafeInteger(x?.id)&&x.id>0&&
  x.name===TARGET_WORKFLOW&&x.head_repository?.full_name===REPO&&
  SHA.test(x.head_sha)&&x.status==='completed'&&x.conclusion==='success'&&
  ['push','pull_request'].includes(x.event)&&
  RUN_URL.test(String(x.html_url||''))&&
  Number(RUN_URL.exec(x.html_url)[1])===x.id;
}
export async function readRileyPilotProviderProof({fetchImpl=fetch}={}){
 const data=await get('/actions/runs?per_page=100',fetchImpl);
 if(!Array.isArray(data.workflow_runs)||data.workflow_runs.length>100||
  !Number.isSafeInteger(data.total_count)||
  data.total_count<data.workflow_runs.length)
  fail('WORKFLOW_SCAN_INVALID');
 const candidates=data.workflow_runs.filter(exactRun).slice(0,5);
 for(const run of candidates){
  const jobs=await get('/actions/runs/'+run.id+'/jobs?per_page=100',fetchImpl);
  if(!Array.isArray(jobs.jobs)||jobs.jobs.length>100||
   !Number.isSafeInteger(jobs.total_count)||jobs.total_count<jobs.jobs.length)
   fail('PROVIDER_JOBS_INVALID');
  const matched=ROLES.map(name=>jobs.jobs.filter(j=>j.name===name&&
   j.run_id===run.id&&Number.isSafeInteger(j.id)&&j.id>0&&
   j.status==='completed'&&j.conclusion==='success'));
  if(matched.some(x=>x.length!==1))continue;
  return Object.freeze({
   version:RILEY_PILOT_PROVIDER_PROOF_VERSION,
   status:'RILEY_FIRST_REAL_INVESTIGATION_INDEPENDENTLY_VERIFIED',
   employee_name:'Riley',
   employee_function_id:'software_engineering',
   source:'GITHUB_ACTIONS_INDEPENDENT_JOB_READBACK',
   source_run_url:run.html_url,
   source_run_id:run.id,
   source_commit_sha:run.head_sha,
   independently_verified_job_id:matched[2][0].id,
   contract_check_job_id:matched[0][0].id,
   independent_provider_verification_passed:true,
   actual_work_kind:'BOUNDED_READ_ONLY_CI_FAILURE_INVESTIGATION',
   investigated_issue_url:'https://github.com/'+REPO+'/issues/143',
   scanned_runs_window_limited:true,
   autonomous_eight_hour_shift_verified:false,
   original_job_completed:false,
   model_code_generation_verified:false,
   capability_installed:false,
   verified_human_hours_saved:null,
   production_changed:false,
  });
 }
 return Object.freeze({
  version:RILEY_PILOT_PROVIDER_PROOF_VERSION,
  status:'NO_INDEPENDENT_RILEY_PILOT_RUN_FOUND_IN_BOUNDED_PROVIDER_SCAN',
  source:'GITHUB_ACTIONS_INDEPENDENT_JOB_READBACK',
  scanned_runs:Math.min(data.workflow_runs.length,100),
  scan_partial:data.total_count>data.workflow_runs.length,
  verified_employee_work:false,
  original_job_completed:false,
  verified_human_hours_saved:null,
  production_changed:false,
 });
}
