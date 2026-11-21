-- v21: Signed worker promotes independently rechecked EXISTING employee
-- investigations into the pre-existing governed evidence-pack job executor.
-- No new employee model, owner shift, customer original, or installation.
-- Source qualification is a read-only evidence task, not code-repair authority.
create or replace function public.reality_read_next_signed_scheduled_evidence_admission_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'SIGNED_SCHEDULE_ADMISSION_WORKER_REQUIRED';end if;
 select s.owner_id,s.shift_id,sch.work_key,sch.employee,sch.source_ref,
  sch.work_state,sch.source_evidence_sha256,sch.planned_business_date,
  t.claim_id,t.evidence_sha256,t.provider_proof_sha256,
  t.model_response_id,t.recommendation,t.finished_at
 into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 join reality_internal.owner_employee_operating_schedule_v1 sch
  on sch.owner_id=s.owner_id and sch.work_kind='SOURCE_INVESTIGATION'
 join reality_internal.employee_discovery_observations_v1 o
  on o.owner_id=sch.owner_id and o.employee=sch.employee
   and o.source_ref=sch.source_ref
 join reality_internal.employee_temporal_inquiries_v1 t
  on t.owner_id=o.owner_id and t.employee=o.employee
   and t.source_ref=o.source_ref
 where s.shift_id=p_shift_id and s.closed_at is null
  and s.authorized_at is not null
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and t.finished_at<run.started_at and t.phase='RECORDED'
  and t.recommendation='INVESTIGATE_MORE'
  and t.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
  and t.evidence_sha256~'^sha256:[a-f0-9]{64}$'
  and t.model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'
  and length(t.question) between 15 and 900
  and length(t.investigation) between 20 and 2500
  and length(t.next_proof) between 15 and 1500
  and sch.work_state in('CURRENT_SOURCE_REVIEW_REQUIRED',
   'SOURCE_EPOCH_REVIEW_REQUIRED','HISTORICAL_REVALIDATION_REQUIRED')
  and sch.planned_business_date<=
      (clock_timestamp() at time zone 'America/New_York')::date
  and sch.source_ref~
    '^https://github[.]com/maloney2323/Reality/(issues|pull)/[1-9][0-9]*$'
  and sch.source_evidence_sha256=o.evidence_sha256
  and sch.source_family=o.source_family
  and o.source_family in('GITHUB_ISSUE','GITHUB_PULL_REQUEST')
  -- Qualify only sources the owner specifically put into THIS signed
  -- work warrant. A general standing discovery grant cannot add originals.
  and exists(select 1 from reality_internal.governed_employee_shift_steps_v1 selected
   where selected.shift_id=s.shift_id and selected.step_index between 2 and 5
    and selected.source_ref=sch.source_ref)
  and sch.last_reconciled_at>clock_timestamp()-interval '24 hours'
  and o.last_reconciled_at>clock_timestamp()-interval '24 hours'
  and o.installation_authorized=false and o.shift_authorized=false
  and o.qualified_job_created=false and o.production_changed=false
  and not exists(
    select 1 from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
    where j.owner_id=t.owner_id and j.shift_id=s.shift_id
     and (j.inquiry_claim_id=t.claim_id
      or (j.employee=t.employee and j.source_ref=t.source_ref)))
  and not exists(
    select 1 from reality_internal.owner_qualified_employee_evidence_jobs_v1 prior
    where prior.owner_id=t.owner_id
     and prior.employee=t.employee and prior.source_ref=t.source_ref
     and prior.phase='COMPLETED_INDEPENDENTLY_VERIFIED'
     and prior.reviewed_source_sha256=t.provider_proof_sha256
     and prior.independent_receipt_sha256~'^sha256:[a-f0-9]{64}$')
 order by sch.priority,sch.planned_business_date,sch.daily_order,
  t.finished_at desc,sch.employee,sch.work_key
 limit 1;
 if not found then return jsonb_build_object(
  'status','NO_ELIGIBLE_SIGNED_SCHEDULED_INQUIRY_FOR_QUALIFICATION',
  'evidence_job_created',false,'customer_original_job_created',false,
  'installation_authorized',false,'production_changed',false);end if;
 return jsonb_build_object(
  'status','SIGNED_SCHEDULED_EVIDENCE_INQUIRY_READY_FOR_INDEPENDENT_SOURCE_RECHECK',
  'owner_id',v.owner_id,'shift_id',v.shift_id,
  'work_key',v.work_key,'employee',v.employee,
  'source_ref',v.source_ref,'work_state',v.work_state,
  'source_evidence_sha256',v.source_evidence_sha256,
  'inquiry_claim_id',v.claim_id,
  'inquiry_provider_sha256',v.provider_proof_sha256,
  'model_response_id',v.model_response_id,
  'prior_model_recommendation',v.recommendation,
  'inquiry_finished_at',v.finished_at,
  'worker_run_id',p_worker_run_id,
  'evidence_job_created',false,'customer_original_job_created',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_admit_signed_scheduled_evidence_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_work_key text,p_inquiry_claim_id uuid,
 p_source_ref text,p_current_provider_sha256 text,p_checked_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record;t reality_internal.employee_temporal_inquiries_v1%rowtype;
 sch reality_internal.owner_employee_operating_schedule_v1%rowtype;
 j reality_internal.owner_qualified_employee_evidence_jobs_v1%rowtype;
 v_hash text;
begin
 if current_user<>'service_role' or p_shift_id is null
  or p_worker_run_id is null or p_inquiry_claim_id is null
  or p_work_key !~ '^schedule:[a-f0-9]{64}$'
  or p_current_provider_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_checked_at is null
  or p_checked_at<clock_timestamp()-interval '3 minutes'
  or p_checked_at>clock_timestamp()+interval '1 minute'
 then raise exception 'SIGNED_SCHEDULE_FROZEN_PROVIDER_ADMISSION_REQUIRED';end if;
 select sh.shift_id,sh.owner_id,run.started_at into s
 from reality_internal.governed_employee_shifts_v1 sh
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=sh.shift_id and pulse.owner_id=sh.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where sh.shift_id=p_shift_id and sh.closed_at is null
  and sh.authorized_at is not null and sh.planned_start_at<=clock_timestamp()
  and sh.planned_end_at>clock_timestamp()
  and sh.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes';
 if not found then
  raise exception 'SIGNED_SCHEDULE_OWNER_SHIFT_EPOCH_UNVERIFIED';end if;
 select * into sch from reality_internal.owner_employee_operating_schedule_v1
 where owner_id=s.owner_id and work_key=p_work_key
  and source_ref=p_source_ref and work_kind='SOURCE_INVESTIGATION'
  and work_state in('CURRENT_SOURCE_REVIEW_REQUIRED',
    'SOURCE_EPOCH_REVIEW_REQUIRED','HISTORICAL_REVALIDATION_REQUIRED')
  and planned_business_date<=(clock_timestamp() at time zone 'America/New_York')::date
  and last_reconciled_at>clock_timestamp()-interval '24 hours'
  and exists(select 1 from reality_internal.governed_employee_shift_steps_v1 selected
   where selected.shift_id=s.shift_id and selected.step_index between 2 and 5
    and selected.source_ref=p_source_ref)
  and source_ref~
    '^https://github[.]com/maloney2323/Reality/(issues|pull)/[1-9][0-9]*$'
 for update;
 if not found then raise exception 'SIGNED_SCHEDULE_FRESH_WORK_SCOPE_UNVERIFIED';end if;
 select * into t from reality_internal.employee_temporal_inquiries_v1
 where owner_id=s.owner_id and claim_id=p_inquiry_claim_id
  and employee=sch.employee and source_ref=sch.source_ref
  and phase='RECORDED' and recommendation='INVESTIGATE_MORE'
  and provider_proof_sha256=p_current_provider_sha256
  and evidence_sha256~'^sha256:[a-f0-9]{64}$'
  and model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'
  and finished_at<s.started_at
  and length(question) between 15 and 900
  and length(investigation) between 20 and 2500
  and length(next_proof) between 15 and 1500;
 if not found then raise exception 'SIGNED_SCHEDULE_PRIOR_MODEL_AND_PROVIDER_PROOF_MISMATCH';end if;
 if not exists(
   select 1 from reality_internal.employee_discovery_observations_v1 o
   where o.owner_id=sch.owner_id and o.employee=sch.employee
    and o.source_ref=sch.source_ref
    and o.evidence_sha256=sch.source_evidence_sha256
    and o.source_family=sch.source_family
    and o.source_family in('GITHUB_ISSUE','GITHUB_PULL_REQUEST')
    and o.last_reconciled_at>clock_timestamp()-interval '24 hours'
    and o.shift_authorized=false and o.production_changed=false)
 then raise exception 'SIGNED_SCHEDULE_DISCOVERY_EPOCH_UNVERIFIED';end if;
 if exists(
   select 1 from reality_internal.owner_qualified_employee_evidence_jobs_v1 prior
   where prior.owner_id=s.owner_id and prior.employee=sch.employee
    and prior.source_ref=sch.source_ref
    and prior.phase='COMPLETED_INDEPENDENTLY_VERIFIED'
    and prior.reviewed_source_sha256=p_current_provider_sha256
    and prior.independent_receipt_sha256~'^sha256:[a-f0-9]{64}$')
 then return jsonb_build_object(
  'status','SIGNED_SCHEDULE_SOURCE_ALREADY_INDEPENDENTLY_VERIFIED_NO_REPLAY',
  'owner_id',s.owner_id,'shift_id',s.shift_id,'source_ref',p_source_ref,
  'evidence_job_created',false,'customer_original_job_created',false,
  'installation_authorized',false,'production_changed',false);end if;
 v_hash:='sha256:'||encode(sha256(convert_to(
   s.owner_id::text||'|'||s.shift_id::text||'|'||sch.work_key||'|'||
   t.claim_id::text||'|'||t.evidence_sha256||'|'||
   p_current_provider_sha256||'|'||p_worker_run_id::text||'|'||
   t.model_response_id||'|'||t.finished_at::text,'UTF8')),'hex');
 insert into reality_internal.owner_qualified_employee_evidence_jobs_v1(
  owner_id,shift_id,inquiry_claim_id,employee,source_ref,
  discovery_evidence_sha256,inquiry_provider_sha256,
  objective,initial_investigation,qualification_receipt_sha256)
 values(s.owner_id,s.shift_id,t.claim_id,t.employee,t.source_ref,
  t.evidence_sha256,t.provider_proof_sha256,
  t.question,t.investigation,v_hash)
 on conflict do nothing returning * into j;
 if not found then return jsonb_build_object(
  'status','SIGNED_SCHEDULE_EXISTING_EVIDENCE_JOB_NO_DUPLICATE',
  'owner_id',s.owner_id,'shift_id',s.shift_id,
  'evidence_job_created',false,'customer_original_job_created',false,
  'installation_authorized',false,'production_changed',false);end if;
 return jsonb_build_object(
  'status','SIGNED_SCHEDULE_EVIDENCE_JOB_QUALIFIED_EXECUTABLE',
  'owner_id',s.owner_id,'shift_id',s.shift_id,'job_id',j.job_id,
  'employee',j.employee,'source_ref',j.source_ref,
  'work_key',sch.work_key,'qualification_receipt_sha256',
    j.qualification_receipt_sha256,
  'job_type','CURRENT_SOURCE_EVIDENCE_PACK',
  'next_worker_action','EXISTING_SIGNED_QUALIFIED_EVIDENCE_EXECUTOR',
  'independent_final_review_required',true,
  'evidence_job_created',true,'customer_original_job_created',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke execute on function public.reality_read_next_signed_scheduled_evidence_admission_v1(uuid,uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_admit_signed_scheduled_evidence_v1(uuid,uuid,text,uuid,text,text,timestamptz)
 from public,anon,authenticated;
grant execute on function public.reality_read_next_signed_scheduled_evidence_admission_v1(uuid,uuid)
 to service_role;
grant execute on function public.reality_admit_signed_scheduled_evidence_v1(uuid,uuid,text,uuid,text,text,timestamptz)
 to service_role;
