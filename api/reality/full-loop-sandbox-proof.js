// Preview-only, zero-external-effect full-loop demonstration.
// The authorization principal, observations and work are SYNTHETIC.
// Not the production autonomous agent and never a proof of customer ROI.
import {runFullLoopSandboxProof} from '../../src/reality-full-loop-sandbox-proof-v0.1.js';
import {scoreFullLoopProof} from '../../src/reality-proof-telemetry-v0.1.js';
const TARGET_BRANCH='feature/reality-drift-live-continuity-v1-20261024';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});
  if(process.env.VERCEL_ENV!=='preview' ||
      process.env.VERCEL_GIT_COMMIT_REF!==TARGET_BRANCH)
    return res.status(404).json({ok:false,code:'SANDBOX_ONLY_PREVIEW_ROUTE'});
  const mode=req.body?.mode||'success';
  if(!['success','withhold_approval','failed_readback'].includes(mode))
    return res.status(400).json({ok:false,code:'INVALID_SANDBOX_SCENARIO'});
  try {
    const result=await runFullLoopSandboxProof({
      principal:'synthetic-sandbox-principal',
      ownerApproval:mode!=='withhold_approval',
      denyIndependentReadback:mode==='failed_readback',
    });
    return res.status(200).json({
      ok:true,
      proof_kind:'EPHEMERAL_ISOLATED_SANDBOX',
      customer_world_verified:false,
      real_external_actions:0,
      paid_model_calls:0,
      expected_scenario:mode,
      result,
      telemetry:scoreFullLoopProof(result),
    });
  } catch(e){
    return res.status(500).json({
      ok:false,proof_kind:'EPHEMERAL_ISOLATED_SANDBOX',
      code:'FULL_LOOP_CONTRACT_FAILED',
      // Never echo secrets, stack traces, source payloads or customer data.
      real_external_actions:0,paid_model_calls:0,
    });
  }
}
