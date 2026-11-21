import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const migration=readFileSync('supabase/migrations/20261102_verified_candidate_receipt_release_v1.sql','utf8');
const route=readFileSync('api/reality/personal-issue188-candidate-review.js','utf8');
const home=readFileSync('index.html','utf8');
test('trusted receipt publisher demands immutable provenance and rejects rewrite',()=>{
 assert.match(migration,/reality_internal\.verified_capability_receipt_releases_v1/);
 assert.match(migration,/current_user<>'service_role'/);
 assert.match(migration,/VERIFIED_RECEIPT_INDEPENDENT_PROOF_INVALID/);
 assert.match(migration,/VERIFIED_RECEIPT_CONFLICT_NO_REWRITE/);
 assert.match(migration,/before update or delete/);
 assert.match(migration,/on conflict do nothing/);
 assert.match(migration,/jsonb_typeof/);
 assert.match(migration,/VERIFIED_RECEIPT_REQUIRED_PROOF_FIELDS_MISSING/);
 assert.match(migration,/grant execute on function public\.reality_release_verified_capability_receipt_v1\(jsonb,jsonb\) to service_role/);
 assert.match(migration,/revoke all on function public\.reality_release_verified_capability_receipt_v1\(jsonb,jsonb\) from public,anon,authenticated/);
});
test('owner handler verifies live GitHub proof AND independent database record',()=>{
 assert.match(route,/Promise\.all\(\[/);
 assert.match(route,/reality_read_owner_released_capability_receipts_v1/);
 assert.match(route,/independentlyReadBackReleasedCandidate/);
 assert.match(route,/expectedVerifierReportSha256:VERIFIER_REPORT/);
 assert.match(route,/authenticatedChatSession\(req,res\)/);
 assert.match(route,/req\.method!=='GET'/);
 assert.doesNotMatch(route,/reality_release_verified_capability_receipt_v1/);
 assert.doesNotMatch(route,/reality_owner_approve_qualified_preview_v1/);
});
test('UI automatically shows durable receipt but no receipt-creation button',()=>{
 assert.match(home,/Durably released verified receipt:/);
 assert.match(home,/INDEPENDENTLY_VERIFIED_AND_DURABLY_RELEASED/);
 assert.match(home,/durable_release_readback_verified/);
 assert.doesNotMatch(home,/Save work receipt · Start automatic repair preparation/);
});

test('provider-backed capability release accepts only actual active signed preview, not old development branch',()=>{
 const latest=readFileSync(
  'supabase/migrations/20261117_verified_capability_receipt_live_preview_source_v14.sql','utf8');
 assert.match(latest,/current_user<>'service_role'/);
 assert.match(latest,/p_proof->>'provider_branch'<>'reality\/chat-direct-work-handoff-20261115'/);
 assert.doesNotMatch(latest,/p_proof->>'provider_branch'<>'feature\/reality-general-capability-engine-20261101'/);
 assert.match(latest,/p_proof->>'provider_repository_sha'<>p_report->>'repository_sha'/);
 assert.match(latest,/p_proof->>'provider_run_id'<>p_report->>'signed_run_id'/);
 assert.match(latest,/VERIFIED_RECEIPT_INDEPENDENT_PROOF_INVALID/);
 assert.match(latest,/VERIFIED_RECEIPT_CONFLICT_NO_REWRITE/);
 assert.match(latest,/installation_authorized',false/);
 assert.match(latest,/original_job_settled',false/);
 assert.doesNotMatch(latest,/cron\.alter_job|cron\.schedule\(/);
});
