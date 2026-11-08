-- Read-only current owner shift's independently failed model revision.
-- Never infer install/settlement from a CI result.
create or replace function public.reality_read_current_riley_revision_test_outcome_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb;r record;v_count int;
begin
 if current_user<>'service_role' then
  raise exception 'RILEY_REVISION_TEST_SERVICE_ROLE_REQUIRED';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' then
  return jsonb_build_object('status','NO_CURRENT_RILEY_REVISION_TEST_SCOPE',
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);end if;
 select count(*) into v_count from jsonb_array_elements(g->'jobs') x
 where x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
  and x->>'original_work_id'~'^work:[a-f0-9]{32}$'
  and x->>'source_ref'='https://github.com/maloney2323/Reality/issues/263'
  and x->>'phase'='SOURCE_ADMITTED'
  and x->>'independent_source_proof_verified'='true';
 if v_count<>1 then raise exception 'RILEY_REVISION_TEST_EXACT_ORIGINAL_REQUIRED';end if;
 select f.*,v.source_proof_sha256 into r
 from reality_internal.riley_native_model_revision_frozen_results_v1 f
 join reality_internal.riley_native_model_revisions_v1 v
  on v.original_work_id=f.original_work_id and v.shift_id=f.shift_id
   and v.owner_id=f.owner_id and v.model_response_id=f.corrective_model_response_id
   and v.proposed_source_sha256=f.proposed_source_sha256
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=f.original_work_id and j.shift_id=f.shift_id
  and j.owner_id=f.owner_id and j.phase='SOURCE_ADMITTED'
  and j.exact_approval_receipt_ref is null
  and j.original_settlement_receipt_ref is null
 where f.shift_id=(g->>'shift_id')::uuid and f.owner_id=(g->>'owner_id')::uuid
  and f.ci_status='completed' and f.ci_conclusion='failure'
  and f.tests_failed>0 and not f.installation_authorized
  and not f.original_job_completed and not f.production_changed
  and exists(select 1 from jsonb_array_elements(g->'jobs') x where
   x->>'original_work_id'=f.original_work_id
   and x->>'source_proof_sha256'=v.source_proof_sha256)
 limit 2;
 if not found then return jsonb_build_object(
  'status','NO_INDEPENDENT_CURRENT_REVISION_FAILURE_RECORDED',
  'shift_id',g->>'shift_id','installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 return jsonb_build_object(
  'status','CURRENT_RILEY_REVISION_INDEPENDENT_FROZEN_TEST_FAILED',
  'shift_id',r.shift_id,'original_work_id',r.original_work_id,
  'model_response_id',r.corrective_model_response_id,
  'independent_run_id',r.independent_ci_run_id,
  'independent_ci_url',r.independent_ci_url,
  'tests_passed',r.tests_passed,'tests_failed',r.tests_failed,
  'failure_class',r.failure_class,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_current_riley_revision_test_outcome_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_current_riley_revision_test_outcome_v1()
 to service_role;