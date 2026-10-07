import crypto from 'node:crypto';
import { createUniversePostgresPersistence } from '../../src/reality-universe-postgres-persistence-v0.1.js';
import { buildShadowObservations } from '../../src/reality-shadow-observer-v0.1.js';
import { reconstructOperationalWork, analyzeOwnership, analyzeCapabilityAndAuthority, createDiscoveredWork, validateDiscoveredWork, prioritizeDiscoveredWork } from '../../src/reality-discovered-work-v0.1.js';
import { runLiveIntelligenceOrchestration } from '../../src/reality-live-intelligence-orchestration-v0.1.js';
import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';
import { buildRealitySelfQuestionAgenda, buildSelfQuestionPrompt } from '../../src/reality-self-question-engine-v1.0.js';
import { evaluateOperatingConstitution, constitutionalEvidenceFromShift } from '../../src/reality-operating-constitution-v1.0.js';

const CONFIG_ROOT = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1001';
const WORLDLINE = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1002';
const SHADOW_REPO = process.env.REALITY_SHADOW_GITHUB_REPO || 'maloney2323/Reality';
const SHADOW_CONTINUITY_ROOT_ID = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1003';
const SHADOW_WORLDLINE_ID = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1004';

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function cronRequest(req) {
  return String(req.headers.authorization || '').startsWith('Bearer ')
    || String(req.headers['user-agent'] || '').includes('vercel-cron/');
}

async function githubCommits() {
  const [owner, repo] = SHADOW_REPO.split('/');
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Reality-Autonomous-Shift/0.1' },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`GITHUB_HTTP_${r.status}:${t.slice(0,300)}`);
  return JSON.parse(t);
}

async function readConfig(persistence) {
  const events = await persistence.reconstruct({ continuityRootId: CONFIG_ROOT, worldlineId: WORLDLINE });
  const configs = events.filter(e => e.entity_type === 'shift_configuration').sort((a,b) =>
    String(a.assertion_time).localeCompare(String(b.assertion_time)));
  return configs.at(-1)?.payload || null;
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}

function withinShift(nowMinutes, startMinutes, lengthHours) {
  let elapsed = nowMinutes - startMinutes;
  if (elapsed < 0) elapsed += 1440;
  return elapsed >= 0 && elapsed < lengthHours * 60;
}

async function runTick({ config, phase, local, persistence }) {
  const tickId = `shift:tick:${local.year}-${local.month}-${local.day}:${local.hour}:${local.minute}:${phase}`;
  try {
    await persistence.appendEvent({
      event_id: tickId,
      event_kind: 'observation',
      entity_type: 'shift_tick',
      entity_id: tickId,
      continuity_root_id: CONFIG_ROOT,
      worldline_id: WORLDLINE,
      parent_event_id: null,
      effective_time: new Date().toISOString(),
      assertion_time: new Date().toISOString(),
      epistemic_status: 'OBSERVED',
      payload: { phase, local, config, status: 'STARTED' },
      evidence_refs: [],
      provenance: { source: 'reality-autonomous-shift-v0.1' },
    });
  } catch (e) {
    if (/23505|409|duplicate|already exists/i.test(e.message)) return { skipped: true, tick_id: tickId };
    throw e;
  }

  const commits = await githubCommits();
  const observations = buildShadowObservations({
    observedAt: new Date().toISOString(),
    commits: commits.map(c => ({
      sha: c.sha, message: String(c.commit?.message || '').split('\n')[0],
      date: c.commit?.author?.date || c.commit?.committer?.date || null,
      author: c.author?.login || c.commit?.author?.name || null,
      repository: SHADOW_REPO, url: c.html_url || null,
    })),
  });

  let persisted = 0;
  for (const o of observations) {
    try {
      await persistence.appendEvent({
        event_id: o.observation_id, event_kind: 'observation', entity_type: 'shadow_activity',
        entity_id: o.external_id, continuity_root_id: SHADOW_CONTINUITY_ROOT_ID,
        worldline_id: SHADOW_WORLDLINE_ID, parent_event_id: null,
        effective_time: o.effective_at, assertion_time: o.observed_at,
        epistemic_status: o.epistemic_status, payload: o, evidence_refs: [],
        provenance: o.provenance, content_hash: o.content_hash,
      });
      persisted++;
    } catch (e) {
      if (!/23505|409|duplicate|already exists/i.test(e.message)) throw e;
    }
  }

  const history = await persistence.reconstruct({
    continuityRootId: SHADOW_CONTINUITY_ROOT_ID,
    worldlineId: SHADOW_WORLDLINE_ID,
  });
  const historyObservations = history
    .filter(e => e.event_kind === 'observation' && e.entity_type === 'shadow_activity')
    .map(e => e.payload);
  const reconstructions = reconstructOperationalWork({ observations: historyObservations });
  const discoveredWork = reconstructions.map((reconstruction) => {
    const ownership = analyzeOwnership(reconstruction);
    const capabilityAuthority = analyzeCapabilityAndAuthority(reconstruction);
    return validateDiscoveredWork(createDiscoveredWork({
      reconstruction,
      ownership,
      capabilityAuthority,
      materiality: reconstruction.classification === 'RECURRING' ? 'HIGH' : 'MEDIUM',
      proposedNextAction: capabilityAuthority.disposition === 'AWAITING_CAPABILITY'
        ? 'OPEN_CAPABILITY_GAP'
        : capabilityAuthority.disposition === 'AWAITING_AUTHORITY'
          ? 'REQUEST_EXPLICIT_AUTHORITY'
          : 'PREPARE_GOVERNED_WORK',
      verificationRequirements: ['Independent observation must support completion before reconciliation.'],
    }));
  });
  const prioritizedWork = prioritizeDiscoveredWork(discoveredWork).slice(0, 20);

  const constitution = evaluateOperatingConstitution({
    evidence: constitutionalEvidenceFromShift({
      discovered_work_count: prioritizedWork.length,
      authority: 'NONE_UNLESS_EXPLICITLY_GRANTED_PER_WORK_ITEM',
      verification_plan: 'INDEPENDENT_OBSERVATION_REQUIRED',
    }),
  });

  const selfQuestionAgenda = buildRealitySelfQuestionAgenda({
    phase,
    evidence: {
      repository: SHADOW_REPO,
      recent_observation_count: observations.length,
      discovered_work_count: prioritizedWork.length,
      recurring_work_count: prioritizedWork.filter(w => w.classification === 'RECURRING').length,
      authority: 'NONE_UNLESS_EXPLICITLY_GRANTED_PER_WORK_ITEM',
      execution: 'FAIL_CLOSED',
      verification_plan: 'INDEPENDENT_OBSERVATION_REQUIRED',
      live_observation_count: observations.length,
    },
  });

  const mission = [
    'Operate Reality as a governed autonomous business operating shift.',
    'Constitutional state: ' + constitution.state + '. Never claim responsibility or authority that the constitution has not established.',
    'Do not begin by asking what feature to build. Begin by asking what Reality needs to know to operate the business successfully.',
    buildSelfQuestionPrompt(selfQuestionAgenda),
    'Find concrete unfinished, recurring, repetitive, blocked, risky, or high-value work from observed evidence.',
    'Prioritize work that can remove real operational load from the owner.',
    'Inspect system health, regressions, integrations, governance, product gaps, competitive developments, and capability gaps.',
    'Do not manufacture work merely to fill the shift.',
    'Do not convert inference into authority and do not execute consequential actions without explicit authorization.',
    phase === 'READINESS'
      ? 'Prepare the shift: establish current evidence, identify likely work, capability gaps, risks, and what must be authorized before execution.'
      : 'Begin the shift: turn sufficiently evidenced findings into governed work candidates, execute only already-authorized work, independently verify results, and carry unfinished work forward.'
  ].join('\n');

  const evidence = {
    operating_constitution: constitution,
    self_question_agenda: selfQuestionAgenda,
    phase, observed_at: new Date().toISOString(), repository: SHADOW_REPO,
    recent_observation_count: observations.length,
    newly_persisted_observations: persisted,
    discovered_work: prioritizedWork,
    recurring_work_candidates: prioritizedWork.filter(w => w.classification === 'RECURRING'),
    authority: 'NONE_UNLESS_EXPLICITLY_GRANTED_PER_WORK_ITEM',
    execution: 'FAIL_CLOSED',
  };

  const intelligence = await runLiveIntelligenceOrchestration({
    message: mission,
    requestedBy: 'reality-autonomous-shift',
    systemContext: JSON.stringify({ shift_config: config, evidence }),
  });

  const result = {
    tick_id: tickId, phase, local, evidence_summary: evidence,
    intelligence_mode: intelligence.mode,
    work: intelligence.work || null,
    execution: intelligence.execution,
  };

  await persistence.appendEvent({
    event_id: tickId + ':result',
    event_kind: 'observation',
    entity_type: 'shift_result',
    entity_id: tickId,
    continuity_root_id: CONFIG_ROOT,
    worldline_id: WORLDLINE,
    parent_event_id: tickId,
    effective_time: new Date().toISOString(),
    assertion_time: new Date().toISOString(),
    epistemic_status: 'OBSERVED',
    payload: result,
    evidence_refs: prioritizedWork.flatMap(c => c.evidence_refs || []),
    provenance: { source: 'reality-autonomous-shift-v0.1' },
  });

  return result;
}

export default async function handler(req, res) {
  try {
    const persistence = createUniversePostgresPersistence();

    if (req.method === 'POST') {
      const principal = getOrCreateSessionPrincipal(req, res);
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const config = {
        enabled: b.enabled === true,
        readinessTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.readinessTime)) ? b.readinessTime : '20:00',
        shiftStart: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.shiftStart)) ? b.shiftStart : '21:00',
        shiftLength: [8, 12].includes(Number(b.shiftLength)) ? Number(b.shiftLength) : 8,
        timeZone: typeof b.timeZone === 'string' && b.timeZone ? b.timeZone : 'America/New_York',
        updated_by: principal.principal_id,
        updated_at: new Date().toISOString(),
      };
      const eventId = 'shift:config:' + crypto.randomUUID();
      await persistence.appendEvent({
        event_id: eventId, event_kind: 'governance', entity_type: 'shift_configuration',
        entity_id: eventId, continuity_root_id: CONFIG_ROOT, worldline_id: WORLDLINE,
        parent_event_id: null, effective_time: config.updated_at, assertion_time: config.updated_at,
        epistemic_status: 'OBSERVED', payload: config, evidence_refs: [],
        provenance: { source: 'reality-homepage-shift-settings', principal_id: principal.principal_id },
      });
      return json(res, 200, { ok: true, config, persisted: true });
    }

    if (req.method !== 'GET') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });

    if (!cronRequest(req)) {
      const config = await readConfig(persistence);
      return json(res, 200, { ok: true, config, runtime: 'server_backed' });
    }

    const config = await readConfig(persistence);
    if (!config?.enabled) return json(res, 200, { ok: true, status: 'DISABLED' });

    const now = new Date();
    const local = localParts(now, config.timeZone || 'America/New_York');
    const nowMinutes = Number(local.hour) * 60 + Number(local.minute);
    const [rh, rm] = String(config.readinessTime || '20:00').split(':').map(Number);
    const [sh, sm] = String(config.shiftStart || '21:00').split(':').map(Number);
    const readiness = rh * 60 + rm;
    const start = sh * 60 + sm;

    let phase = null;
    if (nowMinutes === readiness) phase = 'READINESS';
    if (nowMinutes === start) phase = 'SHIFT_START';
    if (!phase && withinShift(nowMinutes, start, Number(config.shiftLength || 8)) && Number(local.minute) % 15 === 0) phase = 'OPERATING';

    if (!phase) return json(res, 200, { ok: true, status: 'WAITING', local, config });

    const result = await runTick({ config, phase, local, persistence });
    return json(res, 200, { ok: true, status: 'WORKED', result });
  } catch (error) {
    return json(res, 500, { ok: false, status: 'ERROR', error: error.message });
  }
}
