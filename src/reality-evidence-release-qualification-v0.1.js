// Reality evidence release: a reviewer-only warning is NOT a verified error.
// Preserve useful answers but disclose unresolved evidence disputes, anchored
// to exact answer text. No proof of falsity or authorization follows.
export const EVIDENCE_RELEASE_QUALIFICATION_VERSION='evidence-release-qualification-v0.1';

function anchoredIssues(answer,review) {
  if(typeof answer!=='string'||!Array.isArray(review?.issues))return [];
  const seen=new Set(),out=[];
  for(const x of review.issues){
    if(x?.kind!=='UNSUPPORTED_FACT'||typeof x.quote!=='string')continue;
    const q=x.quote.trim();
    if(!q||q.length>350||!answer.includes(q)||seen.has(q))continue;
    seen.add(q);
    out.push(Object.freeze({quote:q,kind:x.kind,
      reason:typeof x.reason==='string'?x.reason.slice(0,350):'SOURCE_COVERAGE_UNRESOLVED'}));
  }
  return out;
}
export function qualifyUnresolvedEvidence({
  originalAnswer,initialReview,repairVerified=false,
}={}){
  const answer=String(originalAnswer||'');
  const issues=anchoredIssues(answer,initialReview);
  if(repairVerified||!issues.length){
    return Object.freeze({answer,qualified:false,status:'NO_QUALIFICATION_NEEDED',
      issue_quotes:[]});
  }
  const excerpts=issues.slice(0,3).map(x=>
    '\u201c'+x.quote.replace(/[\r\n]+/g,' ').trim()+'\u201d').join('; ');
  const notice=[
    '**Reality evidence review \u2014 unresolved (not a verified correction):**',
    'The semantic reviewer raised an evidence concern about: '+excerpts+'.',
    'The review did not independently resolve whether connected records substantiate that claim.',
    'Do not treat the quoted claim as a verified operational result until the relevant source evidence is checked.',
    'This notice does not assert that the claim is false or that an external action occurred.',
  ].join(' ');
  return Object.freeze({
    answer:answer+(answer.endsWith('\n')?'\n':'\n\n')+notice,
    qualified:true,status:'ORIGINAL_RETAINED_WITH_UNRESOLVED_EVIDENCE_NOTICE',
    issue_quotes:issues.slice(0,3).map(x=>x.quote),
    independent_correction_verified:false,
  });
}
