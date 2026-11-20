// Signed original maintenance uses the EXISTING isolated privileged GitHub
// installer. The caller has already authenticated the service key; the
// database alone supplies the exact one-use owner-approved artifact scope.
// An ambiguous provider write is never retried: FENCED => GET-only reconcile.
const PROJECT='hvkfreoagbrphwghjajw';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const BRANCH='reality/chat-direct-work-handoff-20261115';
const bad=(x:string):never=>{throw Error('SIGNED_MAINTENANCE_INSTALL_'+x)};
const safe=(status:string,rest:Record<string,unknown>={},http=200)=>
 new Response(JSON.stringify({ok:http===200,status,...rest,
  source_installed:false,original_job_completed:false,production_changed:false,
  new_shift_started:false}),{status:http,headers:{'content-type':'application/json',
  'cache-control':'no-store'}});
async function rpc(base:string,key:string,name:string,args:Record<string,unknown>={}){
 if(!['reality_read_signed_maintenance_approved_install_scope_v1',
       'reality_claim_signed_maintenance_approved_install_v1',
       'reality_record_signed_maintenance_installed_source_v1'].includes(name))
  bad('UNREGISTERED_SERVICE_RPC');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
  headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},
  body:JSON.stringify(args)});
 if(!r.ok)bad('SIGNED_DATABASE_RPC_UNAVAILABLE');
 const x=await r.json().catch(()=>null);
 if(!x||typeof x!=='object'||Array.isArray(x))bad('DATABASE_RESPONSE_INVALID');
 return x;
}
async function gh(token:string,path:string,method='GET',body?:unknown){
 const r=await fetch(ROOT+path,{method,cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(11000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Governed-Existing-Maintenance-Installer',
   ...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json().catch(()=>null);
 return {ok:r.ok,status:r.status,data:d};
}
async function blobSha(bytes:Uint8Array){
 const prefix=new TextEncoder().encode('blob '+bytes.length+'\0');
 const all=new Uint8Array(prefix.length+bytes.length);
 all.set(prefix);all.set(bytes,prefix.length);
 const dig=await crypto.subtle.digest('SHA-1',all);
 return Array.from(new Uint8Array(dig)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function checked(token:string,path:string,ref:string){
 if(!/^src\/[a-z0-9_./-]+\.js$/.test(path)||path.includes('..')||!SHA.test(ref))
  bad('EXACT_SOURCE_PATH_OR_REF_INVALID');
 const {ok,data}=await gh(token,'/contents/'+path+'?ref='+ref);
 if(!ok||data?.path!==path||data.encoding!=='base64'||
   typeof data.content!=='string'||!SHA.test(data.sha||'')||
   !Number.isSafeInteger(data.size)||data.size<200||data.size>90000)
  bad('EXACT_SOURCE_PROVIDER_METADATA_UNVERIFIED');
 const bytes=Uint8Array.from(atob(data.content.replace(/\s/g,'')),x=>x.charCodeAt(0));
 if(bytes.length!==data.size||await blobSha(bytes)!==data.sha)
  bad('EXACT_SOURCE_BYTES_SHA_MISMATCH');
 return {bytes,sha:data.sha,content:data.content};
}
async function head(token:string){
 const r=await gh(token,'/git/ref/heads/'+BRANCH);
 if(!r.ok||r.data?.ref!=='refs/heads/'+BRANCH||
  !SHA.test(r.data?.object?.sha||''))bad('EXACT_GITHUB_BRANCH_HEAD_UNVERIFIED');
 return r.data.object.sha as string;
}
function valid(x:any){
 return x?.status==='EXACT_OWNER_APPROVED_MAINTENANCE_INSTALL_SCOPE'&&
  UUID.test(x.owner_id||'')&&UUID.test(x.shift_id||'')&&
  UUID.test(x.maintenance_id||'')&&UUID.test(x.approval_id||'')&&
  HASH.test(x.approval_receipt_sha256||'')&&
  HASH.test(x.artifact_receipt_sha256||'')&&
  HASH.test(x.case_ci_receipt_sha256||'')&&
  HASH.test(x.target_review_receipt_sha256||'')&&
  SHA.test(x.candidate_commit_sha||'')&&SHA.test(x.candidate_blob_sha||'')&&
  SHA.test(x.expected_parent_sha||'')&&SHA.test(x.expected_old_blob_sha||'')&&
  /^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(x.source_ref||'')&&
  /^src\/[a-z0-9_./-]+\.js$/.test(x.source_path||'')&&
  !x.source_path.includes('..')&&x.target_branch===BRANCH&&
  x.candidate_blob_sha!==x.expected_old_blob_sha&&
  ['APPROVED','FENCED','INSTALLED','VERIFIED'].includes(x.phase)&&
  x.installation_authorized===true&&
  x.original_job_completed===false&&x.production_changed===false;
}
async function reconcile(token:string,base:string,key:string,x:any,observed:string){
 if(x.phase==='INSTALLED'||x.phase==='VERIFIED')
  return safe('SIGNED_MAINTENANCE_INSTALLED_AWAITING_INDEPENDENT_JOB_VERIFICATION',{
   maintenance_id:x.maintenance_id,shift_id:x.shift_id,
   installed_commit_sha:x.installed_commit_sha,source_installed:true,
   installation_authorized:true});
 if(x.phase!=='FENCED')bad('RECONCILE_REQUIRES_FENCED_ONCE');
 // After an uncertain remote write, do not PATCH again. Require evidence
 // that the exact one-file, one-parent source transition has occurred.
 const [commit,installed]=await Promise.all([
  gh(token,'/commits/'+observed),
  checked(token,x.source_path,observed).catch(()=>null)
 ]);
 if(!commit.ok||commit.data?.parents?.length!==1||
  commit.data.parents[0]?.sha!==x.expected_parent_sha||
  !Array.isArray(commit.data?.files)||commit.data.files.length!==1||
  commit.data.files[0]?.filename!==x.source_path||
  commit.data.files[0]?.status!=='modified'||
  !installed||installed.sha!==x.candidate_blob_sha)
  return safe('SIGNED_MAINTENANCE_FENCED_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY',{
   maintenance_id:x.maintenance_id,installation_authorized:true});
 const saved=await rpc(base,key,'reality_record_signed_maintenance_installed_source_v1',{
  p_maintenance_id:x.maintenance_id,p_approval_id:x.approval_id,
  p_installed_commit_sha:observed,
  p_verified_source_blob_sha:installed.sha});
 if(saved.status!=='EXACT_OWNER_APPROVED_MAINTENANCE_SOURCE_INSTALLED_NEEDS_INDEPENDENT_ACCEPTANCE'||
  saved.maintenance_id!==x.maintenance_id||saved.owner_id!==x.owner_id||
  saved.shift_id!==x.shift_id||saved.approval_id!==x.approval_id||
  saved.installed_commit_sha!==observed||saved.source_blob_sha!==installed.sha||
  saved.repair_installed!==true||saved.original_job_completed!==false||
  saved.production_changed!==false)
  bad('EXACT_INSTALLED_SOURCE_DURABLE_RECEIPT_UNVERIFIED');
 return safe(saved.status,{maintenance_id:x.maintenance_id,shift_id:x.shift_id,
  installed_commit_sha:observed,source_installed:true,
  installation_authorized:true,
  next_action:'INDEPENDENT_POSTINSTALL_SOURCE_CI_AND_ORIGINAL_RESUMPTION'});
}
export async function installApprovedMaintenance(base:string,key:string){
 try{
  if(base!=='https://'+PROJECT+'.supabase.co'||key.length<25)
   return safe('SIGNED_MAINTENANCE_ISOLATED_SERVICE_SCOPE_REQUIRED',{},503);
  const x=await rpc(base,key,'reality_read_signed_maintenance_approved_install_scope_v1');
  if(x.status==='NO_EXACT_OWNER_APPROVED_MAINTENANCE_INSTALL'&&
    x.installation_authorized===false)
   return safe(x.status,{installation_authorized:false});
  if(!valid(x))bad('SIGNED_OWNER_APPROVAL_AND_SOURCE_SCOPE_UNVERIFIED');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)return safe('SIGNED_MAINTENANCE_INSTALL_GITHUB_CREDENTIAL_UNAVAILABLE',{
   maintenance_id:x.maintenance_id,installation_authorized:true},503);
  const observed=await head(token);
  if(x.phase!=='APPROVED')return await reconcile(token,base,key,x,observed);
  if(observed!==x.expected_parent_sha)
   return safe('SIGNED_MAINTENANCE_APPROVED_TARGET_HEAD_DRIFT_REVIEW_REQUIRED',{
    maintenance_id:x.maintenance_id,installation_authorized:true});
  const [old,candidate]=await Promise.all([
   checked(token,x.source_path,observed),
   checked(token,x.source_path,x.candidate_commit_sha)
  ]);
  if(old.sha!==x.expected_old_blob_sha||candidate.sha!==x.candidate_blob_sha)
   return safe('SIGNED_MAINTENANCE_APPROVED_EXACT_BLOB_DRIFT',{
    maintenance_id:x.maintenance_id,installation_authorized:true});
  const claim=await rpc(base,key,'reality_claim_signed_maintenance_approved_install_v1',{
   p_maintenance_id:x.maintenance_id,p_expected_parent_sha:observed,
   p_approval_id:x.approval_id});
  if(claim.status!=='MAINTENANCE_EXACT_OWNER_APPROVED_SOURCE_WRITE_FENCED'||
   claim.maintenance_id!==x.maintenance_id||
   claim.owner_id!==x.owner_id||claim.shift_id!==x.shift_id||
   claim.approval_id!==x.approval_id||
   claim.approval_receipt_sha256!==x.approval_receipt_sha256||
   claim.expected_parent_sha!==observed||
   claim.expected_old_blob_sha!==old.sha||
   claim.candidate_blob_sha!==candidate.sha||
   claim.candidate_commit_sha!==x.candidate_commit_sha||
   claim.installation_authorized!==true||
   claim.repair_installed!==false||
   claim.original_job_completed!==false)
   return safe('SIGNED_MAINTENANCE_OWNER_FENCE_UNVERIFIED_NO_WRITE',{
    maintenance_id:x.maintenance_id});
  if(await head(token)!==observed)
   return safe('SIGNED_MAINTENANCE_FENCED_TARGET_MOVED_NO_WRITE',{
    maintenance_id:x.maintenance_id,installation_authorized:true});
  const parent=await gh(token,'/git/commits/'+observed);
  if(!parent.ok||!SHA.test(parent.data?.tree?.sha||''))
   return safe('SIGNED_MAINTENANCE_FENCED_PARENT_UNVERIFIED_NO_WRITE',{
    maintenance_id:x.maintenance_id,installation_authorized:true});
  let file,tree,commit,published;
  try{
   file=await gh(token,'/git/blobs','POST',{
    content:btoa(String.fromCharCode(...candidate.bytes)),encoding:'base64'});
   if(!file.ok||file.data?.sha!==candidate.sha)
    bad('FENCED_CANDIDATE_BLOB_NOT_IDENTICAL');
   tree=await gh(token,'/git/trees','POST',{base_tree:parent.data.tree.sha,
    tree:[{path:x.source_path,mode:'100644',type:'blob',sha:candidate.sha}]});
   if(!tree.ok||!SHA.test(tree.data?.sha||''))
    bad('FENCED_EXACT_TREE_UNVERIFIED');
   commit=await gh(token,'/git/commits','POST',{
    message:'reality: owner-approved exact signed maintenance '+x.maintenance_id,
    tree:tree.data.sha,parents:[observed]});
   if(!commit.ok||!SHA.test(commit.data?.sha||'')||
    commit.data.parents?.length!==1||commit.data.parents[0]?.sha!==observed)
    bad('FENCED_EXACT_COMMIT_UNVERIFIED');
   published=await gh(token,'/git/refs/heads/'+BRANCH,'PATCH',{
    sha:commit.data.sha,force:false});
  }catch{
   return safe('SIGNED_MAINTENANCE_FENCED_PROVIDER_EFFECT_UNCERTAIN_GET_ONLY',{
    maintenance_id:x.maintenance_id,installation_authorized:true});
  }
  if(!published.ok||published.data?.object?.sha!==commit.data.sha)
   return safe('SIGNED_MAINTENANCE_FENCED_REF_UNVERIFIED_NO_RETRY',{
    maintenance_id:x.maintenance_id,installation_authorized:true});
  const final=await head(token);
  if(final!==commit.data.sha)
   return safe('SIGNED_MAINTENANCE_FENCED_POSTWRITE_BRANCH_DRIFT_NO_RETRY',{
    maintenance_id:x.maintenance_id,installation_authorized:true});
  return await reconcile(token,base,key,{...x,phase:'FENCED'},final);
 }catch(e){
  const err=e instanceof Error?e.message:'';
  return safe(/^SIGNED_MAINTENANCE_INSTALL_[A-Z0-9_]+$/.test(err)?
   err:'SIGNED_MAINTENANCE_INSTALL_PROVIDER_OR_WARRANT_UNVERIFIED',{},503);
 }
}
