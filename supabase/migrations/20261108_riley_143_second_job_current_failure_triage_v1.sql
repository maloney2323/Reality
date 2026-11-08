-- Durable second REAL job from the same authorized Riley/Taylor shift.
-- Issue #143 is an old recurring CI failure; disposition requires current
-- provider evidence and MUST NOT claim the historical defect was repaired.
create table if not exists reality_internal.riley_shift_failure_triage_v1(
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 original_work_id text primary key,
 issue_number integer not null default 143 check(issue_number=143),
 source_ref text not null check(source_ref=
  'https://github.com/maloney2323/Reality/issues/143'),
 source_proof_sha256 text not null check(source_proof_sha256~'^sha256:[a-f0-9]{64}$'),
 phase text not null default 'ADMITTED'
  check(phase in ('ADMITTED','PUBLISHED_UNVERIFIED','SETTLED','BLOCKED')),
 historical_failed_run_id bigint,
 current_verified_success_run_ids bigint[],
 provider_comment_id bigint unique,
 provider_comment_url text,
 provider_body_sha256 text,
 settlement_receipt_id uuid unique,
 finding text,
 created_at timestamptz not null default clock_timestamp(),
 settled_at timestamptz,
 unique(shift_id,issue_number)
);
alter table reality_internal.riley_shift_failure_triage_v1 enable row level security;
revoke all on reality_internal.riley_shift_failure_triage_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_shift_failure_triage_v1 to service_role;
create or replace function public.reality_admit_shift_failure_triage_143_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;j reality_internal.riley_shift_failure_triage_v1%rowtype;v_id text;
begin
 if current_user<>'service_role' then raise exception 'SHIFT_FAILURE_TRIAGE_SERVICE_ONLY';end if;
 select s.shift_id,s.owner_id,t.source_ref,t.proof_sha256,s.plan_fingerprint into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_steps_v1 t on t.shift_id=s.shift_id
 where s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 and s.authorized_at is not null and s.closed_at is null
 and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
 and t.source_ref='https://github.com/maloney2323/Reality/issues/143'
 and t.step_index between 2 and 5 and t.state='SOURCE_CHECKED'
 and t.source_status='OPEN_ISSUE'
 and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
 and t.proof->>'source_url'=t.source_ref
 and t.proof->>'provider_status'='OPEN_ISSUE'
 and t.proof->>'provider_checked'='true'
 and t.proof->>'read_only'='true'
 and t.proof->>'production_changed'='false'
 and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
 and s.plan_fingerprint~'^sha256:[a-f0-9]{64}$'
 and (select count(*) from reality_internal.governed_employee_shift_steps_v1 x
  where x.shift_id=s.shift_id and x.step_index between 1 and 5
  and x.state='SOURCE_CHECKED')=5
 order by s.authorized_at desc limit 1;
 if not found then return jsonb_build_object('status','NO_CURRENT_AUTHORIZED_TRIAGE_SOURCE',
  'installation_authorized',false,'production_changed',false);end if;
 v_id:='work:'||left(pg_catalog.encode(pg_catalog.sha256(
 pg_catalog.convert_to('reality:riley:failure-triage:v1:'||v.owner_id::text||':'||
 v.shift_id::text||':'||v.source_ref||':'||v.proof_sha256||':'||
 v.plan_fingerprint,'UTF8')),'hex'),32);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_id));
 insert into reality_internal.riley_shift_failure_triage_v1(
  shift_id,owner_id,original_work_id,source_ref,source_proof_sha256)
 values(v.shift_id,v.owner_id,v_id,v.source_ref,v.proof_sha256)
 on conflict(shift_id,issue_number) do nothing;
 select * into j from reality_internal.riley_shift_failure_triage_v1
 where shift_id=v.shift_id and issue_number=143 for update;
 if not found or j.owner_id<>v.owner_id or
  j.original_work_id<>v_id or j.source_proof_sha256<>v.proof_sha256
 then raise exception 'SHIFT_FAILURE_TRIAGE_OWNER_SOURCE_IDENTITY_DRIFT';end if;
 return jsonb_build_object('status',case when j.phase='SETTLED' then
  'EXISTING_VERIFIED_TRIAGE_RECEIPT_NO_REPLAY'
  else 'EXACT_OWNER_SHIFT_TRIAGE_JOB_ADMITTED' end,
  'shift_id',j.shift_id,'original_work_id',j.original_work_id,
  'source_ref',j.source_ref,'source_proof_sha256',j.source_proof_sha256,
  'phase',j.phase,'installation_authorized',false,
  'original_job_completed',j.phase='SETTLED','production_changed',false);
end $fn$;
create or replace function public.reality_settle_shift_failure_triage_143_v1(
 p_original_work_id text,p_provider_comment_id bigint,p_provider_comment_url text,
 p_provider_body_sha256 text,p_historical_failed_run_id bigint,
 p_verified_current_success_run_ids bigint[])
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare j reality_internal.riley_shift_failure_triage_v1%rowtype;receipt uuid;
begin
 if current_user<>'service_role' then raise exception 'SHIFT_FAILURE_TRIAGE_SERVICE_ONLY';end if;
 select * into j from reality_internal.riley_shift_failure_triage_v1
 where original_work_id=p_original_work_id for update;
 if not found or j.phase not in ('ADMITTED','PUBLISHED_UNVERIFIED','SETTLED') or
  p_provider_comment_id is null or p_provider_comment_id<1 or
  p_provider_comment_url<>j.source_ref||'#issuecomment-'||p_provider_comment_id::text or
  p_provider_body_sha256!~'^sha256:[a-f0-9]{64}$' or
  p_historical_failed_run_id<>40591283500 or
  array_length(p_verified_current_success_run_ids,1)<>3 or
  (select count(distinct x) from unnest(p_verified_current_success_run_ids) x)<>3 or
  p_verified_current_success_run_ids[1]<=p_historical_failed_run_id or
  p_verified_current_success_run_ids[2]<=p_historical_failed_run_id or
  p_verified_current_success_run_ids[3]<=p_historical_failed_run_id
 then raise exception 'TRIAGE_INDEPENDENT_CURRENT_PROVIDER_EVIDENCE_REQUIRED';end if;
 if j.phase='SETTLED' then
  if j.provider_comment_id<>p_provider_comment_id or
    j.provider_body_sha256<>p_provider_body_sha256 then
    raise exception 'TRIAGE_SETTLEMENT_IDENTITY_CHANGED';end if;
  receipt:=j.settlement_receipt_id;
 else
  receipt:=gen_random_uuid();
  update reality_internal.riley_shift_failure_triage_v1
   set phase='SETTLED',historical_failed_run_id=p_historical_failed_run_id,
    current_verified_success_run_ids=p_verified_current_success_run_ids,
    provider_comment_id=p_provider_comment_id,
    provider_comment_url=p_provider_comment_url,
    provider_body_sha256=p_provider_body_sha256,
    settlement_receipt_id=receipt,
    finding='HISTORICAL_FAILURE_VERIFIED_CURRENT_EXECUTION_ENGINE_PASSES',
    settled_at=clock_timestamp()
  where original_work_id=p_original_work_id;
 end if;
 return jsonb_build_object(
  'status','EXACT_OWNER_SHIFT_TRIAGE_DISPOSITION_INDEPENDENTLY_SETTLED',
  'original_work_id',j.original_work_id,
  'source_ref',j.source_ref,
  'provider_comment_url',p_provider_comment_url,
  'settlement_receipt_ref','supabase:riley_shift_failure_triage_v1:'||receipt::text,
  'completed_job_kind','SOURCE_BACKED_RECURRING_FAILURE_INVESTIGATION',
  'original_job_completed',true,'code_repair_completed',false,
  'historical_root_cause_proven_fixed',false,
  'installation_authorized',false,'production_changed',false,
  'verified_human_hours_saved',null);
end $fn$;
create or replace function public.reality_read_owner_shift_failure_triage_143_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'SHIFT_TRIAGE_OWNER_SERVICE_READBACK_ONLY';end if;
 return jsonb_build_object('status','OWNER_SCOPED_VERIFIED_SHIFT_FAILURE_TRIAGE',
  'jobs',coalesce((select jsonb_agg(jsonb_build_object(
    'shift_id',j.shift_id,'original_work_id',j.original_work_id,
    'phase',j.phase,'source_ref',j.source_ref,'finding',j.finding,
    'provider_comment_url',case when j.phase='SETTLED' then j.provider_comment_url else null end,
    'settlement_receipt_ref',case when j.phase='SETTLED' then
      'supabase:riley_shift_failure_triage_v1:'||j.settlement_receipt_id::text else null end,
    'original_job_completed',j.phase='SETTLED',
    'code_repair_completed',false,'production_changed',false))
   from reality_internal.riley_shift_failure_triage_v1 j
   where j.owner_id=p_owner_id),'[]'::jsonb),
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_admit_shift_failure_triage_143_v1()
 from public,anon,authenticated;
revoke all on function public.reality_settle_shift_failure_triage_143_v1(text,bigint,text,text,bigint,bigint[])
 from public,anon,authenticated;
revoke all on function public.reality_read_owner_shift_failure_triage_143_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_admit_shift_failure_triage_143_v1() to service_role;
grant execute on function public.reality_settle_shift_failure_triage_143_v1(text,bigint,text,text,bigint,bigint[]) to service_role;
grant execute on function public.reality_read_owner_shift_failure_triage_143_v1(uuid) to service_role;
