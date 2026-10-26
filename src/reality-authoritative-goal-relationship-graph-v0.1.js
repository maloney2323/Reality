// A read-only, source-linked GoalState graph projected from the EXISTING
// authenticated Continuity goal transition ledger. NOT another writable
// Supabase goal store. Only explicit server-attested USER commands are sources
// of durable ACTIVE/PAUSED/DORMANT/ABANDONED goal lifecycle authority.
// No model, reviewer or unverified conversational text can create an edge.
export const REALITY_AUTH_GOAL_GRAPH_VERSION='reality-authoritative-goal-relationship-graph-v0.1';
const word=x=>typeof x==='string'&&x.trim().length>0;
const freeze=x=>{if(x&&typeof x==='object'){for(const value of Object.values(x))freeze(value);Object.freeze(x)}return x};
const allowedStatus=new Set(['ACTIVE','PAUSED','DORMANT','ABANDONED','USER_REPORTED_COMPLETE_UNVERIFIED']);
export function projectAuthoritativeGoalRelationshipGraph({
 authoritativeState,scopeRootId,worldId=null,principalId,
}={}){
 if(!word(scopeRootId)||!word(principalId)||
    authoritativeState?.continuity_root_id!==scopeRootId||
    authoritativeState?.world_id!==(worldId||null)||
    authoritativeState?.principal_id!==principalId||
    authoritativeState?.assistant_can_mutate_goals!==false||
    authoritativeState?.semantic_reviewer_can_mutate_goals!==false||
    !Array.isArray(authoritativeState?.goals)||
    !Array.isArray(authoritativeState?.recent_transition_receipts))
  throw Error('GOAL_GRAPH_AUTHENTICATED_SCOPE_REQUIRED');
 const transitions=authoritativeState.transition_count||0;
 const nodes=new Map();
 for(const g of authoritativeState.goals){
  if(!word(g?.goal_id)||nodes.has(g.goal_id)||
     !word(g?.source_user_message_ref)||!word(g?.title)||
     !word(g?.last_transition_receipt_id)||!allowedStatus.has(g?.status)||
     g.user_confirmed!==true||
     g.external_execution_authorized!==false||
     (g.parent_id!==null&&g.parent_id!==undefined&&!word(g.parent_id)))
   throw Error('GOAL_GRAPH_INVALID_USER_SOURCE_OR_GOAL');
  nodes.set(g.goal_id,{
   goal_id:g.goal_id,parent_id:g.parent_id||null,
   title:g.title.slice(0,700),status:g.status,
   user_source_ref:g.source_user_message_ref,
   last_transition_receipt_id:g.last_transition_receipt_id,
   // Exact user-authored objective text is evidence. It is NOT a
   // model-extracted list of independently confirmed hard constraints.
   scope_boundary_source_text:g.title.slice(0,700),
   semantic_scope_extraction_verified:false,
   user_reported_completion_is_verified:false,
   grants_external_action_authority:false,
  });
 }
 const activeId=authoritativeState.active_goal_id||null;
 if(transitions===0&&(activeId||nodes.size))
  throw Error('GOAL_GRAPH_UNAUTHORIZED_STATE_WITHOUT_TRANSITIONS');
 if(activeId&&(!nodes.has(activeId)||nodes.get(activeId).status!=='ACTIVE'))
  throw Error('GOAL_GRAPH_ACTIVE_GOAL_MISSING_OR_NOT_ACTIVE');
 if(nodes.size>50)throw Error('GOAL_GRAPH_BOUNDED_PROJECTION_REQUIRED');
 const gaps=[],edges=[];
 for(const node of nodes.values()){
  if(!node.parent_id)continue;
  const parent=nodes.get(node.parent_id);
  if(!parent){
   gaps.push({child_goal_id:node.goal_id,missing_parent_goal_id:node.parent_id});
   continue;
  }
  edges.push({
   parent_goal_id:parent.goal_id,child_goal_id:node.goal_id,
   relationship:'USER_CONFIRMED_TEMPORARY_SUBGOAL',
   child_source_user_ref:node.user_source_ref,
   parent_source_user_ref:parent.user_source_ref,
   goal_action_authority:false,
  });
 }
 // A corrupted cyclic chain cannot become controlling state.
 const path=[];let cursor=activeId;
 const seen=new Set();
 while(cursor){
  if(seen.has(cursor))throw Error('GOAL_GRAPH_AUTHORITY_CYCLE');
  seen.add(cursor);
  const g=nodes.get(cursor);
  if(!g)break;
  path.unshift(g.goal_id);
  cursor=g.parent_id;
 }
 const byId=id=>nodes.get(id);
 const active=activeId?byId(activeId):null;
 const ancestors=path.slice(0,-1).map(byId).filter(Boolean);
 const blocked=Array.from(nodes.values()).filter(x=>
   ['ABANDONED','USER_REPORTED_COMPLETE_UNVERIFIED'].includes(x.status));
 return freeze({
  version:REALITY_AUTH_GOAL_GRAPH_VERSION,
  scope_root_id:scopeRootId,world_id:worldId||null,principal_id:principalId,
  authority_origin:'SOURCE_ATTESTED_USER_GOAL_COMMANDS_IN_EXISTING_CONTINUITY',
  status:transitions===0?'NO_EXPLICIT_USER_GOAL_COMMANDS':
    gaps.length?'PARTIAL_AUTHORITATIVE_GOAL_GRAPH':
    active?'AUTHENTICATED_ACTIVE_GOAL_GRAPH':
    'AUTHENTICATED_NO_ACTIVE_GOAL',
  active_goal_id:activeId,
  active_goal:active,
  active_ancestor_goal_ids:ancestors.map(x=>x.goal_id),
  active_ancestors:ancestors,
  authorized_parent_child_edges:edges,
  paused_or_dormant_goals:[...nodes.values()].filter(x=>['PAUSED','DORMANT'].includes(x.status)),
  closed_or_reported_complete_goals:blocked,
  incomplete_parent_relations:gaps,
  goals:[...nodes.values()],
  authenticated_goal_transition_count:transitions,
  assistant_proposal_may_mutate_graph:false,
  reviewer_may_grant_goal_authority:false,
  factual_business_completion_established:false,
  action_execution_authorized:false,
  semantic_goal_drift_independently_verified:false,
 });
}
