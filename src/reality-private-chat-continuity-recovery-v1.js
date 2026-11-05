// Narrow, read-only recovery for a previously forked private Chat continuity
// chain. Never deletes, updates, re-signs or selects one fork as the truth.
// Independently verify *both* hash chains and anchor their exact tips in a
// separately named recovery epoch. No prior goal or execution authority is carried.
import {createHash} from 'node:crypto';
import {createContinuitySpine} from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';

export const PRIVATE_CHAT_FORK_RECOVERY_VERSION='private-chat-fork-recovery-v1';
function fail(code){const e=new Error(code);e.code=code;throw e}
const isId=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
const isHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);

export function verifyReadOnlyChatFork(history,{rootId,worldlineId}={}){
 if(!Array.isArray(history)||history.length<3||history.length>800||
   !isId(rootId)||!isId(worldlineId))fail('CHAT_FORK_AUDIT_INVALID_INPUT');
 const byId=new Map(),parents=new Set();
 for(const e of history){
  if(!isId(e?.event_id)||byId.has(e.event_id)||!isHash(e.lineage_hash)||
    e.continuity_root_id!==rootId||e.worldline_id!==worldlineId)
   fail('CHAT_FORK_AUDIT_EVENT_SCOPE_INVALID');
  byId.set(e.event_id,e);
  if(e.parent_event_id)parents.add(e.parent_event_id);
 }
 // Reject missing historical parents before classifying the fork shape.
 for(const parent of parents)if(!byId.has(parent))fail('CHAT_FORK_AUDIT_MISSING_PARENT');
 const tips=history.filter(e=>!parents.has(e.event_id));
 if(tips.length!==2)fail('CHAT_FORK_AUDIT_REQUIRES_TWO_TIPS');
 const ancestry=tips.map(tip=>{
  const seen=new Set(),path=[];
  let cursor=tip;
  while(cursor){
   if(seen.has(cursor.event_id))fail('CHAT_FORK_AUDIT_CYCLE');
   seen.add(cursor.event_id);path.push(cursor);
   if(cursor.parent_event_id&&!byId.has(cursor.parent_event_id))
    fail('CHAT_FORK_AUDIT_MISSING_PARENT');
   cursor=cursor.parent_event_id?byId.get(cursor.parent_event_id):null;
  }
  // Uses the exact same cryptographic historical verifier, including
  // persisted payload hash, parent hash and time normalization.
  const ordered=orderContinuityHistory(path);
  if(ordered.length!==path.length)fail('CHAT_FORK_AUDIT_INCOMPLETE_PATH');
  return ordered;
 });
 const first=ancestry[0],second=ancestry[1];
 // The observed incident is exactly two terminal siblings, not a divergent
 // user-goal history. Other cases must still fail closed.
 if(first.length!==second.length||first.length<2||
   first.at(-2).event_id!==second.at(-2).event_id)
  fail('CHAT_FORK_AUDIT_NOT_TERMINAL_SIBLINGS');
 const finalStages=new Set([first.at(-1).event_kind,second.at(-1).event_kind]);
 if(finalStages.size!==2||!finalStages.has('RAW_SIGNAL')||!finalStages.has('VERIFICATION')||
    first.at(-1).payload?.external_action_executed===true||
    second.at(-1).payload?.external_action_executed===true)
  fail('CHAT_FORK_AUDIT_CONSEQUENTIAL_BRANCH');
 const union=new Set([...first,...second].map(e=>e.event_id));
 if(union.size!==history.length)fail('CHAT_FORK_AUDIT_DISCONNECTED_EVENTS');
 const forkedTips=tips.map(e=>({event_id:e.event_id,lineage_hash:e.lineage_hash,
   stage:e.event_kind})).sort((a,b)=>a.event_id.localeCompare(b.event_id));
 const parent=first.at(-2);
 const fingerprint=createHash('sha256').update(JSON.stringify({
   rootId,worldlineId,parent_id:parent.event_id,parent_hash:parent.lineage_hash,
   tips:forkedTips
 })).digest('hex');
 return Object.freeze({
   version:PRIVATE_CHAT_FORK_RECOVERY_VERSION,
   status:'TWO_IMMUTABLE_TERMINAL_SIBLINGS_INDEPENDENTLY_VERIFIED',
   predecessor_root_id:rootId,predecessor_worldline_id:worldlineId,
   parent_event_id:parent.event_id,parent_lineage_hash:parent.lineage_hash,
   verified_event_count:history.length,
   independent_tip_hashes:forkedTips,
   fork_fingerprint:fingerprint,
   prior_goal_authority_transferred:false,
   installation_authorized:false,
   external_execution_authorized:false,
   previous_history_modified:false,
 });
}
export async function resolvePrivateChatContinuity({
 scopedRoot,db,fetchImpl=fetch
}={}){
 if(typeof scopedRoot!=='string'||!/^personal:chat:[a-f0-9]{64}$/.test(scopedRoot))
  fail('CHAT_CONTINUITY_SCOPE_INVALID');
 const persistence=createUniversePostgresPersistence({...db,fetchImpl,strictSecrets:true});
 const original=createContinuitySpine({
   continuityRootId:scopedRoot,worldlineId:scopedRoot,subjectId:'private-chat'
 });
 const prior=await persistence.reconstruct({
   continuityRootId:original.continuity_root_id,worldlineId:original.worldline_id
 });
 try{
  orderContinuityHistory(prior);
  return Object.freeze({scopedRoot,fork_recovery:null});
 }catch(e){
  if(e?.message!=='RELIABILITY_HISTORY_FORKED')throw e;
 }
 const audit=verifyReadOnlyChatFork(prior,{
   rootId:original.continuity_root_id,worldlineId:original.worldline_id
 });
 // Stable across requests; no user input, no missing-history reset.
 const recoveredRoot=scopedRoot+':fork-recovery-v1:'+audit.fork_fingerprint.slice(0,24);
 const recovery=createContinuitySpine({
   continuityRootId:recoveredRoot,worldlineId:recoveredRoot,subjectId:'private-chat'
 });
 const recovered=await persistence.reconstruct({
   continuityRootId:recovery.continuity_root_id,worldlineId:recovery.worldline_id
 });
 // A second fork in the recovery epoch is NOT silently re-recovered.
 orderContinuityHistory(recovered);
 return Object.freeze({scopedRoot:recoveredRoot,fork_recovery:audit});
}
