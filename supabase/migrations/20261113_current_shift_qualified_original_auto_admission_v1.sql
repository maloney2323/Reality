-- Preserve original #263 and its exact authorization path. Admit OTHER
-- current repair originals only after the same signed owner shift, independent
-- source-investigation receipt, and separate frozen current CI RED evidence.
-- No model input, owner session cookie, installation grant or production effect.
alter table reality_internal.riley_unattended_repair_originals_v1
 add column if not exists qualification_run_id bigint,
 add column if not exists qualification_failed_commit_sha text,
 add column if not exists qualification_frozen_test_path text,
 add column if not exists qualification_frozen_test_sha256 text,
 add column if not exists qualification_investigation_receipt_ref text;
alter table reality_internal.riley_unattended_repair_originals_v1
 drop constraint if exists riley_repair_source_valid;
alter table reality_internal.riley_unattended_repair_originals_v1
 add constraint riley_repair_source_valid check (
 original_work_id~'^work:[a-f0-9]{32}$'
 and shift_source_proof_sha256~'^sha256:[a-f0-9]{64}$'
 and issue_url='https://github.com/maloney2323/Reality/issues/'||issue_number::text
 and (
  (issue_number=263 and qualification_run_id is null
   and qualification_investigation_receipt_ref is null)
  or
  (issue_number<>263 and issue_number>0 and qualification_run_id>0
   and qualification_failed_commit_sha~'^[a-f0-9]{40}$'
   and qualification_frozen_test_path~
    '^test/reality-frozen-regressions/[a-z0-9._-]+[.]test[.]js$'
   and qualification_frozen_test_sha256~'^[a-f0-9]{64}$'
   and qualification_investigation_receipt_ref~
    '^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$')
 )
);
create or replace function public.reality_admit_current_shift_verified_repair_v1(
 p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text,
 p_source_ref text,p_source_proof_sha256 text,
 p_evidence_receipt_ref text,p_provider_evidence_sha256 text,
 p_frozen_failure_run_id bigint,p_failure_source_sha text,
 p_frozen_test_path text,p_frozen_test_sha256 text,
 p_failure_signature text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record;q record;rec record;v_count int;v_issue integer;v_work text;
 v_existing reality_internal.riley_unattended_repair_originals_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'SHIFT_VERIFIED_REPAIR_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_shift_id is null or
  p_plan_fingerprint !~ '^sha256:[a-f0-9]{64}$' or
  p_source_ref !~ '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
  or p_source_proof_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_evidence_receipt_ref !~
   '^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$'
  or p_provider_evidence_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_frozen_failure_run_id<1 or p_frozen_failure_run_id is null
  or p_failure_source_sha !~ '^[a-f0-9]{40}$'
  or p_frozen_test_path !~
   '^test/reality-frozen-regressions/[a-z0-9._-]+[.]test[.]js$'
  or p_frozen_test_sha256 !~ '^[a-f0-9]{64}$'
  or p_failure_signature<>'CURRENT_SHIFT_AUTO_ADMISSION_MISSING'
 then raise exception 'SHIFT_VERIFIED_REPAIR_EXACT_SOURCE_AND_RED_REQUIRED';end if;
 v_issue:=pg_catalog.split_part(p_source_ref,'/issues/',2)::integer;
 -- The original #263 is a separately proven and already-settled repair; never
 -- overwrite, rebind or replay it using this generic intake.
 if v_issue=263 then raise exception 'SHIFT_VERIFIED_REPAIR_EXISTING_263_NO_REPLAY';end if;
 select sh.shift_id,sh.owner_id,sh.plan_fingerprint,
  step.proof_sha256,step.step_index,step.proof into s
 from reality_internal.governed_employee_shifts_v1 sh
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
   and w.plan_fingerprint=sh.plan_fingerprint
 join reality_internal.governed_employee_shift_steps_v1 step
  on step.shift_id=sh.shift_id and step.step_index between 2 and 5
 where sh.owner_id=p_owner_id and sh.shift_id=p_shift_id
  and sh.plan_fingerprint=p_plan_fingerprint
  and sh.authorized_at is not null and sh.planned_start_at<=clock_timestamp()
  and sh.planned_end_at='infinity'::timestamptz
  and sh.closed_at is null and sh.status in
   ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.state='ACTIVE' and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) src
   where src->>'source_ref'=p_source_ref
    and (src->>'step_index')::int=step.step_index)
  and step.state='SOURCE_CHECKED' and step.source_status='OPEN_ISSUE'
  and step.source_ref=p_source_ref
  and step.proof_sha256=p_source_proof_sha256
  and step.proof->>'kind'='GITHUB_SOURCE_READBACK'
  and step.proof->>'source_url'=p_source_ref
  and step.proof->>'provider_status'='OPEN_ISSUE'
  and step.proof->>'provider_checked'='true'
  and step.proof->>'read_only'='true'
  and step.proof->>'production_changed'='false'
  and step.proof_sha256='sha256:'||pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(step.proof::text,'UTF8')),'hex');
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_CURRENT_OWNER_WARRANTED_REPAIR_SOURCE',
   'original_job_completed',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 select w.* into rec
 from reality_internal.weekly_employee_investigation_receipts_v1 w
 where w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.issue_number=v_issue and w.source_ref=p_source_ref
  and w.provider_evidence_sha256=p_provider_evidence_sha256
  and p_evidence_receipt_ref=
   'supabase:weekly_employee_investigation_receipts_v1:'||
     w.investigation_receipt_id::text
  and w.investigation_status in
   ('CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST',
    'HISTORICAL_PROVIDER_FAILURE_VERIFIED_FRESH_REPRODUCTION_REQUIRED')
 order by w.investigated_at desc limit 1;
 if not found then raise exception 'SHIFT_VERIFIED_REPAIR_REAL_INVESTIGATION_REQUIRED';end if;
 -- Check active owner source epoch: a currently authorized source must never
 -- be cloned by discovery or silently co-opted from another shift.
 select count(*) into v_count
 from reality_internal.riley_unattended_repair_originals_v1 x
 where x.issue_number=v_issue and x.issue_url=p_source_ref and
  x.shift_id<>s.shift_id and x.phase='SETTLED';
 if v_count>0 then raise exception 'SHIFT_VERIFIED_REPAIR_PREVIOUSLY_SETTLED_NO_REPLAY';end if;
 v_work:='work:'||pg_catalog.left(pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('shift-auto-repair:v1:'||s.owner_id::text||':'||
   s.shift_id::text||':'||p_source_ref||':'||s.proof_sha256||':'||
   s.plan_fingerprint||':'||p_frozen_failure_run_id::text||':'||
   p_frozen_test_sha256,'UTF8')),'hex'),32);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_work));
 insert into reality_internal.riley_unattended_repair_originals_v1(
  shift_id,owner_id,original_work_id,issue_number,issue_url,
  shift_source_proof_sha256,qualification_run_id,
  qualification_failed_commit_sha,qualification_frozen_test_path,
  qualification_frozen_test_sha256,qualification_investigation_receipt_ref)
 values(s.shift_id,s.owner_id,v_work,v_issue,p_source_ref,s.proof_sha256,
  p_frozen_failure_run_id,p_failure_source_sha,p_frozen_test_path,
  p_frozen_test_sha256,p_evidence_receipt_ref)
 on conflict(shift_id,issue_number) do nothing;
 select * into v_existing
 from reality_internal.riley_unattended_repair_originals_v1
 where shift_id=s.shift_id and issue_number=v_issue for update;
 if v_existing.original_work_id<>v_work or
  v_existing.owner_id<>s.owner_id or
  v_existing.shift_source_proof_sha256<>s.proof_sha256 or
  v_existing.qualification_run_id<>p_frozen_failure_run_id or
  v_existing.qualification_failed_commit_sha<>p_failure_source_sha or
  v_existing.qualification_frozen_test_sha256<>p_frozen_test_sha256 or
  v_existing.qualification_frozen_test_path<>p_frozen_test_path or
  v_existing.qualification_investigation_receipt_ref<>p_evidence_receipt_ref
 then raise exception 'SHIFT_VERIFIED_REPAIR_ORIGINAL_PROOF_CHANGED';end if;
 if v_existing.phase='SETTLED' then
  return pg_catalog.jsonb_build_object(
   'status','ALREADY_SETTLED_NO_REPLAY','shift_id',s.shift_id,
   'owner_id',s.owner_id,'source_ref',p_source_ref,
   'original_work_id',v_work,'original_job_completed',true,
   'installation_authorized',false,'production_changed',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_OWNER_SHIFT_REPAIR_ORIGINAL_ADMITTED',
  'owner_id',s.owner_id,'shift_id',s.shift_id,
  'source_ref',p_source_ref,'original_work_id',v_work,
  'phase',v_existing.phase,'frozen_failure_run_id',p_frozen_failure_run_id,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_admit_current_shift_verified_repair_v1(
 uuid,uuid,text,text,text,text,text,bigint,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_admit_current_shift_verified_repair_v1(
 uuid,uuid,text,text,text,text,text,bigint,text,text,text,text)
 to service_role;
