import {runAuthenticatedPreviewEstimateEgressChallenge}
 from '../../src/reality-estimate-egress-guard-v0.1.js';
// Read-only Preview challenge: no send transport, no paid model, no writes.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Allow','GET');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'METHOD_NOT_ALLOWED',
 });
 try{
  const result=await runAuthenticatedPreviewEstimateEgressChallenge(req);
  return res.status(200).json({ok:true,...result});
 }catch(e){
  const code=String(e?.message||'UNKNOWN');
  const status=/AUTHENTICATED_SESSION/.test(code)?401:
   /SELECTOR_INVALID|_REQUIRED/.test(code)?400:
   /DISABLED|UNAVAILABLE|PRODUCTION|NOT_READY/.test(code)?503:500;
  return res.status(status).json({
   ok:false,error:status===500?'ESTIMATE_EGRESS_CHALLENGE_FAILED':code,
  });
 }
}
