// General isolated-only exact owner-approved original repair installer.
// Uses GitHub atomic non-forced fast-forward of one immutable source blob.
// One durable claim before any provider mutation; later wakes are GET-only.
// No model, browser, shift-start or green CI event can create approval.
const REPO='https://api.github.com/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const BRANCH=/^reality\/[a-zA-Z0-9/_-]{10,135}$/;
const SOURCE=/^src\/[a-zA-Z0-9/_-]+\.js$/;
const fail=s=>{throw Error('GENERAL_ORIGINAL_INSTALL_'+s)};
// Diagnosable worker outcomes must never expose source bodies, credentials,
// owner identity or arbitrary provider responses. All dispositions are finite
// installer-generated codes; log only a bounded code, not exception content.
const safe=(status,more={},http=200)=>{
 if(typeof status==='string'&&
   /^GENERAL_(?:ORIGINAL_)?INSTALL_[A-Z0-9_]{4,120}$/.test(status))
  console.info('REALITY_GOVERNED_INSTALL_DISPOSITION',status);
 return new Response(JSON.stringify({
  status,source_installed:false,original_job_completed:false,
  production_changed:false,...more
 }),{status:http,headers:{'content-type':'application/json',
  'cache-control':'no-store','x-content-type-options':'nosniff'}});
};
async function rpc(base,key,name,args={}){
 if(!['reality_read_general_original_install_scope_v1',
       'reality_claim_general_original_install_v1',
       'reality_record_general_original_installed_source_v1',
       'reality_record_general_original_fenced_recovery_v1'].includes(name))
  fail('RPC_NOT_ALLOWED');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(16000),
  headers:{apikey:key,authorization:'Bearer '+key,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(args)});
 if(!r.ok)fail('OWNER_DURABLE_APPROVAL_RECORD_UNAVAILABLE');
 const x=await r.json().catch(()=>null);
 if(!x||typeof x!=='object'||Array.isArray(x))
  fail('DURABLE_OWNER_READBACK_NOT_VERIFIED');
 return x;
}
async function gh(token,path,method='GET',body){
 const r=await fetch(REPO+path,{
  method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(18000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-governed-general-original-exact-installer'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await r.json().catch(()=>null);
 return {status:r.status,ok:r.ok,data};
}
async function digest(kind,bytes){
 const sum=await crypto.subtle.digest(kind,bytes);
 return [...new Uint8Array(sum)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function gitBlob(bytes){
 const pre=new TextEncoder().encode('blob '+bytes.length+'\0');
 const all=new Uint8Array(pre.length+bytes.length);
 all.set(pre);all.set(bytes,pre.length);
 return digest('SHA-1',all);
}
function decode(b64){
 if(typeof b64!=='string'||!/^[A-Za-z0-9+/\s]*={0,2}$/.test(b64))
  fail('GITHUB_SOURCE_NOT_BASE64');
 const b=atob(b64.replace(/\s/g,''));
 return Uint8Array.from(b,c=>c.charCodeAt(0));
}
function encode(bytes){
 let text='';for(const n of bytes)text+=String.fromCharCode(n);
 return btoa(text);
}
async function checkedSource(token,path,ref){
 if(!SOURCE.test(path)||!SHA.test(ref))fail('SOURCE_PATH_OR_COMMIT_UNSAFE');
 const r=await gh(token,'/contents/'+path+'?ref='+ref);
 const v=r.data;
 if(!r.ok||v?.path!==path||v?.encoding!=='base64'||
    !SHA.test(v?.sha||'')||!Number.isSafeInteger(v?.size)||
    v.size<20||v.size>250000)
  fail('GITHUB_SOURCE_PROVIDER_METADATA_NOT_VERIFIED');
 const bytes=decode(v.content);
 if(bytes.length!==v.size||await gitBlob(bytes)!==v.sha)
  fail('GITHUB_SOURCE_HASH_READBACK_MISMATCH');
 return {bytes,blob:v.sha,digest:'sha256:'+await digest('SHA-256',bytes)};
}
async function branchHead(token,branch){
 if(!BRANCH.test(branch)||branch.startsWith('reality/riley/')||
  branch.includes('..')||branch.includes('//'))
  fail('TARGET_NOT_CURRENT_ISOLATED_PREVIEW_BRANCH');
 const r=await gh(token,'/git/ref/heads/'+branch);
 if(!r.ok||r.data?.ref!=='refs/heads/'+branch||
   !SHA.test(r.data?.object?.sha||''))
  fail('GITHUB_TARGET_REF_IDENTITY_UNVERIFIED');
 return r.data.object.sha;
}
function validScope(x){
 return x?.status==='GENERAL_INSTALL_OWNER_APPROVED_SOURCE_SCOPE'&&
  WORK.test(x.original_work_id||'')&&UUID.test(x.attempt_id||'')&&
  UUID.test(x.shift_id||'')&&UUID.test(x.owner_id||'')&&
  UUID.test(x.approval_receipt_id||'')&&
  BRANCH.test(x.target_branch||'')&&
  !x.target_branch.startsWith('reality/riley/')&&
  SOURCE.test(x.target_path||'')&&SHA.test(x.candidate_commit_sha||'')&&
  SHA.test(x.expected_preinstall_blob_sha||'')&&
  SHA.test(x.expected_installed_blob_sha||'')&&
  HASH.test(x.candidate_artifact_sha256||'')&&
  x.expected_preinstall_blob_sha!==x.expected_installed_blob_sha&&
  x.installation_authorized===true&&
  x.original_job_completed===false&&x.production_changed===false&&
  ['OWNER_APPROVED','INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED']
   .includes(x.phase);
}
async function reconcile(token,base,key,scope,head){
 const expected=scope.expected_parent_commit_sha;
 if(!SHA.test(expected||''))
  return safe('GENERAL_INSTALL_ALREADY_FENCED_NO_PROVIDER_EFFECT_CONFIRMED',{
   original_work_id:scope.original_work_id,installation_authorized:true,
   next_gate:'WAIT_FOR_EXACT_PROVIDER_READBACK_OR_CONTROLLED_RECOVERY'});
 if(head===expected){
  // Read-only diagnostic against the SAME runtime GitHub credential.
  // A passing inert Contents canary does not prove the Git Data API
  // commit/ref path is writable. NEVER probe with a POST or PATCH here.
  try{
   const repository=await gh(token,'');
   const permission=repository.ok&&repository.data?.permissions?.push===true?
    'RUNTIME_REPO_PUSH_PERMISSION_CONFIRMED':
    repository.ok?'RUNTIME_REPO_PUSH_PERMISSION_NOT_CONFIRMED':
    'RUNTIME_REPO_METADATA_READ_UNAVAILABLE';
   console.info('REALITY_INSTALLER_READ_ONLY_PROVIDER_CAPABILITY',permission,
    Number.isInteger(repository.status)?repository.status:0);
   // Verify whether the exact immutable installation ingredients still
   // exist. GET-only: no new GitHub objects or refs, even if the old write
   // was interrupted after creating unreachable objects.
   const [parent,candidateBlob,baseline,candidate]=await Promise.all([
    gh(token,'/git/commits/'+expected),
    gh(token,'/git/blobs/'+scope.expected_installed_blob_sha),
    checkedSource(token,scope.target_path,expected).catch(()=>null),
    checkedSource(token,scope.target_path,scope.candidate_commit_sha)
     .catch(()=>null)
   ]);
   const finding=parent.ok&&SHA.test(parent.data?.tree?.sha||'')&&
    candidateBlob.ok&&candidateBlob.data?.sha===
     scope.expected_installed_blob_sha&&
    baseline?.blob===scope.expected_preinstall_blob_sha&&
    candidate?.blob===scope.expected_installed_blob_sha&&
    candidate?.digest===scope.candidate_artifact_sha256?
    'FENCED_BASELINE_AND_APPROVED_GIT_OBJECTS_STILL_READABLE':
    'FENCED_GIT_OBJECTS_OR_EXACT_SOURCE_NOT_VERIFIED';
   console.info('REALITY_INSTALLER_READ_ONLY_RECOVERY_EVIDENCE',finding,
    Number.isInteger(parent.status)?parent.status:0,
    Number.isInteger(candidateBlob.status)?candidateBlob.status:0);
   if(finding==='FENCED_BASELINE_AND_APPROVED_GIT_OBJECTS_STILL_READABLE'&&
      permission==='RUNTIME_REPO_PUSH_PERMISSION_CONFIRMED'){
    // An immutable, exact-original diagnosis is a write to the evidence
    // ledger only; the original GitHub ref update remains fully fenced.
    const attested=JSON.stringify([
     scope.attempt_id,scope.original_work_id,scope.shift_id,
     scope.approval_receipt_id,scope.target_branch,scope.target_path,
     expected,head,scope.expected_preinstall_blob_sha,
     scope.expected_installed_blob_sha,scope.candidate_commit_sha,
     scope.candidate_artifact_sha256,parent.status,candidateBlob.status,
     baseline.blob,candidate.blob,candidate.digest
    ]);
    const evidenceSHA=await digest('SHA-256',
     new TextEncoder().encode(attested));
    const stored=await rpc(base,key,
     'reality_record_general_original_fenced_recovery_v1',{
      p_attempt_id:scope.attempt_id,p_observed_branch_head:head,
      p_evidence_sha256:evidenceSHA,p_finding:finding
     });
    if(stored.status!=='GENERAL_ORIGINAL_FENCED_RECOVERY_OBSERVATION_DURABLE'||
       stored.original_work_id!==scope.original_work_id||
       stored.shift_id!==scope.shift_id||
       stored.phase!=='READ_ONLY_DIAGNOSIS_RECORDED'||
       stored.installation_retried!==false||
       stored.original_job_completed!==false||
       stored.production_changed!==false)
     fail('FENCED_RECOVERY_DURABLE_EVIDENCE_NOT_VERIFIED');
    console.info('REALITY_INSTALLER_FENCED_RECOVERY_RECEIPTED',
     'SAME_ORIGINAL_DIAGNOSIS_DURABLE_NO_RETRY');
   }
   // Passing these GET checks is NOT proof that an earlier ref update
   // never happened and cannot reopen the consumed write authority.
  }catch{
   console.warn('REALITY_INSTALLER_READ_ONLY_PROVIDER_CAPABILITY','PROBE_UNAVAILABLE');
  }
  return safe('GENERAL_INSTALL_ALREADY_FENCED_NO_PROVIDER_EFFECT_CONFIRMED',{
   original_work_id:scope.original_work_id,installation_authorized:true,
   next_gate:'WAIT_FOR_EXACT_PROVIDER_READBACK_OR_CONTROLLED_RECOVERY'});
 }
 const commit=await gh(token,'/commits/'+head);
 const source=await checkedSource(token,scope.target_path,head);
 if(!commit.ok||!Array.isArray(commit.data?.parents)||
  commit.data.parents.length!==1||
  commit.data.parents[0]?.sha!==expected||
  !Array.isArray(commit.data?.files)||commit.data.files.length!==1||
  commit.data.files[0]?.filename!==scope.target_path||
  commit.data.files[0]?.status!=='modified'||
  source.blob!==scope.expected_installed_blob_sha||
  source.digest!==scope.candidate_artifact_sha256)
  return safe('GENERAL_INSTALL_FENCED_EFFECT_UNCERTAIN_NO_SECOND_WRITE',{
   original_work_id:scope.original_work_id,installation_authorized:true,
   expected_parent_commit_sha:expected});
 const durable=await rpc(base,key,'reality_record_general_original_installed_source_v1',{
  p_attempt_id:scope.attempt_id,p_installed_commit_sha:head,
  p_source_blob_sha:source.blob});
 if(durable.status!=='GENERAL_ORIGINAL_EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_SETTLEMENT'||
  durable.original_work_id!==scope.original_work_id||
  durable.shift_id!==scope.shift_id||
  durable.installed_commit_sha!==head||
  durable.source_blob_sha!==scope.expected_installed_blob_sha||
  durable.source_installed!==true||durable.original_job_completed!==false||
  durable.production_changed!==false)
  fail('SOURCE_INSTALLED_DB_EVIDENCE_NOT_ATOMICALLY_RECORDED');
 return safe(durable.status,{
  original_work_id:scope.original_work_id,shift_id:scope.shift_id,
  installed_commit_sha:head,source_installed:true,
  installation_authorized:true,
  next_gate:'INDEPENDENT_SAME_ORIGINAL_POSTINSTALL_CI_AND_DEPLOYMENT_RECEIPTS'});
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return safe('GENERAL_INSTALL_EXACT_SERVICE_POST_ONLY',{},405);
  if(await req.text()!=='{"version":1,"action":"execute_previously_owner_approved_original_install"}')
   return safe('GENERAL_INSTALL_SIGNED_ORIGINAL_ACTION_REQUIRED',{},400);
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return safe('GENERAL_INSTALL_SERVICE_KEY_REQUIRED',{},403);
  const project=Deno.env.get('SUPABASE_URL')||'';
  let parsed;try{parsed=new URL(project)}catch{return safe('GENERAL_INSTALL_ISOLATED_PROJECT_UNVERIFIED',{},503)}
  if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||
    parsed.pathname!=='/'||parsed.search||parsed.hash)
   return safe('GENERAL_INSTALL_ISOLATED_PROJECT_UNVERIFIED',{},503);
  const base=parsed.origin;
  const scope=await rpc(base,key,'reality_read_general_original_install_scope_v1');
  if(scope.status==='GENERAL_INSTALL_AWAITING_EXACT_OWNER_APPROVAL'||
     scope.status==='GENERAL_INSTALL_AUTHORIZED_SHIFT_NOT_CURRENT')
   return safe(scope.status,{installation_authorized:false});
  if(!validScope(scope))fail('EXACT_OWNER_APPROVED_SCOPE_NOT_VERIFIED');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)
   return safe('GENERAL_INSTALL_REAL_GITHUB_CREDENTIAL_NOT_VERIFIED',{
     original_work_id:scope.original_work_id,installation_authorized:true});
  const head=await branchHead(token,scope.target_branch);
  if(scope.phase==='SOURCE_INSTALLED'||scope.phase==='DEPLOYMENT_VERIFIED')
   return safe('GENERAL_INSTALL_SOURCE_ALREADY_INSTALLED_POSTINSTALL_MONITORING',{
    original_work_id:scope.original_work_id,source_installed:true,
    installation_authorized:true,installed_commit_sha:scope.installed_commit_sha});
  if(scope.phase==='INSTALL_INTENT_FENCED')
   return await reconcile(token,base,key,scope,head);
  // Before claiming a one-time owner-authorized source mutation, require
  // BOTH current exact preimage AND the immutable frozen model candidate.
  const [old,candidate]=await Promise.all([
   checkedSource(token,scope.target_path,head),
   checkedSource(token,scope.target_path,scope.candidate_commit_sha)
  ]);
  if(old.blob!==scope.expected_preinstall_blob_sha||
    candidate.blob!==scope.expected_installed_blob_sha||
    candidate.digest!==scope.candidate_artifact_sha256)
   return safe('GENERAL_INSTALL_CURRENT_SOURCE_OR_FROZEN_CANDIDATE_DRIFT',{
    original_work_id:scope.original_work_id,installation_authorized:true});
  const claimed=await rpc(base,key,'reality_claim_general_original_install_v1',{
   p_expected_head_sha:head});
  if(claimed.status==='GENERAL_INSTALL_INTENT_ALREADY_FENCED_READBACK_ONLY')
   return safe(claimed.status,{original_work_id:scope.original_work_id,
    installation_authorized:true});
  if(claimed.status!=='GENERAL_INSTALL_EXACT_ONCE_OWNER_APPROVED_SOURCE_WRITE_FENCED'||
   claimed.original_work_id!==scope.original_work_id||
   claimed.shift_id!==scope.shift_id||
   claimed.attempt_id!==scope.attempt_id||
   claimed.approval_receipt_id!==scope.approval_receipt_id||
   claimed.target_branch!==scope.target_branch||
   claimed.target_path!==scope.target_path||
   claimed.expected_preinstall_blob_sha!==old.blob||
   claimed.expected_installed_blob_sha!==candidate.blob||
   claimed.expected_parent_commit_sha!==head||
   claimed.candidate_commit_sha!==scope.candidate_commit_sha||
   claimed.candidate_artifact_sha256!==candidate.digest||
   claimed.installation_authorized!==true||
   claimed.source_installed!==false||
   claimed.original_job_completed!==false||
   claimed.production_changed!==false)
   fail('EXACT_OWNER_FENCE_NOT_DURABLY_READ_BACK');
  // Non-forced Git reference update is a provider-level CAS: if another
  // commit advances the branch, the prepared sibling source commit will NOT
  // replace it. There is no retry after any ambiguous provider effect.
  if(await branchHead(token,scope.target_branch)!==head)
   return safe('GENERAL_INSTALL_FENCED_PARENT_COMMIT_DRIFT_NO_WRITE',{
    original_work_id:scope.original_work_id,installation_authorized:true});
  const existingCommit=await gh(token,'/git/commits/'+head);
  const tree=existingCommit.data?.tree?.sha;
  if(!existingCommit.ok||!SHA.test(tree||''))
   fail('APPROVED_PARENT_COMMIT_TREE_NOT_VERIFIED');
  let blob,treeBuilt,commit,published;
  try{
   blob=await gh(token,'/git/blobs','POST',{
    content:encode(candidate.bytes),encoding:'base64'});
   if(!blob.ok||blob.data?.sha!==candidate.blob)
    fail('ONE_USE_GITHUB_CANDIDATE_BLOB_NOT_VERIFIED');
   treeBuilt=await gh(token,'/git/trees','POST',{
    base_tree:tree,
    tree:[{path:scope.target_path,mode:'100644',type:'blob',
      sha:candidate.blob}]});
   if(!treeBuilt.ok||!SHA.test(treeBuilt.data?.sha||''))
    fail('ONE_USE_GITHUB_SOURCE_TREE_NOT_VERIFIED');
   commit=await gh(token,'/git/commits','POST',{
    message:'reality: exact owner-approved isolated original '+scope.original_work_id,
    tree:treeBuilt.data.sha,parents:[head]});
   if(!commit.ok||!SHA.test(commit.data?.sha||'')||
     commit.data.parents?.length!==1||
     commit.data.parents[0]?.sha!==head)
    fail('ONE_USE_GITHUB_COMMIT_PARENT_NOT_VERIFIED');
   published=await gh(token,'/git/refs/heads/'+scope.target_branch,'PATCH',{
    sha:commit.data.sha,force:false});
  }catch{
   return safe('GENERAL_INSTALL_FENCED_PROVIDER_EFFECT_UNCERTAIN_GET_ONLY',{
    original_work_id:scope.original_work_id,installation_authorized:true});
  }
  if(!published?.ok||published.data?.object?.sha!==commit.data.sha)
   return safe('GENERAL_INSTALL_FENCED_REF_UPDATE_NOT_VERIFIED_NO_RETRY',{
    original_work_id:scope.original_work_id,installation_authorized:true});
  const finalHead=await branchHead(token,scope.target_branch);
  if(finalHead!==commit.data.sha)
   return safe('GENERAL_INSTALL_FENCED_POSTWRITE_BRANCH_DRIFT_GET_ONLY',{
    original_work_id:scope.original_work_id,installation_authorized:true});
  return await reconcile(token,base,key,{
   ...scope,phase:'INSTALL_INTENT_FENCED',
   expected_parent_commit_sha:head
  },finalHead);
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const status=/^GENERAL_ORIGINAL_INSTALL_[A-Z0-9_]{5,110}$/.test(raw)?
   raw.slice('GENERAL_ORIGINAL_INSTALL_'.length):
   'GENERAL_INSTALL_SIGNED_PROVIDER_OR_WARRANT_NOT_VERIFIED';
  return safe(status,{},503);
 }
});