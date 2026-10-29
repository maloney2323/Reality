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
export function createRealityVercelGenerationAdapters({
 ticket,model,apiKey,SandboxClient,modelFetch=fetch,
 readFrozenRegression=null,
}={}){
 if(ticket?.environment!=='ISOLATED_PREVIEW'||!ticket?.ticket_hash)
  throw Error('FOUNDATION_TRUSTED_PINNED_BUILD_TICKET_REQUIRED');
 const modelGenerate=createFoundationalModelGenerator({
  model,apiKey,fetchImpl:modelFetch,readFrozenRegression,
 });
 const {isolatedSandbox,independentReadback}=createIsolatedVercelSandbox({
  SandboxClient,
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
   token:env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||null,
  }),
 });
}
