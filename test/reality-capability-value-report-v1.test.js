import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCapabilityValueReport as report,summarizeQualifiedCapabilityValueReports as summarize}
 from '../src/reality-capability-value-report-v1.js';
const work='work:'+'1'.repeat(32);
const sample={original_work_id:work,capability_id:'reality-general-execution-receipt',
 phase:'AWAITING_OWNER_APPROVAL',source_paths:[
 'src/reality-extensions/reality-general-execution-receipt.mjs',
 'test/reality-extensions/reality-general-execution-receipt.test.js'],
 qualification:{schema:'reality-genuine-capability-qualification-v1',
  status:'AWAITING_OWNER_APPROVAL',original_work_id:work,
  artifact_sha256:'a'.repeat(64),pre_state_hash:'b'.repeat(64),
  post_state_hash:'c'.repeat(64),
  attestation_source:'SIGNED_GITHUB_WORKFLOW_WITH_INDEPENDENT_SANDBOX',
  provider_run_id:'41533824456',valid_time:'2026-11-02T00:00:00Z',
  transaction_time:'2026-11-02T00:01:00Z',
  frozen_pass:11,frozen_tests:11,candidate_pass:12,candidate_tests:12,
  installation_authorized:false,original_job_completed:false,production_changed:false}};
test('23/23 qualified candidate has visible statistics and honest pros and cons',()=>{
 const r=report(sample);
 assert.equal(r.technical_stats.combined_passed,23);
 assert.equal(r.technical_stats.combined_total,23);
 assert.equal(r.technical_stats.frozen_acceptance.pass_rate_percent,100);
 assert.equal(r.scope.independent_test_run_url,'https://github.com/maloney2323/Reality/actions/runs/41533824456');
 assert.equal(r.business_value.verified_savings_usd.value,null);
 assert.equal(r.business_value.actual_hours_returned.value,null);
 assert.equal(r.performance_comparison.after_install_success_rate.value,null);
 assert.equal(r.readiness.stage,'QUALIFIED_AWAITING_EXPLICIT_OWNER_APPROVAL');
 assert.equal(r.readiness.installed,false);
 assert.equal(r.permission_effects.owner_installation_authorized,false);
 assert.ok(r.advantages.length>=3);
 assert.ok(r.limitations_and_risks.length>=3);
 assert.ok(Object.isFrozen(r));
});
test('forged scope, authority, test counts and evidence paths fail closed',()=>{
 for(const change of [
  {phase:'SETTLED_ISOLATED'},
  {original_work_id:'work:'+'2'.repeat(32)},
  {approval:{approval_id:'forged'}},
  {source_paths:['src/reality-extensions/x.mjs','http://evil.example/a.js']},
  {qualification:{...sample.qualification,installation_authorized:true}},
  {qualification:{...sample.qualification,original_job_completed:true}},
  {qualification:{...sample.qualification,production_changed:true}},
  {qualification:{...sample.qualification,frozen_pass:10}},
  {qualification:{...sample.qualification,candidate_tests:0}},
  {qualification:{...sample.qualification,artifact_sha256:'forged'}},
  {qualification:{...sample.qualification,provider_run_id:'https://evil.example'}},
  {qualification:{...sample.qualification,attestation_source:'MODEL_GENERATED'}}
 ])assert.throws(()=>report({...sample,...change}),/REALITY_CAPABILITY_VALUE_REPORT_/);
});
test('estimated product claims never become verified ROI or approval',()=>{
 const fake={...sample,verified_savings_usd:5000000,
  qualification:{...sample.qualification,estimated_labor_savings_usd:9999,
   model_install_approval:true,estimated_payback_days:0,
   pros:['GUARANTEED_SUCCESS'],cons:[]}};
 const r=report(fake);
 assert.equal(r.business_value.verified_savings_usd.value,null);
 assert.equal(r.business_value.payback_days.value,null);
 assert.equal(r.permission_effects.owner_installation_authorized,false);
 assert.ok(r.limitations_and_risks.some(x=>x.text.includes('ROI')));
});
test('portfolio counts distinct qualified capabilities without assuming realized value',()=>{
 const second={...sample,original_work_id:'work:'+'2'.repeat(32),
  qualification:{...sample.qualification,original_work_id:'work:'+'2'.repeat(32)}};
 const items=[report(sample),report(second)],s=summarize(items);
 assert.equal(s.distinct_qualified_original_jobs,2);
 assert.equal(s.distinct_qualified_capabilities,1);
 assert.equal(s.checked_tests_total,46);
 assert.equal(s.awaiting_owner_approval,2);
 assert.equal(s.verified_usd_saved,null);
 assert.equal(s.installed_count,0);
 assert.throws(()=>summarize([items[0],items[0]]),/DUPLICATE_ORIGINAL_WORK/);
});
test('authenticated read-only endpoint provides the report, never grants execution',()=>{
 const source=readFileSync(new URL('../api/reality/personal-qualified-capabilities.js',import.meta.url),'utf8');
 assert.ok(source.includes('createCapabilityValueReport'));
 assert.ok(source.includes('summarizeQualifiedCapabilityValueReports'));
 assert.ok(source.includes('value_report'));
 assert.ok(source.includes('value_portfolio'));
 assert.ok(source.includes('authenticatedChatSession(req,res)'));
 assert.ok(source.includes("req.method!=='GET'"));
 assert.ok(!source.includes('reality_owner_approve_qualified_preview_v1'));
});

test('live #201 signed real-provider supersession displays approval value without inventing totals',()=>{
 const newer={...sample,capability_id:'reality-continuity-settlement-reconciler',
  source_paths:['src/reality-extensions/reality-continuity-settlement-reconciler.mjs',
   'test/reality-extensions/reality-continuity-settlement-reconciler.test.js'],
  qualification:{
   schema:'reality-genuine-requalification-supersession-v1',
   status:'AWAITING_OWNER_APPROVAL',original_work_id:work,
   artifact_sha256:'d'.repeat(64),prior_artifact_sha256:'a'.repeat(64),
   post_state_hash:'c'.repeat(64),
   attestation_source:'SIGNED_GITHUB_WORKFLOW_INDEPENDENT_PROVIDER_AND_OFFLINE_SANDBOX',
   provider_run_id:'41761816779',trigger_id:'c074d3d1-adab-4291-b3ce-88d02d8bfe5a',
   model_response_id:'resp_0033c648848a7f1b006aea9a23d65c87d1916482a2c4deee9c',
   verification_artifact_digest:'sha256:'+'e'.repeat(64),
   real_provider_holdout_verified:true,
   real_provider_holdout_artifact_sha256:'d'.repeat(64),
   valid_time:'2026-11-03T21:49:52Z',
   transaction_time:'2026-11-04T02:37:39Z',
   frozen_pass:39,candidate_pass:4,holdout_pass:5,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,
  }};
 const qualified=report(newer),summary=summarize([qualified]);
 assert.equal(qualified.readiness.stage,'QUALIFIED_AWAITING_EXPLICIT_OWNER_APPROVAL');
 assert.equal(qualified.technical_stats.combined_passed,43);
 assert.equal(qualified.technical_stats.combined_total,null,'missing denominator not invented');
 assert.equal(qualified.technical_stats.frozen_acceptance.total,null);
 assert.equal(qualified.technical_stats.candidate_checks.pass_rate_percent,null);
 assert.equal(summary.checked_tests_total,null);
 assert.equal(summary.checked_tests_passed,43);
 assert.equal(qualified.technical_stats.independent_verification_record,
  'DURABLE_SIGNED_SUPERSESSION_AND_PROVIDER_HOLDOUT');
 assert.equal(qualified.permission_effects.owner_installation_authorized,false);
 assert.equal(qualified.business_value.verified_savings_usd.value,null);
 for(const changed of [
  {real_provider_holdout_verified:false},
  {real_provider_holdout_artifact_sha256:'f'.repeat(64)},
  {prior_artifact_sha256:'d'.repeat(64)},
  {verification_artifact_digest:'MISSING'},
  {attestation_source:'MODEL_ASSERTION'},
  {trigger_id:'forged'},
  {model_response_id:'forged'},
  {holdout_pass:0},
  {installation_authorized:true},
  {original_job_completed:true},
  {production_changed:true}
 ]){
  assert.throws(()=>report({...newer,qualification:{...newer.qualification,...changed}}),
   /REALITY_CAPABILITY_VALUE_REPORT_/,JSON.stringify(changed));
 }
});
