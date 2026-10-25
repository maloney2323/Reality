import {createHash} from 'node:crypto';
import {buildGovernedChatSignal} from './reality-governed-fragmented-signal-cleaner-v0.1.js';
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};

// A source-linked interpretation view, not new facts, lifecycle transitions,
// or authority. Historical user text comes only from the server history adapter.
export function buildCleanerConversationContext({governedSignal,priorTurns=[],authenticatedHistory=false}={}){
 const project=(signal,sourceRef,origin)=>{
  const p=signal?.typed_epistemic_intake,packet=signal?.packet;
  if(!p||!packet||p.packet_id!==packet.packet_id||p.source_digest!==packet.raw_content_digest||
     signal.transformation_receipt?.typed_intake_projection_digest!==p.projection_digest)
   throw Error('CONVERSATION_TYPED_LINEAGE_MISMATCH');
  const {projection_digest,...unsigned}=p;
  if(digest(unsigned)!==projection_digest)throw Error('CONVERSATION_TYPED_DIGEST_MISMATCH');
  const clauses=p.clauses.map(c=>{
   if(packet.raw_content.slice(c.source_span.start,c.source_span.end)!==c.exact_source_text)
    throw Error('CONVERSATION_TYPED_SPAN_MISMATCH');
   const fragment=signal.fragments.find(f=>f.fragment_id===c.fragment_id);
   const containsQuote=(fragment?.intake_observation?.quoted_spans||[]).some(q=>
    fragment.raw_span.start+q.start<c.source_span.end&&fragment.raw_span.start+q.end>c.source_span.start);
   return {clause_id:c.clause_id,source_ref:sourceRef,source_span:c.source_span,
    exact_source_text:c.exact_source_text,kind:c.kind,
    epistemic_modalities:c.epistemic_modalities,candidate_dependency:c.candidate_dependency,
    contains_quoted_text:containsQuote};
  });
  return {source_ref:sourceRef,origin,packet_id:p.packet_id,projection_digest,
   cleaner_version:signal.cleaner_version,clauses};
 };
 if(!Array.isArray(priorTurns))throw Error('CONVERSATION_TYPED_HISTORY_INVALID');
 const current=project(governedSignal,governedSignal.packet.packet_id,'CURRENT_CLEANER_OUTPUT');
 const history=[];
 if(authenticatedHistory){
  for(const t of priorTurns){
   if(!['user','assistant'].includes(t?.role)||typeof t.text!=='string'||!t.source_ref)
    throw Error('CONVERSATION_TYPED_HISTORY_PROVENANCE_INVALID');
   if(t.role==='user')history.push(project(buildGovernedChatSignal({message:t.text,observedAt:governedSignal.packet.observed_at}),
    t.source_ref,'AUTHENTICATED_USER_TEXT_REINTERPRETED'));
  }
 }
 return freeze({version:'cleaner-conversation-context-v0.1',current,history,
  status:'SOURCE_LINKED_INTERPRETATION_CANDIDATES',
  history_source:authenticatedHistory?'AUTHENTICATED_CONVERSATION_MESSAGES':'NOT_ATTESTED',
  historical_interpretation_recomputed:true,external_truth_established:false,execution_authorized:false});
}
