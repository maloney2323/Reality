-- Real, read-only, owner-scoped visibility for source-linked unattended
-- repair; safe even while generated code is only a candidate, not installed.
create or replace function public.reality_read_owner_riley_repair_original_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'OWNER_REPAIR_ORIGINAL_SERVICE_READBACK_ONLY';end if;
 return jsonb_build_object(
  'status','OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK',
  'jobs',coalesce((select jsonb_agg(jsonb_build_object(
   'shift_id',j.shift_id,
   'original_work_id',j.original_work_id,
   'source_ref',j.issue_url,
   'source_proof_sha256',j.shift_source_proof_sha256,
   'phase',j.phase,
   'candidate_artifact_sha256',j.candidate_artifact_sha256,
   'candidate_commit_sha',j.candidate_commit_sha,
   'independent_proof_run_id',j.independent_proof_run_id,
   'model_response_id',j.model_response_id,
   'exact_owner_install_approval_ref',j.exact_approval_receipt_ref,
   'original_settlement_receipt_ref',case when j.phase='SETTLED'
     then j.original_settlement_receipt_ref else null end,
   'code_repair_completed',j.phase='SETTLED',
   'installation_authorized',j.exact_approval_receipt_ref is not null,
   'original_job_completed',j.phase='SETTLED',
   'production_changed',j.production_changed
  ) order by j.requested_at desc)
   from (select * from reality_internal.riley_unattended_repair_originals_v1
    where owner_id=p_owner_id order by requested_at desc limit 6) j),'[]'::jsonb),
  'does_not_authorize_new_work',true,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_riley_repair_original_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_riley_repair_original_v1(uuid)
 to service_role;
