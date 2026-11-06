// Read-only customer download of the ONE immutable full-loop receipt.
// This endpoint cannot create or authorize any receipt, installation or job.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {renderRealityCompletedJobPdf}
 from '../../src/reality-genuine-completed-receipt-pdf-v1.js';
export const maxDuration=45;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'FINAL_RECEIPT_DOWNLOAD_GET_ONLY'});
 const keys=Object.keys(req.query||{});
 if(keys.some(k=>k!=='work_id')||keys.length>1||
    (keys.includes('work_id')&&!WORK.test(req.query.work_id)))
  return res.status(400).json({ok:false,error:'FINAL_RECEIPT_CLIENT_SCOPE_INVALID'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'FINAL_RECEIPT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||!UUID.test(session.user_id)||
    !db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
    db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('FINAL_RECEIPT_TRUSTED_OWNER_SCOPE_REQUIRED');
  const response=await fetch(db.url+'/rest/v1/rpc/reality_read_owner_final_receipts_v1',{
   method:'POST',cache:'no-store',redirect:'error',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
     !Array.isArray(data.receipts)||data.receipts.length>12||
     data.does_not_authorize_actions!==true)
   throw Error('FINAL_RECEIPT_DATABASE_READBACK_FAILED');
  const wanted=req.query?.work_id||null;
  const matches=data.receipts.filter(r=>!wanted||r.original_work_id===wanted);
  if(matches.length<1)
   return res.status(404).json({ok:false,error:'NO_INDEPENDENT_FULL_LOOP_RECEIPT_YET'});
  const receipt=matches[0];
  const pdf=renderRealityCompletedJobPdf(receipt);
  const filename='reality-final-job-'+receipt.original_work_id.slice(5)+'.pdf';
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename="'+filename+'"');
  res.setHeader('Content-Length',String(pdf.length));
  return res.status(200).end(pdf);
 }catch{
  return res.status(503).json({ok:false,
   error:'FINAL_RECEIPT_NOT_INDEPENDENTLY_VERIFIED',
   installation_authorized:false,production_changed:false});
 }
}
