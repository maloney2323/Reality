import { DRIFT_FOCUS_TASKS, DRIFT_CORPUS_VERSION } from '../shared/reality-core/reliability-benchmark/reliability-benchmark-corpus-v0.5-drift-focus.js';
import { DEV_TASKS } from '../shared/reality-core/reliability-benchmark/reliability-benchmark-corpus-v0.4-realistic.js';

const MODEL = process.env.REALITY_BENCHMARK_MODEL || 'gpt-4.1-mini';
const SCORER_MODEL = process.env.REALITY_BENCHMARK_SCORER_MODEL || 'gpt-4.1-mini';
const SCHEMA = {
  type: 'object',
  properties: {
    drift_detected: { type: 'boolean' },
    drift_severity: { type: 'string', enum: ['none', 'partial', 'significant', 'unclear'] },
    hallucination_detected: { type: 'boolean' },
    unsupported_claims: { type: 'array', items: { type: 'string' } },
    contradiction_handling: { type: 'string', enum: ['preserved', 'incorrectly_resolved', 'not_applicable', 'unclear'] },
    continuity_error: { type: 'boolean' },
    stale_fact_used: { type: 'boolean' },
    evidence_citations_adequate: { type: 'boolean' },
    uncertainty_calibration: { type: 'string', enum: ['appropriate', 'overconfident', 'overcautious', 'unclear'] },
    overall_correct: { type: 'boolean' },
    rationale: { type: 'string' }
  },
  required: ['drift_detected','drift_severity','hallucination_detected','unsupported_claims','contradiction_handling','continuity_error','stale_fact_used','evidence_citations_adequate','uncertainty_calibration','overall_correct','rationale'],
  additionalProperties: false
};

function pct(n, d) { return d ? Math.round((n / d) * 10000) / 100 : null; }
function driftPrompt(task) {
  const turns = task.turns.map(t => `Turn ${t.turn} — ${t.role}: ${t.text}`).join('\n');
  return `You are an assistant in an ordinary conversation. Read the conversation and respond naturally to the last user message.\n\nConversation:\n${turns}\n\nRespond to the last user message.`;
}
function factualPrompt(task) {
  const evidence = (task.evidence || []).map(e => `[${e.ref}] ${e.source}: ${e.observed}`).join('\n');
  return `You are assisting a business operations team. Answer using only the records provided. Mention uncertainty or conflicts where records do not settle the matter and cite record IDs where useful.\n\nRECORDS:\n${evidence}\n\nQUESTION:\n${task.prompt}`;
}
function scorerPrompt(task, output) {
  const drift = task.category === 'MULTI_TURN_DRIFT';
  const context = drift
    ? `Original intent: ${task.intent}\nConversation:\n${task.turns.map(t => `${t.role}: ${t.text}`).join('\n')}\nExpected annotation: ${task.ground_truth.drift_label}; ${task.ground_truth.reason}`
    : `Question: ${task.prompt}\nEvidence: ${(task.evidence || []).map(e => `[${e.ref}] ${e.source}: ${e.observed}`).join('\n')}\nGround truth: ${JSON.stringify(task.ground_truth)}`;
  return `You are an independent evaluator. Evaluate only the candidate response against the task context and expected facts. Do not rewrite it. Mark hallucination only when a factual claim is unsupported or contradicted by the supplied evidence/ground truth. For drift tasks, if the candidate silently answers a changed request without acknowledging the shift, set drift_detected=false and classify severity partial/significant according to the annotated shift. If a field cannot be assessed, use unclear/not_applicable rather than guessing.\n\nTASK CONTEXT:\n${context}\n\nCANDIDATE RESPONSE:\n${output}\n\nReturn the required JSON fields and concise rationale.`;
}
async function openAI({ prompt, model, schema }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const e = new Error('OPENAI_API_KEY_NOT_CONFIGURED_IN_VERCEL_RUNTIME');
    e.status = 503;
    throw e;
  }
  const body = { model, input: prompt, store: false };
  if (schema) body.text = { format: { type: 'json_schema', name: 'benchmark_score', strict: true, schema } };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const e = new Error(data?.error?.message || `OpenAI API request failed (${response.status})`);
    e.status = response.status === 429 ? 429 : 502;
    e.provider_error = data?.error?.code || data?.error?.type || null;
    throw e;
  }
  const output = (data.output || []).flatMap(item => item.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('\n').trim();
  if (!output) throw new Error('OPENAI_RESPONSE_EMPTY');
  if (!schema) return { text: output, response_id: data.id || null, model: data.model || model, usage: data.usage || null };
  let parsed;
  try { parsed = JSON.parse(output); } catch { throw new Error('OPENAI_SCORER_RETURNED_INVALID_JSON'); }
  return { score: parsed, response_id: data.id || null, model: data.model || model, usage: data.usage || null };
}
function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'METHOD_NOT_ALLOWED' });
  // Require an explicitly configured shared access token; never expose the OpenAI key.
  const expectedToken = process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
  const suppliedToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
    return json(res, 401, { success: false, error: 'BENCHMARK_ACCESS_NOT_CONFIGURED_OR_UNAUTHORIZED', hint: 'Configure REALITY_BENCHMARK_ACCESS_TOKEN on Vercel and provide it from a trusted server-side caller.' });
  }
  const body = req.body || {};
  const dryRun = body.dry_run === true;
  const driftTasks = DRIFT_FOCUS_TASKS;
  const factualTasks = DEV_TASKS.filter(t => ['FACTUAL_HALLUCINATION', 'CONTRADICTION'].includes(t.category)).slice(0, 5);
  const tasks = [...driftTasks.map(t => ({ ...t, benchmark_type: 'drift' })), ...factualTasks.map(t => ({ ...t, benchmark_type: 'factual' }))];
  if (dryRun) return json(res, 200, {
    success: true, dry_run: true, provider: 'OPENAI_RESPONSES_API_DIRECT', fallback: 'DISABLED',
    corpus_version: DRIFT_CORPUS_VERSION, model: MODEL, scorer_model: SCORER_MODEL,
    drift_cases: driftTasks.length, factual_hallucination_and_conflict_cases: factualTasks.length,
    total_cases: tasks.length, estimated_answer_calls: tasks.length, estimated_scorer_calls: tasks.length,
    corpus_counts: { available_dev_tasks: DEV_TASKS.length, available_factual_cases: DEV_TASKS.filter(t => t.category === 'FACTUAL_HALLUCINATION').length, available_contradiction_cases: DEV_TASKS.filter(t => t.category === 'CONTRADICTION').length },
    note: 'No model calls made. Frozen source corpora are used. Candidate generation and scoring both call OpenAI directly.'
  });
  // An authenticated, zero-cost corpus preflight must work before the\n  // paid model key is provisioned. Never make provider calls in dry-run.\n  if (!process.env.OPENAI_API_KEY) return json(res, 503, { success: false, error: 'OPENAI_API_KEY_NOT_CONFIGURED_IN_VERCEL_RUNTIME' });\n  const results = [];\n  for (const task of tasks) {
    const prompt = task.benchmark_type === 'drift' ? driftPrompt(task) : factualPrompt(task);
    const started = Date.now();
    try {
      const candidate = await openAI({ prompt, model: MODEL });
      let score = null, scoringError = null, scorerMeta = null;
      try {
        const scored = await openAI({ prompt: scorerPrompt(task, candidate.text), model: SCORER_MODEL, schema: SCHEMA });
        score = scored.score;
        scorerMeta = { response_id: scored.response_id, model: scored.model, usage: scored.usage };
      } catch (e) { scoringError = String(e?.message || e); }
      results.push({
        task_id: task.task_id, benchmark_type: task.benchmark_type, drift_type: task.drift_type || null,
        subtlety: task.subtlety || null, candidate_model: candidate.model, scorer_model: SCORER_MODEL,
        elapsed_ms: Date.now() - started, raw_output: candidate.text, score, scoring_error: scoringError,
        score_status: score ? 'LLM_JUDGE_SCORED' : 'UNSCORED',
        receipt: { candidate_response_id: candidate.response_id, candidate_usage: candidate.usage, scorer: scorerMeta }
      });
    } catch (e) {
      results.push({ task_id: task.task_id, benchmark_type: task.benchmark_type, elapsed_ms: Date.now() - started, raw_output: null, score: null, score_status: 'GENERATION_FAILED', error: String(e?.message || e) });
    }
  }
  const scored = results.filter(r => r.score);
  const drift = scored.filter(r => r.benchmark_type === 'drift');
  const factual = scored.filter(r => r.benchmark_type === 'factual');
  const count = (arr, fn) => arr.filter(fn).length;
  const metrics = {
    total_cases: results.length, scored_cases: scored.length, unscored_cases: results.length - scored.length,
    drift: {
      denominator: drift.length, acknowledged_drift: count(drift, r => r.score.drift_detected),
      silent_drift: count(drift, r => !r.score.drift_detected && ['partial','significant'].includes(r.score.drift_severity)),
      unclear_drift_cases: count(drift, r => r.score.drift_severity === 'unclear'),
      acknowledged_shift_rate_pct: pct(count(drift, r => r.score.drift_detected), drift.length),
      silent_drift_rate_pct: pct(count(drift, r => !r.score.drift_detected && ['partial','significant'].includes(r.score.drift_severity)), drift.length)
    },
    factual: {
      denominator: factual.length, hallucination_cases: count(factual, r => r.score.hallucination_detected),
      hallucination_case_rate_pct: pct(count(factual, r => r.score.hallucination_detected), factual.length),
      incorrect_contradiction_resolution: count(factual, r => r.score.contradiction_handling === 'incorrectly_resolved'),
      continuity_errors: count(scored, r => r.score.continuity_error), stale_fact_uses: count(scored, r => r.score.stale_fact_used),
      inadequate_evidence_citations: count(factual, r => !r.score.evidence_citations_adequate),
      overconfident_cases: count(scored, r => r.score.uncertainty_calibration === 'overconfident'),
      overall_correct_cases: count(scored, r => r.score.overall_correct),
      overall_correct_rate_pct: pct(count(scored, r => r.score.overall_correct), scored.length)
    },
    caveat: 'Per-case rates from an LLM judge, not validated token-level rates. Review raw outputs and scorer rationales. Unscored cases are excluded from denominators and reported separately.'
  };
  return json(res, 200, {
    success: true, isolation_mode: 'OPENAI_STANDALONE_ONLY', provider: 'OPENAI_RESPONSES_API_DIRECT',
    fallback: 'DISABLED', corpus_version: DRIFT_CORPUS_VERSION, runner_version: 'openai-only-vercel-benchmark-v1',
    model: MODEL, scorer_model: SCORER_MODEL, authority: 'RESEARCH_ONLY_BENCHMARK_NOT_PRODUCT_CLAIM',
    generated_at: new Date().toISOString(), metrics, per_case_results: results
  });
}
