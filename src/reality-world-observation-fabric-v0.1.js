import crypto from 'node:crypto';

export const WORLD_OBSERVATION_FABRIC_VERSION = '0.1.0';

export const EPISTEMIC_STATUS = Object.freeze({
  OBSERVED: 'OBSERVED',
  NORMALIZED: 'NORMALIZED',
  RECONSTRUCTED: 'RECONSTRUCTED',
  INFERRED: 'INFERRED',
  UNKNOWN: 'UNKNOWN',
});

export const UNIVERSE_DOMAINS = Object.freeze({
  SOFTWARE: 'SOFTWARE',
  BUSINESS: 'BUSINESS',
  EXTERNAL: 'EXTERNAL',
});

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function list(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function iso(value, fallback = new Date().toISOString()) {
  const candidate = text(value) || fallback;
  if (!Number.isFinite(Date.parse(candidate))) throw new Error('OBSERVATION_TIMESTAMP_INVALID');
  return new Date(candidate).toISOString();
}
function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
}
function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function id(prefix, value) { return `${prefix}:${hash(value).slice(0, 32)}`; }

export function createObservation({
  source,
  domain,
  sourceRecordId,
  observedAt,
  eventTime,
  actorRefs = [],
  objectRefs = [],
  eventType,
  contentOrMetadata = {},
  provenance = {},
  freshness = null,
  accessScope = 'READ',
  reliability = 'UNSPECIFIED',
  epistemicStatus = EPISTEMIC_STATUS.OBSERVED,
} = {}) {
  if (!text(source)) throw new Error('OBSERVATION_SOURCE_REQUIRED');
  if (!text(domain)) throw new Error('OBSERVATION_DOMAIN_REQUIRED');
  if (!text(sourceRecordId)) throw new Error('OBSERVATION_SOURCE_RECORD_ID_REQUIRED');
  if (!text(eventType)) throw new Error('OBSERVATION_EVENT_TYPE_REQUIRED');

  const observation = {
    observation_id: id('observation', { source, sourceRecordId }),
    observation_version: WORLD_OBSERVATION_FABRIC_VERSION,
    source: text(source),
    domain: text(domain),
    source_record_id: text(sourceRecordId),
    observed_at: iso(observedAt),
    event_time: iso(eventTime, observedAt),
    actor_refs: list(actorRefs).map(String),
    object_refs: list(objectRefs).map(String),
    event_type: text(eventType),
    content_or_metadata: contentOrMetadata,
    provenance,
    freshness: freshness ? iso(freshness) : null,
    access_scope: text(accessScope) || 'READ',
    reliability: text(reliability) || 'UNSPECIFIED',
    epistemic_status: epistemicStatus,
  };
  return Object.freeze({ ...observation, observation_hash: `sha256:${hash(observation)}` });
}

export function normalizeGitHubCommit(commit, { observedAt } = {}) {
  return createObservation({
    source: 'GITHUB',
    domain: UNIVERSE_DOMAINS.SOFTWARE,
    sourceRecordId: commit.sha,
    observedAt,
    eventTime: commit.date || commit.committed_at,
    actorRefs: [commit.author?.login || commit.author?.email || commit.author?.name].filter(Boolean).map((v) => `actor:${String(v).toLowerCase()}`),
    objectRefs: [commit.repository ? `repository:${commit.repository}` : null].filter(Boolean),
    eventType: 'COMMIT',
    contentOrMetadata: { message: commit.message || '', sha: commit.sha, url: commit.url || null },
    provenance: { repository: commit.repository || null, url: commit.url || null },
    reliability: 'SOURCE_ATTESTED',
  });
}

export function normalizeGmailMessage(message, { observedAt } = {}) {
  const idValue = message.id || message.messageId || message.threadId;
  const actor = message.from?.email || message.from?.address || message.from || null;
  const participants = [
    actor,
    ...(Array.isArray(message.to) ? message.to : []),
    ...(Array.isArray(message.cc) ? message.cc : []),
  ].filter(Boolean).map((v) => `actor:${String(v).toLowerCase()}`);
  return createObservation({
    source: 'GMAIL',
    domain: UNIVERSE_DOMAINS.BUSINESS,
    sourceRecordId: idValue,
    observedAt,
    eventTime: message.date || message.internalDate,
    actorRefs: participants,
    objectRefs: [message.threadId ? `thread:${message.threadId}` : null].filter(Boolean),
    eventType: 'EMAIL_MESSAGE',
    contentOrMetadata: {
      subject: message.subject || '',
      snippet: message.snippet || message.bodyPreview || '',
      labels: list(message.labels),
    },
    provenance: { thread_id: message.threadId || null },
    reliability: 'SOURCE_ATTESTED',
  });
}

export function normalizeCalendarEvent(event, { observedAt } = {}) {
  const idValue = event.id || event.iCalUID;
  const attendees = list(event.attendees).map((a) => a.email || a.address || a.displayName).filter(Boolean);
  const actorRefs = [event.organizer?.email, ...attendees].filter(Boolean).map((v) => `actor:${String(v).toLowerCase()}`);
  return createObservation({
    source: 'CALENDAR',
    domain: UNIVERSE_DOMAINS.BUSINESS,
    sourceRecordId: idValue,
    observedAt,
    eventTime: event.start?.dateTime || event.start || event.date,
    actorRefs,
    objectRefs: [event.organizer?.email ? `calendar:${event.organizer.email}` : null].filter(Boolean),
    eventType: 'CALENDAR_EVENT',
    contentOrMetadata: {
      summary: event.summary || event.title || '',
      description: event.description || '',
      start: event.start?.dateTime || event.start || event.date || null,
      end: event.end?.dateTime || event.end || null,
      status: event.status || null,
    },
    provenance: { calendar_event_id: idValue },
    reliability: 'SOURCE_ATTESTED',
  });
}

export function createObservationFabric({ sources = [] } = {}) {
  const observations = [];
  const sourceRegistry = new Map();

  function registerSource({ source, domain, enabled = true, scope = 'READ', lastObservedAt = null } = {}) {
    if (!text(source) || !text(domain)) throw new Error('SOURCE_REGISTRATION_REQUIRED');
    sourceRegistry.set(source, { source, domain, enabled: Boolean(enabled), scope, last_observed_at: lastObservedAt });
  }

  for (const source of sources) registerSource(source);

  function ingest(observation) {
    const normalized = observation?.observation_id ? observation : createObservation(observation);
    if (normalized.access_scope !== 'READ') throw new Error('OBSERVATION_SCOPE_NOT_READ');
    observations.push(normalized);
    const source = sourceRegistry.get(normalized.source) || {
      source: normalized.source,
      domain: normalized.domain,
      enabled: true,
      scope: normalized.access_scope,
      last_observed_at: null,
    };
    source.last_observed_at = normalized.observed_at;
    sourceRegistry.set(normalized.source, source);
    return normalized;
  }

  function coverage({ now = new Date().toISOString(), staleAfterMs = 24 * 60 * 60 * 1000 } = {}) {
    const nowMs = Date.parse(now);
    return [...sourceRegistry.values()].map((source) => {
      const last = source.last_observed_at ? Date.parse(source.last_observed_at) : NaN;
      const age = Number.isFinite(last) ? Math.max(0, nowMs - last) : null;
      return {
        source: source.source,
        domain: source.domain,
        enabled: source.enabled,
        scope: source.scope,
        last_observed_at: source.last_observed_at,
        status: !source.enabled ? 'DISABLED' : age === null ? 'UNOBSERVED' : age > staleAfterMs ? 'STALE' : 'CURRENT',
        observation_count: observations.filter((o) => o.source === source.source).length,
      };
    });
  }

  return Object.freeze({
    version: WORLD_OBSERVATION_FABRIC_VERSION,
    registerSource,
    ingest,
    list: () => [...observations],
    coverage,
  });
}
