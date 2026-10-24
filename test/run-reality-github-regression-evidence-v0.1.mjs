import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readGithubRegressionEvidence} from '../src/reality-github-regression-evidence-v0.1.js';
const e=await readGithubRegressionEvidence();
assert.equal(e.verified_historical_regression,true);
assert.equal(e.same_test_verification,true);
assert.equal(e.autonomously_discovered_or_repaired_by_reality,false);
assert.equal(e.production_deployment_changed,false);
assert.equal(e.model_vs_reality_comparison_complete,false);
assert.equal(e.supervision_minutes_saved,null);
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/reality-github-regression-evidence-v0.1.json',JSON.stringify(e,null,2)+'\n');
const short={
 result:'VERIFIED_HISTORICAL_GITHUB_REGRESSION',
 before:e.before.run_id,after:e.after.run_id,
 test:e.exact_test_name,
 authenticated_provider_readback:e.independently_observed_external_workflow_results,
 reality_autonomous_repair_demonstrated:e.autonomously_discovered_or_repaired_by_reality,
 supervision_minutes_saved:e.supervision_minutes_saved,
 receipt_hash:e.receipt_hash,
};
console.log('REALITY_EXTERNAL_GITHUB_READBACK',JSON.stringify(short));
if(process.env.GITHUB_STEP_SUMMARY){
 const summary=[
  '# Reality GitHub regression evidence — real external provider read-back',
  '',
  '| Evidence | Verified value |',
  '|---|---|',
  '| Earlier run | [Failed]('+e.before.url+') |',
  '| Later run | [Passed]('+e.after.url+') |',
  '| Exactly same test | '+e.exact_test_name+' |',
  '| GitHub external provider metadata and logs | Read and matched |',
  '| Autonomous Reality repair | **NOT PROVEN** |',
  '| Competitive improvement / supervision saved | **NOT MEASURED** |',
  '| Receipt hash | `'+e.receipt_hash+'` |',
  '',
  'Read-only test; no model tokens, no repo modifications from the runner, no production actions.',
 ].join('\n');
 const {appendFile}=await import('node:fs/promises');
 await appendFile(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
}
