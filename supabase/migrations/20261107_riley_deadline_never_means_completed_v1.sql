-- An expired authorization timebox is not job completion. Independent
-- all-original receipt evidence is required even when one step 6 was marked
-- verified. Existing historical no-op handling stays a read-only result.
-- This only affects future authorized shift closures in the isolated pilot.
CREATE OR REPLACE FUNCTION public.reality_close_employee_shift_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s record;v_now timestamptz:=clock_timestamp();v_report jsonb;
 v_historical_noop boolean;
 v_claims integer:=0; v_verified integer:=0; v_unclaimed integer:=0;
 v_all_verified boolean:=false;
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into s from reality_internal.governed_employee_shifts_v1
 where status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ESCALATED')
  and planned_end_at<=v_now
 order by planned_end_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_SHIFT_DUE_FOR_CLOSE');end if;
 select count(*) into v_claims
 from reality_internal.governed_employee_original_claims_v1 c
 where c.shift_id=s.shift_id and c.owner_id=s.owner_id;
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
    and t.source_ref=c.source_ref and t.source_status='OPEN_ISSUE'
    and t.state='SOURCE_CHECKED'
    and t.proof_sha256=c.source_proof_sha256);
 select count(*) into v_unclaimed
 from reality_internal.governed_employee_shift_steps_v1 t
 join public.universe_events e on
   e.entity_type='reality_original_source_backed_repair_work'
   and e.epistemic_status='VERIFIED'
   and e.payload->>'owner_id'=s.owner_id::text
   and e.payload->>'issue_number'=split_part(t.source_ref,'/issues/',2)
   and e.payload->>'owner_authorized_investigation'='true'
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_event_id=e.event_id
   and q.original_work_id=e.payload->>'original_work_id'
   and q.owner_id=s.owner_id
 where t.shift_id=s.shift_id and t.step_index between 2 and 5
  and t.source_status='OPEN_ISSUE'
  and t.state='SOURCE_CHECKED'
  and q.phase in ('PENDING_FROZEN_REPRODUCTION',
    'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE')
  and q.claim_id is null
  and not exists(select 1 from reality_internal.governed_employee_original_claims_v1 c
   where c.original_work_id=q.original_work_id);
 v_all_verified:=v_claims between 1 and 4
  and v_claims=v_verified and v_unclaimed=0
  and (select count(*) from reality_internal.governed_employee_shift_steps_v1 t
      where t.shift_id=s.shift_id and t.step_index between 1 and 5
       and t.state='SOURCE_CHECKED')=5;

 select count(*)=2 into v_historical_noop
 from reality_internal.governed_employee_shift_steps_v1 t
 where t.shift_id=s.shift_id and t.step_index in (6,7)
  and t.state='BLOCKED_PROVIDER' and
   t.source_status='VERIFIED_HISTORICAL_NOOP'
  and t.proof->>'kind'='EXISTING_HISTORICAL_UNIVERSE_SATISFIED_NO_REPLAY'
  and t.proof->>'original_job_execution_replayed'='false'
  and t.proof->>'current_original_job_completed'='false'
  and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(t.proof::text,'UTF8')),'hex');
 v_report:=jsonb_build_object(
   'status','EMPLOYEE_SHIFT_EVIDENCE_REPORT',
   'shift_id',s.shift_id,
   'scheduled_shift_hours',extract(epoch from
       (s.planned_end_at-s.planned_start_at))/3600,
   'source_checks_recorded',(select count(*) from
     reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.state='SOURCE_CHECKED'),
   'admitted_original_jobs',v_claims,
   'original_jobs_independently_settled_in_this_shift',v_verified,
   'exact_original_job_binding_verified',v_all_verified,
   'completion_reason',case when v_all_verified
    then 'ALL_ADMITTED_ORIGINAL_JOB_RECEIPTS_VERIFIED_AT_AUTHORITY_DEADLINE'
    else 'SHIFT_AUTHORIZATION_WINDOW_EXPIRED_WITH_UNFINISHED_OR_UNVERIFIED_WORK' end,
   'verified_historical_noop_without_new_execution',v_historical_noop,
   'new_original_job_completed_by_noop',false,
   'work_installation_authorized',false,
   'net_human_equivalent_hours_returned',null,
   'realized_cash_savings_usd',null,
   'ended_at',v_now,'production_changed',false,
   'blocked_work_included',exists(
     select 1 from reality_internal.governed_employee_shift_steps_v1 bx
     where bx.shift_id=s.shift_id and bx.state='BLOCKED_PROVIDER'
       and bx.source_status is distinct from 'VERIFIED_HISTORICAL_NOOP'));
 update reality_internal.governed_employee_shift_steps_v1
  set state='REPORTED',proof=v_report,
   proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_report::text,'UTF8')),'hex'),
   completed_at=v_now
  where shift_id=s.shift_id and step_index=8 and state='QUEUED';
 update reality_internal.governed_employee_shifts_v1
   set status=case when v_all_verified then 'ENDED_WITH_VERIFIED_JOB'
    when v_historical_noop and not exists(
       select 1 from reality_internal.governed_employee_shift_steps_v1 bx
       where bx.shift_id=s.shift_id and bx.state='BLOCKED_PROVIDER'
         and bx.source_status is distinct from 'VERIFIED_HISTORICAL_NOOP')
     then 'ENDED_READ_ONLY'
    else 'ENDED_WITH_BLOCKED_WORK' end,closed_at=v_now,
    close_report=v_report,last_progress_at=v_now where shift_id=s.shift_id;
 return v_report;
end $function$
