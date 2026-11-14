-- Preserve exact candidate-published evidence within the existing model revision.
-- This is not a tested-patch, install, or settlement receipt.
alter table reality_internal.riley_native_model_revisions_v1
 add column if not exists candidate_staged_branch text
 check (candidate_staged_branch is null or candidate_staged_branch ~
  '^reality/riley/auto-corrective-[a-f0-9]{32}$');
alter table reality_internal.riley_native_model_revisions_v1
 add column if not exists candidate_staged_commit_sha text
 check (candidate_staged_commit_sha is null or candidate_staged_commit_sha ~
  '^[a-f0-9]{40}$');
alter table reality_internal.riley_native_model_revisions_v1
 add column if not exists candidate_staged_at timestamptz;
alter table reality_internal.riley_native_model_revisions_v1
 add constraint riley_auto_corrective_staged_all_or_none
 check ((candidate_staged_branch is null and candidate_staged_commit_sha is null
  and candidate_staged_at is null) or
  (candidate_staged_branch is not null and candidate_staged_commit_sha is not null
  and candidate_staged_at is not null));

create or replace function public.reality_record_riley_auto_corrective_staging_v1(
 p_original_work_id text,p_model_response_id text,p_proposed_sha256 text,
 p_candidate_branch text,p_candidate_commit_sha text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare x record; g jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'CORRECTIVE_CANDIDATE_STAGING_SERVICE_ONLY';end if;
 if p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
  or p_proposed_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_candidate_commit_sha !~ '^[a-f0-9]{40}$'
  or p_candidate_branch <>
    'reality/riley/auto-corrective-'||substring(p_original_work_id from 6)
 then raise exception 'CORRECTIVE_CANDIDATE_IDENTITY_MISMATCH';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or g->>'installation_authorized'<>'false'
  or g->>'production_changed'<>'false'
 then raise exception 'CORRECTIVE_CURRENT_SHIFT_UNVERIFIED';end if;
 select rev.* into x from reality_internal.riley_native_model_revisions_v1 rev
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=rev.original_work_id and j.shift_id=rev.shift_id
  and j.owner_id=rev.owner_id and j.shift_source_proof_sha256=rev.source_proof_sha256
 where rev.original_work_id=p_original_work_id
  and rev.model_response_id=p_model_response_id
  and rev.proposed_source_sha256=p_proposed_sha256
  and rev.shift_id=(g->>'shift_id')::uuid
  and rev.owner_id=(g->>'owner_id')::uuid
  and rev.state='MODEL_REVISION_RECORDED'
  and j.phase='SOURCE_ADMITTED' and j.production_changed=false
  and exists(select 1 from pg_catalog.jsonb_array_elements(g->'jobs') job
   where job->>'original_work_id'=p_original_work_id
    and job->>'phase'='SOURCE_ADMITTED'
    and job->>'independent_source_proof_verified'='true')
 for update of rev;
 if not found then raise exception 'CORRECTIVE_REVISION_OR_OWNER_DRIFT';end if;
 if x.candidate_staged_commit_sha is not null and
   (x.candidate_staged_commit_sha<>p_candidate_commit_sha or
    x.candidate_staged_branch<>p_candidate_branch)
 then raise exception 'CORRECTIVE_CANDIDATE_STAGING_CONFLICT';end if;
 if x.candidate_staged_commit_sha is null then
  update reality_internal.riley_native_model_revisions_v1
   set candidate_staged_branch=p_candidate_branch,
       candidate_staged_commit_sha=p_candidate_commit_sha,
       candidate_staged_at=clock_timestamp()
  where original_work_id=p_original_work_id and
   candidate_staged_commit_sha is null;
 end if;
 return pg_catalog.jsonb_build_object(
   'status','SAME_ORIGINAL_CORRECTIVE_CANDIDATE_STAGED_READBACK',
   'original_work_id',p_original_work_id,'shift_id',x.shift_id,
   'candidate_branch',p_candidate_branch,
   'candidate_commit_sha',p_candidate_commit_sha,
   'independent_ci_verified',false,'new_shift_started',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
end $fn$;
revoke all on function public.reality_record_riley_auto_corrective_staging_v1(
 text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_riley_auto_corrective_staging_v1(
 text,text,text,text,text) to service_role;