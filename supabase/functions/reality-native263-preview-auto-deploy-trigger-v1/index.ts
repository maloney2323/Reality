// One inert GitHub push by Reality's existing governed service. Purpose:
// verify existing GitHub Actions + linked Vercel preview auto-deployment.
// NO approval, candidate installation, production push, or extra credential.
const PROJECT='hvkfreoagbrphwghjajw';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const BRANCH='reality/isolated-openai-governance-gateway-20261108';
const PATH='evidence/native263-active-preview-auto-deploy-probe-20261112.json';
const SOURCE='src/reality-riley-service-original-runtime-v1.js';
const SOURCE_BLOB='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const SHA=/^[a-f0-9]{40}$/;
const err=code=>{throw Error('AUTO_DEPLOY_PROBE_'+code)};
function reply(status,details={},http=200){
 return new Response(JSON.stringify({
  status,original_work_id:WORK,shift_id:SHIFT,
  installation_authorized:false,source_installed:false,
  original_job_completed:false,production_changed:false,
  ...details
 }),{status:http,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
async function rpc(name,args,key){
 if(!['reality_claim_native263_preview_auto_deploy_probe_v1',
       'reality_record_native263_preview_auto_deploy_probe_v1'].includes(name))
  err('RPC_OUT_OF_SCOPE');
 const r=await fetch('https://'+PROJECT+'.supabase.co/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args)});
 if(!r.ok)err('DURABLE_OWNER_PROBE_WARRANT_REJECTED');
 const x=await r.json().catch(()=>null);
 if(!x||typeof x!=='object'||Array.isArray(x))err('LEDGER_READBACK_INVALID');
 return x;
}
async function github(token,path,method='GET',body){
 const ref='/git/ref/heads/'+BRANCH;
 const pathQuery='/contents/'+PATH+'?ref='+encodeURIComponent(BRANCH);
 const srcQuery='/contents/'+SOURCE+'?ref='+encodeURIComponent(BRANCH);
 if(!((method==='GET'&&[ref,pathQuery,srcQuery].includes(path))||
  (method==='PUT'&&path==='/contents/'+PATH)))
  err('GITHUB_RESOURCE_OR_METHOD_OUT_OF_SCOPE');
 let r;
 try{
  r=await fetch(ROOT+path,{
   method,cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(14000),
   headers:{authorization:'Bearer '+token,
    accept:'application/vnd.github+json',
    'content-type':'application/json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-Governed-Preview-AutoDeploy-Trigger-Probe'},
   body:body===undefined?undefined:JSON.stringify(body)});
 }catch{err('GITHUB_PROVIDER_EFFECT_UNCERTAIN')}
 const json=await r.json().catch(()=>null);
 if(method==='GET'&&path===pathQuery&&r.status===404)
  return {status:404,data:null};
 if(method==='GET'&&!r.ok)err('GITHUB_SOURCE_READBACK_UNVERIFIED');
 return {status:r.status,data:json};
}
async function gitBlob(bytes){
 const prefix=new TextEncoder().encode('blob '+bytes.length+'\0');
 const full=new Uint8Array(prefix.length+bytes.length);
 full.set(prefix);full.set(bytes,prefix.length);
 const sha=await crypto.subtle.digest('SHA-1',full);
 return Array.from(new Uint8Array(sha))
  .map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function preflight(token){
 const [head,file,source]=await Promise.all([
  github(token,'/git/ref/heads/'+BRANCH),
  github(token,'/contents/'+PATH+'?ref='+encodeURIComponent(BRANCH)),
  github(token,'/contents/'+SOURCE+'?ref='+encodeURIComponent(BRANCH))
 ]);
 if(head.data?.ref!=='refs/heads/'+BRANCH||
  !SHA.test(head.data?.object?.sha||'')||
  source.data?.path!==SOURCE||source.data?.sha!==SOURCE_BLOB)
  err('CURRENT_PREVIEW_OR_ORIGINAL_SOURCE_DRIFT');
 if(file.status!==404)
  err('INERT_PROBE_FILE_ALREADY_EXISTS_NO_WRITE');
 return head.data.object.sha;
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return reply('SERVICE_JSON_POST_REQUIRED',{},405);
  if(await req.text()!=='{"version":1,"action":"probe_existing_preview_auto_deploy"}')
   return reply('EXACT_FIXED_GOVERNED_PROBE_REQUIRED',{},400);
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return reply('SERVICE_ROLE_IDENTITY_REQUIRED',{},403);
  // Once already claimed, NO provider POST again. A later caller may only
  // read the private durable receipt via the same RPC.
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)return reply('EXISTING_BROKER_GITHUB_WRITER_NOT_CONFIGURED');
  // Inert probe only; exact preview branch and original file baseline verified.
  const before=await preflight(token);
  const claim=await rpc('reality_claim_native263_preview_auto_deploy_probe_v1',{
   p_preview_head_sha:before},key);
  if(claim.status!=='EXACT_INERT_ACTIVE_PREVIEW_DEPLOY_PROBE_CLAIMED'){
   if(claim.status!=='EXISTING_ACTIVE_PREVIEW_PROBE_FENCED_NO_REPOST'||
      claim.original_work_id!==WORK||claim.shift_id!==SHIFT)
    err('DURABLE_PROBE_CLAIM_IDENTITY_CHANGED');
   return reply('ACTIVE_PREVIEW_PROBE_ALREADY_FENCED_NO_REPOST',{
    claim_state:claim.state,
    github_commit_sha:claim.provider_commit_sha||null,
    github_http_status:claim.provider_http_status||null,
    git_write_verified:claim.result_status==='GITHUB_COMMIT_READBACK_VERIFIED',
    automatic_vercel_deployment_verified:false});
  }
  if(claim.original_work_id!==WORK||claim.shift_id!==SHIFT||
     claim.preview_before_sha!==before||
     claim.installation_authorized!==false||
     claim.source_installed!==false||
     claim.original_job_completed!==false||
     claim.production_changed!==false)err('OWNER_CLAIM_READBACK_MISMATCH');
  async function finish(result,http=null,commit=null,blob=null){
   const d=await rpc('reality_record_native263_preview_auto_deploy_probe_v1',{
    p_result_status:result,p_provider_http_status:http,
    p_provider_commit_sha:commit,p_provider_blob_sha:blob},key);
   if(d.status!=='NATIVE263_AUTO_DEPLOY_GITHUB_TRIGGER_EVIDENCE_RECORDED'||
      d.original_work_id!==WORK||d.shift_id!==SHIFT||
      d.result_status!==result||
      d.installation_authorized!==false||d.source_installed!==false||
      d.original_job_completed!==false||d.production_changed!==false)
    err('FINAL_LEDGER_RECEIPT_INVALID');
   return reply(result==='GITHUB_COMMIT_READBACK_VERIFIED'?
    'REALITY_GOVERNED_PREVIEW_GIT_PUSH_VERIFIED':
    'REALITY_GOVERNED_PREVIEW_GIT_PUSH_BLOCKED',{
     git_write_verified:result==='GITHUB_COMMIT_READBACK_VERIFIED',
     github_commit_sha:commit,github_http_status:http,
     automatic_vercel_deployment_verified:false,
     github_actions_trigger_verified:false,
     probe_file:PATH
    });
  }
  let lastRef;
  try{lastRef=await github(token,'/git/ref/heads/'+BRANCH)}
  catch{return await finish('GITHUB_SOURCE_READBACK_UNVERIFIED')}
  if(lastRef.data?.object?.sha!==before)
   return await finish('GITHUB_BRANCH_OR_SOURCE_DRIFT');
  const data=JSON.stringify({
   schema:'reality-inert-active-preview-auto-deploy-trigger-v1',
   original_work_id:WORK,original_shift_id:SHIFT,
   expected_parent_sha:before,
   event:'verify GitHub push -> Actions -> Vercel existing integration',
   owner_upgrade_approved:false,source_code_installed:false,
   production_changed:false,original_job_completed:false
  },null,2)+'\n';
  let written;
  try{
   written=await github(token,'/contents/'+PATH,'PUT',{
    message:'test(reality): governed inert preview deployment trigger; no installation',
    branch:BRANCH,content:btoa(data)});
  }catch{return await finish('GITHUB_PROVIDER_EFFECT_UNCERTAIN')}
  if(written.status!==201)
   return await finish(written.status===403?'GITHUB_WRITE_HTTP_403':
    'GITHUB_WRITE_HTTP_REJECTED',written.status);
  const commit=written.data?.commit?.sha;
  const blob=written.data?.content?.sha;
  if(!SHA.test(commit||'')||!SHA.test(blob||''))
   return await finish('GITHUB_PROVIDER_EFFECT_UNCERTAIN');
  let head,file,src;
  try{
   [head,file,src]=await Promise.all([
    github(token,'/git/ref/heads/'+BRANCH),
    github(token,'/contents/'+PATH+'?ref='+encodeURIComponent(BRANCH)),
    github(token,'/contents/'+SOURCE+'?ref='+encodeURIComponent(BRANCH))
   ]);
  }catch{return await finish('GITHUB_PROVIDER_EFFECT_UNCERTAIN')}
  let body;
  try{body=atob(file.data?.content?.replace(/\s/g,'')||'')}
  catch{return await finish('GITHUB_PROVIDER_EFFECT_UNCERTAIN')}
  if(head.data?.object?.sha!==commit||file.data?.path!==PATH||
     file.data?.sha!==blob||src.data?.sha!==SOURCE_BLOB||
     body!==data||
     await gitBlob(new TextEncoder().encode(data))!==blob)
   return await finish('GITHUB_PROVIDER_EFFECT_UNCERTAIN');
  return await finish('GITHUB_COMMIT_READBACK_VERIFIED',201,commit,blob);
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const status=/^AUTO_DEPLOY_PROBE_[A-Z0-9_]{4,120}$/.test(raw)?
   raw.slice('AUTO_DEPLOY_PROBE_'.length):
   'EXACT_AUTO_DEPLOY_PROBE_UNVERIFIED';
  return reply(status,{},503);
 }
});
