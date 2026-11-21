// Same signed shift: build ONE immutable, source-bound evidence handoff for
// the actual existing PR-review original. Never equate that with a customer
// business original, installation, final receipt, or new authorization.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {isSignedMaintenanceOriginalLineageMissing}
 from './reality-signed-maintenance-original-lineage-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const safe=(status,x={})=>Object.freeze({
 status,...x,original_job_completed:false,original_claim_admitted:false,
 customer_original_verified:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
});
const exact=(r,ownerId,shiftId,workId,sourceRef)=>r&&
 r.status==='SIGNED_ORIGINAL_LINEAGE_EVIDENCE_INDEPENDENTLY_READ'&&
 r.owner_id===ownerId&&r.shift_id===shiftId&&
 r.original_work_id===workId&&r.source_ref===sourceRef&&
 UUID.test(r.packet_id||'')&&UUID.test(r.source_claim_id||'')&&
 UUID.test(r.maintenance_id||'')&&HASH.test(r.evidence_sha256||'')&&
 r.packet_verified===true&&r.customer_original_verified===false&&
 r.original_claim_admitted===false&&
 r.original_job_completed===false&&r.installation_authorized===false&&
 r.production_changed===false&&r.new_shift_started===false;

export async function stageVerifiedSignedOriginalLineagePacket({
 db,env=process.env,gate,shiftId,workerRunId,
 call=shiftRpc,fetchImpl=fetch
}={}){
 if(!isSignedMaintenanceOriginalLineageMissing(gate))
  return safe('SIGNED_ORIGINAL_LINEAGE_NOT_CURRENTLY_MISSING',{
   packet_staged:false,source_reconciled:false});
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
   gate.shift_id!==shiftId||!UUID.test(gate.owner_id||'')||
   !WORK.test(gate.original_work_id||'')||
   typeof call!=='function'||typeof fetchImpl!=='function')
  return safe('SIGNED_ORIGINAL_LINEAGE_TRUSTED_WORKER_REQUIRED',{
   packet_staged:false,source_reconciled:false});
 // Exactly one existing service-role write, idempotently keyed to the
 // actual source claim. Do not retry if the provider response is lost.
 const result=await call(db,'reality_stage_signed_original_lineage_packet_v1',{
  p_shift_id:shiftId,p_original_work_id:gate.original_work_id
 },{fetchImpl});
 if(result?.status==='ORIGINAL_LINEAGE_NOT_ELIGIBLE_FOR_EVIDENCE_ONLY_PACKET'||
    result?.status==='ORIGINAL_LINEAGE_INDEPENDENT_SOURCE_JOIN_NOT_VERIFIED')
  return safe(result.status,{packet_staged:false,source_reconciled:false,
   original_work_id:gate.original_work_id});
 if(result?.status!=='SIGNED_ORIGINAL_LINEAGE_EVIDENCE_PACKET_DURABLE'||
   result.owner_id!==gate.owner_id||result.shift_id!==shiftId||
   result.original_work_id!==gate.original_work_id||
   result.source_ref!==gate.source_ref||
   !UUID.test(result.packet_id||'')||
   !UUID.test(result.source_claim_id||'')||
   !UUID.test(result.maintenance_id||'')||
   !HASH.test(result.evidence_sha256||'')||
   result.source_bound!==true||
   result.customer_original_verified!==false||
   result.original_claim_admitted!==false||
   result.independent_final_receipt_verified!==false||
   result.independent_review_required!==true||
   result.read_only_for_execution!==true||
   result.next_action!=='VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'||
   result.original_job_completed!==false||
   result.installation_authorized!==false||
   result.production_changed!==false||
   result.new_shift_started!==false)
  return safe('SIGNED_ORIGINAL_LINEAGE_STAGE_RECEIPT_UNVERIFIED',{
   packet_staged:false,source_reconciled:false});
 // Separate owner-scoped read; verifies the stored digest and exact
 // owner/shift/source claim against the source, maintenance and warrant DB.
 const read=await call(db,'reality_read_owner_original_lineage_packet_v1',{
  p_owner_id:gate.owner_id
 },{fetchImpl});
 if(!exact(read,gate.owner_id,shiftId,
   gate.original_work_id,gate.source_ref)||
   read.packet_id!==result.packet_id||
   read.source_claim_id!==result.source_claim_id||
   read.maintenance_id!==result.maintenance_id||
   read.evidence_sha256!==result.evidence_sha256)
  return safe('SIGNED_ORIGINAL_LINEAGE_INDEPENDENT_READ_UNVERIFIED',{
   packet_staged:true,source_reconciled:false,
   packet_id:result.packet_id});
 return safe('SIGNED_ORIGINAL_LINEAGE_EVIDENCE_STAGED_INDEPENDENTLY_READ',{
  packet_staged:true,source_reconciled:true,
  original_work_id:gate.original_work_id,source_ref:gate.source_ref,
  source_claim_id:read.source_claim_id,packet_id:read.packet_id,
  evidence_sha256:read.evidence_sha256,
  next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
  missing_evidence:'CANONICAL_CUSTOMER_BUSINESS_ORIGINAL_AND_ACCEPTANCE',
  executor_invoked:false,independent_final_receipt_verified:false,
  independent_review_required:true
 });
}
export function verifyOwnerOriginalLineagePacket(value,ownerId,shiftId){
 if(value?.status==='NO_SIGNED_ORIGINAL_LINEAGE_PACKET'&&
    value.owner_id===ownerId&&value.packet_verified===false&&
    value.original_job_completed===false&&
    value.installation_authorized===false&&
    value.production_changed===false)
  return Object.freeze(value);
 if(!exact(value,ownerId,shiftId,
   value?.original_work_id,value?.source_ref)||
   !WORK.test(value.original_work_id||'')||
   value.next_action!=='VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'||
   value.independent_review_required!==true)
  return null;
 return Object.freeze(value);
}
