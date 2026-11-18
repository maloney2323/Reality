-- v19: An authenticated owner can continue *previously independently reviewed*
-- internal maintenance under a new exact signed execution epoch. The closed
-- parent shift and all customer original IDs remain immutable. Not a general
-- authorization for external writes or production installation.
alter table reality_internal.governed_employee_completion_warrants_v1
 drop constraint if exists governed_employee_completion_warrants_v1_mode_check;
alter table reality_internal.governed_employee_completion_warrants_v1
 add constraint governed_employee_completion_warrants_v1_mode_check check(
  mode in('UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS',
   'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'));

create or replace function public.reality_authorize_employee_maintenance_continuation_v1(
 p_owner_id uuid,p_fingerprint text,p_source_observed_at timestamptz,
 p_start_at timestamptz,p_steps jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_shift uuid;v_receipt jsonb;v_sources jsonb;v_scope jsonb;
 v_open int;v_selected int;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' or p_owner_id is null or
  p_fingerprint !~ '^sha256:[a-f0-9]{64}$' or
  p_source_observed_at< v_now-interval '30 minutes' or
  p_source_observed_at>v_now+interval '2 minutes' or
  p_start_at<v_now-interval '2 minutes' or
  p_start_at>v_now+interval '7 days' or
  jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)<>8
 then raise exception 'OWNER_MAINTENANCE_SIGNED_SCOPE_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner_id::text,7209));
 if exists(select 1 from reality_internal.governed_employee_shifts_v1 s
  where s.owner_id=p_owner_id and s.closed_at is null
   and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.planned_end_at>v_now)
 then raise exception 'OWNER_MAINTENANCE_ACTIVE_SHIFT_NO_DUPLICATE';end if;
 select count(*) into v_open
 from reality_internal.owner_internal_maintenance_jobs_v1 m
 join reality_internal.governed_employee_shifts_v1 original
  on original.shift_id=m.origin_shift_id and original.owner_id=m.owner_id
 where m.owner_id=p_owner_id and m.phase<>'INTERNAL_REPAIR_VERIFIED_CLOSED'
  and original.closed_at is not null
  and m.original_job_completed=false and m.production_changed=false
  and m.installation_authorized_by_discovery=false
  and m.external_action_authorized_by_discovery=false
  and m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$';
 if v_open<1 or v_open>4 then
  raise exception 'OWNER_MAINTENANCE_EXACT_1_TO_4_JOBS_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'step_index',(t.value->>'sequence')::int,
  'source_ref',t.value#>>'{candidate,source_url}',
  'maintenance_id',m.incident_id,
  'origin_shift_id',m.origin_shift_id,
  'independent_review_receipt_sha256',m.independent_review_receipt_sha256)
   order by (t.value->>'sequence')::int),'[]'::jsonb)
 into v_scope
 from jsonb_array_elements(p_steps) t
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.owner_id=p_owner_id
   and m.source_ref=t.value#>>'{candidate,source_url}'
   and m.phase<>'INTERNAL_REPAIR_VERIFIED_CLOSED'
 where (t.value->>'sequence')::int between 2 and 5
  and (t.value#>>'{candidate,finding_type}')='INTERNAL_MAINTENANCE'
  and m.original_job_completed=false and m.production_changed=false
  and m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$';
 v_selected:=jsonb_array_length(v_scope);
 if v_selected<>v_open or
  (select count(*) from jsonb_array_elements(p_steps) t
    where (t.value->>'sequence')::int between 2 and 5
     and nullif(t.value#>>'{candidate,source_url}','') is not null)<>v_open or
  (select count(distinct x->>'maintenance_id')
    from jsonb_array_elements(v_scope) x)<>v_open or
  (select count(distinct x->>'source_ref')
    from jsonb_array_elements(v_scope) x)<>v_open or
  exists(select 1 from jsonb_array_elements(v_scope) x where
    x->>'source_ref' !~
     '^https://github[.]com/maloney2323/Reality/(issues|pull)/[1-9][0-9]*$')
 then raise exception 'OWNER_MAINTENANCE_FROZEN_SOURCE_SCOPE_INVALID';end if;
 -- Reuse the canonical eight-stage, source-fingerprinted shift authorizer.
 v_receipt:=public.reality_authorize_employee_shift_v1(
  p_owner_id,p_fingerprint,p_source_observed_at,p_start_at,p_steps);
 if v_receipt->>'status'<>'SHIFT_DURABLY_AUTHORIZED' then
  raise exception 'OWNER_MAINTENANCE_NEW_SIGNED_EPOCH_REQUIRED';end if;
 v_shift:=(v_receipt->>'shift_id')::uuid;
 update reality_internal.governed_employee_shifts_v1
 set planned_end_at='infinity'::timestamptz
 where shift_id=v_shift and owner_id=p_owner_id
  and plan_fingerprint=p_fingerprint and status='QUEUED'
  and planned_end_at=p_start_at+interval '8 hours'
  and closed_at is null;
 if not found then raise exception 'OWNER_MAINTENANCE_COMPLETION_BOUND_SHIFT_INVALID';end if;
 insert into reality_internal.governed_employee_completion_warrants_v1(
  shift_id,owner_id,plan_fingerprint,source_scope,mode)
 values(v_shift,p_owner_id,p_fingerprint,v_scope,
  'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS');
 return jsonb_build_object(
  'status','SHIFT_DURABLY_AUTHORIZED',
  'shift_id',v_shift,'owner_scope_verified',true,'completion_bound',true,
  'completion_condition','ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED',
  'carried_internal_maintenance_count',v_open,
  'origin_shift_ids',(select jsonb_agg(distinct x->>'origin_shift_id')
    from jsonb_array_elements(v_scope) x),
  'owner_expressed_exact_shift_authority',true,
  'original_customer_jobs_created',0,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_close_employee_maintenance_continuation_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record;v_item jsonb;v_total int;v_verified int:=0;
 v_now timestamptz:=clock_timestamp();v_report jsonb;v_hash text;
begin
 if current_user<>'service_role' then
  raise exception 'OWNER_MAINTENANCE_CLOSE_SERVICE_REQUIRED';end if;
 select sh.shift_id,sh.owner_id,sh.plan_fingerprint,w.source_scope
 into s from reality_internal.governed_employee_shifts_v1 sh
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
  and w.plan_fingerprint=sh.plan_fingerprint
 where w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and w.state='ACTIVE' and sh.closed_at is null
  and sh.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and sh.planned_end_at='infinity'::timestamptz
  and sh.planned_start_at<=v_now
 order by sh.planned_start_at,sh.created_at
 limit 1 for update of sh skip locked;
 if not found return jsonb_build_object(
   'status','NO_ACTIVE_OWNER_MAINTENANCE_COMPLETION_SCOPE');end if;
 v_total:=jsonb_array_length(s.source_scope);
 if v_total<1 or v_total>4 then
  raise exception 'OWNER_MAINTENANCE_COMPLETION_WARRANT_DRIFT';end if;
 for v_item in select value from jsonb_array_elements(s.source_scope) loop
  if not exists(select 1
   from reality_internal.owner_internal_maintenance_jobs_v1 m
   join reality_internal.governed_employee_shifts_v1 origin
    on origin.shift_id=m.origin_shift_id and origin.owner_id=m.owner_id
   where m.owner_id=s.owner_id
    and m.incident_id=(v_item->>'maintenance_id')::uuid
    and m.origin_shift_id=(v_item->>'origin_shift_id')::uuid
    and m.source_ref=v_item->>'source_ref'
    and m.independent_review_receipt_sha256=
     v_item->>'independent_review_receipt_sha256'
    and origin.closed_at is not null
    and m.phase='INTERNAL_REPAIR_VERIFIED_CLOSED'
    and m.independent_failure_baseline_receipt_sha256~
       '^sha256:[a-f0-9]{64}$'
    and m.independent_frozen_test_receipt_sha256~
       '^sha256:[a-f0-9]{64}$'
    and m.exact_install_approval_receipt_sha256~
       '^sha256:[a-f0-9]{64}$'
    and m.repaired_capability_receipt_sha256~
       '^sha256:[a-f0-9]{64}$'
    and m.original_job_completed=false and m.production_changed=false
   ) then
   return jsonb_build_object(
    'status','OWNER_MAINTENANCE_WAITING_FOR_INDEPENDENT_REPAIR_RECEIPTS',
    'shift_id',s.shift_id,'selected_maintenance_count',v_total,
    'independently_verified_so_far',v_verified,
    'customer_originals_settled',0,
    'installation_authorized_by_close',false,'production_changed',false);
  end if;
  v_verified:=v_verified+1;
 end loop;
 v_report:=jsonb_build_object(
  'status','EMPLOYEE_SHIFT_EVIDENCE_REPORT',
  'shift_id',s.shift_id,'completion_bound',true,
  'completion_condition','ALL_EXACT_INTERNAL_MAINTENANCE_REPAIR_RECEIPTS_VERIFIED',
  'completion_reason','ALL_SELECTED_INTERNAL_MAINTENANCE_REPAIRS_INDEPENDENTLY_RECEIPTED',
  'independently_verified_internal_maintenance_jobs',v_verified,
  'original_jobs_independently_settled_in_this_shift',0,
  'fully_unattended_shift_verified',false,
  'human_hours_saved',null,'realized_cash_savings_usd',null,
  'production_changed',false,'ended_at',v_now);
 v_hash:='sha256:'||encode(sha256(convert_to(v_report::text,'UTF8')),'hex');
 update reality_internal.governed_employee_shift_steps_v1
 set state='REPORTED',proof=v_report,proof_sha256=v_hash,completed_at=v_now
 where shift_id=s.shift_id and step_index=8 and state='QUEUED';
 update reality_internal.governed_employee_shifts_v1
 set status='ENDED_WITH_VERIFIED_JOB',closed_at=v_now,
  close_report=v_report,last_progress_at=v_now
 where shift_id=s.shift_id and owner_id=s.owner_id and closed_at is null;
 update reality_internal.governed_employee_completion_warrants_v1
 set state='SETTLED',settled_at=v_now,completion_receipt=v_report
 where shift_id=s.shift_id and owner_id=s.owner_id and state='ACTIVE';
 return v_report;
end $fn$;
revoke execute on function public.reality_authorize_employee_maintenance_continuation_v1(uuid,text,timestamptz,timestamptz,jsonb)
 from public,anon,authenticated;
revoke execute on function public.reality_close_employee_maintenance_continuation_v1()
 from public,anon,authenticated;
grant execute on function public.reality_authorize_employee_maintenance_continuation_v1(uuid,text,timestamptz,timestamptz,jsonb)
 to service_role;
grant execute on function public.reality_close_employee_maintenance_continuation_v1()
 to service_role;
