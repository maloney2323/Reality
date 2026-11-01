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
