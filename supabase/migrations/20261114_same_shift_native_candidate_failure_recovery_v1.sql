-- Existing owner-signed shift only. Independently observed failed CI for an exact
-- MODEL_DRAFT_RECORDED original is evidence for the already-existing one-shot
-- corrective lease, NOT permission to install, settle, or start a new shift.
alter table reality_internal.riley_native_frozen_test_findings_v1
 add column if not exists independent_frozen_test_sha256 text,
 add column if not exists independent_frozen_test_path text;
alter table reality_internal.riley_native_frozen_test_findings_v1
 add constraint riley_native_frozen_test_fingerprint_check
 check (independent_frozen_test_sha256 is null or
        independent_frozen_test_sha256~'^[a-f0-9]{64}$');

create or replace function public.reality_read_current_shift_native_candidate_for_frozen_verification_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb; d record; n integer;
begin
 if current_user<>'service_role' then
  raise exception 'CURRENT_NATIVE_CANDIDATE_SERVICE_ONLY';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' then
  return pg_catalog.jsonb_build_object('status','NO_ACTIVE_SIGNED_SHIFT_NATIVE_CANDIDATE',
   'original_job_completed',false,'installation_authorized',false,
   'production_changed',false);end if;
 select count(*) into n
 from reality_internal.riley_native_model_drafts_v1 x
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=x.original_work_id and j.shift_id=x.shift_id
   and j.owner_id=x.owner_id and j.issue_url=x.source_ref
   and j.shift_source_proof_sha256=x.source_proof_sha256
 where x.shift_id=(g->>'shift_id')::uuid and x.owner_id=(g->>'owner_id')::uuid
  and x.phase='MODEL_DRAFT_RECORDED'
  and x.no_installation_authorized and x.no_job_settlement
  and j.phase='SOURCE_ADMITTED' and j.production_changed=false
  and j.qualification_run_id>0
  and j.qualification_frozen_test_path=
    'test/reality-frozen-regressions/reality-current-shift-auto-admission-v1.test.js'
  and exists(select 1 from pg_catalog.jsonb_array_elements(g->'jobs') row
   where row->>'original_work_id'=x.original_work_id
    and row->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
    and row->>'phase'='SOURCE_ADMITTED'
    and row->>'source_proof_sha256'=x.source_proof_sha256
    and row->>'independent_source_proof_verified'='true');
 if n=0 then return pg_catalog.jsonb_build_object(
  'status','NO_VERIFIED_UNSETTLED_MODEL_DRAFT_REQUIRING_TEST',
  'new_shift_created',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 if n<>1 then raise exception 'CURRENT_NATIVE_CANDIDATE_AMBIGUOUS';end if;
 select x.*,j.issue_number,j.qualification_run_id into d
 from reality_internal.riley_native_model_drafts_v1 x
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=x.original_work_id and j.shift_id=x.shift_id
   and j.owner_id=x.owner_id
 where x.shift_id=(g->>'shift_id')::uuid and x.owner_id=(g->>'owner_id')::uuid
 and x.phase='MODEL_DRAFT_RECORDED' and j.phase='SOURCE_ADMITTED'
 and j.qualification_run_id>0;
 if exists(select 1 from reality_internal.riley_native_frozen_test_findings_v1 f
  where f.original_work_id=d.original_work_id) then
  return pg_catalog.jsonb_build_object(
  'status','CURRENT_ORIGINAL_FAILURE_ALREADY_INDEPENDENTLY_RECORDED',
  'original_work_id',d.original_work_id,'new_shift_created',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);end if;
 if d.source_file_path<>'src/reality-riley-service-original-runtime-v1.js'
  or d.source_git_commit_sha !~ '^[a-f0-9]{40}$'
  or d.source_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or d.proposed_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or d.model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 then raise exception 'CURRENT_NATIVE_CANDIDATE_SOURCE_UNVERIFIED';end if;
 return pg_catalog.jsonb_build_object(
  'status','CURRENT_OWNER_SIGNED_NATIVE_MODEL_DRAFT_READY_FOR_INDEPENDENT_CI',
  'shift_id',d.shift_id,'owner_id',d.owner_id,
  'original_work_id',d.original_work_id,
  'source_ref',d.source_ref,'source_proof_sha256',d.source_proof_sha256,
  'base_commit_sha',d.source_git_commit_sha,
  'candidate_source_path',d.source_file_path,
  'proposed_sha256',d.proposed_sha256,
  'model_response_id',d.model_response_id,
  'independent_source_qualification_run_id',d.qualification_run_id,
  'new_shift_created',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_current_shift_native_candidate_for_frozen_verification_v1() from public,anon,authenticated;
grant execute on function public.reality_read_current_shift_native_candidate_for_frozen_verification_v1() to service_role;

create or replace function public.reality_record_current_shift_native_candidate_ci_failure_v1(
 p_original_work_id text,p_model_response_id text,p_proposed_sha256 text,
 p_tested_commit_sha text,p_independent_run_id bigint,p_failed_test_count integer,
 p_frozen_test_sha256 text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb; d record; f reality_internal.riley_native_frozen_test_findings_v1%rowtype;
 v_path text:='test/reality-riley-service-original-runtime-v1.test.js';
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_NATIVE_FAILURE_SERVICE_ONLY';end if;
 if p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
  or p_proposed_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_tested_commit_sha !~ '^[a-f0-9]{40}$'
  or p_independent_run_id<10000 or p_independent_run_id is null
  or p_failed_test_count not between 1 and 20
  or p_frozen_test_sha256 !~ '^[a-f0-9]{64}$'
 then raise exception 'SIGNED_NATIVE_FAILURE_EXACT_CI_EVIDENCE_REQUIRED';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or g->>'installation_authorized'<>'false'
  or g->>'production_changed'<>'false'
 then raise exception 'SIGNED_NATIVE_FAILURE_ACTIVE_OWNER_SHIFT_REQUIRED';end if;
 select x.*,j.issue_number,j.qualification_frozen_test_path into d
 from reality_internal.riley_native_model_drafts_v1 x
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=x.original_work_id
   and j.owner_id=x.owner_id and j.shift_id=x.shift_id
   and j.issue_url=x.source_ref
   and j.shift_source_proof_sha256=x.source_proof_sha256
 where x.original_work_id=p_original_work_id
  and x.model_response_id=p_model_response_id
  and x.proposed_sha256=p_proposed_sha256
  and x.shift_id=(g->>'shift_id')::uuid and x.owner_id=(g->>'owner_id')::uuid
  and x.phase='MODEL_DRAFT_RECORDED'
  and x.no_installation_authorized and x.no_job_settlement
  and j.phase='SOURCE_ADMITTED' and j.production_changed=false
  and j.qualification_run_id>0 and j.qualification_failed_commit_sha~
   '^[a-f0-9]{40}$'
  and j.qualification_frozen_test_path=
   'test/reality-frozen-regressions/reality-current-shift-auto-admission-v1.test.js'
  and exists(select 1 from pg_catalog.jsonb_array_elements(g->'jobs') row
   where row->>'original_work_id'=x.original_work_id
    and row->>'source_proof_sha256'=x.source_proof_sha256
    and row->>'phase'='SOURCE_ADMITTED')
 for update of x;
 if not found then raise exception 'SIGNED_NATIVE_FAILURE_EXACT_ORIGINAL_AND_DRAFT_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_original_work_id));
 insert into reality_internal.riley_native_frozen_test_findings_v1(
  original_work_id,shift_id,owner_id,model_response_id,proposal_sha256,
  tested_commit_sha,independent_run_id,independent_run_url,conclusion,
  failed_test_count,failure_class,installation_authorized,
  original_job_completed,production_changed)
 values(d.original_work_id,d.shift_id,d.owner_id,d.model_response_id,
  d.proposed_sha256,p_tested_commit_sha,p_independent_run_id,
  'https://github.com/maloney2323/Reality/actions/runs/'||p_independent_run_id,
  'failure',p_failed_test_count,'ORIGINAL_JOB_CONTINUITY_REGRESSION',
  false,false,false)
 on conflict(original_work_id) do nothing;
 select * into f from reality_internal.riley_native_frozen_test_findings_v1
 where original_work_id=d.original_work_id for update;
 if f.independent_frozen_test_sha256 is null and
  f.independent_frozen_test_path is null then
  update reality_internal.riley_native_frozen_test_findings_v1
   set independent_frozen_test_sha256=p_frozen_test_sha256,
       independent_frozen_test_path=v_path
  where original_work_id=d.original_work_id
   and independent_frozen_test_sha256 is null
   and independent_frozen_test_path is null;
  select * into f from reality_internal.riley_native_frozen_test_findings_v1
  where original_work_id=d.original_work_id for update;
 end if;
 if f.independent_frozen_test_sha256<>p_frozen_test_sha256
  or f.independent_frozen_test_path<>v_path then
  raise exception 'SIGNED_NATIVE_FAILURE_TEST_FINGERPRINT_MISMATCH';end if;
 if not found or f.model_response_id<>p_model_response_id
  or f.proposal_sha256<>p_proposed_sha256
  or f.tested_commit_sha<>p_tested_commit_sha
  or f.independent_run_id<>p_independent_run_id
  or f.failed_test_count<>p_failed_test_count
  or f.conclusion<>'failure'
  or f.failure_class<>'ORIGINAL_JOB_CONTINUITY_REGRESSION'
  or f.installation_authorized or f.original_job_completed or f.production_changed
 then raise exception 'SIGNED_NATIVE_FAILURE_FROZEN_EVIDENCE_CONFLICT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SAME_SIGNED_ORIGINAL_REPAIR_DRAFT_INDEPENDENT_CI_REJECTED',
  'shift_id',d.shift_id,'owner_id',d.owner_id,
  'original_work_id',d.original_work_id,
  'model_response_id',d.model_response_id,
  'failed_test_count',p_failed_test_count,
  'independent_run_id',p_independent_run_id,
  'independent_run_url',f.independent_run_url,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,
  'corrective_model_eligible_for_existing_singleflight',true);
end $fn$;
revoke all on function public.reality_record_current_shift_native_candidate_ci_failure_v1(text,text,text,text,bigint,integer,text) from public,anon,authenticated;
grant execute on function public.reality_record_current_shift_native_candidate_ci_failure_v1(text,text,text,text,bigint,integer,text) to service_role;
