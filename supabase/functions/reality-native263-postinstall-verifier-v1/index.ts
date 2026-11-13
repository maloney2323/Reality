// Reality native #263 independent release-path + post-install verifier.
// Provider evidence is fetched by the privileged Reality broker. The
// current signed Vercel preview worker submits its own environment Git SHA;
// no browser/model-controlled jobs, run IDs or external effects are accepted.
// The owner must separately approve the exact frozen upgrade in Reality Chat.
const PROJECT='hvkfreoagbrphwghjajw';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const ORIG='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const REPO_BRANCH='reality/isolated-openai-governance-gateway-20261108';
const SRC='src/reality-riley-service-original-runtime-v1.js';
const CI_NAME='Reality — Isolated governed OpenAI gateway proof';
const ACCEPT_NAME='Reality · #263 independent post-install original acceptance';
const WORKFLOW='.github/workflows/reality-native263-postinstall-original-acceptance-v1.yml';
const WORKFLOW_BLOB='0b3b5ed4057c6f502f22a4489913fe7ef21c7e5d';
const NEW_BLOB='dda8e71d44cca6745312bcbd000089d5a0b01d54';
const OLD_BLOB='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0';
const CANDIDATE='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const ARTIFACT='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const HEX40=/^[a-f0-9]{40}$/;
const bad=x=>{throw Error('NATIVE263_POSTINSTALL_'+x)};
function answer(status,data={},code=200){
 return new Response(JSON.stringify({
  status,original_work_id:ORIG,shift_id:SHIFT,
  production_changed:false,...data
 }),{status:code,headers:{'content-type':'application/json',
  'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
async function rpc(name,input,key){
 if(![
  'reality_read_native263_postinstall_context_v1',
  'reality_attest_native263_install_continuation_path_v1',
  'reality_settle_native263_original_after_independent_provider_v1'
 ].includes(name))bad('RPC_SCOPE_REJECTED');
 const r=await fetch('https://'+PROJECT+'.supabase.co/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{apikey:key,authorization:'Bearer '+key,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(input)});
 if(!r.ok)bad('DURABLE_ORIGINAL_RECEIPT_OR_AUTH_UNAVAILABLE');
 const data=await r.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  bad('REALITY_RECEIPT_READBACK_INVALID');
 return data;
}
async function git(path,token){
 if(!(
  path==='/actions/runs/42525028367'||
  path==='/contents/'+SRC+'?ref='+encodeURIComponent(REPO_BRANCH)||
  path==='/contents/'+SRC+'?ref='+CANDIDATE||
  path==='/contents/'+WORKFLOW+'?ref='+encodeURIComponent(REPO_BRANCH)||
  path==='/git/ref/heads/'+REPO_BRANCH||
  /^\/actions\/runs\?head_sha=[a-f0-9]{40}&per_page=100$/.test(path)
 ))bad('GITHUB_READ_RESOURCE_SCOPE_REJECTED');
 const headers:any={
  accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28',
  'user-agent':'Reality-Native263-Independent-CI-Receipt-Verifier'};
 if(token.length>=25)headers.authorization='Bearer '+token;
 const fetchOne=async useAuth=>{
  const h={...headers};
  if(!useAuth)delete h.authorization;
  return await fetch(ROOT+path,{method:'GET',cache:'no-store',
   redirect:'error',signal:AbortSignal.timeout(13000),headers:h});
 };
 let r=await fetchOne(token.length>=25);
 // Public Github repo can provide read-only CI evidence without additional
 // Actions permission. Confirm anonymous PUBLIC repository separately before
 // accepting the fallback; do not bypass private-repo authorization.
 if((r.status===401||r.status===403) &&path.startsWith('/actions/')){
  const repo=await fetch(ROOT,{
   method:'GET',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(12000),
   headers:{accept:'application/vnd.github+json',
    'user-agent':'Reality-Native263-Public-Provider-Readback'}});
  const info=await repo.json().catch(()=>null);
  if(repo.ok&&info?.full_name==='maloney2323/Reality'&&
     info.private===false&&info.archived===false)
   r=await fetchOne(false);
 }
 if(!r.ok)bad('GITHUB_VERIFIED_PROVIDER_READ_UNAVAILABLE_'+r.status);
 const data=await r.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  bad('GITHUB_PROVIDER_RESPONSE_INVALID');
 return data;
}
async function hash256(bytes:Uint8Array){
 const h=await crypto.subtle.digest('SHA-256',bytes);
 return 'sha256:'+Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function checkedFile(path:string,token:string,expectedBlob:string){
 const f=await git(path,token);
 if(!HEX40.test(f.sha||'')||f.sha!==expectedBlob||
  f.encoding!=='base64'||typeof f.content!=='string'||
  !Number.isSafeInteger(f.size)||f.size<80||f.size>50000)
  bad('GITHUB_FROZEN_FILE_SHA_OR_ENCODING_DRIFT');
 const b64=f.content.replace(/\s/g,'');
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))bad('BAD_PROVIDER_FILE_ENCODING');
 let binary;
 try{binary=atob(b64)}catch{bad('PROVIDER_FILE_BASE64_INVALID')}
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 if(bytes.length!==f.size)bad('PROVIDER_FILE_LENGTH_MISMATCH');
 const pre=new TextEncoder().encode('blob '+bytes.length+'\0');
 const all=new Uint8Array(pre.length+bytes.length);
 all.set(pre);all.set(bytes,pre.length);
 const gitsha=await crypto.subtle.digest('SHA-1',all);
 const actual=Array.from(new Uint8Array(gitsha)).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(actual!==expectedBlob)bad('PROVIDER_BLOB_INDEPENDENT_HASH_MISMATCH');
 return bytes;
}
async function workflowRuns(sha:string,token:string){
 const data=await git('/actions/runs?head_sha='+sha+'&per_page=100',token);
 if(!Array.isArray(data.workflow_runs)||data.workflow_runs.length>100)
  bad('GITHUB_ACTIONS_RUN_COLLECTION_UNTRUSTED');
 return data.workflow_runs.filter((r:any)=>
  r?.head_sha===sha&&r?.head_branch===REPO_BRANCH&&
  r?.event==='push'&&r?.status==='completed'&&
  r?.conclusion==='success'&&
  r?.repository?.full_name==='maloney2323/Reality'&&
  Number.isSafeInteger(r.id)&&r.id>10000);
}
function matchRun(runs:any[],name:string){
 const a=runs.filter(r=>r.name===name);
 if(a.length!==1)bad('DISTINCT_INDEPENDENT_GITHUB_CI_RUN_REQUIRED_'+(name===CI_NAME?'MAIN':'ORIGINAL'));
 return a[0].id as number;
}
async function main(req:Request){
 if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
  return answer('SERVICE_POST_JSON_REQUIRED',{},405);
 const txt=await req.text();
 let input:any;try{input=JSON.parse(txt)}catch{return answer('EXACT_ACTION_JSON_REQUIRED',{},400)}
 if(!input||typeof input!=='object'||Array.isArray(input)||
  !['verify_release_path','verify_postinstall_original'].includes(input.action)||
  input.version!==1||!HEX40.test(input.deployed_sha||'')||
  Object.keys(input).sort().join(',')!=='action,deployed_sha,version'||
  txt.length>260) return answer('EXACT_SINGLE_ORIGINAL_PROVIDER_ACTION_REQUIRED',{},400);
 const key=req.headers.get('apikey')||'';
 if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
  return answer('REALITY_INTERNAL_SERVICE_ROLE_REQUIRED',{},403);
 const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 const context=await rpc('reality_read_native263_postinstall_context_v1',{},key);
 if(context.status!=='NATIVE263_ORIGINAL_POSTINSTALL_READONLY_CONTEXT'||
  context.original_work_id!==ORIG||context.shift_id!==SHIFT||
  context.candidate_commit_sha!==CANDIDATE||
  context.candidate_artifact_sha256!==ARTIFACT||
  context.frozen_verifier_run_id!==42525028367||
  context.target_branch!==REPO_BRANCH||context.target_path!==SRC||
  context.expected_installed_blob_sha!==NEW_BLOB||
  context.production_changed!==false)
  bad('FROZEN_REALITY_OWNER_ORIGINAL_SCOPE_MISMATCH');
 const run=await git('/actions/runs/42525028367',token);
 if(run.id!==42525028367||run.status!=='completed'||
  run.conclusion!=='success'||run.head_sha!==CANDIDATE)
  bad('FROZEN_INDEPENDENT_CANDIDATE_VERIFIER_NOT_SUCCESSFUL');
 const releaseSha=input.deployed_sha;
 if(input.action==='verify_release_path'){
  if(context.state!=='STAGED_UNAPPROVED'||
   context.approval_receipt_id!==null||
   context.installed_commit_sha!==null||
   context.original_phase!=='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'||
   context.original_installed!==false)
   return answer('NATIVE263_RELEASE_PREAPPROVAL_SCOPE_NOT_ELIGIBLE',{
    owner_approval_ready:false,installation_authorized:false});
  const source=await checkedFile('/contents/'+SRC+'?ref='+encodeURIComponent(REPO_BRANCH),
   token,OLD_BLOB);
  if(source.length<500)bad('CURRENT_UNINSTALLED_SOURCE_NOT_CURRENT');
  const workflow=await checkedFile('/contents/'+WORKFLOW+'?ref='+encodeURIComponent(REPO_BRANCH),
   token,WORKFLOW_BLOB);
  const wf=new TextDecoder('utf-8',{fatal:true}).decode(workflow);
  if(!wf.includes('reality/isolated-openai-governance-gateway-20261108')||
    !wf.includes('test/reality-riley-service-original-runtime-v1.test.js')||
    !wf.includes('test/reality-frozen-regressions/riley-live-original-shift-dispatch.test.js')||
    !wf.includes(NEW_BLOB)||!wf.includes(ARTIFACT.slice('sha256:'.length)))
   bad('NATIVE_ORIGINAL_ACCEPTANCE_WORKFLOW_NOT_FROZEN');
  const ref=await git('/git/ref/heads/'+REPO_BRANCH,token);
  if(ref.ref!=='refs/heads/'+REPO_BRANCH||
     ref.object?.sha!==releaseSha) return answer('RELEASE_DEPLOYMENT_BRANCH_DRIFT',{
      owner_approval_ready:false,installation_authorized:false});
  const runs=await workflowRuns(releaseSha,token);
  const ciRun=matchRun(runs,CI_NAME);
  const receipt=await rpc('reality_attest_native263_install_continuation_path_v1',{
   p_release_commit_sha:releaseSha,p_release_ci_run_id:ciRun},key);
  if(receipt.status!=='NATIVE263_CONTINUATION_AND_RECEIPT_PATH_INDEPENDENTLY_TESTED_READY'||
   receipt.original_work_id!==ORIG||receipt.shift_id!==SHIFT||
   receipt.release_commit_sha!==releaseSha||
   receipt.release_ci_run_id!==ciRun||
   receipt.owner_approval_ready!==true||
   receipt.owner_approval_recorded!==false||
   receipt.installation_authorized!==false||
   receipt.original_job_completed!==false||receipt.production_changed!==false)
   bad('RELEASE_READINESS_WARRANT_READBACK_FAILED');
  return answer('NATIVE263_EXACT_OWNER_APPROVAL_NOW_READY',{
   owner_approval_ready:true,approval_recorded:false,
   installation_authorized:false,
   original_job_completed:false,
   independently_verified_release_commit_sha:releaseSha,
   independent_release_ci_run_id:ciRun,
   actual_original_settlement_recorded:false
  });
 }
 // Only the deployed Reality preview of the exact installed commit may call
 // this action. Stable branch-alias worker supplies its own Vercel env SHA.
 if(context.state==='ORIGINAL_SETTLED')
  return answer('NATIVE263_ORIGINAL_ALREADY_INDEPENDENTLY_SETTLED_NO_REPLAY',{
   original_final_receipt_id:context.original_final_receipt_id,
   original_job_completed:true});
 if(context.state!=='SOURCE_INSTALLED'||
   context.installed_commit_sha!==releaseSha||
   !context.approval_receipt_id||!context.owner_approved_at)
  return answer('NATIVE263_POSTINSTALL_ORIGINAL_NOT_READY_FOR_SETTLEMENT',{
   original_job_completed:false});
 const ref=await git('/git/ref/heads/'+REPO_BRANCH,token);
 if(ref.ref!=='refs/heads/'+REPO_BRANCH||ref.object?.sha!==releaseSha)
  return answer('NATIVE263_DEPLOYED_BRANCH_COMMIT_DRIFT',{
   original_job_completed:false});
 const src=await checkedFile('/contents/'+SRC+'?ref='+encodeURIComponent(REPO_BRANCH),
  token,NEW_BLOB);
 if(await hash256(src)!==ARTIFACT)
  bad('INSTALLED_FROZEN_NATIVE_BYTES_HASH_MISMATCH');
 const runs=await workflowRuns(releaseSha,token);
 const mainCi=matchRun(runs,CI_NAME);
 const originalCi=matchRun(runs,ACCEPT_NAME);
 if(mainCi===originalCi)bad('POSTINSTALL_PROVIDER_PROOF_NOT_INDEPENDENT');
 const digest=await hash256(new TextEncoder().encode(
  'reality-native263-final-original-v1|'+
  ORIG+'|'+context.approval_receipt_id+'|'+releaseSha+
  '|main:'+mainCi+'|original:'+originalCi+'|'+ARTIFACT+'|'+NEW_BLOB));
 const receipt=await rpc('reality_settle_native263_original_after_independent_provider_v1',{
  p_installed_commit_sha:releaseSha,p_installed_provider_run_id:mainCi,
  p_original_execution_run_id:originalCi,p_final_evidence_sha256:digest},key);
 if(receipt.status!=='NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED'||
    receipt.original_work_id!==ORIG||receipt.shift_id!==SHIFT||
    receipt.installed_commit_sha!==releaseSha||
    receipt.independent_install_ci_run_id!==mainCi||
    receipt.independent_original_execution_run_id!==originalCi||
    receipt.final_receipt_sha256!==digest||
    !/^[a-f0-9-]{36}$/.test(receipt.original_final_receipt_id||'')||
    receipt.original_job_completed!==true||
    receipt.production_changed!==false)
  bad('NATIVE263_FINAL_RECEIPT_INDEPENDENT_READBACK_UNVERIFIED');
 return answer('NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED',{
  original_job_completed:true,
  original_final_receipt_id:receipt.original_final_receipt_id,
  installed_commit_sha:releaseSha,
  independent_main_ci_run_id:mainCi,
  independent_original_acceptance_run_id:originalCi,
  final_receipt_sha256:digest
 });
}
Deno.serve(async req=>{
 try{return await main(req)}
 catch(e){
  const msg=e instanceof Error?e.message:'';
  const status=/^NATIVE263_POSTINSTALL_[A-Z0-9_]{4,115}$/.test(msg)?
   msg.slice('NATIVE263_POSTINSTALL_'.length):
   'NATIVE263_INDEPENDENT_PROVIDER_OR_RECEIPT_BLOCKED';
  return answer(status,{original_job_completed:false,
   owner_approval_ready:false},503);
 }
});
