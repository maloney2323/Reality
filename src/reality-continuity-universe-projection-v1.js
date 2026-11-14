// Canonical Continuity Spine -> Universe cognitive read model.
//
// There must NOT be a second independent "truth ledger" for Chat.
// The verified, owner/root-bound existing Spine events are projected into the
// next cognitive Universe window. No event is copied into legacy Universe
// storage, no stored claim is promoted to external truth, and no authority
// can be granted by this read-only projection.
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {SPINE_STAGES} from './reality-continuity-spine-v2.0.js';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const TYPE=/^[A-Z][A-Z0-9_]{2,99}$/;
export function projectCanonicalContinuityIntoUniverse({
 history,rootId,worldlineId,limit=24
}={}){
 if(!Array.isArray(history)||!UUID.test(rootId||'')||
    !UUID.test(worldlineId||'')||!Number.isInteger(limit)||
    limit<1||limit>48)
  throw Error('UNIVERSE_CANONICAL_SPINE_PROJECTION_INVALID');
 // This verifies every historical event's content hash, parent link,
 // lineage hash, and single-chain integrity, not just the latest tip.
 const verified=orderContinuityHistory(history);
 if(verified.some(e=>e.continuity_root_id!==rootId||
                  e.worldline_id!==worldlineId||
                  !SPINE_STAGES.includes(e.event_kind)))
  throw Error('UNIVERSE_CANONICAL_SPINE_SCOPE_OR_STAGE_UNVERIFIED');
 const entries=verified.slice(-limit).map(event=>{
  // Only bounded, fixed-shape event metadata crosses into model context.
  // Never carry forward prior assistant text as "verified facts".
  const sourceType=typeof event.payload?.event_type==='string'&&
    TYPE.test(event.payload.event_type)?
    event.payload.event_type:'UNCLASSIFIED_EVENT_TYPE';
  const epistemic=typeof event.epistemic_status==='string'?
    event.epistemic_status:'UNVERIFIED';
  return Object.freeze({
   entry_id:'canonical-spine:'+event.event_id,
   event_id:event.event_id,
   continuity_root_id:rootId,
   worldline_id:worldlineId,
   event_kind:event.event_kind,
   event_type:sourceType,
   epistemic_kind:epistemic,
   effective_time:event.effective_time,
   assertion_time:event.assertion_time,
   source_ref:'continuity-spine:'+event.event_id,
   evidence_references:Object.freeze([...(event.evidence_refs||[])]
    .filter(v=>typeof v==='string').slice(0,12)),
   lineage_hash:event.lineage_hash,
   summary:'Canonical continuity stage '+event.event_kind+
    ', recorded event type '+sourceType+
    ', epistemic status '+epistemic+
    '. This is lineage and provenance, not independently verified external truth.',
   source_kind:'ROOT_BOUND_HASH_CHAIN_VERIFIED_READ_MODEL',
   model_text_is_not_evidence:true,
   grants_execution_authority:false,
   installation_authorized:false,
   verified_external_truth:false,
  });
 });
 return Object.freeze({
  status:entries.length?
   'CANONICAL_CONTINUITY_PROJECTED_TO_UNIVERSE':
   'CANONICAL_CONTINUITY_HAS_NO_PRIOR_EVENTS',
  source:'SINGLE_CONTINUITY_SPINE_NOT_A_SECOND_LEDGER',
  verified_history_event_count:verified.length,
  entries:Object.freeze(entries),
  permits_external_execution:false,
  permits_installation:false,
  externally_verified_truth_not_inferred:true,
 });
}
