-- A verified candidate, not an already-settled original job, is the wake event.
-- If a current owner goal does not authorize investigation, preserve the verified
-- receipt and leave the handoff pending; NEVER invent owner installation consent.
create or replace function reality_internal.auto_bind_released_candidate_handoff_v1()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,reality_internal as $$
begin
 if current_setting('role',true)<>'service_role' then
  return new;
 end if;
 begin
  perform public.reality_bind_verified_candidate_followon_v1(new.handoff_id);
 exception when others then
  -- Missing/currently revoked investigation authority must not erase a
  -- legitimately verified evidence receipt. It remains owner-visible.
  raise notice 'VERIFIED_CANDIDATE_AUTOBIND_AWAITING_VALID_AUTHORITY';
 end;
 return new;
end$$;
revoke all on function reality_internal.auto_bind_released_candidate_handoff_v1() from public,anon,authenticated;
drop trigger if exists auto_bind_released_candidate_handoff_v1
 on reality_internal.verified_candidate_handoffs_v1;
create trigger auto_bind_released_candidate_handoff_v1
after insert on reality_internal.verified_candidate_handoffs_v1
for each row execute function reality_internal.auto_bind_released_candidate_handoff_v1();
