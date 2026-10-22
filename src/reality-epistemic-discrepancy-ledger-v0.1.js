// Durable, observation-only discrepancy transport using the existing Universe
// persistence adapter. A detector diagnosis is not independent factual truth.
import { createUniverseEntry, validateUniverseEntry } from './reality-universe-persistence-contract-v1.0.js';
import { persistUniverseEntry, retrievePersistedUniverseEntry } from './reality-native-universe-persistence-v1.0.js';
import { inspectEpistemicDifferences } from './reality-epistemic-difference-detector-v0.1.js';

export const DISCREPANCY_LEDGER_VERSION = 'reality-discrepancy-ledger-v0.1';
export const DISCREPANCY_EVENT_KINDS = Object.freeze([
  'DISCREPANCY_DETECTED', 'DISCREPANCY_RESOLVED',
]);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
function canonical(x) {
  if (Array.isArray(x)) return x.map(canonical);
  if (x !== null && typeof x === 'object') return Object.fromEntries(
    Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
  return x;
}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function fail(code) { throw new Error(code); }
function sourceClaim(observation, key) {
  return observation?.content_or_metadata?.epistemic_claims?.find(
    c=>c && c.target_state_key===key) || null;
}
function scopedEntity(observation,claim) {
  return claim?.entity_ref || observation?.object_refs?.[0] || null;
}

// The detector references OBSERVATION IDs. Only actual read-back ledger entries
// whose contained observation matches the ID may supply its durable provenance.
async function readEvidenceBinding({observationId,entryId,continuityRootId,worldlineId,key,fetchImpl}) {
  if(!nonempty(entryId)) fail('DISCREPANCY_EVIDENCE_BINDING_REQUIRED');
  const entry=await retrievePersistedUniverseEntry({entryId,fetchImpl});
  if(entry.continuity_root_id!==continuityRootId || entry.worldline_id!==worldlineId)
    fail('DISCREPANCY_EVIDENCE_SCOPE_MISMATCH');
  if(entry.event_kind!=='SOURCE_OBSERVATION' ||
     entry.payload?.observation?.observation_id!==observationId)
    fail('DISCREPANCY_OBSERVATION_LINEAGE_MISMATCH');
  const obs=entry.payload.observation;
  if(obs.provenance?.continuity_root_id!==continuityRootId)
    fail('DISCREPANCY_OBSERVATION_ROOT_MISMATCH');
  const claim=sourceClaim(obs,key),entity=scopedEntity(obs,claim);
  if(!claim || !nonempty(entity)) fail('DISCREPANCY_TYPED_CLAIM_REQUIRED');
  return {entry,observation:obs,claim,entity};
}

/**
 * Two distinct reads: the source observations before append; and the stored
 * discrepancy plus its source observations after append. Ref integrity, root,
 * worldline, typed key, values and detector classification must all agree.
 *
 * evidenceBindings is a server-resolved mapping observation_id -> ledger
 * entry_id. Never accept it directly from an unauthenticated browser.
 */
export async function appendVerifiedDiscrepancy({
  discrepancy,continuityRootId,worldlineId='reality:primary',
  evidenceBindings={},fetchImpl=fetch,
}={}) {
  if(!nonempty(continuityRootId) || !nonempty(worldlineId))
    fail('DISCREPANCY_SCOPE_REQUIRED');
  const lineage=discrepancy?.evidence_lineage;
  const ids=[...(lineage?.ledger_record_ids||[]),lineage?.incoming_signal_id];
  if(!ids.length || ids.some(id=>!nonempty(id)) || new Set(ids).size!==ids.length)
    fail('DISCREPANCY_LINEAGE_INVALID');
  const keys=discrepancy?.target_state_keys;
  if(!Array.isArray(keys) || keys.length!==1 || !nonempty(keys[0]))
    fail('DISCREPANCY_SINGLE_KEY_REQUIRED');

  const source=await Promise.all(ids.map(id=>readEvidenceBinding({
    observationId:id,entryId:evidenceBindings[id],
    continuityRootId,worldlineId,key:keys[0],fetchImpl,
  })));
  const entity=source[0].entity;
  if(source.some(s=>s.entity!==entity)) fail('DISCREPANCY_ENTITY_SCOPE_MISMATCH');

  // Regenerate diagnosis from immutable source content, not from the
  // incoming event's assertion that it is a valid conflict.
  const observed=source.map(s=>s.observation);
  const derived=inspectEpistemicDifferences({observations:observed})
    .epistemic_discrepancies.find(x=>x.discrepancy_id===discrepancy.discrepancy_id);
  if(!derived || !same(derived,discrepancy))
    fail('DISCREPANCY_DIAGNOSIS_NOT_REPRODUCIBLE');

  const uniqueEntries=source.map(s=>s.entry);
  const evidenceManifest=uniqueEntries.map(entry=>({
    entry_id:entry.entry_id,ledger_entry_hash:entry.ledger_entry_hash,
    observation_id:entry.payload.observation.observation_id,
  }));
  const entry=createUniverseEntry({
    entry_id:'discrepancy:detected:'+discrepancy.discrepancy_id,
    continuity_root_id:continuityRootId,
    worldline_id:worldlineId,
    event_kind:'DISCREPANCY_DETECTED',
    epistemic_kind:'INFERRED',
    effective_time:discrepancy.timestamp_asserted,
    assertion_time:discrepancy.timestamp_recorded,
    source_ref:DISCREPANCY_LEDGER_VERSION,
    payload:{
      discrepancy,
      scope:{entity_ref:entity,target_state_key:keys[0]},
      evidence_manifest:evidenceManifest,
      reconciliation_status:'UNRESOLVED',
      epistemic_truth_established:false,
      detector_mode:'OBSERVATION_ONLY',
      action_authorized:false,
    },
    evidence_references:evidenceManifest.map(r=>r.entry_id),
    provenance:{source:DISCREPANCY_LEDGER_VERSION,epistemic_discrepancy_id:discrepancy.discrepancy_id},
  });
  validateUniverseEntry(entry);
  await persistUniverseEntry(entry,{fetchImpl});
  const readBack=await retrievePersistedUniverseEntry({entryId:entry.entry_id,fetchImpl});
  if(readBack.ledger_entry_hash!==entry.ledger_entry_hash ||
      !same(readBack.payload,entry.payload) ||
      !same(readBack.evidence_references,entry.evidence_references))
    fail('DISCREPANCY_POST_WRITE_MISMATCH');

  // Re-read each exact source after persistence. Reject forged/switchable
  // lineage rather than passing an unverifiable diagnosis downstream.
  for(const record of evidenceManifest) {
    const reread=await retrievePersistedUniverseEntry({entryId:record.entry_id,fetchImpl});
    if(reread.ledger_entry_hash!==record.ledger_entry_hash ||
        reread.continuity_root_id!==continuityRootId ||
        reread.worldline_id!==worldlineId ||
        reread.payload?.observation?.observation_id!==record.observation_id)
      fail('DISCREPANCY_POST_WRITE_LINEAGE_MISMATCH');
  }

  return Object.freeze({
    verification_status:'VERIFIED_DURABLE_LINEAGE',
    verification_scope:'STORAGE_INTEGRITY_NOT_SEMANTIC_TRUTH',
    entry_id:readBack.entry_id,ledger_entry_hash:readBack.ledger_entry_hash,
    continuity_root_id:continuityRootId,worldline_id:worldlineId,
    entry:Object.freeze(readBack),
    intervention_performed:false,
  });
}

/**
 * Non-destructive targeted projection from read-back receipts only.
 * A detected E_FACT_CONFLICT marks exactly one entity/field CONTESTED.
 * Other classes remain diagnostic; they do not freeze an entire worldline.
 * DISCREPANCY_RESOLVED is reserved for a future independently verified
 * reconciliation/receipt implementation, not accepted from a plain flag.
 */
export function projectVerifiedDiscrepancyKeys({verifiedReceipts=[]}={}) {
  if(!Array.isArray(verifiedReceipts)) fail('VERIFIED_RECEIPTS_REQUIRED');
  const byKey=new Map();
  for(const receipt of verifiedReceipts) {
    if(receipt?.verification_status!=='VERIFIED_DURABLE_LINEAGE' ||
       receipt.ledger_entry_hash!==receipt.entry?.ledger_entry_hash)
      fail('DISCREPANCY_UNVERIFIED_RECEIPT');
    const entry=receipt.entry;
    validateUniverseEntry(entry);
    if(entry.event_kind!=='DISCREPANCY_DETECTED' ||
       entry.source_ref!==DISCREPANCY_LEDGER_VERSION ||
       entry.continuity_root_id!==receipt.continuity_root_id ||
       entry.worldline_id!==receipt.worldline_id)
      fail('DISCREPANCY_RECEIPT_SCOPE_MISMATCH');
    const p=entry.payload;
    if(p?.detector_mode!=='OBSERVATION_ONLY' ||
       p?.epistemic_truth_established!==false ||
       p?.action_authorized!==false ||
       p?.reconciliation_status!=='UNRESOLVED' ||
       entry.entry_id!=='discrepancy:detected:'+p?.discrepancy?.discrepancy_id ||
       p?.scope?.target_state_key!==p?.discrepancy?.target_state_keys?.[0])
      fail('DISCREPANCY_PROJECTION_CONTRACT_INVALID');
    const classification=p.discrepancy.classification;
    const status=classification==='E_FACT_CONFLICT'?'CONTESTED':
      classification==='E_UNATTESTED'?'UNATTESTED':
      classification==='E_DELTA'?'EVOLVING':'SPECULATIVE';
    const identity=JSON.stringify([
      entry.continuity_root_id,entry.worldline_id,p.scope.entity_ref,p.scope.target_state_key,
    ]);
    const present=byKey.get(identity)||{
      continuity_root_id:entry.continuity_root_id,worldline_id:entry.worldline_id,
      entity_ref:p.scope.entity_ref,target_state_key:p.scope.target_state_key,
      status:'UNCONTESTED',discrepancy_entry_ids:[],
      fact_conflict_entry_ids:[],unattested_entry_ids:[],
    };
    present.discrepancy_entry_ids.push(entry.entry_id);
    if(status==='CONTESTED') {
      present.fact_conflict_entry_ids.push(entry.entry_id);
      present.status='CONTESTED';
    } else if(status==='UNATTESTED') {
      present.unattested_entry_ids.push(entry.entry_id);
      if(present.status!=='CONTESTED') present.status='UNATTESTED';
    } else if(present.status==='UNCONTESTED') present.status=status;
    byKey.set(identity,present);
  }
  return Object.freeze({
    version:DISCREPANCY_LEDGER_VERSION,
    projection:'TARGETED_EPISTEMIC_STATE',
    mode:'OBSERVATION_ONLY',
    state_keys:Object.freeze(Array.from(byKey.values(),x=>Object.freeze({
      ...x,discrepancy_entry_ids:Object.freeze(x.discrepancy_entry_ids),
      fact_conflict_entry_ids:Object.freeze(x.fact_conflict_entry_ids),
      unattested_entry_ids:Object.freeze(x.unattested_entry_ids),
    }))),
    intervened:false,history_mutated:false,authority_granted:false,
    resolution_rule:'APPEND_INDEPENDENTLY_VERIFIED_DISCREPANCY_RESOLVED_EVENT_ONLY',
  });
}
