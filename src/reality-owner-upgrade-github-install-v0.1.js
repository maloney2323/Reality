// Real GitHub merge adapter for owner-approved Reality upgrade candidates.
// Only the owner closure coordinator may call this AFTER a distinct durable
// single-use install grant is verified/consumed. No HTTP route is connected.
// This adapter never issues grants, writes to main, or deploys production.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {githubGet,githubWrite} from './reality-connector-github-v1.0.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {fingerprintGovernedUpgradeCandidate}
 from './reality-governed-github-upgrade-provider-v0.1.js';

export const OWNER_UPGRADE_GITHUB_INSTALL_VERSION='reality-owner-upgrade-github-install-v0.1';
const ROOT='/repos/maloney2323/Reality';
const REPO='maloney2323/Reality';
const BASE='experiment/reality-live-durable-adversarial-20261025';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=x=>{throw Error(x)};
let localAttempts=new Set();
export async function installExactOwnerAuthorizedGithubUpgrade({
 session,scope,plan,grant,env=process.env,
 get=githubGet,write=githubWrite,
 loadTrusted=loadAuthenticatedWarrantedUpgrade,
}={}){
 if(env?.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
    !WORK.test(String(scope?.workId||''))||
    !validUuid(scope?.conversationId)||scope.ownerId!==session.user_id||
    plan?.state!=='AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION'||
    plan?.owner_id!==session.user_id||
    plan?.conversation_id!==scope.conversationId||
    plan?.original_work_id!==scope.workId||
    plan?.github_pr_number!==scope.githubPrNumber||
    plan?.github_head_sha!==scope.headSha||
    plan?.candidate_sha256!==scope.candidateSha||
    plan?.goal_revision!==scope.goalRevision||
    plan?.pinned_base_sha!==scope.pinnedBaseSha||
    scope.base!==BASE||
    !SHA.test(String(scope.headSha||''))||
    !SHA.test(String(scope.pinnedBaseSha||''))||
    !Number.isSafeInteger(scope.githubPrNumber)||scope.githubPrNumber<1||
    !Array.isArray(plan?.verified_ci_runs)||plan.verified_ci_runs.length!==2||
    typeof get!=='function'||typeof write!=='function'||
    typeof loadTrusted!=='function')
  fail('UPGRADE_INSTALL_EXACT_OWNER_SCOPE_REQUIRED');
 if(grant?.status!=='CONSUMED_ONCE'||
    grant?.operation!=='github:install_exact_verified_upgrade'||
    grant?.original_work_id!==scope.workId||
    grant?.owner_id!==session.user_id||
    grant?.conversation_id!==scope.conversationId||
    grant?.goal_revision!==scope.goalRevision||
    grant?.candidate_sha256!==scope.candidateSha||
    grant?.head_sha!==scope.headSha||
    grant?.github_pr_number!==scope.githubPrNumber||
    grant?.repository!==REPO||grant?.base_ref!==BASE||
    grant?.authorized_by!==session.user_id||
    grant?.separate_from_draft_authorization!==true||
    grant?.promotion_only!==true||
    !validUuid(grant?.grant_id))
  fail('UPGRADE_INSTALL_DISTINCT_CONSUMED_GRANT_REQUIRED');
 const source=await loadTrusted({session,conversationId:scope.conversationId,
  originalWorkId:scope.workId,env});
 const candidate=source?.verifiedExperiment?.verification_bundle?.synthesized_capability?.files;
 if(source?.persisted_and_reobserved!==true||
    source?.owner_id!==session.user_id||
    source?.conversation_id!==scope.conversationId||
    source?.original_work_id!==scope.workId||
    source?.goal_revision!==scope.goalRevision||
    source?.original_job_completed!==false||
    source?.evidence_warrant_id!==plan.warrant_id||
    source?.evidence_warrant?.pinned_base_commit_sha!==scope.pinnedBaseSha||
    !Array.isArray(candidate)||
    fingerprintGovernedUpgradeCandidate(candidate)!==scope.candidateSha)
  fail('UPGRADE_INSTALL_SIGNED_CANDIDATE_NOT_CURRENT');
 const pr=await get(ROOT+'/pulls/'+scope.githubPrNumber);
 if(pr?.number!==scope.githubPrNumber||
    pr?.state!=='open'||pr?.draft!==false||pr?.merged!==false||
    pr?.head?.repo?.full_name!==REPO||
    pr?.head?.sha!==scope.headSha||pr?.head?.ref!==plan.github_branch||
    pr?.base?.repo?.full_name!==REPO||
    pr?.base?.ref!==BASE||pr?.base?.sha!==scope.pinnedBaseSha||
    pr?.html_url!==plan.github_pr_url||
    pr?.mergeable!==true)
  fail('UPGRADE_INSTALL_UNCHANGED_READY_PR_REQUIRED');
 const baseRef=await get(ROOT+'/git/ref/heads/'+BASE);
 if(baseRef?.ref!=='refs/heads/'+BASE||
    baseRef?.object?.sha!==scope.pinnedBaseSha)
  fail('UPGRADE_INSTALL_BASE_MOVED_REISSUE_WARRANT_REQUIRED');
 // Check GitHub's change list, not the model's self-reported candidate list.
 const files=await get(ROOT+'/pulls/'+scope.githubPrNumber+'/files?per_page=100');
 if(!Array.isArray(files)||files.length!==candidate.length||
    files.some(f=>f?.status!=='added')||
    candidate.some(f=>!files.some(x=>x.filename===f.path))||
    new Set(files.map(f=>f.filename)).size!==candidate.length)
  fail('UPGRADE_INSTALL_UNAPPROVED_PR_FILE_CHANGE');
 // HEAD contents can change between PR GET and promotion; pin every source
 // to the verified SHA and exact frozen source bytes.
 for(const file of candidate){
  let observed;
  try{observed=await get(ROOT+'/contents/'+file.path+'?ref='+scope.headSha)}
  catch{fail('UPGRADE_INSTALL_FROZEN_HEAD_SOURCE_UNAVAILABLE')}
  if(observed?.type!=='file'||observed.path!==file.path||
     observed.encoding!=='base64'||typeof observed.content!=='string')
   fail('UPGRADE_INSTALL_FROZEN_HEAD_SOURCE_UNVERIFIED');
  const encoded=observed.content.replace(/\s+/g,'');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('base64')!==encoded||bytes.toString('utf8')!==file.content)
   fail('UPGRADE_INSTALL_TESTED_SOURCE_BYTES_CHANGED');
 }
 const guard=scope.workId+'|'+scope.headSha+'|'+grant.grant_id;
 if(localAttempts.has(guard))fail('UPGRADE_INSTALL_LOCAL_REPLAY_REJECTED');
 localAttempts.add(guard);
 // A network timeout after this point is UNRESOLVED; no automatic retry.
 const response=await write(ROOT+'/pulls/'+scope.githubPrNumber+'/merge','PUT',{
  sha:scope.headSha,merge_method:'merge',
  commit_title:'Reality owner-approved isolated upgrade '+scope.workId,
  commit_message:'Exact independently verified capability extension. No production deployment or original-job execution authority.',
 });
 if(response?.merged!==true||!SHA.test(String(response.sha||'')))
  fail('UPGRADE_INSTALL_GITHUB_MERGE_RESPONSE_UNCERTAIN_NO_RETRY');
 return Object.freeze({
  github_pr_number:scope.githubPrNumber,
  provider_merge_commit_sha:response.sha,
  provider_claim_not_independent:true,
  original_work_id:scope.workId,
  original_job_completed:false,
  production_deployment_performed:false,
 });
}
