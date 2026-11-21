// Recovery of ONE previously fenced, owner-approved original publication.
// This broker may write exactly one source blob only after a new exact owner
// decision and a durable one-use recovery fence. Future wakes are GET-only.
// It never grants its own authorization, changes production or settles work.
const REPO='https://api.github.com/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const BRANCH=/^reality\/[A-Za-z0-9/_-]{10,135}$/;
const FILE=/^src\/[A-Za-z0-9/_-]+[.]js$/;
const fail=s=>{throw Error('RECOVERY_ORIGINAL_'+s)};
const safe=(status,more={},http=200)=>{
 if(/^RECOVERY_[A-Z0-9_]{4,120}$/.test(status))
  console.info('REALITY_RECOVERY_PUBLICATION_DISPOSITION',status);
 return new Response(JSON.stringify({status,source_installed:false,
  original_job_completed:false,production_changed:false,...more}),
  {status:http,headers:{'content-type':'application/json',
   'cache-control':'no-store','x-content-type-options':'nosniff'}});
};
async function rpc(base,key,name,args={}){
 if(!['reality_read_general_original_recovery_install_scope_v1',
  'reality_claim_general_original_recovery_publication_v1',
  'reality_record_general_original_recovery_published_v1'].includes(name))
  fail('RPC_NOT_ALLOWLISTED');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(16000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args)});
 if(!r.ok)fail('CURRENT_DURABLE_OWNER_SCOPE_UNAVAILABLE');
 const data=await r.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('OWNER_SCOPE_READBACK_INVALID');
 return data;
}
async function gh(token,path,method='GET',body){
 const r=await fetch(REPO+path,{
  method,cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(17000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-exact-owner-approved-fenced-source-recovery'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:r.status,ok:r.ok,data:await r.json().catch(()=>null)};
}
async function checksum(kind,bytes){
 const raw=await crypto.subtle.digest(kind,bytes);
 return [...new Uint8Array(raw)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function gitBlob(bytes){
 const pre=new TextEncoder().encode('blob '+bytes.length+'\0');
 const b=new Uint8Array(pre.length+bytes.length);b.set(pre);b.set(bytes,pre.length);
 return checksum('SHA-1',b);
}
function decode(v){
 if(typeof v!=='string'||!/^[A-Za-z0-9+/\s]*={0,2}$/.test(v))
  fail('GITHUB_FROZEN_SOURCE_NOT_BASE64');
 return Uint8Array.from(atob(v.replace(/\s/g,'')),x=>x.charCodeAt(0));
}
function encode(v){
 let s='';for(const b of v)s+=String.fromCharCode(b);return btoa(s);
}
async function checked(token,path,ref){
 if(!FILE.test(path)||!SHA.test(ref))fail('SOURCE_REF_NOT_EXACT');
 const r=await gh(token,'/contents/'+path+'?ref='+ref);
 const d=r.data;
 if(!r.ok||d?.path!==path||d?.encoding!=='base64'||
  !SHA.test(d.sha||'')||typeof d.content!=='string'||
  !Number.isSafeInteger(d.size)||d.size<20||d.size>250000)
  fail('GITHUB_SOURCE_METADATA_UNVERIFIED');
 const b=decode(d.content);
 if(b.length!==d.size||await gitBlob(b)!==d.sha)
  fail('GITHUB_SOURCE_HASH_UNVERIFIED');
 return {bytes:b,blob:d.sha,digest:'sha256:'+await checksum('SHA-256',b)};
}
async function head(token,branch){
 if(!BRANCH.test(branch)||branch.includes('..')||
  branch.includes('//')||branch.startsWith('reality/riley/'))
  fail('TARGET_BRANCH_NOT_ISOLATED');
 const r=await gh(token,'/git/ref/heads/'+branch);
 if(!r.ok||r.data?.ref!=='refs/heads/'+branch||
  !SHA.test(r.data?.object?.sha||''))
  fail('GITHUB_REF_READBACK_UNVERIFIED');
 return r.data.object.sha;
}
function validScope(s){
 return s?.status==='EXACT_RECOVERY_PUBLICATION_CURRENT_OWNER_SCOPE'&&
  UUID.test(s.recovery_publication_id||'')&&UUID.test(s.attempt_id||'')&&
  UUID.test(s.shift_id||'')&&UUID.test(s.owner_approval_id||'')&&
  WORK.test(s.original_work_id||'')&&
  BRANCH.test(s.target_branch||'')&&!s.target_branch.startsWith('reality/riley/')&&
  FILE.test(s.target_path||'')&&SHA.test(s.expected_parent_commit_sha||'')&&
  SHA.test(s.expected_preinstall_blob_sha||'')&&
  SHA.test(s.expected_installed_blob_sha||'')&&
  SHA.test(s.candidate_commit_sha||'')&&
  HASH.test(s.candidate_artifact_sha256||'')&&
  s.expected_preinstall_blob_sha!==s.expected_installed_blob_sha&&
  s.original_job_completed===false&&s.production_changed===false&&
  ['OWNER_APPROVED','RECOVERY_WRITE_FENCED','SOURCE_INSTALLED'].includes(s.phase);
}
async function reconcile(token,base,key,scope,branchHead){
 if(branchHead===scope.expected_parent_commit_sha)
  return safe('RECOVERY_WRITE_FENCED_ORIGINAL_HEAD_UNCHANGED_NO_RETRY',{
   original_work_id:scope.original_work_id,
   next_gate:'GOVERNED_PROVIDER_FAILURE_INVESTIGATION_NOT_SECOND_WRITE'});
 const c=await gh(token,'/commits/'+branchHead);
 const after=await checked(token,scope.target_path,branchHead);
 if(!c.ok||!Array.isArray(c.data?.parents)||c.data.parents.length!==1||
  c.data.parents[0]?.sha!==scope.expected_parent_commit_sha||
  !Array.isArray(c.data?.files)||c.data.files.length!==1||
  c.data.files[0]?.filename!==scope.target_path||
  c.data.files[0]?.status!=='modified'||
  after.blob!==scope.expected_installed_blob_sha||
  after.digest!==scope.candidate_artifact_sha256)
  return safe('RECOVERY_WRITE_FENCED_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY',{
   original_work_id:scope.original_work_id,
   next_gate:'READ_ONLY_FORENSIC_RECONCILIATION'});
 const recorded=await rpc(base,key,'reality_record_general_original_recovery_published_v1',{
  p_recovery_publication_id:scope.recovery_publication_id,
  p_installed_commit_sha:branchHead,p_source_blob_sha:after.blob});
 if(recorded.status!=='RECOVERY_ORIGINAL_SOURCE_INSTALLED_IN_SAME_JOB'||
  recorded.original_work_id!==scope.original_work_id||
  recorded.installed_commit_sha!==branchHead||
  recorded.source_installed!==true||
  recorded.original_job_completed!==false||
  recorded.production_changed!==false)
  fail('ORIGINAL_DURABLE_SOURCE_INSTALLATION_NOT_VERIFIED');
 return safe(recorded.status,{source_installed:true,
  original_work_id:scope.original_work_id,
  installed_commit_sha:branchHead,
  next_gate:recorded.next_gate});
}
async function execute(token,base,key,scope){
 const before=await head(token,scope.target_branch);
 if(scope.phase==='SOURCE_INSTALLED')
  return safe('RECOVERY_SOURCE_ALREADY_INSTALLED_POSTINSTALL_CONTINUATION',{
   original_work_id:scope.original_work_id,source_installed:true});
 if(scope.phase==='RECOVERY_WRITE_FENCED')
  return reconcile(token,base,key,scope,before);
 // Only OWNER_APPROVED can claim the new one-use recovery mutation.
 if(scope.phase!=='OWNER_APPROVED'||scope.write_authorized!==true)
  return safe('RECOVERY_EXACT_OWNER_APPROVAL_NOT_AVAILABLE');
 if(before!==scope.expected_parent_commit_sha)
  return safe('RECOVERY_SOURCE_BASELINE_CHANGED_NO_WRITE',{
   original_work_id:scope.original_work_id});
 const [pre,candidate]=await Promise.all([
  checked(token,scope.target_path,before),
  checked(token,scope.target_path,scope.candidate_commit_sha)
 ]);
 if(pre.blob!==scope.expected_preinstall_blob_sha||
  candidate.blob!==scope.expected_installed_blob_sha||
  candidate.digest!==scope.candidate_artifact_sha256)
  return safe('RECOVERY_FROZEN_ARTIFACT_OR_PREIMAGE_DRIFT_NO_WRITE');
 const claim=await rpc(base,key,'reality_claim_general_original_recovery_publication_v1',{
  p_expected_parent_sha:before});
 if(claim.status==='RECOVERY_PUBLICATION_ALREADY_CLAIMED_NO_SECOND_WRITE')
  return safe(claim.status,{original_work_id:scope.original_work_id});
 if(claim.status!=='ONE_EXACT_RECOVERY_PUBLICATION_WRITE_FENCED'||
  claim.write_authorized!==true||claim.original_job_completed!==false||
  claim.production_changed!==false||
  claim.recovery_publication_id!==scope.recovery_publication_id||
  claim.owner_approval_id!==scope.owner_approval_id||
  claim.original_work_id!==scope.original_work_id||
  claim.attempt_id!==scope.attempt_id||
  claim.expected_parent_commit_sha!==scope.expected_parent_commit_sha||
  claim.expected_preinstall_blob_sha!==pre.blob||
  claim.expected_installed_blob_sha!==candidate.blob||
  claim.candidate_artifact_sha256!==candidate.digest||
  claim.target_branch!==scope.target_branch||
  claim.target_path!==scope.target_path)
  fail('RECOVERY_EXACT_OWNER_WRITE_FENCE_NOT_CONFIRMED');
 if(await head(token,scope.target_branch)!==before)
  return safe('RECOVERY_WRITE_FENCED_PARENT_MOVED_NO_WRITE',{
   original_work_id:scope.original_work_id});
 // The ONE authorized GitHub mutation: update one frozen source file using
 // the original file's SHA precondition. No Git Data object writes or retries.
 let put;
 try{
  put=await gh(token,'/contents/'+scope.target_path,'PUT',{
   message:'reality: exact owner-approved recovery of '+scope.original_work_id,
   branch:scope.target_branch,sha:pre.blob,
   content:encode(candidate.bytes)
  });
 }catch{return safe('RECOVERY_PROVIDER_OUTCOME_UNVERIFIED_NO_REPLAY',{
  original_work_id:scope.original_work_id})}
 if(put.status!==200||!put.ok||
   !SHA.test(put.data?.commit?.sha||'')||
   put.data?.content?.sha!==candidate.blob)
  return safe('RECOVERY_PROVIDER_COMMIT_RESPONSE_UNVERIFIED_NO_REPLAY',{
   original_work_id:scope.original_work_id});
 const final=await head(token,scope.target_branch);
 if(final!==put.data.commit.sha)
  return safe('RECOVERY_POSTWRITE_BRANCH_MOVED_GET_ONLY',{
   original_work_id:scope.original_work_id});
 return reconcile(token,base,key,{
  ...scope,phase:'RECOVERY_WRITE_FENCED'
 },final);
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return safe('RECOVERY_ISOLATED_SERVICE_POST_ONLY',{},405);
  if(await req.text()!=='{"version":1,"action":"continue_one_exact_owner_approved_fenced_recovery"}')
   return safe('RECOVERY_SIGNED_EXACT_ACTION_REQUIRED',{},400);
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return safe('RECOVERY_SERVICE_ROLE_KEY_REQUIRED',{},403);
  const u=Deno.env.get('SUPABASE_URL')||'';
  let parsed;try{parsed=new URL(u)}catch{
   return safe('RECOVERY_ISOLATED_SUPABASE_UNVERIFIED',{},503)}
  if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||
     parsed.pathname!=='/'||parsed.search||parsed.hash)
   return safe('RECOVERY_ISOLATED_SUPABASE_UNVERIFIED',{},503);
  const base=parsed.origin;
  const scope=await rpc(base,key,'reality_read_general_original_recovery_install_scope_v1');
  if(scope.status==='NO_CURRENT_OWNER_APPROVED_RECOVERY_PUBLICATION')
   return safe('RECOVERY_CURRENT_OWNER_APPROVAL_PENDING');
  if(scope.status==='RECOVERY_INSTALL_SCOPE_DRIFT')
   return safe('RECOVERY_CURRENT_OWNER_SCOPE_UNVERIFIED',{},409);
  // A staged release has no approval UUID. No provider mutation or claim.
  if(scope.status==='EXACT_RECOVERY_PUBLICATION_CURRENT_OWNER_SCOPE'&&
     scope.phase==='READY_FOR_EXACT_RECOVERY_APPROVAL')
   return safe('RECOVERY_EXACT_OWNER_APPROVAL_PENDING');
  if(!validScope(scope))return safe('RECOVERY_SIGNED_OWNER_SCOPE_UNVERIFIED',{},409);
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)return safe('RECOVERY_GITHUB_CREDENTIAL_MISSING',{},503);
  return await execute(token,base,key,scope);
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const code=/^RECOVERY_ORIGINAL_[A-Z0-9_]{5,110}$/.test(raw)?
    raw.slice('RECOVERY_ORIGINAL_'.length):
    'RECOVERY_PROVIDER_OR_OWNER_SCOPE_NOT_VERIFIED';
  return safe(code,{},503);
 }
});
