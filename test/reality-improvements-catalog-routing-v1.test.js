import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRealityWorkCatalog}
 from '../src/reality-work-catalog-v0.1.js';
const root='https://github.com/maloney2323/Reality';
test('a discovered missing instrument stays in existing Upgrades & improvements, not just PR or feature lists',async()=>{
 const list=async kind=>
  kind==='issues'?[{number:188,title:'Reality genuine capability gap: independently verify original-work completion',
   html_url:root+'/issues/188'}]:
  kind==='pulls'?[{number:189,draft:true,
   title:'Implement governed self-repair installation-to-settlement continuation',
   html_url:root+'/pull/189'}]:[];
 const out=await buildRealityWorkCatalog({
  steward:async()=>({work:[]}),readCatalog:list,
 });
 assert.equal(out.status,'OBSERVED');
 const issue=out.items.find(x=>x.evidence_refs.includes(root+'/issues/188'));
 assert.ok(issue);assert.equal(issue.category,'upgrades');
 assert.equal(issue.finding_type,'OPEN_ISSUE');
 assert.equal(issue.value_assessment.business_impact.status,'UNMEASURED');
 assert.equal(issue.value_assessment.savings.verified_usd,null);
 assert.equal(issue.execution_work_item,null);
 assert.equal(issue.authorization_required,false);
 assert.equal(out.counts.upgrades,2);
 assert.equal(out.execution_enabled,false);
 assert.equal(out.authority,'NONE_GRANTED');
});
test('ordinary bug and already-observed code commit are not mislabeled as business value',async()=>{
 const out=await buildRealityWorkCatalog({
  steward:async()=>({work:[]}),
  readCatalog:async kind=>kind==='issues'?
   [{number:45,title:'Fix login bug',html_url:root+'/issues/45'}]:
   kind==='commits'?[{sha:'f'.repeat(40),html_url:root+'/commit/'+'f'.repeat(40),
    commit:{message:'Improve mobile sign in UI'}}]:[],
 });
 assert.equal(out.items.find(x=>x.finding_type==='OPEN_ISSUE')?.category,'bugs');
 const improvement=out.items.find(x=>x.finding_type==='RECENT_CHANGE_TO_VERIFY');
 assert.equal(improvement?.category,'upgrades');
 assert.equal(improvement?.state,'OBSERVED_NOT_AN_OPEN_DEFECT');
 assert.equal(improvement?.value_assessment.business_impact.status,'UNMEASURED');
 assert.equal(improvement?.value_assessment.return_on_investment_verified,false);
});
