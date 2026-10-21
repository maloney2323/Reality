// Read-only migration preflight. No model calls, no Base44 functions, no secret disclosure.
// This endpoint is intentionally server-to-server only; never place its bearer token in browser code.
import { timingSafeEqual } from 'node:crypto';

function authorized(req) {
  const expected = process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
  const actual = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!expected || !actual) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  if (!authorized(req)) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  const operation = req.body?.operation;
  if (operation !== 'preflight') return res.status(409).json({
    success: false, error: 'BUSINESS50_EXECUTION_NOT_MIGRATED',
    note: 'No paid execution is enabled. Frozen six-sector corpus, detectors, receipts and persistent storage must be ported and verified first.'
  });
  return res.status(200).json({
    success: true, operation: 'preflight', provider: 'OPENAI_RESPONSES_API_DIRECT',
    backend: 'VERCEL', api_key_configured: Boolean(process.env.OPENAI_API_KEY),
    benchmark_access_configured: Boolean(process.env.REALITY_BENCHMARK_ACCESS_TOKEN),
    corpus: 'business-adversarial-50-six-sector-v0.1',
    corpus_ported: false, detectors_ported: false, receipts_ported: false,
    ready_for_paid_execution: false, paid_model_calls: 0,
    note: 'Readiness inspection only. No model requests or Base44 backend calls.'
  });
}
