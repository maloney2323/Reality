CREATE OR REPLACE FUNCTION public.reality_owner_approve_qualified_preview_v1(p_owner_id uuid, p_original_work_id text, p_artifact_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 t reality_internal.genuine_capability_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 approval reality_internal.genuine_preview_install_approvals_v1%rowtype;
 receipt jsonb;
 nonce uuid;
 now_at timestamptz;
begin
 if current_user <> 'service_role' then
  raise exception 'GENUINE_APPROVAL_SERVICE_BOUNDARY_REQUIRED'; end if;
 if p_owner_id is null or p_original_work_id !~ '^work:[a-f0-9]{32}$' or
  p_artifact_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'GENUINE_APPROVAL_EXACT_SCOPE_REQUIRED'; end if;
 select * into t from reality_internal.genuine_capability_queue_v1
 where owner_id=p_owner_id and original_work_id=p_original_work_id for update;
 -- A known provider-backed counterexample disqualified the earlier
 -- settlement reconciler even though its frozen synthetic suite passed.
 -- Require a NEW hash-matched independent live-evidence qualification before
 -- an owner can approve this capability family. This never creates approval.
 if t.trigger_id is not null and
    t.capability_id='reality-continuity-settlement-reconciler' and
    (t.qualification_receipt->>'real_provider_holdout_verified' is distinct from 'true' or
     t.qualification_receipt->>'real_provider_holdout_artifact_sha256' is distinct from p_artifact_hash)
 then raise exception 'GENUINE_APPROVAL_REAL_PROVIDER_REQUALIFICATION_REQUIRED'; end if;
 if t.trigger_id is null or
    t.phase <> 'AWAITING_OWNER_APPROVAL' or
    t.qualified_candidate is null or
    t.qualification_receipt is null or
    t.qualified_candidate->>'artifact_sha256' is distinct from p_artifact_hash or
    t.qualification_receipt->>'artifact_sha256' is distinct from p_artifact_hash or
    t.qualification_receipt->>'installation_authorized' is distinct from 'false' or
    t.qualification_receipt->>'original_job_completed' is distinct from 'false' or
    t.qualification_receipt->>'status' <> 'AWAITING_OWNER_APPROVAL' or
    t.verified_frozen_reproduction is null
 then raise exception 'GENUINE_APPROVAL_VERIFIED_UNINSTALLED_CANDIDATE_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||t.owner_id::text||':'||t.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=t.owner_id and conversation_id=t.conversation_id for update;
 select * into o from public.universe_events where event_id=t.original_work_event_id;
 if e.user_id is null or
    e.last_transition_event_id is distinct from t.goal_transition_event_id or
    o.epistemic_status<>'VERIFIED' or
    o.payload->>'owner_authorized_investigation' is distinct from 'true' or
    o.payload->>'owner_authorized_installation' is distinct from 'false' or
    o.payload->>'original_job_completed' is distinct from 'false' or
    o.payload->>'original_work_id' is distinct from t.original_work_id
 then raise exception 'GENUINE_APPROVAL_ORIGINAL_OWNER_GOAL_CHANGED';end if;
 if exists (select 1 from public.universe_events d
   where d.continuity_root_id=o.continuity_root_id and
    d.worldline_id=o.worldline_id and d.epistemic_status='VERIFIED' and
    d.payload->>'original_work_id'=t.original_work_id and
    (d.payload->>'original_job_completed'='true' or
     d.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_APPROVAL_ALREADY_SETTLED';end if;
 select * into approval from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=t.trigger_id for update;
 if approval.trigger_id is not null then
   if approval.owner_id is distinct from p_owner_id or
      approval.artifact_hash is distinct from p_artifact_hash or
      approval.original_work_id is distinct from p_original_work_id
   then raise exception 'GENUINE_APPROVAL_SINGLE_USE_CONFLICT';end if;
   return approval.approval_receipt;
 end if;
 nonce:=gen_random_uuid();
 now_at:=clock_timestamp();
 receipt:=pg_catalog.jsonb_build_object(
  'version','reality-genuine-exact-owner-approval-v1',
  'status','OWNER_APPROVED_ISOLATED_INSTALL_PENDING',
  'original_work_id',t.original_work_id,
  'trigger_id',t.trigger_id,
  'owner_id',t.owner_id,
  'approval_id',nonce,
  'artifact_sha256',p_artifact_hash,
  'qualification_source_hash',t.qualification_receipt->>'post_state_hash',
  'valid_time',o.effective_time,
  'transaction_time',now_at,
  'target_environment','ISOLATED_PREVIEW',
  'approval_origin','AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  'source_installation_completed',false,
  'original_job_completed',false,
  'production_changed',false);
 insert into reality_internal.genuine_preview_install_approvals_v1(
  trigger_id,owner_id,original_work_id,artifact_hash,approval_id,
  approved_at,valid_time,pre_state_hash,approval_receipt)
 values (t.trigger_id,t.owner_id,t.original_work_id,p_artifact_hash,nonce,
  now_at,o.effective_time,t.qualification_receipt->>'post_state_hash',receipt);
 return receipt;
end $function$
