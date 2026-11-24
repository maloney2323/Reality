// Trusted server-to-server shift pulse. It reads authorized source steps,
// reconciles existing original-job receipts, and can request an idempotent wake
// for one already-authorized original job only after a separate service-role
// database readback. The existing capability worker independently claims work.
// This endpoint cannot admit new jobs, authorize installation, bypass owner
// approval, settle original work, or alter production operations.
import crypto from 'node:crypto';
import {independentlyReviewOneStagedMaintenanceRegression,
 independentlyReviewOneClaimBoundMaintenanceCiDiagnostic}
 from '../../src/reality-signed-maintenance-external-review-v1.js';
import {attestOneSignedMaintenanceCiSourceEpoch}
 from '../../src/reality-signed-maintenance-ci-source-epoch-v1.js';
import {advanceInvestigatedSignedModelRejection}
 from '../../src/reality-signed-model-rejection-reentry-v1.js';
import {shiftDatabase,shiftRpc,assertShiftReadback,
 isShiftDatabaseTransportUnreachable}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {processGovernedEmployeeShiftTick,isIsolatedOriginalProviderOutage}
 from '../../src/reality-governed-employee-shift-worker-v1.js';
import {createOneOpenAICombinedRoleCoordinator}
 from '../../src/reality-one-openai-combined-role-handoff-v1.js';
import {createRileyServiceOriginalRuntime}
 from '../../src/reality-riley-service-original-runtime-v1.js';
import {createRileyTrustedOriginalDriver}
 from '../../src/reality-riley-trusted-original-driver-bridge-v1.js';
import {connectFinalLoopPrSourcePlanToSignedShift}
 from '../../src/reality-final-loop-pr-source-handoff-v1.js';
import {projectFinalLoopUniverseFeedback}
 from '../../src/reality-final-loop-universe-feedback-v1.js';
import {inspectFinalLoopGovernedEngineering}
 from '../../src/reality-final-loop-governed-engineering-v1.js';
import {classifySignedFinalLoopStagedPlanActions,
 reconcileReviewedRecoveryToFinalLoopSource,
 inspectFinalLoopRecoveryContinuation,
 verifyFinalLoopRecoveryContinuityReadback}
 from '../../src/reality-final-loop-staged-plan-action-router-v1.js';
import {requestFinalLoopChildApprovalFromAcceptedOriginal}
 from '../../src/reality-final-loop-child-approval-request-v1.js';
import {advanceOneFinalLoopChildReview}
 from '../../src/reality-final-loop-child-review-worker-v1.js';
import {advanceOneFinalLoopParentIntegration}
 from '../../src/reality-final-loop-parent-integration-worker-v1.js';
import {advanceOneFinalLoopParentDelivery}
 from '../../src/reality-final-loop-parent-delivery-worker-v1.js';
import {runAuthorizedRileyPrReview,
 inspectCurrentRileyPrReviewSourceReadiness,
 shouldFenceRileyPrClaimForObservedIncompatibility}
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
import {inspectFinalLoopOnExistingSignedWorker,
 recordOneFinalLoopEvidenceCheckpoint}
 from '../../src/reality-final-loop-signed-worker-bridge-v1.js';
import {admitVerifiedCurrentShiftCommitTriage,
 reconcileVerifiedCurrentShiftCommitTriage}
 from '../../src/reality-shift-commit-triage-handoff-v1.js';
import {reconcileRealityMixedShiftReceipts}
 from '../../src/reality-mixed-shift-receipts-v1.js';
import {projectRealityAutomaticShiftSupervisor}
 from '../../src/reality-automatic-shift-supervisor-v1.js';
import {projectRealityFinalLoopExecutiveBrief}
 from '../../src/reality-final-loop-executive-brief-v1.js';
import {projectRealityExistingShiftIntegratedIntake}
 from '../../src/reality-existing-shift-integrated-intake-v1.js';
import {automaticallyQualifyVerifiedRepairOpportunity,
 canAutomaticallyQualifyResearchRepairOnSignedWake}
 from '../../src/reality-governed-automatic-repair-qualification-v1.js';
import {advanceSignedRepairScopeOwnerHandoff}
 from '../../src/reality-signed-repair-scope-handoff-v1.js';
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
import {isDurablyCompletedShiftWorkerPulse}
 from '../../src/reality-shift-worker-durable-completion-v1.js';
import {continueSameOriginalRecoveryAfterVerifiedFailure}
 from '../../src/reality-governed-auto-trigger-v1.0.js';
import {stageGeneralizedVerifiedOriginalInstallReview}
 from '../../src/reality-generalized-original-install-review-v1.js';
import {verifyGeneralizedOriginalSourceWriteTransport}
 from '../../src/reality-generalized-original-source-write-canary-v1.js';
import {verifyGeneralOriginalAcceptancePushTransport}
 from '../../src/reality-general-original-acceptance-push-bridge-v1.js';
import {verifyGeneralizedOriginalPreviewAutoDeploy}
 from '../../src/reality-generalized-original-preview-auto-deploy-v1.js';
import {continueGeneralOwnerApprovedOriginalInstall}
 from '../../src/reality-general-original-auto-install-bridge-v1.js';
import {settleGeneralOwnerApprovedOriginal}
 from '../../src/reality-general-original-auto-settlement-bridge-v1.js';
import {continueGeneralOriginalOwnerApprovedRecovery}
 from '../../src/reality-general-original-auto-recovery-publisher-v1.js';
import {investigateGeneralOriginalFencedRecovery}
 from '../../src/reality-general-original-fenced-investigator-v1.js';
import {generateNextSignedChatDevelopmentDraft}
 from '../../src/reality-chat-new-development-worker-v1.js';
import {continueChatNewDevelopmentCandidate}
 from '../../src/reality-chat-new-development-publisher-v1.js';
import {advanceSignedChatFullGoalAcceptance}
 from '../../src/reality-signed-chat-full-goal-acceptance-v1.js';
import {independentlyVerifySignedRecoverySyntax}
 from '../../src/reality-signed-chat-recovery-syntax-verifier-v1.js';
import {requalifyOneFencedSignedChatProvider}
 from '../../src/reality-signed-fenced-provider-requalification-v1.js';
import {stageNextSignedChatRecoveryQuarantine}
 from '../../src/reality-chat-recovery-quarantine-publisher-v1.js';
import {independentlyReviewOneSignedChatRecoveryTarget,independentlyReobserveStalledRecoveryReview}
 from '../../src/reality-signed-chat-recovery-target-review-v1.js';
import {generateOneEmployeeTemporalInquiry}
 from '../../src/reality-dynamic-employee-inquiry-worker-v1.js';
import {runOneStandingEmployeeDiscovery}
 from '../../src/reality-standing-employee-discovery-v1.js';
import {scheduleOneStandingCapability,scheduleOneStandingOperationalRecovery}
 from '../../src/reality-capability-role-schedule-worker-v1.js';
import {advanceExistingOwnerIncidentOriginal}
 from '../../src/reality-incident-existing-original-handoff-v1.js';
import {advanceOneScheduledCapabilityInquiry}
 from '../../src/reality-standing-scheduled-capability-inquiry-v1.js';
import {investigateOneSignedShiftContinuityIncident,classifySignedContinuityClaimTransportError}
 from '../../src/reality-shift-continuity-auto-investigation-v1.js';
import {qualifyVerifiedInvestigationRemediation}
 from '../../src/reality-shift-investigation-remediation-v1.js';
import {advanceOneQualifiedEmployeeEvidenceJob}
 from '../../src/reality-automatic-qualified-evidence-worker-v1.js';
import {admitOneSignedScheduledEvidenceJob}
 from '../../src/reality-signed-schedule-evidence-admission-v1.js';
import {advanceOneShiftContinuityIndependentReview}
 from '../../src/reality-shift-continuity-independent-review-v1.js';
import {reviewOneSignedBusinessQualificationStall}
 from '../../src/reality-shift-business-qualification-review-v1.js';
import {advanceOneSignedInternalMaintenanceJob}
 from '../../src/reality-signed-internal-maintenance-worker-v1.js';
import {reproduceOneSignedMaintenanceFailureBaseline}
 from '../../src/reality-signed-maintenance-failure-baseline-v1.js';
import {executeOneRegisteredMaintenanceAction}
 from '../../src/reality-signed-maintenance-source-requalification-executor-v1.js';
import {executeOneRegisteredMaintenanceCiWake}
 from '../../src/reality-signed-maintenance-case-ci-executor-v1.js';
import {planGovernedCapabilitiesFromOwnerReceipts,
 planCategorizedContinuityRecovery,invokeOneRegisteredSignedCapability}
 from '../../src/reality-evidence-driven-capability-router-v1.js';
import {attestSignedWorkerLoadedCapabilities}
 from '../../src/reality-signed-worker-capability-delivery-v1.js';
import {inspectFinalLoopSignedWorkerOperatingLane}
 from '../../src/reality-signed-worker-operating-lane-v1.js';
import {continueSignedMaintenanceCaseCiVerification}
 from '../../src/reality-signed-maintenance-case-ci-live-verifier-v1.js';
import {reconcileSignedVerifiedMaintenanceArtifact,
 independentlyReviewSignedMaintenanceInstallTarget}
 from '../../src/reality-signed-maintenance-verified-artifact-handoff-v1.js';
import {continueExactOwnerApprovedMaintenanceInstall}
 from '../../src/reality-signed-maintenance-approved-install-bridge-v1.js';
import {routeSignedMaintenanceContinuityTrigger}
 from '../../src/reality-governed-auto-trigger-v1.0.js';
import {advanceVerifiedMaintenanceOriginalHandoff}
 from '../../src/reality-signed-maintenance-original-return-handoff-v1.js';
import {enforceSignedMaintenanceReceiptContinuity}
 from '../../src/reality-signed-maintenance-continuity-enforcement-v1.js';
import {independentlyReconcileSignedMaintenanceInstall}
 from '../../src/reality-signed-maintenance-postinstall-verification-bridge-v1.js';
import {isSignedMaintenanceOriginalLineageMissing}
 from '../../src/reality-signed-maintenance-original-lineage-boundary-v1.js';
import {stageVerifiedSignedOriginalLineagePacket}
 from '../../src/reality-signed-original-lineage-packet-v1.js';
import {classifyRealityGovernedContinuityEvidence,
 classifyRealityContinuityRecoveryHandoff}
 from '../../src/reality-governed-continuity-evidence-classifier-v1.js';
import {advanceSignedExistingMaintenanceRepairHandoff}
 from '../../src/reality-signed-maintenance-repair-handoff-v1.js';
import {generateOneSignedMaintenanceRepairCandidate}
 from '../../src/reality-signed-maintenance-repair-model-candidate-v1.js';
import {independentlyReviewSignedMaintenanceTarget}
 from '../../src/reality-signed-maintenance-candidate-target-review-v1.js';
import {requalifyOneChangedEmployeeSource}
 from '../../src/reality-qualified-source-requalification-v1.js';
import {probeOneSignedInternalBusinessProviderSource}
 from '../../src/reality-signed-internal-business-source-readback-v1.js';
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
 let governedWakeClaimId=null;
 let actualWorkerRunId=null;
 let durableWorkerCompletion=null;
 let workerCompletionAttestedBeforeResponse=false;
 let wakeLeaseReleasedBeforeResponse=false;
 let workerStage='SHIFT_DB_BOUNDARY';
 let shiftDbTransportUnreachable=false;
 try{
  const db=shiftDatabase(process.env);
  activePulseDb=db;
  // A standing shift or discovery grant is not a new execution event.
  // Durable, service-role-only singleton claim prevents concurrent full
  // workers even when a legacy cron wake arrives during active execution.
  // Fail closed if the claim cannot be independently read back.
  workerStage='SHIFT_WORKER_DURABLE_SINGLEFLIGHT';
  const proposedWakeClaimId=crypto.randomUUID();
  // The database can briefly queue PostgREST requests while healthy
  // client SQL still works. Allow one bounded 18s claim attempt, but never
  // retry the write: a timed-out first call might have committed its lease.
  // A missing claim receipt still fails closed; no shift or work is started.
  const governedWakeGate=await shiftRpc(
   db,'reality_claim_governed_shift_worker_run_v1',
   {p_claim_id:proposedWakeClaimId},
   {timeoutMs:18000}
  );
  if(governedWakeGate?.status==='WAKE_COALESCED_ACTIVE_OR_COOLDOWN' &&
     governedWakeGate.original_job_completed===false &&
     governedWakeGate.installation_authorized===false)
   return res.status(202).json({
    status:'WAKE_COALESCED_ACTIVE_OR_COOLDOWN',
    worker_started:false,work_completed:false,
    installation_authorized:false,production_changed:false
   });
  if(governedWakeGate?.status!=='WAKE_CLAIMED' ||
     governedWakeGate.claim_id!==proposedWakeClaimId ||
     governedWakeGate.original_job_completed!==false ||
     governedWakeGate.installation_authorized!==false)
   throw Error('GOVERNED_SHIFT_WORKER_LEASE_READBACK_UNVERIFIED');
  governedWakeClaimId=proposedWakeClaimId;
  // Cron SQL success is only queued HTTP; this durable receipt proves the
  // authenticated server worker actually entered its lifecycle.
  actualWorkerRunId=crypto.randomUUID();
  const realRun=await shiftRpc(db,'reality_record_signed_worker_actual_run_v1',{
   p_run_id:actualWorkerRunId,
   p_status:'STARTED',p_stage:'SHIFT_DB_BOUNDARY'
  });
  if(realRun?.status!=='SIGNED_WORKER_RUN_STARTED'||
     realRun.run_id!==actualWorkerRunId||
     realRun.actual_worker_process_seen!==true||
     realRun.original_job_completed!==false||
     realRun.repair_executed!==false||
     realRun.installation_authorized!==false||
     realRun.production_changed!==false)
    throw Error('SIGNED_WORKER_REAL_PROCESS_START_NOT_DURABLE');
  // Explicitly authenticated, preview-only source staging for the SAME
  // signed worker and its durable lease/run. This is NOT a second worker
  // and never invokes a model, approves work, or publishes to a provider.
  // Normal signed-shift wakes are unchanged when this flag is absent.
  if(process.env.REALITY_FINAL_LOOP_PREVIEW_SOURCE_PLAN_WAKE_ONLY==='true'){
   workerStage='FINAL_LOOP_SOURCE_PLAN_PREVIEW_ONLY';
   const e=process.env;
   if(e.VERCEL_ENV!=='preview'||
      e.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED!=='true'||
      e.REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED!=='true'||
      e.REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED!=='true'||
      e.REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED!=='true'||
      e.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'||
      e.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true'||
      e.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED==='true'||
      db.project!==e.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF||
      db.project!==e.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
    throw Error('FINAL_LOOP_SOURCE_PREVIEW_AUTHORITY_FENCE');
   const sourceGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
    'reality_read_current_shift_execution_graph_v1',{}),{
     expectedShiftId:e.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID
    });
   if(sourceGraph.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
      sourceGraph.owner_id!==e.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID||
      sourceGraph.shift_id!==e.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID||
      sourceGraph.installation_authorized!==false||
      sourceGraph.production_changed!==false)
    throw Error('FINAL_LOOP_SOURCE_PREVIEW_SIGNED_SCOPE_MISMATCH');
   const sourceInspection=await inspectCurrentRileyPrReviewSourceReadiness({
    graph:sourceGraph,env:e,fetchImpl:fetch
   });
   const sourceHandoff=await connectFinalLoopPrSourcePlanToSignedShift({
    db,graph:sourceGraph,inspection:sourceInspection,
    workerRunId:actualWorkerRunId,env:e,fetchImpl:fetch
   });
   // Source inspection failure may NOT be reported as a successful stage.
   // A missing manifest or refused write is a bounded diagnostic, not work.
   const expectedStatus='FINAL_LOOP_PROPOSED_SOURCE_PLANS_DURABLY_STAGED_NOT_EXECUTABLE';
   const staged=sourceHandoff.status===expectedStatus&&
    sourceHandoff.owner_id===sourceGraph.owner_id&&
    sourceHandoff.shift_id===sourceGraph.shift_id&&
    sourceHandoff.staging_target==='SHARED_BENCHMARK_PROPOSALS_ONLY'&&
    sourceHandoff.child_execution_authorized===false&&
    sourceHandoff.owner_approval_granted===false&&
    sourceHandoff.original_job_completed===false&&
    Array.isArray(sourceHandoff.staging_receipts)&&
    sourceHandoff.staging_receipts.length>0&&
    sourceHandoff.staging_receipts.every(x=>x.source_plan_staged===true);
   // Independent service-role readback; the model and staging worker
   // cannot self-certify a durable plan from a local return object.
   const [plansReadback,approvalPreflight]=await Promise.all([
    shiftRpc(db,'reality_read_final_loop_pr_source_plans_v1',{
     p_shift_id:sourceGraph.shift_id
    },{timeoutMs:6000}),
    shiftRpc(db,'reality_read_final_loop_child_approval_preflight_v1',{
     p_shift_id:sourceGraph.shift_id
    },{timeoutMs:6000}).catch(()=>null)
   ]);
   const stagedActionRoutes=classifySignedFinalLoopStagedPlanActions({
    graph:sourceGraph,staged:plansReadback,preflight:approvalPreflight
   });
   const linked=staged&&
    plansReadback?.shift_id===sourceGraph.shift_id&&
    plansReadback?.owner_id===sourceGraph.owner_id&&
    plansReadback?.read_only===true&&
    Array.isArray(plansReadback?.plans)&&
    sourceHandoff.staging_receipts.every(s=>plansReadback.plans.some(p=>
     p.plan_id===s.plan_id&&p.source_ref===s.source_ref));
   // Return a safe diagnostic if the preflight cannot stage; never
   // synthesize owner approval or continue into other worker lanes.
   const attested=await shiftRpc(db,
    'reality_record_signed_worker_actual_run_v1',{
     p_run_id:actualWorkerRunId,p_status:'COMPLETED',
     p_stage:workerStage
    });
   workerCompletionAttestedBeforeResponse=
    attested?.status==='SIGNED_WORKER_RUN_COMPLETED'&&
    attested.run_id===actualWorkerRunId&&
    attested.original_job_completed===false&&
    attested.installation_authorized===false&&
    attested.production_changed===false;
   if(!workerCompletionAttestedBeforeResponse)
    throw Error('FINAL_LOOP_PREVIEW_SIGNED_WORKER_ATTESTATION_UNVERIFIED');
   const released=await shiftRpc(db,
    'reality_release_governed_shift_worker_run_v1',{
     p_claim_id:governedWakeClaimId
    });
   wakeLeaseReleasedBeforeResponse=
    released?.status==='WAKE_RELEASED'&&
    released.original_job_completed===false&&
    released.installation_authorized===false;
   if(!wakeLeaseReleasedBeforeResponse)
    throw Error('FINAL_LOOP_PREVIEW_WORKER_LEASE_RELEASE_UNVERIFIED');
   return res.status(200).json({
    status:linked?'FINAL_LOOP_SIGNED_SOURCE_PLANS_STAGED_AND_READ_BACK':
     'FINAL_LOOP_SIGNED_SOURCE_PLAN_STAGING_UNVERIFIED',
    source_inspection_status:sourceInspection?.status||null,
    source_diagnostics:(sourceInspection?.source_diagnostics||[]).map(x=>({
     source_ref:x.source_ref,
     eligibility_status:x.eligibility_status,
     source_manifest_status:x.large_source_qualification?.status||null,
     source_manifest_complete:x.large_source_qualification?.source_manifest_complete===true
    })),
    final_loop_source_handoff_status:sourceHandoff.status,
    staging_target:'SHARED_BENCHMARK_PROPOSALS_ONLY',
    staged_plan_count:linked?sourceHandoff.staging_receipts.length:0,
    durable_source_plan_readback_verified:Boolean(linked),
    final_loop_staged_action_routes:stagedActionRoutes,
    final_loop_governed_engineering:{
     status:'ENGINEERING_SIGNED_CODING_WORKER_NOT_REACHED_STAGING_ONLY',
     read_only:true,model_invoked:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     next_governed_action:
      'VERIFY_SIGNED_ENGINEERING_WORKER_RELEASE_AND_CANONICAL_ORIGINAL_WARRANT'
    },
    signed_worker_release_operating_lane:inspectFinalLoopSignedWorkerOperatingLane({
     env:e,dbProject:db.project
    }),
    signed_worker_run_recorded:true,
    owner_approval_granted:false,child_execution_authorized:false,
    model_invoked:false,github_write_performed:false,
    original_job_completed:false,shift_completed:false,
    production_changed:false
   });
  }
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
  workerStage='SHIFT_WAKE_RECEIPT';
  const wakeReceipt=await shiftRpc(db,
   'reality_record_current_shift_worker_pulse_v1',
   {p_status:'WAKE_RECEIVED',p_safe_result:null});
  if(!['SHIFT_WORKER_PULSE_DURABLY_RECORDED',
    'NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE'].includes(wakeReceipt?.status)||
     wakeReceipt.installation_authorized!==false)
   throw Error('WORKER_WAKE_DATABASE_READBACK_UNVERIFIED');
  if(wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED')
   activePulseShiftId=wakeReceipt.shift_id;
  // Continuous, standing EVIDENCE qualification intake: all existing employee
  // schedule, capabilities, incidents, Chat work and signed shift steps.
  // The source-neutral database function deduplicates by authoritative ledger
  // identity and NEVER admits a new original or changes owner authority.
  // Its failure is visible but cannot strand an already authorized shift.
  workerStage='CONTINUOUS_QUALIFICATION_INBOX_RECONCILIATION';
  const continuousQualificationInbox=await shiftRpc(db,
   'reality_reconcile_continuous_qualification_inbox_v1',
   {p_worker_run_id:actualWorkerRunId},{timeoutMs:12000}
  ).then(r=>{
   if(r?.status!=='CONTINUOUS_QUALIFICATION_INBOX_DURABLY_RECONCILED'||
      r.worker_run_id!==actualWorkerRunId||
      r.new_shift_started!==false||
      r.new_original_job_admitted!==false||
      r.owner_approval_granted!==false||
      r.execution_authorized!==false||
      r.installation_authorized!==false||
      r.production_changed!==false)
    throw Error('CONTINUOUS_QUALIFIER_AUTHORITY_READBACK_INVALID');
   return r;
  }).catch(e=>({
   status:'CONTINUOUS_QUALIFICATION_INBOX_RECONCILIATION_UNVERIFIED',
   failure_code:String(e?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
     'SIGNED_DATABASE_INTAKE_UNAVAILABLE':'INTAKE_RECEIPT_UNVERIFIED',
   new_shift_started:false,new_original_job_admitted:false,
   execution_authorized:false,installation_authorized:false,
   production_changed:false
  }));
  // Reconcile the SAME governed source identities into their next lawful
  // Continuity transition. This is evidence-only routing, not an LLM dispatch,
  // original admission, approval, installation, or replay. A missing receipt
  // is visible and cannot authorize the next stage by default.
  workerStage='CONTINUITY_QUALIFICATION_GOVERNED_ROUTE';
  const continuityQualificationRoutes=
    continuousQualificationInbox.status===
     'CONTINUOUS_QUALIFICATION_INBOX_DURABLY_RECONCILED'?
     await shiftRpc(db,'reality_reconcile_continuity_qualification_routes_v1',
      {p_worker_run_id:actualWorkerRunId},{timeoutMs:12000})
      .then(r=>{
       if(r?.status!=='CONTINUITY_QUALIFICATION_ROUTES_RECONCILED'||
          r.worker_run_id!==actualWorkerRunId||
          r.model_execution_authorized!==false||
          r.owner_approval_granted!==false||
          r.new_original_admitted!==false||
          r.new_shift_started!==false||
          r.installation_authorized!==false||
          r.production_changed!==false)
        throw Error('CONTINUITY_QUALIFICATION_ROUTE_AUTHORITY_INVALID');
       return r;
      }).catch(e=>({
       status:'CONTINUITY_QUALIFICATION_ROUTE_UNVERIFIED',
       failure_code:String(e?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
        'SIGNED_CONTINUITY_DB_UNAVAILABLE':'ROUTE_PROOF_UNVERIFIED',
       model_execution_authorized:false,owner_approval_granted:false,
       new_original_admitted:false,new_shift_started:false,
       installation_authorized:false,production_changed:false
      })):
     {status:'CONTINUITY_QUALIFICATION_INTAKE_NOT_VERIFIED',
      model_execution_authorized:false,owner_approval_granted:false,
      new_original_admitted:false,new_shift_started:false,
      installation_authorized:false,production_changed:false};
  // PRE-EFFECT BOUNDARY: after Reality's actual continuous intake and
  // qualifier, but BEFORE its business/maintenance executors and models.
  // Consume the EXISTING Continuity root and independent qualifier/verifier
  // source proof. This is a prerequisite, never a new approval or authority.
  workerStage='SHARED_CONTINUITY_VERIFIER_PREEXECUTION_FENCE';
  const strictContinuityCycle=
   process.env.REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED==='true';
  let finalLoopContinuityIngress={
   status:'SHARED_CONTINUITY_PREEXECUTION_FENCE_NOT_ENABLED',
   read_only:true,execution_authorized:false,
   original_job_completed:false
  };
  if(strictContinuityCycle&&
     wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'){
   const ingressGraph=assertRealityUnifiedShiftGraph(
    await shiftRpc(db,'reality_read_current_shift_execution_graph_v1',{}),{
     expectedShiftId:wakeReceipt.shift_id
    });
   finalLoopContinuityIngress=await inspectFinalLoopOnExistingSignedWorker({
    db,wake:wakeReceipt,graph:ingressGraph,env:process.env,fetchImpl:fetch
   });
   if(finalLoopContinuityIngress.status!==
       'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'||
      finalLoopContinuityIngress.shared_continuity_guard?.status!==
       'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
      finalLoopContinuityIngress.owner_id!==ingressGraph.owner_id||
      finalLoopContinuityIngress.shift_id!==wakeReceipt.shift_id||
      finalLoopContinuityIngress.shared_continuity_guard.shift_id!==
       wakeReceipt.shift_id||
      finalLoopContinuityIngress.shared_continuity_guard.owner_id!==
       ingressGraph.owner_id||
      finalLoopContinuityIngress.shared_continuity_guard.revision!==
       finalLoopContinuityIngress.revision||
      finalLoopContinuityIngress.shared_continuity_guard.continuity_head_sha256!==
       finalLoopContinuityIngress.continuity_head_sha256||
      finalLoopContinuityIngress.shared_continuity_guard.execution_authorized!==false||
      finalLoopContinuityIngress.shared_continuity_guard.original_job_completed!==false)
    throw Error('FINAL_LOOP_SHARED_CONTINUITY_PREEXECUTION_FENCE_REJECTED');
  }
  if(strictContinuityCycle&&
     wakeReceipt.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED')
   throw Error('FINAL_LOOP_SHARED_CONTINUITY_NO_SIGNED_WORKER_SCOPE');

  // Existing signed worker performs ONLY independent readback before choosing
  // a registered business executor. Owner approval never directly invokes it.
  // An installed handler must independently check the one-use claim.
  workerStage='EXACT_APPROVED_BUSINESS_EFFECT_SIGNED_HANDOFF';
  const exactApprovedBusinessEffectHandoff=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
   await shiftRpc(db,'reality_read_next_signed_business_effect_handoff_v1',{
    p_worker_run_id:actualWorkerRunId
   },{timeoutMs:12000}).then(r=>{
    if(![
     'NO_OWNER_APPROVED_BUSINESS_EFFECT_TO_HANDOFF',
     'SIGNED_BUSINESS_EFFECT_CURRENT_WORKER_LEASE_REQUIRED',
     'SIGNED_BUSINESS_EFFECT_SOURCE_OR_ADAPTER_DRIFT_NO_DISPATCH',
     'EXACT_APPROVED_BUSINESS_EFFECT_REGISTERED_HANDLER_REQUIRED'
    ].includes(r?.status)||
      r.execution_authorized_by_read!==false||
      r.effect_reserved!==false||
      r.original_job_completed!==false||
      r.production_changed!==false)
     throw Error('SIGNED_BUSINESS_EFFECT_HANDOFF_RECEIPT_INVALID');
    if(r.status==='EXACT_APPROVED_BUSINESS_EFFECT_REGISTERED_HANDLER_REQUIRED'&&(
      r.shift_id!==wakeReceipt.shift_id||
      !/^[a-f0-9-]{36}$/i.test(r.packet_id||'')||
      !/^work:[a-f0-9]{32}$/.test(r.original_work_id||'')||
      !/^reality_[a-z0-9_]+_v[0-9]+$/.test(
       r.registered_execution_adapter||'')||
      !/^sha256:[a-f0-9]{64}$/.test(r.approval_receipt_sha256||'')||
      r.owner_exact_one_use_approval_verified!==true||
      r.handler_installed_and_verified_by_read!==false))
     throw Error('SIGNED_BUSINESS_EFFECT_APPROVED_SOURCE_INVALID');
    return r;
   }).catch(()=>({
    status:'EXACT_BUSINESS_EFFECT_SIGNED_SERVICE_READBACK_UNVERIFIED',
    next_action:'RECHECK_OWNER_APPROVAL_AND_REGISTERED_EXECUTOR',
    effect_reserved:false,original_job_completed:false,
    execution_authorized_by_read:false,production_changed:false
   })):
   {status:'NO_VERIFIED_SIGNED_BUSINESS_EFFECT_WORKER_PULSE',
    effect_reserved:false,original_job_completed:false,
    execution_authorized_by_read:false,production_changed:false};
  // First real INTERNAL company source connection proof: reobserve an
  // already signed owner GitHub issue/PR with Reality's installed provider
  // reader. This is an optional, bounded two-GET source probe, never an
  // external customer connector or an executable original. It cannot
  // interrupt an already warranted maintenance shift.
  workerStage='SIGNED_INTERNAL_BUSINESS_PROVIDER_REOBSERVATION';
  const internalBusinessProviderSource=
   continuityQualificationRoutes.status==='CONTINUITY_QUALIFICATION_ROUTES_RECONCILED'?
    await probeOneSignedInternalBusinessProviderSource({
     db,env:process.env,workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(e=>({
     status:String(e?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
      'SIGNED_INTERNAL_SOURCE_DATABASE_UNAVAILABLE':
      'SIGNED_INTERNAL_SOURCE_PROVIDER_PROOF_UNAVAILABLE',
     internal_company_provider_source_verified:false,
     customer_source_connection_verified:false,
     original_job_admitted:false,owner_approval_granted:false,
     model_execution_authorized:false,new_shift_started:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'SIGNED_CONTINUITY_SOURCE_ROUTING_NOT_PROVEN',
     internal_company_provider_source_verified:false,
     customer_source_connection_verified:false,
     original_job_admitted:false,owner_approval_granted:false,
     model_execution_authorized:false,new_shift_started:false,
     installation_authorized:false,production_changed:false};
  // A current provider source remains an observation until it enters exact
  // owner-goal qualification, itemized approval, governed job execution,
  // independent original acceptance and Universe reconciliation.
  // A detected stall is not a model guess or a reason to start another shift.
  // It is a durable independently observed incident; investigate it on THIS
  // signed wake before normal employee discovery, preserving exact authority.
  workerStage='SIGNED_CHAT_RECOVERY_REVIEW_INCIDENT_OBSERVATION';
  const signedChatReviewIncidentObservation=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await shiftRpc(db,'reality_observe_signed_chat_review_incident_v1',{
     p_shift_id:wakeReceipt.shift_id,p_worker_run_id:actualWorkerRunId
    }).then(r=>{
     if(r?.status!=='SIGNED_CHAT_REVIEW_INCIDENTS_OBSERVED'||
      r.worker_run_id!==actualWorkerRunId||
      !Number.isInteger(r.new_incident_count)||r.new_incident_count<0||
      r.new_original_admitted!==false||r.new_shift_started!==false||
      r.execution_authorized!==false||r.installation_authorized!==false||
      r.original_job_completed!==false||r.production_changed!==false)
      throw Error('SIGNED_CHAT_REVIEW_INCIDENT_RECEIPT_UNVERIFIED');
     return r;
    }).catch(()=>({status:'SIGNED_CHAT_REVIEW_INCIDENT_OBSERVATION_UNVERIFIED',
     execution_authorized:false,installation_authorized:false,
     original_job_completed:false,production_changed:false})):
    {status:'NO_CURRENT_SIGNED_CHAT_REVIEW_INCIDENT_SCOPE',
     execution_authorized:false,installation_authorized:false,
     original_job_completed:false,production_changed:false};
  // An exhausted investigation is not restarted. A distinct signed wake may
  // qualify only an independently tested, current-release correction.
  workerStage='SIGNED_SHIFT_INVESTIGATION_REMEDIATION_QUALIFICATION';
  const shiftInvestigationRemediation=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await qualifyVerifiedInvestigationRemediation({db,env:process.env,
     shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({status:'SIGNED_SHIFT_INVESTIGATION_REMEDIATION_UNVERIFIED',
     execution_authorized:false,installation_authorized:false,
     original_job_completed:false,production_changed:false})):
    {status:'NO_CURRENT_SIGNED_SHIFT_REMEDIATION_SCOPE',
     execution_authorized:false,installation_authorized:false,
     original_job_completed:false,production_changed:false};
  workerStage='SOURCE_BACKED_SHIFT_CONTINUITY_SELF_OBSERVATION';
  const shiftContinuityInvestigation=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await investigateOneSignedShiftContinuityIncident({
     db,env:process.env,shiftId:wakeReceipt.shift_id,fetchImpl:fetch
    }).catch(error=>({
     status:'SHIFT_CONTINUITY_INVESTIGATION_PROOF_UNAVAILABLE',
     failure_code:classifySignedContinuityClaimTransportError(error),
     new_original_jobs_created:0,execution_authorized:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_CURRENT_SIGNED_SHIFT_CONTINUITY_SCOPE',
     new_original_jobs_created:0,execution_authorized:false,
     installation_authorized:false,production_changed:false};
  // An independently investigated rejected model proposal is unfinished work,
  // not a terminal state. Preserve its original and all negative receipts;
  // only current-source CI after the failure may re-enter the same spec.
  workerStage='SIGNED_MODEL_REJECTION_CONTINUITY_REENTRY';
  const signedModelRejectionReentry=wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
   await advanceInvestigatedSignedModelRejection({db,env:process.env,
    shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,fetchImpl:fetch
   }):{status:'NO_CURRENT_SIGNED_MODEL_REJECTION_REENTRY_SCOPE',
    installation_authorized:false,original_job_completed:false,production_changed:false};
  // An exact signed model decision invokes ONLY an installed governed route.
  // A different signed worker later independently rechecks its actual effect.
  workerStage='SIGNED_CONTINUITY_RECOVERY_INDEPENDENT_RECHECK';
  const signedContinuityRecoveryVerification=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await shiftRpc(db,'reality_verify_signed_continuity_recovery_v1',{
     p_shift_id:wakeReceipt.shift_id,p_worker_run_id:actualWorkerRunId
    }).then(r=>{
     if(![
      'NO_CURRENT_INDEPENDENT_SIGNED_REVIEW_SCOPE',
      'NO_DISTINCT_WORKER_RECOVERY_REVIEW_READY',
      'SOURCE_REQUALIFICATION_VERIFIED_BUSINESS_WARRANT_STILL_MISSING',
      'SOURCE_REQUALIFICATION_VERIFIED_ORIGINAL_STILL_UNQUALIFIED',
      'SIGNED_SOURCE_REQUALIFICATION_VERIFIED_NEW_ORIGINAL_ADMITTED'
     ].includes(r?.status)||r.original_resumed!==false||
      r.execution_authorized!==false||
      r.installation_authorized!==false||r.production_changed!==false)
      throw Error('SIGNED_CONTINUITY_RECOVERY_REVIEW_RECEIPT_INVALID');
     return r;
    }).catch(()=>({
     status:'SIGNED_CONTINUITY_RECOVERY_REVIEW_PROOF_UNAVAILABLE',
     original_resumed:false,execution_authorized:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_CURRENT_INDEPENDENT_SIGNED_REVIEW_SCOPE',
     original_resumed:false,execution_authorized:false,
     installation_authorized:false,production_changed:false};
  workerStage='SIGNED_CONTINUITY_GOVERNED_RECOVERY_ACTION';
  const signedContinuityRecoveryAction=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await shiftRpc(db,'reality_execute_signed_continuity_recovery_v1',{
     p_shift_id:wakeReceipt.shift_id,p_worker_run_id:actualWorkerRunId
    },{timeoutMs:12000}).then(r=>{
     if(![
      'SIGNED_RECOVERY_CURRENT_AUTHORIZED_WORKER_REQUIRED',
      'NO_SOURCE_VERIFIED_SIGNED_RECOVERY_INCIDENT_READY',
      'SIGNED_RECOVERY_ACTION_ALREADY_RECORDED_NO_REPLAY',
      'GOVERNED_RECOVERY_ACTION_HAS_NO_PROVEN_INSTALLED_ADAPTER',
      'SIGNED_RECOVERY_SOURCE_REQUALIFICATION_EXECUTED_AWAITING_INDEPENDENT_CHECK'
     ].includes(r?.status)||r.original_resumed!==false||
      r.execution_authorized!==false||
      r.installation_authorized!==false||r.production_changed!==false)
      throw Error('SIGNED_CONTINUITY_RECOVERY_ACTION_RECEIPT_INVALID');
     return r;
    }).catch(()=>({
     status:'SIGNED_CONTINUITY_RECOVERY_ACTION_PROOF_UNAVAILABLE',
     original_resumed:false,execution_authorized:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_SOURCE_VERIFIED_SIGNED_RECOVERY_INCIDENT_READY',
     original_resumed:false,execution_authorized:false,
     installation_authorized:false,production_changed:false};
  // A DIFFERENT signed worker, not the diagnosing model, re-observes
  // the actual provider source for the assigned independent reviewer.
  workerStage='INDEPENDENT_SHIFT_CONTINUITY_SOURCE_REVIEW';
  const continuityIndependentReview=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await advanceOneShiftContinuityIndependentReview({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'CONTINUITY_INDEPENDENT_PROVIDER_REVIEW_UNVERIFIED',
     failure_code:error?.message==='SHIFT_RPC_NOT_ALLOWLISTED'?
      'SHARED_RPC_TRANSPORT_NOT_CONNECTED':
      String(error?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
       'SIGNED_DATABASE_RPC_UNAVAILABLE':
       String(error?.message||'').startsWith('CONTINUITY_INDEPENDENT_REVIEW_')?
        'SIGNED_REVIEW_PROOF_UNVERIFIED':'REVIEW_RUNTIME_UNVERIFIED',
     original_job_completed:false,repair_executed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_SIGNED_CONTINUITY_REVIEW_SCOPE',
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
  // Business job qualification has a DISTINCT independent check: neither
  // source-evidence jobs nor model proposals can be counted as originals.
  // This reads the existing owner-scoped ledger and current provider source.
  workerStage='INDEPENDENT_BUSINESS_ORIGINAL_QUALIFICATION_REVIEW';
  const businessQualificationReview=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await reviewOneSignedBusinessQualificationStall({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'BUSINESS_QUALIFICATION_REVIEW_UNVERIFIED',
     failure_code:String(error?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
      'SIGNED_BUSINESS_QUALIFICATION_RPC_UNAVAILABLE':
      String(error?.message||'').startsWith('BUSINESS_QUALIFICATION_')?
       'INDEPENDENT_BUSINESS_QUALIFICATION_SCOPE_INVALID':
       'BUSINESS_QUALIFICATION_REVIEW_RUNTIME_UNVERIFIED',
     original_job_completed:false,repair_executed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_ACTIVE_SIGNED_BUSINESS_QUALIFICATION_SCOPE',
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
  // Maintenance jobs survive their originating shift. A DIFFERENT active
  // signed owner shift may investigate the SAME internal failure, but no
  // permission to install code or settle customer work is created.
  workerStage='SIGNED_INTERNAL_MAINTENANCE_EMPLOYEE_SOURCE_RECHECK';
  const internalMaintenanceWork=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await advanceOneSignedInternalMaintenanceJob({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_INTERNAL_MAINTENANCE_WORK_UNVERIFIED',
     failure_code:String(error?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
      'SIGNED_MAINTENANCE_DATABASE_UNAVAILABLE':
      String(error?.message||'').startsWith('SIGNED_INTERNAL_MAINTENANCE_')?
       'SIGNED_MAINTENANCE_SCOPE_OR_PROOF_INVALID':
       'SIGNED_MAINTENANCE_RUNTIME_UNVERIFIED',
     customer_job_completed:false,new_customer_work_created:false,
     repair_executed:false,installation_authorized:false,
     production_changed:false
    })):
    {status:'NO_ACTIVE_OWNER_SHIFT_FOR_INTERNAL_MAINTENANCE',
     customer_job_completed:false,new_customer_work_created:false,
     repair_executed:false,installation_authorized:false,
     production_changed:false};
  // A SEPARATE signed worker run independently reconstructs one historical
  // failure baseline. This does not prove a failing executable CI test, create
  // a model patch, install code, or settle any customer original.
  workerStage='SIGNED_INTERNAL_MAINTENANCE_INDEPENDENT_FAILURE_BASELINE';
  const maintenanceFailureBaseline=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await reproduceOneSignedMaintenanceFailureBaseline({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_MAINTENANCE_INDEPENDENT_BASELINE_UNVERIFIED',
     failure_code:String(error?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
      'SIGNED_BASELINE_RPC_UNAVAILABLE':
      String(error?.message||'').startsWith('SIGNED_MAINTENANCE_BASELINE_')?
       'SIGNED_BASELINE_SCOPE_OR_PROVIDER_UNVERIFIED':
       'SIGNED_BASELINE_RUNTIME_UNVERIFIED',
     historical_baseline_verified:false,
     executable_frozen_ci_red_verified:false,model_code_generated:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_ACTIVE_OWNER_SHIFT_FOR_MAINTENANCE_BASELINE',
     historical_baseline_verified:false,
     executable_frozen_ci_red_verified:false,model_code_generated:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false};
  // Owner-warranted maintenance CI preflight reads the SAME signed shift,
  // signed worker and exact maintenance ID after the historical baseline.
  // This is not the CI runner: a fresh pinned provider epoch and real
  // independently failing frozen test still have to be obtained.
  workerStage='SIGNED_INTERNAL_MAINTENANCE_CI_PREFLIGHT';
  const signedMaintenanceCiPreflight=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await shiftRpc(db,'reality_read_signed_maintenance_ci_preflight_v1',{
     p_shift_id:wakeReceipt.shift_id,
     p_worker_run_id:actualWorkerRunId
    }).then(receipt=>{
     if(![
      'SIGNED_MAINTENANCE_CI_PREFLIGHT_NEEDS_SOURCE_ATTESTATION',
      'NO_SIGNED_MAINTENANCE_FROZEN_CI_SCOPE'
     ].includes(receipt?.status)||
      receipt.read_only!==true||
      receipt.executable_frozen_ci_red_verified!==false||
      receipt.repair_executed!==false||
      receipt.original_job_completed!==false||
      receipt.installation_authorized!==false||
      receipt.production_changed!==false||
      (receipt.status==='SIGNED_MAINTENANCE_CI_PREFLIGHT_NEEDS_SOURCE_ATTESTATION'&&
       (receipt.shift_id!==wakeReceipt.shift_id||
        !/^[a-f0-9-]{36}$/i.test(receipt.maintenance_id||'')||
        !/^sha256:[a-f0-9]{64}$/.test(receipt.independent_failure_baseline_receipt_sha256||'')||
        receipt.source_current_epoch_verified!==false||
        receipt.next_action!=='RECHECK_EXACT_PROVIDER_SOURCE_AND_RUN_INDEPENDENT_FROZEN_CI_RED')))
      throw Error('SIGNED_MAINTENANCE_CI_UNTRUSTED_PREFLIGHT_RECEIPT');
     return receipt;
    }).catch(()=>({
     status:'SIGNED_MAINTENANCE_CI_PREFLIGHT_PROOF_UNAVAILABLE',
     read_only:true,executable_frozen_ci_red_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_CURRENT_SIGNED_MAINTENANCE_CI_PREFLIGHT',
     read_only:true,executable_frozen_ci_red_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false};
  // The existing signed worker independently reads the currently observed
  // GitHub source twice and durably binds the exact maintenance incident
  // and review/baseline to that source epoch. An epoch change is recorded,
  // not silently treated as executable frozen CI RED or a completed repair.
  workerStage='SIGNED_MAINTENANCE_CI_CURRENT_PROVIDER_SOURCE_ATTESTATION';
  const maintenanceCiSourceEpoch=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await attestOneSignedMaintenanceCiSourceEpoch({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,
     preflight:signedMaintenanceCiPreflight,fetchImpl:fetch
    }).catch(error=>({
     status:String(error?.message||'').startsWith('SHIFT_DATABASE_RPC_')?
      'SIGNED_MAINTENANCE_CI_SOURCE_DATABASE_UNAVAILABLE':
      'SIGNED_MAINTENANCE_CI_SOURCE_PROOF_UNVERIFIED',
     source_current_epoch_verified:false,
     independent_frozen_ci_red_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_SIGNED_MAINTENANCE_CI_SOURCE_SCOPE',
     source_current_epoch_verified:false,
     independent_frozen_ci_red_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false};
  // Governed maintenance handoff classifier. A source-epoch receipt is a
  // prerequisite for routing, never proof that CI ran or repair succeeded.
  // The actual executor must separately claim and verify this exact scope.
  workerStage='SIGNED_MAINTENANCE_EPOCH_HANDOFF_CLASSIFICATION';
  const maintenanceEpochHandoff=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   maintenanceCiSourceEpoch?.source_epoch_receipt_sha256&&
   /^sha256:[a-f0-9]{64}$/.test(maintenanceCiSourceEpoch.source_epoch_receipt_sha256)&&
   maintenanceCiSourceEpoch?.installation_authorized===false&&
   maintenanceCiSourceEpoch?.production_changed===false?
    Object.freeze({
     status:maintenanceCiSourceEpoch.epoch_status===
      'SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'?
       'MAINTENANCE_CI_RED_HANDOFF_REQUIRES_INDEPENDENT_EXECUTOR':
      maintenanceCiSourceEpoch.epoch_status===
      'SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED'?
       'MAINTENANCE_SOURCE_REQUALIFICATION_HANDOFF_REQUIRES_EXECUTOR':
       'MAINTENANCE_EPOCH_HANDOFF_NOT_QUALIFIED',
     source_epoch_receipt_sha256:maintenanceCiSourceEpoch.source_epoch_receipt_sha256,
     executable_frozen_ci_red_verified:false,
     handoff_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false
    }):
    {status:'NO_VERIFIED_MAINTENANCE_EPOCH_HANDOFF',
     executable_frozen_ci_red_verified:false,handoff_executed:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
  // Independent Quinn review of staged historical GitHub evidence under the
  // same signed maintenance warrant. Historical regression != case-specific RED.
  workerStage='SIGNED_INDEPENDENT_MAINTENANCE_EXTERNAL_EVIDENCE_REVIEW';
  const signedExternalMaintenanceReview=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await independentlyReviewOneStagedMaintenanceRegression({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({
     status:'SIGNED_EXTERNAL_MAINTENANCE_REVIEW_PROOF_UNAVAILABLE',
     independent_maintenance_ci_red_attested:false,
     repair_executed:false,installation_authorized:false,
     original_job_completed:false,production_changed:false
    })):
    {status:'NO_SIGNED_EXTERNAL_REVIEW_WAKE',
     independent_maintenance_ci_red_attested:false,
     repair_executed:false,installation_authorized:false,
     original_job_completed:false,production_changed:false};

  // Link the existing original work ID to its actual authorization and
  // independently observed final receipt. Read-only: no fresh work, no reset.
  workerStage='SAME_ORIGINAL_CONTINUATION_AND_FINAL_RECEIPT_READBACK';
  const sameOriginalPostmaintenanceGate=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await shiftRpc(db,'reality_read_same_original_postmaintenance_gate_v1',{
     p_shift_id:wakeReceipt.shift_id
    }).then(result=>{
     if(![
      'EXISTING_ORIGINAL_HAS_INDEPENDENT_FINAL_RECEIPT',
      'EXISTING_ORIGINAL_NOT_AUTHORIZED_BY_MAINTENANCE_SHIFT',
      'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
      'EXISTING_ORIGINAL_BLOCKED_REQUALIFICATION_REQUIRED',
      'EXISTING_ORIGINAL_GOVERNED_EXECUTION_REQUIRES_FRESH_ACCEPTANCE',
      'NO_EXISTING_SAME_ORIGINAL_FOR_SHIFT'
     ].includes(result?.status)||
      result.original_job_completed===true&&
        result.independent_final_receipt_verified!==true||
      result.installation_authorized!==false||
      result.new_job_created!==false||
      result.production_changed===true)
      throw Error('SAME_ORIGINAL_CONTINUATION_UNTRUSTED');
     return result;
    }).catch(()=>({
     status:'SAME_ORIGINAL_CONTINUATION_READBACK_UNAVAILABLE',
     original_job_completed:false,
     independent_final_receipt_verified:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_SAME_ORIGINAL_CONTINUATION_WAKE',
     original_job_completed:false,
     independent_final_receipt_verified:false,
     installation_authorized:false,production_changed:false};
  // Bind only the ALREADY EXISTING source PR claim to the original-review
  // evidence. A separate service read checks the persisted packet. This is
  // not a new customer-original admission or an execution authorization.
  workerStage='SIGNED_ORIGINAL_EVIDENCE_LINEAGE_BINDING';
  const signedOriginalLineageEvidence=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   /^[a-f0-9-]{36}$/i.test(actualWorkerRunId||'')&&
   isSignedMaintenanceOriginalLineageMissing(sameOriginalPostmaintenanceGate)?
    await stageVerifiedSignedOriginalLineagePacket({
     db,env:process.env,gate:sameOriginalPostmaintenanceGate,
     shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,
     fetchImpl:fetch
    }).catch(()=>({
      status:'SIGNED_ORIGINAL_LINEAGE_PROVIDER_OR_SOURCE_UNVERIFIED',
      packet_staged:false,source_reconciled:false,
      original_job_completed:false,installation_authorized:false,
      production_changed:false,new_shift_started:false
    })):
    {status:'NO_SIGNED_ORIGINAL_LINEAGE_EVIDENCE_STAGE_DUE',
     packet_staged:false,source_reconciled:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false};
  // Durable next-wake routing: the signed source-epoch is persisted, so
  // a later wake must use the database readback, not replay the attestation.
  // This is a classification receipt, NOT a claim that an executor ran.
  workerStage='DURABLE_MAINTENANCE_HANDOFF_READBACK';
  const durableMaintenanceHandoff=
   sameOriginalPostmaintenanceGate?.status===
     'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'&&
   /^sha256:[a-f0-9]{64}$/.test(
     sameOriginalPostmaintenanceGate.maintenance_source_epoch_receipt_sha256||'')&&
   sameOriginalPostmaintenanceGate.original_job_completed===false&&
   sameOriginalPostmaintenanceGate.installation_authorized===false&&
   sameOriginalPostmaintenanceGate.production_changed===false&&
   ['RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
    'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'].includes(
     sameOriginalPostmaintenanceGate.next_action)?
    Object.freeze({
     status:sameOriginalPostmaintenanceGate.next_action,
     original_work_id:sameOriginalPostmaintenanceGate.original_work_id,
     source_ref:sameOriginalPostmaintenanceGate.source_ref,
     source_epoch_receipt_sha256:
      sameOriginalPostmaintenanceGate.maintenance_source_epoch_receipt_sha256,
     handoff_executed:false,independent_frozen_ci_red_verified:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false
    }):
    {status:'NO_DURABLE_AUTHORIZED_MAINTENANCE_HANDOFF',
     handoff_executed:false,independent_frozen_ci_red_verified:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false};
  // Registered execution, not an empty claim-to-failure bridge:
  // the service-role database first gates WHICH action has an executable
  // handler. Unsupported frozen-CI work is never leased or charged retries.
  // The currently registered action independently requalifies changed
  // source ONLY; a full repair still needs real frozen CI and install approval.
  workerStage='SIGNED_MAINTENANCE_REGISTERED_EXECUTOR_HANDOFF';
  const signedMaintenanceExecutorHandoff=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   process.env.REALITY_MAINTENANCE_EXECUTOR_CONNECTED==='true'&&
   /^[a-f0-9-]{36}$/i.test(actualWorkerRunId||'')?
    await executeOneRegisteredMaintenanceAction({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_MAINTENANCE_EXECUTOR_REQUALIFICATION_UNVERIFIED',
     error_code:String(error?.message||'EXECUTOR_UNVERIFIED').slice(0,130),
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'SIGNED_MAINTENANCE_EXECUTOR_NOT_CONNECTED_OR_NO_AUTHORIZED_WAKE',
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false};
  // A real independent CI runner exists for the OTHER exact action.
  // Selection occurs only if the source executor returned an unclaimed
  // 'no registered handler' result. Reuse the original signed worker run.
  workerStage='SIGNED_MAINTENANCE_CASE_CI_EXECUTOR';
  // A capability type is registered once. Specific work and authority are
  // determined by signed ledger facts, never a PR number or scripted job ID.
  const registeredMaintenanceCiAction=
   'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED';
  const ciRegistrationReady=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   process.env.REALITY_MAINTENANCE_EXECUTOR_CONNECTED==='true'&&
   (signedMaintenanceExecutorHandoff.status===
     'NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR'||
    (signedMaintenanceExecutorHandoff.status===
     'SIGNED_MAINTENANCE_ACTION_NOT_YET_EXECUTABLE'&&
     signedMaintenanceExecutorHandoff.next_action===
      registeredMaintenanceCiAction));
  const signedMaintenanceCaseCi=ciRegistrationReady?
   await invokeOneRegisteredSignedCapability({
    wake:wakeReceipt,
     // Re-read the existing signed shift before invoking its registered
     // capability. The later unifiedGraph declaration is not yet initialized.
     // No new shift, job, authorization or completion is inferred here.
     graph:assertRealityUnifiedShiftGraph(await shiftRpc(db,
      'reality_read_current_shift_execution_graph_v1',{}),{
       expectedShiftId:wakeReceipt.shift_id
      }),
    action:registeredMaintenanceCiAction,
    authorityBasis:'SIGNED_EXISTING_WARRANT',
    env:process.env,
    handler:()=>executeOneRegisteredMaintenanceCiWake({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    })
   }):
   {status:'NO_AUTHORIZED_CASE_CI_RUNNER_WAKE',
    repair_executed:false,original_job_completed:false,
    installation_authorized:false,production_changed:false};
  const signedMaintenanceResult=
   signedMaintenanceCaseCi.status==='NO_AUTHORIZED_CASE_CI_RUNNER_WAKE'?
    signedMaintenanceExecutorHandoff:signedMaintenanceCaseCi;
  const signedMaintenanceExecutorClaim=
   signedMaintenanceResult.claim||{
    status:signedMaintenanceResult.status,
    handoff_executed:false,original_job_completed:false,
    installation_authorized:false,production_changed:false};
  const signedMaintenanceExecutorOutcome=
   signedMaintenanceResult.outcome||{
    status:signedMaintenanceResult.status,
    repair_executed:false,original_job_completed:false,
    installation_authorized:false,production_changed:false};
  // A distinct signed worker checks the real provider's GitHub Actions job
  // AND artifact after claim-bound CI dispatch. This independently verifies
  // diagnostic execution, NOT the case-specific frozen failure or a repair.
  workerStage='SIGNED_MAINTENANCE_CASE_CI_INDEPENDENT_DIAGNOSTIC_REVIEW';
  const signedMaintenanceCaseCiIndependentReview=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   /^[a-f0-9-]{36}$/i.test(actualWorkerRunId||'')?
    await independentlyReviewOneClaimBoundMaintenanceCiDiagnostic({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_MAINTENANCE_CI_DIAGNOSTIC_REVIEW_UNVERIFIED',
     error_code:String(error?.message||'INDEPENDENT_REVIEW_UNVERIFIED')
      .slice(0,145),
     independent_diagnostic_verified:false,
     original_job_completed:false,repair_executed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_SIGNED_MAINTENANCE_CI_DIAGNOSTIC_REVIEW_WAKE',
     independent_diagnostic_verified:false,
     original_job_completed:false,repair_executed:false,
     installation_authorized:false,production_changed:false};
  // The existing signed executor now preserves a source-bound repair
  // obligation after real independent diagnostics. Admission is not RED,
  // code generation, installation, or an original job completion.
  workerStage='SIGNED_MAINTENANCE_DIAGNOSTIC_TO_REPAIR_HANDOFF';
  const signedMaintenanceRepairHandoff=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await advanceSignedExistingMaintenanceRepairHandoff({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_MAINTENANCE_REPAIR_HANDOFF_UNVERIFIED',
     error_code:String(error?.message||'').slice(0,125),
     work_order_created:false,frozen_ci_red_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     new_shift_started:false
    })):
    {status:'NO_AUTHORIZED_MAINTENANCE_REPAIR_HANDOFF_WAKE',
     work_order_created:false,frozen_ci_red_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     new_shift_started:false};
  // A DISTINCT signed worker checks a saved model candidate against the
  // pinned module graph of this actual executor. It cannot approve the patch,
  // call it an independently reproduced RED, install, or settle the original.
  workerStage='SIGNED_MAINTENANCE_MODEL_CANDIDATE_INDEPENDENT_TARGET_REVIEW';
  const signedMaintenanceCandidateTargetReview=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await independentlyReviewSignedMaintenanceTarget({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_UNVERIFIED',
     error_code:String(error?.message||'').slice(0,120),
     independent_target_review_recorded:false,
     candidate_is_verified_repair:false,
     independent_frozen_red_verified:false,
     independent_ci_verified:false,repair_executed:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false
    })):
    {status:'NO_AUTHORIZED_SIGNED_CANDIDATE_TARGET_REVIEW_WAKE',
     candidate_is_verified_repair:false,
     independent_frozen_red_verified:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false};
  // One source-pinned LLM candidate for the existing warrant/maintenance
  // work order, never an installation, frozen CI verdict, or final receipt.
  workerStage='SIGNED_MAINTENANCE_REPAIR_MODEL_SOURCE_CANDIDATE';
  const signedMaintenanceRepairModelCandidate=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await generateOneSignedMaintenanceRepairCandidate({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_MAINTENANCE_REPAIR_MODEL_STAGE_UNVERIFIED',
     error_code:String(error?.message||'').slice(0,120),
     model_generated:false,independent_ci_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     new_shift_started:false
    })):
    {status:'NO_AUTHORIZED_MAINTENANCE_MODEL_WORKER_WAKE',
     model_generated:false,independent_ci_verified:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     new_shift_started:false};
  // Consume actual pinned GitHub RED/GREEN evidence under the same owner
  // warrant. It is a durable CI proof, not approval to install or a final
  // original-job completion. The earlier source-bound trigger is reused.
  workerStage='SIGNED_MAINTENANCE_SOURCE_CASE_INDEPENDENT_CI_RECONCILIATION';
  const signedMaintenanceCaseCiReconciliation=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await continueSignedMaintenanceCaseCiVerification({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_SOURCE_CASE_INDEPENDENT_CI_RECONCILIATION_UNVERIFIED',
     error_code:String(error?.message||'').slice(0,100),
     case_specific_frozen_red_attested:false,
     code_regression_green_verified:false,
     repair_installed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     new_shift_started:false
    })):
    {status:'NO_SIGNED_MAINTENANCE_CASE_CI_WAKE',
     case_specific_frozen_red_attested:false,
     code_regression_green_verified:false,
     repair_installed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     new_shift_started:false};
  // The EXISTING Reality controller independently reconciles a GitHub
  // source repair artifact into the same owner-shift ledger. Never install
  // or approve on the model's behalf; the owner decision remains separate.
  workerStage='SIGNED_MAINTENANCE_VERIFIED_REPAIR_ARTIFACT_RECONCILIATION';
  const signedMaintenanceArtifactHandoff=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await reconcileSignedVerifiedMaintenanceArtifact({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({
     status:'EXACT_SIGNED_REPAIR_ARTIFACT_RECONCILIATION_UNVERIFIED',
     verified_repair_artifact:false,installation_authorized:false,
     repair_installed:false,original_job_completed:false,
     production_changed:false,new_shift_started:false
    })):
    {status:'NO_SIGNED_MAINTENANCE_ARTIFACT_WORKER_WAKE',
     verified_repair_artifact:false,installation_authorized:false,
     repair_installed:false,original_job_completed:false,
     production_changed:false,new_shift_started:false};
  // Exact frozen code artifact -> independent target / rollback inspection.
  // This is the SAME already authorized signed shift on a DIFFERENT worker
  // from artifact acceptance. It may record a review receipt, never install.
  workerStage='SIGNED_MAINTENANCE_INDEPENDENT_INSTALL_TARGET_REVIEW';
  const signedMaintenanceInstallTargetReview=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await independentlyReviewSignedMaintenanceInstallTarget({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({
     status:'SIGNED_MAINTENANCE_INSTALL_TARGET_REVIEW_UNVERIFIED',
     install_target_verified:false,owner_approval_ready:false,
     installation_authorized:false,repair_installed:false,
     original_job_completed:false,production_changed:false,
     new_shift_started:false
    })):
    {status:'NO_SIGNED_MAINTENANCE_INSTALL_TARGET_REVIEW_WAKE',
     install_target_verified:false,owner_approval_ready:false,
     installation_authorized:false,repair_installed:false,
     original_job_completed:false,production_changed:false,
     new_shift_started:false};
  // ENFORCE the existing canonical Spine before any installation effect.
  // The independently verified exact target and one-use owner approval must
  // be durably hash-linked and independently reread from the Universe ledger.
  // A classifier label or successful worker wake cannot mint authority.
  workerStage='SIGNED_VERIFIED_MAINTENANCE_CONTINUITY_RECEIPT_ADMISSION';
  const signedMaintenanceCanonicalContinuity=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await enforceSignedMaintenanceReceiptContinuity({
     db,env:process.env,originalGate:sameOriginalPostmaintenanceGate,
     shiftId:wakeReceipt.shift_id,fetchImpl:fetch
    }).catch(error=>({
     status:'SIGNED_CONTINUITY_RECEIPT_NOT_DURABLY_VERIFIED',
     failure_code:/^SIGNED_CONTINUITY_[A-Z0-9_]+$/.test(
      String(error?.message||''))?String(error.message):
      'SIGNED_CONTINUITY_RECONCILIATION_PROVIDER_UNAVAILABLE',
     continuity_committed:false,
     next_authorized_action:'NO_NEW_AUTHORITY',
     install_eligible_from_continuity:false,
     installer_reconcile_only_from_continuity:false,
     original_job_completed:false,new_shift_started:false,
     production_changed:false
    })):
    {status:'NO_SIGNED_CONTINUITY_RECEIPT_WAKE',
     continuity_committed:false,
     next_authorized_action:'NO_NEW_AUTHORITY',
     install_eligible_from_continuity:false,
     installer_reconcile_only_from_continuity:false,
     original_job_completed:false,new_shift_started:false,
     production_changed:false};
  // Reality's EXISTING governed trigger consumes the verified durable
  // Continuity transition and routes only the NEXT eligible action.
  // It neither grants owner authority nor authorizes a new job/shift.
  workerStage='SIGNED_MAINTENANCE_GOVERNED_TRIGGER_ROUTING';
  const signedMaintenanceGovernedTrigger=
   routeSignedMaintenanceContinuityTrigger({
    continuity:signedMaintenanceCanonicalContinuity,
    originalGate:sameOriginalPostmaintenanceGate,
    ownerId:sameOriginalPostmaintenanceGate?.owner_id,
    shiftId:wakeReceipt.shift_id
   });
  // The existing signed worker can now advance an exact owner-approved
  // maintenance repair WITHOUT any further human step. The privileged broker
  // independently reads approval and atomically fences GitHub source write.
  workerStage='EXACT_OWNER_APPROVED_MAINTENANCE_AUTOMATIC_INSTALL';
  const signedMaintenanceApprovedInstall=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   signedMaintenanceGovernedTrigger.status==='SIGNED_MAINTENANCE_GOVERNED_TRIGGER_READY'&&
   (signedMaintenanceGovernedTrigger.installer_dispatch_permitted===true||
    signedMaintenanceGovernedTrigger.installer_reconcile_only===true)?
    await continueExactOwnerApprovedMaintenanceInstall({
     db,env:process.env,fetchImpl:fetch
    }).catch(()=>({
     status:'EXACT_MAINTENANCE_AUTOMATIC_INSTALL_UNVERIFIED',
     source_installed:false,original_job_completed:false,
     production_changed:false,new_shift_started:false
    })):
    {status:'NO_SIGNED_VERIFIED_CONTINUITY_AUTHORITY_FOR_INSTALL',
     source_installed:false,original_job_completed:false,
     production_changed:false,new_shift_started:false};
  // Different signed provider independently rechecks the actual installed
  // bytes, GitHub acceptance and Vercel status BEFORE maintenance closure.
  workerStage='EXACT_SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_VERIFICATION';
  const signedMaintenanceIndependentPostinstall=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   signedMaintenanceApprovedInstall.source_installed!==true?
    await independentlyReconcileSignedMaintenanceInstall({
     db,env:process.env,fetchImpl:fetch
    }).catch(()=>({
     status:'EXACT_SIGNED_MAINTENANCE_POSTINSTALL_UNVERIFIED',
     repair_verified:false,original_job_completed:false,
     production_changed:false,new_shift_started:false
    })):
    {status:'NO_SIGNED_MAINTENANCE_POSTINSTALL_WAKE',
     repair_verified:false,original_job_completed:false,
     production_changed:false,new_shift_started:false};
  // After independent acceptance the SAME signed worker carries the
  // postinstall receipt all the way through the canonical Universe ledger
  // and back to the next unfinished original-work obligation. If the
  // independent verifier has not accepted it, do NOT synthesize settlement.
  workerStage='SIGNED_MAINTENANCE_POSTINSTALL_UNIVERSE_RECONCILIATION';
  const signedMaintenanceUniverseReconciliation=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   signedMaintenanceIndependentPostinstall.repair_verified===true?
    await enforceSignedMaintenanceReceiptContinuity({
     db,env:process.env,originalGate:sameOriginalPostmaintenanceGate,
     shiftId:wakeReceipt.shift_id,fetchImpl:fetch
    }).catch(error=>({
     status:'INDEPENDENT_POSTINSTALL_UNIVERSE_CONTINUITY_UNVERIFIED',
     failure_code:/^SIGNED_CONTINUITY_[A-Z0-9_]+$/.test(
      String(error?.message||''))?String(error.message):
      'INDEPENDENT_POSTINSTALL_UNIVERSE_PROVIDER_UNAVAILABLE',
     continuity_committed:false,
     next_authorized_action:'NO_NEW_AUTHORITY',
     original_job_completed:false,production_changed:false
    })):
    {status:'NO_NEW_INDEPENDENT_POSTINSTALL_SETTLEMENT_RECEIPT',
     continuity_committed:false,
     next_authorized_action:'NO_NEW_AUTHORITY',
     original_job_completed:false,production_changed:false};
  // On a later signed wake the VERIFIED Universe return becomes a governed
  // next-work trigger; the existing qualified executor independently checks
  // original work identity and its own authority before doing anything.
  const signedMaintenanceReturnTrigger=
   routeSignedMaintenanceContinuityTrigger({
    continuity:signedMaintenanceUniverseReconciliation,
    originalGate:sameOriginalPostmaintenanceGate,
    ownerId:sameOriginalPostmaintenanceGate?.owner_id,
    shiftId:wakeReceipt.shift_id
   });
  // Consume the independently verified Universe-to-original return through
  // the existing single-use owner/shift executor, not only a status field.
  // The same durable obligation may be retried on a later signed wake.
  workerStage='SIGNED_MAINTENANCE_GOVERNED_ORIGINAL_RETURN_HANDOFF';
  const signedMaintenanceOriginalReturnDispatch=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await advanceVerifiedMaintenanceOriginalHandoff({
     trigger:signedMaintenanceReturnTrigger.same_original_work_due===true?
      signedMaintenanceReturnTrigger:signedMaintenanceGovernedTrigger,
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch,call:shiftRpc,
     executeCaseCi:executeOneRegisteredMaintenanceCiWake,
     executeSourceRequalification:executeOneRegisteredMaintenanceAction
    }).catch(error=>({
     status:'SIGNED_MAINTENANCE_RETURN_HANDOFF_NOT_VERIFIED',
     failure_code:String(error?.message||'RETURN_HANDOFF_FAILED').slice(0,145),
     executor_invoked:false,original_job_completed:false,
     installation_authorized:false,production_changed:false,
     new_shift_started:false
    })):
    {status:'NO_SIGNED_WORKER_RETURN_HANDOFF',executor_invoked:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false};
  // Independent verifier facts -> Reality-governed classification ->
  // existing Continuity Ledger. A classification cannot create execution
  // authority, install code, reopen an original, or mutate the Universe.
  // Crucially, read the DURABLE artifact on subsequent signed worker wakes,
  // not only the one-time artifact acceptance response.
  workerStage='GOVERNED_CONTINUITY_VERIFIED_EVIDENCE_CLASSIFICATION';
  let signedMaintenanceArtifactLedger={
   status:'OWNER_MAINTENANCE_ARTIFACT_READBACK_UNVERIFIED',
   owner_id:sameOriginalPostmaintenanceGate?.owner_id||null,
   count:0,items:[],installation_authorized:false,
   production_changed:false
  };
  if(wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   sameOriginalPostmaintenanceGate?.status===
    'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'&&
   sameOriginalPostmaintenanceGate?.shift_id===wakeReceipt.shift_id&&
   /^[a-f0-9-]{36}$/i.test(
    sameOriginalPostmaintenanceGate?.owner_id||'')){
   try{
    const read=await shiftRpc(db,
     'reality_read_owner_maintenance_verified_artifacts_v1',{
      p_owner_id:sameOriginalPostmaintenanceGate.owner_id
     });
    if(read?.status==='OWNER_VERIFIED_MAINTENANCE_ARTIFACTS_READ_ONLY'&&
     read.owner_id===sameOriginalPostmaintenanceGate.owner_id&&
     read.installation_authorized===false&&
     read.production_changed===false&&
     Array.isArray(read.items)&&
     Number.isSafeInteger(read.count)&&read.count===read.items.length&&
     read.count>=0&&read.count<=4)
      signedMaintenanceArtifactLedger=read;
   }catch{/* Failed independent read cannot grant work authority. */}
  }
  const governedContinuityEvidenceClassification=
   classifyRealityGovernedContinuityEvidence({
    ownerId:sameOriginalPostmaintenanceGate?.owner_id,
    shiftId:wakeReceipt.shift_id,
    originalGate:sameOriginalPostmaintenanceGate,
    artifactReadback:signedMaintenanceArtifactLedger
   });
  // A claimed lease cannot be reported as executed or verified.
  // On a later wake the lease expires and can be reclaimed (max three attempts).
  // The same evidence job is allowed ONE bounded requalification when
  // its original Github source changed between two signed worker runs.
  // This is not a code repair. The first failure receipt remains immutable.
  workerStage='SAME_QUALIFIED_EVIDENCE_SOURCE_REQUALIFICATION';
  const changedSourceRequalification=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await requalifyOneChangedEmployeeSource({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({
     status:'CHANGED_SOURCE_REQUALIFICATION_PROOF_UNAVAILABLE',
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_CURRENT_SIGNED_SOURCE_REQUALIFICATION_SCOPE',
     installation_authorized:false,production_changed:false};
  // A real prior employee inquiry and today's owner-scoped calendar can now
  // become an executable, READ-ONLY evidence pack on the SAME signed shift.
  // No new shift or customer original; an independent later wake reviews it.
  // This is the missing schedule -> qualification -> executor connection.
  workerStage='SIGNED_SCHEDULE_EVIDENCE_QUALIFICATION';
  const signedScheduleAdmission=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await admitOneSignedScheduledEvidenceJob({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({
     status:'SIGNED_SCHEDULE_EVIDENCE_ADMISSION_UNVERIFIED',
     evidence_job_created:false,customer_original_job_created:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_CURRENT_SIGNED_SHIFT_FOR_SCHEDULED_EVIDENCE',
     evidence_job_created:false,customer_original_job_created:false,
     installation_authorized:false,production_changed:false};
  // Execute exactly one dynamically qualified, read-only job on this
  // existing owner-authorized signed shift. Review and execution run in
  // DIFFERENT signed worker processes; neither installs code.
  workerStage='QUALIFIED_EMPLOYEE_WORK_EXECUTION_OR_INDEPENDENT_VERIFICATION';
  const qualifiedEmployeeWork=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
   await advanceOneQualifiedEmployeeEvidenceJob({
    db,env:process.env,shiftId:wakeReceipt.shift_id,
    workerRunId:actualWorkerRunId,fetchImpl:fetch
   }).catch(()=>({
    status:'QUALIFIED_EMPLOYEE_WORK_EXECUTION_UNVERIFIED',
    actual_evidence_report_submitted:false,
    installation_authorized:false,production_changed:false
   })):
   {status:'NO_CURRENT_SIGNED_QUALIFIED_EMPLOYEE_WORK',
    actual_evidence_report_submitted:false,
    installation_authorized:false,production_changed:false};
  // Standing incident investigation uses the owner's existing time-limited
  // evidence-only delegation. It can run DURING an active signed shift, but
  // cannot extend that shift's executable scope, install, or start a new shift.
  // No owner, source, or grant can arrive from the HTTP request.
  workerStage='STANDING_OWNER_DELEGATION_INQUIRY';
  // The SAME signed worker handles already warranted incident-linked
  // originals before ordinary discovery. It reuses the existing original
  // recovery commitment; no new shift, new executor or owner approval.
  // An unavailable optional lane cannot disable other authorized work.
  workerStage='INCIDENT_EXISTING_ORIGINAL_GOVERNED_HANDOFF';
  const incidentOriginalHandoff=await advanceExistingOwnerIncidentOriginal({
   db,env:process.env,fetchImpl:fetch
  }).catch(()=>({
   status:'INCIDENT_ORIGINAL_HANDOFF_EVIDENCE_UNAVAILABLE',
   original_job_created:false,repair_executed:false,
   installation_authorized:false,production_changed:false
  }));
  workerStage='STANDING_OWNER_DELEGATION_INQUIRY';
  // Reality's own watchdog captures signed-worker failures before they reach
  // this handler. Give incident investigation first claim on an already
  // delegated evidence-only wake; never auto-approve the actual repair.
  // A detected failure DURING an authorized shift is real recovery work.
  // It must enter the existing service-only, owner-delegated evidence-only
  // investigation claim now rather than wait until the active shift closes.
  // Claim dedupe, daily budget, role/reviewer validation, and the separate
  // repair installation gate remain unchanged. No additional shift is started.
  const operationalRecoveryResult=
   await scheduleOneStandingOperationalRecovery({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'SIGNED_WORKER_INCIDENT_INVESTIGATION_UNVERIFIED',
    new_original_jobs_created:0,execution_authorized:false,
    installation_authorized:false,production_changed:false
   }));
  // Complete previously scheduled employee investigations before generating
  // more schedules. A scheduled job is not done until a separate durable
  // inquiry receipt exists; the independent current-gap gate still follows.
  workerStage='SCHEDULED_CAPABILITY_EMPLOYEE_INQUIRY';
  const scheduledCapabilityInquiryResult=
   wakeReceipt.status==='NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE'&&
   operationalRecoveryResult.status==='NO_STANDING_WORKER_INCIDENT'?
    await advanceOneScheduledCapabilityInquiry({
     db,env:process.env,fetchImpl:fetch
    }).catch(()=>({
     status:'SCHEDULED_CAPABILITY_INQUIRY_PROOF_UNAVAILABLE',
     original_job_created:false,execution_authorized:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'ACTIVE_SIGNED_SHIFT_OR_RECOVERY_CONTROLS_INQUIRY',
     original_job_created:false,execution_authorized:false,
     installation_authorized:false,production_changed:false};
  workerStage='STANDING_OWNER_DELEGATION_INQUIRY';
  const capabilityScheduleResult=
   wakeReceipt.status==='NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE'&&
   operationalRecoveryResult.status==='NO_STANDING_WORKER_INCIDENT'&&
   scheduledCapabilityInquiryResult.status===
     'NO_STANDING_SCHEDULED_CAPABILITY_INQUIRY_DUE'?
    await scheduleOneStandingCapability({
     db,env:process.env,fetchImpl:fetch
    }).catch(()=>({
     status:'CAPABILITY_EMPLOYEE_SCHEDULE_PROOF_UNAVAILABLE',
     new_original_jobs_created:0,execution_authorized:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'ACTIVE_SIGNED_SHIFT_CONTROLS_CAPABILITY_EXECUTION',
     new_original_jobs_created:0,execution_authorized:false,
     installation_authorized:false,production_changed:false};
  // One model-directed standing-work stage per wake. When capability role
  // scheduling consumes its grant quota, do not spend a second lease on
  // ordinary source investigation. Existing signed shift work is unaffected.
  const standingDiscoveryResult=
   wakeReceipt.status==='NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE'&&
   operationalRecoveryResult.status==='NO_STANDING_WORKER_INCIDENT'&&
   scheduledCapabilityInquiryResult.status===
    'NO_STANDING_SCHEDULED_CAPABILITY_INQUIRY_DUE'&&
   capabilityScheduleResult.status===
    'NO_NEW_STANDING_CAPABILITY_REQUIRING_ROLE_TRIAGE'?
    await runOneStandingEmployeeDiscovery({
     db,env:process.env,fetchImpl:fetch
    }).catch(()=>({
     status:'STANDING_DISCOVERY_PROOF_OR_PROVIDER_UNAVAILABLE',
     new_original_jobs_created:0,external_actions_authorized:false,
     shift_execution_authorized:false,installation_authorized:false,
     production_changed:false
    })):
    {status:'CAPABILITY_SCHEDULING_OR_SIGNED_SHIFT_HANDLED_WAKE',
     new_original_jobs_created:0,external_actions_authorized:false,
     shift_execution_authorized:false,installation_authorized:false,
     production_changed:false};
  // NEW Chat development uses its own signed original-message identity,
  // not an old shift's frozen issue scope. Reuse this same signed service
  // wake and broker; no second shift, scheduler or installation grant.
  // At most ONE bounded new-development transition per wake. An unresolved
  // provider write never gets automatically replayed.
  workerStage='CHAT_NEW_DEVELOPMENT_PUBLISH_READBACK';
  const chatNewPublished=await continueChatNewDevelopmentCandidate({
   db,env:process.env,fetchImpl:fetch
  }).catch(()=>({
   status:'CHAT_NEW_DEV_PUBLISH_EFFECT_UNVERIFIED',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  }));
  const publisherProgress=new Set([
   'NEW_CHAT_DEVELOPMENT_PROVIDER_CANDIDATE_STAGED',
   'CHAT_DEVELOPMENT_INDEPENDENT_SOURCE_SYNTAX_CI_VERIFIED'
  ]);
  let chatNewBuild={
   status:'NO_PENDING_SIGNED_NEW_DEVELOPMENT',
   model_generated:false,independent_ci_verified:false,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  };
  if(!publisherProgress.has(chatNewPublished.status)){
   workerStage='CHAT_NEW_DEVELOPMENT_MODEL_PROPOSAL';
   chatNewBuild=await generateNextSignedChatDevelopmentDraft({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'CHAT_NEW_DEVELOPMENT_GENERATION_EFFECT_UNVERIFIED',
    model_generated:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,
    new_shift_started:false
   }));
  }
  // Missing feature acceptance MUST become a durable same-original recovery
  // action, not another silent successful wake. The service-only SQL RPC
  // independently checks the saved signed owner source and CI receipt.
  // No source execution, Chat approval, re-admission, install, or settlement.
  workerStage='CHAT_DEVELOPMENT_FULL_GOAL_ACCEPTANCE_GAP';
  const chatFeatureGap=await shiftRpc(db,
   'reality_record_next_chat_development_goal_gap_v1',{}
  ).catch(()=>({
   status:'CHAT_DEVELOPMENT_GOAL_GAP_RECEIPT_UNVERIFIED',
   original_job_completed:false,installation_authorized:false,
   production_changed:false,new_shift_started:false
  }));
  const goalGapRecorded=
   chatFeatureGap?.status==='CHAT_DEVELOPMENT_GOAL_GAP_SOURCE_BOUND_RECEIPTED'&&
   /^work:[a-f0-9]{32}$/.test(chatFeatureGap.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(chatFeatureGap.receipt_sha256||'')&&
   chatFeatureGap.feature_acceptance_verified===false&&
   chatFeatureGap.original_job_completed===false&&
   chatFeatureGap.installation_authorized===false&&
   chatFeatureGap.production_changed===false&&
   chatFeatureGap.new_shift_started===false;
  // Signed recovery compiler consumes a proven CI_VERIFIED blocker from the
  // SAME owner original. The existing capability queue stores the frozen
  // contract; the existing Chat development worker generates a bounded source
  // draft. The protected broker stages it into quarantine on a later wake.
  // Neither the model nor the broker may grant installation authority.
  // Different signed worker invocation performs independently sourced
  // dependency review AFTER the model draft, BEFORE the protected broker.
  // A graph hit is not feature acceptance or owner installation authority.
  // Reality must reconcile its own prior independently claimed review.
  // A provider/readback failure may leave a fenced lease. Requeue only
  // after expiry under a DIFFERENT real signed worker, one time, with
  // its failed attempt and original identity retained.
  workerStage='SIGNED_CHAT_RECOVERY_EXPIRED_REVIEW_RECONCILIATION';
  const signedRecoveryReviewRecovery=await shiftRpc(db,
   'reality_reconcile_expired_signed_chat_target_review_v1',{
    p_worker_run_id:actualWorkerRunId
   }).catch(()=>({
    status:'SIGNED_CHAT_RECOVERY_EXPIRED_REVIEW_RECONCILIATION_UNVERIFIED',
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_shift_started:false
   }));
  workerStage='SIGNED_CHAT_RECOVERY_CONTINUITY_SOURCE_PROBE';
  const signedRecoveryContinuityProbe=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await independentlyReobserveStalledRecoveryReview({db,env:process.env,
     shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({status:'SIGNED_CHAT_RECOVERY_CONTINUITY_SOURCE_PROBE_UNVERIFIED',
     installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false})):
    {status:'NO_CURRENT_SIGNED_CONTINUITY_SOURCE_PROBE_SCOPE',
     installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false};
  workerStage='SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW';
  const signedRecoveryTargetReview=
   signedRecoveryContinuityProbe.continuity_source_probe_verified===true?
    signedRecoveryContinuityProbe:
   await independentlyReviewOneSignedChatRecoveryTarget({
    db,env:process.env,workerRunId:actualWorkerRunId,
    fetchImpl:fetch
   }).catch(()=>({
    status:'SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW_UNVERIFIED',
    target_in_graph:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,
    new_shift_started:false
   }));
  workerStage='SIGNED_CHAT_RECOVERY_INDEPENDENT_PARSE_ONLY';
  const signedRecoverySyntax= wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
   await independentlyVerifySignedRecoverySyntax({db,env:process.env,shiftId:wakeReceipt.shift_id,
    workerRunId:actualWorkerRunId,fetchImpl:fetch}).catch(()=>({status:'SIGNED_RECOVERY_PARSE_PROOF_UNVERIFIED'})):
   {status:'NO_CURRENT_SIGNED_RECOVERY_PARSE_SCOPE'};
  // A prior GitHub branch creation may have had uncertain effects. Preserve
  // that fenced write and the same original. The independent, signed worker
  // confirms repository/ref and live preview SHA before a single fresh source
  // epoch is permitted; NO GitHub write is retried or performed in this step.
  workerStage='SIGNED_CHAT_FENCED_PROVIDER_INDEPENDENT_SOURCE_REQUALIFICATION';
  const fencedProviderRequalification=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await requalifyOneFencedSignedChatProvider({
     db,env:process.env,shiftId:wakeReceipt.shift_id,
     workerRunId:actualWorkerRunId,fetchImpl:fetch
    }).catch(()=>({status:'SIGNED_FENCED_PROVIDER_REQUALIFICATION_UNVERIFIED',
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false})):
    {status:'NO_CURRENT_SIGNED_FENCED_PROVIDER_REQUALIFICATION_SCOPE',
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false};
  workerStage='SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_READBACK';
  const signedRecoveryQuarantine=await stageNextSignedChatRecoveryQuarantine({
   db,env:process.env,fetchImpl:fetch
  }).catch(()=>({
   status:'SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_UNVERIFIED_NO_REPLAY',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  }));
  // A rejected exact-source model patch can be re-claimed ONLY after a
  // changed verified preview release, once, while retaining its rejection
  // memory. The owner original, diagnosis and checkpoint are unchanged.
  // A true independent rejection can qualify a distinct, graph-constrained
  // candidate, on the same original. Preserve the old draft/review epoch.
  workerStage='SIGNED_CHAT_RECOVERY_REJECTED_TARGET_COMPILATION';
  const signedRecoveryTargetRevision=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
    await shiftRpc(db,'reality_recompile_signed_rejected_chat_target_v1',{
     p_shift_id:wakeReceipt.shift_id,p_worker_run_id:actualWorkerRunId,
     p_release_sha:process.env.VERCEL_GIT_COMMIT_SHA
    }).catch(()=>({status:'SIGNED_CHAT_RECOVERY_TARGET_COMPILATION_UNVERIFIED',
     installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false})):
    {status:'NO_CURRENT_SIGNED_TARGET_COMPILATION_SCOPE',
     installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false};
  workerStage='SIGNED_CHAT_RECOVERY_DISTINCT_STRATEGY_COMPILATION';
  const signedRecoveryStrategy=await shiftRpc(db,
   'reality_recompile_signed_chat_recovery_line_span_v1',{
    p_release_sha:process.env.VERCEL_GIT_COMMIT_SHA
   }).catch(()=>({
    status:'SIGNED_CHAT_RECOVERY_DISTINCT_COMPILER_UNVERIFIED',
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_shift_started:false
   }));
  workerStage='SIGNED_CHAT_RECOVERY_REJECTED_PATCH_RECONCILIATION';
  const signedRecoveryRevision=await shiftRpc(db,
   'reality_requeue_signed_chat_recovery_after_upgrade_v1',{
    p_release_sha:process.env.VERCEL_GIT_COMMIT_SHA
   }).catch(()=>({
    status:'SIGNED_CHAT_RECOVERY_REVISION_UNVERIFIED',
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_shift_started:false
   }));
  workerStage='SIGNED_CHAT_RECOVERY_SPEC_COMPILATION';
  const signedRecoverySpec=await shiftRpc(db,
   'reality_admit_next_signed_chat_recovery_spec_v1',{}
  ).catch(()=>({
   status:'SIGNED_CHAT_RECOVERY_SPEC_COMPILER_UNVERIFIED',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  }));
  workerStage='SIGNED_CHAT_RECOVERY_EXISTING_MODEL_GENERATOR';
  const signedRecoveryDraft=await generateNextSignedChatDevelopmentDraft({
   db,env:process.env,fetchImpl:fetch,recoveryMode:true
  }).catch(()=>({
   status:'SIGNED_CHAT_RECOVERY_MODEL_DRAFT_UNVERIFIED',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  }));
  const recoverySourceProgress=
   signedRecoveryQuarantine.status===
    'SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPTED'&&
   /^work:[a-f0-9]{32}$/.test(
     signedRecoveryQuarantine.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(
     signedRecoveryQuarantine.quarantine_receipt_sha256||'')&&
   signedRecoveryQuarantine.source_installed===false&&
   signedRecoveryQuarantine.installation_authorized===false&&
   signedRecoveryQuarantine.original_job_completed===false;
  const recoverySpecProgress=
   signedRecoverySpec.status==='SIGNED_CHAT_RECOVERY_SPEC_ATOMICALLY_FROZEN'&&
   /^work:[a-f0-9]{32}$/.test(signedRecoverySpec.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(signedRecoverySpec.spec_sha256||'')&&
   signedRecoverySpec.installation_authorized===false&&
   signedRecoverySpec.original_job_completed===false;
  const recoveryDraftProgress=
   signedRecoveryDraft.status==='SIGNED_CHAT_RECOVERY_CODE_DRAFT_GENERATED'&&
   /^work:[a-f0-9]{32}$/.test(signedRecoveryDraft.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(
     signedRecoveryDraft.candidate_sha256||'')&&
   signedRecoveryDraft.installation_authorized===false&&
   signedRecoveryDraft.original_job_completed===false;
  const recoveryRevisionProgress=
   signedRecoveryRevision.status===
    'SIGNED_CHAT_RECOVERY_SAME_ORIGINAL_REQUEUED_ON_CHANGED_RELEASE'&&
   /^work:[a-f0-9]{32}$/.test(
    signedRecoveryRevision.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(
    signedRecoveryRevision.negative_memory_receipt_sha256||'')&&
   signedRecoveryRevision.installation_authorized===false&&
   signedRecoveryRevision.original_job_completed===false;
  const recoveryStrategyProgress=
   signedRecoveryStrategy.status===
    'SIGNED_CHAT_RECOVERY_DISTINCT_LINE_SPAN_STRATEGY_FROZEN'&&
   /^work:[a-f0-9]{32}$/.test(
    signedRecoveryStrategy.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(
    signedRecoveryStrategy.recompiled_spec_sha256||'')&&
   signedRecoveryStrategy.installation_authorized===false&&
   signedRecoveryStrategy.original_job_completed===false;
  const recoveryReviewProgress=
   ['SIGNED_CHAT_RECOVERY_INDEPENDENT_DEPENDENCY_TARGET_VERIFIED',
    'SIGNED_CHAT_RECOVERY_OFF_TARGET_REJECTED_WITH_RECEIPT'].includes(
      signedRecoveryTargetReview.status)&&
   /^work:[a-f0-9]{32}$/.test(
     signedRecoveryTargetReview.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(
     signedRecoveryTargetReview.review_receipt_sha256||'')&&
   signedRecoveryTargetReview.installation_authorized===false&&
   signedRecoveryTargetReview.original_job_completed===false;
  const recoveryReviewRetryProgress=
   signedRecoveryReviewRecovery.status===
    'SIGNED_CHAT_RECOVERY_EXPIRED_REVIEW_REQUEUED_ON_SAME_ORIGINAL'&&
   /^work:[a-f0-9]{32}$/.test(
    signedRecoveryReviewRecovery.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(
    signedRecoveryReviewRecovery.failure_receipt_sha256||'')&&
   signedRecoveryReviewRecovery.installation_authorized===false&&
   signedRecoveryReviewRecovery.original_job_completed===false;
  const signedModelRejectionReentryProgress=
   signedModelRejectionReentry.status==='SIGNED_MODEL_REJECTION_INDEPENDENTLY_QUALIFIED_SAME_ORIGINAL_REENTERED'&&
   /^work:[a-f0-9]{32}$/.test(signedModelRejectionReentry.original_work_id||'')&&
   /^sha256:[a-f0-9]{64}$/.test(signedModelRejectionReentry.ci_receipt_sha256||'')&&
   signedModelRejectionReentry.installation_authorized===false&&
   signedModelRejectionReentry.original_job_completed===false;
  const newDevelopmentAdvanced=signedModelRejectionReentryProgress||recoveryReviewRetryProgress||
   recoverySourceProgress||
   recoveryDraftProgress||recoverySpecProgress||recoveryRevisionProgress||
   recoveryStrategyProgress||recoveryReviewProgress||goalGapRecorded||
   publisherProgress.has(chatNewPublished.status)||
   chatNewBuild.status==='CHAT_NEW_DEVELOPMENT_CODE_DRAFT_GENERATED';
  // This lane already owns its signed ledger. A successful or blocked feature
  // must not preempt the other employees in the same authorized shift.
  let chatNewDevelopmentCheckpoint=null;
  if(newDevelopmentAdvanced){
   chatNewDevelopmentCheckpoint={
    status:'SIGNED_CHAT_NEW_DEVELOPMENT_LANE_ADVANCED',
    development_result:signedModelRejectionReentryProgress?signedModelRejectionReentry:
     recoverySourceProgress?signedRecoveryQuarantine:
     recoveryReviewRetryProgress?signedRecoveryReviewRecovery:
     recoveryDraftProgress?signedRecoveryDraft:
      recoverySpecProgress?signedRecoverySpec:
       recoveryRevisionProgress?signedRecoveryRevision:
        recoveryStrategyProgress?signedRecoveryStrategy:
         recoveryReviewProgress?signedRecoveryTargetReview:
          goalGapRecorded?chatFeatureGap:
        publisherProgress.has(chatNewPublished.status)?
         chatNewPublished:chatNewBuild,
    original_job_completed:false,installation_authorized:false,
    production_changed:false,new_shift_started:false
   };
  }
  // Existing original-job shift work continues on normal wakes, including
  // while a new feature awaits independent GitHub CI or reconciliation.
  // The existing service-only selector determines whether THIS owner
  // shift has an eligible corrective revision. No historical job ID, employee
  // name, arbitrary wake interval or caller-provided scope enters the gate.
  // If this optional fast-lane readback is unavailable, the normal governed
  // shift pipeline still runs; the corrective broker independently authorizes.
  workerStage='CORRECTIVE_CI_WORK_READBACK';
  const boundedCorrectiveScope=await shiftRpc(db,
   'reality_read_next_riley_auto_corrective_ci_v1',{})
   .catch(()=>null);
  // A completed bounded check is not a completed customer job; every lane
  // still records its own durable worker outcome before responding.
  let boundedCorrectiveCheckpoint=null;
  if(isBoundedCorrectiveProofWake(wakeReceipt,boundedCorrectiveScope)){
   workerStage='CORRECTIVE_CI_BOUNDED';
   const corrective=await continueRileyCorrectiveModelIntoIndependentCI({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'ISOLATED_CORRECTIVE_CI_BROKER_EFFECT_UNVERIFIED',
    original_job_completed:false,installation_authorized:false,
    production_changed:false,new_shift_started:false
   }));
   const classification=classifyCorrectiveProofTick(corrective);
   boundedCorrectiveCheckpoint={
    status:'BOUNDED_OWNER_SHIFT_CORRECTIVE_CI_RECONCILED',
    corrective_ci_result:corrective,
    independent_ci_proof_verified:classification.proof_verified,
    independent_ci_verified:classification.proof_verified,
    original_job_completed:false,installation_authorized:false,
    production_changed:false,new_shift_started:false
   };
  }
  // Existing Governed Auto-Trigger: separately qualified independent
  // failure can lease ONE new repair attempt on the SAME authorized original.
  // The bounded model stage records only a proposed edit; subsequent frozen
  // independent CI, exact install approval and final settlement remain gated.
  let sameOriginalRecoveryCheckpoint=null;
  let sameOriginalRecovery={
   status:'NO_SAME_ORIGINAL_RECOVERY_ON_THIS_WORKER_WAKE',
   original_job_completed:false,installation_authorized:false,
   production_changed:false,new_shift_started:false
  };
  if(wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'){
   workerStage='SAME_ORIGINAL_RECOVERY_ELIGIBILITY';
   sameOriginalRecovery=
    await continueSameOriginalRecoveryAfterVerifiedFailure({
     db,env:process.env,fetchImpl:fetch
    }).catch(()=>({
     status:'RECOVERY_PROVIDER_OR_EVIDENCE_UNVERIFIED_NO_REPLAY',
     original_job_completed:false,installation_authorized:false,
     production_changed:false,new_shift_started:false
    }));
   if(['SAME_ORIGINAL_RECOVERY_PATCH_RECORDED',
       'RECOVERY_PROVIDER_OR_EVIDENCE_UNVERIFIED_NO_REPLAY']
       .includes(sameOriginalRecovery.status)){
    // Failure belongs to this original, not the whole shift. Retain its
    // durable repair ledger, without declaring a worker or job completed.
    sameOriginalRecoveryCheckpoint={
     status:sameOriginalRecovery.status,
     next_action:sameOriginalRecovery.status==='SAME_ORIGINAL_RECOVERY_PATCH_RECORDED'?
      'SAME_ORIGINAL_RECOVERY_PATCH_AWAITING_INDEPENDENT_CI':
      'SAME_ORIGINAL_RECOVERY_PROOF_UNVERIFIED',
     independent_tests_passed:false,original_job_completed:false,
     new_shift_started:false,installation_authorized:false,
     production_changed:false
    };
   }
  }
  // The EXISTING corrective broker now accepts v2 evidence-bound repair
  // attempts. Only one current owner-warranted candidate is selected from
  // private service storage. Every patch gets a distinct isolated branch,
  // independent frozen CI and the SAME original work ID. Model output alone
  // cannot stage, install or settle anything.
  workerStage='SAME_ORIGINAL_RECOVERY_CI_ELIGIBILITY';
  const recoveryCiScope=await shiftRpc(db,
   'reality_read_next_same_original_recovery_candidate_v2',{})
   .catch(()=>null);
  let sameOriginalRecoveryCiCheckpoint=null;
  if(!boundedCorrectiveCheckpoint&&
     wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
     recoveryCiScope?.status==='SAME_ORIGINAL_RECOVERY_CANDIDATE_READY_FOR_CI'&&
     recoveryCiScope.shift_id===wakeReceipt.shift_id&&
     /^[a-f0-9-]{36}$/i.test(recoveryCiScope.attempt_id||'')&&
     /^work:[a-f0-9]{32}$/.test(recoveryCiScope.original_work_id||'')&&
     Number.isSafeInteger(recoveryCiScope.attempt_number)&&
     recoveryCiScope.attempt_number>=2&&
     recoveryCiScope.installation_authorized===false&&
     recoveryCiScope.original_job_completed===false&&
     recoveryCiScope.production_changed===false){
   workerStage='SAME_ORIGINAL_RECOVERY_CI_BROKER';
   const retryCi=await continueRileyCorrectiveModelIntoIndependentCI({
    db,env:process.env,fetchImpl:fetch,version:2
   }).catch(()=>({
    status:'ISOLATED_CORRECTIVE_CI_BROKER_EFFECT_UNVERIFIED',
    original_job_completed:false,new_shift_started:false,
    installation_authorized:false,production_changed:false
   }));
   const expectedBranch='reality/riley/auto-corrective-'+
     recoveryCiScope.original_work_id.slice(5)+'-a'+
     recoveryCiScope.attempt_number;
   const matchingProof=retryCi.original_work_id===
      recoveryCiScope.original_work_id&&
     (retryCi.attempt_id==null||
      retryCi.attempt_id===recoveryCiScope.attempt_id)&&
     (retryCi.candidate_branch==null||
      retryCi.candidate_branch===expectedBranch);
   const classification=matchingProof?
     classifyCorrectiveProofTick(retryCi):
     {worker_status:'WAKE_FAILED',
      worker_result:'CORRECTIVE_PROOF_BOUNDARY_UNVERIFIED',
      http_status:503,proof_verified:false};
   sameOriginalRecoveryCiCheckpoint={
    status:'GOVERNED_SAME_ORIGINAL_RECOVERY_CI_RECONCILED',
    original_work_id:recoveryCiScope.original_work_id,
    attempt_id:recoveryCiScope.attempt_id,
    attempt_number:recoveryCiScope.attempt_number,
    corrective_ci_result:retryCi,
    independent_ci_proof_verified:classification.proof_verified,
    independent_ci_verified:classification.proof_verified,
    original_job_completed:false,new_shift_started:false,
    installation_authorized:false,production_changed:false
   };
  }
  // Evidence-backed transition from verified corrective CI into the same
  // original's eventual owner install decision. This READS provider evidence
  // and stages a service-only review. It never installs or creates consent.
  workerStage='SIGNED_CHAT_FULL_GOAL_INDEPENDENT_QUALIFICATION';
  const signedChatFullGoalAcceptance=wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'?
   await advanceSignedChatFullGoalAcceptance({db,env:process.env,shiftId:wakeReceipt.shift_id,
    workerRunId:actualWorkerRunId,fetchImpl:fetch}):{status:'NO_CURRENT_SIGNED_GOAL_ACCEPTANCE_SCOPE'};
  workerStage='GENERALIZED_ORIGINAL_INSTALL_REVIEW_PREFLIGHT';
  const generalizedInstallReview=
   await stageGeneralizedVerifiedOriginalInstallReview({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'GENERALIZED_REVIEW_PROVIDER_SOURCE_OR_RELEASE_PROOF_UNVERIFIED',
    owner_approval_ready:false,installation_authorized:false,
    original_job_completed:false,production_changed:false
   }));
  // The preapproved transport canary is not a capability installation:
  // it is durably fenced by the private DB and can only write inert evidence.
  workerStage='GENERALIZED_ORIGINAL_SOURCE_WRITE_PERMISSION_PROBE';
  const generalizedSourceWriteTransport=
   await verifyGeneralizedOriginalSourceWriteTransport({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'GENERALIZED_CANARY_PROVIDER_PROOF_NOT_ACCEPTED',
    isolated_github_write_verified:false,
    preview_auto_deploy_verified:false,
    installation_authorized:false,source_installed:false,
    original_job_completed:false,production_changed:false
   }));
  // Same pre-existing signed worker; no new shift or trigger. The Edge
  // broker limits this preapproval test to an inert source-path .txt write,
  // and subsequently reads independent push-triggered GitHub Actions evidence.
  workerStage='GENERAL_ORIGINAL_PUSH_CI_PREFLIGHT';
  const generalOriginalAcceptancePush=
   await verifyGeneralOriginalAcceptancePushTransport({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'GENERAL_ORIGINAL_CI_PUSH_UNVERIFIED',
    independent_push_acceptance_verified:false,
    installation_authorized:false,source_installed:false,
    original_job_completed:false,production_changed:false
   }));
  // Separately verify the official Vercel/GitHub integration status for
  // the earlier one-use inert canary commit. No client-reported deployment
  // and no green generic CI can satisfy this release transport readback.
  workerStage='GENERALIZED_ORIGINAL_PREVIEW_AUTO_DEPLOY_EVIDENCE';
  const generalizedPreviewDeployment=
   await verifyGeneralizedOriginalPreviewAutoDeploy({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'GENERALIZED_DEPLOY_PROVIDER_STATUS_NOT_ACCEPTED',
    preview_auto_deploy_verified:false,
    installation_authorized:false,original_job_completed:false,
    production_changed:false
   }));
  // A previously owner-approved exact repair must advance from its ORIGINAL
  // to installation and independent settlement without a third confirmation.
  // These brokers cannot create consent and continue only DB-current work.
  workerStage='GENERAL_ORIGINAL_OWNER_APPROVED_INSTALL_CONTINUATION';
  const generalOriginalInstall=
   await continueGeneralOwnerApprovedOriginalInstall({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'GENERAL_INSTALL_PRIVILEGED_PROVIDER_UNVERIFIED',
    source_installed:false,original_job_completed:false,
    production_changed:false
   }));
  // The original one-use installation is consumed. A separate signed,
  // independently tested exact recovery decision may publish once; all
  // subsequent wakes are read-only reconciliations, not retry permissions.
  workerStage='GENERAL_ORIGINAL_ONE_USE_RECOVERY_PUBLICATION';
  const generalOriginalRecoveryPublication=
   await continueGeneralOriginalOwnerApprovedRecovery({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'RECOVERY_SIGNED_PROVIDER_UNVERIFIED_NO_REPLAY',
    source_installed:false,original_job_completed:false,
    production_changed:false
   }));
  // A fenced original is a one-time source-backed engineering diagnosis.
  // The model cannot authorize another write, installation or settlement.
  const fencedOriginalInvestigationPromise=
   investigateGeneralOriginalFencedRecovery({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'FENCED_RECOVERY_INVESTIGATION_PROVIDER_UNVERIFIED',
    independently_tested:false,external_retry_authorized:false,
    original_job_completed:false,production_changed:false
   }));
  workerStage='GENERAL_ORIGINAL_INDEPENDENT_FINAL_SETTLEMENT';
  const generalOriginalSettlement=
   await settleGeneralOwnerApprovedOriginal({
    db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'GENERAL_POSTINSTALL_PROVIDER_UNAVAILABLE',
    original_job_completed:false,production_changed:false
   }));
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
  workerStage='CHAT_LEASE_RECONCILIATION';
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
  const correctiveCiPromise=boundedCorrectiveCheckpoint?
   Promise.resolve(boundedCorrectiveCheckpoint.corrective_ci_result):
   sameOriginalRecoveryCiCheckpoint?
   Promise.resolve(sameOriginalRecoveryCiCheckpoint.corrective_ci_result):
   continueRileyCorrectiveModelIntoIndependentCI({
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
     workerStage='SHIFT_OWNER_READBACK';
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
  workerStage='SHIFT_COMPLETION_CHECK';
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
  workerStage='OWNER_EXECUTION_GRAPH';
  const initialGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
   'reality_read_current_shift_execution_graph_v1',{}));
  workerStage='GOVERNED_EXECUTION_TICK';
  const result=await processGovernedEmployeeShiftTick(db,{
   coordinateRoleWork,executeQualifiedOriginals
  }).catch(error=>{
   // Current shift graph has already passed owner/identity validation.
   // Preserve the uncertain original, never replay its side effect here.
   // An unavailable database remains a whole-worker infrastructure failure.
   if(!isIsolatedOriginalProviderOutage(error))throw error;
   console.warn('REALITY_SHIFT_ONE_ORIGINAL_PROVIDER_UNAVAILABLE');
   return {ok:false,
    status:'EXACT_SHIFT_ORIGINAL_TICK_BLOCKED_OTHER_WORK_CONTINUES',
    shift_id:initialGraph.shift_id,original_job_completed:false,
    original_job_retried:false,new_shift_started:false,
    installation_authorized:false,production_changed:false};
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
   workerStage='SOURCE_PROOF_GRAPH';
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
  workerStage='CURRENT_EXECUTION_GRAPH';
  const unifiedGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
   'reality_read_current_shift_execution_graph_v1',{}),{
    expectedShiftId:initialGraph.shift_id
  });
  if(initialGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
     unifiedGraph.status!=='UNIFIED_OWNER_JOB_CONTROL_READY')
   throw Error('UNIFIED_WORK_SCOPE_CHANGED_DURING_SHIFT_TICK');
  // Existing worker + existing exact shift; never a second orchestrator.
  // Shadow diagnostics only until independently bound canonical acceptance,
  // one-use transition CAS and final settlement writers are deployed.
  const finalLoopEngineShadow=await inspectFinalLoopOnExistingSignedWorker({
   db,wake:wakeReceipt,graph:unifiedGraph,env:process.env,fetchImpl:fetch
  });
  // A gated, one-use diagnostic checkpoint records only a verified
  // missing-acceptance obligation. No model invocation, external effect,
  // installation, original settlement or shift restart is permitted.
  const finalLoopEvidenceCheckpoint=await recordOneFinalLoopEvidenceCheckpoint({
   db,wake:wakeReceipt,workerRunId:actualWorkerRunId,
   inspection:finalLoopEngineShadow,env:process.env,fetchImpl:fetch
  });
  // The EXISTING categorizer reads the durable investigation/action/review
  // receipts, not the model's description or this wake's success status.
  // Source-bound next actions remain advisory until an installed governed
  // executor independently checks its own authority and effect.
  workerStage='SIGNED_CONTINUITY_DURABLE_RECOVERY_CATEGORIZATION';
  const continuityRecoveryHandoffClassification=
   wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
   /^[a-f0-9-]{36}$/i.test(unifiedGraph.owner_id||'')?
    await Promise.all([
     shiftRpc(db,'reality_read_owner_shift_continuity_incidents_v1',{
      p_owner_id:unifiedGraph.owner_id
     },{timeoutMs:6000}),
     shiftRpc(db,'reality_read_owner_signed_shift_recovery_actions_v1',{
      p_owner_id:unifiedGraph.owner_id
     },{timeoutMs:6000})
    ]).then(([incidentsReadback,actionsReadback])=>
     classifyRealityContinuityRecoveryHandoff({
      ownerId:unifiedGraph.owner_id,shiftId:wakeReceipt.shift_id,
      incidentsReadback,actionsReadback
     })
    ).catch(()=>({
     status:'GOVERNED_RECOVERY_DURABLE_READBACK_UNVERIFIED',
     classification_only:true,action_dispatched:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false
    })):
    {status:'NO_CURRENT_SIGNED_RECOVERY_CLASSIFICATION_SCOPE',
     classification_only:true,action_dispatched:false,
     repair_executed:false,original_job_completed:false,
     installation_authorized:false,production_changed:false};

  // Registered handlers are reusable capability TYPES, never work IDs.
  // The existing signed executor owns the source-requalification action;
  // classification does not independently authorize or replay that effect.
  // Missing provider authority is a proof/owner boundary, NOT an excuse
  // to synthesize a successful repair or restart the fenced GitHub write.
  const signedWorkerReleaseOperatingLane=inspectFinalLoopSignedWorkerOperatingLane({
   env:process.env,dbProject:db.project
  });
  const registeredRecoveryActionKeys=Object.freeze([
   'REQUALIFY_EXISTING_CONTINUITY_SOURCE',
   ...(signedWorkerReleaseOperatingLane.status===
       'FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED'?
    ['PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET']:[])
  ]);
  const continuityRecoveryRegisteredRouting=planCategorizedContinuityRecovery({
   classification:continuityRecoveryHandoffClassification,
   ownerId:unifiedGraph.owner_id,shiftId:wakeReceipt.shift_id,
   registeredActionKeys:registeredRecoveryActionKeys
  });
  // The signed worker now reveals the capability release actually loaded
  // on THIS wake. A different PR's READY preview is not an active install.
  // The independent release/alias reviewer must separately compare this
  // immutable runtime identity with an exact approved release and CI proof.
  const signedWorkerCapabilityDelivery=attestSignedWorkerLoadedCapabilities({
   wake:wakeReceipt,graph:unifiedGraph,env:process.env,
   registeredActionKeys:registeredRecoveryActionKeys
  });
  // Durable evidence from the ACTUAL scheduled worker, not a deployed
  // preview's environment or a release review's self-certification.
  // Only the isolated, opt-in, service-role path may append this receipt.
  // No new job, model action, owner approval or provider write is possible.
  let signedWorkerDurableReleaseWake={
   status:'SIGNED_WORKER_RELEASE_WAKE_ATTESTATION_NOT_ENABLED',
   release_activated:false,original_job_completed:false
  };
  if(process.env.REALITY_SIGNED_WORKER_RELEASE_ATTESTATION_ENABLED==='true'){
   if(process.env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED!=='true'||
      db.project!==process.env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF||
      signedWorkerReleaseOperatingLane.operating_lane!=='NORMAL_SIGNED_SHIFT'||
      signedWorkerCapabilityDelivery.status!==
       'SIGNED_WORKER_RELEASE_AND_REGISTERED_ACTIONS_OBSERVED'){
    signedWorkerDurableReleaseWake={
     status:'SIGNED_WORKER_RELEASE_WAKE_ISOLATION_OR_RUNTIME_UNVERIFIED',
     release_activated:false,original_job_completed:false
    };
   }else{
    try{
     const actual=await shiftRpc(db,'reality_record_signed_worker_release_wake_v1',{
      p_worker_run_id:actualWorkerRunId,
      p_owner_id:unifiedGraph.owner_id,p_shift_id:wakeReceipt.shift_id,
      p_release_sha:signedWorkerCapabilityDelivery.running_release_sha,
      p_release_ref:signedWorkerCapabilityDelivery.running_release_ref,
      p_registered_capabilities:registeredRecoveryActionKeys
     },{timeoutMs:6000});
     signedWorkerDurableReleaseWake=
      actual?.status==='SIGNED_WORKER_RELEASE_WAKE_DURABLY_RECORDED'&&
      actual.worker_run_id===actualWorkerRunId&&
      actual.shift_id===wakeReceipt.shift_id&&
      actual.release_sha===signedWorkerCapabilityDelivery.running_release_sha&&
      actual.release_ref===signedWorkerCapabilityDelivery.running_release_ref&&
      actual.original_job_completed===false&&
      actual.release_activated===false?
       actual:{
        status:'SIGNED_WORKER_RELEASE_WAKE_RECEIPT_UNVERIFIED',
        release_activated:false,original_job_completed:false
       };
    }catch{
     signedWorkerDurableReleaseWake={
      status:'SIGNED_WORKER_RELEASE_WAKE_DB_OR_TRANSPORT_UNAVAILABLE',
      release_activated:false,original_job_completed:false
     };
    }
   }
  }
  // Reuse THIS signed worker wake, THIS owner-scoped shift graph, and the
  // existing employee discovery inventory. One bounded model inquiry at most
  // per wake; the database singleflight prevents replay of unchanged sources.
  // It only records source-backed investigation, never admits another job.
  // The unified execution graph intentionally requires a completion-bound
  // original-job warrant. It must NOT silently suppress employee SOURCE
  // investigations inside an otherwise valid, time-bounded signed shift.
  // The existing signed wake is independently rebound to an exact owner
  // and existing discovery inventory by a service-only read-only RPC.
  workerStage='SIGNED_EMPLOYEE_INQUIRY_SCOPE';
  let signedEmployeeInquiryScope={
   status:'NO_CURRENT_SIGNED_EMPLOYEE_INQUIRY_SCOPE',
   investigation_authorized:false,owner_verified:false,
   original_job_created:false,execution_authorized:false,
   installation_authorized:false,production_changed:false
  };
  if(wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'){
   signedEmployeeInquiryScope=await shiftRpc(db,
    'reality_read_current_signed_employee_inquiry_scope_v1',{
     p_shift_id:wakeReceipt.shift_id
    }).catch(()=>({
     status:'SIGNED_EMPLOYEE_INQUIRY_SCOPE_READBACK_UNAVAILABLE',
     investigation_authorized:false,owner_verified:false,
     original_job_created:false,execution_authorized:false,
     installation_authorized:false,production_changed:false
    }));
  }
  const signedInquiryValid=(
   signedEmployeeInquiryScope.status===
    'OWNER_SIGNED_EMPLOYEE_INQUIRY_SCOPE_ACTIVE'&&
   signedEmployeeInquiryScope.owner_verified===true&&
   /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
    signedEmployeeInquiryScope.owner_id||'')&&
   signedEmployeeInquiryScope.shift_id===wakeReceipt.shift_id&&
   /^sha256:[a-f0-9]{64}$/.test(
    signedEmployeeInquiryScope.plan_fingerprint||'')&&
   Number.isSafeInteger(signedEmployeeInquiryScope.due_source_count)&&
   signedEmployeeInquiryScope.due_source_count>0&&
   signedEmployeeInquiryScope.due_source_count<=1200&&
   signedEmployeeInquiryScope.investigation_authorized===true&&
   signedEmployeeInquiryScope.source_only===true&&
   signedEmployeeInquiryScope.original_job_created===false&&
   signedEmployeeInquiryScope.execution_authorized===false&&
   signedEmployeeInquiryScope.installation_authorized===false&&
   signedEmployeeInquiryScope.production_changed===false
  );
  // The old completion-bound graph continues to authorize ORIGINAL work.
  // Both paths must agree if present; the source-only readback never
  // broadens original-job or installation authority.
  if(signedInquiryValid&&
   unifiedGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
   (unifiedGraph.owner_id!==signedEmployeeInquiryScope.owner_id||
    unifiedGraph.shift_id!==signedEmployeeInquiryScope.shift_id))
   throw Error('EMPLOYEE_INQUIRY_OWNER_SHIFT_CONFLICT');
  const inquiryOwnerId=signedInquiryValid?
   signedEmployeeInquiryScope.owner_id:
   unifiedGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
   /^[a-f0-9-]{36}$/i.test(unifiedGraph.owner_id||'')?
    unifiedGraph.owner_id:null;
  const employeeTemporalInquiryPromise=inquiryOwnerId?
   generateOneEmployeeTemporalInquiry({
    ownerId:inquiryOwnerId,db,env:process.env,fetchImpl:fetch
   }).catch(()=>({
    status:'EMPLOYEE_TIME_INQUIRY_UNVERIFIED',
    new_original_jobs_created:0,execution_authorized:false,
    installation_authorized:false,production_changed:false
   })):
   Promise.resolve({
    status:signedEmployeeInquiryScope.status===
      'SIGNED_EMPLOYEE_INQUIRY_SCOPE_READBACK_UNAVAILABLE'?
      'EMPLOYEE_INQUIRY_WORK_SCOPE_PROOF_UNAVAILABLE':
      'NO_CURRENT_SIGNED_SHIFT_FOR_EMPLOYEE_INQUIRY',
    new_original_jobs_created:0,execution_authorized:false,
    installation_authorized:false,production_changed:false
   });
  // The worker automatically reconciles native-repair and PR-review receipts
  // against the frozen owner warrant on every pulse. The status is merely
  // a truthful next-work diagnostic: never a new job or installation grant.
  let automaticWorkSupervisor=null;
  let automaticWorkSupervisorStatus='NO_CURRENT_OWNER_SHIFT_TO_TRIAGE';
  if(unifiedGraph.status==='UNIFIED_OWNER_JOB_CONTROL_READY'){
   try{
    workerStage='EMPLOYEE_SOURCE_READBACK';
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
    workerStage='WEEKLY_WORK_QUALIFICATION';
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
  // Every signed wake independently qualifies REAL saved RED->GREEN repair
  // opportunities against GitHub and original shift scope. Read-only: a
  // decision packet, never a new job, approval or installation.
  let automaticRepairOpportunityQualification={
   status:'NO_AUTHORIZED_OWNER_SOURCE_FOR_REPAIR_QUALIFICATION',
   reviewed_candidate_count:0,work_orders:[],
   installation_authorized:false,production_changed:false,
   original_job_completed:false,new_shift_started:false,read_only:true
  };
  // This is independent of the advisory weekly/Home intake. Its only
  // prerequisites are this worker's signed wake, exact validated owner graph,
  // and the independent read-only current owner/shift warrant gate.
  // A broken optional supervisor intake must not silence a real research
  // repair's safe next-action decision.
  if(canAutomaticallyQualifyResearchRepairOnSignedWake({
   wakeReceipt,graph:unifiedGraph,originalGate:sameOriginalPostmaintenanceGate
  })){
   try{
    workerStage='AUTOMATIC_OWNER_REPAIR_SOURCE_AND_SCOPE_QUALIFICATION';
    automaticRepairOpportunityQualification=
     await automaticallyQualifyVerifiedRepairOpportunity({
      db,env:process.env,graph:unifiedGraph,
      originalGate:sameOriginalPostmaintenanceGate,
      shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,
      fetchImpl:fetch
     });
   }catch(error){
    // A bounded diagnostic category helps Reality investigate the next
    // blocker without disclosing provider responses, credentials or model text.
    const code=String(error?.message||'');
    const failureCode=/^AUTO_REPAIR_QUALIFICATION_[A-Z0-9_]{4,100}$/.test(code)||
      code==='SHIFT_RPC_NOT_ALLOWLISTED'||
      /^SHIFT_DATABASE_RPC_reality_read_owner_market_repair_proofs_v1_(?:TIMEOUT|UNAVAILABLE)$/.test(code)?
      code:'REPAIR_SOURCE_OR_PROVIDER_UNVERIFIED';
    automaticRepairOpportunityQualification={
     status:'AUTOMATIC_REPAIR_SOURCE_SCOPE_OR_PROVIDER_UNVERIFIED',
     failure_code:failureCode,
     reviewed_candidate_count:0,work_orders:[],
     installation_authorized:false,production_changed:false,
     original_job_completed:false,new_shift_started:false,read_only:true
    };
   }
  }
  // The signed verified candidate becomes a durable exact owner decision,
  // available in Reality Chat; once approved, the same worker independently
  // repeats source readback on the SAME shift. No code install or final claim.
  let signedRepairOwnerScopeHandoff={
   status:'NO_VERIFIED_OWNER_REPAIR_SCOPE_HANDOFF',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  };
  if(canAutomaticallyQualifyResearchRepairOnSignedWake({
   wakeReceipt,graph:unifiedGraph,originalGate:sameOriginalPostmaintenanceGate
  })){
   try{
    workerStage='SIGNED_REPAIR_SCOPE_OWNER_DECISION_AND_CONTINUATION';
    signedRepairOwnerScopeHandoff=await advanceSignedRepairScopeOwnerHandoff({
     db,env:process.env,graph:unifiedGraph,
     qualification:automaticRepairOpportunityQualification,
     shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,
     fetchImpl:fetch
    });
   }catch{
    signedRepairOwnerScopeHandoff={
     status:'SIGNED_REPAIR_SCOPE_HANDOFF_OR_CONTINUATION_UNVERIFIED',
     installation_authorized:false,original_job_completed:false,
     production_changed:false,new_shift_started:false
    };
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
  // Observe real GitHub source eligibility before treating the next
  // original PR review as a recoverable provider/LLM job. Draft sources
  // are incompatible with the existing executor's sourceDetails gate.
  // This is a read-only, preview-only shadow diagnostic; existing claims,
  // owner authority and worker dispatch are left entirely unchanged.
  let rileyPrSourceReadiness={
   status:'SIGNED_PR_SOURCE_READINESS_SHADOW_DISABLED',
   read_only:true,original_job_completed:false,
   production_changed:false
  };
  if(hasReview&&process.env.VERCEL_ENV==='preview'&&
     process.env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'){
   try{
    rileyPrSourceReadiness=
     await inspectCurrentRileyPrReviewSourceReadiness({
      graph:unifiedGraph,env:process.env,fetchImpl:fetch
     });
   }catch{
    rileyPrSourceReadiness={
     status:'SIGNED_PR_SOURCE_CURRENT_PROVIDER_READ_UNAVAILABLE',
     read_only:true,original_job_completed:false,
     production_changed:false
    };
   }
  }


  // Native signed PR source inspection -> scoped parent-bound evidence
  // handoff. The preview branch is read-only by default. Even when an
  // explicitly isolated DB is configured, staging never creates executable
  // children, changes draft status, consumes approval or settles a parent.
  let finalLoopPrSourcePlanHandoff={
   status:'FINAL_LOOP_CHILD_SOURCE_HANDOFF_NOT_ENABLED',
   read_only:true,child_original_admitted:false,
   original_job_completed:false,production_changed:false
  };
  if(hasReview&&process.env.VERCEL_ENV==='preview'&&
     process.env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'){
   try{
    finalLoopPrSourcePlanHandoff=
     await connectFinalLoopPrSourcePlanToSignedShift({
      db,graph:unifiedGraph,inspection:rileyPrSourceReadiness,
      workerRunId:actualWorkerRunId,env:process.env,
      fetchImpl:fetch
     });
   }catch{
    finalLoopPrSourcePlanHandoff={
     status:'FINAL_LOOP_CHILD_SOURCE_HANDOFF_OR_DB_PROOF_UNAVAILABLE',
     read_only:true,child_original_admitted:false,
     original_job_completed:false,production_changed:false
    };
   }
  }

  // The signed categorizer consumes TWO independent service-role reads:
  // durable source plans and original-goal acceptance preflight. The result
  // selects a registered capability TYPE; it cannot authorize its effect.
  let finalLoopStagedActionRoutes={
   status:'FINAL_LOOP_STAGED_ACTION_ROUTING_NOT_ENABLED',
   action_dispatched:false,owner_approval_granted:false,
   model_execution_authorized:false,original_job_completed:false
  };
  if(hasReview&&wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
     process.env.VERCEL_ENV==='preview'&&
     process.env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
     process.env.REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED==='true'){
   try{
    const [staged,preflight]=await Promise.all([
     shiftRpc(db,'reality_read_final_loop_pr_source_plans_v1',{
      p_shift_id:wakeReceipt.shift_id
     },{timeoutMs:6000}),
     shiftRpc(db,'reality_read_final_loop_child_approval_preflight_v1',{
      p_shift_id:wakeReceipt.shift_id
     },{timeoutMs:6000})
    ]);
    finalLoopStagedActionRoutes=classifySignedFinalLoopStagedPlanActions({
     graph:unifiedGraph,staged,preflight
    });
   }catch{
    finalLoopStagedActionRoutes={
     status:'FINAL_LOOP_STAGED_ACTION_INDEPENDENT_READBACK_UNAVAILABLE',
     action_dispatched:false,owner_approval_granted:false,
     model_execution_authorized:false,original_job_completed:false
    };
   }
  }
  // The existing signed worker advances the SAME Final Loop child
  // lifecycle: exact parent goal acceptance -> itemized owner approval ->
  // one-use child claim -> governed model -> separate-run verifier.
  // There is no new scheduler or separate approval authority.
  let finalLoopChildApprovalRequest={
   status:'FINAL_LOOP_CHILD_APPROVAL_REQUEST_NOT_ENABLED',
   execution_authorized:false,original_job_completed:false
  };
  let finalLoopChildReview={
   status:'FINAL_LOOP_CHILD_EXECUTOR_NOT_ENABLED',
   original_job_completed:false,production_changed:false
  };
  let finalLoopParentIntegration={
   status:'FINAL_LOOP_PARENT_INTEGRATION_NOT_ENABLED',
   original_job_completed:false,production_changed:false
  };
  let finalLoopParentDelivery={
   status:'FINAL_LOOP_PARENT_DELIVERY_NOT_ENABLED',
   original_job_completed:false,universe_reconciled:false,
   production_changed:false
  };
  if(hasReview&&wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
     process.env.VERCEL_ENV==='preview'&&
     process.env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'){
   // An exact packet is never an execution warrant. The registered handler
   // independently checks its isolated DB fence and signed source proof.
   if(signedWorkerReleaseOperatingLane.status===
       'FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED'&&
      registeredRecoveryActionKeys.includes('PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET')&&
      finalLoopStagedActionRoutes.status===
       'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED'&&
      finalLoopStagedActionRoutes.routes.some(r=>
       r.next_registered_handler==='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET')&&
      (process.env.REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED==='true'||
       process.env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true')){
    try{
     finalLoopChildApprovalRequest=
      await requestFinalLoopChildApprovalFromAcceptedOriginal({
       db,graph:unifiedGraph,workerRunId:actualWorkerRunId,
       env:process.env,fetchImpl:fetch
      });
    }catch{
     finalLoopChildApprovalRequest={
      status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_OR_OWNER_PACKET_UNVERIFIED',
      execution_authorized:false,original_job_completed:false
     };
    }
   }
   if(process.env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true'){
    try{
     finalLoopChildReview=await advanceOneFinalLoopChildReview({
     db,shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,
     env:process.env,fetchImpl:fetch
    });
   }catch{
    finalLoopChildReview={
     status:'FINAL_LOOP_CHILD_SIGNED_EXECUTION_OR_VERIFICATION_BLOCKED',
     original_job_completed:false,production_changed:false
    };
   }
   // The same authorized signed worker handles bounded integration AFTER
   // child verification, never a new background orchestrator.
   try{
    finalLoopParentIntegration=
     await advanceOneFinalLoopParentIntegration({
      db,shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,
      env:process.env,fetchImpl:fetch
     });
   }catch{
    finalLoopParentIntegration={
     status:'FINAL_LOOP_INDEPENDENT_PARENT_INTEGRATION_BLOCKED',
     original_job_completed:false,production_changed:false
    };
   }
   }
  }

  // Same signed shift wake carries the final parent proof obligation. This
  // never bypasses parent source, exact owner effect or independent verifier.
  if(hasReview&&wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
    process.env.VERCEL_ENV==='preview'&&
    process.env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
    process.env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED==='true'){
   try{
    finalLoopParentDelivery=await advanceOneFinalLoopParentDelivery({
     db,shiftId:wakeReceipt.shift_id,workerRunId:actualWorkerRunId,
     env:process.env,fetchImpl:fetch
    });
   }catch{
    finalLoopParentDelivery={
     status:'FINAL_LOOP_PARENT_PROVIDER_OR_UNIVERSE_NOT_VERIFIED',
     original_job_completed:false,universe_reconciled:false,
     production_changed:false
    };
   }
  }


  // VERIFIED UNIVERSE RETURN: a parent delivery settles on its own
  // owner-approved workline. Only the independent provider outcome and its
  // separate-run verifier can be bridged back to the ORIGINAL signed shift's
  // Continuity root. This existing-worker call cannot run a model, publish,
  // install, settle, grant authority or create another orchestration engine.
  workerStage='FINAL_LOOP_INDEPENDENT_UNIVERSE_TO_CONTINUITY_RETURN';
  let finalLoopVerifiedCanonicalReturn={
   status:'FINAL_LOOP_VERIFIED_CANONICAL_RETURN_NOT_ENABLED',
   return_appended:false,execution_authorized:false,
   original_job_completed:false
  };
  if(process.env.VERCEL_ENV==='preview'&&
     process.env.REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED==='true'&&
     wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
     /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
       .test(actualWorkerRunId||'')){
   const read=await shiftRpc(db,
    'reality_reconcile_verified_parent_universe_return_v1',{
     p_shift_id:wakeReceipt.shift_id,
     p_worker_run_id:actualWorkerRunId
    },{timeoutMs:7000});
   const noEffect=new Set([
    'FINAL_LOOP_VERIFIED_PARENT_RETURN_ACTIVE_SIGNED_RUN_REQUIRED',
    'FINAL_LOOP_VERIFIED_PARENT_RETURN_EXISTING_SHIFT_REQUIRED',
    'FINAL_LOOP_VERIFIED_PARENT_RETURN_CANONICAL_PROOF_UNVERIFIED',
    'FINAL_LOOP_NO_NEW_INDEPENDENTLY_SETTLED_PARENT_TO_RETURN',
    'FINAL_LOOP_PARENT_ALREADY_RETURNED_NO_REPLAY',
    'FINAL_LOOP_PARENT_RETURN_CANONICAL_HEAD_CHANGED_NO_REPLAY'
   ]);
   if(read?.status==='FINAL_LOOP_VERIFIED_PARENT_RETURN_DURABLY_RECONCILED'){
    if(read.shift_id!==wakeReceipt.shift_id||
       read.owner_id!==unifiedGraph.owner_id||
       read.continuity_root_id!==
        finalLoopContinuityIngress?.shared_continuity_guard?.continuity_root_id||
       read.same_original_independently_verified!==true||
       read.return_appended!==true||
       read.new_effect_executed!==false||
       read.new_authority_granted!==false||
       read.execution_authorized!==false||
       read.production_changed!==false||
       !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
        read.canonical_universe_return_event_id||'')||
       !unifiedGraph.jobs.some(x=>
        x.original_work_id===read.original_work_id&&
        x.source_ref===read.source_ref))
      throw Error('FINAL_LOOP_VERIFIED_CANONICAL_RETURN_RECEIPT_INVALID');
   }else if(!noEffect.has(read?.status)||
      read.return_appended!==false||
      read.execution_authorized!==false||
      read.original_job_completed!==false){
    throw Error('FINAL_LOOP_CANONICAL_RETURN_INDEPENDENT_READBACK_UNVERIFIED');
   }
   finalLoopVerifiedCanonicalReturn=read;
  }

  // One canonical signed shift: reviewed Recovery -> qualified source ->
  // registered continuation handler. A failed dispatch is an explicit
  // pending obligation, never a recovered job or a completed worker result.
  const finalLoopRecoveryCandidate=reconcileReviewedRecoveryToFinalLoopSource({
   graph:unifiedGraph,stagedActions:finalLoopStagedActionRoutes,
   continuityClassification:continuityRecoveryHandoffClassification,
   registeredRouting:continuityRecoveryRegisteredRouting
  });
  const finalLoopRecoveryContinuation=inspectFinalLoopRecoveryContinuation({
   candidate:finalLoopRecoveryCandidate,
   operatingLane:signedWorkerReleaseOperatingLane,
   approvalRequest:finalLoopChildApprovalRequest,
   childReview:finalLoopChildReview,parentDelivery:finalLoopParentDelivery
  });

  // Read the current canonical Continuity head after any verified packet
  // preparation. A packet receipt is durable progress in its own approval
  // ledger, but it must not be treated as original recovery or settlement.
  let finalLoopRecoveryContinuityReadback={
   status:'FINAL_LOOP_RECOVERY_CONTINUITY_READBACK_NOT_TRIGGERED',
   read_only:true,recovery_verified:false,original_job_completed:false
  };
  if(finalLoopRecoveryContinuation.handler_result_verified===true&&
     finalLoopRecoveryCandidate.status===
      'FINAL_LOOP_REVIEWED_RECOVERY_HAS_ONE_ELIGIBLE_OWNER_PACKET_SOURCE'){
   try{
    const currentProof=await shiftRpc(db,
     'reality_read_current_final_loop_proof_envelope_v1',{
      p_shift_id:wakeReceipt.shift_id
     },{timeoutMs:6000});
    finalLoopRecoveryContinuityReadback=
     verifyFinalLoopRecoveryContinuityReadback({
      candidate:finalLoopRecoveryCandidate,
      before:finalLoopEngineShadow.canonical_continuity_handoff,
      after:currentProof
     });
   }catch{
    finalLoopRecoveryContinuityReadback={
     status:'FINAL_LOOP_RECOVERY_CONTINUITY_AFTER_ACTION_NOT_OBSERVED',
     read_only:true,recovery_verified:false,original_job_completed:false
    };
   }
  }

  // Universe feedback is independently read from the SAME service-owned
  // signed shift, original obligations, and parent/Universe settlement RPC.
  // This is operational context only; neither the model nor a Universe
  // projection can dispatch, certify an outcome, grant approval, or restart.
  let finalLoopUniverseFeedback={
   status:'FINAL_LOOP_UNIVERSE_FEEDBACK_NOT_ENABLED',
   read_only:true,universe_readback_verified:false,
   execution_authorized:false,original_job_completed:false
  };
  if(process.env.VERCEL_ENV==='preview'&&
     process.env.REALITY_FINAL_LOOP_UNIVERSE_FEEDBACK_ENABLED==='true'&&
     finalLoopEvidenceCheckpoint?.evidence_checkpoint_acknowledged!==true&&
     finalLoopEngineShadow.status===
       'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'&&
     finalLoopEngineShadow.canonical_continuity_handoff
      ?.canonical_handoff_verified===true){
   try{
    const universeOutcomes=await shiftRpc(db,
     'reality_read_owner_final_loop_parent_outcomes_v1',{
      p_owner_id:unifiedGraph.owner_id,
      p_shift_id:wakeReceipt.shift_id
     },{timeoutMs:6000});
    finalLoopUniverseFeedback=projectFinalLoopUniverseFeedback({
     canonicalView:finalLoopEngineShadow,
     parentOutcomes:universeOutcomes,
     sharedContinuityGuard:finalLoopEngineShadow.shared_continuity_guard?.status===
      'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'?
      finalLoopEngineShadow.shared_continuity_guard:null
    });
   }catch{
    finalLoopUniverseFeedback={
     status:'FINAL_LOOP_UNIVERSE_OUTCOME_READBACK_UNAVAILABLE',
     read_only:true,universe_readback_verified:false,
     execution_authorized:false,original_job_completed:false
    };
   }
  }

  // Reuse Reality's ACTUAL signed engineering candidate, independent
  // target review and case CI as an exact Final Loop original continuation.
  // The independent original-work warrant is enforced before any case
  // is considered eligible. Do not treat model code as a tested repair.
  const finalLoopGovernedEngineering=inspectFinalLoopGovernedEngineering({
   canonicalView:finalLoopEngineShadow,
   maintenanceGate:sameOriginalPostmaintenanceGate,
   modelCandidate:signedMaintenanceRepairModelCandidate,
   independentTargetReview:signedMaintenanceCandidateTargetReview,
   caseCi:signedMaintenanceCaseCiReconciliation,
   releaseLane:signedWorkerReleaseOperatingLane
  });

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
   const incompatiblePreclaim=hasReview&&
    shouldFenceRileyPrClaimForObservedIncompatibility({
     graph:unifiedGraph,inspection:rileyPrSourceReadiness
    });
   rileyOriginalReview=hasReview?
    incompatiblePreclaim?{
     status:'PR_REVIEW_SIGNED_SOURCES_INCOMPATIBLE_NO_CLAIM_OR_RETRY',
     source_diagnostics:rileyPrSourceReadiness.source_diagnostics,
     owner_approval_granted:false,worker_claim_consumed:false,
     original_job_completed:false,installation_authorized:false,
     production_changed:false
    }:
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
  workerStage='CORRECTIVE_CI_RECEIPT_RECONCILIATION';
  const correctiveCiResult=await correctiveCiPromise;
  // The full authenticated Chat investigation proof also belongs to the
  // eventual response, not only the durable pulse-disposition branch.
  // A block-local declaration caused response publication to throw after an
  // otherwise successful WAKE_COMPLETED database receipt.
  const chatWorkHandoff=await chatWorkPromise;
  workerStage='GENERAL_ORIGINAL_FENCED_MODEL_INVESTIGATION';
  const fencedOriginalInvestigation=await fencedOriginalInvestigationPromise;
  // A model result belongs to the same original across all later wakes,
  // even after its one-time model lease has been consumed.
  const fencedOriginalInvestigationState=await shiftRpc(db,
   'reality_read_general_original_fenced_investigation_state_v1',{})
   .catch(()=>({status:'FENCED_ORIGINAL_READBACK_UNVERIFIED',
     independently_tested:false,external_retry_authorized:false,
     original_job_completed:false,production_changed:false}));
  workerStage='SIGNED_MAINTENANCE_FINAL_RECEIPT_RECONCILIATION';
  const signedMaintenanceClose=await shiftRpc(db,
   'reality_close_employee_maintenance_continuation_v1',{}).catch(()=>({
    status:'SIGNED_MAINTENANCE_CLOSURE_READBACK_UNAVAILABLE',
    customer_originals_settled:0,production_changed:false
   }));
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
   // Report a genuinely blocked approved original before unrelated
   // successful source-check receipts. A completed wake is NOT job settlement.
   // This is evidence-only; no retry, permission or new work is created.
   const originalInstallNeedsRecovery=
    generalOriginalSettlement?.original_job_completed!==true&&
    generalOriginalInstall?.status===
     'GENERAL_INSTALL_ALREADY_FENCED_NO_PROVIDER_EFFECT_CONFIRMED';
   const autonomousRecoveryDiagnosisReady=
    fencedOriginalInvestigation?.status===
     'FENCED_ORIGINAL_RILEY_MODEL_HYPOTHESIS_RECORDED'||
    (fencedOriginalInvestigationState?.status===
     'FENCED_ORIGINAL_RILEY_DIAGNOSIS_PERSISTED_TEST_REQUIRED'&&
     fencedOriginalInvestigationState.original_job_completed===false&&
     fencedOriginalInvestigationState.independently_tested===false&&
     fencedOriginalInvestigationState.external_retry_authorized===false);
   // A signed independent evidence review does not complete a repair.
   // Propagate the SAME original's remaining authority and test blocker into
   // the existing owner shift pulse; do not lose it behind generic "not due".
   const signedReviewStillNeedsOriginalAuthorization=
    sameOriginalPostmaintenanceGate?.status===
      'EXISTING_ORIGINAL_NOT_AUTHORIZED_BY_MAINTENANCE_SHIFT'&&
    /^sha256:[a-f0-9]{64}$/.test(
      sameOriginalPostmaintenanceGate.signed_external_review_receipt_sha256||'')&&
    sameOriginalPostmaintenanceGate.original_job_completed===false&&
    sameOriginalPostmaintenanceGate.independent_final_receipt_verified===false&&
    sameOriginalPostmaintenanceGate.case_specific_maintenance_ci_red_attested===false;
   // A scoped internal-maintenance warrant is still valid even when its
   // case-specific original RED has not yet been proven. Expose that truthful
   // next-action in the signed worker pulse instead of instructing the owner
   // to authorize the already-authorized shift again. This is read-only:
   // worker diagnostics and a pulse never manufacture a repair receipt.
   // The owner-facing work controller must distinguish investigation
   // evidence from an actually admitted business original. Do not keep
   // requesting a code RED for a UI draft with NO canonical owner job.
   // This remains under the exact existing signed maintenance warrant.
   const signedMaintenanceCanonicalBusinessLineageMissing=
    isSignedMaintenanceOriginalLineageMissing(sameOriginalPostmaintenanceGate);
   const signedMaintenanceAuthorizedCaseRedOutstanding=
    sameOriginalPostmaintenanceGate?.status===
      'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'&&
    sameOriginalPostmaintenanceGate.next_action===
      'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'&&
    sameOriginalPostmaintenanceGate.original_job_completed===false&&
    sameOriginalPostmaintenanceGate.independent_final_receipt_verified===false&&
    sameOriginalPostmaintenanceGate.installation_authorized===false&&
    sameOriginalPostmaintenanceGate.production_changed===false;
   const signedMaintenanceAuthorizedSourceRequalificationPending=
    sameOriginalPostmaintenanceGate?.status===
      'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'&&
    sameOriginalPostmaintenanceGate.next_action===
      'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'&&
    sameOriginalPostmaintenanceGate.original_job_completed===false&&
    sameOriginalPostmaintenanceGate.installation_authorized===false&&
    sameOriginalPostmaintenanceGate.production_changed===false;
   const outcomeCode=generalOriginalSettlement?.original_job_completed===true?
    'GENERAL_ORIGINAL_JOB_SETTLED_FINAL_RECEIPT_VERIFIED':
    // A verified internal repair is not customer original work. Give the
    // missing exact owner business-work lineage priority over a generic
    // successful classification/routing message on the signed worker pulse.
    (signedMaintenanceCanonicalBusinessLineageMissing||
     signedMaintenanceOriginalReturnDispatch?.status===
      'CANONICAL_OWNER_BUSINESS_ORIGINAL_EVIDENCE_REQUIRED')?
    'SIGNED_MAINTENANCE_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_REQUIRED':
    governedContinuityEvidenceClassification?.status===
     'GOVERNED_CONTINUITY_EVIDENCE_SEPARATED_AND_ROUTED'&&
    governedContinuityEvidenceClassification.lanes.some(l=>
     l.lane_kind==='INTERNAL_CAPABILITY_REPAIR')&&
    governedContinuityEvidenceClassification.lanes.some(l=>
     l.lane_kind==='CANONICAL_BUSINESS_ORIGINAL')?
    'SIGNED_MAINTENANCE_REPAIR_AND_ORIGINAL_LINEAGE_SEPARATELY_ROUTED':
    signedMaintenanceArtifactHandoff?.verified_repair_artifact===true?
    'SIGNED_MAINTENANCE_EXACT_REPAIR_ARTIFACT_REVIEW_READY':
    signedMaintenanceAuthorizedCaseRedOutstanding?
    'SIGNED_MAINTENANCE_AUTHORIZED_CASE_SPECIFIC_FROZEN_RED_REQUIRED':
    signedMaintenanceAuthorizedSourceRequalificationPending?
    'SIGNED_MAINTENANCE_AUTHORIZED_SOURCE_REQUALIFICATION_PENDING':
    signedReviewStillNeedsOriginalAuthorization?
    'SIGNED_EVIDENCE_REVIEWED_ORIGINAL_WORK_BLOCKED_BY_WARRANT':
    generalOriginalRecoveryPublication?.source_installed===true?
    'GENERAL_ORIGINAL_SOURCE_INSTALLED_POSTINSTALL_RECEIPT_PENDING':
    generalOriginalRecoveryPublication?.status===
     'RECOVERY_EXACT_OWNER_APPROVAL_PENDING'?
    'GENERAL_ORIGINAL_RECOVERY_READY_FOR_EXACT_OWNER_DECISION':
    generalOriginalRecoveryPublication?.status===
     'RECOVERY_WRITE_FENCED_ORIGINAL_HEAD_UNCHANGED_NO_RETRY'?
    'GENERAL_ORIGINAL_RECOVERY_FENCED_NO_GITHUB_EFFECT':
    autonomousRecoveryDiagnosisReady?
    'FENCED_RILEY_DIAGNOSIS_RECORDED_INDEPENDENT_REPAIR_TEST_REQUIRED':
    originalInstallNeedsRecovery?
    'GENERAL_ORIGINAL_INSTALL_FENCED_NO_PROVIDER_EFFECT':
    correctiveCiResult?.status==='CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED'?
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
   // A signed wake is not shift progress when the same original-work
   // blocker repeats. Route the bounded, receipt-backed signal into the
   // EXISTING incident investigator. No approval, executor or new job here.
   if(/(_REQUIRED|_BLOCKED|_UNVERIFIED|_NOT_READY)$/.test(safeOutcome)){
    await shiftRpc(db,'reality_observe_signed_shift_no_progress_v1',{
     p_shift_id:wakeReceipt.shift_id,
     p_worker_run_id:actualWorkerRunId,p_safe_result:safeOutcome
    },{timeoutMs:8000}).then(receipt=>{
     if(![
      'SIGNED_SHIFT_BLOCKER_FIRST_OBSERVED',
      'SIGNED_SHIFT_REPEATED_BLOCKER_INCIDENT_RECORDED',
      'SIGNED_WORKER_WAKE_ALREADY_OBSERVED_NO_REPLAY'
     ].includes(receipt?.status)||
      receipt.new_original_admitted!==false||
      receipt.execution_authorized!==false||
      receipt.installation_authorized!==false||
      receipt.production_changed!==false)
      throw Error('SIGNED_SHIFT_NO_PROGRESS_RECEIPT_UNVERIFIED');
    }).catch(()=>{
     console.warn('REALITY_SIGNED_SHIFT_NO_PROGRESS_OBSERVER_UNVERIFIED');
    });
   }
   completedPulse=await shiftRpc(db,
    'reality_record_employee_shift_worker_pulse_v1',{
     p_shift_id:wakeReceipt.shift_id,p_status:'WAKE_COMPLETED',
     p_safe_result:safeOutcome
    });
   if(!isDurablyCompletedShiftWorkerPulse(completedPulse,wakeReceipt.shift_id))
    throw Error('WORKER_COMPLETION_PULSE_UNVERIFIED');
   durableWorkerCompletion=completedPulse;
  }
  const employeeTemporalInquiry=await employeeTemporalInquiryPromise;
  // Cross-layer audit on the SAME signed wake. This does not promote an
  // evidence pack, repair, or Universe entry to original-job completion.
  // Health read failures cannot stop a governed shift.
  let signedOwnerHandoffHealth={status:'SIGNED_OWNER_HANDOFF_HEALTH_UNVERIFIED',
   read_only:true,installation_authorized:false,
   original_job_completed:false,production_changed:false};
  if(unifiedGraph?.status==='UNIFIED_OWNER_JOB_CONTROL_READY'&&
      unifiedGraph.shift_id===wakeReceipt.shift_id){
   try{
    const h=await shiftRpc(db,'reality_read_owner_shift_handoff_health_v1',{
     p_owner_id:unifiedGraph.owner_id
    });
    if(h?.status==='SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY'&&
       h.owner_id===unifiedGraph.owner_id&&
       h.shift_id===wakeReceipt.shift_id&&
       h.read_only===true&&h.installation_authorized===false&&
       h.original_job_completed===false&&h.production_changed===false&&
       Number.isSafeInteger(h.original_claim_count)&&
       Number.isSafeInteger(h.original_independent_final_receipt_count)&&
       Number.isSafeInteger(h.employee_independently_verified_evidence_jobs)&&
       Array.isArray(h.maintenance_handoffs)){
      signedOwnerHandoffHealth={
       status:h.status,owner_id:h.owner_id,shift_id:h.shift_id,
       worker_status:h.worker_status,
       employee_independently_verified_evidence_jobs:
        h.employee_independently_verified_evidence_jobs,
       original_claim_count:h.original_claim_count,
       original_independent_final_receipt_count:
        h.original_independent_final_receipt_count,
       original_work_status:h.original_work_status,
       repair_scope_status:h.repair_scope?.status||null,
       maintenance_handoffs:h.maintenance_handoffs.map(x=>({
        source_ref:x.source_ref,status:x.status,
        next_action:x.next_action
       })),
       universe_verified_event_rows:h.universe_verified_event_rows,
       ceo_operational_decision_handoff:h.ceo_operational_decision_handoff,
       read_only:true,installation_authorized:false,
       original_job_completed:false,production_changed:false
      };
    }
   }catch{/* Signed execution continues; no guessed work status. */}
  }
  // Same signed wake: derive outstanding actions for ANY source-backed
  // owner work from its independent ledger, not hardcoded job numbers.
  // The planner cannot mutate, lease, approve, dispatch or settle jobs.
  let governedCapabilityPlan={
   status:'GOVERNED_SOURCE_RECEIPT_CAPABILITY_PLAN_UNAVAILABLE',
   executor_invoked:false,installation_authorized:false,
   original_job_completed:false,production_changed:false
  };
  if(signedOwnerHandoffHealth?.status===
     'SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY'){
   try{
    const exactHealth=await shiftRpc(db,
     'reality_read_owner_shift_handoff_health_v1',{
      p_owner_id:unifiedGraph.owner_id
     });
    governedCapabilityPlan=planGovernedCapabilitiesFromOwnerReceipts({
     health:exactHealth,ownerId:unifiedGraph.owner_id,
     shiftId:wakeReceipt.shift_id,
     registeredActionKeys:process.env.REALITY_MAINTENANCE_EXECUTOR_CONNECTED===
      'true'?[registeredMaintenanceCiAction]:[]
    });
   }catch{
    governedCapabilityPlan={
     status:'GOVERNED_SOURCE_RECEIPT_CAPABILITY_PLAN_UNVERIFIED',
     executor_invoked:false,installation_authorized:false,
     original_job_completed:false,production_changed:false
    };
   }
  }
  // A single CEO-style overview of the same governed signed shift.
  // It reads both the existing automatic supervisor and Final Loop
  // temporal projection. No separate agent, job, warrant, or action.
  const finalLoopExecutiveBrief=projectRealityFinalLoopExecutiveBrief({
   timeHorizon:finalLoopEngineShadow?.time_horizon||null,
   sharedContinuityGuard:finalLoopEngineShadow?.shared_continuity_guard?.status===
     'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'?
      finalLoopEngineShadow.shared_continuity_guard:null,
   supervisor:automaticWorkSupervisor?.status===
    'AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY'?
    automaticWorkSupervisor:null
  });
  // POST-EFFECT BOUNDARY: after signed execution, provider verification,
  // Universe and executive projections, read the same authoritative
  // Continuity again. A changed head must be reverified; a previous wake
  // or LLM conclusion is not proof of a settled original. No new effect.
  workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE';
  let finalLoopContinuityReturn={
   status:'SHARED_CONTINUITY_RETURN_FENCE_NOT_ENABLED',
   read_only:true,execution_authorized:false,
   original_job_completed:false
  };
  if(strictContinuityCycle){
   const returnGraph=assertRealityUnifiedShiftGraph(await shiftRpc(db,
    'reality_read_current_shift_execution_graph_v1',{}),{
     expectedShiftId:wakeReceipt.shift_id
    });
   finalLoopContinuityReturn=await inspectFinalLoopOnExistingSignedWorker({
    db,wake:wakeReceipt,graph:returnGraph,env:process.env,fetchImpl:fetch
   });
   if(finalLoopContinuityReturn.status!==
      'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'||
      finalLoopContinuityReturn.shared_continuity_guard?.status!==
      'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
      finalLoopContinuityReturn.owner_id!==finalLoopContinuityIngress.owner_id||
      finalLoopContinuityReturn.shift_id!==finalLoopContinuityIngress.shift_id||
      finalLoopContinuityReturn.shared_continuity_guard.continuity_root_id!==
       finalLoopContinuityIngress.shared_continuity_guard.continuity_root_id||
      finalLoopContinuityReturn.shared_continuity_guard.revision!==
       finalLoopContinuityReturn.revision||
      finalLoopContinuityReturn.shared_continuity_guard.continuity_head_sha256!==
       finalLoopContinuityReturn.continuity_head_sha256||
      finalLoopContinuityReturn.shared_continuity_guard.execution_authorized!==false||
      finalLoopContinuityReturn.shared_continuity_guard.original_job_completed!==false)
    throw Error('FINAL_LOOP_SHARED_CONTINUITY_RETURN_FENCE_REJECTED');
  }

  workerStage='WORKER_RESPONSE_PUBLICATION';
  // Finish the signed wake lifecycle BEFORE responding: serverless execution
  // after an HTTP response cannot guarantee release of this singleflight lease.
  // A successful wake is still NOT original-job settlement.
  if(actualWorkerRunId&&activePulseDb&&!shiftDbTransportUnreachable){
   try{
    const attested=await shiftRpc(activePulseDb,
     'reality_record_signed_worker_actual_run_v1',{
      p_run_id:actualWorkerRunId,p_status:'COMPLETED',
      p_stage:workerStage
     });
    workerCompletionAttestedBeforeResponse=
     attested?.status==='SIGNED_WORKER_RUN_COMPLETED'&&
     attested.run_id===actualWorkerRunId&&
     attested.original_job_completed===false&&
     attested.installation_authorized===false&&
     attested.production_changed===false;
    if(!workerCompletionAttestedBeforeResponse)
     console.warn('REALITY_SIGNED_WORKER_PRE_RESPONSE_ATTESTATION_UNVERIFIED');
   }catch{
    console.warn('REALITY_SIGNED_WORKER_PRE_RESPONSE_ATTESTATION_UNAVAILABLE');
   }
  }
  if(governedWakeClaimId&&activePulseDb&&!shiftDbTransportUnreachable){
   try{
    const released=await shiftRpc(activePulseDb,
     'reality_release_governed_shift_worker_run_v1',{
      p_claim_id:governedWakeClaimId
     });
    wakeLeaseReleasedBeforeResponse=
     released?.status==='WAKE_RELEASED'&&
     released.original_job_completed===false&&
     released.installation_authorized===false;
    if(!wakeLeaseReleasedBeforeResponse)
     console.warn('REALITY_SHIFT_WORKER_PRE_RESPONSE_LEASE_NOT_RELEASED');
   }catch{
    console.warn('REALITY_SHIFT_WORKER_PRE_RESPONSE_LEASE_RELEASE_UNAVAILABLE');
   }
  }
  return res.status(200).json({...result,
    actual_worker_wake_receipt:wakeReceipt,
    actual_worker_completion_receipt:completedPulse,
    continuous_qualification_inbox:continuousQualificationInbox,
    continuity_qualification_routes:continuityQualificationRoutes,
    exact_approved_business_effect_handoff:exactApprovedBusinessEffectHandoff,
    automatic_work_supervisor:automaticWorkSupervisor,
    automatic_work_supervisor_status:automaticWorkSupervisorStatus,
    integrated_work_intake:integratedWorkIntake,
    automatic_repair_work_order_qualification:automaticRepairOpportunityQualification,
    signed_repair_owner_scope_handoff:signedRepairOwnerScopeHandoff,
    signed_owner_handoff_health:signedOwnerHandoffHealth,
    governed_capability_plan:governedCapabilityPlan,
    integrated_work_intake_status:integratedWorkIntakeStatus,
    weekly_employee_source_investigations:weeklyEmployeeInvestigations,
    employee_time_inquiry_receipt:employeeTemporalInquiry,
    qualified_employee_executable_work:qualifiedEmployeeWork,
    changed_source_same_job_requalification:changedSourceRequalification,
    signed_chat_review_incident_observation:signedChatReviewIncidentObservation,
    signed_chat_model_rejection_reentry:signedModelRejectionReentry,
    shift_investigation_remediation:shiftInvestigationRemediation,
    shift_continuity_incident_investigation:shiftContinuityInvestigation,
    signed_continuity_recovery_action:signedContinuityRecoveryAction,
    signed_continuity_recovery_verification:signedContinuityRecoveryVerification,
    shift_continuity_independent_review:continuityIndependentReview,
    independent_business_qualification_review:businessQualificationReview,
    signed_internal_maintenance_work:internalMaintenanceWork,
    signed_maintenance_failure_baseline:maintenanceFailureBaseline,
    signed_maintenance_ci_preflight:signedMaintenanceCiPreflight,
    signed_maintenance_ci_source_epoch:maintenanceCiSourceEpoch,
    signed_maintenance_epoch_handoff:maintenanceEpochHandoff,
    signed_external_maintenance_review:signedExternalMaintenanceReview,
    same_original_postmaintenance_gate:sameOriginalPostmaintenanceGate,
    signed_original_lineage_evidence:signedOriginalLineageEvidence,
    durable_maintenance_handoff:durableMaintenanceHandoff,
    signed_maintenance_executor_claim:signedMaintenanceExecutorClaim,
    signed_maintenance_executor_outcome:signedMaintenanceExecutorOutcome,
    signed_maintenance_case_ci_dispatch:signedMaintenanceCaseCi,
    signed_maintenance_case_ci_independent_review:signedMaintenanceCaseCiIndependentReview,
    signed_maintenance_sourcecase_ci_reconciliation:signedMaintenanceCaseCiReconciliation,
    signed_maintenance_diagnostic_to_repair_handoff:signedMaintenanceRepairHandoff,
    signed_maintenance_repair_model_candidate:signedMaintenanceRepairModelCandidate,
    signed_maintenance_candidate_target_review:signedMaintenanceCandidateTargetReview,
    signed_maintenance_verified_repair_artifact:signedMaintenanceArtifactHandoff,
    signed_maintenance_install_target_review:signedMaintenanceInstallTargetReview,
    signed_maintenance_canonical_continuity:signedMaintenanceCanonicalContinuity,
    signed_maintenance_governed_trigger:signedMaintenanceGovernedTrigger,
    signed_maintenance_universe_return_trigger:signedMaintenanceReturnTrigger,
    signed_maintenance_original_return_dispatch:signedMaintenanceOriginalReturnDispatch,
    signed_maintenance_universe_postinstall_return:signedMaintenanceUniverseReconciliation,
    signed_maintenance_approved_auto_install:signedMaintenanceApprovedInstall,
    signed_maintenance_independent_postinstall:signedMaintenanceIndependentPostinstall,
    signed_maintenance_verified_artifact_ledger:signedMaintenanceArtifactLedger,
    governed_continuity_evidence_classification:governedContinuityEvidenceClassification,
    governed_continuity_recovery_handoff:continuityRecoveryHandoffClassification,
    governed_continuity_registered_recovery_route:continuityRecoveryRegisteredRouting,
    signed_worker_capability_delivery:signedWorkerCapabilityDelivery,
    signed_worker_release_operating_lane:signedWorkerReleaseOperatingLane,
    signed_worker_durable_release_wake:signedWorkerDurableReleaseWake,
    signed_schedule_evidence_admission:signedScheduleAdmission,
    signed_maintenance_completion_report:signedMaintenanceClose,
    signed_employee_inquiry_scope:signedEmployeeInquiryScope,
    standing_employee_discovery:standingDiscoveryResult,
    employee_capability_schedule:capabilityScheduleResult,
    scheduled_employee_capability_inquiry:scheduledCapabilityInquiryResult,
    operational_self_recovery_investigation:operationalRecoveryResult,
    incident_existing_original_handoff:incidentOriginalHandoff,
    authenticated_chat_work_handoff:chatWorkHandoff,
    same_original_recovery_attempt:sameOriginalRecovery,
    same_original_recovery_checkpoint:sameOriginalRecoveryCheckpoint,
    same_original_recovery_ci_checkpoint:sameOriginalRecoveryCiCheckpoint,
    chat_new_development_checkpoint:chatNewDevelopmentCheckpoint,
    signed_chat_recovery_syntax:signedRecoverySyntax,
    signed_chat_full_goal_acceptance:signedChatFullGoalAcceptance,
    signed_chat_fenced_provider_requalification:fencedProviderRequalification,
    signed_chat_recovery_quarantine:signedRecoveryQuarantine,
    corrective_ci_checkpoint:boundedCorrectiveCheckpoint,
    generalized_original_install_review:generalizedInstallReview,
    generalized_original_source_write_transport:generalizedSourceWriteTransport,
    generalized_original_acceptance_push_preflight:generalOriginalAcceptancePush,
    generalized_original_preview_auto_deploy:generalizedPreviewDeployment,
    generalized_original_approved_install:generalOriginalInstall,
    generalized_original_recovery_publication:generalOriginalRecoveryPublication,
    generalized_original_final_settlement:generalOriginalSettlement,
    generalized_original_fenced_investigation:fencedOriginalInvestigation,
    generalized_original_fenced_investigation_state:fencedOriginalInvestigationState,
    riley_auto_corrective_independent_ci:correctiveCiResult,
    chat_work_claim_reconciliation:chatClaimReconciliation,
    current_shift_verified_auto_admission:shiftVerifiedAutoAdmission,
    completion_bound_work:completionClose,
    final_loop_engine_shadow:finalLoopEngineShadow,
    final_loop_executive_brief:finalLoopExecutiveBrief,
    final_loop_evidence_checkpoint:finalLoopEvidenceCheckpoint,
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
    riley_pr_source_readiness:rileyPrSourceReadiness,
    final_loop_pr_source_plan_handoff:finalLoopPrSourcePlanHandoff,
    final_loop_staged_action_routes:finalLoopStagedActionRoutes,
    final_loop_recovery_source_candidate:finalLoopRecoveryCandidate,
    final_loop_recovery_continuation:finalLoopRecoveryContinuation,
    final_loop_recovery_continuity_readback:finalLoopRecoveryContinuityReadback,
    final_loop_governed_engineering:finalLoopGovernedEngineering,
    final_loop_universe_feedback:finalLoopUniverseFeedback,
    final_loop_continuity_ingress:finalLoopContinuityIngress,
    final_loop_continuity_return:finalLoopContinuityReturn,
    final_loop_child_approval_request:finalLoopChildApprovalRequest,
    final_loop_child_review:finalLoopChildReview,
    final_loop_parent_integration:finalLoopParentIntegration,
    final_loop_parent_delivery:finalLoopParentDelivery,
    final_loop_verified_canonical_return:finalLoopVerifiedCanonicalReturn,
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
 }catch(error){
  // A durable worker-completed receipt cannot be overwritten merely because
  // HTTP response serialization/delivery fails afterward. Preserve the
  // independently stored checkpoint; the dispatcher can read it back.
  if(durableWorkerCompletion){
   console.warn('REALITY_SHIFT_WORKER_RESPONSE_FAILED_AFTER_DURABLE_COMPLETION');
   if(res.headersSent)return;
   return res.status(200).json({
    status:'DURABLE_SHIFT_WAKE_COMPLETED_RESPONSE_FALLBACK',
    actual_worker_completion_receipt:durableWorkerCompletion,
    original_job_completed:false,installation_authorized:false,
    production_changed:false,new_shift_started:false
   });
  }
  // Persist stage only; never provider error text or credentials.
  console.warn('REALITY_SHIFT_WORKER_FAILED_STAGE',workerStage);
  // Classify transport failure without exposing RPC credentials or sending
  // another database write while the boundary is demonstrably unavailable.
  shiftDbTransportUnreachable=isShiftDatabaseTransportUnreachable(error);
  if(shiftDbTransportUnreachable)
   console.warn('REALITY_SHIFT_WORKER_DATABASE_TRANSPORT_UNAVAILABLE');
  const safeStage=/^[A-Z][A-Z0-9_]{5,70}$/.test(workerStage)?
   workerStage:'UNCLASSIFIED_STAGE';
  // Best-effort independent failure timestamp; never claim a model/tool
  // succeeded, never take another job claim and never leak provider secrets.
  if(!shiftDbTransportUnreachable&&activePulseDb&&
     /^[a-f0-9-]{36}$/i.test(activePulseShiftId||'')){
   try{
    await shiftRpc(activePulseDb,
     'reality_record_employee_shift_worker_pulse_v1',{
      p_shift_id:activePulseShiftId,p_status:'WAKE_FAILED',
      p_safe_result:'WORKER_'+safeStage+'_UNVERIFIED'
     });
   }catch{/* Failed heartbeat is not a substitute for work evidence. */}
  }
  return res.status(503).json({
   ok:false,error:'SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED',
   work_completed:false,installation_authorized:false,
   production_changed:false});
 }finally{
  // Independently attest actual completion or failure even when a worker
  // response has already been sent. No false 'successful job' claim.
  if(actualWorkerRunId&&!workerCompletionAttestedBeforeResponse&&
      activePulseDb&&!shiftDbTransportUnreachable){
   const result=res.statusCode>=500?'FAILED':'COMPLETED';
   const stage=/^[A-Z][A-Z0-9_]{5,70}$/.test(workerStage)?
    workerStage:'UNCLASSIFIED_STAGE';
   try{
    await shiftRpc(activePulseDb,'reality_record_signed_worker_actual_run_v1',{
     p_run_id:actualWorkerRunId,p_status:result,p_stage:stage
    });
   }catch{
    console.warn('REALITY_SIGNED_WORKER_FINAL_ATTESTATION_UNAVAILABLE');
   }
  }
  // A failed release leaves a bounded lease, not another concurrent worker.
  // This does not settle customer work or change any authorization.
  if(governedWakeClaimId&&!wakeLeaseReleasedBeforeResponse&&
      activePulseDb&&!shiftDbTransportUnreachable){
   try{
    const released=await shiftRpc(activePulseDb,
     'reality_release_governed_shift_worker_run_v1',
     {p_claim_id:governedWakeClaimId});
    if(released?.status!=='WAKE_RELEASED')
     console.warn('REALITY_SHIFT_WORKER_WAKE_LEASE_NOT_RELEASED');
   }catch{
    console.warn('REALITY_SHIFT_WORKER_WAKE_LEASE_RELEASE_UNVERIFIED');
   }
  }
 }
}
