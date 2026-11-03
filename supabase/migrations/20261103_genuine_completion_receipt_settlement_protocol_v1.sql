-- The tested completion checker must reject premature settlement.
-- An independently observed final owner receipt is still required after this
-- exact original execution has been durably settled.
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
    not (
     (p_proof->>'observed_classification'='MISSING_CAPABILITY'
      and q.capability_id='reality-ci-failure-evidence')
     or
     (p_proof->>'observed_classification'='PRE_SETTLEMENT_DENIED'
      and p_proof->>'pre_settlement_denial_verified'='true'
      and q.capability_id='reality-general-execution-receipt'
      and exists (select 1 from public.universe_events orig
       where orig.event_id=q.original_work_event_id
         and orig.epistemic_status='VERIFIED'
         and orig.payload->>'original_work_id'=q.original_work_id
         and orig.payload->>'owner_id'=q.owner_id::text
         and orig.payload->>'source_path'=
           'src/reality-extensions/reality-general-execution-receipt.mjs'
         and orig.payload->>'frozen_test_path'=
           'test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js'
         and orig.payload->>'owner_authorized_installation'='false'
         and orig.payload->>'original_job_completed'='false'))
    ) or
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
end $function$

