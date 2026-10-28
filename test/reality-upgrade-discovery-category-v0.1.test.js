import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
test('Upgrade Discovery renders inside Upgrades & improvements category without an extra top-level category',()=>{
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
 assert.match(script,/\['upgrades','Upgrades & improvements','Proposed changes'\]/);
 assert.doesNotMatch(script,/\['upgrade-discovery',/);
 assert.match(script,/\(wcCurrent==='upgrades'\?wcUpgradeReviewHTML\(\):''\)/);
 assert.match(script,/wcCurrent==='upgrades'\?\s*shown\.length\+' findings · '\+wcUpgradeReviews\.length\+' jobs to review'/);
 assert.match(script,/n\+' found · '\+wcUpgradeReviews\.length\+' review'/);
 assert.match(script,/wcUpgradeReviews=safe/);
 assert.match(script,/wcUpgradeReviews=\[\];wcRender\(\)/);
});
test('Unfinished Work links to the category rather than running a second upgrade panel',()=>{
 const start=script.indexOf('function wcUnfinishedHTML(job)');
 const end=script.indexOf('async function wcLoadUnfinishedWork()',start);
 assert.ok(start>0&&end>start);
 const ui=script.slice(start,end);
 assert.match(ui,/Review upgrade discovery in categories/);
 assert.match(ui,/data-wc-upgrade-jump/);
 assert.doesNotMatch(ui,/data-recovery-run/);
 assert.doesNotMatch(ui,/data-recovery-timeline/);
 assert.match(script,/function wcOpenUpgradeCategory\(\)/);
 assert.match(script,/wcCurrent='upgrades';wcRender\(\)/);
});
test('source-backed upgrade review cards show actionable diagnosis ONLY for checkpointed, active work',()=>{
 const start=script.indexOf('function wcUpgradeReviewHTML(){');
 const end=script.indexOf('function wcRender(){',start);
 assert.ok(start>0&&end>start);
 const fn=script.slice(start,end);
 const state={wcUpgradeReviews:[],esc:value=>String(value).replaceAll('<','&lt;'),
  $:()=>({style:{display:'block'}})};
 const execute=items=>{
  state.wcUpgradeReviews=items;
  return vm.runInNewContext(fn+';wcUpgradeReviewHTML()',state);
 };
 const work='work:'+'a'.repeat(32),conversation='4cc2f119-385c-48b8-8f03-88bbd47360df';
 const ready={work_id:work,conversation_id:conversation,title:'Repair <without guessing>',
  state:'RECOVERY_CHECKPOINT_SAVED',goal_still_current:true,
  action_completed:true,job_completed:false};
 const html1=execute([ready]);
 assert.match(html1,/Reality Upgrade Discovery/);
 assert.match(html1,/Run recovery loop · Save findings/);
 assert.match(html1,/data-recovery-run/);
 assert.match(html1,/Repair &lt;without guessing>/);
 assert.match(html1,/not completed · No code upgrade authorized/);
 const html2=execute([{...ready,state:'PRIOR_ACTION_UNRESOLVED',action_completed:false}]);
 assert.doesNotMatch(html2,/data-recovery-run/);
 assert.match(html2,/Reconcile the earlier external action/);
 const html3=execute([{...ready,goal_still_current:false}]);
 assert.doesNotMatch(html3,/data-recovery-run/);
 const html4=execute([]);
 assert.match(html4,/No unfinished jobs with saved Continuity/);
});
test('existing signed-in saved-job recovery endpoint and evidence checks remain the sole diagnosis action',()=>{
 assert.match(script,/\$\('wcTaskList'\)\.addEventListener\('click',async event=>\{\s*const button=event\.target\.closest\('button\[data-recovery-run\]'\)/);
 assert.match(script,/\/api\/reality\/personal-recovery-loop/);
 assert.match(script,/RUN_AND_RECORD_RECOVERY_DIAGNOSIS/);
 assert.match(script,/info\.upgrade_discovery\?\.authorization_granted!==false/);
 assert.match(script,/info\.original_job_completed!==false/);
 assert.match(script,/info\.diagnosis_saved!==true/);
 assert.doesNotMatch(script,/wcUpgradeReviews.*githubWrite/);
});
