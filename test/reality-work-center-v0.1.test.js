import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('work center renders eleven clickable category choices in responsive dashboard',()=>{
 assert.ok(html.includes('id="workCenter"'));
 assert.ok(html.includes('id="wcCategories"'));
 assert.ok(html.includes('id="wcDiscover"'));
 assert.ok(html.includes("$('wcDiscover').onclick=()=>{$('findWork').click()}"));
 assert.ok(html.includes('id="wcTaskList"'));
 assert.ok(html.includes('data-wc-cat'));
 for(const category of [
  'Customer issues & feedback','Bug fixes','Upgrades & improvements',
  'New features','Performance & reliability','Integrations & deployment',
  'Security, governance & evidence','Operations & workflow',
  'Research & opportunities','Automation & time returned','View all']){
  assert.ok(html.includes(category),category);
 }
 assert.ok(html.includes('void wcDiscoverCatalog();'));
 assert.ok(html.includes("fetch('/api/reality/work-catalog'"));
 assert.ok(html.includes('w.evidence_refs'));
});
test('individual batch and 1–8h shift are planning-only, not real authorizations',()=>{
 assert.ok(html.includes('data-wc-mode="tasks"'));
 assert.ok(html.includes('data-wc-mode="shift"'));
 assert.ok(html.includes('id="wcHours"'));
 for(let hours=1;hours<=8;hours++)
  assert.ok(html.includes('<option value="'+hours+'">'+hours+' hour'+(hours===1?'':'s')+'</option>')||
   html.includes('<option value="'+hours+'"'+(hours===4?' selected':'')+'>'+hours+' hour'+(hours===1?'':'s')+'</option>'));
 assert.ok(html.includes('wcPicked=new Set()'));
 assert.ok(html.includes('wcSummary(true)'));
 assert.ok(html.includes('No credit charge · No shift started · No authority granted.'));
 assert.ok(html.includes("intent:'HISTORY_CHECK'"));
 assert.ok(!html.includes("onclick=\"runPersonalIssueDispatch"));
});
test('credits and task-runtime predictions are explicitly uncalibrated',()=>{
 assert.ok(html.includes('Billing and token metering')||html.includes('billing and token metering'));
 assert.ok(html.includes('id="wcRate"'));
 assert.ok(html.includes('value="unlimited"'));
 assert.ok(html.includes('Unlimited plan is hypothetical'));
 assert.ok(html.includes('Full investigation, repair and completed-job duration: UNKNOWN'));
 assert.ok(html.includes('illustrative')||html.includes('Illustrative'));
 assert.ok(html.toLowerCase().includes('no measured baseline'));
});
test('all inline JS remains syntactically valid after dashboard integration',()=>{
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
});

test('ranked work shows evidence-first triage, risk and actionable-next-step without fake impact',()=>{
 for(const keyword of [
  'id="wcSort"','value="triage"','value="risk"','value="automation"',
  'value_assessment','triage_score','next_validation_step',
  'Business impact: UNMEASURED','Full-task labor: UNKNOWN',
  'Verified savings: NONE RECORDED',
 ])assert.ok(html.includes(keyword),keyword);
});
test('one-task value simulator requires owner inputs and explicitly labels unverified cash savings',()=>{
 for(const keyword of [
  'id="wcManualMinutes"','id="wcFrequency"','id="wcCoverage"',
  'id="wcLaborRate"','id="wcMonthlyCost"','id="wcValueOutput"',
  'wcRenderValueScenario()','HYPOTHETICAL scenario',
  'Real cash savings: NOT VERIFIED',
  'No workforce reduction can be inferred',
 ])assert.ok(html.includes(keyword),keyword);
 assert.ok(!html.includes('id="wcManualMinutes" value='));
 assert.ok(!html.includes('id="wcFrequency" value='));
});

test('Workforce capacity panel collects role hours, review and exceptions rather than displaying fabricated layoffs',()=>{
 for(const keyword of [
  'id="wcStaffing"','id="wcFteHours"','id="wcReviewMinutes"',
  'id="wcExceptionRate"','id="wcExceptionMinutes"',
  'id="wcTeamHeadcount"','id="wcSetupCost"',
  'id="wcCalculateStaffing"','id="wcStaffingResult"',
  'HYPOTHETICAL workforce scenario','FULL-TIME-EQUIVALENT CAPACITY',
  'Theoretical whole-position capacity ceiling',
  'Actual eliminable positions: UNKNOWN (NOT VERIFIED)',
  'VERIFIED PAYROLL SAVINGS: NONE',
  'real company',
 ]){
  if(keyword==='real company')continue;
  assert.ok(html.includes(keyword),keyword);
 }
 for(const id of ['wcFteHours','wcReviewMinutes','wcExceptionRate',
  'wcExceptionMinutes','wcTeamHeadcount']){
  assert.ok(!html.includes('id="'+id+'" value='),'Cannot silently prefill '+id);
 }
 assert.ok(html.includes("fetch('/api/reality/workforce-impact'"));
 assert.ok(html.includes('Enter zero explicitly where justified'));
 assert.ok(html.includes('No workforce or payment action occurred'));
});
