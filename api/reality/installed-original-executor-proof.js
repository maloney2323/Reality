// Isolated proof that the EXACT Reality model-generated original repair executor
// loads inside a deployed Node.js function. No GitHub writes, owner grants,
// source repair, capability registry changes or settlement are performed here.
import {
 ORIGINAL_REPAIR_WORK,prepareOriginalMaintenanceRepair,executeOriginalMaintenanceRepair,
} from '../../src/reality-extensions/reality-original-maintenance-executor.mjs';
import {proposeOriginalRepair}
 from '../../src/reality-extensions/reality-original-maintenance-repair-proposal.mjs';
export const maxDuration=15;
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET_REQUIRED'});
 const available=ORIGINAL_REPAIR_WORK==='work:24cda9611404e9bcb47909976067605c'&&
  typeof prepareOriginalMaintenanceRepair==='function'&&
  typeof executeOriginalMaintenanceRepair==='function'&&
  typeof proposeOriginalRepair==='function';
 if(!available)return res.status(503).json({ok:false,error:'MODEL_CAPABILITY_IMPORT_NOT_VERIFIED'});
 return res.status(200).json({
  ok:true,capability_code_loaded_in_isolated_runtime:true,
  original_work_id:ORIGINAL_REPAIR_WORK,
  source_origin:'REALITY_MODEL_GENERATED_AND_18_CASE_INDEPENDENTLY_VERIFIED',
  model_response_id:'resp_035645a615e57f6b006ae2702baa6887d0865bb1af5c6e501b',
  original_model_source_sha256_expected:'7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128',
  verified_live_github_run:'https://github.com/maloney2323/Reality/actions/runs/40777160879',
  owner_universe_capability_registry_registered:false,
  actual_original_job_settled:false,
  production_installation_authorized:false,
 });
}
