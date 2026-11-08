// Trusted step-six handoff: shift scope -> service-only eligible originals ->
// existing global single-use DB claim / shared Reality executor. Source-only
// adapter. It cannot mint owner authority, create a shift, install capabilities,
// or settle work without the existing trusted runner's independent readbacks.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {runRileyGovernedMultiJobShiftTick}
 from './reality-riley-multi-job-shift-controller-v1.js';
import {runRileyOriginalJobViaReality}
 from './reality-riley-governed-original-job-v1.js';

export const RILEY_TRUSTED_DRIVER_BRIDGE_VERSION=
 'reality-riley-trusted-original-driver-bridge-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const fail=code=>{throw Error('RILEY_TRUSTED_DRIVER_'+code)};

export function createRileyTrustedOriginalDriver({
 db,fetchImpl=fetch,
 loadShiftReadback,loadOwnerLedgerReadback,
 loadTrustedAuthorizedOriginal,
 callRpc=null,runOriginal=runRileyOriginalJobViaReality,
 runTick=runRileyGovernedMultiJobShiftTick,
 now=()=>new Date(),batchEligibleOriginals=false,
}={}){
 if(!db||typeof db.secretKey!=='string'||db.secretKey.length<8||
  typeof db.url!=='string'||!db.url.startsWith('https://')||
  typeof fetchImpl!=='function'||typeof runTick!=='function'||
  typeof runOriginal!=='function'||typeof now!=='function'||
  [loadShiftReadback,loadOwnerLedgerReadback,loadTrustedAuthorizedOriginal]
   .some(x=>typeof x!=='function')||
  (callRpc!==null&&typeof callRpc!=='function')||
  typeof batchEligibleOriginals!=='boolean')
  fail('ALL_TRUSTED_SERVER_ADAPTERS_REQUIRED');
 const rpc=callRpc|| (async({db,name,args,fetchImpl})=>
  shiftRpc(db,name,args,{fetchImpl}));
 return async function executeQualifiedOriginals(input){
  // Input is a precisely qualified scope emitted by the shift worker,
  // never a browser, arbitrary model, issue body or unsigned wake.
  if(!input||
    input.shift_read_does_not_grant_execution_authority!==true||
    input.exact_trusted_original_preflight_required!==true||
    input.read_only!==false||input.preflight_only!==false||
    !UUID.test(input.shift_id||'')||!UUID.test(input.trigger_id||'')||
    !WORK.test(input.original_work_id||'')||
    !ISSUE.test(input.source_ref||'')||
    !SHA.test(input.source_proof_sha256||''))
   fail('EXACT_SOURCE_BOUNDED_SHIFT_SCOPE_REQUIRED');

  const hasBatch=Object.hasOwn(input,'batch_original_work_ids');
  const batchIds=hasBatch?input.batch_original_work_ids:null;
  if(hasBatch&&(!batchEligibleOriginals||!Array.isArray(batchIds)||
      batchIds.length<2||batchIds.length>4||
      batchIds[0]!==input.original_work_id||
      batchIds.some(id=>!WORK.test(id||''))||
      new Set(batchIds).size!==batchIds.length))
   fail('INDEPENDENT_MULTI_ORIGINAL_WAKE_SCOPE_REQUIRED');
  const observation=await rpc({db,fetchImpl,
   name:'reality_read_eligible_shift_originals_v1',
   args:{p_shift_id:input.shift_id}});
  if(observation?.status==='NO_ACTIVE_OWNER_SHIFT_FOR_MULTI_JOB')
   fail('NO_ACTIVE_AUTHORIZED_SHIFT_NO_EXECUTION');
  if(observation?.status!=='EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED'||
    observation.shift_id!==input.shift_id||
    observation.execution_authorized!==false||
    observation.installation_authorized!==false||
    observation.production_changed!==false||
    !Array.isArray(observation.candidates)||
    observation.candidates.length>4||
    observation.candidate_count!==observation.candidates.length)
   fail('CURRENT_SERVICE_ONLY_ELIGIBILITY_READBACK_REQUIRED');
  const candidates=observation.candidates;
  if(new Set(candidates.map(c=>c.original_work_id)).size!==candidates.length)
   fail('DUPLICATED_ORIGINAL_ID_IN_SHIFT_BATCH');
  const selected=candidates.filter(c=>
   c.original_work_id===input.original_work_id);
  if(selected.length!==1||
    candidates.some(c=>c.shift_id!==input.shift_id||
      !UUID.test(c.owner_id||'')||!UUID.test(c.trigger_id||'')||
      !WORK.test(c.original_work_id||'')||
      c.current_owner_scope_verified!==true||
      c.independently_settled!==false||
      c.installation_authorized!==false||
      c.production_changed!==false)||
    selected[0].trigger_id!==input.trigger_id||
    selected[0].source_ref!==input.source_ref||
    selected[0].source_proof_sha256!==input.source_proof_sha256)
   fail('EXACT_ORIGINAL_NOT_IN_CURRENT_OWNER_SCOPE');
  const owner=selected[0].owner_id;
  if(candidates.some(c=>c.owner_id!==owner))
   fail('MULTI_OWNER_SCOPE_NOT_ALLOWED');
  const eligibleIds=new Set(candidates.map(c=>c.original_work_id));
  // Every member of a multi-job execution batch must have a separate
  // independently verified wake in THIS shift. A newly arrived candidate
  // cannot quietly piggyback on a previous job's authorization.
  if(hasBatch&&(eligibleIds.size!==batchIds.length||
     batchIds.some(id=>!eligibleIds.has(id))))
   fail('BATCH_WAKE_AND_CURRENT_OWNER_ORIGINALS_DIVERGED');
  // The existing runner does the independent owner/shift/ledger readbacks,
  // takes the global single-use database claim, invokes the shared executor,
  // records the result and reconciles final original-job receipts.
  // The previously verified root original anchors this pulse. When the
  // trusted preview worker elects shift batching, all other original jobs
  // must independently survive service-only owner/shift, source digest,
  // current Continuity, atomic claim and settlement checks in runTick.
  // A wake alone cannot mint execution authority for any candidate.
  const batchLimit=hasBatch?batchIds.length:1;
  const result=await runTick({
   db,ownerId:owner,shiftId:input.shift_id,fetchImpl,
   loadShiftReadback,loadOwnerLedgerReadback,loadTrustedAuthorizedOriginal,
   callRpc:rpc,runOriginal,now,maxJobs:batchLimit,
   onlyOriginalWorkId:hasBatch?null:input.original_work_id
  });
  if(result?.status!=='SHIFT_TICK_OUTCOMES_RECORDED_RECHECK_MORE_AUTHORIZED_WORK'||
    result.shift_id!==input.shift_id||
    !Array.isArray(result.outcomes)||
    !result.outcomes.some(x=>x.original_work_id===input.original_work_id)||
    result.outcomes.length>batchLimit||
    result.attempted>batchLimit||
    result.outcomes.some(x=>!eligibleIds.has(x.original_work_id))||
    result.installation_authorized!==false||
    result.production_changed!==false||
    result.shift_finished!==false||
    result.full_shift_proven!==false)
   fail('SHARED_EXECUTOR_OUTCOME_READBACK_INVALID');
  return result;
 };
}
