// Service-only, one-use, PREAPPROVAL GITHUB WRITE CANARY.
// Makes ONE inert evidence-file PUT on an isolated preview branch after an
// atomic durable lease. It cannot write executable source, approve an upgrade,
// install anything, resume an original or assert a final receipt.
const GH='https://api.github.com/repos/maloney2323/Reality';
const HEX=/^[a-f0-9]{40}$/;
const BRANCH=/^reality\/[a-zA-Z0-9/_-]{10,135}$/;
const SOURCE=/^src\/[A-Za-z0-9/_-]+\.js$/;
const PATH=/^evidence\/reality-governed-original-canary-[a-f0-9-]{36}\.json$/;
const fail=code=>{throw Error('GENERALIZED_GITHUB_CANARY_'+code)};
const safe=(status,extra={},http=200)=>new Response(JSON.stringify({
 status,installation_authorized:false,source_installed:false,
 original_job_completed:false,production_changed:false,
 automatic_preview_deploy_verified:false,...extra
}),{status:http,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
function isScope(x){
 return x&&x.status==='GENERALIZED_CANARY_EXACT_OWNER_PREAPPROVAL_SCOPE'&&
  /^work:[a-f0-9]{32}$/.test(x.original_work_id||'')&&
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x.attempt_id||'')&&
  /^[a-f0-9-]{36}$/.test(x.shift_id||'')&&
  BRANCH.test(x.target_branch||'')&&!x.target_branch.includes('..')&&
  !x.target_branch.includes('//')&&
  !x.target_branch.startsWith('reality/riley/')&&
  SOURCE.test(x.source_path||'')&&PATH.test(x.probe_path||'')&&
  HEX.test(x.expected_source_blob||'')&&
  x.installation_authorized===false&&x.source_installed===false&&
  x.original_job_completed===false&&x.production_changed===false;
}
async function rpc(api,key,name,input={}){
 if(!['reality_read_generalized_source_write_canary_scope_v1',
  'reality_claim_generalized_source_write_canary_v1',
  'reality_record_generalized_source_write_canary_v1'].includes(name))
  fail('RPC_NOT_ALLOWLISTED');
 const r=await fetch(api+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(12500),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(input)});
 if(!r.ok)fail('DURABLE_SERVICE_OWNER_WARRANT_UNVERIFIED');
 const j=await r.json().catch(()=>null);
 if(!j||typeof j!=='object'||Array.isArray(j))
  fail('DURABLE_OWNER_RESPONSE_UNVERIFIED');
 return j;
}
async function github(token,path,method='GET',body){
 const r=await fetch(GH+path,{
  method,cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{authorization:'Bearer '+token,
   accept:'application/vnd.github+json',
   'content-type':'application/json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-governed-one-shot-inert-canary'},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await r.json().catch(()=>null);
 return {ok:r.ok,status:r.status,data};
}
async function gitBlob(bytes){
 const prefix=new TextEncoder().encode('blob '+bytes.length+'\0');
 const combined=new Uint8Array(prefix.length+bytes.length);
 combined.set(prefix);combined.set(bytes,prefix.length);
 const hash=await crypto.subtle.digest('SHA-1',combined);
 return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return safe('SERVICE_EXACT_POST_REQUIRED',{},405);
  if(await req.text()!=='{"version":1,"action":"verify_exact_isolated_source_write_transport"}')
   return safe('GENERALIZED_INERT_WRITE_ACTION_REQUIRED',{},400);
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return safe('SERVICE_ROLE_AUTHORIZATION_REQUIRED',{},403);
  const url=Deno.env.get('SUPABASE_URL')||'';
  let project;
  try{project=new URL(url)}
  catch{return safe('SUPABASE_PROJECT_SCOPE_UNVERIFIED',{},503)}
  if(project.protocol!=='https:'||!project.hostname.endsWith('.supabase.co')||
     project.pathname!=='/'||project.search||project.hash)
   return safe('SUPABASE_PROJECT_SCOPE_UNVERIFIED',{},503);
  const api=project.origin;
  const scope=await rpc(api,key,'reality_read_generalized_source_write_canary_scope_v1');
  if(scope.status==='NO_CURRENT_UNVERIFIED_SOURCE_CANARY'||
     scope.status==='NO_CURRENT_OWNER_AUTHORIZED_CANARY_SCOPE')
   return safe(scope.status);
  if(!isScope(scope))fail('EXACT_PREAPPROVAL_ORIGINAL_SCOPE_MISSING');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)return safe('ISOLATED_GITHUB_WRITER_CREDENTIAL_UNVERIFIED');
  const branch=scope.target_branch;
  const srcUrl='/contents/'+scope.source_path+'?ref='+encodeURIComponent(branch);
  const probeUrl='/contents/'+scope.probe_path+'?ref='+encodeURIComponent(branch);
  const [ref,src,probe]=await Promise.all([
   github(token,'/git/ref/heads/'+branch),github(token,srcUrl),
   github(token,probeUrl)
  ]);
  const before=ref.data?.object?.sha;
  if(!ref.ok||ref.data?.ref!=='refs/heads/'+branch||!HEX.test(before||'')||
    !src.ok||src.data?.path!==scope.source_path||
    src.data?.sha!==scope.expected_source_blob)
   return safe('GENERALIZED_CANARY_CURRENT_SOURCE_DRIFT_NO_EFFECT');
  if(probe.status!==404)
   return safe('GENERALIZED_CANARY_PROBE_ALREADY_PRESENT_NO_WRITE');
  const claim=await rpc(api,key,'reality_claim_generalized_source_write_canary_v1',{
   p_attempt_id:scope.attempt_id,p_current_head_sha:before,
   p_current_source_blob:scope.expected_source_blob
  });
  if(claim.status==='GENERALIZED_CANARY_ALREADY_FENCED_NO_REPEAT')
   return safe(claim.status,{original_work_id:scope.original_work_id,
    provider_commit_sha:claim.provider_commit_sha||null,
    result_status:claim.result_status,second_write_blocked:true});
  if(claim.status!=='GENERALIZED_CANARY_EXACT_SINGLE_WRITE_CLAIMED'||
    claim.original_work_id!==scope.original_work_id||
    claim.attempt_id!==scope.attempt_id||
    claim.shift_id!==scope.shift_id||
    claim.target_branch!==branch||
    claim.source_path!==scope.source_path||
    claim.probe_path!==scope.probe_path||
    claim.expected_parent_commit_sha!==before||
    claim.expected_source_blob!==scope.expected_source_blob||
    claim.installation_authorized!==false||
    claim.source_installed!==false||
    claim.original_job_completed!==false||
    claim.production_changed!==false)
   fail('ONE_USE_PROVIDER_FENCE_IDENTITY_DRIFT');
  async function record(code,http=null,commit=null,blob=null){
   const saved=await rpc(api,key,'reality_record_generalized_source_write_canary_v1',{
    p_attempt_id:scope.attempt_id,p_result_status:code,
    p_github_http_status:http,p_provider_commit_sha:commit,
    p_provider_probe_blob_sha:blob
   });
   const successful=code==='GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED';
   if(saved.status!==(successful?
      'GENERALIZED_SOURCE_WRITE_TRANSPORT_INDEPENDENTLY_VERIFIED':
      'GENERALIZED_SOURCE_WRITE_TRANSPORT_EFFECT_NOT_VERIFIED')||
      saved.original_work_id!==scope.original_work_id||
      saved.attempt_id!==scope.attempt_id||
      saved.shift_id!==scope.shift_id||
      saved.isolated_github_write_verified!==successful||
      saved.preview_auto_deploy_verified!==false||
      saved.installation_authorized!==false||
      saved.source_installed!==false||
      saved.original_job_completed!==false||
      saved.production_changed!==false)
    fail('ONE_SHOT_PROVIDER_RECORD_READBACK_MISMATCH');
   return safe(saved.status,{
    original_work_id:scope.original_work_id,attempt_id:scope.attempt_id,
    candidate_source_unchanged:true,
    inert_probe_path:scope.probe_path,github_write_verified:successful,
    github_commit_sha:successful?commit:null,
    provider_http_status:http
   });
  }
  // Reconfirm branch identity after the durable lease. No second retry if it
  // moved or an external effect is ambiguous.
  const last=await github(token,'/git/ref/heads/'+branch);
  if(!last.ok||last.data?.object?.sha!==before)
   return record('GITHUB_EFFECT_UNCERTAIN');
  const body=JSON.stringify({
   schema:'reality-isolated-original-source-write-canary-v1',
   original_work_id:scope.original_work_id,
   shift_id:scope.shift_id,attempt_id:scope.attempt_id,
   preexisting_preview_head_sha:before,
   unchanged_original_file_blob:scope.expected_source_blob,
   original_file_unchanged:true,
   owner_installation_approved:false,
   candidate_installed:false,
   production_changed:false,original_job_completed:false
  },null,2)+'\n';
  const bytes=new TextEncoder().encode(body);
  const blob=await gitBlob(bytes);
  // The only GitHub WRITE in this broker: newly named evidence file, never
  // executable source. A failed/uncertain PUT is fenced forever.
  let put;
  try{
   put=await github(token,'/contents/'+scope.probe_path,'PUT',{
    message:'test(reality): governed inert isolated GitHub write evidence only',
    branch,content:btoa(body)
   });
  }catch{return record('GITHUB_EFFECT_UNCERTAIN')}
  if(!put.ok)return record(put.status===403?
    'GITHUB_PROVIDER_REJECTED':'GITHUB_EFFECT_UNCERTAIN',put.status);
  const commit=put.data?.commit?.sha;
  if(put.status!==201||!HEX.test(commit||'')||
     put.data?.content?.sha!==blob)
   return record('GITHUB_EFFECT_UNCERTAIN',put.status);
  const [afterRef,afterSrc,afterProbe]=await Promise.all([
   github(token,'/git/ref/heads/'+branch),
   github(token,srcUrl),
   github(token,probeUrl)
  ]);
  let actual='';
  try{actual=atob((afterProbe.data?.content||'').replace(/\s/g,''))}
  catch{return record('GITHUB_EFFECT_UNCERTAIN',put.status)}
  if(afterRef.data?.object?.sha!==commit||
     afterSrc.data?.sha!==scope.expected_source_blob||
     afterProbe.data?.sha!==blob||
     afterProbe.data?.path!==scope.probe_path||actual!==body)
   return record('GITHUB_EFFECT_UNCERTAIN',put.status);
  return record('GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED',
   201,commit,blob);
 }catch(e){
  const v=e instanceof Error?e.message:'';
  const code=/^GENERALIZED_GITHUB_CANARY_[A-Z0-9_]{5,105}$/.test(v)?
   v.slice('GENERALIZED_GITHUB_CANARY_'.length):
   'GENERALIZED_CANARY_PROVIDER_OR_LEASE_UNVERIFIED';
  return safe(code,{},503);
 }
});