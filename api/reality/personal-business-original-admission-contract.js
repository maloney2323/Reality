// READ-ONLY owner proof of real source/provider and independently installed
// executor adapters for multiple original business jobs. Cannot mint jobs,
// approvals, shifts or effects. Extends existing signed Continuity preflight.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const CLASS=/^[a-z][a-z0-9_-]{2,90}$/;
const DEFAULT_CLASSES=Object.freeze([
 'customer_relations','marketing','operations','research_procurement','business_intelligence'
]); // Presentation objectives, NOT installed job executors or customer tasks.
export const maxDuration=20;
export function parseBusinessOriginalClasses(query){
 const fields=Object.keys(query||{});
 if(fields.some(k=>k!=='classes'))throw Error('BUSINESS_ORIGINAL_QUERY_SCOPE_INVALID');
 const raw=query?.classes;
 const values=raw===undefined?DEFAULT_CLASSES:
  typeof raw==='string'?raw.split(',').map(x=>x.trim()):null;
 if(!Array.isArray(values)||values.length<2||values.length>12||
  values.some(x=>!CLASS.test(x))||new Set(values).size!==values.length)
  throw Error('BUSINESS_ORIGINAL_JOB_CLASSES_INVALID');
 return values;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'BUSINESS_ORIGINAL_CONTRACT_READ_ONLY'});
 let classes;
 try{classes=parseBusinessOriginalClasses(req.query);}
 catch{return res.status(400).json({ok:false,error:'BUSINESS_ORIGINAL_QUERY_INVALID'});}
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!UUID.test(session?.user_id||''))
   return res.status(401).json({ok:false,error:'BUSINESS_ORIGINAL_OWNER_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'BUSINESS_ORIGINAL_ISOLATED_PREVIEW_ONLY'});
  const db=shiftDatabase();
  if(!db?.strictSecrets||db.url!==session.config?.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('BUSINESS_ORIGINAL_OWNER_PROVIDER_SCOPE_UNVERIFIED');
  const v=await shiftRpc(db,'reality_read_owner_business_original_source_executor_contract_v1',{
   p_owner_id:session.user_id,p_job_classes:classes
  },{timeoutMs:15000});
  if(v?.status!=='OWNER_BUSINESS_ORIGINAL_SOURCE_EXECUTOR_CONTRACT_READ_ONLY'||
   v.owner_id!==session.user_id||
   v.requested_job_class_count!==classes.length||
   v.read_only!==true||v.source_observation_is_not_an_original!==true||
   v.approved_employee_list_is_not_an_execution_warrant!==true||
   v.current_maintenance_shift_scope_cannot_be_EXPANDED_BY_READ!==true||
   v.owner_approval_granted!==false||v.model_execution_authorized!==false||
   v.new_shift_started!==false||v.installation_authorized!==false||
   v.production_changed!==false||
   !Number.isSafeInteger(v.verified_owner_provider_source_connections)||
   !Number.isSafeInteger(v.independently_verified_installed_business_executor_manifests)||
   !Number.isSafeInteger(v.itemized_originals_ready_for_exact_approval)||
   v.itemized_originals_ready_for_exact_approval!==0||
   !Array.isArray(v.classes)||v.classes.length!==classes.length||
   v.classes.some((x,i)=>x.job_class!==classes[i]||
     !Number.isSafeInteger(x.installed_verified_executor_adapters)||
     !Number.isSafeInteger(x.provider_source_connections_verified)||
     !Number.isSafeInteger(x.current_independently_reviewed_source_observations)||
     x.itemized_authorization_ready!==false||
     x.execution_authorized!==false||
     x.customer_work_completed!==false||
     typeof x.next_verified_evidence!=='string'))
   throw Error('BUSINESS_ORIGINAL_VERIFIED_CONTRACT_INVALID');
  return res.status(200).json({ok:true,...v});
 }catch(e){
  console.warn('BUSINESS_ORIGINAL_CONTRACT_READBACK',
   /^BUSINESS_ORIGINAL_/.test(String(e?.message||''))?'OWNER_PROOF':'PROVIDER_UNVERIFIED');
  return res.status(503).json({ok:false,
   error:'BUSINESS_ORIGINAL_INDEPENDENT_CONTRACT_UNAVAILABLE',
   owner_approval_granted:false,model_execution_authorized:false,
   new_shift_started:false,installation_authorized:false,production_changed:false});
 }
}
