// Read-only authenticated/public-compatible Reality first-customer workday brief.
// No new job, approval, installation, or economic claim is created.
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../../src/reality-workday-opportunity-brief-v1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'WORKDAY_DISCOVERY_READ_ONLY'});
 try{
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'WORKDAY_PREVIEW_ONLY'});
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  return res.status(200).json({ok:true,...brief});
 }catch{
  return res.status(503).json({
   ok:false,status:'SOURCE_DISCOVERY_UNAVAILABLE',
   error:'WORKDAY_INDEPENDENT_SOURCE_READBACK_UNAVAILABLE',
   read_only:true,installation_authorized:false,job_started:false,
   production_changed:false,shift_completed:false
  });
 }
}
