-- Show independently completed evidence reports and blockers before queued work.
create or replace function public.reality_read_owner_qualified_employee_evidence_jobs_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare counts jsonb; items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'QUALIFIED_EVIDENCE_WORK_OWNER_SERVICE_REQUIRED';end if;
 select pg_catalog.jsonb_build_object(
  'qualified_executable',count(*) filter(where phase='QUALIFIED_EXECUTABLE'),
  'executing',count(*) filter(where phase in ('EXECUTION_CLAIMED','REVIEW_CLAIMED')),
  'pending_independent_verification',count(*) filter(where phase='SUBMITTED_AWAITING_INDEPENDENT_RECHECK'),
  'independently_completed',count(*) filter(where phase='COMPLETED_INDEPENDENTLY_VERIFIED'),
  'blocked',count(*) filter(where phase like 'BLOCKED_%'),
  'total',count(*)
 ) into counts
 from reality_internal.owner_qualified_employee_evidence_jobs_v1
 where owner_id=p_owner_id;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'job_id',j.job_id,'shift_id',j.shift_id,'employee',j.employee,
  'job_type',j.job_type,'source_ref',j.source_ref,
  'objective',j.objective,'phase',j.phase,
  'qualification_receipt_sha256',j.qualification_receipt_sha256,
  'deliverable_receipt_sha256',j.deliverable_receipt_sha256,
  'independent_receipt_sha256',j.independent_receipt_sha256,
  'deliverable',j.deliverable,'blocker',j.blocker,
  'execution_worker_run_id',j.execution_worker_run_id,
  'review_worker_run_id',j.review_worker_run_id,
  'qualified_at',j.qualified_at,'verified_at',j.verified_at,
  'evidence_job_completed',j.phase='COMPLETED_INDEPENDENTLY_VERIFIED',
  'original_customer_job_completed',false,
  'code_repair_installed',false,'production_changed',false
 ) order by j.qualified_at desc),'[]'::jsonb) into items from(
  select * from reality_internal.owner_qualified_employee_evidence_jobs_v1
  where owner_id=p_owner_id
  order by case phase
   when 'COMPLETED_INDEPENDENTLY_VERIFIED' then 0
   when 'SUBMITTED_AWAITING_INDEPENDENT_RECHECK' then 1
   when 'BLOCKED_SOURCE_CHANGED' then 2
   when 'BLOCKED_PROVIDER_OR_WORKER_EVIDENCE' then 2
   else 3 end,
   verified_at desc nulls last,qualified_at desc limit 12
 ) j;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SOURCE_QUALIFIED_EMPLOYEE_WORK_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'counts',counts,'items',items,'installation_authorized_by_read',false,
  'original_customer_job_completed_by_read',false,'production_changed',false);
end $fn$;
