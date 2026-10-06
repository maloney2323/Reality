import { executeAuthorizedWork } from '../../src/reality-governed-execution-engine-v0.1.js';

export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).setHeader('Allow','POST').json({error:'METHOD_NOT_ALLOWED'});
 const body=req.body||{};
 try{
   if(!body.workItem || !body.authorization) return res.status(400).json({ok:false,error:'WORK_ITEM_AND_AUTHORIZATION_REQUIRED'});
   const connector=body.connector;
   const verifier=body.independentVerifier;
   if(!connector || !verifier) return res.status(400).json({ok:false,error:'EXECUTION_BRIDGES_MUST_BE_SERVER_SIDE'});
   return res.status(400).json({ok:false,error:'CLIENT_SUPPLIED_EXECUTION_BRIDGES_REJECTED'});
 }catch(error){return res.status(400).json({ok:false,error:error.message});}
}
