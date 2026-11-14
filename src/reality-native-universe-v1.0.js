export const REALITY_NATIVE_UNIVERSE_VERSION = 'reality-native-universe-v1.0';

export function buildNativeUniverseContext({ systemContext = {} } = {}) {
  const source = systemContext && typeof systemContext === 'object' ? systemContext : {};
  const supplied = Array.isArray(source.universe_entries) ? source.universe_entries : [];
  const worldObservations = Array.isArray(source.connected_world_observations) ? source.connected_world_observations : [];
  const entries = [...supplied, ...worldObservations].filter(Boolean).slice(0, 100);
  return Object.freeze({
    version: REALITY_NATIVE_UNIVERSE_VERSION,
    status: 'AVAILABLE',
    count: entries.length,
    entries: Object.freeze(entries),
    persistence: 'REQUEST_CONTEXT',
  });
}

// Merge the authenticated current observation window before the older
// historical reconstruction, preserving the evidence that triggered THIS
// turn under the model's bounded context. Earlier event history fills the
// remaining capacity; duplicate event IDs do not crowd out other evidence.
export function mergeCurrentAndDurableUniverseForCognition({
 current=[],durable=[],limit=100
}={}){
 if(!Array.isArray(current)||!Array.isArray(durable)||
  !Number.isInteger(limit)||limit<1||limit>100)
  throw Error('UNIVERSE_COGNITION_WINDOW_INVALID');
 const seen=new Set(),result=[];
 for(const item of [...current,...durable]){
  if(!item||typeof item!=='object'||Array.isArray(item))continue;
  const id=typeof item.entry_id==='string'?item.entry_id:
   typeof item.event_id==='string'?item.event_id:null;
  if(id&&seen.has(id))continue;
  if(id)seen.add(id);
  result.push(item);
  if(result.length===limit)break;
 }
 return Object.freeze(result);
}
