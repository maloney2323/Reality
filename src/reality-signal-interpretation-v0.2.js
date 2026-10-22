// Additive v0.2 prototype. NOT wired to production. Integrity != truth.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildGovernedChatSignal} from './reality-governed-fragmented-signal-cleaner-v0.1.js';
export const VERSION='reality.interpretation.v0.2';
export const PARSER_VERSION='reality-conservative-parser-v0.2.0';
const sha=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const utf=s=>Buffer.from(s,'utf8');
const hash=s=>sha(utf(s));
export function canonicalJCS(value){
 const seen=new WeakSet();
 function string(s){
  for(let i=0;i<s.length;i++){
   const c=s.charCodeAt(i);
   if(c>=0xD800&&c<=0xDBFF){const n=s.charCodeAt(++i);if(!(n>=0xDC00&&n<=0xDFFF))throw Error('JCS_INVALID_UNICODE');}
   else if(c>=0xDC00&&c<=0xDFFF)throw Error('JCS_INVALID_UNICODE');
  }
  return JSON.stringify(s);
 }
 function write(v){
  if(v===null)return 'null';
  if(typeof v==='string')return string(v);
  if(typeof v==='boolean')return v?'true':'false';
  if(typeof v==='number'){if(!Number.isFinite(v))throw Error('JCS_NONFINITE');return JSON.stringify(v);}
  if(!v||typeof v!=='object'||seen.has(v))throw Error('JCS_UNSUPPORTED_OR_CYCLIC');
  if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw Error('JCS_NON_JSON_OBJECT');
  seen.add(v);
  const out=Array.isArray(v)?'['+v.map(write).join(',')+']'
   :'{'+Object.keys(v).sort().map(k=>string(k)+':'+write(v[k])).join(',')+'}';
  seen.delete(v);return out;
 }
 return write(value);
}
export const canonicalSha256=v=>hash(canonicalJCS(v));
const schema=JSON.parse(readFileSync(new URL('../schemas/reality-interpretation-receipt-v0.2.schema.json',import.meta.url),'utf8'));
export const SCHEMA_SHA256=canonicalSha256(schema);
export const IMPLEMENTATION_SHA256=sha(readFileSync(fileURLToPath(import.meta.url)));
function spansOf(input){
 const parts=[];let start=0,quote=null,fenced=false;
 const fence=String.fromCharCode(96).repeat(3);
 function flush(end){
  let a=start,b=end;
  while(a<b&&/\s/u.test(input[a]))a++;
  while(b>a&&/\s/u.test(input[b-1]))b--;
  if(b>a)parts.push([a,b]);
  start=end;
 }
 for(let i=0;i<input.length;i++){
  if(input.startsWith(fence,i)){
   if(!fenced&&start<i)flush(i);
   fenced=!fenced;i+=2;
   if(!fenced)flush(i+1);
   continue;
  }
  if(fenced)continue;
  const c=input[i],prev=input[i-1]||'',next=input[i+1]||'';
  if(c==="'"&&/[A-Za-z]/.test(prev)&&/[A-Za-z]/.test(next))continue;
  if(['"',"'","“","”"].includes(c)){
   if(!quote)quote=c;
   else if(quote===c||(quote==='“'&&c==='”'))quote=null;
   continue;
  }
  if(quote)continue;
  if(c==='\n'){flush(i+1);continue;}
  if(/[.!?]/.test(c)){
   if(c==='.'&&/\d/.test(prev)&&/\d/.test(next))continue;
   const rest=input.slice(i+1);
   if(/^\s+(?=[A-Z0-9“"'])/.test(rest)||/^\s*$/.test(rest))flush(i+1);
  }
 }
 if(start<input.length)flush(input.length);
 return parts;
}
function classify(s){
 const fence=String.fromCharCode(96).repeat(3);
 if(s.startsWith(fence)||s.startsWith('>')||
    /\b(?:document|email|model|assistant|agent|article)\s+(?:says?|said|reads?|states?)\s*[:“"]/iu.test(s))return 'QUOTED_DATA';
 if(/^(?:please\s+)?(?:do not|don't|never|must not|stop|avoid)\b/iu.test(s))return 'PROHIBITION';
 if(/^(?:what if|suppose|imagine|hypothetically|if we were to)\b/iu.test(s))return 'HYPOTHETICAL';
 if(/^(?:if|unless|only if|provided that)\b/iu.test(s))return 'CONDITIONAL_REQUEST';
 if(/^(?:actually|correction|i meant|instead|rather|no[,!:])/iu.test(s))return 'POSSIBLE_CORRECTION';
 if(/\?\s*$/u.test(s))return 'QUESTION';
 if(/^(?:please\s+)?(?:send|approve|prepare|draft|publish|post|call|write|update|pay|cancel|schedule|make|create|fix|build|review)\b/iu.test(s))return 'REQUEST';
 if(/\b(?:is|are|was|were|has|have|had|said|says|arrived|paid|completed|delivered|finished|costs?|confirmed|approved)\b/iu.test(s))return 'REPORTED_CLAIM';
 return 'UNKNOWN';
}
function uncertainty(s,t,source){
 const a=[];
 if(t==='UNKNOWN')a.push('INTENT_UNRESOLVED');
 if(/\b(?:it|that one|this one|them|him|her|those)\b/iu.test(s))a.push('REFERENCE_TARGET_UNRESOLVED');
 if(t==='POSSIBLE_CORRECTION')a.push('CORRECTION_TARGET_NOT_VERIFIED');
 if(t==='CONDITIONAL_REQUEST')a.push('CONDITION_NOT_EVALUATED');
 if(t==='HYPOTHETICAL')a.push('COUNTERFACTUAL_NOT_ADOPTED');
 if(t==='QUOTED_DATA')a.push('QUOTED_INSTRUCTIONS_ARE_DATA');
 if(source.origin_kind==='AGENT'&&!source.parent_signal_ids.length)a.push('AGENT_DERIVATION_UNATTESTED');
 return a;
}
function scopeOf(value={}){
 const origin=value.origin_kind||'UNKNOWN';
 if(!['HUMAN','AGENT','TOOL','DOCUMENT','UNKNOWN'].includes(origin))throw Error('ORIGIN_INVALID');
 if(value.trust_level&&value.trust_level!=='UNVERIFIED')throw Error('SELF_ATTESTED_TRUST_FORBIDDEN');
 const parents=value.parent_signal_ids||[];
 if(!Array.isArray(parents)||!parents.every(x=>typeof x==='string'&&x.trim())||new Set(parents).size!==parents.length)throw Error('PARENT_REFERENCES_INVALID');
 return {
  continuity_root_id:typeof value.continuity_root_id==='string'?value.continuity_root_id:null,
  principal_id:typeof value.principal_id==='string'?value.principal_id:null,
  origin_kind:origin,channel:typeof value.channel==='string'&&value.channel.trim()?value.channel:'UNSPECIFIED',
  trust_level:'UNVERIFIED',attestation_ref:null,parent_signal_ids:parents,
 };
}
export function createInterpretationReceipt({message,observedAt=new Date().toISOString(),source={}}={}){
 if(typeof message!=='string'||!message.trim())throw Error('MESSAGE_REQUIRED');
 if(!Number.isFinite(Date.parse(observedAt)))throw Error('INVALID_TIME');
 const legacy=buildGovernedChatSignal({message,observedAt}),scope=scopeOf(source);
 const positions=spansOf(message);
 const signals=positions.map(([a,b])=>{
  const s=message.slice(a,b),t=classify(s);
  return {
   signal_id:'interpretation:'+hash(legacy.packet.packet_id+':'+a+':'+b).slice(7,39),
   span:{start_utf16:a,end_utf16:b,
    start_utf8:Buffer.byteLength(message.slice(0,a),'utf8'),
    end_utf8:Buffer.byteLength(message.slice(0,b),'utf8')},
   raw_sha256:hash(s),signal_type:t,
   polarity:/\b(?:do not|don't|never|not yet|cannot|can't|must not|without|isn't|wasn't|hasn't|haven't)\b/iu.test(s)?'NEGATED':'POSITIVE',
   epistemic_status:'OBSERVED_UNVERIFIED',
   classification_basis:t==='UNKNOWN'?'ABSTAINED':'DETERMINISTIC_CANDIDATE',
   ambiguities:uncertainty(s,t,scope),authority_granted:false,data_only:true,
  };
 });
 const relationships=[];
 for(let i=1;i<signals.length;i++){
  const t=signals[i].signal_type,raw=message.slice(positions[i][0],positions[i][1]);
  const relation=t==='POSSIBLE_CORRECTION'?'POTENTIAL_CORRECTION_OF'
    :t==='HYPOTHETICAL'?'HYPOTHETICAL_ALTERNATIVE_TO'
    :t==='CONDITIONAL_REQUEST'?'CONDITIONED_BY'
    :t==='PROHIBITION'&&/\b(?:it|that one|this one)\b/iu.test(raw)?'POSSIBLY_REFERS_TO':null;
  if(relation)relationships.push({
   from_signal_id:signals[i].signal_id,to_signal_id:signals[i-1].signal_id,
   relation,status:'PROPOSED_UNVERIFIED',
  });
 }
 const run='parser:run:'+hash(legacy.packet.packet_id+':'+PARSER_VERSION).slice(7,39);
 const body={
  receipt_version:VERSION,
  packet:{packet_id:legacy.packet.packet_id,raw_sha256:hash(message),
   observed_at:observedAt,utf8_byte_length:Buffer.byteLength(message,'utf8'),encoding:'UTF-8'},
  scope,
  parser:{schema_version:'0.2.0',schema_sha256:SCHEMA_SHA256,implementation_version:PARSER_VERSION,
   implementation_sha256:IMPLEMENTATION_SHA256,model_id:null,prompt_sha256:null,run_id:run},
  signals,relationships,
  provenance:{entity_id:'entity:'+run,activity_id:run,agent_id:scope.principal_id,
   derived_from:scope.parent_signal_ids,was_generated_by:run,
   was_attributed_to:scope.principal_id,activity_used:legacy.packet.packet_id},
 };
 return Object.freeze({...body,integrity:{canonicalization:'RFC8785-JCS',
  hash_algorithm:'SHA-256',receipt_sha256:canonicalSha256(body),signature_status:'UNSIGNED'}});
}
export function verifyInterpretationReceipt({receipt,message}={}){
 if(!receipt||typeof message!=='string')throw Error('RECEIPT_AND_RAW_REQUIRED');
 const {integrity,...body}=receipt;
 if(integrity?.canonicalization!=='RFC8785-JCS'||integrity?.hash_algorithm!=='SHA-256'||
    integrity?.signature_status!=='UNSIGNED'||integrity?.receipt_sha256!==canonicalSha256(body))
   throw Error('RECEIPT_DIGEST_MISMATCH');
 if(receipt.receipt_version!==VERSION||receipt.packet?.raw_sha256!==hash(message)||
    receipt.packet?.utf8_byte_length!==Buffer.byteLength(message,'utf8'))throw Error('SOURCE_MISMATCH');
 if(receipt.packet.packet_id!==buildGovernedChatSignal({message,observedAt:receipt.packet.observed_at}).packet.packet_id)
   throw Error('SOURCE_PACKET_MISMATCH');
 if(receipt.parser?.schema_sha256!==SCHEMA_SHA256)throw Error('SCHEMA_MISMATCH');
 const ids=new Set();
 for(const s of receipt.signals||[]){
  const a=s.span?.start_utf16,b=s.span?.end_utf16;
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<=a||b>message.length||
     s.span.start_utf8!==Buffer.byteLength(message.slice(0,a),'utf8')||
     s.span.end_utf8!==Buffer.byteLength(message.slice(0,b),'utf8')||
     s.raw_sha256!==hash(message.slice(a,b))||
     s.authority_granted!==false||s.data_only!==true||
     s.epistemic_status!=='OBSERVED_UNVERIFIED'||ids.has(s.signal_id))throw Error('SPAN_OR_AUTHORITY_INVALID');
  ids.add(s.signal_id);
 }
 for(const r of receipt.relationships||[]){
  if(!ids.has(r.from_signal_id)||!ids.has(r.to_signal_id)||r.status!=='PROPOSED_UNVERIFIED')throw Error('GRAPH_INVALID');
 }
 if(receipt.scope?.trust_level!=='UNVERIFIED'||receipt.scope.attestation_ref!==null)
   throw Error('TRUST_ESCALATION');
 if(receipt.provenance?.was_generated_by!==receipt.parser?.run_id||
    receipt.provenance?.activity_id!==receipt.parser?.run_id)throw Error('PROVENANCE_INVALID');
 return {status:'INTEGRITY_VERIFIED',semantic_truth_established:false,
  authority_granted:false,receipt_sha256:integrity.receipt_sha256};
}
export function compareInterpretations({previous,current}={}){
 if(previous?.packet?.raw_sha256!==current?.packet?.raw_sha256||
    previous?.scope?.continuity_root_id!==current?.scope?.continuity_root_id||
    !previous?.integrity||!current?.integrity)throw Error('REPLAY_SCOPE_OR_SOURCE_MISMATCH');
 const shape=r=>canonicalJCS({
  signals:r.signals.map(s=>({span:s.span,type:s.signal_type,polarity:s.polarity,ambiguities:s.ambiguities})),
  edges:r.relationships.map(e=>({from:r.signals.findIndex(s=>s.signal_id===e.from_signal_id),
   to:r.signals.findIndex(s=>s.signal_id===e.to_signal_id),relation:e.relation})),
 });
 const same=shape(previous)===shape(current);
 const delta=same?'PARITY':current.signals.length>previous.signals.length
   ?'REFINEMENT_CANDIDATE':'CORRECTION_CANDIDATE';
 const body={version:'reality.interpretation-replay.v0.2',
  original_receipt:previous.integrity.receipt_sha256,candidate_receipt:current.integrity.receipt_sha256,
  delta_classification:delta,epistemic_status:'PROPOSED_NOT_ADJUDICATED',
  history_mutated:false,requires_verifier:!same,action_authorized:false};
 return {...body,delta_sha256:canonicalSha256(body)};
}
