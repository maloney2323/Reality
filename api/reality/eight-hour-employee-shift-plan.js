// Preview-only, GET-only source-backed human-workday shift draft.
// Does not create a schedule, queue, job, approval, or financial observation.
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from '../../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityEightHourShiftDraft} from '../../src/reality-eight-hour-shift-plan-v1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'EMPLOYEE_SHIFT_PLAN_READ_ONLY'});
 if(process.env.VERCEL_ENV!=='preview')
  return res.status(403).json({ok:false,error:'EMPLOYEE_SHIFT_PREVIEW_ONLY'});
 try{
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const plan=buildRealityEightHourShiftDraft(brief);
  return res.status(200).json({ok:true,...plan});
 }catch{
  return res.status(503).json({
   ok:false,error:'EMPLOYEE_SHIFT_SOURCE_READBACK_UNAVAILABLE',
   status:'PLAN_BLOCKED_NOT_AUTHORIZED',
   read_only:true,job_started:false,shift_started:false,
   installation_authorized:false,production_changed:false
  });
 }
}
