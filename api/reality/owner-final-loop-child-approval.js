// Authenticated Reality owner transport for the SAME Final Loop exact
// child-review packet. A browser cannot choose a new goal, effect or handler.
// The DB independently binds this explicit approval to a verified parent.
import crypto from 'node:crypto';
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=16;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const isolated=(db,env)=>env.VERCEL_ENV==='preview'&&
 env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&
 db?.strictSecrets===true&&
 db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
 db.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST')
   .json({ok:false,error:'FINAL_LOOP_CHILD_OWNER_METHOD_NOT_ALLOWED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'OWNER_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url||!isolated(db,process.env))
   return res.status(403).json({
    ok:false,error:'FINAL_LOOP_ISOLATED_SIGNED_OWNER_BOUNDARY_REQUIRED'
   });
  if(req.method==='GET'){
   const query=req.query||{};
   if(Object.keys(query).length!==1||!UUID.test(query.shift_id||''))
    return res.status(400).json({ok:false,error:'EXACT_OWNER_SHIFT_REQUIRED'});
   const p=await shiftRpc(db,
    'reality_read_owner_final_loop_child_approvals_v1',{
     p_owner_id:session.user_id,p_shift_id:query.shift_id
    },{timeoutMs:6000});
   if(p?.status!=='FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY'||
     p.owner_id!==session.user_id||p.shift_id!==query.shift_id||
     p.read_only!==true||p.execution_authorized!==false||
     p.original_job_completed!==false||
     !Array.isArray(p.packets)||p.packets.length>20)
    return res.status(503).json({ok:false,error:'FINAL_LOOP_OWNER_PACKET_READBACK_UNVERIFIED'});
   return res.status(200).json({ok:true,packets:p.packets,
    owner_scope_verified:true,read_only:true,execution_authorized:false});
  }
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'UNEXPECTED_APPROVAL_QUERY'});
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b)||
     Object.keys(b).sort().join(',')!==
      'intent,packet_id,proposal_fingerprint,source_manifest_sha256'||
     b.intent!=='APPROVE_READ_ONLY_INTERNAL_PR_REVIEW'||
     !UUID.test(b.packet_id||'')||
     !HASH.test(b.proposal_fingerprint||'')||
     !HASH.test(b.source_manifest_sha256||''))
   return res.status(400).json({
    ok:false,error:'EXACT_OWNER_CHILD_REVIEW_APPROVAL_REQUIRED'
   });
  const approvalRequestId=crypto.randomUUID();
  const approved=await shiftRpc(db,
   'reality_owner_approve_final_loop_child_v1',{
    p_owner_id:session.user_id,p_packet_id:b.packet_id,
    p_proposal_fingerprint:b.proposal_fingerprint,
    p_manifest_sha256:b.source_manifest_sha256,
    p_approval_request_id:approvalRequestId
   },{timeoutMs:6000});
  if(approved?.status!=='FINAL_LOOP_EXACT_CHILD_REVIEW_OWNER_APPROVED_ONCE'||
    approved.owner_id!==session.user_id||
    approved.packet_id!==b.packet_id||
    approved.source_manifest_sha256!==b.source_manifest_sha256||
    approved.approved!==true||
    approved.execution_authorized!==false||
    approved.child_originals_admitted!==0||
    approved.original_job_completed!==false||
    !HASH.test(approved.approval_receipt_sha256||'')){
   return res.status(409).json({
    ok:false,error:'FINAL_LOOP_CHILD_OWNER_APPROVAL_NOT_CURRENT_OR_UNVERIFIED',
    original_job_completed:false
   });
  }
  return res.status(200).json({
   ok:true,status:approved.status,
   packet_id:approved.packet_id,shift_id:approved.shift_id,
   parent_original_work_id:approved.parent_original_work_id,
   source_ref:approved.source_ref,
   source_manifest_sha256:approved.source_manifest_sha256,
   approval_receipt_sha256:approved.approval_receipt_sha256,
   child_originals_admitted:0,execution_authorized:false,
   parent_obligation_remains_open:true,
   original_job_completed:false,production_changed:false
  });
 }catch{
  return res.status(503).json({
   ok:false,error:'FINAL_LOOP_CHILD_OWNER_APPROVAL_SERVICE_UNAVAILABLE',
   original_job_completed:false
  });
 }
}
