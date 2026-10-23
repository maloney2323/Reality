// Reality per-root causal sequence v0.1: atomic, server-only PostgREST RPC.
// No process-local mutex is used. No automatic lease expiry or bypass.
// Requires REVIEW_ONLY_benchmark_conversation_sequencer_v0.1.sql to be
// separately reviewed and applied to the isolated benchmark before enabling.
import {randomUUID} from 'node:crypto';

export const REALITY_CONVERSATION_SEQUENCE_VERSION='reality-conversation-sequencer-v0.1';
function problem(code,status=503){const e=new Error(code);e.status=status;return e}
function connection(env){
 if(env.VERCEL_ENV==='production')throw problem('SEQUENCE_PRODUCTION_FORBIDDEN');
 const ref=String(env.REALITY_STANDALONE_EXPECTED_PROJECT_REF||'');
 const url='https://'+ref+'.supabase.co';
 if(!/^[a-z0-9-]{10,40}$/.test(ref) ||
    env.SUPABASE_URL!==url || env.REALITY_UNIVERSE_PERSISTENCE_URL!==url)
  throw problem('SEQUENCE_DATABASE_PROJECT_MISMATCH');
 const key=String(env.REALITY_UNIVERSE_PERSISTENCE_KEY||'');
 if(!/^sb_secret_[\w-]{16,}$/.test(key))
  throw problem('SEQUENCE_DEDICATED_SERVICE_KEY_REQUIRED');
 return {url,key};
}
async function storageCall({env,fetchImpl,path,method='POST',body}){
 const {url,key}=connection(env);
 let result;
 try{
  result=await fetchImpl(url+path,{
   method,redirect:'error',cache:'no-store',
   headers:{apikey:key,Accept:'application/json',
    'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{}),
  });
 }catch{throw problem('SEQUENCE_STORAGE_UNREACHABLE')}
 if(!result.ok)throw problem('SEQUENCE_STORAGE_RPC_NOT_VERIFIED');
 const data=await result.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  throw problem('SEQUENCE_STORAGE_RECEIPT_INVALID');
 return data;
}
function validScope(scope){
 if(!scope?.continuity_root_id||!scope?.worldline_id||
    !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(scope?.authenticated_user_id||''))
  throw problem('SEQUENCE_IDENTITY_REQUIRED');
}
export async function claimConversationSlot({scope,turnId,env=process.env,
 fetchImpl=fetch,newToken=randomUUID}={}){
 validScope(scope);
 if(typeof turnId!=='string'||!/^[A-Za-z0-9:_-]{1,96}$/.test(turnId))
  throw problem('SEQUENCE_TURN_INVALID',400);
 const token=newToken();
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(token))
  throw problem('SEQUENCE_TOKEN_INVALID');
 const receipt=await storageCall({env,fetchImpl,
  path:'/rest/v1/rpc/reality_claim_conversation_turn',
  body:{
   p_root_id:scope.continuity_root_id,
   p_worldline_id:scope.worldline_id,
   p_owner_user_id:scope.authenticated_user_id,
   p_turn_id:turnId,p_claim_token:token,
  },
 });
 if(receipt.status==='BUSY')throw problem('SEQUENCE_PRIOR_TURN_UNRESOLVED',409);
 if(receipt.status!=='CLAIMED'||receipt.claim_token!==token||
   !Number.isSafeInteger(receipt.sequence_num)||receipt.sequence_num<1)
  throw problem('SEQUENCE_CLAIM_RECEIPT_INVALID');
 return Object.freeze({
  status:'CLAIMED',turn_id:turnId,root:scope.continuity_root_id,
  sequence_num:receipt.sequence_num,token,
  prior_commit_entry_id:receipt.prior_commit_entry_id||null,
  prior_commit_hash:receipt.prior_commit_hash||null,
 });
}
export async function finishConversationSlot({scope,claim,
 committed,env=process.env,fetchImpl=fetch}={}){
 validScope(scope);
 if(claim?.status!=='CLAIMED'||claim.root!==scope.continuity_root_id||
    committed?.receipt?.verified_chain!==true||
    typeof committed.receipt.commit_entry_id!=='string'||
    !/^[0-9a-f]{64}$/.test(committed.receipt.commit_entry_hash||''))
  throw problem('SEQUENCE_FINISH_EVIDENCE_REQUIRED');
 const receipt=await storageCall({env,fetchImpl,
  path:'/rest/v1/rpc/reality_finish_conversation_turn',
  body:{
   p_root_id:scope.continuity_root_id,p_owner_user_id:scope.authenticated_user_id,
   p_turn_id:claim.turn_id,p_claim_token:claim.token,
   p_commit_entry_id:committed.receipt.commit_entry_id,
   p_commit_hash:committed.receipt.commit_entry_hash,
  },
 });
 if(receipt.status!=='FINISHED'||receipt.sequence_num!==claim.sequence_num||
    receipt.commit_entry_id!==committed.receipt.commit_entry_id||
    receipt.commit_hash!==committed.receipt.commit_entry_hash)
  throw problem('SEQUENCE_FINISH_RECEIPT_INVALID');
 return Object.freeze({
  status:'FINISHED',sequence_num:claim.sequence_num,
  commit_entry_id:receipt.commit_entry_id,
  prior_commit_entry_id:claim.prior_commit_entry_id,
 });
}
export async function inspectConversationSlot({scope,env=process.env,fetchImpl=fetch}={}){
 validScope(scope);
 const {url,key}=connection(env);
 const filter=new URLSearchParams({
  select:'root_id,owner_user_id,worldline_id,sequence_num,active_turn_id,last_committed_entry_id,last_committed_entry_hash',
  root_id:'eq.'+scope.continuity_root_id,
  limit:'1',
 });
 let res;
 try{res=await fetchImpl(url+'/rest/v1/reality_conversation_turn_fences?'+filter,{
  method:'GET',redirect:'error',cache:'no-store',
  headers:{apikey:key,Accept:'application/json'},
 })}catch{throw problem('SEQUENCE_FENCE_READ_UNAVAILABLE')}
 if(!res.ok)throw problem('SEQUENCE_FENCE_READ_UNAVAILABLE');
 const rows=await res.json().catch(()=>null);
 if(!Array.isArray(rows)||rows.length>1)throw problem('SEQUENCE_FENCE_INVALID');
 if(rows.length===0)return Object.freeze({status:'NO_FENCE'});
 const row=rows[0];
 if(row.root_id!==scope.continuity_root_id||
    row.owner_user_id!==scope.authenticated_user_id||
    row.worldline_id!==scope.worldline_id)
  throw problem('SEQUENCE_FENCE_SCOPE_MISMATCH');
 return Object.freeze({
  status:row.active_turn_id?'BUSY':'IDLE',
  active_turn_id:row.active_turn_id||null,
  sequence_num:row.sequence_num,
  last_committed_entry_id:row.last_committed_entry_id||null,
  last_committed_entry_hash:row.last_committed_entry_hash||null,
 });
}


// Crash after durable COMMITTED but before finish RPC: reclaim ONLY the
// existing verified result. Never re-run cognition or perform any action.
// SQL atomically refuses another active turn, another owner, or a mismatched
// commit, and only service_role can invoke the RPC.
export async function reconcileCommittedConversationSlot({
 scope,turnId,verified,env=process.env,fetchImpl=fetch,
}={}){
 validScope(scope);
 if(typeof turnId!=='string'||!/^[A-Za-z0-9:_-]{1,96}$/.test(turnId))
  throw problem('SEQUENCE_RECONCILE_TURN_INVALID',400);
 if(!verified?.committed||verified?.turn_id!==turnId||
   verified?.receipt?.verified_chain!==true||
   typeof verified.receipt.commit_entry_id!=='string'||
   !/^[a-f0-9]{64}$/.test(verified.receipt.commit_entry_hash||''))
  throw problem('SEQUENCE_RECONCILE_UNVERIFIED_COMMIT');
 const receipt=await storageCall({
  env,fetchImpl,path:'/rest/v1/rpc/reality_reconcile_committed_conversation_turn',
  body:{
   p_root_id:scope.continuity_root_id,
   p_owner_user_id:scope.authenticated_user_id,
   p_turn_id:turnId,
   p_commit_entry_id:verified.receipt.commit_entry_id,
   p_commit_hash:verified.receipt.commit_entry_hash,
  },
 });
 if(!['RECOVERED','ALREADY_FINISHED'].includes(receipt.status)||
    receipt.commit_entry_id!==verified.receipt.commit_entry_id||
    receipt.commit_hash!==verified.receipt.commit_entry_hash||
    !Number.isSafeInteger(receipt.sequence_num)||
    receipt.sequence_num<1)
  throw problem('SEQUENCE_RECONCILE_RECEIPT_INVALID');
 const readback=await inspectConversationSlot({scope,env,fetchImpl});
 if(readback.status!=='IDLE'||
    readback.sequence_num!==receipt.sequence_num||
    readback.last_committed_entry_id!==verified.receipt.commit_entry_id||
    readback.last_committed_entry_hash!==verified.receipt.commit_entry_hash)
  throw problem('SEQUENCE_RECONCILE_FENCE_READBACK_MISMATCH');
 return Object.freeze({
  status:receipt.status,
  sequence_num:receipt.sequence_num,
  commit_entry_id:verified.receipt.commit_entry_id,
  commit_entry_hash:verified.receipt.commit_entry_hash,
  verified_fence_readback:true,
  model_called:false,external_action_executed:false,
 });
}
