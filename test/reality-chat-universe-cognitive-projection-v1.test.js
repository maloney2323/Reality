import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOwnerRealityUniverseForChat}
 from '../src/reality-chat-universe-cognitive-projection-v1.js';
import {needsRealityCapabilityInspection}
 from '../src/reality-chat-self-visibility-v1.js';

const ownerRoot='a61c7791-9d0d-4969-881b-05af149e37ae';
const world='personal:chat:'+'f'.repeat(64);
const base={rootId:ownerRoot,worldlineId:ownerRoot,worldId:world};
const sourceSha='a'.repeat(40),workId='work:'+'c'.repeat(32);
const visibility={
 entry_id:'reality:source-self-visibility:'+sourceSha,
 event_kind:'reality_pinned_provider_source_capability_inventory',
 source_kind:'GITHUB_PINNED_DEPLOYMENT_SOURCE_TREE_READBACK',
 source_ref:'https://github.com/maloney2323/Reality/tree/'+sourceSha,
 summary:'Exact deployed source contains the existing Universe, drift and ROI systems.',
 relevant_existing_source_paths:[
  'src/reality-universe-cognition-v0.1.js',
  'src/reality-conversation-drift-integrity-v0.1.js',
  'src/reality-operational-roi-v2.js'
 ],
 epistemic_status:'SOURCE_PATHS_VERIFIED_RUNTIME_EFFECTS_NOT_INFERRED',
 installation_authorized:false,production_changed:false,
 execution_authorized:false
};
const selfAudit={
 entry_id:'reality:verified-self-audit:2026-11-15',
 event_kind:'reality_owner_scoped_existing_capability_audit',
 source_kind:'AUTHENTICATED_OWNER_SHIFT_AND_CAPABILITY_LEDGER',
 source_ref:'reality:self-audit:owner-readback',
 summary:'Genuine Capability Engine implemented; end-to-end proof unavailable.',
 capabilities:[{
  id:'central_genuine_capability_engine',
  evidence_ref:'src/reality-genuine-capability-engine-v1.js',
  proof_level:'SOURCE_IMPLEMENTED_END_TO_END_REPAIR_NOT_PROVEN',
  can_claim_live:false
 }],
 epistemic_status:'OWNER_SCOPED_CURRENT_CAPABILITY_EVIDENCE',
 installation_authorized:false,production_changed:false,
 execution_authorized:false
};

test('underlying LLM Universe awareness is an owner source-inspection request',()=>{
 for(const q of [
  'The Universe should carry all this stuff and be available to underlying LLMs',
  'Can Reality use its Universe to see its capabilities?',
  'Why is the Universe not connected to the Chat context?'
 ])assert.equal(needsRealityCapabilityInspection(q),true,q);
});
test('existing Universe cognition classifies source-present abilities without inventing execution',()=>{
 const result=projectOwnerRealityUniverseForChat({
  ...base,continuityHistory:[],currentObservations:[visibility,selfAudit]
 });
 assert.equal(result.status,'EXISTING_UNIVERSE_PROJECTION_FOR_OWNER_CHAT');
 assert.equal(result.durable_continuity.verified_history_event_count,0);
 assert.equal(result.cognition_context.world_id,world);
 assert.equal(result.new_ledger_created,false);
 assert.equal(result.authority_granted,false);
 const summary=result.observations[0];
 assert.equal(summary.event_kind,'reality_owner_universe_cognitive_projection');
 assert.equal(summary.universe_state_id,result.state_id);
 assert(summary.existing_capabilities.some(c=>c.id==='central_genuine_capability_engine'&&
  c.can_claim_live===false));
 assert(summary.existing_capabilities.some(c=>
  c.id==='src/reality-operational-roi-v2.js'&&
  c.status==='SOURCE_PRESENT_RUNTIME_UNVERIFIED'));
 assert.equal(summary.execution_authorized,false);
 assert.equal(summary.installation_authorized,false);
 assert.equal(summary.production_changed,false);
});
test('owner original settlement reconciliation is available to the Universe without altering source ledgers',()=>{
 const raw={status:'READ_ONLY_OWNER_CROSS_LEDGER_RECONCILIATION',
  jobs:[{original_work_id:workId,phase:'SOURCE_ADMITTED',
   independently_settled:true,source_admission_phase:'SOURCE_ADMITTED'}],
  source_projection_disagreements:[{
   original_work_id:workId,source_admission_phase:'SOURCE_ADMITTED',
   verified_final_receipt_ref:'supabase:original-final:681ce4ab-4dd0-47cf-963b-dc65087468fc'
  }]};
 const result=projectOwnerRealityUniverseForChat({
  ...base,currentObservations:[visibility],reconciledOriginals:raw
 });
 assert.equal(result.observations[0].source_projection_disagreements.length,1);
 assert.equal(result.observations[0].summary.includes('unsettled original jobs 0'),true);
 assert.equal(raw.jobs[0].phase,'SOURCE_ADMITTED');
});
test('full operational pipeline keeps its existing durable history retrieval rather than inventing an empty ledger',()=>{
 const result=projectOwnerRealityUniverseForChat({
  ...base,currentObservations:[visibility],continuityHistory:null
 });
 assert.equal(result.durable_continuity.verified_history_event_count,null);
 assert.match(result.observations[0].summary,/OWNED_BY_FULL_UNIVERSE_RUNTIME/);
 assert.equal(result.new_ledger_created,false);
});
test('invalid cross-owner root or unverified history cannot be passed to the underlying model',()=>{
 for(const invalid of [
  {...base,rootId:'another-user'},
  {...base,worldlineId:'foreign'},
  {...base,worldId:'other:world'},
  {...base,continuityHistory:[{event_id:'forged'}]}
 ]){
  assert.throws(()=>projectOwnerRealityUniverseForChat({
   ...invalid,currentObservations:[visibility]
  }),/REALITY_CHAT_UNIVERSE_|UNIVERSE_CANONICAL_SPINE_/);
 }
});
test('the Chat passes the SAME Universe projection into both existing model lanes',()=>{
 const get=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const api=get('api/reality/personal-chat.js');
 const projector=get('src/reality-chat-universe-cognitive-projection-v1.js');
 assert.match(api,/const makeOwnerUniverseReadModel=/);
 assert.equal((api.match(/const makeOwnerUniverseReadModel=/g)||[]).length,1);
 assert.match(api,/makeOwnerUniverseReadModel\(\{observations\}\)/);
 assert.match(api,/makeOwnerUniverseReadModel\(\{\s*observations:ownerCurrentUniverseObservations,reconciledOriginals\s*\}\)/);
 assert.match(api,/projectOwnerRealityUniverseForChat\(\{[\s\S]*?currentObservations:observations,reconciledOriginals/);
 assert.match(api,/verifiedUniverseObservations:ownerUniverse\.observations/);
 assert.match(api,/connected_world_observations:ownerUniverse\.observations/);
 assert.match(projector,/createUniverseSnapshot/);
 assert.match(projector,/materializeCognitiveState/);
 assert.match(projector,/deriveCognitiveConsequences/);
 assert.match(projector,/projectCanonicalContinuityIntoUniverse/);
 assert.match(projector,/mergeCurrentAndDurableUniverseForCognition/);
 assert.doesNotMatch(projector,/appendEvent|persistUniverseEntry|grantAuthorization|installCapability/);
});
