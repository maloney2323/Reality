-- Service-role-only general owner-approved worker scope, historical #178 supported. A wake-up file cannot grant authority.
-- The GitHub OIDC broker must atomically grant the exact private lease first.
-- This function is SECURITY INVOKER and strictly service_role-only.
create or replace function public.reality_read_exact_approved_worker_scope_v1(
 p_reservation_id uuid, p_lease_id uuid, p_install_branch text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $reality$
declare
 q reality_internal.approved_repair_continuations_v1%rowtype;
 a reality_internal.general_repair_owner_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 w public.universe_events%rowtype;
 g public.universe_events%rowtype;
 n integer;
 n_outcomes integer;
begin
 if current_user <> 'service_role' then
  raise exception 'EXACT_WORKER_SCOPE_SERVICE_ROLE_REQUIRED';
 end if;
 if p_reservation_id is null or p_lease_id is null or
    p_install_branch is null or
    p_install_branch !~ '^feature/reality-[a-z0-9][a-z0-9/-]{5,105}$' or
    p_install_branch like '%..%' then
  raise exception 'EXACT_WORKER_SCOPE_INPUT_INVALID';
 end if;
 select * into q from reality_internal.approved_repair_continuations_v1
  where reservation_id=p_reservation_id and lease_id=p_lease_id
   and install_branch=p_install_branch and status='LEASED'
   and lease_until>now();
 if q.reservation_id is null then
  raise exception 'EXACT_WORKER_SCOPE_NO_ACTIVE_SIGNED_LEASE';
 end if;
 select * into a from reality_internal.general_repair_owner_approvals_v1
  where reservation_id=q.reservation_id and owner_id=q.owner_id
   and conversation_id=q.conversation_id and
   original_work_id=q.original_work_id and
   candidate_hash=q.candidate_hash and
   status in ('CLAIMED','INSTALLED') and claimed_at is not null;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=q.owner_id and conversation_id=q.conversation_id;
 if a.reservation_id is null or e.user_id is null or
    e.last_transition_event_id is distinct from a.goal_transition_event_id or
    (q.issue_number is null or q.issue_number<1 or q.issue_number>100000) then
  raise exception 'EXACT_WORKER_SCOPE_CURRENT_AUTHORITY_CHANGED';
 end if;
 select * into w from public.universe_events
  where event_id=a.original_work_event_id and
   provenance->>'principal_id'=q.owner_id::text and
   provenance->>'conversation_id'=q.conversation_id::text and
   payload->>'original_work_id'=q.original_work_id and
   payload->>'issue_url'=('https://github.com/maloney2323/Reality/issues/'||q.issue_number::text) and
   payload->>'original_goal_id'=a.goal_id and
   payload->>'goal_transition_receipt_ref'=a.goal_transition_event_id::text and
   payload->>'original_job_completed'='false' and
   ((entity_type='personal_first_self_upgrade_customer_work' and
      event_kind='WORK' and epistemic_status='OBSERVED' and
      q.issue_number=178 and payload->>'gap_provider_receipt_ref' ~ '^github:actions:run:[1-9][0-9]*:job:[1-9][0-9]*$')
    or
    (entity_type='reality_original_source_backed_repair_work' and
      event_kind='OBSERVATION' and epistemic_status='VERIFIED' and
      payload->>'owner_id'=q.owner_id::text and
      payload->>'goal_id'=a.goal_id and
      payload->>'owner_authorized_investigation'='true' and
      payload->>'owner_authorized_installation'='false' and
      payload->>'issue_number'=q.issue_number::text and
      payload->>'original_provider_failed_run_id' ~ '^[1-9][0-9]{0,17}$' and
      payload->>'frozen_test_sha256'=a.frozen_test_sha256 and
      payload->>'original_source_sha' ~ '^[0-9a-f]{40}$' and
      payload->>'source_path' ~ '^src/reality-extensions/[a-z0-9._/-]+[.]mjs$' and
      payload->>'frozen_test_path' ~ '^test/reality-frozen-regressions/[a-z0-9._/-]+[.]test[.]js$' and
      payload->>'provider_failure_evidence_hash' ~ '^[0-9a-f]{64}$'));
 select * into g from public.universe_events
  where event_id=a.goal_transition_event_id and
   entity_type='verification' and event_kind='VERIFICATION' and
   payload->>'event_type'='AUTHORITATIVE_USER_GOAL_TRANSITION' and
   payload->>'goal_id'=a.goal_id and
   payload->>'operation' in ('SET_ACTIVE','RESUME') and
   payload->>'goal_transition_authority_granted'='true' and
   payload->>'authorized_by'='AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND' and
   payload->>'principal_id'=q.owner_id::text and
   provenance->>'authenticated_user_id'=q.owner_id::text and
   provenance->>'source'='reality_authenticated_user_goal_command_adapter' and
   length(payload->>'server_issuer_hmac')=64 and
   payload->>'source_user_message_ref' ~
     '^supabase:reality_chat_messages:[0-9a-f-]{36}$' and
   payload->>'source_user_message_ref'=provenance->>'source_message_ref';
 if w.event_id is null or g.event_id is null or
    w.continuity_root_id is distinct from g.continuity_root_id then
  raise exception 'EXACT_WORKER_SCOPE_SOURCE_OR_SIGNED_GOAL_MISSING';
 end if;
 if w.entity_type='personal_first_self_upgrade_customer_work' then
 select count(*) into n from public.universe_events v
  where v.continuity_root_id=w.continuity_root_id and
   v.entity_type='personal_first_178_confirmed_gap' and
   v.event_kind='OBSERVATION' and v.epistemic_status='VERIFIED' and
   v.provenance->>'principal_id'=q.owner_id::text and
   v.provenance->>'conversation_id'=q.conversation_id::text and
   v.payload->>'original_work_id'=q.original_work_id and
   v.payload->>'original_source_receipt_ref'=w.event_id::text and
   v.payload->>'evidence_hash'=w.payload->>'gap_evidence_hash' and
   v.payload->>'provider_receipt_ref'=w.payload->>'gap_provider_receipt_ref';
 else
  n:=1; -- owner-verified generic source, GitHub independently rechecked later
 end if;
 if n<>1 then
  raise exception 'EXACT_WORKER_SCOPE_VERIFIED_ORIGINAL_GAP_REQUIRED';
 end if;
 -- An independent successful outcome is a required intermediate receipt,
 -- NOT the final constitutional or owner-approval settlement marker.
 -- Its presence must not prevent completing a previously resumed same job.
 select count(*) into n_outcomes from public.universe_events done
  where done.continuity_root_id=w.continuity_root_id and
   done.entity_type='reality_generic_verified_original_work_outcome' and
   done.event_kind='OBSERVATION' and
   done.epistemic_status='VERIFIED' and
   done.provenance->>'source'='reality-general-original-work-settlement-v1' and
   done.provenance->>'principal_id'=q.owner_id::text and
   done.payload->>'original_work_id'=q.original_work_id and
   done.payload->>'owner_id'=q.owner_id::text and
   done.payload->>'goal_id'=a.goal_id and
   done.payload->>'installed_commit_sha'=a.installed_commit_sha and
   done.payload->>'installed_artifact_hash'=a.candidate_hash and
   done.payload->>'independent_outcome_verified'='true' and
   done.payload->>'outcome'='SUCCEEDED' and
   done.payload->>'production_changed'='false';
 if n_outcomes>1 or
   (n_outcomes=1 and (a.status<>'INSTALLED' or
     a.installed_commit_sha is null)) then
   raise exception 'EXACT_WORKER_SCOPE_ORIGINAL_OUTCOME_CONFLICT';
 end if;
 return jsonb_build_object(
  'status','CURRENT_OWNER_GOAL_AND_WORK_VERIFIED',
  'reservation_id',q.reservation_id,'lease_id',q.lease_id,
  'owner_id',q.owner_id,'conversation_id',q.conversation_id,
  'original_work_id',q.original_work_id,'issue_number',q.issue_number,
  'candidate_hash',q.candidate_hash,'install_branch',q.install_branch,
  'original_work_event_id',w.event_id,
  'goal_id',a.goal_id,'goal_transition_event_id',a.goal_transition_event_id,
  'continuity_root_id',w.continuity_root_id,
  'goal_source_user_message_ref',g.payload->>'source_user_message_ref',
  'original_failed_run_id',case when
     w.entity_type='personal_first_self_upgrade_customer_work' then
      substring(w.payload->>'gap_provider_receipt_ref'
       from '^github:actions:run:([1-9][0-9]*):job:')::bigint
     else (w.payload->>'original_provider_failed_run_id')::bigint end,
  'frozen_test_path',case when
     w.entity_type='personal_first_self_upgrade_customer_work' then
       'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js'
     else w.payload->>'frozen_test_path' end,
  'frozen_test_sha256',a.frozen_test_sha256,
  'review_commit_sha',a.review_commit_sha,
  'production_changed',false, 'installation_performed',false,
  'settlement_recorded',false,
  'original_verified_outcome_observed',n_outcomes=1);
end
$reality$;

revoke all on function public.reality_read_exact_approved_worker_scope_v1(uuid,uuid,text)
 from public, anon, authenticated;
grant execute on function public.reality_read_exact_approved_worker_scope_v1(uuid,uuid,text)
 to service_role;
