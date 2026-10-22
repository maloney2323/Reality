import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCognitionContextEntries} from '../src/reality-cognition-context-selection-v0.1.js';
import {buildCognitionContext} from '../src/reality-cognitive-runtime-v1.0.js';
import {buildNativeUniverseContext} from '../src/reality-native-universe-v1.0.js';
const make=(i)=>({entry_id:'signal:'+i,event_kind:'REALITY_LAYER_HANDOFF',
 payload:{layer_stage:'SIGNAL_CLEANER',ordinal:i}});
const older=(state='WAITING')=>({entry_id:'old:work:1',continuity_root_id:'root:alice',
 event_kind:'CONTINUITY_STATE_TRANSITION',
 payload:{continuity_state:state,work_item_id:'invoice:17'}});
const conflict={entry_id:'discrepancy:invoice:17',event_kind:'DISCREPANCY_DETECTED',
 payload:{scope:{entity_ref:'invoice:17',target_state_key:'invoice.amount'},
 reconciliation_status:'UNRESOLVED'}};
test('priority preserves old WAITING and CONTESTED evidence after 140 recent signals',()=>{
 const signals=Array.from({length:140},(_,i)=>make(i)),all=[...signals,older(),conflict];
 const result=selectCognitionContextEntries({entries:all});
 assert.equal(result.entries.length,100);
 assert.ok(result.entries.some(x=>x.entry_id==='old:work:1'));
 assert.ok(result.entries.some(x=>x.entry_id===conflict.entry_id));
 assert.equal(result.omitted_count,42);
 assert.equal(result.critical_omitted_count,0);
 assert.equal(result.selection_status,'BOUNDED_WORKING_VIEW');
 assert.equal(result.complete_universe_history_proven,false);
});
test('latest continuity transition is pinned even when its state is ACTIVE',()=>{
 const state=older('ACTIVE'),s=Array.from({length:130},(_,i)=>make(i));
 const view=selectCognitionContextEntries({entries:[...s,state],
 latestTransitionRef:'old:work:1'});
 assert.ok(view.entries.some(x=>x.entry_id==='old:work:1'));
});
test('client-supplied Universe arrays are not copied wholesale to model input',()=>{
 const supplied=Array.from({length:175},(_,i)=>make(i));
 const native=buildNativeUniverseContext({systemContext:{universe_entries:supplied}});
 assert.equal(native.entries.length,175);
 const ctx=buildCognitionContext({universe_entries:supplied,authenticated_user_id:'verified:alice'},native.entries);
 assert.equal(ctx.universe_context_count,100);
 assert.equal(ctx.universe_context_supplied_count,175);
 assert.equal(ctx.universe_context_omitted_count,75);
 assert.equal(ctx.authenticated_user_id,'verified:alice');
 assert.equal(Object.hasOwn(ctx,'universe_entries'),false);
 assert.equal(Object.hasOwn(ctx,'connected_world_observations'),false);
});
test('request context survives when durable history already has 100 signals',()=>{
 const durable=Array.from({length:100},(_,i)=>make(i));
 const profile={entry_id:'profile:alice',epistemic_kind:'CONTEXT',
 provenance:{source:'authenticated_profile_context'},content:'owner goal: customer followup'};
 const selected=selectCognitionContextEntries({entries:durable,requestEntries:[profile]});
 assert.ok(selected.entries.some(x=>x.entry_id===profile.entry_id));
 assert.equal(selected.omitted_count,1);
});
test('conflicting records with identical durable IDs are not silently merged',()=>{
 assert.throws(()=>selectCognitionContextEntries({
 entries:[{entry_id:'same',payload:{value:1}},{entry_id:'same',payload:{value:2}}],
 }),/COGNITION_CONTEXT_CONFLICTING_ENTRY_ID/);
});
test('no history: no invented memory and no omitted claims',()=>{
 const view=selectCognitionContextEntries({entries:[],requestEntries:[]});
 assert.equal(view.selection_status,'COMPLETE_SUPPLIED_VIEW');
 assert.equal(view.entries.length,0);
 assert.equal(view.omitted_count,0);
});
test('overfull critical obligations disclose overflow instead of pretending full recall',()=>{
 const critical=Array.from({length:105},(_,i)=>({entry_id:'state:'+i,
 event_kind:'CONTINUITY_STATE_TRANSITION',payload:{continuity_state:'WAITING'}}));
 const view=selectCognitionContextEntries({entries:critical,maxEntries:100});
 assert.equal(view.selection_status,'CRITICAL_REFERENCES_EXCEED_CONTEXT_WINDOW');
 assert.equal(view.critical_omitted_count,5);
 assert.equal(view.no_history_deleted,true);
});
test('errors and recovery gaps stay salient without suppressing conversation',()=>{
 const items=[...Array.from({length:110},(_,i)=>make(i)),
 {entry_id:'err1',event_kind:'REALITY_LAYER_HANDOFF',payload:{layer_stage:'COGNITION_ERROR'}},
 {entry_id:'gap1',event_kind:'CONTINUITY_RECOVERY_GAP',payload:{failure:{reason:'NETWORK'}}}];
 const view=selectCognitionContextEntries({entries:items});
 assert.ok(view.entries.some(x=>x.entry_id==='err1'));
 assert.ok(view.entries.some(x=>x.entry_id==='gap1'));
 assert.equal(view.selected_count,100);
});
