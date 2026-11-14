-- Source-scoped extension of existing atomic native draft lease; no new authority.
alter table reality_internal.riley_native_model_drafts_v1
 drop constraint if exists riley_native_model_drafts_v1_source_ref_check;
alter table reality_internal.riley_native_model_drafts_v1
 add constraint riley_native_model_drafts_v1_source_ref_check
 check(source_ref~
 '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$');

CREATE OR REPLACE FUNCTION public.reality_claim_current_riley_native_model_draft_v1(p_shift_id uuid, p_original_work_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
   and value->>'source_ref'~
    '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
   and exists(select 1
    from reality_internal.riley_unattended_repair_originals_v1 src
    where src.original_work_id=p_original_work_id
     and src.owner_id=(v_graph->>'owner_id')::uuid
     and src.shift_id=p_shift_id
     and src.issue_url=value->>'source_ref'
     and src.shift_source_proof_sha256=value->>'source_proof_sha256'
     and src.phase='SOURCE_ADMITTED' and src.production_changed=false
     and ((src.issue_number=263 and src.qualification_run_id is null)
      or (src.issue_number<>263 and src.qualification_run_id>0
       and src.qualification_failed_commit_sha~'^[a-f0-9]{40}$'
       and src.qualification_frozen_test_path~
        '^test/reality-frozen-regressions/[a-z0-9._-]+[.]test[.]js$'
       and src.qualification_frozen_test_sha256~'^[a-f0-9]{64}$'
       and src.qualification_investigation_receipt_ref~
        '^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$')))
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
  -- Only independently reconciled invalid MODEL TEXT (no code
  -- effect) can retry. An uncertain provider effect cannot be replayed.
  if v_saved.phase='MODEL_OUTPUT_REJECTED'
    and v_saved.failure_code='MODEL_OUTPUT_UNSAFE_OR_INVALID'
    and v_saved.attempt_count<3 then
   update reality_internal.riley_native_model_drafts_v1 d
   set phase='MODEL_REQUEST_LEASED',request_id=gen_random_uuid(),
    attempt_count=d.attempt_count+1,leased_at=clock_timestamp(),
    lease_expires_at=clock_timestamp()+interval '8 minutes',
    finished_at=null,failure_code=null
   where d.original_work_id=p_original_work_id
    and d.shift_id=p_shift_id and d.owner_id=v_owner
    and d.phase='MODEL_OUTPUT_REJECTED'
    and d.failure_code='MODEL_OUTPUT_UNSAFE_OR_INVALID'
    and d.attempt_count<3
   returning * into v_saved;
   if not found then raise exception 'RILEY_NATIVE_DRAFT_RETRY_ATOMIC_CONFLICT';end if;
   return jsonb_build_object(
    'status','NATIVE_ORIGINAL_MODEL_DRAFT_LEASED',
    'shift_id',v_saved.shift_id,'owner_id',v_saved.owner_id,
    'original_work_id',v_saved.original_work_id,
    'source_ref',v_saved.source_ref,
    'source_proof_sha256',v_saved.source_proof_sha256,
    'request_id',v_saved.request_id,
    'attempt_count',v_saved.attempt_count,
    'model_invocation_authorized',true,
    'installation_authorized',false,
    'original_job_completed',false,'production_changed',false);
  end if;
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
end $function$;
