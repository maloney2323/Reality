// Reality owner-wide live handoff inventory. GET-only and owner-scoped.
// State comes from the existing signed shift, worker, independent repair,
// employee, original and Continuity/Universe ledgers. No dispatch or approval.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=18;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
const DAY=/^\d{4}-\d\d-\d\dT/;
const okTime=x=>typeof x==='string'&&DAY.test(x)&&Number.isFinite(Date.parse(x));
export function verifyOwnerSignedHandoffHealth(value,ownerId){
 if(value?.status==='NO_CURRENT_SIGNED_MAINTENANCE_SHIFT_HANDOFF'&&
    value.owner_id===ownerId&&value.read_only===true&&
    value.installation_authorized===false&&
    value.original_job_completed===false&&
    value.production_changed===false&&
    Array.isArray(value.handoffs)&&value.handoffs.length===0)
  return Object.freeze(value);
 if(value?.status!=='SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY'||
   value.owner_id!==ownerId||!UUID.test(ownerId||'')||
   !UUID.test(value.shift_id||'')||!okTime(value.checked_at)||
   !['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(value.shift_status)||
   !['SCHEDULED_WORKER_RECENT_WAKE_COMPLETED',
     'SCHEDULED_WORKER_WAKE_STALE_OR_UNVERIFIED'].includes(value.worker_status)||
   !Number.isSafeInteger(value.worker_wake_count)||value.worker_wake_count<0||
   !Number.isSafeInteger(value.employee_independently_verified_evidence_jobs)||
   value.employee_independently_verified_evidence_jobs<0||
   !Number.isSafeInteger(value.employee_evidence_jobs_unsettled)||
   value.employee_evidence_jobs_unsettled<0||
   value.employee_evidence_is_not_customer_completion!==true||
   !Number.isSafeInteger(value.original_claim_count)||value.original_claim_count<0||
   !Number.isSafeInteger(value.original_independent_final_receipt_count)||
   value.original_independent_final_receipt_count<0||
   !Number.isSafeInteger(value.universe_verified_event_rows)||
   value.universe_verified_event_rows<0||
   !Array.isArray(value.maintenance_handoffs)||
   value.maintenance_handoffs.length>8||
   value.maintenance_handoffs.some(x=>
    !REF.test(x?.source_ref||'')||
    !['REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY',
      'REPAIR_INSTALLATION_OR_VERIFICATION_NOT_SETTLED',
      'REPAIR_INDEPENDENT_TARGET_REVIEW_RECORDED_INSTALL_NOT_AUTHORIZED',
      'REPAIR_ARTIFACT_REVIEW_RECORDED_TARGET_NOT_READY',
      'REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION'].includes(x.status)||
    typeof x.next_action!=='string')||
   value.read_only!==true||value.installation_authorized!==false||
   value.production_changed!==false||value.original_job_completed!==false||
   value.new_shift_started!==false||
   value.ceo_operational_decision_handoff!=='NOT_INDEPENDENTLY_ATTESTED_BY_THIS_READ'||
   value.past_present_future_handoff!=='SEPARATE_OWNER_TIME_HORIZON_READ_ONLY')
  return null;
 const scope=value.repair_scope;
 if(scope!==null&&(
  !UUID.test(scope?.handoff_id||'')||!REF.test(scope.source_ref||'')||
  !['PREPARED','APPROVED','SOURCE_RECHECKED'].includes(scope.state)||
  !['AWAITING_EXACT_OWNER_WORK_SCOPE_DECISION',
    'APPROVED_AWAITING_SIGNED_SOURCE_RECHECK',
    'APPROVED_SOURCE_RECHECKED_NEXT_INDEPENDENT_CI'].includes(scope.status)||
  scope.independent_frozen_ci_after_approval_verified!==false||
  scope.work_scope_approved!==(scope.state!=='PREPARED')||
  !['OWNER_APPROVE_EXACT_INVESTIGATION_AND_TESTING',
    'SIGNED_WORKER_RECHECK_CURRENT_APPROVED_SOURCE',
    'EXECUTE_NEW_INDEPENDENT_CASE_SPECIFIC_FROZEN_CI'].includes(scope.next_action)
 ))return null;
 if(value.original_claim_count===0&&
    value.original_work_status!=='CANONICAL_OWNER_BUSINESS_ORIGINAL_NOT_ADMITTED')
  return null;
 if(value.original_independent_final_receipt_count===0&&
    value.original_claim_count===0&&
    value.original_next_action!=='QUALIFY_SOURCE_BACKED_OWNER_BUSINESS_WORK_WITHOUT_WIDENING_WARRANT')
  return null;
 return Object.freeze(value);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'||Object.keys(req.query||{}).length)
  return res.status(405).json({ok:false,status:'HANDOFF_HEALTH_GET_ONLY'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.access_token||!UUID.test(session?.user_id||''))
   return res.status(401).json({ok:false,status:'HANDOFF_HEALTH_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url||db.strictSecrets!==true||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   return res.status(403).json({ok:false,status:'HANDOFF_HEALTH_OWNER_PROJECT_MISMATCH'});
  const raw=await shiftRpc(db,'reality_read_owner_shift_handoff_health_v1',{
   p_owner_id:session.user_id
  },{timeoutMs:12000});
  const v=verifyOwnerSignedHandoffHealth(raw,session.user_id);
  if(!v)return res.status(503).json({ok:false,status:'HANDOFF_HEALTH_INDEPENDENT_LEDGER_READ_UNVERIFIED'});
  return res.status(200).json({ok:true,...v});
 }catch{
  return res.status(503).json({ok:false,status:'HANDOFF_HEALTH_SOURCE_OR_PROVIDER_UNAVAILABLE'});
 }
}
