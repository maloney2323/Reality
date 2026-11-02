import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {humanLaborBenchmarkCatalog,evaluateHumanLaborBenchmark as benchmark,
 enrichOwnerJobRoiWithHumanLabor as enrich} from '../src/reality-human-labor-benchmark-v1.js';
const W='work:'+'a'.repeat(32);
test('fixed source catalog retains authentic unit and provenance',()=>{
 const c=humanLaborBenchmarkCatalog();
 assert.equal(c.BLS_SOFTWARE_WAGE.wage_by_occupation['15-1252'],65.38);
 assert.equal(c.BLS_SOFTWARE_WAGE.wage_by_occupation['15-1253'],50.14);
 assert.equal(c.APQC_INVOICE_PRODUCTIVITY.metric_id,'101287');
 assert.equal(c.APQC_INVOICE_PRODUCTIVITY.value,25714);
 assert.equal(c.APQC_INVOICE_PRODUCTIVITY.sample_size,3284);
 assert.equal(c.ONET_SOFTWARE_TASKS.unit,'TASK_CATEGORY_NOT_DURATION');
 assert.ok(Object.isFrozen(c));
});
test('software repair has NO invented human task duration from wages or O*NET',()=>{
 const r=benchmark({job_type:'SOFTWARE_REPAIR',original_work_id:W,
  assumed_occupation_soc:'15-1252'});
 assert.equal(r.occupational_wage_benchmark.value,65.38);
 assert.equal(r.human_task_effort_hours.value,null);
 assert.equal(r.human_crew_size.value,null);
 assert.equal(r.projected_labor_cost_usd.value,null);
 assert.equal(r.verified_labor_savings_usd.value,null);
 assert.equal(r.verified_staff_reduction.value,null);
 assert.equal(r.input_authorizes_execution,false);
 const noRole=benchmark({job_type:'SOFTWARE_REPAIR'});
 assert.equal(noRole.occupational_wage_benchmark.value,null);
});
test('APQC invoicing productivity makes hypothetical FTE capacity not stopwatch time',()=>{
 const r=benchmark({job_type:'CUSTOMER_INVOICING',
  number_of_comparable_items:25714,annual_paid_hours_per_fte:2080});
 assert.equal(r.human_capacity_equivalent.fte_years,1);
 assert.equal(r.human_capacity_equivalent.hours,2080);
 assert.equal(r.human_capacity_equivalent.hours_per_invoice,0.0809);
 assert.equal(r.hands_on_minutes_per_invoice.value,null);
 assert.equal(r.process_cycle_time.value,null);
 assert.equal(r.verified_labor_savings_usd.value,null);
 assert.equal(r.verified_staff_reduction.value,null);
 assert.equal(r.assumptions.benchmark_applicability,'UNVERIFIED_CUSTOMER_WORKLOAD_EQUIVALENCE');
 const partial=benchmark({job_type:'CUSTOMER_INVOICING'});
 assert.equal(partial.human_capacity_equivalent.hours,null);
 assert.equal(partial.human_capacity_equivalent.hours_per_invoice,null);
});
test('tampering and attempting to convert unrelated wages to job time is rejected',()=>{
 for(const bad of [
 {job_type:'SOFTWARE_REPAIR',number_of_comparable_items:20},
 {job_type:'SOFTWARE_REPAIR',annual_paid_hours_per_fte:2080},
 {job_type:'SOFTWARE_REPAIR',assumed_occupation_soc:'13-2011'},
 {job_type:'CUSTOMER_INVOICING',assumed_occupation_soc:'15-1252'},
 {job_type:'CUSTOMER_INVOICING',number_of_comparable_items:-1},
 {job_type:'CUSTOMER_INVOICING',annual_paid_hours_per_fte:8000},
 {job_type:'UNKNOWN'},
 {job_type:'SOFTWARE_REPAIR',original_work_id:'not-an-id'},
 ])assert.throws(()=>benchmark(bad),/REALITY_HUMAN_LABOR_/);
});
test('real settled internal job can have descriptive role but no verified replacement or ROI',()=>{
 const roi={version:'reality-owner-original-job-roi-projection-v1',
  production_changed:false,jobs:[{
   original_work_id:W,
   technical_settlement_status:'INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW',
   economic_value:{verified_cash_savings_usd:{value:null}},
   production_changed:false,
  }]};
 const r=enrich(roi);
 assert.equal(r.jobs.length,1);
 assert.equal(r.jobs[0].human_labor_context.human_task_effort_hours.value,null);
 assert.equal(r.jobs[0].human_labor_context.verified_staff_reduction.value,null);
 assert.equal(r.verified_customer_financial_roi,false);
 assert.equal(r.job_execution_authorized_by_analysis,false);
 assert.throws(()=>enrich({...roi,jobs:[{...roi.jobs[0],
  economic_value:{verified_cash_savings_usd:{value:9000}}}]}),
  /REALITY_HUMAN_LABOR_/);
});
test('read endpoint cannot accept browser job ID or issue any approval',()=>{
 const c=readFileSync(new URL('../api/reality/personal-job-roi-evidence.js',import.meta.url),'utf8');
 assert.ok(c.includes('authenticatedChatSession(req,res)'));
 assert.ok(c.includes('reality_read_owner_job_roi_evidence_v1'));
 assert.ok(c.includes('projectOwnerJobRoiEvidence'));
 assert.ok(c.includes('enrichOwnerJobRoiWithHumanLabor'));
 assert.ok(c.includes("req.method!=='GET'"));
 assert.ok(c.includes('Object.keys(req.query||{}).length'));
 assert.ok(!c.includes('reality_owner_approve_qualified_preview_v1'));
 assert.ok(!c.includes('original_claim'));
});
