// Uses Reality's EXISTING signed shift wake, owner evidence ledger and model
// inquiry worker. A standing grant is never a new original-job, shift,
// installation, external communication or production authorization.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {generateOneEmployeeTemporalInquiry}
 from './reality-dynamic-employee-inquiry-worker-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const denied=status=>Object.freeze({
 status,generated_executable_jobs:0,new_original_jobs_created:0,
 installation_authorized:false,external_actions_authorized:false,
 shift_execution_authorized:false,production_changed:false
});
export async function runOneStandingEmployeeDiscovery({
 db,env=process.env,call=shiftRpc,generate=generateOneEmployeeTemporalInquiry,
 fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('STANDING_EMPLOYEE_DISCOVERY_TRUSTED_PREVIEW_REQUIRED');
 const reservation=await call(db,'reality_reserve_next_standing_inquiry_v1',{},{
  fetchImpl
 });
 if(reservation?.status==='NO_ELIGIBLE_GRANTED_STANDING_INQUIRY'&&
  reservation.owner_bound===false&&
  reservation.model_inquiry_authorized===false&&
  reservation.new_original_jobs_created===0&&
  reservation.installation_authorized===false&&
  reservation.production_changed===false)
  return denied('NO_ELIGIBLE_GRANTED_STANDING_INQUIRY');
 if(reservation?.status!=='STANDING_OWNER_EVIDENCE_INQUIRY_RESERVED'||
    reservation.owner_bound!==true||
    !UUID.test(reservation.owner_id||'')||
    reservation.scope!=='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'||
    reservation.model_inquiry_authorized!==true||
    reservation.shift_execution_authorized!==false||
    reservation.external_actions_authorized!==false||
    reservation.installation_authorized!==false||
    reservation.new_original_jobs_created!==0||
    reservation.production_changed!==false)
  throw Error('STANDING_EMPLOYEE_RESERVATION_UNVERIFIED');
 const grant=await call(db,'reality_read_owner_routine_delegation_v1',{
  p_owner_id:reservation.owner_id
 },{fetchImpl});
 if(grant?.status!=='OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY'||
    grant.owner_id!==reservation.owner_id||
    grant.owner_scope_verified!==true||
    grant.read_only!==true||
    grant.currently_active!==true||
    grant.scope!=='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'||
    grant.external_actions_authorized!==false||
    grant.installation_authorized!==false||
    grant.shift_execution_authorized!==false)
  return denied('STANDING_GRANT_REVOKED_OR_EXPIRED_NO_MODEL_CALL');
 const outcome=await generate({
  ownerId:reservation.owner_id,db,env,fetchImpl,callRpc:call
 });
 if(!outcome||outcome.execution_authorized!==false||
   outcome.installation_authorized!==false||
   outcome.new_original_jobs_created!==0||
   outcome.production_changed!==false)
  throw Error('STANDING_INQUIRY_OUTCOME_ESCAPED_EVIDENCE_SCOPE');
 return Object.freeze({
  ...outcome,delegation_scope:reservation.scope,
  standing_grant_verified:true,
  standing_grant_was_not_an_original_job_authorization:true,
  generated_executable_jobs:0,
  external_actions_authorized:false,
  shift_execution_authorized:false
 });
}
