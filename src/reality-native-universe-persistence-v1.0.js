import { createUniverseEntry, validateUniverseEntry } from './reality-universe-persistence-contract-v1.0.js';

export const REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION =
  'reality-native-universe-persistence-v1.0';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error('UNIVERSE_PERSISTENCE_UNAVAILABLE');
    error.code = 'UNIVERSE_PERSISTENCE_UNAVAILABLE';
    error.missing = name;
    throw error;
  }
  return value;
}

function endpoint(path = '') {
  return `${requiredEnv('REALITY_UNIVERSE_PERSISTENCE_URL').replace(/\/$/, '')}${path}`;
}

function headers() {
  return {
    apikey: requiredEnv('REALITY_UNIVERSE_PERSISTENCE_KEY'),
    Authorization: `Bearer ${requiredEnv('REALITY_UNIVERSE_PERSISTENCE_KEY')}`,
    'Content-Type': 'application/json',
  };
}

function mapRow(row) {
  return {
    entry_id: row.entry_id,
    continuity_root_id: row.continuity_root_id,
    worldline_id: row.worldline_id,
    event_kind: row.event_kind,
    epistemic_kind: row.epistemic_kind,
    assertion_time: row.assertion_time,
    effective_time: row.effective_time,
    source_ref: row.source_ref,
    payload: row.payload,
    evidence_references: row.evidence_references || [],
    provenance: row.provenance,
    ledger_entry_hash: row.ledger_entry_hash,
  };
}

async function request(path, options = {}, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(endpoint(path), {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) },
    });
  } catch (error) {
    const failure = new Error('UNIVERSE_PERSISTENCE_UNAVAILABLE');
    failure.code = 'UNIVERSE_PERSISTENCE_UNAVAILABLE';
    failure.cause = error;
    throw failure;
  }

  if (!response.ok) {
    const failure = new Error('UNIVERSE_PERSISTENCE_UNAVAILABLE');
    failure.code = 'UNIVERSE_PERSISTENCE_UNAVAILABLE';
    failure.status = response.status;
    throw failure;
  }
  return response;
}

export async function persistUniverseEntry(entry, { fetchImpl = fetch } = {}) {
  const canonical = createUniverseEntry(entry);
  validateUniverseEntry(canonical);

  const existingResponse = await request(
    `/rest/v1/reality_universe_entries?entry_id=eq.${encodeURIComponent(canonical.entry_id)}&select=*`,
    { method: 'GET', headers: { Accept: 'application/json' } },
    fetchImpl,
  );
  const existingRows = await existingResponse.json();
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  if (existing) {
    const existingEntry = mapRow(existing);
    validateUniverseEntry(existingEntry);
    if (existingEntry.ledger_entry_hash !== canonical.ledger_entry_hash) {
      const error = new Error('UNIVERSE_IMMUTABLE_ENTRY_VIOLATION');
      error.code = 'UNIVERSE_IMMUTABLE_ENTRY_VIOLATION';
      throw error;
    }
    return Object.freeze({
      version: REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
      status: 'DUPLICATE_IDENTICAL',
      entry: Object.freeze(existingEntry),
    });
  }

  const response = await request('/rest/v1/reality_universe_entries', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(canonical),
  }, fetchImpl);

  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error('UNIVERSE_PERSISTENCE_WRITE_UNCONFIRMED');

  return Object.freeze({
    version: REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
    status: 'PERSISTED',
    entry: Object.freeze(mapRow(row)),
  });
}

export async function retrievePersistedUniverse({
  continuityRootId = null,
  worldlineId = null,
  assertionTime = null,
  limit = 100,
  fetchImpl = fetch,
} = {}) {
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('order', 'assertion_time.desc,effective_time.desc,ledger_entry_hash.asc');
  params.set('limit', String(Math.min(Math.max(Number(limit) || 100, 1), 1000)));
  if (continuityRootId) params.set('continuity_root_id', `eq.${continuityRootId}`);
  if (worldlineId) params.set('worldline_id', `eq.${worldlineId}`);
  if (assertionTime) params.set('assertion_time', `lte.${assertionTime}`);

  const response = await request(`/rest/v1/reality_universe_entries?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, fetchImpl);

  const rows = await response.json();
  const entries = (Array.isArray(rows) ? rows : []).map(mapRow);
  entries.forEach(validateUniverseEntry);

  return Object.freeze({
    version: REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
    status: 'AVAILABLE',
    count: entries.length,
    entries: Object.freeze(entries),
    persistence: 'POSTGRES_SUBORDINATE',
  });
}
