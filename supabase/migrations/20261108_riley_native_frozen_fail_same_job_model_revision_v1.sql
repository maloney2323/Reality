-- A failed, independently source-pinned model draft can be repaired ONCE
-- under the SAME owner/shift/original, without replaying unknown effects.
create table if not exists reality_internal.riley_native_model_revisions_v1(
 original_work_id text primary key references reality_internal.riley_native_frozen_test_findings_v1(original_work_id),
 shift_id uuid not null,
 owner_id uuid not null,
 initial_model_response_id text not null,
 failing_commit_sha text not null check(failing_commit_sha~'^[a-f0-9]{40}$'),
 failing_run_id bigint not null check(failing_run_id>10000),
 source_proof_sha256 text not null check(source_proof_sha256~'^sha256:[a-f0-9]{64}$'),
 request_id uuid not null unique default gen_random_uuid(),
 state text not null default 'MODEL_REVISION_LEASED' check(state in ('MODEL_REVISION_LEASED','MODEL_REVISION_RECORDED','MODEL_REVISION_UNVERIFIED')),
 leased_at timestamptz not null default clock_timestamp(),
 lease_expires_at timestamptz not null default clock_timestamp()+interval '8 minutes',
 completed_at timestamptz,
 source_path text,
 source_commit_sha text check(source_commit_sha is null or source_commit_sha~'^[a-f0-9]{40}$'),
 source_blob_sha text check(source_blob_sha is null or source_blob_sha~'^[a-f0-9]{40}$'),
 proposed_source_sha256 text check(proposed_source_sha256 is null or proposed_source_sha256~'^sha256:[a-f0-9]{64}$'),
 model_response_id text check(model_response_id is null or model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'),
 replacement_find text,
 replacement_with text,
 model_reason text,
 output_tokens int,
 installation_authorized boolean not null default false check(not installation_authorized),
 original_job_completed boolean not null default false check(not original_job_completed),
 production_changed boolean not null default false check(not production_changed),
 constraint native_revision_complete_only_when_evidence_recorded check(
  (state='MODEL_REVISION_RECORDED')=
  (completed_at is not null and source_path is not null and source_commit_sha is not null
   and source_blob_sha is not null and proposed_source_sha256 is not null
   and model_response_id is not null and replacement_find is not null
   and replacement_with is not null and model_reason is not null)
 )
);
revoke all on reality_internal.riley_native_model_revisions_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_native_model_revisions_v1 to service_role;

create or replace function public.reality_claim_same_riley_native_model_revision_v1(
 p_shift_id uuid,p_original_work_id text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb;j jsonb;count_orig int;d record;v record;
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVISION_SERVICE_ONLY';end if;
 if p_original_work_id!~'^work:[a-f0-9]{32}$' or p_shift_id is null then
  raise exception 'RILEY_REVISION_EXACT_WORK_REQUIRED';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' or
  g->>'shift_id'<>p_shift_id::text or
  g->>'installation_authorized'<>'false' or
  g->>'production_changed'<>'false' then
  raise exception 'RILEY_REVISION_OWNER_WARRANT_REQUIRED';end if;
 select count(*),(jsonb_agg(value)->0) into count_orig,j
 from jsonb_array_elements(g->'jobs') where
 value->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
 and value->>'original_work_id'=p_original_work_id
 and value->>'phase'='SOURCE_ADMITTED'
 and value->>'independent_source_proof_verified'='true'
 and value->>'source_ref'='https://github.com/maloney2323/Reality/issues/263';
 if count_orig<>1 then raise exception 'RILEY_REVISION_ORIGINAL_SOURCE_IDENTITY_CHANGED';end if;
 select x.*,f.independent_run_id,f.tested_commit_sha
 into d from reality_internal.riley_native_model_drafts_v1 x
 join reality_internal.riley_native_frozen_test_findings_v1 f
  on f.original_work_id=x.original_work_id and f.shift_id=x.shift_id
  and f.owner_id=x.owner_id and f.model_response_id=x.model_response_id
  and f.proposal_sha256=x.proposed_sha256
 where x.original_work_id=p_original_work_id and x.shift_id=p_shift_id
  and x.owner_id=(g->>'owner_id')::uuid
  and x.source_proof_sha256=j->>'source_proof_sha256'
  and x.phase='MODEL_DRAFT_RECORDED'
  and x.no_installation_authorized and x.no_job_settlement
  and f.conclusion='failure'
  and f.failure_class='ORIGINAL_JOB_CONTINUITY_REGRESSION'
  and f.failed_test_count between 1 and 20;
 if not found then raise exception 'RILEY_REVISION_FROZEN_FAILURE_EVIDENCE_REQUIRED';end if;
 insert into reality_internal.riley_native_model_revisions_v1(
  original_work_id,shift_id,owner_id,initial_model_response_id,
  failing_commit_sha,failing_run_id,source_proof_sha256)
 values(d.original_work_id,d.shift_id,d.owner_id,d.model_response_id,
  d.tested_commit_sha,d.independent_run_id,d.source_proof_sha256)
 on conflict(original_work_id) do nothing returning * into v;
 if not found then
  select * into v from reality_internal.riley_native_model_revisions_v1
   where original_work_id=p_original_work_id and shift_id=p_shift_id
    and owner_id=(g->>'owner_id')::uuid
    and source_proof_sha256=j->>'source_proof_sha256';
  if not found then raise exception 'RILEY_REVISION_ORIGINAL_ID_REASSIGNED';end if;
  return jsonb_build_object('status','SAME_ORIGINAL_REVISION_ALREADY_ATTEMPTED_NO_REPLAY',
   'original_work_id',p_original_work_id,'shift_id',p_shift_id,
   'revision_phase',v.state,'model_invocation_authorized',false,
   'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 end if;
 return jsonb_build_object('status','SAME_ORIGINAL_MODEL_CORRECTION_LEASED',
  'original_work_id',v.original_work_id,'shift_id',v.shift_id,'owner_id',v.owner_id,
  'source_proof_sha256',v.source_proof_sha256,'request_id',v.request_id,
  'failing_commit_sha',v.failing_commit_sha,'failing_run_id',v.failing_run_id,
  'initial_model_response_id',v.initial_model_response_id,
  'model_invocation_authorized',true,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_claim_same_riley_native_model_revision_v1(uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_same_riley_native_model_revision_v1(uuid,text) to service_role;

create or replace function public.reality_record_same_riley_native_model_revision_v1(
 p_original_work_id text,p_request_id uuid,p_source_path text,p_base_sha text,
 p_blob_sha text,p_proposed_sha256 text,p_model_response_id text,
 p_find text,p_replace text,p_reason text,p_output_tokens int)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v reality_internal.riley_native_model_revisions_v1%rowtype;g jsonb;
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVISION_SERVICE_ONLY';end if;
 if p_source_path<>'src/reality-riley-service-original-runtime-v1.js'
  or p_original_work_id!~'^work:[a-f0-9]{32}$' or p_request_id is null
  or p_base_sha!~'^[a-f0-9]{40}$' or p_blob_sha!~'^[a-f0-9]{40}$'
  or p_proposed_sha256!~'^sha256:[a-f0-9]{64}$'
  or p_model_response_id!~'^resp_[A-Za-z0-9_-]{4,160}$'
  or p_find is null or length(p_find)<20 or length(p_find)>12000
  or p_replace is null or length(p_replace)>16000 or p_find=p_replace
  or p_reason is null or length(p_reason)>1500 or p_output_tokens is null
  or p_output_tokens<0 or p_output_tokens>10000 then
  raise exception 'RILEY_REVISION_EXACT_MODEL_SOURCE_REQUIRED';end if;
 select * into v from reality_internal.riley_native_model_revisions_v1
  where original_work_id=p_original_work_id and request_id=p_request_id for update;
 if not found or v.state<>'MODEL_REVISION_LEASED' or
 clock_timestamp()>v.lease_expires_at then
  raise exception 'RILEY_REVISION_LEASE_CONSUMED_OR_EXPIRED';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or g->>'shift_id'<>v.shift_id::text or g->>'owner_id'<>v.owner_id::text
  or not exists(select 1 from jsonb_array_elements(g->'jobs') x where
   x->>'original_work_id'=p_original_work_id
   and x->>'phase'='SOURCE_ADMITTED'
   and x->>'source_proof_sha256'=v.source_proof_sha256) then
  raise exception 'RILEY_REVISION_OWNER_CONTINUITY_DRIFT';end if;
 update reality_internal.riley_native_model_revisions_v1 set
  state='MODEL_REVISION_RECORDED',
  source_path=p_source_path,source_commit_sha=p_base_sha,source_blob_sha=p_blob_sha,
  proposed_source_sha256=p_proposed_sha256,model_response_id=p_model_response_id,
  replacement_find=p_find,replacement_with=p_replace,model_reason=p_reason,
  output_tokens=p_output_tokens,completed_at=clock_timestamp()
 where original_work_id=p_original_work_id and request_id=p_request_id
  and state='MODEL_REVISION_LEASED';
 if not found then raise exception 'RILEY_REVISION_RECORD_ATOMIC_CONFLICT';end if;
 return jsonb_build_object('status','SAME_ORIGINAL_CORRECTED_MODEL_DRAFT_AWAITING_FROZEN_TEST',
  'shift_id',v.shift_id,'original_work_id',v.original_work_id,
  'model_response_id',p_model_response_id,'proposed_sha256',p_proposed_sha256,
  'independent_tests_passed',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_record_same_riley_native_model_revision_v1(
 text,uuid,text,text,text,text,text,text,text,text,int) from public,anon,authenticated;
grant execute on function public.reality_record_same_riley_native_model_revision_v1(
 text,uuid,text,text,text,text,text,text,text,text,int) to service_role;

create or replace function public.reality_mark_same_riley_native_model_revision_uncertain_v1(
 p_original_work_id text,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'service_role' then raise exception 'RILEY_REVISION_SERVICE_ONLY';end if;
 update reality_internal.riley_native_model_revisions_v1 set
  state='MODEL_REVISION_UNVERIFIED',completed_at=clock_timestamp()
 where original_work_id=p_original_work_id and request_id=p_request_id
  and state='MODEL_REVISION_LEASED';
 return jsonb_build_object('status','REVISION_PROVIDER_EFFECT_UNVERIFIED_NO_AUTOMATIC_REPLAY',
  'original_work_id',p_original_work_id,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_mark_same_riley_native_model_revision_uncertain_v1(
 text,uuid) from public,anon,authenticated;
grant execute on function public.reality_mark_same_riley_native_model_revision_uncertain_v1(
 text,uuid) to service_role;