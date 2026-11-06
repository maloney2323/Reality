-- Read-only safety audit of actual, source-backed settled Reality work.
-- Service-role only; NO automated production release or mutation.
create or replace function public.reality_genuine_release_integrity_audit_v1()
returns jsonb language plpgsql set search_path to '' as $fn$
declare
 verified_events integer; malformed_hashes integer; broken_lineage integer;
 duplicate_works integer; missing_works integer; false_completions integer;
 authority_mismatches integer; anon_allowed boolean; user_allowed boolean;
begin
 if current_user<>'service_role' then raise exception 'REALITY_SAFETY_AUDIT_SIGNED_SERVICE_ROLE_REQUIRED';end if;
 select count(*)::int into verified_events from public.universe_events e
 where e.epistemic_status='VERIFIED' and e.event_kind='OUTCOME'
 and e.entity_type in ('reality_genuine_original_settlement_v1','reality_verified_original_work_settlement_v2')
 and e.payload->>'original_job_completed'='true';
 select count(*)::int into malformed_hashes from public.universe_events e
 where e.epistemic_status='VERIFIED' and e.event_kind='OUTCOME'
 and e.entity_type in ('reality_genuine_original_settlement_v1','reality_verified_original_work_settlement_v2')
 and e.payload->>'original_job_completed'='true'
 and e.content_hash is distinct from pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
 public.reality_continuity_canonical_json_v1(e.payload),'UTF8'),'sha256'),'hex');
 select count(*)::int into broken_lineage from public.universe_events e
 left join public.universe_events parent on parent.event_id=e.parent_event_id
 where e.epistemic_status='VERIFIED' and e.event_kind='OUTCOME'
 and e.entity_type in ('reality_genuine_original_settlement_v1','reality_verified_original_work_settlement_v2')
 and e.payload->>'original_job_completed'='true'
 and (parent.event_id is null or parent.continuity_root_id is distinct from e.continuity_root_id
 or parent.worldline_id is distinct from e.worldline_id
 or e.provenance->'continuity_spine'->>'prior_lineage_hash' is distinct from parent.lineage_hash);
 select count(*)::int into duplicate_works from (
  select e.payload->>'original_work_id' work_id
  from public.universe_events e where e.epistemic_status='VERIFIED'
   and e.payload->>'original_job_completed'='true'
   and e.payload->>'constitutional_phase'='SETTLED'
  group by 1 having count(*)>1
 ) d;
 select count(*)::int into missing_works
 from reality_internal.genuine_original_continuations_v1 c
 where c.state='SETTLED_ISOLATED'
 and not exists(select 1 from public.universe_events e
  where e.epistemic_status='VERIFIED' and e.event_kind='OUTCOME'
  and e.payload->>'original_work_id'=c.original_work_id
  and e.payload->>'original_job_completed'='true'
  and e.payload->>'constitutional_phase'='SETTLED');
 select count(*)::int into false_completions from public.universe_events e
 where e.epistemic_status='VERIFIED' and e.event_kind='OUTCOME'
 and e.entity_type in ('reality_genuine_original_settlement_v1','reality_verified_original_work_settlement_v2')
 and e.payload->>'original_job_completed'='true' and
 not exists (
  select 1 from reality_internal.genuine_original_continuations_v1 c
  join reality_internal.genuine_capability_queue_v1 q on q.trigger_id=c.trigger_id
  join reality_internal.genuine_preview_install_approvals_v1 a on a.trigger_id=c.trigger_id
  join public.universe_events o on o.event_id=q.original_work_event_id
  where c.original_work_id=e.payload->>'original_work_id'
  and c.state='SETTLED_ISOLATED' and q.phase='SETTLED_ISOLATED'
  and c.owner_id=q.owner_id and c.owner_id=a.owner_id
  and c.approval_id=a.approval_id and a.consumed_at is not null
  and a.target_environment='ISOLATED_PREVIEW'
  and a.approval_receipt->>'approval_origin'='AUTHENTICATED_OWNER_EXPLICIT_ACTION'
  and c.outcome_receipt->>'independent_outcome_verified'='true'
  and c.outcome_receipt->>'github_run_id'=c.claim_run_id::text
  and c.outcome_receipt->>'production_changed'='false'
  and e.payload->>'owner_id'=c.owner_id::text
  and e.payload->>'owner_approval_id'=c.approval_id::text
  and e.payload->>'provider_run_id'=c.claim_run_id::text
  and e.continuity_root_id=o.continuity_root_id and e.worldline_id=o.worldline_id
 );
 select count(*)::int into authority_mismatches from public.universe_events e
 where e.epistemic_status='VERIFIED' and e.event_kind='OUTCOME'
 and e.entity_type in ('reality_genuine_original_settlement_v1','reality_verified_original_work_settlement_v2')
 and e.payload->>'original_job_completed'='true'
 and (e.payload->>'production_changed'<>'false'
  or e.payload->>'provider_outcome_digest' !~ '^[a-f0-9]{64}$'
  or e.payload->>'owner_approval_id' is null);
 select pg_catalog.has_function_privilege('anon',
  'public.reality_append_verified_genuine_original_outcome_v2(text)','EXECUTE')
 into anon_allowed;
 select pg_catalog.has_function_privilege('authenticated',
  'public.reality_append_verified_genuine_original_outcome_v2(text)','EXECUTE')
 into user_allowed;
 return jsonb_build_object(
  'schema','reality-genuine-release-integrity-audit-v1',
  'scope','ISOLATED_PROJECT_READ_ONLY',
  'verified_completion_events_audited',verified_events,
  'missing_verified_completion_events',missing_works,
  'duplicate_completion_work_ids',duplicate_works,
  'invalid_content_hashes',malformed_hashes,
  'broken_parent_lineages',broken_lineage,
  'unsupported_verified_completion_claims',false_completions,
  'authority_mismatch_events',authority_mismatches,
  'anon_settlement_execute',anon_allowed,
  'authenticated_settlement_execute',user_allowed,
  'fault_injection_rollback','UNPROVEN',
  'emergency_stop_and_rollback','UNPROVEN',
  'live_business_executions',0,
  'release_decision','NOT_READY',
  'production_release_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_genuine_release_integrity_audit_v1() from public,anon,authenticated;
grant execute on function public.reality_genuine_release_integrity_audit_v1() to service_role;
