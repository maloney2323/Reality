// READ ONLY: reconcile identities and lineage across Reality's two extant
// Universe schemas. Never copy or mutate an event or pronounce two differently
// hashed event contracts equivalent without independent evidence.
import { createHash } from 'node:crypto';
import { validateUniverseEntry } from './reality-universe-persistence-contract-v1.0.js';
export const UNIVERSE_SOURCE_INVENTORY_VERSION='reality-universe-source-inventory-v0.1';
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const required=(x,code)=>{if(typeof x!=='string'||!x.trim())throw Error(code);return x;};
function assertScope(row,root,worldline){
 if(row?.continuity_root_id!==root || row?.worldline_id!==worldline)
  throw Error('UNIVERSE_INVENTORY_SCOPE_MISMATCH');
}
export function inventoryUniverseSources({
 legacyEvents=[],canonicalEntries=[],
 continuityRootId,worldlineId='reality:primary',
 legacyScanComplete=false,canonicalScanComplete=false,
}={}){
 const root=required(continuityRootId,'UNIVERSE_INVENTORY_ROOT_REQUIRED');
 const world=required(worldlineId,'UNIVERSE_INVENTORY_WORLDLINE_REQUIRED');
 if(!Array.isArray(legacyEvents)||!Array.isArray(canonicalEntries))
  throw Error('UNIVERSE_INVENTORY_INPUT_INVALID');
 const manifest=[],seen=new Set(),oldIds=new Set();
 for(const event of legacyEvents){
  assertScope(event,root,world);
  const id=required(event?.event_id,'LEGACY_EVENT_ID_REQUIRED');
  if(seen.has('legacy:'+id))throw Error('UNIVERSE_INVENTORY_DUPLICATE_LEGACY_ID');
  seen.add('legacy:'+id);oldIds.add(id);
  const contentIntegrity=event.content_hash===digest(event.payload);
  const lineageIntegrity=event.lineage_hash===digest({
   parent_event_id:event.parent_event_id||null,
   continuity_root_id:root,worldline_id:world,
  });
  manifest.push({
   source:'universe_events',source_id:id,
   source_identity:'universe_events:'+id,
   event_kind:event.event_kind,assertion_time:event.assertion_time,
   effective_time:event.effective_time,
   source_hash:event.content_hash||null,
   original_lineage_hash:event.lineage_hash||null,
   hash_compatibility:contentIntegrity&&lineageIntegrity
    ?'LEGACY_HASH_CONTRACT_MATCH'
    :'LEGACY_HASH_CONTRACT_NOT_PROVEN',
   parent_source_identity:event.parent_event_id
    ?'universe_events:'+event.parent_event_id:null,
   // Legacy hash contract matching is integrity, NOT source truth.
   independently_verified_fact:false,
  });
 }
 for(const entry of canonicalEntries){
  assertScope(entry,root,world);
  validateUniverseEntry(entry);
  const id=required(entry.entry_id,'UNIVERSE_ENTRY_ID_REQUIRED');
  if(seen.has('canonical:'+id))throw Error('UNIVERSE_INVENTORY_DUPLICATE_CANONICAL_ID');
  seen.add('canonical:'+id);
  manifest.push({
   source:'reality_universe_entries',source_id:id,
   source_identity:'reality_universe_entries:'+id,
   event_kind:entry.event_kind,assertion_time:entry.assertion_time,
   effective_time:entry.effective_time,
   source_hash:entry.ledger_entry_hash,
   hash_compatibility:'CANONICAL_HASH_VERIFIED',
   independently_verified_fact:false,
   parent_source_identity:null,
  });
 }
 manifest.sort((a,b)=>String(a.assertion_time).localeCompare(String(b.assertion_time))||
   a.source_identity.localeCompare(b.source_identity));
 const incompleteLinks=manifest.filter(x=>
  x.source==='universe_events' && x.parent_source_identity &&
  !oldIds.has(x.parent_source_identity.slice('universe_events:'.length))
 ).map(x=>({source_identity:x.source_identity,
  unresolved_parent_source_identity:x.parent_source_identity}));
 return Object.freeze({
  version:UNIVERSE_SOURCE_INVENTORY_VERSION,
  status:'SOURCE_INVENTORY_ONLY_NOT_CANONICAL_MERGE',
  continuity_root_id:root,worldline_id:world,
  counts:{legacy:legacyEvents.length,canonical:canonicalEntries.length,
   manifest:manifest.length},
  fully_scanned_claimed:legacyScanComplete===true&&canonicalScanComplete===true,
  historical_integrity_issues:manifest
    .filter(x=>x.hash_compatibility==='LEGACY_HASH_CONTRACT_NOT_PROVEN')
    .map(x=>x.source_identity),
  unresolved_parent_links:incompleteLinks,
  entries:Object.freeze(manifest),
  history_mutated:false,
  semantic_truth_established:false,
  canonical_merge_authorized:false,
 });
}
