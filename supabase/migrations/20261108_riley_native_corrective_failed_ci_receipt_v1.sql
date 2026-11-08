-- Independently failed CORRECTIVE model candidate for the SAME Riley original.
-- This is an evidence record, not a verified upgrade or permission.
create table if not exists reality_internal.riley_native_model_revision_frozen_results_v1(
 original_work_id text primary key
  references reality_internal.riley_native_model_revisions_v1(original_work_id),
 shift_id uuid not null,
 owner_id uuid not null,
 corrective_model_response_id text not null check(corrective_model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'),
 proposed_source_sha256 text not null check(proposed_source_sha256~'^sha256:[a-f0-9]{64}$'),
 isolated_tested_commit_sha text not null check(isolated_tested_commit_sha~'^[a-f0-9]{40}$'),
 independent_ci_run_id bigint not null check(independent_ci_run_id>10000),
 independent_ci_url text not null,
 ci_status text not null check(ci_status='completed'),
 ci_conclusion text not null check(ci_conclusion='failure'),
 tests_passed int not null check(tests_passed>=0),
 tests_failed int not null check(tests_failed>0),
 failure_class text not null check(failure_class='OWNER_SCOPE_REGRESSION'),
 verified_at timestamptz not null default clock_timestamp(),
 installation_authorized boolean not null default false check(not installation_authorized),
 original_job_completed boolean not null default false check(not original_job_completed),
 production_changed boolean not null default false check(not production_changed)
);
revoke all on reality_internal.riley_native_model_revision_frozen_results_v1 from public,anon,authenticated;
grant select,insert on reality_internal.riley_native_model_revision_frozen_results_v1 to service_role;