// Connect the genuine original-job gap evidence to Reality's EXISTING real
// OpenAI generator + isolated Vercel Sandbox. No new model service, no second
// constitutional state machine, no default synthetic tests or install claims.
import {createFoundationalBuildTicket}
 from './reality-foundational-build-loop-v1.0.js';
import {createRealityPinnedPreviewGenerationAdapters}
 from './reality-foundational-vercel-generation-adapters-v1.0.js';

const fail=why=>{throw Error('GENUINE_GENERATION_'+why)};
export function createEvidenceBoundGenerationFactory({
 issuePinnedTicket,providerAdapters,
 env=process.env,makeSandboxAndModel=createRealityPinnedPreviewGenerationAdapters,
}={}){
 if(typeof issuePinnedTicket!=='function'||
    typeof makeSandboxAndModel!=='function')
  fail('TRUSTED_PINNED_TICKET_AND_GENERATOR_REQUIRED');
 for(const name of ['observeMissingCapability','persistCheckpoint',
  'verifyIndependentReceipt']){
  if(typeof providerAdapters?.[name]!=='function')
   fail('TRUSTED_PROVIDER_ADAPTER_REQUIRED_'+name.toUpperCase());
 }
 return async({scope,confirmed_gap:gap,original_work_id}={} )=>{
  if(!scope||scope.original_work_id!==original_work_id||
     gap?.kind!=='GENUINE_MISSING_CAPABILITY'||
     gap.original_work_id!==original_work_id||
     gap.install_authorized!==false||
     gap.production_changed!==false)
   fail('ORIGINAL_GAP_IDENTITY_INVALID');
  // The ticket must be independently minted by a trusted server adapter.
  // Never derive a frozen manifest, source SHA, or goal authority from model
  // output, human text, or a route query parameter.
  const raw=await issuePinnedTicket(Object.freeze({
   original_work_id,owner_id:scope.owner_id,
   goal_id:scope.goal_id,confirmed_gap:gap,
   no_model_authority:true,production_write_permitted:false,
  }));
  const ticket=createFoundationalBuildTicket(raw);
  if(ticket.owner_id!==scope.owner_id||
    ticket.goal_id!==scope.goal_id||
    ticket.original_work_id!==original_work_id||
    ticket.goal_transition_receipt_ref!==scope.goal_transition_receipt_ref||
    ticket.goal_evidence_ref!==scope.goal_evidence_ref||
    ticket.continuity_root_id!==scope.continuity_root_id||
    ticket.worldline_id!==scope.worldline_id||
    ticket.confirmed_gap_receipt_ref!==gap.frozen_failure_ref||
    ticket.confirmed_gap_evidence_hash!==gap.evidence_hash||
    ticket.frozen_regression_sha256!==gap.frozen_suite_sha256||
    ticket.environment!=='ISOLATED_PREVIEW'||
    ticket.confirmed_gap_source!=='INDEPENDENT_PROVIDER_READBACK')
   fail('PINNED_TICKET_DIFFERS_FROM_ORIGINAL_GAP');
  const actual=await makeSandboxAndModel({ticket,env});
  if(typeof actual?.generateCandidate!=='function'||
     typeof actual?.runIsolatedSandbox!=='function')
   fail('ACTUAL_MODEL_AND_ISOLATED_SANDBOX_REQUIRED');
  return Object.freeze({
   ...providerAdapters,
   generateCandidate:actual.generateCandidate,
   runIsolatedSandbox:actual.runIsolatedSandbox,
  });
 };
}

// Original jobs contribute their own source-backed frozen acceptance. This
// adapter receives only independently re-read server/Continuity/worker data;
// never a browser ticket, model interpretation, or hardcoded issue fixture.
export function createPinnedSourceBackedOriginalBuildTicket({
 sourceEvent,gapEvent,queueReadback,frozenReproduction,goalReadback,
 env=process.env,maxAttempts,
}={}){
 const validUuid=x=>typeof x==='string'&&
  /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(x);
 const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 const commit=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
 const src=sourceEvent?.payload,gap=gapEvent?.payload;
 const owner=src?.owner_id,work=src?.original_work_id;
 if(sourceEvent?.entity_type!=='reality_original_source_backed_repair_work'||
    sourceEvent.epistemic_status!=='VERIFIED'||
    !validUuid(sourceEvent.event_id)||!validUuid(owner)||
    src.owner_authorized_investigation!==true||
    src.owner_authorized_installation!==false||
    src.original_job_completed!==false||
    src.production_changed!==false||
    !/^work:[a-f0-9]{32}$/.test(work||'')||
    !/^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/.test(src.source_path||'')||
    !/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/.test(src.frozen_test_path||'')||
    !sha(src.frozen_test_sha256))
  fail('TRUSTED_UNFINISHED_ORIGINAL_SOURCE_REQUIRED');
 if(gapEvent?.entity_type!=='reality_genuine_capability_gap_v1'||
    gapEvent.epistemic_status!=='VERIFIED'||!validUuid(gapEvent.event_id)||
    gap?.owner_id!==owner||gap?.original_work_id!==work||
    gap?.original_work_event_id!==sourceEvent.event_id||
    gap?.independently_verified!==true||
    gap?.original_job_completed!==false||
    gap?.installation_authorized!==false||
    gap?.production_changed!==false||
    !sha(gap?.provider_failure_hash)||gap?.capability_id!==
     src.source_path.split('/').at(-1).replace(/\.mjs$/,'')||
    gap?.verification_suite_ref!==
     'github:frozen-regression:sha256:'+src.frozen_test_sha256||
    gapEvent.continuity_root_id!==sourceEvent.continuity_root_id||
    gapEvent.worldline_id!==sourceEvent.worldline_id)
  fail('INDEPENDENT_GAP_DIFFERS_FROM_ORIGINAL_SOURCE');
 if(queueReadback?.source_event_id!==gapEvent.event_id||
    queueReadback.original_work_id!==work||
    queueReadback.original_work_event_id!==sourceEvent.event_id||
    queueReadback.owner_id!==owner||
    queueReadback.provider_failure_hash!==gap.provider_failure_hash||
    queueReadback.phase!=='FROZEN_REPRODUCED_AWAITING_CANDIDATE'||
    !validUuid(queueReadback.claim_id)||
    queueReadback.installation_authorized!==false||
    queueReadback.original_job_completed!==false)
  fail('FROZEN_WORKER_CLAIM_AND_QUEUE_SOURCE_REQUIRED');
 if(frozenReproduction?.independently_verified!==true||
    frozenReproduction.reproduced_failure!==true||
    frozenReproduction.original_work_id!==work||
    frozenReproduction.capability_id!==gap.capability_id||
    frozenReproduction.source_event_id!==gapEvent.event_id||
    frozenReproduction.trigger_id!==queueReadback.trigger_id||
    frozenReproduction.claim_id!==queueReadback.claim_id||
    frozenReproduction.frozen_suite_sha256!==src.frozen_test_sha256||
    typeof frozenReproduction.provider_run_ref!=='string'||
    frozenReproduction.provider_run_ref.length<15||
    frozenReproduction.external_action_performed!==false||
    frozenReproduction.provider_effect_may_have_occurred!==false)
  fail('INDEPENDENT_PINNED_FROZEN_REPRODUCTION_REQUIRED');
 if(goalReadback?.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
    goalReadback.principal_id!==owner||
    goalReadback.conversation_id!==gap.conversation_id||
    goalReadback.state?.active_goal_id!==src.original_goal_id||
    goalReadback.state?.active_goal?.status!=='ACTIVE'||
    goalReadback.state.active_goal.user_confirmed!==true||
    goalReadback.state.active_goal.last_transition_receipt_id!==
     src.goal_transition_receipt_ref||
    gap.goal_transition_event_id!==src.goal_transition_receipt_ref||
    !validUuid(src.goal_transition_receipt_ref))
  fail('CURRENT_AUTHORIZED_OWNER_GOAL_REQUIRED');
 if(env.VERCEL_ENV!=='preview'||env.GITHUB_ACTIONS==='true'||
    !commit(env.VERCEL_GIT_COMMIT_SHA)||
    !/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(
     String(env.VERCEL_GIT_COMMIT_REF||''))||
    !Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>8)
  fail('PINNED_ISOLATED_PREVIEW_AND_BUDGET_REQUIRED');
 const frozenRef=src.frozen_test_path.split('/').at(-1).replace(/\.test\.js$/,'');
 return createFoundationalBuildTicket({
  owner_id:owner,goal_id:src.original_goal_id,
  goal_transition_receipt_ref:src.goal_transition_receipt_ref,
  goal_evidence_ref:'continuity:'+src.goal_transition_receipt_ref,
  original_work_id:work,continuity_root_id:sourceEvent.continuity_root_id,
  worldline_id:sourceEvent.worldline_id,
  confirmed_gap_receipt_ref:'continuity:'+gapEvent.event_id,
  confirmed_gap_evidence_hash:gap.provider_failure_hash,
  confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
  frozen_regression_contract_kind:'PINNED_SINGLE_TEST',
  frozen_test_path:src.frozen_test_path,
  frozen_regression_manifest_ref:frozenRef,
  frozen_regression_sha256:src.frozen_test_sha256,
  repository_base_sha:env.VERCEL_GIT_COMMIT_SHA,
  repository_branch:env.VERCEL_GIT_COMMIT_REF,
  source_entrypoint:src.source_path,environment:'ISOLATED_PREVIEW',
  max_attempts:maxAttempts,
  allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
 });
}
