// Read-only, no-model mixed-business gauntlet. Preview only. The report is
// based on frozen, SCRIPTED model attempts and is NOT a live benchmark score.
import {runMixedBusinessFixtureGauntlet} from '../../src/reality-market-proof-gauntlet-v0.1.js';
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});
  if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({ok:false,code:'PREVIEW_ONLY'});
  try{
    const report=runMixedBusinessFixtureGauntlet();
    return res.status(200).json({ok:true,...report});
  }catch(error){
    return res.status(500).json({ok:false,code:'MIXED_GAUNTLET_FAILED'});
  }
}
