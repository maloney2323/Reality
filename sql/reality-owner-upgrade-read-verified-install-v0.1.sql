-- Resumable full upgrade loop: independent read-only proof that an exact
-- owner-approved install was ALREADY executed/settled. No rearm/retry, no
-- mutation, no browser access. Deploy via reviewed isolated DB migration.
create or replace function public.reality_read_exact_verified_upgrade_install(
  p_user_id uuid,
  p_conversation_id uuid,
  p_work_fingerprint text,
  p_goal_id text,
  p_goal_transition_event_id uuid
) returns table(
  reservation_id uuid,
  verification_receipt_ref text,
  action_policy_id text,
  settled_at timestamptz
)
language plpgsql security definer set search_path = ''
as $function$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role'
  then
    raise exception 'UPGRADE_INSTALL_READBACK_SERVICE_ROLE_REQUIRED';
  end if;
  if p_user_id is null or p_conversation_id is null or
     p_work_fingerprint is null or
     p_work_fingerprint !~ '^sha256:[a-f0-9]{64}$' or
     p_goal_id is null or length(p_goal_id) < 1 or
     p_goal_transition_event_id is null
  then
    raise exception 'UPGRADE_INSTALL_READBACK_INPUT_INVALID';
  end if;
  return query
  select r.reservation_id, r.verification_receipt_ref,
    r.action_policy_id, r.settled_at
  from reality_internal.execution_reservations r
  where r.user_id=p_user_id
    and r.conversation_id=p_conversation_id
    and r.work_fingerprint=p_work_fingerprint
    and r.goal_id=p_goal_id
    and r.goal_transition_event_id=p_goal_transition_event_id
    and r.status='VERIFIED'
    and r.dispatch_started_at is not null
    and r.settled_at is not null
    and r.verification_receipt_ref ~ '^github-preview-merge:[a-f0-9]{40}$';
end
$function$;
revoke all on function public.reality_read_exact_verified_upgrade_install(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reality_read_exact_verified_upgrade_install(uuid,uuid,text,text,uuid) to service_role;
