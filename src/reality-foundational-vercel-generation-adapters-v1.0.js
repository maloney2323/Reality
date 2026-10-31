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
 readFrozenRegression=null,providerAuth=null,
}={}){
 if(ticket?.environment!=='ISOLATED_PREVIEW'||!ticket?.ticket_hash)
  throw Error('FOUNDATION_TRUSTED_PINNED_BUILD_TICKET_REQUIRED');
 const {isolatedSandbox,independentReadback}=createIsolatedVercelSandbox({
  SandboxClient,providerAuth,
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
 const githubRunner=env.REALITY_FIRST178_EXECUTOR==='GITHUB_ACTIONS';
 const exactGitHubBranch='refs/heads/feature/first178-live-single-claim-execution-20261029';
 if(githubRunner&&(
  env.GITHUB_ACTIONS!=='true'||
  env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
  env.GITHUB_REF!==exactGitHubBranch||
  env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
  env.GITHUB_SHA!==env.VERCEL_GIT_COMMIT_SHA))
  throw Error('FOUNDATION_GITHUB_ACTIONS_EXACT_BRANCH_ATTESTATION_REQUIRED');
 if(env.VERCEL_ENV!=='preview'||!exactBranches.has(env.VERCEL_GIT_COMMIT_REF)||
   !/^[a-f0-9]{40}$/.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  throw Error('FOUNDATION_LIVE_ISOLATED_PREVIEW_REQUIRED');
 const providerAuth=githubRunner?{
  token:env.VERCEL_TOKEN,teamId:env.VERCEL_TEAM_ID,
  projectId:env.VERCEL_PROJECT_ID,
 }:null;
 if(githubRunner&&(!providerAuth.token||
   !providerAuth.teamId||!providerAuth.projectId))
  throw Error('FOUNDATION_GITHUB_ACTIONS_SANDBOX_API_AUTH_MISSING');
 if(ticket?.environment!=='ISOLATED_PREVIEW')
  throw Error('FOUNDATION_LIVE_TICKET_PREVIEW_REQUIRED');
 const {Sandbox}=await import('@vercel/sandbox');
 return createRealityVercelGenerationAdapters({
  ticket,SandboxClient:Sandbox,modelFetch,providerAuth,
  apiKey:env.REALITY_STANDALONE_OPENAI_API_KEY,
  model:env.REALITY_SEMANTIC_REVIEW_MODEL,
  readFrozenRegression:createVerifiedFrozenRegressionReader({
   fetchImpl:modelFetch,
   token:env.REALITY_FIRST178_GITHUB_READ_TOKEN||null,
  }),
 });
}


// Job-agnostic live preview integration for the EXISTING constitutional
// driver. Strictly bound to the actual deployed Vercel preview SHA and the
// owner-approved original work ticket. No branch #178 or Actions bypass.
export async function createRealityPinnedPreviewGenerationAdapters({
 ticket,env=process.env,modelFetch=fetch,SandboxClient=null,
}={}){
 if(ticket?.environment!=='ISOLATED_PREVIEW'||
  !/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(String(ticket.repository_branch||''))||
  ticket.repository_branch.includes('..')||
  !/^[a-f0-9]{40}$/.test(String(ticket.repository_base_sha||''))||
  !/^src\/reality-extensions\/[A-Za-z0-9._/-]+\.mjs$/.test(String(ticket.source_entrypoint||''))||
  env.VERCEL_ENV!=='preview'||
  env.VERCEL_GIT_COMMIT_REF!==ticket.repository_branch||
  env.VERCEL_GIT_COMMIT_SHA!==ticket.repository_base_sha||
  env.GITHUB_ACTIONS==='true')
  throw Error('FOUNDATION_GENERIC_PINNED_PREVIEW_SCOPE_REQUIRED');
 if(typeof env.REALITY_STANDALONE_OPENAI_API_KEY!=='string'||
   env.REALITY_STANDALONE_OPENAI_API_KEY.length<10||
   typeof env.REALITY_SEMANTIC_REVIEW_MODEL!=='string')
  throw Error('FOUNDATION_GENERIC_MODEL_PROVIDER_UNAVAILABLE');
 const client=SandboxClient||((await import('@vercel/sandbox')).Sandbox);
 return createRealityVercelGenerationAdapters({
  ticket,SandboxClient:client,modelFetch,
  apiKey:env.REALITY_STANDALONE_OPENAI_API_KEY,
  model:env.REALITY_SEMANTIC_REVIEW_MODEL,
  readFrozenRegression:createVerifiedFrozenRegressionReader({
   fetchImpl:modelFetch,
   token:env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||null,
  }),
 });
}
