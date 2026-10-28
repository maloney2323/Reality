// One owner-bound entrypoint for the real autonomous upgrade continuation.
// Source and authority live ONLY in authenticated original Continuity and
// persisted single-use reservations; a browser cannot supply code/grants.
// Progress is re-observed across GitHub's asynchronous PR/merge/CI states.
// Never replays an already-merged GitHub installation.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {loadAuthenticatedVerifiedUpgradeDraftReceipt}
 from './reality-owner-upgrade-draft-continuity-v0.1.js';
import {prepareOwnerBoundUpgradeClosure,executeOwnerBoundUpgradeClosure}
 from './reality-owner-bound-upgrade-closure-v0.1.js';
import {connectOwnerGithubUpgradeToClosure}
 from './reality-owner-upgrade-github-live-ports-v0.1.js';
import {continueOwnerUpgradeAfterVerifiedInstall}
 from './reality-owner-upgrade-install-continuation-v0.1.js';
export const OWNER_AUTONOMOUS_UPGRADE_LOOP_VERSION='reality-owner-autonomous-upgrade-loop-v0.1';
const REPO='maloney2323/Reality';
const ROOT='https://api.github.com/repos/'+REPO;
const WORK=/^work:[a-f0-9]{32}$/,SHA=/^[a-f0-9]{40}$/;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const REQUIRED=['Governed Autonomous Self-Upgrading Provider v0.1',
 'Reality Governed Execution Engine v0.1'];
const fail=x=>{throw Error(x)};
const safeRead=async(fetchImpl,path)=>{
 const r=await fetchImpl(ROOT+path,{
  method:'GET',redirect:'error',headers:{
   Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'Reality-Owner-Autonomous-Upgrade-Loop',
  },
 });
 if(!r?.ok)fail('AUTONOMOUS_LOOP_GITHUB_READBACK_UNAVAILABLE');
 const body=await r.json();
 if(!body||typeof body!=='object'||Array.isArray(body))
  fail('AUTONOMOUS_LOOP_GITHUB_RESPONSE_INVALID');
 return body;
};
export async function discoverExactOriginalUpgradeCI({
 draft,fetchImpl=fetch,
}={}){
 if(!Number.isSafeInteger(draft?.github_pr_number)||
    draft.github_pr_number<1||
    !SHA.test(String(draft.github_commit_sha||''))||
    !/^reality\/build\/build-[a-f0-9]{32}$/.test(String(draft.github_branch||'')))
  fail('AUTONOMOUS_LOOP_PINNED_OWNER_DRAFT_REQUIRED');
 const q='/actions/runs?branch='+encodeURIComponent(draft.github_branch)+
  '&event=pull_request&per_page=100';
 const result=await safeRead(fetchImpl,q);
 if(!Array.isArray(result.workflow_runs)||
    !Number.isSafeInteger(result.total_count)||result.total_count>100)
  fail('AUTONOMOUS_LOOP_CI_RUN_HISTORY_INCOMPLETE');
 const selected=[];
 for(const name of REQUIRED){
  const possible=result.workflow_runs.filter(x=>
   x.name===name&&x.event==='pull_request'&&
   x.head_branch===draft.github_branch&&
   x.head_sha===draft.github_commit_sha&&
   x.repository?.full_name===REPO&&
   x.head_repository?.full_name===REPO&&
   Number.isSafeInteger(x.id)&&x.id>0);
  if(!possible.length)return Object.freeze({
   state:'WAITING_FOR_EXACT_DRAFT_CI',required_workflows:REQUIRED,
   run_ids:[],original_job_completed:false,
  });
  possible.sort((a,b)=>b.id-a.id);
  const latest=possible[0];
  if(latest.status!=='completed'||latest.conclusion!=='success')
   return Object.freeze({
    state:'WAITING_FOR_EXACT_DRAFT_CI',
    required_workflows:REQUIRED,run_ids:[],
    blocked_workflow:name,latest_conclusion:latest.conclusion||null,
    original_job_completed:false,
   });
  selected.push(latest.id);
 }
 if(new Set(selected).size!==REQUIRED.length)
  fail('AUTONOMOUS_LOOP_CI_DUPLICATE_RUN_SCOPE');
 return Object.freeze({
  state:'EXACT_GREEN_DRAFT_CI_DISCOVERED',
  required_workflows:REQUIRED,run_ids:selected,
  original_job_completed:false,
 });
}
export async function runAuthenticatedOwnerAutonomousUpgradeLoop({
 session,conversationId,originalWorkId,env=process.env,
 loadDraft=loadAuthenticatedVerifiedUpgradeDraftReceipt,
 fetchImpl=fetch,
 execute=executeOwnerBoundUpgradeClosure,
 continueAfterInstall=continueOwnerUpgradeAfterVerifiedInstall,
 connectPorts=connectOwnerGithubUpgradeToClosure,
 prepare=prepareOwnerBoundUpgradeClosure,
}={}){
 if(env?.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(originalWorkId||'')))
  fail('AUTONOMOUS_LOOP_SIGNED_IN_ORIGINAL_WORK_REQUIRED');
 // Missing durable owner draft means no candidate was authorized. No
 // invented job, fabricated warrant, PR, or owner approval is synthesized.
 const draft=await loadDraft({session,conversationId,originalWorkId,env});
 if(draft?.owner_id!==session.user_id||
    draft.conversation_id!==conversationId||
    draft.original_work_id!==originalWorkId||
    draft.durably_recorded!==true||
    draft.independently_reobserved!==true||
    draft.production_merge_authorized!==false||
    draft.capability_installed!==false||
    draft.original_job_completed!==false||
    draft.github_pr_url!==
     'https://github.com/'+REPO+'/pull/'+draft.github_pr_number)
  fail('AUTONOMOUS_LOOP_ORIGINAL_DRAFT_SCOPE_CHANGED');
 const pr=await safeRead(fetchImpl,'/pulls/'+draft.github_pr_number);
 if(pr?.number!==draft.github_pr_number||
    pr.head?.repo?.full_name!==REPO||
    pr.head?.ref!==draft.github_branch||
    pr.head?.sha!==draft.github_commit_sha||
    pr.base?.repo?.full_name!==REPO||
    pr.base?.ref!==BASE||
    pr.html_url!==draft.github_pr_url)
  fail('AUTONOMOUS_LOOP_GITHUB_ORIGINAL_DRAFT_CHANGED');
 if(pr.state==='closed'){
  if(pr.merged!==true||!SHA.test(String(pr.merge_commit_sha||'')))
   return Object.freeze({
    version:OWNER_AUTONOMOUS_UPGRADE_LOOP_VERSION,
    status:'BLOCKED_UNMERGED_ORIGINAL_DRAFT',
    original_work_id:originalWorkId,original_job_completed:false,
    github_write_performed:false,installation_replayed:false,
   });
  // No second POST/PUT to GitHub. Only independently reconcile the
  // previously settled installation and resume the original work.
  const resumed=await continueAfterInstall({
   session,conversationId,originalWorkId,env,
  });
  return Object.freeze({...resumed,
   coordinator_version:OWNER_AUTONOMOUS_UPGRADE_LOOP_VERSION,
   original_work_id:originalWorkId,installation_replayed:false,
  });
 }
 if(pr.state!=='open'||pr.draft!==true||pr.merged!==false||
    pr.base.sha!==draft.pinned_base_sha)
  fail('AUTONOMOUS_LOOP_OPEN_EXACT_DRAFT_REQUIRED');
 const ci=await discoverExactOriginalUpgradeCI({draft,fetchImpl});
 if(ci.state!=='EXACT_GREEN_DRAFT_CI_DISCOVERED')
  return Object.freeze({
   version:OWNER_AUTONOMOUS_UPGRADE_LOOP_VERSION,
   status:ci.state,original_work_id:originalWorkId,
   original_job_completed:false,github_write_performed:false,
   installation_replayed:false,
  });
 // Every effect is still independently gated by the exact existing owner
 // approval and at-most-once DB grant. This outer controller mints NONE.
 const result=await execute({
  session,conversationId,originalWorkId,env,
  ports:connectPorts(),
  prepare:async args=>prepare({
   ...args,ciRunIds:ci.run_ids,fetchImpl,
  }),
 });
 if(result?.status==='UNRESOLVED_NO_AUTOMATIC_RETRY'&&
    ['REGISTRATION','REGISTRY_READBACK'].includes(result.blocked_at))
  return Object.freeze({...result,
   coordinator_version:OWNER_AUTONOMOUS_UPGRADE_LOOP_VERSION,
   status:'INSTALLED_AWAITING_ASYNC_CI_RECONCILIATION',
   original_job_completed:false,
   // A future run MUST take the merged-PR continuation path above.
   installation_replayed:false,automatic_install_retry_allowed:false,
  });
 return Object.freeze({...result,
  coordinator_version:OWNER_AUTONOMOUS_UPGRADE_LOOP_VERSION,
 });
}
