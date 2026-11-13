// Exact native existing-file installer controlled by Reality's immutable
// owner-approved warrant. The LLM and chat client never receive GitHub tokens.
// It CANNOT use the current shift's Start authorization as install approval.
// A provider effect is FENCED before the sole PUT; uncertainty is GET-only.
const PROJECT='hvkfreoagbrphwghjajw';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const ORIGINAL='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const BRANCH='reality/isolated-openai-governance-gateway-20261108';
const PATH='src/reality-riley-service-original-runtime-v1.js';
const CANDIDATE='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const SHA256='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const OLD_BLOB='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0';
const NEW_BLOB='dda8e71d44cca6745312bcbd000089d5a0b01d54';
const SAFE={original_work_id:ORIGINAL,shift_id:SHIFT,
 original_job_completed:false,production_changed:false,
 deployment_verified:false,original_final_receipt_recorded:false};
const hex=/^[a-f0-9]{40}$/;
const fail=x=>{throw Error('NATIVE263_INSTALL_'+x)};
function respond(status,code=200,details={}){
 return new Response(JSON.stringify({status,...SAFE,...details}),{
  status:code,headers:{'content-type':'application/json',
  'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
async function rpc(name,input,key){
 if(![
  'reality_claim_exact_native263_install_v1',
  'reality_attest_exact_native263_installed_source_v1'
 ].includes(name))fail('RPC_NOT_ALLOWED');
 const r=await fetch('https://'+PROJECT+'.supabase.co/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(12000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(input)});
 if(!r.ok)fail('OWNER_WARRANT_OR_SERVICE_AUTH_UNVERIFIED');
 const x=await r.json().catch(()=>null);
 if(!x||typeof x!=='object'||Array.isArray(x))
  fail('DURABLE_INSTALL_RECEIPT_INVALID');
 return x;
}
async function gh(path,token,method='GET',body){
 const ref='/git/ref/heads/'+BRANCH;
 const current='/contents/'+PATH+'?ref='+encodeURIComponent(BRANCH);
 const candidate='/contents/'+PATH+'?ref='+CANDIDATE;
 const write='/contents/'+PATH;
 if(!((method==='GET'&&[ref,current,candidate].includes(path))||
       (method==='PUT'&&path===write)))
  fail('GITHUB_RESOURCE_OR_METHOD_OUT_OF_SCOPE');
 const r=await fetch(ROOT+path,{
  method,cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(12000),
  headers:{authorization:'Bearer '+token,
   accept:'application/vnd.github+json',
   'content-type':'application/json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Fenced-Native263-Installer'},
  body:body===undefined?undefined:JSON.stringify(body)});
 let json=null;
 try{json=await r.json()}catch{ /* no provider body disclosure */ }
 if(method==='GET'&&!r.ok)fail('EXACT_SOURCE_OR_PREVIEW_PROVIDER_READ_UNVERIFIED');
 return {http:r.status,ok:r.ok,json};
}
async function bytesFor(file){
 if(file?.path!==PATH||file.encoding!=='base64'||
    !hex.test(file.sha||'')||
    typeof file.content!=='string'||
    !Number.isInteger(file.size)||file.size<500||
    file.size>45000)fail('EXACT_GITHUB_FILE_METADATA_DRIFT');
 const content=file.content.replace(/\s/g,'');
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(content)||
    content.length>65000)fail('GITHUB_FILE_ENCODING_INVALID');
 let decoded;
 try{decoded=atob(content)}catch{fail('GITHUB_FILE_BASE64_INVALID')}
 const bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));
 if(bytes.length!==file.size)fail('GITHUB_FILE_BYTES_SIZE_MISMATCH');
 const prefix=new TextEncoder().encode('blob '+bytes.length+'\0');
 const gitBytes=new Uint8Array(prefix.length+bytes.length);
 gitBytes.set(prefix);gitBytes.set(bytes,prefix.length);
 const hash=await crypto.subtle.digest('SHA-1',gitBytes);
 const blob=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(blob!==file.sha)fail('GITHUB_PROVIDER_BLOB_READBACK_MISMATCH');
 return {bytes,base64:content};
}
async function checkCurrent(token){
 const [branch,current]=await Promise.all([
  gh('/git/ref/heads/'+BRANCH,token),
  gh('/contents/'+PATH+'?ref='+encodeURIComponent(BRANCH),token)]);
 if(branch.json?.ref!=='refs/heads/'+BRANCH||
    !hex.test(branch.json?.object?.sha||''))
  fail('ISOLATED_BRANCH_REFERENCE_INVALID');
 const target=await bytesFor(current.json);
 return {head:branch.json.object.sha,blob:current.json.sha,target};
}
async function checkCandidate(token){
 const c=await gh('/contents/'+PATH+'?ref='+CANDIDATE,token);
 const src=await bytesFor(c.json);
 if(c.json.sha!==NEW_BLOB)fail('TESTED_CANDIDATE_GIT_BLOB_CHANGED');
 const digest=await crypto.subtle.digest('SHA-256',src.bytes);
 const contentSha='sha256:'+Array.from(new Uint8Array(digest))
  .map(x=>x.toString(16).padStart(2,'0')).join('');
 if(contentSha!==SHA256)
  fail('FROZEN_CANDIDATE_SHA256_MISMATCH');
 return src;
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return respond('SERVICE_EXACT_POST_JSON_REQUIRED',405);
  if(await req.text()!=='{"version":1,"action":"execute_exact_approved_native263_install"}')
   return respond('EXACT_SINGLE_ORIGINAL_ACTION_REQUIRED',400);
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return respond('REALITY_SERVICE_ROLE_REQUIRED',403);
  // Owner approval and atomic one-use provider intent are checked by the
  // database BEFORE obtaining or using the separate GitHub provider token.
  const claim=await rpc('reality_claim_exact_native263_install_v1',{},key);
  if(claim.status==='EXACT_NATIVE263_OWNER_INSTALL_APPROVAL_REQUIRED_NO_WRITE')
   return respond(claim.status,200,{installation_authorized:false,
    source_installed:false});
  if(claim.status==='NATIVE263_PUBLISH_INTENT_ALREADY_FENCED_READBACK_ONLY')
   return respond('NATIVE263_EXISTING_INSTALL_INTENT_RECONCILE_READBACK_ONLY',
    200,{installation_authorized:true,source_installed:false});
  if(claim.status==='NATIVE263_INSTALLED_SOURCE_PENDING_DEPLOYMENT_AND_RESUME')
   return respond(claim.status,200,{installation_authorized:true,
    source_installed:true,installed_commit_sha:claim.installed_commit_sha});
  if(claim.status!=='EXACT_NATIVE263_OWNER_APPROVED_INSTALL_INTENT_FENCED')
   return respond('NATIVE263_NO_EXACT_APPROVED_INSTALL_EFFECT',200,{
    installation_authorized:false,source_installed:false});
  if(claim.original_work_id!==ORIGINAL||claim.shift_id!==SHIFT||
     claim.candidate_commit_sha!==CANDIDATE||
     claim.candidate_artifact_sha256!==SHA256||
     claim.target_branch!==BRANCH||claim.target_file_path!==PATH||
     claim.expected_preinstall_blob_sha!==OLD_BLOB||
     claim.expected_installed_blob_sha!==NEW_BLOB||
     claim.installation_authorized!==true||
     !/^supabase:riley_native_exact_install_approvals_v1:[a-f0-9-]{36}$/.test(
       claim.approval_receipt_ref||''))
   fail('EXACT_AUTHORIZED_INSTALL_WARRANT_READBACK_MISMATCH');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)fail('REALITY_GITHUB_WRITER_NOT_CONFIGURED');
  const [current,candidate]=await Promise.all([
   checkCurrent(token),checkCandidate(token)]);
  if(current.blob!==OLD_BLOB||current.blob===NEW_BLOB)
   fail('EXISTING_FILE_BASELINE_DRIFT_NO_WRITE');
  // Confirm stable ref immediately before the sole conditional PUT.
  const ref=await gh('/git/ref/heads/'+BRANCH,token);
  if(ref.json?.object?.sha!==current.head)
   fail('GITHUB_BRANCH_HEAD_DRIFT_NO_WRITE');
  let written;
  try{
   written=await gh('/contents/'+PATH,token,'PUT',{
    message:'fix(reality): exact owner-approved #263 native original repair',
    branch:BRANCH,sha:OLD_BLOB,content:candidate.base64});
  }catch{
   // Provider effect unknown: durable database intent remains fenced.
   return respond('NATIVE263_INSTALL_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY',503,{
    installation_authorized:true,source_installed:false});
  }
  if(!written.ok)return respond(
   'NATIVE263_GITHUB_PUT_HTTP_'+written.http+'_FENCED_NO_RETRY',424,{
    installation_authorized:true,source_installed:false});
  const commit=written.json?.commit?.sha;
  if(!hex.test(commit||'')||
     written.json?.content?.sha!==NEW_BLOB)
   fail('PROVIDER_WRITE_EFFECT_RECEIPT_INVALID');
  // Re-read the current GitHub ref, installed bytes and exact source.
  const read=await checkCurrent(token);
  if(read.head!==commit||read.blob!==NEW_BLOB)
   return respond('NATIVE263_INSTALLED_EFFECT_READBACK_UNVERIFIED_NO_RETRY',
    503,{installation_authorized:true,source_installed:false});
  const durable=await rpc('reality_attest_exact_native263_installed_source_v1',{
   p_commit_sha:commit,p_blob_sha:NEW_BLOB},key);
  if(durable.status!=='NATIVE263_EXACT_SOURCE_PROVIDER_READBACK_RECORDED'||
     durable.original_work_id!==ORIGINAL||durable.shift_id!==SHIFT||
     durable.installed_commit_sha!==commit||
     durable.installed_blob_sha!==NEW_BLOB||
     durable.source_installed!==true||
     durable.deployment_verified!==false||
     durable.original_job_completed!==false||
     durable.production_changed!==false)
   fail('INSTALLED_PROVIDER_LEDGER_RECEIPT_UNVERIFIED');
  return respond('NATIVE263_SOURCE_INSTALLED_DEPLOYMENT_NOT_YET_VERIFIED',200,{
   installation_authorized:true,source_installed:true,
   installed_commit_sha:commit});
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const safe=/^NATIVE263_INSTALL_[A-Z0-9_]{4,110}$/.test(raw)?
   raw.slice('NATIVE263_INSTALL_'.length):
   'NATIVE263_SERVICE_PROVIDER_OR_WARRANT_UNVERIFIED';
  return respond(safe,503,{installation_authorized:false,
   source_installed:false});
 }
});
