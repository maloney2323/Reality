// Authenticated standalone Preview adapter: only verified user source messages
// create append-only, read-back-observed *candidate* obligations. Off by default.
import {observeUserConditions,projectUserConditions,assessProposalAgainstObservedConditions,
 OBLIGATION_OBSERVATION_KIND} from './reality-obligation-observation-v0.1.js';
import {retrievePersistedUniverse,persistUniverseEntry,
 retrieveOptionalPersistedUniverseEntry} from './reality-native-universe-persistence-v1.0.js';

export const STANDALONE_OBLIGATION_ADAPTER_VERSION='reality-standalone-obligations-v0.1';
const fail=code=>{throw Error(code)};
export function standaloneObligationScope(scope){
 if(scope?.identity_basis!=='SUPABASE_AUTH_SERVER_VERIFIED'||
  !scope?.authenticated_user_id||!scope?.continuity_root_id||
  !scope?.worldline_id||!scope?.client_conversation_selector)
  fail('OBLIGATION_PREVIEW_TRUSTED_SCOPE_REQUIRED');
 return Object.freeze({
  owner_user_id:scope.authenticated_user_id,
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  // Explicitly a conversation-level workstream until authenticated per-task
  // selectors exist; never conflate estimates from separate conversations.
  work_item_id:'conversation:'+scope.client_conversation_selector,
 });
}
export async function loadStandaloneObligations({scope,fetchImpl=fetch,
 load=retrievePersistedUniverse,limit=80}={}){
 const trustedScope=standaloneObligationScope(scope);
 const result=await load({
  continuityRootId:trustedScope.continuity_root_id,
  worldlineId:trustedScope.worldline_id,
  eventKind:OBLIGATION_OBSERVATION_KIND,limit,fetchImpl,
 });
 if(result?.status!=='AVAILABLE'||!Array.isArray(result.entries))
  fail('OBLIGATION_PREVIEW_LEDGER_UNAVAILABLE');
 const view=projectUserConditions({trustedScope,entries:result.entries,limit});
 return Object.freeze({trustedScope,entries:result.entries,view,
  retrieval_window_bounded:true,complete_history_verified:false});
}
export async function captureStandaloneObligations({
 scope,userEntry,signalHandoffVerified=false,store=persistUniverseEntry,
 lookup=retrieveOptionalPersistedUniverseEntry,fetchImpl=fetch,
}={}){
 if(signalHandoffVerified!==true)fail('OBLIGATION_SIGNAL_HANDOFF_NOT_VERIFIED');
 const trustedScope=standaloneObligationScope(scope);
 if(userEntry?.event_kind!=='AUTHENTICATED_CONVERSATION_MESSAGE'||
   userEntry?.payload?.role!=='user'||
   userEntry?.payload?.principal_id!==trustedScope.owner_user_id||
   userEntry?.continuity_root_id!==trustedScope.continuity_root_id||
   userEntry?.worldline_id!==trustedScope.worldline_id)
  fail('OBLIGATION_USER_SOURCE_UNTRUSTED');
 const candidates=observeUserConditions({
  trustedScope,
  userSignal:{entry_id:userEntry.entry_id,turn_id:userEntry.payload.turn_id,
   text:userEntry.payload.text},
  observedAt:userEntry.assertion_time,
 });
 const confirmed=[];
 for(const entry of candidates){
  const saved=await store(entry,{fetchImpl});
  if(!['PERSISTED','DUPLICATE_IDENTICAL','DUPLICATE_IDENTICAL_CONCURRENT'].includes(saved?.status)||
   saved?.entry?.entry_id!==entry.entry_id ||
   saved?.entry?.ledger_entry_hash!==entry.ledger_entry_hash)
   fail('OBLIGATION_DURABLE_WRITE_UNVERIFIED');
  const back=await lookup({entryId:entry.entry_id,fetchImpl});
  if(!back||back.entry_id!==entry.entry_id||
   back.ledger_entry_hash!==entry.ledger_entry_hash)
   fail('OBLIGATION_INDEPENDENT_READBACK_FAILED');
  confirmed.push(back);
 }
 return Object.freeze({version:STANDALONE_OBLIGATION_ADAPTER_VERSION,
  observation_entries:confirmed,created_count:confirmed.length,
  action_authorized:false,externally_executed:false,
  verified_structural_storage:true,semantic_truth_verified:false});
}
export function assessStandaloneObligationProposal({scope,entries=[],modelAnswer,modelResponseId}={}){
 return assessProposalAgainstObservedConditions({trustedScope:standaloneObligationScope(scope),
  entries,modelAnswer,modelResponseId});
}
