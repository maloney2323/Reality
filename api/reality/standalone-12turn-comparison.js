import {getAuthenticatedTwelveTurnComparison}
 from '../../src/reality-12turn-comparison-v0.1.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Allow','GET');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 try{
  const result=await getAuthenticatedTwelveTurnComparison(req);
  return res.status(200).json({ok:true,...result});
 }catch(err){
  const code=String(err?.message||'UNKNOWN');
  const status=/AUTHENTICATED_SESSION/.test(code)?401:
   /SELECTOR_INVALID|_REQUIRED/.test(code)?400:
   /PRODUCTION|UNAVAILABLE|NOT_READY|DISABLED/.test(code)?503:500;
  return res.status(status).json({ok:false,
    error:status===500?'TWELVE_TURN_COMPARISON_UNAVAILABLE':code});
 }
}
