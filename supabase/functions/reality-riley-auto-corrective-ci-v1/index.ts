// One source-bound, owner-warranted and independently verified corrected
// candidate. This never installs, releases, or settles any original job.
// The GitHub credential stays in Supabase; only this service-gated function
// can create an isolated candidate branch derived from trusted DB evidence.
const PROJECT='hvkfreoagbrphwghjajw';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const WORKFLOW='.github/workflows/reality-riley-auto-corrective-candidate-proof.yml';
const WORKFLOW_NAME='Reality independently tested auto-corrective candidate';
const TARGET='src/reality-riley-service-original-runtime-v1.js';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const refuse=code=>{throw Error('AUTO_CORRECTIVE_'+code)};
const response=(status,code=200,more={})=>
 new Response(JSON.stringify({status,original_job_completed:false,
 installation_authorized:false,production_changed:false,...more}),{
 status:code,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
const sum=async(algorithm,bytes)=>Array.from(new Uint8Array(
 await crypto.subtle.digest(algorithm,bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
const encode=text=>new TextEncoder().encode(text);
const blob=async bytes=>{
 const prefix=encode('blob '+bytes.length+'\0');
 const input=new Uint8Array(prefix.length+bytes.length);
 input.set(prefix);input.set(bytes,prefix.length);
 return sum('SHA-1',input);
};
const digest=async bytes=>'sha256:'+await sum('SHA-256',bytes);
function decoded(value,path){
 if(value?.path!==path||value.encoding!=='base64'||
  typeof value.content!=='string'||!SHA.test(value.sha||'')||
  !Number.isSafeInteger(value.size)||value.size<1||value.size>85000)
  refuse('SOURCE_PROVIDER_METADATA_MISMATCH');
 let bytes;
 try{bytes=Uint8Array.from(atob(value.content.replace(/\s/g,'')),
   c=>c.charCodeAt(0))}catch{refuse('SOURCE_BASE64_UNVERIFIED')}
 if(bytes.length!==value.size)refuse('SOURCE_LENGTH_UNVERIFIED');
 return bytes;
}
function toBase64(bytes){
 let binary='';
 for(let i=0;i<bytes.length;i+=8192)
  binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
async function rpc(name,body,key){
 if(!['reality_read_next_riley_auto_corrective_ci_v1',
      'reality_record_riley_auto_corrective_staging_v1',
      'reality_record_riley_auto_corrective_ci_v1'].includes(name))
  refuse('UNALLOWED_DATABASE_OPERATION');
 const url='https://'+PROJECT+'.supabase.co/rest/v1/rpc/'+name;
 const r=await fetch(url,{method:'POST',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(12000),
  headers:{apikey:key,authorization:'Bearer '+key,
  'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(body)});
 if(!r.ok)refuse('SERVICE_DATABASE_OR_OWNER_WARRANT_UNVERIFIED');
 const j=await r.json().catch(()=>null);
 if(!j||typeof j!=='object'||Array.isArray(j))refuse('DATABASE_JSON_UNVERIFIED');
 return j;
}
async function github(token,path,method='GET',body=null){
 const r=await fetch(ROOT+path,{method,redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(14000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json','x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Isolated-Owner-Warranted-Corrective-CI'},
  body:body===null?undefined:JSON.stringify(body)});
 const j=await r.json().catch(()=>null);
 return {ok:r.ok,status:r.status,data:j};
}
const exact=async(token,path)=>{
 const v=await github(token,path);
 if(!v.ok||!v.data)refuse('GITHUB_READBACK_UNAVAILABLE');
 return v.data;
};
async function source(token,path,ref){
 const v=await exact(token,'/contents/'+path+'?ref='+encodeURIComponent(ref));
 const bytes=decoded(v,path);
 if(await blob(bytes)!==v.sha)refuse('SOURCE_GIT_BLOB_HASH_CHANGED');
 return {bytes,text:new TextDecoder().decode(bytes),sha:v.sha};
}
function validClaim(c){
 if(c?.status!=='EXACT_SAME_SHIFT_CORRECTIVE_DRAFT_READY_FOR_CI'||
  !WORK.test(c.original_work_id||'')||!SHA.test(c.source_commit_sha||'')||
  !SHA.test(c.source_blob_sha||'')||!HASH.test(c.proposed_sha256||'')||
  c.source_path!==TARGET||
  typeof c.find!=='string'||c.find.length<20||c.find.length>12000||
  typeof c.replace!=='string'||c.replace.length>16000||
  !/^resp_[A-Za-z0-9_-]{4,160}$/.test(c.model_response_id||'')||
  !/^[a-f0-9-]{36}$/.test(c.owner_id||'')||
  !/^[a-f0-9-]{36}$/.test(c.shift_id||'')||
  c.installation_authorized!==false||c.original_job_completed!==false||
  c.production_changed!==false)
  refuse('EXACT_CURRENT_MODEL_SOURCE_AND_AUTHORITY_REQUIRED');
}
async function stageOrObserve(c,token,baseBranch,baseSha,key){
 const branch='reality/riley/auto-corrective-'+c.original_work_id.slice(5);
 const current=await exact(token,'/git/ref/heads/'+baseBranch);
 if(current.ref!=='refs/heads/'+baseBranch||
    !SHA.test(current.object?.sha||''))
   refuse('TRUSTED_PREVIEW_SOURCE_REF_UNVERIFIED');
 // A UI/CI commit can advance this branch while the model's exact frozen
 // repair source remains unchanged. Guard the relevant bytes, not a moving
 // branch-wide commit SHA. Both deployed and current source are re-read.
 const liveSource=await source(token,TARGET,current.object.sha);
 if(liveSource.sha!==c.source_blob_sha)
   refuse('PREVIEW_SOURCE_FILE_CHANGED_REQUALIFICATION_REQUIRED');
 const workflow=await source(token,WORKFLOW,baseSha);
 if(!workflow.text.includes("persist-credentials: false")||
    !workflow.text.includes("independent-corrective-frozen")||
    !workflow.text.includes("node --test"))
  refuse('INDEPENDENT_FROZEN_CI_WORKFLOW_REQUIRED');
 const original=await source(token,TARGET,baseSha);
 if(original.sha!==c.source_blob_sha)
  refuse('MODEL_SOURCE_BASELINE_CHANGED_REGENERATE_REPAIR');
 const pos=original.text.indexOf(c.find);
 if(pos<0||original.text.indexOf(c.find,pos+1)>=0)
  refuse('MODEL_FIND_BLOCK_NOT_UNIQUE_IN_VERIFIED_SOURCE');
 const newText=original.text.slice(0,pos)+c.replace+
   original.text.slice(pos+c.find.length);
 const patched=encode(newText);
 if(patched.length<200||patched.length>85000||
   await digest(patched)!==c.proposed_sha256)
  refuse('PROPOSED_SOURCE_SHA256_MISMATCH');
 let ref=await github(token,'/git/ref/heads/'+branch);
 if(ref.status===404){
  const created=await github(token,'/git/refs','POST',{
   ref:'refs/heads/'+branch,sha:baseSha});
  // An uncertain remote write is always reconciled from GitHub, not replayed.
  ref=await github(token,'/git/ref/heads/'+branch);
  if(!ref.ok||ref.data?.ref!=='refs/heads/'+branch)
   return response('CANDIDATE_BRANCH_CREATION_UNVERIFIED_RECHECK_NEXT_WAKE',503);
 }else if(!ref.ok)refuse('CANDIDATE_BRANCH_READ_UNVERIFIED');
 const currentHead=ref.data?.object?.sha;
 if(!SHA.test(currentHead||''))refuse('CANDIDATE_BRANCH_HEAD_INVALID');
 let candidate=await source(token,TARGET,currentHead);
 if(await digest(candidate.bytes)!==c.proposed_sha256){
  if(candidate.sha!==c.source_blob_sha||currentHead!==baseSha)
   refuse('CANDIDATE_BRANCH_CONFLICT_OR_DRIFT_NO_WRITE');
  const written=await github(token,'/contents/'+TARGET,'PUT',{
   message:'test(reality): stage signed original '+c.original_work_id+
     ' corrective candidate for independent CI only',
   branch,sha:c.source_blob_sha,content:toBase64(patched)});
  ref=await github(token,'/git/ref/heads/'+branch);
  if(!ref.ok||!SHA.test(ref.data?.object?.sha||''))
   return response('CANDIDATE_WRITE_UNKNOWN_RECHECK_NEXT_WAKE',503);
  candidate=await source(token,TARGET,ref.data.object.sha);
  if(await digest(candidate.bytes)!==c.proposed_sha256)
   return response('CANDIDATE_WRITE_NOT_INDEPENDENTLY_RECONCILED',503);
 }
 const head=(await exact(token,'/git/ref/heads/'+branch)).object?.sha;
 if(!SHA.test(head||''))refuse('TEST_CANDIDATE_COMMIT_READBACK_INVALID');
 const staged=await rpc('reality_record_riley_auto_corrective_staging_v1',{
   p_original_work_id:c.original_work_id,
   p_model_response_id:c.model_response_id,
   p_proposed_sha256:c.proposed_sha256,
   p_candidate_branch:branch,
   p_candidate_commit_sha:head
 },key);
 if(staged.status!=='SAME_ORIGINAL_CORRECTIVE_CANDIDATE_STAGED_READBACK'||
    staged.original_work_id!==c.original_work_id||
    staged.shift_id!==c.shift_id||
    staged.candidate_commit_sha!==head||
    staged.independent_ci_verified!==false||
    staged.installation_authorized!==false||
    staged.original_job_completed!==false||
    staged.production_changed!==false)
   refuse('CANDIDATE_STAGING_DURABLE_RECONCILIATION_MISSING');
 // The exact frozen candidate workflow is preferred. If GitHub did not
 // emit that push workflow (for example a branch was created by a broker
 // credential that does not trigger Actions), *failure-only* evidence from
 // the trusted base PR gateway can independently reject the same SHA.
 // A broad gateway PASS is never promoted to install-ready CI proof.
 const runs=await exact(token,'/actions/runs?branch='+
   encodeURIComponent(branch)+'&per_page=100');
 if(!Array.isArray(runs.workflow_runs))refuse('INDEPENDENT_CI_RUNS_UNVERIFIED');
 const eligible=r=>r.head_sha===head&&r.head_branch===branch&&
   r.status==='completed'&&['success','failure'].includes(r.conclusion)&&
   Number.isSafeInteger(r.id)&&r.id>10000&&
   r.html_url==='https://github.com/maloney2323/Reality/actions/runs/'+r.id;
 const exactRuns=runs.workflow_runs.filter(r=>eligible(r)&&
   r.name===WORKFLOW_NAME&&r.path===WORKFLOW);
 if(exactRuns.length>1)refuse('AMBIGUOUS_INDEPENDENT_CI_RUN');
 const prFailureRuns=exactRuns.length===0?
   runs.workflow_runs.filter(r=>eligible(r)&&
    r.name==='Reality — Isolated governed OpenAI gateway proof'&&
    r.event==='pull_request'&&r.conclusion==='failure'&&
    /^\\.github\\/workflows\\/[A-Za-z0-9_.-]+\\.ya?ml$/.test(r.path||'')&&
    Array.isArray(r.pull_requests)&&r.pull_requests.some(pr=>
     pr?.head?.sha===head&&pr.head?.ref===branch&&
     pr.base?.ref===baseBranch&&
     pr.head?.repo?.full_name==='maloney2323/Reality'&&
     pr.base?.repo?.full_name==='maloney2323/Reality')):[];
 // Restrict fallback to the latest verified completed run of that exact
 // original SHA; failed reruns never alter the staged source digest.
 prFailureRuns.sort((a,b)=>b.id-a.id);
 const matched=exactRuns.length===1?exactRuns[0]:prFailureRuns[0];
 if(!matched)return response('CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',200,{
   original_work_id:c.original_work_id,model_response_id:c.model_response_id,
   candidate_branch:branch,candidate_commit_sha:head,
   independent_ci_verified:false});
 const run=await exact(token,'/actions/runs/'+matched.id);
 if(run.id!==matched.id||run.head_sha!==head||
    run.head_branch!==branch||run.path!==matched.path||
    run.name!==matched.name||run.status!=='completed'||
    run.conclusion!==matched.conclusion)
  refuse('INDEPENDENT_CI_RUN_IDENTITY_DRIFT');
 const jobs=await exact(token,'/actions/runs/'+run.id+'/jobs?per_page=60');
 if(!Array.isArray(jobs.jobs))refuse('FROZEN_CI_JOB_READBACK_UNVERIFIED');
 const isOriginalFrozen=exactRuns.length===1;
 const relevant=jobs.jobs.filter(j=>j.run_id===run.id&&
   j.name===(isOriginalFrozen?'independent-corrective-frozen':'boundary-tests')&&
   j.status==='completed'&&j.conclusion===run.conclusion&&
   Number.isSafeInteger(j.id)&&Array.isArray(j.steps));
 if(relevant.length!==1)refuse('INDEPENDENT_FROZEN_JOB_VERDICT_REQUIRED');
 const steps=relevant[0].steps;
 if(isOriginalFrozen){
  if(!steps.some(s=>s.name==='Exact candidate source syntax'&&
   s.conclusion==='success')||
   !steps.some(s=>s.name==='Independent original-job continuity and governed handoff acceptance'&&
    (run.conclusion==='success'?s.conclusion==='success':s.conclusion==='failure')))
    refuse('FROZEN_SOURCE_AND_ORIGINAL_ACCEPTANCE_NOT_VERIFIED');
 }else{
  // Fallback is ONLY a verified failed run. Establish that the frozen
  // original-continuation assertions themselves failed, not a lint step or
  // an unrelated error. Never convert this evidence into approval.
  if(run.conclusion!=='failure'||!steps.some(s=>
    s.name==='Verify Reality model boundary and original tool-continuation regressions'&&
    s.conclusion==='failure'))refuse('ORIGINAL_HANDOFF_FAILURE_STEP_NOT_VERIFIED');
  const logURL=ROOT+'/actions/jobs/'+relevant[0].id+'/logs';
  let logsResponse;
  try{logsResponse=await fetch(logURL,{method:'GET',redirect:'follow',
    headers:{authorization:'Bearer '+token,accept:'text/plain',
     'x-github-api-version':'2022-11-28',
     'user-agent':'Reality-Frozen-Corrective-CI-Failure-Verification'},
    signal:AbortSignal.timeout(10000)})}catch{
    refuse('ORIGINAL_HANDOFF_FAILURE_LOGS_UNAVAILABLE')}
  if(!logsResponse?.ok||
     Number(logsResponse.headers.get('content-length')||0)>2000000)
    refuse('ORIGINAL_HANDOFF_FAILURE_LOGS_UNAVAILABLE');
  const logText=await logsResponse.text();
  if(logText.length>2000000||
     !logText.includes('custom trusted original execution uses existing source-backed Reality runner')||
     !logText.includes('full shift step-six connects existing original to SINGLE claim')||
     !logText.includes('ORIGINAL_JOB_UNRESOLVED_NO_UNSAFE_RETRY')||
     !logText.includes('SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF')||
     !logText.includes('not ok '))
    refuse('FROZEN_ORIGINAL_HANDOFF_TEST_FAILURE_NOT_REPRODUCED');
 }
 const saved=await rpc('reality_record_riley_auto_corrective_ci_v1',{
   p_original_work_id:c.original_work_id,
   p_model_response_id:c.model_response_id,
   p_proposed_sha256:c.proposed_sha256,
   p_tested_commit_sha:head,
   p_independent_run_id:run.id,
   p_independent_run_url:run.html_url,
   p_conclusion:run.conclusion
 },key);
 if(saved.status!=='INDEPENDENT_SAME_ORIGINAL_CORRECTIVE_CI_RECORDED'||
    saved.original_work_id!==c.original_work_id||
    saved.shift_id!==c.shift_id||
    saved.ci_conclusion!==run.conclusion||
    saved.installation_authorized!==false||
    saved.original_job_completed!==false||
    saved.production_changed!==false)
   refuse('DURABLE_INDEPENDENT_CI_READBACK_MISSING');
 return response(run.conclusion==='success'?
  'CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED':
  'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN',200,{
    original_work_id:c.original_work_id,candidate_commit_sha:head,
    independent_run_url:run.html_url,independent_ci_verified:true,
    original_job_completed:false,installation_authorized:false});
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))
   return response('SERVICE_JSON_POST_REQUIRED',405);
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(secret.length<24||req.headers.get('apikey')!==secret||
     req.headers.get('authorization')!=='Bearer '+secret)
   return response('SERVICE_AUTH_REQUIRED_NO_GITHUB_EFFECT',403);
  const raw=await req.text();
  if(raw.length>400)refuse('ENVELOPE_TOO_LARGE');
  const body=JSON.parse(raw);
  if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!==
     'action,base_branch,base_sha,version'||body.version!==1||
     body.action!=='stage_or_check'||!SHA.test(body.base_sha||'')||
     !/^reality\/[a-zA-Z0-9/_-]{10,130}$/.test(body.base_branch||'')||
     body.base_branch.includes('..')||body.base_branch.includes('//')||
     body.base_branch.startsWith('reality/riley/'))
    refuse('TRUSTED_ISOLATED_PREVIEW_BASE_ONLY');
  const c=await rpc('reality_read_next_riley_auto_corrective_ci_v1',{},secret);
  if(c.status==='NO_UNTESTED_SAME_ORIGINAL_CORRECTIVE_REVISION'||
     c.status==='NO_CURRENT_OWNER_WARRANTED_CORRECTIVE_CI')
    return response(c.status);
  validClaim(c);
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)
   return response('ISOLATED_GITHUB_CANDIDATE_WRITER_NOT_CONFIGURED',503);
  return await stageOrObserve(c,token,body.base_branch,body.base_sha,secret);
 }catch(error){
  const msg=String(error instanceof Error?error.message:'');
  const code=/^AUTO_CORRECTIVE_[A-Z0-9_]{3,100}$/.test(msg)?
   msg:'AUTO_CORRECTIVE_PROVIDER_OR_DATABASE_UNVERIFIED';
  console.warn('REALITY_CORRECTIVE_CI_BLOCKER',code);
  return response(code,503);
 }
});