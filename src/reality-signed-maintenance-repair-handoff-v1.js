// Existing owner warrant -> one durable, source-bound maintenance repair
// obligation. This runs inside Reality's current signed worker. The exact
// frozen failing test is STILL required before model patch or installation.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const fail=x=>{throw Error('SIGNED_MAINTENANCE_REPAIR_HANDOFF_'+x)};
const hold=(status,more={})=>Object.freeze({
 status,...more,work_order_created:false,
 frozen_ci_red_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
});
export async function advanceSignedExistingMaintenanceRepairHandoff({
 db,env=process.env,shiftId,workerRunId,call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
    typeof fetchImpl!=='function'||typeof call!=='function')
  fail('EXISTING_SIGNED_OWNER_WORKER_REQUIRED');
 const r=await call(db,'reality_admit_existing_signed_maintenance_repair_handoff_v1',{
  p_shift_id:shiftId,p_worker_run_id:workerRunId
 },{fetchImpl});
 if(r?.status==='NO_NEW_SIGNED_MAINTENANCE_REPAIR_HANDOFF_ELIGIBLE'&&
    r.work_order_created===false&&r.frozen_ci_red_verified===false&&
    r.repair_executed===false&&r.original_job_completed===false&&
    r.installation_authorized===false&&r.production_changed===false&&
    r.new_shift_started===false)
  return hold(r.status);
 if(r?.status!=='EXISTING_SIGNED_MAINTENANCE_REPAIR_WORK_ADMITTED'||
    !UUID.test(r.owner_id||'')||
    r.shift_id!==shiftId||!UUID.test(r.maintenance_id||'')||
    !SOURCE.test(r.source_ref||'')||
    !(r.existing_original_work_id===null||
      WORK.test(r.existing_original_work_id||''))||
    !HASH.test(r.handoff_receipt_sha256||'')||
    !HASH.test(r.independent_baseline_receipt_sha256||'')||
    !HASH.test(r.independent_diagnostic_receipt_sha256||'')||
    !HASH.test(r.source_epoch_receipt_sha256||'')||
    r.next_action!=='GENERATE_AND_INDEPENDENTLY_TEST_CASE_SPECIFIC_FROZEN_RED'||
    r.work_order_created!==true||r.frozen_ci_red_verified!==false||
    r.repair_executed!==false||r.original_job_completed!==false||
    r.installation_authorized!==false||r.production_changed!==false||
    r.new_shift_started!==false)
  fail('EXACT_SOURCE_BOUND_REPAIR_ORDER_RECEIPT_INVALID');
 return Object.freeze({...r,independently_tested_repair:false,
  existing_owner_shift_preserved:true,
  customer_original_created:false});
}
