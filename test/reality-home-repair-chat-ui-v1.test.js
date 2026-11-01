import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const client=scripts.find(s=>s.includes('// Reality Repair Chat bridges'));
const section=html.slice(html.indexOf('<section id="repairChatPanel"'),
 html.indexOf('<section id="privateConversationPanel"'));
test('both Home scripts parse without changing the existing authenticated chat',()=>{
 assert.equal(scripts.length,2);
 for(const [i,source] of scripts.entries())
  assert.doesNotThrow(()=>new Script(source,{filename:'index-script-'+i+'.js'}));
 assert.match(html,/id="privateReady"/);
 assert.match(html,/id="privateConversationPanel"/);
 assert.match(html,/id="repairChatPanel"/);
 assert.match(html,/id="openRepairChatHome"/);
 assert.match(html,/id="privateTranscript"/);
 assert.match(html,/id="privateSend"/);
 assert.match(html,/id="wcApproveExactInstall"/);
 assert.match(html,/id="wcInstallSettlementPanel"/);
});
test('repair Home navigation, conversation and exact worker review surfaces are unique',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'duplicate HTML IDs would break repair control binding');
 for(const name of ['realityConversationTab','realityRepairChatTab',
  'repairChatMessages','repairChatPrompt','repairChatSend',
  'repairChatFind','repairChatStartDiscovery','repairChatReview',
  'repairChatOpportunities','repairChatJobState','repairChatStatus']){
   assert.equal(ids.filter(x=>x===name).length,1,name+' has one DOM target');
 }
 assert.match(section,/Source-backed self-repair/);
 assert.match(section,/id="repairChatKnownIssueBox"/);
 assert.match(section,/id="repairChatKnownIssue"/);
 assert.match(section,/Original repair case #188/);
 assert.match(section,/id="repairChatActivity"/);
 assert.match(section,/id="repairChatActivityEvents"/);
 assert.match(section,/id="repairChatWorkDetails"/);
 assert.match(section,/Approved installation/);
 assert.match(section,/Independent settlement/);
});
test('only owner-bound source-backed actions can start an investigation; chat cannot install',()=>{
 assert.ok(client);
 assert.match(client,/\/api\/reality\/personal-chat/);
 assert.match(client,/request_id:crypto\.randomUUID\(\)/);
 assert.match(client,/\/api\/reality\/personal-real-repair-opportunities/);
 assert.match(client,/if\(check&&!check\.disabled\)check\.click\(\)/);
 assert.match(client,/const known188=options\.some/);
 assert.match(client,/AUTHORIZE_SOURCE_VERIFIED_ORIGINAL_REPAIR/);
 assert.match(client,/expected_failed_run_id/);
 assert.match(client,/expected_source_sha/);
 assert.match(client,/\/api\/reality\/personal-governed-build/);
 assert.match(client,/QUEUE_SAFE_AUTONOMOUS_DISCOVERY/);
 assert.match(client,/eligible_for_investigation===true/);
 assert.match(client,/\/api\/reality\/personal-loop-completion/);
 assert.match(client,/wcDirectRepairReviewScope=scope/);
 assert.match(client,/selectedIssue=item.issue_number/);
 assert.match(client,/await readCandidate.onclick\(\)/);
 assert.match(client,/wcDirectRepairReviewScope=null/);
 assert.match(client,/if\(!selectedIssue\)selectedWork=b.original_work_id/);
 assert.doesNotMatch(client,/OWNER_APPROVE_EXACT_INSTALL/);
 assert.doesNotMatch(client,/wcApproveExactInstall.*\.click\(/);
 assert.doesNotMatch(client,/goal_command/);
 assert.doesNotMatch(client,/https:\/\/api\.github\.com\//);
});
test('no synthetic success or install triggered by viewing, asking or queuing',()=>{
 assert.match(client,/proof\.loop_complete===true&&proof\.independently_verified===true&&/);
 assert.match(client,/repairChatStartDiscovery/);
 assert.match(client,/worker_dispatch_started===true/);
 assert.match(client,/source and a separate exact approval/);
 assert.match(client,/headers:\{'content-type':'application\/json','accept':'text\/event-stream'\}/);
 assert.match(client,/activityStages\.has\(data\.stage\)/);
 assert.match(client,/CHAT_STREAM_INCOMPLETE_RECONCILE/);
 assert.match(client,/result\.continuity\?\.current_answer_persisted!==true/);
 assert.match(client,/activityEnd\(true\)/);
 assert.doesNotMatch(client,/result\.original_job_completed=true/);
});
