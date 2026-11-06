-- Production Readiness Gauntlet v1. Durable unbound discovery without owner impersonation.
-- Deployed only to isolated Reality continuity benchmark.
-- This is not an owner permission, installer warrant, or production release.
create table if not exists reality_internal.genuine_unbound_capability_discoveries_v1 (
 frozen_sha256 text primary key,
 frozen_test_path text not null,
 missing_module_path text not null,
 first_observed_sha text not null,
 latest_observed_sha text not null,
 status text not null default 'AWAITING_OWNER_WORK_BINDING',
 observations integer not null default 1,
 discovered_at timestamptz not null default clock_timestamp(),
 last_observed_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.genuine_unbound_capability_discoveries_v1 enable row level security;
revoke all on reality_internal.genuine_unbound_capability_discoveries_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.genuine_unbound_capability_discoveries_v1 to service_role;

CREATE OR REPLACE FUNCTION public.reality_genuine_production_readiness_snapshot_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 total_settled int;
 provider_verified int;
 ledger_reconciled int;
 unreconciled int;
 isolated_capability_families int;
 observations int;
 live_business_executions int;
 probation_target int;
 unbound_discoveries int;
 unfinished_owner_work int;
begin
 if current_user<>'service_role' then
   raise exception 'READINESS_SNAPSHOT_SIGNED_SERVICE_ROLE_REQUIRED';
 end if;
 select count(*)::int,
    count(*) filter (
     where c.outcome_receipt->>'independent_outcome_verified'='true'
     and c.outcome_receipt->>'original_job_completed'='true'
     and c.outcome_receipt->>'production_changed'='false'
     and c.outcome_receipt->>'github_run_id'=c.claim_run_id::text
    )::int
 into total_settled,provider_verified
 from reality_internal.genuine_original_continuations_v1 c
 where c.state='SETTLED_ISOLATED';

 select count(*)::int into ledger_reconciled
 from reality_internal.genuine_original_continuations_v1 c
 where c.state='SETTLED_ISOLATED'
 and exists (
   select 1 from public.universe_events e
   where e.epistemic_status='VERIFIED'
     and e.payload->>'original_work_id'=c.original_work_id
     and e.payload->>'original_job_completed'='true'
     and e.payload->>'constitutional_phase'='SETTLED'
 );
 unreconciled:=total_settled-ledger_reconciled;

 select count(distinct capability_id)::int
 into isolated_capability_families
 from reality_internal.genuine_capability_queue_v1
 where phase='SETTLED_ISOLATED';

 select coalesce(sum((a.installation_receipt->>'monitored_executions')::int),0)::int,
   coalesce(sum((a.installation_receipt->>'probation_live_business_executions')::int),0)::int,
   coalesce(max((a.installation_receipt->>'probation_window_target')::int),50)::int
 into observations,live_business_executions,probation_target
 from reality_internal.genuine_preview_install_approvals_v1 a
 where a.installed_commit_sha is not null and a.installation_receipt is not null;

 select count(*)::int into unbound_discoveries
 from reality_internal.genuine_unbound_capability_discoveries_v1
 where status='AWAITING_OWNER_WORK_BINDING';

 select count(*)::int into unfinished_owner_work
 from reality_internal.genuine_capability_queue_v1
 where phase not in ('SETTLED_ISOLATED');

 return jsonb_build_object(
 'schema','reality-independent-production-readiness-snapshot-v1',
 'scope','ISOLATED_PROJECT_READ_ONLY',
 'evaluated_at',clock_timestamp(),
 'settled_original_jobs',total_settled,
 'independent_provider_verified_settlements',provider_verified,
 'verified_universe_settlements',ledger_reconciled,
 'unreconciled_settlements',unreconciled,
 'distinct_isolated_capability_families',isolated_capability_families,
 'sandbox_monitoring_executions',observations,
 'qualifying_live_business_executions',live_business_executions,
 'probation_target',probation_target,
 'unbound_capability_discoveries',unbound_discoveries,
 'unfinished_owner_bound_work',unfinished_owner_work,
 'authorization_bypasses','UNMEASURED',
 'false_completion_rate','UNMEASURED',
 'fault_injection_recovery','UNPROVEN',
 'rollback_and_kill_switch','UNPROVEN',
 'release_gate',
  case when total_settled>0 and provider_verified=total_settled
    and ledger_reconciled=total_settled
    and live_business_executions>=probation_target
    and isolated_capability_families>=3
    and unbound_discoveries=0 and unfinished_owner_work=0
    then 'STILL_REQUIRES_ADVERSARIAL_AND_CANARY_EVIDENCE'
    else 'NOT_READY' end,
 'production_release_authorized',false,
 'production_changed',false);
end $function$;

CREATE OR REPLACE FUNCTION public.reality_record_genuine_unbound_discovery_v1(p_test_path text, p_missing_module_path text, p_frozen_sha256 text, p_repository_sha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r reality_internal.genuine_unbound_capability_discoveries_v1%rowtype;
begin
 if current_user<>'service_role' then
   raise exception 'UNBOUND_DISCOVERY_SIGNED_SERVICE_ROLE_REQUIRED';
 end if;
 if p_test_path !~ '^test/reality-frozen-regressions/[a-z0-9._-]+\.test\.js$' or
    p_missing_module_path !~ '^src/reality-extensions/[a-z0-9._-]+\.mjs$' or
    p_frozen_sha256 !~ '^[a-f0-9]{64}$' or
    p_repository_sha !~ '^[a-f0-9]{40}$' then
    raise exception 'UNBOUND_DISCOVERY_PINNED_SOURCE_REQUIRED';
 end if;
 insert into reality_internal.genuine_unbound_capability_discoveries_v1(
    frozen_sha256,frozen_test_path,missing_module_path,
    first_observed_sha,latest_observed_sha)
 values(p_frozen_sha256,p_test_path,p_missing_module_path,p_repository_sha,p_repository_sha)
 on conflict (frozen_sha256) do update set
    latest_observed_sha=excluded.latest_observed_sha,
    observations=reality_internal.genuine_unbound_capability_discoveries_v1.observations+1,
    last_observed_at=clock_timestamp()
 where reality_internal.genuine_unbound_capability_discoveries_v1.frozen_test_path=excluded.frozen_test_path
   and reality_internal.genuine_unbound_capability_discoveries_v1.missing_module_path=excluded.missing_module_path
 returning * into r;
 if r.frozen_sha256 is null then raise exception 'UNBOUND_DISCOVERY_HASH_COLLISION_OR_SCOPE_CHANGED';end if;
 return pg_catalog.jsonb_build_object(
 'status','AWAITING_OWNER_WORK_BINDING',
 'frozen_sha256',r.frozen_sha256,
 'frozen_test_path',r.frozen_test_path,
 'missing_module_path',r.missing_module_path,
 'observations',r.observations,
 'owner_authorized',false,
 'installation_authorized',false,
 'original_job_completed',false,
 'production_changed',false);
end $function$;

revoke all on function public.reality_record_genuine_unbound_discovery_v1(text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_genuine_unbound_discovery_v1(text,text,text,text) to service_role;
revoke all on function public.reality_genuine_production_readiness_snapshot_v1() from public,anon,authenticated;
grant execute on function public.reality_genuine_production_readiness_snapshot_v1() to service_role;
