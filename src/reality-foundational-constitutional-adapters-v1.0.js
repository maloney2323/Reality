// Foundational services plug into the ONE constitutional self-improvement
// driver. This adapter grants no lifecycle authority; only existing
// Governed Self-Improvement Spine admits independently attested transitions.
import {createHash} from 'node:crypto';
import {
 validateFoundationalCandidate,createSandboxEvidenceCandidate,
 independentlyVerifySandbox
} from './reality-foundational-build-loop-v1.0.js';
const enforce=(value,code)=>{if(!value)throw Error(code)};
const canonical=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canonical):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
export const FOUNDATION_CONSTITUTIONAL_ADAPTER_VERSION=
 'reality-foundational-constitutional-adapter-v1.0';
export function createConstitutionalGenerationSandboxAdapters({
 ticket,modelGenerate,isolatedSandbox,independentReadback,
}={}){
 enforce(ticket?.ticket_hash&&typeof modelGenerate==='function'&&
  typeof isolatedSandbox==='function'&&
  typeof independentReadback==='function',
  'FOUNDATION_CONSTITUTIONAL_TRUSTED_ADAPTERS_REQUIRED');
 function scope(ctx){
  enforce(ctx?.original_work_id===ticket.original_work_id&&
   (!('goal_id' in ctx)||ctx.goal_id===ticket.goal_id),
   'FOUNDATION_CONSTITUTIONAL_SCOPE_CHANGED');
 }
 return Object.freeze({
  async generateCandidate(ctx){
   scope(ctx);
   enforce(ctx.no_execution_authority===true,
    'FOUNDATION_MODEL_NO_EXECUTION_AUTHORITY_REQUIRED');
   enforce(Number.isInteger(ctx.current_attempt)&&ctx.current_attempt>=1&&
    ctx.current_attempt<=ticket.max_attempts,
    'FOUNDATION_CONSTITUTIONAL_ATTEMPT_INVALID');
   const previous=ctx.previous_candidate;
   const failure=ctx.previous_independent_failure;
   if(ctx.current_attempt>1)
    enforce(previous?.artifact_hash&&failure?.evidence_ref&&
     failure?.classification?.class&&failure?.diagnostics,
     'FOUNDATION_REPAIR_REQUIRES_INDEPENDENT_FAILURE');
   const verifiedFeedback=ctx.current_attempt===1?null:{
    kind:'INDEPENDENT_SANDBOX_FAILURE',
    attestation_ref:failure?.evidence_ref||null,
    classification:failure?.classification?.class||null,
    report_hash:failure?.feedback_hash||null,
    log_excerpt:String(failure?.diagnostics?.output||'').slice(-8000),
    artifact_sha256:previous?.artifact_hash||null,
   };
   const generated=await modelGenerate(Object.freeze({
    ticket,attempt:ctx.current_attempt,
    previous_candidate:previous||null,
    verified_feedback:verifiedFeedback,
    execution_authority:false,
   }));
   const candidate=validateFoundationalCandidate(ticket,generated);
   return Object.freeze({
    files:candidate.files,
    rationale:candidate.rationale,
    verification_plan_ref:ticket.frozen_regression_manifest_ref,
    model_response_ref:candidate.model_response_id,
    foundational_artifact_sha256:candidate.artifact_sha256,
    source_ticket_hash:ticket.ticket_hash,
   });
  },
  async runIsolatedSandbox(ctx){
   scope(ctx);
   enforce(ctx.network_access===false&&
    ctx.production_write_permitted===false,
    'FOUNDATION_CONSTITUTIONAL_SANDBOX_ISOLATION_REQUIRED');
   const candidate=validateFoundationalCandidate(ticket,{
    ticket_hash:ticket.ticket_hash,
    original_work_id:ticket.original_work_id,
    files:ctx.candidate?.files,rationale:ctx.candidate?.rationale,
    model_response_id:ctx.candidate?.model_response_ref,
   });
   // Compare exact bytes to the hash already committed by the constitutional
   // spine. It strips unrecognized model metadata, so never trust a field in
   // the model response to tell us the source fingerprint.
   enforce(digest(ctx.candidate.files.map(f=>({path:f.path,content:f.content})))===ctx.artifact_hash,
    'FOUNDATION_CONSTITUTIONAL_MODEL_SOURCE_CHANGED');
   const report=await isolatedSandbox(Object.freeze({
    ticket,candidate,attempt:ctx.attempt,
    frozen_suite_ref:ticket.frozen_regression_manifest_ref,
    network_permitted:false,secrets_permitted:false,
   }));
   const preliminary=createSandboxEvidenceCandidate(ticket,candidate,report);
   const verified=await independentlyVerifySandbox(ticket,candidate,preliminary,{
    readback:independentReadback,
   });
   // The CONSTITUTIONAL driver will independently verify this receipt AGAIN
   // at its own transition boundary. This object does not install anything.
   return Object.freeze({
    kind:verified.passed?'SANDBOX_VERIFIED':'SANDBOX_FAILED',
    owner_id:ticket.owner_id,
    goal_id:ticket.goal_id,
    original_work_id:ticket.original_work_id,
    continuity_root_id:ticket.continuity_root_id,
    worldline_id:ticket.worldline_id,
    evidence_ref:verified.attestation_ref,
    evidence_hash:verified.report_hash,
    artifact_hash:ctx.artifact_hash,
    foundational_artifact_sha256:candidate.artifact_sha256,
    independent_tests_passed:verified.passed,
    frozen_regression_passed:verified.passed,
    governance_preserved:true,
    verifier_run_ref:verified.runner_receipt_ref,
    sandbox_source_hash:verified.report_hash,
    diagnostics:verified.passed?null:{
     code:verified.classification==='SYNTAX'?'TEST_FAILED':
      verified.classification==='TEST_REGRESSION'?'TEST_FAILED':
      verified.classification==='AUTHORITY_REQUIRED'?'AUTHORITY':'MISSING_CAPABILITY',
     output:verified.log_excerpt,
     missingDependency:verified.classification==='MISSING_CAPABILITY'?
      'independent:sandbox:missing-capability':null,
    },
    external_action_performed:false,installation_authorized:false,
    original_job_completed:false,
   });
  },
 });
}