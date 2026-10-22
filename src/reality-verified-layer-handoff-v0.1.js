// Evidence-preserving transport between Reality's signal cleaner, ledger,
// verifier and the next cognition layer. Integrity is NOT factual truth.
import { createHash } from 'node:crypto';
import { createRawSignalPacket, cleanFragmentedSignal } from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import { createUniverseEntry, validateUniverseEntry } from './reality-universe-persistence-contract-v1.0.js';
import { persistUniverseEntry, retrievePersistedUniverseEntry } from './reality-native-universe-persistence-v1.0.js';

export const VERIFIED_LAYER_HANDOFF_VERSION = 'reality-verified-layer-handoff-v0.1';

function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
function requiredString(value,code) {
  if(typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value;
}

export function verifySignalCleanerRecord(signal) {
  const packet = signal?.packet;
  if(!packet?.raw_content || !packet?.source || !packet?.observed_at)
    throw new Error('SIGNAL_SOURCE_PACKET_MISSING');
  // Reconstruct from the original raw bytes. Never use the cleaned text
  // itself as evidence that the source survived intact.
  const rebuiltPacket = createRawSignalPacket({
    message:packet.raw_content,source:packet.source,observedAt:packet.observed_at
  });
  if(!same(packet,rebuiltPacket)) throw new Error('SIGNAL_RAW_PACKET_INTEGRITY_FAILED');
  const rebuilt = cleanFragmentedSignal({packet:rebuiltPacket,cleanerVersion:signal.cleaner_version});
  if(!same(signal.fragments,rebuilt.fragments) ||
      !same(signal.lineage,rebuilt.lineage))
    throw new Error('SIGNAL_FRAGMENT_LINEAGE_INTEGRITY_FAILED');
  const receipt=signal.transformation_receipt, expected=rebuilt.transformation_receipt;
  if(!receipt || receipt.receipt_id!==expected.receipt_id ||
      receipt.input_digest!==expected.input_digest ||
      receipt.output_digest!==expected.output_digest ||
      receipt.fragment_count!==expected.fragment_count ||
      !same(receipt.transformations,expected.transformations))
    throw new Error('SIGNAL_TRANSFORMATION_RECEIPT_INTEGRITY_FAILED');
  return Object.freeze({
    verification_scope:'STRUCTURAL_SIGNAL_CLEANER_INTEGRITY_ONLY',
    status:'VERIFIED',
    packet_id:packet.packet_id,
    transformation_receipt_id:receipt.receipt_id,
    input_digest:receipt.input_digest,
    output_digest:receipt.output_digest,
    fragment_count:signal.fragments.length,
    semantic_truth_evaluated:false,
    contradictions_evaluated:false,
  });
}

export async function recordVerifiedLayerHandoff({
  stage,continuityRootId,observedAt,sourceRef,output,evidenceReferences=[],
  parent=null,fetchImpl=fetch,
}={}) {
  requiredString(stage,'HANDOFF_STAGE_REQUIRED');
  requiredString(continuityRootId,'HANDOFF_CONTINUITY_ROOT_REQUIRED');
  requiredString(observedAt,'HANDOFF_OBSERVED_TIME_REQUIRED');
  requiredString(sourceRef,'HANDOFF_SOURCE_REQUIRED');
  if(parent && parent.continuity_root_id !== continuityRootId)
    throw new Error('HANDOFF_PARENT_ROOT_MISMATCH');
  if(stage==='SIGNAL_CLEANER') {
    const verified=verifySignalCleanerRecord(output?.signal);
    if(!same(verified,output?.verification))
      throw new Error('SIGNAL_CLEANER_VERIFICATION_RECORD_MISMATCH');
  }
  const eventIdentity=createHash('sha256').update(JSON.stringify({
    stage,continuityRootId,observedAt,sourceRef,output,
    parent_entry_id:parent?.entry_id||null,
    parent_ledger_hash:parent?.ledger_entry_hash||null,
  })).digest('hex').slice(0,32);
  const event= createUniverseEntry({
    entry_id:'layer:'+stage+':'+eventIdentity,
    continuity_root_id:continuityRootId,
    worldline_id:'reality:primary',
    event_kind:'REALITY_LAYER_HANDOFF',
    epistemic_kind:'OBSERVATION',
    assertion_time:observedAt,effective_time:observedAt,
    source_ref:sourceRef,
    payload:{
      layer_stage:stage,
      data:output,
      parent_entry_id:parent?.entry_id || null,
      parent_ledger_hash:parent?.ledger_entry_hash || null,
      diagnostic_state:{
        contradictions:'NOT_SEMANTICALLY_EVALUATED_BY_THIS_TRANSPORT',
        errors:'ONLY_OBSERVED_ERRORS_RECORDED',
      },
      truth_verification:'NOT_CLAIMED_BY_TRANSPORT',
    },
    evidence_references:evidenceReferences.filter(Boolean),
    provenance:{source:'reality:verified-layer-handoff',version:VERIFIED_LAYER_HANDOFF_VERSION},
  });
  validateUniverseEntry(event);
  await persistUniverseEntry(event,{fetchImpl});
  const readBack=await retrievePersistedUniverseEntry({entryId:event.entry_id,fetchImpl});
  if(stage==='SIGNAL_CLEANER') {
    const storedCleaner=verifySignalCleanerRecord(readBack?.payload?.data?.signal);
    if(!same(storedCleaner,readBack?.payload?.data?.verification))
      throw new Error('SIGNAL_CLEANER_READBACK_VERIFICATION_MISMATCH');
  }
  if(!readBack || readBack.ledger_entry_hash!==event.ledger_entry_hash ||
      readBack.continuity_root_id!==continuityRootId ||
      !same(readBack.payload,event.payload) ||
      !same(readBack.evidence_references,event.evidence_references))
    throw new Error('HANDOFF_DURABLE_READBACK_MISMATCH');
  return Object.freeze({
    status:'STORED_AND_READ_BACK',
    verification_scope:'DURABLE_INTEGRITY_AND_PARENT_REFERENCE',
    semantic_truth_evaluated:false,
    entry_id:event.entry_id,
    ledger_entry_hash:event.ledger_entry_hash,
    continuity_root_id:continuityRootId,
    parent_entry_id:parent?.entry_id || null,
    parent_ledger_hash:parent?.ledger_entry_hash || null,
    entry:Object.freeze(readBack),
  });
}
