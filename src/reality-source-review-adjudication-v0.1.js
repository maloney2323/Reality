// Deterministic, narrow arbitration of reviewer-only UNSUPPORTED_FACT
// findings. This never treats an LLM reviewer as source truth.
// Confirm support only for an explicit, exact-value, source-attested claim
// whose SAME source text is the subject of a reviewer warning.
export const SOURCE_REVIEW_ADJUDICATION_VERSION='source-review-adjudication-v0.1';

const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const str=v=>typeof v==='string'?v:'';
const norm=v=>typeof v==='string'?v.trim().toUpperCase():JSON.stringify(v);
function hasStandaloneValue(text,value) {
  const q=str(text).toUpperCase(),v=str(value).toUpperCase();
  if(!q||!v)return false;
  let i=q.indexOf(v);
  while(i>=0) {
    const b=i?q[i-1]:' ',a=q[i+v.length]||' ';
    if(!/[A-Z0-9]/.test(b)&&!/[A-Z0-9]/.test(a))return true;
    i=q.indexOf(v,i+1);
  }
  return false;
}
export function adjudicateSourceReview({answer,review,candidate,sourceSnapshot}={}) {
  const raw=str(answer), issues=(review?.issues||[]).filter(i=>
    i?.kind==='UNSUPPORTED_FACT'&&str(i.quote)&&raw.includes(i.quote));
  const facts=new Map();
  for(const f of (sourceSnapshot?.facts||[])) {
    if(str(f.key)&&str(f.evidence_ref)&&own(f,'value')&&f.world_id===sourceSnapshot?.world_id) {
      // Multiple values per key are not resolved by this function.
      if(facts.has(f.key))facts.delete(f.key);
      else facts.set(f.key,f);
    }
  }
  const claims=(candidate?.claims||[]).filter(c=>
    str(c.key)&&str(c.original_quote)&&raw.includes(c.original_quote));
  const supported=[],unresolved=[];
  for(const issue of issues) {
    const q=issue.quote;
    // Strict: an issue must address a SINGLE literal occurrence in answer.
    const oneOccurrence=raw.indexOf(q)===raw.lastIndexOf(q);
    const matched=oneOccurrence&&claims.find(c=>{
      const fact=facts.get(c.key);
      if(!fact||candidate?.world_id!==sourceSnapshot?.world_id)return false;
      if(!Array.isArray(c.evidence_refs)||!c.evidence_refs.includes(fact.evidence_ref))return false;
      if(norm(c.value)!==norm(fact.value))return false;
      if(typeof fact.value!=='string')return false;
      if(!(c.original_quote===q||c.original_quote.includes(q)||q.includes(c.original_quote)))return false;
      if(!hasStandaloneValue(q,fact.value))return false;
      // A negated quote cannot certify affirmative source support.
      if(/\b(?:not|never|without|didn't|wasn't|isn't|no longer|if|unless|maybe|might|could|would|possibly|perhaps)\b/i.test(q))return false;
      return true;
    });
    if(matched) supported.push({
      issue_quote:q,source_key:matched.key,
      source_receipt:matched.evidence_refs.find(ref=>ref===facts.get(matched.key).evidence_ref),
      disposition:'EXACT_VALUE_SOURCE_SUPPORTED_REVIEW_FALSE_POSITIVE_CANDIDATE',
    });
    else unresolved.push({issue_quote:q,disposition:'NOT_SOURCE_ADJUDICATED'});
  }
  return Object.freeze({
    version:SOURCE_REVIEW_ADJUDICATION_VERSION,
    reviewer_unsupported_issue_count:issues.length,
    source_supported_issue_quotes:Object.freeze(supported),
    unresolved_issue_quotes:Object.freeze(unresolved),
    source_supported_count:supported.length,
    unresolved_count:unresolved.length,
    source_grounding_scope:'EXACT_VERBATIM_SOURCE_VALUE_ONLY',
    independently_proven_model_semantic_correctness:false,
    external_action_authorized:false,
  });
}
