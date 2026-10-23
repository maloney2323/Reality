// REVIEW ONLY: this module is not enabled in any deployed environment.
// The endpoint requires REALITY_TURN_ABANDONMENT_ENABLED=true, an independent
// secret, a live owner-authenticated session and a short-lived review challenge.
// No automatic model retry, no credentials in the browser.
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {assertStandalonePreviewIsolation,verifyStandaloneUser,
 createStandaloneConversationScope} from './reality-standalone-auth-v0.1.js';
import {inspectCausalTurn,causalTurnIds} from './reality-causal-turn-commit-v0.1.js';
import {inspectConversationSlot} from './reality-conversation-sequencer-v0.1.js';
import {createUniverseEntry,validateUniverseEntry}
 from './reality-universe-persistence-contract-v1.0.js';
import {retrieveOptionalPersistedUniverseEntry}
 from './reality-native-universe-persistence-v1.0.js';
import {planIncompleteTurnAbandonment}
 from './reality-incomplete-turn-abandonment-plan-v0.1.js';

export const ACKNOWLEDGMENT_TEXT='ABANDON THIS INTERRUPTED TURN';
function sessionFingerprint(req){
 const h=req?.headers?.authorization||req?.headers?.Authorization||'';
 const match=typeof h==='string'
  ?h.match(/^Bearer ([A-Za-z0-9._-]{24,4096})$/):null;
 if(!match)throw fail('AUTHENTICATED_SESSION_REQUIRED',401);
 // A digest of the bearer string, NEVER its value, is signed into this
 // challenge. The review cannot be confirmed from a different token/session.
 return createHash('sha256')
  .update('reality:abandonment:owner-session:v1:')
  .update(match[1]).digest('hex');
}
// The exact bearer is first validated with Supabase Auth /auth/v1/user.
// Only then are its provider-issued JWT claims inspected. The refreshed
// token's iat is NOT reauthentication: use the authenticated method's own
// amr timestamp. No password, token or raw claims appear in error responses.
export function requireRecentProviderAuthentication(req,principal,{
 env=process.env,now=Date.now,maxAgeSeconds=300
}={}){
 const h=req?.headers?.authorization||req?.headers?.Authorization||'';
 const token=typeof h==='string'?h.match(/^Bearer ([A-Za-z0-9._-]{24,4096})$/)?.[1]:null;
 if(!token)throw fail('AUTHENTICATED_SESSION_REQUIRED',401);
 const segments=token.split('.');
 if(segments.length!==3||!segments.every(x=>x.length>0&&x.length<3500))
  throw fail('ABANDONMENT_PROVIDER_REAUTH_REQUIRED',403);
 let c;
 try{c=JSON.parse(Buffer.from(segments[1],'base64url').toString('utf8'))}
 catch{throw fail('ABANDONMENT_PROVIDER_REAUTH_REQUIRED',403)}
 const authOrigin=String(env.SUPABASE_URL||'').replace(/\\/$/,'');
 const sec=Math.floor(now()/1000);
 const validSession=typeof c?.session_id==='string'&&
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(c.session_id);
 const methods=Array.isArray(c?.amr)?c.amr:[];
 const recentlyAuthenticated=methods.some(m=>
  ['password','otp','totp'].includes(m?.method)&&
  Number.isSafeInteger(m?.timestamp)&&m.timestamp<=sec+30&&
  m.timestamp>=sec-maxAgeSeconds);
 if(!validSession||c.sub!==principal.user_id||
  c.iss!==authOrigin+'/auth/v1'||
  c.aud!=='authenticated'||c.role!=='authenticated'||
  !['aal1','aal2'].includes(c.aal)||
  !Number.isSafeInteger(c.exp)||c.exp<=sec||
  !recentlyAuthenticated)
  throw fail('ABANDONMENT_PROVIDER_REAUTH_REQUIRED',403);
 return Object.freeze({provider_authenticated_recently:true,
  session_id:c.session_id,recent_method_verified:true});
}
function claimFingerprint(scope,claim){
 if(!claim||claim.root_id!==scope.continuity_root_id||
  claim.owner_user_id!==scope.authenticated_user_id||
  claim.worldline_id!==scope.worldline_id||
  !/^[0-9a-f-]{36}$/i.test(claim.active_claim_token||'')||
  typeof claim.active_turn_id!=='string'||
  !Number.isSafeInteger(claim.sequence_num)||claim.sequence_num<1)
  throw fail('ABANDONMENT_CLAIM_BINDING_INVALID',409);
 return createHash('sha256').update(JSON.stringify([
  scope.continuity_root_id,scope.authenticated_user_id,
  claim.active_turn_id,claim.active_claim_token,claim.sequence_num,
  claim.last_committed_entry_id??null,claim.last_committed_entry_hash??null
 ])).digest('hex');
}

const fail=(code,status=409)=>{const e=new Error(code);e.status=status;return e;};
const entryId=(scope,turnId,suffix)=>
 'reality-abandonment:'+createHash('sha256').update(
 JSON.stringify([scope.continuity_root_id,turnId,suffix])).digest('hex');
function config(env=process.env){
 if(env.REALITY_TURN_ABANDONMENT_ENABLED!=='true')
  throw fail('ABANDONMENT_DISABLED',503);
 assertStandalonePreviewIsolation(env);
 if(env.VERCEL_ENV!=='preview')
  throw fail('ABANDONMENT_PREVIEW_ONLY',503);
 const key=String(env.REALITY_ABANDONMENT_REVIEW_SECRET||'');
 if(key.length<32)throw fail('ABANDONMENT_REVIEW_SECRET_REQUIRED',503);
 const serviceKey=String(env.REALITY_UNIVERSE_PERSISTENCE_KEY||'');
 if(!/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(serviceKey))
  throw fail('ABANDONMENT_SERVICE_CREDENTIAL_MISSING',503);
 return {key,serviceKey,base:env.REALITY_UNIVERSE_PERSISTENCE_URL};
}
function verifySelector(req,method){
 const x=method==='GET'?req?.query:req?.body;
 const allowed=method==='GET'
  ?['conversation_id','turn_id']
  :['conversation_id','turn_id','challenge','typed_acknowledgment',
    'confirmed_uncertain_execution','confirmed_possible_billing'];
 if(!x||typeof x!=='object'||Array.isArray(x)||
  Object.keys(x).some(k=>!allowed.includes(k))||
  !/^[A-Za-z0-9:_-]{1,96}$/.test(x.conversation_id||'')||
  !/^[A-Za-z0-9:_-]{1,96}$/.test(x.turn_id||''))
  throw fail('ABANDONMENT_SELECTOR_INVALID',400);
 return x;
}
function sign(data,key){
 const value=Buffer.from(JSON.stringify(data)).toString('base64url');
 const signature=createHmac('sha256',key).update(value).digest('base64url');
 return value+'.'+signature;
}
function verifyChallenge(token,key,expected,now){
 if(typeof token!=='string'||token.length>2048||!token.includes('.'))
  throw fail('ABANDONMENT_CHALLENGE_INVALID',403);
 const parts=token.split('.');
 if(parts.length!==2||parts.some(v=>!/^[A-Za-z0-9_-]+$/.test(v)))
  throw fail('ABANDONMENT_CHALLENGE_INVALID',403);
 const mac=createHmac('sha256',key).update(parts[0]).digest('base64url');
 const provided=Buffer.from(parts[1]),actual=Buffer.from(mac);
 if(provided.length!==actual.length||!timingSafeEqual(provided,actual))
  throw fail('ABANDONMENT_CHALLENGE_INVALID',403);
 let claims;
 try{claims=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'))}
 catch{throw fail('ABANDONMENT_CHALLENGE_INVALID',403)}
 if(!Number.isSafeInteger(claims?.exp)||claims.exp<now()||
  claims.exp>now()+300000||
  !Object.entries(expected).every(([k,v])=>claims[k]===v))
  throw fail('ABANDONMENT_CHALLENGE_EXPIRED_OR_STALE',409);
 return claims;
}
async function ownerEvidence(req,{env,fetchImpl,verify=verifyStandaloneUser,
 inspect=inspectCausalTurn,inspectFence=inspectConversationSlot}={}){
 const x=verifySelector(req,req.method);
 const principal=await verify(req,{env,fetchImpl});
 requireRecentProviderAuthentication(req,principal,{env});
 const scope=createStandaloneConversationScope({userId:principal.user_id,
  conversationId:x.conversation_id,thoughtId:'personal'});
 const turn=await inspect({scope,turnId:x.turn_id,fetchImpl});
 const fence=await inspectFence({scope,env,fetchImpl});
 const proposal=planIncompleteTurnAbandonment({turn,fence,turnId:x.turn_id,previewOnly:true});
 if(proposal.status!=='REVIEW_ELIGIBLE_NOT_AUTHORIZED')
  throw fail('ABANDONMENT_NOT_ELIGIBLE_'+proposal.reason,409);
 return {scope,turn,fence,proposal,input:x};
}
export async function prepareOwnerAbandonment(req,{
 env=process.env,fetchImpl=fetch,now=Date.now,
 verify,inspect,inspectFence,loadClaim=loadServerClaim,newNonce=randomUUID
}={}){
 const {key}=config(env);
 if(req.method!=='GET')throw fail('METHOD_NOT_ALLOWED',405);
 const r=await ownerEvidence(req,{env,fetchImpl,verify,inspect,inspectFence});
 const claim=await loadClaim({scope:r.scope,env,fetchImpl});
 if(claim.active_turn_id!==r.input.turn_id||
    claim.sequence_num!==r.fence.sequence_num||
    claim.last_committed_entry_id!==r.fence.last_committed_entry_id||
    claim.last_committed_entry_hash!==r.fence.last_committed_entry_hash)
  throw fail('ABANDONMENT_CLAIM_CHANGED',409);
 const expires=now()+300000;
 const challenge=sign({
  principal:r.scope.authenticated_user_id,root:r.scope.continuity_root_id,
  turn:r.input.turn_id,sequence:r.fence.sequence_num,
  claim_fingerprint:claimFingerprint(r.scope,claim),
  session_fingerprint:sessionFingerprint(req),
  nonce:newNonce(),exp:expires
 },key);
 return Object.freeze({
  ok:true,status:'OWNER_APPROVAL_REQUIRED',
  acknowledgment_text:ACKNOWLEDGMENT_TEXT,challenge,
  expires_at:new Date(expires).toISOString(),
  original_turn_status:r.turn.status,
  model_outcome:'UNKNOWN_MAY_HAVE_BEEN_BILLED',
  external_action_outcome:'NOT_INDEPENDENTLY_ESTABLISHED',
  evidence_only:true,no_database_mutation:true
 });
}
export async function loadServerClaim({scope,env,fetchImpl=fetch}){
 const {base,serviceKey}=config(env);
 const query=new URLSearchParams({
  select:'root_id,worldline_id,owner_user_id,sequence_num,active_turn_id,active_claim_token,last_committed_entry_id,last_committed_entry_hash',
  root_id:'eq.'+scope.continuity_root_id,limit:'1'});
 const res=await fetchImpl(base+'/rest/v1/reality_conversation_turn_fences?'+query,{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{apikey:serviceKey,Accept:'application/json'}});
 if(!res.ok)throw fail('ABANDONMENT_CLAIM_STORAGE_UNAVAILABLE',503);
 const rows=await res.json();
 if(!Array.isArray(rows)||rows.length!==1)
  throw fail('ABANDONMENT_FENCE_NOT_FOUND',409);
 const f=rows[0];
 if(f.root_id!==scope.continuity_root_id||
  f.worldline_id!==scope.worldline_id||
  f.owner_user_id!==scope.authenticated_user_id)
  throw fail('ABANDONMENT_OWNER_ROOT_CHANGED',409);
 return f; // Never send active_claim_token to the browser.
}
export async function invokeAtomicAbandonment({scope,turnId,claim,approval,resolution,
 env=process.env,fetchImpl=fetch}){
 const {base,serviceKey}=config(env);
 const res=await fetchImpl(base+'/rest/v1/rpc/reality_abandon_incomplete_conversation_turn_v1',{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{apikey:serviceKey,'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({
   p_root_id:scope.continuity_root_id,p_worldline_id:scope.worldline_id,
   p_owner_user_id:scope.authenticated_user_id,p_turn_id:turnId,
   p_claim_token:claim.active_claim_token,
   p_expected_sequence:claim.sequence_num,
   p_approval_entry:approval,p_resolution_entry:resolution,
  }),
 });
 if(!res.ok)throw fail('ABANDONMENT_DATABASE_TRANSACTION_REJECTED',409);
 const result=await res.json();
 if(!['ABANDONED','ALREADY_ABANDONED'].includes(result?.status))
  throw fail('ABANDONMENT_DATABASE_RECEIPT_INVALID',503);
 return result;
}
export async function confirmOwnerAbandonment(req,{
 env=process.env,fetchImpl=fetch,now=Date.now,verify,inspect,inspectFence,
 loadClaim=loadServerClaim,lookup=retrieveOptionalPersistedUniverseEntry,
 invoke=invokeAtomicAbandonment
}={}){
 const {key}=config(env);
 if(req.method!=='POST')throw fail('METHOD_NOT_ALLOWED',405);
 const x=verifySelector(req,'POST');
 if(x.typed_acknowledgment!==ACKNOWLEDGMENT_TEXT||
  x.confirmed_uncertain_execution!==true||
  x.confirmed_possible_billing!==true)
  throw fail('ABANDONMENT_EXPLICIT_CONFIRMATION_REQUIRED',403);
 const r=await ownerEvidence(req,{env,fetchImpl,verify,inspect,inspectFence});
 const claim=await loadClaim({scope:r.scope,env,fetchImpl});
 verifyChallenge(x.challenge,key,{
  principal:r.scope.authenticated_user_id,root:r.scope.continuity_root_id,
  turn:x.turn_id,sequence:r.fence.sequence_num,
  claim_fingerprint:claimFingerprint(r.scope,claim),
  session_fingerprint:sessionFingerprint(req),
 },now);
 if(claim.active_turn_id!==x.turn_id||
  !/^[0-9a-f-]{36}$/i.test(claim.active_claim_token||'')||
  claim.sequence_num!==r.fence.sequence_num||
  claim.last_committed_entry_id!==r.fence.last_committed_entry_id||
  claim.last_committed_entry_hash!==r.fence.last_committed_entry_hash)
  throw fail('ABANDONMENT_CLAIM_CHANGED',409);

 const ids=causalTurnIds(r.scope,x.turn_id);
 const get=async id=>{
  const v=await lookup({entryId:id,fetchImpl});
  if(!v)throw fail('ABANDONMENT_SOURCE_EVIDENCE_MISSING',409);
  validateUniverseEntry(v);
  if(v.continuity_root_id!==r.scope.continuity_root_id||
     v.worldline_id!==r.scope.worldline_id)
   throw fail('ABANDONMENT_SOURCE_SCOPE_MISMATCH',409);
  return v;
 };
 const [user,processing,interrupted]=await Promise.all(
  [ids.user,ids.processing,ids.interrupted].map(get));
 const assistant=await lookup({entryId:ids.assistant,fetchImpl});
 const committed=await lookup({entryId:ids.committed,fetchImpl});
 if(assistant||committed)throw fail('ABANDONMENT_ASSISTANT_OR_COMMITTED_RESULT_EXISTS',409);
 const timestamp=new Date(now()).toISOString();
 const common={continuity_root_id:r.scope.continuity_root_id,
  worldline_id:r.scope.worldline_id,epistemic_kind:'OBSERVATION',
  assertion_time:timestamp,effective_time:timestamp};
 const approval=createUniverseEntry({
  ...common,entry_id:entryId(r.scope,x.turn_id,'approval'),
  event_kind:'REALITY_TURN_ABANDONMENT_APPROVAL',
  source_ref:'reality:standalone:owner-approval',
  payload:{owner_user_id:r.scope.authenticated_user_id,turn_id:x.turn_id,
   claim_sequence_num:claim.sequence_num,
   approval_intent:'EXPLICIT_OWNER_ABANDON_INCOMPLETE',
   acknowledges_uncertain_model_execution:true,
   acknowledges_possible_model_billing:true,
   user_message_hash:user.ledger_entry_hash,
   interruption_receipt_hash:interrupted.ledger_entry_hash},
  evidence_references:[user.entry_id,interrupted.entry_id],
  provenance:{source:'REALITY_STANDALONE_OWNER_AUTHORIZED',
   authenticated_user_id:r.scope.authenticated_user_id,authority_granted:false},
 });
 const resolution=createUniverseEntry({
  ...common,entry_id:entryId(r.scope,x.turn_id,'resolution'),
  event_kind:'REALITY_TURN_RESOLUTION_RECEIPT',
  source_ref:'reality:standalone:atomic-abandonment',
  payload:{owner_user_id:r.scope.authenticated_user_id,turn_id:x.turn_id,
   claim_sequence_num:claim.sequence_num,
   prior_commit_entry_id:claim.last_committed_entry_id||null,
   prior_commit_hash:claim.last_committed_entry_hash||null,
   resolution_status:'ABANDONED',model_call_outcome:'UNKNOWN',
   external_action_outcome:'NOT_ESTABLISHED',
   approval_receipt_id:approval.entry_id,
   approval_receipt_hash:approval.ledger_entry_hash,
   user_message_hash:user.ledger_entry_hash,
   processing_receipt_hash:processing.ledger_entry_hash,
   interruption_receipt_hash:interrupted.ledger_entry_hash},
  evidence_references:[user.entry_id,processing.entry_id,
   interrupted.entry_id,approval.entry_id],
  provenance:{source:'REALITY_STANDALONE_VERIFIED_RESOLUTION',
   authenticated_user_id:r.scope.authenticated_user_id,authority_granted:false},
 });
 const result=await invoke({scope:r.scope,turnId:x.turn_id,claim,approval,
  resolution,env,fetchImpl});
 const persisted=await lookup({entryId:result.receipt_id,fetchImpl});
 validateUniverseEntry(persisted);
 if(persisted.entry_id!==result.receipt_id||
    persisted.ledger_entry_hash!==result.receipt_hash||
    persisted.continuity_root_id!==r.scope.continuity_root_id||
    persisted.payload?.resolution_status!=='ABANDONED'||
    persisted.payload?.owner_user_id!==r.scope.authenticated_user_id||
    persisted.payload?.turn_id!==x.turn_id)
  throw fail('ABANDONMENT_POST_WRITE_RECEIPT_INVALID',503);
 const fence=await inspectFence({scope:r.scope,env,fetchImpl});
 if(fence.status!=='IDLE'||fence.sequence_num!==claim.sequence_num-1||
    fence.last_committed_entry_id!==claim.last_committed_entry_id||
    fence.last_committed_entry_hash!==claim.last_committed_entry_hash)
  throw fail('ABANDONMENT_POST_WRITE_FENCE_INVALID',503);
 return Object.freeze({ok:true,status:'ABANDONED_AFTER_OWNER_REVIEW',
  resolution_receipt_id:persisted.entry_id,
  resolution_receipt_hash:persisted.ledger_entry_hash,
  independently_verified_receipt:true,independently_verified_fence:true,
  restored_sequence_num:fence.sequence_num,
  model_outcome:'UNKNOWN',model_retried:false,
  external_action_outcome:'NOT_ESTABLISHED'});
}
