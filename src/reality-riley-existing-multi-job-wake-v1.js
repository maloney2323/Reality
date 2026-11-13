// Riley's live shift may wake several ALREADY owner-authorized capability
// originals through Reality's existing worker. No second execution engine:
// this only dispatches idempotent, source-bound wake notifications. It never
// claims an original, writes model code, installs, or settles a job.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {verifyRileyMultiJobEligibility}
 from './reality-riley-multi-job-shift-controller-v1.js';
import {dispatchGenuineCapabilityWake}
 from './reality-genuine-capability-github-wakeup-v1.js';
export const RILEY_MULTI_WAKE_VERSION='reality-riley-existing-multi-job-capability-wake-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const fail=x=>{throw Error('RILEY_MULTI_WAKE_'+x)};
const verdict=(status,other={})=>Object.freeze({
 version:RILEY_MULTI_WAKE_VERSION,status,employee:'Riley',
 worker_execution_acknowledged:false,original_job_completed:false,
 installation_authorized:false,production_changed:false,
 model_invoked_by_shift:false,new_job_created:false,...other
});
const rpc=async({db,name,args,fetchImpl})=>shiftRpc(db,name,args,{fetchImpl});

export async function wakeExistingRileyShiftCapabilityBatch({
 db,reconciliation,fetchImpl=fetch,callRpc=rpc,
 dispatch=dispatchGenuineCapabilityWake,now=()=>new Date()
}={}){
 if(reconciliation?.status!=='EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED'||
    reconciliation.governed_existing_work_status!==
     'AMBIGUOUS_ORIGINAL_SCOPE_NO_AUTOMATIC_SELECTION')
  return verdict('NO_AMBIGUOUS_EXISTING_SHIFT_TO_RECONCILE');
 const shiftId=reconciliation.shift_id;
 if(!db||!UUID.test(shiftId||'')||
  reconciliation.governed_cycle_dispatched_by_shift!==false||
  reconciliation.model_invoked_by_shift!==false||
  reconciliation.new_customer_job_created!==false||
  reconciliation.installation_authorized!==false||
  reconciliation.production_changed!==false||
  [callRpc,dispatch,now].some(x=>typeof x!=='function'))
  fail('EXACT_SHIFT_AND_SERVICE_ADAPTERS_REQUIRED');
 // The DB supplies ONLY existing originals, from current owner/goal epochs,
 // proved shift observations, and one unconsumed capability queue each.
 const eligibility=await callRpc({db,name:'reality_read_eligible_shift_originals_v1',
  args:{p_shift_id:shiftId},fetchImpl});
 if(eligibility?.status==='AMBIGUOUS_SHIFT_TOO_MANY_ORIGINALS')
  return verdict('TOO_MANY_ORIGINALS_NO_AUTOMATIC_SELECTION',{shift_id:shiftId});
 if(eligibility?.status!=='EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED'||
  eligibility.shift_id!==shiftId||
  eligibility.execution_authorized!==false||
  eligibility.installation_authorized!==false||
  eligibility.production_changed!==false||
  !Array.isArray(eligibility.candidates)||
  eligibility.candidate_count!==eligibility.candidates.length||
  eligibility.candidates.length>4)
  fail('TRUSTED_ELIGIBILITY_PROVIDER_REQUIRED');
 if(eligibility.candidates.length<2)
  return verdict('NO_MULTIPLE_CURRENTLY_ELIGIBLE_ORIGINALS',{shift_id:shiftId,
   eligible_count:eligibility.candidates.length});
 const ownerId=eligibility.candidates[0].owner_id;
 if(!UUID.test(ownerId||'')||
  eligibility.candidates.some(x=>x.owner_id!==ownerId||
   x.shift_id!==shiftId||!WORK.test(x.original_work_id||'')||
   !UUID.test(x.trigger_id||'')||!UUID.test(x.source_event_id||'')||
   !ISSUE.test(x.source_ref||'')||!SHA.test(x.source_proof_sha256||'')))
  fail('SAME_CURRENT_OWNER_AND_SOURCE_REQUIRED');
 const [shiftReadback,ownerLedgerReadback]=await Promise.all([
  callRpc({db,name:'reality_read_owner_employee_shifts_v1',
   args:{p_owner_id:ownerId},fetchImpl}),
  callRpc({db,name:'reality_read_owner_genuine_loop_v1',
   args:{p_owner_id:ownerId},fetchImpl})
 ]);
 const candidates=verifyRileyMultiJobEligibility({
  shiftReadback,ownerLedgerReadback,ownerId,shiftId,eligibility,now:now()
 });
 // Re-read EVERY source-bound service-only wake gate before the first write.
 // A single stale/mismatched original vetoes the whole batch.
 const gates=await Promise.all(candidates.map(c=>callRpc({
  db,name:'reality_read_shift_capability_wake_v1',
  args:{p_shift_id:shiftId,p_original_work_id:c.original_work_id,
   p_trigger_id:c.trigger_id},fetchImpl
 })));
 for(let i=0;i<candidates.length;i++){
  const c=candidates[i],g=gates[i];
  if(g?.status!=='EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE'||
   g.shift_id!==shiftId||g.original_work_id!==c.original_work_id||
   g.trigger_id!==c.trigger_id||g.source_event_id!==c.source_event_id||
   g.source_ref!==c.source_ref||
   g.source_proof_sha256!==c.source_proof_sha256||
   g.existing_job_only!==true||
   g.original_job_completed!==false||
   g.installation_authorized!==false||g.production_changed!==false)
   fail('EXACT_INDEPENDENT_WAKE_READBACK_REQUIRED');
 }
 const results=[];
 for(const gate of gates){
  // Provider writes are bounded to the existing isolated trigger branch.
  // On uncertain effect do not automatically re-send in this invocation.
  const wake=await dispatch({trigger_id:gate.trigger_id,
   source_event_id:gate.source_event_id,
   original_work_id:gate.original_work_id,
   shift_id:gate.shift_id,source_ref:gate.source_ref,
   source_proof_sha256:gate.source_proof_sha256,
   db,fetchImpl});
  if(wake?.dispatched!==true||
   wake.trigger_id!==gate.trigger_id||
   wake.source_event_id!==gate.source_event_id||
   wake.original_work_id!==gate.original_work_id||
   wake.installation_authorized!==false||
   wake.production_changed!==false)
   fail('PROVIDER_WAKE_RECEIPT_UNVERIFIED');
  results.push(Object.freeze({
   original_work_id:gate.original_work_id,
   status:'EXISTING_CAPABILITY_WAKE_DISPATCHED_NOT_EXECUTED',
   trigger_id:gate.trigger_id,
   source_ref:gate.source_ref,
   source_proof_sha256:gate.source_proof_sha256,
   already_dispatched:wake.existing===true
  }));
 }
 return verdict('EXISTING_MULTI_JOB_CAPABILITY_WAKES_RECORDED',{
  shift_id:shiftId,eligible_count:candidates.length,
  dispatched_count:results.length,dispatches:Object.freeze(results),
  full_shift_proven:false
 });
}
