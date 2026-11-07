// Trusted Reality self-understanding: evidence has priority over descriptions.
// Only passed-in owner-scoped database readbacks may establish current state;
// source-implemented abilities are explicitly NOT promoted into live proof.
import {assertShiftReadback} from './reality-governed-shift-boundary-v1.js';
export const REALITY_SELF_AUDIT_VERSION='reality-evidence-grounded-self-audit-v1';
const LIVE=new Set(['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ESCALATED']);
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('REALITY_SELF_AUDIT_'+x)};
const capability=(id,evidence,proof_level,can_claim_live=false)=>Object.freeze({
 id,evidence_ref:evidence,proof_level,can_claim_live
});
export function buildRealityEvidenceGroundedSelfAudit({
 shiftReadback,ownerLoopReadback,sourceVerifiedAt=null
}={}){
 assertShiftReadback(shiftReadback);
 if(ownerLoopReadback?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
    ownerLoopReadback.owner_installation_authorized_by_read!==false||
    ownerLoopReadback.external_action_performed!==false||
    ownerLoopReadback.production_changed!==false||
    !Array.isArray(ownerLoopReadback.jobs)||ownerLoopReadback.jobs.length>12)
  fail('OWNER_GOVERNED_LOOP_READBACK_REQUIRED');
 if(sourceVerifiedAt!==null&&(typeof sourceVerifiedAt!=='string'||
    !Number.isFinite(Date.parse(sourceVerifiedAt))))
  fail('TIME_SOURCE_INVALID');
 const shifts=shiftReadback.shifts;
 const active=shifts.filter(s=>LIVE.has(s.status));
 const completedReadOnly=shifts.filter(s=>s.status==='ENDED_READ_ONLY');
 const checked=shifts.reduce((n,s)=>n+s.steps.filter(t=>t.state==='SOURCE_CHECKED'&&
   /^sha256:[a-f0-9]{64}$/.test(t.proof_sha256||'')).length,0);
 const verifiedOutcomes=shifts.reduce((n,s)=>n+s.steps.filter(t=>
   t.state==='ORIGINAL_JOB_RECEIPT_VERIFIED'&&
   /^sha256:[a-f0-9]{64}$/.test(t.proof_sha256||'')).length,0);
 const jobs=ownerLoopReadback.jobs.filter(j=>
   WORK.test(j.original_work_id||'')&&
   j.environment==='ISOLATED_PREVIEW');
 const settled=jobs.filter(j=>j.independently_settled===true);
 const unsatisfied=jobs.filter(j=>j.independently_settled===false&&
   j.owner_install_approved===false&&
   ['PENDING_FROZEN_REPRODUCTION','EVIDENCE_RECONCILIATION_REQUIRED',
    'FROZEN_REPRODUCED_AWAITING_CANDIDATE'].includes(j.phase));
 const capabilities=Object.freeze([
  capability('openai_reasoning_gateway','src/reality-model-gateway-v0.1.js',
   'SOURCE_IMPLEMENTED_RUNTIME_MODEL_CALL_NOT_PROVEN_BY_THIS_AUDIT'),
  capability('owner_scoped_shift_authorization',
   'api/reality/personal-governed-employee-shift.js',
   active.length?'CURRENT_OWNER_SHIFT_OBSERVED':'SOURCE_IMPLEMENTED_NO_CURRENT_OWNER_SHIFT',
   active.length>0),
  capability('governed_background_shift_source_validation',
   'src/reality-governed-employee-shift-worker-v1.js',
   checked?'PRIOR_DURABLE_SOURCE_CHECKS_OBSERVED':'SOURCE_IMPLEMENTED_NO_SOURCE_CHECK_RECEIPT',
   checked>0),
  capability('central_genuine_capability_engine',
   'src/reality-genuine-capability-engine-v1.js',
   'SOURCE_IMPLEMENTED_END_TO_END_REPAIR_NOT_PROVEN'),
  capability('self_repair_model_code_generation',
   'src/reality-governed-self-improvement-driver-v1.0.js',
   'DRIVER_IMPLEMENTED_PROVIDER_GENERATION_NOT_PROVEN_IN_EMPLOYEE_SHIFT'),
  capability('employee_capability_wake',
   'scripts/reality-genuine-capability-worker-v1.mjs',
   'TRIGGER_INSPECTION_ONLY_NO_PROVIDER_REPAIR_EXECUTION'),
  capability('riley_original_job_executor',
   'src/reality-riley-governed-original-job-v1.js',
   'GUARDED_INTEGRATION_EXISTS_NO_LIVE_SHIFT_JOB_EXECUTION'),
  capability('multi_job_shift_controller',
   'src/reality-riley-multi-job-shift-controller-v1.js',
   'EXISTING_MULTI_JOB_WAKE_CONNECTED_NO_GENERAL_REPAIR_EXECUTION_PROVEN'),
  capability('independent_final_receipt_history',
   'reality_internal.genuine_independent_final_receipts_v1',
   verifiedOutcomes?'ORIGINAL_SHIFT_RECEIPT_OBSERVED':
    settled.length?'HISTORICAL_OWNER_SETTLEMENT_OBSERVED_NOT_THIS_SHIFT':
    'NO_MATCHING_CURRENT_SHIFT_RECEIPT',
   verifiedOutcomes>0),
  capability('automated_full_shift_self_repair',
   'reality_internal.governed_employee_shift_steps_v1',
   'NOT_INDEPENDENTLY_PROVEN')
 ]);
 return Object.freeze({
  version:REALITY_SELF_AUDIT_VERSION,
  evidence_kind:'OWNER_SCOPED_DATABASE_AND_SOURCE_CAPABILITY_CONTRACT',
  observed_at:sourceVerifiedAt,
  exact_current_owner_shift_count:active.length,
  historical_read_only_shifts:completedReadOnly.length,
  verified_read_only_source_checks:checked,
  shift_final_original_job_receipts_observed:verifiedOutcomes,
  historical_settled_originals_in_owner_readback:settled.length,
  independently_unsettled_capability_jobs_observed:unsatisfied.length,
  capabilities,
  self_understanding_rules:Object.freeze([
   'Use the one Reality Genuine Capability Engine for all named employees.',
   'A source-implemented component or test pass is not a verified live ability.',
   'A scheduled wake is not a claimed, executed or settled original job.',
   'Diagnose each blocked job; reuse existing verified capabilities first.',
   'When a genuine missing instrument is independently reproduced, propose and test a scoped repair with OpenAI.',
   'Exact installation approval can only come from the authenticated owner.',
   'Preserve the original job and continuity receipts; never repeat an uncertain provider action.',
   'Continue other safely authorized shift work and reconcile each job receipt.',
   'A full engineering shift is unproven until several real original jobs finish and independent receipts agree.'
  ]),
  approval_source:'SIGNED_IN_OWNER_NOT_MODEL',
  model_self_authorization:false,
  installation_authorized:false,
  all_problems_solvable_guaranteed:false,
  full_shift_automation_proven:false,
  production_changed:false,
  measured_net_labor_hours_saved:null
 });
}
export function summarizeRealitySelfAuditForModel(audit){
 if(audit?.version!==REALITY_SELF_AUDIT_VERSION||
    audit.evidence_kind!=='OWNER_SCOPED_DATABASE_AND_SOURCE_CAPABILITY_CONTRACT'||
    audit.model_self_authorization!==false||
    audit.installation_authorized!==false||
    audit.full_shift_automation_proven!==false||
    audit.production_changed!==false||
    !Array.isArray(audit.capabilities)||audit.capabilities.length!==10)
  fail('TRUSTED_SELF_AUDIT_REQUIRED');
 return 'REALITY SELF-KNOWLEDGE, OWNER-SCOPED AND VERIFICATION-LABELED: '+
  audit.capabilities.map(x=>x.id+' = '+x.proof_level).join(' | ')+
  '. Current authorized shift count '+audit.exact_current_owner_shift_count+
  '; previously recorded isolated owner settlements '+
  audit.historical_settled_originals_in_owner_readback+
  '; observed pending capability jobs '+audit.independently_unsettled_capability_jobs_observed+
  '. Always distinguish design from deployed, tested from executed, and worker wake from final independent settlement. '+
  audit.self_understanding_rules.join(' ') +
  ' You must not claim unlimited problem solving, production execution, measured savings, or a proven full autonomous shift.';
}
