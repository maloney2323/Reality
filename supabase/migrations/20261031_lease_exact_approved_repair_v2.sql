-- Correct retry claim binds the EXACT signed-owner reservation, never selects
-- another owner's pending lease on the same isolated preview branch.
create or replace function public.reality_lease_exact_approved_repair_v2(
 p_reservation_id uuid,p_install_branch text)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare j reality_internal.approved_repair_continuations_v1%rowtype;
 a reality_internal.general_repair_owner_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'EXACT_REPAIR_LEASE_SERVICE_ROLE_REQUIRED';end if;
 if p_reservation_id is null or
  p_install_branch !~ '^feature/reality-[a-z0-9][a-z0-9/-]{5,105}$'
  or p_install_branch like '%..%' then
  raise exception 'EXACT_REPAIR_LEASE_INVALID_IDENTITY';end if;
 select * into j from reality_internal.approved_repair_continuations_v1
  where reservation_id=p_reservation_id and install_branch=p_install_branch
  for update;
 if j.reservation_id is null then
  return pg_catalog.jsonb_build_object('status','NO_APPROVED_WORK');end if;
 if j.status='SETTLED' then
  return pg_catalog.jsonb_build_object('status','ALREADY_SETTLED');end if;
 if j.status not in ('PENDING','LEASED') or j.attempts>=24 or
  (j.lease_until is not null and j.lease_until>=now()) then
  return pg_catalog.jsonb_build_object('status','EXISTING_LEASE_OR_ATTEMPT_LIMIT');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||j.owner_id::text||':'||j.conversation_id::text,0));
 select * into a from reality_internal.general_repair_owner_approvals_v1
  where reservation_id=j.reservation_id for update;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=j.owner_id and conversation_id=j.conversation_id for update;
 if a.reservation_id is null or a.owner_id<>j.owner_id or
  a.conversation_id<>j.conversation_id or a.original_work_id<>j.original_work_id or
  a.candidate_hash<>j.candidate_hash or a.status not in ('CLAIMED','INSTALLED','SETTLED') or
  a.claimed_at is null or e.user_id is null or
  e.last_transition_event_id is distinct from a.goal_transition_event_id
 then
  update reality_internal.approved_repair_continuations_v1 set
   status='BLOCKED',last_observation='OWNER_AUTHORITY_OR_GOAL_CHANGED',
   updated_at=now() where reservation_id=j.reservation_id;
  return pg_catalog.jsonb_build_object('status','AUTHORITY_RECONCILIATION_REQUIRED');
 end if;
 update reality_internal.approved_repair_continuations_v1
  set status='LEASED',lease_id=gen_random_uuid(),
   lease_until=now()+interval '8 minutes',
   attempts=attempts+1,updated_at=now()
  where reservation_id=j.reservation_id returning * into j;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_OWNER_APPROVED_WORK_LEASED',
  'reservation_id',j.reservation_id,'lease_id',j.lease_id,
  'owner_id',j.owner_id,'conversation_id',j.conversation_id,
  'original_work_id',j.original_work_id,'issue_number',j.issue_number,
  'candidate_hash',j.candidate_hash,'install_branch',j.install_branch,
  'attempts',j.attempts,'production_changed',false);
end $$;
revoke all on function public.reality_lease_exact_approved_repair_v2(uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_lease_exact_approved_repair_v2(uuid,text)
 to service_role;
