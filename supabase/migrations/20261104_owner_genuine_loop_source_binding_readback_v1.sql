-- Owner-scoped read-only source identity for safe new-failure selection.
CREATE OR REPLACE FUNCTION public.reality_read_owner_genuine_loop_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare items jsonb;
begin
 if current_user <> 'service_role' then
  raise exception 'GENUINE_LOOP_OWNER_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null then
  raise exception 'GENUINE_LOOP_OWNER_REQUIRED';
 end if;
 select coalesce(jsonb_agg(to_jsonb(v) order by v.updated_at desc), '[]'::jsonb)
 into items from (
  select q.original_work_id,q.capability_id,q.phase,
    q.trigger_id,q.updated_at,
    case when (e.payload->>'issue_number') ~ '^[1-9][0-9]{0,8}
    case when q.qualified_candidate->>'artifact_sha256' ~ '^[a-f0-9]{64}$' and
      q.qualification_receipt is not null then true else false end as candidate_verified,
    (a.approval_id is not null and a.approved_at is not null) as owner_install_approved,
    (a.installed_commit_sha ~ '^[a-f0-9]{40}$') as isolated_installed,
    (a.settlement_receipt->>'original_job_completed'='true' and
      a.settlement_receipt->>'independent_outcome_verified'='true') as independently_settled,
    coalesce(a.target_environment,'ISOLATED_PREVIEW') as environment
  from reality_internal.genuine_capability_queue_v1 q
  join public.universe_events e on e.event_id=q.original_work_event_id and
    e.epistemic_status='VERIFIED' and
    e.payload->>'original_work_id'=q.original_work_id and
    e.payload->>'owner_id'=p_owner_id::text and
    e.provenance->>'principal_id'=p_owner_id::text and
    e.payload->>'owner_authorized_investigation'='true'
  left join reality_internal.genuine_preview_install_approvals_v1 a
    on a.trigger_id=q.trigger_id and a.owner_id=p_owner_id and
       a.original_work_id=q.original_work_id
  where q.owner_id=p_owner_id
  order by q.updated_at desc limit 12
 ) v;
 return jsonb_build_object(
  'status','OWNER_GOVERNED_LOOP_READBACK',
  'jobs',items,'owner_installation_authorized_by_read',false,
  'external_action_performed',false,'production_changed',false);
end $function$

       then (e.payload->>'issue_number')::integer else null end as source_issue_number,
    case when (e.payload->>'original_provider_failed_run_id') ~ '^[1-9][0-9]{0,14}
    case when q.qualified_candidate->>'artifact_sha256' ~ '^[a-f0-9]{64}$' and
      q.qualification_receipt is not null then true else false end as candidate_verified,
    (a.approval_id is not null and a.approved_at is not null) as owner_install_approved,
    (a.installed_commit_sha ~ '^[a-f0-9]{40}$') as isolated_installed,
    (a.settlement_receipt->>'original_job_completed'='true' and
      a.settlement_receipt->>'independent_outcome_verified'='true') as independently_settled,
    coalesce(a.target_environment,'ISOLATED_PREVIEW') as environment
  from reality_internal.genuine_capability_queue_v1 q
  join public.universe_events e on e.event_id=q.original_work_event_id and
    e.epistemic_status='VERIFIED' and
    e.payload->>'original_work_id'=q.original_work_id and
    e.payload->>'owner_id'=p_owner_id::text and
    e.provenance->>'principal_id'=p_owner_id::text and
    e.payload->>'owner_authorized_investigation'='true'
  left join reality_internal.genuine_preview_install_approvals_v1 a
    on a.trigger_id=q.trigger_id and a.owner_id=p_owner_id and
       a.original_work_id=q.original_work_id
  where q.owner_id=p_owner_id
  order by q.updated_at desc limit 12
 ) v;
 return jsonb_build_object(
  'status','OWNER_GOVERNED_LOOP_READBACK',
  'jobs',items,'owner_installation_authorized_by_read',false,
  'external_action_performed',false,'production_changed',false);
end $function$

       then (e.payload->>'original_provider_failed_run_id')::bigint else null end as source_failed_run_id,
    case when (e.payload->>'original_source_sha') ~ '^[a-f0-9]{40}
    case when q.qualified_candidate->>'artifact_sha256' ~ '^[a-f0-9]{64}$' and
      q.qualification_receipt is not null then true else false end as candidate_verified,
    (a.approval_id is not null and a.approved_at is not null) as owner_install_approved,
    (a.installed_commit_sha ~ '^[a-f0-9]{40}$') as isolated_installed,
    (a.settlement_receipt->>'original_job_completed'='true' and
      a.settlement_receipt->>'independent_outcome_verified'='true') as independently_settled,
    coalesce(a.target_environment,'ISOLATED_PREVIEW') as environment
  from reality_internal.genuine_capability_queue_v1 q
  join public.universe_events e on e.event_id=q.original_work_event_id and
    e.epistemic_status='VERIFIED' and
    e.payload->>'original_work_id'=q.original_work_id and
    e.payload->>'owner_id'=p_owner_id::text and
    e.provenance->>'principal_id'=p_owner_id::text and
    e.payload->>'owner_authorized_investigation'='true'
  left join reality_internal.genuine_preview_install_approvals_v1 a
    on a.trigger_id=q.trigger_id and a.owner_id=p_owner_id and
       a.original_work_id=q.original_work_id
  where q.owner_id=p_owner_id
  order by q.updated_at desc limit 12
 ) v;
 return jsonb_build_object(
  'status','OWNER_GOVERNED_LOOP_READBACK',
  'jobs',items,'owner_installation_authorized_by_read',false,
  'external_action_performed',false,'production_changed',false);
end $function$

       then e.payload->>'original_source_sha' else null end as source_commit_sha,
    case when q.qualified_candidate->>'artifact_sha256' ~ '^[a-f0-9]{64}$' and
      q.qualification_receipt is not null then true else false end as candidate_verified,
    (a.approval_id is not null and a.approved_at is not null) as owner_install_approved,
    (a.installed_commit_sha ~ '^[a-f0-9]{40}$') as isolated_installed,
    (a.settlement_receipt->>'original_job_completed'='true' and
      a.settlement_receipt->>'independent_outcome_verified'='true') as independently_settled,
    coalesce(a.target_environment,'ISOLATED_PREVIEW') as environment
  from reality_internal.genuine_capability_queue_v1 q
  join public.universe_events e on e.event_id=q.original_work_event_id and
    e.epistemic_status='VERIFIED' and
    e.payload->>'original_work_id'=q.original_work_id and
    e.payload->>'owner_id'=p_owner_id::text and
    e.provenance->>'principal_id'=p_owner_id::text and
    e.payload->>'owner_authorized_investigation'='true'
  left join reality_internal.genuine_preview_install_approvals_v1 a
    on a.trigger_id=q.trigger_id and a.owner_id=p_owner_id and
       a.original_work_id=q.original_work_id
  where q.owner_id=p_owner_id
  order by q.updated_at desc limit 12
 ) v;
 return jsonb_build_object(
  'status','OWNER_GOVERNED_LOOP_READBACK',
  'jobs',items,'owner_installation_authorized_by_read',false,
  'external_action_performed',false,'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_genuine_loop_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_genuine_loop_v1(uuid)
 to service_role;
