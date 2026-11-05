// Current-turn release guard for the existing Reality Chat model gateway.
// Fixes a demonstrated off-topic NASA research answer without changing
// the Continuity, publication, authorization or worker system.
import {PUBLISHED_REPAIR_EVIDENCE} from './reality-chat-research-bridge-v1.js';

export const CURRENT_TURN_RELEASE_VERSION='reality-current-turn-release-v1';

export function currentAuthenticatedQuestion(governedSignal){
 const fragments=Array.isArray(governedSignal?.fragments)?governedSignal.fragments:[];
 return fragments.map(x=>typeof x?.cleaned_text==='string'?x.cleaned_text.trim():'')
  .filter(Boolean).join(' ').slice(0,6000);
}
export function isNASARepairResearch(question){
 const q=String(question||'');
 return /\bnasa\b/i.test(q)&&
  /\b(?:software|defects?|faults?|bugs?|repair|investigat(?:ion|e|ing)|human (?:effort|labor))\b/i.test(q);
}
export function nasaResearchAnswerOnTopic({answer,urls=[]}={}){
 const text=String(answer||'');
 const hasResearch=/(?:hamill|goseva|nasa)/i.test(text);
 const hasDefectEffort=/(?:software.{0,45}(?:defect|fault|failure|repair)|(?:defect|fault|repair).{0,45}(?:effort|hours?|median|software)|(?:investigation|implementation).{0,45}(?:hours?|median))/i.test(text);
 const mentionsStudy=/(?:study|paper|research|median|technical report)/i.test(text);
 const cited=urls.some(x=>/^https:\/\/(?:[^/]+\.)?nasa\.gov\//i.test(String(x?.url||'')))||
  /https:\/\/ntrs\.nasa\.gov\//i.test(text);
 const unrelated=/(?:^|\W)(?:inflation rate|consumer price index|\bCPI\b|federal reserve|interest rate decision|energy prices)(?:\W|$)/i.test(text);
 return hasResearch&&hasDefectEffort&&mentionsStudy&&cited&&!unrelated;
}
export function publishedNASAAnswerWithProvenance(){
 const study=PUBLISHED_REPAIR_EVIDENCE;
 return [
  'The web search response did not provide a relevant NASA software-repair answer. I will not substitute unrelated news or claim that the search verified this study.',
  '',
  'Reality already cites a NASA-hosted university study by Hamill and Goseva-Popstojanova (2017) about investigation and repair effort in one NASA software mission:',
  study.source_url,
  '',
  'The published reference reports separate median efforts of 2 hours investigating a fault and 3 hours implementing a fix. Their sum, 5 hours, is an illustrative comparison only; it is NOT the observed median end-to-end repair time.',
  '',
  'Potential value: match a real, independently accepted Reality repair with a comparable human-work baseline, actual automation costs and measured human review time. Do not claim five saved hours, staff replaced or cash savings until an actual completed original job is independently verified.',
  '',
  'Status: published source reference available; this particular live web search did not establish a relevant external research result.'
 ].join('\n');
}
export function releaseCurrentTurnAnswer({
 question,answer,publicResearchEnabled=false,sourceUrls=[],
 chatWorkDispatches=false,
}={}){
 const current=String(question||'').trim();
 const initial=String(answer||'');
 if(publicResearchEnabled===true&&isNASARepairResearch(current)&&
    !nasaResearchAnswerOnTopic({answer:initial,urls:sourceUrls}))
  return Object.freeze({
    answer:publishedNASAAnswerWithProvenance(),
    disposition:'OFF_TOPIC_WEB_RESEARCH_REPLACED_WITH_KNOWN_PUBLISHED_REFERENCE',
    independent_external_retrieval_verified:false,
    external_execution_authorized:false,
  });
 const asksToStart=/(?:\b(?:start|begin|proceed|continue|run|execute|launch)\b.{0,80}\b(?:investigation|diagnosis|repair|governed|development|work(?:er)?|full.loop|8.hour.shift)\b|\b(?:investigation|diagnosis|full.loop)\b.{0,80}\b(?:now|start|continue|proceed|begin)\b)/i.test(current);
 const claimsStarted=/(?:^|[.\n]\s*)(?:starting|proceeding|executing|investigating now|i (?:am|will now|have already|just) (?:start|begin|proceed|investigat|run|execut))/i.test(initial);
 if(chatWorkDispatches===false&&asksToStart&&claimsStarted)
  return Object.freeze({
   answer:'Your request to begin the governed investigation is understood, but this ordinary Chat reply has not admitted an original job or dispatched a worker. I must not say an investigation has started without an owner-bound original work ID, a durable work-order receipt, and a verified worker acknowledgment. Reality already has a separate authenticated Run Full Loop controller for that step. Use the Run Full Loop action on the main Reality page; that path checks eligibility and prevents settled-job replay. An installation would still require your separate exact approval. No execution was triggered by this Chat reply.',
   disposition:'UNVERIFIED_WORK_START_CLAIM_BLOCKED',
   independent_external_retrieval_verified:false,
   external_execution_authorized:false,
  });
 return Object.freeze({
  answer:initial,disposition:'ORIGINAL_ANSWER_WITHIN_BOUNDED_CHECK',
  independent_external_retrieval_verified:publicResearchEnabled===true?null:false,
  external_execution_authorized:false,
 });
}
