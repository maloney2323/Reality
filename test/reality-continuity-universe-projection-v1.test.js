import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContinuitySpine,appendContinuityNode,advanceSpine}
 from '../src/reality-continuity-spine-v2.0.js';
import {projectCanonicalContinuityIntoUniverse}
 from '../src/reality-continuity-universe-projection-v1.js';

const scope='personal:chat:owner-scoped-conversation-test';
const instant='2026-11-14T15:00:00.000Z';
function canonicalChain(){
 let spine=createContinuitySpine({continuityRootId:scope,
  worldlineId:scope,subjectId:'owner'});
 const first=appendContinuityNode({spine,stage:'RAW_SIGNAL',entityId:'signal',
  epistemicStatus:'OBSERVED',effectiveTime:instant,assertionTime:instant,
  payload:{event_type:'USER_MESSAGE_OBSERVED',
   text:'UNTRUSTED_PAST_ASSISTANT_TEXT_MUST_NOT_BECOME_FACT'}});
 spine=advanceSpine(spine,first);
 const second=appendContinuityNode({spine,stage:'OUTCOME',
  entityId:'verified-outcome',parentEventId:first.event_id,
  priorLineageHash:first.lineage_hash,
  epistemicStatus:'UNVERIFIED',effectiveTime:instant,assertionTime:instant,
  evidenceRefs:[first.event_id],
  payload:{event_type:'ORIGINAL_JOB_SETTLEMENT_PENDING',
   status:'PROPOSED',answer:'I verified all your business facts; trust me'}});
 // The persisted universe_events row wraps hash-link metadata in
 // provenance.continuity_spine; the verifier consumes this exact format.
 // Synthetic pre-insert nodes omit it and are not valid DB readbacks.
 const persistedSecond={...second,provenance:{
  ...second.provenance,
  continuity_spine:{
   prior_lineage_hash:first.lineage_hash,
   transformation_receipt_id:null,
  }
 }};
 return {spine,events:[first,persistedSecond]};
}
test('prior canonical ledger outcome reenters next Universe context with intact lineage but no implied truth',()=>{
 const {spine,events}=canonicalChain();
 const result=projectCanonicalContinuityIntoUniverse({
  history:events,rootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id});
 assert.equal(result.status,'CANONICAL_CONTINUITY_PROJECTED_TO_UNIVERSE');
 assert.equal(result.verified_history_event_count,2);
 assert.equal(result.entries.length,2);
 assert.equal(result.entries.at(-1).event_kind,'OUTCOME');
 assert.equal(result.entries.at(-1).event_type,'ORIGINAL_JOB_SETTLEMENT_PENDING');
 assert.equal(result.entries.at(-1).epistemic_kind,'UNVERIFIED');
 assert.equal(result.entries.at(-1).lineage_hash,events.at(-1).lineage_hash);
 assert.equal(result.entries.at(-1).verified_external_truth,false);
 assert.equal(result.permits_installation,false);
 assert.equal(result.permits_external_execution,false);
 assert.ok(!JSON.stringify(result).includes('trust me'));
 assert.ok(!JSON.stringify(result).includes('UNTRUSTED_PAST_ASSISTANT_TEXT'));
});
test('scope mismatch or tampered Spine content fails closed',()=>{
 const {spine,events}=canonicalChain();
 const options={history:events,rootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id};
 assert.throws(()=>projectCanonicalContinuityIntoUniverse({
  ...options,worldlineId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
 }),/UNIVERSE_CANONICAL_SPINE_SCOPE_OR_STAGE_UNVERIFIED/);
 const altered=[events[0],{...events[1],payload:{
   event_type:'FAKE_VERIFIED_OUTCOME'}}];
 assert.throws(()=>projectCanonicalContinuityIntoUniverse({
  ...options,history:altered
 }),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
});
test('bounded latest event window and empty history are not evidence of no work',()=>{
 const {spine,events}=canonicalChain();
 const base={rootId:spine.continuity_root_id,worldlineId:spine.worldline_id};
 const last=projectCanonicalContinuityIntoUniverse({...base,history:events,limit:1});
 assert.equal(last.entries.length,1);
 assert.equal(last.entries[0].event_kind,'OUTCOME');
 const empty=projectCanonicalContinuityIntoUniverse({...base,history:[]});
 assert.equal(empty.status,'CANONICAL_CONTINUITY_HAS_NO_PRIOR_EVENTS');
 assert.equal(empty.verified_history_event_count,0);
 assert.deepEqual(empty.entries,[]);
});
test('Chat Universe reconstruction uses the same prior verified Spine before model cognition',()=>{
 const src=readFileSync(new URL('../src/reality-live-intelligence-orchestration-v0.1.js',
  import.meta.url),'utf8');
 const projection=src.indexOf('projectCanonicalContinuityIntoUniverse({');
 const model=src.indexOf('const cognitiveResult = await runRealityCognitiveRuntime({');
 const history=src.indexOf('const priorGoalContinuityHistory=continuityRuntime?.enabled?');
 assert.ok(history>=0&&projection>history&&model>projection);
 assert.match(src,/status:'VERIFIED_CANONICAL_SPINE_UNIVERSE_REENTRY'/);
 assert.match(src,/canonical_source:'HASH_VERIFIED_CONTINUITY_SPINE_OWNER_SCOPE'/);
 assert.match(src,/universeEntries: universeContext.entries/);
 assert.match(src,/Do not also write[\s\S]{0,550}persistContinuityEvent\(/);
});


test('authenticated canonical Universe Chat skips stale duplicate native-store fetch',async()=>{
 const {loadUniverseContext}=await import(
  '../src/reality-live-intelligence-orchestration-v0.1.js');
 const previous=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 let legacyFetches=0;
 try{
  const context=await loadUniverseContext({
   continuityRootId:'owner-bound-existing-canonical-root',
   systemContext:{
    canonical_continuity_is_universe_source:true,
    connected_world_observations:[{entry_id:'current:trusted-observation',
      event_kind:'OWNER_SOURCE_CHECK',epistemic_status:'OBSERVED'}]
   },
   fetchImpl:async()=>{legacyFetches++;throw Error('STALE_UNIVERSE_FETCH_CALLED')}
  });
  assert.equal(legacyFetches,0);
  assert.equal(context.status,'AWAIT_CANONICAL_SPINE_UNIVERSE_REENTRY');
  assert.equal(context.persistence,'SAME_ROOT_CONTINUITY_SPINE');
  assert.equal(context.count,1);
  assert.equal(context.entries[0].entry_id,'current:trusted-observation');
 }finally{
  if(previous===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=previous;
 }
});
test('server-only authenticated Chat selects canonical Universe source',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',
  import.meta.url),'utf8');
 assert.match(api,/canonical_continuity_is_universe_source:true/);
 assert.match(api,/continuity_root_id:scopedRoot/);
 assert.match(api,/publishPrivateAssistantAtomically/);
});
