-- Read-only, owner-scoped settled-work inventory for the next shift.
-- An OPEN GitHub issue is not proof that its original job is still unfinished.
-- This resolves newer independent receipt formats without ever authorizing work.
CREATE OR REPLACE FUNCTION public.reality_read_owner_additional_settled_shift_sources_v1(
 p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_refs jsonb;v_count integer;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'OWNER_SETTLED_SOURCE_INVENTORY_SERVICE_ONLY';
 END IF;
 SELECT coalesce(jsonb_agg(x.source_ref ORDER BY x.source_ref),'[]'::jsonb),
  count(*)::integer INTO v_refs,v_count
 FROM (
  SELECT DISTINCT g.source_ref
  FROM reality_internal.governed_original_independent_final_receipts_v1 g
  JOIN reality_internal.governed_original_install_reviews_v1 a
   ON a.original_work_id=g.original_work_id AND a.owner_id=g.owner_id
    AND a.shift_id=g.shift_id AND a.source_ref=g.source_ref
    AND a.source_proof_sha256=g.source_proof_sha256
    AND a.installed_commit_sha=g.installed_commit_sha
    AND a.original_final_receipt_id=g.receipt_id
    AND a.phase='ORIGINAL_SETTLED'
  JOIN reality_internal.riley_unattended_repair_originals_v1 n
   ON n.original_work_id=g.original_work_id AND n.owner_id=g.owner_id
    AND n.shift_id=g.shift_id AND n.issue_url=g.source_ref
    AND n.shift_source_proof_sha256=g.source_proof_sha256
    AND n.original_settlement_receipt_ref=
      'supabase:governed_original_independent_final_receipts_v1:'||g.receipt_id::text
    AND n.phase='SETTLED' AND n.installed=true
    AND n.production_changed=false
  WHERE g.owner_id=p_owner_id AND g.outcome='SUCCEEDED'
   AND g.production_changed=false
   AND g.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
   AND g.installed_commit_sha~'^[a-f0-9]{40}$'
   AND g.independent_original_acceptance_run_id>0
   AND g.official_vercel_app_check_run_id>0
   AND g.vercel_deployment_status_id>0
   AND g.source_ref~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
  UNION
  SELECT DISTINCT t.source_ref
  FROM reality_internal.riley_commit_reference_triage_originals_v1 t
  WHERE t.owner_id=p_owner_id AND t.phase='SETTLED'
   AND t.production_changed=false AND t.settled_at IS NOT NULL
   AND t.final_receipt_id IS NOT NULL
   AND t.commit_sha~'^[a-f0-9]{40}$'
   AND t.issue_body_sha256~'^sha256:[a-f0-9]{64}$'
   AND t.commit_content_sha256~'^sha256:[a-f0-9]{64}$'
   AND t.provider_comment_id>0
   AND t.provider_comment_url=
      t.source_ref||'#issuecomment-'||t.provider_comment_id::text
   AND t.provider_comment_body_sha256~'^sha256:[a-f0-9]{64}$'
   AND t.source_ref~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
 ) x;
 IF v_count>30 THEN RAISE EXCEPTION 'OWNER_SETTLED_SOURCE_INVENTORY_TOO_LARGE';END IF;
 RETURN jsonb_build_object(
  'status','OWNER_ADDITIONAL_SETTLED_SOURCES_INDEPENDENTLY_RECONCILED',
  'owner_id',p_owner_id,'source_refs',v_refs,
  'settled_source_count',v_count,'work_creation_authorized',false,
  'shift_authorized',false,'installation_authorized',false,
  'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_additional_settled_shift_sources_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_additional_settled_shift_sources_v1(uuid)
 TO service_role;