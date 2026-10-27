import {projectHypotheticalWorkforceImpact}
 from '../../src/reality-work-value-assessment-v0.1.js';

const fields=new Set([
 'manual_minutes_per_occurrence','occurrences_per_month','automatable_fraction',
 'loaded_hourly_labor_cost_usd','productive_hours_per_fte_month',
 'human_review_minutes_per_automated_occurrence',
 'exception_fraction_of_automated_occurrences','human_minutes_per_exception',
 'team_headcount','estimated_automation_cost_usd_per_month',
 'estimated_monthly_implementation_amortization_usd',
]);
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'WORKFORCE_PROJECTION_POST_ONLY'});
 if(!String(req.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))
  return res.status(415).json({ok:false,error:'WORKFORCE_PROJECTION_JSON_REQUIRED'});
 const input=req.body;
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).some(k=>!fields.has(k))||
  Object.keys(input).length>fields.size)
  return res.status(400).json({ok:false,error:'WORKFORCE_PROJECTION_FIELDS_INVALID'});
 try{
  const projection=projectHypotheticalWorkforceImpact(input);
  return res.status(200).json({ok:true,projection});
 }catch{
  return res.status(422).json({ok:false,error:'WORKFORCE_PROJECTION_ASSUMPTIONS_INVALID'});
 }
}
