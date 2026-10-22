// Trusted World Observation -> existing Universe continuity ledger.
//
// This is a SERVER-ONLY adapter boundary. Caller input is not proof of a
// source record. A separate trusted connector/source verifier must read back
// that record before Reality stores it as an observed signal. Observation
// provenance is NOT independent real-world truth.
import { createHash } from 'node:crypto';
import { createObservation } from './reality-world-observation-fabric-v0.1.js';
import { createUniverseEntry,validateUniverseEntry } from './reality-universe-persistence-contract-v1.0.js';
import { persistUniverseEntry,retrievePersistedUniverseEntry } from './reality-native-universe-persistence-v1.0.js';

export const TRUSTED_OBSERVATION_ADMISSION_VERSION='reality-trusted-observation-admission-v0.1';
const text=x=>typeof x==='string'?x.trim():'';
const canonical=x=>Array.isArray(x)?x.map(canonical):
  x && typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');

export function verifyObservationEnvelope(observation,{continuityRootId}={}){
  if(!observation?.observation_id || !text(continuityRootId))
    throw Error('TRUSTED_OBSERVATION_IDENTITY_REQUIRED');
  if(observation.provenance?.continuity_root_id!==continuityRootId)
    throw Error('TRUSTED_OBSERVATION_ROOT_MISMATCH');
  if(observation.access_scope!=='READ') throw Error('TRUSTED_OBSERVATION_READ_SCOPE_REQUIRED');
  const rebuilt=createObservation({
    observationVersion:observation.observation_version,
    source:observation.source,domain:observation.domain,
    sourceRecordId:observation.source_record_id,
    observedAt:observation.observed_at,eventTime:observation.event_time,
    actorRefs:observation.actor_refs,objectRefs:observation.object_refs,
    eventType:observation.event_type,contentOrMetadata:observation.content_or_metadata,
    provenance:observation.provenance,freshness:observation.freshness,
    accessScope:observation.access_scope,reliability:observation.reliability,
    epistemicStatus:observation.epistemic_status,
  });
  if(!same(rebuilt,observation))throw Error('TRUSTED_OBSERVATION_ENVELOPE_INTEGRITY_FAILED');
  return Object.freeze({observation_id:observation.observation_id,
    observation_hash:observation.observation_hash,valid:true});
}

/**
 * sourceVerifier is a server-held, connector-specific verifier: it must
 * independently read a known source record and return an attestation bound
 * to the authenticated principal, root, worldline and observation hash.
 * Never expose this operation as a browser-supplied verifier.
 */
export async function admitTrustedObservation({
  observation,continuityRootId,worldlineId='reality:primary',
  authenticatedPrincipalId,sourceVerifier,fetchImpl=fetch,
}={}){
  if(!text(authenticatedPrincipalId)||!text(continuityRootId)||!text(worldlineId))
    throw Error('TRUSTED_SOURCE_SCOPE_REQUIRED');
  verifyObservationEnvelope(observation,{continuityRootId});
  if(!sourceVerifier||typeof sourceVerifier.verify!=='function')
    throw Error('TRUSTED_SOURCE_VERIFIER_REQUIRED');
  const verified=await sourceVerifier.verify({
    observation,authenticatedPrincipalId,continuityRootId,worldlineId,
  });
  if(verified?.verified!==true||verified?.independent!==true||
     verified?.principal_id!==authenticatedPrincipalId||
     verified?.continuity_root_id!==continuityRootId||
     verified?.worldline_id!==worldlineId||
     verified?.observation_id!==observation.observation_id||
     verified?.observation_hash!==observation.observation_hash||
     verified?.source_record_id!==observation.source_record_id||
     verified?.source!==observation.source||
     !text(verified?.verification_ref))
    throw Error('TRUSTED_SOURCE_READBACK_NOT_ESTABLISHED');

  const id='observation:stored:'+digest({
    continuityRootId,worldlineId,observationId:observation.observation_id,
  }).slice(0,40);
  const entry=createUniverseEntry({
    entry_id:id,continuity_root_id:continuityRootId,worldline_id:worldlineId,
    event_kind:'SOURCE_OBSERVATION',epistemic_kind:'OBSERVATION',
    assertion_time:observation.observed_at,effective_time:observation.event_time,
    source_ref:observation.source,
    payload:{
      observation,
      source_attestation:{
        verification_ref:verified.verification_ref,
        observation_hash:verified.observation_hash,
        independently_source_read:true,
        truth_established:false,
      },
      state_authority:'NONE',
    },
    evidence_references:[verified.verification_ref],
    provenance:{source:TRUSTED_OBSERVATION_ADMISSION_VERSION,
      observation_id:observation.observation_id,
      authenticated_principal_id:authenticatedPrincipalId},
  });
  validateUniverseEntry(entry);
  await persistUniverseEntry(entry,{fetchImpl});
  const readBack=await retrievePersistedUniverseEntry({entryId:id,fetchImpl});
  if(readBack.ledger_entry_hash!==entry.ledger_entry_hash||
      readBack.continuity_root_id!==continuityRootId||
      readBack.worldline_id!==worldlineId||
      !same(readBack.payload,entry.payload)||
      !same(readBack.evidence_references,entry.evidence_references))
    throw Error('TRUSTED_OBSERVATION_DURABLE_READBACK_MISMATCH');
  return Object.freeze({
    status:'ADMITTED_VERIFIED_SOURCE_READBACK',
    scope:'OBSERVATION_NOT_REAL_WORLD_TRUTH',
    continuity_root_id:continuityRootId,worldline_id:worldlineId,
    observation_id:observation.observation_id,
    entry_id:readBack.entry_id,
    ledger_entry_hash:readBack.ledger_entry_hash,
    evidence_binding:Object.freeze({[observation.observation_id]:readBack.entry_id}),
    authority_granted:false,
  });
}
