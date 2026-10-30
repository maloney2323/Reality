// One existing Reality constitutional driver gets one replaceable model and one
// actual isolated verifier. No second queue, GitHub dispatch token or authority.
import {createConstitutionalGenerationSandboxAdapters}
 from './reality-foundational-constitutional-adapters-v1.0.js';
import {createFoundationalModelGenerator}
 from './reality-foundational-model-provider-v1.0.js';
import {createIsolatedVercelSandbox}
 from './reality-foundational-vercel-sandbox-adapter-v1.0.js';
import {createVerifiedFrozenRegressionReader}
 from './reality-foundational-verified-regression-context-v1.0.js';
import {createSandboxEvidenceCandidate,independentlyVerifySandbox}
 from './reality-foundational-build-loop-v1.0.js';
export function createRealityVercelGenerationAdapters({
 ticket,model,apiKey,SandboxClient,modelFetch=fetch,
 readFrozenRegression=null,
}={}){
 if(ticket?.environment!=='ISOLATED_PREVIEW'||!ticket?.ticket_hash)
  throw Error('FOUNDATION_TRUSTED_PINNED_BUILD_TICKET_REQUIRED');
 const {isolatedSandbox,independentReadback}=createIsolatedVercelSandbox({
  SandboxClient,
 });
 // The model's drafts are independently tested in ephemeral, secret-free
 // Vercel Sandboxes before ONE source candidate enters the constitutional
 // journal. A passing draft is independently re-tested after admission.
 // Each failed preflight is source-bound, provider-attested feedback for
 // the model, never an installation or approval signal.
 const verifyDraftCandidate=async({candidate,attempt})=>{
  const report=await isolatedSandbox(Object.freeze({
   ticket,candidate,attempt,frozen_suite_ref:ticket.frozen_regression_manifest_ref,
   network_permitted:false,secrets_permitted:false,
  }));
  const preliminary=createSandboxEvidenceCandidate(ticket,candidate,report);
  const checked=await independentlyVerifySandbox(ticket,candidate,preliminary,{
   readback:independentReadback,
  });
  if(checked.independently_verified!==true||
     checked.artifact_sha256!==candidate.artifact_sha256)
   throw Error('FOUNDATION_DRAFT_PROVIDER_ATTESTATION_MISMATCH');
  return Object.freeze({
   independent_provider_readback:true,passed:checked.passed,
   artifact_sha256:candidate.artifact_sha256,
   attestation_ref:checked.attestation_ref,
   classification:checked.classification,log_excerpt:checked.log_excerpt,
  });
 };
 const modelGenerate=createFoundationalModelGenerator({
  model,apiKey,fetchImpl:modelFetch,readFrozenRegression,
  verifyDraftCandidate,
 });
 // All success/failure transitions remain in the same constitutional driver.
 // This adapter only proposes source and supplies independent sandbox results.
 return createConstitutionalGenerationSandboxAdapters({
  ticket,modelGenerate,isolatedSandbox,independentReadback,
 });
}

// The live, authenticated preview already has its model key and Vercel OIDC
// identity. Those credentials are consumed only by the trusted host process.
// Do not put either into Sandbox.create(env) or generated source.
export async function createRealityLiveVercelUpgradeAdapters({
 ticket,env=process.env,modelFetch=fetch,
}={}){
 const exactBranches=new Set([
  'experiment/reality-live-durable-adversarial-20261025',
  'feature/first-real-gap-to-generation-handoff-20261029',
  'feature/first178-live-single-claim-execution-20261029',
 ]);
 if(env.VERCEL_ENV!=='preview'||!exactBranches.has(env.VERCEL_GIT_COMMIT_REF)||
   !/^[a-f0-9]{40}$/.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  throw Error('FOUNDATION_LIVE_ISOLATED_PREVIEW_REQUIRED');
 if(ticket?.environment!=='ISOLATED_PREVIEW')
  throw Error('FOUNDATION_LIVE_TICKET_PREVIEW_REQUIRED');
 const {Sandbox}=await import('@vercel/sandbox');
 return createRealityVercelGenerationAdapters({
  ticket,SandboxClient:Sandbox,modelFetch,
  apiKey:env.REALITY_STANDALONE_OPENAI_API_KEY,
  model:env.REALITY_SEMANTIC_REVIEW_MODEL,
  readFrozenRegression:createVerifiedFrozenRegressionReader({
   fetchImpl:modelFetch,
   token:env.REALITY_FIRST178_GITHUB_READ_TOKEN||null,
  }),
 });
}
