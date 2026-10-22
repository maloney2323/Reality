import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {inventoryUniverseSources} from '../src/reality-universe-source-inventory-v0.1.js';
const t='2026-10-22T10:00:00Z',root='root:a',world='reality:primary';
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
function legacy(id,{parent=null,r=root}={}){
 const payload={ordinal:id};
 return {event_id:id,event_kind:'RAW_SIGNAL',continuity_root_id:r,worldline_id:world,
  parent_event_id:parent,assertion_time:t,effective_time:t,payload,
  content_hash:digest(payload),
  lineage_hash:digest({parent_event_id:parent,continuity_root_id:r,worldline_id:world}),
 };
}
function canonical(id,r=root){return createUniverseEntry({
 entry_id:id,continuity_root_id:r,worldline_id:world,event_kind:'CONTINUITY_STATE_TRANSITION',
 epistemic_kind:'OBSERVATION',assertion_time:t,effective_time:t,
 source_ref:'test',payload:{state:'WAITING'},evidence_references:[],provenance:{source:'fixture'}
});}
test('separately namespaced schemas preserve every identity and parent link',()=>{
 const x=inventoryUniverseSources({continuityRootId:root,legacyEvents:[legacy('same'),legacy('child',{parent:'same'})],
 canonicalEntries:[canonical('same')]});
 assert.equal(x.counts.manifest,3);
 assert.equal(new Set(x.entries.map(e=>e.source_identity)).size,3);
 assert.equal(x.unresolved_parent_links.length,0);
 assert.equal(x.entries.find(e=>e.source_identity==='universe_events:child').parent_source_identity,
 'universe_events:same');
 assert.equal(x.history_mutated,false);
 assert.equal(x.canonical_merge_authorized,false);
 assert.equal(x.fully_scanned_claimed,false);
});
test('missing legacy parent remains visible as a gap, not silently reinterpreted',()=>{
 const x=inventoryUniverseSources({continuityRootId:root,
  legacyEvents:[legacy('child',{parent:'missing'})]});
 assert.equal(x.unresolved_parent_links.length,1);
 assert.equal(x.status,'SOURCE_INVENTORY_ONLY_NOT_CANONICAL_MERGE');
});
test('hash scheme mismatch is retained as unresolved, never called verified',()=>{
 const corrupted={...legacy('a'),content_hash:'wrong'};
 const x=inventoryUniverseSources({continuityRootId:root,legacyEvents:[corrupted]});
 assert.deepEqual(x.historical_integrity_issues,['universe_events:a']);
 assert.equal(x.entries[0].hash_compatibility,'LEGACY_HASH_CONTRACT_NOT_PROVEN');
});
test('cross-world/tenant mixing and tampered canonical records fail',()=>{
 assert.throws(()=>inventoryUniverseSources({continuityRootId:root,
  legacyEvents:[legacy('foreign',{r:'root:b'})]}),/UNIVERSE_INVENTORY_SCOPE_MISMATCH/);
 const entry=canonical('id');
 assert.throws(()=>inventoryUniverseSources({continuityRootId:root,
  canonicalEntries:[{...entry,payload:{tampered:true}}]}),/UNIVERSE_LEDGER_HASH_MISMATCH/);
});
test('empty inventories do not claim the entire Universe has been reconciled',()=>{
 const result=inventoryUniverseSources({continuityRootId:root});
 assert.equal(result.counts.manifest,0);
 assert.equal(result.fully_scanned_claimed,false);
});
