-- Source-bound bridge from a new observed shift continuity incident into the
-- EXISTING original-repair independent CI + exact authenticated approval path.
-- Read-only: it never grants a warrant or creates a repair on a model claim.
create or replace function public.reality_read_owner_shift_repair_install_gates_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'SHIFT_REPAIR_INSTALL_GATE_OWNER_SERVICE_REQUIRED';
 end if;
 with evidence as(
  select i.*,
   inquiry.source_ref as stalled_source_ref,
   job.original_work_id as authorized_original_work_id,
   job.phase as original_phase,
   job.installed as original_installed,
   attempt.attempt_id as candidate_attempt_id,
   attempt.phase as candidate_phase,
   attempt.ci_conclusion,
   attempt.ci_run_id,
   attempt.candidate_staged_commit_sha,
   attempt.proposed_source_sha256,
   review.phase as install_review_phase,
   review.independent_frozen_run_id,
   review.integrated_test_run_id,
   review.candidate_commit_sha as reviewed_commit_sha,
   review.candidate_artifact_sha256 as reviewed_artifact_sha256,
   review.approval_receipt_id,
   review.installed_commit_sha,
   review.original_final_receipt_id,
   coalesce(warrant.active,false) as current_completion_warrant
  from (
   select * from reality_internal.owner_shift_continuity_incidents_v1
   where owner_id=p_owner_id order by first_detected_at desc limit 8
  ) i
  left join reality_internal.employee_temporal_inquiries_v1 inquiry
   on inquiry.claim_id=i.source_claim_id and inquiry.owner_id=i.owner_id
  left join lateral(
   select j.original_work_id,j.phase,j.installed
   from reality_internal.riley_unattended_repair_originals_v1 j
   where j.owner_id=i.owner_id and j.shift_id=i.shift_id
    and j.issue_url=inquiry.source_ref
    and j.original_work_id ~ '^work:[a-f0-9]{32}$'
   limit 1
  ) job on true
  left join lateral(
   select a.attempt_id,a.phase,a.ci_conclusion,a.ci_run_id,
    a.candidate_staged_commit_sha,a.proposed_source_sha256
   from reality_internal.riley_same_original_recovery_attempts_v2 a
   where a.owner_id=i.owner_id and a.shift_id=i.shift_id
    and a.original_work_id=job.original_work_id
   order by a.attempt_number desc limit 1
  ) attempt on true
  left join reality_internal.governed_original_install_reviews_v1 review
   on review.owner_id=i.owner_id and review.shift_id=i.shift_id
    and review.original_work_id=job.original_work_id
    and review.attempt_id=attempt.attempt_id
  left join lateral(
   select true as active from
    reality_internal.governed_employee_shifts_v1 s
   join reality_internal.governed_employee_completion_warrants_v1 w
    on w.shift_id=s.shift_id and w.owner_id=s.owner_id
     and w.plan_fingerprint=s.plan_fingerprint
   where s.shift_id=i.shift_id and s.owner_id=i.owner_id
    and s.closed_at is null and s.authorized_at is not null
    and s.planned_start_at<=clock_timestamp()
    and s.planned_end_at='infinity'::timestamptz
    and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
    and w.state='ACTIVE'
   limit 1
  ) warrant on true
 ), gates as(
 select e.*,
  case
   when e.phase='RECOVERED_AFTER_OBSERVATION' then
    'WORK_RESUMED_CODE_SELF_REPAIR_NOT_PROVEN'
   when e.phase in ('DETECTED','INVESTIGATION_CLAIMED') then
    'INCIDENT_REQUIRES_SOURCE_BACKED_DIAGNOSIS'
   when e.phase='BLOCKED_NEEDS_EVIDENCE' then
    'INCIDENT_INVESTIGATION_EVIDENCE_BLOCKED'
   when e.authorized_original_work_id is null then
    'EXACT_ORIGINAL_REPAIR_WARRANT_REQUIRED'
   when e.current_completion_warrant=false then
    'CURRENT_EXACT_COMPLETION_WARRANT_REQUIRED'
   when e.candidate_attempt_id is null or
    e.candidate_phase<>'CI_PASSED' or
    e.ci_conclusion<>'success' or
    e.ci_run_id is null or
    e.candidate_staged_commit_sha !~ '^[a-f0-9]{40}$' or
    e.proposed_source_sha256 !~ '^sha256:[a-f0-9]{64}$'
    then 'INDEPENDENT_REPAIR_CI_NOT_YET_PASSED'
   when e.install_review_phase is null or
    e.independent_frozen_run_id<>e.ci_run_id or
    e.integrated_test_run_id is null or
    e.reviewed_commit_sha<>e.candidate_staged_commit_sha or
    e.reviewed_artifact_sha256<>e.proposed_source_sha256 then
    'INDEPENDENT_INTEGRATION_AND_FROZEN_REVIEW_REQUIRED'
   when e.install_review_phase='READY_FOR_EXACT_OWNER_APPROVAL'
    and e.approval_receipt_id is null then
    'OWNER_EXACT_TESTED_ARTIFACT_APPROVAL_REQUIRED'
   when e.install_review_phase='OWNER_APPROVED'
    and e.approval_receipt_id is not null and
    e.installed_commit_sha is null then
    'EXACT_OWNER_APPROVED_INSTALL_CONTINUATION_ELIGIBLE'
   when e.installed_commit_sha ~ '^[a-f0-9]{40}$' and
    e.original_final_receipt_id is null then
    'INSTALLED_ORIGINAL_INDEPENDENT_SETTLEMENT_PENDING'
   when e.installed_commit_sha ~ '^[a-f0-9]{40}$' and
    e.original_final_receipt_id is not null then
    'EXACT_ORIGINAL_SETTLED_AFTER_TESTED_INSTALL'
   else 'EXACT_REPAIR_APPROVAL_OR_PROVIDER_EVIDENCE_UNVERIFIED'
  end as gate_status
 from evidence e
 )
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',g.incident_id,'shift_id',g.shift_id,
  'incident_phase',g.phase,'source_kind',g.kind,
  'incident_evidence_sha256',g.evidence_sha256,
  'stalled_source_ref',g.stalled_source_ref,
  'authorized_original_work_id',g.authorized_original_work_id,
  'current_completion_warrant',g.current_completion_warrant,
  'test_attempt_id',g.candidate_attempt_id,
  'independent_ci_conclusion',g.ci_conclusion,
  'independent_ci_run_id',g.ci_run_id,
  'candidate_commit_sha',g.candidate_staged_commit_sha,
  'candidate_artifact_sha256',g.proposed_source_sha256,
  'integration_ci_run_id',g.integrated_test_run_id,
  'install_review_phase',g.install_review_phase,
  'previous_exact_approval_receipt_id',g.approval_receipt_id,
  'previous_installed_commit_sha',g.installed_commit_sha,
  'original_final_receipt_id',g.original_final_receipt_id,
  'gate_status',g.gate_status,
  'next_action',case g.gate_status
   when 'INCIDENT_REQUIRES_SOURCE_BACKED_DIAGNOSIS' then
    'Reality must independently investigate the recorded stall before it can claim a missing capability or produce a tested code candidate.'
   when 'INCIDENT_INVESTIGATION_EVIDENCE_BLOCKED' then
    'The exact source or model proof is unavailable. Preserve this incident and obtain the missing evidence.'
   when 'EXACT_ORIGINAL_REPAIR_WARRANT_REQUIRED' then
    'No existing source-matched owner-authorized original repair job is linked. The model proposal alone cannot create an install warrant.'
   when 'CURRENT_EXACT_COMPLETION_WARRANT_REQUIRED' then
    'An original source exists, but its time-bounded shift is not a current owner completion warrant. Do not reuse historical approval.'
   when 'INDEPENDENT_REPAIR_CI_NOT_YET_PASSED' then
    'Produce an isolated source candidate and verify a genuine red-to-green independent CI run on the exact original before seeking approval.'
   when 'INDEPENDENT_INTEGRATION_AND_FROZEN_REVIEW_REQUIRED' then
    'Independently verify candidate integration and source bytes against the original frozen failure and specific CI run.'
   when 'OWNER_EXACT_TESTED_ARTIFACT_APPROVAL_REQUIRED' then
    'Present the exact commit and artifact digest in authenticated owner approval UI. A Chat prompt cannot substitute for the specific signed approval.'
   when 'EXACT_OWNER_APPROVED_INSTALL_CONTINUATION_ELIGIBLE' then
    'Allow the existing single-use signed installer to claim exactly this approved artifact; independently verify deployment and original settlement afterward.'
   when 'INSTALLED_ORIGINAL_INDEPENDENT_SETTLEMENT_PENDING' then
    'Read back the installed source commit and independently verify the original work completed before final settlement.'
   when 'EXACT_ORIGINAL_SETTLED_AFTER_TESTED_INSTALL' then
    'Existing original has independent final settlement; do not replay a successful installation.'
   when 'WORK_RESUMED_CODE_SELF_REPAIR_NOT_PROVEN' then
    'The original inquiry resumed, but this does not independently verify a new code repair or authorize installation.'
   else 'Stop at the exact unverified repair or installation gate.'
  end,
  'read_only',true,'new_job_authorized',false,
  'installation_authorized_by_read',false,
  'production_changed',false,'new_self_repair_proven',false
 ) order by g.first_detected_at desc),'[]'::jsonb)
 into items from gates g;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SHIFT_REPAIR_INSTALL_GATES_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,
  'read_only',true,'count',pg_catalog.jsonb_array_length(items),
  'items',items,
  'new_original_job_created',false,
  'installation_authorized_by_read',false,
  'production_changed',false,
  'new_self_repair_proven',false
 );
end $fn$;
revoke all on function public.reality_read_owner_shift_repair_install_gates_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_shift_repair_install_gates_v1(uuid)
 to service_role;
