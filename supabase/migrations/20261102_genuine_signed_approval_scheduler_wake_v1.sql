-- Read-only approved genuine queue for the existing signed GitHub scheduler.
-- Never grants approval, installation or original-job completion.
create or replace function public.reality_read_pending_genuine_approvals_for_wake_v1()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare pending jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_SCHEDULER_SERVICE_ROLE_ONLY';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'approval_id',a.approval_id,
   'original_work_id',a.original_work_id,
   'trigger_id',a.trigger_id,
   'artifact_sha256',a.artifact_hash) order by a.approved_at asc),'[]'::jsonb)
 into pending
 from (
  select a.approval_id,a.original_work_id,a.trigger_id,a.artifact_hash,a.approved_at
  from reality_internal.genuine_preview_install_approvals_v1 a
  join reality_internal.genuine_capability_queue_v1 q on q.trigger_id=a.trigger_id
  join public.universe_events o on o.event_id=q.original_work_event_id
  join reality_internal.goal_publication_epochs epoch
    on epoch.user_id=q.owner_id and epoch.conversation_id=q.conversation_id
  where q.phase='AWAITING_OWNER_APPROVAL' and
   a.consumed_at is null and a.installed_commit_sha is null and
   a.target_environment='ISOLATED_PREVIEW' and
   a.owner_id=q.owner_id and a.original_work_id=q.original_work_id and
   a.artifact_hash=q.qualification_receipt->>'artifact_sha256' and
   a.approval_receipt->>'approval_origin'='AUTHENTICATED_OWNER_EXPLICIT_ACTION' and
   a.approval_receipt->>'source_installation_completed'='false' and
   a.approval_receipt->>'original_job_completed'='false' and
   a.approval_receipt->>'production_changed'='false' and
   epoch.last_transition_event_id=q.goal_transition_event_id and
   o.epistemic_status='VERIFIED' and
   o.payload->>'original_work_id'=q.original_work_id and
   o.payload->>'original_job_completed'='false' and
   q.qualified_candidate->>'artifact_sha256'=a.artifact_hash
  order by a.approved_at asc limit 3
 ) a;
 return jsonb_build_object(
   'status',case when jsonb_array_length(pending)>0 then
      'SIGNED_EXISTING_APPROVALS_PENDING_WAKE' else 'NO_APPROVED_GENUINE_WORK' end,
   'genuine_pending_approvals',pending,
   'owner_approval_created',false,
   'worker_execution_started',false,
   'installation_performed',false,'production_changed',false);
end $$;
revoke all on function public.reality_read_pending_genuine_approvals_for_wake_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_pending_genuine_approvals_for_wake_v1()
 to service_role;
