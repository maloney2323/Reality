// Model-generated source repair MUST be independently re-read from
// GitHub before Reality exposes an exact-artifact install review. This
// component never installs, approves, dispatches, settles or alters production.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const REF='reality/riley/repair-263-f2a5b8ecdd04';
const SOURCE='src/reality-riley-authorized-pr-review-job-v1.js';
const PROOF='reality-riley-proof/repair-263-f2a5b8ecdd04.json';
const WORK='work:f2a5b8ecdd048cfa102cbb20c5fa2e86';
const SHIFT='21dff8db-6f46-444d-a149-ab15f1caf8fe';
const DIGEST='sha256:e6a68e0bac2f8465da13b00fcc808eacba11ec1c0cfbd07497bdb5f7a95d09b6';
const BASE_FAILURE=42450082737;
const SHA40=/^[a-f0-9]{40}$/;
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=c=>{throw Error('RILEY_CANDIDATE_'+c)};
const unavailable=c=>({status:c,original_job_completed:false,
 installation_authorized:false,production_changed:false});
async function get(path,{fetchImpl,missing=false}){
 if(!/^\/(?:git\/ref\/heads\/reality\/riley\/repair-263-f2a5b8ecdd04|git\/commits\/[a-f0-9]{40}|contents\/(?:src\/reality-riley-authorized-pr-review-job-v1[.]js|reality-riley-proof\/repair-263-f2a5b8ecdd04[.]json)(?:\?ref=[A-Za-z0-9%._-]+)?|actions\/runs\/[1-9]\d+)$/.test(path))
  fail('GITHUB_RESOURCE_NOT_AUTHORIZED');
 const result=await fetchImpl(ROOT+path,{
  method:'GET',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{accept:'application/vnd.github+json',
   'user-agent':'Reality-Unattended-Riley-Source-Candidate-Independent-Readback',
   'x-github-api-version':'2022-11-28'}
 });
 if(result.status===404&&missing)return null;
 if(!result.ok)fail('GITHUB_PROVIDER_READBACK_HTTP_'+result.status);
 const data=await result.json();
 if(!data||typeof data!=='object')fail('GITHUB_PROVIDER_JSON_INVALID');
 return data;
}
function blob(result,path){
 if(result?.path!==path||result.encoding!=='base64'||
  typeof result.content!=='string'||result.size>95000||
  !SHA40.test(result.sha||''))
  fail('PINNED_GITHUB_BLOB_INVALID');
 const data=Buffer.from(result.content.replace(/\s/g,''),'base64');
 const gitBlob=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
 if(gitBlob!==result.sha)fail('GITHUB_BLOB_HASH_MISMATCH');
 return data.toString('utf8');
}
export async function attestExactRileyCandidate263({
 db,ownerId,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(ownerId||'')||
  typeof fetchImpl!=='function'||typeof callRpc!=='function')
  fail('ISOLATED_OWNER_BOUND_WORKER_REQUIRED');
 const current=await callRpc(db,'reality_read_owner_riley_repair_original_v1',
  {p_owner_id:ownerId},{fetchImpl});
 if(current?.status!=='OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK'||
   !Array.isArray(current.jobs)||current.jobs.length>6)
  fail('CURRENT_OWNER_REPAIR_READBACK_UNVERIFIED');
 const job=current.jobs.find(j=>j.shift_id===SHIFT&&
  j.original_work_id===WORK&&
  j.source_ref==='https://github.com/maloney2323/Reality/issues/263'&&
  j.source_proof_sha256===DIGEST);
 if(!job)return unavailable('NO_EXACT_CURRENT_REPAIR_ORIGINAL');
 if(job.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL')
  return unavailable('EXACT_INDEPENDENTLY_VERIFIED_CANDIDATE_AWAITING_OWNER_INSTALL_APPROVAL');
 if(job.phase!=='SOURCE_ADMITTED')
  return unavailable('REPAIR_NOT_ELIGIBLE_FOR_CANDIDATE_REATTESTATION');
 const ref=await get('/git/ref/heads/'+REF,{fetchImpl,missing:true});
 if(!ref)return unavailable('ISOLATED_REPAIR_CANDIDATE_NOT_YET_STAGED');
 if(!SHA40.test(ref.object?.sha||''))
  fail('CANDIDATE_BRANCH_COMMIT_UNVERIFIED');
 const commitSHA=ref.object.sha;
 const [committed,srcResponse,proofResponse]=await Promise.all([
  get('/git/commits/'+commitSHA,{fetchImpl}),
  get('/contents/'+SOURCE+'?ref='+encodeURIComponent(REF),{fetchImpl}),
  get('/contents/'+PROOF+'?ref='+encodeURIComponent(REF),{fetchImpl})
 ]);
 if(committed.sha!==commitSHA||
  committed.parents?.length!==1||
  !SHA40.test(committed.parents[0]?.sha||''))
  fail('CANDIDATE_PRESTATE_UNVERIFIED');
 const source=blob(srcResponse,SOURCE);
 let proof;
 try{proof=JSON.parse(blob(proofResponse,PROOF));}
 catch{fail('CANDIDATE_RECEIPT_NOT_VALID_JSON');}
 if(proof?.version!=='reality-riley-real-original-existing-file-model-repair-proof-v1'||
  proof.status!=='MODEL_WRITTEN_REPAIR_FROZEN_AND_EXISTING_CHECKS_PASSED'||
  proof.shift_id!==SHIFT||proof.original_work_id!==WORK||
  proof.issue_url!=='https://github.com/maloney2323/Reality/issues/263'||
  proof.shift_source_proof_sha256!==DIGEST||
  proof.original_failing_run_id!==BASE_FAILURE||
  proof.request_commit_sha!==committed.parents[0].sha||
  proof.independent_baseline_reproduced!==true||
  proof.independent_frozen_passed!==true||
  proof.independent_existing_tests_passed!==true||
  proof.independent_candidate_syntax_passed!==true||
  proof.owner_installation_authorized!==false||
  proof.original_job_completed!==false||
  proof.production_changed!==false||
  proof.candidate_source_sha256!==hash(source)||
  !/^resp_[A-Za-z0-9_-]{4,160}$/.test(proof.model_response_id||'')||
  JSON.stringify(proof.changed_files)!==JSON.stringify([SOURCE]))
  fail('EXACT_MODEL_FROZEN_INDEPENDENT_SOURCE_PROOF_MISMATCH');
 const run=await get('/actions/runs/'+proof.workflow_run_id,{fetchImpl});
 if(run?.id!==proof.workflow_run_id||
  run.status!=='completed'||run.conclusion!=='success'||
  run.name!=='Reality · Riley unattended real-source repair candidate'||
  run.head_sha!==proof.request_commit_sha||
  run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+run.id)
  fail('INDEPENDENT_GITHUB_SUCCESSFUL_REPAIR_WORKFLOW_REQUIRED');
 const result=await callRpc(db,'reality_attest_riley_263_candidate_v1',{
  p_original_work_id:WORK,
  p_candidate_source_sha256:'sha256:'+hash(source),
  p_candidate_commit_sha:commitSHA,
  p_model_response_id:proof.model_response_id,
  p_github_run_id:run.id
 },{fetchImpl});
 if(result?.status!=='EXACT_OWNER_SHIFT_CODE_CANDIDATE_INDEPENDENTLY_TESTED_AWAITING_INSTALL_APPROVAL'||
   result.original_work_id!==WORK||result.shift_id!==SHIFT||
   result.candidate_commit_sha!==commitSHA||
   result.candidate_artifact_sha256!=='sha256:'+hash(source)||
   result.installation_authorized!==false||
   result.original_job_completed!==false||
   result.production_changed!==false)
  fail('DURABLE_VERIFIED_CODE_CANDIDATE_NOT_RECORDED');
 return Object.freeze({...result,
  current_status:'VERIFIED_EXISTING_SOURCE_REPAIR_AWAITING_EXACT_INSTALL_APPROVAL',
  isolated_candidate_branch:'https://github.com/maloney2323/Reality/tree/'+REF,
  independent_github_workflow_url:run.html_url,
  original_job_completed:false,installation_authorized:false,
  production_changed:false});
}
