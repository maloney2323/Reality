// Preview-only, read-only credential compatibility check. Does not mutate
// records, enable reliability monitoring, run a model or expose any secrets.
import { resolveReliabilityBenchmarkDb } from '../../src/reality-reliability-db-boundary-v0.1.js';
const ALLOWED_BRANCH='feature/reality-drift-live-continuity-v1-20261024';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});
  if(process.env.VERCEL_ENV!=='preview' || process.env.VERCEL_GIT_COMMIT_REF!==ALLOWED_BRANCH)
    return res.status(404).json({ok:false,code:'NOT_AVAILABLE'});
  let db;
  try{
    db=resolveReliabilityBenchmarkDb({
      ...process.env,REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
    });
  }catch{
    return res.status(200).json({
      ok:true,
      benchmark_scope_valid:false,
      existing_preview_credential_available:false,
      benchmark_connection_verified:false,
      model_calls:0,writes:0,
    });
  }
  let status='UNVERIFIED';
  try{
    const response=await fetch(db.url+'/rest/v1/universe_events?select=event_id&limit=1',{
      method:'GET',
      headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
        accept:'application/json'},
      signal:AbortSignal.timeout(5000),
    });
    status=response.ok?'READ_AUTHORIZED':response.status===401||response.status===403?
      'NOT_AUTHORIZED':'READ_FAILED';
  }catch{status='READ_FAILED';}
  return res.status(200).json({
    ok:true,benchmark_scope_valid:true,
    existing_preview_credential_available:true,
    benchmark_connection_verified:status==='READ_AUTHORIZED',
    status,
    write_permission_verified:false,
    model_calls:0,writes:0,
    monitoring_enabled:process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED==='true',
  });
}
