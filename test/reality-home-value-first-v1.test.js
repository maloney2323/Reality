import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const at=id=>html.indexOf('id="'+id+'"');
const idCount=id=>(html.match(new RegExp('id="'+id+'"','g'))||[]).length;

test('Reality home begins with verified work and one independent final receipt count',()=>{
 const order=['realityEconSettled','realityEconReceipts','realityEconSignals',
  'simpleRunFullLoop','realityEconWorkHistory','realityPublishedRepairEvidence',
  'simpleResearchList','realityEngineDelta','realityCategoryEconomics',
  'realityBacklogValuePanel','simpleWorkdayBrief'];
 assert.ok(order.every(id=>at(id)>=0));
 for(let i=1;i<order.length;i++)assert.ok(at(order[i])>at(order[i-1]),
  order[i]+' must follow '+order[i-1]);
 assert.match(html,/What Reality has accomplished — and what comes next/);
 assert.match(html,/One unduplicated operational evidence scorecard/);
 assert.equal(idCount('realityEconReceipts'),1);
 assert.equal(idCount('realityEconSettled'),1);
 assert.equal(idCount('realityEconSignals'),1);
});
test('existing original jobs, approvals, chat and all value data remain wired exactly once',()=>{
 for(const id of ['realityEconCapacity','realityEconHuman','realityEconCash',
  'realityEconRisk','realityEconInputs','realityEconWorkHistory',
  'realityEngineFinalReceipts','realityEngineOwnerFindings',
  'realityEngineTestedRepairs','realityModelCapabilityMap',
  'realityModelCapabilities','homeOwnerAuthorizations','privateChat',
  'workCenter','simpleArchivePanel','simpleRunFullLoop','simpleReviewFirst',
  'simpleViewGapCategory','simpleChat','simpleArchiveOpen','simpleResearchList',
  'simpleFullLoopStatus','realityCategoryOwnerList','realityPublishedRepairGroups'])
  assert.equal(idCount(id),1,id+' must remain as single linked node');
 assert.match(html,/id="realityHomeGovernance" class="reality-home-expand"/);
 assert.match(html,/id="realityHomeCategories" class="reality-home-expand"/);
 assert.match(html,/id="realityHomePlanning" class="reality-home-expand"/);
 assert.match(html,/id="realityHomeWorkday" class="reality-home-expand"/);
 assert.match(html,/id="realityHomeFinance" class="reality-home-expand"/);
});
test('source, labor reference and governor are kept while repeated summary cards are hidden',()=>{
 assert.match(html,/id="realityEngineDelta"/);
 assert.match(html,/class="reality-engine-metrics"[^>]+hidden aria-hidden="true"/);
 assert.match(html,/aria-label="Existing Reality category evidence[^"]*" hidden aria-hidden="true"/);
 assert.match(html,/https:\/\/ntrs\.nasa\.gov\/api\/citations\/20160008693/);
 assert.match(html,/https:\/\/www\.bls\.gov\/news\.release\/ocwage\.t01\.htm/);
 assert.match(html,/id="realityPublishedRepairEvidence"/);
 assert.match(html,/id="realityPublishedRepairGroups"/);
 assert.match(html,/Reality adapts to the business—not just the prompt/);
 assert.match(html,/id="realityModelCapabilityMap"/);
 assert.match(html,/FINANCIAL_VALUE_UNKNOWN|Not established/);
});
