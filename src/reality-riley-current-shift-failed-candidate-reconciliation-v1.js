// Trusted employee watchdog for the SAME signed owner shift. A rejected,
// quarantined MODEL_DRAFT_RECORDED candidate becomes an independently observed,
// durable frozen failure before ONE corrective-model attempt. No install or job
// completion is authorized by any model or test.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const TARGET='src/reality-riley-service-original-runtime-v1.js';
const TEST='test/reality-riley-service-original-runtime-v1.test.js';
const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const fail=x=>{throw Error('RILEY_SHIFT_FROZEN_CANDIDATE_'+x)};
const no=(status)=>Object.freeze({status,independent_failure_recorded:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false});
async function github(path,{fetchImpl,token}={}){
 let response;
 try{response=await fetchImpl(ROOT+path,{
  method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(12500),
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Signed-Shift-Frozen-Candidate-Watchdog',
   ...(token?{authorization:'Bearer '+token}:{})}
 });}catch{fail('GITHUB_READ_EFFECT_UNVERIFIED')}
 if(!response?.ok)fail('GITHUB_CURRENT_PROVIDER_RESPONSE_UNVERIFIED');
 const v=await response.json().catch(()=>null);
 if(!v||typeof v!=='object'||Array.isArray(v))
  fail('GITHUB_JSON_OBJECT_REQUIRED');
 return v;
}
function blob(value,path){
 if(value?.path!==path||value.encoding!=='base64'||
    !SHA40.test(value.sha||'')||
    typeof value.content!=='string'||
    !Number.isSafeInteger(value.size)||value.size<200||value.size>90000)
  fail('EXACT_GIT_BLOB_METADATA_REQUIRED');
 const bytes=Buffer.from(value.content.replace(/\s/g,''),'base64');
 if(bytes.length!==value.size||
    createHash('sha1').update('blob '+bytes.length+'\0')
     .update(bytes).digest('hex')!==value.sha)
  fail('INDEPENDENT_GIT_BLOB_READBACK_MISMATCH');
 return Object.freeze({sha256:'sha256:'+createHash('sha256')
  .update(bytes).digest('hex'),text:bytes.toString('utf8')});
}
export async function reconcileCurrentShiftRejectedNativeModelCandidate({
 db,env=process.env,fetchImpl=fetch,callRpc=shiftRpc,token=null
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   typeof fetchImpl!=='function'||typeof callRpc!=='function')
  fail('SERVICE_ROLE_ISOLATED_PREVIEW_REQUIRED');
 const candidate=await callRpc(db,
  'reality_read_shift_native_candidate_frozen_v1',
  {},{fetchImpl});
 if(candidate?.status==='NO_ACTIVE_SIGNED_SHIFT_NATIVE_CANDIDATE'||
    candidate?.status==='NO_VERIFIED_UNSETTLED_MODEL_DRAFT_REQUIRING_TEST'||
    candidate?.status==='CURRENT_ORIGINAL_FAILURE_ALREADY_INDEPENDENTLY_RECORDED')
  return no(candidate.status);
 const issue=ISSUE.exec(candidate?.source_ref||'');
 if(candidate?.status!==
     'CURRENT_OWNER_SIGNED_NATIVE_MODEL_DRAFT_READY_FOR_INDEPENDENT_CI'||
    !issue||!UUID.test(candidate.owner_id||'')||
    !UUID.test(candidate.shift_id||'')||
    !WORK.test(candidate.original_work_id||'')||
    candidate.candidate_source_path!==TARGET||
    !SHA40.test(candidate.base_commit_sha||'')||
    !SHA256.test(candidate.proposed_sha256||'')||
    !SHA256.test(candidate.source_proof_sha256||'')||
    !/^resp_[A-Za-z0-9_-]{4,160}$/.test(candidate.model_response_id||'')||
    !Number.isSafeInteger(candidate.independent_source_qualification_run_id)||
    candidate.independent_source_qualification_run_id<=0||
    candidate.installation_authorized!==false||
    candidate.original_job_completed!==false||
    candidate.production_changed!==false)
  fail('CURRENT_SAME_ORIGINAL_DRAFT_AND_WARRANT_REQUIRED');
 const ref='reality/riley/candidate-'+issue[1]+'-'+candidate.original_work_id.slice(5,15);
 const wantedName='Reality Riley '+issue[1]+' independently tested isolated candidate';
 const workflow='.github/workflows/reality-riley-'+issue[1]+'-isolated-candidate-proof.yml';
 const head=await github('/git/ref/heads/'+ref,{fetchImpl,token});
 if(head?.ref!=='refs/heads/'+ref||!SHA40.test(head.object?.sha||''))
  fail('CANDIDATE_REF_AND_HEAD_UNVERIFIED');
 const sha=head.object.sha;
 const [commit,runs,src,test]=await Promise.all([
  github('/git/commits/'+sha,{fetchImpl,token}),
  github('/actions/runs?branch='+encodeURIComponent(ref)+'&per_page=50',
   {fetchImpl,token}),
  github('/contents/'+TARGET+'?ref='+sha,{fetchImpl,token}),
  github('/contents/'+TEST+'?ref='+sha,{fetchImpl,token})
 ]);
 if(commit?.sha!==sha||!Array.isArray(commit.parents)||
    commit.parents.length!==1||
    !SHA40.test(commit.parents[0]?.sha||'')||
    !Array.isArray(runs.workflow_runs)||runs.workflow_runs.length>50)
  fail('SOURCE_PRESTATE_AND_ACTIONS_CENSUS_UNVERIFIED');
 const passed=blob(src,TARGET),frozen=blob(test,TEST);
 if(passed.sha256!==candidate.proposed_sha256||
    !frozen.text.includes('model proposal must not underreport a real governed capability response')||
    !frozen.text.includes('assert.equal(output.governed_code_generation_connected,true'))
  fail('MODEL_CANDIDATE_SHA_OR_FROZEN_ACCEPTANCE_DRIFT');
 const failures=runs.workflow_runs.filter(x=>
  x?.head_sha===sha&&x.head_branch===ref&&x.name===wantedName&&
  x.path===workflow&&x.status==='completed'&&
  x.conclusion==='failure'&&x.head_repository?.full_name==='maloney2323/Reality'&&
  Number.isSafeInteger(x.id)&&x.id>10000&&
  x.html_url==='https://github.com/maloney2323/Reality/actions/runs/'+x.id);
 if(failures.length!==1)return no('ONE_CURRENT_MODEL_CANDIDATE_FROZEN_RED_NOT_YET_VERIFIED');
 const run=await github('/actions/runs/'+failures[0].id,{fetchImpl,token});
 if(run.id!==failures[0].id||run.head_sha!==sha||
    run.head_branch!==ref||run.path!==workflow||
    run.name!==wantedName||run.conclusion!=='failure'||
    run.status!=='completed'||run.head_repository?.full_name!=='maloney2323/Reality')
  fail('CURRENT_FROZEN_RUN_INDEPENDENT_READBACK_MISMATCH');
 const jobList=await github('/actions/runs/'+run.id+'/jobs?per_page=100',
  {fetchImpl,token});
 const match=Array.isArray(jobList.jobs)?jobList.jobs.filter(j=>
  j.run_id===run.id&&j.name==='independently-replay-repair-acceptance'&&
  j.conclusion==='failure'&&Array.isArray(j.steps)&&
  j.steps.some(x=>x.name==='Independently verify model-written candidate syntax'&&
   x.conclusion==='success')&&
  j.steps.some(x=>x.name==='Test real same-original handoff and falsifiable capability flags'&&
   x.conclusion==='failure')):[];
 if(match.length!==1)fail('REAL_FROZEN_TEST_FAILURE_STEP_NOT_VERIFIED');
 const saved=await callRpc(db,
  'reality_record_current_shift_native_candidate_ci_failure_v1',{
   p_original_work_id:candidate.original_work_id,
   p_model_response_id:candidate.model_response_id,
   p_proposed_sha256:candidate.proposed_sha256,
   p_tested_commit_sha:sha,p_independent_run_id:run.id,
   p_failed_test_count:1,
   p_frozen_test_sha256:frozen.sha256.slice(7)
  },{fetchImpl});
 if(saved?.status!=='SAME_SIGNED_ORIGINAL_REPAIR_DRAFT_INDEPENDENT_CI_REJECTED'||
    saved.original_work_id!==candidate.original_work_id||
    saved.model_response_id!==candidate.model_response_id||
    saved.shift_id!==candidate.shift_id||
    saved.owner_id!==candidate.owner_id||
    saved.independent_run_id!==run.id||
    saved.independent_run_url!==run.html_url||
    saved.installation_authorized!==false||
    saved.original_job_completed!==false||
    saved.production_changed!==false)
  fail('DURABLE_FROZEN_FAILURE_RECEIPT_UNVERIFIED');
 return Object.freeze({...saved,independent_failure_recorded:true,
  new_shift_created:false,model_not_independent_verifier:true,
  installation_authorized:false,original_job_completed:false,
  production_changed:false});
}
