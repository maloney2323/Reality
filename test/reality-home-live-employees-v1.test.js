import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const chat=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
const brief=readFileSync(new URL('../reality-home-employee-brief-v1.js',import.meta.url),'utf8');
test('Home makes existing employee roles and verified economic evidence visible above upgrade detail',()=>{
 const home=html.indexOf('<section id="realitySimpleHome"');
 const people=html.indexOf('<section id="realityHomeEmployees"',home);
 const value=html.indexOf('<section id="simpleEconomicEvidenceDashboard"',home);
 const live=html.indexOf('<section id="realityShiftHomeBrief"',home);
 const optional=html.indexOf('<details id="realityHomeUpgradeDetails"',home);
 const upgrade=html.indexOf('<section id="realityHomePriorities"',home);
 assert.ok(home>=0&&people>home&&value>people&&live>value);
 assert.ok(optional>live&&upgrade>optional);
 assert.match(html,/href="\/value">Evaluation<\/a>/);
 assert.match(html,/href="\/chat-simple#employeeBoardPanel"/);
 assert.match(html,/<script defer src="\/reality-home-employee-brief-v1.js"><\/script>/);
});
test('Home displays eight real role names without claiming active independent workers',()=>{
 const names=['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'];
 for(const n of names){
  assert.equal(html.match(new RegExp('data-home-employee="'+n+'"','g'))?.length,1);
 }
 assert.match(html,/names represent eight roles for one OpenAI model/);
 assert.match(html,/No new job or shift authorized/);
 assert.match(html,/Verified net capacity returned/);
 assert.match(html,/realityEconReceipts/);
});
test('read-only roster fetch is authenticated, owner-checked and does not write or start a shift',()=>{
 assert.match(brief,/method:'GET',credentials:'same-origin'/);
 assert.match(brief,/\/api\/reality\/personal-employee-roster/);
 assert.match(brief,/data\.owner_scope_verified!==true/);
 assert.match(brief,/data\.worker_execution_authorized!==false/);
 assert.match(brief,/data\.installation_authorized!==false/);
 assert.match(brief,/data\.production_changed!==false/);
 assert.match(brief,/data\.saved_chat_employee_proposals_status/);
 assert.match(brief,/employee\.candidate_count/);
 assert.doesNotMatch(brief,/method:'POST'|AUTHORIZE_EXACT_EMPLOYEE_SHIFT/);
 assert.doesNotMatch(brief,/localStorage|sessionStorage/);
});
test('long upgrade descriptions remain available but closed until requested',()=>{
 assert.match(html,/<details id="realityHomeUpgradeDetails"/);
 assert.match(html,/id="simpleResearchList"/);
 assert.match(html,/upgradeDisclosure\.open=true/);
 assert.doesNotMatch(html,/<details id="realityHomeUpgradeDetails"[^>]*open/);
});
test('Home can deep-link to authenticated Employee board in Chat without execution',()=>{
 assert.match(chat,/window\.location\.hash==='#employeeBoardPanel'/);
 assert.match(chat,/panel\.hidden=false;panel\.open=true/);
 assert.match(chat,/void refreshEmployeeBoard\(\)/);
});
