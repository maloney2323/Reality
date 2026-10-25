// A deliberately narrow shared lexical check, not semantic adjudication.
// Reject only a whole, single denied/prohibited action clause. Mixed clauses
// remain reviewable: a denial of publishing must not hide an affirmed email.
export function isExplicitActionDenial(quote) {
  const text=String(quote||'').trim().replace(/[.!]$/, '');
  if(/[.!?;\n]/.test(text)||/\b(?:but|however|and|then)\b/i.test(text))return false;
  const action='(?:send|sent|publish|published|deploy|deployed|execute|executed|issue|issued|contact|contacted|email|emailed|complete|completed)';
  if(new RegExp('^No attempt to '+action+'\\b[^.!?;]* (?:has|have|had) been made$','i').test(text))return true;
  return new RegExp('^(?:(?:I|we|you|it|they|the system|Reality)\\s+)?(?:(?:did|does|do|has|have|had|was|were|is|are|will|would)\\s+not|never|not|didn’t|didn\'t|haven’t|haven\'t|hasn’t|hasn\'t|won’t|won\'t)\\s+(?:(?:been|yet|actually)\\s+){0,2}'+action+'\\b[^.!?;]*$','i').test(text);
}
