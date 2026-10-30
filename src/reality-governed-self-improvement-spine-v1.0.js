// Reality Foundational Governed Self-Improvement Spine v1.0
//
// One model-independent control plane over cognition, discovery, synthesis,
// verification, authorization, registration, original-work resumption and
// settlement. Underlying models may propose candidates; no model assertion
// can create an observation, user approval, provider action or business result.
//
// This is a PURE state transition engine. Trusted adapters must independently
// reobserve actual provider state and durably save/read back checkpoints.
// A candidate passing tests is never a registered or installed capability.
import {createHash} from 'node:crypto';
import {detectCapabilityGap,confirmCapabilityGap}
 from './reality-autonomous-capability-loop-v1.0.js';
import {buildRealitySelfQuestionAgenda}
 from './reality-self-question-engine-v1.0.js';

export const GOVERNED_SELF_IMPROVEMENT_VERSION='reality-governed-self-improvement-spine-v1.0';
export const SELF_IMPROVEMENT_STAGES=Object.freeze([
 'DISCOVERING','GAP_CONFIRMED','CANDIDATE_READY','REPAIR_REQUIRED',
 'SANDBOX_VERIFIED','AWAITING_OWNER_APPROVAL','PROMOTION_AUTHORIZED',
 'CAPABILITY_REGISTERED','ORIGINAL_JOB_RESUMED','SETTLED','ESCALATED'
]);
export const SELF_IMPROVEMENT_INVARIANTS=Object.freeze({
 originalGoalAndWorkImmutable:true,
 modelProposalCannotBecomeEvidence:true,
 modelCandidateCannotGrantAuthority:true,
 independentProviderReadbackRequired:true,
 sandboxIsNotInstallation:true,
 noAutomaticGovernanceOrIdentityMutation:true,
 boundedEvidenceLedRetry:true,
 ownerPromotionApprovalRequired:true,
 oneTimeRegistrationEvidenceRequired:true,
 continuationRequiresActualRegistryReadback:true,
 settlementRequiresActualDurableReceipt:true,
 productionWriteNotInThisEngine:true,
});
const STATES=new Set(SELF_IMPROVEMENT_STAGES);
const EVENTS=new Set(['GAP_CONFIRMED','SANDBOX_FAILED','SANDBOX_VERIFIED',
 'PROMOTION_AUTHORIZED','CAPABILITY_REGISTERED','ORIGINAL_JOB_RESUMED',
 'ORIGINAL_JOB_SETTLED']);
const sha=value=>createHash('sha256').update(value).digest('hex');
const stable=value=>value===null||typeof value!=='object'?value:
 Array.isArray(value)?value.map(stable):
 Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
const hash=value=>sha(JSON.stringify(stable(value)));
const str=value=>typeof value==='string'?value.trim():'';
const enforce=(ok,code)=>{if(!ok)throw Error(code)};
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const freeze=obj=>{
 if(obj&&typeof obj==='object'&&!Object.isFrozen(obj)){
  Object.values(obj).forEach(freeze);Object.freeze(obj);
 }
 return obj;
};
const copy=x=>structuredClone(x);
const refs=values=>Array.isArray(values)?
 [...new Set(values.filter(x=>typeof x==='string'&&x.length>3&&x.length<=400))]:[];
const absent=()=>({action:'NO_ACTION',model_may_generate:false,
 external_effect_authorized:false,original_job_completed:false});
const SCOPE_FIELDS=['owner_id','goal_id','original_work_id','continuity_root_id','worldline_id'];
function validScope(s){
 return s&&SCOPE_FIELDS.every(k=>str(s[k]))&&
  str(s.goal_transition_receipt_ref)&&str(s.goal_evidence_ref)&&
  str(s.target_environment)==='ISOLATED_PREVIEW'&&
  str(s.governance_kernel_hash);
}
function requireSameScope(scope,received){
 enforce(received&&SCOPE_FIELDS.every(k=>received[k]===scope[k]),
  'SELF_IMPROVEMENT_ORIGINAL_SCOPE_CHANGED');
 enforce(!own(received,'target_environment')||
  received.target_environment===scope.target_environment,
  'SELF_IMPROVEMENT_TARGET_ENVIRONMENT_CHANGED');
}
function journalEvent(previous,{kind,body,evidence}){
 const index=previous.journal.length;
 const before=previous.head_hash;
 const item={
  index,kind,prior_hash:before,
  body:copy(body),
  evidence_ref:evidence?.evidence_ref||null,
  evidence_hash:evidence?.evidence_hash||null,
 };
 const event_hash=hash({scope_hash:previous.scope_hash,...item});
 return freeze({...item,event_hash});
}
function append(s,{phase,kind,body,evidence=null,patch={}}){
 const j=journalEvent(s,{kind,body,evidence});
 return freeze({...s,...patch,phase,journal:[...s.journal,j],head_hash:j.event_hash});
}
export function verifySelfImprovementJournal(state){
 if(!state||!validScope(state.scope)||state.version!==GOVERNED_SELF_IMPROVEMENT_VERSION||
    state.scope_hash!==hash(state.scope)||!STATES.has(state.phase)||
    !Number.isInteger(state.attempt_count)||state.attempt_count<0||
    !Number.isInteger(state.attempt_limit)||state.attempt_limit<1||
    state.attempt_count>state.attempt_limit||!Array.isArray(state.journal))
  throw Error('SELF_IMPROVEMENT_CHECKPOINT_INVALID');
 let prior=hash({version:state.version,scope_hash:state.scope_hash});
 for(let i=0;i<state.journal.length;i++){
  const e=state.journal[i];
  const {event_hash,...data}=e;
  if(e.index!==i||e.prior_hash!==prior||event_hash!==hash({scope_hash:state.scope_hash,...data}))
   throw Error('SELF_IMPROVEMENT_JOURNAL_TAMPERED');
  prior=event_hash;
 }
 if(prior!==state.head_hash)throw Error('SELF_IMPROVEMENT_CHECKPOINT_HASH_MISMATCH');
 // The journal is the single constitutional source of truth. A caller may
 // not relabel a legitimate GAP_CONFIRMED or SANDBOX_VERIFIED checkpoint
 // as SETTLED while leaving its hash chain intact. Every phase must be
 // justified by its final authenticated event, never by a status flag.
 const last=state.journal.at(-1)?.kind||null;
 const phases={
  DISCOVERING:[null],
  GAP_CONFIRMED:['GAP_CONFIRMED'],
  CANDIDATE_READY:['MODEL_CANDIDATE_PROPOSED'],
  REPAIR_REQUIRED:['SANDBOX_FAILED','RECOVERY_STARTED'],
  ESCALATED:['SANDBOX_FAILED'],
  AWAITING_OWNER_APPROVAL:['SANDBOX_VERIFIED'],
  PROMOTION_AUTHORIZED:['PROMOTION_AUTHORIZED'],
  CAPABILITY_REGISTERED:['CAPABILITY_REGISTERED'],
  ORIGINAL_JOB_RESUMED:['ORIGINAL_JOB_RESUMED'],
  SETTLED:['ORIGINAL_JOB_SETTLED'],
 };
 const recoveryEvents=state.journal.filter(e=>e.kind==='RECOVERY_STARTED');
 // The second recovery cannot rewrite or replace the first reservation.
 // It adds only two more model attempts and retains all failed receipts.
 if(recoveryEvents.length>3||
    (recoveryEvents.length>0&&(
      ![5,7,8].includes(state.attempt_limit)||
      state.recovery_authorization?.verified!==true||
      recoveryEvents[0].body?.prior_attempt_limit!==3||
      recoveryEvents[0].body?.prior_checkpoint_hash!==recoveryEvents[0].prior_hash||
      recoveryEvents[0].body?.original_work_id!==state.scope.original_work_id||
      recoveryEvents[0].body?.reservation_id!==state.recovery_authorization?.reservation_id||
      recoveryEvents[0].body?.failed_checkpoint_receipt_id!==state.recovery_authorization?.checkpoint_receipt_id))||
    (recoveryEvents.length===0&&state.recovery_authorization!=null)||
    (recoveryEvents.length===1&&
      (state.attempt_limit!==5||state.recovery_continuation_authorization!=null))||
    (recoveryEvents.length>=2&&(
      (recoveryEvents.length===2&&state.attempt_limit!==7)||
      (recoveryEvents.length===3&&state.attempt_limit!==8)||
      state.recovery_continuation_authorization?.verified!==true||
      recoveryEvents[1].body?.prior_attempt_limit!==5||
      recoveryEvents[1].body?.prior_checkpoint_hash!==recoveryEvents[1].prior_hash||
      recoveryEvents[1].body?.original_work_id!==state.scope.original_work_id||
      recoveryEvents[1].body?.reservation_id!==
        state.recovery_continuation_authorization?.reservation_id||
      recoveryEvents[1].body?.failed_checkpoint_receipt_id!==
        state.recovery_continuation_authorization?.checkpoint_receipt_id))||
    (recoveryEvents.length===3&&(
      state.recovery_final_authorization?.verified!==true||
      recoveryEvents[2].body?.prior_attempt_limit!==7||
      recoveryEvents[2].body?.prior_checkpoint_hash!==recoveryEvents[2].prior_hash||
      recoveryEvents[2].body?.original_work_id!==state.scope.original_work_id||
      recoveryEvents[2].body?.additional_attempts!==1||
      recoveryEvents[2].body?.reservation_id!==state.recovery_final_authorization?.reservation_id||
      recoveryEvents[2].body?.failed_checkpoint_receipt_id!==state.recovery_final_authorization?.checkpoint_receipt_id))||
    (recoveryEvents.length<3&&state.recovery_final_authorization!=null)||
    (recoveryEvents.length===0&&state.recovery_continuation_authorization!=null))
  throw Error('SELF_IMPROVEMENT_RECOVERY_JOURNAL_INVALID');
 if(!phases[state.phase]?.includes(last)||
    state.attempt_count!==state.journal.filter(
     e=>e.kind==='MODEL_CANDIDATE_PROPOSED').length)
  throw Error('SELF_IMPROVEMENT_JOURNAL_PHASE_INVARIANT_VIOLATED');
 return true;
}
export function createGovernedSelfImprovement({scope,attemptLimit=3}={}){
 enforce(validScope(scope),'SELF_IMPROVEMENT_VERIFIED_GOAL_SCOPE_REQUIRED');
 enforce(Number.isInteger(attemptLimit)&&attemptLimit>=1&&attemptLimit<=5,
  'SELF_IMPROVEMENT_FINITE_ATTEMPT_BUDGET_REQUIRED');
 const s=copy(scope);
 const scope_hash=hash(s);
 const state=freeze({
  version:GOVERNED_SELF_IMPROVEMENT_VERSION,scope:s,scope_hash,
  phase:'DISCOVERING',attempt_count:0,attempt_limit:attemptLimit,
  candidate:null,confirmed_gap:null,sandbox_receipt:null,
  independent_failure:null,promotion_authorization:null,
  registration:null,resumption:null,settlement:null,recovery_authorization:null,
  recovery_continuation_authorization:null,recovery_final_authorization:null,
  journal:[],head_hash:hash({version:GOVERNED_SELF_IMPROVEMENT_VERSION,scope_hash}),
 });
 verifySelfImprovementJournal(state);
 return state;
}
const PROTECTED_PATH=/(^|\/)(?:reality-governed-self-improvement|reality-constitution|reality-private-chat-auth|reality-goal-authority|reality-single-use-execution-reservation|reality-constitutional-learning|reality-cognition-execution-bridge)(?:[^/]*)(?:\.js|\.mjs)$/i;
const NORMAL_UPGRADE_PATH=/^(?:src\/reality-extensions\/|test\/reality-extensions\/|docs\/)[a-zA-Z0-9._\/-]+$/;
// Normal model-generated candidate source cannot directly touch public API,
// owner authentication, policy/constitution, database adapters or framework
// files. Cross-boundary rewrites require a distinct human governance release.

function validateCandidate(candidate){
 enforce(candidate&&typeof candidate==='object'&&
  Array.isArray(candidate.files)&&candidate.files.length>0&&
  candidate.files.length<=12,'SELF_IMPROVEMENT_MODEL_CANDIDATE_REQUIRED');
 const paths=new Set();
 for(const f of candidate.files){
  enforce(typeof f?.path==='string'&&
   /^(?:src|api|test|docs)\/[a-zA-Z0-9._\/-]{1,200}$/.test(f.path)&&
   !f.path.split('/').includes('..')&&!paths.has(f.path),
   'SELF_IMPROVEMENT_CANDIDATE_PATH_INVALID');
  enforce(!PROTECTED_PATH.test(f.path),'SELF_IMPROVEMENT_CONSTITUTIONAL_KERNEL_IMMUTABLE');
  enforce(NORMAL_UPGRADE_PATH.test(f.path),'SELF_IMPROVEMENT_NON_EXTENSION_CHANGE_REQUIRES_SEPARATE_GOVERNANCE_RELEASE');
  enforce(typeof f.content==='string'&&f.content.length>0&&f.content.length<=100000,
   'SELF_IMPROVEMENT_CANDIDATE_CONTENT_INVALID');
  paths.add(f.path);
 }
 enforce(str(candidate.rationale)&&str(candidate.verification_plan_ref),
  'SELF_IMPROVEMENT_CANDIDATE_VERIFICATION_PLAN_REQUIRED');
 return freeze({
  artifact_hash:hash(candidate.files.map(f=>({path:f.path,content:f.content}))),
  files:copy(candidate.files),rationale:candidate.rationale,
  verification_plan_ref:candidate.verification_plan_ref,
  model_response_ref:str(candidate.model_response_ref)||null,
  generated_by_model:true,verified:false,authorized:false,installed:false,
 });
}
// A second, finite recovery round is permitted only by an independently
// verified single-use reservation for the SAME exhausted original job.
// The original 3 failed attempts and hashes remain immutable in the journal.
export function recoverGovernedEscalation(state,proof){
 verifySelfImprovementJournal(state);
 enforce(state.phase==='ESCALATED'&&
  ((state.attempt_count===3&&state.attempt_limit===3&&
    state.recovery_authorization==null)||
   (state.attempt_count===5&&state.attempt_limit===5&&
    state.recovery_authorization?.verified===true&&
    state.recovery_continuation_authorization==null)||
   (state.attempt_count===7&&state.attempt_limit===7&&
    state.recovery_continuation_authorization?.verified===true&&
    state.recovery_final_authorization==null))&&
  state.journal.at(-1)?.kind==='SANDBOX_FAILED'&&
  state.independent_failure?.classification?.retry_source_without_dependency===true&&
  state.independent_failure?.attempt===state.attempt_count,
  'SELF_IMPROVEMENT_EXACT_REPAIRABLE_EXHAUSTION_REQUIRED');
 enforce(proof?.verified===true&&proof?.independent_provider_readback===true&&
  proof?.owner_id===state.scope.owner_id&&
  proof?.original_work_id===state.scope.original_work_id&&
  proof?.goal_id===state.scope.goal_id&&
  proof?.checkpoint_hash===state.head_hash&&
  typeof proof?.reservation_id==='string'&&proof.reservation_id.length>=16&&
  typeof proof?.checkpoint_receipt_id==='string'&&
  proof.checkpoint_receipt_id.length>=16&&
  proof?.failure_evidence_ref===state.independent_failure.evidence_ref&&
  proof?.installation_authorized===false,
  'SELF_IMPROVEMENT_GOVERNED_RECOVERY_RESERVATION_REQUIRED');
 const authorization=freeze({verified:true,reservation_id:proof.reservation_id,
  checkpoint_receipt_id:proof.checkpoint_receipt_id,
  checkpoint_hash:proof.checkpoint_hash,
  failure_evidence_ref:proof.failure_evidence_ref});
 const priorLimit=state.attempt_limit;
 const patch=priorLimit===3?
  {attempt_limit:5,recovery_authorization:authorization}:
  priorLimit===5?{attempt_limit:7,recovery_continuation_authorization:authorization}:
  {attempt_limit:8,recovery_final_authorization:authorization};
 return append(state,{phase:'REPAIR_REQUIRED',kind:'RECOVERY_STARTED',
  body:{original_work_id:state.scope.original_work_id,
   prior_checkpoint_hash:state.head_hash,prior_attempt_limit:priorLimit,
   failed_checkpoint_receipt_id:proof.checkpoint_receipt_id,
   failure_evidence_ref:proof.failure_evidence_ref,
   reservation_id:proof.reservation_id,additional_attempts:priorLimit===7?1:2},
  patch});
}
export function proposeGovernedCandidate(state,candidate){
 verifySelfImprovementJournal(state);
 enforce(['GAP_CONFIRMED','REPAIR_REQUIRED'].includes(state.phase),
  'SELF_IMPROVEMENT_GAP_OR_REPAIR_REQUIRED');
 enforce(state.attempt_count<state.attempt_limit,
  'SELF_IMPROVEMENT_ATTEMPT_BUDGET_EXHAUSTED');
 const proposal=validateCandidate(candidate);
 return append(state,{phase:'CANDIDATE_READY',kind:'MODEL_CANDIDATE_PROPOSED',
  body:{artifact_hash:proposal.artifact_hash,attempt:state.attempt_count+1,
   original_work_id:state.scope.original_work_id,
   correction_basis:state.independent_failure?.evidence_ref||null},
  patch:{attempt_count:state.attempt_count+1,candidate:proposal,
   sandbox_receipt:null,promotion_authorization:null}});
}
export function classifyIndependentFailure({output='',code='',missingDependency=null}={}){
 const fragment=String(output||'').slice(0,8000);
 const normalized=str(code).toUpperCase();
 // Independent typed provider codes are authority. Strings inside
 // model stdout or a failing test's expected/actual values are NOT.
 if(str(missingDependency)||normalized==='MISSING_CAPABILITY')
  return freeze({class:'MISSING_CAPABILITY',next:'DISCOVER_DEPENDENCY',retry_source_without_dependency:false});
 if(normalized==='AUTHORITY'||(!normalized&&
    /^(?:OWNER_APPROVAL_REQUIRED|AUTHORITY_REQUIRED|RESERVATION_REQUIRED|OWNER_SIGN_IN|PERMISSION_DENIED|FORBIDDEN)$/.test(fragment.trim())))
  return freeze({class:'AUTHORITY_REQUIRED',next:'REQUEST_OWNER_AUTHORITY',retry_source_without_dependency:false});
 if(normalized==='TEST_FAILED'||normalized==='REGRESSION'||normalized==='SYNTAX'){
  if(/SyntaxError|Unexpected token|ERR_MODULE_NOT_FOUND|Cannot find module|ReferenceError/.test(fragment))
   return freeze({class:'SYNTAX_OR_IMPORT',next:'REPAIR_CODE_FROM_TEST_FAILURE',retry_source_without_dependency:true});
  return freeze({class:'REGRESSION',next:'REPAIR_CODE_FROM_TEST_FAILURE',retry_source_without_dependency:true});
 }
 if(/SyntaxError|Unexpected token|ERR_MODULE_NOT_FOUND|Cannot find module|ReferenceError/.test(fragment))
  return freeze({class:'SYNTAX_OR_IMPORT',next:'REPAIR_CODE_FROM_TEST_FAILURE',retry_source_without_dependency:true});
 if(/not ok\s+\d+|AssertionError|ERR_ASSERTION|FAIL|TEST_FAILED/.test(fragment))
  return freeze({class:'REGRESSION',next:'REPAIR_CODE_FROM_TEST_FAILURE',retry_source_without_dependency:true});
 if(normalized==='MISSING_DEPENDENCY')
  return freeze({class:'MISSING_CAPABILITY',next:'DISCOVER_DEPENDENCY',retry_source_without_dependency:false});
 if(/TIMEOUT|RATE_LIMIT|ECONNRESET|NETWORK_UNAVAILABLE/.test(fragment)||normalized==='INFRA')
  return freeze({class:'VERIFIER_INFRASTRUCTURE',next:'REOBSERVE_PROVIDER',retry_source_without_dependency:false});
 return freeze({class:'UNRESOLVED',next:'ESCALATE_WITH_EVIDENCE',retry_source_without_dependency:false});
}
// Independent attestation occurs in the TRUSTED DRIVER, not the model.
// The driver must re-read the provider, observe the exact artifact/version,
// and return a source-bound attestation that model input cannot supply.
export async function acceptGovernedObservation(state,receipt,{verifyProvider}={}){
 verifySelfImprovementJournal(state);
 enforce(receipt&&EVENTS.has(receipt.kind),'SELF_IMPROVEMENT_RECEIPT_TYPE_INVALID');
 enforce(typeof verifyProvider==='function','SELF_IMPROVEMENT_INDEPENDENT_VERIFIER_REQUIRED');
 requireSameScope(state.scope,receipt);
 enforce(str(receipt.evidence_ref)&&str(receipt.evidence_hash),
  'SELF_IMPROVEMENT_EVIDENCE_REFERENCE_REQUIRED');
 const verified=await verifyProvider(freeze(copy({
  scope:state.scope,scope_hash:state.scope_hash,phase:state.phase,
  candidate_hash:state.candidate?.artifact_hash||null,
  attempt:state.attempt_count,receipt:copy(receipt),
 })));
 enforce(verified&&verified.verified===true&&
  verified.independent_provider_readback===true&&
  verified.evidence_ref===receipt.evidence_ref&&
  verified.evidence_hash===receipt.evidence_hash&&
  verified.original_work_id===state.scope.original_work_id&&
  verified.scope_hash===state.scope_hash,
  'SELF_IMPROVEMENT_INDEPENDENT_PROVIDER_READBACK_FAILED');
 if(own(receipt,'artifact_hash')){
  enforce(receipt.artifact_hash===state.candidate?.artifact_hash,
   'SELF_IMPROVEMENT_CANDIDATE_BYTES_CHANGED');
 }
 const event={...copy(receipt),verified_by:'TRUSTED_PROVIDER_ADAPTER',
  trusted_attestation_ref:str(verified.attestation_ref)};
 enforce(event.trusted_attestation_ref,'SELF_IMPROVEMENT_ATTESTATION_REF_REQUIRED');
 const common={kind:receipt.kind,body:event,evidence:receipt};
 switch(receipt.kind){
  case 'GAP_CONFIRMED':{
   enforce(state.phase==='DISCOVERING'&&str(receipt.capability_id)&&
    Array.isArray(receipt.failure_refs)&&receipt.failure_refs.length>0,
    'SELF_IMPROVEMENT_CONFIRMED_GAP_EVIDENCE_REQUIRED');
   const gap=detectCapabilityGap({
    consequence:{gap:'MISSING_CAPABILITY',subject:receipt.capability_id},
    workItem:{id:state.scope.original_work_id,
     continuity_root_id:state.scope.continuity_root_id,
     worldline_id:state.scope.worldline_id},
   });
   const confirmed=confirmCapabilityGap(gap,{
    historicalFailureRefs:receipt.failure_refs,
    verificationSuiteRef:receipt.verification_suite_ref,
   });
   return append(state,{...common,phase:'GAP_CONFIRMED',
    patch:{confirmed_gap:confirmed}});
  }
  case 'SANDBOX_FAILED':{
   enforce(state.phase==='CANDIDATE_READY'&&
    receipt.artifact_hash===state.candidate.artifact_hash,
    'SELF_IMPROVEMENT_FAILED_CANDIDATE_IDENTITY_REQUIRED');
   const classification=classifyIndependentFailure(receipt.diagnostics||{});
   const needsExternal=classification.retry_source_without_dependency!==true;
   const exhaust=state.attempt_count>=state.attempt_limit;
   const phase=needsExternal||exhaust?'ESCALATED':'REPAIR_REQUIRED';
   return append(state,{...common,phase,patch:{
    independent_failure:freeze({
     evidence_ref:receipt.evidence_ref,diagnostics:copy(receipt.diagnostics||{}),
     classification,attempt:state.attempt_count,
     feedback_hash:hash(receipt.diagnostics||{}),
    }),
   }});
  }
  case 'SANDBOX_VERIFIED':
   enforce(state.phase==='CANDIDATE_READY'&&
    receipt.artifact_hash===state.candidate.artifact_hash&&
    receipt.independent_tests_passed===true&&
    receipt.frozen_regression_passed===true&&
    receipt.governance_preserved===true&&
    str(receipt.verifier_run_ref),
    'SELF_IMPROVEMENT_SANDBOX_VERIFICATION_INCOMPLETE');
   return append(state,{...common,phase:'AWAITING_OWNER_APPROVAL',patch:{
    sandbox_receipt:freeze(copy(receipt)),
   }});
  case 'PROMOTION_AUTHORIZED':
   enforce(state.phase==='AWAITING_OWNER_APPROVAL'&&
    receipt.artifact_hash===state.candidate.artifact_hash&&
    receipt.owner_id===state.scope.owner_id&&
    receipt.approval_origin==='AUTHENTICATED_OWNER_EXPLICIT_ACTION'&&
    receipt.consumed_once===true&&str(receipt.reservation_ref),
    'SELF_IMPROVEMENT_EXACT_OWNER_PROMOTION_NOT_AUTHORIZED');
   return append(state,{...common,phase:'PROMOTION_AUTHORIZED',patch:{
    promotion_authorization:freeze(copy(receipt)),
   }});
  case 'CAPABILITY_REGISTERED':
   enforce(state.phase==='PROMOTION_AUTHORIZED'&&
    receipt.artifact_hash===state.candidate.artifact_hash&&
    receipt.authorization_ref===state.promotion_authorization.evidence_ref&&
    receipt.status==='ACTIVE'&&str(receipt.registry_receipt_ref)&&
    receipt.target_worldline_id===state.scope.worldline_id,
    'SELF_IMPROVEMENT_LIVE_REGISTRATION_READBACK_REQUIRED');
   return append(state,{...common,phase:'CAPABILITY_REGISTERED',patch:{
    registration:freeze(copy(receipt)),
   }});
  case 'ORIGINAL_JOB_RESUMED':
   enforce(state.phase==='CAPABILITY_REGISTERED'&&
    receipt.registration_ref===state.registration.registry_receipt_ref&&
    receipt.original_work_id===state.scope.original_work_id&&
    receipt.real_execution_observed===true&&str(receipt.executor_run_ref),
    'SELF_IMPROVEMENT_ACTUAL_ORIGINAL_WORK_RESUMPTION_REQUIRED');
   return append(state,{...common,phase:'ORIGINAL_JOB_RESUMED',patch:{
    resumption:freeze(copy(receipt)),
   }});
  case 'ORIGINAL_JOB_SETTLED':
   enforce(state.phase==='ORIGINAL_JOB_RESUMED'&&
    receipt.resumption_ref===state.resumption.executor_run_ref&&
    receipt.durable_settlement_readback===true&&
    receipt.independent_outcome_verified===true&&
    receipt.original_work_id===state.scope.original_work_id&&
    str(receipt.settlement_receipt_ref),
    'SELF_IMPROVEMENT_DURABLE_ORIGINAL_JOB_SETTLEMENT_REQUIRED');
   return append(state,{...common,phase:'SETTLED',patch:{
    settlement:freeze(copy(receipt)),
   }});
  default:throw Error('SELF_IMPROVEMENT_UNSUPPORTED_TRANSITION');
 }
}
export function nextGovernedSelfImprovementAction(state){
 verifySelfImprovementJournal(state);
 const blocked={
  DISCOVERING:'OBSERVE_AND_CONFIRM_MISSING_CAPABILITY',
  GAP_CONFIRMED:'GENERATE_MODEL_CANDIDATE',
  CANDIDATE_READY:'RUN_INDEPENDENT_SANDBOX',
  REPAIR_REQUIRED:'MODEL_REPAIR_WITH_FROZEN_FAILURE_FEEDBACK',
  AWAITING_OWNER_APPROVAL:'REQUEST_EXACT_OWNER_PROMOTION',
  PROMOTION_AUTHORIZED:'REGISTER_AND_REOBSERVE_CAPABILITY',
  CAPABILITY_REGISTERED:'RESUME_SAME_ORIGINAL_JOB',
  ORIGINAL_JOB_RESUMED:'VERIFY_AND_SETTLE_ACTUAL_ORIGINAL_OUTCOME',
  SETTLED:'FINISHED_VERIFIED',
  ESCALATED:state.independent_failure?.classification?.next||'ESCALATE_WITH_EVIDENCE',
 };
 const action=blocked[state.phase];
 enforce(action,'SELF_IMPROVEMENT_UNKNOWN_PHASE');
 return freeze({
  action,version:state.version,phase:state.phase,
  original_work_id:state.scope.original_work_id,goal_id:state.scope.goal_id,
  next_model_generation_authorized:['GAP_CONFIRMED','REPAIR_REQUIRED'].includes(state.phase),
  model_may_grant_execution_authority:false,
  external_execution_authorized:false,
  installation_authorized:false,production_mutation_authorized:false,
  original_job_completed:state.phase==='SETTLED',
  remaining_attempts:state.attempt_limit-state.attempt_count,
  feedback:state.phase==='REPAIR_REQUIRED'||state.phase==='ESCALATED'?
   state.independent_failure:null,
  state_hash:state.head_hash,
 });
}
export function readGovernedSelfImprovementOrientation(state,evidence={}){
 verifySelfImprovementJournal(state);
 const agenda=buildRealitySelfQuestionAgenda({
  evidence,phase:'CONVERSATION',limit:25,
 });
 const next=nextGovernedSelfImprovementAction(state);
 return freeze({
  current_goal:{id:state.scope.goal_id,
   user_goal_evidence_ref:state.scope.goal_evidence_ref,
   goal_transition_receipt_ref:state.scope.goal_transition_receipt_ref},
  continuity:{root_id:state.scope.continuity_root_id,
   worldline_id:state.scope.worldline_id,checkpoint_hash:state.head_hash},
  original_work_id:state.scope.original_work_id,
  self_improvement_state:state.phase,next_required_step:next.action,
  questions:agenda.questions.filter(x=>['WORK','CAPABILITY','RELIABILITY','ENGINEERING','GOVERNANCE','VERIFICATION'].includes(x.domain)),
  model_instructions:'Investigate only the evidence-backed next step. Never treat model output as proof, authorization, registry registration or settlement.',
  execution_authorized:false,
 });
}
