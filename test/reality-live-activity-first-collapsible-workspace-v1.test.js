import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
const index=id=>html.indexOf('id="'+id+'"');

test('live evidence stays uncollapsed at the top of the owner workspace',()=>{
 assert.match(html,/<section id="rileyLiveProgressPanel" class="team-value live-work-priority"/);
 assert.ok(index('rileyLiveProgressPanel')>0);
 assert.ok(index('rileyLiveProgressPanel')<index('rileyNextActionPanel'));
 assert.ok(index('rileyLiveProgressPanel')<index('employeeBoardPanel'));
 assert.ok(index('rileyLiveProgressPanel')<index('rileyConversationDisclosure'));
 assert.ok(index('rileyActiveAutomationCards')>index('rileyLiveProgressPanel'));
 assert.ok(index('rileyActiveAutomationCards')<index('rileyNextActionPanel'));
 assert.match(html,/function renderCurrentAutomationCards\(graph\)/);
 assert.match(html,/renderCurrentAutomationCards\(graph\);/);
 assert.match(html,/j\.phase!=='SETTLED'/);
 assert.match(html,/Same original|Original job:/);
 assert.match(html,/Tested candidate only\. Installation, approval and same-job settlement are not proven/);
});

test('secondary sections and every employee card have accessible native disclosure controls',()=>{
 for(const id of ['rileyNextActionPanel','rileyTaylorCombinedQueue',
  'combinedShiftRoleHandoffs','employeeBoardPanel','rileyConversationDisclosure',
  'workforceSavingsPlanner'])
  assert.match(html,new RegExp('<details[^>]*id="'+id+'"'));
 assert.match(html,/const card=document\.createElement\('details'\);card\.className='team-card'/);
 assert.match(html,/const summary=document\.createElement\('summary'\);summary\.className='team-card-summary'/);
 assert.match(html,/panel\.open=!panel\.hidden/);
 assert.doesNotMatch(html,/<details[^>]*id="workforceSavingsPlanner"[^>]*\bopen\b/);
 assert.match(html,/<summary>Reality Chat · Expand conversation and message Reality<\/summary>/);
});

test('new layout retains the exact existing worker, shift and approval boundaries',()=>{
 for(const id of ['runFullShift','rileyActualWorkerReceipt','rileyLiveBlocker',
  'rileyVerifiedOriginalJobRows','rileyUnifiedOriginalGraph','rileyOriginalActivityRows',
  'rileyLiveTimeline','shiftStatus','teamToggle','teamCards','composer','prompt','send']){
  assert.equal(html.split('id="'+id+'"').length-1,1,id+' should remain unique');
 }
 assert.match(html,/function renderRileyLiveProgress\(readback\)/);
 assert.match(html,/async function refreshShiftStatus\(\)/);
 assert.match(html,/existing signed-in endpoint/);
 assert.match(html,/Only|No second Start needed/);
 assert.match(html,/setInterval\(\(\)=>\{if\(!\$\('chat'\)\.hidden&&!pending\)void refreshShiftStatus\(\)\},15000\)/);
});
