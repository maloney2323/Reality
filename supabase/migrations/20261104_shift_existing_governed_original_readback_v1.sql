-- Reality's shift worker is not a second AI agent.
-- Reuse the ALREADY owner-authorized Genuine Capability Engine queue.
-- Independently validate the exact owner/goal/original source/shift proof.
-- This is a read-only original-job linkage when final settlement is still absent.
-- Never create a job, call a model, initiate new research or grant installation.
-- Previous independent-final-receipt matching below is preserved unchanged.
create or replace function public.reality_reconcile_employee_shift_original_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 s record; v record; v_proof jsonb;
 v_existing_count integer;v_existing_work text;v_existing_trigger uuid;
 v_existing_phase text;v_existing_source text;v_existing_source_digest text;
 v_digest text;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into s from reality_internal.governed_employee_shifts_v1
 where status='AWAITING_EXACT_ORIGINAL_WORK' and
  planned_start_at<=v_now and planned_end_at>v_now
 order by planned_start_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_SHIFT_AWAITING_EXACT_WORK');end if;
 select q.original_work_id,r.artifact_sha256,
  r.verified_settlement_event_id,r.verified_at,t.source_ref into v
 from reality_internal.governed_employee_shift_steps_v1 t
 join public.universe_events e
   on e.epistemic_status='VERIFIED' and
    e.payload->>'owner_id'=s.owner_id::text and
    e.provenance->>'principal_id'=s.owner_id::text and
    e.payload->>'owner_authorized_investigation'='true' and
    e.payload->>'issue_number'=pg_catalog.split_part(t.source_ref,'/issues/',2)
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_event_id=e.event_id and
      q.owner_id=s.owner_id and
      q.original_work_id=e.payload->>'original_work_id'
 join reality_internal.genuine_independent_final_receipts_v1 r
   on r.owner_id=s.owner_id and r.original_work_id=q.original_work_id
      and r.production_changed=false and
      r.artifact_sha256=q.qualified_candidate->>'artifact_sha256'
 where t.shift_id=s.shift_id and t.source_ref ~
  '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
  and r.verified_at>=s.authorized_at and r.verified_at<=v_now
  and q.phase='SETTLED_ISOLATED'
 order by r.verified_at desc limit 1;
 if not found then
  -- This is not a new capability investigation. The original-job queue
  -- ALREADY owns any model research, frozen verification, approval and resume.
  -- Match only independently hashed source receipts, the current owner goal
  -- and one still-unsettled ORIGINAL job. Never adopt a bare GitHub issue.
  select count(*)::integer,min(q.original_work_id),min(q.trigger_id::text)::uuid,
    min(q.phase),min(t.source_ref),min(t.proof_sha256)
    into v_existing_count,v_existing_work,v_existing_trigger,
         v_existing_phase,v_existing_source,v_existing_source_digest
  from reality_internal.governed_employee_shift_steps_v1 t
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
    on q.original_work_event_id=e.event_id and q.owner_id=s.owner_id
      and q.original_work_id=e.payload->>'original_work_id'
      and q.conversation_id::text=e.provenance->>'conversation_id'
      and q.phase in ('PENDING_FROZEN_REPRODUCTION',
        'LEASED_FOR_INDEPENDENT_REPRODUCTION',
        'EVIDENCE_RECONCILIATION_REQUIRED',
        'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
        'AWAITING_OWNER_APPROVAL','ISOLATED_INSTALLED_PROBATION')
  join reality_internal.goal_publication_epochs epoch
    on epoch.user_id=q.owner_id and epoch.conversation_id=q.conversation_id
      and epoch.last_transition_event_id=q.goal_transition_event_id
  where t.shift_id=s.shift_id and t.state='SOURCE_CHECKED'
    and t.source_status='OPEN_ISSUE'
    and t.source_ref ~
       '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*
 v_proof:=jsonb_build_object('kind','EXACT_ORIGINAL_JOB_FINAL_RECEIPT_MATCH',
  'original_work_id',v.original_work_id,'source_ref',v.source_ref,
  'artifact_sha256',v.artifact_sha256,
  'verified_settlement_event_id',v.verified_settlement_event_id,
  'verified_at',v.verified_at,'read_only',true,
  'independently_reconciled',true,
  'production_changed',false,'human_hours_saved',null);
 v_digest:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_proof::text,'UTF8')),'hex');
 update reality_internal.governed_employee_shift_steps_v1
   set state='ORIGINAL_JOB_RECEIPT_VERIFIED',proof=v_proof,
   proof_sha256=v_digest,completed_at=v_now
   where shift_id=s.shift_id and step_index in (6,7)
   and state in ('QUEUED','AWAITING_EXACT_WORK');
 update reality_internal.governed_employee_shifts_v1
   set status='RUNNING',last_progress_at=v_now
   where shift_id=s.shift_id;
 return jsonb_build_object('status','EXACT_SHIFT_ORIGINAL_RECEIPT_RECONCILED',
  'shift_id',s.shift_id,'original_work_id',v.original_work_id,
  'proof_sha256',v_digest,'installation_authorized',false,
  'production_changed',false,'human_hours_saved',null);
end $fn$;
revoke all on function public.reality_reconcile_employee_shift_original_v1()
 from public,anon,authenticated;
grant execute on function public.reality_reconcile_employee_shift_original_v1()
 to service_role;
    and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
    and t.proof->>'source_url'=t.source_ref
    and t.proof->>'provider_status'=t.source_status
    and t.proof->>'provider_checked'='true'
    and t.proof->>'read_only'='true'
    and t.proof->>'production_changed'='false'
    and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
    and not exists(
      select 1 from reality_internal.genuine_independent_final_receipts_v1 r2
      where r2.owner_id=q.owner_id
        and r2.original_work_id=q.original_work_id)
    and not exists(
      select 1 from public.universe_events settled
      where settled.epistemic_status='VERIFIED'
       and settled.payload->>'owner_id'=s.owner_id::text
       and settled.payload->>'original_work_id'=q.original_work_id
       and settled.payload->>'constitutional_phase'='SETTLED'
       and settled.payload->>'original_job_completed'='true');
  if v_existing_count=1 then
   return pg_catalog.jsonb_build_object(
    'status','EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
    'shift_id',s.shift_id,
    'governed_existing_work_status','EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY',
    'governed_original_work_id',v_existing_work,
    'governed_trigger_id',v_existing_trigger,
    'governed_queue_phase',v_existing_phase,
    'shift_observation_source_ref',v_existing_source,
    'shift_observation_proof_sha256',v_existing_source_digest,
    'governed_cycle_dispatched_by_shift',false,
    'model_invoked_by_shift',false,'new_customer_job_created',false,
    'installation_authorized',false,'production_changed',false);
  end if;
  -- Do not choose an original job by rank or guess when ambiguous.
  return pg_catalog.jsonb_build_object(
   'status','EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
   'shift_id',s.shift_id,
   'governed_existing_work_status',case when v_existing_count>1 then
     'AMBIGUOUS_ORIGINAL_SCOPE_NO_AUTOMATIC_SELECTION'
    else 'NO_ELIGIBLE_ORIGINAL_JOB_FROM_SHIFT_OBSERVATION' end,
   'governed_cycle_dispatched_by_shift',false,
   'model_invoked_by_shift',false,'new_customer_job_created',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 v_proof:=jsonb_build_object('kind','EXACT_ORIGINAL_JOB_FINAL_RECEIPT_MATCH',
  'original_work_id',v.original_work_id,'source_ref',v.source_ref,
  'artifact_sha256',v.artifact_sha256,
  'verified_settlement_event_id',v.verified_settlement_event_id,
  'verified_at',v.verified_at,'read_only',true,
  'independently_reconciled',true,
  'production_changed',false,'human_hours_saved',null);
 v_digest:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_proof::text,'UTF8')),'hex');
 update reality_internal.governed_employee_shift_steps_v1
   set state='ORIGINAL_JOB_RECEIPT_VERIFIED',proof=v_proof,
   proof_sha256=v_digest,completed_at=v_now
   where shift_id=s.shift_id and step_index in (6,7)
   and state in ('QUEUED','AWAITING_EXACT_WORK');
 update reality_internal.governed_employee_shifts_v1
   set status='RUNNING',last_progress_at=v_now
   where shift_id=s.shift_id;
 return jsonb_build_object('status','EXACT_SHIFT_ORIGINAL_RECEIPT_RECONCILED',
  'shift_id',s.shift_id,'original_work_id',v.original_work_id,
  'proof_sha256',v_digest,'installation_authorized',false,
  'production_changed',false,'human_hours_saved',null);
end $fn$;
revoke all on function public.reality_reconcile_employee_shift_original_v1()
 from public,anon,authenticated;
grant execute on function public.reality_reconcile_employee_shift_original_v1()
 to service_role;
