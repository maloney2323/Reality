// Signed worker handoff: verified repair -> durable owner decision -> same
// original-shift source recheck. No new shift, original claim or installation.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const GIT=/^[a-f0-9]{40}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
const no=(status,detail={})=>Object.freeze({
 status,...detail,original_job_completed:false,
 installation_authorized:false,production_changed:false,
 new_shift_started:false
});
const fail=code=>{throw Error('SIGNED_REPAIR_SCOPE_HANDOFF_'+code)};
export async function advanceSignedRepairScopeOwnerHandoff({
 db,env=process.env,graph,qualification,shiftId,workerRunId,
 call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
    graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    graph.shift_id!==shiftId||!UUID.test(graph.owner_id||'')||
    typeof call!=='function')fail('EXACT_SIGNED_WORKER_REQUIRED');
 if(qualification?.status!=='AUTOMATIC_VERIFIED_REPAIR_OPPORTUNITIES_QUALIFIED'||
    qualification.shift_id!==shiftId||qualification.owner_id!==graph.owner_id||
    qualification.installation_authorized!==false||
    qualification.production_changed!==false||
    !Array.isArray(qualification.work_orders)||
    qualification.work_orders.length>4)
  return no('NO_VERIFIED_REPAIR_WORK_SCOPE_QUALIFICATION');
 const eligible=qualification.work_orders.filter(w=>
  w?.status==='REPAIR_REQUIRES_EXACT_OWNER_ORIGINAL_WORK_BINDING'&&
  w.owner_scope_decision_ready===true&&
  w.exact_owner_work_binding_required===true&&
  w.inside_existing_original_warrant===false&&
  w.shift_id===shiftId&&REF.test(w.source_ref||'')&&
  GIT.test(w.candidate_commit_sha||'')&&
  GIT.test(w.source_current_blob_sha||'')&&
  GIT.test(w.candidate_blob_sha||'')&&
  w.source_current_blob_sha!==w.candidate_blob_sha&&
  SHA.test('sha256:'+w.frozen_test_sha256)&&
  w.installation_authorized===false&&
  w.production_changed===false&&
  w.original_job_completed===false&&
  w.external_effect_performed===false
 );
 if(!eligible.length)return no('NO_NEW_EXACT_REPAIR_WORK_SCOPE_CARD_REQUIRED');
 const outcomes=[];
 for(const w of eligible){
  // This trusted service RPC independently verifies the exact owner, worker,
  // active old warrant and persisted frozen source repair proof in one tx.
  let staged;
  try{
   staged=await call(db,'reality_stage_signed_repair_scope_handoff_v1',{
    p_owner_id:graph.owner_id,p_shift_id:shiftId,
    p_worker_run_id:workerRunId,p_source_ref:w.source_ref,
    p_candidate_commit_sha:w.candidate_commit_sha,
    p_current_blob_sha:w.source_current_blob_sha,
    p_candidate_blob_sha:w.candidate_blob_sha
   },{fetchImpl});
  }catch{
   outcomes.push(no('SIGNED_REPAIR_SCOPE_STAGING_OR_PROVIDER_UNVERIFIED',{
    source_ref:w.source_ref
   }));
   continue;
  }
  if(staged?.status!=='SIGNED_REPAIR_OWNER_WORK_SCOPE_HANDOFF_DURABLE'||
     staged.owner_id!==graph.owner_id||staged.shift_id!==shiftId||
     staged.source_ref!==w.source_ref||
     !UUID.test(staged.handoff_id||'')||
     !SHA.test(staged.work_order_fingerprint||'')||
     staged.installation_authorized!==false||
     staged.production_changed!==false){
   outcomes.push(no('SIGNED_REPAIR_SCOPE_EXACT_STAGING_NOT_VERIFIED',{
    source_ref:w.source_ref
   }));
   continue;
  }
  let approved;
  try{
   approved=await call(db,'reality_read_signed_approved_repair_scope_v1',{
    p_shift_id:shiftId
   },{fetchImpl});
  }catch{
   outcomes.push(no('SIGNED_REPAIR_SCOPE_APPROVAL_RECHECK_UNVERIFIED',{
    handoff_id:staged.handoff_id
   }));
   continue;
  }
  if(approved?.status!=='APPROVED_EXACT_REPAIR_SCOPE_AWAITING_INDEPENDENT_WORK'){
   outcomes.push(no('SIGNED_REPAIR_OWNER_WORK_SCOPE_DECISION_READY',{
    handoff_id:staged.handoff_id,source_ref:w.source_ref,
    exact_owner_work_scope_required:true,
    exact_install_approval_required:true,
    next_action:'PRESENT_EXACT_REPAIR_WORK_SCOPE_IN_REALITY_CHAT'
   }));
   continue;
  }
  // Approved work must be the exact source the signed worker just
  // independently rechecked on THIS wake. Historical approval alone
  // cannot justify an effect or stale-source replay.
  if(approved.handoff_id!==staged.handoff_id||
     approved.owner_id!==graph.owner_id||approved.shift_id!==shiftId||
     approved.source_ref!==w.source_ref||
     approved.candidate_commit_sha!==w.candidate_commit_sha||
     approved.current_blob_sha!==w.source_current_blob_sha||
     approved.candidate_blob_sha!==w.candidate_blob_sha||
     approved.work_order_fingerprint!==staged.work_order_fingerprint||
     !SHA.test(approved.approval_receipt_sha256||'')||
     approved.installation_authorized!==false||
     approved.production_changed!==false){
   outcomes.push(no('SIGNED_REPAIR_APPROVED_SCOPE_SOURCE_DRIFT_BLOCKED',{
    handoff_id:staged.handoff_id
   }));
   continue;
  }
  let receipt;
  try{
   receipt=await call(db,'reality_record_signed_repair_scope_continuation_v1',{
    p_shift_id:shiftId,p_worker_run_id:workerRunId,
    p_handoff_id:staged.handoff_id,
    p_work_order_fingerprint:staged.work_order_fingerprint,
    p_current_blob_sha:w.source_current_blob_sha,
    p_candidate_blob_sha:w.candidate_blob_sha
   },{fetchImpl});
  }catch{
   outcomes.push(no('SIGNED_REPAIR_SCOPE_CONTINUATION_RECEIPT_UNVERIFIED',{
    handoff_id:staged.handoff_id
   }));
   continue;
  }
  if(receipt?.status!=='EXACT_OWNER_REPAIR_SOURCE_RECHECKED_SAME_SHIFT'||
     receipt.handoff_id!==staged.handoff_id||receipt.shift_id!==shiftId||
     receipt.approval_receipt_sha256!==approved.approval_receipt_sha256||
     receipt.independent_frozen_tests_rerun!==false||
     receipt.installation_authorized!==false||
     receipt.original_job_completed!==false||
     receipt.production_changed!==false){
   outcomes.push(no('SIGNED_REPAIR_SCOPE_CONTINUATION_NOT_INDEPENDENTLY_RECEIPTED',{
    handoff_id:staged.handoff_id
   }));
   continue;
  }
  outcomes.push(no('SIGNED_REPAIR_SCOPE_APPROVED_WORK_RECHECKED_SAME_SHIFT',{
   handoff_id:staged.handoff_id,source_ref:w.source_ref,
   approval_receipt_sha256:receipt.approval_receipt_sha256,
   worker_run_id:workerRunId,
   next_action:'RUN_NEW_INDEPENDENT_FROZEN_TESTS_BEFORE_INSTALL_REVIEW',
   independent_frozen_tests_rerun:false
  }));
 }
 return no('SIGNED_REPAIR_OWNER_WORK_SCOPE_HANDOFF_RECONCILED',{
  shift_id:shiftId,owner_id:graph.owner_id,
  handoff_count:outcomes.length,outcomes:Object.freeze(outcomes)
 });
}
