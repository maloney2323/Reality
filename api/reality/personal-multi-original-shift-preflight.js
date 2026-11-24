// Authenticated owner readback of a MULTI-original acceptance target from the
// existing Continuity routes, canonical work ledger, warrant and verifier.
// No admission, shift creation, approval, job execution or Universe mutation.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {CANONICAL_ORIGINAL_STAGES,projectMultiOriginalCanonicalSpine}
 from '../../src/reality-canonical-original-work-spine-v1.js';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
const SCOPE='OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT';
export const maxDuration=20;

export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 if(req.method!=='GET')
  return res.status(405).json({ok:false,error:'MULTI_ORIGINAL_PREFLIGHT_READ_ONLY'});
 if(Object.keys(req.query||{}).some(k=>k!=='target'))
  return res.status(400).json({ok:false,error:'MULTI_ORIGINAL_OWNER_SCOPE_NOT_SELECTABLE'});
 const target=Number(req.query?.target??5);
 if(!Number.isSafeInteger(target)||target<2||target>12)
  return res.status(400).json({ok:false,error:'MULTI_ORIGINAL_TARGET_INVALID'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!UUID.test(session?.user_id||''))
   return res.status(401).json({ok:false,error:'MULTI_ORIGINAL_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'MULTI_ORIGINAL_PREVIEW_ONLY'});
  const db=shiftDatabase();
  if(!db?.strictSecrets||db.url!==session.config?.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('MULTI_ORIGINAL_OWNER_DB_UNVERIFIED');
  const result=await shiftRpc(db,'reality_read_owner_multi_original_shift_preflight_v1',{
   p_owner_id:session.user_id,p_target_original_count:target
  },{timeoutMs:15000});
  if(result?.status!==SCOPE||
   result.owner_id!==session.user_id||
   result.target_original_count!==target||
   result.read_only!==true||
   result.current_shift_scope_is_not_general_business_permission!==true||
   result.ready_to_start_multi_original_execution!==false||
   result.model_execution_authorized!==false||
   result.owner_approval_granted!==false||
   result.new_shift_started!==false||
   result.installation_authorized!==false||
   result.production_changed!==false||
   result.original_customer_jobs_completed_by_preflight!==0||
   !Number.isSafeInteger(result.total_discovered_source_observations)||
   !Number.isSafeInteger(result.source_bound_originals)||
   !Number.isSafeInteger(result.independently_qualified_originals_for_executor_preflight)||
   !Number.isSafeInteger(result.independent_original_final_receipts)||
   !Array.isArray(result.prioritized_source_preflight)||
   result.prioritized_source_preflight.length>20||
   result.prioritized_source_preflight.some(x=>
    !ROUTE.test(x.continuity_ref||'')||
    typeof x.acceptance_gate!=='string'||
    typeof x.intake_family!=='string'||
    typeof x.source_ref!=='string'&&x.source_ref!==null||
    x.original_work_id!==null&&!WORK.test(x.original_work_id||'')||
    x.new_shift_started!==false||
    x.execution_authorized_by_read!==false||
    x.owner_approval_granted_by_read!==false))
   throw Error('MULTI_ORIGINAL_INDEPENDENT_SCOPE_UNVERIFIED');
  // Read the SAME verified owner-scoped originals, not a shadow job history.
  // Stage projection never grants execution or writes an outcome.
  const stageReadbacks=projectMultiOriginalCanonicalSpine(result);
  return res.status(200).json({ok:true,...result,
   canonical_spine_sequence:CANONICAL_ORIGINAL_STAGES,
   original_stage_readbacks:stageReadbacks});
 }catch(e){
  console.warn('MULTI_ORIGINAL_PREFLIGHT_UNAVAILABLE',
   /^MULTI_ORIGINAL_/.test(String(e?.message||''))?'OWNER_PROOF':'PROVIDER_UNVERIFIED');
  return res.status(503).json({ok:false,
   error:'MULTI_ORIGINAL_OWNER_PREFLIGHT_UNAVAILABLE',
   owner_approval_granted:false,model_execution_authorized:false,
   installation_authorized:false,new_shift_started:false,production_changed:false});
 }
}
