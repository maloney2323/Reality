// Read-only bridge from published evidence already displayed by Reality's homepage
// to authenticated Chat. These are published source references, not verified
// customer outcomes or permissions for external execution.
export const REALITY_CHAT_RESEARCH_BRIDGE_VERSION='reality-chat-research-bridge-v1';

export const PUBLISHED_REPAIR_EVIDENCE=Object.freeze({
  kind:'PUBLISHED_EXTERNAL_RESEARCH_REFERENCE',
  title:'Analyzing and predicting effort associated with finding & fixing software faults',
  authors:'Hamill & Goseva-Popstojanova',
  journal_year:'Information and Software Technology (2017)',
  source_url:'https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf',
  reference_location:'REALITY_HOMEPAGE_PUBLISHED_HUMAN_REPAIR_BENCHMARK',
  study_scope:'One NASA mission, historical software failures; university research hosted by NASA, not a NASA endorsement of Reality.',
  sample_scope:'1,257 reported failures analyzed; implementation-effort field recorded for 1,153 of them.',
  investigation_effort_median_hours:2,
  fix_implementation_effort_median_hours:3,
  combined_reference_hours:5,
  combined_reference_qualification:'Sum of two separately reported medians, not a measured median for total repairs.',
  confidence:'PUBLISHED_SOURCE_REFERENCE_NOT_INDEPENDENT_PROOF_OF_REALITY_SAVINGS',
  limitations:'These values do not establish time saved by Reality, human employee equivalents, or typical effort for every kind of software work.',
});
export const BLS_WAGE_SOURCE=Object.freeze({
  kind:'PUBLISHED_EXTERNAL_REFERENCE_LINK',
  title:'Bureau of Labor Statistics occupational employment and wages',
  source_url:'https://www.bls.gov/news.release/ocwage.t01.htm',
  reference_location:'REALITY_HOMEPAGE_PUBLISHED_HUMAN_REPAIR_BENCHMARK',
  limitations:'Wage rates are date and occupation specific. Verify the current value before using it; never imply measured customer savings.',
});

export function isPublicResearchRequest(message){
 const q=String(message||'').trim();
 if(!q||q.length>12000)return false;
 const research= /\b(search|searching|find|lookup|look up|research|browse|verify|check|cite|source|sources|retrieve|locate)\b/i.test(q);
 const publicScope=/\b(nasa|bls|bureau of labor statistics|public|web|online|internet|published|study|studies|scientific|government|labor statistics|labor data|wage statistics|industry research|market research|competitor research)\b/i.test(q);
 return Boolean((research&&publicScope)||/\b(search the (?:web|internet)|web search|browse online)\b/i.test(q));
}

export function publishedReferencesForChat(message){
 const q=String(message||'');
 if(!/\b(nasa|labor (?:statistics|statistic|research|effort|benchmark)|software (?:defect|fault|failure|repair)|human repair effort|bls|wages|economic value|roi|return on investment)\b/i.test(q))return [];
 return [PUBLISHED_REPAIR_EVIDENCE,BLS_WAGE_SOURCE];
}
