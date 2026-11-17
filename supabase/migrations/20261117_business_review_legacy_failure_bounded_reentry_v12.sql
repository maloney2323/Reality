-- A previously fenced reviewer claim from the prior release is eligible
-- for exactly ONE more independent source reobservation after verified repair.
-- Do not reset the failed claim, original work, owner approval or model history.
CREATE OR REPLACE FUNCTION public.reality_claim_shift_business_qualification_review_v1(p_shift_id uuid, p_worker_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare i record; claim uuid; affected integer;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'QUALIFICATION_SIGNED_REVIEW_SERVICE_REQUIRED';end if;
 select inc.*,t.source_ref,t.provider_proof_sha256 into i
 from reality_internal.owner_shift_continuity_incidents_v1 inc
 join reality_internal.employee_temporal_inquiries_v1 t
  on t.claim_id=inc.source_claim_id and t.owner_id=inc.owner_id
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=inc.shift_id and s.owner_id=inc.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where inc.shift_id=p_shift_id
  and inc.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
  and inc.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
  and inc.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and inc.independent_reviewer is not null and inc.reviewer_function_id is not null
  and inc.reviewer_function_id<>inc.assigned_function_id
  and inc.investigated_at is not null and run.started_at>inc.investigated_at
  and t.phase='RECORDED' and t.finished_at>=s.authorized_at
  and t.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
  and t.source_ref~'^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(issues|pull)/[1-9][0-9]*$'
  and s.authorized_at is not null and s.closed_at is null
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
  and w.last_worker_status='WAKE_RECEIVED'
  and w.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and (not exists(select 1 from reality_internal.shift_business_qualification_reviews_v1 r
   where r.incident_id=inc.incident_id)
   or exists(select 1 from reality_internal.shift_business_qualification_reviews_v1 r
    where r.incident_id=inc.incident_id
     and r.status='PROVIDER_PROOF_UNAVAILABLE'
     and r.review_attempts=1
     and r.completed_at is not null and r.receipt_sha256 is null
     and r.claimed_at<clock_timestamp()-interval '5 minutes'
     and (r.retry_after is null or r.retry_after<=clock_timestamp())))
 order by inc.first_detected_at limit 1 for update of inc skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_BUSINESS_QUALIFICATION_REVIEW_READY',
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);end if;
 claim:=gen_random_uuid();
 insert into reality_internal.shift_business_qualification_reviews_v1 as current_review(
  incident_id,owner_id,shift_id,source_claim_id,claim_id,worker_run_id,
  reviewer,reviewer_function_id,source_ref,prior_source_sha256,
  investigation_receipt_sha256)
 values(i.incident_id,i.owner_id,i.shift_id,i.source_claim_id,
  claim,p_worker_run_id,i.independent_reviewer,i.reviewer_function_id,
  i.source_ref,i.provider_proof_sha256,i.investigation_receipt_sha256)
 on conflict(incident_id) do update
 set claim_id=excluded.claim_id,
  worker_run_id=excluded.worker_run_id,
  reviewer=excluded.reviewer,
  reviewer_function_id=excluded.reviewer_function_id,
  claimed_at=clock_timestamp(),completed_at=null,
  status='REVIEW_CLAIMED',review_attempts=2,retry_after=null,
  review_failure_history=case
   when pg_catalog.jsonb_array_length(current_review.review_failure_history)=0
   then current_review.review_failure_history||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('claim_id',current_review.claim_id,
     'worker_run_id',current_review.worker_run_id,
     'claimed_at',current_review.claimed_at,
     'failure_reason','PRIOR_SIGNED_REVIEW_RECEIPT_MISSING_BEFORE_REMEDIATION'))
   else current_review.review_failure_history end
 where current_review.status='PROVIDER_PROOF_UNAVAILABLE'
  and current_review.review_attempts=1
  and current_review.completed_at is not null
  and current_review.receipt_sha256 is null
  and current_review.claimed_at<clock_timestamp()-interval '5 minutes'
  and (current_review.retry_after is null
   or current_review.retry_after<=clock_timestamp());
 get diagnostics affected=row_count;
 if affected<>1 then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_BUSINESS_QUALIFICATION_REVIEW_READY',
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_BUSINESS_QUALIFICATION_REVIEW_CLAIMED',
  'incident_id',i.incident_id,'shift_id',i.shift_id,'owner_id',i.owner_id,
  'source_claim_id',i.source_claim_id,'claim_id',claim,
  'review_attempt',(select r.review_attempts
   from reality_internal.shift_business_qualification_reviews_v1 r
   where r.incident_id=i.incident_id),
  'worker_run_id',p_worker_run_id,'reviewer',i.independent_reviewer,
  'reviewer_function_id',i.reviewer_function_id,
  'source_ref',i.source_ref,'prior_source_sha256',i.provider_proof_sha256,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $function$
;
revoke execute on function public.reality_claim_shift_business_qualification_review_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_shift_business_qualification_review_v1(uuid,uuid)
 to service_role;
