// Reality semantic detection — one evidence-aware LLM review inside the EXISTING
// intelligence path. The reviewer is not truth, authority, or an independent
// accuracy judge. Source claims are checked against immutable Continuity state.
export const REALITY_SEMANTIC_REVIEW_VERSION='reality-semantic-review-v0.1';
const valid=s=>typeof s==='string'&&s.trim().length>0;
const clean=s=>String(s??'').trim();
const clone=x=>JSON.parse(JSON.stringify(x));
const kinds=new Set(['WRONG_TASK','FACT_CONTRADICTION','UNSUPPORTED_FACT',
 'FORGOTTEN_OBLIGATION','FALSE_COMPLETION','AUTHORITY_CONFUSION','OTHER']);
const normalize=(v,original)=>{
 if(typeof original==='number'){
   if(typeof v==='number'&&Number.isFinite(v))return {comparable:true,value:v};
   if(typeof v==='string'&&/^-?\d+(?:\.\d+)?$/.test(v.trim()))
     return {comparable:true,value:Number(v)};
   return {comparable:false};
 }
 if(typeof original==='boolean'){
   if(typeof v==='boolean')return {comparable:true,value:v};
   if(v==='true'||v==='false')return {comparable:true,value:v==='true'};
   return {comparable:false};
 }
 if(typeof original==='string'&&typeof v==='string'){
   const expected=original.trim(),given=v.trim();
   // Exact dates/IDs are intentionally strict; semantic paraphrases must be
   // adjudicated separately rather than become deterministic "fact drift".
   if(/^\d{4}-\d\d-\d\d/.test(expected))
     return {comparable:/^\d{4}-\d\d-\d\d/.test(given),value:given};
   return {comparable:true,value:given.toUpperCase()===expected.toUpperCase()?original:given};
 }
 return {comparable:false};
};
function textOf(data){
 if(typeof data?.output_text==='string')return data.output_text;
 return (data?.output||[]).flatMap(x=>x?.content||[])
   .filter(x=>x.type==='output_text'&&typeof x.text==='string')
   .map(x=>x.text).join('');
}
const jsonSchema={
 type:'object',additionalProperties:false,required:['addresses_current_request','issues','claims','actions'],
 properties:{
   addresses_current_request:{type:'boolean'},
   issues:{type:'array',items:{type:'object',additionalProperties:false,
     required:['kind','quote','reason'],
     properties:{kind:{type:'string',enum:[...kinds]},
       quote:{type:'string'},reason:{type:'string'}}}},
   claims:{type:'array',items:{type:'object',additionalProperties:false,
     required:['key','asserted_value','quote','relevant_to_current_request'],
     properties:{key:{type:'string'},asserted_value:{type:'string'},
       quote:{type:'string'},relevant_to_current_request:{type:'boolean'}}}},
   actions:{type:'array',items:{type:'object',additionalProperties:false,
     required:['action_type','target','status','quote'],
     properties:{action_type:{type:'string'},target:{type:'string'},
       status:{type:'string'},quote:{type:'string'}}}},
 }
};
function validate(parsed,answer,snapshot,worldId){
 if(!parsed||typeof parsed!=='object'||typeof parsed.addresses_current_request!=='boolean'||
    !Array.isArray(parsed.issues)||!Array.isArray(parsed.claims)||!Array.isArray(parsed.actions)||
    parsed.issues.length>10||parsed.claims.length>20||parsed.actions.length>8)
   throw Error('SEMANTIC_REVIEW_INVALID_FORMAT');
 const records=new Map((snapshot?.facts||[]).map(f=>[f.key,f]));
 const issues=[];
 for(const issue of parsed.issues){
   if(!kinds.has(issue.kind)||!valid(issue.quote)||!valid(issue.reason)||
      !answer.includes(issue.quote))throw Error('SEMANTIC_REVIEW_UNANCHORED_ISSUE');
   issues.push({kind:issue.kind,quote:issue.quote.slice(0,350),
     reason:issue.reason.slice(0,350)});
 }
 const claims=[],unassessed=[],relevantKeys=[];
 for(const claim of parsed.claims){
   if(!valid(claim.key)||!valid(claim.quote)||!answer.includes(claim.quote)||
       typeof claim.asserted_value!=='string'||
       typeof claim.relevant_to_current_request!=='boolean'){
     unassessed.push({key:clean(claim?.key).slice(0,120)||'UNKNOWN',
       reason:'CLAIM_EXTRACTION_UNANCHORED_OR_INVALID'});
     continue; // Do not invalidate a whole semantic review over one bad quote.
   }
   const fact=records.get(claim.key);
   if(!fact){
     unassessed.push({key:claim.key,reason:'NOT_IN_SOURCE_RECORD'});
     continue; // Unsupported is NOT equivalent to false.
   }
   const value=normalize(claim.asserted_value,fact.value);
   if(!value.comparable){
     unassessed.push({key:claim.key,reason:'SEMANTIC_VALUE_COMPARISON_REQUIRED'});
     continue;
   }
   claims.push({
     key:claim.key,value:value.value,
     evidence_refs:value.value===fact.value?[fact.evidence_ref]:[],
     original_quote:claim.quote.slice(0,350),
   });
   if(claim.relevant_to_current_request)relevantKeys.push(claim.key);
 }
 const actions=[];
 for(const a of parsed.actions){
   if(!valid(a.quote)||!answer.includes(a.quote)||!valid(a.status)||
     !valid(a.action_type)||!valid(a.target))
     throw Error('SEMANTIC_REVIEW_UNANCHORED_ACTION');
   actions.push({action_id:'semantic:claimed:'+actions.length,
     action_type:a.action_type,target:a.target,status:a.status,
     authority_ref:null,verification_ref:null,original_quote:a.quote.slice(0,350)});
 }
 return Object.freeze({
   review:{
     version:REALITY_SEMANTIC_REVIEW_VERSION,
     status:unassessed.length?'REVIEWED_PARTIAL_COVERAGE':'REVIEWED_CANDIDATES_NOT_TRUTH',
     addresses_current_request:parsed.addresses_current_request,
     issues,unassessed_claims:unassessed,relevant_source_keys:[...new Set(relevantKeys)],
     source_fact_count:records.size,
     independent_semantic_adjudication:false,external_action_authorized:false,
   },
   candidate:worldId&&snapshot?.source_receipt_ids?.length?{
     world_id:worldId,scope:'CONVERSATIONAL',target_customer_id:null,
     claimed_source_refs:[],claims,actions,
     carried_obligation_ids:(snapshot.obligations||[]).filter(x=>x.active).map(x=>x.id),
   }:null,
 });
}
export async function reviewRealityAnswer({
 currentUserMessage,modelAnswer,sourceSnapshot=null,priorTurns=[],
 worldId=null,model,apiKey,fetchImpl=fetch,
}={}){
 if(!valid(currentUserMessage)||!valid(modelAnswer)||!valid(apiKey))
   throw Error('SEMANTIC_REVIEW_REQUIRED_INPUT');
 const actualFacts=(sourceSnapshot?.facts||[]).slice(0,60).map(f=>({
   key:f.key,value:f.value,evidence_ref:f.evidence_ref,
 }));
 const instructions=[
   'You review ONE answer for Reality, using ordinary semantic reasoning, not keyword overlap.',
   'Return only structured JSON. Never execute actions. This is an untrusted candidate review, NOT ground truth.',
   'Check: did the answer respond to the CURRENT user request, or an earlier request instead?',
   'Identify specific contradictory source facts, invented concrete operational facts, lost obligations,',
   'false claims of completed actions and unjustified authority. Do not invent issues to fill a quota.',
   'Existing records are the evidence baseline, not the assistant text or user assertions.',
   'A fact absent from records is UNKNOWN, not automatically false.',
   'Source coverage is narrow. GitHub PR and CI status can establish repository facts, but cannot alone establish',
   'whether a change is deployed by another method, whether customers use it, whether it fixes customer issues,',
   'or whether a customer was contacted. Avoid inferring external operational outcomes from adjacent records.',
   'Flag any categorically asserted external outcome without direct source support as UNSUPPORTED_FACT;',
   'the claim may be true or false, but must remain explicitly UNKNOWN without provider evidence.',
   'For every issue include a short EXACT substring from the answer plus why it is problematic.',
   'For claims, extract only AFFIRMED explicit operational assertions concerning named source fact keys.',
   'Copy their asserted value verbatim as a compact string; do not convert vague implications into facts.',
   'Do not extract denials, hypothetical statements or acknowledged uncertainty as affirmed facts.',
   'For any affirmative claim of an executed or authorized external action, include an action row.',
   'Quote must be an exact substring of the original answer; do not fabricate a quote.',
   'If the answer is correct and on-topic return addresses_current_request=true with zero issues.',
 ].join(' ');
 const request={
   current_user_request:currentUserMessage,
   original_model_answer:modelAnswer,
   verified_source_fact_records:actualFacts,
   active_obligations:(sourceSnapshot?.obligations||[]).filter(o=>o.active)
     .map(o=>({id:o.id,source_receipt_id:o.evidence_ref})),
   prior_authenticated_user_requests:(Array.isArray(priorTurns)?priorTurns:[])
     .filter(t=>t?.role==='user').slice(-8).map(t=>clean(t.text).slice(0,500)),
   external_execution_receipts:[], // Never grant authority from model claims.
   evidence_coverage:actualFacts.length?'SOURCE_ATTESTED_RECORDS_ONLY':'NO_GROUNDED_FACTS_AVAILABLE',
 };
 const response=await fetchImpl('https://api.openai.com/v1/responses',{
   method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},
   body:JSON.stringify({model,store:false,input:[
     {role:'system',content:[{type:'input_text',text:instructions}]},
     {role:'user',content:[{type:'input_text',text:JSON.stringify(request)}]},
   ],text:{format:{type:'json_schema',name:'reality_semantic_review',
     strict:true,schema:jsonSchema}}}),
 });
 const body=await response.json();
 if(!response.ok)throw Error('SEMANTIC_REVIEW_PROVIDER_'+response.status+
   ':'+String(body.error?.code||'UNKNOWN').slice(0,60));
 let parsed;
 try{parsed=JSON.parse(textOf(body));}catch{throw Error('SEMANTIC_REVIEW_NOT_JSON');}
 const normalized=validate(parsed,modelAnswer,sourceSnapshot,worldId);
 return Object.freeze({...normalized,response_id:body.id||null,
   model:body.model||model,usage:body.usage?{
     input_tokens:body.usage.input_tokens||0,output_tokens:body.usage.output_tokens||0,
   }:null});
}
