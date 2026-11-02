// Post-approval GitHub wake: only an owner-authenticated server may call this.
// GitHub Actions rechecks immutable approval via signed OIDC before installing.
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error('REALITY_APPROVED_WAKE_'+code)};
export async function wakeApprovedIsolatedInstall({receipt,env=process.env,fetchImpl=fetch}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!=='hvkfreoagbrphwghjajw'||
    receipt?.status!=='OWNER_APPROVED_ISOLATED_INSTALL_PENDING'||
    receipt?.target_environment!=='ISOLATED_PREVIEW'||
    receipt?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
    receipt?.source_installation_completed!==false||
    receipt?.production_changed!==false||
    receipt?.original_job_completed!==false||
    !UUID.test(receipt?.approval_id)||!UUID.test(receipt?.trigger_id)||
    !WORK.test(receipt?.original_work_id)||!HASH.test(receipt?.artifact_sha256))
  fail('EXACT_DURABLE_OWNER_APPROVAL_REQUIRED');
 const token=String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||'');
 if(token.length<25)fail('PREVIEW_GITHUB_WORKER_WRITE_TOKEN_REQUIRED');
 const request=async(path,{method='GET',body}={})=>{
  const response=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
   method,redirect:'error',cache:'no-store',headers:{
     authorization:'Bearer '+token,accept:'application/vnd.github+json',
     'x-github-api-version':'2022-11-28','content-type':'application/json',
     'user-agent':'Reality-exact-approved-install-wakeup-v1'},
   body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json().catch(()=>null);
  if(response.status===404)return null;
  if(!response.ok)fail('GITHUB_'+method+'_'+response.status);
  return result;
 };
 const ref=await request('/git/ref/heads/'+BRANCH);
 if(!SHA.test(ref?.object?.sha))fail('PINNED_ISOLATED_BRANCH_UNAVAILABLE');
 const path='reality-approved-install-wakes/'+receipt.approval_id+'.json';
 const body=JSON.stringify({
  approval_id:receipt.approval_id,trigger_id:receipt.trigger_id,
  original_work_id:receipt.original_work_id,
  artifact_sha256:receipt.artifact_sha256,
  target_environment:'ISOLATED_PREVIEW',
  // A file is a wake event, never an approval or an installation warrant.
  authorization_source:'DURABLE_OWNER_RECEIPT_READBACK_REQUIRED',
 },null,2)+'\\n';
 const endpoint='/contents/'+path+'?ref='+encodeURIComponent(BRANCH);
 const before=await request(endpoint);
 let created=false;
 if(before){
  const value=Buffer.from(String(before.content||'').replace(/\\s/g,''),'base64').toString('utf8');
  if(before.path!==path||value!==body)fail('WAKE_FILE_COLLISION');
 }else{
  const result=await request('/contents/'+path,{method:'PUT',body:{
   message:'Wake exactly owner-approved isolated capability '+receipt.approval_id,
   branch:BRANCH,content:Buffer.from(body).toString('base64')}});
  if(!SHA.test(result?.commit?.sha)||result?.content?.path!==path)
   fail('WAKE_COMMIT_NOT_VERIFIED');
  created=true;
 }
 const read=await request(endpoint);
 const observed=Buffer.from(String(read?.content||'').replace(/\\s/g,''),'base64').toString('utf8');
 if(read?.path!==path||observed!==body)fail('WAKE_PROVIDER_READBACK_MISMATCH');
 return Object.freeze({
  status:created?'SIGNED_WORKER_WAKE_COMMITTED':'SIGNED_WORKER_WAKE_ALREADY_PRESENT',
  original_work_id:receipt.original_work_id,approval_id:receipt.approval_id,
  artifact_sha256:receipt.artifact_sha256,dispatched:true,
  worker_execution_started:false,installation_completed:false,
  production_changed:false,
 });
}
