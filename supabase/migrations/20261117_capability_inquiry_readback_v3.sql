-- Tighten independent original proof and verify matching capability-feed version.
create or replace function public.reality_read_owner_capability_employee_schedule_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $f$
declare result jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'CAPABILITY_SCHEDULE_OWNER_SERVICE_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'capability_key',t.capability_key,'evidence_fingerprint',t.evidence_fingerprint,
   'phase',t.phase,'employee',t.assigned_employee,
   'function_id',t.assigned_function_id,
   'reviewer',t.independent_reviewer,
   'reviewer_function_id',t.reviewer_function_id,
   'planned_inquiry_at',t.planned_inquiry_at,
   'assigned_at',t.recorded_at,
   'scope',t.investigation_scope,
   'independent_test_requirement',t.independent_test_requirement,
   'source_limitations',t.evidence_limitations,
   'estimate_minutes_low',t.provisional_minutes_low,
   'estimate_minutes_high',t.provisional_minutes_high,
   'estimate_is_model_provisional_only',true,
   'inquiry_recorded_at',t.inquiry_recorded_at,
   'inquiry_source_kind',t.inquiry_source_kind,
   'inquiry_source_proof_sha256',t.inquiry_source_proof_sha256,
   'inquiry_model_response_id',t.inquiry_model_response_id,
   'inquiry_question',t.inquiry_question,
   'inquiry_findings',t.inquiry_findings,
   'inquiry_next_evidence_action',t.inquiry_next_evidence_action,
   'inquiry_block_reason',t.inquiry_block_reason,
   'inquiry_receipt_sha256',t.inquiry_receipt_sha256,
   'source_feed_fingerprint_unchanged',exists(
    select 1 from pg_catalog.jsonb_array_elements(
     public.reality_read_owner_capability_gap_feed_v1(p_owner_id)->'items'
    ) current_item(value)
    where current_item.value->>'key'=t.capability_key
     and pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(current_item.value::text,'UTF8')),'hex')
       =t.evidence_fingerprint
   ),
   'independent_current_gap_proven',(
    q.trigger_id is not null
    and q.phase in ('PENDING_FROZEN_REPRODUCTION',
     'LEASED_FOR_INDEPENDENT_REPRODUCTION',
     'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
     'AWAITING_OWNER_APPROVAL','AWAITING_INSTALLATION_APPROVAL')
    and q.original_work_id ~ '^work:[a-f0-9]{32}$'
    and q.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'
    and q.verified_frozen_reproduction->>'original_work_id'=q.original_work_id
    and q.verified_frozen_reproduction->>'frozen_sha256'=
     pg_catalog.replace(q.frozen_suite_ref,
      'github:frozen-regression:sha256:','')
   ),
   'existing_original_work_id',case when q.trigger_id is not null
    and q.phase in ('PENDING_FROZEN_REPRODUCTION',
     'LEASED_FOR_INDEPENDENT_REPRODUCTION',
     'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
     'AWAITING_OWNER_APPROVAL','AWAITING_INSTALLATION_APPROVAL')
    and q.original_work_id ~ '^work:[a-f0-9]{32}$'
    and q.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'
    and q.verified_frozen_reproduction->>'original_work_id'=q.original_work_id
    and q.verified_frozen_reproduction->>'frozen_sha256'=
     pg_catalog.replace(q.frozen_suite_ref,
      'github:frozen-regression:sha256:','')
     then q.original_work_id else null end,
   'existing_governance_phase',q.phase,
   'execution_authorized_by_schedule',false,
   'original_job_created_by_schedule',false,
   'installation_authorized',false
  ) order by t.priority,t.claimed_at),'[]'::jsonb)
 into result
 from (select t.* from reality_internal.owner_capability_employee_schedule_v1 t
  where t.owner_id=p_owner_id order by t.priority,t.claimed_at limit 50) t
 left join reality_internal.genuine_capability_queue_v1 q
  on t.capability_key='queue:'||q.trigger_id::text
   and q.owner_id=t.owner_id;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CAPABILITY_EMPLOYEE_SCHEDULE_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'items',result,'count',pg_catalog.jsonb_array_length(result),
  'new_original_jobs_created',0,'execution_authorized_by_schedule',false,
  'installation_authorized',false,'production_changed',false);
end $f$;
