// Owner-facing, original Reality maintenance work #143 only.
// The dashboard observes immutable GitHub and authenticated Continuity.
// It does NOT mint a warrant, trust a caller-supplied plan, merge a PR,
// close an issue, or claim a self-repair completion from historical CI.
import {createHash} from 'node:crypto';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine} from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade} from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {loadAuthenticatedVerifiedUpgradeDraftReceipt}
 from './reality-owner-upgrade-draft-continuity-v0.1.js';
import {discoverExactOriginalUpgradeCI}
 from './reality-owner-autonomous-upgrade-loop-v0.1.js';
import {prepareOwnerBoundUpgradeClosure}
 from './reality-owner-bound-upgrade-closure-v0.1.js';
import {prepareOwnerInstalledUpgradeContinuation,readOwnerPreviousVerifiedInstall}
 from './reality-owner-upgrade-install-continuation-v0.1.js';
import {observeOwnerGithubUpgradeInstall}
 from './reality-owner-upgrade-github-install-readback-v0.1.js';
import {prepareOwnerUpgradeStageApproval}
 from './reality-owner-upgrade-stage-authority-v0.1.js';
import {readVerifiedOwnerUpgradeJobSettlement}
 from './reality-owner-upgrade-original-job-settlement-v0.1.js';

export const ORIGINAL_OWNER_CONSOLE_VERSION='reality-original-owner-console-v0.1';
export const ORIGINAL_OWNER_WORK_ID='work:24cda9611404e9bcb47909976067605c';
export const ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256='6b82acd60baa9055bfc57a70f551bac44f783fc431814ad2555927eb50f5ca16';
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const REPO='maloney2323/Reality';
const BRANCH='feature/governed-autonomous-self-upgrading-v01-20261027';
const CANDIDATE='src/reality-extensions/reality-original-maintenance-repair-proposal.mjs';
const REVIEW='review/reality-original-owner-repair-capability-20261028';
const PR=154, ISSUE=143, TEST_RUN=40726401585;
const fail=code=>{throw Error(code)};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const cleanError=e=>String(e?.message||'').match(/^(?:UPGRADE_|AUTONOMOUS_LOOP_)[A-Z0-9_]+$/)?
 String(e.message):'OWNER_VERIFICATION_UNAVAILABLE';

export function originalOwnerConsoleFlags({
 goalConfirmed=false,evidence={},github={},warrantVerified=false,
 draftVerified=false,installationVerified=false,settlementVerified=false,
}={}){
 const source=github.exact_llm_source_verified===true&&github.sandbox_success===true;
 const alreadyFixed=github.historical_fixed_source_verified===true;
 const ownerEvidence=evidence.owner_evidence_acknowledged===true;
 const warrant=Boolean(goalConfirmed&&source&&warrantVerified);
 const draft=Boolean(warrant&&draftVerified);
 const install=Boolean(draft&&installationVerified);
 const settled=Boolean(install&&settlementVerified);
 return Object.freeze({
  correct_original_work_id:ORIGINAL_OWNER_WORK_ID,
  original_goal_active:goalConfirmed,
  original_source_verified:source,
  original_source_already_fixed:alreadyFixed,
  owner_historical_evidence_acknowledged:ownerEvidence,
  warranted_upgrade_ready:warrant,
  verified_draft_ready:draft,
  installation_verified:install,
  job_settlement_verified:settled,
  original_job_completed:settled,
  next_required_step:!goalConfirmed?'OPEN_OR_CONFIRM_ORIGINAL_OWNER_GOAL':
   !source?'INDEPENDENT_GITHUB_MODEL_SOURCE_REVALIDATION':
   !warrant?'ISSUE_FRESH_OWNER_SCOPED_SANDBOX_AND_WARRANT':
   !draft?'PREPARE_GOVERNED_DRAFT_PR_AUTHORIZATION':
   !install?'PREPARE_EXACT_OWNER_INSTALL_APPROVAL':
   !settled?'PREPARE_SEPARATE_RESUMPTION_AND_VERIFY_SETTLEMENT':
   'VERIFIED_SETTLED',
 });
}

async function githubJson(path,fetchImpl=fetch){
 const headers={accept:'application/vnd.github+json',
   'User-Agent':'Reality-Original-Owner-Repair-Console',
   'X-GitHub-Api-Version':'2022-11-28'};
 const key=process.env.REALITY_GITHUB_TOKEN||process.env.GITHUB_TOKEN;
 if(typeof key==='string'&&key.trim())headers.authorization='Bearer '+key.trim();
 const res=await fetchImpl(ROOT+path,{
  method:'GET',redirect:'error',
  headers,
  signal:AbortSignal.timeout(12000),
 });
 if(!res?.ok)fail('OWNER_GITHUB_READBACK_FAILED');
 const raw=await res.text();
 if(raw.length>190000)fail('OWNER_GITHUB_RESPONSE_TOO_LARGE');
 try{return JSON.parse(raw)}catch{fail('OWNER_GITHUB_RESPONSE_INVALID')}
}

export async function observeGithub(fetchImpl=fetch){
 const [pr,issue,run,source,base,fixedRun,fixedSource]=await Promise.all([
  githubJson('/pulls/'+PR,fetchImpl),
  githubJson('/issues/'+ISSUE,fetchImpl),
  githubJson('/actions/runs/'+TEST_RUN,fetchImpl),
  githubJson('/contents/'+CANDIDATE+'?ref='+REVIEW,fetchImpl),
  githubJson('/git/ref/heads/'+BRANCH,fetchImpl),
  githubJson('/actions/runs/40628422023',fetchImpl),
  githubJson('/contents/test/reality-personal-discovered-work-handoff-v0.1.test.js?ref=3448c6d694b440a0e0c4593ff30e2fc326824cd4',fetchImpl),
 ]);
 const shaBase=base?.object?.sha;
 const scope=pr?.number===PR&&pr?.head?.repo?.full_name===REPO&&
  pr?.base?.repo?.full_name===REPO&&pr?.base?.ref===BRANCH&&
  pr?.head?.ref===REVIEW&&pr?.state==='open'&&pr?.merged===false&&
  pr?.html_url==='https://github.com/'+REPO+'/pull/'+PR&&
  /^[a-f0-9]{40}$/.test(String(pr?.head?.sha||''));
 const candidate=source?.path===CANDIDATE&&source.encoding==='base64'&&
  typeof source.content==='string'&&source.content.length<30000?
  Buffer.from(source.content.replace(/\s+/g,''),'base64'):null;
 const hashOk=candidate!==null&&sha(candidate)===ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256;
 const checked=run?.id===TEST_RUN&&run?.status==='completed'&&
  run?.conclusion==='success'&&run?.head_sha===pr?.head?.sha&&
  run?.name==='Reality ORIGINAL Owner Repair - Exact LLM Capability Installation Review';
 const sourceFixed=fixedSource?.encoding==='base64'&&
  typeof fixedSource.content==='string'&&fixedSource.content.length<190000&&
  sha(Buffer.from(fixedSource.content.replace(/\s+/g,''),'base64'))===
   'aca7e6386c226f9e9f9c6e6cd541b3470d8e38b25f1b0c02e9e35ce7b80c0d95'&&
  fixedRun?.id===40628422023&&fixedRun?.status==='completed'&&
  fixedRun?.conclusion==='success'&&
  fixedRun?.head_sha==='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
 const fixed=issue?.number===ISSUE&&
  issue?.title==='Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures';
 return Object.freeze({
  issue_url:'https://github.com/'+REPO+'/issues/'+ISSUE,
  issue_open:fixed&&issue.state==='open',
  review_pr_url:'https://github.com/'+REPO+'/pull/'+PR,
  review_pr_draft:scope&&pr.draft===true,
  review_pr_merged:pr.merged===true,
  exact_llm_source_verified:Boolean(scope&&hashOk),
  sandbox_success:Boolean(scope&&checked),
  historical_fixed_source_verified:Boolean(fixed&&sourceFixed),
  original_fix_preexisted_model_installation:true,
  base_current:scope&&shaBase===pr.base.sha,
  original_candidate_sha256:ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256,
  original_review_head_sha:scope?pr.head.sha:null,
  base_current_sha:shaBase||null,
  original_review_base_sha:scope?pr.base.sha:null,
  independent_review_run_url:'https://github.com/'+REPO+'/actions/runs/'+TEST_RUN,
 });
}

export async function originalOwnerContext({
 session,conversationId,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !validUuid(session?.user_id)||!validUuid(conversationId))
  fail('OWNER_CONSOLE_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('OWNER_CONSOLE_ISOLATED_DB_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 if(goal?.principal_id!==session.user_id||
    goal.conversation_id!==conversationId)
  fail('OWNER_CONSOLE_ORIGINAL_CONVERSATION_NOT_AUTHENTICATED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.scope.world!==goal.state.world_id)
  fail('OWNER_CONSOLE_CONTINUITY_SCOPE_CHANGED');
 const history=orderContinuityHistory(await createPersistence({...db}).reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
 }));
 const relevant=history.filter(e=>e.payload?.original_work_id===ORIGINAL_OWNER_WORK_ID);
 const checkpoint=relevant.filter(e=>e.entity_type==='personal_recovery_checkpoint');
 if(checkpoint.length!==1||checkpoint[0].provenance?.principal_id!==session.user_id||
    checkpoint[0].provenance?.conversation_id!==conversationId)
  fail('OWNER_CONSOLE_ORIGINAL_JOB_CHECKPOINT_NOT_IN_THIS_CONVERSATION');
 const evidenceAck=relevant.find(e=>
  e.entity_type==='personal_original_repair_owner_acceptance'&&
  e.payload?.owner_confirmation==='ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY'&&
  e.payload?.owner_id===session.user_id&&
  e.payload?.github_write_authorized===false&&
  e.payload?.original_repair_job_completed===false);
 const completion=relevant.filter(e=>e.entity_type==='personal_original_job_settlement');
 const active=goal.state?.active_goal;
 const goalConfirmed=active?.status==='ACTIVE'&&active?.user_confirmed===true&&
  goal.state?.active_goal_id===checkpoint[0].payload?.original_goal_id;
 return Object.freeze({goal,history,relevant,
  owner_id:session.user_id,conversation_id:conversationId,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  owner_goal_confirmed:goalConfirmed,
  owner_evidence_acknowledged:Boolean(evidenceAck),
  owner_warrant_events:relevant.filter(e=>e.entity_type==='personal_upgrade_evidence_warrant').length,
  sandbox_receipts:relevant.filter(e=>e.entity_type==='personal_upgrade_sandbox_verified').length,
  saved_settlement_receipts:completion.length,
 });
}

async function readyPlan({session,conversationId,env}){
 const draft=await loadAuthenticatedVerifiedUpgradeDraftReceipt({
  session,conversationId,originalWorkId:ORIGINAL_OWNER_WORK_ID,env,
 });
 const ci=await discoverExactOriginalUpgradeCI({draft});
 if(ci.state!=='EXACT_GREEN_DRAFT_CI_DISCOVERED')
  fail('OWNER_CONSOLE_EXACT_GOVERNED_PR_CI_NOT_GREEN');
 return prepareOwnerBoundUpgradeClosure({
  session,conversationId,originalWorkId:ORIGINAL_OWNER_WORK_ID,
  ciRunIds:ci.run_ids,env,
 });
}
const toScope=(session,conversationId,plan)=>Object.freeze({
 ownerId:session.user_id,conversationId,workId:ORIGINAL_OWNER_WORK_ID,
 goalRevision:plan.goal_revision,candidateSha:plan.candidate_sha256,
 headSha:plan.github_head_sha,pinnedBaseSha:plan.pinned_base_sha,
 githubPrNumber:plan.github_pr_number,base:'experiment/reality-live-durable-adversarial-20261025',
 continuityRootId:plan.continuity_root_id,worldlineId:plan.worldline_id,
});

export async function prepareOriginalOwnerStage({
 session,conversationId,stage,env=process.env,
 context=originalOwnerContext,observe=observeGithub,
}={}){
 if(!['INSTALL','RESUME'].includes(stage))
  fail('OWNER_CONSOLE_EXACT_STAGE_REQUIRED');
 const state=await context({session,conversationId,env});
 if(!state.owner_goal_confirmed)
  fail('OWNER_CONSOLE_ORIGINAL_OWNER_GOAL_NOT_ACTIVE');
 const github=await observe();
 if(!github.exact_llm_source_verified||!github.sandbox_success)
  fail('OWNER_CONSOLE_ORIGINAL_MODEL_SOURCE_RECHECK_REQUIRED');
 let plan,scope,installed=null;
 if(stage==='INSTALL'){
  plan=await readyPlan({session,conversationId,env});
  scope=toScope(session,conversationId,plan);
 } else {
  const prepared=await prepareOwnerInstalledUpgradeContinuation({
   session,conversationId,originalWorkId:ORIGINAL_OWNER_WORK_ID,env,
  });
  plan=prepared.plan;scope=prepared.scope;
  const prior=await readOwnerPreviousVerifiedInstall({session,scope,plan,env});
  installed=await observeOwnerGithubUpgradeInstall({
   session,conversationId,originalWorkId:ORIGINAL_OWNER_WORK_ID,
   plan,issued:{github_pr_number:plan.github_pr_number},env,
  });
  if(prior.merge_commit_sha!==installed.merge_commit_sha||!installed.independent)
   fail('OWNER_CONSOLE_INSTALLED_CANDIDATE_MISMATCH');
 }
 const approval=await prepareOwnerUpgradeStageApproval({
  session,conversationId,scope,plan,stage,installed,env,
 });
 if(approval?.state!=='AWAITING_EXACT_STAGE_OWNER_APPROVAL'||
    approval.stage!==stage||approval.original_work_id!==ORIGINAL_OWNER_WORK_ID||
    !approval.grounding_proof||!approval.work_item)
  fail('OWNER_CONSOLE_EXACT_APPROVAL_PREPARATION_UNVERIFIED');
 return Object.freeze({
  state:'AWAITING_EXPLICIT_OWNER_APPROVAL',stage,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  approved_pr_number:plan.github_pr_number,
  candidate_sha256:plan.candidate_sha256,
  work_item:approval.work_item,grounding_proof:approval.grounding_proof,
  authorization_persisted:false,external_action_performed:false,
  original_job_completed:false,
 });
}


// A completed upgrade cannot be re-read via the *preinstallation* loader
// (which correctly refuses work already settled). Verify a final result from
// the full ordered owner Continuity, the original warrant/draft lineage, and
// the actual independently observable GitHub merge instead.
async function reobserveOriginalOwnerSettlement(ctx){
 const events=ctx.relevant.filter(e=>
  e.entity_type==='personal_original_job_settlement'&&
  e.payload?.original_work_id===ORIGINAL_OWNER_WORK_ID);
 if(events.length===0)return null;
 if(events.length!==1)fail('OWNER_CONSOLE_CONFLICTING_SETTLEMENT_EVENTS');
 const e=events[0],p=e.payload;
 if(e.event_kind!=='OUTCOME'||e.epistemic_status!=='VERIFIED'||
  e.provenance?.source!=='reality-owner-upgrade-original-job-settlement-v0.1'||
  e.provenance?.principal_id!==ctx.owner_id||
  e.provenance?.conversation_id!==ctx.conversation_id||
  p?.owner_id!==ctx.owner_id||p.conversation_id!==ctx.conversation_id||
  p.original_job_completed!==true||p.independent!==true||
  p.production_deployment_performed!==false||
  !/^[a-f0-9]{64}$/.test(String(p.candidate_sha256||''))||
  !/^[a-f0-9]{40}$/.test(String(p.head_sha||''))||
  !/^[a-f0-9]{40}$/.test(String(p.merge_commit_sha||''))||
  typeof p.execution_receipt_id!=='string'||!p.execution_receipt_id||
  typeof p.evidence_ref!=='string'||!p.evidence_ref||
  !e.evidence_refs?.includes(p.evidence_ref))
  fail('OWNER_CONSOLE_COMPLETION_EVIDENCE_INVALID');
 const drafts=ctx.relevant.filter(x=>
  x.entity_type==='personal_upgrade_draft_pr_verified'&&
  x.payload?.original_work_id===ORIGINAL_OWNER_WORK_ID&&
  x.payload?.candidate_sha256===p.candidate_sha256&&
  x.payload?.github_commit_sha===p.head_sha);
 const warrants=ctx.relevant.filter(x=>
  x.entity_type==='personal_upgrade_evidence_warrant'&&
  x.payload?.original_work_id===ORIGINAL_OWNER_WORK_ID);
 if(drafts.length!==1||warrants.length!==1||
    !Number.isSafeInteger(drafts[0].payload.github_pr_number))
  fail('OWNER_CONSOLE_SAVED_WARRANT_OR_DRAFT_MISSING');
 const actual=await githubJson('/pulls/'+drafts[0].payload.github_pr_number);
 if(actual?.number!==drafts[0].payload.github_pr_number||
    actual?.state!=='closed'||actual?.merged!==true||
    actual?.head?.sha!==p.head_sha||
    actual?.merge_commit_sha!==p.merge_commit_sha||
    actual?.base?.repo?.full_name!==REPO||
    actual?.base?.ref!=='experiment/reality-live-durable-adversarial-20261025')
  fail('OWNER_CONSOLE_EXTERNAL_INSTALL_NOT_REOBSERVED');
 return Object.freeze({
  settlement_receipt_id:e.event_id,
  independently_reobserved:true,
  original_job_completed:true,
  installed_commit_sha:p.merge_commit_sha,
  original_execution_receipt_id:p.execution_receipt_id,
 });
}

export async function inspectOriginalOwnerConsole({
 session,conversationId,env=process.env,
 context=originalOwnerContext,observe=observeGithub,
}={}){
 const ctx=await context({session,conversationId,env});
 const github=await observe();
 let verifiedWarrant=false,verifiedDraft=false,readyBlocker='OWNER_SCOPED_WARRANT_AND_GOVERNED_DRAFT_MISSING';
 let verifiedInstall=false,verifiedSettlement=false,settlementReceiptId=null;
 const priorSettlement=await reobserveOriginalOwnerSettlement(ctx);
 if(priorSettlement){
  verifiedWarrant=true;verifiedDraft=true;verifiedInstall=true;verifiedSettlement=true;
  settlementReceiptId=priorSettlement.settlement_receipt_id;
  readyBlocker=null;
 }else if(ctx.owner_goal_confirmed){
  try{
   const warrant=await loadAuthenticatedWarrantedUpgrade({
    session,conversationId,originalWorkId:ORIGINAL_OWNER_WORK_ID,env,
   });
   if(warrant?.persisted_and_reobserved!==true||
      warrant?.verified_not_authorized!==true||
      warrant?.external_action_authorized!==false||
      warrant?.original_job_completed!==false)
    fail('OWNER_CONSOLE_WARRANT_REOBSERVATION_INVALID');
   verifiedWarrant=true;
   readyBlocker='UPGRADE_DRAFT_RECEIPT_OWNER_DURABLE_SOURCE_MISSING';
  }catch(e){readyBlocker=cleanError(e)}
  if(verifiedWarrant){
   try{
    const p=await readyPlan({session,conversationId,env});
    if(p?.state==='AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION'){
     verifiedDraft=true;readyBlocker=null;
    }
   }catch(e){readyBlocker=cleanError(e)}
  }
 }
 if(verifiedWarrant&&!verifiedSettlement){
  // Neither a GitHub merge nor a ledger row proves installed runtime.
  // Only a governed, independently reconciled installation does.
  try {
   const {plan,scope}=await prepareOwnerInstalledUpgradeContinuation({
    session,conversationId,originalWorkId:ORIGINAL_OWNER_WORK_ID,env,
   });
   const lease=await readOwnerPreviousVerifiedInstall({session,scope,plan,env});
   const installed=await observeOwnerGithubUpgradeInstall({
    session,conversationId,originalWorkId:ORIGINAL_OWNER_WORK_ID,
    plan,issued:{github_pr_number:plan.github_pr_number},env,
   });
   verifiedInstall=installed?.independent===true&&installed?.installed===true&&
    installed?.merge_commit_sha===lease.merge_commit_sha;
   if(verifiedInstall){
    const settled=await readVerifiedOwnerUpgradeJobSettlement({
     session,scope,plan,env,
    });
    verifiedSettlement=settled?.independently_reobserved===true&&
     settled?.original_job_completed===true;
   }
  }catch{}
 }
 const flags=originalOwnerConsoleFlags({
  goalConfirmed:ctx.owner_goal_confirmed,github,
  evidence:{owner_evidence_acknowledged:ctx.owner_evidence_acknowledged},
  warrantVerified:verifiedWarrant,installationVerified:verifiedInstall,
  settlementVerified:verifiedSettlement,
 });
 return Object.freeze({
  version:ORIGINAL_OWNER_CONSOLE_VERSION,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  conversation_id:conversationId,
  source_review:github,
  ...flags,
  warrant_and_draft_blocker:readyBlocker,
  sandbox_receipts:ctx.sandbox_receipts,
  owner_warrant_events:ctx.owner_warrant_events,
  saved_settlement_receipts:ctx.saved_settlement_receipts,
  verified_settlement_receipt_id:settlementReceiptId,
  install_approval_can_prepare:flags.warranted_upgrade_ready&&!flags.installation_verified,
  resume_approval_can_prepare:flags.installation_verified,
  execute_enabled:!flags.job_settlement_verified&&
   (flags.warranted_upgrade_ready||flags.installation_verified),
  verified_settlement_receipt_required:true,
  no_implicit_approval:true,
 });
}
