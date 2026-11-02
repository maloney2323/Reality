// Reality internal ROI evidence + human labor context for an authenticated owner.
// This is an observation only. It cannot install, authorize, resume or settle work.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {projectOwnerJobRoiEvidence}
 from '../../src/reality-original-job-roi-evidence-v1.js';
import {enrichOwnerJobRoiWithHumanLabor}
 from '../../src/reality-human-labor-benchmark-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'JOB_ROI_READ_ONLY_GET_REQUIRED'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({
   ok:false,error:'CLIENT_WORK_OR_OWNER_SCOPE_NOT_ACCEPTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({
   ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb(process.env);
  if(process.env.VERCEL_ENV!=='preview'||
    !UUID.test(session.user_id)||!db?.strictSecrets||!db.secretKey||
    db.url!==session.config?.url||
    db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   return res.status(403).json({
    ok:false,error:'ISOLATED_OWNER_ROI_SCOPE_NOT_VERIFIED'});
  const response=await fetch(
   db.url+'/rest/v1/rpc/reality_read_owner_job_roi_evidence_v1',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})
   });
  if(!response.ok)throw Error('INDEPENDENT_OWNER_LEDGER_READBACK_FAILED');
  const raw=await response.json();
  const verified=projectOwnerJobRoiEvidence(raw);
  const report=enrichOwnerJobRoiWithHumanLabor(verified);
  return res.status(200).json({ok:true,...report,
   report_is_read_only:true,installation_authorized:false,
   job_reexecuted:false,production_changed:false});
 }catch(err){
  console.warn('REALITY_ROI_EVIDENCE_READ_UNAVAILABLE',
   /(?:LEDGER|JOB_ROI|HUMAN_LABOR)/.test(String(err?.message||''))?
    'SOURCE_EVIDENCE_INVALID':'CONFIG_OR_PROVIDER_UNAVAILABLE');
  return res.status(503).json({
   ok:false,error:'ROI_EVIDENCE_UNAVAILABLE',
   verified_financial_savings_usd:null,production_changed:false});
 }
}
