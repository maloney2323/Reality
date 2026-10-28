// Current original-work verifier. It certifies the real gap and the exact
// model-proposed repair as different facts. The existing proposal DOES NOT
// implement the missing owner GitHub repair executor and MUST NOT receive
// an executable capability warrant.
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource,validateContinuityChain}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {
 originalOwnerContext,observeGithub,ORIGINAL_OWNER_WORK_ID,
 ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256,
} from './reality-original-owner-console-v0.1.js';
import {inspectAuthenticatedOriginalRepairRuntime}
 from './reality-original-repair-runtime-capability-readback-v0.1.js';
export const ORIGINAL_OWNER_VERIFIER_VERSION='reality-original-owner-verifier-v0.1';
const fail=x=>{throw Error(x)};
const EXPECTED_BRIDGE='PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE';
const VERIFIED_STATUS='PROPOSAL_VERIFIED_EXECUTOR_CAPABILITY_NOT_VERIFIED';

export function classifyOriginalExecutorWarrantEligibility({ownerContext,github,runtime}={}){
 if(ownerContext?.original_work_id!==ORIGINAL_OWNER_WORK_ID||
    ownerContext.owner_goal_confirmed!==true||
    github?.exact_llm_source_verified!==true||
    github?.sandbox_success!==true||
    github?.historical_fixed_source_verified!==true||
    github?.original_fix_preexisted_model_installation!==true||
    github?.review_pr_merged!==false||
    github?.original_candidate_sha256!==ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256||
    runtime?.original_work_id!==ORIGINAL_OWNER_WORK_ID||
    runtime?.independently_reobserved!==true||
    runtime?.executor_status!=='MISSING'||
    runtime?.missing_scope!=='EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH'||
    runtime?.bridge_admission_failure!==EXPECTED_BRIDGE||
    runtime?.current_registered_capabilities!==0||
    runtime?.original_job_completed!==false||
    runtime?.external_action_performed!==false)
   fail('OWNER_VERIFIER_EXACT_ORIGINAL_RUNTIME_AND_MODEL_PROOF_REQUIRED');
 return Object.freeze({
  status:VERIFIED_STATUS,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  capability_gap_id:'reality.original-repair-execution',
  candidate_sha256:ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256,
  source_verification_run_url:github.independent_review_run_url,
  bridge_rejection:runtime.bridge_admission_failure,
  runtime_gap_verified:true,
  proposal_source_verified:true,
  observed_original_source_already_fixed:true,
  proposed_patch_capability_verified:true,
  original_repair_execution_capability_verified:false,
  sandbox_execution_contract_verified:false,
  eligible_for_signed_execution_warrant:false,
  execution_warrant_issued:false,
  install_approval_available:false,
  original_execution_authorized:false,
  original_job_completed:false,
  next_action:'BUILD_AND_INDEPENDENTLY_VERIFY_ORIGINAL_REPAIR_EXECUTOR_THEN_ISSUE_OWNER_WARRANT',
 });
}

export async function verifyOriginalOwnerExecutorForWarrant({
 session,conversationId,env=process.env,
 context=originalOwnerContext,
 observe=observeGithub,
 inspectRuntime=inspectAuthenticatedOriginalRepairRuntime,
}={}){
 const owner=await context({session,conversationId,env});
 if(owner.owner_goal_confirmed!==true)
  fail('OWNER_VERIFIER_ORIGINAL_OWNER_GOAL_NOT_ACTIVE');
 const [github,runtime]=await Promise.all([
  observe(),
  inspectRuntime({session,conversationId,workId:ORIGINAL_OWNER_WORK_ID,env}),
 ]);
 return Object.freeze({owner,
  finding:classifyOriginalExecutorWarrantEligibility({ownerContext:owner,github,runtime}),
 });
}

// Durable receipt for VERIFIED GAP DIAGNOSIS, not a sandbox verification
// and not a forged signed warrant. No independent verifier receipt exists
// for an original-work EXECUTOR until executable behavior is tested.
export async function recordOriginalOwnerWarrantEligibility({
 session,conversationId,env=process.env,
 verify=verifyOriginalOwnerExecutorForWarrant,
 createPersistence=createUniversePostgresPersistence,
 resolveDb=resolveReliabilityBenchmarkDb,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('OWNER_VERIFIER_ISOLATED_PREVIEW_REQUIRED');
 const {owner,finding}=await verify({session,conversationId,env});
 if(finding.status!==VERIFIED_STATUS||
    finding.eligible_for_signed_execution_warrant!==false||
    finding.runtime_gap_verified!==true||
    finding.original_repair_execution_capability_verified!==false)
  fail('OWNER_VERIFIER_FAIL_CLOSED_ELIGIBILITY_REQUIRED');
 const db=resolveDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('OWNER_VERIFIER_ISOLATED_DB_MISMATCH');
 const g=owner.goal;
 if(g?.principal_id!==session.user_id||g?.conversation_id!==conversationId||
    g?.state?.active_goal?.status!=='ACTIVE'||g.state.active_goal.user_confirmed!==true||
    g.state.active_goal_id!==owner.history.find(e=>
      e.entity_type==='personal_recovery_checkpoint'&&
      e.payload?.original_work_id===ORIGINAL_OWNER_WORK_ID)?.payload?.original_goal_id)
  fail('OWNER_VERIFIER_CURRENT_ORIGINAL_GOAL_REQUIRED');
 const spine=createContinuitySpine({
  continuityRootId:g.scope.root,worldlineId:g.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==g.state.continuity_root_id)
  fail('OWNER_VERIFIER_SCOPE_MISMATCH');
 const store=createPersistence({...db});
 const read=async()=>orderContinuityHistory(await store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
 }));
 const id=continuityUuidFromSource('original-owner-warrant-eligibility:'+
  session.user_id+':'+conversationId+':'+ORIGINAL_OWNER_WORK_ID+':'+
  ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256);
 const history=await read();
 const lineage=validateContinuityChain(history.map(e=>({...e,
  prior_lineage_hash:e.prior_lineage_hash??
    e.provenance?.continuity_spine?.prior_lineage_hash??null,
 })));
 if(!lineage.valid)fail('OWNER_VERIFIER_CONTINUITY_CHAIN_INVALID');
 const prior=history.filter(e=>e.entity_type==='personal_original_warrant_eligibility'&&
   e.payload?.original_work_id===ORIGINAL_OWNER_WORK_ID);
 if(prior.length>1||prior.some(e=>e.event_id!==id))
  fail('OWNER_VERIFIER_COMPETING_ELIGIBILITY_RECEIPTS');
 if(prior.length===1){
  const e=prior[0];
  if(e.event_kind!=='VERIFICATION'||e.epistemic_status!=='CORROBORATED'||
     e.provenance?.source!==ORIGINAL_OWNER_VERIFIER_VERSION||
     e.provenance?.principal_id!==session.user_id||
     e.payload?.candidate_sha256!==ORIGINAL_OWNER_REPAIR_CANDIDATE_SHA256||
     e.payload?.execution_warrant_issued!==false)
    fail('OWNER_VERIFIER_PRIOR_RECEIPT_CHANGED');
  return Object.freeze({ok:true,...finding,receipt_id:id,recorded:true,
    already_recorded:true});
 }
 const tail=history.at(-1);
 if(!tail?.lineage_hash||!tail?.event_id)
  fail('OWNER_VERIFIER_CONTINUITY_TAIL_MISSING');
 const now=new Date().toISOString();
 const node=appendContinuityNode({
  spine,stage:'VERIFICATION',entityId:ORIGINAL_OWNER_WORK_ID,eventId:id,
  parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  assertionTime:now,effectiveTime:now,epistemicStatus:'CORROBORATED',
  evidenceRefs:[finding.source_verification_run_url,
    'owner-continuity:'+owner.relevant.find(e=>e.entity_type===
     'personal_original_repair_capability_candidate')?.event_id].filter(Boolean),
  payload:{version:ORIGINAL_OWNER_VERIFIER_VERSION,
   owner_id:session.user_id,conversation_id:conversationId,
   original_goal_id:g.state.active_goal_id,
   goal_revision:g.state.active_goal.last_transition_receipt_id,
   ...finding},
  provenance:{source:ORIGINAL_OWNER_VERIFIER_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await store.appendEvent({...node,entity_type:'personal_original_warrant_eligibility'});
 const checked=await read();
 const saved=checked.filter(e=>e.event_id===id);
 if(saved.length!==1||
    saved[0].entity_type!=='personal_original_warrant_eligibility'||
    saved[0].parent_event_id!==tail.event_id||
    saved[0].payload?.eligible_for_signed_execution_warrant!==false||
    saved[0].payload?.execution_warrant_issued!==false||
    saved[0].payload?.original_job_completed!==false)
  fail('OWNER_VERIFIER_DURABLE_READBACK_FAILED');
 return Object.freeze({ok:true,...finding,receipt_id:id,recorded:true,
  already_recorded:false});
}
