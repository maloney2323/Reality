-- Preview-only enhancement to the existing governed employee shift controller.
-- Supports 8-, 10- or 12-hour owner-authorized timeboxes without granting
-- installation, production changes, arbitrary new jobs, or measured ROI.
-- Existing shift rows and receipts remain unchanged.
ALTER TABLE reality_internal.governed_employee_shifts_v1
 DROP CONSTRAINT governed_employee_shifts_v1_check,
 ADD CONSTRAINT governed_employee_shifts_v1_allowed_hours_v2
 CHECK (planned_end_at-planned_start_at IN (
  interval '8 hours',interval '10 hours',interval '12 hours'));

ALTER TABLE reality_internal.governed_employee_shift_steps_v1
 DROP CONSTRAINT governed_employee_shift_steps_v1_offset_start_minutes_check,
 DROP CONSTRAINT governed_employee_shift_steps_v1_offset_end_minutes_check,
 ADD CONSTRAINT governed_employee_shift_steps_v1_offset_start_v2
  CHECK (offset_start_minutes >= 0 AND offset_start_minutes <= 719),
 ADD CONSTRAINT governed_employee_shift_steps_v1_offset_end_v2
  CHECK (offset_end_minutes >= 1 AND offset_end_minutes <= 720);

CREATE OR REPLACE FUNCTION public.reality_authorize_employee_shift_v1(
 p_owner_id uuid,p_fingerprint text,p_source_observed_at timestamptz,
 p_start_at timestamptz,p_steps jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
declare
 v_shift uuid; v_now timestamptz:=clock_timestamp(); v_item jsonb;
 v_i integer:=0; v_end integer:=0; v_duration integer; v_start integer;
 v_expected_ids text[]:=array['preflight','issue_validation','failure_reproduction',
  'change_review','additional_triage','governed_execution','independent_acceptance','shift_close'];
 v_expected_stages text[]:=array['SOURCE_RECONCILIATION','VERIFY_OPEN_ISSUE',
  'VERIFY_PROVIDER_EVIDENCE','REVIEW_INDEPENDENT_EVIDENCE',
  'QUALIFY_NEXT_WORK','CONDITIONAL_EXECUTION_WINDOW',
  'CONDITIONAL_VERIFICATION_WINDOW','EVIDENCE_AND_VALUE_REPORT'];
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 if p_owner_id is null or p_fingerprint !~ '^sha256:[a-f0-9]{64}$'
  or p_start_at < v_now-interval '2 minutes'
  or p_start_at > v_now+interval '7 days'
  or p_source_observed_at is null
  or p_source_observed_at < v_now-interval '30 minutes'
  or p_source_observed_at > v_now+interval '2 minutes'
  or jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)<>8
 then raise exception 'SHIFT_EXACT_APPROVAL_SCOPE_INVALID';end if;
 for v_item in select value from jsonb_array_elements(p_steps) loop
  v_i:=v_i+1;
  if (v_item->>'id') is distinct from v_expected_ids[v_i]
   or (v_item->>'stage') is distinct from v_expected_stages[v_i]
   or (v_item->>'sequence')::integer is distinct from v_i
   or (v_item->>'offset_start_minutes')::integer is distinct from v_end
   or (v_item->>'elapsed_minutes_not_human_labor')::boolean is distinct from true
  then raise exception 'SHIFT_STEP_ORDER_INVALID';end if;
  v_start:=(v_item->>'offset_start_minutes')::integer;
  v_duration:=(v_item->>'planning_minutes')::integer;
  if v_duration is null or v_duration<1 or v_duration>120 or
   (v_item->>'offset_end_minutes')::integer<>v_start+v_duration or
   (v_i in (6,7) and v_item->>'required_gate' is null) or
   (v_i not in (6,7) and v_item->>'required_gate' is not null)
  then raise exception 'SHIFT_BOUNDARIES_INVALID';end if;
  v_end:=v_start+v_duration;
 end loop;
 if v_end not in (480,600,720) then
  raise exception 'SHIFT_DURATION_NOT_AUTHORIZED';
 end if;
 insert into reality_internal.governed_employee_shifts_v1(
  owner_id,plan_fingerprint,source_observed_at,planned_start_at,planned_end_at)
 values(p_owner_id,p_fingerprint,p_source_observed_at,p_start_at,
  p_start_at+pg_catalog.make_interval(mins => v_end))
 on conflict(owner_id,plan_fingerprint,planned_start_at) do nothing
 returning shift_id into v_shift;
 if v_shift is null then
  select shift_id into v_shift from reality_internal.governed_employee_shifts_v1
   where owner_id=p_owner_id and plan_fingerprint=p_fingerprint
     and planned_start_at=p_start_at;
  if v_shift is null then raise exception 'SHIFT_DUPLICATE_READBACK_FAILED';end if;
  return jsonb_build_object('status','SHIFT_ALREADY_AUTHORIZED',
   'shift_id',v_shift,'owner_scope_verified',true,
   'installation_authorized',false,'production_changed',false);
 end if;
 for v_item in select value from jsonb_array_elements(p_steps) loop
  insert into reality_internal.governed_employee_shift_steps_v1(
   shift_id,step_index,stage,source_ref,source_title,duration_minutes,
   offset_start_minutes,offset_end_minutes)
  values(v_shift,(v_item->>'sequence')::integer,v_item->>'stage',
   nullif(v_item#>>'{candidate,source_url}',''),
   nullif(v_item#>>'{candidate,title}',''),
   (v_item->>'planning_minutes')::integer,
   (v_item->>'offset_start_minutes')::integer,
   (v_item->>'offset_end_minutes')::integer);
 end loop;
 return jsonb_build_object('status','SHIFT_DURABLY_AUTHORIZED',
  'shift_id',v_shift,'owner_scope_verified',true,
  'installation_authorized',false,'production_changed',false);
end $function$;

-- Keep previously recorded EIGHT_HOUR_SHIFT_EVIDENCE_REPORT receipts as-is.
-- New close receipts carry duration-neutral labels; neither claims net savings.
CREATE OR REPLACE FUNCTION public.reality_close_employee_shift_v1()
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $function$
declare s record;v_now timestamptz:=clock_timestamp();v_report jsonb;
 v_historical_noop boolean;
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into s from reality_internal.governed_employee_shifts_v1
 where status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ESCALATED')
  and planned_end_at<=v_now
 order by planned_end_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_SHIFT_DUE_FOR_CLOSE');end if;
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
   'original_jobs_independently_settled_in_this_shift',(select count(*) from
     reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.step_index=6
      and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED'),
   'exact_original_job_binding_verified',(select count(*)=1 from
     reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.step_index=6
      and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED'),
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
   set status=case when exists(select 1 from reality_internal.governed_employee_shift_steps_v1 t
      where t.shift_id=s.shift_id and t.step_index=6
        and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED') then 'ENDED_WITH_VERIFIED_JOB'
    when v_historical_noop and not exists(
       select 1 from reality_internal.governed_employee_shift_steps_v1 bx
       where bx.shift_id=s.shift_id and bx.state='BLOCKED_PROVIDER'
         and bx.source_status is distinct from 'VERIFIED_HISTORICAL_NOOP')
     then 'ENDED_READ_ONLY'
    else 'ENDED_WITH_BLOCKED_WORK' end,closed_at=v_now,
    close_report=v_report,last_progress_at=v_now where shift_id=s.shift_id;
 return v_report;
end $function$;
