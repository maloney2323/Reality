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
  let external_canary_readback_verified=false;
  try{
    const response=await fetch(db.url+'/rest/v1/universe_events?select=event_id&limit=1',{
      method:'GET',
      headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
        accept:'application/json'},
      signal:AbortSignal.timeout(5000),
    });
    status=response.ok?'READ_AUTHORIZED':response.status===401||response.status===403?
      'NOT_AUTHORIZED':'READ_FAILED';
    if(status==='READ_AUTHORIZED'){
      const id='0544ed90-325a-40eb-8f3c-11eea7eabb29';
      const root='b2b50cc0-2026-4024-9025-000000000001';
      const url=db.url+'/rest/v1/universe_events?select=event_id,continuity_root_id,worldline_id,event_kind,entity_type,payload'+
        '&event_id=eq.'+id+'&continuity_root_id=eq.'+root+'&limit=1';
      const canary=await fetch(url,{
        method:'GET',
        headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,accept:'application/json'},
        signal:AbortSignal.timeout(5000),
      });
      if(canary.ok){
        const rows=await canary.json();
        external_canary_readback_verified=Array.isArray(rows)&&rows.length===1&&
          rows[0].event_id===id&&rows[0].continuity_root_id===root&&
          rows[0].entity_type==='benchmark_storage_canary'&&
          rows[0].payload?.test_id==='reality-pr124-20261024'&&
          rows[0].payload?.synthetic===true;
      }
    }
  }catch{status='READ_FAILED';}
  return res.status(200).json({
    ok:true,benchmark_scope_valid:true,
    existing_preview_credential_available:true,
    benchmark_connection_verified:status==='READ_AUTHORIZED',
    status,
    external_canary_readback_verified,
    write_permission_verified:false,
    model_calls:0,writes:0,
    monitoring_enabled:process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED==='true',
  });
}
