// One existing Reality constitutional driver gets one replaceable model and one
// actual isolated verifier. No second queue, GitHub dispatch token or authority.
import {createConstitutionalGenerationSandboxAdapters}
 from './reality-foundational-constitutional-adapters-v1.0.js';
import {createFoundationalModelGenerator}
 from './reality-foundational-model-provider-v1.0.js';
import {createIsolatedVercelSandbox}
 from './reality-foundational-vercel-sandbox-adapter-v1.0.js';
export function createRealityVercelGenerationAdapters({
 ticket,model,apiKey,SandboxClient,modelFetch=fetch,
}={}){
 if(ticket?.environment!=='ISOLATED_PREVIEW'||!ticket?.ticket_hash)
  throw Error('FOUNDATION_TRUSTED_PINNED_BUILD_TICKET_REQUIRED');
 const modelGenerate=createFoundationalModelGenerator({
  model,apiKey,fetchImpl:modelFetch,
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
