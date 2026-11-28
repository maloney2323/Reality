// Authenticated Reality owner transport for the SAME Final Loop exact
// child-review packet. A browser cannot choose a new goal, effect or handler.
// The DB independently binds this explicit approval to a verified parent.
import crypto from 'node:crypto';
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
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
// Same authenticated owner and database boundary. Recovery is available
// in the canonical benchmark preview only, never the production runtime.
const canonical=(db,env,owner)=>env.VERCEL_ENV==='preview'&&
 env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY==='CANONICAL_BENCHMARK_PREVIEW'&&
 env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='false'&&
 env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED==='false'&&
 db?.strictSecrets===true&&db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
 db.project===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF&&
 db.project!==env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF&&
 owner===env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID;
export async function ownerFinalLoopChildApproval(req,res,{
 env=process.env,config=privateChatConfig,authenticate=authenticatedChatSession,
 database=shiftDatabase,call=shiftRpc
}={}){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST')
   .json({ok:false,error:'FINAL_LOOP_CHILD_OWNER_METHOD_NOT_ALLOWED'});
 try{
  config(env);
  if(req.method==='POST'){
   if(!req.headers?.origin)return res.status(403).json({ok:false,error:'EXACT_CHAT_ORIGIN_REQUIRED'});
   assertSameOrigin(req);
  }
  const session=await authenticate(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'OWNER_SIGN_IN_REQUIRED'});
  const db=database(env);
  const canonicalPreview=canonical(db,env,session.user_id);
  if(db.url!==session.config?.url||(!isolated(db,env)&&!canonicalPreview))
   return res.status(403).json({
    ok:false,error:'FINAL_LOOP_ISOLATED_SIGNED_OWNER_BOUNDARY_REQUIRED'
   });
  if(req.method==='GET'){
   const query=req.query||{};
   if(Object.keys(query).length!==1||!UUID.test(query.shift_id||''))
    return res.status(400).json({ok:false,error:'EXACT_OWNER_SHIFT_REQUIRED'});
   if(canonicalPreview&&query.shift_id!==env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID)
    return res.status(403).json({ok:false,error:'EXACT_BENCHMARK_SHIFT_REQUIRED'});
   const p=await call(db,
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
     !['APPROVE_READ_ONLY_INTERNAL_PR_REVIEW','APPROVE_BOUNDED_SAME_OBLIGATION_RECOVERY'].includes(b.intent)||
     !UUID.test(b.packet_id||'')||
     !HASH.test(b.proposal_fingerprint||'')||
     !HASH.test(b.source_manifest_sha256||''))
   return res.status(400).json({
    ok:false,error:'EXACT_OWNER_CHILD_REVIEW_APPROVAL_REQUIRED'
   });
  const recovering=b.intent==='APPROVE_BOUNDED_SAME_OBLIGATION_RECOVERY';
  if(recovering&&!canonicalPreview)return res.status(403).json({ok:false,error:'EXACT_BENCHMARK_RECOVERY_BOUNDARY_REQUIRED'});
  if(canonicalPreview){
   // A browser-provided hash is never sufficient. Bind this explicit
   // approval to the currently authenticated owner's frozen packet.
   const read=await call(db,'reality_read_owner_final_loop_child_approvals_v1',{
    p_owner_id:session.user_id,p_shift_id:env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID
   },{timeoutMs:6000});
   const packets=read?.packets?.filter(p=>p.packet_id===b.packet_id&&p.source_manifest_sha256===b.source_manifest_sha256);
   const packet=packets?.[0],q=packet?.recovery_qualification;
   if(read?.status!=='FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY'||read.owner_id!==session.user_id||
      read.shift_id!==env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID||read.read_only!==true||
      read.execution_authorized!==false||packets?.length!==1||
      (recovering?(packet.state!=='EFFECT_RESERVED_RECONCILE_ONLY'||
        q?.status!=='SAME_ORIGINAL_MISSING_REVIEW_WORK_QUALIFIED_FOR_EXACT_OWNER_DECISION'||
        q.proposal_sha256!==b.proposal_fingerprint||q.execution_authorized!==false||
        q.new_attempt_authorized!==false||q.replay_authorized!==false||
        q.proposal?.historical_invocation_replay_authorized!==false||q.proposal?.new_budget_authorized!==false):
       (packet.state!=='AWAITING_EXACT_OWNER_APPROVAL'||packet.approval_fingerprint!==b.proposal_fingerprint)))
    return res.status(409).json({ok:false,error:'EXACT_CURRENT_OWNER_PROPOSAL_REQUIRED'});
  }
  const approvalRequestId=crypto.randomUUID();
  const approved=await call(db,
   'reality_owner_approve_final_loop_child_v1',{
    p_owner_id:session.user_id,p_packet_id:b.packet_id,
    p_proposal_fingerprint:b.proposal_fingerprint,
    p_manifest_sha256:b.source_manifest_sha256,
    p_approval_request_id:approvalRequestId
   },{timeoutMs:6000});
  if(approved?.status!==(recovering?'FINAL_LOOP_SAME_OBLIGATION_RECOVERY_APPROVED_ONCE':'FINAL_LOOP_EXACT_CHILD_REVIEW_OWNER_APPROVED_ONCE')||
    (recovering&&(approved.proposal_sha256!==b.proposal_fingerprint||
      approved.historical_invocation_replay_authorized!==false||approved.shift_id!==env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID))||
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
   ...(recovering?{proposal_sha256:approved.proposal_sha256,historical_invocation_replay_authorized:false}:{}),
   child_originals_admitted:0,execution_authorized:false,
   parent_obligation_remains_open:true,
   original_job_completed:false,production_changed:false
  });
 }catch(error){
  if(error?.status===403)return res.status(403).json({ok:false,error:'CROSS_ORIGIN_CHAT_REQUEST_REJECTED'});
  return res.status(503).json({
   ok:false,error:'FINAL_LOOP_CHILD_OWNER_APPROVAL_SERVICE_UNAVAILABLE',
   original_job_completed:false
  });
 }
}

export default ownerFinalLoopChildApproval;
