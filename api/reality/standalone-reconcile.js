import {reconcileCausalTurn} from '../../src/reality-causal-turn-commit-v0.1.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Allow','POST');
 if(req.method!=='POST')
  return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 try{
  return res.status(200).json(await reconcileCausalTurn(req));
 }catch(e){
  const status=new Set([400,401,403,409,503]).has(e?.status)?e.status:500;
  return res.status(status).json({
   ok:false,error:status===500?'CAUSAL_RECONCILIATION_UNAVAILABLE':e.message,
  });
 }
}
