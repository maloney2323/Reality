// Trusted internal owner-bound verifier. A model or browser may NEVER supply
// candidate code, tests, signer payload, a warrant, or GitHub write authority.
// All such materials are independently rebuilt from Reality's pinned GitHub
// Actions artifact and signed-in immutable owner Continuity. PREVIEW ONLY.
import {createHash} from 'node:crypto';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {originalOwnerContext,ORIGINAL_OWNER_WORK_ID}
 from './reality-original-owner-console-v0.1.js';
import {loadTrustedOriginalExecutorPackage}
 from './reality-original-executor-trusted-package-readback-v0.1.js';
import {githubGet} from './reality-connector-github-v1.0.js';
import {issueUpgradeEvidenceWarrant,verifyUpgradeEvidenceWarrant,hashUpgradeEvidence}
 from './reality-upgrade-evidence-warrant-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource,validateContinuityChain}
 from './reality-continuity-spine-v2.0.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';
export const ORIGINAL_EXECUTOR_TRUSTED_WARRANT_RECORDER_VERSION='reality-original-executor-trusted-warrant-recorder-v0.1';
const WORK=ORIGINAL_OWNER_WORK_ID;
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const REPO='/repos/maloney2323/Reality';
const sha=/^[a-f0-9]{40}$/;
const fail=x=>{throw Error(x)};
const digest=x=>createHash('sha256').update(x).digest('hex');

export function buildExactOriginalExecutorWarrantEvidence({owner,proof,baseSha}={}){
 const goal=owner?.goal,active=goal?.state?.active_goal;
 const checkpoint=owner?.relevant?.filter(e=>e.entity_type==='personal_recovery_checkpoint'&&
  e.payload?.original_work_id===WORK);
 const candidate=owner?.relevant?.filter(e=>e.entity_type==='personal_original_repair_capability_candidate'&&
  e.payload?.original_work_id===WORK);
 if(owner?.original_work_id!==WORK||owner.owner_goal_confirmed!==true||
    owner.owner_evidence_acknowledged!==true||!validUuid(owner.owner_id)||
    !validUuid(owner.conversation_id)||!Array.isArray(checkpoint)||checkpoint.length!==1||
    checkpoint[0].event_kind!=='WORK'||checkpoint[0].payload?.job_completed!==false||
    checkpoint[0].payload?.new_external_action_authorized!==false||
    checkpoint[0].payload?.original_goal_id!==goal.state.active_goal_id||
    !Array.isArray(candidate)||candidate.length!==1||
    candidate[0].payload?.candidate_capability_id!=='reality.original-repair-execution'||
    candidate[0].payload?.original_goal_id!==goal.state.active_goal_id||
    active?.status!=='ACTIVE'||active.user_confirmed!==true||
    typeof active.last_transition_receipt_id!=='string'||!active.last_transition_receipt_id||
    proof?.work_id!==WORK||proof.artifact_immutable_verified!==true||
    proof?.ci_run_id!==40762950798||
    proof.frozen_tests?.passed!==true||proof.frozen_tests.case_count!==10||
    proof.independent_holdout?.passed!==true||proof.independent_holdout.case_count!==4||
    proof.signed_warrant_issued!==false||proof.installation_authorized!==false||
    proof.original_job_completed!==false||
    !sha.test(String(baseSha||'')))
  fail('ORIGINAL_EXECUTOR_WARRANT_TRUSTED_GOAL_AND_SANDBOX_PROOF_REQUIRED');
 const scope=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,subjectId:owner.owner_id});
 if(scope.continuity_root_id!==goal.state.continuity_root_id||
    scope.worldline_id!==checkpoint[0].worldline_id||
    scope.continuity_root_id!==checkpoint[0].continuity_root_id)
  fail('ORIGINAL_EXECUTOR_WARRANT_CONTINUITY_SCOPE_CHANGED');
 const originalWorkItem=Object.freeze({id:WORK,
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,status:'BLOCKED'});
 const experimentHash=hashUpgradeEvidence({original_work_id:WORK,
  source_sha256:proof.executor_sha256,capability_package:proof.installable_candidate_sha256,
  ci_run_id:proof.ci_run_id,artifact_id:proof.artifact_id,
  goal_revision:active.last_transition_receipt_id});
 const capabilitySignature='reality.original-repair-execution:'+proof.installable_candidate_sha256;
 const verifiedBundle={
  experiment_hash:experimentHash,capability_signature:capabilitySignature,
  synthesized_capability:{files:proof.files},
  frozen_regression:{passed:true,case_count:10,
   result_sha256:proof.frozen_tests.result_sha256,verified_ci_run_id:40762950798},
  isolated_verification:{verified:true,case_count:4,
   network_accessible:false,secrets_accessible:false,
   source_sha256:proof.executor_sha256,
   source_artifact_id:proof.artifact_id,verified_ci_run_id:40762950798},
 };
 const verificationHash=hashUpgradeEvidence(verifiedBundle);
 const experiment=Object.freeze({
  state:'SANDBOX_VERIFIED',work_item_id:WORK,
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  ephemeral_worldline_id:candidate[0].payload.ephemeral_worldline_id,
  capability_id:'reality.original-repair-execution',
  gap_id:candidate[0].payload.experiment_gap_id,
  frozen_historical_failure_refs:candidate[0].payload.frozen_failure_refs,
  capability_contract:{verification_suite_ref:'test/reality-original-executor-autonomous-grader-v0.1.test.mjs'},
  experiment_hash:experimentHash,verification_hash:verificationHash,
  capability_signature:capabilitySignature,production_graph_write_permitted:false,
  synthesized_capability:{files:proof.files},verification_bundle:verifiedBundle,
 });
 const verifierReceipt=Object.freeze({
  status:'INDEPENDENT_SANDBOX_VERIFIED',
  work_item_id:WORK,experiment_hash:experimentHash,
  verification_hash:verificationHash,
  candidate_sha256:proof.installable_candidate_sha256,
  frozen_regression_sha256:hashUpgradeEvidence(verifiedBundle.frozen_regression),
  holdout:{passed:true,case_count:4,result_sha256:proof.independent_holdout.result_sha256},
  isolation:{production_write_permitted:false,secrets_accessible:false},
  verifier_run_ref:'github-actions:40762950798',
 });
 return Object.freeze({
  scope,originalWorkItem,checkpoint:checkpoint[0],
  experiment,verifierReceipt,baseSha,goalRevision:active.last_transition_receipt_id,
  ownerId:owner.owner_id,conversationId:owner.conversation_id,
  originalGoalId:goal.state.active_goal_id,
  candidateHash:proof.installable_candidate_sha256,
  frozenVerificationRunUrl:'https://github.com/maloney2323/Reality/actions/runs/40762950798',
 });
}

// Owner evidence signing may read the pinned original GitHub base publicly.
// This adapter is strictly GET-only, branch-pinned and never carries a write token.
export async function readOriginalExecutorPinnedBase(path){
 if(path!==REPO+'/git/ref/heads/'+BRANCH)
  fail('ORIGINAL_EXECUTOR_WARRANT_UNEXPECTED_GITHUB_PATH');
 const r=await fetch('https://api.github.com'+path,{
  headers:{accept:'application/vnd.github+json',
   'User-Agent':'Reality-Original-Warrant-ReadOnly'},
  redirect:'error',signal:AbortSignal.timeout(12000),
 });
 if(r.status!==200)fail('ORIGINAL_EXECUTOR_WARRANT_PUBLIC_GITHUB_BASE_UNAVAILABLE');
 return r.json();
}

export async function recordOriginalExecutorTrustedWarrant({
 session,conversationId,env=process.env,
 loadOwner=originalOwnerContext,
 loadProof=loadTrustedOriginalExecutorPackage,
 get=readOriginalExecutorPinnedBase,
 createPersistence=createUniversePostgresPersistence,
 resolveDb=resolveReliabilityBenchmarkDb,
}={}){
 if(env?.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId))
  fail('ORIGINAL_EXECUTOR_WARRANT_AUTHENTICATED_PREVIEW_REQUIRED');
 const [owner,proof,ref]=await Promise.all([
  loadOwner({session,conversationId,env}),loadProof({env}),
  get(REPO+'/git/ref/heads/'+BRANCH),
 ]);
 if(ref?.ref!=='refs/heads/'+BRANCH||!sha.test(String(ref.object?.sha||'')))
  fail('ORIGINAL_EXECUTOR_WARRANT_ORIGINAL_GITHUB_BASE_UNVERIFIED');
 const e=buildExactOriginalExecutorWarrantEvidence({owner,proof,baseSha:ref.object.sha});
 if(owner.owner_id!==session.user_id||owner.conversation_id!==conversationId)
  fail('ORIGINAL_EXECUTOR_WARRANT_SIGNED_IN_OWNER_CHANGED');
 const db=resolveDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ORIGINAL_EXECUTOR_WARRANT_AUTHENTICATED_DB_SCOPE_REQUIRED');
 const store=createPersistence({...db});
 const read=async()=>orderContinuityHistory(await store.reconstruct({
  continuityRootId:e.scope.continuity_root_id,worldlineId:e.scope.worldline_id}));
 const existing=await read();
 const chain=validateContinuityChain(existing.map(x=>({...x,prior_lineage_hash:
  x.prior_lineage_hash??x.provenance?.continuity_spine?.prior_lineage_hash??null})));
 if(!chain.valid)fail('ORIGINAL_EXECUTOR_WARRANT_CONTINUITY_LINEAGE_INVALID');
 if(existing.some(x=>x.entity_type==='personal_original_job_settlement'&&
  x.payload?.original_work_id===WORK&&x.payload?.original_job_completed===true))
  fail('ORIGINAL_EXECUTOR_WARRANT_JOB_ALREADY_FINISHED');
 const args={experiment:e.experiment,originalWorkItem:e.originalWorkItem,
  blockedCheckpointId:e.checkpoint.event_id,goalRevision:e.goalRevision,
  ownerId:e.ownerId,conversationId:e.conversationId,baseCommitSha:e.baseSha,
  verifierReceipt:e.verifierReceipt,env};
 const sandboxId=continuityUuidFromSource('original-executor-independent-sandbox:'+
  WORK+':'+e.candidateHash);
 const warrantId=continuityUuidFromSource('original-executor-verified-warrant:'+
  WORK+':'+e.candidateHash);
 const priorSandbox=existing.filter(x=>x.entity_type==='personal_upgrade_sandbox_verified'&&
  x.payload?.original_work_id===WORK);
 const priorWarrants=existing.filter(x=>x.entity_type==='personal_upgrade_evidence_warrant'&&
  x.payload?.original_work_id===WORK);
 if(priorSandbox.length>1||priorWarrants.length>1||
   (priorSandbox.length===1&&priorSandbox[0].event_id!==sandboxId)||
   (priorWarrants.length===1&&priorWarrants[0].event_id!==warrantId))
  fail('ORIGINAL_EXECUTOR_WARRANT_COMPETING_PERSISTED_CANDIDATES');
 // Sign evidence BEFORE any write; a signer-key failure leaves Continuity unchanged.
 const warrant=priorWarrants.length===1?priorWarrants[0].payload.warrant:
  issueUpgradeEvidenceWarrant(args);
 const checked=verifyUpgradeEvidenceWarrant({...args,warrant});
 if(checked.valid!==true||checked.execution_authorized!==false||
    checked.candidate_sha256!==e.candidateHash)
  fail('ORIGINAL_EXECUTOR_WARRANT_SIGNATURE_VERIFICATION_FAILED');
 const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const append=async({eventId,parent,priorHash,source,payload})=>{
  const now=new Date().toISOString();
  const node=appendContinuityNode({
   spine:e.scope,stage:'VERIFICATION',entityId:WORK,eventId,
   parentEventId:parent,priorLineageHash:priorHash,
   assertionTime:now,effectiveTime:now,epistemicStatus:'VERIFIED',
   evidenceRefs:[e.frozenVerificationRunUrl],
   payload,provenance:{source,principal_id:e.ownerId,conversation_id:e.conversationId},
  });
  await store.appendEvent({...node,entity_type:
   source==='reality-independent-sandbox-verifier-v0.1'?
    'personal_upgrade_sandbox_verified':'personal_upgrade_evidence_warrant'});
 };
 const sandboxPayload={version:ORIGINAL_EXECUTOR_TRUSTED_WARRANT_RECORDER_VERSION,
  owner_id:e.ownerId,conversation_id:e.conversationId,
  original_work_id:WORK,original_goal_id:e.originalGoalId,
  goal_revision:e.goalRevision,verified_experiment:e.experiment,
  verifier_receipt:e.verifierReceipt,original_job_completed:false};
 if(priorSandbox.length===1){
  if(priorSandbox[0].epistemic_status!=='VERIFIED'||
     priorSandbox[0].event_kind!=='VERIFICATION'||
     priorSandbox[0].provenance?.source!=='reality-independent-sandbox-verifier-v0.1'||
     !same(priorSandbox[0].payload,sandboxPayload))
   fail('ORIGINAL_EXECUTOR_WARRANT_PRIOR_SANDBOX_CHANGED');
 }else{
  const tail=existing.at(-1);
  if(!tail?.event_id||!tail?.lineage_hash)
   fail('ORIGINAL_EXECUTOR_WARRANT_CONTINUITY_TAIL_MISSING');
  await append({eventId:sandboxId,parent:tail.event_id,priorHash:tail.lineage_hash,
   source:'reality-independent-sandbox-verifier-v0.1',payload:sandboxPayload});
 }
 const withSandbox=await read();
 const sandbox=withSandbox.filter(x=>x.event_id===sandboxId);
 if(sandbox.length!==1||sandbox[0].epistemic_status!=='VERIFIED'||
    sandbox[0].payload?.verified_experiment?.verification_hash!==e.experiment.verification_hash)
  fail('ORIGINAL_EXECUTOR_WARRANT_SANDBOX_DURABLE_READBACK_FAILED');
 const warrantPayload={version:ORIGINAL_EXECUTOR_TRUSTED_WARRANT_RECORDER_VERSION,
  owner_id:e.ownerId,conversation_id:e.conversationId,original_goal_id:e.originalGoalId,
  goal_revision:e.goalRevision,original_work_id:WORK,
  sandbox_receipt_id:sandboxId,blocked_checkpoint_id:e.checkpoint.event_id,
  warrant,original_job_completed:false,installation_authorized:false};
 if(priorWarrants.length===1){
  if(priorWarrants[0].epistemic_status!=='VERIFIED'||
     priorWarrants[0].provenance?.source!=='reality-upgrade-warrant-issuer-v0.1'||
     !same(priorWarrants[0].payload,warrantPayload))
   fail('ORIGINAL_EXECUTOR_WARRANT_PREVIOUS_RECEIPT_CHANGED');
 }else{
  const tail=withSandbox.at(-1);
  if(tail?.event_id!==sandboxId||!tail?.lineage_hash)
   fail('ORIGINAL_EXECUTOR_WARRANT_SANDBOX_NOT_CONTINUITY_TAIL');
  await append({eventId:warrantId,parent:sandboxId,priorHash:tail.lineage_hash,
   source:'reality-upgrade-warrant-issuer-v0.1',payload:warrantPayload});
 }
 const readback=await read();
 if(readback.filter(x=>x.event_id===warrantId).length!==1)
  fail('ORIGINAL_EXECUTOR_WARRANT_DURABLE_READBACK_FAILED');
 // The existing production-grade owner loader performs a separate immutable
 // scope, goal, epoch, continuity, signature and candidate verification.
 const candidate=await loadAuthenticatedWarrantedUpgrade({
  session,conversationId,originalWorkId:WORK,env});
 if(candidate.persisted_and_reobserved!==true||
    candidate.candidate_hash!==e.candidateHash||
    candidate.original_job_completed!==false||candidate.external_action_authorized!==false)
  fail('ORIGINAL_EXECUTOR_WARRANT_FINAL_TRUSTED_LOADER_REJECTED');
 return Object.freeze({
  status:'ORIGINAL_EXECUTOR_NON_AUTHORIZING_WARRANT_DURABLY_VERIFIED',
  original_work_id:WORK,original_goal_id:e.originalGoalId,
  candidate_sha256:e.candidateHash,executor_source_sha256:proof.executor_sha256,
  verifier_run_id:40762950798,
  sandbox_receipt_id:sandboxId,warrant_receipt_id:warrantId,
  warrant_id:checked.warrant_id,
  original_job_completed:false,github_write_authorized:false,
  installation_authorized:false,
 });
}
