import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publishedRepairEffortReference}
 from '../src/reality-published-repair-effort-v1.js';
import {buildCategoryEconomicPortfolio}
 from '../src/reality-category-economic-portfolio-v1.js';
test('research-backed reference uses actual NASA investigation/fix medians and existing Reality BLS wage',()=>{
 const r=publishedRepairEffortReference();
 assert.equal(r.version,'reality-published-human-repair-effort-v1');
 assert.equal(r.study.failures_investigated,1257);
 assert.equal(r.study.failures_with_fix_effort_recorded,1153);
 assert.equal(r.study.published_year,2017);
 assert.match(r.study.source_url,/ntrs\.nasa\.gov/);
 assert.equal(r.study.median_investigation_hours,2);
 assert.equal(r.study.median_implementation_hours,3);
 assert.equal(r.study.fix_effort_over_eight_hours_percent,28);
 assert.equal(r.study.effort_heavily_skewed,true);
 assert.equal(r.combined_reference_hours,5);
 assert.equal(r.combined_reference_interpretation,
  'SUM_OF_TWO_SEPARATE_STUDY_MEDIANS_NOT_MEDIAN_OF_SUMS');
 assert.equal(r.public_median_developer_wage_usd_per_hour,65.38);
 assert.deepEqual(r.examples.map(x=>[
  x.comparable_confirmed_repairs_assumed,x.illustrative_human_hours,
  x.illustrative_gross_wage_equivalent_usd
 ]),[[1,5,326.9],[5,25,1634.5],[10,50,3269]]);
});
test('external human labor reference never becomes a measured or approved Reality repair',()=>{
 const r=publishedRepairEffortReference();
 assert.equal(r.verified_human_work_hours,null);
 assert.equal(r.verified_actual_cash_savings_usd,null);
 assert.equal(r.financial_roi_verified,false);
 assert.equal(r.calibrated_to_reality_task_durations,false);
 assert.equal(r.original_job_verified_completed_by_reference,false);
 assert.equal(r.covers_capability_feature_builds,false);
 assert.equal(r.read_only,true);
 assert.ok(r.examples.every(x=>x.not_confirmed_backlog_or_verified_savings));
});
test('category projection includes the published repair benchmark without inventing an active repair',()=>{
 const catalog={
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  authority:'NONE_GRANTED',execution_enabled:false,
  items:[],total_findings:0,
  source_coverage:{issues:'checked',pull_requests:'checked',actions:'checked',
   commits:'checked',customer_feedback:'not_connected',
   business_operations:'not_connected',external_research:'not_connected'}
 };
 const output=buildCategoryEconomicPortfolio(catalog);
 assert.equal(output.published_repair_reference.per_comparable_repair_gross_wage_equivalent_usd,326.9);
 assert.equal(output.counts.provider_observations,0);
 assert.equal(output.verified_cash_savings_usd,null);
 assert.equal(output.original_work_independent_settlements_included,false);
 assert.equal(output.human_review_what_if.conditional_low_gross_wage_usd,0);
});
test('dashboard explicitly displays source links and separate hypothetical repair comparisons',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../reality-category-economic-bridge-v1.js',import.meta.url),'utf8');
 assert.match(html,/id="realityPublishedRepairEvidence"/);
 assert.match(html,/id="realityPublishedPerRepairValue"/);
 assert.match(html,/id="realityPublishedRepairGroups"/);
 assert.match(html,/id="realityPublishedOwnerComparison"/);
 assert.match(html,/https:\/\/ntrs\.nasa\.gov\/api\/citations\/20160008693/);
 assert.match(html,/https:\/\/www\.bls\.gov\/news\.release\/ocwage\.t01\.htm/);
 assert.ok(html.indexOf('id="realityPublishedRepairEvidence"')>
  html.indexOf('id="realityCategoryEconomics"'));
 assert.ok(html.indexOf('id="realityPublishedRepairEvidence"')<
  html.indexOf('id="realityBacklogValuePanel"'));
 assert.match(js,/SUM_OF_TWO_SEPARATE_STUDY_MEDIANS_NOT_MEDIAN_OF_SUMS/);
 assert.match(js,/NOT actual time saved, cash saved/);
 assert.doesNotMatch(js,/OWNER_APPROVE_EXACT_VERIFIED|INSTALL_CAPABILITY|\bmethod:\s*['"]POST/);
});
