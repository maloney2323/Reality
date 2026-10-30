// TEMPORARY isolated first-178 diagnostics: read-only RPC credential proof.
// Nonexistent fixed UUIDs only. No owner data, no writes, no token disclosure.
// Refuses production and branches other than the original proof preview.
import {resolveReliabilityBenchmarkDb} from '../../src/reality-reliability-db-boundary-v0.1.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false});
 if(process.env.VERCEL_ENV!=='preview'||
    process.env.VERCEL_GIT_COMMIT_REF!=='feature/first178-live-single-claim-execution-20261029')
  return res.status(404).json({ok:false});
 try{
  const db=resolveReliabilityBenchmarkDb();
  if(!db?.strictSecrets||!db.secretKey)return res.status(503).json({ok:false,stage:'CONFIG'});
  // Named dummy identity is not a real owner and cannot create or change data.
  const r=await fetch(db.url+'/rest/v1/rpc/reality_read_governed_build_v1',{
   method:'POST',cache:'no-store',redirect:'error',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({
    p_owner_id:'00000000-0000-4000-8000-000000000001',
    p_conversation_id:'00000000-0000-4000-8000-000000000002',
   }),
  });
  const body=await r.json().catch(()=>null);
  return res.status(200).json({
   ok:r.ok,
   provider_status:r.status,
   provider_code:typeof body?.code==='string'?body.code.slice(0,64):null,
   provider_message:typeof body?.message==='string'?
    body.message.slice(0,160).replace(/[a-zA-Z0-9_-]{32,}/g,'[redacted]'):null,
   result_is_empty:r.ok&&body&&!body.queue_id,
   writes:0,execution_authorized:false,
  });
 }catch(e){
  return res.status(200).json({ok:false,
   stage:'CONFIG_OR_TRANSPORT',
   error:String(e?.message||'').slice(0,85).replace(/[a-zA-Z0-9_-]{32,}/g,'[redacted]'),
   writes:0,execution_authorized:false});
 }
}
