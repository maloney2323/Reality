// Consume a verified canonical Continuity -> original-work handoff using ONLY
// the existing registered maintenance executors. This creates no new job,
// authority, shift, installer or settlement. The service RPC independently
// rereads the exact owner/shift/original obligation before any executor claim.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const ACTIONS=new Set([
 'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
 'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
]);
const safe=(status,extra={})=>Object.freeze({
 status,...extra,original_job_completed:false,
 installation_authorized:false,production_changed:false,
 new_shift_started:false,original_job_settled:false
});

export async function advanceVerifiedMaintenanceOriginalHandoff({
 trigger,db,env=process.env,shiftId,workerRunId,
 call,executeCaseCi,executeSourceRequalification,fetchImpl=fetch
}={}){
 if(trigger?.same_original_work_due!==true)
  return safe('NO_VERIFIED_MAINTENANCE_ORIGINAL_HANDOFF_DUE',{
   executor_invoked:false
  });
 if(trigger.status!=='SIGNED_MAINTENANCE_GOVERNED_TRIGGER_READY'||
    trigger.trigger_source!=='CANONICAL_CONTINUITY_SPINE'||
    trigger.owner_action_required!==false||
    trigger.installer_dispatch_permitted!==false||
    trigger.installer_reconcile_only!==false||
    trigger.independent_postinstall_due!==false||
    trigger.execution_authorized_by_trigger!==false||
    trigger.original_job_completed!==false||
    trigger.production_changed!==false||
    trigger.new_shift_started!==false||
    !UUID.test(trigger.owner_id||'')||
    !UUID.test(trigger.shift_id||'')||
    !UUID.test(trigger.continuity_root_id||'')||
    !UUID.test(trigger.continuity_event_id||'')||
    !WORK.test(trigger.original_work_id||'')||
    trigger.shift_id!==shiftId||
    !UUID.test(workerRunId||'')||
    ![
     'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
     ...ACTIONS
    ].includes(trigger.next_action))
  return safe('SIGNED_MAINTENANCE_ORIGINAL_RETURN_SCOPE_UNVERIFIED',{
   executor_invoked:false
  });
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_MAINTENANCE_EXECUTOR_CONNECTED!=='true'||
    !db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    db.url!=='https://'+db.project+'.supabase.co'||
    typeof db.secretKey!=='string'||db.secretKey.length<24||
    typeof call!=='function'||
    typeof executeCaseCi!=='function'||
    typeof executeSourceRequalification!=='function'||
    typeof fetchImpl!=='function')
  return safe('SIGNED_MAINTENANCE_ORIGINAL_RETURN_EXECUTOR_UNAVAILABLE',{
   executor_invoked:false
  });

 // This DB gate is a new service-only readback, not a previously cached
 // Chat/LLM assertion. The eventual executor claims through its own
 // single-use, source-epoch-bound service RPC.
 const gate=await call(db,'reality_read_same_original_postmaintenance_gate_v1',{
  p_shift_id:shiftId
 },{fetchImpl});
 if(gate?.status!=='EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'||
    gate.read_only!==true||
    gate.owner_id!==trigger.owner_id||
    gate.shift_id!==shiftId||
    gate.warrant_mode!=='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'||
    gate.original_work_id!==trigger.original_work_id||
    gate.next_action!==trigger.next_action||
    gate.original_job_completed!==false||
    gate.installation_authorized!==false||
    gate.production_changed!==false)
  return safe('SIGNED_MAINTENANCE_ORIGINAL_RETURN_CURRENT_GATE_DRIFT',{
   executor_invoked:false,continuity_event_id:trigger.continuity_event_id
  });

 // Missing canonical customer/business original is a genuine evidence blocker.
 // A repaired internal capability cannot mint the missing original or
 // authorize a code-repair attempt on an unrelated source.
 if(!ACTIONS.has(gate.next_action))
  return safe('CANONICAL_OWNER_BUSINESS_ORIGINAL_EVIDENCE_REQUIRED',{
   executor_invoked:false,continuity_event_id:trigger.continuity_event_id,
   original_work_id:trigger.original_work_id,next_action:gate.next_action
  });

 const execute=gate.next_action===
  'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'?
   executeCaseCi:executeSourceRequalification;
 const result=await execute({
  db,env,shiftId,workerRunId,fetchImpl,call
 });
 if(!result||typeof result.status!=='string'||!result.status||
    result.original_job_completed!==false||
    result.installation_authorized!==false||
    result.production_changed!==false||
    result.new_shift_started!==false)
  throw Error('SIGNED_MAINTENANCE_RETURN_EXECUTOR_RECEIPT_UNVERIFIED');

 // Delivering a trigger is NOT original-job completion. The next signed
 // wake independently observes the executor claim/provider evidence and
 // continues the original settlement path only when all gates pass.
 return safe('SIGNED_MAINTENANCE_ORIGINAL_RETURN_DELIVERED',{
  executor_invoked:true,executor_status:result.status,
  original_work_id:trigger.original_work_id,
  owner_id:trigger.owner_id,shift_id:shiftId,
  continuity_event_id:trigger.continuity_event_id,
  next_action:gate.next_action
 });
}
