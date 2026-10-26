// Foundational server-side execution boundary for Reality's user-owned goals.
// A chat model, its reviewer, browser JSON, or customer auto-authority policy
// cannot rewrite the existing Continuity/Universe goal state. This check
// precedes authorization selection and connector invocation. It does NOT
// decide conversational meaning by scanning arbitrary text.
export const GOAL_EXECUTION_BOUNDARY_VERSION='reality-goal-execution-boundary-v0.1';
const blockedStructuralFields=new Set([
 'goal_mutations','goal_transition','goal_transitions',
 'goal_transition_proposal','goal_state_mutation','goal_state_mutations',
 'goal_state_contract','goal_state','goal_states','user_goal_continuity_state',
 'user_goal_lifecycle_projection','assistant_proposal',
 'assistant_goal_proposal','intended_state_mutations',
 'verified_goal_authorization','goal_authority_contracts',
 'goal_lifecycle_override','active_goals','completed_goals',
 'superseded_goals','temporarily_suspended_goals',
]);
// These tables are managed by Reality's internal append-only Continuity and
// authority-adapter contracts. A generic privileged Supabase connector must
// not be an alternate unchecked goal/authority-state write path.
const reservedSupabaseResources=new Set([
 'universe_events','reality_universe_entries','reality_goals',
 'goal_state','goal_states','goal_transitions','reality_goal_states',
 'reality_goal_transitions','customer_authority_policy',
 'reality_claim_ledger',
]);
const identifier=x=>typeof x==='string'&&x.trim().length>0;
function recursiveMutationField(value){
 // Reject pathological payloads as untrusted rather than leaving part of
 // the request unchecked. Strings are data, not structural authority.
 const seen=new Set(),nodes=[{value,depth:0}];
 let examined=0;
 while(nodes.length){
  if(++examined>1200)return 'GOAL_BOUNDARY_UNSCANNED_TOO_LARGE';
  const {value:node,depth}=nodes.pop();
  if(node===null||typeof node!=='object')continue;
  if(depth>14)return 'GOAL_BOUNDARY_UNSCANNED_TOO_DEEP';
  if(seen.has(node))return 'GOAL_BOUNDARY_CYCLIC_INPUT';
  seen.add(node);
  if(Array.isArray(node)){
   for(const child of node)nodes.push({value:child,depth:depth+1});
   continue;
  }
  for(const [key,child] of Object.entries(node)){
   if(blockedStructuralFields.has(key.toLowerCase()))
    return 'GOAL_MUTATION_REQUIRES_SERVER_VERIFIED_USER_TRANSITION';
   nodes.push({value:child,depth:depth+1});
  }
 }
 return null;
}
function supabaseResource(workItem){
 if(workItem.connector!=='supabase'||!['insert','update','delete'].includes(workItem.operation))
  return null;
 const raw=workItem.inputs?.path;
 // A missing or nonliteral target can resolve to the connector's default
 // table or an unreviewed path. Refuse ambiguous privileged write routes.
 if(!identifier(raw))return 'GOAL_BOUNDARY_SUPABASE_TARGET_UNKNOWN';
 let parsed;
 try{parsed=decodeURIComponent(raw.trim().replace(/^\/+/,''));}
 catch{return 'GOAL_BOUNDARY_SUPABASE_PATH_INVALID';}
 parsed=parsed.replace(/^rest\/v1\//i,'');
 const table=parsed.split(/[/?#]/)[0].replace(/^public\./i,'').toLowerCase();
 if(!table||table.includes('/')||table.includes('\\'))
  return 'GOAL_BOUNDARY_SUPABASE_PATH_INVALID';
 if(reservedSupabaseResources.has(table))
  return 'GOAL_AUTHORITY_LEDGER_DIRECT_WRITE_BLOCKED';
 return null;
}
export function evaluateGoalExecutionBoundary({workItem,authorization=null}={}){
 if(!workItem||typeof workItem!=='object'||Array.isArray(workItem)||
    !identifier(workItem.work_item_id)||!identifier(workItem.workflow_id))
  return Object.freeze({
   version:GOAL_EXECUTION_BOUNDARY_VERSION,status:'BLOCKED',
   reason:'GOAL_BOUNDARY_WORK_ITEM_INVALID',execution_authorized:false,
  });
 // Scan the work item and even a user-supplied authorization artifact. Its
 // presence NEVER independently proves a user authorized a goal mutation.
 const structural=recursiveMutationField({workItem,authorization});
 const reason=structural||supabaseResource(workItem);
 return Object.freeze({
  version:GOAL_EXECUTION_BOUNDARY_VERSION,
  status:reason?'BLOCKED':'NO_GOAL_STATE_MUTATION_REQUESTED',
  reason:reason||null,
  goal_mutation_authorized:false,
  external_execution_authorized_by_this_boundary:false,
  user_goal_authorization_independently_verified:false,
  requires_separate_action_authorization:true,
 });
}
