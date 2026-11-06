// Owner-scope v2 ROI: read existing independent settlement with phase times,
// future source-labelled economic observations, and occupational context.
// It cannot mutate owner goals, install capabilities, execute or settle jobs.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {projectOperationalRoiEvidenceV2}
 from '../../src/reality-operational-roi-v2.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'OPERATIONAL_ROI_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'CLIENT_SCOPE_REJECTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const env=process.env;
  const db=resolveReliabilityBenchmarkDb(env);
  if(env.VERCEL_ENV!=='preview'||!UUID.test(session.user_id)||
    !db?.strictSecrets||!db.secretKey||
    db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   return res.status(403).json({ok:false,error:'ROI_OWNER_SCOPE_NOT_VERIFIED'});
  const response=await fetch(
   db.url+'/rest/v1/rpc/reality_read_owner_job_roi_evidence_v2',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
      'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id}),
  });
  if(!response.ok)throw Error('TRUSTED_ROI_LEDGER_READBACK_UNAVAILABLE');
  const raw=await response.json();
  const report=projectOperationalRoiEvidenceV2(raw);
  return res.status(200).json({ok:true,...report,
   endpoint_scope:'SIGNED_IN_OWNER_ISOLATED_PREVIEW_READ_ONLY',
   installation_authorized:false,work_executed_by_read:false,
   production_changed:false});
 }catch(e){
  console.warn('REALITY_OPERATIONAL_ROI_READ_UNAVAILABLE',
   /^REALITY_(?:JOB_ROI|OPERATIONAL_ROI|HUMAN_LABOR)/.test(
     String(e?.message||''))?'EVIDENCE_INVALID':'PROVIDER_OR_CONFIGURATION');
  return res.status(503).json({
   ok:false,error:'OPERATIONAL_ROI_EVIDENCE_UNAVAILABLE',
   verified_customer_financial_roi:false,production_changed:false});
 }
}
