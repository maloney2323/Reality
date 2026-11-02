-- The installation runner is a different authority tier from discovery and
-- from the model. One exact signed owner approval can be consumed only once.
alter table reality_internal.genuine_preview_install_approvals_v1
 add column if not exists installer_run_id text,
 add column if not exists install_branch text,
 add column if not exists installer_source_sha text,
 add column if not exists installation_receipt jsonb,
 add column if not exists probation_observations jsonb;

create or replace function public.reality_read_approved_genuine_preview_v1()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if current_user <> 'service_role' then
  raise exception 'GENUINE_INSTALL_READ_SERVICE_REQUIRED'; end if;
 select pg_catalog.jsonb_build_object(
   'status','OWNER_APPROVED_CAPABILITY_FOUND',
   'trigger_id',q.trigger_id,'gap_event_id',q.gap_event_id,
   'owner_id',q.owner_id,'original_work_id',q.original_work_id,
   'original_work_event_id',q.original_work_event_id,
   'goal_id',q.goal_id,'goal_transition_event_id',q.goal_transition_event_id,
   'approval_id',a.approval_id,
   'approval',a.approval_receipt,
   'artifact_sha256',a.artifact_hash,
   'candidate',q.qualified_candidate,
   'qualification',q.qualification_receipt,
   'frozen_receipt',q.verified_frozen_reproduction,
   'phase',q.phase,
   'target_environment','ISOLATED_PREVIEW',
   'production_changed',false
 ) into result
 from reality_internal.genuine_capability_queue_v1 q
 join reality_internal.genuine_preview_install_approvals_v1 a
  on a.trigger_id=q.trigger_id
 where q.phase='AWAITING_OWNER_APPROVAL'
  and a.consumed_at is null
  and a.target_environment='ISOLATED_PREVIEW'
  and a.owner_id=q.owner_id
  and a.original_work_id=q.original_work_id
  and a.artifact_hash=q.qualified_candidate->>'artifact_sha256'
  and a.artifact_hash=q.qualification_receipt->>'artifact_sha256'
  and a.approval_receipt->>'approval_origin'='AUTHENTICATED_OWNER_EXPLICIT_ACTION'
  and a.approval_receipt->>'source_installation_completed'='false'
 order by a.approved_at asc limit 1;
 return coalesce(result,'{"status":"NO_APPROVED_WORK"}'::jsonb);
end $$;
revoke all on function public.reality_read_approved_genuine_preview_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_approved_genuine_preview_v1()
 to service_role;

create or replace function public.reality_reserve_approved_genuine_preview_v1(
 p_trigger_id uuid,p_approval_id uuid,p_artifact_hash text,
 p_runner_sha text,p_run_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 now_at timestamptz;
begin
 if current_user <> 'service_role' then
  raise exception 'GENUINE_INSTALL_RESERVE_SERVICE_REQUIRED'; end if;
 if p_runner_sha !~ '^[a-f0-9]{40}$' or
    p_artifact_hash !~ '^[a-f0-9]{64}$' or
    p_run_id !~ '^[1-9][0-9]{7,17}$' then
  raise exception 'GENUINE_INSTALL_RESERVE_SIGNED_SCOPE_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
  where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1
  where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or a.trigger_id is null or
  a.approval_id is distinct from p_approval_id or
  a.artifact_hash is distinct from p_artifact_hash or
  q.phase<>'AWAITING_OWNER_APPROVAL' or
  q.qualification_receipt->>'status'<>'AWAITING_OWNER_APPROVAL' or
  q.qualified_candidate->>'artifact_sha256' is distinct from p_artifact_hash or
  a.target_environment<>'ISOLATED_PREVIEW' then
  raise exception 'GENUINE_INSTALL_EXACT_APPROVAL_NOT_VERIFIED';end if;
 if a.consumed_at is not null then
   raise exception 'GENUINE_INSTALL_ALREADY_RESERVED_NO_AUTOMATIC_RETRY';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'reality-goal-pub-v1:'||q.owner_id::text||':'||q.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id for update;
 select * into o from public.universe_events
 where event_id=q.original_work_event_id;
 if e.user_id is null or
    e.last_transition_event_id is distinct from q.goal_transition_event_id or
    o.epistemic_status<>'VERIFIED' or
    o.payload->>'original_job_completed' is distinct from 'false' or
    o.payload->>'owner_authorized_investigation' is distinct from 'true' or
    q.verified_frozen_reproduction->>'status'<>'ORIGINAL_FROZEN_REPRODUCED_RED'
 then raise exception 'GENUINE_INSTALL_CURRENT_GOAL_OR_RED_INVALID';end if;
 if exists(select 1 from public.universe_events v
  where v.continuity_root_id=o.continuity_root_id
   and v.worldline_id=o.worldline_id
   and v.epistemic_status='VERIFIED'
   and v.payload->>'original_work_id'=q.original_work_id
   and (v.payload->>'original_job_completed'='true'
    or v.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_INSTALL_ORIGINAL_ALREADY_SETTLED';end if;
 now_at:=clock_timestamp();
 update reality_internal.genuine_preview_install_approvals_v1
  set consumed_at=now_at,installer_run_id=p_run_id,
      installer_source_sha=p_runner_sha
  where trigger_id=p_trigger_id;
 return pg_catalog.jsonb_build_object(
  'status','AUTHORIZED_INSTALL_RESERVATION_CONSUMED_ONCE',
  'original_work_id',q.original_work_id,'trigger_id',p_trigger_id,
  'approval_id',p_approval_id,'artifact_sha256',p_artifact_hash,
  'runner_sha',p_runner_sha,'run_id',p_run_id,
  'reserved_at',now_at,
  'target_environment','ISOLATED_PREVIEW',
  'installation_verified',false,
  'original_job_completed',false,'production_changed',false);
end $$;
revoke all on function public.reality_reserve_approved_genuine_preview_v1(uuid,uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_reserve_approved_genuine_preview_v1(uuid,uuid,text,text,text)
 to service_role;