// Trusted, preview-only GitHub installation for the verified exact #178
// candidate. This is NOT an agent-controlled branch or arbitrary file writer.
// The installed content is the model-authored source bound to an independently
// verified original owner approval. No production branch and no force pushes.
import {createHash} from 'node:crypto';
const fail=code=>{throw Error('FIRST178_GITHUB_INSTALL_'+code)};
const SHA40=/^[0-9a-f]{40}$/;
const SHA64=/^[0-9a-f]{64}$/;
const ORIGINAL='reality.ci-failure-evidence-v1';
const REPO='maloney2323/Reality';
const BASE_BRANCH='feature/first178-live-single-claim-execution-20261029';
const SOURCE_SHA='6e6014f38f9fea382ea93b38418ec77e9158c1ef';
const FROZEN_PATH='test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js';
const FROZEN_BLOB_SHA='3371237f8cf56a9f7240ba61bd5cd1b67af266c9';
const allowed=x=>/^src\/reality-extensions\/reality-ci-failure-evidence\.mjs$/.test(x)||
 /^test\/reality-extensions\/[a-z0-9_-]+\.(?:test\.js|test\.mjs)$/.test(x);
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
function check({candidate,owner,approval}){
 const files=candidate?.files;
 if(!Array.isArray(files)||files.length<2||
  !files.some(x=>x.path==='src/reality-extensions/reality-ci-failure-evidence.mjs')||
  !files.some(x=>x.path.startsWith('test/'))||
  new Set(files.map(x=>x.path)).size!==files.length||
  files.some(x=>!allowed(x.path)||typeof x.content!=='string'||!x.content.trim()||
   x.content.length>180000)||
  !SHA64.test(candidate.artifact_hash)||
  digest(files.map(x=>({path:x.path,content:x.content})))!==candidate.artifact_hash||
  approval?.kind!=='PROMOTION_AUTHORIZED'||
  approval?.owner_id!==owner||
  approval?.artifact_hash!==candidate.artifact_hash||
  approval?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
  approval?.consumed_once!==true||
  !approval?.reservation_ref||
  approval?.installation_target!=='ISOLATED_PREVIEW')
  fail('EXACT_APPROVED_BYTES_AND_ORIGINAL_GOAL_REQUIRED');
 return files;
}
export function createFirst178GithubInstallationProvider({
 ownerId,originalWorkId,approval,candidate,
 writeToken,readToken=writeToken,fetchImpl=fetch,
}={}){
 if(!/^[0-9a-f-]{36}$/i.test(String(ownerId||''))||
    !/^work:[a-f0-9]{32}$/.test(String(originalWorkId||'')))
  fail('VERIFIED_ORIGINAL_OWNER_REQUIRED');
 const files=check({candidate,owner:ownerId,approval});
 if(typeof writeToken!=='string'||writeToken.length<25||
    typeof readToken!=='string'||readToken.length<20)
  fail('EXPLICIT_ISOLATED_GITHUB_WRITE_CREDENTIAL_REQUIRED');
 const head={accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28',
  authorization:'Bearer '+writeToken,'user-agent':'Reality-First178-Isolated-Installer'};
 const readHead={...head,authorization:'Bearer '+readToken};
 const api=async(method,path,body,read=false)=>{
  if(!path.startsWith('/repos/'+REPO+'/'))fail('UNEXPECTED_PROVIDER_TARGET');
  const response=await fetchImpl('https://api.github.com'+path,{
   method,headers:{...(read?readHead:head),
    ...(body?{'content-type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)fail('PROVIDER_'+method+'_'+String(response.status));
  return data;
 };
 const refPath='/repos/'+REPO+'/git/ref/heads/'+BASE_BRANCH;
 const contentPath=(path,ref)=>'/repos/'+REPO+'/contents/'+path+
   '?ref='+encodeURIComponent(ref);
 // Source from pinned immutable prior red CI, never model-authored test.
 const sourceFrozen=async()=>{
  const test=await api('GET',contentPath(FROZEN_PATH,SOURCE_SHA),null,true);
  if(test?.sha!==FROZEN_BLOB_SHA||test?.encoding!=='base64')
   fail('ORIGINAL_FROZEN_TEST_BLOB_CHANGED');
  const content=Buffer.from(test.content.replace(/\s/g,''),'base64').toString('utf8');
  if(!content.includes('classifyVerifiedCiFailure'))
   fail('FROZEN_TEST_SOURCE_UNVERIFIED');
  return {path:FROZEN_PATH,content};
 };
 const independentlyReadSource=async(sha,all)=>{
  for(const item of all){
   const found=await api('GET',contentPath(item.path,sha),null,true);
   if(found?.encoding!=='base64'||
      Buffer.from(found.content.replace(/\s/g,''),'base64').toString('utf8')!==item.content)
    fail('INSTALLED_PROVIDER_SOURCE_BYTES_MISMATCH');
  }
 };
 async function writeAndReadback(){
  // Exact preview branch is allowed; never alter default/main/production.
  const frozen=await sourceFrozen();
  const all=[...files,frozen];
  if(new Set(all.map(x=>x.path)).size!==all.length)fail('INSTALL_FILE_DUPLICATE');
  const base=await api('GET',refPath,null,true);
  const headSha=base?.object?.sha;
  if(!SHA40.test(headSha))fail('HEAD_COMMIT_UNVERIFIED');
  const baseCommit=await api('GET','/repos/'+REPO+'/git/commits/'+headSha,null,true);
  if(!SHA40.test(baseCommit?.tree?.sha))fail('BASE_TREE_UNVERIFIED');
  // No source silently overwritten after someone else installed the job.
  const tree=await api('GET','/repos/'+REPO+'/git/trees/'+baseCommit.tree.sha+'?recursive=1',null,true);
  const exists=all.filter(item=>(tree?.tree||[]).some(e=>e.path===item.path));
  if(exists.length){
   // An uncertain prior GitHub commit must be reconciled against ALL exact
   // approved bytes, never retried as a second commit. No mixed-partial
   // state can count as installed.
   if(exists.length!==all.length)
    fail('PARTIAL_INSTALL_REQUIRES_READ_ONLY_RECONCILIATION');
   await independentlyReadSource(headSha,all);
   return Object.freeze({
    kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',
    repository:REPO,branch:BASE_BRANCH,
    installed_commit_sha:headSha,source_base_sha:null,
    artifact_hash:candidate.artifact_hash,
    original_work_id:originalWorkId,capability_id:ORIGINAL,
    frozen_source_sha:SOURCE_SHA,
    provider_source_files:all.map(x=>x.path),
    installation_authority_ref:approval.reservation_ref,
    production_changed:false,
    independently_verified:false,original_job_completed:false,
    previously_installed_exact_bytes:true,
   });
  }
  const entries=[];
  for(const item of all){
   const blob=await api('POST','/repos/'+REPO+'/git/blobs',{
    content:item.content,encoding:'utf-8'});
   if(!SHA40.test(blob?.sha))fail('GIT_BLOB_RECEIPT_UNVERIFIED');
   entries.push({path:item.path,type:'blob',mode:'100644',sha:blob.sha});
  }
  const createdTree=await api('POST','/repos/'+REPO+'/git/trees',{
   base_tree:baseCommit.tree.sha,tree:entries});
  if(!SHA40.test(createdTree?.sha))fail('INSTALLED_TREE_UNVERIFIED');
  const commit=await api('POST','/repos/'+REPO+'/git/commits',{
   message:'Reality #178: install owner-approved verified candidate in isolated preview',
   tree:createdTree.sha,parents:[headSha]});
  if(!SHA40.test(commit?.sha))fail('INSTALLED_COMMIT_UNVERIFIED');
  // Fast-forward only. Any competing branch change blocks installation.
  await api('PATCH','/repos/'+REPO+'/git/refs/heads/'+BASE_BRANCH,{
   sha:commit.sha,force:false});
  const after=await api('GET',refPath,null,true);
  if(after?.object?.sha!==commit.sha)fail('INSTALLED_BRANCH_READBACK_MISMATCH');
  await independentlyReadSource(commit.sha,all);
  return Object.freeze({
   kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',
   repository:REPO,branch:BASE_BRANCH,
   installed_commit_sha:commit.sha,source_base_sha:headSha,
   artifact_hash:candidate.artifact_hash,
   original_work_id:originalWorkId,capability_id:ORIGINAL,
   frozen_source_sha:SOURCE_SHA,
   provider_source_files:all.map(x=>x.path),
   installation_authority_ref:approval.reservation_ref,
   production_changed:false,
   // Installation alone NEVER implies independent frozen tests passed.
   independently_verified:false,original_job_completed:false,
  });
 }
 async function observeFrozenAcceptance(commitSha){
  if(!SHA40.test(commitSha))fail('ACCEPTANCE_SHA_REQUIRED');
  const r=await api('GET','/repos/'+REPO+'/actions/runs?head_sha='+
   commitSha+'&per_page=35',null,true);
  const runs=(r.workflow_runs||[]).filter(x=>
   x.head_sha===commitSha&&
   x.name==='Reality — First Provider Gap to Model Handoff (no install)');
  const success=runs.find(x=>x.status==='completed'&&x.conclusion==='success');
  if(!success)return Object.freeze({status:runs.some(x=>
   x.status==='completed'&&x.conclusion!=='success')?
   'FROZEN_ACCEPTANCE_FAILED':'FROZEN_ACCEPTANCE_PENDING',
   installed_commit_sha:commitSha,verified:false,
   original_job_completed:false});
  return Object.freeze({
   status:'FROZEN_ACCEPTANCE_VERIFIED',verified:true,
   installed_commit_sha:commitSha,
   provider_run_id:success.id,
   provider_run_url:success.html_url,
   artifact_hash:candidate.artifact_hash,
   original_work_id:originalWorkId,production_changed:false,
   original_job_completed:false,
  });
 }
 return Object.freeze({writeAndReadback,observeFrozenAcceptance});
}
