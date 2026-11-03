// Owner-authenticated, READ-ONLY status for the genuine capability loop.
// Never accepts job IDs, approval, or execution commands from a browser.
// Service RPC re-derives ownership from the original VERIFIED Universe event.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
export const maxDuration=45;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')return res.status(405).json({
   ok:false,error:'GENUINE_LOOP_READ_ONLY_GET_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'GENUINE_LOOP_CLIENT_SCOPE_REJECTED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const env=process.env;
  const db=resolveReliabilityBenchmarkDb(env);
  if(env.VERCEL_ENV!=='preview'||!UUID.test(session.user_id)||
     !db?.strictSecrets||!db.secretKey||
     db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'GENUINE_LOOP_OWNER_SCOPE_NOT_VERIFIED'});
  const response=await fetch(db.url+'/rest/v1/rpc/reality_read_owner_genuine_loop_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})
  });
  const v=await response.json().catch(()=>null);
  if(!response.ok||v?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
     !Array.isArray(v.jobs)||v.jobs.length>12||
     v.owner_installation_authorized_by_read!==false||
     v.external_action_performed!==false||v.production_changed!==false||
     v.jobs.some(j=>!WORK.test(j.original_work_id)||
      !UUID.test(j.trigger_id)||
      typeof j.phase!=='string'||j.phase.length>80||
      typeof j.candidate_verified!=='boolean'||
      typeof j.owner_install_approved!=='boolean'||
      typeof j.independently_settled!=='boolean'||
      j.environment!=='ISOLATED_PREVIEW'))
   return res.status(503).json({ok:false,error:'GENUINE_LOOP_INDEPENDENT_READBACK_UNAVAILABLE'});
  const finalResponse=await fetch(db.url+
    '/rest/v1/rpc/reality_read_owner_final_receipts_v1',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})});
  const final=await finalResponse.json().catch(()=>null);
  if(!finalResponse.ok||final?.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
     !Array.isArray(final.receipts)||final.receipts.length>12||
     final.does_not_authorize_actions!==true||
     final.receipts.some(r=>
       r.status!=='FULL_LOOP_INDEPENDENTLY_VERIFIED'||
       !WORK.test(r.original_work_id)||
       !/^[a-f0-9]{64}$/.test(r.artifact_sha256||'')||
       !/^[a-f0-9]{40}$/.test(r.installed_commit_sha||'')||
       !UUID.test(r.settlement_event_id)||
       !/^sha256:[a-f0-9]{64}$/.test(r.verifier_artifact_digest||'')||
       !Number.isSafeInteger(r.provider_run_id)||r.provider_run_id<1||
       r.production_changed!==false))
   return res.status(503).json({ok:false,error:'FINAL_RECEIPT_TRUSTED_OWNER_READBACK_UNAVAILABLE'});
  const jobs=v.jobs.map(j=>{
    const receipt=final.receipts.find(r=>r.original_work_id===j.original_work_id);
    return {...j,
      owner_install_approved:j.owner_install_approved===true,
      candidate_verified:j.candidate_verified===true,
      independently_settled:j.independently_settled===true,
      isolated_installed:j.isolated_installed===true,
      universe_settlement_verified:j.universe_settlement_verified===true,
      full_loop_independently_verified:
        j.capability_id==='reality-general-execution-receipt'&&
        j.independently_settled===true&&
        j.universe_settlement_verified===true&&
        Boolean(receipt)};
  });
  return res.status(200).json({ok:true,...v,jobs,
   independent_final_receipts:final.receipts,
   full_loop_proof_not_inferred_from_settlement:true});
 }catch{
  return res.status(503).json({
   ok:false,error:'GENUINE_LOOP_TRUSTED_STATUS_UNAVAILABLE',
   original_job_completed:false,production_changed:false});
 }
}
