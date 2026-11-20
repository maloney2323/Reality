// Different signed employee-worker invocation evaluates an actual model
// candidate against the pinned source dependencies of Reality's RUNNING
// executor. A positive target verdict is NEVER a frozen failing test or fix.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {sourceBroker} from './reality-signed-maintenance-repair-model-candidate-v1.js';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const fail=x=>{throw Error('SIGNED_MAINTENANCE_TARGET_REVIEW_'+x)};
const safe=(status,other={})=>Object.freeze({
 status,...other,independent_target_review_recorded:false,
 candidate_is_verified_repair:false,independent_frozen_red_verified:false,
 independent_ci_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
});
export async function independentlyReviewSignedMaintenanceTarget({
 db,env=process.env,shiftId,workerRunId,
 fetchImpl=fetch,call=shiftRpc,readBroker=sourceBroker
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
    typeof call!=='function'||typeof fetchImpl!=='function'||
    typeof readBroker!=='function')
  fail('SIGNED_DIFFERENT_WORKER_REQUIRED');
 const c=await call(db,'reality_claim_signed_maintenance_candidate_target_review_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(['NO_SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_READY',
     'MAINTENANCE_CANDIDATE_TARGET_REVIEW_ALREADY_CLAIMED_NO_REPLAY'].includes(c?.status)){
  if(c.source_review_authorized!==false||
     c.installation_authorized!==false||c.original_job_completed!==false||
     c.production_changed!==false||c.new_shift_started!==false)
   fail('REVIEW_UNAUTHORIZED_RETURN_DRIFT');
  return safe(c.status);
 }
 if(c?.status!=='SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_CLAIMED'||
    c.shift_id!==shiftId||!UUID.test(c.owner_id||'')||
    !UUID.test(c.maintenance_id||'')||
    !UUID.test(c.model_request_id||'')||
    !UUID.test(c.reviewer_request_id||'')||
    !SHA.test(c.release_sha||'')||!HASH.test(c.candidate_receipt_sha256||'')||
    !SOURCE.test(c.source_ref||'')||
    !/^(?:src|api\/reality)\/[A-Za-z0-9_./-]+\.js$/.test(c.source_path||'')||
    c.source_path.includes('..')||
    c.source_review_authorized!==true||
    c.target_repair_proven!==false||
    c.original_job_completed!==false||
    c.installation_authorized!==false||
    c.production_changed!==false||c.new_shift_started!==false)
  fail('INDEPENDENT_SOURCE_CANDIDATE_CLAIM_UNVERIFIED');
 let manifest;
 try{
  manifest=await readBroker('manifest',{
   db,fetchImpl,claim:{
    maintenance_id:c.maintenance_id,
    request_id:c.model_request_id,
    release_sha:c.release_sha
   }
  });
 }catch{
  return safe('SIGNED_MAINTENANCE_TARGET_REVIEW_SOURCE_UNAVAILABLE',{
   maintenance_id:c.maintenance_id});
 }
 if(!SHA.test(manifest.source_tree_sha||'')||
    !SHA.test(manifest.worker_source_blob_sha||'')||
    !Number.isSafeInteger(manifest.runtime_imports_count)||
    !Array.isArray(manifest.files)||
    manifest.runtime_imports_count<1||
    manifest.runtime_imports_count>350||
    manifest.files.length>manifest.runtime_imports_count||
    manifest.files.some(f=>!f||typeof f.path!=='string'||
     !SHA.test(f.sha||'')||!Number.isSafeInteger(f.size)||
     f.size<300||f.size>60000))
  fail('INDEPENDENT_PINNED_WORKER_GRAPH_UNVERIFIED');
 const targetInGraph=manifest.files.some(f=>f.path===c.source_path);
 const r=await call(db,'reality_record_signed_maintenance_candidate_target_review_v1',{
  p_maintenance_id:c.maintenance_id,
  p_reviewer_request_id:c.reviewer_request_id,
  p_worker_run_id:workerRunId,
  p_source_tree_sha:manifest.source_tree_sha,
  p_worker_source_blob_sha:manifest.worker_source_blob_sha,
  p_target_in_worker_graph:targetInGraph
 },{fetchImpl});
 const verdict=targetInGraph?
  'SIGNED_WORKER_DEPENDENCY_ONLY_FROZEN_RED_STILL_REQUIRED':
  'OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY';
 if(r?.status!==verdict||
    r.maintenance_id!==c.maintenance_id||
    r.owner_id!==c.owner_id||r.shift_id!==shiftId||
    r.source_path!==c.source_path||
    !HASH.test(r.review_receipt_sha256||'')||
    r.target_in_worker_graph!==targetInGraph||
    r.independent_target_review_recorded!==true||
    r.candidate_is_verified_repair!==false||
    r.independent_frozen_red_verified!==false||
    r.independent_ci_verified!==false||
    r.repair_executed!==false||
    r.original_job_completed!==false||
    r.installation_authorized!==false||
    r.production_changed!==false||r.new_shift_started!==false)
  fail('INDEPENDENT_REVIEW_RECEIPT_UNVERIFIED');
 return Object.freeze({...r,
  original_candidate_receipt_sha256:c.candidate_receipt_sha256,
  original_model_request_id:c.model_request_id,
  frozen_original_failure_reproduced:false});
}
