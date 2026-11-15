// Single-use preapproval GitHub PUSH transport probe, invoked only by the
// existing service-authenticated worker under the active owner shift.
// A new inert .txt file in src/ tests the postinstall Actions trigger.
// NEVER modifies original runtime source, installs candidate, or settles work.
const GH='https://api.github.com/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const BRANCH=/^reality\/[A-Za-z0-9/_-]{10,135}$/;
const FILE=/^src\/[A-Za-z0-9/_-]+\.js$/;
const INERT=/^src\/reality-ci-transport-probe-[a-f0-9-]{36}\.txt$/;
const CI_NAME='Reality independently accepted governed original post-install';
const CI_PATH='.github/workflows/reality-governed-general-postinstall-original-acceptance-v1.yml';
const ACTION='{"version":1,"action":"prove_isolated_original_acceptance_push_transport"}';
const clean=(status,extra={},http=200)=>new Response(JSON.stringify({
 status,installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false,...extra
}),{status:http,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
const bad=code=>{throw Error('ISOLATED_ORIGINAL_CI_PUSH_'+code)};
async function rpc(url,key,name,input={}){
 if(!['reality_read_general_original_push_probe_v1',
       'reality_claim_general_original_push_probe_v1',
       'reality_record_general_original_push_provider_v1',
       'reality_record_general_original_push_ci_v1'].includes(name))
  bad('RPC_NOT_ALLOWLISTED');
 const r=await fetch(url+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(12000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(input)});
 if(!r.ok)bad('SERVICE_RECEIPT_REJECTED');
 const j=await r.json().catch(()=>null);
 if(!j||typeof j!=='object'||Array.isArray(j))bad('RECEIPT_MALFORMED');
 return j;
}
async function github(token,path,method='GET',body=null){
 const r=await fetch(GH+path,{
  method,cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json','x-github-api-version':'2022-11-28',
   'user-agent':'Reality-governed-original-push-acceptance-preflight'},
  ...(body===null?{}:{body:JSON.stringify(body)})
 });
 const data=await r.json().catch(()=>null);
 return {ok:r.ok,status:r.status,data};
}
async function blobSha(bytes){
 const prefix=new TextEncoder().encode('blob '+bytes.length+'\0');
 const all=new Uint8Array(prefix.length+bytes.length);
 all.set(prefix);all.set(bytes,prefix.length);
 const hex=await crypto.subtle.digest('SHA-1',all);
 return Array.from(new Uint8Array(hex)).map(n=>n.toString(16).padStart(2,'0')).join('');
}
function scoped(x){
 return x&&['EXACT_ISOLATED_PUSH_PROBE_STAGED',
   'EXACT_ISOLATED_PUSH_CI_READBACK_PENDING',
   'EXACT_ISOLATED_PUSH_AND_CI_INDEPENDENTLY_VERIFIED',
   'EXACT_ISOLATED_PUSH_FENCED_OR_UNVERIFIED'].includes(x.status)&&
  WORK.test(x.original_work_id||'')&&UUID.test(x.attempt_id||'')&&
  UUID.test(x.shift_id||'')&&BRANCH.test(x.preflight_branch||'')&&
  !x.preflight_branch.includes('//')&&!x.preflight_branch.includes('..')&&
  FILE.test(x.original_source_path||'')&&
  INERT.test(x.inert_path||'')&&SHA.test(x.expected_preflight_parent_sha||'')&&
  SHA.test(x.original_source_blob_sha||'')&&
  x.installation_authorized===false&&x.source_installed===false&&
  x.original_job_completed===false&&x.production_changed===false;
}
async function main(){
 return Deno.serve(async req=>{
  try{
   if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
    return clean('SIGNED_PREVIEW_WORKER_POST_ONLY',{},405);
   if(await req.text()!==ACTION)return clean('EXACT_ISOLATED_ACTION_REQUIRED',{},400);
   const key=req.headers.get('apikey')||'';
   if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
    return clean('SERVICE_ROLE_TOKEN_REQUIRED',{},403);
   const raw=Deno.env.get('SUPABASE_URL')||'';
   let u;
   try{u=new URL(raw)}catch{return clean('EXACT_ISOLATED_PROJECT_REQUIRED',{},503)}
   if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||
     u.pathname!=='/'||u.search||u.hash)
    return clean('EXACT_ISOLATED_PROJECT_REQUIRED',{},503);
   const scope=await rpc(u.origin,key,'reality_read_general_original_push_probe_v1');
   if(scope.status==='NO_CURRENT_AUTHORIZED_PUSH_PROBE')return clean(scope.status);
   if(!scoped(scope))bad('CURRENT_OWNER_ORIGINAL_SCOPE_DRIFT');
   if(scope.status==='EXACT_ISOLATED_PUSH_AND_CI_INDEPENDENTLY_VERIFIED')
    return clean(scope.status,{original_work_id:scope.original_work_id,
      github_commit_sha:scope.github_commit_sha,push_ci_run_id:scope.push_ci_run_id,
      independent_push_acceptance_verified:true});
   if(scope.status==='EXACT_ISOLATED_PUSH_FENCED_OR_UNVERIFIED')
    return clean('ONE_SHOT_GITHUB_PUSH_EFFECT_UNVERIFIED_NO_RETRY');
   const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
   if(token.length<25)return clean('ISOLATED_GITHUB_BROKER_CREDENTIAL_UNVERIFIED');
   const branch=scope.preflight_branch;
   const sourceQuery='/contents/'+scope.original_source_path+'?ref='+encodeURIComponent(branch);
   const inertQuery='/contents/'+scope.inert_path+'?ref='+encodeURIComponent(branch);
   if(scope.status==='EXACT_ISOLATED_PUSH_PROBE_STAGED'){
    const [ref,sourceFile,missing]=await Promise.all([
     github(token,'/git/ref/heads/'+branch),github(token,sourceQuery),
     github(token,inertQuery)
    ]);
    if(!ref.ok||ref.data?.ref!=='refs/heads/'+branch||
      ref.data?.object?.sha!==scope.expected_preflight_parent_sha||
      !sourceFile.ok||sourceFile.data?.sha!==scope.original_source_blob_sha||
      missing.status!==404)
     return clean('ISOLATED_PREFLIGHT_SOURCE_OR_BRANCH_DRIFT_NO_EFFECT');
    const fenced=await rpc(u.origin,key,'reality_claim_general_original_push_probe_v1',{
     p_attempt_id:scope.attempt_id,
     p_current_parent_sha:scope.expected_preflight_parent_sha,
     p_current_source_blob_sha:scope.original_source_blob_sha
    });
    if(fenced.status!=='EXACT_ISOLATED_PUSH_ONE_USE_FENCED'||
      fenced.original_work_id!==scope.original_work_id||
      fenced.attempt_id!==scope.attempt_id||
      fenced.preflight_branch!==branch||
      fenced.inert_path!==scope.inert_path||
      fenced.expected_preflight_parent_sha!==scope.expected_preflight_parent_sha||
      fenced.original_source_blob_sha!==scope.original_source_blob_sha||
      fenced.installation_authorized!==false||fenced.source_installed!==false||
      fenced.original_job_completed!==false||fenced.production_changed!==false)
     bad('ONE_USE_FENCE_IDENTITY_MISMATCH');
    async function record(success,commit=null,blob=null){
     const r=await rpc(u.origin,key,'reality_record_general_original_push_provider_v1',{
      p_attempt_id:scope.attempt_id,p_success:success,
      p_commit_sha:commit,p_blob_sha:blob
     });
     if(r.status!==(success?'EXACT_ISOLATED_SOURCE_PATH_PUSH_PROVIDER_VERIFIED':
       'EXACT_ISOLATED_PUSH_EFFECT_UNVERIFIED')||
       r.original_work_id!==scope.original_work_id||
       r.installation_authorized!==false||r.source_installed!==false||
       r.original_job_completed!==false||r.production_changed!==false)
      bad('ONE_SHOT_WRITE_RECEIPT_NOT_VERIFIED');
     return clean(r.status,{original_work_id:scope.original_work_id,
      github_commit_sha:success?commit:null,push_ci_pending:success,
      independent_push_acceptance_verified:false});
    }
    const still=await github(token,'/git/ref/heads/'+branch);
    if(!still.ok||still.data?.object?.sha!==scope.expected_preflight_parent_sha)
     return record(false);
    const content=JSON.stringify({
     schema:'reality-isolated-source-path-ci-push-transport-v1',
     original_work_id:scope.original_work_id,attempt_id:scope.attempt_id,
     shift_id:scope.shift_id,preflight_branch:branch,
     unchanged_original_source_blob:scope.original_source_blob_sha,
     repair_source_installed:false,owner_approval_given:false,
     original_job_completed:false,production_changed:false
    },null,2)+'\n';
    const digest=await blobSha(new TextEncoder().encode(content));
    // The ONLY source-path GitHub write: inert .txt file, with a single-use
    // durable fence, on the separate PR preflight branch (NOT install branch).
    let write;
    try{write=await github(token,'/contents/'+scope.inert_path,'PUT',{
     message:'test(reality): governed original acceptance push preflight only',
     branch,content:btoa(content)
    })}catch{return record(false)}
    const sha=write.data?.commit?.sha;
    if(!write.ok||write.status!==201||!SHA.test(sha||'')||
      write.data?.content?.sha!==digest)return record(false);
    const [afterRef,afterSource,afterInert,afterCommit]=await Promise.all([
     github(token,'/git/ref/heads/'+branch),github(token,sourceQuery),
     github(token,inertQuery),github(token,'/commits/'+sha)
    ]);
    let text='';
    try{text=atob(String(afterInert.data?.content||'').replace(/\s/g,''))}
    catch{return record(false)}
    if(afterRef.data?.object?.sha!==sha||
      afterSource.data?.sha!==scope.original_source_blob_sha||
      afterInert.data?.sha!==digest||text!==content||
      !Array.isArray(afterCommit.data?.parents)||
      afterCommit.data.parents.length!==1||
      afterCommit.data.parents[0]?.sha!==scope.expected_preflight_parent_sha||
      !Array.isArray(afterCommit.data?.files)||
      afterCommit.data.files.length!==1||
      afterCommit.data.files[0].filename!==scope.inert_path||
      afterCommit.data.files[0].status!=='added')
     return record(false);
    return record(true,sha,digest);
   }
   if(scope.status!=='EXACT_ISOLATED_PUSH_CI_READBACK_PENDING'||
      !SHA.test(scope.github_commit_sha||'')||!SHA.test(scope.inert_blob_sha||''))
    bad('PROVIDER_WRITE_NOT_ATTESTED');
   const sha=scope.github_commit_sha;
   const [ref,original,inert,list]=await Promise.all([
    github(token,'/git/ref/heads/'+branch),github(token,sourceQuery),
    github(token,inertQuery),
    github(token,'/actions/runs?head_sha='+sha+'&event=push&per_page=100')
   ]);
   if(ref.data?.object?.sha!==sha||
     original.data?.sha!==scope.original_source_blob_sha||
     inert.data?.sha!==scope.inert_blob_sha||
     !Array.isArray(list.data?.workflow_runs))
    return clean('GOVERNED_PUSH_BRANCH_OR_PROVIDER_EVIDENCE_DRIFT');
   const eligible=list.data.workflow_runs.filter(r=>
     r.name===CI_NAME&&r.head_sha===sha&&r.head_branch===branch&&
     r.event==='push'&&r.path?.split('@')[0]===CI_PATH&&
     r.status==='completed'&&r.conclusion==='success'&&
     Number.isSafeInteger(r.id)&&r.id>10000);
   if(eligible.length!==1)
    return clean('GOVERNED_PUSH_INDEPENDENT_ACCEPTANCE_PENDING_OR_UNVERIFIED',{
      original_work_id:scope.original_work_id,github_commit_sha:sha});
   const runId=eligible[0].id;
   const jobs=await github(token,'/actions/runs/'+runId+'/jobs?per_page=100');
   const matches=(jobs.data?.jobs||[]).filter(j=>
    j.name==='independent-original-acceptance'&&
    j.status==='completed'&&j.conclusion==='success'&&
    Array.isArray(j.steps)&&
    ['Checkout exact installed source commit with credentials disabled',
    'Verify isolated preview commit and source tree identity',
    'Independently accept original-job runtime and governed handoff',
    'Independently verify same-original frozen-CI and recovery safeguards',
    'Confirm no upgrade installation or customer settlement from CI']
     .every(name=>j.steps.some(s=>s.name===name&&s.conclusion==='success')));
   if(!jobs.ok||matches.length!==1)
    return clean('GOVERNED_PUSH_PROVIDER_JOB_STEPS_NOT_ACCEPTED');
   const receipt=await rpc(u.origin,key,'reality_record_general_original_push_ci_v1',{
    p_attempt_id:scope.attempt_id,p_commit_sha:sha,p_run_id:runId
   });
   if(receipt.status!=='EXACT_ISOLATED_PUSH_AND_CI_INDEPENDENTLY_VERIFIED'||
     receipt.original_work_id!==scope.original_work_id||
     receipt.github_commit_sha!==sha||receipt.push_ci_run_id!==runId||
     receipt.installation_authorized!==false||receipt.source_installed!==false||
     receipt.original_job_completed!==false||receipt.production_changed!==false)
    bad('INDEPENDENT_ACCEPTANCE_DURABLE_RECEIPT_DRIFT');
   return clean(receipt.status,{original_work_id:scope.original_work_id,
    github_commit_sha:sha,push_ci_run_id:runId,
    independent_push_acceptance_verified:true});
  }catch(error){
   const m=String(error instanceof Error?error.message:'');
   return clean(/^ISOLATED_ORIGINAL_CI_PUSH_[A-Z0-9_]{5,95}$/.test(m)?
    m:'GOVERNED_ISOLATED_PUSH_PROVIDER_OR_SERVICE_UNVERIFIED',{},503);
  }
 });
}
main();
