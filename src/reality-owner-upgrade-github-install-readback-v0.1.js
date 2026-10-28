// Read-only independently observed GitHub merge and exact tested file bytes.
// This is NOT a merge adapter: only a separately authorized server-side
// installation operation may cause a GitHub effect, and runtime registration
// must subsequently prove the merged code is actually loaded and active.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {fingerprintGovernedUpgradeCandidate}
 from './reality-governed-github-upgrade-provider-v0.1.js';
import {githubGet} from './reality-connector-github-v1.0.js';

export const OWNER_UPGRADE_GITHUB_INSTALL_READBACK_VERSION='reality-owner-upgrade-github-install-readback-v0.1';
const BASE='experiment/reality-live-durable-adversarial-20261025';
const ROOT='/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const fail=code=>{throw Error(code)};
export async function observeOwnerGithubUpgradeInstall({
 session,conversationId,originalWorkId,plan,issued,
 env=process.env,loadTrusted=loadAuthenticatedWarrantedUpgrade,get=githubGet,
}={}){
 if(env?.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
    !validUuid(conversationId)||!WORK.test(String(originalWorkId||''))||
    typeof loadTrusted!=='function'||typeof get!=='function'||
    plan?.state!=='AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION'||
    plan.owner_id!==session.user_id||plan.conversation_id!==conversationId||
    plan.original_work_id!==originalWorkId||
    plan.customer_installation_authorized!==false||
    plan.original_job_completed!==false||
    issued?.github_pr_number!==plan.github_pr_number)
  fail('UPGRADE_INSTALL_READBACK_TRUSTED_SCOPE_REQUIRED');
 // Reconstruct source bytes from owner-scoped signed evidence, never from
 // the proposed provider POST response or browser-supplied content.
 const source=await loadTrusted({session,conversationId,originalWorkId,env});
 const files=source?.verifiedExperiment?.verification_bundle?.synthesized_capability?.files;
 if(source?.owner_id!==session.user_id||
    source?.conversation_id!==conversationId||
    source?.original_work_id!==originalWorkId||
    source?.original_goal_id!==plan.original_goal_id||
    source?.goal_revision!==plan.goal_revision||
    source?.persisted_and_reobserved!==true||
    source?.original_job_completed!==false||
    source?.evidence_warrant_id!==plan.warrant_id||
    source?.evidence_warrant?.pinned_base_commit_sha!==plan.pinned_base_sha||
    !Array.isArray(files)||files.length<1||files.length>3||
    fingerprintGovernedUpgradeCandidate(files)!==plan.candidate_sha256)
  fail('UPGRADE_INSTALL_READBACK_SIGNED_CANDIDATE_CHANGED');
 const pr=await get(ROOT+'/pulls/'+plan.github_pr_number);
 const merged=pr?.merge_commit_sha;
 if(pr?.number!==plan.github_pr_number||
    pr?.state!=='closed'||pr?.merged!==true||
    pr?.head?.sha!==plan.github_head_sha||
    pr?.head?.ref!==plan.github_branch||
    pr?.base?.ref!==BASE||pr?.draft!==false||
    !SHA.test(String(merged||''))||
    pr?.html_url!==plan.github_pr_url)
  fail('UPGRADE_INSTALL_READBACK_EXACT_MERGED_PR_REQUIRED');
 // GitHub's base must point to the verified merge commit before runtime
 // registration. A later base advancement needs a new readback/review.
 const ref=await get(ROOT+'/git/ref/heads/'+BASE);
 if(ref?.ref!=='refs/heads/'+BASE||ref?.object?.sha!==merged)
  fail('UPGRADE_INSTALL_READBACK_PREVIEW_BASE_NOT_EXACT_MERGE');
 const changed=await get(ROOT+'/pulls/'+plan.github_pr_number+'/files?per_page=100');
 if(!Array.isArray(changed)||changed.length!==files.length||
    changed.some(x=>x?.status!=='added')||
    new Set(changed.map(x=>x?.filename)).size!==files.length||
    files.some(x=>!changed.some(y=>y.filename===x.path)))
  fail('UPGRADE_INSTALL_READBACK_PR_MODIFIED_UNAPPROVED_FILES');
 for(const file of files){
  let observed;
  try{
   observed=await get(ROOT+'/contents/'+file.path+'?ref='+merged);
  }catch{fail('UPGRADE_INSTALL_READBACK_TESTED_FILE_UNAVAILABLE')}
  if(observed?.type!=='file'||observed.path!==file.path||
     observed.encoding!=='base64'||typeof observed.content!=='string'||
     !observed.sha)
   fail('UPGRADE_INSTALL_READBACK_TESTED_SOURCE_INVALID');
  const bytes=Buffer.from(observed.content.replace(/\s+/g,''),'base64');
  if(bytes.toString('utf8')!==file.content||
     bytes.toString('base64')!==observed.content.replace(/\s+/g,''))
   fail('UPGRADE_INSTALL_READBACK_CANDIDATE_BYTES_MISMATCH');
 }
 return Object.freeze({
  version:OWNER_UPGRADE_GITHUB_INSTALL_READBACK_VERSION,
  original_work_id:originalWorkId,owner_id:session.user_id,
  conversation_id:conversationId,goal_revision:plan.goal_revision,
  candidate_sha256:plan.candidate_sha256,head_sha:plan.github_head_sha,
  github_pr_number:plan.github_pr_number,
  base_ref:BASE,merge_commit_sha:merged,
  installed:true,exact_candidate_files_verified:true,
  independent:true,production_deployment_performed:false,
  capability_registered:false,original_job_completed:false,
 });
}
