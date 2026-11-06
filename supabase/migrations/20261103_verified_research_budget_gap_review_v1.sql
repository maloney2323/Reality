-- One independently reproduced subset of the customer's fourth market hypothesis.
-- RED and GREEN were checked against GitHub provider run and commit ancestry
-- on 2026-11-03. This is a candidate-review receipt, never installation.
create table if not exists reality_internal.market_independent_repair_proofs_v1(
 owner_id uuid not null,
 market_receipt_id uuid not null,
 finding_fingerprint text not null check(finding_fingerprint ~ '^[a-f0-9]{64}$'),
 proof_kind text not null check(proof_kind='EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT'),
 status text not null check(status='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'),
 original_report_sha256 text not null check(original_report_sha256 ~ '^[a-f0-9]{64}$'),
 original_work_authorization_ref text,
 baseline_run_id bigint not null check(baseline_run_id>0),
 green_run_id bigint not null check(green_run_id>0),
 frozen_test_sha256 text not null check(frozen_test_sha256 ~ '^[a-f0-9]{64}$'),
 baseline_commit_sha text not null check(baseline_commit_sha ~ '^[a-f0-9]{40}$'),
 repair_commit_sha text not null check(repair_commit_sha ~ '^[a-f0-9]{40}$'),
 pull_request_number integer not null check(pull_request_number>0),
 source_file text not null,
 proven_defect_scope text not null check(length(proven_defect_scope)>80),
 corrected_behavior text not null check(length(corrected_behavior)>80),
 remaining_unproven text not null check(length(remaining_unproven)>40),
 independent_red_assertion_failures integer not null check(independent_red_assertion_failures>0),
 independent_green_assertion_passes integer not null check(independent_green_assertion_passes>0),
 candidate_created_by text not null check(candidate_created_by='ASSISTANT_AUTHORED_IN_ISOLATED_FEATURE_BRANCH'),
 independent_legacy_customer_job_settled boolean not null default false check(independent_legacy_customer_job_settled=false),
 fresh_original_work_verified boolean not null default false check(fresh_original_work_verified=false),
 owner_install_authorized boolean not null default false check(owner_install_authorized=false),
 installed boolean not null default false check(installed=false),
 production_changed boolean not null default false check(production_changed=false),
 observed_at timestamptz not null default now(),
 primary key(owner_id,market_receipt_id,finding_fingerprint,repair_commit_sha),
 foreign key(owner_id,market_receipt_id,finding_fingerprint)
  references reality_internal.market_stage_investigations_v1
    (owner_id,receipt_id,finding_fingerprint)
);
alter table reality_internal.market_independent_repair_proofs_v1 enable row level security;
revoke all on reality_internal.market_independent_repair_proofs_v1 from public,anon,authenticated;
grant select on reality_internal.market_independent_repair_proofs_v1 to service_role;

-- The only new row is a source-pinned, owner-scoped observation of a
-- verified implementation defect, not a new customer job or permission.
insert into reality_internal.market_independent_repair_proofs_v1(
 owner_id,market_receipt_id,finding_fingerprint,proof_kind,status,
 original_report_sha256,baseline_run_id,green_run_id,frozen_test_sha256,
 baseline_commit_sha,repair_commit_sha,pull_request_number,source_file,
 proven_defect_scope,corrected_behavior,remaining_unproven,
 independent_red_assertion_failures,independent_green_assertion_passes,
 candidate_created_by
)
select i.owner_id,i.receipt_id,i.finding_fingerprint,
 'EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT',
 'FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED',
 i.report_sha256,
 41712961166,41713111625,
 '437308a4fafa1f1ee36336347118e15bbc679dc9cee6bcbb0804d1d789d7e85c',
 '26c09499f5a9d59de9dda0f81db7127403a1062e',
 '8368c5db6d5d5e3546b69ab2b86b022e40a00ed9',
 211,'src/reality-cognitive-research-engine-v0.1.js',
 'Resource budgets were omitted from cognitive candidate fingerprints. The research evaluator also did not reject invalid or insufficient max_evaluator_calls allocations before executing evaluation callbacks.',
 'The candidate includes resource_budget in capability fingerprint calculation and rejects invalid or insufficient evaluator-call quotas before invoking the evaluator. An unchanged frozen acceptance suite passed five of five tests after previously failing three of five.',
 'General runtime dollar/token enforcement, a live original-customer-job resumption and installation/settlement remain independently unproven.',
 3,5,
 'ASSISTANT_AUTHORED_IN_ISOLATED_FEATURE_BRANCH'
from reality_internal.market_stage_investigations_v1 i
join reality_internal.market_research_receipts_v1 r
 on r.receipt_id=i.receipt_id and r.owner_id=i.owner_id
 and r.report_sha256=i.report_sha256
where i.receipt_id='43b0ecf1-1b05-4d41-b0e3-6d7cb3a60e76'::uuid
 and i.finding_fingerprint='60155227ce4fd76c8227fcde25e24fee5281a7e4799491cde86d1524800d2e17'
 and i.stage_repair_verified=true and i.verified_missing_capability=false
 and r.report->>'installation_authorized'='false'
 and r.report->>'production_changed'='false'
on conflict do nothing;

create or replace function public.reality_read_owner_market_repair_proofs_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare v_data jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MARKET_REPAIR_PROOF_AUTHENTICATED_SERVICE_ROLE_REQUIRED';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'key','research:'||p.finding_fingerprint,
  'receipt_id',p.market_receipt_id,
  'finding_fingerprint',p.finding_fingerprint,
  'status',p.status,
  'proof_kind',p.proof_kind,
  'baseline_run_id',p.baseline_run_id,
  'green_run_id',p.green_run_id,
  'frozen_test_sha256',p.frozen_test_sha256,
  'baseline_commit_sha',p.baseline_commit_sha,
  'repair_commit_sha',p.repair_commit_sha,
  'pull_request_number',p.pull_request_number,
  'source_file',p.source_file,
  'proven_defect_scope',p.proven_defect_scope,
  'corrected_behavior',p.corrected_behavior,
  'remaining_unproven',p.remaining_unproven,
  'independent_red_assertion_failures',p.independent_red_assertion_failures,
  'independent_green_assertion_passes',p.independent_green_assertion_passes,
  'candidate_created_by',p.candidate_created_by,
  'owner_install_authorized',false,
  'fresh_original_work_verified',false,
  'installed',false,
  'production_changed',false,
  'observed_at',p.observed_at
 ) order by p.observed_at desc),'[]'::jsonb)
 into v_data
 from reality_internal.market_independent_repair_proofs_v1 p
 join reality_internal.market_stage_investigations_v1 i
  on i.owner_id=p.owner_id and i.receipt_id=p.market_receipt_id
   and i.finding_fingerprint=p.finding_fingerprint
   and i.report_sha256=p.original_report_sha256
 where p.owner_id=p_owner_id and i.stage_repair_verified=true
   and i.owner_install_authorized=false
   and i.production_changed=false;
 return jsonb_build_object(
  'ok',true,'status','SOURCE_PINNED_BUDGET_REPAIR_CANDIDATE_READBACK',
  'owner_id',p_owner_id,
  'items',v_data,
  'read_only',true,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_market_repair_proofs_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_market_repair_proofs_v1(uuid)
 to service_role;
