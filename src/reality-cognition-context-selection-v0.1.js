// Working-context selection only. The full Universe ledger is persistent;
// this bounded, evidence-referenced view never changes or deletes that history.
export const REALITY_COGNITION_CONTEXT_SELECTION_VERSION='reality-cognition-context-selection-v0.1';
const OPEN_STATES=new Set(['WAITING','BLOCKED','DEFERRED','SUSPENDED','REOPENED','RECURRING']);
function pinned(entry,latestTransitionRef){
  if(latestTransitionRef && entry?.entry_id===latestTransitionRef)return true;
  if(entry?.event_kind==='CONTINUITY_STATE_TRANSITION')
    return OPEN_STATES.has(entry?.payload?.continuity_state||entry?.payload?.next_state);
  if(entry?.event_kind==='DISCREPANCY_DETECTED')
    return entry?.payload?.reconciliation_status==='UNRESOLVED';
  if(entry?.event_kind==='CONTINUITY_RECOVERY_GAP')return true;
  if(entry?.event_kind==='REALITY_LAYER_HANDOFF')
    return entry?.payload?.layer_stage==='COGNITION_ERROR';
  return false;
}
const identity=(entry,i)=>typeof entry?.entry_id==='string'&&entry.entry_id.trim()
  ? 'entry:'+entry.entry_id : 'item:'+i;
export function selectCognitionContextEntries({
  entries=[],requestEntries=[],latestTransitionRef=null,maxEntries=100,
}={}){
  if(!Array.isArray(entries)||!Array.isArray(requestEntries))
    throw Error('COGNITION_CONTEXT_INPUT_INVALID');
  if(!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>1000)
    throw Error('COGNITION_CONTEXT_BOUND_INVALID');
  const combined=[...entries,...requestEntries].filter(Boolean),all=[],seen=new Map();
  for(let i=0;i<combined.length;i++){
    const entry=combined[i],key=identity(entry,i),prior=seen.get(key);
    if(prior){
      if(JSON.stringify(prior)!==JSON.stringify(entry))
        throw Error('COGNITION_CONTEXT_CONFLICTING_ENTRY_ID');
      continue;
    }
    seen.set(key,entry);all.push(entry);
  }
  const requestKeys=new Set(requestEntries.map((entry,i)=>identity(entry,entries.length+i)));
  const priority=entry=>pinned(entry,latestTransitionRef)?0:
    requestKeys.has('entry:'+entry?.entry_id)?1:2;
  // Stable ordering within priority groups preserves caller's recent-first
  // layout. This view is an allocation policy, not semantic verification.
  const ordered=all.map((entry,index)=>({entry,index,rank:priority(entry)}))
    .sort((a,b)=>a.rank-b.rank||a.index-b.index);
  const included=ordered.slice(0,maxEntries),omitted=ordered.slice(maxEntries);
  const criticalOmitted=omitted.filter(x=>x.rank===0).length;
  return Object.freeze({
    entries:Object.freeze(included.map(x=>x.entry)),
    selection_status:criticalOmitted?'CRITICAL_REFERENCES_EXCEED_CONTEXT_WINDOW':
      omitted.length?'BOUNDED_WORKING_VIEW':'COMPLETE_SUPPLIED_VIEW',
    supplied_count:all.length,selected_count:included.length,omitted_count:omitted.length,
    critical_omitted_count:criticalOmitted,
    // Never describe a bounded working view as the full durable Universe.
    complete_universe_history_proven:false,
    no_history_deleted:true,
  });
}
