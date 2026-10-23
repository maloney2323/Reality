// Trusted-server, append-only Universe knowledge-gap reconciliation.
// This composes the existing authenticated scope, canonical source readback,
// Ignorance Manifest, Universe persistence, and *independent* ledger readback.
// No route is exposed by this module. Do not let browser/LLM supply the
// principal verifier or the persistence client.
import {createHash} from 'node:crypto';
import {validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
import {persistUniverseEntry,retrievePersistedUniverseEntry}
 from './reality-native-universe-persistence-v1.0.js';
import {assessUniverseCoordinate,createUniverseIgnoranceManifest,
 makeIgnoranceUniverseEntry,verifyUniverseIgnoranceManifest}
 from './reality-universe-ignorance-manifest-v1.0.js';

export const IGNORANCE_DURABLE_RECONCILIATION_VERSION='reality-ignorance-durable-reconciliation-v1.0';
const text=x=>typeof x==='string'&&x.trim().length>0;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const fail=x=>{throw Error(x)};
function requireScope(scope,principalId){
 if(!scope||!text(principalId)||!text(scope.continuity_root_id)||
   !text(scope.worldline_id)||!text(scope.entity_ref)||
   !text(scope.state_key)||!text(scope.as_of)||
   !Number.isFinite(Date.parse(scope.as_of)))
   fail('IGNORANCE_SERVER_SCOPE_REQUIRED');
 if(scope.continuity_root_id.length>256||scope.worldline_id.length>256||
   scope.entity_ref.length>256||scope.state_key.length>256)
   fail('IGNORANCE_SERVER_SCOPE_TOO_LARGE');
}
// Do not trust a client-supplied user ID or self-declared source row. The
// caller must use a trusted server-held verifier tied to current session.
export async function recordVerifiedIgnoranceInUniverse({
 authenticatedPrincipalId,scope,sourceEntryIds=[],
 requiredValue,requiredEvidenceKind=null,
 consequentialActions=[],requiredEvidence,discoveryProbe=null,
 principalScopeVerifier,
 fetchImpl=fetch,
 loadSource=retrievePersistedUniverseEntry,
 append= persistUniverseEntry,
 readBack=retrievePersistedUniverseEntry,
}={}){
 requireScope(scope,authenticatedPrincipalId);
 if(!principalScopeVerifier||typeof principalScopeVerifier.verify!=='function')
   fail('IGNORANCE_TRUSTED_IDENTITY_VERIFIER_REQUIRED');
 if(!Array.isArray(sourceEntryIds)||sourceEntryIds.length>80||
   sourceEntryIds.some(x=>!text(x)||x.length>256)||
   new Set(sourceEntryIds).size!==sourceEntryIds.length)
   fail('IGNORANCE_SOURCE_SELECTORS_INVALID');
 if(typeof loadSource!=='function'||typeof append!=='function'||typeof readBack!=='function')
   fail('IGNORANCE_SERVER_PERSISTENCE_ADAPTERS_REQUIRED');
 const auth=await principalScopeVerifier.verify({
  authenticatedPrincipalId,continuityRootId:scope.continuity_root_id,
  worldlineId:scope.worldline_id,
 });
 if(auth?.verified!==true||auth?.independent!==true||
   auth?.principal_id!==authenticatedPrincipalId||
   auth?.continuity_root_id!==scope.continuity_root_id||
   auth?.worldline_id!==scope.worldline_id||
   auth?.allow_record_ignorance!==true||!text(auth?.verification_ref))
   fail('IGNORANCE_PRINCIPAL_SCOPE_NOT_VERIFIED');
 const originals=[];
 for(const entryId of sourceEntryIds){
  const source=await loadSource({entryId,fetchImpl});
  validateUniverseEntry(source);
  if(source.entry_id!==entryId||source.continuity_root_id!==scope.continuity_root_id||
     source.worldline_id!==scope.worldline_id||
     source.event_kind!=='SOURCE_OBSERVATION')
     fail('IGNORANCE_SOURCE_OUT_OF_SCOPE_OR_NOT_OBSERVATION');
  originals.push(source);
 }
 const assessment=assessUniverseCoordinate({
  scope,ledgerEntries:originals,requiredValue,requiredEvidenceKind});
 // Do not transform rejected or malformed rows into positive evidence. A
 // source admitted as UNKNOWN stays missing until independently read back.
 if(assessment.source_rejected_count>0)
   fail('IGNORANCE_REFERENCED_SOURCE_NOT_ATTESTED');
 const manifest=createUniverseIgnoranceManifest({
  assessment,consequentialActions,requiredEvidence,discoveryProbe});
 verifyUniverseIgnoranceManifest(manifest);
 const entry=makeIgnoranceUniverseEntry({manifest});
 const receipt=await append(entry,{fetchImpl});
 if(!['PERSISTED','DUPLICATE_IDENTICAL','DUPLICATE_IDENTICAL_CONCURRENT']
  .includes(receipt?.status)||!receipt.entry)
   fail('IGNORANCE_APPEND_NOT_CONFIRMED');
 // A POST or idempotent status is not independently sufficient.
 const persisted=await readBack({entryId:entry.entry_id,fetchImpl});
 validateUniverseEntry(persisted);
 if(persisted.entry_id!==entry.entry_id||
  persisted.continuity_root_id!==scope.continuity_root_id||
  persisted.worldline_id!==scope.worldline_id||
  persisted.ledger_entry_hash!==entry.ledger_entry_hash||
  !same(persisted.payload,entry.payload)||
  !same(persisted.evidence_references,entry.evidence_references)||
  !same(receipt.entry,persisted))
  fail('IGNORANCE_DURABLE_READBACK_MISMATCH');
 const result={
  version:IGNORANCE_DURABLE_RECONCILIATION_VERSION,
  status:'VERIFIED_APPEND_READBACK',
  append_status:receipt.status,
  entry_id:persisted.entry_id,ledger_entry_hash:persisted.ledger_entry_hash,
  manifest_id:manifest.manifest_id,manifest_receipt_hash:manifest.manifest_receipt_hash,
  epistemic_state:manifest.epistemic_state,
  principal_scope_verification_ref:auth.verification_ref,
  source_readback_entry_ids:assessment.source_observations.map(s=>s.source_entry_id),
  retrieval_scope:'EXACT_ROOT_WORLDLINE_ENTRY_READBACK',
  observed_at:scope.as_of,
  source_truth_independently_established:false,
  effect_gate_changed:false,external_tool_action_executed:false,
  automatic_capability_upgrade:false,
 };
 return Object.freeze({...result,reconciliation_receipt_hash:sha(result)});
}
