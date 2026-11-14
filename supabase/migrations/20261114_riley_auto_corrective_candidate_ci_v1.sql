-- Service-only continuation of the same signed original: model revision ->
-- isolated corrective branch -> provider-backed frozen CI result.
-- Model output and browser text confer no effect or installation authority.
create table if not exists reality_internal.riley_auto_corrective_ci_proofs_v1 (
 original_work_id text primary key references reality_internal.riley_native_model_revisions_v1(original_work_id),
 shift_id uuid not null,
 owner_id uuid not null,
 model_response_id text not null check(model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'),
 proposed_sha256 text not null check(proposed_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 tested_commit_sha text not null check(tested_commit_sha ~ '^[a-f0-9]{40}$'),
 independent_run_id bigint not null unique check(independent_run_id > 10000),
 independent_run_url text not null,
 conclusion text not null check(conclusion in ('success','failure')),
 checked_at timestamptz not null default clock_timestamp(),
 installation_authorized boolean not null default false check(not installation_authorized),
 original_job_completed boolean not null default false check(not original_job_completed),
 production_changed boolean not null default false check(not production_changed)
);
alter table reality_internal.riley_auto_corrective_ci_proofs_v1 enable row level security;
revoke all on reality_internal.riley_auto_corrective_ci_proofs_v1 from public,anon,authenticated;
grant select,insert on reality_internal.riley_auto_corrective_ci_proofs_v1 to service_role;

create or replace function public.reality_read_next_riley_auto_corrective_ci_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb; r record; cnt integer;
begin
 if current_user<>'service_role' then
  raise exception 'AUTO_CORRECTIVE_CI_SERVICE_ROLE_REQUIRED';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or g->>'installation_authorized'<>'false'
  or g->>'production_changed'<>'false'
 then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_OWNER_WARRANTED_CORRECTIVE_CI',
  'code_installed',false,'production_changed',false);end if;
 select count(*) into cnt
 from reality_internal.riley_native_model_revisions_v1 rev
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=rev.original_work_id
  and j.shift_id=rev.shift_id and j.owner_id=rev.owner_id
  and j.shift_source_proof_sha256=rev.source_proof_sha256
 join reality_internal.governed_employee_shifts_v1 sh
  on sh.shift_id=j.shift_id and sh.owner_id=j.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
  and w.plan_fingerprint=sh.plan_fingerprint
 where rev.shift_id=(g->>'shift_id')::uuid
  and rev.owner_id=(g->>'owner_id')::uuid
  and rev.state='MODEL_REVISION_RECORDED'
  and j.phase='SOURCE_ADMITTED'
  and j.production_changed=false
  and sh.closed_at is null and sh.authorized_at is not null
  and sh.planned_end_at>clock_timestamp()
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  and exists(select 1 from pg_catalog.jsonb_array_elements(g->'jobs') gj
   where gj->>'original_work_id'=rev.original_work_id
    and gj->>'source_ref'=j.issue_url
    and gj->>'phase'='SOURCE_ADMITTED'
    and gj->>'independent_source_proof_verified'='true')
  and not exists(select 1 from reality_internal.riley_auto_corrective_ci_proofs_v1 proof
   where proof.original_work_id=rev.original_work_id);
 if cnt=0 then return pg_catalog.jsonb_build_object(
  'status','NO_UNTESTED_SAME_ORIGINAL_CORRECTIVE_REVISION',
  'code_installed',false,'production_changed',false);end if;
 if cnt<>1 then raise exception 'AMBIGUOUS_SAME_SHIFT_CORRECTIVE_REVISION';end if;
 select rev.*,j.issue_url,j.shift_source_proof_sha256
 into r
 from reality_internal.riley_native_model_revisions_v1 rev
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=rev.original_work_id
  and j.shift_id=rev.shift_id and j.owner_id=rev.owner_id
 where rev.shift_id=(g->>'shift_id')::uuid
  and rev.owner_id=(g->>'owner_id')::uuid
  and rev.state='MODEL_REVISION_RECORDED'
  and j.phase='SOURCE_ADMITTED'
  and not exists(select 1 from reality_internal.riley_auto_corrective_ci_proofs_v1 p
   where p.original_work_id=rev.original_work_id);
 if not found or r.source_path !~ '^src/[A-Za-z0-9/_-]+[.]js$'
  or r.source_path like '%..%'
  or r.source_commit_sha !~ '^[a-f0-9]{40}$'
  or r.source_blob_sha !~ '^[a-f0-9]{40}$'
  or r.proposed_source_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or r.model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
  or r.replacement_find is null or r.replacement_with is null
 then raise exception 'CORRECTIVE_REVISION_SOURCE_AND_FROZEN_SCOPE_UNVERIFIED';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_SAME_SHIFT_CORRECTIVE_DRAFT_READY_FOR_CI',
  'owner_id',r.owner_id,'shift_id',r.shift_id,
  'original_work_id',r.original_work_id,
  'source_ref',r.issue_url,'source_proof_sha256',r.source_proof_sha256,
  'source_path',r.source_path,'source_commit_sha',r.source_commit_sha,
  'source_blob_sha',r.source_blob_sha,
  'model_response_id',r.model_response_id,
  'proposed_sha256',r.proposed_source_sha256,
  'find',r.replacement_find,'replace',r.replacement_with,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_record_riley_auto_corrective_ci_v1(
 p_original_work_id text,p_model_response_id text,p_proposed_sha256 text,
 p_tested_commit_sha text,p_independent_run_id bigint,
 p_independent_run_url text,p_conclusion text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb; saved record;
begin
 if current_user<>'service_role' then
  raise exception 'AUTO_CORRECTIVE_CI_SERVICE_ROLE_REQUIRED';end if;
 if p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
  or p_proposed_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_tested_commit_sha !~ '^[a-f0-9]{40}$'
  or p_independent_run_id is null or p_independent_run_id<=10000
  or p_independent_run_url<>
    'https://github.com/maloney2323/Reality/actions/runs/'||p_independent_run_id::text
  or p_conclusion not in ('success','failure')
 then raise exception 'EXACT_CORRECTIVE_PROVIDER_CI_EVIDENCE_REQUIRED';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 select rev.original_work_id,rev.owner_id,rev.shift_id
 into saved from reality_internal.riley_native_model_revisions_v1 rev
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=rev.original_work_id
  and j.owner_id=rev.owner_id and j.shift_id=rev.shift_id
 where rev.original_work_id=p_original_work_id
  and rev.model_response_id=p_model_response_id
  and rev.proposed_source_sha256=p_proposed_sha256
  and rev.state='MODEL_REVISION_RECORDED'
  and j.phase='SOURCE_ADMITTED' and j.production_changed=false
  and rev.shift_id=(g->>'shift_id')::uuid
  and rev.owner_id=(g->>'owner_id')::uuid
  and exists(select 1 from pg_catalog.jsonb_array_elements(g->'jobs') gj
    where gj->>'original_work_id'=p_original_work_id
     and gj->>'phase'='SOURCE_ADMITTED'
     and gj->>'independent_source_proof_verified'='true');
 if not found then raise exception 'ORIGINAL_OWNER_SHIFT_MODEL_AND_PHASE_CHANGED';end if;
 insert into reality_internal.riley_auto_corrective_ci_proofs_v1(
  original_work_id,shift_id,owner_id,model_response_id,
  proposed_sha256,tested_commit_sha,independent_run_id,
  independent_run_url,conclusion)
 values(saved.original_work_id,saved.shift_id,saved.owner_id,
  p_model_response_id,p_proposed_sha256,p_tested_commit_sha,
  p_independent_run_id,p_independent_run_url,p_conclusion)
 on conflict(original_work_id) do nothing;
 if not found and not exists(
  select 1 from reality_internal.riley_auto_corrective_ci_proofs_v1 old
  where old.original_work_id=p_original_work_id
   and old.model_response_id=p_model_response_id
   and old.proposed_sha256=p_proposed_sha256
   and old.tested_commit_sha=p_tested_commit_sha
   and old.independent_run_id=p_independent_run_id
   and old.conclusion=p_conclusion)
 then raise exception 'CORRECTIVE_CI_ALREADY_RECORDED_WITH_DIFFERENT_EVIDENCE';end if;
 return pg_catalog.jsonb_build_object(
  'status','INDEPENDENT_SAME_ORIGINAL_CORRECTIVE_CI_RECORDED',
  'original_work_id',saved.original_work_id,
  'shift_id',saved.shift_id,'owner_id',saved.owner_id,
  'ci_conclusion',p_conclusion,'independent_run_id',p_independent_run_id,
  'independent_provider_readback_verified_by_worker',true,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_next_riley_auto_corrective_ci_v1()
 from public,anon,authenticated;
revoke all on function public.reality_record_riley_auto_corrective_ci_v1(
 text,text,text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reality_read_next_riley_auto_corrective_ci_v1()
 to service_role;
grant execute on function public.reality_record_riley_auto_corrective_ci_v1(
 text,text,text,text,bigint,text,text) to service_role;