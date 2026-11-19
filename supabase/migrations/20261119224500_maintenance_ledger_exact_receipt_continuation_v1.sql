-- Exact same-shift maintenance continuation: never leave conditional
-- execution / verification windows unadvanced after independent receipt close.
-- Does not generate a repair, authorize installation or settle customer work.
alter table reality_internal.governed_employee_shift_steps_v1
 drop constraint governed_employee_shift_steps_v1_state_check;
alter table reality_internal.governed_employee_shift_steps_v1
 add constraint governed_employee_shift_steps_v1_state_check check (
 state=any(array['QUEUED','CLAIMED','SOURCE_CHECKED','AWAITING_EXACT_WORK',
 'ORIGINAL_JOB_RECEIPT_VERIFIED','INTERNAL_MAINTENANCE_RECEIPTS_VERIFIED',
 'BLOCKED_PROVIDER','REPORTED']));
create or replace function public.reality_close_employee_maintenance_continuation_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record;v_item jsonb;v_total int;v_verified int:=0;
 v_now timestamptz:=clock_timestamp();v_report jsonb;v_hash text;
 v_step_proof jsonb;v_step_hash text;v_verified_sources jsonb;
 v_step_index integer;v_updated integer;
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
 if not found then return jsonb_build_object(
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
 -- The two conditional windows belong to this same shift. They must
 -- advance only with the exact independently receipted maintenance set,
 -- never with a proposed fix, worker pulse or a customer-job claim.
 select coalesce(jsonb_agg(jsonb_build_object(
  'maintenance_id',m.incident_id,'origin_shift_id',m.origin_shift_id,
  'source_ref',m.source_ref,
  'independent_review_receipt_sha256',m.independent_review_receipt_sha256,
  'failure_baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256,
  'frozen_test_receipt_sha256',m.independent_frozen_test_receipt_sha256,
  'exact_install_approval_receipt_sha256',m.exact_install_approval_receipt_sha256,
  'repaired_capability_receipt_sha256',m.repaired_capability_receipt_sha256
 ) order by m.incident_id),'[]'::jsonb) into v_verified_sources
 from jsonb_array_elements(s.source_scope) entry(item)
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=(entry.item->>'maintenance_id')::uuid
  and m.owner_id=s.owner_id
  and m.origin_shift_id=(entry.item->>'origin_shift_id')::uuid
  and m.source_ref=entry.item->>'source_ref'
  and m.independent_review_receipt_sha256=
      entry.item->>'independent_review_receipt_sha256'
  and m.phase='INTERNAL_REPAIR_VERIFIED_CLOSED'
  and m.independent_failure_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and m.independent_frozen_test_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and m.exact_install_approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and m.repaired_capability_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and m.original_job_completed=false and m.production_changed=false;
 if jsonb_array_length(v_verified_sources)<>v_total
 then raise exception 'MAINTENANCE_CONTINUITY_RECEIPT_SCOPE_DRIFT';end if;
 for v_step_index in 6..7 loop
  v_step_proof:=jsonb_build_object(
   'kind',case when v_step_index=6 then
     'INTERNAL_MAINTENANCE_EXECUTION_VERIFIED' else
     'INDEPENDENT_INTERNAL_MAINTENANCE_VERIFICATION' end,
   'shift_id',s.shift_id,'maintenance_receipts',v_verified_sources,
   'maintenance_receipt_count',v_verified,'customer_originals_settled',0,
   'production_changed',false,'same_shift_continued',true);
  v_step_hash:='sha256:'||encode(sha256(
   convert_to(v_step_proof::text,'UTF8')),'hex');
  update reality_internal.governed_employee_shift_steps_v1
  set state='INTERNAL_MAINTENANCE_RECEIPTS_VERIFIED',
   proof=v_step_proof,proof_sha256=v_step_hash,completed_at=v_now
  where shift_id=s.shift_id and step_index=v_step_index
   and stage=case when v_step_index=6 then
    'CONDITIONAL_EXECUTION_WINDOW' else
    'CONDITIONAL_VERIFICATION_WINDOW' end
   and state='AWAITING_EXACT_WORK';
  get diagnostics v_updated=row_count;
  if v_updated<>1
  then raise exception 'MAINTENANCE_CONTINUITY_STAGE_DRIFT';end if;
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
