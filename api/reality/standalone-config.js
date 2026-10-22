import {authConfiguration} from '../../src/reality-standalone-auth-v0.1.js';
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 if(process.env.REALITY_STANDALONE_CHAT_ENABLED!=='true')
  return res.status(503).json({ok:false,error:'STANDALONE_CHAT_DISABLED'});
 try{
  // A Supabase publishable key is designed to be shipped in browser clients.
  // Never expose SUPABASE_SECRET_KEY or Reality's persistence credentials.
  return res.status(200).json({ok:true,...authConfiguration()});
 }catch{return res.status(503).json({ok:false,error:'STANDALONE_AUTH_NOT_CONFIGURED'})}
}
