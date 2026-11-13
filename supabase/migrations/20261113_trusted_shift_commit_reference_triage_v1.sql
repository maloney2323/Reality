-- Source-bound commit reference triage for the existing signed employee shift.
-- It is not a new shift, a capability install, a GitHub write, or settlement.
-- Only the trusted service worker can admit and independently record evidence.
create table if not exists reality_internal.riley_commit_reference_triage_originals_v1 (
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 original_work_id text primary key check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_ref text not null check(source_ref ~
  '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'),
 source_proof_sha256 text not null check(source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 commit_sha text not null check(commit_sha ~ '^[a-f0-9]{40}$'),
 issue_body_sha256 text not null check(issue_body_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 commit_content_sha256 text not null check(commit_content_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 phase text not null default 'SOURCE_ADMITTED'
  check(phase in ('SOURCE_ADMITTED','EVIDENCE_VERIFIED','BLOCKED')),
 evidence_verified_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 production_changed boolean not null default false check(production_changed=false),
 unique(shift_id,source_ref)
);
alter table reality_internal.riley_commit_reference_triage_originals_v1 enable row level security;
revoke all on reality_internal.riley_commit_reference_triage_originals_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_commit_reference_triage_originals_v1
 to service_role;

create or replace function public.reality_admit_verified_shift_commit_triage_v1(
 p_source_ref text,p_source_proof_sha256 text,p_commit_sha text,
 p_issue_body_sha256 text,p_commit_content_sha256 text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record; j reality_internal.riley_commit_reference_triage_originals_v1%rowtype;
 v_work text;v_matches int;v_shift_id uuid;
begin
 if current_user<>'service_role' then
  raise exception 'COMMIT_TRIAGE_ADMISSION_SERVICE_ONLY';end if;
 if p_source_ref !~ '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$' or
  p_source_proof_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  p_commit_sha !~ '^[a-f0-9]{40}$' or
  p_issue_body_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  p_commit_content_sha256 !~ '^sha256:[a-f0-9]{64}$'
 then raise exception 'COMMIT_TRIAGE_INDEPENDENT_SOURCE_REQUIRED';end if;
 -- No user-supplied owner/shift: derive sole active completion-bound warrant.
 select count(*),min(shift_row.shift_id::text)::uuid into v_matches,v_shift_id
 from reality_internal.governed_employee_shifts_v1 shift_row
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=shift_row.shift_id and w.owner_id=shift_row.owner_id
  and w.plan_fingerprint=shift_row.plan_fingerprint
 join reality_internal.governed_employee_shift_steps_v1 t
  on t.shift_id=shift_row.shift_id and t.source_ref=p_source_ref
 where shift_row.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and shift_row.authorized_at is not null and shift_row.closed_at is null
  and shift_row.planned_start_at<=clock_timestamp()
  and shift_row.planned_end_at='infinity'::timestamptz
  and w.state='ACTIVE'
  and exists(select 1 from jsonb_array_elements(w.source_scope) x
   where x->>'source_ref'=p_source_ref
    and (x->>'step_index')::int=t.step_index)
  and t.step_index between 2 and 5
  and t.state='SOURCE_CHECKED' and t.source_status='OPEN_ISSUE'
  and t.proof_sha256=p_source_proof_sha256
  and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
  and t.proof->>'source_url'=p_source_ref
  and t.proof->>'provider_status'='OPEN_ISSUE'
  and t.proof->>'provider_checked'='true'
  and t.proof->>'read_only'='true'
  and t.proof->>'production_changed'='false'
  and t.proof_sha256='sha256:'||pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
  and t.proof->>'source_title' ~ '^Review needed: commit [a-f0-9]{7,40} lacks issue reference$'
  and pg_catalog.strpos(
   coalesce(t.proof->'provider_evidence'->>'body_excerpt',''),
   'https://github.com/maloney2323/Reality/commit/'||p_commit_sha)>0
  and pg_catalog.strpos(
   coalesce(t.proof->'provider_evidence'->>'body_excerpt',''),
   'Please associate this commit')>0;
 if v_matches=0 then return jsonb_build_object(
  'status','NO_CURRENT_FROZEN_COMMIT_TRIAGE_SOURCE_TO_ADMIT',
  'original_job_admitted',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
 end if;
 if v_matches<>1 then raise exception 'COMMIT_TRIAGE_MULTIPLE_WARRANT_AMBIGUITY';end if;
 -- Re-read the exact owner and fingerprint under the service transaction.
 select q.shift_id,q.owner_id,q.plan_fingerprint into s
 from reality_internal.governed_employee_shifts_v1 q
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=q.shift_id and w.owner_id=q.owner_id
  and w.plan_fingerprint=q.plan_fingerprint and w.state='ACTIVE'
 where q.shift_id=v_shift_id and q.closed_at is null
  and q.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 for update of q;
 if not found then raise exception 'COMMIT_TRIAGE_WARRANT_CHANGED';end if;
 -- A source already owned by the native repair or Universe original engine
 -- must never be reminted merely because a newer commit-triage adapter exists.
 if exists(select 1 from reality_internal.riley_unattended_repair_originals_v1 r
   where r.owner_id=s.owner_id and r.issue_url=p_source_ref)
   or exists(select 1 from reality_internal.genuine_capability_queue_v1 q
     join public.universe_events e on e.event_id=q.original_work_event_id
     where q.owner_id=s.owner_id
      and e.payload->>'owner_id'=s.owner_id::text
      and e.payload->>'issue_number'=
       pg_catalog.split_part(p_source_ref,'/issues/',2))
 then raise exception 'COMMIT_TRIAGE_PRIOR_ORIGINAL_REQUIRES_RECONCILIATION';end if;
 v_work:='work:'||left(pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(
   'reality:shift-commit-triage:v1:'||s.owner_id::text||':'||
   s.shift_id::text||':'||p_source_ref||':'||
   p_source_proof_sha256||':'||p_commit_sha||':'||s.plan_fingerprint,
   'UTF8')),'hex'),32);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_work));
 insert into reality_internal.riley_commit_reference_triage_originals_v1(
  shift_id,owner_id,original_work_id,source_ref,source_proof_sha256,
  commit_sha,issue_body_sha256,commit_content_sha256)
 values(s.shift_id,s.owner_id,v_work,p_source_ref,p_source_proof_sha256,
  p_commit_sha,p_issue_body_sha256,p_commit_content_sha256)
 on conflict(shift_id,source_ref) do nothing;
 select * into j
 from reality_internal.riley_commit_reference_triage_originals_v1
 where shift_id=s.shift_id and source_ref=p_source_ref for update;
 if not found or j.owner_id<>s.owner_id or j.original_work_id<>v_work or
  j.source_proof_sha256<>p_source_proof_sha256 or
  j.commit_sha<>p_commit_sha or
  j.issue_body_sha256<>p_issue_body_sha256 or
  j.commit_content_sha256<>p_commit_content_sha256
 then raise exception 'COMMIT_TRIAGE_PRIOR_ORIGINAL_SOURCE_CHANGED';end if;
 return jsonb_build_object(
  'status','EXACT_OWNER_SHIFT_COMMIT_TRIAGE_ORIGINAL_ADMITTED',
  'shift_id',j.shift_id,'owner_id',j.owner_id,
  'original_work_id',j.original_work_id,'source_ref',j.source_ref,
  'source_proof_sha256',j.source_proof_sha256,'commit_sha',j.commit_sha,
  'phase',j.phase,'original_job_admitted',true,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_admit_verified_shift_commit_triage_v1(
 text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_admit_verified_shift_commit_triage_v1(
 text,text,text,text,text) to service_role;

create or replace function public.reality_record_verified_shift_commit_triage_v1(
 p_original_work_id text,p_commit_sha text,
 p_issue_body_sha256 text,p_commit_content_sha256 text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare j reality_internal.riley_commit_reference_triage_originals_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'COMMIT_TRIAGE_EVIDENCE_SERVICE_ONLY';end if;
 select * into j from reality_internal.riley_commit_reference_triage_originals_v1
 where original_work_id=p_original_work_id for update;
 if not found or j.phase not in ('SOURCE_ADMITTED','EVIDENCE_VERIFIED') or
  j.commit_sha<>p_commit_sha or
  j.issue_body_sha256<>p_issue_body_sha256 or
  j.commit_content_sha256<>p_commit_content_sha256 or
  not exists(select 1 from reality_internal.governed_employee_shifts_v1 s
   join reality_internal.governed_employee_completion_warrants_v1 w
    on w.shift_id=s.shift_id and w.owner_id=s.owner_id
    and w.plan_fingerprint=s.plan_fingerprint
   where s.shift_id=j.shift_id and s.owner_id=j.owner_id
    and s.closed_at is null and w.state='ACTIVE'
    and s.planned_end_at='infinity'::timestamptz)
 then raise exception 'COMMIT_TRIAGE_EXACT_CURRENT_EVIDENCE_REQUIRED';end if;
 if j.phase='SOURCE_ADMITTED' then
  update reality_internal.riley_commit_reference_triage_originals_v1
  set phase='EVIDENCE_VERIFIED',evidence_verified_at=clock_timestamp()
  where original_work_id=j.original_work_id;
 end if;
 return jsonb_build_object(
  'status','EXACT_SHIFT_COMMIT_TRIAGE_PROVIDER_EVIDENCE_RECORDED',
  'shift_id',j.shift_id,'original_work_id',j.original_work_id,
  'source_ref',j.source_ref,'commit_sha',j.commit_sha,
  'phase','EVIDENCE_VERIFIED','independent_provider_readback_verified',true,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_record_verified_shift_commit_triage_v1(
 text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_verified_shift_commit_triage_v1(
 text,text,text,text) to service_role;

-- Rebind one existing service-only projection; do not redefine the executor,
-- install any capability, or reinterpret other source types.

-- One owner-bound execution graph for every original source in a completion-bound shift.
-- Existing genuine Universe originals and source-native Riley originals coexist
-- without inventing an authoritative goal transition or duplicating work IDs.
-- Read-only service-role projection, never creates a claim/job/approval/receipt.
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
  elsif v_source~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$' then
   -- A source-checked issue does NOT become a code repair by inference.
   -- Reconcile only an already admitted, exact shift/source-proof original.
   select count(*),min(j.original_work_id),min(j.phase)
   into v_matches,v_work,v_phase
   from reality_internal.riley_unattended_repair_originals_v1 j
   where j.shift_id=v_shift.shift_id and j.owner_id=v_shift.owner_id
    and j.issue_url=v_source
    and j.issue_number=pg_catalog.split_part(v_source,'/issues/',2)::int
    and j.shift_source_proof_sha256=v_step.proof_sha256
    and j.production_changed=false;
   if v_matches>1 then raise exception 'UNIFIED_REPAIR_ORIGINAL_AMBIGUOUS';end if;
   if v_matches=1 or
      v_source='https://github.com/maloney2323/Reality/issues/263' then
    -- Preserve the existing exact #263 admission/settlement path unchanged.
    v_kind:='REAL_ENGINEERING_REPAIR_ORIGINAL';
    v_next:=case when v_matches=0 then 'ADMIT_VERIFIED_CURRENT_REPAIR'
      when v_phase='SOURCE_ADMITTED' then 'GENERATE_AND_INDEPENDENTLY_TEST_SAME_REPAIR'
      when v_phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
       then 'REQUEST_EXACT_ARTIFACT_INSTALL_APPROVAL_IN_CHAT'
      when v_phase='SETTLED' then 'VERIFY_DURABLE_ORIGINAL_FINAL_RECEIPT'
      else 'RECONCILE_CURRENT_REPAIR_WITHOUT_REPLAY' end;
   else
    -- A separate, evidence-bound commit-reference triage is not a code
    -- repair, a generated capability, or an installation authorization.
    select count(*),min(c.original_work_id),min(c.phase)
    into v_matches,v_work,v_phase
    from reality_internal.riley_commit_reference_triage_originals_v1 c
    where c.shift_id=v_shift.shift_id and c.owner_id=v_shift.owner_id
      and c.source_ref=v_source
      and c.source_proof_sha256=v_step.proof_sha256
      and c.production_changed=false;
    if v_matches>1 then raise exception 'UNIFIED_COMMIT_TRIAGE_ORIGINAL_AMBIGUOUS';end if;
    if v_matches=1 then
     v_kind:='REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL';
     v_next:=case
       when v_phase='SOURCE_ADMITTED'
        then 'VERIFY_AND_RECORD_COMMIT_ASSOCIATION_EVIDENCE'
       when v_phase='EVIDENCE_VERIFIED'
        then 'AWAIT_INDEPENDENT_COMMIT_TRIAGE_DISPOSITION'
       else 'RECONCILE_COMMIT_TRIAGE_WITHOUT_REPLAY' end;
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
   end if;
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
revoke all on function public.reality_read_owner_shift_execution_graph_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_shift_execution_graph_v1(uuid,uuid)
 to service_role;
-- The signed preview worker cannot supply a browser/model-provided owner ID.
-- It derives the sole active authorized shift from the service database.
create or replace function public.reality_read_current_shift_execution_graph_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_count int;v_shift uuid;v_owner uuid;
begin
 if current_user<>'service_role' then
  raise exception 'UNIFIED_ACTIVE_EXECUTION_SERVICE_ONLY';end if;
 select count(*),min(s.shift_id::text)::uuid,min(s.owner_id::text)::uuid
 into v_count,v_shift,v_owner
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 where s.authorized_at is not null and s.closed_at is null
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at='infinity'::timestamptz
  and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.state='ACTIVE';
 if v_count=0 then return jsonb_build_object(
  'status','NO_CURRENT_OWNER_SHIFT_EXECUTION_GRAPH',
  'jobs','[]'::jsonb,'installation_authorized',false,
  'production_changed',false);end if;
 if v_count<>1 then
  raise exception 'UNIFIED_OWNER_EXECUTION_MULTIPLE_SHIFT_AMBIGUITY';end if;
 return public.reality_read_owner_shift_execution_graph_v1(v_owner,v_shift);
end $fn$;
revoke all on function public.reality_read_current_shift_execution_graph_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_current_shift_execution_graph_v1()
 to service_role;
