// Trusted server-to-server shift pulse. It reads authorized source steps,
// reconciles existing original-job receipts, and can request an idempotent wake
// for one already-authorized original job only after a separate service-role
// database readback. The existing capability worker independently claims work.
// This endpoint cannot admit new jobs, authorize installation, bypass owner
// approval, settle original work, or alter production operations.
import crypto from 'node:crypto';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {processGovernedEmployeeShiftTick}
 from '../../src/reality-governed-employee-shift-worker-v1.js';
import {createOneOpenAICombinedRoleCoordinator}
 from '../../src/reality-one-openai-combined-role-handoff-v1.js';
import {createRileyServiceOriginalRuntime}
 from '../../src/reality-riley-service-original-runtime-v1.js';
import {createRileyTrustedOriginalDriver}
 from '../../src/reality-riley-trusted-original-driver-bridge-v1.js';
import {runAuthorizedRileyPrReview}
 from '../../src/reality-riley-authorized-pr-review-job-v1.js';
import {reconcileOwnerShiftFailureTriage143}
 from '../../src/reality-riley-failure-triage-reconciler-v1.js';
import {attestCurrentRileyCandidate263}
 from '../../src/reality-riley-current-shift-candidate-verifier-v2.js';
import {assertRealityUnifiedShiftGraph}
 from '../../src/reality-shift-unified-execution-controller-v1.js';
import {diagnoseRealityNativeCapabilityGap}
 from '../../src/reality-riley-native-batch-readiness-v1.js';
import {draftCurrentRileyNativeRepair}
 from '../../src/reality-riley-native-model-draft-v1.js';
import {reviseCurrentRileyNativeRepair}
 from '../../src/reality-riley-native-corrective-model-v1.js';
export const maxDuration=60;
function validSecret(req,env){
 const secret=String(env.REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN||'');
 const auth=String(req.headers?.authorization||'');
 if(!/^[a-f0-9]{64}$/.test(secret)||!auth.startsWith('Bearer '))return false;
 const token=auth.slice(7);
 return /^[a-f0-9]{64}$/.test(token)&&
  crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(token));
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'SHIFT_WORKER_POST_ONLY'});
 if(process.env.VERCEL_ENV!=='preview'||!validSecret(req,process.env))
  return res.status(403).json({ok:false,error:'SHIFT_WORKER_AUTHORIZATION_REQUIRED',
   installation_authorized:false,production_changed:false});
 if(Object.keys(req.query||{}).length||
  (req.body&&(Object.getPrototypeOf(req.body)!==Object.prototype||
    Array.isArray(req.body)||Object.keys(req.body).length>0)))
  return res.status(400).json({ok:false,error:'SHIFT_WORKER_INPUT_FORBIDDEN'});
 let activePulseDb=null,activePulseShiftId=null;
 try{
  const db=shiftDatabase(process.env);
  activePulseDb=db;
  // The ACTUAL server wake is durably timestamped, separate from the
  // signed-in owner authorization and from any original-job claim.
  // No HTTP user-supplied owner or shift ID is ever accepted.
  const wakeReceipt=await shiftRpc(db,
   'reality_record_current_shift_worker_pulse_v1',
   {p_status:'WAKE_RECEIVED',p_safe_result:null});
  if(!['SHIFT_WORKER_PULSE_DURABLY_RECORDED',
    'NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE'].includes(wakeReceipt?.status)||
     wakeReceipt.installation_authorized!==false)
   throw Error('WORKER_WAKE_DATABASE_READBACK_UNVERIFIED');
  if(wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED')
   activePulseShiftId=wakeReceipt.shift_id;
  // The signed shift step is already a DB-fenced, owner-authorized read.
  // One shared model offers bounded read-only role context on that same step.
  // A missing API key leaves an explicit unavailable role advisory; source
  // inspection and final receipts remain independently governed.
  // Isolated-preview model credential is named REALITY_STANDALONE_OPENAI_API_KEY.
  // A production-only OPENAI_API_KEY must not be necessary for a preview worker.
  // No secret goes into browser output, role evidence or database receipts.
  const key=process.env.REALITY_STANDALONE_OPENAI_API_KEY||
   process.env.OPENAI_API_KEY;
  const coordinateRoleWork=typeof key==='string'&&key.length>=12?
   createOneOpenAICombinedRoleCoordinator({
    apiKey:key,model:process.env.REALITY_OPENAI_MODEL||'gpt-5.4',
    // Re-read the CURRENT owner-scoped shift from service-role storage
    // before and after each model request. Stale claims never receive advice.
    // This validates the shift stage, not yet full original-job Continuity.
    readCurrentShift:async requested=>{
     const snapshot=assertShiftReadback(await shiftRpc(db,
      'reality_read_owner_employee_shifts_v1',
      {p_owner_id:requested.owner_id}));
     const matching=snapshot.shifts.filter(s=>
      s.shift_id===requested.shift_id);
     const shift=matching.length===1?matching[0]:null;
     const step=shift?.steps?.[requested.step_index-1];
     const now=Date.now();
     if(!shift||shift.status!=='RUNNING'||
      !Number.isFinite(Date.parse(shift.planned_start_at))||
      Date.parse(shift.planned_start_at)>now||
      (shift.planned_end_at!=='infinity'&&
       (!Number.isFinite(Date.parse(shift.planned_end_at))||
        Date.parse(shift.planned_end_at)<=now))||
      step?.step_index!==requested.step_index||
      step.state!=='CLAIMED'||step.source_ref!==requested.source_ref||
      (step.claim_id!=null&&step.claim_id!==requested.claim_id))
      throw Error('REALITY_OPENAI_GATEWAY_CURRENT_SHIFT_STEP_UNVERIFIED');
     return Object.freeze({
      status:'CURRENT_OWNER_SHIFT_PROVIDER_READBACK_VERIFIED',
      readback_source:'REALITY_OWNER_SCOPED_SHIFT_DB',
      owner_id:requested.owner_id,shift_id:shift.shift_id,
      step_index:step.step_index,source_ref:step.source_ref,
      step_state:step.state,shift_status:shift.status,
      shift_plan_fingerprint:shift.plan_fingerprint,
      current_authorized_shift:true,
      original_job_completed:false,installation_authorized:false,
      production_changed:false
     });
    }
   }):null;
  // An eligible step-six original enters Reality's EXISTING governed
  // source-backed executor only after service-role owner/goal readback and
  // independent provider preflight, before the global single-use DB claim.
  // The same worker token covers this already-authorized shift; no model,
  // browser or employee can mint new scope or installation approval.
  const originalAdapters=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED==='true'?
   createRileyServiceOriginalRuntime({db,env:process.env}):null;
  const executeQualifiedOriginals=originalAdapters?
   createRileyTrustedOriginalDriver({
    db,loadShiftReadback:originalAdapters.loadShiftReadback,
    loadOwnerLedgerReadback:originalAdapters.loadOwnerLedgerReadback,
    loadTrustedAuthorizedOriginal:originalAdapters.loadTrustedAuthorizedOriginal,
    runOriginal:originalAdapters.runOriginal,
    // One signed wake may cover up to four distinct CURRENT original jobs
    // only if every job independently survives the existing service-role
    // authorization, Continuity and atomic fenced-claim path.
    batchEligibleOriginals:true,
   }):null;
  // A completion-bound owner shift closes only when EVERY selected
  // original has its independently verified final receipt.
  const completionClose=await shiftRpc(db,
   'reality_close_employee_completion_shift_v1',{});
  if(!completionClose||![
     'NO_COMPLETION_BOUND_SHIFT_READY',
     'COMPLETION_WAITING_FOR_SOURCE_VALIDATION',
     'COMPLETION_WAITING_FOR_FINAL_JOB_RECEIPTS',
     'EMPLOYEE_SHIFT_EVIDENCE_REPORT'
    ].includes(completionClose.status)||
    (completionClose.status==='EMPLOYEE_SHIFT_EVIDENCE_REPORT'&&(
      completionClose.completion_bound!==true||
      completionClose.completion_reason!==
       'ALL_AUTHORIZED_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED'||
      !Number.isSafeInteger(completionClose.original_jobs_independently_settled_in_this_shift)||
      completionClose.original_jobs_independently_settled_in_this_shift<1||
      completionClose.original_jobs_independently_settled_in_this_shift!==
       completionClose.authorized_source_job_count||
      completionClose.production_changed!==false)))
   throw Error('COMPLETION_BOUND_SHIFT_INDEPENDENT_RECEIPT_UNVERIFIED');
  const initialGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
   'reality_read_current_shift_execution_graph_v1',{}));
  const result=await processGovernedEmployeeShiftTick(db,{
   coordinateRoleWork,executeQualifiedOriginals
  });
  // SAME frozen shift and source identities across all real employee roles.
  const unifiedGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
   'reality_read_current_shift_execution_graph_v1',{}),{
    expectedShiftId:initialGraph.shift_id
  });
  if(initialGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
     unifiedGraph.status!=='UNIFIED_OWNER_JOB_CONTROL_READY')
   throw Error('UNIFIED_WORK_SCOPE_CHANGED_DURING_SHIFT_TICK');
  // Every worker wake independently diagnoses the exact native model
  // capability-exposure boundary. Read-only: no approval or effect.
  const nativeCapabilityDiagnosis=diagnoseRealityNativeCapabilityGap({
   graph:unifiedGraph,env:process.env
  });
  const hasVerifiedSource=(url)=>unifiedGraph.jobs.some(x=>
   x.source_ref===url&&x.independent_source_proof_verified===true);
  const hasReview=unifiedGraph.jobs.some(x=>
   x.original_kind==='REAL_PR_REVIEW_ORIGINAL'&&
   x.independent_source_proof_verified===true&&x.phase!=='SETTLED');
  // Complete ONE source-backed assigned PR review as a REAL original job:
  // OpenAI authors the review, GitHub receives it, an independent provider
  // GET proves the exact effect, and the owner-scoped service ledger settles.
  // No installation or code repair is inferred from this kind of job.
  // Any uncertain GitHub write is fenced in the database and never re-POSTed.
  let rileyOriginalReview;
  try{
   rileyOriginalReview=hasReview?
    await runAuthorizedRileyPrReview({db,env:process.env}):
    {status:'NO_CURRENT_UNSETTLED_OWNER_PR_REVIEW',
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
  }catch(e){
   const code=String(e?.message||'');
   rileyOriginalReview={
    status:/^RILEY_PR_REVIEW_[A-Z0-9_]{5,115}$/.test(code)?
     code:'RILEY_PR_REVIEW_PROVIDER_OR_RECEIPT_UNAVAILABLE',
    original_job_completed:false,installation_authorized:false,
    production_changed:false
   };
  }
  // Admit the ACTUAL source-backed existing-code repair only from the
  // CURRENT signed owner shift and frozen verified issue #263 source proof.
  // Admission creates a durable original ID, NOT a fix or installation.
  let rileyCodeRepair;
  try{
   const ticket=hasVerifiedSource(
    'https://github.com/maloney2323/Reality/issues/263')?
     await shiftRpc(db,'reality_admit_exact_riley_263_repair_v1',{}):
     {status:'NO_OWNER_AUTHORIZED_263_SOURCE_TO_ADMIT',
      installation_authorized:false,production_changed:false};
   if(!['NO_OWNER_AUTHORIZED_263_SOURCE_TO_ADMIT',
     'EXACT_OWNER_SHIFT_REPAIR_SOURCE_ADMITTED',
     'ALREADY_SETTLED_NO_REPLAY'].includes(ticket?.status)||
     ticket.installation_authorized!==false||
     ticket.production_changed!==false||
     (ticket.status==='EXACT_OWNER_SHIFT_REPAIR_SOURCE_ADMITTED'&&(
       !/^work:[a-f0-9]{32}$/.test(ticket.original_work_id||'')||
       !/^sha256:[a-f0-9]{64}$/.test(ticket.source_proof_sha256||'')||
       !['SOURCE_ADMITTED','CANDIDATE_TESTING',
        'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL','BLOCKED'].includes(ticket.phase)
     )))throw Error('RILEY_REPAIR_EXACT_OWNER_SOURCE_READBACK_INVALID');
   rileyCodeRepair={...ticket,
    original_job_completed:ticket.status==='ALREADY_SETTLED_NO_REPLAY',
    installation_authorized:false,production_changed:false};
  }catch(e){
   const c=String(e?.message||'');
   rileyCodeRepair={status:/^RILEY_REPAIR_[A-Z0-9_]{5,100}$/.test(c)?
    c:'RILEY_REPAIR_SOURCE_ADMISSION_UNVERIFIED',
    original_job_completed:false,installation_authorized:false,
    production_changed:false};
  }
  // This is a different original work item already signed under the
  // SAME shift. It can complete even while the code-repair candidate is
  // still running. No historical defect is declared fixed without evidence.
  let rileyFailureTriage;
  try{
   rileyFailureTriage=hasVerifiedSource(
    'https://github.com/maloney2323/Reality/issues/143')?
    await reconcileOwnerShiftFailureTriage143({db,fetchImpl:fetch}):
    {status:'NO_CURRENT_OWNER_AUTHORIZED_TRIAGE_143_SOURCE',
     original_job_completed:false,code_repair_completed:false,
     installation_authorized:false,production_changed:false};
  }catch(e){
   const code=String(e?.message||'');
   rileyFailureTriage={
    status:/^RILEY_SHIFT_TRIAGE_[A-Z0-9_]{4,115}$/.test(code)?
     code:'RILEY_SHIFT_TRIAGE_CURRENT_PROVIDER_READBACK_UNAVAILABLE',
    original_job_completed:false,code_repair_completed:false,
    installation_authorized:false,production_changed:false
   };
  }
  // Owner-governed OpenAI may propose ONE exact file edit for the EXISTING
  // Riley native original. A service-role singleflight lease stops repeated
  // model requests; output is stored ONLY as an unexecuted private draft.
  // GitHub staging, frozen acceptance, installation and final settlement are
  // separate independent effects and never inferred from this advisory.
  let rileyModelDraft;
  if(unifiedGraph.engineering_ready===true){
   try{
    rileyModelDraft=await draftCurrentRileyNativeRepair({
     db,graph:unifiedGraph,env:process.env,fetchImpl:fetch
    });
   }catch(e){
    const msg=String(e?.message||'');
    rileyModelDraft={
     status:/^RILEY_NATIVE_MODEL_[A-Z0-9_]{5,112}$/.test(msg)?
      msg:'RILEY_NATIVE_MODEL_PROVIDER_OR_AUTHORITY_UNVERIFIED',
     independent_tests_passed:false,installation_authorized:false,
     original_job_completed:false,production_changed:false
    };
   }
  }else rileyModelDraft={
   status:'NO_CURRENT_OWNER_AUTHORIZED_NATIVE_REPAIR_TO_DRAFT',
   independent_tests_passed:false,installation_authorized:false,
   original_job_completed:false,production_changed:false
  };
  // Independent frozen CI failure on this EXACT original may trigger ONE
  // tightly scoped corrective OpenAI draft. No new job, repeat uncertain
  // provider call, GitHub write, install or false settled receipt.
  let rileyCorrectedDraft;
  if(unifiedGraph.engineering_ready===true){
   try{
    rileyCorrectedDraft=await reviseCurrentRileyNativeRepair({
     db,graph:unifiedGraph,env:process.env,fetchImpl:fetch
    });
   }catch(e){
    const msg=String(e?.message||'');
    rileyCorrectedDraft={
     status:/^RILEY_(?:CORRECTIVE_MODEL|REVISION)_[A-Z0-9_]{5,120}$/.test(msg)?
      msg:'RILEY_CORRECTIVE_MODEL_FAILED_FROZEN_SCOPE_GATE',
     independent_tests_passed:false,installation_authorized:false,
     original_job_completed:false,production_changed:false
    };
   }
  }else rileyCorrectedDraft={
   status:'NO_CURRENT_OWNER_AUTHORIZED_REPAIR_REVISION',
   independent_tests_passed:false,installation_authorized:false,
   original_job_completed:false,production_changed:false
  };
  // The same worker independently reads the exact failed frozen result.
  // A generated candidate is NOT "pending tests" once provider-backed CI
  // has rejected it for a real owner-governance regression.
  let rileyCorrectionTest;
  try{
   rileyCorrectionTest=await shiftRpc(db,
    'reality_read_current_riley_revision_test_outcome_v1',{});
   if(![
    'CURRENT_RILEY_REVISION_INDEPENDENT_FROZEN_TEST_FAILED',
    'NO_CURRENT_RILEY_REVISION_TEST_SCOPE',
    'NO_INDEPENDENT_CURRENT_REVISION_FAILURE_RECORDED'
   ].includes(rileyCorrectionTest?.status)||
   rileyCorrectionTest.installation_authorized!==false||
   rileyCorrectionTest.original_job_completed!==false||
   rileyCorrectionTest.production_changed!==false)
    throw Error('RILEY_REVISION_FROZEN_READBACK_INVALID');
  }catch{
   rileyCorrectionTest={status:'RILEY_REVISION_FROZEN_TEST_READBACK_UNAVAILABLE',
    installation_authorized:false,original_job_completed:false,
    production_changed:false};
  }
  // This is a trusted read-only candidate verifier. It can mark a
  // real source candidate as independently tested, but NEVER approve,
  // install, or settle an original job.
  let rileyVerifiedCandidate;
  try{
   rileyVerifiedCandidate=hasVerifiedSource(
    'https://github.com/maloney2323/Reality/issues/263')?
    await attestCurrentRileyCandidate263({
     db,ownerId:rileyCodeRepair?.owner_id,env:process.env
    }):
    {status:'NO_CURRENT_OWNER_REPAIR_CANDIDATE_TO_VERIFY',
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
  }catch(e){
   const safe=String(e?.message||'');
   rileyVerifiedCandidate={
    status:/^RILEY_CANDIDATE_[A-Z0-9_]{4,120}$/.test(safe)?
     safe:'RILEY_CANDIDATE_PROVIDER_READBACK_NOT_VERIFIED',
    original_job_completed:false,installation_authorized:false,
    production_changed:false
   };
  }
  let completedPulse=null;
  if(wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'){
   // A successful worker wake is NOT a completed repair. Surface the
   // exact latest proof-backed execution blocker to the owner timeline.
   const activeRepairUnstaged=
    rileyCodeRepair?.phase==='SOURCE_ADMITTED'&&
    rileyVerifiedCandidate?.status===
     'RILEY_CURRENT_CANDIDATE_MODEL_WRITTEN_CANDIDATE_NOT_YET_STAGED';
   const executionGateEmpty=activeRepairUnstaged&&
    result?.capability_wake?.status==='NO_EXACT_ACTIVE_ORIGINAL_JOB_TO_WAKE';
   const outcomeCode=unifiedGraph.tested_native_candidate_present===true?
     'RILEY_NATIVE_CAPABILITY_HANDOFF_NOT_CONNECTED':
    rileyCorrectionTest?.status===
    'CURRENT_RILEY_REVISION_INDEPENDENT_FROZEN_TEST_FAILED'?
     'RILEY_CORRECTED_CODE_OWNER_SCOPE_TEST_FAILED':
    rileyCorrectedDraft?.status===
    'SAME_ORIGINAL_CORRECTED_MODEL_DRAFT_AWAITING_FROZEN_TEST'?
     'RILEY_CORRECTED_CODE_DRAFT_PENDING_INDEPENDENT_TEST':
    rileyCorrectedDraft?.revision_phase==='MODEL_REVISION_RECORDED'?
     'RILEY_CORRECTED_CODE_DRAFT_PENDING_INDEPENDENT_TEST':
    rileyModelDraft?.status===
    'MODEL_WRITTEN_REPAIR_DRAFT_RECORDED_AWAITING_INDEPENDENT_TEST'?
     'RILEY_MODEL_DRAFT_RECORDED_PENDING_FROZEN_TEST':
    rileyModelDraft?.draft_phase==='MODEL_DRAFT_RECORDED'?
     'RILEY_MODEL_DRAFT_RECORDED_PENDING_FROZEN_TEST':
    rileyModelDraft?.draft_phase==='MODEL_REQUEST_UNVERIFIED'?
     'RILEY_MODEL_REQUEST_UNCERTAIN_RECONCILIATION_REQUIRED':
    executionGateEmpty?
     'RILEY_REPAIR_CANDIDATE_AND_CANONICAL_QUEUE_NOT_READY':
    activeRepairUnstaged?
     'RILEY_CURRENT_CANDIDATE_MODEL_WRITTEN_CANDIDATE_NOT_YET_STAGED':
     result?.status;
   const safeOutcome=/^[A-Z0-9_]{3,100}$/.test(outcomeCode||'')?
    outcomeCode:'RESULT_READBACK_UNVERIFIED';
   completedPulse=await shiftRpc(db,
    'reality_record_employee_shift_worker_pulse_v1',{
     p_shift_id:wakeReceipt.shift_id,p_status:'WAKE_COMPLETED',
     p_safe_result:safeOutcome
    });
   if(!['SHIFT_WORKER_PULSE_DURABLY_RECORDED',
     'NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE'].includes(completedPulse?.status)||
     completedPulse.installation_authorized!==false)
    throw Error('WORKER_COMPLETION_PULSE_UNVERIFIED');
  }
  return res.status(200).json({...result,
    actual_worker_wake_receipt:wakeReceipt,
    actual_worker_completion_receipt:completedPulse,
    completion_bound_work:completionClose,
    unified_execution_graph:{
     status:unifiedGraph.status,shift_id:unifiedGraph.shift_id,
     next_action:unifiedGraph.next_action,
     jobs:unifiedGraph.jobs.map(x=>({
      original_work_id:x.original_work_id,source_ref:x.source_ref,
      original_kind:x.original_kind,phase:x.phase,
      next_governed_action:x.next_governed_action
     })),
     installation_authorized:false,original_job_completed:false
    },
    riley_original_review:rileyOriginalReview,
    riley_code_repair_original:rileyCodeRepair,
    riley_model_draft:rileyModelDraft,
    riley_corrected_model_draft:rileyCorrectedDraft,
    riley_revision_frozen_test:rileyCorrectionTest,
    riley_failure_triage_original:rileyFailureTriage,
    riley_verified_candidate:rileyVerifiedCandidate,
    native_capability_handoff_diagnosis:nativeCapabilityDiagnosis});
 }catch{
  // Best-effort independent failure timestamp; never claim a model/tool
  // succeeded, never take another job claim and never leak provider secrets.
  if(activePulseDb&&/^[a-f0-9-]{36}$/i.test(activePulseShiftId||'')){
   try{
    await shiftRpc(activePulseDb,
     'reality_record_employee_shift_worker_pulse_v1',{
      p_shift_id:activePulseShiftId,p_status:'WAKE_FAILED',
      p_safe_result:'WORKER_PROVIDER_OR_DATABASE_UNVERIFIED'
     });
   }catch{/* Failed heartbeat is not a substitute for work evidence. */}
  }
  return res.status(503).json({
   ok:false,error:'SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED',
   work_completed:false,installation_authorized:false,
   production_changed:false});
 }
}
