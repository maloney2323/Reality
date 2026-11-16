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
 assert.match(api,/owner_approval_action_available:\(/);
 assert.match(api,/r\.same_original_execution_and_settlement_contract_verified===true/);
 assert.match(api,/r\.approval_receipt_id===null/);
 assert.match(api,/no_installation_effect_by_get:true/);
 assert.doesNotMatch(api,/create.*[Ii]nstall|owner_approve_native263|OWNER_APPROVED_EXACT/);
 assert.match(api,/private, no-store/);
});
test('owner proof UI exposes evidence and the separately authenticated one-click action only after all gates',()=>{
 assert.match(html,/reality-generalized-install-review-ui-v1\.js/);
 // The real scrollable transcript owns the exact decision, not a
 // flex sibling that the mobile overflow:hidden shell would clip.
 assert.match(ui,/const host=get\('privateTranscript'\)\|\|get\('privateReady'\)/);
 assert.match(ui,/if\(p.parentNode!==host\)host.append\(p\)/);
 assert.match(ui,/p\.className='team-proof bubble reality-chat-live-work'/);
 assert.doesNotMatch(ui,/host\.insertBefore\(p,thread\)/);
 assert.doesNotMatch(ui,/const host=get\('realityChatPanelProof'\)/);
 assert.match(ui,/privateAccountMissionBanner/);
 assert.match(ui,/host\.insertBefore\(p,before\|\|null\)/);
 assert.match(ui,/host\.id==='privateReady'/);
 assert.match(html,/id="privateReady"/);
 assert.match(html,/id="privateAccountMissionBanner"/);
 assert.match(ui,/owner_approval_action_available===true/);
 assert.match(ui,/approveExactFromUserClick/);
 assert.match(ui,/generalizedOriginalInstallApproveExactButton/);
 assert.match(ui,/GENERAL_ORIGINAL_FINAL_RELEASE_CONTINUATION_NOT_READY|same_original_execution_and_settlement_contract_verified===true/);
 assert.match(ui,/independent_frozen_run_id/);
 assert.match(ui,/integrated_test_run_id/);
 assert.match(ui,/same_original_execution_and_settlement_contract_verified/);
 assert.match(ui,/method:'POST'/);
 assert.match(ui,/no_third_confirmation===true/);
 assert.match(ui,/approved|Approve exact verified upgrade/);
 assert.doesNotMatch(ui,/setInterval\([^,]+approveExactFromUserClick/);
 assert.match(ui,/Original job/);
});


test('exact signed owner approval action never writes source, authorizes jobs or permits duplicate prompts',()=>{
 const approval=readFileSync(new URL(
  '../api/reality/generalized-owner-install-approval.js',import.meta.url),'utf8');
 assert.match(approval,/authenticatedChatSession\(req,res\)/);
 assert.match(approval,/assertSameOrigin\(req\)/);
 assert.match(approval,/owner_approval_ready!==true/);
 assert.match(approval,/reality_owner_approve_general_original_install_v1/);
 assert.match(approval,/session\.access_token/);
 assert.match(approval,/retry_owner_approval:false/);
 assert.match(approval,/no_third_confirmation/);
 assert.doesNotMatch(approval,/\/contents\/|git\/refs\/|force:true/);
});
test('one-use install and independent settlement remain separate workers and fenced service RPCs',()=>{
 const worker=readFileSync(new URL(
 '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const installer=readFileSync(new URL(
  '../supabase/functions/reality-governed-general-original-installer-v1/index.ts',
  import.meta.url),'utf8');
 const settlement=readFileSync(new URL(
  '../supabase/functions/reality-governed-general-original-postinstall-verifier-v1/index.ts',
  import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261115_general_original_owner_approval_and_install_v1.sql',
  import.meta.url),'utf8');
 const finalSQL=readFileSync(new URL(
  '../supabase/migrations/20261115_general_original_independent_postinstall_settlement_v1.sql',
  import.meta.url),'utf8');
 const recoverySQL=readFileSync(new URL(
  '../supabase/migrations/20261116_general_original_fenced_recovery_observation_v1.sql',
  import.meta.url),'utf8');
 assert.match(worker,/continueGeneralOwnerApprovedOriginalInstall/);
 assert.match(worker,/GENERAL_ORIGINAL_INSTALL_FENCED_NO_PROVIDER_EFFECT/);
 assert.match(worker,/originalInstallNeedsRecovery\?/);
 assert.match(worker,/settleGeneralOwnerApprovedOriginal/);
 assert.match(installer,/reality_claim_general_original_install_v1/);
 assert.match(installer,/REALITY_GOVERNED_INSTALL_DISPOSITION/);
 assert.match(installer,/REALITY_INSTALLER_READ_ONLY_PROVIDER_CAPABILITY/);
 assert.match(installer,/REALITY_INSTALLER_READ_ONLY_RECOVERY_EVIDENCE/);
 assert.match(installer,/reality_record_general_original_fenced_recovery_v1/);
 assert.match(installer,/FENCED_RECOVERY_DURABLE_EVIDENCE_NOT_VERIFIED/);
 assert.match(installer,/FENCED_BASELINE_AND_APPROVED_GIT_OBJECTS_STILL_READABLE/);
 assert.match(installer,/FENCED_GIT_OBJECTS_OR_EXACT_SOURCE_NOT_VERIFIED/);
 assert.match(installer,/gh\(token,'\/git\/blobs\/'\+scope\.expected_installed_blob_sha\)/);
 assert.match(installer,/const repository=await gh\(token,''\)/);
 assert.match(installer,/console\.info\('REALITY_GOVERNED_INSTALL_DISPOSITION',status\)/);
 assert.match(installer,/GENERAL_INSTALL_ALREADY_FENCED_NO_PROVIDER_EFFECT_CONFIRMED/);
 // Diagnostics must not change the one-use install fence or retry unknown writes.
 assert.match(installer,/NO_SECOND_WRITE/);
 assert.doesNotMatch(installer,/force:true/);
 assert.match(installer,/force:false/);
 assert.match(installer,/GENERAL_INSTALL_FENCED_EFFECT_UNCERTAIN_NO_SECOND_WRITE/);
 assert.match(settlement,/reality_record_general_original_independent_settlement_v1/);
 assert.match(settlement,/Vercel Preview Comments/);
 assert.match(settlement,/INDEPENDENT_ORIGINAL/);
 assert.match(sql,/reality_owner_approve_general_original_install_v1/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(finalSQL,/net_verified_labor_savings_usd/);
 assert.match(finalSQL,/roi_verification_status/);
 assert.match(finalSQL,/NOT_MEASURED/);
 assert.match(recoverySQL,/REALITY_GOVERNED_FENCED_RECOVERY_NO_REPLAY|CHECK\(NOT installation_retried\)/);
 assert.match(recoverySQL,/GENERAL_ORIGINAL_FENCED_RECOVERY_OBSERVATION_DURABLE/);
 assert.match(recoverySQL,/reality_read_general_original_install_scope_v1/);
 assert.match(recoverySQL,/ON CONFLICT\(attempt_id\) DO NOTHING/);
 assert.match(recoverySQL,/current_user<>'service_role'/);
 assert.match(recoverySQL,/REVOKE ALL ON reality_internal\.governed_original_install_fenced_recoveries_v1/);
});
