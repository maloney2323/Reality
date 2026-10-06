import crypto from 'node:crypto';

export const UNIVERSE_POSTGRES_PERSISTENCE_VERSION = '0.1.0';

function required(name, value) {
  if (!value || typeof value !== 'string') throw new Error(`${name}_REQUIRED`);
  return value;
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
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
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`UNIVERSE_POSTGRES_HTTP_${response.status}:${text.slice(0, 500)}`);
    }
    return text ? JSON.parse(text) : null;
  }

  async function appendEvent(event) {
    const record = {
      ...event,
      content_hash: event.content_hash || hash(event.payload),
      lineage_hash: event.lineage_hash || hash({
        parent_event_id: event.parent_event_id || null,
        continuity_root_id: event.continuity_root_id,
        worldline_id: event.worldline_id,
      }),
    };
    await request('universe_events', { method: 'POST', body: record, headers: { Prefer: 'return=representation' } });
    return record;
  }

  async function reconstruct({ continuityRootId, worldlineId, assertionTime = new Date().toISOString() }) {
    const params = new URLSearchParams({
      continuity_root_id: `eq.${required('CONTINUITY_ROOT_ID', continuityRootId)}`,
      worldline_id: `eq.${required('WORLDLINE_ID', worldlineId)}`,
      assertion_time: `lte.${assertionTime}`,
      order: 'assertion_time.asc,event_id.asc',
    });
    return request(`universe_events?${params.toString()}`);
  }

  async function getCapability(capabilityId, version) {
    const params = new URLSearchParams({
      capability_id: `eq.${required('CAPABILITY_ID', capabilityId)}`,
      capability_version: `eq.${required('CAPABILITY_VERSION', version)}`,
      limit: '1',
    });
    const rows = await request(`universe_capabilities?${params.toString()}`);
    return rows[0] || null;
  }

  return Object.freeze({
    version: UNIVERSE_POSTGRES_PERSISTENCE_VERSION,
    appendEvent,
    reconstruct,
    getCapability,
  });
}
