import test from 'node:test';
import assert from 'node:assert/strict';
import { bindWorkToAuthenticatedGoal, compareFreshAuthenticatedGoalForWork }
 from '../src/reality-execution-goal-grounding-v0.1.js';

const user='00000000-0000-4000-8000-000000000123';
const userMessage='supabase:reality_chat_messages:00000000-0000-4000-8000-000000000456';
const workItem={
  work_item_id:'work:item-1',workflow_id:'workflow:one',
  connector:'github',operation:'create_issue',
  resource:'owner/repo',inputs:{repository:'owner/repo',title:'User-approved task'},
  action:'Create work issue',consequential:true,
};
const sourceState=()=>({
  authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
  principal_id:user,continuity_root_id:'personal:chat:test-root',
  world_id:'personal:chat:test-root',
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  external_execution_authorized:false,
  transition_count:1,
  active_goal_id:'user-goal:one',
  active_goal:{
    goal_id:'user-goal:one',status:'ACTIVE',user_confirmed:true,
    source_user_message_ref:userMessage,last_transition_receipt_id:'receipt:1',
    external_execution_authorized:false,
  },
  recent_transition_receipts:[{
    event_id:'receipt:1',confirmed_by_user:true,principal_id:user,
  }],
});
function bound(state=sourceState()){
 return bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:state,serverVerifiedPrincipalId:user,
 });
}
function fresh(opts={}){
 return compareFreshAuthenticatedGoalForWork({
  workItem,binding:bound(),latestAuthoritativeState:sourceState(),
  serverVerifiedPrincipalId:user,approvedActionPrincipalId:user,...opts,
 });
}
test('authenticated active goal binds exact work and matches unchanged fresh ledger revision',()=>{
 const b=bound();assert.equal(b.status,'BOUND_FOR_FRESHNESS_CHECK');
 const r=fresh();assert.equal(r.status,'FRESH_GOAL_BINDING_MATCHED');
 assert.equal(r.grants_external_execution,false);
 assert.equal(r.semantic_alignment_independently_verified,false);
});
test('no verified goal cannot create an action binding',()=>{
 const s=sourceState();s.active_goal=null;s.active_goal_id=null;
 assert.equal(bound(s).reason,'GOAL_GROUNDING_AUTHENTICATED_SOURCE_REQUIRED');
});
test('model/assistant cannot masquerade as authenticated goal',()=>{
 const s=sourceState();s.authority_source='ASSISTANT_PROPOSAL';
 assert.equal(bound(s).status,'BLOCKED');
});
test('different Supabase user and different action policy principal are refused',()=>{
 assert.equal(fresh({approvedActionPrincipalId:'generic-cookie-user'}).reason,
  'GOAL_GROUNDING_PRINCIPAL_MISMATCH');
 assert.equal(fresh({serverVerifiedPrincipalId:'another-user'}).status,'BLOCKED');
});
test('changed work target invalidates goal work binding',()=>{
 const changed={...workItem,inputs:{repository:'attacker/repo',title:'User-approved task'}};
 assert.equal(fresh({workItem:changed}).reason,'GOAL_GROUNDING_WORK_ITEM_CHANGED');
});
test('a later user pivot cannot borrow the former goal authority',()=>{
 const s=sourceState();
 s.active_goal_id='user-goal:two';
 s.active_goal={...s.active_goal,goal_id:'user-goal:two',source_user_message_ref:'supabase:new',
    last_transition_receipt_id:'receipt:2'};
 s.transition_count=2;
 s.recent_transition_receipts=[{event_id:'receipt:2',confirmed_by_user:true,principal_id:user}];
 assert.equal(fresh({latestAuthoritativeState:s}).reason,
  'GOAL_GROUNDING_CONTROLLING_OBJECTIVE_CHANGED');
});
test('pause and user-reported completion block stale execution',()=>{
 for(const status of ['PAUSED','USER_REPORTED_COMPLETE_UNVERIFIED','ABANDONED','DORMANT']){
  const s=sourceState();
  s.active_goal={...s.active_goal,status};
  assert.equal(fresh({latestAuthoritativeState:s}).reason,
   'GOAL_GROUNDING_NO_VERIFIED_ACTIVE_GOAL');
 }
});
test('even a return to same goal requires fresh goal transition receipt/revision',()=>{
 const s=sourceState();
 s.transition_count=3;
 s.active_goal={...s.active_goal,last_transition_receipt_id:'receipt:3'};
 s.recent_transition_receipts=[{event_id:'receipt:3',confirmed_by_user:true,principal_id:user}];
 assert.equal(fresh({latestAuthoritativeState:s}).reason,
  'GOAL_GROUNDING_GOAL_REVISION_STALE');
});
test('missing ledger readback, world crossing and principal crossing fail closed',()=>{
 assert.equal(fresh({latestAuthoritativeState:null}).status,'BLOCKED');
 const w=sourceState();w.world_id='other-world';
 assert.equal(fresh({latestAuthoritativeState:w}).reason,
  'GOAL_GROUNDING_SCOPE_MISMATCH_OR_READBACK_MISSING');
 const p=sourceState();p.principal_id='different-user';
 assert.equal(fresh({latestAuthoritativeState:p}).status,'BLOCKED');
});
test('false user authority flags cannot mint binding or pass fresh validation',()=>{
 const s=sourceState();s.recent_transition_receipts=[];
 assert.equal(bound(s).status,'BLOCKED');
 const s2=sourceState();s2.assistant_can_mutate_goals=true;
 assert.equal(fresh({latestAuthoritativeState:s2}).status,'BLOCKED');
});
