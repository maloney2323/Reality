-- Correct the source-scope SELECT alias in the live isolated service-role function.
-- No table migration, job claim, installation, or historical original change.
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

revoke all on function public.reality_admit_verified_shift_commit_triage_v1(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_admit_verified_shift_commit_triage_v1(text,text,text,text,text) to service_role;
