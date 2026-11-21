// Connect Reality's existing, signed original work to its EXISTING governed
// execution engine. This connector owns no permissions, model patch execution,
// external effects or production installation. One exact isolated original.
import {executeAuthorizedWork} from './reality-governed-execution-engine-v0.1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const fail=s=>{throw Error('GOVERNED_SELF_REPAIR_'+s)};
export async function continueGovernedOperationalSelfRepair({
 original,warrant,observeFrozenFailure,independentlyTestCandidate,
 loadRepairAdapter,loadOriginalResumeAdapter,independentlyResumeOriginal,settleOriginal,
 execute=executeAuthorizedWork,
}={}){
 const owner=original?.owner_id,work=original?.original_work_id;
 if(!UUID.test(owner||'')||!WORK.test(work||'')||
    original.status!=='ORIGINAL_OWNER_WORK_AUTHORIZED'||
    original.execution_authorized!==true||
    original.nonconsequential!==true||
    original.settled!==false||original.production_changed!==false||
    [observeFrozenFailure,independentlyTestCandidate,loadRepairAdapter,
     loadOriginalResumeAdapter,independentlyResumeOriginal,settleOriginal,execute].some(x=>typeof x!=='function'))
  fail('EXACT_EXISTING_OWNER_ORIGINAL_REQUIRED');
 const checkWarrant=()=>{
  if(warrant?.status!=='OWNER_EXACT_ISOLATED_REPAIR_WARRANT_ACTIVE'||
   warrant.owner_id!==owner||warrant.original_work_id!==work||
   !UUID.test(warrant.warrant_id||'')||
   warrant.owner_approved!==true||warrant.revoked!==false||
   warrant.scope!=='ISOLATED_NONCONSEQUENTIAL_INTERNAL_REPAIR'||
   warrant.installation_authorized!==false||
   warrant.production_changed!==false||
   !Array.isArray(warrant.allowed_steps)||
   !['repair','resume'].every(s=>warrant.allowed_steps.includes(s))||
   !Number.isFinite(Date.parse(warrant.expires_at||''))||
   Date.parse(warrant.expires_at)<=Date.now())
   fail('EXACT_BOUND_ACTIVE_OWNER_WARRANT_REQUIRED');
 };
 checkWarrant();
 const failure=await observeFrozenFailure({owner_id:owner,original_work_id:work});
 if(failure?.status!=='CURRENT_ORIGINAL_FAILURE_REPRODUCED'||
   failure.owner_id!==owner||failure.original_work_id!==work||
   failure.independent!==true||failure.verified!==false||
   failure.frozen_test_failed!==true||
   failure.external_action_performed!==false||
   failure.provider_effect_may_have_occurred!==false||
   !UUID.test(failure.receipt_id||'')||
   !HASH.test(failure.evidence_sha256||''))
  fail('CURRENT_INDEPENDENT_FROZEN_RED_REQUIRED');
 const candidate=await independentlyTestCandidate({
  owner_id:owner,original_work_id:work,
  failure_receipt_id:failure.receipt_id,
  failure_evidence_sha256:failure.evidence_sha256
 });
 if(candidate?.status!=='INDEPENDENT_CANDIDATE_RED_TO_GREEN_VERIFIED'||
   candidate.owner_id!==owner||candidate.original_work_id!==work||
   candidate.failure_receipt_id!==failure.receipt_id||
   candidate.independent!==true||
   candidate.external_action_performed!==false||
   candidate.production_changed!==false||
   !UUID.test(candidate.receipt_id||'')||
   !HASH.test(candidate.candidate_sha256||'')||
   !HASH.test(candidate.candidate_test_sha256||''))
  fail('INDEPENDENT_SCOPED_CANDIDATE_TEST_REQUIRED');
 checkWarrant();
 const repair=await loadRepairAdapter({
  owner_id:owner,original_work_id:work,candidate,warrant
 });
 if(repair?.candidate_sha256!==candidate.candidate_sha256||
   repair.original_work_id!==work||
   repair.workItem?.work_item_id!==work||
   repair.workItem.workflow_id!=='workflow:'+work||
   repair.workItem.connector!==null||
   repair.workItem.consequential!==false||
   repair.workItem.operation!=='isolated_repair'||
   repair.authorization?.authorization_id!==warrant.warrant_id||
   repair.authorization.authorized!==true||
   typeof repair.connector?.execute!=='function'||
   typeof repair.independentVerifier?.verify!=='function')
  fail('REPAIR_ADAPTER_NOT_BOUND_TO_EXISTING_OWNER_WARRANT');
 const outcome=await execute({
  workItem:repair.workItem,workflowId:repair.workItem.workflow_id,
  originalWorkId:work,authorization:repair.authorization,
  connector:repair.connector,independentVerifier:repair.independentVerifier
 });
 if(outcome?.status!=='VERIFIED'||
   outcome.verification?.independent!==true||
   outcome.verification?.verified!==true||
   outcome.outcome?.verified!==true||
   outcome.execution?.execution_state!=='EXECUTED')
  return Object.freeze({
   status:'REPAIR_NOT_INDEPENDENTLY_VERIFIED_NO_ORIGINAL_REPLAY',
   original_work_id:work,original_job_completed:false,
   installation_authorized:false,production_changed:false
  });
 checkWarrant();
 // Resume is not a model-supplied assertion. Invoke the ORIGINAL job through
 // the same governed executor and a separately provided source verifier.
 const originalAdapter=await loadOriginalResumeAdapter({
  owner_id:owner,original_work_id:work,warrant,
  candidate_sha256:candidate.candidate_sha256
 });
 if(originalAdapter?.original_work_id!==work||
   originalAdapter.workItem?.work_item_id!==work||
   originalAdapter.workItem.workflow_id!=='workflow:'+work||
   originalAdapter.workItem.connector!==null||
   originalAdapter.workItem.consequential!==false||
   originalAdapter.workItem.operation!=='read'||
   originalAdapter.authorization?.authorization_id!==warrant.warrant_id||
   originalAdapter.authorization.authorized!==true||
   typeof originalAdapter.connector?.execute!=='function'||
   typeof originalAdapter.independentVerifier?.verify!=='function')
   fail('RESUME_ADAPTER_NOT_ORIGINAL_OWNER_WORK');
 const resumeOutcome=await execute({
  workItem:originalAdapter.workItem,
  workflowId:originalAdapter.workItem.workflow_id,
  originalWorkId:work,authorization:originalAdapter.authorization,
  connector:originalAdapter.connector,
  independentVerifier:originalAdapter.independentVerifier
 });
 if(resumeOutcome?.status!=='VERIFIED'||
  resumeOutcome.verification?.independent!==true||
  resumeOutcome.verification?.verified!==true||
  resumeOutcome.outcome?.verified!==true||
  resumeOutcome.execution?.execution_state!=='EXECUTED')
  return Object.freeze({
   status:'ORIGINAL_JOB_NOT_INDEPENDENTLY_RESUMED',
   original_work_id:work,original_job_completed:false,
   installation_authorized:false,production_changed:false
  });
 const resumed=await independentlyResumeOriginal({
  owner_id:owner,original_work_id:work,warrant,
  candidate_sha256:candidate.candidate_sha256,
  repair_verification:outcome.verification,
  original_execution:resumeOutcome
 });
 if(resumed?.status!=='SAME_ORIGINAL_JOB_INDEPENDENTLY_RESUMED'||
   resumed.owner_id!==owner||resumed.original_work_id!==work||
   resumed.candidate_sha256!==candidate.candidate_sha256||
   resumed.original_execution_authorized!==true||
   resumed.independent!==true||resumed.verified!==true||
   resumed.external_action_performed!==false||
   !UUID.test(resumed.receipt_id||'')||
   !HASH.test(resumed.evidence_sha256||''))
  fail('SAME_ORIGINAL_INDEPENDENT_RESUMPTION_REQUIRED');
 const receipt=await settleOriginal({
  owner_id:owner,original_work_id:work,
  warrant_id:warrant.warrant_id,
  failure_receipt_id:failure.receipt_id,
  candidate_receipt_id:candidate.receipt_id,
  resumed_receipt_id:resumed.receipt_id,
  candidate_sha256:candidate.candidate_sha256,
  production_changed:false
 });
 if(receipt?.status!=='EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED'||
   receipt.owner_id!==owner||receipt.original_work_id!==work||
   receipt.warrant_id!==warrant.warrant_id||
   receipt.failure_receipt_id!==failure.receipt_id||
   receipt.resumed_receipt_id!==resumed.receipt_id||
   receipt.independently_verified!==true||
   receipt.external_action_performed!==false||
   receipt.production_changed!==false||
   !HASH.test(receipt.final_receipt_sha256||''))
  fail('EXISTING_ORIGINAL_FINAL_RECEIPT_REQUIRED');
 return Object.freeze({
  status:'EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED',
  original_work_id:work,owner_id:owner,
  final_receipt_sha256:receipt.final_receipt_sha256,
  original_resumption_receipt_id:resumed.receipt_id,
  independent_final_receipt_verified:true,
  existing_governed_executor_used:true,
  original_job_completed:true,
  original_work_resumed:true,
  isolated_only:true,installation_authorized:false,
  production_changed:false,external_actions_authorized:false
 });
}
