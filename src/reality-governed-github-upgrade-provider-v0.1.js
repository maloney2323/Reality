// Provider adapter for governed, *isolated* Reality self-upgrades.
// Never publish this behind a client-authorized HTTP route. The trusted
// caller must first establish a goal-bound, exact-candidate authority policy,
// consume a durable single-use execution reservation, and then supply the
// consumed reservation readback. This adapter NEVER merges or deploys.
//
// The v0.1 pilot is intentionally bounded to CREATE NEW extension modules
// (not rewrites of governance/authority/runtime code). A future repair of an
// existing source file requires a separately designed content-SHA precondition.
import {createHash} from 'node:crypto';
import {githubGet,githubWrite} from './reality-connector-github-v1.0.js';

export const GOVERNED_GITHUB_UPGRADE_PROVIDER_VERSION='reality-governed-github-upgrade-provider-v0.1';
const REPO='maloney2323/Reality';
const ROOT='/repos/'+REPO;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const WORK=/^work:[0-9a-f]{32}$/;
const BRANCH=/^reality\/build\/build-[0-9a-f]{32}$/;
const SHA=/^[0-9a-f]{40}$/;
const SHA256=/^[0-9a-f]{64}$/;
const PATH=/^(?:src|test)\/reality-extensions\/[a-z0-9][a-z0-9-]{0,55}\.(?:js|mjs)$/;
const fail=code=>{throw Error(code)};
const hex=text=>createHash('sha256').update(text).digest('hex');
const candidateHash=files=>hex(JSON.stringify(files.map(f=>({
 path:f.path,content:f.content,mode:f.mode||'100644',
}))));
function asserted(files){
 if(!Array.isArray(files)||files.length<1||files.length>3)
  fail('UPGRADE_EXACT_FILE_COUNT_REQUIRED');
 const paths=new Set();
 for(const f of files){
  if(typeof f.path!=='string'||!PATH.test(f.path)||paths.has(f.path)||
     f.mode!=='100644'||typeof f.content!=='string'||
     f.content.length<1||Buffer.byteLength(f.content,'utf8')>12000)
   fail('UPGRADE_EXACT_EXTENSION_PATH_OR_CONTENT_INVALID');
  paths.add(f.path);
 }
 if(!files.some(f=>f.path.startsWith('src/reality-extensions/')))
  fail('UPGRADE_SOURCE_EXTENSION_REQUIRED');
 return files;
}
function trust({build,lease,verifiedExperiment}){
 if(build?.state!=='AUTHORIZED'||build?.production_merge_permitted!==false||
    build?.base_ref!==BASE||!/^build:[0-9a-f]{32}$/.test(String(build.build_id||''))||
    !Array.isArray(build.files))
  fail('UPGRADE_AUTHORIZED_BUILD_REQUIRED');
 asserted(build.files);
 if(lease?.status!=='DISPATCHING'||
    lease.single_use_claim_consumed!==true||
    !WORK.test(String(lease.original_work_id||''))||
    lease.approved_build_id!==build.build_id||
    lease.approved_candidate_hash!==candidateHash(build.files)||
    lease.operation!=='github:create_isolated_upgrade_pr'||
    lease.repository!==REPO||lease.base_ref!==BASE||
    !SHA.test(String(lease.pinned_base_sha||''))||
    !SHA256.test(String(lease.authorization_policy_sha||''))||
    lease.production_merge_authorized!==false)
  fail('UPGRADE_DURABLE_SINGLE_USE_CANDIDATE_AUTHORIZATION_REQUIRED');
 if(!build.authorization_ref||!build.authorized_by)
  fail('UPGRADE_TRUSTED_OWNER_APPROVAL_REQUIRED');
 // Existing Recovery v1 SANDBOX_VERIFIED is the only candidate source.
 // A model suggestion or a PR-ready file list cannot pass this boundary.
 if(verifiedExperiment?.state!=='SANDBOX_VERIFIED'||
    verifiedExperiment?.work_item_id!==lease.original_work_id||
    verifiedExperiment?.production_graph_write_permitted!==false||
    !/^worldline:ephemeral:[0-9a-f]{32}$/.test(String(verifiedExperiment.ephemeral_worldline_id||''))||
    !/^[0-9a-f]{64}$/.test(String(verifiedExperiment.verification_hash||''))||
    verifiedExperiment?.verification_bundle?.frozen_regression?.passed!==true||
    verifiedExperiment?.verification_bundle?.isolated_verification?.verified!==true||
    verifiedExperiment?.verification_bundle?.capability_signature!==verifiedExperiment.capability_signature||
    candidateHash(verifiedExperiment?.verification_bundle?.synthesized_capability?.files||[])!==lease.approved_candidate_hash)
  fail('UPGRADE_INDEPENDENT_SANDBOX_VERIFICATION_REQUIRED');
 return Object.freeze({build,lease,verifiedExperiment});
}
function branchPath(branch){
 if(!BRANCH.test(String(branch||'')))fail('UPGRADE_BRANCH_SCOPE_INVALID');
 return branch;
}
function responseContent(value,path,branch){
 if(value?.type!=='file'||value.path!==path||value.encoding!=='base64'||
    typeof value.content!=='string')
  fail('UPGRADE_GITHUB_FILE_READBACK_UNVERIFIED');
 const text=Buffer.from(value.content.replace(/\s+/g,''),'base64').toString('utf8');
 if(!value.sha||typeof value.sha!=='string')
  fail('UPGRADE_GITHUB_FILE_BLOB_UNVERIFIED');
 return text;
}
export function createGovernedGithubUpgradeProvider({
 authorizedBuild,consumedReservation,verifiedExperiment,get=githubGet,write=githubWrite,
}={}){
 const {build,lease}=trust({build:authorizedBuild,lease:consumedReservation,verifiedExperiment});
 let createdBranch=null,commit=null,openedPr=null;
 async function verifyRef(branch,sha){
  const result=await get(ROOT+'/git/ref/heads/'+branch);
  if(result?.ref!=='refs/heads/'+branch||result?.object?.sha!==sha)
   fail('UPGRADE_GITHUB_BRANCH_READBACK_UNVERIFIED');
  return result;
 }
 return Object.freeze({
  async createBranch({baseRef,branch}={}){
   if(createdBranch!==null)fail('UPGRADE_BRANCH_ALREADY_ATTEMPTED_NO_RETRY');
   if(baseRef!==BASE)fail('UPGRADE_UNAUTHORIZED_BASE_REF');
   branchPath(branch);
   // Never infer expected base from a moving branch alone.
   const live=await get(ROOT+'/git/ref/heads/'+BASE);
   if(live?.ref!=='refs/heads/'+BASE||
      live.object?.sha!==lease.pinned_base_sha)
    fail('UPGRADE_PINNED_BASE_CHANGED');
   // Set attempted BEFORE provider POST, so any ambiguous network outcome
   // cannot cause a retry under the same process. DB reservation supplies
   // the cross-process barrier and must be consumed by the trusted caller.
   createdBranch={branch,sha:lease.pinned_base_sha,attempted:true};
   const created=await write(ROOT+'/git/refs','POST',{
    ref:'refs/heads/'+branch,sha:lease.pinned_base_sha,
   });
   if(created?.ref!=='refs/heads/'+branch||
      created.object?.sha!==lease.pinned_base_sha)
    fail('UPGRADE_BRANCH_CREATION_OUTCOME_UNVERIFIED');
   await verifyRef(branch,lease.pinned_base_sha);
   return {branchSha:lease.pinned_base_sha};
  },
  async writeFiles({branch,baseRef,files,expectedBaseSha,buildId}={}){
   if(!createdBranch||commit!==null)
    fail('UPGRADE_WRITE_ORDER_OR_REPLAY_INVALID');
   branchPath(branch);
   if(branch!==createdBranch.branch||baseRef!==BASE||
      buildId!==build.build_id||expectedBaseSha!==lease.pinned_base_sha||
      candidateHash(files||[])!==lease.approved_candidate_hash)
    fail('UPGRADE_WRITE_CANDIDATE_OR_BRANCH_SCOPE_CHANGED');
   asserted(files);
   if(JSON.stringify(files)!==JSON.stringify(build.files))
    fail('UPGRADE_WRITE_FILE_BYTES_NOT_APPROVED');
   // Treat any partial multi-file provider write as uncertain. DO NOT retry
   // missing files, create a new branch, or open a partial pull request.
   commit={attempted:true,sha:null};
   let previous=lease.pinned_base_sha;
   for(const file of files){
    await verifyRef(branch,previous);
    let exists=false;
    try{
     const old=await get(ROOT+'/contents/'+file.path+'?ref='+encodeURIComponent(branch));
     exists=Boolean(old);
    }catch(error){
     if(error?.status!==404)throw error;
    }
    if(exists)fail('UPGRADE_EXTENSION_FILE_ALREADY_EXISTS');
    const put=await write(ROOT+'/contents/'+file.path,'PUT',{
     message:'Reality governed extension '+build.build_id+' '+file.path,
     content:Buffer.from(file.content,'utf8').toString('base64'),
     branch,
    });
    if(put?.content?.path!==file.path||
       !SHA.test(String(put?.commit?.sha||'')))
     fail('UPGRADE_COMMIT_PROVIDER_OUTCOME_UNVERIFIED');
    const observed=await get(ROOT+'/contents/'+file.path+'?ref='+encodeURIComponent(branch));
    if(responseContent(observed,file.path,branch)!==file.content)
     fail('UPGRADE_COMMITTED_BYTES_MISMATCH');
    previous=put.commit.sha;
    await verifyRef(branch,previous);
   }
   commit={attempted:true,sha:previous};
   return {commitSha:previous};
  },
  async openPullRequest({branch,baseRef,title,body}={}){
   if(!commit?.sha||openedPr!==null)fail('UPGRADE_PR_ORDER_OR_REPLAY_INVALID');
   if(branch!==createdBranch?.branch||baseRef!==BASE||
      title!=='Reality self-build: '+build.objective||
      typeof body!=='string'||!body.includes(build.build_id)||
      !body.includes(build.authorization_ref))
    fail('UPGRADE_PR_SCOPE_OR_AUTHORITY_INVALID');
   await verifyRef(branch,commit.sha);
   openedPr={attempted:true};
   const made=await write(ROOT+'/pulls','POST',{
    head:branch,base:BASE,title,body,draft:true,
    maintainer_can_modify:false,
   });
   if(!Number.isSafeInteger(made?.number)||made.number<=0||
      made.html_url!=='https://github.com/'+REPO+'/pull/'+made.number)
    fail('UPGRADE_PR_CREATION_NOT_VERIFIED');
   const observed=await get(ROOT+'/pulls/'+made.number);
   if(observed?.number!==made.number||observed?.head?.ref!==branch||
      observed?.head?.sha!==commit.sha||
      observed?.base?.ref!==BASE||
      observed?.draft!==true||observed?.merged===true||
      observed?.html_url!==made.html_url)
    fail('UPGRADE_PR_INDEPENDENT_READBACK_MISMATCH');
   openedPr={attempted:true,number:made.number,url:made.html_url};
   return {number:made.number,url:made.html_url};
  },
  getLocalStatus(){
   return Object.freeze({
    branch:createdBranch?.branch||null,
    commit_sha:commit?.sha||null,
    pull_request:openedPr?.number||null,
    original_work_id:lease.original_work_id,
    authorized_operation:lease.operation,
    production_merge_permitted:false,
    requires_separate_promotion_authorization:true,
    // Local status is NOT durable provider reconciliation.
   });
  },
 });
}
export {candidateHash as fingerprintGovernedUpgradeCandidate};
