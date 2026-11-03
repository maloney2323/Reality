create or replace function public.reality_record_owner_capability_discovery_audit_v1(
 p_owner_id uuid,p_report jsonb
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
 audit_id uuid;
 entry jsonb;
 v_key text;
 v_kind text;
 v_url text;
 v_work text;
 was_seen boolean;
 handled boolean;
 finalized boolean;
 previous_owner_work boolean;
 output_entries jsonb:='[]'::jsonb;
 new_count integer:=0;
 seen_count integer:=0;
 rejected_count integer:=0;
begin
 if current_user<>'service_role' then
  raise exception 'CAPABILITY_AUDIT_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null or p_report is null or
    pg_catalog.jsonb_typeof(p_report)<>'object' or
    (p_report->>'version')<>'reality-capability-discovery-audit-v1' or
    (p_report->>'report_sha256')!~'^[a-f0-9]{64}$' or
    pg_catalog.jsonb_typeof(p_report->'candidates')<>'array' or
    pg_catalog.jsonb_array_length(p_report->'candidates')>12 or
    pg_catalog.jsonb_typeof(p_report->'source_coverage')<>'object' then
  raise exception 'CAPABILITY_AUDIT_VERIFIED_BOUNDED_REPORT_REQUIRED';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 9112));
 insert into reality_internal.capability_discovery_audit_runs_v1
  (owner_id,report_sha256,source_coverage,submitted_candidate_count)
 values (p_owner_id,p_report->>'report_sha256',
  p_report->'source_coverage',pg_catalog.jsonb_array_length(p_report->'candidates'))
 returning capability_discovery_audit_runs_v1.audit_id into audit_id;
 for entry in select v from pg_catalog.jsonb_array_elements(p_report->'candidates') v loop
  v_key:=entry->>'fingerprint';
  v_kind:=entry->>'kind';
  v_url:=entry->>'evidence_url';
  v_work:=entry->>'original_work_id';
  if v_key is null or v_key!~'^[a-f0-9]{64}$' or
     v_kind not in ('SOURCE_VERIFIED_GAP','REPEATED_CI_FAILURE') or
     v_url is null or
     v_url!~'^https://github[.]com/maloney2323/Reality/(issues|actions/runs)/[1-9][0-9]*$' or
     (v_work is not null and v_work!~'^work:[a-f0-9]{32}$') or
     (v_kind='SOURCE_VERIFIED_GAP' and v_work is null) then
    raise exception 'CAPABILITY_AUDIT_PROVIDER_EVIDENCE_INVALID';
  end if;
  select exists(select 1 from reality_internal.capability_discovery_audit_sightings_v1 s
    where s.owner_id=p_owner_id and s.fingerprint=v_key)
   into was_seen;
  -- A provider-observation work ID is NOT the owner-adopted job ID.
  -- Match actual source-run identity and independently saved original issue.
  select exists(select 1 from public.universe_events e
    where e.entity_type='reality_original_source_backed_repair_work'
     and e.payload->>'owner_id'=p_owner_id::text
     and e.payload->>'issue_url'=v_url)
   into previous_owner_work;
  select (previous_owner_work or exists(
    select 1 from reality_internal.genuine_capability_queue_v1 q
    where q.owner_id=p_owner_id and
      ((v_work is not null and q.original_work_id=v_work) or
       q.source_ref=v_url or
       (entry->>'original_failed_run_ref' is not null
        and q.source_ref=entry->>'original_failed_run_ref'))))
   into handled;
  select (
   exists(select 1 from reality_internal.genuine_independent_final_receipts_v1 r
     where r.owner_id=p_owner_id and v_work is not null and r.original_work_id=v_work)
   or exists(
    select 1 from public.universe_events orig
    join reality_internal.genuine_capability_queue_v1 q
       on q.owner_id=p_owner_id
      and q.original_work_id=orig.payload->>'original_work_id'
      and q.phase='SETTLED_ISOLATED'
    where orig.entity_type='reality_original_source_backed_repair_work'
      and orig.payload->>'owner_id'=p_owner_id::text
      and orig.payload->>'issue_url'=v_url
   )
   or exists(
    select 1 from public.universe_events orig
    join reality_internal.genuine_independent_final_receipts_v1 r
      on r.owner_id=p_owner_id
     and r.original_work_id=orig.payload->>'original_work_id'
    where orig.entity_type='reality_original_source_backed_repair_work'
      and orig.payload->>'owner_id'=p_owner_id::text
      and orig.payload->>'issue_url'=v_url
   )
  ) into finalized;
  if not handled and not finalized then
   insert into reality_internal.capability_discovery_audit_sightings_v1
     (owner_id,fingerprint,kind,evidence_url,original_work_id)
   values (p_owner_id,v_key,v_kind,v_url,v_work)
   on conflict (owner_id,fingerprint) do update
    set last_seen_at=now(),
      observation_count=reality_internal.capability_discovery_audit_sightings_v1.observation_count+1;
  end if;
  if finalized then rejected_count:=rejected_count+1;
  elsif handled then rejected_count:=rejected_count+1;
  elsif was_seen then seen_count:=seen_count+1;
  else new_count:=new_count+1;
  end if;
  output_entries:=output_entries||pg_catalog.jsonb_build_array(
    entry||pg_catalog.jsonb_build_object(
      'novelty',case
        when finalized then 'ALREADY_SETTLED_NOT_ELIGIBLE'
        when handled then 'EXISTING_WORK_NOT_NEW'
        when was_seen then 'PREVIOUSLY_OBSERVED'
        else 'FIRST_OBSERVED_IN_OWNER_AUDIT'
      end
    )
  );
 end loop;
 return pg_catalog.jsonb_build_object(
  'ok',true,'status','GOVERNED_AUDIT_RECORDED',
  'audit_id',audit_id,'candidates',output_entries,
  'new_evidence_count',new_count,
  'previously_observed_count',seen_count,
  'already_handled_count',rejected_count,
  'installation_authorized',false,
  'job_started',false,'production_changed',false
 );
end $$;
revoke all on function public.reality_record_owner_capability_discovery_audit_v1(uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.reality_record_owner_capability_discovery_audit_v1(uuid,jsonb)
 to service_role;
