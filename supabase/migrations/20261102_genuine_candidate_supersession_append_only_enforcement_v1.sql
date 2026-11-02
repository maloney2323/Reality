create or replace function reality_internal.reality_reject_genuine_candidate_supersession_mutation_v1()
returns trigger language plpgsql set search_path to '' as $$
begin
 raise exception 'GENUINE_REQUALIFICATION_APPEND_ONLY_HISTORY';
end $$;
drop trigger if exists genuine_candidate_supersessions_append_only_v1
on reality_internal.genuine_candidate_supersessions_v1;
create trigger genuine_candidate_supersessions_append_only_v1
before update or delete on reality_internal.genuine_candidate_supersessions_v1
for each row execute function
reality_internal.reality_reject_genuine_candidate_supersession_mutation_v1();
revoke all on function reality_internal.reality_reject_genuine_candidate_supersession_mutation_v1()
from public,anon,authenticated;