import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('general source readback accepts only real owner-scoped and provenance-pinned work',()=>{
 const src=read('supabase/migrations/20261101_reality_general_signed_worker_scope_v4.sql');
 assert.match(src,/security invoker/i);
 assert.match(src,/current_user\s*<>\s*'service_role'/);
 assert.match(src,/entity_type='reality_original_source_backed_repair_work'/);
 assert.match(src,/owner_authorized_investigation/);
 assert.match(src,/owner_authorized_installation/);
 assert.match(src,/original_provider_failed_run_id/);
 assert.match(src,/goal_publication_epochs/);
 assert.match(src,/frozen_test_path/);
 assert.match(src,/frozen_test_sha256/);
 assert.doesNotMatch(src,/q\.issue_number<>178/);
 assert.doesNotMatch(src,/q\.original_work_id<>'work:9b9578b3/);
});
test('signed scheduler nominates only pending already-consumed owner approvals',()=>{
 const src=read('supabase/migrations/20261101_reality_signed_pending_repair_wake_readback_v1.sql');
 assert.match(src,/security invoker/i);
 assert.match(src,/current_user\s*<>\s*'service_role'/);
 assert.match(src,/q\.status in \('PENDING','LEASED'\)/);
 assert.match(src,/a\.status in \('CLAIMED','INSTALLED'\)/);
 assert.match(src,/e\.last_transition_event_id=a\.goal_transition_event_id/);
 assert.match(src,/limit 5/);
 assert.match(src,/grant execute on function.*reality_read_pending_approved_repairs_for_wake_v1\(\)/);
 assert.match(src,/revoke all on function/);
});
test('OIDC broker accepts generic issue IDs but requires exact workflow, signed lease and service role',()=>{
 const src=read('supabase/functions/reality-approved-worker-oidc-lease/signed-general-v3.ts');
 assert.match(src,/verifyIdentity\(signed\)/);
 assert.match(src,/verifySingleApprovedRequest\(identity,body\.request\)/);
 assert.match(src,/reality_lease_exact_approved_repair_v2/);
 assert.match(src,/request\.issue_number>100000/);
 assert.match(src,/lease\.issue_number!==body\.request\.issue_number/);
 assert.doesNotMatch(src,/request\.issue_number!==178/);
 assert.doesNotMatch(src,/request\.original_work_id!=='work:9b9578b3/);
});
test('worker always uses exact frozen test from signed original work',()=>{
 const src=read('src/reality-exact-approved-worker-scope-v1.js');
 assert.match(src,/frozen_test_path:fresh\.frozen_test_path/);
 assert.match(src,/fresh\.frozen_test_path!==first\.frozen_test_path/);
 assert.match(src,/FRESH_OWNER_GOAL_SCOPE_RPC_UNAVAILABLE/);
 assert.match(src,/INDEPENDENT_CANDIDATE_OR_ORIGINAL_MISMATCH/);
});
