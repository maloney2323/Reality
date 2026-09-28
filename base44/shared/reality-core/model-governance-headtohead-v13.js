export const HEADTOHEAD_V13_GATEWAY_VERSION='reality-model-governance-headtohead-v1.3-gateway-v0.1';
const CP_DAY={D2:2,D4:4,D7:7};
const STATE_EFFECTS=new Set(['NOT_ESTABLISHED','PROVISIONAL','CONTRADICT','STALE','ESTABLISH','VERIFY']);
function safe(v){return Array.isArray(v)?v:[]}
function derive(kind,rows){
  const es=[...rows].sort((a,b)=>a.day-b.day);
  if(kind==='ACTION'){
    let label='UNKNOWN';
    for(const r of es){
      if(r.effect==='BLOCK'||r.effect==='REVOKE')label='BLOCKED';
      else if(r.effect==='REQUIRES_APPROVAL')label='REQUIRES_APPROVAL';
      else if(r.effect==='APPROVAL'||r.effect==='DELEGATION')label='PERMITTED';
    }
    return label;
  }
  if(kind==='VALUE'){
    let label='UNKNOWN';
    for(const r of es){
      if(r.effect==='UNSUPPORTED')label='UNSUPPORTED';
      else if(r.effect==='PARTIAL')label='PARTIAL';
      else if(r.effect==='DEFENSIBLE')label='DEFENSIBLE';
    }
    return label;
  }
  let label='UNKNOWN';
  for(const r of es){
    if(!STATE_EFFECTS.has(r.effect))continue;
    if(r.effect==='NOT_ESTABLISHED')label='NOT_ESTABLISHED';
    else if(r.effect==='PROVISIONAL')label='PROVISIONAL';
    else if(r.effect==='CONTRADICT')label='CONTRADICTED';
    else if(r.effect==='STALE')label='STALE';
    else if(r.effect==='ESTABLISH')label='ESTABLISHED';
    else if(r.effect==='VERIFY')label='VERIFIED';
  }
  return label;
}
export function governHeadtoHeadWorld({world,adapterProjection,rawOutput}){
  if(!world||!adapterProjection||!rawOutput)throw new Error('HEADTOHEAD_V13_INPUT_REQUIRED');
  const rawCp=new Map(safe(rawOutput.checkpoints).map(c=>[c.checkpoint,c]));
  const projectedRows=safe(adapterProjection.rows);
  const checkpoints=['D2','D4','D7'].map(checkpoint=>{
    const day=CP_DAY[checkpoint];
    const rawEval=new Map(safe(rawCp.get(checkpoint)?.evaluations).map(r=>[r.card_id,r]));
    const evaluations=world.cards.map(card=>{
      const topic=projectedRows.filter(r=>r.card_id===card.id&&r.day<=day);
      const raw=rawEval.get(card.id)||{};
      const relevantRefs=new Set(topic.map(r=>r.ref));
      const validRawRefs=[...new Set([...safe(raw.evidence_refs),...safe(raw.contradiction_refs)].map(String).filter(r=>world.records.some(x=>x.ref===r&&x.day<=day)&&relevantRefs.has(r)))];
      const structuralRefs=topic.map(r=>r.ref);
      const allRefs=[...new Set([...validRawRefs,...structuralRefs])];
      const contradictionRefs=topic.filter(r=>['CONTRADICT','STALE','UNSUPPORTED'].includes(r.effect)).map(r=>r.ref);
      return {card_id:card.id,kind:card.kind,label:derive(card.kind,topic),evidence_refs:allRefs.filter(r=>!contradictionRefs.includes(r)),contradiction_refs:[...new Set(contradictionRefs)],scope_limit:`Governed from frozen Reality adapter projection through ${checkpoint}; model output advisory only.`};
    });
    return {checkpoint,evaluations};
  });
  return {world_id:world.world_id,checkpoints,overall_boundary:'Provider output is advisory. Reality governed labels and citations from frozen structured evidence available at each checkpoint.',governance:{version:HEADTOHEAD_V13_GATEWAY_VERSION,model_authority:'ADVISORY_ONLY'}};
}