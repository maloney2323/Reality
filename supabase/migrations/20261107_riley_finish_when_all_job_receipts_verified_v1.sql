-- Completion-based Reality Riley/Taylor pilot. Approved timeboxes are MAXIMUM
-- execution-authority limits, never targets or evidence of useful work.
-- An early success requires ALL admitted original jobs to have independent,
-- same-owner/source/artifact final settlement receipts. No job => no success.
-- Nothing here creates a job, extends consent, installs or rewrites production.
-- pg_cron runs under postgres; no browser/anonymous/service_role execution.
create or replace function reality_internal.reality_finish_riley_verified_batch_v1()
returns jsonb
language plpgsql security invoker set search_path to 'pg_catalog'
as $completion$
declare
 s record;
 v_now timestamptz:=clock_timestamp();
 v_targets integer:=0;
 v_verified integer:=0;
 v_outstanding integer:=0;
 v_proof jsonb;
 v_report jsonb;
 v_hash text;
begin
 if current_user<>'postgres' then
  raise exception 'RILEY_COMPLETION_CRON_POSTGRES_ONLY';
 end if;
 select * into s
 from reality_internal.governed_employee_shifts_v1
 where status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and closed_at is null
   and authorized_at is not null
   and planned_start_at<=v_now
   and planned_end_at>v_now
   and exists (
    select 1 from reality_internal.governed_employee_original_claims_v1 c
    where c.shift_id=governed_employee_shifts_v1.shift_id
   )
 order by planned_start_at,created_at
 for update skip locked
 limit 1;
 if not found then
  return jsonb_build_object('status','NO_VERIFIED_BATCH_READY_FOR_EARLY_CLOSE',
   'original_job_completed',false,'production_changed',false);
 end if;
 -- A partial investigation or blocked source step is not a completed shift.
 if (select count(*) from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.step_index between 1 and 5
       and t.state='SOURCE_CHECKED')<>5 or
    (select count(*) from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.step_index=6
       and t.state in ('AWAITING_EXACT_WORK','ORIGINAL_JOB_RECEIPT_VERIFIED'))<>1 or
    (select count(*) from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.step_index=7
       and t.state in ('QUEUED','AWAITING_EXACT_WORK','ORIGINAL_JOB_RECEIPT_VERIFIED'))<>1 or
    (select count(*) from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.step_index=8 and t.state='QUEUED')<>1
 then
  return jsonb_build_object('status','SOURCE_OR_VERIFICATION_STEPS_INCOMPLETE',
   'shift_id',s.shift_id,'original_job_completed',false,'production_changed',false);
 end if;
 select count(*) into v_targets
 from reality_internal.governed_employee_original_claims_v1 c
 where c.shift_id=s.shift_id and c.owner_id=s.owner_id;
 if v_targets<1 or v_targets>4 then
  return jsonb_build_object('status','BATCH_TARGET_COUNT_NOT_VERIFIED',
   'shift_id',s.shift_id,'original_job_completed',false,'production_changed',false);
 end if;
 -- Require independently reconciled, unique signed final receipts for EVERY
 -- claimed original and the exact tested/installed artifact in the same queue.
 select count(*) into v_verified
 from reality_internal.governed_employee_original_claims_v1 c
 join reality_internal.genuine_independent_final_receipts_v1 r
   on r.original_work_id=c.original_work_id and r.owner_id=c.owner_id
     and r.verified_settlement_event_id=c.independent_receipt_event_id
     and r.verified_at>=c.created_at and r.production_changed=false
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_id=c.original_work_id and q.owner_id=c.owner_id
     and q.original_work_event_id=c.source_event_id
     and q.phase='SETTLED_ISOLATED'
     and q.qualified_candidate->>'artifact_sha256'=r.artifact_sha256
 where c.shift_id=s.shift_id and c.owner_id=s.owner_id
   and c.phase='RECEIPT_INDEPENDENTLY_RECONCILED'
   and c.independent_receipt_event_id is not null
   and exists (
    select 1 from reality_internal.governed_employee_shift_steps_v1 t
    where t.shift_id=s.shift_id and t.step_index between 2 and 5
      and t.state='SOURCE_CHECKED' and t.source_status='OPEN_ISSUE'
      and t.source_ref=c.source_ref
      and t.proof_sha256=c.source_proof_sha256
      and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
      and t.proof->>'provider_checked'='true'
      and t.proof->>'production_changed'='false'
      and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
         pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
   );
 if v_verified<>v_targets then
  return jsonb_build_object('status','BATCH_WAITING_INDEPENDENT_FINAL_RECEIPTS',
   'shift_id',s.shift_id,'admitted_original_jobs',v_targets,
   'independently_verified_final_receipts',v_verified,
   'original_job_completed',false,'production_changed',false);
 end if;
 -- No still-eligible unclaimed job from a SOURCE_CHECKED authorized issue.
 -- A second discovered candidate cannot be silently dropped to stop early.
 select count(*) into v_outstanding
 from reality_internal.governed_employee_shift_steps_v1 t
 join public.universe_events e
   on e.entity_type='reality_original_source_backed_repair_work'
    and e.epistemic_status='VERIFIED'
    and e.payload->>'owner_id'=s.owner_id::text
    and e.provenance->>'principal_id'=s.owner_id::text
    and e.payload->>'issue_number'=split_part(t.source_ref,'/issues/',2)
    and e.payload->>'owner_authorized_investigation'='true'
    and e.payload->>'owner_authorized_installation'='false'
    and e.payload->>'original_job_completed'='false'
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_event_id=e.event_id
    and q.original_work_id=e.payload->>'original_work_id'
    and q.owner_id=s.owner_id
 where t.shift_id=s.shift_id and t.step_index between 2 and 5
   and t.state='SOURCE_CHECKED' and t.source_status='OPEN_ISSUE'
   and q.phase in ('PENDING_FROZEN_REPRODUCTION',
     'EVIDENCE_RECONCILIATION_REQUIRED',
     'FROZEN_REPRODUCED_AWAITING_CANDIDATE')
   and q.claim_id is null
   and not exists (
    select 1 from reality_internal.governed_employee_original_claims_v1 c
    where c.original_work_id=q.original_work_id
   );
 if v_outstanding<>0 then
  return jsonb_build_object('status','AUTHORIZED_ORIGINAL_WORK_STILL_OUTSTANDING',
   'shift_id',s.shift_id,'outstanding',v_outstanding,
   'original_job_completed',false,'production_changed',false);
 end if;
 v_proof:=jsonb_build_object(
  'kind','INDEPENDENT_MULTI_ORIGINAL_SETTLEMENT_EVIDENCE',
  'shift_id',s.shift_id,'owner_id',s.owner_id,
  'admitted_originals',v_targets,
  'independently_verified_final_receipts',v_verified,
  'receipt_event_ids',(
    select coalesce(jsonb_agg(c.independent_receipt_event_id
      order by c.original_work_id),'[]'::jsonb)
    from reality_internal.governed_employee_original_claims_v1 c
    where c.shift_id=s.shift_id),
  'same_original_job_claim_replay',false,
  'installation_authorized_by_shift',false,
  'production_changed',false);
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_proof::text,'UTF8')),'hex');
 update reality_internal.governed_employee_shift_steps_v1 t
 set state='ORIGINAL_JOB_RECEIPT_VERIFIED',proof=v_proof,
   proof_sha256=v_hash,completed_at=v_now
 where t.shift_id=s.shift_id and t.step_index in (6,7)
   and t.state in ('QUEUED','AWAITING_EXACT_WORK');
 if (select count(*) from reality_internal.governed_employee_shift_steps_v1 t
    where t.shift_id=s.shift_id and t.step_index in (6,7)
      and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED')<>2 then
  raise exception 'RILEY_COMPLETION_STEPS_NOT_DURABLY_VERIFIED';
 end if;
 v_report:=jsonb_build_object(
  'status','EMPLOYEE_SHIFT_EVIDENCE_REPORT',
  'completion_reason','ALL_ADMITTED_ORIGINAL_JOB_RECEIPTS_INDEPENDENTLY_VERIFIED',
  'shift_id',s.shift_id,
  'admitted_originals',v_targets,
  'original_jobs_independently_settled_in_this_shift',v_verified,
  'independent_final_receipt_event_ids',v_proof->'receipt_event_ids',
  'scheduled_shift_hours_guardrail',extract(epoch from
    (s.planned_end_at-s.planned_start_at))/3600,
  'actual_elapsed_minutes',extract(epoch from (v_now-s.planned_start_at))/60,
  'ended_at',v_now,
  'work_installation_authorized',false,
  'net_human_equivalent_hours_returned',null,
  'realized_cash_savings_usd',null,
  'production_changed',false,
  'blocked_work_included',false);
 update reality_internal.governed_employee_shift_steps_v1 t
 set state='REPORTED',proof=v_report,
   proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_report::text,'UTF8')),'hex'),
   completed_at=v_now
 where t.shift_id=s.shift_id and t.step_index=8 and t.state='QUEUED';
 if not found then
  raise exception 'RILEY_COMPLETION_CLOSE_RECEIPT_NOT_WRITTEN';
 end if;
 update reality_internal.governed_employee_shifts_v1
 set status='ENDED_WITH_VERIFIED_JOB',closed_at=v_now,
   close_report=v_report,last_progress_at=v_now
 where shift_id=s.shift_id and closed_at is null;
 if not found then
  raise exception 'RILEY_COMPLETION_CONCURRENT_SHIFT_CHANGE';
 end if;
 return jsonb_build_object('status','ALL_VERIFIED_ORIGINAL_JOBS_FINISHED_SHIFT_CLOSED',
   'shift_id',s.shift_id,'independently_verified_final_receipts',v_verified,
   'source_proof_sha256',v_hash,
   'original_job_completed',true,'installation_authorized',false,
   'production_changed',false);
end $completion$;
revoke all on function reality_internal.reality_finish_riley_verified_batch_v1()
 from public,anon,authenticated,service_role;

-- Every-minute settlement supervisor: no new model calls, wake, installation,
-- scope extension or external effects. When evidence is incomplete it is a
-- no-op and the original jobs remain durable and independently recoverable.
select cron.schedule(
 'reality-riley-finish-verified-work-v1','* * * * *',
 $verified_completion$
 select reality_internal.reality_finish_riley_verified_batch_v1();
 $verified_completion$
);
