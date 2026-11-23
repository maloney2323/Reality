// Canonical signed-worker -> native-scope -> evidence-only DB -> Continuity
// handoff for large PRs. This NEVER dispatches a child or overrides the
// existing <=8-file native admission gate; no parallel engine or worker.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {evaluateRealityFinalLoopChildRecovery}
 from './reality-shift-unified-execution-controller-v1.js';
export const FINAL_LOOP_PR_SOURCE_HANDOFF_VERSION=
 'reality-final-loop-pr-source-handoff-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const NO_EFFECT=Object.freeze({
 read_only:true,child_execution_authorized:false,
 child_original_admitted:false,owner_approval_granted:false,
 reviewer_effect_produced:false,independent_review_completed:false,
 parent_obligation_remains_open:true,original_job_completed:false,
 shift_completed:false,installation_authorized:false,
 production_changed:false
});
const result=(status,fields={})=>Object.freeze({
 version:FINAL_LOOP_PR_SOURCE_HANDOFF_VERSION,
 status,...NO_EFFECT,...fields
});
const actionFor=phase=>phase==='NOT_ADMITTED'?
 'QUALIFY_DISTINCT_PARENT_ORIGINAL_BEFORE_CHILD_REVIEW':
 phase==='BLOCKED'?
 'RECONCILE_EXISTING_PARENT_BLOCKER_AND_REQUIRE_EXACT_ACCEPTANCE':
 'VERIFY_EXISTING_PARENT_EFFECT_BEFORE_SOURCE_REQUALIFICATION';
export async function connectFinalLoopPrSourcePlanToSignedShift({
 db,graph,inspection,workerRunId,env=process.env,
 call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||
  env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED!=='true'||
  graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.owner_id||'')||!UUID.test(graph.shift_id||'')||
  !HASH.test(graph.plan_fingerprint||'')||
  graph.installation_authorized!==false||
  graph.production_changed!==false||
  inspection?.status!=='SIGNED_PR_SOURCE_COMPATIBILITY_OBSERVED_READ_ONLY'||
  inspection.owner_id!==graph.owner_id||
  inspection.shift_id!==graph.shift_id||
  inspection.read_only!==true||
  inspection.worker_claim_consumed!==false||
  !Array.isArray(inspection.source_diagnostics)||
  !Array.isArray(graph.jobs))
  return result('FINAL_LOOP_CHILD_SOURCE_SIGNED_SCOPE_UNVERIFIED');
 const jobs=graph.jobs.filter(j=>
  j.original_kind==='REAL_PR_REVIEW_ORIGINAL'&&
  j.independent_source_proof_verified===true&&j.phase!=='SETTLED');
 if(!jobs.length||jobs.length!==inspection.source_diagnostics.length)
  return result('FINAL_LOOP_CHILD_SOURCE_EXACT_GRAPH_MISMATCH');
 const proposals=[];
 for(const d of inspection.source_diagnostics){
  const parents=jobs.filter(j=>
   j.source_ref===d.source_ref&&j.original_work_id===d.original_work_id&&
   j.phase===d.native_phase&&
   j.source_proof_sha256===
    d.large_source_qualification?.frozen_source_proof_sha256);
  const p=d.large_source_qualification;
  if(p===null||p===undefined){
   proposals.push(Object.freeze({
    source_ref:d.source_ref,status:'FULL_SOURCE_MANIFEST_NOT_YET_VERIFIED',
    native_phase:d.native_phase,proposed_scope_count:0,
    next_governed_action:actionFor(d.native_phase)
   }));
   continue;
  }
  const complete=p.source_manifest_complete===true&&
   ['FULL_DRAFT_MANIFEST_READ_REVIEW_AUTHORITY_PENDING',
    'FULL_MANIFEST_READ_EXACT_ORIGINAL_ADMISSION_PENDING']
     .includes(p.status)&&
   p.read_only===true&&p.proposed_only===true&&
   p.parent_obligation_remains_open===true&&
   p.native_admission_unchanged===true&&
   p.worker_claim_consumed===false&&
   p.original_job_completed===false&&
   p.patch_coverage_verified===false&&
   p.independent_review_completed===false&&
   p.cross_scope_review_verified===false&&
   p.owner_approval_granted===false&&
   p.shift_id===graph.shift_id&&p.owner_id===graph.owner_id&&
   p.source_ref===d.source_ref&&
   p.original_work_id===d.original_work_id&&
   parents.length===1&&
   HASH.test(p.source_manifest_sha256||'')&&
   Number.isSafeInteger(p.manifest_file_count)&&
   p.manifest_file_count>=9&&p.manifest_file_count<=500&&
   Number.isSafeInteger(p.bounded_scope_count)&&
   p.bounded_scope_count>=2&&
   Array.isArray(p.bounded_scopes)&&
   p.bounded_scopes.length===p.bounded_scope_count&&
   p.bounded_scopes.reduce((n,g)=>n+g.file_count,0)===p.manifest_file_count&&
   p.bounded_scopes.every(g=>g.file_count>=1&&g.file_count<=8&&
    g.native_child_original_admitted===false&&
    g.child_execution_authorized===false);
  const recoveryPolicy=complete?evaluateRealityFinalLoopChildRecovery({
   parent:parents[0],sourcePlan:p,ownerId:graph.owner_id,
   shiftId:graph.shift_id
  }):null;
  // The native Final Loop controller must accept the full source scope
  // policy before any evidence-only staging. Unverified file inventory
  // must not be turned into even a proposed durable child plan.
  const canonical=complete&&recoveryPolicy?.decision==='SUSPEND'&&
   ['BIND_SIGNED_PARENT_ACCEPTANCE_AND_CHILD_AUTHORITY',
    'ADMIT_EXACT_PARENT_ORIGINAL_BEFORE_RECOVERY'].includes(
     recoveryPolicy.next_governed_action);
  proposals.push(Object.freeze({
   source_ref:d.source_ref,status:canonical?
    'COMPLETE_CHILD_SCOPE_SOURCE_PLAN_STILL_UNADMITTED':
    'CHILD_SOURCE_MANIFEST_OR_SIGNED_IDENTITY_MISMATCH',
   native_phase:d.native_phase,
   original_work_id:d.original_work_id,
   source_manifest_sha256:canonical?p.source_manifest_sha256:null,
   manifest_file_count:canonical?p.manifest_file_count:0,
   proposed_scope_count:canonical?p.bounded_scope_count:0,
   next_governed_action:actionFor(d.native_phase),
   // One canonical Final Loop controller owns these recovery decisions.
   // No source-plan wrapper can override its independent proof gates.
   engine_child_recovery:recoveryPolicy,
   // Local evidence-only proposal, never proof of factual acceptance.
   plan:canonical?p:null
  }));
 }
 if(proposals.some(x=>x.status==='CHILD_SOURCE_MANIFEST_OR_SIGNED_IDENTITY_MISMATCH'))
  return result('FINAL_LOOP_CHILD_SOURCE_MANIFEST_SCOPE_MISMATCH',{
   proposals:proposals.map(({plan,...summary})=>summary)
  });
 const eligible=proposals.filter(x=>
  x.status==='COMPLETE_CHILD_SCOPE_SOURCE_PLAN_STILL_UNADMITTED');
 const summaries=proposals.map(({plan,...summary})=>summary);
 if(eligible.length===0)
  return result('FINAL_LOOP_CHILD_SOURCE_NO_COMPLETE_MANIFEST',{
   owner_id:graph.owner_id,shift_id:graph.shift_id,
   proposals:summaries
  });
 // Two truthful installation targets: an isolated preview database, or an
 // explicitly selected SHARED benchmark for source-plan proposals only.
 // Neither mode grants an owner warrant, an LLM executor, or a provider effect.
 const stagingBase=env.REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED==='true'&&
  db?.strictSecrets===true&&
  db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
  UUID.test(workerRunId||'')&&typeof call==='function';
 const isolated=stagingBase&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&
  typeof env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF==='string'&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF.length>0&&
  db.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
 // A shared benchmark is never presented as isolated. Require exact
 // project, owner and currently signed shift identity, from preview-only
 // configuration and the independently checked existing shift graph.
 // This path cannot enable child/model execution or parent publication.
 const sharedBenchmark=stagingBase&&
  env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED==='true'&&
  env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED!=='true'&&
  env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='true'&&
  env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED!=='true'&&
  typeof env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF==='string'&&
  env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF.length>0&&
  db.project===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
  UUID.test(env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID||'')&&
  UUID.test(env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID||'')&&
  graph.owner_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID&&
  graph.shift_id===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID;
 if(!isolated&&!sharedBenchmark)
  return result('FINAL_LOOP_SOURCE_PLANS_CONNECTED_ISOLATED_STAGING_NOT_ENABLED',{
   owner_id:graph.owner_id,shift_id:graph.shift_id,
   complete_manifest_count:eligible.length,
   proposals:summaries,
   next_governed_action:'CONFIGURE_EXACT_PREVIEW_ONLY_SOURCE_PLAN_STAGING_TARGET'
  });
 const receipts=[];
 for(const entry of proposals){
  if(!entry.plan){
   receipts.push(Object.freeze({
    source_ref:entry.source_ref,
    status:'NO_FULL_SOURCE_PLAN_FOR_STAGING',
    source_plan_staged:false
   }));
   continue;
  }
  let staged;
  try{
   staged=await call(db,'reality_stage_final_loop_pr_source_plan_v1',{
    p_shift_id:graph.shift_id,p_worker_run_id:workerRunId,p_plan:entry.plan
   },{fetchImpl,timeoutMs:6000});
  }catch{
   staged={status:'CANONICAL_SOURCE_PLAN_DB_RPC_UNAVAILABLE'};
  }
  const accepted=['FINAL_LOOP_SOURCE_PLAN_STAGED_PENDING_GOVERNED_ADMISSION',
   'FINAL_LOOP_SOURCE_PLAN_ALREADY_STAGED_NO_REPLAY'].includes(staged?.status)&&
   UUID.test(staged.plan_id||'')&&
   staged.owner_id===graph.owner_id&&
   staged.shift_id===graph.shift_id&&
   staged.source_ref===entry.source_ref&&
   (staged.parent_original_work_id??null)===(entry.original_work_id??null)&&
   staged.source_manifest_sha256===entry.source_manifest_sha256&&
   staged.source_plan_staged===true&&
   staged.child_original_admitted===false&&
   staged.original_job_completed===false&&
   staged.production_changed===false;
  receipts.push(Object.freeze({
   source_ref:entry.source_ref,
   status:accepted?staged.status:'FINAL_LOOP_SOURCE_PLAN_DB_RECEIPT_UNVERIFIED',
   plan_id:accepted?staged.plan_id:null,
   source_manifest_sha256:entry.source_manifest_sha256,
   source_plan_staged:accepted,
   child_original_admitted:false,
   original_job_completed:false
  }));
 }
 // Signed readback returns child status to the SAME canonical Final Loop
 // decision evaluator. Never infer a verified child from a local proposal.
 const parentRecoveryDecisions=[];
 for(const item of eligible){
  const staged=receipts.find(x=>x.source_ref===item.source_ref&&
   x.source_plan_staged===true&&UUID.test(x.plan_id||''));
  if(!staged){
   parentRecoveryDecisions.push({
    source_ref:item.source_ref,
    status:'CHILD_RECOVERY_DURABLE_PLAN_NOT_VERIFIED'
   });
   continue;
  }
  let canonical;
  try{
   canonical=await call(db,'reality_read_final_loop_child_recovery_v1',{
    p_shift_id:graph.shift_id,p_plan_id:staged.plan_id
   },{fetchImpl,timeoutMs:6000});
  }catch{
   canonical={status:'CHILD_RECOVERY_DB_READ_UNAVAILABLE'};
  }
  const trusted=canonical?.schema==='reality-final-loop-independent-child-readback-v1'&&
   canonical.status==='FINAL_LOOP_CANONICAL_CHILD_RECOVERY_PROOF_NOT_PARENT_SETTLEMENT'&&
   canonical.owner_id===graph.owner_id&&
   canonical.shift_id===graph.shift_id&&
   canonical.parent_original_work_id===item.original_work_id&&
   canonical.parent_source_ref===item.source_ref&&
   canonical.source_manifest_sha256===item.source_manifest_sha256&&
   canonical.source_head_sha===item.plan.live_head_sha&&
   canonical.independent_service_readback_verified===true&&
   canonical.parent_obligation_remains_open===true&&
   canonical.original_job_completed===false&&
   canonical.production_changed===false;
  const original=jobs.find(j=>j.source_ref===item.source_ref&&
   j.original_work_id===item.original_work_id);
  const decision=evaluateRealityFinalLoopChildRecovery({
   parent:original,sourcePlan:item.plan,
   independentChildren:trusted?canonical:null,
   ownerId:graph.owner_id,shiftId:graph.shift_id,
   acceptanceContractSha256:trusted?
    canonical.acceptance_contract_sha256:null
  });
  parentRecoveryDecisions.push(Object.freeze({
   source_ref:item.source_ref,
   original_work_id:item.original_work_id,
   independent_child_ledger_verified:trusted,
   decision:decision.decision,
   next_governed_action:decision.next_governed_action,
   reason:decision.reason,
   original_job_completed:false,
   parent_obligation_remains_open:true
  }));
 }
 return result(receipts.every(x=>x.source_plan_staged)?
   'FINAL_LOOP_PROPOSED_SOURCE_PLANS_DURABLY_STAGED_NOT_EXECUTABLE':
   'FINAL_LOOP_PROPOSED_SOURCE_PLAN_STAGE_PARTIALLY_BLOCKED',{
  owner_id:graph.owner_id,shift_id:graph.shift_id,
  complete_manifest_count:eligible.length,
  proposals:summaries,staging_receipts:receipts,
  parent_child_recovery_decisions:Object.freeze(parentRecoveryDecisions),
  staging_target:sharedBenchmark?'SHARED_BENCHMARK_PROPOSALS_ONLY':'ISOLATED_PREVIEW',
  next_governed_action:'INDEPENDENTLY_QUALIFY_PARENT_ACCEPTANCE_AUTHORITY_AND_CHILD_REVIEW'
 });
}
