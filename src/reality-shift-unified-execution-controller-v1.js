import {projectRealityFinalLoopTimeHorizon}
 from './reality-final-loop-time-horizon-v1.js';
// One trusted view of the WHOLE authorized Reality employee shift.
// It binds source-native originals and Universe originals by the SAME
// owner/shift/source evidence without manufacturing goal transitions.
// Its decisions are read-only plan gates, NEVER new authorization or settlement.
export const REALITY_UNIFIED_SHIFT_CONTROLLER_VERSION=
 'reality-unified-employee-original-execution-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/;
const KINDS=new Set(['REAL_ENGINEERING_REPAIR_ORIGINAL',
 'REAL_PR_REVIEW_ORIGINAL','REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL',
 'GENUINE_UNIVERSE_CAPABILITY_ORIGINAL',
 'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','UNVERIFIED_SOURCE']);
const fail=x=>{throw Error('REALITY_UNIFIED_SHIFT_'+x)};

export function assertRealityUnifiedShiftGraph(graph,{expectedShiftId=null}={}){
 if(graph?.status==='NO_CURRENT_OWNER_SHIFT_EXECUTION_GRAPH'||
    graph?.status==='NO_ACTIVE_OWNER_BOUND_EXECUTION_GRAPH'){
  if(graph.installation_authorized!==false||
     graph.production_changed!==false||
     !Array.isArray(graph.jobs)||graph.jobs.length!==0)
   fail('NO_SHIFT_RESULT_UNVERIFIED');
  return Object.freeze({status:'NO_CURRENT_AUTHORIZED_WORK',
   shift_id:null,owner_id:null,jobs:Object.freeze([]),
   engineering_ready:false,pr_ready:false,
   install_approval_pending:false,all_selected_settled:false,
   next_action:'AWAIT_SIGNED_OWNER_START',installation_authorized:false,
   production_changed:false});
 }
 if(graph?.status!=='OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'||
    !UUID.test(graph.shift_id||'')||!UUID.test(graph.owner_id||'')||
    !SHA.test(graph.plan_fingerprint||'')||
    (expectedShiftId&&expectedShiftId!==graph.shift_id)||
    graph.completion_bound!==true||
    graph.execution_scope_from_owner_warrant_only!==true||
    graph.new_job_created!==false||
    graph.installation_authorized!==false||
    graph.original_job_completed_by_graph!==false||
    graph.production_changed!==false||
    !Array.isArray(graph.jobs)||
    graph.jobs.length<1||graph.jobs.length>4||
    graph.selected_sources!==graph.jobs.length)
  fail('CURRENT_SIGNED_OWNER_SCOPE_UNVERIFIED');
 const seenSources=new Set(),seenWorks=new Set();
 const all=graph.jobs.map(item=>{
  if(!Number.isInteger(item?.source_step_index)||
     item.source_step_index<2||item.source_step_index>5||
     !URL.test(item.source_ref||'')||
     !KINDS.has(item.original_kind)||
     !['SOURCE_CHECKED','QUEUED','CLAIMED','BLOCKED_PROVIDER',
       'REPORTED','NOT_ADMITTED','SOURCE_ADMITTED','PREPARED','SETTLED',
       'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL','CANDIDATE_TESTING',
       'PENDING_FROZEN_REPRODUCTION',
       'EVIDENCE_RECONCILIATION_REQUIRED',
       'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
       'PUBLISHING','EVIDENCE_VERIFIED','BLOCKED',
       'LEASED_FOR_INDEPENDENT_REPRODUCTION','AWAITING_OWNER_APPROVAL',
       'ISOLATED_INSTALLED_PROBATION','SETTLED_ISOLATED'].includes(item.phase)||
     !/^[A-Z0-9_]{8,100}$/.test(item.next_governed_action||'')||
     item.capability_installation_authorized!==false||
     item.original_job_completed_by_graph!==false||
     item.provider_effect_claimed_by_graph!==false||
     seenSources.has(item.source_ref))
   fail('EXACT_SOURCE_IDENTITY_OR_RESULT_UNVERIFIED');
  seenSources.add(item.source_ref);
  if(item.independent_source_proof_verified!==true){
   if(item.original_kind!=='UNVERIFIED_SOURCE')
    fail('UNVERIFIED_SOURCE_CANNOT_DISPATCH');
  }else if(!SHA.test(item.source_proof_sha256||'')){
   fail('INDEPENDENT_SOURCE_PROOF_MISSING');
  }
  if(item.original_work_id!==null&&item.original_work_id!==undefined){
   if(!WORK.test(item.original_work_id)||
      seenWorks.has(item.original_work_id))
    fail('DUPLICATE_ORIGINAL_WORK_ID_OR_INVALID');
   seenWorks.add(item.original_work_id);
  }else if(item.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
           item.phase==='SOURCE_ADMITTED'){
   fail('ADMITTED_REPAIR_MUST_HAVE_ORIGINAL_ID');
  }
  const is263=item.source_ref===
   'https://github.com/maloney2323/Reality/issues/263';
  // Engineering originals are not specific to historical issue #263.
  // The upstream service-only admission gate supplies the owner-bound
  // source proof and durable original-work ID. The read-only controller
  // must reject any PR, unverified source or anonymous "original" here.
  if(item.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
     (!/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/.test(item.source_ref)||
      item.independent_source_proof_verified!==true||
      !WORK.test(item.original_work_id||'')))
   fail('ENGINEERING_ORIGINAL_REQUIRES_VERIFIED_ISSUE_AND_WORK_ID');
  if(item.original_kind==='REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL'&&
     (!/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/.test(item.source_ref)||
      item.independent_source_proof_verified!==true||
      !WORK.test(item.original_work_id||'')||
      !['SOURCE_ADMITTED','EVIDENCE_VERIFIED','BLOCKED','SETTLED'].includes(item.phase)))
   fail('COMMIT_TRIAGE_REQUIRES_VERIFIED_FROZEN_ISSUE_ORIGINAL');
  if(is263&&item.independent_source_proof_verified===true&&
     item.original_kind!=='REAL_ENGINEERING_REPAIR_ORIGINAL')
   fail('EXACT_REPAIR_IDENTITY_MUST_NOT_BE_RECAST_AS_OTHER_ENGINE');
  return Object.freeze({...item});
 });
 const engineering=all.filter(x=>x.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL');
 const pr=all.filter(x=>x.original_kind==='REAL_PR_REVIEW_ORIGINAL');
 const waiting=all.filter(x=>x.original_kind==='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL');
 const engineeringReady=engineering.some(x=>
  x.independent_source_proof_verified===true&&x.phase==='SOURCE_ADMITTED');
 const prReady=pr.some(x=>
  x.independent_source_proof_verified===true&&x.phase==='PREPARED');
 const testedNativeCandidate=engineering.some(x=>
  x.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL');
 const unverified=all.some(x=>x.independent_source_proof_verified!==true);
 // Do not infer "settled" from source checks, worker wakes or model advice.
 // Whole shift completion remains the independent DB receipt closer's job.
 const next=unverified?'VERIFY_EXACT_SOURCE_EVIDENCE':
  engineeringReady?'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR':
  testedNativeCandidate?'VERIFY_NATIVE_INSTALL_AND_RESUME_PATH_BEFORE_OWNER_APPROVAL':
  prReady?'CONTINUE_INDEPENDENT_PR_REVIEW':
  waiting.length?'QUALIFY_UNADMITTED_ORIGINAL_WORK':
  'RECONCILE_FINAL_INDEPENDENT_RECEIPTS';
 return Object.freeze({
  status:'UNIFIED_OWNER_JOB_CONTROL_READY',
  shift_id:graph.shift_id,owner_id:graph.owner_id,
  plan_fingerprint:graph.plan_fingerprint,
  jobs:Object.freeze(all),
  engineering_ready:engineeringReady,
  pr_ready:prReady,
  // A tested patch is NOT a verified install-to-settlement capability.
  install_approval_pending:false,
  tested_native_candidate_present:testedNativeCandidate,
  all_selected_settled:false,
  next_action:next,
  installation_authorized:false,
  production_changed:false});
}

// Final Loop Engine v1: authoritative *decision policy* attached to the
// EXISTING unified shift controller. The service-role Continuity ledger must
// still atomically reserve/commit each proposed transition. This policy is
// never itself an execution warrant, persistence adapter, or final verifier.
export const REALITY_FINAL_LOOP_ENGINE_VERSION='reality-final-loop-engine-v1';
const LOOP_CHOICES=Object.freeze(['ADVANCE','RECOVER','REFRESH','SUSPEND','SETTLE']);
const LOOP_EFFECTS=new Set(['READ','PREPARE','WRITE_ISOLATED','EXTERNAL_EFFECT','INSTALL_PREVIEW']);
const asTime=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)?
 Date.parse(x):NaN;
const digest=x=>SHA.test(x||'');
const uniqueEffects=xs=>Array.isArray(xs)&&xs.length<=LOOP_EFFECTS.size&&
 xs.every(x=>LOOP_EFFECTS.has(x))&&new Set(xs).size===xs.length;
const makeLoopDecision=(item,choice,next,reason,detail={})=>Object.freeze({
 original_work_id:item.original_work_id||null,source_ref:item.source_ref,
 decision:choice,next_governed_action:next,reason,...detail,
 // No status or model output can grant these effects.
 transition_committed:false,atomic_service_transition_required:true,
 executor_invoked:false,execution_authorized_by_engine:false,
 new_authority_granted:false,retry_external_effects_authorized:false,
 installation_authorized:false,independent_settlement_committed:false,
 original_job_completed:false,production_changed:false
});
const loopEnvelope=(view,ledger,decisions,status)=>{const envelope={
 schema:REALITY_FINAL_LOOP_ENGINE_VERSION,status,
 owner_id:view.owner_id,shift_id:view.shift_id,
 plan_fingerprint:view.plan_fingerprint,
 continuity_root_id:ledger?.continuity_root_id||null,
 continuity_head_sha256:ledger?.head_sha256||null,
 decisions:Object.freeze(decisions),decision_count:decisions.length,
 available_decisions:LOOP_CHOICES,
 all_originals_independently_settlement_eligible:
  decisions.length>0&&decisions.every(d=>d.decision==='SETTLE'),
 all_selected_settled:false,shift_completed:false,
 canonical_ledger_mutated:false,universe_mutated:false,
 installation_authorized:false,production_changed:false,
 original_job_completed:false
 };
 return Object.freeze({...envelope,
  time_horizon:projectRealityFinalLoopTimeHorizon({engine:envelope})
 });
};

// Parent-child recovery is a policy of this SAME Final Loop controller.
// It may request independent admission, recovery and verification, but never
// creates a child job or treats a review-plan digest as a customer receipt.
export const REALITY_FINAL_LOOP_CHILD_POLICY_VERSION=
 'reality-final-loop-child-policy-v1';
const childDecision=(parent,decision,next,reason,more={})=>Object.freeze({
 schema:REALITY_FINAL_LOOP_CHILD_POLICY_VERSION,
 parent_original_work_id:parent?.original_work_id??null,
 source_ref:parent?.source_ref??null,
 decision,next_governed_action:next,reason,
 parent_obligation_remains_open:true,
 child_original_admitted_by_engine:false,
 execution_authorized:false,transition_committed:false,
 independent_parent_outcome_verified:false,
 parent_settlement_eligible:false,
 original_job_completed:false,production_changed:false,...more
});
export function evaluateRealityFinalLoopChildRecovery({
 parent,sourcePlan,independentChildren=null,
 ownerId,shiftId,acceptanceContractSha256=null
}={}){
 const decide=(d,a,r,m)=>childDecision(parent,d,a,r,m);
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/.test(
   parent?.source_ref||'')||
  !digest(parent?.source_proof_sha256)||
  (parent?.original_work_id!=null&&
   !WORK.test(parent.original_work_id))||
  !['NOT_ADMITTED','BLOCKED','CLAIMED','SOURCE_ADMITTED',
    'PREPARED','PUBLISHING'].includes(parent?.phase))
  return decide('SUSPEND','RECHECK_EXACT_PARENT_ORIGINAL',
   'PARENT_OR_SIGNED_SHIFT_IDENTITY_UNVERIFIED');
 if(!sourcePlan)
  return decide('REFRESH','REQUALIFY_COMPLETE_PARENT_SOURCE',
   'NO_INDEPENDENTLY_INSPECTED_RECOVERY_PLAN');
 if(sourcePlan.owner_id!==ownerId||sourcePlan.shift_id!==shiftId||
  sourcePlan.source_ref!==parent.source_ref||
  sourcePlan.original_work_id!==(parent.original_work_id??null)||
  sourcePlan.native_phase!==parent.phase||
  sourcePlan.frozen_source_proof_sha256!==parent.source_proof_sha256||
  !digest(sourcePlan.source_manifest_sha256)||
  !/^[a-f0-9]{40}$/.test(sourcePlan.live_head_sha||'')||
  sourcePlan.read_only!==true||sourcePlan.proposed_only!==true||
  sourcePlan.parent_obligation_remains_open!==true||
  sourcePlan.native_admission_unchanged!==true||
  sourcePlan.worker_claim_consumed!==false||
  sourcePlan.owner_approval_granted!==false||
  sourcePlan.original_job_completed!==false||
  sourcePlan.source_manifest_complete!==true||
  sourcePlan.independent_review_completed!==false||
  sourcePlan.cross_scope_review_verified!==false||
  !Number.isInteger(sourcePlan.manifest_file_count)||
  sourcePlan.manifest_file_count<9||
  sourcePlan.manifest_file_count>500||
  !Number.isInteger(sourcePlan.bounded_scope_count)||
  sourcePlan.bounded_scope_count<2||
  sourcePlan.bounded_scope_count>63||
  !Array.isArray(sourcePlan.bounded_scopes)||
  sourcePlan.bounded_scopes.length!==sourcePlan.bounded_scope_count)
  return decide('REFRESH','REQUALIFY_PARENT_CHILD_SCOPE_AND_PROOF',
   'PARENT_CHILD_RECOVERY_SOURCE_PLAN_MISMATCH');
 const paths=new Set(),scopes=new Set();
 for(const [index,scope] of sourcePlan.bounded_scopes.entries()){
  if(scope?.index!==index||!digest(scope.proposed_scope_sha256)||
    scopes.has(scope.proposed_scope_sha256)||
    scope.source_head_sha!==sourcePlan.live_head_sha||
    scope.proposed_only!==true||
    scope.native_child_original_admitted!==false||
    scope.child_execution_authorized!==false||
    !Number.isInteger(scope.file_count)||scope.file_count<1||
    scope.file_count>8||!Array.isArray(scope.files)||
    scope.files.length!==scope.file_count)
   return decide('REFRESH','REQUALIFY_COMPLETE_CHILD_FILE_INVENTORY',
    'DUPLICATE_OR_INCOMPLETE_CHILD_SCOPE');
  scopes.add(scope.proposed_scope_sha256);
  for(const f of scope.files){
   if(typeof f?.path!=='string'||!f.path||
      f.path.startsWith('/')||
      f.path.split('/').some(x=>!x||x==='.'||x==='..')||
      paths.has(f.path)||
      !/^[a-f0-9]{40}$/.test(f.blob_sha||'')||
      f.patch_proof_verified!==false)
    return decide('REFRESH','REQUALIFY_COMPLETE_CHILD_FILE_INVENTORY',
     'DUPLICATE_OR_UNVERIFIED_CHILD_FILE');
   paths.add(f.path);
  }
 }
 if(paths.size!==sourcePlan.manifest_file_count)
  return decide('REFRESH','REQUALIFY_COMPLETE_CHILD_FILE_INVENTORY',
   'PARENT_SOURCE_INVENTORY_HAS_UNCOVERED_FILES');
 const counts={source_manifest_sha256:sourcePlan.source_manifest_sha256,
  proposed_child_scope_count:sourcePlan.bounded_scope_count};
 if(parent.original_work_id==null)
  return decide('SUSPEND','ADMIT_EXACT_PARENT_ORIGINAL_BEFORE_RECOVERY',
   'UNADMITTED_SOURCE_CANNOT_CREATE_CHILDREN',counts);
 if(parent.phase==='PREPARED'||parent.phase==='PUBLISHING')
  return decide('SUSPEND','RECONCILE_PARENT_PROVIDER_EFFECT_WITHOUT_REPLAY',
   'UNRESOLVED_PARENT_PROVIDER_EFFECT',counts);
 if(independentChildren===null)
  return decide('SUSPEND','BIND_SIGNED_PARENT_ACCEPTANCE_AND_CHILD_AUTHORITY',
   'PROPOSED_CHILD_SCOPES_NOT_EXECUTABLE',counts);
 if(!digest(acceptanceContractSha256)||
   independentChildren.schema!=='reality-final-loop-independent-child-readback-v1'||
   independentChildren.independent_service_readback_verified!==true||
   independentChildren.owner_id!==ownerId||
   independentChildren.shift_id!==shiftId||
   independentChildren.parent_original_work_id!==parent.original_work_id||
   independentChildren.parent_source_ref!==parent.source_ref||
   independentChildren.source_manifest_sha256!==sourcePlan.source_manifest_sha256||
   independentChildren.source_head_sha!==sourcePlan.live_head_sha||
   independentChildren.acceptance_contract_sha256!==acceptanceContractSha256||
   independentChildren.authority?.independently_verified!==true||
   independentChildren.authority?.owner_id!==ownerId||
   independentChildren.authority?.acceptance_contract_sha256!==acceptanceContractSha256||
   !digest(independentChildren.authority?.receipt_sha256)||
   independentChildren.capacity?.independently_attested!==true||
   !digest(independentChildren.capacity?.receipt_sha256)||
   !Array.isArray(independentChildren.children)||
   independentChildren.children.length!==sourcePlan.bounded_scope_count)
  return decide('SUSPEND','INDEPENDENTLY_VERIFY_CHILD_ACCEPTANCE_AND_CAPACITY',
   'FOUR_PROOFS_NOT_ESTABLISHED_FOR_PARENT_CHILD_RECOVERY',counts);
 if(independentChildren.provider_effect_uncertain===true||
    independentChildren.children.some(c=>c?.phase==='EFFECT_UNCERTAIN'))
  return decide('SUSPEND','RECONCILE_CHILD_PROVIDER_EFFECT_WITHOUT_REPLAY',
   'UNCERTAIN_CHILD_EFFECT_NEEDS_INDEPENDENT_READBACK',counts);
 const ids=new Set();
 let verified=0,admitted=0;
 for(const [i,c] of independentChildren.children.entries()){
  if(c?.index!==i||
    c.scope_sha256!==sourcePlan.bounded_scopes[i].proposed_scope_sha256||
    !['NOT_ADMITTED','ADMITTED','VERIFIED'].includes(c.phase))
   return decide('SUSPEND','RECONCILE_CHILD_INDEPENDENT_LINEAGE',
    'CHILD_SCOPE_OR_PHASE_UNVERIFIED',counts);
  if(c.phase==='NOT_ADMITTED'){
   if(c.child_original_work_id!=null||c.independent_receipt_sha256!=null)
    return decide('SUSPEND','RECONCILE_CHILD_INDEPENDENT_LINEAGE',
     'UNADMITTED_CHILD_CANNOT_HAVE_FINAL_RECEIPT',counts);
   continue;
  }
  if(!WORK.test(c.child_original_work_id||'')||
     c.child_original_work_id===parent.original_work_id||
     ids.has(c.child_original_work_id))
   return decide('SUSPEND','RECONCILE_CHILD_INDEPENDENT_LINEAGE',
    'DUPLICATE_OR_INVALID_CHILD_ORIGINAL',counts);
  ids.add(c.child_original_work_id);admitted++;
  if(c.phase==='VERIFIED'){
   if(c.independently_verified!==true||
      c.verifier_independent!==true||
      !digest(c.independent_receipt_sha256))
    return decide('SUSPEND','RECONCILE_CHILD_INDEPENDENT_LINEAGE',
     'UNVERIFIED_CHILD_OUTCOME_CANNOT_ADVANCE_PARENT',counts);
   verified++;
  }
 }
 if(admitted!==sourcePlan.bounded_scope_count)
  return decide('SUSPEND','INDEPENDENTLY_ADMIT_REMAINING_CHILD_SCOPES',
   'CHILD_ADMISSION_MISSING',counts);
 if(verified!==sourcePlan.bounded_scope_count)
  return decide('RECOVER','CONTINUE_NEXT_AUTHORIZED_CHILD_WITH_ATOMIC_CLAIM',
   'CHILD_ORIGINALS_PENDING_INDEPENDENT_VERIFICATION',{
    ...counts,verified_child_count:verified
   });
 if(independentChildren.cross_scope?.independently_verified!==true||
    !digest(independentChildren.cross_scope?.receipt_sha256))
  return decide('ADVANCE','INDEPENDENTLY_VERIFY_CROSS_CHILD_INTEGRATION',
   'CHILD_RESULTS_NEED_CROSS_SCOPE_CHECK',counts);
 return decide('ADVANCE','INDEPENDENTLY_VERIFY_PARENT_ACCEPTANCE_AND_UNIVERSE',
  'CHILD_RECEIPTS_DO_NOT_SETTLE_PARENT_ORIGINAL',{
   ...counts,all_children_independently_verified:true
  });
}

// One logical evaluation for an entire shift. A signed worker must obtain
// 'ledger' from an authenticated, independent service-only readback; no model,
// browser payload, PR or CI result may be passed as an authority source.
// The transition writer (not this method) must CAS the ledger revision/head
// and use a DB-atomic single-use claim before calling any existing executor.
export function evaluateRealityFinalLoopEngine({
 graph,ledger,now=new Date().toISOString(),previousCheckpoint=null,
 maxSnapshotAgeMs=300000
}={}){
 const view=assertRealityUnifiedShiftGraph(graph);
 if(view.status==='NO_CURRENT_AUTHORIZED_WORK')
  return loopEnvelope(view,null,[],'NO_AUTHORIZED_SHIFT');
 if(!Number.isSafeInteger(maxSnapshotAgeMs)||maxSnapshotAgeMs<1000||
    maxSnapshotAgeMs>900000||!Number.isFinite(asTime(now)))
  throw Error('REALITY_FINAL_LOOP_INVALID_CLOCK_POLICY');
 const stop=(code)=>loopEnvelope(view,ledger,view.jobs.map(item=>
  makeLoopDecision(item,'SUSPEND','RECHECK_AUTHENTICATED_CONTINUITY_LEDGER',code)
 ),'CANONICAL_LEDGER_UNVERIFIED');
 if(ledger?.status!=='OWNER_SHIFT_FINAL_LOOP_LEDGER_INDEPENDENT_READ'||
  ledger.read_only!==true||ledger.independent_owner_scope_verified!==true||
  ledger.owner_id!==view.owner_id||ledger.shift_id!==view.shift_id||
  ledger.plan_fingerprint!==view.plan_fingerprint||
  !UUID.test(ledger.continuity_root_id||'')||
  !digest(ledger.head_sha256)||!digest(ledger.acceptance_contract_sha256)||
  ledger.acceptance_frozen!==true||ledger.owner_acceptance_verified!==true||
  !Number.isSafeInteger(ledger.revision)||ledger.revision<1||
  !Array.isArray(ledger.jobs)||ledger.jobs.length>view.jobs.length||
  ledger.installation_authorized!==false||
  ledger.production_changed!==false)
  return stop('CANONICAL_OWNER_SCOPE_OR_FROZEN_ACCEPTANCE_MISSING');
 const time=asTime(now),readTime=asTime(ledger.observed_at);
 const current=Number.isFinite(readTime)&&readTime<=time&&
  time-readTime<=maxSnapshotAgeMs;
 const duplicate=new Set(),seenSource=new Set();
 const proofByWork=new Map();
 for(const proof of ledger.jobs){
  if(!proof||!WORK.test(proof.original_work_id||'')||
   !digest(proof.acceptance_contract_sha256)||
   proof.acceptance_contract_sha256!==ledger.acceptance_contract_sha256||
   proof.continuity_head_sha256!==ledger.head_sha256||
   proof.ledger_revision!==ledger.revision||
   typeof proof.source_ref!=='string'||
   duplicate.has(proof.original_work_id)||seenSource.has(proof.source_ref)||
   !view.jobs.some(item=>item.original_work_id===proof.original_work_id&&
    item.source_ref===proof.source_ref))
   return stop('PROOF_ORIGINAL_ACCEPTANCE_OR_LINEAGE_MISMATCH');
  duplicate.add(proof.original_work_id);
  seenSource.add(proof.source_ref);
  proofByWork.set(proof.original_work_id,proof);
 }
 const changed=previousCheckpoint!==null&&(
  previousCheckpoint.shift_id!==view.shift_id||
  previousCheckpoint.acceptance_contract_sha256!==ledger.acceptance_contract_sha256||
  previousCheckpoint.head_sha256!==ledger.head_sha256||
  previousCheckpoint.revision!==ledger.revision);
 const decisions=view.jobs.map(item=>{
  if(!WORK.test(item.original_work_id||''))
   return makeLoopDecision(item,'SUSPEND','QUALIFY_CANONICAL_ORIGINAL_WORK',
    'ORIGINAL_NOT_INDEPENDENTLY_ADMITTED');
  const p=proofByWork.get(item.original_work_id);
  if(!p)return makeLoopDecision(item,'REFRESH','READ_SAME_ORIGINAL_PROOF_GATES',
   'SIGNED_ORIGINAL_PROOF_NOT_IN_LEDGER_SNAPSHOT');
  if(!current||changed)
   return makeLoopDecision(item,'REFRESH','REQUALIFY_CURRENT_CONTINUITY_HEAD',
    current?'CAUSAL_CHECKPOINT_OR_PROOF_DIFF_CHANGED':'LEDGER_EVIDENCE_STALE');
  if(item.independent_source_proof_verified!==true||
   p.evidence?.independently_verified!==true||
   !digest(p.evidence.receipt_sha256)||
   !Number.isFinite(asTime(p.evidence.observed_at))||
   asTime(p.evidence.observed_at)>time||
   time-asTime(p.evidence.observed_at)>maxSnapshotAgeMs)
   return makeLoopDecision(item,'REFRESH','REOBSERVE_SOURCE_AND_FOUR_PROOF_GATES',
    'EPISTEMIC_PROOF_MISSING_OR_STALE');
  // Independent outcome plus Universe reconciliation are required before
  // *requesting* settlement. A model, install, diagnosis or source check is
  // never an independently completed customer original.
  const childRecovery=p.child_recovery===undefined?null:
   evaluateRealityFinalLoopChildRecovery({
    parent:item,sourcePlan:p.child_recovery?.source_plan??null,
    independentChildren:p.child_recovery?.independent_children??null,
    ownerId:view.owner_id,shiftId:view.shift_id,
    acceptanceContractSha256:ledger.acceptance_contract_sha256
   });
  if(childRecovery&&(
    childRecovery.decision!=='ADVANCE'||
    childRecovery.next_governed_action!==
     'INDEPENDENTLY_VERIFY_PARENT_ACCEPTANCE_AND_UNIVERSE'))
   return makeLoopDecision(item,childRecovery.decision,
    childRecovery.next_governed_action,childRecovery.reason,{
     parent_obligation_remains_open:true
    });
  const o=p.outcome;
  if(childRecovery&&o?.status!=='INDEPENDENT_FINAL_VERIFIED')
   return makeLoopDecision(item,'ADVANCE',
    'INDEPENDENTLY_VERIFY_PARENT_ACCEPTANCE_AND_UNIVERSE',
    'CHILD_RECEIPTS_REQUIRE_INDEPENDENT_PARENT_FINAL_OUTCOME');
  if(o?.status==='INDEPENDENT_FINAL_VERIFIED'){
   // A final verifier receipt cannot launder a missing authority or
   // capacity proof into a settled original. All four gates must be true
   // against the SAME frozen acceptance even on a reconciliation wake.
   const a=p.authority,c=p.capacity;
   if(a?.status!=='EXACT_WARRANT_VERIFIED'||
      a.owner_id!==view.owner_id||
      a.original_work_id!==item.original_work_id||
      a.acceptance_contract_sha256!==ledger.acceptance_contract_sha256||
      a.independently_verified!==true||!digest(a.receipt_sha256)||
      !uniqueEffects(a.permitted_effects)||
      !uniqueEffects(a.requested_effects)||
      a.requested_effects.some(x=>!a.permitted_effects.includes(x)))
    return makeLoopDecision(item,'SUSPEND',
     'RECHECK_FROZEN_ORIGINAL_AUTHORITY_BEFORE_SETTLEMENT',
     'FINAL_RECEIPT_CANNOT_SUBSTITUTE_FOR_AUTHORITY_PROOF');
   if(c?.status!=='SIGNED_WORKER_HANDLER_ATTESTED'||
      c.independently_attested!==true||
      !digest(c.receipt_sha256)||
      c.scheduled_worker_observed!==true)
    return makeLoopDecision(item,'SUSPEND',
     'RECHECK_INDEPENDENT_EXECUTION_CAPACITY_BEFORE_SETTLEMENT',
     'FINAL_RECEIPT_CANNOT_SUBSTITUTE_FOR_CAPACITY_PROOF');
   if(o.verifier_independent!==true||
    o.original_work_id!==item.original_work_id||
    o.acceptance_contract_sha256!==ledger.acceptance_contract_sha256||
    !digest(o.receipt_sha256))
    return makeLoopDecision(item,'SUSPEND','INDEPENDENTLY_RECHECK_FINAL_RECEIPT',
     'OUTCOME_PROOF_CONTRADICTS_ORIGINAL_ACCEPTANCE');
   if(p.universe?.independently_reconciled!==true||
    p.universe.original_work_id!==item.original_work_id||
    p.universe.outcome_receipt_sha256!==o.receipt_sha256||
    !digest(p.universe.receipt_sha256))
    return makeLoopDecision(item,'ADVANCE',
     'RECONCILE_INDEPENDENT_ORIGINAL_RECEIPT_TO_UNIVERSE',
     'OUTCOME_VERIFIED_UNIVERSE_RETURN_PENDING');
   // Even a previously settled original needs independent current
   // settlement readback; never try to write the terminal effect twice.
   if(p.original_settled===true)
    return makeLoopDecision(item,'SUSPEND',
     'INDEPENDENTLY_READ_PREVIOUS_ATOMIC_SETTLEMENT_NO_REPLAY',
     'PREVIOUS_SETTLEMENT_CLAIM_REQUIRES_DURABLE_RECEIPT');
   return makeLoopDecision(item,'SETTLE',
    'REQUEST_ATOMIC_ORIGINAL_SETTLEMENT_AND_INDEPENDENT_READBACK',
    'FOUR_PROOFS_AND_UNIVERSE_OUTCOME_REQUIRE_DURABLE_CLOSURE',
    {independent_final_receipt_sha256:o.receipt_sha256,
     universe_reconciliation_sha256:p.universe.receipt_sha256});
  }
  if(o?.status!=='NOT_VERIFIED'||p.original_settled===true)
   return makeLoopDecision(item,'SUSPEND','INDEPENDENTLY_RECHECK_ORIGINAL_OUTCOME',
    'INCONSISTENT_OR_UNVERIFIED_SETTLEMENT');
  const blocker=p.blocker;
  if(blocker!=null&&blocker.status!=='NONE'){
   if(blocker.independently_attested!==true||
    !digest(blocker.receipt_sha256))
    return makeLoopDecision(item,'REFRESH','OBTAIN_INDEPENDENT_BLOCKER_ATTESTATION',
     'BLOCKER_NOT_INDEPENDENTLY_ATTESTED');
   if(blocker.provider_effect_uncertain===true)
    return makeLoopDecision(item,'SUSPEND','RECONCILE_PROVIDER_EFFECT_WITHOUT_REPLAY',
     'PROVIDER_EFFECT_UNCERTAIN_SINGLE_USE_FENCE');
   if(blocker.recovery_permitted_without_new_authority!==true)
    return makeLoopDecision(item,'SUSPEND','REQUEST_EXACT_GOVERNED_RECOVERY_AUTHORITY',
     'RECOVERY_SCOPE_EXCEEDS_EXISTING_WARRANT');
   return makeLoopDecision(item,'RECOVER',
    'ROUTE_ATTESTED_BLOCKER_TO_EXISTING_CAPABILITY_RECOVERY',
    'INDEPENDENT_RECOVERY_CANDIDATE_REQUIRED');
  }
  if(p.authority?.status!=='EXACT_WARRANT_VERIFIED'||
   p.authority.owner_id!==view.owner_id||
   p.authority.original_work_id!==item.original_work_id||
   p.authority.acceptance_contract_sha256!==ledger.acceptance_contract_sha256||
   p.authority.independently_verified!==true||
   !digest(p.authority.receipt_sha256)||
   p.authority.claim_consumed!==false||
   !uniqueEffects(p.authority.permitted_effects)||
   !uniqueEffects(p.authority.requested_effects)||
   p.authority.requested_effects.some(x=>!p.authority.permitted_effects.includes(x)))
   return makeLoopDecision(item,'SUSPEND','GET_EXACT_OWNER_AUTHORITY_AND_NARROW_EFFECT_SCOPE',
    'AUTHORITY_PROOF_NOT_VERIFIED_OR_NARROWED');
  if(p.capacity?.status==='INDEPENDENT_CAPABILITY_MISSING'&&
   p.capacity.independently_attested===true&&
   digest(p.capacity.receipt_sha256))
   return makeLoopDecision(item,'RECOVER',
    'QUALIFY_MISSING_CAPABILITY_WITH_EXISTING_GOVERNED_ENGINE',
    'CAPACITY_GAP_INDEPENDENTLY_PROVEN');
  if(p.capacity?.status!=='SIGNED_WORKER_HANDLER_ATTESTED'||
   p.capacity.independently_attested!==true||
   !digest(p.capacity.receipt_sha256)||
   p.capacity.scheduled_worker_observed!==true)
   return makeLoopDecision(item,'REFRESH',
    'ATTEST_ACTUAL_SCHEDULED_WORKER_HANDLER',
    'CAPACITY_NOT_INDEPENDENTLY_VERIFIED');
  return makeLoopDecision(item,'ADVANCE',
   'CLAIM_ONE_USE_GOVERNED_EXECUTION_FOR_SAME_ORIGINAL',
   'EPISTEMIC_AUTHORITY_CAPACITY_PROOFS_VERIFIED_OUTCOME_PENDING');
 });
 return loopEnvelope(view,ledger,decisions,
  decisions.some(x=>x.decision==='SUSPEND')?'ACTIVE_WITH_FENCED_OBLIGATIONS':
  'CANONICAL_FINAL_LOOP_DECISIONS_READY');
}
