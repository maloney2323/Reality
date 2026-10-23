import {processCausalTurn} from '../../src/reality-causal-turn-commit-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Allow','POST');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 try{
  const result=await processCausalTurn(req);
  return res.status(200).json(result);
 }catch(e){
  // Only the sanitized error code is logged; never tokens, prompts or stack traces.
  const code=/^[A-Z][A-Z0-9_]{3,120}$/.test(e?.message||'')
   ?e.message:'UNCLASSIFIED_RUNTIME_EXCEPTION';
  console.error('REALITY_STANDALONE_CHAT_FAILURE',JSON.stringify({code,
   status:Number.isInteger(e?.status)?e.status:500}));
  const allowed=new Set([400,401,403,409,503]);
  const status=allowed.has(e?.status)?e.status:500;
  return res.status(status).json({ok:false,
   error:status===500?'STANDALONE_CHAT_INTERNAL_ERROR':e.message,
   execution:'NOT_EXECUTED'});
 }
}
