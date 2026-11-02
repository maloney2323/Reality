create or replace function public.reality_read_consumed_genuine_preview_recovery_v1()
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
a reality_internal.genuine_preview_install_approvals_v1%rowtype;
e reality_internal.goal_publication_epochs%rowtype;
o public.universe_events%rowtype;
n integer;
begin
 if current_user<>'service_role' then raise exception 'GENUINE_RECOVERY_SERVICE_ONLY'; end if;
 select count(*) into n from reality_internal.genuine_preview_install_approvals_v1 z
 join reality_internal.genuine_capability_queue_v1 t on t.trigger_id=z.trigger_id
 where z.consumed_at is not null and z.installation_receipt is null and
 t.phase='AWAITING_OWNER_APPROVAL' and z.target_environment='ISOLATED_PREVIEW';
 if n=0 then return '{"status":"NO_CONSUMED_INSTALL_AWAITING_RECONCILIATION"}'::jsonb; end if;
 if n>1 then raise exception 'GENUINE_RECOVERY_AMBIGUOUS_ORIGINAL_JOB';end if;
 select t.* into q from reality_internal.genuine_capability_queue_v1 t
 join reality_internal.genuine_preview_install_approvals_v1 z on z.trigger_id=t.trigger_id
 where z.consumed_at is not null and z.installation_receipt is null and
 t.phase='AWAITING_OWNER_APPROVAL' and z.target_environment='ISOLATED_PREVIEW';
 select * into a from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=q.trigger_id;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id;
 select * into o from public.universe_events where event_id=q.original_work_event_id;
 if a.owner_id is distinct from q.owner_id or a.original_work_id is distinct from q.original_work_id or
 a.artifact_hash is distinct from q.qualified_candidate->>'artifact_sha256' or
 a.artifact_hash is distinct from q.qualification_receipt->>'artifact_sha256' or
 a.approval_receipt->>'approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION' or
 a.approval_receipt->>'target_environment'<>'ISOLATED_PREVIEW' or
 a.approval_receipt->>'original_job_completed'<>'false' or
 a.installer_run_id !~ '^[1-9][0-9]{7,17}$' or
 a.installer_source_sha !~ '^[a-f0-9]{40}$' or
 q.verified_frozen_reproduction is null or
 e.last_transition_event_id is distinct from q.goal_transition_event_id or
 o.epistemic_status<>'VERIFIED' or o.payload->>'owner_authorized_investigation'<>'true' or
 o.payload->>'original_job_completed'<>'false'
 then raise exception 'GENUINE_RECOVERY_EXACT_APPROVED_ORIGINAL_REQUIRED';end if;
 if exists(select 1 from public.universe_events v
 where v.continuity_root_id=o.continuity_root_id and v.worldline_id=o.worldline_id
 and v.epistemic_status='VERIFIED' and v.payload->>'original_work_id'=q.original_work_id and
 (v.payload->>'original_job_completed'='true' or v.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_RECOVERY_ORIGINAL_ALREADY_SETTLED';end if;
 return jsonb_build_object('status','CONSUMED_APPROVAL_RECOVERY_REQUIRED',
 'original_work_id',q.original_work_id,'trigger_id',q.trigger_id,'gap_event_id',q.gap_event_id,
 'approval_id',a.approval_id,'artifact_sha256',a.artifact_hash,
 'installer_run_id',a.installer_run_id,'installer_source_sha',a.installer_source_sha,
 'target_environment','ISOLATED_PREVIEW','production_changed',false,
 'original_job_completed',false);
end $$;
revoke all on function public.reality_read_consumed_genuine_preview_recovery_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_consumed_genuine_preview_recovery_v1()
 to service_role;