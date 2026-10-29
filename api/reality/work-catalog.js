import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','public, max-age=30, s-maxage=90');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'CATALOG_READ_ONLY_GET_REQUIRED'});
 try{
  const data=await buildRealityWorkCatalog();
  return res.status(200).json({ok:true,...data});
 }catch{
  return res.status(503).json({ok:false,status:'UNAVAILABLE',
   error:'WORK_CATALOG_SOURCE_CHECK_UNAVAILABLE',execution_enabled:false});
 }
}
