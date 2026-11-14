-- Extend existing prior-candidate failure -> corrective model under same signed shift.

-- Existing shift's verified model proposal remains PRIVATE; the signed worker
-- independently reads candidate GitHub source and failed CI provider result.
-- This function records that negative evidence and enables an idempotent
-- corrective model lease for SAME original. It does not approve installation.
create or replace function public.reality_record_current_failed_native_candidate_v1(
 p_original_work_id text,p_model_response_id text,p_candidate_sha256 text,
 p_failed_commit_sha text,p_failed_run_id bigint,p_failed_count integer)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb;d reality_internal.riley_native_model_drafts_v1%rowtype;
 r reality_internal.riley_native_frozen_test_findings_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'RILEY_MODEL_FAILED_CANDIDATE_SERVICE_ONLY';end if;
 if p_original_work_id!~'^work:[a-f0-9]{32}$' or
  p_model_response_id!~'^resp_[A-Za-z0-9_-]{4,160}$' or
  p_candidate_sha256!~'^sha256:[a-f0-9]{64}$' or
  p_failed_commit_sha!~'^[a-f0-9]{40}$' or
  p_failed_run_id is null or p_failed_run_id<10000 or
  p_failed_count<>1
 then raise exception 'RILEY_MODEL_CANDIDATE_PROOF_INVALID';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' or
  g->>'installation_authorized'<>'false' or
  g->>'production_changed'<>'false' or
  not exists(select 1 from jsonb_array_elements(g->'jobs') x
   where x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
   and x->>'original_work_id'=p_original_work_id
   and x->>'source_ref'='https://github.com/maloney2323/Reality/issues/185'
   and x->>'phase'='SOURCE_ADMITTED'
   and x->>'independent_source_proof_verified'='true')
 then raise exception 'RILEY_MODEL_FAILED_CANDIDATE_SIGNED_ORIGINAL_REQUIRED';end if;
 select * into d from reality_internal.riley_native_model_drafts_v1
 where original_work_id=p_original_work_id
  and shift_id=(g->>'shift_id')::uuid
  and owner_id=(g->>'owner_id')::uuid
  and source_ref='https://github.com/maloney2323/Reality/issues/185'
  and source_proof_sha256=(select x->>'source_proof_sha256'
   from jsonb_array_elements(g->'jobs') x
   where x->>'original_work_id'=p_original_work_id)
  and phase='MODEL_DRAFT_RECORDED'
  and model_response_id=p_model_response_id
  and proposed_sha256=p_candidate_sha256
  and no_installation_authorized and no_job_settlement;
 if not found then raise exception 'RILEY_MODEL_FAILED_CANDIDATE_EXACT_DRAFT_REQUIRED';end if;
 insert into reality_internal.riley_native_frozen_test_findings_v1(
  original_work_id,shift_id,owner_id,model_response_id,proposal_sha256,
  tested_commit_sha,independent_run_id,independent_run_url,
  conclusion,failed_test_count,failure_class)
 values(d.original_work_id,d.shift_id,d.owner_id,d.model_response_id,
  d.proposed_sha256,p_failed_commit_sha,p_failed_run_id,
  'https://github.com/maloney2323/Reality/actions/runs/'||p_failed_run_id,
  'failure',p_failed_count,'ORIGINAL_JOB_CONTINUITY_REGRESSION')
 on conflict(original_work_id) do nothing;
 select * into r from reality_internal.riley_native_frozen_test_findings_v1
 where original_work_id=d.original_work_id;
 if r.model_response_id<>d.model_response_id or
  r.proposal_sha256<>d.proposed_sha256 or
  r.tested_commit_sha<>p_failed_commit_sha or
  r.independent_run_id<>p_failed_run_id or
  r.independent_run_url<>
   'https://github.com/maloney2323/Reality/actions/runs/'||p_failed_run_id or
  r.failed_test_count<>p_failed_count or
  r.failure_class<>'ORIGINAL_JOB_CONTINUITY_REGRESSION' or
  r.installation_authorized or r.original_job_completed or
  r.production_changed
 then raise exception 'RILEY_MODEL_CANDIDATE_NEGATIVE_PROOF_DRIFT';end if;
 return jsonb_build_object(
  'status','SAME_ORIGINAL_MODEL_CANDIDATE_INDEPENDENTLY_FAILED',
  'original_work_id',d.original_work_id,'owner_id',d.owner_id,
  'shift_id',d.shift_id,'model_response_id',d.model_response_id,
  'failing_run_id',r.independent_run_id,
  'failing_commit_sha',r.tested_commit_sha,
  'failed_test_count',r.failed_test_count,
  'candidate_verified_installable',false,
  'corrective_model_run_permitted_only_by_separate_atomic_claim',true,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_record_current_failed_native_candidate_v1(
 text,text,text,text,bigint,integer) from public,anon,authenticated;
grant execute on function public.reality_record_current_failed_native_candidate_v1(
 text,text,text,text,bigint,integer) to service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_same_riley_native_model_revision_v1(p_shift_id uuid, p_original_work_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 and value->>'source_ref'~
   '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
 and exists(select 1 from reality_internal.riley_unattended_repair_originals_v1 src
  where src.original_work_id=p_original_work_id
   and src.owner_id=(g->>'owner_id')::uuid and src.shift_id=p_shift_id
   and src.issue_url=value->>'source_ref'
   and src.shift_source_proof_sha256=value->>'source_proof_sha256'
   and src.phase='SOURCE_ADMITTED' and src.production_changed=false
   and ((src.issue_number=263 and src.qualification_run_id is null)
    or (src.issue_number<>263 and src.qualification_run_id>0
     and src.qualification_frozen_test_sha256~'^[a-f0-9]{64}$'
     and src.qualification_investigation_receipt_ref~
      '^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$')));
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
end $function$
;
