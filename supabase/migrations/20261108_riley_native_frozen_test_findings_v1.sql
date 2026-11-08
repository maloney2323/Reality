-- Independent test evidence attached to the SAME admitted Riley original
-- and model source draft. A failed test is NOT a completed customer job.
create table if not exists reality_internal.riley_native_frozen_test_findings_v1(
 original_work_id text primary key
  references reality_internal.riley_native_model_drafts_v1(original_work_id),
 shift_id uuid not null,
 owner_id uuid not null,
 model_response_id text not null check(model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'),
 proposal_sha256 text not null check(proposal_sha256~'^sha256:[a-f0-9]{64}$'),
 tested_commit_sha text not null check(tested_commit_sha~'^[a-f0-9]{40}$'),
 independent_run_id bigint not null check(independent_run_id>10000),
 independent_run_url text not null,
 conclusion text not null check(conclusion='failure'),
 failed_test_count integer not null check(failed_test_count between 1 and 100),
 failure_class text not null
  check(failure_class in ('ORIGINAL_JOB_CONTINUITY_REGRESSION',
    'SOURCE_SYNTAX_OR_SECURITY_FAILURE',
    'PROVIDER_TEST_EFFECT_UNVERIFIED')),
 provider_checked_at timestamptz not null default clock_timestamp(),
 installation_authorized boolean not null default false check(not installation_authorized),
 original_job_completed boolean not null default false check(not original_job_completed),
 production_changed boolean not null default false check(not production_changed)
);
revoke all on reality_internal.riley_native_frozen_test_findings_v1 from public,anon,authenticated;
grant select,insert on reality_internal.riley_native_frozen_test_findings_v1 to service_role;
