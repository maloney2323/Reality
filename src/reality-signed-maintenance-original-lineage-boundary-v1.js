// Existing source- and owner-bound maintenance gate: distinguish the
// absence of a qualified business original from a missing code-regression
// test. Never treat a GitHub PR or source inquiry as authorized original work.
const HASH=/^sha256:[a-f0-9]{64}$/;
export function isSignedMaintenanceOriginalLineageMissing(gate){
 return gate?.status==='EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'&&
  gate.next_action==='VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'&&
  gate.canonical_owner_business_original_missing===true&&
  gate.case_specific_maintenance_ci_red_attested===false&&
  gate.original_job_completed===false&&
  gate.installation_authorized===false&&gate.production_changed===false&&
  typeof gate.original_work_id==='string'&&
  /^work:[a-f0-9]{32}$/.test(gate.original_work_id)&&
  typeof gate.source_ref==='string'&&
  /^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(gate.source_ref)&&
  HASH.test(gate.signed_external_review_receipt_sha256||'')&&
  Array.isArray(gate.scoped_maintenance_case_ci_receipts)&&
  gate.scoped_maintenance_case_ci_receipts.every(x=>
   x?.original_job_completed===false&&
   x?.repair_installed===false&&
   HASH.test(x.case_specific_ci_receipt_sha256||''));
}
