// Customer PDF export of the same independently verified owner receipt.
// All source checks are shared with the on-screen preview. This route reads
// provider and ledger evidence; it performs no model run, install or settlement.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {verifiedOwnerCandidateReview}
 from './personal-issue188-candidate-review.js';
import {renderRealityReceiptPdf}
 from '../../src/reality-job-receipt-pdf-v1.js';

export const maxDuration=45;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'RECEIPT_DOWNLOAD_GET_ONLY'});
 if(Object.keys(req.query||{}).length)return res.status(400).json({
  ok:false,error:'RECEIPT_CLIENT_PAYLOAD_NOT_ACCEPTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({
   ok:false,error:'RECEIPT_OWNER_SIGN_IN_REQUIRED'});
  const report=await verifiedOwnerCandidateReview(session);
  const pdf=renderRealityReceiptPdf(report);
  const filename='reality-receipt-'+report.automatic_candidate_receipt.receipt_id.split(':')[1]+'.pdf';
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename="'+filename+'"');
  res.setHeader('Content-Length',String(pdf.length));
  return res.status(200).end(pdf);
 }catch{
  return res.status(503).json({
   ok:false,error:'RECEIPT_PDF_SOURCE_VERIFICATION_UNAVAILABLE',
   installation_authorized:false,production_changed:false});
 }
}
