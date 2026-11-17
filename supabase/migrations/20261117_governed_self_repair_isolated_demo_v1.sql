-- A one-shot, owner-signed, ISOLATED nonconsequential demonstration.
-- This is not customer original-job admission or authority to deploy anything.
create table if not exists reality_internal.owner_self_repair_demo_runs_v1(
 demo_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 original_work_id text not null unique check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 phase text not null check(phase in ('CLAIMED','VERIFIED','FAILED')),
 approved_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 finished_at timestamptz,
 failure_hash text, candidate_hash text, resumed_hash text, final_receipt_sha256 text,
 model_response_id text,
 failure_code text,
 check(phase<>'VERIFIED' or (finished_at is not null and
  failure_hash ~ '^sha256:[a-f0-9]{64}$' and
  candidate_hash ~ '^sha256:[a-f0-9]{64}$' and
  resumed_hash ~ '^sha256:[a-f0-9]{64}$' and
  final_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$' and
  model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'))
);
alter table reality_internal.owner_self_repair_demo_runs_v1 enable row level security;
revoke all on reality_internal.owner_self_repair_demo_runs_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_self_repair_demo_runs_v1 to service_role;
create index if not exists owner_self_repair_demo_runs_owner_v1
 on reality_internal.owner_self_repair_demo_runs_v1(owner_id,approved_at desc);

create or replace function public.reality_authorize_one_isolated_self_repair_demo_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v_id uuid;v_original text;v_count integer;v_exp timestamptz;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'ISOLATED_DEMO_EXACT_OWNER_SERVICE_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('selfrepair-demo:'||p_owner_id::text));
 select count(*) into v_count
 from reality_internal.owner_self_repair_demo_runs_v1
 where owner_id=p_owner_id and approved_at>=current_date
  and approved_at<current_date+interval '1 day';
 if v_count>=2 then return pg_catalog.jsonb_build_object(
  'status','ISOLATED_DEMO_DAILY_OWNER_LIMIT_REACHED',
  'owner_id',p_owner_id,'new_work_authorized',false,
  'production_changed',false);end if;
 v_id:=gen_random_uuid();
 v_original:='work:'||left(pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('self-repair-demo:'||p_owner_id::text||':'||v_id::text,'UTF8')
 ),'hex'),32);
 v_exp:=clock_timestamp()+interval '10 minutes';
 insert into reality_internal.owner_self_repair_demo_runs_v1(
  demo_id,owner_id,original_work_id,phase,expires_at)
 values(v_id,p_owner_id,v_original,'CLAIMED',v_exp);
 return pg_catalog.jsonb_build_object(
  'status','OWNER_EXACT_ISOLATED_REPAIR_WARRANT_ACTIVE',
  'warrant_id',v_id,'owner_id',p_owner_id,'original_work_id',v_original,
  'scope','ISOLATED_NONCONSEQUENTIAL_INTERNAL_REPAIR',
  'owner_approved',true,'revoked',false,
  'allowed_steps',pg_catalog.jsonb_build_array('repair','resume'),
  'expires_at',v_exp,'installation_authorized',false,
  'external_actions_authorized',false,'production_changed',false,
  'demo_only',true,'new_customer_job_created',false);
end $fn$;

create or replace function public.reality_settle_one_isolated_self_repair_demo_v1(
 p_owner_id uuid,p_warrant_id uuid,p_original_work_id text,
 p_failure_hash text,p_candidate_hash text,p_resumed_hash text,
 p_final_receipt_sha256 text,p_model_response_id text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.owner_self_repair_demo_runs_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null or p_warrant_id is null
 or p_original_work_id !~ '^work:[a-f0-9]{32}$'
 or p_failure_hash !~ '^sha256:[a-f0-9]{64}$'
 or p_candidate_hash !~ '^sha256:[a-f0-9]{64}$'
 or p_resumed_hash !~ '^sha256:[a-f0-9]{64}$'
 or p_final_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$'
 or p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 then raise exception 'ISOLATED_DEMO_INDEPENDENT_RECEIPT_REQUIRED';end if;
 update reality_internal.owner_self_repair_demo_runs_v1
 set phase='VERIFIED',failure_hash=p_failure_hash,
  candidate_hash=p_candidate_hash,resumed_hash=p_resumed_hash,
  final_receipt_sha256=p_final_receipt_sha256,
  model_response_id=p_model_response_id,finished_at=clock_timestamp()
 where owner_id=p_owner_id and demo_id=p_warrant_id
  and original_work_id=p_original_work_id and phase='CLAIMED'
  and expires_at>clock_timestamp()
 returning * into v;
 if not found then raise exception 'ISOLATED_DEMO_EXPIRED_OR_DUPLICATE_FINAL_RECEIPT';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED',
  'owner_id',v.owner_id,'original_work_id',v.original_work_id,
  'warrant_id',v.demo_id,
  'final_receipt_sha256',v.final_receipt_sha256,
  'independently_verified',true,
  'external_action_performed',false,'production_changed',false,
  'demo_only',true,'customer_job_completed',false);
end $fn$;
create or replace function public.reality_fail_one_isolated_self_repair_demo_v1(
 p_owner_id uuid,p_warrant_id uuid,p_error_code text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
begin
 if current_user<>'service_role' or p_owner_id is null or p_warrant_id is null
  or p_error_code !~ '^ISOLATED_DEMO_[A-Z0-9_]{4,95}$'
 then raise exception 'ISOLATED_DEMO_FAILURE_SCOPE_INVALID';end if;
 update reality_internal.owner_self_repair_demo_runs_v1
 set phase='FAILED',failure_code=p_error_code,finished_at=clock_timestamp()
 where owner_id=p_owner_id and demo_id=p_warrant_id and phase='CLAIMED';
 return pg_catalog.jsonb_build_object('status','ISOLATED_DEMO_FAILURE_RECORDED',
  'owner_id',p_owner_id,'execution_authorized',false,
  'production_changed',false);
end $fn$;
create or replace function public.reality_read_owner_isolated_self_repair_demo_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.owner_self_repair_demo_runs_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'ISOLATED_DEMO_READ_OWNER_SERVICE_REQUIRED';end if;
 select * into v from reality_internal.owner_self_repair_demo_runs_v1
 where owner_id=p_owner_id order by approved_at desc limit 1;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_ISOLATED_SELF_REPAIR_DEMO_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,
  'phase',coalesce(v.phase,'NONE'),
  'demo_id',v.demo_id,'original_work_id',v.original_work_id,
  'approved_at',v.approved_at,'finished_at',v.finished_at,
  'final_receipt_sha256',v.final_receipt_sha256,
  'failure_code',v.failure_code,
  'demo_only',true,'customer_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke execute on function public.reality_authorize_one_isolated_self_repair_demo_v1(uuid) from public,anon,authenticated;
revoke execute on function public.reality_settle_one_isolated_self_repair_demo_v1(uuid,uuid,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.reality_fail_one_isolated_self_repair_demo_v1(uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.reality_read_owner_isolated_self_repair_demo_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_authorize_one_isolated_self_repair_demo_v1(uuid) to service_role;
grant execute on function public.reality_settle_one_isolated_self_repair_demo_v1(uuid,uuid,text,text,text,text,text,text) to service_role;
grant execute on function public.reality_fail_one_isolated_self_repair_demo_v1(uuid,uuid,text) to service_role;
grant execute on function public.reality_read_owner_isolated_self_repair_demo_v1(uuid) to service_role;
