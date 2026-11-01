-- Read only. The already-approved, unexpired/eligible work is nominated by
-- a private service-role-only source, never by a model or a scheduler string.
-- Signed GitHub OIDC is validated at the Supabase Edge function boundary.
create or replace function public.reality_read_pending_approved_repairs_for_wake_v1()
returns jsonb
language plpgsql security invoker
set search_path = ''
as $reality$
declare
 eligible jsonb;
begin
 if current_user <> 'service_role' then
  raise exception 'SIGNED_REPAIR_WAKE_SERVICE_ROLE_REQUIRED';
 end if;
 select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into eligible from (
  select q.reservation_id,q.original_work_id,q.candidate_hash,
   q.issue_number,q.install_branch
  from reality_internal.approved_repair_continuations_v1 q
  join reality_internal.general_repair_owner_approvals_v1 a
   on a.reservation_id=q.reservation_id
  join reality_internal.goal_publication_epochs e
   on e.user_id=q.owner_id and e.conversation_id=q.conversation_id
  where q.status in ('PENDING','LEASED')
   and (q.lease_until is null or q.lease_until<now())
   and q.attempts<24
   and a.status in ('CLAIMED','INSTALLED')
   and a.claimed_at is not null
   and a.owner_id=q.owner_id and a.conversation_id=q.conversation_id
   and a.original_work_id=q.original_work_id
   and a.candidate_hash=q.candidate_hash
   and e.last_transition_event_id=a.goal_transition_event_id
   and q.issue_number between 1 and 100000
   and q.original_work_id ~ '^work:[0-9a-f]{32}$'
   and q.candidate_hash ~ '^[0-9a-f]{64}$'
   and q.install_branch in ('feature/reality-closed-loop-worker-20261031',
      'feature/reality-home-repair-chat-20261031')
  order by q.created_at asc,q.reservation_id asc
  limit 5
 ) p;
 return pg_catalog.jsonb_build_object(
  'status',case when pg_catalog.jsonb_array_length(eligible)=0 then
    'NO_APPROVED_WORK' else 'PREVIOUSLY_OWNER_APPROVED_WORK_OBSERVED' end,
  'pending_approvals',eligible,
  'owner_approval_used',false,
  'installation_performed',false,
  'production_changed',false);
end
$reality$;
revoke all on function public.reality_read_pending_approved_repairs_for_wake_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_pending_approved_repairs_for_wake_v1()
 to service_role;
