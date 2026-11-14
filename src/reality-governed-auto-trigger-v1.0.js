// Durable, same-original-job governed trigger. Existing owner-confirmed work
// may initiate investigation automatically; it cannot authorize installation.
// Database RPCs independently re-read owner goal epoch and source Continuity.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';

export const GOVERNED_AUTO_TRIGGER_VERSION='reality-governed-auto-trigger-v1.0';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error('GOVERNED_AUTO_TRIGGER_'+code)};
export function capabilityFromSourcePath(path){
 if(typeof path!=='string'||
    !/^src\/reality-extensions\/[a-z0-9._/-]+\.mjs$/.test(path)||
    path.includes('//')||path.split('/').includes('..'))
  fail('SOURCE_PATH_UNVERIFIED');
 const name=path.split('/').at(-1).replace(/\.mjs$/,'').replace(/[._-]+/g,'_');
 if(!/^[a-z][a-z0-9_]{2,90}$/.test(name))fail('SOURCE_CAPABILITY_ID_INVALID');
 return name;
}
function database({session,env}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||
    session.config?.url!=='https://'+env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF+'.supabase.co')
  fail('AUTHENTICATED_ISOLATED_PREVIEW_ONLY');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
     db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('TRUSTED_DATABASE_BOUNDARY_REQUIRED');
 return db;
}
async function call(db,name,args,fetchImpl=fetch){
 const r=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',headers:{
   apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args),
 });
 if(!r.ok)fail('DATABASE_RPC_REJECTED_'+r.status);
 const result=await r.json().catch(()=>null);
 if(result===null||typeof result!=='object')fail('RPC_RECEIPT_REQUIRED');
 return result;
}
export async function registerOriginalJobCapabilityAutoTrigger({
 session,conversationId,originalWorkId,originalWorkEventId,
 goalTransitionEventId,evidence,
 env=process.env,invoke=call,
}={}){
 const db=database({session,env});
 if(!validUuid(conversationId)||!WORK.test(originalWorkId)||
    !validUuid(originalWorkEventId)||!validUuid(goalTransitionEventId)||
    evidence?.independently_verified!==true||
    !SHA.test(evidence.source_sha)||
    !Number.isSafeInteger(evidence.original_provider_failed_run_id)||
    evidence.original_provider_failed_run_id<1)
  fail('PINNED_INDEPENDENT_ORIGINAL_FAILURE_REQUIRED');
 const capabilityId=capabilityFromSourcePath(evidence.source_path);
 const response=await invoke(db,'reality_enqueue_governed_auto_trigger_v1',{
  p_owner_id:session.user_id,
  p_conversation_id:conversationId,
  p_original_work_id:originalWorkId,
  p_original_work_event_id:originalWorkEventId,
  p_goal_transition_event_id:goalTransitionEventId,
  p_capability_id:capabilityId,
 });
 if(!validUuid(response.trigger_id)||
    response.original_work_id!==originalWorkId||
    response.source_event_id!==originalWorkEventId||
    !['PENDING_VERIFIED_GAP_REOBSERVATION',
      'CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
      'EVIDENCE_RECONCILIATION_REQUIRED'].includes(response.phase)||
    response.installation_authorized!==false||
    response.original_job_completed!==false||
    response.production_changed!==false||
    response.new_customer_job_created!==false)
  fail('DURABLE_PROVIDER_RECEIPT_MISMATCH');
 return Object.freeze({
  status:response.phase,trigger_id:response.trigger_id,
  original_work_id:originalWorkId,
  capability_id:capabilityId,
  owner_action_required:false,new_customer_job_created:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
export async function claimOriginalJobCapabilityAutoTrigger({
 session,triggerId,originalWorkId,env=process.env,invoke=call,
}={}){
 const db=database({session,env});
 if(!validUuid(triggerId)||!WORK.test(originalWorkId))
  fail('CLAIM_SCOPE_INVALID');
 const result=await invoke(db,'reality_claim_governed_auto_trigger_v1',{
  p_trigger_id:triggerId,p_owner_id:session.user_id,
  p_original_work_id:originalWorkId,
 });
 if(result.trigger_id!==triggerId||!validUuid(result.claim_id)||
    result.original_work_id!==originalWorkId||
    !validUuid(result.original_work_event_id)||
    result.phase!=='CLAIMED_FOR_INDEPENDENT_INVESTIGATION'||
    result.reobserve_before_generation!==true||
    result.installation_authorized!==false||
    result.original_job_completed!==false||
    result.production_changed!==false||
    result.new_customer_job_created!==false)
  fail('CLAIMED_TRUST_BOUNDARY_INVALID');
 return Object.freeze({
  ...result,source:'SERVICE_ROLE_ATOMIC_CLAIM',
  model_generation_authorized:false,
  installation_authorized:false,original_job_completed:false,
 });
}


const signedShiftUUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const signedShiftSHA=/^sha256:[a-f0-9]{64}$/;
const signedShiftWORK=/^work:[a-f0-9]{32}$/;
const signedShiftISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const signedFrozenTEST=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const signedInvestigationRECEIPT=/^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$/;
const denyOriginalAdmit=code=>{throw Error('GOVERNED_AUTO_TRIGGER_'+code)};
// Reuse an EXISTING frozen owner shift: investigation -> independent RED ->
// service-only exact ORIGINAL. Neither the model nor this module can install.
export async function runAuthorizedShiftSourceRepairAutoTrigger({
 graph,investigation,independentFrozenFailure,admit
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !signedShiftUUID.test(graph.shift_id||'')||
    !signedShiftUUID.test(graph.owner_id||'')||
    !signedShiftSHA.test(graph.plan_fingerprint||'')||
    !Array.isArray(graph.jobs)||graph.jobs.length<1||graph.jobs.length>4||
    typeof admit!=='function')
  denyOriginalAdmit('TRUSTED_OWNER_SHIFT_REQUIRED');
 const ref=investigation?.source_ref;
 const match=signedShiftISSUE.exec(ref||'');
 const exact=graph.jobs.filter(x=>x.source_ref===ref);
 if(!match||exact.length!==1||
    exact[0].original_kind!=='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'||
    exact[0].original_work_id!==null||exact[0].phase!=='NOT_ADMITTED'||
    exact[0].independent_source_proof_verified!==true||
    !signedShiftSHA.test(exact[0].source_proof_sha256||'')||
    investigation.issue_number!==Number(match[1])||
    !['Riley','Taylor','Quinn'].includes(investigation.employee)||
    !signedInvestigationRECEIPT.test(investigation.investigation_receipt_ref||'')||
    !signedShiftSHA.test(investigation.provider_evidence_sha256||'')||
    !['CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST',
      'HISTORICAL_PROVIDER_FAILURE_VERIFIED_FRESH_REPRODUCTION_REQUIRED'
     ].includes(investigation.investigation_status))
  denyOriginalAdmit('EXACT_SOURCE_AND_INVESTIGATION_REQUIRED');
 const proof=independentFrozenFailure,run=proof?.run,id=run?.id;
 if(proof?.source_verified!==true||proof.failed_test_verified!==true||
    proof.failure_signature!=='CURRENT_SHIFT_AUTO_ADMISSION_MISSING'||
    !signedFrozenTEST.test(proof.test_path||'')||
    !/^[a-f0-9]{64}$/.test(proof.test_sha256||'')||
    !Number.isSafeInteger(id)||id<1||
    run.status!=='completed'||run.conclusion!=='failure'||
    !/^[a-f0-9]{40}$/.test(run.head_sha||'')||
    run.head_repository?.full_name!=='maloney2323/Reality'||
    run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+id||
    !['Reality current-shift original qualification acceptance',
      'Reality current shift governed auto-admission frozen contract'].includes(run.name))
  denyOriginalAdmit('CURRENT_INDEPENDENT_FROZEN_RED_REQUIRED');
 const request={
  p_owner_id:graph.owner_id,p_shift_id:graph.shift_id,
  p_plan_fingerprint:graph.plan_fingerprint,
  p_source_ref:ref,p_source_proof_sha256:exact[0].source_proof_sha256,
  p_evidence_receipt_ref:investigation.investigation_receipt_ref,
  p_provider_evidence_sha256:investigation.provider_evidence_sha256,
  p_frozen_failure_run_id:id,p_failure_source_sha:run.head_sha,
  p_frozen_test_path:proof.test_path,
  p_frozen_test_sha256:proof.test_sha256,
  p_failure_signature:proof.failure_signature
 };
 const result=await admit(Object.freeze(request));
 if(result?.status!=='EXACT_OWNER_SHIFT_REPAIR_ORIGINAL_ADMITTED'||
    result.shift_id!==graph.shift_id||result.owner_id!==graph.owner_id||
    result.source_ref!==ref||
    !signedShiftWORK.test(result.original_work_id||'')||
    result.installation_authorized!==false||
    result.production_changed!==false||
    result.original_job_completed!==false)
  denyOriginalAdmit('SERVICE_FENCED_ORIGINAL_RECEIPT_INVALID');
 return Object.freeze({...result,
  investigation_receipt_ref:investigation.investigation_receipt_ref,
  frozen_failure_run_id:id,independent_red_acceptance_verified:true,
  owner_warrant_reused:true,new_shift_created:false,
  installation_authorized:false,production_changed:false});
}
