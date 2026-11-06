-- Expand the SAME governed owner-approved employee shift to 1–12 hours.
-- Prior 8/10/12 receipts and exact fingerprints remain unchanged.
-- No new permission: only service_role can create a shift using the same
-- signed-in owner fingerprint and 8-step continuity/installation gates.
alter table reality_internal.governed_employee_shifts_v1
 drop constraint if exists governed_employee_shifts_v1_allowed_hours_v2,
 add constraint governed_employee_shifts_v1_allowed_hours_v3
 check (planned_end_at-planned_start_at>=interval '1 hour'
   and planned_end_at-planned_start_at<=interval '12 hours'
   and mod(extract(epoch from (planned_end_at-planned_start_at))::numeric,3600)=0);

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
 if v_end<60 or v_end>720 or mod(v_end,60)<>0 then
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


