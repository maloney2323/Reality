// Preview-only, read-only credential compatibility check. Does not mutate
// records, enable reliability monitoring, run a model or expose any secrets.
import { resolveReliabilityBenchmarkDb } from '../../src/reality-reliability-db-boundary-v0.1.js';
import { shiftDatabase, shiftRpc } from '../../src/reality-governed-shift-boundary-v1.js';
import { createUniversePostgresPersistence } from '../../src/reality-universe-postgres-persistence-v0.1.js';
const ALLOWED_BRANCH='feature/reality-drift-live-continuity-v1-20261024';
const FINAL_LOOP_BRANCH='feature/final-loop-governed-qualification-handoff-20261123';
const ISOLATED_PROJECT='txqgqqievsttobujcsli';
const SHARED_PROJECT='hvkfreoagbrphwghjajw';

// Reuse the server-side Preview credential and existing database boundary.
// Exact, operator-configured isolated target only; no caller-selected URL,
// redirects, fallback credentials, row data, writes, model or execution calls.
async function isolatedCredentialPreflight(req,res,env=process.env,request=fetch){
  const report=(status,extra={})=>res.status(200).json({
    ok:true,status,isolated_project:ISOLATED_PROJECT,
    credential_compatibility_verified:status==='ISOLATED_SERVICE_READ_VERIFIED',
    execution_authorized:false,worker_started:false,model_calls:0,writes:0,
    ...extra
  });
  if(Object.keys(req.query||{}).length||
    env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF!==ISOLATED_PROJECT||
    env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF!==SHARED_PROJECT||
    env.REALITY_FINAL_LOOP_EVENT_TRIGGER_ENABLED!=='false'||
    env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED!=='false'||
    env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED!=='false')
    return report('ISOLATED_PREFLIGHT_SCOPE_REJECTED');
  let db;
  try{
    if(env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'){
      // Verify the actual deployed worker binding rather than overriding the target.
      db=shiftDatabase(env);
      if(db.project!==ISOLATED_PROJECT||env.REALITY_PERSONAL_CHAT_SUPABASE_URL!==db.url||
         env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED!=='false')
        return report('ISOLATED_WORKER_BINDING_REJECTED');
      const missing='00000000-0000-0000-0000-000000000000';
      const proof=await shiftRpc(db,'reality_read_final_loop_governed_start_v1',{
        p_owner_id:missing,p_shift_id:missing,p_plan_fingerprint:'sha256:'+'0'.repeat(64)
      });
      if(proof?.status!=='GOVERNED_START_SCOPE_UNVERIFIED')
        return report('ISOLATED_WORKER_RPC_READBACK_UNVERIFIED');
      return report('ISOLATED_SERVICE_READ_VERIFIED',{
        worker_database_binding_verified:true,
        service_role_rpc_verified:true,
        unknown_warrant_rejected:true
      });
    }
    db=resolveReliabilityBenchmarkDb({...env,
      REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
      REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:ISOLATED_PROJECT,
      REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:ISOLATED_PROJECT,
      REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://'+ISOLATED_PROJECT+'.supabase.co'
    });
    if(!db?.strictSecrets||db.project!==ISOLATED_PROJECT||!db.secretKey)
      return report('ISOLATED_CREDENTIAL_UNAVAILABLE');
  }catch{return report('ISOLATED_CREDENTIAL_UNAVAILABLE');}
  try{
    // SELECT is service-role-only in this isolated database; limit=0 returns no rows.
    // Modern opaque keys use apikey, while legacy JWT keys also use Authorization.
    const headers={apikey:db.secretKey,accept:'application/json'};
    if(!db.secretKey.startsWith('sb_'))headers.authorization='Bearer '+db.secretKey;
    const response=await request(db.url+'/rest/v1/universe_events?select=event_id&limit=0',{
      method:'GET',headers,redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(5000)
    });
    if(response.status===401||response.status===403){
      // Report only bounded classifications, never key material or provider text.
      const credential_source=env.REALITY_UNIVERSE_PERSISTENCE_KEY?.trim()?
        'BRANCH_PERSISTENCE':env.SUPABASE_SECRET_KEY?.trim()?'EXISTING_SECRET':'LEGACY_FALLBACK';
      const key=db.secretKey;
      let credential_kind=key.startsWith('sb_secret_')?'SECRET':
        key.startsWith('sb_publishable_')?'PUBLISHABLE':'UNRECOGNIZED';
      let legacy_project_matches=null;
      if(key.split('.').length===3){
        try{
          const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'));
          credential_kind=claims.role==='service_role'?'LEGACY_SERVICE_ROLE':
            claims.role==='anon'?'LEGACY_ANON':'OTHER_JWT';
          legacy_project_matches=typeof claims.ref==='string'?claims.ref===ISOLATED_PROJECT:null;
        }catch{}
      }
      const body=await response.json().catch(()=>null);
      const msg=String(body?.message??body?.msg??'').toLowerCase();
      const provider_reason=msg.includes('invalid api key')?'INVALID_API_KEY':
        msg.includes('invalid jwt')?'INVALID_JWT':
        msg.includes('expired')?'EXPIRED':
        msg.includes('permission denied')?'PERMISSION_DENIED':
        msg.includes('browser')?'BROWSER_RESTRICTION':'UNSPECIFIED';
      return report('ISOLATED_CREDENTIAL_NOT_AUTHORIZED',{
        http_status:response.status,credential_source,credential_kind,
        legacy_project_matches,provider_reason
      });
    }
    if(!response.ok)return report('ISOLATED_SERVICE_READ_FAILED',{http_status:response.status});
    const data=await response.json();
    return report(Array.isArray(data)&&data.length===0?
      'ISOLATED_SERVICE_READ_VERIFIED':'ISOLATED_SERVICE_RESPONSE_UNVERIFIED',
      {http_status:response.status});
  }catch{return report('ISOLATED_SERVICE_READ_UNAVAILABLE');}
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});
  if(process.env.VERCEL_ENV==='preview' && process.env.VERCEL_GIT_COMMIT_REF===FINAL_LOOP_BRANCH)
    return isolatedCredentialPreflight(req,res);
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
  let runtime_reconstruct_verified=false;
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
        if(external_canary_readback_verified){
          const persistence=createUniversePostgresPersistence({
            url:db.url,secretKey:db.secretKey,strictSecrets:true,
          });
          const reconstructed=await persistence.reconstruct({
            continuityRootId:root,
            worldlineId:'b2b50cc0-2026-4024-9025-000000000002',
          });
          runtime_reconstruct_verified=Array.isArray(reconstructed)&&
            reconstructed.some(event=>event.event_id===id &&
              event.payload?.test_id==='reality-pr124-20261024');
        }
      }
    }
  }catch{status='READ_FAILED';}
  return res.status(200).json({
    ok:true,benchmark_scope_valid:true,
    existing_preview_credential_available:true,
    benchmark_connection_verified:status==='READ_AUTHORIZED',
    status,
    external_canary_readback_verified,
    runtime_reconstruct_verified,
    runtime_lineage_integrity_verified:false,
    write_permission_verified:false,
    model_calls:0,writes:0,
    monitoring_enabled:process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED==='true',
  });
}
