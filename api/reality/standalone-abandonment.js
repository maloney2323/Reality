// NOT DEPLOYED. Server-only Preview endpoint; disabled unless independently
// reviewed and REALITY_TURN_ABANDONMENT_ENABLED=true is deliberately set.
import {prepareOwnerAbandonment,confirmOwnerAbandonment}
 from '../../src/reality-standalone-abandonment-v1.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Allow','GET, POST');
 try{
  if(req.method==='GET')return res.status(200).json(
   await prepareOwnerAbandonment(req));
  if(req.method==='POST')return res.status(200).json(
   await confirmOwnerAbandonment(req));
  return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 }catch(e){
  const status=[400,401,403,405,409,503].includes(e.status)?e.status:500;
  const code=/^[A-Z][A-Z0-9_]{3,120}$/.test(e.message||'')
   ?e.message:'ABANDONMENT_UNAVAILABLE';
  return res.status(status).json({ok:false,error:code});
 }
}
