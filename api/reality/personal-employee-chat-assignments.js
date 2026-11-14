// Signed-in owner explicitly saves the EXACT latest saved Chat employee plan
// into employee job lists. It is not authority to create/run original jobs,
// amend an active shift, or install capabilities.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {approveCurrentSavedChatEmployeeAssignments,
 readOwnerApprovedChatEmployeeAssignments}
 from '../../src/reality-owner-approved-chat-assignments-v1.js';
export const maxDuration=40;
const REF=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).json({ok:false,error:'CHAT_EMPLOYEE_ASSIGNMENTS_GET_OR_OWNER_APPROVAL_ONLY'});
 if(Object.keys(req.query||{}).length!==0)
  return res.status(400).json({ok:false,error:'CHAT_EMPLOYEE_ASSIGNMENT_URL_SCOPE_FORBIDDEN'});
 if(req.method==='POST'){
  if(req.headers.origin&&req.headers.origin!=='https://'+req.headers.host)
   return res.status(403).json({ok:false,error:'CHAT_EMPLOYEE_ASSIGNMENT_ORIGIN_DENIED'});
  if(!req.body||Object.getPrototypeOf(req.body)!==Object.prototype||
    Array.isArray(req.body)||
    Object.keys(req.body).sort().join(',')!==
     'action,expected_content_sha256,expected_source_message_ref'||
    req.body.action!=='APPROVE_EXACT_SAVED_CHAT_EMPLOYEE_ASSIGNMENTS'||
    !REF.test(req.body.expected_source_message_ref||'')||
    !SHA.test(req.body.expected_content_sha256||''))
   return res.status(400).json({ok:false,
    error:'CHAT_EMPLOYEE_ASSIGNMENTS_EXACT_SOURCE_APPROVAL_REQUIRED'});
 }
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_EMPLOYEE_OWNER_LOGIN_REQUIRED'});
  if(req.method==='GET'){
   const result=await readOwnerApprovedChatEmployeeAssignments(session);
   return res.status(200).json({ok:true,...result});
  }
  const x=await approveCurrentSavedChatEmployeeAssignments(session,{
   expectedMessageRef:req.body.expected_source_message_ref,
   expectedContentSha256:req.body.expected_content_sha256
  });
  return res.status(200).json({ok:true,...x});
 }catch{
  return res.status(503).json({ok:false,
   error:'CHAT_EMPLOYEE_ASSIGNMENT_SOURCE_OR_OWNER_RECEIPT_UNVERIFIED',
   shift_execution_authorized:false,original_job_created:false,
   capability_installation_authorized:false,production_changed:false});
 }
}
