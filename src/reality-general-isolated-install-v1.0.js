// Provider-backed, job-agnostic GitHub installer: ONE exact extension artifact
// already independently sandbox-verified and approved by the signed-in owner.
// Never called by a model, cron, discovery job, or unsigned browser request.
// No production/main branch, force push, protected files, overwritten source,
// cross-repo writes, or implicit owner approval.
import {createHash} from 'node:crypto';
const REPO='maloney2323/Reality';
const BASE='https://api.github.com/repos/'+REPO;
const sha40=x=>/^[a-f0-9]{40}$/.test(String(x||''));
const sha64=x=>/^[a-f0-9]{64}$/.test(String(x||''));
const work=x=>/^work:[a-f0-9]{32}$/.test(String(x||''));
const fail=x=>{throw Error('GENERAL_PREVIEW_INSTALL_'+x)};
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const allowed=x=>typeof x==='string'&&x.length<=220&&
 /^(?:src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs|test\/reality-extensions\/[A-Za-z0-9._/-]+\.test\.(?:js|mjs))$/.test(x)&&
 !x.includes('//')&&!x.split('/').includes('..')&&!x.split('/').includes('.');
export async function installVerifiedGenericPreviewExtension({
 ticket,candidate,sandbox,approval,verifyOwnerApproval,branch,writeToken,
 fetchImpl=fetch,
}={}){
 if(ticket?.environment!=='ISOLATED_PREVIEW'||!work(ticket?.original_work_id)||
  !sha40(ticket?.repository_base_sha)||!branch||
  !/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(branch)||branch.includes('..')||
  branch==='main'||branch==='master')
  fail('PINNED_PREVIEW_SCOPE_REQUIRED');
 if(typeof writeToken!=='string'||writeToken.length<25)
  fail('PROVIDER_WRITE_CREDENTIAL_REQUIRED');
 const files=candidate?.files;
 if(!Array.isArray(files)||files.length<2||files.length>12||
  !files.some(x=>String(x.path).startsWith('src/'))||
  !files.some(x=>String(x.path).startsWith('test/'))||
  new Set(files.map(x=>x.path)).size!==files.length||
  files.some(x=>!allowed(x.path)||typeof x.content!=='string'||
    !x.content.length||x.content.length>70000))
  fail('EXTENSION_SOURCE_AND_TESTS_REQUIRED');
 const artifact=digest(files.map(x=>({path:x.path,content:x.content})));
 if(!sha64(artifact)||artifact!==candidate.artifact_hash||
  approval?.kind!=='PROMOTION_AUTHORIZED'||
  approval?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
  approval?.consumed_once!==true||
  approval?.original_work_id!==ticket.original_work_id||
  approval?.owner_id!==ticket.owner_id||
  approval?.goal_id!==ticket.goal_id||
  approval?.artifact_hash!==artifact||
  !approval?.reservation_ref||
  sandbox?.artifact_hash!==artifact||
  sandbox?.independently_verified!==true||
  sandbox?.independent_tests_passed!==true||
  sandbox?.frozen_regression_passed!==true||
  sandbox?.governance_preserved!==true||
  !sandbox?.verifier_run_ref)
  fail('EXACT_APPROVAL_AND_INDEPENDENT_SANDBOX_REQUIRED');
 if(typeof verifyOwnerApproval!=='function')
  fail('INDEPENDENT_ATOMIC_APPROVAL_READBACK_REQUIRED');
 const readback=await verifyOwnerApproval({
  original_work_id:ticket.original_work_id,
  owner_id:ticket.owner_id,goal_id:ticket.goal_id,
  artifact_hash:artifact,reservation_ref:approval.reservation_ref,
  source_sha:ticket.repository_base_sha,branch,
 });
 if(readback?.verified!==true||readback?.consumed_once!==true||
  readback?.reservation_ref!==approval.reservation_ref||
  readback?.original_work_id!==ticket.original_work_id||
  readback?.owner_id!==ticket.owner_id||
  readback?.artifact_hash!==artifact||
  readback?.target_environment!=='ISOLATED_PREVIEW')
  fail('OWNER_APPROVAL_NOT_PROVEN_IN_PROVIDER');
 const headers={'accept':'application/vnd.github+json',
  'authorization':'Bearer '+writeToken,
  'x-github-api-version':'2022-11-28',
  'user-agent':'Reality-general-preview-installer-v1'};
 async function api(method,path,body){
  if(!path.startsWith('/'))fail('PROVIDER_PATH_INVALID');
  const response=await fetchImpl(BASE+path,{
   method,redirect:'error',cache:'no-store',
   headers:{...headers,...(body?{'content-type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>null);
  if(!response.ok)fail('PROVIDER_'+method+'_'+response.status);
  return data;
 }
 const branchPath='/git/ref/heads/'+branch;
 const before=await api('GET',branchPath);
 if(before?.object?.sha!==ticket.repository_base_sha)
  fail('PINNED_BRANCH_HEAD_CHANGED');
 const base=await api('GET','/git/commits/'+ticket.repository_base_sha);
 if(!sha40(base?.tree?.sha))fail('BASE_TREE_UNVERIFIED');
 const observed=await api('GET','/git/trees/'+base.tree.sha+'?recursive=1');
 if(observed?.truncated===true||!Array.isArray(observed?.tree))
  fail('REPOSITORY_TREE_UNVERIFIED');
 if(files.some(x=>observed.tree.some(row=>row.path===x.path)))
  fail('EXISTING_FILE_REQUIRES_SEPARATE_CHANGE_APPROVAL');
 const entries=[];
 for(const f of files){
  const blob=await api('POST','/git/blobs',{content:f.content,encoding:'utf-8'});
  if(!sha40(blob?.sha))fail('BLOB_WRITE_UNVERIFIED');
  entries.push({path:f.path,type:'blob',mode:'100644',sha:blob.sha});
 }
 const tree=await api('POST','/git/trees',{base_tree:base.tree.sha,tree:entries});
 if(!sha40(tree?.sha))fail('TREE_WRITE_UNVERIFIED');
 const commit=await api('POST','/git/commits',{
  message:'Reality: exact owner-approved verified preview extension for '+ticket.original_work_id,
  tree:tree.sha,parents:[ticket.repository_base_sha]});
 if(!sha40(commit?.sha))fail('COMMIT_WRITE_UNVERIFIED');
 // Non-force fast-forward only; if the branch moved, the provider rejects.
 await api('PATCH','/git/refs/heads/'+branch,{sha:commit.sha,force:false});
 const after=await api('GET',branchPath);
 if(after?.object?.sha!==commit.sha)fail('INSTALLED_BRANCH_READBACK_MISMATCH');
 for(const f of files){
  const row=await api('GET','/contents/'+f.path+'?ref='+commit.sha);
  if(row?.encoding!=='base64'||
   Buffer.from(String(row.content||'').replace(/\s/g,''),'base64').toString('utf8')!==f.content)
   fail('INSTALLED_SOURCE_PROVIDER_BYTES_CHANGED');
 }
 return Object.freeze({
  kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',
  owner_id:ticket.owner_id,goal_id:ticket.goal_id,
  original_work_id:ticket.original_work_id,
  artifact_hash:artifact,installed_commit_sha:commit.sha,
  installed_branch:branch,installation_authority_ref:approval.reservation_ref,
  provider_source_files:files.map(f=>f.path),provider_bytes_readback_verified:true,
  // Running code, registry activation, work resumption and settlement still
  // each require a SEPARATE independent provider receipt.
  capability_registered:false,original_job_completed:false,
  production_changed:false,
 });
}
