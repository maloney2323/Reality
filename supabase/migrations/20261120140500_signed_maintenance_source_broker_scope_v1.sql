-- The GitHub credential remains in Reality's EXISTING Supabase broker
-- environment. Only the exact service-bound, one-use existing maintenance
-- candidate may obtain source bytes for its already-claimed release SHA.
create or replace function public.reality_read_signed_maintenance_repair_source_scope_v1(
 p_maintenance_id uuid,p_request_id uuid,p_release_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;
begin
 if current_user<>'service_role' or p_maintenance_id is null or
  p_request_id is null or p_release_sha!~'^[a-f0-9]{40}$' then
  raise exception 'SIGNED_MAINTENANCE_SOURCE_BROKER_SERVICE_REQUIRED';
 end if;
 select c.maintenance_id,c.owner_id,c.shift_id,c.source_ref,c.release_sha,
  c.request_id,c.source_handoff_sha256,
  h.independent_baseline_receipt_sha256,
  h.independent_diagnostic_receipt_sha256
 into v
 from reality_internal.owner_maintenance_repair_candidates_v1 c
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  on h.maintenance_id=c.maintenance_id and h.owner_id=c.owner_id
  and h.shift_id=c.shift_id and h.source_ref=c.source_ref
  and h.handoff_receipt_sha256=c.source_handoff_sha256
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=c.shift_id and s.owner_id=c.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=c.maintenance_id and m.owner_id=c.owner_id
   and m.claimed_shift_id=c.shift_id and m.source_ref=c.source_ref
 where c.maintenance_id=p_maintenance_id and c.request_id=p_request_id
  and c.release_sha=p_release_sha
  and (
   (c.state='CLAIMED'
    and c.claimed_at>clock_timestamp()-interval '8 minutes')
   or
   (c.state='MODEL_CANDIDATE_RECORDED'
    and exists (
     select 1 from reality_internal.owner_maintenance_candidate_target_reviews_v1 rv
     where rv.maintenance_id=c.maintenance_id
      and rv.owner_id=c.owner_id and rv.shift_id=c.shift_id
      and rv.source_ref=c.source_ref
      and rv.original_model_request_id=c.request_id
      and rv.original_release_sha=c.release_sha
      and rv.original_candidate_receipt_sha256=c.candidate_receipt_sha256
      and rv.state='CLAIMED'
      and rv.claimed_at>clock_timestamp()-interval '5 minutes'
    ))
  )
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and w.state='ACTIVE' and s.authorized_at is not null
  and s.closed_at is null and
   s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   where scope.entry->>'maintenance_id'=c.maintenance_id::text
    and scope.entry->>'source_ref'=c.source_ref
    and scope.entry->>'origin_shift_id'=h.origin_shift_id::text
    and scope.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  and m.independent_frozen_test_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
 limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_SOURCE_BROKER_SCOPE',
  'source_read_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED',
  'maintenance_id',v.maintenance_id,'owner_id',v.owner_id,
  'shift_id',v.shift_id,'source_ref',v.source_ref,
  'request_id',v.request_id,'release_sha',v.release_sha,
  'source_handoff_sha256',v.source_handoff_sha256,
  'source_read_authorized',true,
  'model_candidate_only',true,
  'independent_frozen_red_verified',false,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_signed_maintenance_repair_source_scope_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_read_signed_maintenance_repair_source_scope_v1(uuid,uuid,text) to service_role;
