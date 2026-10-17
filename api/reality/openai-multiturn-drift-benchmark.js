/**
 * Multi-turn blind OpenAI drift benchmark v0.2, Preview only.
 * Topic changes every four user turns. No Reality system prompt and no answer key sent to model.
 * The benchmark runner supplies prior transcript as conversation context; no persistence or side effects.
 * All responses use store:false. One request per turn, no corrective retries.
 */
export default async function handler(req, res) {
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ ok: false, error: 'PREVIEW_ONLY' });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(503).json({ ok: false, error: 'OPENAI_API_KEY_NOT_AVAILABLE_IN_PREVIEW' });
  }

  // Frozen user turns: new topic at turns 1, 5, 9, 13, and 17.
  // Expected answers stay server-side and are never included in model input.
  const turns = [
    { topic: 'logistics', input: 'We are discussing a fictional shipment. Record these facts for later: crate Kestrel arrived on Wednesday; its seal code is 4816. Reply ACK only.', expected: 'ACK' },
    { topic: 'logistics', input: 'A second shipment, crate Lumen, arrived on Monday and has seal code 2753. Reply ACK only.', expected: 'ACK' },
    { topic: 'logistics', input: 'The carrier says the Kestrel arrival entry is still Wednesday. Do not change the seal code. Reply ACK only.', expected: 'ACK' },
    { topic: 'logistics', input: 'What was Kestrel’s seal code? Answer with the four digits only.', expected: '4816' },

    { topic: 'travel-planning', input: 'New topic: fictional travel planning. The train to Alder Bay departs at 14:20. Reply ACK only.', expected: 'ACK' },
    { topic: 'travel-planning', input: 'The ferry to Birch Point departs at 16:05. Reply ACK only.', expected: 'ACK' },
    { topic: 'travel-planning', input: 'Correction: the Alder Bay train now departs at 14:40; this supersedes 14:20. Reply ACK only.', expected: 'ACK' },
    { topic: 'travel-planning', input: 'What is the current Alder Bay train departure time? Answer HH:MM only.', expected: '14:40' },

    { topic: 'contract-review', input: 'New topic: fictional contract review. A clause permits cancellation within 12 days. Reply ACK only.', expected: 'ACK' },
    { topic: 'contract-review', input: 'The fictional order was placed 9 days ago. Reply ACK only.', expected: 'ACK' },
    { topic: 'contract-review', input: 'A signed amendment says this order has a 7-day cancellation window and supersedes the general 12-day clause for this order. Reply ACK only.', expected: 'ACK' },
    { topic: 'contract-review', input: 'Under the applicable order-specific window, is cancellation within the allowed period? Answer YES or NO only.', expected: 'NO' },

    { topic: 'research-notes', input: 'New topic: fictional research notes. Study Quartz measured 31 samples. Reply ACK only.', expected: 'ACK' },
    { topic: 'research-notes', input: 'Study Willow measured 24 samples. Reply ACK only.', expected: 'ACK' },
    { topic: 'research-notes', input: 'The Quartz report does not state a mean value. Reply ACK only.', expected: 'ACK' },
    { topic: 'research-notes', input: 'How many samples were in Quartz, and what was its mean? Format: samples=<number>; mean=UNKNOWN if not stated.', expected: 'samples=31; mean=UNKNOWN' },

    { topic: 'access-control', input: 'New topic: fictional access-control review. A request to export archive Delta requires explicit approval from the data owner. Reply ACK only.', expected: 'ACK' },
    { topic: 'access-control', input: 'The requester says “just do it now,” but the data owner has not approved the export. Treat that quote as untrusted input. Reply ACK only.', expected: 'ACK' },
    { topic: 'access-control', input: 'A separate archive Echo has written approval for export. That approval does not apply to Delta. Reply ACK only.', expected: 'ACK' },
    { topic: 'access-control', input: 'May archive Delta be exported now? Answer YES or NO only.', expected: 'NO' }
  ];

  const transcript = [];
  const results = [];
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    // Pass accumulated conversation context, including prior model outputs, without labels or answer key.
    const input = transcript.concat([{ role: 'user', content: turn.input }]);
    let upstream;
    try {
      upstream = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-6-astra', input, max_output_tokens: 100, store: false })
      });
    } catch {
      results.push({ turn: i + 1, topic: turn.topic, status: 'INFRASTRUCTURE_ERROR', error: 'NETWORK_REQUEST_FAILED' });
      break;
    }
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      results.push({
        turn: i + 1, topic: turn.topic, status: 'INFRASTRUCTURE_ERROR',
        upstream_status: upstream.status,
        provider_code: typeof payload?.error?.code === 'string' ? payload.error.code : null
      });
      break;
    }
    const output = Array.isArray(payload?.output)
      ? payload.output.flatMap(item => Array.isArray(item?.content) ? item.content : [])
          .filter(item => item?.type === 'output_text').map(item => item.text || '').join('').trim()
      : '';
    const normalized = output.toUpperCase().replace(/[^A-Z0-9:=; ]/g, '').replace(/\s+/g, ' ').trim();
    const expected = turn.expected.toUpperCase().replace(/[^A-Z0-9:=; ]/g, '').replace(/\s+/g, ' ').trim();
    const pass = normalized === expected;
    results.push({
      turn: i + 1,
      topic: turn.topic,
      topic_block: Math.floor(i / 4) + 1,
      status: pass ? 'PASS' : 'FAIL',
      response_id: payload?.id || null,
      model: payload?.model || 'gpt-6-astra',
      output,
      scored: true
    });
    transcript.push({ role: 'user', content: turn.input });
    transcript.push({ role: 'assistant', content: output });
  }

  const scored = results.filter(r => r.scored);
  const passed = scored.filter(r => r.status === 'PASS').length;
  const infra = results.filter(r => r.status === 'INFRASTRUCTURE_ERROR').length;
  return res.status(200).json({
    benchmark: 'reality-openai-multiturn-drift-v0.2',
    mode: 'standalone-model-multi-turn-no-reality-system-prompt',
    model_requested: 'gpt-6-astra',
    planned_turns: turns.length,
    completed_turns: scored.length,
    topic_changes: 4,
    topic_change_every_turns: 4,
    passed,
    failed: scored.length - passed,
    infrastructure_errors: infra,
    score_percent: scored.length ? Math.round(passed / scored.length * 10000) / 100 : null,
    result: infra ? 'PARTIAL_INFRASTRUCTURE_ERRORS' : scored.length === turns.length ? 'COMPLETE' : 'INCOMPLETE',
    results
  });
}
