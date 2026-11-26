// Trusted service-side Supabase/Vercel adapters for the independent release
// control plane. No LLM callbacks, browser credentials, arbitrary endpoints,
// automatic alias retries or owner-approval fabrication.
import {assertRealityUnifiedShiftGraph} from './reality-shift-unified-execution-controller-v1.js';
import {qualifiedWorkerRuntime,matchesWorkerReleaseAuthority} from './reality-signed-worker-capability-delivery-v1.js';
import {verifySharedFinalLoopContinuityGuard} from './reality-final-loop-signed-worker-bridge-v1.js';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const BRANCH=/^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$/;
const HOST=/^[a-z0-9-]{6,145}\.vercel\.app$/;
const ID=/^[A-Za-z0-9_-]{8,80}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ROUTE='/api/reality/governed-employee-shift-worker';
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
const projectRef=url=>{
 try{
  const u=new URL(url);
  const m=/^([a-z0-9]{16,32})\.supabase\.co$/.exec(u.hostname);
  return u.protocol==='https:'&&u.pathname==='/'&&
   !u.search&&!u.hash?m?.[1]??null:null;
 }catch{return null}
};
function validObservationEnv(env,db){
 return env.VERCEL_ENV==='preview'&&
  db?.strictSecrets===true&&
  typeof db.secretKey==='string'&&db.secretKey.length>=20&&
  db.project===projectRef(db.url)&&
  db.project===env.REALITY_RELEASE_CONTROL_DB_PROJECT_REF&&
  REPO.test(env.REALITY_VERIFIED_GITHUB_REPOSITORY||'')&&
  ID.test(env.REALITY_VERIFIED_VERCEL_PROJECT_ID||'')&&
  ID.test(env.REALITY_VERIFIED_VERCEL_TEAM_ID||'')&&
  typeof env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN==='string'&&
  env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN.length>=20&&
  Number.isSafeInteger(Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID))&&
  Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID)>0&&
  HOST.test(env.REALITY_SIGNED_WORKER_STABLE_ALIAS||'')&&
  !env.REALITY_SIGNED_WORKER_STABLE_ALIAS.startsWith('reality-git-');
}
function validEnv(env,db){
 return validObservationEnv(env,db)&&
  env.REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED==='true'&&
  env.REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED==='true'&&
  ID.test(env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID||'')&&
  SHA.test(env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||'')&&
  BRANCH.test(env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF||'')&&
  !env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF.includes('..');
}
// Bounded provider evidence, never provider body, raw exception, URL or headers.
const httpCodes=new WeakMap();
const operations=new Set(['VERCEL_ALIAS_READ','VERCEL_DEPLOYMENT_READ','VERCEL_ALIAS_ASSIGN',
 'SUPABASE_BRANCH_READ','GITHUB_LIFECYCLE_CI_READ','GITHUB_GATEWAY_CI_READ',
 'VERCEL_CANDIDATE_READ','VERCEL_ISOLATED_PEER_READ',
 'reality_read_governed_worker_release_schedule_v1','reality_read_current_shift_execution_graph_v1',
 'reality_read_current_final_loop_proof_envelope_v1','reality_read_final_loop_shared_continuity_guard_v1',
 'reality_claim_governed_signed_worker_release_v1','reality_read_governed_signed_worker_release_approval_v1',
 'reality_prepare_governed_signed_worker_release_v1','reality_record_review_release_alias_observation_v1']);
const identityFields=new Set(['alias','project_id','deployment_id','repository','release_sha','release_ref',
 'ready_state','preview_target','schedule_contract','branch_ancestry','ci_identity','ci_result','peer_host']);
const writeOps=new Set(['VERCEL_ALIAS_ASSIGN','reality_claim_governed_signed_worker_release_v1',
 'reality_prepare_governed_signed_worker_release_v1','reality_record_review_release_alias_observation_v1']);
// Vercel GET /v13/deployments documents readyState; state is the
// legacy compatible shape. Never accept missing or contradictory evidence.
export function verifiedVercelDeploymentReadiness(deployment){
 if(!deployment||typeof deployment!=='object'||Array.isArray(deployment))return null;
 const modern=Object.hasOwn(deployment,'readyState'),legacy=Object.hasOwn(deployment,'state');
 if(!modern&&!legacy)return null;
 if(modern&&legacy&&deployment.readyState!==deployment.state)return null;
 const observed=modern?deployment.readyState:deployment.state;
 return ['READY','BUILDING','ERROR','QUEUED','INITIALIZING','CANCELED'].includes(observed)?observed:null;
}
const numericHttp=n=>Number.isInteger(n)&&n>=100&&n<=599?n:null;
export const observedReleaseHttpStatus=value=>value&&typeof value==='object'?httpCodes.get(value)??null:null;
class ReleaseProviderError extends Error{
 constructor(code,operation,kind,httpStatus=null,mismatches=[]){
  super(code);
  const op=operations.has(operation)?operation:'UNKNOWN_RELEASE_OPERATION';
  const effect=writeOps.has(op);
  const status=numericHttp(httpStatus);
  const next=effect?'RECONCILE_EXACT_EFFECT_WITHOUT_REPLAY':
   kind==='AUTHENTICATION_REJECTED'?'VERIFY_BOUND_PROVIDER_CREDENTIAL':
   kind==='ACCESS_DENIED'?'VERIFY_PROVIDER_TOKEN_SCOPE_AND_RESOURCE_ACCESS':
   kind==='RESOURCE_NOT_FOUND_OR_HIDDEN'?'VERIFY_RESOURCE_ID_AND_PROVIDER_ACCESS':
   kind==='RATE_LIMITED'?'WAIT_FOR_PROVIDER_RATE_LIMIT_RESET':
   kind==='IDENTITY_MISMATCH'?'RECONCILE_EXPECTED_PROVIDER_IDENTITY':
   kind==='INVALID_RESPONSE'?'VERIFY_PROVIDER_RESPONSE_CONTRACT':
   'RECHECK_PROVIDER_READ_CONNECTIVITY';
  this.receipt=Object.freeze({operation:op,provider:op.startsWith('VERCEL_')?'VERCEL':
   op.startsWith('GITHUB_')?'GITHUB':op==='UNKNOWN_RELEASE_OPERATION'?'UNKNOWN':'SUPABASE',
   classification:kind,http_status:status,
   credential_rejected:kind==='AUTHENTICATION_REJECTED',
   access_denied:kind==='ACCESS_DENIED',
   identity_matches:kind==='IDENTITY_MISMATCH'?false:null,
   mismatched_fields:Object.freeze(mismatches.filter(f=>identityFields.has(f))),
   next_governed_action:next,automatic_replay_permitted:false,
   effect_reconciliation_required:effect,credential_values_exposed:false});
 }
}
export function releaseFailureReceipt(error){
 return error instanceof ReleaseProviderError?error.receipt:null;
}
export function releaseIdentityFailure(code,operation,value,fields){
 return new ReleaseProviderError(code,operation,'IDENTITY_MISMATCH',observedReleaseHttpStatus(value),fields);
}
export async function requestReleaseProviderJson(fetchImpl,url,init,operation,timeout=7000){
 const controller=new AbortController();
 const t=setTimeout(()=>controller.abort(),timeout);
 let status=null;
 try{
  const response=await fetchImpl(url,{...init,signal:controller.signal,redirect:'error',cache:'no-store'});
  status=numericHttp(response?.status);
  if(!response?.ok){
   const kind=status===401?'AUTHENTICATION_REJECTED':status===403?'ACCESS_DENIED':
    status===404?'RESOURCE_NOT_FOUND_OR_HIDDEN':status===429?'RATE_LIMITED':
    status!==null&&status>=500?'PROVIDER_SERVER_ERROR':'HTTP_REQUEST_REJECTED';
   throw new ReleaseProviderError('RELEASE_CONTROL_PROVIDER_REQUEST_NOT_OK',operation,kind,status);
  }
  let data;
  try{data=await response.json()}catch{
   throw new ReleaseProviderError('RELEASE_CONTROL_PROVIDER_RESPONSE_INVALID',operation,'INVALID_RESPONSE',status);
  }
  if(!data||typeof data!=='object')
   throw new ReleaseProviderError('RELEASE_CONTROL_PROVIDER_RESPONSE_INVALID',operation,'INVALID_RESPONSE',status);
  httpCodes.set(data,status);
  return data;
 }catch(error){
  if(error instanceof ReleaseProviderError)throw error;
  throw new ReleaseProviderError('RELEASE_CONTROL_PROVIDER_READ_OR_EFFECT_UNAVAILABLE',operation,
   controller.signal.aborted||error?.name==='AbortError'||error?.name==='TimeoutError'?'TIMEOUT':'NETWORK_OR_TRANSPORT_ERROR',status);
 }finally{clearTimeout(t)}
}
export function createTrustedSignedWorkerReleaseControlPlaneAdapters({
 env=process.env,db,fetchImpl=fetch,inspectionOnly=false
}={}){
 if(typeof fetchImpl!=='function'||!(inspectionOnly===true?validObservationEnv(env,db):validEnv(env,db)))
  return Object.freeze({
   status:'RELEASE_CONTROL_TRUSTED_PROVIDER_CONFIG_NOT_READY',
   ready:false,read_only:true,owner_approval_granted:false,
   provider_assignment_attempted:false
  });
 let lastFailure=null;
 const fail=error=>{lastFailure=releaseFailureReceipt(error);throw error;};
 const requestJson=async(fetcher,url,init,operation)=>{
  try{
   const data=await requestReleaseProviderJson(fetcher,url,init,operation);
   if(Array.isArray(data))throw new ReleaseProviderError('RELEASE_CONTROL_PROVIDER_RESPONSE_INVALID',operation,'INVALID_RESPONSE',observedReleaseHttpStatus(data));
   return data;
  }catch(error){return fail(error)}
 };
 const team=encodeURIComponent(env.REALITY_VERIFIED_VERCEL_TEAM_ID);
 const api='https://api.vercel.com';
 const providerHeaders={
  Authorization:'Bearer '+env.REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN,
  Accept:'application/json'
 };
 const dbHeaders={
  apikey:db.secretKey,Authorization:'Bearer '+db.secretKey,
  'Content-Type':'application/json',Accept:'application/json'
 };
 const serviceRpc=async(name,payload)=>{
  // Static allowlist: never put caller input into an RPC pathname.
  const readRpcs=['reality_read_governed_worker_release_schedule_v1',
   'reality_read_current_shift_execution_graph_v1','reality_read_current_final_loop_proof_envelope_v1','reality_read_final_loop_shared_continuity_guard_v1'];
  if(inspectionOnly===true&&!readRpcs.includes(name))throw Error('RELEASE_INSPECTION_MUTATION_FORBIDDEN');
  if(![...readRpcs,
    'reality_claim_governed_signed_worker_release_v1',
    'reality_read_governed_signed_worker_release_approval_v1',
    'reality_prepare_governed_signed_worker_release_v1',
    'reality_record_review_release_alias_observation_v1'].includes(name))
   throw Error('RELEASE_CONTROL_RPC_NOT_ALLOWLISTED');
  return requestJson(fetchImpl,db.url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{
   method:'POST',headers:dbHeaders,body:JSON.stringify(payload)
  },name);
 };
 const deployment=async id=>{
  if(!ID.test(id||''))throw Error('RELEASE_DEPLOYMENT_ID_UNVERIFIED');
  const d=await requestJson(fetchImpl,
   api+'/v13/deployments/'+encodeURIComponent(id)+'?teamId='+team,
   {method:'GET',headers:providerHeaders},'VERCEL_DEPLOYMENT_READ');
  const info=d.deployment??d;
  const expectedRepo=env.REALITY_VERIFIED_GITHUB_REPOSITORY.split('/');
  const mismatches=[
   ...(info.id!==id?['deployment_id']:[]),
   ...((info.project?.id??info.projectId)!==env.REALITY_VERIFIED_VERCEL_PROJECT_ID?['project_id']:[]),
   ...(info.meta?.githubOrg!==expectedRepo[0]||info.meta?.githubRepo!==expectedRepo[1]?['repository']:[]),
   ...(!SHA.test(info.meta?.githubCommitSha||'')?['release_sha']:[]),
   ...(!BRANCH.test(info.meta?.githubCommitRef||'')?['release_ref']:[]),
   ...(verifiedVercelDeploymentReadiness(info)!=='READY'?['ready_state']:[]),
   ...(info.target==='production'?['preview_target']:[])];
  if(mismatches.length)fail(releaseIdentityFailure('RELEASE_PROVIDER_PROJECT_OR_COMMIT_UNVERIFIED','VERCEL_DEPLOYMENT_READ',d,mismatches));
  return info;
 };
 async function observeAlias(host){
  if(!HOST.test(host||''))throw Error('RELEASE_ALIAS_HOST_UNVERIFIED');
  const a=await requestJson(fetchImpl,
   api+'/v4/aliases/'+encodeURIComponent(host)+'?teamId='+team,
   {method:'GET',headers:providerHeaders},'VERCEL_ALIAS_READ');
  const mismatches=[...(a.alias!==host?['alias']:[]),
   ...(a.projectId!==env.REALITY_VERIFIED_VERCEL_PROJECT_ID?['project_id']:[]),
   ...(!ID.test(a.deploymentId||'')?['deployment_id']:[])];
  if(mismatches.length)fail(releaseIdentityFailure('RELEASE_ALIAS_PROJECT_BINDING_UNVERIFIED','VERCEL_ALIAS_READ',a,mismatches));
  const d=await deployment(a.deploymentId);
  return Object.freeze({
   provider:'VERCEL',independently_observed:true,
   project_verified:true,preview_only:true,alias:host,
   deployment_id:d.id,resolved_release_sha:d.meta.githubCommitSha,
   resolved_branch:d.meta.githubCommitRef
  });
 }
 async function readSchedule(){
  const info=await serviceRpc('reality_read_governed_worker_release_schedule_v1',{
   p_job_id:Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID)
  });
  if(info.status!=='GOVERNED_RELEASE_CRON_SCHEDULE_READ_ONLY'||
   info.job_id!==Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID)||
   info.provider!=='SUPABASE_PG_CRON'||
   info.active!==true||info.method!=='POST'||
   info.endpoint_path!==ROUTE||!HOST.test(info.host||'')||
   typeof info.schedule!=='string'||
   info.credential_values_exposed!==false)
   fail(releaseIdentityFailure('RELEASE_SCHEDULE_INDEPENDENT_DB_READBACK_UNVERIFIED','reality_read_governed_worker_release_schedule_v1',info,['schedule_contract']));
  // A parsed DB hostname is not sufficient: verify the actual provider
  // alias resolves to the configured project and a READY preview commit.
  const alias=await observeAlias(info.host);
  if(!alias.project_verified)throw Error('SCHEDULE_PROVIDER_UNVERIFIED');
  return Object.freeze({
   status:'GOVERNED_SCHEDULE_INDEPENDENTLY_READ',
   job_id:info.job_id,provider:'SUPABASE_PG_CRON',
   host:info.host,active:true,schedule:info.schedule,
   method:'POST',endpoint_path:ROUTE,
   credential_values_exposed:false,
   signed_worker_target_verified:true,
   branch_automanaged:info.host.startsWith('reality-git-'),
   dedicated_stable_release_alias:
    info.host===env.REALITY_SIGNED_WORKER_STABLE_ALIAS
  });
 }
 // Observe the actual authoritative shift and scheduler, even when no
 // eligible target or release authority exists. No approval/claim/provider write.
 async function readDirection({ownerId,shiftId,runningReleaseSha=null}={}){
  const safe=(status,extra={})=>Object.freeze({status,read_only:true,
   release_activated:false,owner_approval_granted:false,original_job_completed:false,
   production_changed:false,provider_assignment_attempted:false,...extra});
  if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
   db.project!==env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   ownerId!==env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID||
   shiftId!==env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID)
   return safe('GOVERNED_RELEASE_AUTHORITATIVE_SHIFT_SCOPE_REQUIRED');
  const rawGraph=await serviceRpc('reality_read_current_shift_execution_graph_v1',{});
  let graph;
  try{graph=assertRealityUnifiedShiftGraph(rawGraph,{expectedShiftId:shiftId})}
  catch{return safe('GOVERNED_RELEASE_AUTHORITATIVE_SHIFT_NOT_VERIFIED')}
  if(graph.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||graph.owner_id!==ownerId||graph.shift_id!==shiftId)
   return safe('GOVERNED_RELEASE_AUTHORITATIVE_SHIFT_NOT_VERIFIED');
  const p=await serviceRpc('reality_read_current_final_loop_proof_envelope_v1',{p_shift_id:shiftId});
  if(p?.schema!=='reality-final-loop-canonical-proof-readback-v1'||
   p.status!=='FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'||
   p.read_only!==true||p.independent_owner_scope_verified!==true||
   p.owner_acceptance_verified!==false||p.execution_authorized!==false||
   p.installation_authorized!==false||p.original_job_completed!==false||p.production_changed!==false)
   return safe('GOVERNED_RELEASE_CONTINUITY_SCOPE_NOT_VERIFIED');
  const g=await serviceRpc('reality_read_final_loop_shared_continuity_guard_v1',{p_shift_id:shiftId});
  const guard=verifySharedFinalLoopContinuityGuard({g,p,graph,shiftId});
  if(guard.status!=='FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY')
   return safe('GOVERNED_RELEASE_CONTINUITY_SCOPE_NOT_VERIFIED',{proof_status:guard.status});
  const schedule=await readSchedule();
  const alias=await observeAlias(schedule.host);
  const target=env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA;
  const targetRef=env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF;
  const targetPinned=SHA.test(target||'')&&BRANCH.test(targetRef||'');
  const unfinished=guard.handoffs.filter(h=>/^work:[a-f0-9]{32}$/.test(h.original_work_id||'')&&h.qualifier_digest_verified===true&&
   h.independent_original_outcome_verified===false&&h.original_job_completed===false);
  const exact=unfinished.length===1?unfinished[0]:null;
  const current={original_work_id:exact?.original_work_id??null,source_ref:exact?.source_ref??null,
   qualifier_receipt_sha256:exact?.qualifier_receipt_sha256??null,next_qualified_action:exact?.next_qualified_action??null,owner_id:ownerId,shift_id:shiftId,authoritative_database:db.project,
   plan_fingerprint:graph.plan_fingerprint,continuity_root_id:guard.continuity_root_id,
   continuity_head_sha256:guard.continuity_head_sha256,continuity_revision:guard.revision,
   scheduled_host:schedule.host,cron_job_id:schedule.job_id,
   observed_alias_release_sha:alias.resolved_release_sha,observed_alias_release_ref:alias.resolved_branch,
   running_release_sha:SHA.test(runningReleaseSha||'')?runningReleaseSha:null,
   configured_target_release_sha:targetPinned?target:null,configured_target_release_ref:targetPinned?targetRef:null,
   target_runtime_database_independently_verified:false};
  if(!schedule.dedicated_stable_release_alias||schedule.branch_automanaged)
   return safe('GOVERNED_RELEASE_SCHEDULER_DIRECTION_NOT_STABLE',{...current,
    next_governed_action:'QUALIFY_EXISTING_STABLE_WORKER_ALIAS_WITH_EXACT_AUTHORITY'});
  if(!targetPinned)return safe('GOVERNED_RELEASE_TARGET_QUALIFICATION_REQUIRED',{...current,
   next_governed_action:'QUALIFY_EXACT_REGISTERED_CAPABILITY_RELEASE_FOR_SAME_SHIFT'});
  const drift=alias.resolved_release_sha!==target||alias.resolved_branch!==targetRef;
  return safe(drift?'GOVERNED_RELEASE_DIRECTION_DRIFT_OBSERVED':'GOVERNED_RELEASE_DIRECTION_MATCHES_PIN_UNVERIFIED_ACTIVATION',{
   ...current,release_direction_drift:drift,
   next_governed_action:drift?'VERIFY_CANDIDATE_RUNTIME_DATABASE_AND_SAME_SHIFT_BEFORE_EXACT_APPROVAL':
    'INDEPENDENTLY_VERIFY_ACTUAL_SIGNED_SCHEDULED_WAKE_AND_CAPABILITY'});
 }
 async function readApprovedRelease({
  owner_id,shift_id,release_sha,scheduled_alias,capability_key
 }={}){
  if(!UUID.test(owner_id||'')||!UUID.test(shift_id||'')||
   release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   scheduled_alias!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
   !KEY.test(capability_key||''))
   throw Error('SIGNED_RELEASE_APPROVAL_READ_SCOPE_UNVERIFIED');
  const approval=await serviceRpc(
   'reality_read_governed_signed_worker_release_approval_v1',{
    p_owner_id:owner_id,p_shift_id:shift_id,
    p_release_sha:release_sha,p_scheduled_alias:scheduled_alias,
    p_capability_key:capability_key
   });
  return approval;
 }
 // Reuse the existing durable preparation RPC. This does not grant consent,
 // consume the one-use claim, change an alias, or start another shift.
 async function prepareExactRelease({qualification,schedule,currentAlias}={}){
  const c=qualification?.candidate,ci=qualification?.ci;
  const owner=env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID;
  const shift=env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID;
  const cap=env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY;
  const canonical=env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW';
  if(!UUID.test(owner||'')||!UUID.test(shift||'')||!KEY.test(cap||'')||
   qualification?.status!==(canonical?'QUALIFIED_EXACT_CANONICAL_SIGNED_WORKER_RELEASE_READ_ONLY':'QUALIFIED_EXACT_ISOLATED_SIGNED_WORKER_RELEASE_READ_ONLY')||
   qualification.read_only!==true||qualification.owner_approval_granted!==false||
   qualification.release_activated!==false||qualification.production_changed!==false||
   qualification.branch_project_ref!==(canonical?env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:db.project)||
   qualification.provider_deployment_id!==env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID||
   c?.sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   c.branch!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF||c.shift_id!==shift||
   c.capability_key!==cap||c.scheduled_alias!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
   c.operating_lane!=='NORMAL_SIGNED_SHIFT'||c.source_staging_only!==false||
   !qualifiedWorkerRuntime(c,env)||c.preview_only!==true||
   (canonical&&(c.runtime_scope?.owner_id!==owner||c.runtime_scope?.runtime_database_project_ref!==db.project||
    c.runtime_scope?.provider_release_proof_sha256!==qualification.provider_release_proof_sha256||
    c.runtime_scope?.independent_isolation_proof_sha256!==qualification.independent_isolation_proof_sha256))||c.production_changed!==false||
   ci?.status!=='INDEPENDENT_FROZEN_CI_PASSED'||ci.release_sha!==c.sha||
   ci.independently_verified!==true||ci.test_source_pinned!==true||
   !Number.isSafeInteger(ci.run_id)||ci.run_id<1||
   !HASH.test(qualification.provider_release_proof_sha256||'')||
   !HASH.test(qualification.independent_isolation_proof_sha256||'')||
   schedule?.status!=='GOVERNED_SCHEDULE_INDEPENDENTLY_READ'||
   schedule.job_id!==Number(env.REALITY_SIGNED_WORKER_CRON_JOB_ID)||
   schedule.host!==c.scheduled_alias||schedule.dedicated_stable_release_alias!==true||
   schedule.branch_automanaged!==false||schedule.signed_worker_target_verified!==true||
   currentAlias?.provider!=='VERCEL'||currentAlias.independently_observed!==true||
   currentAlias.project_verified!==true||currentAlias.preview_only!==true||
   currentAlias.alias!==schedule.host||!SHA.test(currentAlias.resolved_release_sha||'')||
   !BRANCH.test(currentAlias.resolved_branch||''))
   throw Error('RELEASE_PREPARATION_EXACT_INDEPENDENT_SCOPE_UNVERIFIED');
  if(currentAlias.resolved_release_sha===c.sha&&currentAlias.resolved_branch===c.branch)
   return Object.freeze({status:'SIGNED_RELEASE_ALREADY_AT_TARGET_NO_PREPARATION',
    owner_approval_granted:false,release_changed:false,original_job_completed:false});
  const packet=await serviceRpc('reality_prepare_governed_signed_worker_release_v1',{
   p_owner_id:owner,p_shift_id:shift,p_scheduled_alias:schedule.host,
   p_release_sha:c.sha,p_release_ref:c.branch,p_capability_key:cap,
   p_previous_release_sha:currentAlias.resolved_release_sha,
   p_previous_release_ref:currentAlias.resolved_branch,p_independent_ci_run_id:ci.run_id,
   p_provider_release_proof_sha256:qualification.provider_release_proof_sha256,
   p_independent_isolation_proof_sha256:qualification.independent_isolation_proof_sha256,
   ...(canonical?{p_runtime_scope:c.runtime_scope}:{})
  });
  if(packet.status==='SIGNED_RELEASE_STALE_OR_DIFFERENT_PACKET_NO_REPLAY')
   return Object.freeze({status:packet.status,owner_approval_granted:false,
    release_changed:false,original_job_completed:false});
  if(packet.status!=='SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED'||
   packet.owner_id!==owner||packet.shift_id!==shift||packet.release_sha!==c.sha||
   packet.release_ref!==c.branch||packet.scheduled_alias!==schedule.host||
   packet.capability_key!==cap||!UUID.test(packet.request_id||'')||
   !HASH.test(packet.proposal_fingerprint||'')||
   (canonical&&!matchesWorkerReleaseAuthority(c,packet))||
   packet.owner_approval_granted!==false||packet.release_changed!==false||
   packet.original_job_completed!==false)
   throw Error('RELEASE_PREPARATION_DURABLE_PACKET_UNVERIFIED');
  return Object.freeze(packet);
 }
 async function claimApprovedRelease({
  owner_id,shift_id,release_sha,release_ref,capability_key,
  scheduled_alias,previous_release_sha,previous_release_ref,
  independent_ci_run_id,runtime_scope
 }={}){
  const canonical=env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW';
  if(canonical&&(!runtime_scope||runtime_scope.owner_id!==owner_id||runtime_scope.shift_id!==shift_id||runtime_scope.release_sha!==release_sha||runtime_scope.release_ref!==release_ref||runtime_scope.capability_key!==capability_key||runtime_scope.scheduled_alias!==scheduled_alias||runtime_scope.runtime_database_project_ref!==db.project))
   throw Error('RELEASE_CANONICAL_RUNTIME_CLAIM_SCOPE_UNVERIFIED');
  if(!UUID.test(owner_id||'')||!UUID.test(shift_id||'')||
   !SHA.test(release_sha||'')||!BRANCH.test(release_ref||'')||
   !SHA.test(previous_release_sha||'')||
   !BRANCH.test(previous_release_ref||'')||
   !KEY.test(capability_key||'')||
   scheduled_alias!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
   release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   release_ref!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF||
   !Number.isSafeInteger(independent_ci_run_id)||
   independent_ci_run_id<1)
   throw Error('RELEASE_OWNER_CLAIM_EXACT_INPUT_UNVERIFIED');
  return serviceRpc('reality_claim_governed_signed_worker_release_v1',{
   p_owner_id:owner_id,p_shift_id:shift_id,p_release_sha:release_sha,
   p_release_ref:release_ref,p_capability_key:capability_key,
   p_scheduled_alias:scheduled_alias,
   p_previous_release_sha:previous_release_sha,
   p_previous_release_ref:previous_release_ref,
   p_independent_ci_run_id:independent_ci_run_id,
   ...(canonical?{p_runtime_scope:runtime_scope}:{})
  });
 }
 async function assignAlias({
  alias,release_sha,release_ref,owner_id,shift_id,capability_key,claim_id
 }={}){
  if(inspectionOnly===true)throw Error('RELEASE_INSPECTION_MUTATION_FORBIDDEN');
  if(alias!==env.REALITY_SIGNED_WORKER_STABLE_ALIAS||
   release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   release_ref!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF||
   !UUID.test(owner_id||'')||!UUID.test(shift_id||'')||
   !UUID.test(claim_id||'')||!KEY.test(capability_key||''))
   throw Error('RELEASE_PROVIDER_ASSIGNMENT_SCOPE_UNVERIFIED');
  const id=env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID;
  const target=await deployment(id);
  if(target.meta.githubCommitSha!==release_sha||
   target.meta.githubCommitRef!==release_ref)
   fail(releaseIdentityFailure('RELEASE_PROVIDER_PINNED_DEPLOYMENT_DRIFT','VERCEL_DEPLOYMENT_READ',target,[...(target.meta.githubCommitSha!==release_sha?['release_sha']:[]),...(target.meta.githubCommitRef!==release_ref?['release_ref']:[])]));
  // Exactly one provider POST after the caller consumed a database-backed
  // one-use approval. No retry here, including on timeout.
  const result=await requestJson(fetchImpl,
   api+'/v2/deployments/'+encodeURIComponent(id)+'/aliases?teamId='+team,{
    method:'POST',headers:{...providerHeaders,
     'Content-Type':'application/json'},
    body:JSON.stringify({alias})
   },'VERCEL_ALIAS_ASSIGN');
  if(result.alias!==alias)fail(releaseIdentityFailure('RELEASE_PROVIDER_ASSIGNMENT_ACK_UNVERIFIED','VERCEL_ALIAS_ASSIGN',result,['alias']));
  return Object.freeze({provider:'VERCEL',alias,release_sha,claim_id});
 }
 async function recordObservedReviewDelivery(){
  if(inspectionOnly===true||env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY!=='CANONICAL_BENCHMARK_PREVIEW'||
   env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY!=='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'||
   env.REALITY_FINAL_LOOP_REVIEW_TRANSPORT_PROBE_ONLY==='true')
   throw Error('REVIEW_RELEASE_OBSERVATION_SCOPE_UNVERIFIED');
  const a=await observeAlias(env.REALITY_SIGNED_WORKER_STABLE_ALIAS);
  if(a.deployment_id!==env.REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID||
   a.resolved_release_sha!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA||
   a.resolved_branch!==env.REALITY_SIGNED_WORKER_TARGET_RELEASE_REF)
   throw Error('REVIEW_RELEASE_ALIAS_DRIFT_NO_REPLAY');
  return serviceRpc('reality_record_review_release_alias_observation_v1',{
   p_owner_id:env.REALITY_SIGNED_WORKER_RELEASE_OWNER_ID,
   p_shift_id:env.REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID,
   p_release_sha:a.resolved_release_sha,p_release_ref:a.resolved_branch,
   p_scheduled_alias:a.alias,p_deployment_id:a.deployment_id
  });
 }
 return Object.freeze({
  status:'TRUSTED_SIGNED_WORKER_RELEASE_ADAPTERS_CONFIGURED',
  ready:true,read_only:inspectionOnly===true,
  readSchedule,observeAlias,readDirection,readApprovedRelease,prepareExactRelease,claimApprovedRelease,assignAlias,recordObservedReviewDelivery,
  readLastProviderFailure:()=>lastFailure,
  owner_approval_granted:false,provider_assignment_attempted:false
 });
}
