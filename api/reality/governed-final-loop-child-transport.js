// Transport only: exact signed service request, never browser/model tools.
import {shiftDatabase} from '../../src/reality-governed-shift-boundary-v1.js';
import {handleExistingChildTransport} from '../../src/reality-final-loop-child-transport-v1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({status:'METHOD_NOT_ALLOWED'});
 try{
  const db=shiftDatabase(process.env);
  const outcome=await handleExistingChildTransport({db,body:req.body,env:process.env});
  return res.status(outcome.http).json(outcome.body);
 }catch{return res.status(503).json({status:'FINAL_LOOP_CHILD_TRANSPORT_UNAVAILABLE',original_job_completed:false,production_changed:false});}
}
