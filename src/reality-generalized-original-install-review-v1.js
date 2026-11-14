// Service-only, no new shift/job and NO install: binds a completed original
// recovery's frozen source proof to an independently tested integration PR.
// GitHub and Reality's current Continuity/owner graph supply every identity;
// a Chat/model/PR title cannot authorize installation or claim settlement.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const REPO='https://api.github.com/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const PATH=/^src\/[a-zA-Z0-9/_-]+\.js$/;
const BRANCH=/^reality\/[a-zA-Z0-9/_-]{10,135}$/;
const WORKFLOW='.github/workflows/reality-governed-openai-gateway-isolated-20261108.yml';
const WORKFLOW_NAME='Reality — Isolated governed OpenAI gateway proof';
const sha256=v=>'sha256:'+createHash('sha256').update(v).digest('hex');
const gitBlob=v=>createHash('sha1').update('blob '+v.length+'\0').update(v).digest('hex');
const safe=(status,rest={})=>Object.freeze({
 status,owner_approval_ready:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,new_shift_started:false,
 ...rest});
const fail=code=>{throw Error('GENERALIZED_REVIEW_'+code)};
async function github(fetchImpl,path){
 const r=await fetchImpl(REPO+path,{method:'GET',cache:'no-store',redirect:'error',
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Governed-Original-Review'},signal:AbortSignal.timeout(12000)});
 if(!r?.ok)return null;
 return r.json().catch(()=>null);
}
async function source(fetchImpl,path,ref){
 if(!PATH.test(path)||!SHA.test(ref))fail('UNTRUSTED_SOURCE_REF');
 const d=await github(fetchImpl,'/contents/'+path+'?ref='+ref);
 if(d?.path!==path||d.encoding!=='base64'||!SHA.test(d.sha||'')||
   !Number.isSafeInteger(d.size)||d.size<=0||d.size>85000)
  fail('SOURCE_PROVIDER_METADATA_UNVERIFIED');
 const bytes=Buffer.from(String(d.content||'').replace(/\s/g,''),'base64');
 if(bytes.length!==d.size||gitBlob(bytes)!==d.sha)
  fail('SOURCE_GIT_BLOB_READBACK_UNVERIFIED');
 return {text:bytes.toString('utf8'),blob:d.sha,hash:sha256(bytes)};
}
export async function stageGeneralizedVerifiedOriginalInstallReview({
 db,env=process.env,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof db.secretKey!=='string'||db.secretKey.length<25||
  typeof fetchImpl!=='function'||typeof callRpc!=='function')
  return safe('GENERALIZED_REVIEW_ISOLATED_SERVICE_UNVERIFIED');
 const branch=String(env.VERCEL_GIT_COMMIT_REF||'');
 const deploySha=String(env.VERCEL_GIT_COMMIT_SHA||'');
 if(!BRANCH.test(branch)||branch.includes('..')||branch.includes('//')||
    branch.startsWith('reality/riley/')||!SHA.test(deploySha))
  return safe('GENERALIZED_REVIEW_TRUSTED_PREVIEW_BRANCH_MISSING');
 let candidate;
 try{
  candidate=await callRpc(db,'reality_read_next_generalized_verified_install_review_v1',
   {},{fetchImpl});
 }catch{return safe('GENERALIZED_REVIEW_OWNER_DATABASE_UNVERIFIED')}
 if(candidate?.status==='NO_UNSTAGED_PASSED_ORIGINAL_INSTALL_REVIEW'||
    candidate?.status==='GENERALIZED_INSTALL_NO_CURRENT_AUTHORIZED_SHIFT')
  return safe(candidate.status);
 if(candidate?.status!=='PASSED_SAME_ORIGINAL_INSTALL_REVIEW_ELIGIBLE'||
    !UUID.test(candidate.attempt_id||'')||!UUID.test(candidate.owner_id||'')||
    !UUID.test(candidate.shift_id||'')||!WORK.test(candidate.original_work_id||'')||
    !SHA.test(candidate.source_commit_sha||'')||
    !SHA.test(candidate.candidate_commit_sha||'')||
    !HASH.test(candidate.candidate_artifact_sha256||'')||
    !PATH.test(candidate.source_path||'')||
    !Number.isSafeInteger(candidate.independent_frozen_run_id)||
    candidate.independent_frozen_run_id<10000||
    candidate.installation_authorized!==false||
    candidate.original_job_completed!==false||
    candidate.production_changed!==false||
    typeof candidate.replacement_find!=='string'||
    candidate.replacement_find.length<20||
    candidate.replacement_find.length>12000||
    typeof candidate.replacement_with!=='string'||
    candidate.replacement_with.length>16000)
  return safe('GENERALIZED_REVIEW_SOURCE_OWNER_ATTESTATION_DRIFT');
 try{
  // The CURRENT deployment's branch may advance for UI/CI but the exact
  // original source blob must remain equivalent to the model's base source.
  const ref=await github(fetchImpl,'/git/ref/heads/'+branch);
  if(ref?.ref!=='refs/heads/'+branch||!SHA.test(ref.object?.sha||''))
   fail('PREVIEW_HEAD_UNVERIFIED');
  const live=await source(fetchImpl,candidate.source_path,ref.object.sha);
  const original=await source(fetchImpl,candidate.source_path,candidate.source_commit_sha);
  if(live.blob!==original.blob||live.hash!==original.hash)
   fail('ORIGINAL_FILE_CHANGED_SINCE_FROZEN_CANDIDATE');
  const at=live.text.indexOf(candidate.replacement_find);
  if(at<0||live.text.indexOf(candidate.replacement_find,at+1)!==-1)
   fail('ORIGINAL_PATCH_NOT_UNIQUE');
  const next=live.text.slice(0,at)+candidate.replacement_with+
    live.text.slice(at+candidate.replacement_find.length);
  const nextBytes=Buffer.from(next,'utf8');
  const nextHash=sha256(nextBytes),nextBlob=gitBlob(nextBytes);
  if(nextHash!==candidate.candidate_artifact_sha256)
   fail('INTEGRATED_MODEL_ARTIFACT_SOURCE_DIGEST_MISMATCH');
  const frozenCandidate=await source(fetchImpl,candidate.source_path,
   candidate.candidate_commit_sha);
  if(frozenCandidate.hash!==nextHash||frozenCandidate.blob!==nextBlob)
   fail('INDEPENDENT_FROZEN_SOURCE_DIFFERS_FROM_TARGET_PATCH');
  // Discover existing draft source-only integration PRs. Do not trust PR
  // titles, model instructions or client-supplied candidate IDs.
  const prs=await github(fetchImpl,'/pulls?state=open&base='+
   encodeURIComponent(branch)+'&per_page=100');
  if(!Array.isArray(prs))fail('OWNER_PREVIEW_PR_LIST_UNAVAILABLE');
  const possible=prs.filter(p=>p?.state==='open'&&p.draft===true&&
   p.base?.ref===branch&&p.base?.repo?.full_name==='maloney2323/Reality'&&
   p.head?.repo?.full_name==='maloney2323/Reality'&&
   SHA.test(p.head?.sha||'')&&Number.isSafeInteger(p.number)&&p.number>0
  ).slice(0,20);
  let matches=[];
  for(const p of possible){
   const files=await github(fetchImpl,'/pulls/'+p.number+'/files?per_page=100');
   if(!Array.isArray(files)||files.length!==1||
     files[0].filename!==candidate.source_path||
     files[0].status!=='modified')continue;
   const verified=await source(fetchImpl,candidate.source_path,p.head.sha);
   if(verified.blob===nextBlob&&verified.hash===nextHash)
    matches.push(p);
  }
  if(matches.length!==1)fail('EXACTLY_ONE_SOURCE_ONLY_INTEGRATION_PR_REQUIRED');
  const integration=matches[0];
  const runs=await github(fetchImpl,'/actions/runs?event=pull_request&per_page=100');
  if(!Array.isArray(runs?.workflow_runs))
   fail('INDEPENDENT_GITHUB_PR_RUNS_UNVERIFIED');
  const eligible=r=>r.head_sha===integration.head.sha&&
    r.head_branch===integration.head.ref&&
    r.name===WORKFLOW_NAME&&
    r.path?.split('@')[0]===WORKFLOW&&
    r.event==='pull_request'&&r.status==='completed'&&
    r.conclusion==='success'&&
    Number.isSafeInteger(r.id)&&r.id>10000&&
    r.html_url==='https://github.com/maloney2323/Reality/actions/runs/'+r.id;
  const matchesRun=runs.workflow_runs.filter(eligible);
  if(matchesRun.length!==1)
   fail('EXACT_SOURCE_INTEGRATION_CI_MISSING_OR_AMBIGUOUS');
  const run=matchesRun[0];
  const checked=await github(fetchImpl,'/actions/runs/'+run.id);
  if(!checked||!eligible(checked)||checked.id!==run.id)
   fail('INTEGRATION_CI_PROVIDER_READBACK_DRIFT');
  const jobs=await github(fetchImpl,'/actions/runs/'+run.id+'/jobs?per_page=60');
  const verifiedJobs=(jobs?.jobs||[]).filter(j=>j.run_id===run.id&&
   j.name==='boundary-tests'&&j.status==='completed'&&
   j.conclusion==='success'&&
   Array.isArray(j.steps)&&j.steps.some(t=>
    t.name==='Verify Reality model boundary and original tool-continuation regressions'&&
    t.conclusion==='success'));
  if(verifiedJobs.length!==1)
   fail('INTEGRATION_ORIGINAL_SOURCE_ACCEPTANCE_NOT_PROVEN');
  const staged=await callRpc(db,'reality_stage_generalized_original_install_review_v1',{
    p_attempt_id:candidate.attempt_id,
    p_target_branch:branch,p_preinstall_blob:live.blob,
    p_installed_blob:nextBlob,p_integration_commit:integration.head.sha,
    p_integration_run_id:run.id,p_integration_pr:integration.number
   },{fetchImpl});
  if(staged?.status!=='GENERALIZED_ORIGINAL_EXACT_REVIEW_STAGED_TRANSPORT_NOT_YET_READY'||
    staged.original_work_id!==candidate.original_work_id||
    staged.attempt_id!==candidate.attempt_id||
    staged.shift_id!==candidate.shift_id||
    staged.candidate_commit_sha!==candidate.candidate_commit_sha||
    staged.candidate_artifact_sha256!==nextHash||
    staged.independent_frozen_run_id!==candidate.independent_frozen_run_id||
    staged.integrated_test_run_id!==run.id||
    staged.expected_preinstall_blob_sha!==live.blob||
    staged.expected_installed_blob_sha!==nextBlob||
    staged.owner_approval_ready!==false||
    staged.installation_authorized!==false||
    staged.original_job_completed!==false||
    staged.production_changed!==false)
   fail('STAGED_REVIEW_NOT_DURABLY_READ_BACK');
  return safe('GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW_STAGED',{
   original_work_id:candidate.original_work_id,
   attempt_id:candidate.attempt_id,shift_id:candidate.shift_id,
   exact_source_blob_sha:nextBlob,independent_integration_ci_run_id:run.id,
   next_gate:'VERIFY_RELEASE_TRANSPORT_AND_SAME_ORIGINAL_SETTLEMENT_CONTRACT'
  });
 }catch(error){
  // Preserve only a predefined non-secret evidence-failure classification.
  // Never surface URLs, credentials, response bodies or provider stack traces.
  const code=String(error instanceof Error?error.message:'');
  const status=/^GENERALIZED_REVIEW_[A-Z0-9_]{5,85}$/.test(code)?
    code:'GENERALIZED_REVIEW_PROVIDER_SOURCE_OR_RELEASE_PROOF_UNVERIFIED';
  return safe(status,{
    original_work_id:candidate.original_work_id,attempt_id:candidate.attempt_id
  });
 }
}
