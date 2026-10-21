// A single output-statement integrity check shared by every publication
// boundary. Model metadata saying "action=false" does not sanitize a narrative
// that claims an action happened. This does NOT independently fact-check source
// evidence; it enforces the no-execution contract of this test environment.
import {createHash} from 'node:crypto';
export const STATEMENT_INTEGRITY_VERSION='reality-statement-integrity-v0.1';
const hash=x=>createHash('sha256').update(JSON.stringify(x??null)).digest('hex');

const executorClaim=/\b(?:I|we|the\s+(?:system|agent|assistant|workflow|application)|Reality)\s+(?:(?:have|has)\s+)?(?:(?:already|successfully|just)\s+)?(?:wired|transferred|paid|sent\s+(?:the\s+)?(?:funds|money|payment)|executed|dispatched|deployed|updated|deleted|approved|released|notified|contacted|escalated)\b/i;
const completedExternal=/\b(?:payment|funds transfer|bank transfer|wire transfer|shipment|deployment|refund|external action|production write|human handoff|escalation|ticket)\s+(?:(?:(?:has\s+been|was|is)\s+(?:(?:already|successfully)\s+)?)|(?:(?:already|successfully)\s+))(?:completed|executed|sent|approved|delivered|accepted|confirmed|performed)\b/i;
const verifiedHandoff=/\b(?:human reviewer|review queue|escalation desk|receiving team|external provider|receiving system)\s+(?:has\s+)?(?:accepted|confirmed|received|acknowledged)\b/i;
const secretMaterial=/(?:\b(?:OPENAI_API_KEY|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|GITHUB_TOKEN)\s*[:=]\s*["']?[A-Za-z0-9_\-]{8,}|\b(?:sk-(?:proj-)?|ghp_|gho_|xoxb-)[A-Za-z0-9_\-]{12,}|\b(?:api\s*key|access\s*token|password|secret\s*key)\s+(?:is|equals)\s+["']?[A-Za-z0-9_\-]{12,})/i;

function positiveClaim(text,re){
  for(const match of text.matchAll(new RegExp(re.source, re.flags.includes('g')?re.flags:re.flags+'g'))){
    const prefix=text.slice(Math.max(0,match.index-24),match.index);
    // Explicit "No external action has been performed" is a denial.
    if(/\b(?:no|not|never|without)\s*$/i.test(prefix))continue;
    return true;
  }
  return false;
}

export function evaluateModelStatementIntegrity(candidateDecision){
  const narrative=candidateDecision?.reasoning;
  const text=typeof narrative==='string'?narrative:'';
  const codes=[];
  if(!text.trim())codes.push('MISSING_REASONING');
  if(positiveClaim(text,executorClaim)||positiveClaim(text,completedExternal)||positiveClaim(text,verifiedHandoff))
    codes.push('UNVERIFIED_EXTERNAL_EXECUTION_CLAIM');
  if(secretMaterial.test(text))codes.push('POSSIBLE_SECRET_MATERIAL');
  const data={
    schema:STATEMENT_INTEGRITY_VERSION,
    candidate_sha256:hash(candidateDecision),
    admissible:codes.length===0,
    reason_codes:codes,
    independent_source_truth_verified:false,
    independent_external_completion_verified:false,
  };
  return Object.freeze({...data,receipt_sha256:hash(data)});
}
