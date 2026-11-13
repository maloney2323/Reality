// Current owner-shift verifier for a genuine one-file model-written repair.
// No hardcoded historical shift, original-work ID or source digest.
// Never creates a candidate, installs code, or settles an original job.
import {createHash} from 'node:crypto';
import {shiftRpc,assertShiftReadback} from './reality-governed-shift-boundary-v1.js';

const ROOT='https://api.github.com/repos/maloney2323/Reality';
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const SHA40=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SOURCE_PATHS=Object.freeze([
 'api/reality/governed-employee-shift-worker.js',
 'src/reality-governed-employee-shift-worker-v1.js',
 'src/reality-riley-trusted-original-driver-bridge-v1.js',
 'src/reality-riley-service-original-runtime-v1.js',
 'src/reality-riley-authorized-pr-review-job-v1.js',
 'src/reality-riley-candidate-independent-verifier-v1.js'
]);
const fail=x=>{throw Error('RILEY_CURRENT_CANDIDATE_'+x)};
const blocked=x=>Object.freeze({status:'RILEY_CURRENT_CANDIDATE_'+x,
 original_job_completed:false,installation_authorized:false,production_changed:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const blobHash=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

async function getExact(path,{fetchImpl,allowed,missing=false}){
 if(!allowed.has(path))fail('UNAUTHORIZED_PROVIDER_RESOURCE');
 let response;
 try{response=await fetchImpl(ROOT+path,{
  method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{accept:'application/vnd.github+json',
   'user-agent':'Reality-Current-Riley-263-Independent-Candidate-Verifier',
   'x-github-api-version':'2022-11-28'}
 });}catch{fail('GITHUB_READ_EFFECT_UNVERIFIED')}
 if(response?.status===404&&missing)return null;
 if(!response?.ok)fail('GITHUB_PROVIDER_READBACK_UNVERIFIED');
 let data;try{data=await response.json()}catch{fail('GITHUB_JSON_UNVERIFIED')}
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('GITHUB_PROVIDER_OBJECT_REQUIRED');
 return data;
}
function verifiedBlob(result,path){
 if(result?.path!==path||result.encoding!=='base64'||
  typeof result.content!=='string'||result.size>100000||
  !SHA40.test(result.sha||''))fail('SOURCE_BLOB_METADATA_UNVERIFIED');
 const bytes=Buffer.from(result.content.replace(/\s/g,''),'base64');
 if(result.size!==bytes.length||blobHash(bytes)!==result.sha)
  fail('SOURCE_GIT_BLOB_HASH_MISMATCH');
 return bytes;
}
export async function attestCurrentRileyCandidate263({
 db,ownerId,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(ownerId||'')||typeof fetchImpl!=='function'||
  typeof callRpc!=='function')fail('OWNER_PREVIEW_SCOPE_REQUIRED');
 const [repairState,rawShifts]=await Promise.all([
  callRpc(db,'reality_read_owner_riley_repair_original_v1',
   {p_owner_id:ownerId},{fetchImpl}),
  callRpc(db,'reality_read_owner_employee_shifts_v1',
   {p_owner_id:ownerId},{fetchImpl})
 ]);
 const shifts=assertShiftReadback(rawShifts);
 if(repairState?.status!=='OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK'||
    repairState.production_changed!==false||
    !Array.isArray(repairState.jobs)||repairState.jobs.length>6)
  fail('EXACT_CURRENT_OWNER_REPAIR_READBACK_REQUIRED');
 const now=Date.now();
 const current=shifts.shifts.filter(s=>
  ['RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)&&
  !s.closed_at&&s.planned_end_at==='infinity'&&
  Number.isFinite(Date.parse(s.planned_start_at))&&
  Date.parse(s.planned_start_at)<=now);
 if(current.length===0)return blocked('NO_AUTHORIZED_ACTIVE_SHIFT');
 if(current.length!==1)fail('AMBIGUOUS_ACTIVE_SHIFTS');
 const shift=current[0],sources=shift.steps.filter(s=>
  s.step_index>=2&&s.step_index<=5&&
  s.source_ref===ISSUE&&s.state==='SOURCE_CHECKED'&&SHA.test(s.proof_sha256||''));
 if(sources.length!==1)fail('OWNER_SHIFT_EXACT_263_SOURCE_UNVERIFIED');
 const matches=repairState.jobs.filter(j=>j.shift_id===shift.shift_id&&
  WORK.test(j.original_work_id||'')&&
  j.source_ref===ISSUE&&
  j.source_proof_sha256===sources[0].proof_sha256&&
  j.installation_authorized===false&&
  j.production_changed===false&&
  j.original_job_completed===false);
 if(matches.length!==1)fail('CURRENT_REPAIR_NOT_BOUND_TO_SOURCE_STEP');
 const job=matches[0];
 if(job.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL')
  return blocked('EXACT_TESTED_CANDIDATE_NATIVE_INSTALL_GATE_NOT_VERIFIED');
 if(job.phase!=='SOURCE_ADMITTED')
  return blocked('EXACT_REPAIR_NOT_AWAITING_CANDIDATE');
 const suffix=job.original_work_id.slice(5,17);
 const ref='reality/riley/repair-263-'+suffix;
 const proofPath='reality-riley-proof/repair-263-'+suffix+'.json';
 const allowed=new Set([
  '/git/ref/heads/'+ref,
  '/contents/'+proofPath+'?ref='+encodeURIComponent(ref)
 ]);
 const head=await getExact('/git/ref/heads/'+ref,{fetchImpl,allowed,missing:true});
 if(!head)return blocked('MODEL_WRITTEN_CANDIDATE_NOT_YET_STAGED');
 if(!SHA40.test(head.object?.sha||''))fail('CANDIDATE_HEAD_UNVERIFIED');
 const candidateSHA=head.object.sha;
 allowed.add('/git/commits/'+candidateSHA);
 const commit=await getExact('/git/commits/'+candidateSHA,{fetchImpl,allowed});
 if(commit.sha!==candidateSHA||
    !Array.isArray(commit.parents)||commit.parents.length!==1||
    !SHA40.test(commit.parents[0]?.sha||''))
  fail('CANDIDATE_SOURCE_AND_PRESTATE_UNVERIFIED');
 const baseSHA=commit.parents[0].sha;
 const proofResponse=await getExact(
  '/contents/'+proofPath+'?ref='+encodeURIComponent(ref),
  {fetchImpl,allowed});
 let proof;try{proof=JSON.parse(verifiedBlob(proofResponse,proofPath))}
 catch{fail('CANDIDATE_INDEPENDENT_PROOF_JSON_UNVERIFIED')}
 if(proof?.version!=='reality-riley-real-original-existing-file-model-repair-proof-v1'||
  proof.status!=='MODEL_WRITTEN_REPAIR_FROZEN_AND_EXISTING_CHECKS_PASSED'||
  proof.shift_id!==shift.shift_id||
  proof.original_work_id!==job.original_work_id||
  proof.issue_url!==ISSUE||
  proof.shift_source_proof_sha256!==job.source_proof_sha256||
  proof.request_commit_sha!==baseSHA||
  proof.owner_installation_authorized!==false||
  proof.original_job_completed!==false||
  proof.production_changed!==false||
  proof.independent_baseline_reproduced!==true||
  proof.independent_frozen_passed!==true||
  proof.independent_existing_tests_passed!==true||
  proof.independent_candidate_syntax_passed!==true||
  !/^resp_[A-Za-z0-9_-]{4,160}$/.test(proof.model_response_id||'')||
  !Number.isSafeInteger(proof.workflow_run_id)||proof.workflow_run_id<10000||
  !Number.isSafeInteger(proof.original_failing_run_id)||
  proof.original_failing_run_id<10000||
  !Array.isArray(proof.changed_files)||proof.changed_files.length!==1||
  !SOURCE_PATHS.includes(proof.changed_files[0]))
  fail('CURRENT_MODEL_AND_FROZEN_TEST_PROOF_UNVERIFIED');
 const source=proof.changed_files[0];
 const a='/contents/'+source+'?ref='+encodeURIComponent(ref);
 const b='/contents/'+source+'?ref='+baseSHA;
 const passRun='/actions/runs/'+proof.workflow_run_id;
 const failureRun='/actions/runs/'+proof.original_failing_run_id;
 for(const s of [a,b,passRun,failureRun])allowed.add(s);
 const [candidateBlob,testedBlob,passing,failing]=await Promise.all([
  getExact(a,{fetchImpl,allowed}),getExact(b,{fetchImpl,allowed}),
  getExact(passRun,{fetchImpl,allowed}),
  getExact(failureRun,{fetchImpl,allowed})
 ]);
 const sourceBytes=verifiedBlob(candidateBlob,source);
 const testedBytes=verifiedBlob(testedBlob,source);
 // The passing workflow runs on commit A. Commit B adds the independent
 // proof receipt; exact source bytes MUST remain identical to the tested A.
 if(candidateBlob.sha!==testedBlob.sha||
    !sourceBytes.equals(testedBytes)||
    proof.candidate_source_sha256!==hash(sourceBytes)||
    passing.id!==proof.workflow_run_id||
    passing.status!=='completed'||passing.conclusion!=='success'||
    passing.name!=='Reality · Riley unattended real-source repair candidate'||
    passing.head_sha!==baseSHA||
    passing.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+passing.id||
    failing.id!==proof.original_failing_run_id||
    failing.status!=='completed'||failing.conclusion!=='failure'||
    !SHA40.test(failing.head_sha||''))
  fail('INDEPENDENT_TESTED_CANDIDATE_AND_FAILURE_EVIDENCE_REQUIRED');
 const result=await callRpc(db,'reality_attest_riley_263_candidate_v2',{
  p_original_work_id:job.original_work_id,
  p_candidate_source_sha256:'sha256:'+hash(sourceBytes),
  p_candidate_commit_sha:candidateSHA,
  p_model_response_id:proof.model_response_id,
  p_github_run_id:passing.id
 },{fetchImpl});
 if(result?.status!=='EXACT_OWNER_SHIFT_CODE_CANDIDATE_INDEPENDENTLY_TESTED_AWAITING_INSTALL_APPROVAL'||
    result.shift_id!==shift.shift_id||
    result.original_work_id!==job.original_work_id||
    result.candidate_commit_sha!==candidateSHA||
    result.candidate_artifact_sha256!=='sha256:'+hash(sourceBytes)||
    result.installation_authorized!==false||
    result.original_job_completed!==false||
    result.production_changed!==false)
  fail('CURRENT_VERIFIED_CANDIDATE_NOT_DURABLY_RECORDED');
 return Object.freeze({...result,
  isolated_candidate_branch:'https://github.com/maloney2323/Reality/tree/'+ref,
  independent_github_workflow_url:passing.html_url,
  current_status:'TESTED_CURRENT_REPAIR_AWAITING_EXACT_OWNER_APPROVAL',
  original_job_completed:false,installation_authorized:false,production_changed:false});
}