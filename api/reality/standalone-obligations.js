import {getAuthenticatedStandaloneObligations}
 from '../../src/reality-standalone-obligations-v0.1.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Allow','GET');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'METHOD_NOT_ALLOWED',
 });
 try{
  const result=await getAuthenticatedStandaloneObligations(req);
  return res.status(200).json(result);
 }catch(e){
  const code=String(e?.message||'UNKNOWN');
  const status=/AUTHENTICATED|SESSION/.test(code)?401:
   /SELECTOR_INVALID|OBLIGATION.*REQUIRED/.test(code)?400:
   /DISABLED|NOT_READY|UNAVAILABLE/.test(code)?503:500;
  return res.status(status).json({ok:false,
   error:status===500?'STANDALONE_OBLIGATION_INTERNAL_ERROR':code});
 }
}
