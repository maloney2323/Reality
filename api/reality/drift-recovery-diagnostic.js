// Preview-only repeatable deterministic adversarial contract proof.
// No LLM requests, no production DB reads or writes, no external work.
import {gradeDriftCases} from '../../src/reality-drift-recovery-v0.1.js';
import {buildConstructionDriftFixtures,ADVERSARIAL_FIXTURE_VERSION}
 from '../../src/reality-drift-adversarial-fixture-v0.1.js';
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({ok:false,error:'PREVIEW_ONLY'});
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 const report=gradeDriftCases(buildConstructionDriftFixtures());
 const {results,...metrics}=report;
 return res.status(200).json({
  ok:true,environment:'preview',execution_invoked:false,
  provider_model_calls:0,real_world_operations:0,
  actual_llm_turns_tested:0,independent_live_ground_truth_verified:false,
  benchmark_kind:'DETERMINISTIC_SYNTHETIC_CONSTRUCTION_FIXTURES',
  fixture_version:ADVERSARIAL_FIXTURE_VERSION,metrics,
  case_results:results,
  failure_categories:results.reduce((counts,row)=>{
    for(const code of row.codes)counts[code]=(counts[code]||0)+1;
    return counts;
  },{}),
  labels:'Independent handcrafted expected labels, not independent model adjudication',
  conclusion:metrics.residual_structured_drift_pct<5?'FIXTURE_ONLY_BELOW_FIVE_PERCENT':'FIXTURE_ONLY_ABOVE_FIVE_PERCENT',
  limitations:'100 generated state positions are not a live 100-turn model interaction. Blocked conflicts are unresolved and are not counted as corrections.',
 });
}
