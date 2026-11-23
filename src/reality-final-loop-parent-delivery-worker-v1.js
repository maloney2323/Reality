// Reality Final Loop: ONE signed-shift parent delivery subtransition.
// No new scheduler. Model never claims completion or certifies itself.
// A separate owner approval permits exactly one GitHub review comment.
// After any POST uncertainty, only independent readback is permitted.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {inspectLargePrSourceForBoundedReview}
 from './reality-pr-large-source-qualification-v1.js';
export const REALITY_FINAL_LOOP_PARENT_DELIVERY_WORKER_VERSION=
 'reality-final-loop-parent-delivery-worker-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const PR=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/([1-9]\d{0,7})$/;
const md=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
const fail=(status,more={})=>Object.freeze({
 version:REALITY_FINAL_LOOP_PARENT_DELIVERY_WORKER_VERSION,
 status,original_job_completed:false,universe_reconciled:false,
 production_changed:false,automatic_provider_replay_authorized:false,
 ...more
});
const deny=why=>{throw Error('REALITY_FINAL_LOOP_PARENT_DELIVERY_'+why)};
const enabled=(db,env,shiftId,workerRunId)=>
 env.VERCEL_ENV==='preview'&&
 env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_PARENT_INTEGRATION_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED==='true'&&
 env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED==='true'&&
 db?.strictSecrets===true&&
 db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
 db.project===env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF&&
 UUID.test(shiftId||'')&&UUID.test(workerRunId||'');
function validCandidate(c,kind,shiftId,workerRunId){
 if(!c||c.status!==(kind==='PUBLISH'?
  'FINAL_LOOP_PARENT_GITHUB_WRITE_RESERVED_ONCE':
  'FINAL_LOOP_PARENT_GITHUB_EFFECT_UNCERTAIN_READBACK_ONLY')||
  !UUID.test(c.delivery_id||'')||
  !UUID.test(c.owner_id||'')||c.shift_id!==shiftId||
  !WORK.test(c.parent_original_work_id||'')||
  !PR.test(c.source_ref||'')||
  !SHA.test(c.source_head_sha||'')||
  !SHA.test(c.source_base_sha||'')||
  !HASH.test(c.source_proof_sha256||'')||
  !HASH.test(c.source_manifest_sha256||'')||
  !HASH.test(c.delivery_body_sha256||'')||
  !HASH.test((kind==='PUBLISH'?
   c.approval_receipt_sha256:
   c.owner_publication_receipt_sha256)||'')||
  typeof c.delivery_body!=='string'||
  c.delivery_body.length<500||
  Buffer.byteLength(c.delivery_body,'utf8')>62000||
  md(c.delivery_body)!==c.delivery_body_sha256||
  !c.delivery_body.startsWith('<!-- REALITY-FINAL-LOOP-PARENT:'+
   c.parent_original_work_id+':sha256:')||
  c.original_job_completed!==false||
  c.production_changed!==false||
  (kind==='PUBLISH'&&(
   c.publication_effect_reserved!==true||
   !UUID.test(c.claim_id||'')||
   c.publisher_worker_run_id!==workerRunId))||
  (kind==='VERIFY'&&(
   !UUID.test(c.publication_claim_id||'')||
   !UUID.test(c.publisher_worker_run_id||'')||
   c.publisher_worker_run_id===workerRunId||
   c.verifier_worker_run_id!==workerRunId||
   c.read_only!==true||
   c.post_retry_authorized!==false||
   !c.publication_reserved_at)))
  deny('SIGNED_EXACT_PROVIDER_SCOPE_UNVERIFIED');
 return c;
}
async function get(url,token,fetchImpl,method='GET',body){
 const response=await fetchImpl(url,{
  method,cache:'no-store',redirect:'error',
  signal:AbortSignal.timeout(14000),
  headers:{
   accept:'application/vnd.github+json',
   ...(typeof token==='string'&&token.length>=25?
    {authorization:'Bearer '+token}:{}),
   'content-type':'application/json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Final-Loop-Parent-Delivery-v1'
  },
  ...(body!==undefined?{body:JSON.stringify(body)}:{})
 });
 if(!response?.ok)deny('GITHUB_'+method+'_NOT_CONFIRMED');
 return response.json();
}
const api='https://api.github.com/repos/maloney2323/Reality';
async function exactSource(c,env,token,fetchImpl){
 const number=Number(PR.exec(c.source_ref)[1]);
 const current=await get(api+'/pulls/'+number,token,fetchImpl);
 if(current?.number!==number||current.html_url!==c.source_ref||
  current.state!=='open'||current.head?.sha!==c.source_head_sha||
  current.base?.sha!==c.source_base_sha||
  !Number.isInteger(current.changed_files)||current.changed_files<=8||
  current.changed_files>500)
  deny('PR_IDENTITY_HEAD_OR_BASE_CHANGED');
 const manifest=await inspectLargePrSourceForBoundedReview({
  job:{source_ref:c.source_ref,
   original_work_id:c.parent_original_work_id,
   source_proof_sha256:c.source_proof_sha256,phase:'BLOCKED'},
  ownerId:c.owner_id,shiftId:c.shift_id,
  metadata:current,env,fetchImpl,githubToken:token
 });
 if(manifest.source_manifest_complete!==true||
  manifest.source_manifest_sha256!==c.source_manifest_sha256||
  manifest.live_head_sha!==c.source_head_sha||
  manifest.live_base_sha!==c.source_base_sha)
  deny('FULL_PARENT_CHANGED_FILE_MANIFEST_DRIFT');
 return {number,manifest};
}
async function authenticatedGithubActor(token,fetchImpl){
 if(typeof token!=='string'||token.length<25)
  deny('SIGNED_GITHUB_WRITER_CREDENTIAL_REQUIRED');
 const actor=await get('https://api.github.com/user',token,fetchImpl);
 if(!Number.isSafeInteger(actor?.id)||actor.id<1||
  typeof actor.login!=='string'||actor.login.length<1)
  deny('GITHUB_TOKEN_ACTOR_UNVERIFIED');
 return actor.id;
}
async function scanComments(c,number,actorId,token,fetchImpl){
 const start=await get(api+'/issues/'+number,token,fetchImpl);
 if(start?.number!==number||
    !Number.isSafeInteger(start.comments)||
    start.comments<0||start.comments>800)
  deny('GITHUB_COMMENT_INVENTORY_NOT_BOUNDED');
 const marker='<!-- REALITY-FINAL-LOOP-PARENT:'+
  c.parent_original_work_id+':';
 const matching=[];
 const pages=Math.ceil(start.comments/100);
 for(let page=1;page<=pages;page++){
  const comments=await get(api+'/issues/'+number+
   '/comments?per_page=100&page='+page,token,fetchImpl);
  const expected=page<pages?100:start.comments-100*(page-1);
  if(!Array.isArray(comments)||comments.length!==expected)
   deny('GITHUB_COMMENT_PAGE_INCOMPLETE');
  for(const comment of comments){
   if(typeof comment.body!=='string'||
     !comment.body.startsWith(marker))continue;
   // Even a forged same-marker comment is ambiguity, not success.
   if(!Number.isSafeInteger(comment.id)||comment.id<1)
    deny('GITHUB_MARKED_COMMENT_ID_INVALID');
   matching.push(comment);
  }
 }
 const end=await get(api+'/issues/'+number,token,fetchImpl);
 if(end.number!==number||end.comments!==start.comments)
  deny('GITHUB_COMMENT_INVENTORY_MOVED_DURING_READ');
 if(matching.length>1)
  deny('DUPLICATE_PROVIDER_EFFECT_MARKER_REQUIRES_MANUAL_RECONCILIATION');
 if(matching.length===0)return null;
 const one=matching[0];
 if(one.user?.id!==actorId||one.body!==c.delivery_body||
    md(one.body)!==c.delivery_body_sha256||
    !/^\d{4}-\d{2}-\d{2}T\d\d:\d\d:\d\dZ$/.test(
     one.created_at||''))
  deny('GITHUB_PROVIDER_EFFECT_MARKER_OR_AUTHOR_CONFLICT');
 const url='https://github.com/maloney2323/Reality/pull/'+number+
  '#issuecomment-'+one.id;
 const variants=new Set([
  url,'https://github.com/maloney2323/Reality/issues/'+number+
  '#issuecomment-'+one.id
 ]);
 if(!variants.has(one.html_url))
  deny('GITHUB_PROVIDER_COMMENT_URL_IDENTITY_MISMATCH');
 return {...one,normalized_url:url};
}
async function verifierReadback(c,{env,token,fetchImpl,actorId}){
 const {number}=await exactSource(c,env,token,fetchImpl);
 const comment=await scanComments(c,number,actorId,token,fetchImpl);
 if(!comment)return fail(
  'FINAL_LOOP_PARENT_PROVIDER_EFFECT_UNCERTAIN_NO_REPOST',{
   delivery_id:c.delivery_id,parent_original_work_id:c.parent_original_work_id,
   continue_shift:true});
 // A full second GET by comment ID, not only a paginated listing.
 const exact=await get(api+'/issues/comments/'+comment.id,token,fetchImpl);
 if(exact.id!==comment.id||
  exact.body!==c.delivery_body||
  md(exact.body)!==c.delivery_body_sha256||
  exact.user?.id!==actorId||
  exact.created_at!==comment.created_at||
  ![comment.html_url,comment.normalized_url].includes(exact.html_url))
  deny('INDEPENDENT_EXACT_PROVIDER_COMMENT_READBACK_MISMATCH');
 const after=await get(api+'/pulls/'+number,token,fetchImpl);
 if(after?.head?.sha!==c.source_head_sha||
  after?.base?.sha!==c.source_base_sha||
  after?.state!=='open')
  deny('SOURCE_HEAD_MOVED_DURING_PROVIDER_VERIFICATION');
 return {comment,actorId};
}
export async function advanceOneFinalLoopParentDelivery({
 db,shiftId,workerRunId,env=process.env,call=shiftRpc,
 fetchImpl=fetch
}={}){
 if(!enabled(db,env,shiftId,workerRunId)||typeof call!=='function'||
    typeof fetchImpl!=='function')
  return fail('FINAL_LOOP_PARENT_DELIVERY_DISABLED_OR_ISOLATED_DB_MISSING');
 const token=env.REALITY_GITHUB_TOKEN||env.GITHUB_TOKEN;
 // Reconcile any unknown external POST before considering a new one.
 let pending;
 try{
  pending=await call(db,'reality_read_final_loop_parent_publish_verify_v1',{
   p_shift_id:shiftId,p_verifier_worker_run_id:workerRunId
  },{fetchImpl,timeoutMs:6500});
 }catch{return fail('FINAL_LOOP_PARENT_PROVIDER_READBACK_DB_UNAVAILABLE');}
 if(pending?.status==='FINAL_LOOP_PARENT_GITHUB_EFFECT_UNCERTAIN_READBACK_ONLY'){
  let c;try{c=validCandidate(pending,'VERIFY',shiftId,workerRunId);}
  catch{return fail('FINAL_LOOP_PARENT_PENDING_PROVIDER_SCOPE_UNVERIFIED');}
  if(typeof token!=='string'||token.length<25)
   return fail('FINAL_LOOP_PARENT_PROVIDER_READBACK_CREDENTIAL_MISSING');
  let read;
  try{
   const actorId=await authenticatedGithubActor(token,fetchImpl);
   read=await verifierReadback(c,{env,token,fetchImpl,actorId});
  }catch{
   return fail('FINAL_LOOP_PARENT_PROVIDER_READBACK_AMBIGUOUS_NO_REPOST',{
    delivery_id:c.delivery_id});
  }
  if(!read?.comment)return read;
  const ev={
   schema:'reality-final-loop-independent-github-parent-verification-v1',
   delivery_id:c.delivery_id,
   publication_claim_id:c.publication_claim_id,
   verifier_worker_run_id:workerRunId,
   parent_original_work_id:c.parent_original_work_id,
   source_ref:c.source_ref,source_head_sha:c.source_head_sha,
   source_manifest_sha256:c.source_manifest_sha256,
   body_sha256:c.delivery_body_sha256,
   approval_receipt_sha256:c.owner_publication_receipt_sha256,
   comment_id:String(read.comment.id),
   provider_comment_url:read.comment.normalized_url,
   provider_actor_id:String(read.actorId),
   authenticated_actor_id:String(read.actorId),
   provider_comment_created_at:read.comment.created_at,
   independent_provider_readback:true,
   full_comment_body_verified:true,source_head_current:true,
   authenticated_writer_verified:true,provider_comment_unique:true,
   external_effect_performed:true,production_changed:false
  };
  let result;
  try{
   result=await call(db,'reality_record_final_loop_parent_settlement_v1',{
    p_delivery_id:c.delivery_id,
    p_publication_claim_id:c.publication_claim_id,
    p_verifier_worker_run_id:workerRunId,
    p_provider_evidence:ev
   },{fetchImpl,timeoutMs:8000});
  }catch{
   return fail('FINAL_LOOP_PARENT_SETTLEMENT_DB_OUTCOME_UNCERTAIN_READBACK_ONLY',{
    delivery_id:c.delivery_id});
  }
  if(result?.status!==
    'FINAL_LOOP_PARENT_ORIGINAL_AND_UNIVERSE_ATOMICALLY_SETTLED'||
     result.original_work_id!==c.parent_original_work_id||
     result.provider_comment_url!==read.comment.normalized_url||
     !UUID.test(result.verified_universe_outcome_event_id||'')||
     result.universe_reconciled!==true||
     result.original_job_completed!==true||
     result.production_changed!==false)
   return fail('FINAL_LOOP_PARENT_SETTLEMENT_RECEIPT_NOT_VERIFIED',{
    delivery_id:c.delivery_id});
  const verified=await call(db,'reality_read_final_loop_parent_settlement_v1',{
   p_owner_id:c.owner_id,p_original_work_id:c.parent_original_work_id
  },{fetchImpl,timeoutMs:6500}).catch(()=>null);
  if(verified?.status!==
    'FINAL_LOOP_PARENT_AND_UNIVERSE_INDEPENDENT_READBACK_SETTLED'||
    verified.original_work_id!==c.parent_original_work_id||
    verified.verified_provider_comment_url!==read.comment.normalized_url||
    verified.verified_universe_outcome_event_id!==
      result.verified_universe_outcome_event_id||
    verified.original_job_completed!==true||
    verified.universe_reconciled!==true||
    verified.independent_database_readback!==true)
   return fail('FINAL_LOOP_PARENT_POSTSETTLEMENT_UNIVERSE_READBACK_UNVERIFIED',{
    delivery_id:c.delivery_id});
  return Object.freeze({
   version:REALITY_FINAL_LOOP_PARENT_DELIVERY_WORKER_VERSION,
   status:'FINAL_LOOP_PARENT_ORIGINAL_AND_UNIVERSE_INDEPENDENTLY_VERIFIED',
   owner_id:c.owner_id,shift_id:c.shift_id,
   original_work_id:c.parent_original_work_id,
   verified_provider_comment_url:read.comment.normalized_url,
   verified_universe_outcome_event_id:result.verified_universe_outcome_event_id,
   original_job_completed:true,universe_reconciled:true,
   independent_provider_readback_verified:true,
   production_changed:false,continue_shift:true
  });
 }
 if(pending?.status!=='FINAL_LOOP_NO_PENDING_INDEPENDENT_PROVIDER_READBACK')
  return fail('FINAL_LOOP_PARENT_PUBLISH_PROVIDER_STATE_UNVERIFIED');
 let prep;
 try{
  prep=await call(db,'reality_prepare_next_final_loop_parent_delivery_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId
  },{fetchImpl,timeoutMs:7500});
 }catch{return fail('FINAL_LOOP_PARENT_DELIVERY_PREPARE_DB_UNAVAILABLE');}
 if(prep?.status==='FINAL_LOOP_PARENT_DELIVERY_EXACT_OWNER_PUBLICATION_REQUIRED')
  return fail('FINAL_LOOP_PARENT_DELIVERY_AWAITING_EXACT_PUBLICATION_CLICK',{
   delivery_id:prep.delivery_id,parent_original_work_id:prep.parent_original_work_id
  });
 if(prep?.status!=='FINAL_LOOP_PARENT_DELIVERY_ALREADY_APPROVED_OR_RESERVED')
  return fail(prep?.status?.startsWith('FINAL_LOOP_')?
   prep.status:'FINAL_LOOP_PARENT_DELIVERY_NOT_READBACK_ELIGIBLE');
 if(env.REALITY_FINAL_LOOP_PARENT_PUBLICATION_ENABLED!=='true')
  return fail('FINAL_LOOP_PARENT_EXTERNAL_PUBLICATION_FEATURE_NOT_AUTHORIZED');
 if(typeof token!=='string'||token.length<25)
  return fail('FINAL_LOOP_PARENT_GITHUB_WRITER_NOT_CONFIGURED');
 let c;
 try{
  c=validCandidate(await call(db,'reality_claim_final_loop_parent_publish_v1',{
   p_shift_id:shiftId,p_worker_run_id:workerRunId
  },{fetchImpl,timeoutMs:6500}),'PUBLISH',shiftId,workerRunId);
 }catch{return fail('FINAL_LOOP_PARENT_PUBLISH_ATOMIC_CLAIM_UNVERIFIED');}
 let actorId;
 try{actorId=await authenticatedGithubActor(token,fetchImpl);}
 catch{return fail('FINAL_LOOP_PARENT_WRITER_IDENTITY_UNVERIFIED_EFFECT_FENCED',{
  delivery_id:c.delivery_id});}
 try{
  const {number}=await exactSource(c,env,token,fetchImpl);
  const existing=await scanComments(c,number,actorId,token,fetchImpl);
  if(existing)return fail('FINAL_LOOP_PARENT_PREEXISTING_EFFECT_REQUIRES_INDEPENDENT_SETTLEMENT',{
   delivery_id:c.delivery_id});
  // This is the ONE permitted external write after a durable reservation.
  const created=await get(api+'/issues/'+number+'/comments',token,fetchImpl,
   'POST',{body:c.delivery_body});
  if(!Number.isSafeInteger(created?.id)||created.id<1||
      created.body!==c.delivery_body||
      created.user?.id!==actorId)
   return fail('FINAL_LOOP_PARENT_POST_RESPONSE_UNCERTAIN_RECONCILE_ONLY',{
    delivery_id:c.delivery_id});
  return fail('FINAL_LOOP_PARENT_GITHUB_DELIVERED_PENDING_SEPARATE_VERIFIER',{
   delivery_id:c.delivery_id,comment_id:created.id,
   continue_shift:true});
 }catch{
  return fail('FINAL_LOOP_PARENT_PROVIDER_POST_OR_SOURCE_UNCERTAIN_NO_REPOST',{
   delivery_id:c.delivery_id,continue_shift:true});
 }
}
