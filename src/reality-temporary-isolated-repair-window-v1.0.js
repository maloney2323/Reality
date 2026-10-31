// Short-lived, owner-issued preview experiment permission.
// This is NOT a blanket removal of owner approval, a model decision, a
// production release, or permission to modify the constitutional kernel.
// Caller must persist issuance and atomically consume the grant in trusted
// provider storage. Never accept a client/model-authored receipt as proof.
import {randomUUID,createHash} from 'node:crypto';
export const TEMPORARY_REPAIR_WINDOW_VERSION='reality-temporary-isolated-repair-window-v1.0';
export const WINDOW_MS=10*60*1000;
export const TEMPORARY_REPAIR_SCOPE='ONE_ISOLATED_PREVIEW_EXTENSION_ACTIVATION';
const work=x=>/^work:[0-9a-f]{32}$/.test(String(x||''));
const sha=x=>/^[0-9a-f]{40}$/.test(String(x||''));
const uuid=x=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(x||''));
const str=x=>typeof x==='string'&&x.length>0;
const check=(ok,code)=>{if(!ok)throw Error('REPAIR_WINDOW_'+code);};
const hash=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
export function issueTemporaryRepairWindow({
 owner,workScope,branch,commitSha,createdAt=new Date().toISOString(),
 requestedMinutes=10,grantId=randomUUID(),
}={}){
 // Owner must come from live authenticated session, NEVER a model/message.
 check(uuid(owner?.user_id)&&owner.authenticated===true&&
  owner.identity_source==='SIGNED_IN_REALITY_SESSION',
  'AUTHENTICATED_OWNER_REQUIRED');
 check(uuid(grantId),'GRANT_ID_INVALID');
 check(workScope?.owner_id===owner.user_id&&
  work(workScope?.original_work_id)&&str(workScope?.goal_id)&&
  str(workScope?.continuity_root_id)&&str(workScope?.worldline_id)&&
  workScope?.goal_confirmed===true&&workScope?.observed_failure_verified===true,
  'ORIGINAL_JOB_AND_GAP_PROVENANCE_REQUIRED');
 check(typeof branch==='string'&&branch.startsWith('feature/')&&
  !branch.includes('..')&&branch.length<=120&&sha(commitSha),
  'PINNED_ISOLATED_BRANCH_REQUIRED');
 check(requestedMinutes===10,'TEN_MINUTE_LIMIT_REQUIRED');
 const start=Date.parse(createdAt);
 check(Number.isFinite(start),'ISSUANCE_TIME_INVALID');
 const issuedAt=new Date(start).toISOString();
 const expiresAt=new Date(start+WINDOW_MS).toISOString();
 const body=Object.freeze({
  version:TEMPORARY_REPAIR_WINDOW_VERSION,
  grant_id:grantId,owner_id:owner.user_id,
  goal_id:workScope.goal_id,original_work_id:workScope.original_work_id,
  continuity_root_id:workScope.continuity_root_id,
  worldline_id:workScope.worldline_id,
  target_environment:'ISOLATED_PREVIEW',branch,commit_sha:commitSha,
  issued_at:issuedAt,expires_at:expiresAt,maximum_attempts:3,
  maximum_preview_activations:1,
  authorized_operations:Object.freeze([
   'MODEL_GENERATE_EXTENSION','ISOLATED_SANDBOX_TEST',
   'INDEPENDENT_SANDBOX_VERIFY','ISOLATED_PREVIEW_EXTENSION_ACTIVATE',
   'RESUME_SAME_PREVIEW_WORK','READ_BACK_PREVIEW_OUTCOME']),
  forbidden_operations:Object.freeze([
   'PRODUCTION_DEPLOY','PUBLISH_BASE44','SHARED_REGISTRY_WRITE',
   'EXTERNAL_CUSTOMER_ACTION','CONSTITUTIONAL_OR_IDENTITY_CHANGE',
   'UNSCOPED_GITHUB_WRITE','CREATE_NEW_OWNER_GOAL']),
  authorization_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  authorization_scope:TEMPORARY_REPAIR_SCOPE,
 });
 return Object.freeze({...body,grant_hash:hash(body),
  // Grant alone has no effect. The trusted owner service must persist and
  // independently read back issuance before any activation is admitted.
  issuance_state:'PENDING_DURABLE_PROVIDER_CONFIRMATION',
  installation_authorized:false,production_changed:false});
}
export function evaluateTemporaryRepairWindow({
 grant,ownerId,originalWorkId,goalId,branch,commitSha,
 artifactHash,verifiedSandbox,independentGrantReadback,
 atomicSingleUseConsumption,now=new Date().toISOString(),
}={}){
 const current=Date.parse(now),started=Date.parse(grant?.issued_at),
  expiry=Date.parse(grant?.expires_at);
 check(grant?.version===TEMPORARY_REPAIR_WINDOW_VERSION&&
  uuid(grant?.grant_id)&&sha(grant?.commit_sha)&&sha(commitSha)&&
  Number.isFinite(current)&&Number.isFinite(started)&&Number.isFinite(expiry)&&
  expiry-started===WINDOW_MS&&current>=started&&current<expiry,
  'EXPIRED_OR_INVALID');
 check(grant?.authorization_origin==='AUTHENTICATED_OWNER_EXPLICIT_ACTION'&&
  grant.authorization_scope===TEMPORARY_REPAIR_SCOPE&&
  grant.target_environment==='ISOLATED_PREVIEW'&&
  grant.maximum_preview_activations===1&&grant.maximum_attempts<=3,
  'SCOPE_NOT_AUTHORIZED');
 check(ownerId===grant.owner_id&&originalWorkId===grant.original_work_id&&
  goalId===grant.goal_id&&branch===grant.branch&&commitSha===grant.commit_sha,
  'WORK_OR_COMMIT_CHANGED');
 check(/^[a-f0-9]{64}$/.test(String(artifactHash||''))&&
  verifiedSandbox?.artifact_hash===artifactHash&&
  verifiedSandbox?.frozen_regression_passed===true&&
  verifiedSandbox?.independent_tests_passed===true&&
  verifiedSandbox?.governance_preserved===true&&
  verifiedSandbox?.independently_verified===true,
  'EXACT_INDEPENDENTLY_VERIFIED_EXTENSION_REQUIRED');
 check(independentGrantReadback?.verified===true&&
  independentGrantReadback?.grant_hash===grant.grant_hash&&
  independentGrantReadback?.original_work_id===grant.original_work_id&&
  independentGrantReadback?.owner_id===grant.owner_id&&
  independentGrantReadback?.status==='OWNER_ISSUED_AND_DURABLY_RECORDED',
  'TRUSTED_OWNER_GRANT_READBACK_REQUIRED');
 check(atomicSingleUseConsumption?.consumed_once===true&&
  atomicSingleUseConsumption?.grant_id===grant.grant_id&&
  atomicSingleUseConsumption?.artifact_hash===artifactHash&&
  atomicSingleUseConsumption?.target_environment==='ISOLATED_PREVIEW'&&
  atomicSingleUseConsumption?.production_changed===false&&
  atomicSingleUseConsumption?.verified_by==='TRUSTED_ATOMIC_PROVIDER',
  'SINGLE_USE_ATOMIC_CONSUMPTION_REQUIRED');
 return Object.freeze({
  status:'ONE_PREVIEW_EXTENSION_ACTIVATION_PERMITTED',
  grant_id:grant.grant_id,original_work_id:grant.original_work_id,
  exact_artifact_hash:artifactHash,
  expires_at:grant.expires_at,production_changed:false,
  shared_registry_write_authorized:false,
  preview_only:true,
  // Still not proof of installation, continuation or settlement.
  installed:false,job_completed:false,
 });
}
