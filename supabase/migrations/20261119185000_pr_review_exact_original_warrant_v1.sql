-- Reality #351: never execute a PR-review original from a maintenance-only warrant.
-- Historically two large draft PRs were admitted under an INTERNAL MAINTENANCE
-- shift and consumed pre-model attempts; neither can satisfy real original work.
DO $guard$ BEGIN
 IF position('from reality_internal.governed_employee_shifts_v1 s' in
     pg_get_functiondef('public.reality_claim_authorized_riley_pr_review_v1()'::regprocedure))=0
 OR position('t.proof->>''provider_status''=''OPEN_PULL_REQUEST''' in
     pg_get_functiondef('public.reality_claim_authorized_riley_pr_review_v1()'::regprocedure))=0
 THEN RAISE EXCEPTION 'PR_REVIEW_CLAIMER_DRIFT_FAIL_CLOSED'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.reality_claim_authorized_riley_pr_review_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v record; j reality_internal.riley_pr_review_originals_v1%rowtype;
 v_work text;
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVIEW_SERVICE_ROLE_REQUIRED'; end if;
 select s.shift_id,s.owner_id,t.source_ref,t.proof_sha256
 into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint
  and w.state='ACTIVE' and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
 join reality_internal.governed_employee_shift_steps_v1 t on t.shift_id=s.shift_id
 where s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
   and t.step_index between 2 and 5
   and t.state='SOURCE_CHECKED'
   and t.source_status='OPEN_PULL_REQUEST'
   and t.source_ref ~ '^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$'
   and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and t.proof->>'source_url'=t.source_ref
   and t.proof->>'provider_status'='OPEN_PULL_REQUEST'
   and t.proof->>'read_only'='true'
   and t.proof->>'production_changed'='false'
   -- Authorization is source-specific, not implied by any open shift.
   and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) item
    where item->>'source_ref'=t.source_ref
      and item->>'step_index'=t.step_index::text)
   -- Broad 'OPEN_PULL_REQUEST' is NOT sufficient for model-review work.
   -- Current provider evidence must identify a NON-DRAFT and contain a
   -- complete small bounded change set; partial snapshots stay read-only.
   and t.proof->'provider_evidence'->>'kind'='PULL_REQUEST_CHANGESET_OBSERVED'
   and t.proof->'provider_evidence'->>'draft'='false'
   and t.proof->'provider_evidence'->>'review_coverage'='BOUNDED_CHANGED_FILES_READ'
   and case when
      jsonb_typeof(t.proof->'provider_evidence'->'files')='array'
      and (t.proof->'provider_evidence'->>'changed_file_count')~'^[1-8]
   and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
   and (select count(*) from reality_internal.governed_employee_shift_steps_v1 x
      where x.shift_id=s.shift_id and x.step_index between 1 and 5 and x.state='SOURCE_CHECKED')=5
 order by s.authorized_at,t.step_index limit 1;
 if not found then return jsonb_build_object(
  'status','NO_SOURCE_CHECKED_OWNER_AUTHORIZED_PR_REVIEW',
  'installation_authorized',false,'production_changed',false); end if;
 v_work:='work:'||left(pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('reality:riley:pr-review-original-v1:'||v.owner_id::text||':'||
    v.shift_id::text||':'||v.source_ref||':'||v.proof_sha256,'UTF8')),'hex'),32);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_work));
 insert into reality_internal.riley_pr_review_originals_v1
   (shift_id,owner_id,original_work_id,source_ref,source_proof_sha256)
 values (v.shift_id,v.owner_id,v_work,v.source_ref,v.proof_sha256)
 on conflict (shift_id,source_ref) do nothing;
 select * into j from reality_internal.riley_pr_review_originals_v1
  where shift_id=v.shift_id and source_ref=v.source_ref for update;
 if j.original_work_id<>v_work or j.owner_id<>v.owner_id or
   j.source_proof_sha256<>v.proof_sha256 then
    raise exception 'RILEY_REVIEW_ORIGINAL_IDENTITY_CHANGED'; end if;
 -- Recover this SAME owner-bound original only when the previous worker
 -- exhausted PRE-PROVIDER attempts without even producing model bytes.
 -- A prepared, publishing, already-settled, or ambiguous-effect job
 -- can NEVER use this path, and the recovery is once-only.
 if j.phase='BLOCKED' and j.attempts>=6
   and j.preflight_recovery_count=0
   and j.model_response_id is null and j.source_head_sha is null
   and j.review_body is null and j.review_digest is null
   and j.provider_comment_id is null and j.provider_comment_url is null
   and j.settlement_receipt_id is null and j.independent_provider_digest is null
 then
  update reality_internal.riley_pr_review_originals_v1
  set phase='CLAIMED',attempts=0,preflight_recovery_count=1,
      updated_at=clock_timestamp()
  where original_work_id=j.original_work_id and phase='BLOCKED';
  select * into j from reality_internal.riley_pr_review_originals_v1
   where original_work_id=v_work for update;
 end if;
 if j.phase='CLAIMED' and j.attempts>=6 then
  update reality_internal.riley_pr_review_originals_v1
   set phase='BLOCKED',updated_at=clock_timestamp()
   where shift_id=j.shift_id and source_ref=j.source_ref;
  j.phase:='BLOCKED';
 elsif j.phase='CLAIMED' then
  -- Only an actual pre-model execution attempt consumes this bounded budget.
  -- PREPARED already has durable model bytes and is simply awaiting a
  -- preview-scoped GitHub publisher; PUBLISHING is an uncertain external
  -- effect that must be reconciled by GET, never by repeated POST.
  -- Neither state is a retry and neither may exhaust its original claim.
  update reality_internal.riley_pr_review_originals_v1
   set attempts=attempts+1,updated_at=clock_timestamp()
   where shift_id=j.shift_id and source_ref=j.source_ref;
 end if;
 return jsonb_build_object('status',
  case when j.phase='SETTLED' then 'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED'
       when j.phase='BLOCKED' then 'EXACT_PR_REVIEW_ORIGINAL_BLOCKED'
       else 'EXACT_OWNER_AUTHORIZED_PR_REVIEW_CLAIMED' end,
  'shift_id',j.shift_id,'owner_id',j.owner_id,'original_work_id',j.original_work_id,
  'claim_id',j.claim_id,'source_ref',j.source_ref,'source_proof_sha256',j.source_proof_sha256,
  'phase',j.phase,'source_head_sha',j.source_head_sha,
  'model_response_id',j.model_response_id,'review_body',j.review_body,
  'review_digest',j.review_digest,'provider_comment_id',j.provider_comment_id,
  'provider_comment_url',j.provider_comment_url,
  'settlement_receipt_id',j.settlement_receipt_id,
  'installation_authorized',false,'production_changed',false);
end $function$

    then pg_catalog.jsonb_array_length(t.proof->'provider_evidence'->'files')=
        (t.proof->'provider_evidence'->>'changed_file_count')::integer
    else false end
   and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
   and (select count(*) from reality_internal.governed_employee_shift_steps_v1 x
      where x.shift_id=s.shift_id and x.step_index between 1 and 5 and x.state='SOURCE_CHECKED')=5
 order by s.authorized_at,t.step_index limit 1;
 if not found then return jsonb_build_object(
  'status','NO_SOURCE_CHECKED_OWNER_AUTHORIZED_PR_REVIEW',
  'installation_authorized',false,'production_changed',false); end if;
 v_work:='work:'||left(pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('reality:riley:pr-review-original-v1:'||v.owner_id::text||':'||
    v.shift_id::text||':'||v.source_ref||':'||v.proof_sha256,'UTF8')),'hex'),32);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_work));
 insert into reality_internal.riley_pr_review_originals_v1
   (shift_id,owner_id,original_work_id,source_ref,source_proof_sha256)
 values (v.shift_id,v.owner_id,v_work,v.source_ref,v.proof_sha256)
 on conflict (shift_id,source_ref) do nothing;
 select * into j from reality_internal.riley_pr_review_originals_v1
  where shift_id=v.shift_id and source_ref=v.source_ref for update;
 if j.original_work_id<>v_work or j.owner_id<>v.owner_id or
   j.source_proof_sha256<>v.proof_sha256 then
    raise exception 'RILEY_REVIEW_ORIGINAL_IDENTITY_CHANGED'; end if;
 -- Recover this SAME owner-bound original only when the previous worker
 -- exhausted PRE-PROVIDER attempts without even producing model bytes.
 -- A prepared, publishing, already-settled, or ambiguous-effect job
 -- can NEVER use this path, and the recovery is once-only.
 if j.phase='BLOCKED' and j.attempts>=6
   and j.preflight_recovery_count=0
   and j.model_response_id is null and j.source_head_sha is null
   and j.review_body is null and j.review_digest is null
   and j.provider_comment_id is null and j.provider_comment_url is null
   and j.settlement_receipt_id is null and j.independent_provider_digest is null
 then
  update reality_internal.riley_pr_review_originals_v1
  set phase='CLAIMED',attempts=0,preflight_recovery_count=1,
      updated_at=clock_timestamp()
  where original_work_id=j.original_work_id and phase='BLOCKED';
  select * into j from reality_internal.riley_pr_review_originals_v1
   where original_work_id=v_work for update;
 end if;
 if j.phase='CLAIMED' and j.attempts>=6 then
  update reality_internal.riley_pr_review_originals_v1
   set phase='BLOCKED',updated_at=clock_timestamp()
   where shift_id=j.shift_id and source_ref=j.source_ref;
  j.phase:='BLOCKED';
 elsif j.phase='CLAIMED' then
  -- Only an actual pre-model execution attempt consumes this bounded budget.
  -- PREPARED already has durable model bytes and is simply awaiting a
  -- preview-scoped GitHub publisher; PUBLISHING is an uncertain external
  -- effect that must be reconciled by GET, never by repeated POST.
  -- Neither state is a retry and neither may exhaust its original claim.
  update reality_internal.riley_pr_review_originals_v1
   set attempts=attempts+1,updated_at=clock_timestamp()
   where shift_id=j.shift_id and source_ref=j.source_ref;
 end if;
 return jsonb_build_object('status',
  case when j.phase='SETTLED' then 'EXACT_PR_REVIEW_ORIGINAL_INDEPENDENTLY_SETTLED'
       when j.phase='BLOCKED' then 'EXACT_PR_REVIEW_ORIGINAL_BLOCKED'
       else 'EXACT_OWNER_AUTHORIZED_PR_REVIEW_CLAIMED' end,
  'shift_id',j.shift_id,'owner_id',j.owner_id,'original_work_id',j.original_work_id,
  'claim_id',j.claim_id,'source_ref',j.source_ref,'source_proof_sha256',j.source_proof_sha256,
  'phase',j.phase,'source_head_sha',j.source_head_sha,
  'model_response_id',j.model_response_id,'review_body',j.review_body,
  'review_digest',j.review_digest,'provider_comment_id',j.provider_comment_id,
  'provider_comment_url',j.provider_comment_url,
  'settlement_receipt_id',j.settlement_receipt_id,
  'installation_authorized',false,'production_changed',false);
end $function$;
REVOKE ALL ON FUNCTION public.reality_claim_authorized_riley_pr_review_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_authorized_riley_pr_review_v1() TO service_role;
