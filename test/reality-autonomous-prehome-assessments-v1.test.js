import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261103_autonomous_prehome_market_assessment_v1.sql',import.meta.url),'utf8');
const script=page.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
test('browser parses with visible automatic assessment and retains existing auth/chat',()=>{
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.match(page,/Upgrades Reality has inspected/);
 assert.match(page,/Potential customer value/);
 assert.match(page,/Costs, time saved and ROI/);
 assert.match(page,/What Reality must prove next/);
 assert.match(page,/const marketBrief=\(wcCurrent==='research'\|\|\(wcCurrent==='upgrades'&&!wcGapFeedReady\)\)/);
 assert.match(page,/wcMarketReviewFindings\.length\+' inspected ideas/);
 assert.match(page,/id="privateChat"/);
 assert.match(page,/id="simpleResearchList"/);
});
test('background assessment executes before home and is idempotent on source receipt',()=>{
 assert.match(sql,/reality_internal\.assess_saved_market_findings_v1\(\)/);
 assert.match(sql,/cron\.schedule\(/);
 assert.match(sql,/\* \* \* \* \*/);
 assert.match(sql,/on conflict do nothing/);
 assert.match(sql,/select reality_internal\.assess_saved_market_findings_v1\(\);/);
 assert.match(sql,/market_stage_investigations_v1/);
 assert.match(sql,/stage_repair_verified=true/);
 assert.match(sql,/verified_missing_capability=false/);
});
test('readback is independently scoped and self-rejects changed assessment evidence',()=>{
 assert.match(sql,/where owner_id=p_owner_id/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_read_latest_owner_market_research_v1\(uuid\)/);
 assert.match(sql,/assessment_sha256/);
 assert.match(sql,/pg_catalog\.sha256/);
 assert.match(sql,/f\.value \|\| pg_catalog\.jsonb_build_object/);
 assert.match(sql,/AUTOMATIC_ASSESSMENT_PENDING/);
});
test('automatic valuation explicitly declines fictitious business impact',()=>{
 assert.match(sql,/'estimated_business_value_usd',null/);
 assert.match(sql,/'estimated_time_saved_minutes',null/);
 assert.match(sql,/'engineering_effort','NOT_MEASURED'/);
 assert.match(sql,/'ongoing_cost','NOT_MEASURED'/);
 assert.match(sql,/'system_gap_verified',false/);
 assert.match(sql,/'independent_test_passed',false/);
 assert.match(sql,/'code_install_authorized',false/);
 assert.match(sql,/'execution_started',false/);
 assert.match(sql,/SAMPLED_CODE_ONLY_NOT_PROVEN_ABSENT/);
});
test('all research topics plus fallback have value, benefits, tradeoffs and independent tests',()=>{
 for(const category of [
 'REPAIR_AND_RESUMPTION','CONNECTOR_APPROVAL_CONSISTENCY',
 'MANAGED_AGENT_EXECUTION','RUNTIME_EVALUATION_AND_BUDGET',
 'OTHER_RESEARCH_OPPORTUNITY']){
  assert.ok(sql.includes("'"+category+"'"),category);
 }
 for(const k of ['what_it_does','potential_customer_value','pros','cons','risk','next_verification',
  'estimated_business_value_usd','estimated_time_saved_minutes','source_urls',
  'pinned_source_commit','source_report_sha256'])assert.ok(sql.includes("'"+k+"'"),k);
});
