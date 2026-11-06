-- Bound paid web research to 3 owner-scoped runs per UTC day and one
-- active run; fail closed rather than silently multiplying API spend.
create table if not exists reality_internal.market_research_run_reservations_v1 (
 reservation_id uuid primary key default pg_catalog.gen_random_uuid(),
 owner_id uuid not null,
 phase text not null default 'RUNNING'
  check (phase in ('RUNNING','COMPLETE','FAILED')),
 created_at timestamptz not null default pg_catalog.now(),
 finalized_at timestamptz
);
create index if not exists market_research_run_reservations_owner_day_idx
 on reality_internal.market_research_run_reservations_v1(owner_id,created_at);
alter table reality_internal.market_research_run_reservations_v1 enable row level security;
revoke all on reality_internal.market_research_run_reservations_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.market_research_run_reservations_v1 to service_role;
create or replace function public.reality_reserve_owner_market_research_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to ''
as $func$
declare v_count integer;v_active integer;v_id uuid;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MARKET_RESEARCH_OWNER_SERVICE_ROLE_REQUIRED';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,98732));
 select count(*) into v_count
  from reality_internal.market_research_run_reservations_v1
  where owner_id=p_owner_id and created_at>=
   pg_catalog.date_trunc('day',pg_catalog.now() at time zone 'UTC') at time zone 'UTC';
 if v_count>=3 then raise exception 'MARKET_RESEARCH_DAILY_LIMIT_REACHED';end if;
 select count(*) into v_active
  from reality_internal.market_research_run_reservations_v1
  where owner_id=p_owner_id and phase='RUNNING' and
   created_at>pg_catalog.now()-interval '6 minutes';
 if v_active>0 then raise exception 'MARKET_RESEARCH_ALREADY_RUNNING';end if;
 insert into reality_internal.market_research_run_reservations_v1(owner_id)
 values(p_owner_id) returning reservation_id into v_id;
 return pg_catalog.jsonb_build_object(
  'ok',true,'status','OWNER_RESEARCH_RESERVED','reservation_id',v_id,
  'remaining_today',2-v_count);
end $func$;
create or replace function public.reality_finalize_owner_market_research_v1(
 p_owner_id uuid,p_reservation_id uuid,p_phase text)
returns jsonb language plpgsql security invoker set search_path to ''
as $func$
declare v_rows integer;
begin
 if current_user<>'service_role' or p_owner_id is null or p_reservation_id is null or
    p_phase not in ('COMPLETE','FAILED') then
  raise exception 'MARKET_RESEARCH_FINALIZE_SCOPE_INVALID';
 end if;
 update reality_internal.market_research_run_reservations_v1
 set phase=p_phase,finalized_at=pg_catalog.now()
 where owner_id=p_owner_id and reservation_id=p_reservation_id and phase='RUNNING';
 get diagnostics v_rows=row_count;
 if v_rows<>1 then raise exception 'MARKET_RESEARCH_RESERVATION_NOT_ACTIVE';end if;
 return pg_catalog.jsonb_build_object('ok',true,'status','FINALIZED','phase',p_phase,
  'reservation_id',p_reservation_id);
end $func$;
revoke all on function public.reality_reserve_owner_market_research_v1(uuid) from public,anon,authenticated;
revoke all on function public.reality_finalize_owner_market_research_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_reserve_owner_market_research_v1(uuid) to service_role;
grant execute on function public.reality_finalize_owner_market_research_v1(uuid,uuid,text) to service_role;