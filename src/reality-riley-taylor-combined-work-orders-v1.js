// Pair Riley's existing engineer work with Taylor's operational checks
// using the exact owner-reviewable eight-step source plan. This is NOT an
// extra agent, new customer original, installation warrant, or receipt.
export const RILEY_TAYLOR_WORK_ORDERS_VERSION='reality-riley-taylor-combined-work-orders-v1';
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/(issues|pull|actions\/runs)\/([1-9]\d{0,15})$/;
const FINGERPRINT=/^sha256:[a-f0-9]{64}$/;
const STAGES=Object.freeze({
 2:'VERIFY_OPEN_ISSUE',
 3:'VERIFY_PROVIDER_EVIDENCE',
 4:'REVIEW_INDEPENDENT_EVIDENCE',
 5:'QUALIFY_NEXT_WORK'
});
const fail=x=>{throw Error('RILEY_TAYLOR_WORK_ORDERS_'+x)};
function instructions(source){
 if(source==='pull')return Object.freeze({
  riley:'Review actual changed files, identify repair defects, and propose or prepare regression checks.',
  taylor:'Verify CI and deployment implications, worker continuity, and safe rollback needs.',
  independent_acceptance:'Current PR identity, pinned head/base SHA, bounded changed-file readback, and a durable source-review receipt. Code repair and installation need separate proof.'
 });
 if(source==='actions/runs')return Object.freeze({
  riley:'Reproduce the reported failed check, isolate implicated source, and propose a testable repair.',
  taylor:'Verify provider failure, worker transport, lease and retry safety against current evidence.',
  independent_acceptance:'Fresh run identity, provider status, independently checked failure evidence, and a durable source-review receipt. An original repair remains separately gated.'
 });
 return Object.freeze({
  riley:'Investigate the current issue, reproduce any defect, and define a source-pinned repair with acceptance tests.',
  taylor:'Verify the operational failure chain, current owner/worker state, and safe same-job continuation.',
  independent_acceptance:'Current issue identity, source-backed failure and test expectations, and a durable review receipt; full repair settlement must be independently verified.'
 });
}
export function buildRileyTaylorCombinedWorkOrders({plan,fingerprint}={}){
 if(plan?.version!=='reality-eight-hour-employee-shift-draft-v1'||
  plan.status!=='DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED'||
  plan.read_only!==true||plan.job_started!==false||
  plan.installation_authorized!==false||plan.production_changed!==false||
  !FINGERPRINT.test(fingerprint||'')||
  !Number.isInteger(plan.shift_duration_hours)||
  plan.shift_duration_hours<1||plan.shift_duration_hours>12||
  !Array.isArray(plan.slots)||plan.slots.length!==8||
  plan.slots.some((s,i)=>s?.sequence!==i+1))
  fail('SOURCE_FINGERPRINTED_OWNER_DRAFT_REQUIRED');
 const seen=new Set(),tasks=[];
 for(let index=2;index<=5;index++){
  const slot=plan.slots[index-1],candidate=slot.candidate;
  if(slot.stage!==STAGES[index]||
   !['READ_ONLY_PLANNED','SOURCE_OBSERVED_REQUIRES_VALIDATION'].includes(slot.status))
   fail('SOURCE_STAGE_CHANGED');
  if(!candidate)continue;
  const url=candidate.source_url,match=SOURCE.exec(url||'');
  const kind=candidate.finding_type;
  if(!match||!/^catalog:[a-f0-9]{32}$/.test(candidate.finding_id||'')||
   !['OPEN_ISSUE','OPEN_PULL_REQUEST','RECURRING_FAILURE'].includes(kind)||
   (kind==='OPEN_ISSUE'&&match[1]!=='issues')||
   (kind==='OPEN_PULL_REQUEST'&&match[1]!=='pull')||
   (kind==='RECURRING_FAILURE'&&match[1]!=='actions/runs')||
   candidate.verified_current_defect!==false||
   candidate.authorized_execution!==false||
   typeof candidate.title!=='string'||!candidate.title.trim()||
   candidate.title.length>300||seen.has(url))
   fail('SOURCE_IDENTITY_OR_DEDUP_NOT_VERIFIED');
  seen.add(url);
  tasks.push(Object.freeze({
   assignment_id:'combined-source-step:'+index,
   source_step_index:index,source_ref:url,
   source_kind:kind,title:candidate.title.slice(0,210),
   work_type:match[1]==='pull'?'PR_CODE_REVIEW':
    match[1]==='issues'?'ISSUE_REPAIR_INVESTIGATION':'PROVIDER_FAILURE_REPRODUCTION',
   employees:Object.freeze(['Riley','Taylor']),
   ...instructions(match[1]),
   state:'READY_FOR_ONE_OWNER_SHIFT_AUTHORIZATION',
   owner_authorization_required:true,
   model_instances:1,
   current_source_review_done:false,
   accepted_original_repair:false,
   verified_cash_savings_usd:null,
   installation_authorized:false,
   production_changed:false
  }));
 }
 return Object.freeze({
  version:RILEY_TAYLOR_WORK_ORDERS_VERSION,
  status:tasks.length?'COMBINED_BACKLOG_TASKS_READY_FOR_OWNER_SHIFT':
   'NO_SOURCE_BACKED_COMBINED_TASKS_IN_CURRENT_SHIFT_PLAN',
  plan_fingerprint:fingerprint,
  maximum_authorized_hours:plan.shift_duration_hours,
  completion_policy:'STOP_ON_INDEPENDENTLY_VERIFIED_ADMITTED_JOB_RECEIPTS_NOT_ELAPSED_HOURS',
  paired_roles:Object.freeze(['Riley','Taylor']),
  operating_model:'ONE_OPENAI_MODEL_SWITCHES_EMPLOYEE_ROLE_CONTEXT',
  independent_checker:'QUINN_SEPARATE_VERIFIER_NOT_SECOND_EXECUTING_AGENT',
  tasks:Object.freeze(tasks),task_count:tasks.length,
  categories_are_not_original_job_execution_warrants:true,
  signed_in_owner_shift_start_required:true,
  no_extra_per_task_owner_start_approval:true,
  no_code_install_without_exact_owner_approval:true,
  original_repair_admission_already_proven:false,
  original_jobs_completed:0,
  independent_final_job_receipts:0,
  verified_cash_savings_usd:null,
  execution_started:false,installation_authorized:false,
  production_changed:false
 });
}
