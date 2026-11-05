import {passkeyAction} from '../../src/reality-private-chat-passkey-v1.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const result=await passkeyAction(req,res);
    return res.status(200).json(result);
  }catch(e){
    return res.status(Number(e.status)||503).json({ok:false,error:e.message||'PASSKEY_UNAVAILABLE'});
  }
}
