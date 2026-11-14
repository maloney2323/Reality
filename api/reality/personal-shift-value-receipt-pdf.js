// Owner-authenticated attachment PDF. Downloads the immutable source-native
// final receipt with a live separately verified economic evidence snapshot.
// The download NEVER creates another settlement receipt or changes original.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {readOwnerShiftFinalValueReceipts}
 from '../../src/reality-owner-shift-final-value-readback-v1.js';
import {renderRealityShiftValueReceiptPdf}
 from '../../src/reality-shift-final-value-receipt-pdf-v1.js';
export const maxDuration=40;
const WORK=/^work:[a-f0-9]{32}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')
  return res.status(405).json({ok:false,error:'SHIFT_VALUE_PDF_GET_ONLY'});
 const keys=Object.keys(req.query||{});
 if(keys.length!==1||keys[0]!=='work_id'||!WORK.test(req.query.work_id))
  return res.status(400).json({ok:false,error:'SHIFT_VALUE_EXACT_WORK_REQUIRED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'SHIFT_VALUE_PDF_SIGN_IN_REQUIRED'});
  const evidence=await readOwnerShiftFinalValueReceipts({
   session,db:resolveReliabilityBenchmarkDb()});
  const receipts=evidence.receipts.filter(r=>
   r.original_work_id===req.query.work_id);
  if(receipts.length!==1)
   return res.status(404).json({ok:false,
    error:'SHIFT_VALUE_INDEPENDENT_FINAL_RECEIPT_NOT_FOUND'});
  const pdf=renderRealityShiftValueReceiptPdf(receipts[0],
   {verifiedReport:evidence});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename="reality-job-value-'+
   req.query.work_id.slice(5)+'.pdf"');
  res.setHeader('Content-Length',String(pdf.length));
  return res.status(200).end(pdf);
 }catch{
  return res.status(503).json({ok:false,
   error:'SHIFT_VALUE_FINAL_PDF_EVIDENCE_UNVERIFIED',
   financial_roi_verified:false,
   installation_authorized:false,production_changed:false});
 }
}
