import crypto from 'node:crypto';

export const UNIVERSE_POSTGRES_PERSISTENCE_VERSION = '0.2.0-continuity-spine';

function required(name, value) {
  if (!value || typeof value !== 'string') throw new Error(name + '_REQUIRED');
  return value;
}
function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(k === undefined ? null : value[k])]));
}
function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function createUniversePostgresPersistence({
  url = process.env.SUPABASE_URL,
  secretKey = process.env.SUPABASE_SECRET_KEY,
} = {}) {
  const baseUrl = required('SUPABASE_URL', url).replace(/\/$/, '');
  const key = required('SUPABASE_SECRET_KEY', secretKey);

  async function request(path, { method = 'GET', body, headers = {} } = {}) {
    const response = await fetch(baseUrl + '/rest/v1/' + path, {
      method,
      headers: { apikey: key, 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const responseText = await response.text();
    if (!response.ok) throw new Error('UNIVERSE_POSTGRES_HTTP_' + response.status + ':' + responseText.slice(0, 500));
    return responseText ? JSON.parse(responseText) : null;
  }

  async function latestEvent({ continuityRootId, worldlineId }) {
    const params = new URLSearchParams({
      continuity_root_id: 'eq.' + required('CONTINUITY_ROOT_ID', continuityRootId),
      worldline_id: 'eq.' + required('WORLDLINE_ID', worldlineId),
      order: 'assertion_time.desc,event_id.desc',
      limit: '1',
    });
    const rows = await request('universe_events?' + params.toString());
    return rows[0] || null;
  }

  async function appendEvent(event) {
    const root = required('CONTINUITY_ROOT_ID', event?.continuity_root_id);
    const worldline = required('WORLDLINE_ID', event?.worldline_id);
    const prior = await latestEvent({ continuityRootId: root, worldlineId: worldline });

    const requestedParent = event.parent_event_id || null;
    if (requestedParent && prior && requestedParent !== prior.event_id) {
      throw new Error('CONTINUITY_APPEND_NOT_TAIL');
    }

    const parent = requestedParent || prior?.event_id || null;
    const priorLineageHash = event.prior_lineage_hash || prior?.lineage_hash || null;

    if (parent && !priorLineageHash) throw new Error('CONTINUITY_PRIOR_LINEAGE_HASH_REQUIRED');
    if (parent && prior && prior.lineage_hash && priorLineageHash !== prior.lineage_hash) {
      throw new Error('CONTINUITY_PRIOR_LINEAGE_HASH_MISMATCH');
    }

    const contentHash = event.content_hash || hash(event.payload);
    const lineageHash = event.lineage_hash || hash({
      continuity_spine_version: UNIVERSE_POSTGRES_PERSISTENCE_VERSION,
      parent_event_id: parent,
      continuity_root_id: root,
      worldline_id: worldline,
      event_id: event.event_id,
      event_kind: event.event_kind,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      effective_time: event.effective_time,
      assertion_time: event.assertion_time,
      epistemic_status: event.epistemic_status,
      evidence_refs: event.evidence_refs || [],
      payload: event.payload,
      provenance: event.provenance || {},
      content_hash: contentHash,
    });

    const record = {
      ...event,
      continuity_root_id: root,
      worldline_id: worldline,
      parent_event_id: parent,
      prior_lineage_hash: priorLineageHash,
      content_hash: contentHash,
      lineage_hash: lineageHash,
    };

    await request('universe_events', {
      method: 'POST',
      body: record,
      headers: { Prefer: 'return=representation' },
    });
    return record;
  }

  async function reconstruct({ continuityRootId, worldlineId, assertionTime = new Date().toISOString() }) {
    const params = new URLSearchParams({
      continuity_root_id: 'eq.' + required('CONTINUITY_ROOT_ID', continuityRootId),
      worldline_id: 'eq.' + required('WORLDLINE_ID', worldlineId),
      assertion_time: 'lte.' + assertionTime,
      order: 'assertion_time.asc,event_id.asc',
    });
    return request('universe_events?' + params.toString());
  }

  async function getCapability(capabilityId, version) {
    const params = new URLSearchParams({
      capability_id: 'eq.' + required('CAPABILITY_ID', capabilityId),
      capability_version: 'eq.' + required('CAPABILITY_VERSION', version),
      limit: '1',
    });
    const rows = await request('universe_capabilities?' + params.toString());
    return rows[0] || null;
  }

  return Object.freeze({
    version: UNIVERSE_POSTGRES_PERSISTENCE_VERSION,
    appendEvent,
    reconstruct,
    getCapability,
  });
}
