-- Independently tested, explicitly engineering-reviewed source is attached
-- to the already-authorized current Riley native original. No installation,
-- model authorship, approval, or customer settlement is invented here.
create or replace function public.reality_attest_current_reviewed_native_candidate_v1(
 p_owner_id uuid,p_shift_id uuid,p_original_work_id text,
 p_candidate_commit_sha text,p_artifact_sha256 text,p_passing_run_id bigint
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb;j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v reality_internal.riley_native_reviewed_candidate_proofs_v1%rowtype;
 n int;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE_REVIEWED_ATTEST_SERVICE_ONLY';end if;
 if p_owner_id is null or p_shift_id is null or
    p_original_work_id!~'^work:[a-f0-9]{32}$' or
    p_candidate_commit_sha!~'^[a-f0-9]{40}$' or
    p_artifact_sha256!~'^sha256:[a-f0-9]{64}$' or
    p_passing_run_id<10000 then
  raise exception 'NATIVE_REVIEWED_ATTEST_EXACT_INPUT_REQUIRED';end if;
 g:=public.reality_read_owner_shift_execution_graph_v1(p_owner_id,p_shift_id);
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' or
    g->>'owner_id'<>p_owner_id::text or
    g->>'shift_id'<>p_shift_id::text or
    g->>'completion_bound'<>'true' or
    g->>'installation_authorized'<>'false' or
    g->>'production_changed'<>'false' then
  raise exception 'NATIVE_REVIEWED_ATTEST_SIGNED_SHIFT_UNVERIFIED';end if;
 select count(*) into n from jsonb_array_elements(g->'jobs') item
 where item->>'original_work_id'=p_original_work_id
   and item->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
   and item->>'source_ref'='https://github.com/maloney2323/Reality/issues/263'
   and item->>'independent_source_proof_verified'='true'
   and item->>'phase' in ('SOURCE_ADMITTED',
    'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL');
 if n<>1 then
  raise exception 'NATIVE_REVIEWED_ATTEST_EXACT_ORIGINAL_NOT_ELIGIBLE';end if;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
 where original_work_id=p_original_work_id
  and shift_id=p_shift_id and owner_id=p_owner_id
  and issue_number=263
  and issue_url='https://github.com/maloney2323/Reality/issues/263'
 for update;
 if not found or j.phase not in ('SOURCE_ADMITTED',
      'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL') or
    j.installed is distinct from false or
    j.production_changed is distinct from false or
    j.exact_approval_receipt_ref is not null or
    j.original_settlement_receipt_ref is not null then
  raise exception 'NATIVE_REVIEWED_ATTEST_ORIGINAL_PREINSTALL_REQUIRED';end if;
 select * into v from reality_internal.riley_native_reviewed_candidate_proofs_v1
 where original_work_id=j.original_work_id and shift_id=j.shift_id
  and owner_id=j.owner_id and issue_url=j.issue_url
  and shift_source_proof_sha256=j.shift_source_proof_sha256
  and candidate_commit_sha=p_candidate_commit_sha
  and candidate_artifact_sha256=p_artifact_sha256
  and independent_passing_run_id=p_passing_run_id
  and independent_failing_run_id<>independent_passing_run_id
  and frozen_regressions_verified=true
  and provider_source_bytes_verified=true
  and provenance='CHATGPT_REVIEWED_ENGINEERING_PATCH_AFTER_REJECTED_MODEL_DRAFT'
  and owner_installation_authorized=false
  and installed=false and original_job_completed=false
  and production_changed=false;
 if not found then
  raise exception 'NATIVE_REVIEWED_ATTEST_PROVIDER_AND_FROZEN_PROOF_MISSING';end if;
 if j.phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' then
  if j.candidate_commit_sha<>p_candidate_commit_sha or
     j.candidate_artifact_sha256<>p_artifact_sha256 or
     j.independent_proof_run_id<>p_passing_run_id then
   raise exception 'NATIVE_REVIEWED_ATTEST_ALREADY_FROZEN_DIFFERENT_CANDIDATE';end if;
 else
  update reality_internal.riley_unattended_repair_originals_v1 set
    phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
    candidate_commit_sha=p_candidate_commit_sha,
    candidate_artifact_sha256=p_artifact_sha256,
    independent_proof_run_id=p_passing_run_id
  where original_work_id=p_original_work_id and
   owner_id=p_owner_id and shift_id=p_shift_id
   and phase='SOURCE_ADMITTED' and installed=false
   and production_changed=false and exact_approval_receipt_ref is null
  returning * into j;
  if not found then
   raise exception 'NATIVE_REVIEWED_ATTEST_ATOMIC_PHASE_CONFLICT';end if;
 end if;
 return jsonb_build_object(
  'status','NATIVE_TESTED_REVIEWED_CANDIDATE_RECORDED_INSTALL_NOT_AUTHORIZED',
  'shift_id',j.shift_id,'owner_id',j.owner_id,
  'original_work_id',j.original_work_id,
  'source_ref',j.issue_url,
  'source_proof_sha256',j.shift_source_proof_sha256,
  'provenance','CHATGPT_REVIEWED_ENGINEERING_PATCH_AFTER_REJECTED_MODEL_DRAFT',
  'candidate_commit_sha',j.candidate_commit_sha,
  'candidate_artifact_sha256',j.candidate_artifact_sha256,
  'independent_passing_run_id',j.independent_proof_run_id,
  'owner_approval_ready',false,
  'installation_authorized',false,
  'installed',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_attest_current_reviewed_native_candidate_v1(
 uuid,uuid,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reality_attest_current_reviewed_native_candidate_v1(
 uuid,uuid,text,text,text,bigint) to service_role;

create or replace function public.reality_read_owner_native_reviewed_patch_v1(
 p_owner_id uuid,p_shift_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb;v record;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE_REVIEWED_PATCH_SERVICE_ONLY';end if;
 if p_owner_id is null or p_shift_id is null then
  raise exception 'NATIVE_REVIEWED_PATCH_OWNER_AND_SHIFT_REQUIRED';end if;
 g:=public.reality_read_owner_shift_execution_graph_v1(p_owner_id,p_shift_id);
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' or
  g->>'owner_id'<>p_owner_id::text or g->>'shift_id'<>p_shift_id::text then
  return jsonb_build_object('status','NO_CURRENT_OWNER_NATIVE_REVIEWED_PATCH',
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);end if;
 select p.* into v from reality_internal.riley_native_reviewed_candidate_proofs_v1 p
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=p.original_work_id and j.owner_id=p.owner_id
  and j.shift_id=p.shift_id and j.issue_url=p.issue_url
  and j.shift_source_proof_sha256=p.shift_source_proof_sha256
  and j.phase in ('SOURCE_ADMITTED','CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL') and j.installed=false
  and (j.phase='SOURCE_ADMITTED' or
   (j.candidate_commit_sha=p.candidate_commit_sha and
    j.candidate_artifact_sha256=p.candidate_artifact_sha256 and
    j.independent_proof_run_id=p.independent_passing_run_id))
  and j.production_changed=false
 where p.owner_id=p_owner_id and p.shift_id=p_shift_id
   and exists(select 1 from jsonb_array_elements(g->'jobs') x
    where x->>'original_work_id'=p.original_work_id
     and x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
     and x->>'source_ref'=p.issue_url
     and x->>'source_proof_sha256'=p.shift_source_proof_sha256)
 limit 2;
 if not found then return jsonb_build_object(
  'status','NO_CURRENT_OWNER_NATIVE_REVIEWED_PATCH',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);end if;
 return jsonb_build_object(
  'status','EXACT_NATIVE_ENGINEERING_PATCH_INDEPENDENTLY_TESTED_REVIEW_ONLY',
  'owner_id',v.owner_id,'shift_id',v.shift_id,
  'original_work_id',v.original_work_id,'source_ref',v.issue_url,
  'source_proof_sha256',v.shift_source_proof_sha256,
  'source_file_path',v.source_file_path,
  'candidate_commit_sha',v.candidate_commit_sha,
  'candidate_artifact_sha256',v.candidate_artifact_sha256,
  'independent_passing_run_id',v.independent_passing_run_id,
  'independent_failing_run_id',v.independent_failing_run_id,
  'independent_run_url',v.independent_run_url,
  'provenance',v.provenance,'verified_at',v.verified_at,
  'native_install_to_settlement_accepted',false,
  'owner_approval_ready',false,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;

create or replace function public.reality_read_owner_shift_execution_graph_v1(
 p_owner_id uuid,p_shift_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 v_shift record;v_step record;v_count int:=0;v_items jsonb:='[]'::jsonb;
 v_source text;v_work text;v_phase text;v_kind text;v_next text;
 v_source_count int;v_matches int;v_verified boolean;
begin
 if current_user<>'service_role' then
  raise exception 'UNIFIED_SHIFT_EXECUTION_SERVICE_ONLY';end if;
 if p_owner_id is null or p_shift_id is null then
  raise exception 'UNIFIED_SHIFT_OWNER_AND_BATCH_REQUIRED';end if;
 select s.*,w.source_scope,w.state as warrant_state into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint
 where s.shift_id=p_shift_id and s.owner_id=p_owner_id
  and s.authorized_at is not null and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at='infinity'::timestamptz
  and s.closed_at is null
  and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.state='ACTIVE';
 if not found then return jsonb_build_object(
  'status','NO_ACTIVE_OWNER_BOUND_EXECUTION_GRAPH',
  'shift_id',p_shift_id,'jobs','[]'::jsonb,
  'new_job_created',false,'installation_authorized',false,
  'production_changed',false);end if;
 v_source_count:=jsonb_array_length(v_shift.source_scope);
 if v_source_count<1 or v_source_count>4 then
  raise exception 'UNIFIED_SHIFT_WORK_SCOPE_SIZE_INVALID';end if;
 for v_step in
  select t.step_index,t.source_ref,t.source_status,t.state,
   t.proof_sha256,t.proof
  from reality_internal.governed_employee_shift_steps_v1 t
  where t.shift_id=v_shift.shift_id and t.step_index between 2 and 5
   and t.source_ref is not null
  order by t.step_index
 loop
  v_count:=v_count+1;
  v_source:=v_step.source_ref;
  if not exists(select 1 from jsonb_array_elements(v_shift.source_scope) x
    where (x->>'step_index')::int=v_step.step_index
      and x->>'source_ref'=v_source) then
   raise exception 'UNIFIED_SHIFT_FROZEN_SOURCE_FINGERPRINT_CHANGED';end if;
  v_verified:=v_step.state='SOURCE_CHECKED'
   and v_step.proof_sha256~'^sha256:[a-f0-9]{64}$'
   and v_step.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and v_step.proof->>'source_url'=v_source
   and v_step.proof->>'provider_checked'='true'
   and v_step.proof->>'read_only'='true'
   and v_step.proof->>'production_changed'='false'
   and v_step.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_step.proof::text,'UTF8')),'hex');
  if not v_verified then
   v_kind:='UNVERIFIED_SOURCE';v_work:=null;
   v_phase:=v_step.state;v_next:='VERIFY_SOURCE_BEFORE_ANY_EXECUTION';
  elsif v_source~'^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$' then
   select count(*),min(a.original_work_id),min(a.phase)
   into v_matches,v_work,v_phase
   from reality_internal.riley_pr_review_originals_v1 a
   where a.shift_id=v_shift.shift_id and a.owner_id=v_shift.owner_id
    and a.source_ref=v_source
    and a.source_proof_sha256=v_step.proof_sha256;
   if v_matches>1 then raise exception 'UNIFIED_PR_ORIGINAL_AMBIGUOUS';end if;
   v_kind:='REAL_PR_REVIEW_ORIGINAL';
   v_next:=case when v_matches=0 then 'ADMIT_ONE_VERIFIED_PR_REVIEW'
     when v_phase='SETTLED' then 'INDEPENDENT_FINAL_PR_RECEIPT_READBACK'
     when v_phase='PREPARED' then 'CONTINUE_VERIFIED_PR_REVIEW'
     else 'READ_CURRENT_PR_REVIEW_PROVIDER_EFFECT' end;
  elsif v_source='https://github.com/maloney2323/Reality/issues/263' then
   select count(*),min(j.original_work_id),min(j.phase)
   into v_matches,v_work,v_phase
   from reality_internal.riley_unattended_repair_originals_v1 j
   where j.shift_id=v_shift.shift_id and j.owner_id=v_shift.owner_id
    and j.issue_url=v_source and j.issue_number=263
    and j.shift_source_proof_sha256=v_step.proof_sha256
    and j.production_changed=false;
   if v_matches>1 then raise exception 'UNIFIED_REPAIR_ORIGINAL_AMBIGUOUS';end if;
   v_kind:='REAL_ENGINEERING_REPAIR_ORIGINAL';
   v_next:=case when v_matches=0 then 'ADMIT_VERIFIED_CURRENT_REPAIR'
    when v_phase='SOURCE_ADMITTED' then 'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR'
    when v_phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
     then 'VERIFY_NATIVE_INSTALL_AND_RESUME_PATH_BEFORE_OWNER_APPROVAL'
    when v_phase='SETTLED' then 'VERIFY_DURABLE_ORIGINAL_FINAL_RECEIPT'
    else 'RECONCILE_CURRENT_REPAIR_WITHOUT_REPLAY' end;
  else
   select count(*),min(q.original_work_id),min(q.phase)
   into v_matches,v_work,v_phase
   from reality_internal.genuine_capability_queue_v1 q
   join public.universe_events orig on orig.event_id=q.original_work_event_id
    and orig.epistemic_status='VERIFIED'
    and orig.payload->>'owner_id'=v_shift.owner_id::text
    and orig.payload->>'original_work_id'=q.original_work_id
    and orig.payload->>'issue_number'=pg_catalog.split_part(v_source,'/issues/',2)
   where q.owner_id=v_shift.owner_id;
   if v_matches>1 then raise exception 'UNIFIED_UNIVERSE_ORIGINAL_AMBIGUOUS';end if;
   v_kind:=case when v_matches=1 then 'GENUINE_UNIVERSE_CAPABILITY_ORIGINAL'
    else 'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL' end;
   v_next:=case when v_matches=1 then
     'EXECUTE_ONLY_WITH_CURRENT_UNIVERSE_GOAL_AND_INDEPENDENT_FROZEN_PROOF'
    else 'QUALIFY_DISTINCT_OWNER_WORK_NO_FAKE_JOB' end;
  end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object(
   'source_step_index',v_step.step_index,'source_ref',v_source,
   'source_proof_sha256',v_step.proof_sha256,
   'independent_source_proof_verified',v_verified,
   'original_kind',v_kind,'original_work_id',v_work,
   'phase',coalesce(v_phase,'NOT_ADMITTED'),
   'next_governed_action',v_next,
   'capability_installation_authorized',false,
   'original_job_completed_by_graph',false,
   'provider_effect_claimed_by_graph',false));
 end loop;
 if v_count<>v_source_count then
  raise exception 'UNIFIED_SHIFT_SELECTED_SOURCE_COUNT_CHANGED';end if;
 return jsonb_build_object(
  'status','OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
  'shift_id',v_shift.shift_id,'owner_id',v_shift.owner_id,
  'plan_fingerprint',v_shift.plan_fingerprint,
  'completion_bound',true,'selected_sources',v_count,
  'jobs',v_items,'execution_scope_from_owner_warrant_only',true,
  'new_job_created',false,'installation_authorized',false,
  'original_job_completed_by_graph',false,
  'production_changed',false);
end $fn$;
