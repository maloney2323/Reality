-- Vercel can attest through its verified GitHub App bot OR the exact
-- official Vercel service user. The former "BOT" evidence label overclaimed
-- one possible provenance. Preserve exact provider actor in a distinct column.
DO $migration$
DECLARE name_to_drop name;
BEGIN
 IF EXISTS(SELECT 1 FROM reality_internal.governed_original_preview_deploy_receipts_v1)
 THEN RAISE EXCEPTION 'VERCEL_PROVENANCE_LABEL_ALREADY_RECORDED_REQUIRES_RECONCILIATION';END IF;
 SELECT c.conname INTO name_to_drop FROM pg_catalog.pg_constraint c
 WHERE c.conrelid='reality_internal.governed_original_preview_deploy_receipts_v1'::pg_catalog.regclass
  AND c.contype='c' AND pg_catalog.pg_get_constraintdef(c.oid)
  LIKE '%GITHUB_INDEPENDENT_VERCEL_BOT_SUCCESS_FOR_EXACT_CANARY_SHA%';
 IF name_to_drop IS NULL THEN RAISE EXCEPTION 'EXPECTED_OLD_VERCEL_EVIDENCE_CONSTRAINT_NOT_FOUND';END IF;
 EXECUTE pg_catalog.format(
  'ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1 DROP CONSTRAINT %I',
  name_to_drop);
END $migration$;
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1
 ALTER COLUMN evidence_kind SET DEFAULT 'GITHUB_VERIFIED_VERCEL_OFFICIAL_ACTOR_SUCCESS_EXACT_CANARY_SHA';
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1
 ADD CONSTRAINT generalized_original_preview_vercel_actor_evidence_v2
 CHECK (evidence_kind='GITHUB_VERIFIED_VERCEL_OFFICIAL_ACTOR_SUCCESS_EXACT_CANARY_SHA');
