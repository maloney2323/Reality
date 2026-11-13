-- Reality unified shift -> exact native Riley original -> one governed model draft.
-- A draft is NOT a tested candidate, installation, capability, or settled job.
-- Service-only, immutable original identity, one attempt per source digest.
create table if not exists reality_internal.riley_native_model_drafts_v1(
 original_work_id text primary key check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 source_ref text not null check(source_ref='https://github.com/maloney2323/Reality/issues/263'),
 source_proof_sha256 text not null check(source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 request_id uuid not null unique default gen_random_uuid(),
 phase text not null default 'MODEL_REQUEST_LEASED'
  check(phase in ('MODEL_REQUEST_LEASED','MODEL_DRAFT_RECORDED','MODEL_REQUEST_UNVERIFIED')),
 leased_at timestamptz not null default clock_timestamp(),
 lease_expires_at timestamptz not null default clock_timestamp()+interval '8 minutes',
 finished_at timestamptz,
 source_file_path text,
 source_git_commit_sha text check(source_git_commit_sha is null or source_git_commit_sha ~ '^[a-f0-9]{40}$'),
 source_blob_sha text check(source_blob_sha is null or source_blob_sha ~ '^[a-f0-9]{40}$'),
 source_sha256 text check(source_sha256 is null or source_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 proposed_sha256 text check(proposed_sha256 is null or proposed_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 model_response_id text check(model_response_id is null or model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'),
 replacement_find text,
 replacement_with text,
 model_reason text,
 model_output_tokens integer,
 no_installation_authorized boolean not null default true check(no_installation_authorized),
 no_job_settlement boolean not null default true check(no_job_settlement),
 constraint native_model_draft_immutable_content check (
  (phase='MODEL_DRAFT_RECORDED')=
  (source_file_path is not null and source_git_commit_sha is not null
   and source_blob_sha is not null and source_sha256 is not null
   and proposed_sha256 is not null and model_response_id is not null
   and replacement_find is not null and replacement_with is not null
   and finished_at is not null)
 )
);
revoke all on reality_internal.riley_native_model_drafts_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_native_model_drafts_v1 to service_role;

create or replace function public.reality_claim_current_riley_native_model_draft_v1(
 p_shift_id uuid,p_original_work_id text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_graph jsonb;v_work jsonb;v_count int;v_owner uuid;
 v_saved reality_internal.riley_native_model_drafts_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'RILEY_NATIVE_DRAFT_SERVICE_ROLE_REQUIRED';end if;
 if p_shift_id is null or p_original_work_id !~ '^work:[a-f0-9]{32}$'
 then raise exception 'RILEY_NATIVE_DRAFT_SIGNED_WORK_REQUIRED';end if;
 v_graph:=public.reality_read_current_shift_execution_graph_v1();
 if v_graph->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or v_graph->>'shift_id'<>p_shift_id::text
  or v_graph->>'installation_authorized'<>'false'
  or v_graph->>'production_changed'<>'false'
 then raise exception 'RILEY_NATIVE_DRAFT_CURRENT_WARRANT_UNVERIFIED';end if;
 select count(*),(jsonb_agg(value)->0) into v_count,v_work
 from jsonb_array_elements(v_graph->'jobs')
 where value->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
   and value->>'original_work_id'=p_original_work_id
   and value->>'source_ref'='https://github.com/maloney2323/Reality/issues/263'
   and value->>'phase'='SOURCE_ADMITTED'
   and value->>'independent_source_proof_verified'='true'
   and value->>'source_proof_sha256' ~ '^sha256:[a-f0-9]{64}$';
 if v_count<>1 then raise exception 'RILEY_NATIVE_DRAFT_SINGLE_VERIFIED_ORIGINAL_REQUIRED';end if;
 select s.owner_id into v_owner
 from reality_internal.governed_employee_shifts_v1 s
 where s.shift_id=p_shift_id and s.owner_id=(v_graph->>'owner_id')::uuid
   and s.closed_at is null and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.planned_end_at='infinity'::timestamptz;
 if v_owner is null then raise exception 'RILEY_NATIVE_DRAFT_OWNER_WARRANT_CHANGED';end if;
 insert into reality_internal.riley_native_model_drafts_v1(
  original_work_id,shift_id,owner_id,source_ref,source_proof_sha256)
 values(p_original_work_id,p_shift_id,v_owner,v_work->>'source_ref',
  v_work->>'source_proof_sha256')
 on conflict(original_work_id) do nothing
 returning * into v_saved;
 if not found then
  select * into v_saved from reality_internal.riley_native_model_drafts_v1
  where original_work_id=p_original_work_id and shift_id=p_shift_id and owner_id=v_owner
   and source_proof_sha256=v_work->>'source_proof_sha256';
  if not found then raise exception 'RILEY_NATIVE_DRAFT_ORIGINAL_ID_REASSIGNED';end if;
  return jsonb_build_object('status','EXISTING_NATIVE_MODEL_ATTEMPT_NO_REPLAY',
   'shift_id',v_saved.shift_id,'original_work_id',v_saved.original_work_id,
   'draft_phase',v_saved.phase,'model_invocation_authorized',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 return jsonb_build_object('status','NATIVE_ORIGINAL_MODEL_DRAFT_LEASED',
  'shift_id',v_saved.shift_id,'owner_id',v_saved.owner_id,
  'original_work_id',v_saved.original_work_id,
  'source_ref',v_saved.source_ref,'source_proof_sha256',v_saved.source_proof_sha256,
  'request_id',v_saved.request_id,'model_invocation_authorized',true,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_claim_current_riley_native_model_draft_v1(uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_current_riley_native_model_draft_v1(uuid,text)
 to service_role;

create or replace function public.reality_record_current_riley_native_model_draft_v1(
 p_original_work_id text,p_request_id uuid,p_file_path text,
 p_base_commit_sha text,p_source_blob_sha text,p_source_sha256 text,
 p_proposed_sha256 text,p_model_response_id text,
 p_find text,p_replace text,p_reason text,p_output_tokens int
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_draft reality_internal.riley_native_model_drafts_v1%rowtype;
 v_graph jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'RILEY_NATIVE_DRAFT_SERVICE_ROLE_REQUIRED';end if;
 if p_original_work_id !~ '^work:[a-f0-9]{32}$' or
  p_request_id is null or
  p_file_path not in (
   'src/reality-riley-service-original-runtime-v1.js',
   'api/reality/governed-employee-shift-worker.js',
   'src/reality-riley-trusted-original-driver-bridge-v1.js') or
  p_base_commit_sha !~ '^[a-f0-9]{40}$' or
  p_source_blob_sha !~ '^[a-f0-9]{40}$' or
  p_source_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  p_proposed_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$' or
  p_find is null or p_replace is null or p_find=p_replace or
  length(p_find)<20 or length(p_find)>12000 or length(p_replace)>16000 or
  p_reason is null or length(p_reason)>1500 or
  p_output_tokens is null or p_output_tokens<0 or p_output_tokens>16000
 then raise exception 'RILEY_NATIVE_DRAFT_SOURCE_AND_MODEL_PROOF_REQUIRED';end if;
 select * into v_draft from reality_internal.riley_native_model_drafts_v1
 where original_work_id=p_original_work_id and request_id=p_request_id
 for update;
 if not found or v_draft.phase<>'MODEL_REQUEST_LEASED' or
   clock_timestamp()>v_draft.lease_expires_at then
  raise exception 'RILEY_NATIVE_DRAFT_LEASE_EXPIRED_OR_ALREADY_RECORDED';end if;
 v_graph:=public.reality_read_current_shift_execution_graph_v1();
 if v_graph->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or v_graph->>'shift_id'<>v_draft.shift_id::text or
  v_graph->>'owner_id'<>v_draft.owner_id::text or
  not exists(
   select 1 from jsonb_array_elements(v_graph->'jobs') x
   where x->>'original_work_id'=v_draft.original_work_id
    and x->>'source_proof_sha256'=v_draft.source_proof_sha256
    and x->>'phase'='SOURCE_ADMITTED')
 then raise exception 'RILEY_NATIVE_DRAFT_SOURCE_DRIFT_NO_RECORD';end if;
 update reality_internal.riley_native_model_drafts_v1
 set phase='MODEL_DRAFT_RECORDED',
  source_file_path=p_file_path,source_git_commit_sha=p_base_commit_sha,
  source_blob_sha=p_source_blob_sha,source_sha256=p_source_sha256,
  proposed_sha256=p_proposed_sha256,model_response_id=p_model_response_id,
  replacement_find=p_find,replacement_with=p_replace,
  model_reason=p_reason,model_output_tokens=p_output_tokens,
  finished_at=clock_timestamp()
 where original_work_id=p_original_work_id and request_id=p_request_id
   and phase='MODEL_REQUEST_LEASED';
 if not found then raise exception 'RILEY_NATIVE_DRAFT_ATOMIC_RECORD_CONFLICT';end if;
 return jsonb_build_object('status','MODEL_WRITTEN_REPAIR_DRAFT_RECORDED_AWAITING_INDEPENDENT_TEST',
  'original_work_id',v_draft.original_work_id,
  'shift_id',v_draft.shift_id,'model_response_id',p_model_response_id,
  'file_path',p_file_path,'proposed_sha256',p_proposed_sha256,
  'independent_tests_passed',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_record_current_riley_native_model_draft_v1(
 text,uuid,text,text,text,text,text,text,text,text,text,int)
 from public,anon,authenticated;
grant execute on function public.reality_record_current_riley_native_model_draft_v1(
 text,uuid,text,text,text,text,text,text,text,text,text,int)
 to service_role;

create or replace function public.reality_mark_riley_native_model_draft_uncertain_v1(
 p_original_work_id text,p_request_id uuid,p_reason text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'service_role' then raise exception 'RILEY_NATIVE_DRAFT_SERVICE_ROLE_REQUIRED';end if;
 if p_original_work_id !~ '^work:[a-f0-9]{32}$' or p_request_id is null or
  p_reason not in ('MODEL_PROVIDER_UNVERIFIED','MODEL_OUTPUT_UNSAFE_OR_INVALID',
   'SOURCE_PROVIDER_UNVERIFIED','MODEL_DRAFT_PERSISTENCE_UNVERIFIED')
 then raise exception 'RILEY_NATIVE_DRAFT_FAILURE_SCOPE_INVALID';end if;
 update reality_internal.riley_native_model_drafts_v1
 set phase='MODEL_REQUEST_UNVERIFIED',finished_at=clock_timestamp()
 where original_work_id=p_original_work_id and request_id=p_request_id
  and phase='MODEL_REQUEST_LEASED';
 return jsonb_build_object('status','NATIVE_MODEL_REQUEST_REQUIRES_INDEPENDENT_RECONCILIATION',
  'original_work_id',p_original_work_id,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_mark_riley_native_model_draft_uncertain_v1(text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_mark_riley_native_model_draft_uncertain_v1(text,uuid,text)
 to service_role;
