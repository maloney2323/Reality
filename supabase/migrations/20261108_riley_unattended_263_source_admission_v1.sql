-- Preview-only actual Riley repair candidate: the same signed source
-- already contained in an active owner's employee shift. This is NOT an
-- installation warrant and never claims the original repair settled.
create table if not exists reality_internal.riley_unattended_repair_originals_v1 (
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 original_work_id text primary key,
 issue_number integer not null,
 issue_url text not null,
 shift_source_proof_sha256 text not null,
 phase text not null default 'SOURCE_ADMITTED'
   check (phase in ('SOURCE_ADMITTED','CANDIDATE_TESTING',
    'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL','BLOCKED','SETTLED')),
 requested_at timestamptz not null default clock_timestamp(),
 candidate_artifact_sha256 text,
 candidate_commit_sha text,
 independent_proof_run_id bigint,
 model_response_id text,
 exact_approval_receipt_ref text,
 original_settlement_receipt_ref text,
 installed boolean not null default false,
 production_changed boolean not null default false,
 unique (shift_id, issue_number),
 constraint riley_repair_source_valid check(
  issue_number=263 and
  issue_url='https://github.com/maloney2323/Reality/issues/263' and
  original_work_id ~ '^work:[a-f0-9]{32}$' and
  shift_source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
 )
);
alter table reality_internal.riley_unattended_repair_originals_v1 enable row level security;
revoke all on reality_internal.riley_unattended_repair_originals_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_unattended_repair_originals_v1
 to service_role;
create or replace function public.reality_admit_exact_riley_263_repair_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record;r reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v_work text;
begin
 if current_user<>'service_role' then
   raise exception 'RILEY_CODE_REPAIR_SERVICE_ONLY';end if;
 select q.shift_id,q.owner_id,t.source_ref,t.proof_sha256,q.plan_fingerprint
 into s from reality_internal.governed_employee_shifts_v1 q
 join reality_internal.governed_employee_shift_steps_v1 t
  on t.shift_id=q.shift_id
 where q.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and q.closed_at is null and q.authorized_at is not null
  and q.planned_start_at<=clock_timestamp()
  and q.planned_end_at>clock_timestamp()
  and t.state='SOURCE_CHECKED'
  and t.source_status='OPEN_ISSUE'
  and t.source_ref='https://github.com/maloney2323/Reality/issues/263'
  and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
  and t.proof->>'source_url'=t.source_ref
  and t.proof->>'provider_status'='OPEN_ISSUE'
  and t.proof->>'provider_checked'='true'
  and t.proof->>'read_only'='true'
  and t.proof->>'production_changed'='false'
  and t.proof_sha256='sha256:'||pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
  and q.plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'
  and (select count(*) from reality_internal.governed_employee_shift_steps_v1 x
   where x.shift_id=q.shift_id and x.step_index between 1 and 5
    and x.state='SOURCE_CHECKED')=5
 order by q.authorized_at desc limit 1;
 if not found then
  return jsonb_build_object('status','NO_OWNER_AUTHORIZED_263_SOURCE_TO_ADMIT',
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
 end if;
 v_work:='work:'||left(pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(
  'riley:existing-code-repair:v1:'||s.owner_id::text||':'||
  s.shift_id::text||':'||s.source_ref||':'||
  s.proof_sha256||':'||s.plan_fingerprint,'UTF8')),'hex'),32);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_work));
 insert into reality_internal.riley_unattended_repair_originals_v1
 (shift_id,owner_id,original_work_id,issue_number,issue_url,shift_source_proof_sha256)
 values (s.shift_id,s.owner_id,v_work,263,s.source_ref,s.proof_sha256)
 on conflict (shift_id,issue_number) do nothing;
 select * into r from reality_internal.riley_unattended_repair_originals_v1
 where shift_id=s.shift_id and issue_number=263 for update;
 if r.original_work_id<>v_work or r.owner_id<>s.owner_id or
  r.shift_source_proof_sha256<>s.proof_sha256 then
  raise exception 'RILEY_REPAIR_OWNER_SOURCE_FINGERPRINT_CHANGED';end if;
 return jsonb_build_object(
  'status',case when r.phase='SETTLED' then 'ALREADY_SETTLED_NO_REPLAY'
  else 'EXACT_OWNER_SHIFT_REPAIR_SOURCE_ADMITTED' end,
  'shift_id',r.shift_id,'owner_id',r.owner_id,
  'original_work_id',r.original_work_id,'issue_url',r.issue_url,
  'source_proof_sha256',r.shift_source_proof_sha256,
  'phase',r.phase,'installation_authorized',false,
  'original_job_completed',r.phase='SETTLED',
  'production_changed',false);
end $fn$;
revoke all on function public.reality_admit_exact_riley_263_repair_v1()
 from public,anon,authenticated;
grant execute on function public.reality_admit_exact_riley_263_repair_v1()
 to service_role;
