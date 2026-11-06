-- Riley inherits Reality's existing capability worker wake ONLY after
-- owner-scoped shift source reconciliation independently proves one exact,
-- still-unsettled original job. No new authority, queue, installation or
-- model access is created. Read-only service-role admission.
create or replace function public.reality_read_shift_eligible_capability_wake_v1(p_shift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $fn$
declare
 v_now timestamptz:=clock_timestamp();
 v record;
 v_count integer:=0;
begin
 if current_user<>'service_role' then
  raise exception 'SHIFT_CAPABILITY_WAKE_SERVICE_ROLE_REQUIRED';
 end if;
 if p_shift_id is null then
  return jsonb_build_object('status','SHIFT_WAKE_SHIFT_ID_REQUIRED',
   'installation_authorized',false,'production_changed',false);
 end if;
 select count(*)::integer into v_count
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_steps_v1 t
   on t.shift_id=s.shift_id and t.step_index between 2 and 5
 join public.universe_events e
   on e.entity_type='reality_original_source_backed_repair_work'
    and e.epistemic_status='VERIFIED'
    and e.payload->>'owner_id'=s.owner_id::text
    and e.provenance->>'principal_id'=s.owner_id::text
    and e.payload->>'owner_authorized_investigation'='true'
    and e.payload->>'owner_authorized_installation'='false'
    and e.payload->>'original_job_completed'='false'
    and e.payload->>'production_changed'='false'
    and e.payload->>'issue_number'=pg_catalog.split_part(t.source_ref,'/issues/',2)
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_event_id=e.event_id
    and q.owner_id=s.owner_id
    and q.original_work_id=e.payload->>'original_work_id'
    and q.conversation_id::text=e.provenance->>'conversation_id'
 join reality_internal.goal_publication_epochs epoch
   on epoch.user_id=q.owner_id
    and epoch.conversation_id=q.conversation_id
    and epoch.last_transition_event_id=q.goal_transition_event_id
 join public.universe_events gap
   on gap.event_id=q.gap_event_id and gap.epistemic_status='VERIFIED'
 where s.shift_id=p_shift_id
   and s.status='AWAITING_EXACT_ORIGINAL_WORK'
   and s.planned_start_at<=v_now and s.planned_end_at>v_now
   and t.state='SOURCE_CHECKED'
   and t.source_status='OPEN_ISSUE'
   and t.source_ref ~ '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
   and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and t.proof->>'source_url'=t.source_ref
   and t.proof->>'provider_status'='OPEN_ISSUE'
   and t.proof->>'provider_checked'='true'
   and t.proof->>'read_only'='true'
   and t.proof->>'production_changed'='false'
   and t.proof_sha256='sha256:'||pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
   and q.phase in ('PENDING_FROZEN_REPRODUCTION',
                   'EVIDENCE_RECONCILIATION_REQUIRED',
                   'FROZEN_REPRODUCED_AWAITING_CANDIDATE')
   and q.trigger_id is not null and q.gap_event_id is not null
   and not exists (
    select 1 from reality_internal.genuine_independent_final_receipts_v1 r
    where r.owner_id=q.owner_id and r.original_work_id=q.original_work_id
   )
   and not exists (
    select 1 from public.universe_events settled
    where settled.epistemic_status='VERIFIED'
     and settled.payload->>'owner_id'=s.owner_id::text
     and settled.payload->>'original_work_id'=q.original_work_id
     and settled.payload->>'constitutional_phase'='SETTLED'
     and settled.payload->>'original_job_completed'='true'
   );
 if v_count<>1 then
  return pg_catalog.jsonb_build_object(
   'status',case when v_count=0 then 'NO_ELIGIBLE_SHIFT_BOUND_ORIGINAL_WAKE'
    else 'AMBIGUOUS_SHIFT_BOUND_ORIGINAL_WAKE' end,
   'shift_id',p_shift_id,'candidate_count',v_count,
   'dispatch_authorized',false,'installation_authorized',false,
   'production_changed',false,'original_job_completed',false);
 end if;
 select q.trigger_id,q.gap_event_id as source_event_id,
  q.original_work_id,t.source_ref,t.proof_sha256
 into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_steps_v1 t
   on t.shift_id=s.shift_id and t.step_index between 2 and 5
 join public.universe_events e
   on e.entity_type='reality_original_source_backed_repair_work'
    and e.epistemic_status='VERIFIED'
    and e.payload->>'owner_id'=s.owner_id::text
    and e.provenance->>'principal_id'=s.owner_id::text
    and e.payload->>'owner_authorized_investigation'='true'
    and e.payload->>'owner_authorized_installation'='false'
    and e.payload->>'original_job_completed'='false'
    and e.payload->>'production_changed'='false'
    and e.payload->>'issue_number'=pg_catalog.split_part(t.source_ref,'/issues/',2)
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_event_id=e.event_id
    and q.owner_id=s.owner_id
    and q.original_work_id=e.payload->>'original_work_id'
    and q.conversation_id::text=e.provenance->>'conversation_id'
 join reality_internal.goal_publication_epochs epoch
   on epoch.user_id=q.owner_id
    and epoch.conversation_id=q.conversation_id
    and epoch.last_transition_event_id=q.goal_transition_event_id
 join public.universe_events gap
   on gap.event_id=q.gap_event_id and gap.epistemic_status='VERIFIED'
 where s.shift_id=p_shift_id
   and s.status='AWAITING_EXACT_ORIGINAL_WORK'
   and s.planned_start_at<=v_now and s.planned_end_at>v_now
   and t.state='SOURCE_CHECKED' and t.source_status='OPEN_ISSUE'
   and t.source_ref ~ '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
   and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and t.proof->>'source_url'=t.source_ref
   and t.proof->>'provider_status'='OPEN_ISSUE'
   and t.proof->>'provider_checked'='true'
   and t.proof->>'read_only'='true'
   and t.proof->>'production_changed'='false'
   and t.proof_sha256='sha256:'||pg_catalog.encode(
      pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
   and q.phase in ('PENDING_FROZEN_REPRODUCTION',
                   'EVIDENCE_RECONCILIATION_REQUIRED',
                   'FROZEN_REPRODUCED_AWAITING_CANDIDATE')
   and q.trigger_id is not null and q.gap_event_id is not null
   and not exists (
    select 1 from reality_internal.genuine_independent_final_receipts_v1 r
    where r.owner_id=q.owner_id and r.original_work_id=q.original_work_id
   )
   and not exists (
    select 1 from public.universe_events settled
    where settled.epistemic_status='VERIFIED'
     and settled.payload->>'owner_id'=s.owner_id::text
     and settled.payload->>'original_work_id'=q.original_work_id
     and settled.payload->>'constitutional_phase'='SETTLED'
     and settled.payload->>'original_job_completed'='true'
   )
 limit 1;
 if v.trigger_id is null or v.source_event_id is null then
  raise exception 'SHIFT_CAPABILITY_WAKE_INDEPENDENT_SOURCE_CHANGED';
 end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_EXISTING_ORIGINAL_CAPABILITY_WAKE_ELIGIBLE',
  'shift_id',p_shift_id,
  'trigger_id',v.trigger_id,
  'source_event_id',v.source_event_id,
  'original_work_id',v.original_work_id,
  'source_ref',v.source_ref,
  'source_proof_sha256',v.proof_sha256,
  'existing_queue_only',true,'new_original_job_created',false,
  'dispatch_authorized',true,
  'installation_authorized',false,
  'original_job_completed',false,
  'production_changed',false);
end
$fn$;
revoke all on function public.reality_read_shift_eligible_capability_wake_v1(uuid)
 from public, anon, authenticated;
grant execute on function public.reality_read_shift_eligible_capability_wake_v1(uuid)
 to service_role;
comment on function public.reality_read_shift_eligible_capability_wake_v1(uuid)
 is 'Read-only service-role exact shift/owner/original-work/gap-event wake eligibility; never grants install or new job.';
