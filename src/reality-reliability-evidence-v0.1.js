// Ledger-grounded reliability evidence. Never promote model text into truth.
// Only server-owned, authenticated connector/user-policy adapters may call the
// publishing function. Its attestation is a source-provenance contract, not a
// cryptographic proof that the outside world is infallible.
export const RELIABILITY_EVIDENCE_VERSION='reality-reliability-evidence-v0.1';
const supported=new Set(['CONNECTED_PROVIDER_READBACK','AUTHORIZED_USER_POLICY']);
const valid=v=>typeof v==='string'&&v.trim().length>0;
const normalize=v=>JSON.parse(JSON.stringify(v));
export function readGroundedEvidence(history,{worldId,asOf=null}={}){
  if(!Array.isArray(history)||!valid(worldId))throw Error('RELIABILITY_WORLD_SCOPE_REQUIRED');
  const facts=new Map(),obligations=new Map(),sources=[];
  for(const event of history){
    const p=event?.payload||{};
    if(event.event_kind!=='OBSERVATION'||p.event_type!=='SOURCE_ATTESTED_EVIDENCE'||p.world_id!==worldId)continue;
    if(asOf&&event.assertion_time>asOf)continue;
    if(!supported.has(p.source_kind)||!p.source_ref||!p.source_digest||
       event.provenance?.source!=='reality_verified_evidence_adapter')continue;
    if(event.epistemic_status!=='OBSERVED' || p.source_kind==='MODEL_GENERATED')continue;
    const items=[...(p.facts||[]),...(p.obligations||[])];
    if(!items.every(x=>x?.world_id===worldId&&x.evidence_ref===event.event_id))continue;
    sources.push(event.event_id);
    for(const f of p.facts||[]){
      if(!valid(f.key))throw Error('RELIABILITY_FACT_KEY_REQUIRED');
      if(facts.has(f.key) && JSON.stringify(facts.get(f.key).value)!==JSON.stringify(f.value))
        throw Error('RELIABILITY_CONFLICTING_ATTESTED_FACTS');
      facts.set(f.key,normalize(f));
    }
    for(const o of p.obligations||[]){
      if(!valid(o.id))throw Error('RELIABILITY_OBLIGATION_ID_REQUIRED');
      if(obligations.has(o.id)&&obligations.get(o.id).active!==o.active)
        throw Error('RELIABILITY_CONFLICTING_ATTESTED_OBLIGATIONS');
      obligations.set(o.id,normalize(o));
    }
  }
  return Object.freeze({
    world_id:worldId,as_of:asOf,
    facts:[...facts.values()],obligations:[...obligations.values()],
    authorities:[],receipts:[],source_receipt_ids:sources,
    epistemic_basis:'SOURCE_ATTESTED_NOT_UNIVERSAL_TRUTH',
  });
}
export async function recordSourceAttestedEvidence({
  continuityRuntime,worldId,sourceKind,sourceRef,sourceDigest,
  facts=[],obligations=[],observedAt=new Date().toISOString(),
}={}){
  if(!continuityRuntime?.enabled||typeof continuityRuntime.readback!=='function'||
     typeof continuityRuntime.appendStage!=='function')throw Error('RELIABILITY_DURABLE_CONTINUITY_REQUIRED');
  if(!valid(worldId)||!supported.has(sourceKind)||!valid(sourceRef)||!valid(sourceDigest))
    throw Error('RELIABILITY_SOURCE_ATTESTATION_REQUIRED');
  if(!Array.isArray(facts)||!Array.isArray(obligations)||
     facts.some(x=>!valid(x?.key)||!Object.hasOwn(x,'value'))||
     obligations.some(x=>!valid(x?.id)||typeof x.active!=='boolean'))
    throw Error('RELIABILITY_SOURCE_EVIDENCE_SHAPE_INVALID');
  // No implicit trust in free-form claims. This must only be called after a
  // trusted adapter independently checks the referenced provider/user-policy.
  const eventId='source-evidence:'+sourceRef+':'+sourceDigest;
  const event=await continuityRuntime.appendStage({
    stage:'OBSERVATION',entityId:eventId,eventId,
    epistemicStatus:'OBSERVED',effectiveTime:observedAt,assertionTime:observedAt,
    payload:{
      evidence_contract:RELIABILITY_EVIDENCE_VERSION,event_type:'SOURCE_ATTESTED_EVIDENCE',
      world_id:worldId,source_kind:sourceKind,source_ref:sourceRef,source_digest:sourceDigest,
      facts:facts.map(x=>({key:x.key,value:normalize(x.value),world_id:worldId,evidence_ref:null})),
      obligations:obligations.map(x=>({id:x.id,active:x.active,world_id:worldId,evidence_ref:null})),
    },
    provenance:{source:'reality_verified_evidence_adapter'},
  });
  // Normalized event IDs are UUIDs in the actual spine; the attested source
  // must refer to the committed ID. We only patch our local expected digest
  // through the return path below; a persisted envelope cannot be rewritten.
  const rows=await continuityRuntime.readback();
  const saved=rows.find(x=>x.event_id===event.event_id);
  if(!saved||saved.payload?.source_digest!==sourceDigest)
    throw Error('RELIABILITY_EVIDENCE_READBACK_UNVERIFIED');
  return {event_id:saved.event_id,verified_readback:true,source_kind:sourceKind};
}
