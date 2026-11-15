import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=readFileSync(new URL(
 '../api/reality/generalized-original-install-review.js',import.meta.url),'utf8');
const ui=readFileSync(new URL(
 '../reality-generalized-install-review-ui-v1.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('owner review API is strictly GET, same signed-in owner and isolated service only',()=>{
 assert.match(api,/req\.method!=='GET'/);
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/db\.project!==process\.env\.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF/);
 assert.match(api,/r\.owner_id!==session\.user_id/);
 assert.match(api,/owner_approval_action_available:false/);
 assert.doesNotMatch(api,/create.*[Ii]nstall|owner_approve_native263|OWNER_APPROVED_EXACT/);
 assert.match(api,/private, no-store/);
});
test('owner proof UI exposes original and two independent CI runs, not model approval',()=>{
 assert.match(html,/reality-generalized-install-review-ui-v1\.js/);
 assert.match(ui,/realityChatPanelProof/);
 assert.match(ui,/owner_approval_action_available===false/);
 assert.match(ui,/independent_frozen_run_id/);
 assert.match(ui,/integrated_test_run_id/);
 assert.match(ui,/same_original_execution_and_settlement_contract_verified/);
 assert.doesNotMatch(ui,/\.method=['"]POST['"]|fetch\(.*method:'POST'|approveInstall/);
 assert.match(ui,/Original job/);
});
