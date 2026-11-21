// Authenticated, read-only owner view of continuously reconciled source evidence.
// No Chat message, model response, or UI control can create shift/execution rights.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const maxDuration=20;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'CONTINUOUS_QUALIFICATION_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'OWNER_SCOPE_NOT_CLIENT_SELECTABLE'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id||''))
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('CONTINUOUS_QUALIFIER_OWNER_DATABASE_MISMATCH');
  const result=await shiftRpc(db,
   'reality_read_owner_continuous_qualification_inbox_v1',
   {p_owner_id:session.user_id},{timeoutMs:12000});
  if(result?.status!=='OWNER_CONTINUOUS_QUALIFICATION_INBOX_READ_ONLY'||
     result.owner_id!==session.user_id||
     result.items_are_qualifier_inputs_not_approved_jobs!==true||
     result.shift_authorized_by_read!==false||
     result.execution_authorized!==false||
     result.installation_authorized!==false||
     result.production_changed!==false||
     !Number.isSafeInteger(result.total)||result.total<0||
     !Number.isSafeInteger(result.nonterminal_items)||
     result.nonterminal_items<0||result.nonterminal_items>result.total||
     !Array.isArray(result.items)||result.items.length>30||
     result.items.some(x=>typeof x.intake_family!=='string'||
      typeof x.intake_key!=='string'||typeof x.title!=='string'||
      typeof x.qualification_state!=='string'||
      typeof x.next_action!=='string'||
      typeof x.governed_route_state!=='string'||
      typeof x.governed_next_action!=='string'||
      (x.continuity_ref!==null&&!/^reality:qualification:[a-f0-9]{64}$/.test(x.continuity_ref||''))||
      (x.matched_original_work_id!==null&&
       !/^work:[a-f0-9]{32}$/.test(x.matched_original_work_id||''))||
      (x.existing_approval_adapter!==null&&
       x.existing_approval_adapter!=='EXISTING_QUALIFIED_CAPABILITY_CHAT')||
      x.approval_ready!==false||
      x.executable_original_admitted!==false))
   throw Error('CONTINUOUS_QUALIFIER_OWNER_RECEIPT_UNVERIFIED');
  return res.status(200).json({ok:true,...result});
 }catch(e){
  console.warn('REALITY_CONTINUOUS_QUALIFIER_OWNER_READ_UNAVAILABLE',
   String(e?.message||'').startsWith('CONTINUOUS_QUALIFIER_')?
    'SOURCE_OR_AUTHORITY':'PROVIDER_UNVERIFIED');
  return res.status(503).json({ok:false,
   error:'CONTINUOUS_QUALIFICATION_PROVIDER_READBACK_UNAVAILABLE',
   execution_authorized:false,installation_authorized:false,
   production_changed:false});
 }
}
