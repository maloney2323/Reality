import { createUniversePostgresPersistence } from '../src/reality-universe-postgres-persistence-v0.1.js';
import { buildShadowObservations, detectRecurringWork } from '../src/reality-shadow-observer-v0.1.js';

const REPO = process.env.REALITY_SHADOW_GITHUB_REPO || 'maloney2323/Reality';
const CONTINUITY_ROOT_ID = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1003';
const WORLDLINE_ID = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1004';

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

async function github(path) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Reality-Shadow-Observer/0.1',
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`GITHUB_HTTP_${response.status}:${text.slice(0, 300)}`);
  return JSON.parse(text);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });

  const cron = String(req.headers.authorization || '').startsWith('Bearer ')
    || String(req.headers['user-agent'] || '').includes('vercel-cron/');
  if (!cron && process.env.REALITY_SHADOW_ALLOW_MANUAL !== 'true') {
    return json(res, 401, { error: 'SHADOW_CRON_ONLY' });
  }

  try {
    const [owner, repo] = REPO.split('/');
    if (!owner || !repo) throw new Error('REALITY_SHADOW_GITHUB_REPO_INVALID');

    const commits = await github(`repos/${owner}/${repo}/commits?per_page=30`);
    const observations = buildShadowObservations({
      observedAt: new Date().toISOString(),
      commits: commits.map((c) => ({
        sha: c.sha,
        message: String(c.commit?.message || '').split('\n')[0],
        date: c.commit?.author?.date || c.commit?.committer?.date || null,
        author: c.author?.login || c.commit?.author?.name || null,
        repository: REPO,
        url: c.html_url || null,
      })),
    });

    const persistence = createUniversePostgresPersistence();
    let persisted = 0;
    let alreadyObserved = 0;

    for (const observation of observations) {
      try {
        await persistence.appendEvent({
          event_id: observation.observation_id,
          event_kind: 'observation',
          entity_type: 'shadow_activity',
          entity_id: observation.external_id,
          continuity_root_id: CONTINUITY_ROOT_ID,
          worldline_id: WORLDLINE_ID,
          parent_event_id: null,
          effective_time: observation.effective_at,
          assertion_time: observation.observed_at,
          epistemic_status: observation.epistemic_status,
          payload: observation,
          evidence_refs: [],
          provenance: observation.provenance,
          content_hash: observation.content_hash,
        });
        persisted += 1;
      } catch (error) {
        if (/HTTP_409|HTTP_23505|duplicate|already exists/i.test(error.message)) alreadyObserved += 1;
        else throw error;
      }
    }

    const history = await persistence.reconstruct({
      continuityRootId: CONTINUITY_ROOT_ID,
      worldlineId: WORLDLINE_ID,
    });

    const historyObservations = history
      .filter((event) => event.event_kind === 'observation' && event.entity_type === 'shadow_activity')
      .map((event) => event.payload);

    const candidates = detectRecurringWork(historyObservations);

    for (const candidate of candidates.slice(0, 10)) {
      try {
        await persistence.appendEvent({
          event_id: candidate.work_candidate_id,
          event_kind: 'work_candidate',
          entity_type: 'recurring_work',
          entity_id: candidate.work_candidate_id,
          continuity_root_id: CONTINUITY_ROOT_ID,
          worldline_id: WORLDLINE_ID,
          parent_event_id: null,
          effective_time: new Date().toISOString(),
          assertion_time: new Date().toISOString(),
          epistemic_status: candidate.epistemic_status,
          payload: candidate,
          evidence_refs: candidate.evidence_refs,
          provenance: {
            source: 'reality-shadow-observer-v0.1',
            repository: REPO,
          },
        });
      } catch (error) {
        if (!/HTTP_409|HTTP_23505|duplicate|already exists/i.test(error.message)) throw error;
      }
    }

    return json(res, 200, {
      ok: true,
      observer: 'reality-shadow-observer-v0.1',
      source: 'GITHUB',
      repository: REPO,
      observations_seen: observations.length,
      observations_persisted: persisted,
      observations_already_observed: alreadyObserved,
      history_observations: historyObservations.length,
      recurring_work_candidates: candidates,
      authority: 'NONE',
      execution: 'NOT_AUTHORIZED',
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      observer: 'reality-shadow-observer-v0.1',
      error: error.message,
      authority: 'NONE',
      execution: 'NOT_EXECUTED',
    });
  }
}
