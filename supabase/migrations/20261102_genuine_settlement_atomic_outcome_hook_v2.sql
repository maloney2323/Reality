-- Atomically couple durable settlement with its own final Universe outcome.
CREATE OR REPLACE FUNCTION public.reality_settle_genuine_original_v1(p_trigger_id uuid, p_run_id bigint, p_proof jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
 receipt jsonb; ledger jsonb;
begin
 if current_user<>'service_role' then raise exception 'CONTINUATION_SETTLE_SERVICE_ROLE_REQUIRED';end if;
 select * into c from reality_internal.genuine_original_continuations_v1 where trigger_id=p_trigger_id for update;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1 where trigger_id=p_trigger_id for update;
 if c.state='SETTLED_ISOLATED' then
  if c.outcome_receipt->>'github_run_id'<>p_run_id::text then raise exception 'CONTINUATION_SETTLEMENT_CONFLICT'; end if;
  ledger:=public.reality_append_verified_genuine_original_outcome_v2(c.original_work_id);
  if ledger->>'status'<>'VERIFIED_UNIVERSE_SETTLED' then raise exception 'CONTINUATION_UNIVERSE_OUTCOME_MISSING';end if;
  return c.outcome_receipt||jsonb_build_object('universe_event_id',ledger->>'verified_event_id');
 end if;
 if c.state<>'RESUMPTION_CLAIMED' or q.phase<>'ISOLATED_INSTALLED_PROBATION' or
    c.claim_run_id<>p_run_id or q.original_work_id<>c.original_work_id or
    c.approval_id<>a.approval_id or c.installed_commit_sha<>a.installed_commit_sha or
    p_proof->>'original_work_id'<>c.original_work_id or
    p_proof->>'installed_commit_sha'<>c.installed_commit_sha or
    p_proof->>'artifact_sha256'<>c.artifact_sha256 or
    p_proof->>'github_run_id'<>p_run_id::text or
    p_proof->>'provider_resume_job_success'<>'true' or
    p_proof->>'provider_original_failure_verified'<>'true' or
    p_proof->>'isolated_original_acceptance_passed'<>'true' or
    p_proof->>'observed_classification'<>'MISSING_CAPABILITY' or
    p_proof->>'production_changed'<>'false' or
    p_proof->>'provider_outcome_digest' !~ '^[a-f0-9]{64}$' or
    a.settlement_receipt is not null then
  raise exception 'CONTINUATION_SETTLE_INDEPENDENT_PROVIDER_EVIDENCE_REQUIRED';
 end if;
 receipt:=jsonb_build_object(
  'status','SETTLED_ISOLATED','version','reality-original-job-independent-settlement-v1',
  'original_work_id',c.original_work_id,'trigger_id',c.trigger_id,
  'owner_approval_id',c.approval_id,'installed_commit_sha',c.installed_commit_sha,
  'artifact_sha256',c.artifact_sha256,'github_run_id',p_run_id,
  'provider_outcome_digest',p_proof->>'provider_outcome_digest',
  'provider_resume_job_success',true,'independent_outcome_verified',true,
  'original_job_completed',true,'production_changed',false,
  'full_probation_complete',false,
  'original_job_scope','ISOLATED_PREVIEW_ONLY',
  'settled_at',clock_timestamp());
 update reality_internal.genuine_original_continuations_v1
  set state='SETTLED_ISOLATED',outcome_receipt=receipt,settled_at=clock_timestamp()
  where trigger_id=p_trigger_id;
 update reality_internal.genuine_preview_install_approvals_v1
  set settlement_receipt=receipt where trigger_id=p_trigger_id;
 update reality_internal.genuine_capability_queue_v1
  set phase='SETTLED_ISOLATED',updated_at=clock_timestamp() where trigger_id=p_trigger_id;
 ledger:=public.reality_append_verified_genuine_original_outcome_v2(c.original_work_id);
 if ledger->>'status'<>'VERIFIED_UNIVERSE_SETTLED' then raise exception 'CONTINUATION_UNIVERSE_OUTCOME_MISSING';end if;
 return receipt||jsonb_build_object('universe_event_id',ledger->>'verified_event_id');
end $function$;

CREATE OR REPLACE FUNCTION public.reality_settle_and_reconcile_genuine_original_v1(p_trigger_id uuid, p_run_id bigint, p_proof jsonb, p_target_original_work_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
 target reality_internal.genuine_original_continuations_v1%rowtype;
 receipt jsonb; ledger jsonb; own_ledger jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_ATOMIC_SETTLEMENT_SERVICE_ROLE_ONLY';end if;
 if p_trigger_id is null or p_run_id<1 or
    p_target_original_work_id !~ '^work:[a-f0-9]{32}$' then
  raise exception 'GENUINE_ATOMIC_SETTLEMENT_EXACT_SCOPE_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=p_trigger_id for update;
 select * into c from reality_internal.genuine_original_continuations_v1
 where trigger_id=p_trigger_id for update;
 select * into target from reality_internal.genuine_original_continuations_v1
 where original_work_id=p_target_original_work_id;
 if q.trigger_id is null or q.capability_id<>'reality-continuity-settlement-reconciler'
 or a.approval_id is null or a.consumed_at is null or
    a.target_environment<>'ISOLATED_PREVIEW' or a.probation_status<>'ACTIVE'
 or q.owner_id<>target.owner_id or
    target.state<>'SETTLED_ISOLATED' or target.outcome_receipt->>'independent_outcome_verified'<>'true'
 or c.state<>'RESUMPTION_CLAIMED' or c.claim_run_id<>p_run_id or
    c.approval_id<>a.approval_id or c.installed_commit_sha<>a.installed_commit_sha
 or c.original_work_id<>q.original_work_id or
    c.original_work_id=p_target_original_work_id
 or q.phase<>'ISOLATED_INSTALLED_PROBATION'
 or p_proof->>'original_work_id'<>c.original_work_id
 or p_proof->>'reconciliation_target_original_work_id'<>p_target_original_work_id
 or p_proof->>'installed_commit_sha'<>c.installed_commit_sha
 or p_proof->>'artifact_sha256'<>c.artifact_sha256
 or p_proof->>'github_run_id'<>p_run_id::text
 or p_proof->>'observed_classification'<>'RECONCILIATION_REQUIRED'
 or p_proof->>'provider_resume_job_success'<>'true'
 or p_proof->>'provider_original_failure_verified'<>'true'
 or p_proof->>'isolated_original_acceptance_passed'<>'true'
 or p_proof->>'production_changed'<>'false'
 or coalesce(p_proof->>'provider_outcome_digest','') !~ '^[a-f0-9]{64}$'
 or a.settlement_receipt is not null
 then raise exception 'GENUINE_ATOMIC_SETTLEMENT_VERIFIED_APPROVAL_AND_PROOF_REQUIRED';end if;
 receipt:=jsonb_build_object(
  'status','SETTLED_ISOLATED',
  'version','reality-atomic-universe-reconciliation-original-v1',
  'original_work_id',c.original_work_id,'trigger_id',p_trigger_id,
  'owner_approval_id',c.approval_id,
  'artifact_sha256',c.artifact_sha256,
  'installed_commit_sha',c.installed_commit_sha,
  'github_run_id',p_run_id,
  'reconciliation_target_original_work_id',p_target_original_work_id,
  'provider_outcome_digest',p_proof->>'provider_outcome_digest',
  'provider_resume_job_success',true,
  'independent_outcome_verified',true,
  'original_job_completed',true,
  'production_changed',false,'full_probation_complete',false,
  'scope','ISOLATED_PREVIEW_ONLY','settled_at',clock_timestamp());
 update reality_internal.genuine_original_continuations_v1
 set state='SETTLED_ISOLATED',outcome_receipt=receipt,settled_at=clock_timestamp()
 where trigger_id=p_trigger_id;
 update reality_internal.genuine_preview_install_approvals_v1
 set settlement_receipt=receipt where trigger_id=p_trigger_id;
 update reality_internal.genuine_capability_queue_v1
 set phase='SETTLED_ISOLATED',updated_at=clock_timestamp() where trigger_id=p_trigger_id;
 -- Same transaction. The append RPC independently rechecks both approvals,
 -- exact same owner, prior provider settlement, and non-forked Universe tail.
 ledger:=public.reality_append_verified_genuine_universe_settlement_v1(
  p_trigger_id,p_target_original_work_id,p_run_id);
 if ledger->>'status'<>'PERSISTED_AWAITING_INDEPENDENT_READBACK' or
    ledger->>'repairing_work_id'<>c.original_work_id or
    ledger->>'original_work_id'<>p_target_original_work_id then
  raise exception 'GENUINE_ATOMIC_SETTLEMENT_LEDGER_NOT_COMMITTED';end if;
 own_ledger:=public.reality_append_verified_genuine_original_outcome_v2(c.original_work_id);
 if own_ledger->>'status'<>'VERIFIED_UNIVERSE_SETTLED' then raise exception 'REPAIR_UNIVERSE_OUTCOME_MISSING';end if;
 return receipt||jsonb_build_object(
  'repair_universe_event_id',own_ledger->>'verified_event_id',
  'universe_event_id',ledger->>'verified_event_id',
  'universe_readback_status','AWAITING_SEPARATE_INDEPENDENT_READBACK');
end $function$;
