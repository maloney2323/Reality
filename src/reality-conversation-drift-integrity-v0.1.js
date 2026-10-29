// Integrated conversation integrity inspection (bounded). Ported from Reality's
// earlier tested Integrity Spine conversation contract, not a second truth system.
// Findings are candidates; independent semantic adjudication is NOT performed.
// Never authorize external actions from conversational observations.
import {createHash} from 'node:crypto';
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
// Conversation drift is part of the Continuity Spine, not a new independent
// detector. This initial parser is deliberately conservative; it identifies
// explicit user-stated conditions and later assistant intent shifts only.
export const CONVERSATIONAL_CONTINUITY_VERSION='reality-conversation-continuity-v0.3';
function terms(s){
 const stop=new Set(['the','a','an','to','of','for','by','on','at','with','my','our','your','their','that','this','it','them','please','we','i','you','will','can','could','would','shall','should','must','not','dont','do','only','after','before','until','unless','once','if','when','now','then']);
 const stem=w=>{
  const aliases={sending:'send',sent:'send',ordering:'order',ordered:'order',signs:'sign',signed:'sign',signing:'sign',approved:'approve',approves:'approve',approving:'approve',approval:'approve',materials:'material'};
  if(aliases[w])return aliases[w];
  if(w.endsWith('ies')&&w.length>4)return w.slice(0,-3)+'y';
  if(w.endsWith('ing')&&w.length>6)return w.slice(0,-3);
  if(w.endsWith('ed')&&w.length>5)return w.slice(0,-2);
  if(w.endsWith('s')&&w.length>4)return w.slice(0,-1);
  return w;
 };
 return (String(s||'').toLowerCase().replace(/\u2019/g,"'").match(/[a-z0-9]+/g)||[])
  .map(stem).filter(w=>w.length>1&&!stop.has(w));
}
// A short setting clause is not permission to drop the following rule.
// E.g. "For the construction job, do not send the estimate until approval."
// Restrict contextual extraction to an anchored bounded preface; never scan
// arbitrary quotations or hypothetical examples for action authority.
export function extractUserIntentAnchors(message,ref,turnIndex){
 const anchors=[];
 for(const clause of String(message||'').split(/(?<=[.?!])\s+|\n+/)){
  const raw=clause.trim();
  if(!raw||/^[>"']/.test(raw))continue;
  const t=raw.replace(/^(?:for|regarding|on|about|in)\s+(?:[^,]{3,120}),\s*/i,'')
    .replace(/^(?:remember|note)\s*(?:that)?\s*:\s*/i,'');
  const forms=[
   /^(?:please\s+)?(?:do\s+not|don't|never|must\s+not|should\s+not)\s+(.+?)\s+(?:until|before|unless)\s+([^.;!?]+)/i,
   /^(?:please\s+)?(?:only\s+|you\s+may\s+only\s+|we\s+can\s+only\s+)(.+?)\s+(?:after|if|when|once)\s+([^.;!?]+)/i,
   /^(?:please\s+)?(?:wait\s+to|hold\s+off\s+on)\s+(.+?)\s+(?:until|after)\s+([^.;!?]+)/i,
  ];
  const match=forms.map(f=>t.match(f)).find(Boolean);
  if(!match)continue;
  const action=match[1].trim(),condition=match[2].trim();
  const a=terms(action),c=terms(condition);
  if(a.length<2||!c.length)continue;
  anchors.push({
   anchor_id:'conversation:'+sha([ref,turnIndex,action,condition]).slice(7,39),
   source_ref:ref,turn_index:turnIndex,original_user_text:raw.slice(0,600),
   action_text:action,condition_text:condition,
   action_tokens:a,condition_tokens:c,
   authority:'USER_STATED_INTENT_NOT_EXTERNAL_FACT',
  });
 }
 return anchors;
}
function matchesAction(candidate,anchor){
 const words=terms(candidate);
 return words.includes(anchor.action_tokens[0])&&
  anchor.action_tokens.slice(1).some(x=>words.includes(x));
}
function nonAssertive(t){
 return /^(?:>|["'])/.test(t.trim())||
 /(?:^|[.?!]\s*)(?:if|what\s+if|suppose|hypothetically)\b/i.test(t)||
 /\b(?:perhaps|maybe|might|could|should|would|consider|example|hypothetical)\b/i.test(t);
}
function negativeAction(t,anchor){
 const v=anchor.action_tokens[0];
 return new RegExp("\\b(?:do not|don't|never|won't|will not|cannot|can't|not going to|avoid|hold off on)\\s+(?:\\w+\\s+){0,2}"+v+"\\b",'i').test(t);
}
function retainsCondition(t,anchor){
 // Supported source user condition: "send estimate once homeowner approves".
 const parts=t.split(/\b(?:after|until|once|unless|when|only if|provided that|if)\b/i);
 const hasCondition=x=>{
  const observed=terms(x),c=anchor.condition_tokens;
  return c.length===1?observed.includes(c[0]):
   c.filter(token=>observed.includes(token)).length>=Math.min(2,c.length);
 };
 if(parts.length>=2&&parts.slice(1).some(hasCondition))return true;
 // Equivalent reversed syntax: "wait for approval BEFORE sending estimate".
 // The opposite, "send estimate BEFORE approval", must NOT pass this check.
 const beforeParts=t.split(/\bbefore\b/i);
 if(beforeParts.length<2)return false;
 return hasCondition(beforeParts[0]) &&
  beforeParts.slice(1).some(x=>matchesAction(x,anchor));
}
function possibleRevision(t,anchor){
 return /\b(?:actually|instead|change|override|no longer|you can now|go ahead|forget the earlier|remove the restriction)\b/i.test(t)&&
   matchesAction(t,anchor);
}
// One bounded, source-backed response-to-request check in the existing Spine.
// This is a diagnostic candidate, never an independent semantic truth verdict.
// Reuses authenticated turns; does not trust client supplied chat history.
function tokenOverlap(a,b){
  const left=new Set(terms(a)),right=new Set(terms(b));
  if(!left.size||!right.size)return 0;
  let hits=0;for(const token of left)if(right.has(token))hits++;
  return hits/left.size;
}
function tokenJaccard(a,b){
  const left=new Set(terms(a)),right=new Set(terms(b));
  if(!left.size||!right.size)return 0;
  let hits=0;for(const token of left)if(right.has(token))hits++;
  return hits/(left.size+right.size-hits);
}
function findTurnAlignmentCandidate({priorTurns,currentUserMessage,modelAnswer,
  continuityRootId,modelResponseId,currentUserSourceRef,authenticated}){
  if(!authenticated||!currentUserMessage.trim()||!modelAnswer.trim())return null;
  const lastAssistantIndex=priorTurns.map((t,i)=>t.role==='assistant'?i:-1).filter(i=>i>=0).at(-1);
  if(lastAssistantIndex===undefined)return null;
  const previous=priorTurns[lastAssistantIndex];
  const previousUser=priorTurns.slice(0,lastAssistantIndex).reverse().find(t=>t.role==='user');
  if(!previousUser)return null;
  const currentWords=new Set(terms(currentUserMessage));
  const responseWords=new Set(terms(modelAnswer));
  // Short acknowledgements and vague follow-ups cannot be classified reliably.
  if(currentWords.size<4||responseWords.size<6)return null;
  const responseReplay=tokenJaccard(modelAnswer,previous.text);
  const userTopicShift=tokenJaccard(currentUserMessage,previousUser.text);
  const currentRequestCoverage=tokenOverlap(currentUserMessage,modelAnswer);
  const priorRequestCoverage=tokenOverlap(previousUser.text,modelAnswer);
  // Prioritize high-evidence recycled answers. A repeated question is not drift.
  const stale=responseReplay>=0.58&&userTopicShift<=0.35&&currentRequestCoverage<=0.29;
  // Detect some paraphrased old-topic answers, but do not treat lexical
  // differences or synonym use alone as independent proof of wrong meaning.
  const oldTopic= !stale&&userTopicShift<=0.24&&
    currentRequestCoverage<=0.13&&priorRequestCoverage>=0.5&&
    responseReplay>=0.3;
  if(!stale&&!oldTopic)return null;
  const classification=stale?'STALE_RESPONSE_REPLAY':'POSSIBLE_CURRENT_TURN_MISALIGNMENT';
  return Object.freeze({
    issue_id:'conversation-drift:'+sha([continuityRootId,currentUserSourceRef,
      modelResponseId,classification,previous.source_ref]).slice(7,39),
    classification,origin_stage:'COGNITION',
    source_receipt_refs:[currentUserSourceRef,previousUser.source_ref,
      previous.source_ref,'model-response:'+modelResponseId],
    original_user_text:currentUserMessage.slice(0,400),
    observed_model_text:modelAnswer.slice(0,400),
    reason:'Reply appears to follow the previous turn rather than the current request',
    diagnostic_signals:{
      prior_response_similarity:responseReplay,
      prior_user_topic_similarity:userTopicShift,
      current_request_token_coverage:currentRequestCoverage,
      prior_request_token_coverage:priorRequestCoverage,
    },
    assessment_scope:'BOUNDED_LEXICAL_REPLAY_CANDIDATE_NOT_SEMANTIC_TRUTH',
    independently_adjudicated:false,verified_hallucination:false,
    auto_correction_authorized:false,
  });
}
// Consume explicit dependency links owned by the Cleaner. Do not re-parse
// raw history when this typed path is available. Other clause types remain
// visible to semantic review without becoming deterministic truth.
function typedConditionAnchors(context){
 const anchors=[];
 for(const record of [...context.history,context.current]){
  const byId=new Map(record.clauses.map(c=>[c.clause_id,c]));
  for(const clause of record.clauses){
   const condition=byId.get(clause.candidate_dependency?.condition_clause_id);
   if(!condition){
    // Preserve supported legacy conditions, but only within the Cleaner's
    // direct, source-scoped clauses (never arbitrary quoted history text).
    if(!clause.contains_quoted_text&&
      !clause.epistemic_modalities.some(m=>['QUOTED','HEARSAY','HYPOTHETICAL'].includes(m))&&
      ['PROHIBITION_CANDIDATE','CONSTRAINT_CANDIDATE','TASK_REQUEST_CANDIDATE'].includes(clause.kind)){
     for(const a of extractUserIntentAnchors(clause.exact_source_text,record.source_ref,0))
      anchors.push({...a,clause_id:clause.clause_id});
    }
    continue;
   }
   if(clause.kind!=='TASK_REQUEST_CANDIDATE')continue;
   if([clause,condition].some(c=>c.contains_quoted_text||
     c.epistemic_modalities.some(m=>['QUOTED','HEARSAY','HYPOTHETICAL'].includes(m))))continue;
   const action=clause.exact_source_text,requirement=condition.exact_source_text;
   const actionTokens=terms(action.replace(/^(?:and|then|please)\s+/i,''));
   const conditionTokens=terms(requirement);
   if(actionTokens.length<2||!conditionTokens.length)continue;
   anchors.push({anchor_id:'conversation:'+sha([record.source_ref,clause.clause_id,condition.clause_id]).slice(7,39),
    source_ref:record.source_ref,clause_id:clause.clause_id,condition_clause_id:condition.clause_id,
    original_user_text:requirement+', '+action,action_text:action,condition_text:requirement,
    action_tokens:actionTokens,condition_tokens:conditionTokens,
    authority:'USER_STATED_INTENT_NOT_EXTERNAL_FACT'});
  }
 }
 return anchors;
}
export function inspectConversationDrift({
 priorTurns=[],currentUserMessage='',modelAnswer='',continuityRootId,
 modelResponseId='untracked',currentUserSourceRef='current:user:signal',
 historySource='NOT_ATTESTED',cleanerConversationContext=null,
}={}){
 if(!nonempty(continuityRootId))return Object.freeze({
  version:CONVERSATIONAL_CONTINUITY_VERSION,status:'NO_CONTINUITY_ROOT',
  assessment_scope:'NOT_EVALUATED',anchors:[],findings:[],
  semantic_recall:null,detector_false_negative_rate:null});
 if(!Array.isArray(priorTurns)||typeof currentUserMessage!=='string'||typeof modelAnswer!=='string')
  throw Error('CONVERSATION_DRIFT_INPUT_INVALID');
 if(priorTurns.length>80)throw Error('CONVERSATION_HISTORY_BOUNDS_EXCEEDED');
 const authenticated=historySource==='AUTHENTICATED_CONVERSATION_MESSAGES';
 const eligible=authenticated?priorTurns:[],anchors=[],seen=new Set();
 for(let i=0;i<eligible.length;i++){
  const turn=eligible[i];
  if(!['user','assistant'].includes(turn?.role)||typeof turn?.text!=='string'||
     !nonempty(turn?.source_ref))throw Error('CONVERSATION_HISTORY_PROVENANCE_INVALID');
  if(turn.role!=='user')continue;
  for(const anchor of (cleanerConversationContext?[]:extractUserIntentAnchors(turn.text,turn.source_ref,i)))
   if(!seen.has(anchor.anchor_id)){seen.add(anchor.anchor_id);anchors.push(anchor)}
 }
 for(const anchor of (cleanerConversationContext?typedConditionAnchors(cleanerConversationContext):extractUserIntentAnchors(currentUserMessage,currentUserSourceRef,eligible.length)))
  if(!seen.has(anchor.anchor_id)){seen.add(anchor.anchor_id);anchors.push(anchor)}
 const findings=[],revisions=[];
 const turnAlignment=findTurnAlignmentCandidate({priorTurns:eligible,
   currentUserMessage,modelAnswer,continuityRootId,modelResponseId,
   currentUserSourceRef,authenticated});
 if(turnAlignment)findings.push(turnAlignment);
 for(const anchor of anchors){
  if(anchor.source_ref!==currentUserSourceRef&&possibleRevision(currentUserMessage,anchor)){
   revisions.push({anchor_id:anchor.anchor_id,status:'REVISION_PROPOSED_NOT_ADJUDICATED'});
   findings.push({
    issue_id:'conversation-drift:'+sha([continuityRootId,anchor.anchor_id,modelResponseId,'revision']).slice(7,39),
    classification:'CONVERSATIONAL_REVISION_REQUIRES_REVIEW',
    origin_stage:'COGNITION',source_receipt_refs:[anchor.source_ref,currentUserSourceRef],
    anchor_id:anchor.anchor_id,clause_id:anchor.clause_id||null,condition_clause_id:anchor.condition_clause_id||null,original_user_text:anchor.original_user_text,
    observed_model_text:currentUserMessage.slice(0,400),
    reason:'Customer revised a previously expressed condition; version history must be preserved',
    independently_adjudicated:false,verified_hallucination:false,
   });
   continue;
  }
  for(const clause of modelAnswer.split(/(?<=[.?!])\s+|\n+/)){
   const t=clause.trim();
   if(!t||nonAssertive(t)||!matchesAction(t,anchor)||
      negativeAction(t,anchor)||retainsCondition(t,anchor))continue;
   // Flag only an expressed proposal/commitment, not a casual topic mention.
   if(!/\b(?:i(?:'ll| will| am going to| plan to)|we(?:'ll| will| can| are going to)|let's|go ahead and|proceed to|ready to|now|next step is to|scheduled to|you can)\b/i.test(t))continue;
   findings.push({
    issue_id:'conversation-drift:'+sha([continuityRootId,anchor.anchor_id,modelResponseId,t]).slice(7,39),
    classification:'CONVERSATIONAL_PRECONDITION_DRIFT',
    origin_stage:'COGNITION',source_receipt_refs:[anchor.source_ref,'model-response:'+modelResponseId],
    anchor_id:anchor.anchor_id,clause_id:anchor.clause_id||null,condition_clause_id:anchor.condition_clause_id||null,original_user_text:anchor.original_user_text,
    expected_condition:anchor.condition_text,proposed_action:anchor.action_text,
    observed_model_text:t.slice(0,400),
    reason:'Assistant proposes an action but no longer carries the user-stated condition',
    independently_adjudicated:false,verified_hallucination:false,
   });
   break;
  }
 }
 return Object.freeze({
  version:CONVERSATIONAL_CONTINUITY_VERSION,
  status:findings.length?'EARLY_CONVERSATION_DRIFT_RISK':
   anchors.length?'LIMITED_CONVERSATION_CHECK_NO_FLAG':'NO_EXTRACTABLE_CONVERSATION_ANCHOR',
  assessment_scope:'EXPLICIT_CONDITIONS_AND_BOUNDED_CURRENT_TURN_ALIGNMENT',
  history_scope:authenticated?'AUTHENTICATED_PRIOR_TURNS_PLUS_CURRENT':'CURRENT_USER_TURN_ONLY',
  observed_prior_turn_count:eligible.length,anchor_count:anchors.length,
  coverage: {
   status:anchors.length?'LIMITED_PATTERN_COVERAGE':'INSUFFICIENT_ANCHOR_COVERAGE',
   received_prior_message_count:priorTurns.length,
   inspected_prior_message_count:eligible.length,
   extracted_anchor_count:anchors.length,
   interpretation_source:cleanerConversationContext?'SIGNAL_CLEANER_TYPED_INTAKE':'LEGACY_TEXT_PATTERNS',
   typed_clause_count:cleanerConversationContext?
    [...cleanerConversationContext.history,cleanerConversationContext.current].reduce((n,r)=>n+r.clauses.length,0):0,
   typed_source_refs:cleanerConversationContext?
    [...cleanerConversationContext.history,cleanerConversationContext.current].map(r=>({source_ref:r.source_ref,projection_digest:r.projection_digest})):[],
   typed_scope_and_negation_require_semantic_review:true,
   general_semantic_drift_assessed:false,
   no_findings_proves_no_drift:false,
  },
  anchors,revision_candidates:revisions,findings,
  unknown_semantic_claims_possible:true,
  semantic_recall:null,drift_rate:null,false_positive_rate:null,
  authoritative_state_mutated:false,action_authorized:false,
 });
}



// Accumulate recurring candidate drift using VERIFIED, source-scoped Continuity
// receipts. No fabricated 0% scores, and no silent reset at the tenth turn.
export function trackConversationalDriftAccumulation({priorReceipts=[],assessment,turn}={}){
 if(!Array.isArray(priorReceipts)||!Array.isArray(assessment?.findings)||
    !Number.isInteger(turn)||turn<1)throw Error('CONVERSATION_TRAJECTORY_REQUIRED');
 const tracked=assessment.findings.map(f=>{
   const recurrence=priorReceipts.filter(e=>
     e?.event_kind==='VERIFICATION' &&
     e?.payload?.event_type==='MODEL_OUTPUT_ASSESSMENT' &&
     Array.isArray(e.payload.conversational_drift?.findings) &&
     e.payload.conversational_drift.findings.some(p=>
       p.classification===f.classification &&
       (f.anchor_id?p.anchor_id===f.anchor_id:p.classification===f.classification)));
   const prev=recurrence.map(e=>e.payload.turn).filter(x=>Number.isInteger(x)&&x<turn);
   const count=prev.length+1;
   return Object.freeze({
     ...f,
     detected_turn:turn,
     first_detected_turn:prev.length?Math.min(...prev):turn,
     recurrence_count:count,
     escalation:count>=3?'REPEATED_DIRECTIONAL_DRIFT':count>=2?'RECURRING_CANDIDATE':'FIRST_OBSERVATION',
     independent_semantic_verdict:'NOT_PERFORMED',
     repair_verified_turn:null,
     auto_repair_authorized:false,
   });
 });
 return Object.freeze({
   ...assessment,findings:tracked,
   current_turn:turn,
   suspected_incidents:tracked.length,
   recurring_incidents:tracked.filter(f=>f.recurrence_count>=2).length,
   never_claims_zero_unobserved_drift:true,
 });
}

