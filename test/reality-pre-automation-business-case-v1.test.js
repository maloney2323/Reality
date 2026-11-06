import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from '../src/reality-employee-identity-roster-v1.js';
import {buildRealityShiftValuePreview}
 from '../src/reality-shift-value-preview-v1.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const client=readFileSync(new URL(
 '../reality-pre-automation-business-case-v1.js',import.meta.url),'utf8');
const source=(i,category,url)=>({
 finding_id:'catalog:'+i.repeat(32),finding_type:'OPEN_ISSUE',
 source:'github_issues',state:'TRACKED_NEEDS_REVIEW',
 title:'Current source issue '+i,category,
 evidence_refs:['https://github.com/maloney2323/Reality/issues/'+url],
 value_assessment:{triage_score:80},
 execution_work_item:null,authorization_required:false
});
function fixture(){
 const catalog={
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  observed_at:'2026-11-06T17:00:00.000Z',
  authority:'NONE_GRANTED',execution_enabled:false,
  items:[source('a','bugs',263),source('b','reliability',143),
   source('c','customer',62)],
  source_coverage:{issues:'checked',pull_requests:'checked',actions:'checked',
   commits:'checked',customer_feedback:'not_connected',
   business_operations:'not_connected',external_research:'not_connected'}
 };
 const roster=buildRealityNamedEmployeeRoster(
  buildRealityWorkdayOpportunityBrief(catalog));
 const value_preview=buildRealityShiftValuePreview(roster);
 return {ok:true,...roster,value_preview,owner_scope_verified:true,
  worker_execution_authorized:false};
}
function fakeUI(payload,ok=true){
 const nodes=new Map();
 function node(tag='div'){
  return {tag,textContent:'',value:'',children:[],href:'',target:'',rel:'',
   append(...items){this.children.push(...items)},
   replaceChildren(...items){this.children=items}
  };
 }
 const get=id=>{
  if(!nodes.has(id))nodes.set(id,node());
  return nodes.get(id);
 };
 get('realityBeforeAutomationValue');
 get('realityPreROIRepairs').value='1';
 get('realityPreROICost').value='';
 const calls=[];
 const document={
  body:{dataset:{realityRoute:'value'}},
  getElementById:get,createElement:node,
  createDocumentFragment:()=>node('fragment')
 };
 vm.runInNewContext(client,{
  document,Intl,Number,Set,Error,
  AbortSignal,
  fetch:async(url,opts)=>{
   calls.push({url,opts});
   return {ok,json:async()=>payload};
  }
 },{timeout:2000});
 return {get,calls};
}
const tick=async()=>new Promise(resolve=>setImmediate(resolve));

test('Value Verification owns the source-backed business case; Home only links before execution',()=>{
 for(const id of ['realityBeforeAutomationValue','realityPreROIStatus',
  'realityPreROIRolesCount','realityPreROIFindings',
  'realityPreROIRepair','realityPreROIRepairs','realityPreROICost',
  'realityPreROIManual','realityPreROINet','realityPreROIPercent',
  'realityPreROIAssumptions','realityPreROIRefresh','realityPreROIRoles'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(html.indexOf('id="rvPanelPotential"')<
  html.indexOf('id="realityBeforeAutomationValue"'));
 assert.ok(html.indexOf('id="realityBeforeAutomationValue"')<
  html.indexOf('<section id="realitySimpleHome"'));
 assert.ok(html.indexOf('id="realityEmployeeShiftPlanner"')>
  html.indexOf('<section id="realitySimpleHome"'));
 assert.match(html,/href="\/value#pre-automation">Review business case in Value Verification/);
 assert.match(client,/document\.body\?\.dataset\?\.realityRoute!=='value'/);
 const nav=readFileSync(new URL('../reality-value-verification-v1.js',import.meta.url),'utf8');
 assert.match(nav,/window\.location\?\.hash==='#pre-automation'\?'potential':'overview'/);
 assert.match(html,/src="\/reality-pre-automation-business-case-v1\.js"/);
 assert.match(html,/BEFORE YOUR FIRST AUTOMATION/);
 assert.match(html,/PROJECTED COST-BENEFIT SCENARIO · NOT VERIFIED ROI/);
 assert.match(html,/OpenAI\/infrastructure and approval costs/);
 assert.match(html,/NASA-hosted Hamill/);
 assert.match(html,/May 2025 national software developer median wage/);
 assert.doesNotMatch(client,/method:'POST'|authorizeExact|runFullLoop|queueVerifiedOriginalRepair/);
 assert.doesNotThrow(()=>new vm.Script(client));
});
test('authenticated current catalog shows only observations and published one-fault wage equivalent',async()=>{
 const ui=fakeUI(fixture());
 await tick();
 assert.equal(ui.calls.length,1);
 assert.equal(ui.calls[0].url,'/api/reality/personal-employee-roster');
 assert.equal(ui.calls[0].opts.method,'GET');
 assert.equal(ui.calls[0].opts.credentials,'same-origin');
 assert.equal(ui.get('realityPreROIRolesCount').textContent,'8 proposed roles');
 assert.equal(ui.get('realityPreROIFindings').textContent,'3');
 assert.equal(ui.get('realityPreROIRepair').textContent,'$326.90');
 assert.equal(ui.get('realityPreROIManual').textContent,'$326.90');
 assert.equal(ui.get('realityPreROINet').textContent,'Enter a positive cost');
 assert.equal(ui.get('realityPreROIPercent').textContent,'Unknown without costs');
 assert.match(ui.get('realityPreROIStatus').textContent,/NOT 3 validated automations/);
 const roles=ui.get('realityPreROIRoles').children[0].children;
 assert.equal(roles.length,8);
 assert.ok(roles.some(x=>x.children[0].textContent.includes('Riley')));
});
test('cost entry creates a labeled hypothetical conditional ROI, never measured savings',async()=>{
 const ui=fakeUI(fixture());await tick();
 ui.get('realityPreROIRepairs').value='4';
 ui.get('realityPreROICost').value='100';
 ui.get('realityPreROICost').oninput();
 assert.equal(ui.get('realityPreROIManual').textContent,'$1,307.60');
 assert.equal(ui.get('realityPreROINet').textContent,'$1,207.60');
 assert.equal(ui.get('realityPreROIPercent').textContent,'1207.6% hypothetical');
 assert.match(ui.get('realityPreROIAssumptions').textContent,/ASSUMED/);
 assert.match(ui.get('realityPreROIAssumptions').textContent,/unverified/);
 ui.get('realityPreROICost').value='-20';
 ui.get('realityPreROICost').oninput();
 assert.equal(ui.get('realityPreROINet').textContent,'Invalid assumption');
 assert.equal(ui.get('realityPreROIPercent').textContent,'Not calculated');
});
test('authentication failure, forged cash savings, or fake source never displays invented ROI',async()=>{
 const missing=fakeUI(null,false);await tick();
 assert.equal(missing.get('realityPreROIFindings').textContent,'Unverified');
 assert.equal(missing.get('realityPreROIManual').textContent,'Not verified');
 const base=fixture();
 for(const data of [
  {...base,value_preview:{...base.value_preview,
    evidence:{...base.value_preview.evidence,verified_net_roi_usd:500}}},
  {...base,proposed_employees:base.proposed_employees.map((e,i)=>i===0?
    {...e,independently_completed_jobs:1}:e)},
  {...base,existing_work_center_candidates:10},
  {...base,value_preview:{...base.value_preview,
    comparable_software_repair:{...base.value_preview.comparable_software_repair,
     one_fault_example:{...base.value_preview.comparable_software_repair.one_fault_example,
      independently_verified_current_faults:2}}}}
 ]){
  const u=fakeUI(data);await tick();
  assert.equal(u.get('realityPreROIRolesCount').textContent,'Unverified');
  assert.equal(u.get('realityPreROIPercent').textContent,'Not calculated');
 }
});
