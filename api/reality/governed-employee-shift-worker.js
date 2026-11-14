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
import {executeExactlyPreparedRileyReviewViaReality}
 from '../../src/reality-riley-governed-pr-provider-bridge-v1.js';
import {inspectNative263ExistingFileInstallTransport}
 from '../../src/reality-native-263-install-preflight-bridge-v1.js';
import {probeRealityNative263GithubWriteTransport}
 from '../../src/reality-native263-github-write-canary-bridge-v1.js';
import {probeRealityNative263GithubWriteTransportV2}
 from '../../src/reality-native263-github-write-canary-v2-bridge.js';
import {stageRealityNative263ExactInstallWarrant}
 from '../../src/reality-native263-exact-install-warrant-bridge-v1.js';
import {checkNative263LiveOwnerApprovalFence}
 from '../../src/reality-native263-live-installer-fence-bridge-v1.js';
import {executeNative263GovernedPreviewAutoDeployTrigger}
 from '../../src/reality-native263-preview-auto-deploy-trigger-bridge-v1.js';
import {continueOnceApprovedNative263Install}
 from '../../src/reality-native263-approved-install-continuation-v1.js';
import {verifyNative263ApprovedInstallToOriginalReceipt}
 from '../../src/reality-native263-postinstall-original-settlement-bridge-v1.js';
import {reconcileOwnerShiftFailureTriage143}
 from '../../src/reality-riley-failure-triage-reconciler-v1.js';
import {attestCurrentRileyCandidate263}
 from '../../src/reality-riley-current-shift-candidate-verifier-v2.js';
import {assertRealityUnifiedShiftGraph}
 from '../../src/reality-shift-unified-execution-controller-v1.js';
import {admitVerifiedCurrentShiftCommitTriage,
 reconcileVerifiedCurrentShiftCommitTriage}
 from '../../src/reality-shift-commit-triage-handoff-v1.js';
import {reconcileRealityMixedShiftReceipts}
 from '../../src/reality-mixed-shift-receipts-v1.js';
import {projectRealityAutomaticShiftSupervisor}
 from '../../src/reality-automatic-shift-supervisor-v1.js';
import {projectRealityExistingShiftIntegratedIntake}
 from '../../src/reality-existing-shift-integrated-intake-v1.js';
import {runCurrentShiftWeeklyInvestigations}
 from '../../src/reality-active-weekly-source-investigator-v1.js';
import {admitCurrentShiftInvestigatedSourceWithFrozenProof}
 from '../../src/reality-current-shift-auto-admission-handoff-v1.js';
import {diagnoseRealityNativeCapabilityGap}
 from '../../src/reality-riley-native-batch-readiness-v1.js';
import {proveNativeOriginalReadOnlyModelTool}
 from '../../src/reality-native-recovery-readonly-tool-v1.js';
import {draftCurrentRileyNativeRepair}
 from '../../src/reality-riley-native-model-draft-v1.js';
import {reviseCurrentRileyNativeRepair}
 from '../../src/reality-riley-native-corrective-model-v1.js';
import {reconcileCurrentShiftRejectedNativeModelCandidate}
 from '../../src/reality-riley-current-shift-failed-candidate-reconciliation-v1.js';
import {investigateAuthenticatedChatUnderExistingShift}
 from '../../src/reality-signed-chat-to-work-v1.js';
import {continueRileyCorrectiveModelIntoIndependentCI}
 from '../../src/reality-riley-auto-corrective-ci-bridge-v1.js';
import {isBoundedCorrectiveProofWake,classifyCorrectiveProofTick}
 from '../../src/reality-bounded-corrective-proof-tick-v1.js';
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
  // Existing owner-shift continuation, never another start or approval:
  // independently verify same installed Git/Vercel commit and TWO distinct
  // source+original acceptance CI runs before recording the final receipt.
  let nativePostinstallOriginalProof={
   status:'NATIVE263_POSTINSTALL_EVIDENCE_UNAVAILABLE',
   original_job_completed:false,production_changed:false
  };
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
  // Every bounded service-recognized pulse takes one independent recovery
  // lane through the *existing* corrective broker. Other pulses still perform
  // the entire shift flow. This avoids a 300s all-in-one worker timeout
  // preventing the CI outcome from ever reaching the durable pulse ledger.
  // A returned WAKE_COMPLETED proves the bounded check finished, not that
  // any original job completed or installation was authorized.
  if(isBoundedCorrectiveProofWake(wakeReceipt)){
   const corrective=await continueRileyCorrectiveModelIntoIndependentCI({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'ISOLATED_CORRECTIVE_CI_BROKER_EFFECT_UNVERIFIED',
    original_job_completed:false,installation_authorized:false,
    production_changed:false,new_shift_started:false
   }));
   const classification=classifyCorrectiveProofTick(corrective);
   const pulse=await shiftRpc(db,
    'reality_record_employee_shift_worker_pulse_v1',{
     p_shift_id:wakeReceipt.shift_id,
     p_status:classification.worker_status,
     p_safe_result:classification.worker_result,
    });
   if(pulse?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
      pulse.shift_id!==wakeReceipt.shift_id||
      pulse.installation_authorized!==false||
      pulse.production_changed!==false)
    throw Error('BOUNDED_CORRECTIVE_WORKER_PULSE_READBACK_UNVERIFIED');
   return res.status(classification.http_status).json({
    status:'BOUNDED_OWNER_SHIFT_CORRECTIVE_CI_RECONCILED',
    original_job_completed:false,
    independent_ci_proof_verified:classification.proof_verified,
    bounded_worker_wake_receipt:wakeReceipt,
    bounded_worker_completion_receipt:pulse,
    corrective_ci_result:corrective,
    new_shift_started:false,installation_authorized:false,
    production_changed:false
   });
  }
  // Continue normal/full shift work on the other durable wake receipts.
  try{
   nativePostinstallOriginalProof=
    await verifyNative263ApprovedInstallToOriginalReceipt({
     db,env:process.env,fetchImpl:fetch});
  }catch{
   nativePostinstallOriginalProof={
    status:'NATIVE263_POSTINSTALL_PROVIDER_OR_OWNER_SCOPE_UNVERIFIED',
    original_job_completed:false,production_changed:false
   };
  }
  // Existing owner-authorized wake now consumes saved Chat instructions.
  // No Chat turn changes the frozen source scope, start approval, or install.
  const chatClaimReconciliation=await shiftRpc(db,
   'reality_reconcile_expired_chat_work_v1',{});
  if(chatClaimReconciliation?.status!=='STALE_CHAT_WORK_CLAIMS_RECONCILED'||
     chatClaimReconciliation.installation_authorized!==false)
   throw Error('CHAT_WORK_STALE_LEASE_RECONCILIATION_UNVERIFIED');
  const chatWorkPromise=investigateAuthenticatedChatUnderExistingShift({
   db,env:process.env,fetchImpl:fetch
  }).catch(e=>({
   status:'CHAT_WORK_SERVICE_PROOF_UNVERIFIED',
   reason:/^REALITY_CHAT_WORK_[A-Z0-9_]{4,100}$/.test(String(e?.message||''))?
     String(e.message):'CHAT_WORK_PROVIDER_OR_DATABASE_UNVERIFIED',
   model_advisory_recorded:false,execution_authorized:false,
   new_shift_started:false,installation_authorized:false,
   production_changed:false
  }));

  // Independently continue the existing, model-written corrective patch into
  // a protected isolated candidate branch and a real GitHub frozen CI run.
  // This work is service-only, can be reconciled after uncertainty, and runs
  // concurrently with already-authorized work, without a second Start.
  const correctiveCiPromise=continueRileyCorrectiveModelIntoIndependentCI({
   db,env:process.env,fetchImpl:fetch
  }).catch(()=>({
   status:'ISOLATED_CORRECTIVE_CI_BROKER_EFFECT_UNVERIFIED',
   original_job_completed:false,installation_authorized:false,
   production_changed:false,new_shift_started:false
  }));
  
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
  // A source-checked commit-triage observation only becomes a durable original
  // after independent provider GET and service-only warrant/proof readback.
  // No new shift, GitHub write, installation or settlement is implied.
  let commitTriageHandoff={
   qualification:{status:'NO_VERIFIED_SHIFT_COMMIT_TRIAGE_CANDIDATE'},
   original:{status:'NO_SHIFT_COMMIT_TRIAGE_ORIGINAL_ADMITTED',
    original_job_admitted:false,original_job_completed:false,
    installation_authorized:false,production_changed:false}
  };
  try{
   const sourceGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
    'reality_read_current_shift_execution_graph_v1',{}),{
     expectedShiftId:initialGraph.shift_id
   });
   if(sourceGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
      sourceGraph.jobs.some(x=>
       x.original_kind==='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'&&
       x.independent_source_proof_verified===true&&x.phase==='NOT_ADMITTED'))
    commitTriageHandoff=await admitVerifiedCurrentShiftCommitTriage({
     graph:sourceGraph,db,fetchImpl:fetch,
     token:process.env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||
      process.env.GITHUB_TOKEN||null
    });
  }catch(error){
   // Only a bounded diagnostic code is exposed, never secrets or raw provider data.
   const message=String(error?.message||'');
   const failureCode=/^SHIFT_COMMIT_TRIAGE_(?:HANDOFF_)?[A-Z0-9_]{3,100}$/.test(message)?
    message:'SHIFT_COMMIT_TRIAGE_UNCLASSIFIED_SOURCE_FAILURE';
   commitTriageHandoff={
    qualification:{status:'COMMIT_TRIAGE_PROVIDER_OR_SOURCE_READBACK_UNVERIFIED',
     failure_code:failureCode},
    original:{status:'EXACT_SHIFT_COMMIT_TRIAGE_ADMISSION_OR_EVIDENCE_RECONCILIATION_REQUIRED',
     original_job_admitted:false,original_job_completed:false,
     installation_authorized:false,production_changed:false}
   };
  }
  // Reconcile owner-assisted GitHub issue disposition only after a second,
  // independent provider readback by this signed and service-only worker.
  let commitTriageSettlement={
   status:'NO_UNSETTLED_VERIFIED_COMMIT_TRIAGE_ORIGINAL',
   original_job_completed:false,installation_authorized:false,
   production_changed:false
  };
  try{
   const settleGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
    'reality_read_current_shift_execution_graph_v1',{}),{
     expectedShiftId:initialGraph.shift_id
   });
   if(settleGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
      settleGraph.jobs.some(x=>
       x.original_kind==='REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL'&&
       x.phase==='EVIDENCE_VERIFIED'))
    commitTriageSettlement=await reconcileVerifiedCurrentShiftCommitTriage({
     graph:settleGraph,db,fetchImpl:fetch
    });
  }catch(error){
   const message=String(error?.message||'');
   const failureCode=/^SHIFT_COMMIT_TRIAGE_HANDOFF_[A-Z0-9_]{3,100}$/.test(message)?
    message:'SHIFT_COMMIT_TRIAGE_SETTLEMENT_PROVIDER_OR_DATABASE_UNVERIFIED';
   commitTriageSettlement={
    status:'COMMIT_TRIAGE_FINAL_RECEIPT_RECONCILIATION_REQUIRED',
    failure_code:failureCode,
    original_job_completed:false,installation_authorized:false,
    production_changed:false
   };
  }
  // SAME frozen shift and source identities across all real employee roles.
  const unifiedGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
   'reality_read_current_shift_execution_graph_v1',{}),{
    expectedShiftId:initialGraph.shift_id
  });
  if(initialGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
     unifiedGraph.status!=='UNIFIED_OWNER_JOB_CONTROL_READY')
   throw Error('UNIFIED_WORK_SCOPE_CHANGED_DURING_SHIFT_TICK');
  // The worker automatically reconciles native-repair and PR-review receipts
  // against the frozen owner warrant on every pulse. The status is merely
  // a truthful next-work diagnostic: never a new job or installation grant.
  let automaticWorkSupervisor=null;
  let automaticWorkSupervisorStatus='NO_CURRENT_OWNER_SHIFT_TO_TRIAGE';
  if(unifiedGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'){
   try{
    const [shiftRead,prRead,repairRead]=await Promise.all([
     shiftRpc(db,'reality_read_owner_employee_shifts_v1',
      {p_owner_id:unifiedGraph.owner_id}),
     shiftRpc(db,'reality_read_owner_riley_pr_review_v1',
      {p_owner_id:unifiedGraph.owner_id}),
     shiftRpc(db,'reality_read_owner_riley_repair_original_v1',
      {p_owner_id:unifiedGraph.owner_id})
    ]);
    const scope=assertShiftReadback(shiftRead).shifts.find(s=>
     s.shift_id===unifiedGraph.shift_id&&
     s.plan_fingerprint===unifiedGraph.plan_fingerprint&&
     ['AWAITING_EXACT_ORIGINAL_WORK','RUNNING'].includes(s.status)&&
     s.planned_end_at==='infinity');
    if(!scope)throw Error('AUTOMATIC_WORK_TRIAGE_SHIFT_CHANGED');
    const mixed=reconcileRealityMixedShiftReceipts(scope,{
     prReadback:prRead,repairReadback:repairRead,unifiedGraph});
    automaticWorkSupervisor=projectRealityAutomaticShiftSupervisor(
     unifiedGraph,mixed);
    automaticWorkSupervisorStatus='EXACT_OWNER_SOURCE_TRIAGE_VERIFIED_READ_ONLY';
   }catch{
    automaticWorkSupervisor=null;
    automaticWorkSupervisorStatus='AUTOMATIC_WORK_TRIAGE_SOURCE_UNAVAILABLE';
   }
  }
  // The same worker now reads the existing weekly employee source snapshot
  // AND the Homepage upgrade feed. These sources are advisory, never a
  // modification of the signed four-source execution warrant.
  let integratedWorkIntake=null;
  let integratedWorkIntakeStatus='NO_VERIFIED_EXISTING_WORK_INTAKE';
  if(automaticWorkSupervisor&&
     automaticWorkSupervisorStatus==='EXACT_OWNER_SOURCE_TRIAGE_VERIFIED_READ_ONLY'){
   try{
    const [weekly,capabilities]=await Promise.all([
     shiftRpc(db,'reality_read_owner_shift_weekly_backlog_v1',{
      p_owner_id:unifiedGraph.owner_id,p_shift_id:unifiedGraph.shift_id}),
     shiftRpc(db,'reality_read_owner_capability_gap_feed_v1',{
      p_owner_id:unifiedGraph.owner_id})
    ]);
    integratedWorkIntake=projectRealityExistingShiftIntegratedIntake({
     graph:unifiedGraph,supervisor:automaticWorkSupervisor,
     weekly,capabilityFeed:capabilities
    });
    integratedWorkIntakeStatus='WEEKLY_AND_HOMEPAGE_INTAKE_OWNER_RECONCILED';
   }catch(e){
    // Expose only bounded, static validation codes; never provider responses,
    // credentials or untrusted source text in a worker receipt.
    const code=String(e?.message||'');
    integratedWorkIntake=null;
    integratedWorkIntakeStatus=
     /^REALITY_INTEGRATED_INTAKE_[A-Z0-9_]{4,90}$/.test(code)?
      code:'WEEKLY_AND_HOMEPAGE_INTAKE_PROVIDER_READ_UNAVAILABLE';
   }
  }
  // Actual employee source investigations now RUN on the existing signed
  // worker, rather than merely appearing as proposed jobs on the Homepage.
  // Provider GETs + idempotent service-only receipts; no extra authorization.
  let weeklyEmployeeInvestigations={
   status:'WEEKLY_SOURCE_INVESTIGATION_INPUT_UNAVAILABLE',
   just_investigated:0,source_receipts:[],
   executable_original_admitted:false,installation_authorized:false,
   production_changed:false
  };
  if(integratedWorkIntake?.status===
    'CURRENT_WARRANT_AND_EXISTING_WORK_INVENTORY_RECONCILED_READ_ONLY'){
   try{
    weeklyEmployeeInvestigations=await runCurrentShiftWeeklyInvestigations({
     db,graph:unifiedGraph,intake:integratedWorkIntake,fetchImpl:fetch,
     token:process.env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||
      process.env.GITHUB_TOKEN||null
    });
   }catch(error){
    const diagnostic=String(error?.message||'');
    weeklyEmployeeInvestigations={
     status:'WEEKLY_SOURCE_INVESTIGATION_PROVIDER_OR_RECEIPT_RECONCILIATION_REQUIRED',
     failure_code:/^ACTIVE_WEEKLY_SOURCE_INVESTIGATION_[A-Z0-9_]{4,100}$/.test(
      diagnostic)?diagnostic:'ACTIVE_WEEKLY_SOURCE_INVESTIGATION_UNVERIFIED',
     just_investigated:0,source_receipts:[],
     executable_original_admitted:false,installation_authorized:false,
     production_changed:false
    };
   }
  }
  // Existing governed auto-trigger: a real employee-source investigation
  // may turn into one source-bound ORIGINAL only after a separate
  // independently failing frozen acceptance on the current preview branch.
  // The service-role RPC rechecks the SAME signed owner shift and one
  // immutable investigation receipt before atomic original admission.
  let shiftVerifiedAutoAdmission={
   status:'NO_SIGNED_VERIFIED_CURRENT_ORIGINAL_AUTO_ADMISSION',
   original_job_admitted:false,installation_authorized:false,
   production_changed:false
  };
  if(unifiedGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
    weeklyEmployeeInvestigations.source_receipts?.length>0&&
    integratedWorkIntake?.status===
     'CURRENT_WARRANT_AND_EXISTING_WORK_INVENTORY_RECONCILED_READ_ONLY'){
   try{
    shiftVerifiedAutoAdmission=
     await admitCurrentShiftInvestigatedSourceWithFrozenProof({
      db,graph:unifiedGraph,investigations:weeklyEmployeeInvestigations,
      env:process.env,fetchImpl:fetch,
      token:process.env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||
       process.env.GITHUB_TOKEN||null
     });
   }catch(error){
    const message=String(error?.message||'');
    shiftVerifiedAutoAdmission={
     status:'CURRENT_SHIFT_AUTO_ADMISSION_FROZEN_OR_DB_PROOF_REQUIRED',
     failure_code:/^(?:SHIFT_AUTO_ADMISSION|GOVERNED_AUTO_TRIGGER)_[A-Z0-9_]{5,110}$/
      .test(message)?message:'CURRENT_SHIFT_PROVIDER_OR_AUTHORITY_UNVERIFIED',
     original_job_admitted:false,installation_authorized:false,
     production_changed:false
    };
   }
  }
  // Existing signed shift consumes a separately recorded exact Chat owner
  // approval. No approval, model permission, new shift or manual resume here.
  let nativeOwnerApprovedInstallation={
   status:'NATIVE263_INSTALL_CONTINUATION_NOT_ELIGIBLE',
   original_job_completed:false,production_changed:false
  };
  try{
   nativeOwnerApprovedInstallation=await continueOnceApprovedNative263Install({
    db,env:process.env,fetchImpl:fetch
   });
  }catch{
   nativeOwnerApprovedInstallation={
    status:'NATIVE263_EXACT_INSTALL_CONTINUATION_UNVERIFIED',
    original_job_completed:false,production_changed:false
   };
  }
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

  // The same owner-authorized #263 original is now read-only preflighted
  // against its frozen tested source and exact existing-file preview baseline.
  // Reality does not consume owner approval, write code, or settle the job.
  let nativeExistingFilePreflight={
   status:'NO_CURRENT_TESTED_NATIVE_EXISTING_FILE_TO_INSTALL',
   installation_authorized:false,owner_approval_ready:false,
   original_job_completed:false,production_changed:false
  };
  if(unifiedGraph.jobs.some(x=>
    x.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
    x.source_ref==='https://github.com/maloney2323/Reality/issues/263'&&
    x.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL')){
   try{
    nativeExistingFilePreflight=
     await inspectNative263ExistingFileInstallTransport({
      db,graph:unifiedGraph,env:process.env,fetchImpl:fetch
     });
   }catch{
    nativeExistingFilePreflight={
     status:'NATIVE263_PREINSTALL_PROVIDER_OR_OWNER_SCOPE_UNVERIFIED',
     installation_authorized:false,owner_approval_ready:false,
     original_job_completed:false,production_changed:false
    };
   }
  }
  // This single-use canary does NOT write to #263 or issue an approval. It
  // checks REAL GitHub Contents-write permission held by Reality's broker.
  let nativeGithubWriteCanary={
   status:'NO_VERIFIED_NATIVE263_PREINSTALL_SCOPE_FOR_WRITE_TEST',
   installation_authorized:false,original_job_completed:false,
   production_changed:false
  };
  if(nativeExistingFilePreflight.status===
      'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED'){
   try{
    nativeGithubWriteCanary=await probeRealityNative263GithubWriteTransport({
     db,graph:unifiedGraph,nativePreflight:nativeExistingFilePreflight,
     env:process.env,fetchImpl:fetch
    });
   }catch{
    nativeGithubWriteCanary={
     status:'NATIVE263_CANARY_PROVIDER_OR_SCOPE_UNVERIFIED',
     installation_authorized:false,original_job_completed:false,
     production_changed:false
    };
   }
  }
  // New separately fenced permission retest after v1's definite HTTP 403.
  // Only the trusted Reality service can call the new broker action.
  let nativeGithubContentsCanaryV2={
   status:'NO_VERIFIED_NATIVE263_PREFLIGHT_FOR_V2_PERMISSION_TEST',
   installation_authorized:false,owner_approval_ready:false,
   original_job_completed:false,production_changed:false
  };
  if(nativeExistingFilePreflight.status===
      'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED'){
   try{
    nativeGithubContentsCanaryV2=
     await probeRealityNative263GithubWriteTransportV2({
      db,graph:unifiedGraph,nativePreflight:nativeExistingFilePreflight,
      env:process.env,fetchImpl:fetch
     });
   }catch{
    nativeGithubContentsCanaryV2={
     status:'NATIVE263_V2_PERMISSION_RETEST_SCOPE_OR_PROVIDER_UNVERIFIED',
     installation_authorized:false,owner_approval_ready:false,
     original_job_completed:false,production_changed:false
    };
   }
  }
  // Stage the reviewed native existing-file installation identity. Staging
  // is NOT a request for approval and cannot install any source code.
  let nativeExactInstallWarrant={
   status:'NATIVE263_EXACT_INSTALL_WARRANT_NOT_ELIGIBLE',
   owner_approval_ready:false,installation_authorized:false,
   original_job_completed:false,production_changed:false
  };
  if(nativeExistingFilePreflight.status===
      'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED'&&
     nativeGithubContentsCanaryV2.status===
      'NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED'){
   try{
    nativeExactInstallWarrant=await stageRealityNative263ExactInstallWarrant({
     db,env:process.env,graph:unifiedGraph,
     preflight:nativeExistingFilePreflight,
     contentsProbe:nativeGithubContentsCanaryV2,fetchImpl:fetch
    });
   }catch{
    nativeExactInstallWarrant={
     status:'NATIVE263_EXACT_INSTALL_WARRANT_SOURCE_OR_LEDGER_BLOCKED',
     owner_approval_ready:false,installation_authorized:false,
     original_job_completed:false,production_changed:false
    };
   }
  }
  // Independently verify the real source-writing installer REFUSES the
  // staged original before owner approval. This call cannot create approval.
  let nativeInstallerApprovalFence={
   status:'NATIVE263_EXACT_INSTALL_NOT_READY_FOR_OWNER_FENCE_CHECK',
   installation_authorized:false,source_installed:false,
   original_job_completed:false,production_changed:false
  };
  if(nativeExactInstallWarrant.status===
     'EXACT_NATIVE263_OWNER_WARRANT_STAGED_INSTALL_BLOCKED'){
   try{
    nativeInstallerApprovalFence=await checkNative263LiveOwnerApprovalFence({
     db,env:process.env,warrant:nativeExactInstallWarrant,fetchImpl:fetch
    });
   }catch{
    nativeInstallerApprovalFence={
     status:'NATIVE263_EXACT_INSTALLER_LIVE_DENIAL_UNVERIFIED',
     installation_authorized:false,source_installed:false,
     original_job_completed:false,production_changed:false
    };
   }
  }
  // One inert, owner-scoped preview commit through Reality's existing
  // GitHub broker. GitHub Actions/Vercel event evidence is verified separately.
  let nativePreviewAutoDeployProbe={
   status:'REALITY_PREVIEW_AUTO_DEPLOY_ORIGINAL_NOT_ELIGIBLE',
   installation_authorized:false,source_installed:false,
   original_job_completed:false,production_changed:false
  };
  if(nativeInstallerApprovalFence.status===
     'NATIVE263_EXACT_OWNER_APPROVAL_SERVICE_FENCE_LIVE_VERIFIED'){
   try{
    nativePreviewAutoDeployProbe=
     await executeNative263GovernedPreviewAutoDeployTrigger({
      db,env:process.env,graph:unifiedGraph,
      sourcePreflight:nativeExistingFilePreflight,
      installWarrant:nativeExactInstallWarrant,
      liveInstallerFence:nativeInstallerApprovalFence,fetchImpl:fetch
     });
   }catch{
    nativePreviewAutoDeployProbe={
     status:'REALITY_PREVIEW_AUTO_DEPLOY_PROBE_UNVERIFIED',
     installation_authorized:false,source_installed:false,
     original_job_completed:false,production_changed:false
    };
   }
  }
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
  // Provider writing is brokered THROUGH Reality, not through the model or
  // a separately privileged employee. A missing Vercel writer credential
  // can be an intentionally restricted preview: try Reality's separate
  // service-authenticated, exact-original GitHub broker once per wake.
  let governedPrProvider={status:'NO_GOVERNED_PROVIDER_BRIDGE_NEEDED',
   original_job_completed:false,installation_authorized:false,
   production_changed:false};
  // A provider write already fenced as PUBLISHING is NEVER replayed.
  // Reality's broker must still receive later wakes to reconcile the
  // original effect by independent GitHub GET, even when the legacy
  // no-token path returns a readback-only uncertainty.
  if(hasReview&&[
     'PR_REVIEW_GITHUB_WRITER_CREDENTIAL_MISSING',
     'PR_REVIEW_PUBLISH_EFFECT_UNCERTAIN_READBACK_ONLY'
   ].includes(rileyOriginalReview.status)){
   try{
    governedPrProvider=await executeExactlyPreparedRileyReviewViaReality({
     db,env:process.env,graph:unifiedGraph
    });
    if(governedPrProvider.status===
       'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED'&&
       governedPrProvider.independently_verified_original_receipt===true)
     rileyOriginalReview=governedPrProvider;
   }catch{
    governedPrProvider={status:'GOVERNED_PROVIDER_BOUNDARY_OR_READBACK_BLOCKED',
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
   }
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
  // Reconcile the isolated, independently failed candidate of THIS owner
  // original before the existing one-shot corrective OpenAI model lease.
  let rileyCandidateFrozenFailure={
   status:'NO_CURRENT_FROZEN_CANDIDATE_FAILURE_TO_RECONCILE',
   independent_failure_recorded:false,
   original_job_completed:false,installation_authorized:false,
   production_changed:false
  };
  if(unifiedGraph.engineering_ready===true){
   try{
    rileyCandidateFrozenFailure=
     await reconcileCurrentShiftRejectedNativeModelCandidate({
      db,env:process.env,fetchImpl:fetch,
      token:process.env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||
       process.env.GITHUB_TOKEN||null
     });
   }catch(e){
    const code=String(e?.message||'');
    rileyCandidateFrozenFailure={
     status:/^RILEY_SHIFT_FROZEN_CANDIDATE_[A-Z0-9_]{4,120}$/
      .test(code)?code:
      code==='SHIFT_DATABASE_RPC_reality_read_shift_native_candidate_frozen_v1_UNAVAILABLE'?
       'RILEY_SHIFT_FROZEN_CANDIDATE_READONLY_DATABASE_RPC_UNAVAILABLE':
      code==='SHIFT_DATABASE_RPC_reality_record_current_shift_native_candidate_ci_failure_v1_UNAVAILABLE'?
       'RILEY_SHIFT_FROZEN_CANDIDATE_DURABLE_FAILURE_RPC_UNAVAILABLE':
      code==='SHIFT_RPC_NOT_ALLOWLISTED'?
       'RILEY_SHIFT_FROZEN_CANDIDATE_TRUSTED_RPC_ALLOWLIST_MISSING':
       'RILEY_SHIFT_FROZEN_CANDIDATE_PROVIDER_PROOF_UNVERIFIED',
     independent_failure_recorded:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false
    };
   }
  }
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
  // A genuine Responses function call can inspect the current exact original
  // through a Reality-owned, READ-ONLY tool. A durable service-only
  // singleflight claim prevents repeated model requests on every cron wake.
  // This never installs a patch or settles the original.
  let nativeReadOnlyToolProof={
   status:'NO_CURRENT_TESTED_NATIVE_MODEL_TOOL_SCOPE',
   installation_authorized:false,original_job_completed:false,
   production_changed:false
  };
  if(unifiedGraph.tested_native_candidate_present===true){
   try{
    nativeReadOnlyToolProof=await proveNativeOriginalReadOnlyModelTool({
     db,env:process.env,fetchImpl:fetch
    });
   }catch{
    nativeReadOnlyToolProof={
     status:'NATIVE_READONLY_TOOL_PROVIDER_OR_BOUNDARY_UNVERIFIED',
     installation_authorized:false,original_job_completed:false,
     production_changed:false
    };
   }
  }
  const correctiveCiResult=await correctiveCiPromise;
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
   const qualifiedCommitTriage=unifiedGraph.jobs.some(x=>
    x.original_kind==='REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL'&&
    x.phase==='EVIDENCE_VERIFIED');
   const settledCommitTriage=unifiedGraph.jobs.some(x=>
    x.original_kind==='REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL'&&
    x.phase==='SETTLED');
   const chatWorkHandoff=await chatWorkPromise;
   const outcomeCode=correctiveCiResult?.status==='CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED'?
    'CORRECTIVE_CANDIDATE_INDEPENDENT_CI_PASSED_INSTALL_APPROVAL_REQUIRED':
    correctiveCiResult?.status==='CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN'?
    'CORRECTIVE_CANDIDATE_INDEPENDENT_CI_FAILED_RECOVERY_REQUIRED':
    correctiveCiResult?.status==='CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI'?
    'CORRECTIVE_CANDIDATE_STAGED_INDEPENDENT_CI_PENDING':
    chatWorkHandoff?.status==='AUTHENTICATED_CHAT_INSTRUCTION_INVESTIGATED_IN_EXISTING_SHIFT'?
    'SIGNED_CHAT_WORK_INVESTIGATION_RECORDED_SAME_SHIFT':
    shiftVerifiedAutoAdmission.original_job_admitted===true?
    'CURRENT_SHIFT_GOVERNED_ORIGINAL_AUTO_ADMITTED_AFTER_FROZEN_RED':
    weeklyEmployeeInvestigations.just_investigated>0?
    'WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATIONS_EXECUTED_AND_RECEIPTED':
    weeklyEmployeeInvestigations.source_receipts?.length>=5?
     'WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATIONS_PREVIOUSLY_RECEIPTED':
    settledCommitTriage?
    'COMMIT_TRIAGE_PROVIDER_DISPOSITION_SETTLED_OWNER_ASSISTED':
    qualifiedCommitTriage?
    'COMMIT_TRIAGE_SOURCE_EVIDENCE_VERIFIED_FINAL_DISPOSITION_PENDING':
    unifiedGraph.tested_native_candidate_present===true?
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
    result?.status==='SHIFT_FINAL_REPORT_NOT_DUE'&&
     automaticWorkSupervisor?.status===
      'AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY'?
      integratedWorkIntake?.read_only===true&&
       integratedWorkIntake?.status===
        'CURRENT_WARRANT_AND_EXISTING_WORK_INVENTORY_RECONCILED_READ_ONLY'?
       integratedWorkIntake.next_worker_pulse_code:
       automaticWorkSupervisor.next_worker_pulse_code:
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
    automatic_work_supervisor:automaticWorkSupervisor,
    automatic_work_supervisor_status:automaticWorkSupervisorStatus,
    integrated_work_intake:integratedWorkIntake,
    integrated_work_intake_status:integratedWorkIntakeStatus,
    weekly_employee_source_investigations:weeklyEmployeeInvestigations,
    authenticated_chat_work_handoff:chatWorkHandoff,
    riley_auto_corrective_independent_ci:correctiveCiResult,
    chat_work_claim_reconciliation:chatClaimReconciliation,
    current_shift_verified_auto_admission:shiftVerifiedAutoAdmission,
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
    commit_reference_triage_qualification:commitTriageHandoff.qualification,
    commit_reference_triage_original:commitTriageHandoff.original,
    commit_reference_triage_settlement:commitTriageSettlement,
    riley_original_review:rileyOriginalReview,
    riley_governed_pr_write_broker:governedPrProvider,
    riley_code_repair_original:rileyCodeRepair,
    riley_model_draft:rileyModelDraft,
    riley_failed_candidate_frozen_reconciliation:rileyCandidateFrozenFailure,
    riley_corrected_model_draft:rileyCorrectedDraft,
    riley_revision_frozen_test:rileyCorrectionTest,
    riley_failure_triage_original:rileyFailureTriage,
    riley_verified_candidate:rileyVerifiedCandidate,
    native_existing_file_install_preflight:nativeExistingFilePreflight,
    native_github_contents_write_canary:nativeGithubWriteCanary,
    native_github_contents_write_canary_v2:nativeGithubContentsCanaryV2,
    native_exact_install_warrant:nativeExactInstallWarrant,
    native_live_installer_approval_fence:nativeInstallerApprovalFence,
    native_preview_auto_deploy_probe:nativePreviewAutoDeployProbe,
    native_exact_owner_approved_auto_install:nativeOwnerApprovedInstallation,
    native_same_original_postinstall_receipt:nativePostinstallOriginalProof,
    native_readonly_model_tool_proof:nativeReadOnlyToolProof,
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
