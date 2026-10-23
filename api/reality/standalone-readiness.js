// Preview-only setup readout. Never returns credentials or probes customer
// records. This is configuration readiness, NOT live provider verification.
import {inspectStandaloneReadiness} from '../../src/reality-standalone-auth-v0.1.js';
export default function handler(req,res){
  res.setHeader('Cache-Control','no-store, private');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }
  if(process.env.VERCEL_ENV!=='preview')
    return res.status(404).json({ok:false,error:'PREVIEW_ONLY'});
  const readiness=inspectStandaloneReadiness();
  return res.status(200).json({
    ok:true,...readiness,
    provider_validation:'NOT_PERFORMED',
    customers_or_database_touched:false,
  });
}
