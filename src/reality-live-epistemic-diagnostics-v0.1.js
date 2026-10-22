// Observation-only use of the existing native epistemic-difference detector.
import { inspectEpistemicDifferences } from './reality-epistemic-difference-detector-v0.1.js';
import { verifyObservationEnvelope, TRUSTED_OBSERVATION_ADMISSION_VERSION } from './reality-trusted-observation-admission-v0.1.js';
export function inspectPersistedEpistemicDifferences({entries=[],continuityRootId=null,worldlineId='reality:primary'}={}){
 if(!Array.isArray(entries))throw Error('LIVE_EPISTEMIC_ENTRIES_INVALID');
 const observations=[],seen=new Set();let ignored=0;
 for(const entry of entries){
  if(entry?.event_kind!=='SOURCE_OBSERVATION')continue;
  const observation=entry?.payload?.observation;
  if(!continuityRootId||entry.continuity_root_id!==continuityRootId||
    entry.worldline_id!==worldlineId||
    entry.provenance?.source!==TRUSTED_OBSERVATION_ADMISSION_VERSION||
    entry.payload?.source_attestation?.independently_source_read!==true||
    entry.payload?.source_attestation?.observation_hash!==observation?.observation_hash){
      ignored++;continue;
  }
  try{verifyObservationEnvelope(observation,{continuityRootId});}
  catch{ignored++;continue;}
  if(!seen.has(observation.observation_id)){
    observations.push(observation);seen.add(observation.observation_id);
  }
 }
 const x=inspectEpistemicDifferences({observations});
 return Object.freeze({
  mode:'OBSERVATION_ONLY',
  source:'ROOT_SCOPED_DURABLY_ATTESTED_SOURCE_OBSERVATIONS',
  source_observation_count:observations.length,
  ignored_untrusted_or_out_of_scope:ignored,
  typed_claims_examined:x.typed_claims_examined,
  discrepancies:x.epistemic_discrepancies,
  contradictions:x.contradictions,
  intervention_count:0,authority_mutations:0,
  semantic_truth_established:false,complete_universe_coverage:false,
  coverage:'RETRIEVED_WORKING_WINDOW_ONLY',
 });
}
