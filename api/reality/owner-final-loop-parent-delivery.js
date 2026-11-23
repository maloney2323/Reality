// Existing Reality Chat owner transport for ONE exact parent GitHub delivery.
// Never grants model agency, bypasses source verification or performs POST.
import crypto from 'node:crypto';
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=18;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const HEAD=/^[a-f0-9]{40}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/([1-9]\d{0,7})$/;
const isolated=(db,env)=>env.VERCEL_ENV==='preview'&&
 env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_PARENT_INTEGRATION_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&
 db?.strictSecrets===true&&
 db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
 db.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
const error=(res,http,error)=>res.status(http).json({
 ok:false,error,original_job_completed:false,production_changed:false});
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST').json({
   ok:false,error:'FINAL_LOOP_PARENT_OWNER_METHOD_NOT_ALLOWED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id||''))
   return error(res,401,'FINAL_LOOP_OWNER_AUTHENTICATION_REQUIRED');
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url||!isolated(db,process.env))
   return error(res,403,'FINAL_LOOP_PARENT_ISOLATED_OWNER_BOUNDARY_REQUIRED');
  const shiftId=String(req.method==='GET'?
   (req.query||{}).shift_id||(req.query||{}).shiftId||'':req.body?.shift_id||'');
  if(!UUID.test(shiftId))
   return error(res,400,'FINAL_LOOP_EXACT_PARENT_SHIFT_REQUIRED');
  if(req.method==='GET'){
   if(Object.keys(req.query||{}).length!==1)
    return error(res,400,'FINAL_LOOP_PARENT_UNEXPECTED_QUERY');
   const p=await shiftRpc(db,
    'reality_read_owner_final_loop_parent_deliveries_v1',{
     p_owner_id:session.user_id,p_shift_id:shiftId
    },{timeoutMs:6500});
   if(p?.status!=='FINAL_LOOP_OWNER_PARENT_DELIVERY_PACKET_READ_ONLY'||
     p.owner_id!==session.user_id||p.shift_id!==shiftId||
     p.read_only!==true||p.publication_authorized!==false||
     !Array.isArray(p.deliveries)||p.deliveries.length>12)
    return error(res,503,'FINAL_LOOP_PARENT_OWNER_RECEIPTS_UNVERIFIED');
   return res.status(200).json({
    ok:true,owner_scope_verified:true,
    read_only:true,publication_authorized:false,
    deliveries:p.deliveries
   });
  }
  if(Object.keys(req.query||{}).length)
   return error(res,400,'FINAL_LOOP_PARENT_APPROVAL_UNEXPECTED_QUERY');
  const b=req.body||{};
  if(typeof b!=='object'||Array.isArray(b)||
     Object.keys(b).sort().join(',')!==
      'delivery_body_sha256,delivery_id,intent,proposal_fingerprint,shift_id,source_head_sha'||
     b.intent!=='APPROVE_EXACT_GITHUB_PR_REVIEW_PUBLICATION'||
     !UUID.test(b.delivery_id||'')||
     !HASH.test(b.delivery_body_sha256||'')||
     !HASH.test(b.proposal_fingerprint||'')||
     !HEAD.test(b.source_head_sha||''))
   return error(res,400,'FINAL_LOOP_EXACT_PARENT_PUBLISH_APPROVAL_INPUT_REQUIRED');
  const ownerPackets=await shiftRpc(db,
   'reality_read_owner_final_loop_parent_deliveries_v1',{
    p_owner_id:session.user_id,p_shift_id:shiftId
   },{timeoutMs:6500});
  if(ownerPackets?.status!=='FINAL_LOOP_OWNER_PARENT_DELIVERY_PACKET_READ_ONLY'||
     ownerPackets.owner_id!==session.user_id||
     ownerPackets.shift_id!==shiftId||
     !Array.isArray(ownerPackets.deliveries))
   return error(res,503,'FINAL_LOOP_PARENT_APPROVAL_CURRENT_PACKET_UNVERIFIED');
  const p=ownerPackets.deliveries.find(x=>x.delivery_id===b.delivery_id);
  const ref=REF.exec(p?.source_ref||'');
  if(!p||p.status!=='AWAITING_EXACT_PUBLICATION_APPROVAL'||
     p.publication_approved!==false||
     p.delivery_body_sha256!==b.delivery_body_sha256||
     p.proposal_fingerprint!==b.proposal_fingerprint||
     p.source_head_sha!==b.source_head_sha||
     !ref)
   return error(res,409,'FINAL_LOOP_PARENT_PUBLICATION_PACKET_STALE');
  // Independent GET immediately before the exact owner click.
  const token=process.env.REALITY_GITHUB_TOKEN||process.env.GITHUB_TOKEN;
  const response=await fetch(
   'https://api.github.com/repos/maloney2323/Reality/pulls/'+Number(ref[1]),{
    method:'GET',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(9500),
    headers:{accept:'application/vnd.github+json',
     ...(typeof token==='string'&&token.length>=25?
      {authorization:'Bearer '+token}:{}),
     'x-github-api-version':'2022-11-28'}
   });
  if(!response.ok)
   return error(res,503,'FINAL_LOOP_PARENT_GITHUB_HEAD_NOT_READABLE');
  const current=await response.json();
  if(current?.html_url!==p.source_ref||
     current.state!=='open'||
     current.head?.sha!==p.source_head_sha||
     !Number.isInteger(current.changed_files)||current.changed_files<=8||
     current.changed_files>500)
   return error(res,409,'FINAL_LOOP_PARENT_SOURCE_CHANGED_REQUALIFY_REQUIRED');
  const approved=await shiftRpc(db,
   'reality_owner_approve_final_loop_parent_delivery_v1',{
    p_owner_id:session.user_id,
    p_delivery_id:b.delivery_id,p_fingerprint:b.proposal_fingerprint,
    p_review_body_sha256:b.delivery_body_sha256,
    p_request_id:crypto.randomUUID()
   },{timeoutMs:6500});
  if(approved?.status!=='FINAL_LOOP_EXACT_PARENT_GITHUB_PUBLICATION_OWNER_APPROVED_ONCE'||
     approved.owner_id!==session.user_id||
     approved.delivery_id!==b.delivery_id||
     approved.source_head_sha!==b.source_head_sha||
     approved.delivery_body_sha256!==b.delivery_body_sha256||
     approved.publication_approved!==true||
     approved.publication_effect_reserved!==false||
     approved.original_job_completed!==false||
     !HASH.test(approved.publication_approval_receipt_sha256||''))
   return error(res,409,'FINAL_LOOP_PARENT_PUBLICATION_APPROVAL_UNVERIFIED');
  return res.status(200).json({
   ok:true,status:approved.status,
   delivery_id:approved.delivery_id,
   parent_original_work_id:approved.parent_original_work_id,
   source_ref:approved.source_ref,
   publication_approval_receipt_sha256:
    approved.publication_approval_receipt_sha256,
   publication_effect_reserved:false,
   parent_obligation_remains_open:true,
   original_job_completed:false,production_changed:false
  });
 }catch{
  return error(res,503,'FINAL_LOOP_PARENT_OWNER_APPROVAL_SERVICE_UNAVAILABLE');
 }
}
