// Reality's proof-carrying recovery policy for the EXISTING Final Loop.
// Read-only policy, not a new executor, DB freeze, verifier, warrant, or ledger.
import {createHash} from 'node:crypto';
export const RECOVERY_CONTRACT_VERSION='reality-final-loop-proof-carrying-recovery-v1';
export const CASE_REPAIR_PROOFS=Object.freeze(['RED','REPAIR_ISOLATED','GREEN','REGRESSION','CONTINUATION']);
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const REF=/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/pull\/[1-9]\d*$/;
const KEY=/^[A-Z][A-Z0-9_]{2,100}$/;
const FAILURES=new Set(['NO_PROOF_DELTA','WRONG_TARGET','RED_NOT_REPRODUCED',
 'REGRESSION_FAILED','BUDGET_EXCEEDED','AUTHORITY_REQUIRED','PROVIDER_UNVERIFIED']);
const MAX=Object.freeze({max_attempts:6,max_wall_seconds:3600,max_cost_units:100,max_changed_files:8});
export const DEFAULT_RECOVERY_BUDGET=Object.freeze({
 max_attempts:3,max_wall_seconds:900,max_cost_units:20,max_changed_files:3});
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>Array.isArray(x)?x.map(canonical):
 obj(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const safe=(status,extra={})=>Object.freeze({
 schema:RECOVERY_CONTRACT_VERSION,status,read_only:true,
 model_authorized_by_evaluator:false,execution_authorized:false,
 owner_approval_granted:false,install_authorized:false,
 repair_verified_by_evaluator:false,original_job_completed:false,
 parent_settled:false,production_changed:false,new_shift_started:false,...extra
});
const fail=x=>{throw Error('REALITY_PROOF_RECOVERY_'+x)};
const positive=(n,max)=>Number.isSafeInteger(n)&&n>=1&&n<=max;
function checkBudget(b){
 if(!obj(b)||Object.keys(MAX).some(k=>!positive(b[k],MAX[k]))||
  Object.keys(b).some(k=>!(k in MAX)))fail('RECOVERY_BUDGET_INVALID');
}
function scope(x){
 if(!obj(x)||!UUID.test(x.owner_id||'')||!UUID.test(x.shift_id||'')||
  !UUID.test(x.continuity_root_id||'')||!WORK.test(x.obligation_id||'')||
  !REF.test(x.source_ref||'')||!SHA.test(x.source_revision||'')||
  !HASH.test(x.continuity_head_sha256||'')||
  !HASH.test(x.blocker_evidence_sha256||'')||!KEY.test(x.blocker_kind||'')||
  !['CODE','CAPACITY','INTEGRATION','EVIDENCE','AUTHORITY'].includes(x.blocker_class)||
  typeof x.frozen_scope!=='string'||x.frozen_scope.length<3||
  x.frozen_scope.length>250||!KEY.test(x.failure_signature||''))
  fail('SOURCE_OR_LEDGER_IDENTITY_INVALID');
}
function checkContract(c){
 if(c?.version!==RECOVERY_CONTRACT_VERSION||!HASH.test(c.contract_id||'')||
  !HASH.test(c.contract_fingerprint||'')||
  c.freeze_state!=='CANDIDATE_NOT_DURABLE'||
  c.ledger_freeze_verified!==false||!Array.isArray(c.required_proofs)||
  c.required_proofs.join('|')!==CASE_REPAIR_PROOFS.join('|'))
  fail('CONTRACT_UNTRUSTED');
 scope(c);checkBudget(c.budget);
 const h=hash({version:RECOVERY_CONTRACT_VERSION,owner_id:c.owner_id,
  shift_id:c.shift_id,continuity_root_id:c.continuity_root_id,
  obligation_id:c.obligation_id,source_ref:c.source_ref,
  source_revision:c.source_revision,continuity_head_sha256:c.continuity_head_sha256,
  blocker_evidence_sha256:c.blocker_evidence_sha256,
  blocker_class:c.blocker_class,blocker_kind:c.blocker_kind,
  failure_signature:c.failure_signature,frozen_scope:c.frozen_scope,
  required_proofs:[...CASE_REPAIR_PROOFS],budget:c.budget});
 if(h!==c.contract_id||h!==c.contract_fingerprint)
  fail('FROZEN_CONTRACT_FINGERPRINT_MISMATCH');
}
// This merely proposes an immutable contract. An EXISTING service-role,
 // compare-and-swap Continuity writer must durably freeze the exact fingerprint
// before the policy may consider a signed claim.
export function prepareRecoveryContract({
 obligation,blocker,budget=DEFAULT_RECOVERY_BUDGET
}={}){
 if(!obj(obligation)||!obj(blocker))fail('SIGNED_ORIGINAL_OBSERVATION_REQUIRED');
 checkBudget(budget);
 const fields={owner_id:obligation.owner_id,shift_id:obligation.shift_id,
  obligation_id:obligation.obligation_id,
  continuity_root_id:obligation.continuity_root_id,
  continuity_head_sha256:obligation.continuity_head_sha256,
  source_ref:obligation.source_ref,source_revision:obligation.source_revision,
  blocker_evidence_sha256:blocker.evidence_sha256,
  blocker_class:blocker.classification,blocker_kind:blocker.kind,
  failure_signature:blocker.signature,frozen_scope:blocker.target_scope};
 scope(fields);
 if(blocker.independent_evidence_observed!==true||
  obligation.independent_source_proof_verified!==true)
  fail('INDEPENDENT_BLOCKER_AND_SOURCE_PROOF_REQUIRED');
 const frozen={...fields,version:RECOVERY_CONTRACT_VERSION,
  required_proofs:CASE_REPAIR_PROOFS,budget:Object.freeze({...budget})};
 const digest=hash({...frozen,required_proofs:[...CASE_REPAIR_PROOFS]});
 return Object.freeze({...frozen,contract_id:digest,
  contract_fingerprint:digest,freeze_state:'CANDIDATE_NOT_DURABLE',
  ledger_freeze_verified:false,write_performed:false,
  next_governed_action:'ATOMICALLY_FREEZE_CONTRACT_ON_SAME_CONTINUITY_ROOT'});
}
export function fingerprintRecoveryStrategy(c,s){
 checkContract(c);
 if(!obj(s)||!KEY.test(s.capability_id||'')||
  !KEY.test(s.hypothesis_class||'')||
  !HASH.test(s.target_scope_sha256||'')||
  !HASH.test(s.env_state_hash||'')||!SHA.test(s.source_revision||'')||
  !Number.isSafeInteger(s.proposed_changed_files)||
  s.proposed_changed_files<0||s.proposed_changed_files>MAX.max_changed_files)
  fail('STRATEGY_FINGERPRINT_INPUT_INVALID');
 return hash({blocker_evidence_sha256:c.blocker_evidence_sha256,
  blocker_class:c.blocker_class,blocker_kind:c.blocker_kind,
  failure_signature:c.failure_signature,capability_id:s.capability_id,
  hypothesis_class:s.hypothesis_class,target_scope_sha256:s.target_scope_sha256,
  source_revision:s.source_revision,env_state_hash:s.env_state_hash});
}
function verifiedProofs(c,proofs){
 if(!Array.isArray(proofs)||proofs.length>CASE_REPAIR_PROOFS.length)
  return {error:'RECOVERY_PROOF_SEQUENCE_UNVERIFIED'};
 let prev=null;
 for(let i=0;i<proofs.length;i++){
  const p=proofs[i],gate=CASE_REPAIR_PROOFS[i];
  if(!obj(p)||p.gate!==gate||p.contract_id!==c.contract_id||
   p.obligation_id!==c.obligation_id||
   p.continuity_root_id!==c.continuity_root_id||
   p.source_revision!==c.source_revision||
   !HASH.test(p.receipt_sha256||'')||!HASH.test(p.artifact_sha256||'')||
   !UUID.test(p.origin_worker_run_id||'')||
   !UUID.test(p.verifier_worker_run_id||'')||
   p.verifier_worker_run_id===p.origin_worker_run_id||
   p.source!=='INDEPENDENT_SIGNED_VERIFIER_LEDGER_READBACK'||
   p.independent_verified!==true||p.proof_delta_verified!==true||
   (i===0&&(p.test_reproduces_exact_failure!==true||
     p.frozen_red_test_status!=='FAILED_AS_EXPECTED'))||
   (i===1&&(p.isolated_write_quarantined!==true||
     !Number.isSafeInteger(p.touched_file_count)||
     p.touched_file_count<1||p.touched_file_count>c.budget.max_changed_files||
     !HASH.test(p.isolated_candidate_receipt_sha256||'')))||
   (i===2&&(p.same_frozen_red_artifact_sha256!==proofs[0]?.artifact_sha256||
     p.same_isolated_repair_artifact_sha256!==proofs[1]?.artifact_sha256||
     p.frozen_red_test_passed_after_repair!==true))||
   (i===3&&(p.regression_isolation_verified!==true||
     p.protected_regression_suite_passed!==true))||
   (i===4&&(p.canonical_continuity_return_verified!==true||
     !HASH.test(p.independent_next_action_receipt_sha256||'')))||
   (prev!==null&&p.previous_gate_receipt_sha256!==prev.receipt_sha256))
   return {error:'RECOVERY_INDEPENDENT_PROOF_DELTA_UNVERIFIED',offending_gate:gate};
  prev=p;
 }
 return {verified_count:proofs.length,
  next_proof:CASE_REPAIR_PROOFS[proofs.length]||null};
}
function failedLedger(c,attempts){
 if(!Array.isArray(attempts)||attempts.length>25)return null;
 const seen=new Set();let wall=0,cost=0,changed=0;
 for(const a of attempts){
  if(!obj(a)||a.contract_id!==c.contract_id||
   a.obligation_id!==c.obligation_id||
   !HASH.test(a.strategy_fingerprint||'')||
   !FAILURES.has(a.failure_class)||
   !HASH.test(a.independent_failure_receipt_sha256||'')||
   !UUID.test(a.executor_worker_run_id||'')||
   !UUID.test(a.verifier_worker_run_id||'')||
   a.executor_worker_run_id===a.verifier_worker_run_id||
   a.independent_failure_verified!==true||
   a.source!=='INDEPENDENT_SIGNED_VERIFIER_LEDGER_READBACK'||
   !Number.isSafeInteger(a.wall_seconds)||a.wall_seconds<0||
   !Number.isSafeInteger(a.cost_units)||a.cost_units<0||
   !Number.isSafeInteger(a.changed_files)||a.changed_files<0||
   seen.has(a.strategy_fingerprint))return null;
  seen.add(a.strategy_fingerprint);
  wall+=a.wall_seconds;cost+=a.cost_units;changed+=a.changed_files;
 }
 return {seen,wall,cost,changed};
}
// Decision read model ONLY: the existing signed service-role executor must
// independently recheck the persisted freeze, warrant, budget and source.
export function decideNextRecoveryTransition({
 contract,durableFreeze,budgetLedger,proofReceipts=[],failedAttempts=[],
 strategy,diagnosticWarrant,mutationWarrant,registeredCapabilities=[]
}={}){
 try{checkContract(contract)}catch{
  return safe('RECOVERY_CONTRACT_SOURCE_OR_FINGERPRINT_UNVERIFIED');
 }
 if(!obj(durableFreeze)||
  durableFreeze.status!=='RECOVERY_CONTRACT_ATOMIC_FREEZE_VERIFIED'||
  durableFreeze.contract_id!==contract.contract_id||
  durableFreeze.obligation_id!==contract.obligation_id||
  durableFreeze.continuity_root_id!==contract.continuity_root_id||
  durableFreeze.contract_fingerprint!==contract.contract_fingerprint||
  !HASH.test(durableFreeze.freeze_receipt_sha256||'')||
  durableFreeze.independently_observed!==true)
  return safe('RECOVERY_CONTRACT_NOT_DURABLY_FROZEN',{
   next_governed_action:'FREEZE_RECOVERY_CONTRACT_WITH_ATOMIC_CONTINUITY_SERVICE'});
 const proofs=verifiedProofs(contract,proofReceipts);
 if(proofs.error)return safe(proofs.error,{offending_gate:proofs.offending_gate||null});
 const prior=failedLedger(contract,failedAttempts);
 if(!prior)return safe('RECOVERY_FAILED_STRATEGY_LEDGER_UNVERIFIED');
 // A signed per-obligation budget readback includes ALL prior attempts,
 // including strategies that produced partial proof. Counting only failed
 // attempts would allow repeated successful substeps to exceed the budget.
 if(budgetLedger?.source!=='INDEPENDENT_SIGNED_RECOVERY_BUDGET_LEDGER_READBACK'||
  budgetLedger.independent_verified!==true||
  budgetLedger.contract_id!==contract.contract_id||
  budgetLedger.obligation_id!==contract.obligation_id||
  budgetLedger.continuity_root_id!==contract.continuity_root_id||
  !HASH.test(budgetLedger.receipt_sha256||'')||
  !Number.isSafeInteger(budgetLedger.total_attempts)||
  budgetLedger.total_attempts<failedAttempts.length||
  !Number.isSafeInteger(budgetLedger.spent_wall_seconds)||
  budgetLedger.spent_wall_seconds<prior.wall||
  !Number.isSafeInteger(budgetLedger.spent_cost_units)||
  budgetLedger.spent_cost_units<prior.cost||
  !Number.isSafeInteger(budgetLedger.cumulative_touched_files)||
  budgetLedger.cumulative_touched_files<prior.changed)
  return safe('RECOVERY_BUDGET_LEDGER_UNVERIFIED');
 if(!proofs.next_proof)return safe('RECOVERY_PROOF_CHAIN_INDEPENDENTLY_RECEIPTED',{
  next_governed_action:'RECONCILE_CANONICAL_ORIGINAL_SETTLEMENT_AND_UNIVERSE',
  verified_proof_count:proofs.verified_count,
  independent_receipts_observed:true});
 const fields={contract_id:contract.contract_id,
  obligation_id:contract.obligation_id,
  next_required_proof:proofs.next_proof,
  verified_proof_count:proofs.verified_count,
  failed_strategy_count:failedAttempts.length};
 const stop=(status,next)=>safe(status,{...fields,next_governed_action:next});
 if(budgetLedger.total_attempts>=contract.budget.max_attempts||
  budgetLedger.spent_wall_seconds>=contract.budget.max_wall_seconds||
  budgetLedger.spent_cost_units>=contract.budget.max_cost_units||
  budgetLedger.cumulative_touched_files>=contract.budget.max_changed_files)
  return stop('RECOVERY_BUDGET_EXHAUSTED',
   'PRESERVE_FAILED_STRATEGIES_AND_REQUEST_BOUNDED_REASSESSMENT');
 if(!obj(strategy))return stop('RECOVERY_DIFFERENT_STRATEGY_REQUIRED',
  'CHOOSE_QUALIFIED_STRATEGY_FOR_NEXT_UNSATISFIED_PROOF');
 let fingerprint;
 try{fingerprint=fingerprintRecoveryStrategy(contract,strategy)}catch{
  return stop('RECOVERY_STRATEGY_INPUT_UNVERIFIED',
   'REQUALIFY_STRATEGY_IN_EXISTING_CAPABILITY_REGISTRY');
 }
 if(strategy.source_revision!==contract.source_revision)
  return stop('RECOVERY_SOURCE_EPOCH_CHANGED_REFREEZE_REQUIRED',
   'INDEPENDENTLY_REQUALIFY_SOURCE_AND_FREEZE_NEW_CONTRACT');
 const env=strategy.environment_proof;
 if(!obj(env)||env.source!=='INDEPENDENT_SIGNED_SOURCE_EPOCH_READBACK'||
  env.independent_verified!==true||
  env.source_revision!==strategy.source_revision||
  env.env_state_hash!==strategy.env_state_hash||
  !HASH.test(env.receipt_sha256||''))
  return stop('RECOVERY_ENVIRONMENT_EPOCH_ATTESTATION_REQUIRED',
   'INDEPENDENTLY_ATTEST_SOURCE_AND_ENVIRONMENT_STATE_BEFORE_PIVOT');
 if(prior.seen.has(fingerprint))
  return safe('RECOVERY_IDENTICAL_FAILED_STRATEGY_REJECTED',{
   ...fields,strategy_fingerprint:fingerprint,
   next_governed_action:'PIVOT_TO_DISTINCT_HYPOTHESIS_OR_INDEPENDENTLY_VERIFIED_NEW_SOURCE_EPOCH'});
 if(strategy.proposed_changed_files+budgetLedger.cumulative_touched_files>contract.budget.max_changed_files||
  strategy.estimated_wall_seconds+budgetLedger.spent_wall_seconds>contract.budget.max_wall_seconds||
  strategy.estimated_cost_units+budgetLedger.spent_cost_units>contract.budget.max_cost_units||
  !Number.isSafeInteger(strategy.estimated_wall_seconds)||
  strategy.estimated_wall_seconds<0||
  !Number.isSafeInteger(strategy.estimated_cost_units)||
  strategy.estimated_cost_units<0)
  return stop('RECOVERY_PROPOSED_STRATEGY_EXCEEDS_BUDGET',
   'SELECT_SMALLER_SCOPE_OR_STOP_AT_HARD_BUDGET');
 if(!Array.isArray(registeredCapabilities)||registeredCapabilities.length>32||
   registeredCapabilities.some(x=>!KEY.test(x)))
  return stop('RECOVERY_CAPABILITY_REGISTRY_UNVERIFIED',
   'READ_SIGNED_REGISTERED_CAPABILITY_SET');
 if(!registeredCapabilities.includes(strategy.capability_id))
  return stop('RECOVERY_CAPABILITY_ACQUISITION_REQUIRED',
   'ROUTE_MISSING_CAPABILITY_TO_EXISTING_GOVERNED_ACQUISITION');
 const validWarrant=w=>w?.source==='SIGNED_WARRANT_LEDGER_READBACK'&&
  w.valid===true&&w.obligation_id===contract.obligation_id&&
  w.continuity_root_id===contract.continuity_root_id&&
  w.source_revision===contract.source_revision&&
  HASH.test(w.warrant_receipt_sha256||'');
 if(!validWarrant(diagnosticWarrant))
  return stop('RECOVERY_DIAGNOSTIC_WARRANT_REQUIRED',
   'VERIFY_EXISTING_DIAGNOSTIC_WARRANT_NOT_GENERIC_OWNER_PING');
 if(proofs.next_proof==='REPAIR_ISOLATED'&&
  (!validWarrant(mutationWarrant)||
   mutationWarrant.effect!=='ISOLATED_REPAIR_CANDIDATE_ONLY'))
  return stop('RECOVERY_EXACT_MUTATION_WARRANT_REQUIRED',
   'PREPARE_EXACT_ISOLATED_REPAIR_SCOPE_OWNER_DECISION');
 if(proofs.next_proof==='REPAIR_ISOLATED'&&strategy.proposed_changed_files===0)
  return stop('RECOVERY_REPAIR_SCOPE_HAS_NO_CHANGED_FILES',
   'REQUIRE_BOUNDED_ISOLATED_SOURCE_EDIT_UNDER_EXACT_WARRANT');
 if(proofs.next_proof==='REPAIR_ISOLATED'&&
   strategy.isolated_sandbox_verified!==true)
  return stop('RECOVERY_SANDBOX_QUARANTINE_REQUIRED',
   'VERIFY_CLEAN_ISOLATED_WORKTREE_BEFORE_MUTATION');
 return safe('RECOVERY_SIGNED_CAPABILITY_CLAIM_ELIGIBLE_NOT_DISPATCHED',{
  ...fields,strategy_fingerprint:fingerprint,
  next_governed_action:'CLAIM_AND_EXECUTE_REGISTERED_CAPABILITY_UNDER_SAME_WARRANT',
  requires_distinct_independent_verifier:true,
  claim_created:false,strategy_selected_not_executed:true});
}
// Source-backed proposal attached to the SAME signed worker readback.
// This NEVER asserts that a durable contract, RED proof or repair exists.
export function projectRecoveryContractFromFinalLoop({
 graph,continuityReturn,stagedRoutes,ownerPackets
}={}){
 const unavailable=status=>safe(status,{contract_candidate:null});
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  continuityReturn?.status!=='FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'||
  continuityReturn.owner_id!==graph.owner_id||
  continuityReturn.shift_id!==graph.shift_id||
  continuityReturn.shared_continuity_guard?.status!==
    'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
  !Array.isArray(continuityReturn.shared_continuity_guard.handoffs)||
  !Array.isArray(graph.jobs)||
  stagedRoutes?.status!=='FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED'||
  !Array.isArray(stagedRoutes.routes)||
  ownerPackets?.status!=='FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY'||
  ownerPackets.owner_id!==graph.owner_id||
  ownerPackets.shift_id!==graph.shift_id||
  !Array.isArray(ownerPackets.packets))
  return unavailable('RECOVERY_CANONICAL_READBACKS_NOT_RECONCILED');
 const candidates=[];
 for(const h of continuityReturn.shared_continuity_guard.handoffs){
  if(!h.unresolved_proof_gates?.includes('CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED')||
   h.continuity_identity_verified!==true||
   h.qualifier_digest_verified!==true||
   !HASH.test(h.qualifier_receipt_sha256||''))continue;
  const matches=graph.jobs.filter(j=>j.original_work_id===h.original_work_id&&
   j.source_ref===h.source_ref&&j.independent_source_proof_verified===true);
  const routes=stagedRoutes.routes.filter(r=>r.parent_original_work_id===h.original_work_id&&
   r.source_ref===h.source_ref);
  if(matches.length!==1||routes.length!==1||
   !SHA.test(routes[0].source_head_sha||''))
   return unavailable('RECOVERY_SOURCE_OR_PARENT_IDENTITY_AMBIGUOUS');
  const approval=ownerPackets.packets.find(p=>p.source_ref===h.source_ref&&
   p.parent_original_work_id===h.original_work_id&&p.approved===true);
  let c;
  try{c=prepareRecoveryContract({obligation:{
   owner_id:graph.owner_id,shift_id:graph.shift_id,
   obligation_id:h.original_work_id,source_ref:h.source_ref,
   source_revision:routes[0].source_head_sha,
   continuity_root_id:continuityReturn.shared_continuity_guard.continuity_root_id,
   continuity_head_sha256:continuityReturn.continuity_head_sha256,
   independent_source_proof_verified:true
  },blocker:{classification:'EVIDENCE',kind:'CASE_SPECIFIC_FROZEN_RED_MISSING',
   signature:'MISSING_INDEPENDENT_FROZEN_TEST',
   evidence_sha256:h.qualifier_receipt_sha256,
   independent_evidence_observed:true,
   target_scope:'ORIGINAL_SOURCE_BOUND_MAINTENANCE'}
  })}catch{return unavailable('RECOVERY_CONTRACT_SOURCE_PROOF_INCOMPLETE')}
  candidates.push(Object.freeze({contract:c,approved_read_only_review:!!approval}));
 }
 if(candidates.length===0)return unavailable('RECOVERY_NO_SOURCE_BOUND_MISSING_RED_PROOF');
 if(candidates.length>1)return unavailable('RECOVERY_MULTIPLE_CONTRACTS_REQUIRE_EXACT_SELECTION');
 return safe('RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE',{
  contract_candidate:candidates[0].contract,
  source_scope_from_independent_continuity:true,
  read_only_review_approved:candidates[0].approved_read_only_review,
  next_governed_action:'ATOMICALLY_FREEZE_CONTRACT_ON_SAME_CONTINUITY_ROOT'});
}