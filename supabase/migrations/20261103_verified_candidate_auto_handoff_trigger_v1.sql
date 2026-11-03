-- The durable release is the event. New candidate hashes automatically enter
-- a separate, owner-scoped pending-binding record; never reopen settled work.
create or replace function reality_internal.auto_handoff_released_candidate_v1()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,reality_internal as $$
declare old_work text; old_count integer;
begin
 if new.source_issue<>188 or new.verified_checks<>21 then return new; end if;
 select count(*),min(e.payload->>'original_work_id')
 into old_count,old_work
 from public.universe_events e
 where e.entity_type='reality_original_source_backed_repair_work'
   and e.epistemic_status='VERIFIED'
   and e.payload->>'issue_number'=new.source_issue::text
   and e.payload->>'owner_authorized_investigation'='true'
   and e.payload->>'owner_authorized_installation'='false'
   and e.payload->>'original_model_candidate_sha256' is distinct from new.source_sha256
   and e.provenance->>'principal_id'=e.payload->>'owner_id';
 -- Ambiguous owner source fails closed, never attaches to the wrong job.
 if old_count<>1 then return new; end if;
 perform public.reality_register_verified_candidate_handoff_v1(new.receipt_id,old_work,1);
 return new;
end;$$;
revoke all on function reality_internal.auto_handoff_released_candidate_v1() from public,anon,authenticated;
drop trigger if exists auto_handoff_released_candidate_v1 on reality_internal.verified_capability_receipt_releases_v1;
create trigger auto_handoff_released_candidate_v1
after insert on reality_internal.verified_capability_receipt_releases_v1
for each row execute function reality_internal.auto_handoff_released_candidate_v1();
