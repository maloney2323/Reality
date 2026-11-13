// Bridge an independently re-read source into the CURRENT signed shift.
// The fresh provider readback is only a qualification. The existing
// service-role RPC owns durable original identity, lease and evidence state.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {verifyCurrentShiftCommitTriageSource}
 from './reality-shift-commit-triage-source-v1.js';
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('SHIFT_COMMIT_TRIAGE_HANDOFF_'+x)};
const empty=Object.freeze({
 status:'NO_SHIFT_COMMIT_TRIAGE_ORIGINAL_ADMITTED',
 original_job_admitted:false,original_job_completed:false,
 installation_authorized:false,production_changed:false
});
export async function admitVerifiedCurrentShiftCommitTriage({
 graph,db,fetchImpl=fetch,token=null,callRpc=shiftRpc,
 verifySource=verifyCurrentShiftCommitTriageSource
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    typeof callRpc!=='function'||typeof verifySource!=='function'||!db)
  fail('TRUSTED_SHIFT_AND_ADAPTER_REQUIRED');
 const qualification=await verifySource({graph,fetchImpl,token});
 if(qualification?.status==='NO_INDEPENDENTLY_VERIFIED_COMMIT_TRIAGE_SOURCE')
  return Object.freeze({qualification,original:empty});
 if(qualification?.status!=='INDEPENDENT_COMMIT_REFERENCE_TRIAGE_SOURCE_VERIFIED'||
    qualification.shift_id!==graph.shift_id||
    qualification.owner_id!==graph.owner_id||
    qualification.plan_fingerprint!==graph.plan_fingerprint||
    qualification.independent_provider_readback_verified!==true||
    qualification.original_job_admitted!==false||
    qualification.original_job_completed!==false||
    qualification.installation_authorized!==false||
    qualification.production_changed!==false)
  fail('INDEPENDENT_SOURCE_AND_OWNER_IDENTITY_CHANGED');
 const ticket=await callRpc(db,'reality_admit_verified_shift_commit_triage_v1',{
  p_source_ref:qualification.source_ref,
  p_source_proof_sha256:qualification.source_proof_sha256,
  p_commit_sha:qualification.commit_sha,
  p_issue_body_sha256:qualification.issue_body_sha256,
  p_commit_content_sha256:qualification.commit_content_sha256
 },{fetchImpl});
 if(ticket?.status==='NO_CURRENT_FROZEN_COMMIT_TRIAGE_SOURCE_TO_ADMIT')
  return Object.freeze({qualification,original:empty});
 if(ticket?.status!=='EXACT_OWNER_SHIFT_COMMIT_TRIAGE_ORIGINAL_ADMITTED'||
    ticket.shift_id!==graph.shift_id||ticket.owner_id!==graph.owner_id||
    ticket.source_ref!==qualification.source_ref||
    ticket.source_proof_sha256!==qualification.source_proof_sha256||
    ticket.commit_sha!==qualification.commit_sha||
    !WORK.test(ticket.original_work_id||'')||
    ticket.original_job_admitted!==true||
    ticket.original_job_completed!==false||
    ticket.installation_authorized!==false||
    ticket.production_changed!==false)
  fail('DURABLE_SOURCE_BOUND_ORIGINAL_ID_UNVERIFIED');
 const evidence=await callRpc(db,'reality_record_verified_shift_commit_triage_v1',{
  p_original_work_id:ticket.original_work_id,
  p_commit_sha:qualification.commit_sha,
  p_issue_body_sha256:qualification.issue_body_sha256,
  p_commit_content_sha256:qualification.commit_content_sha256
 },{fetchImpl});
 if(evidence?.status!=='EXACT_SHIFT_COMMIT_TRIAGE_PROVIDER_EVIDENCE_RECORDED'||
    evidence.shift_id!==graph.shift_id||
    evidence.original_work_id!==ticket.original_work_id||
    evidence.source_ref!==ticket.source_ref||
    evidence.commit_sha!==qualification.commit_sha||
    evidence.phase!=='EVIDENCE_VERIFIED'||
    evidence.independent_provider_readback_verified!==true||
    evidence.original_job_completed!==false||
    evidence.installation_authorized!==false||
    evidence.production_changed!==false)
  fail('DURABLE_PROVIDER_EVIDENCE_READBACK_UNVERIFIED');
 return Object.freeze({qualification,original:Object.freeze({
  ...evidence,original_job_admitted:true,final_receipt_verified:false
 })});
}
