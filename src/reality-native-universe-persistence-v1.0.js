import crypto from 'node:crypto';
import { createUniverseEntry, validateUniverseEntry } from './reality-universe-persistence-contract-v1.0.js';

export const REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION =
  'reality-native-universe-persistence-v1.0';

function persistenceKey() {
  return process.env.REALITY_UNIVERSE_PERSISTENCE_KEY
    || process.env.supabase_secret_key
    || process.env.SUPABASE_SECRET_KEY
    || '';
}

function endpoint(path = '') {
  const base = process.env.REALITY_UNIVERSE_PERSISTENCE_URL || 'https://qkzvjfiegihyaoabiniy.supabase.co';
  return base.replace(/\/$/, '') + path;
}

function headers() {
  const key = persistenceKey();
  if (!key) {
    const error = new Error('UNIVERSE_PERSISTENCE_UNAVAILABLE');
    error.code = 'UNIVERSE_PERSISTENCE_UNAVAILABLE';
    throw error;
  }
  return {
    apikey: key,
    Authorization: 'Bearer ' + key,
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

// A successful POST is not a storage receipt. It must independently return
// the exact immutable entry under its original ID after the write.
async function verifyPersistedEntryReadback(canonical,fetchImpl){
  const fetched=await request(
    '/rest/v1/reality_universe_entries?entry_id=eq.'+
       encodeURIComponent(canonical.entry_id)+'&select=*',
    {method:'GET',headers:{Accept:'application/json'}},fetchImpl
  );
  const rows=await fetched.json();
  if(!Array.isArray(rows)||rows.length!==1)
    throw Error('UNIVERSE_WRITE_READBACK_NOT_UNIQUE');
  const observed=Object.freeze(mapRow(rows[0]));
  validateUniverseEntry(observed);
  if(observed.ledger_entry_hash!==canonical.ledger_entry_hash)
    throw Error('UNIVERSE_IMMUTABLE_ENTRY_VIOLATION');
  return observed;
}

export async function persistUniverseEntry(entry, { fetchImpl = fetch } = {}) {
  // NEVER recalculate an invalid caller-supplied hash into a valid-looking
  // record. Validate the original signed content before storage I/O.
  validateUniverseEntry(entry);
  const canonical=createUniverseEntry(entry);

  const found=await request(
    '/rest/v1/reality_universe_entries?entry_id=eq.'+
       encodeURIComponent(canonical.entry_id)+'&select=*',
    {method:'GET',headers:{Accept:'application/json'}},fetchImpl
  );
  const existingRows=await found.json();
  if(!Array.isArray(existingRows)||existingRows.length>1)
    throw Error('UNIVERSE_EXISTING_ENTRY_READBACK_INVALID');

  if(existingRows.length){
    const confirmed=await verifyPersistedEntryReadback(canonical,fetchImpl);
    return Object.freeze({
      version:REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
      status:'DUPLICATE_IDENTICAL',entry:confirmed,
    });
  }

  let response;
  try{
    response=await request('/rest/v1/reality_universe_entries',{
      method:'POST',headers:{Prefer:'return=representation'},
      body:JSON.stringify(canonical),
    },fetchImpl);
  }catch(error){
    // Competing writers can both observe the same empty snapshot. Only the
    // DB uniqueness constraint can arbitrate. On HTTP 409, independently
    // read back and accept ONLY the exact same immutable entry.
    if(error.status!==409)throw error;
    const confirmed=await verifyPersistedEntryReadback(canonical,fetchImpl);
    return Object.freeze({
      version:REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
      status:'DUPLICATE_IDENTICAL_CONCURRENT',entry:confirmed,
    });
  }

  const insertedRows=await response.json();
  if(!Array.isArray(insertedRows)||insertedRows.length!==1)
    throw Error('UNIVERSE_PERSISTENCE_WRITE_UNCONFIRMED');
  const inserted=mapRow(insertedRows[0]);
  validateUniverseEntry(inserted);
  if(inserted.ledger_entry_hash!==canonical.ledger_entry_hash)
    throw Error('UNIVERSE_PERSISTENCE_RESPONSE_MISMATCH');
  const verified=await verifyPersistedEntryReadback(canonical,fetchImpl);
  return Object.freeze({
    version:REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
    status:'PERSISTED',entry:verified,
  });
}

export async function retrievePersistedUniverse({
  continuityRootId = null,
  worldlineId = null,
  assertionTime = null,
  eventKind = null,
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
  // Allow retrieval by event kind so recent diagnostic activity cannot evict
  // authenticated conversation turns from the available history window.
  if (eventKind) {
    if (typeof eventKind !== 'string' || !/^[A-Z][A-Z0-9_]{1,96}$/.test(eventKind))
      throw Error('UNIVERSE_EVENT_KIND_FILTER_INVALID');
    params.set('event_kind', `eq.${eventKind}`);
  }

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


export async function retrieveDormantContinuitySummaries({
  worldlineId = null,
  limit = 1000,
  fetchImpl = fetch,
} = {}) {
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('event_kind', 'eq.CONTINUITY_STATE_TRANSITION');
  params.set('order', 'assertion_time.desc,effective_time.desc,ledger_entry_hash.asc');
  params.set('limit', String(Math.min(Math.max(Number(limit) || 1000, 1), 1000)));
  if (worldlineId) params.set('worldline_id', `eq.${worldlineId}`);

  const response = await request(`/rest/v1/reality_universe_entries?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, fetchImpl);

  const rows = await response.json();
  const entries = (Array.isArray(rows) ? rows : []).map(mapRow);
  entries.forEach(validateUniverseEntry);

  const dormantStates = new Set(['WAITING', 'BLOCKED', 'DEFERRED', 'SUSPENDED', 'COMPLETED']);
  const latestByRoot = new Map();

  for (const entry of entries) {
    const state = entry?.payload?.continuity_state || entry?.payload?.next_state || null;
    const root = entry?.continuity_root_id || null;
    if (!root || !dormantStates.has(state)) continue;
    if (!latestByRoot.has(root)) latestByRoot.set(root, entry);
  }

  const dormant = Array.from(latestByRoot.values());
  return Object.freeze({
    version: REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
    status: 'AVAILABLE',
    count: dormant.length,
    entries: Object.freeze(dormant),
    persistence: 'POSTGRES_SUBORDINATE',
    discovery_scope: 'ROOT_INDEPENDENT_DORMANT_CONTINUITY',
  });
}


export async function persistContinuityEvent(event, { fetchImpl = fetch } = {}) {
  const canonical = createUniverseEntry({
    entry_id: event.continuity_event_id,
    continuity_root_id: event.continuity_root_id,
    worldline_id: event.worldline_id || 'reality:primary',
    event_kind: 'CONTINUITY_STATE_TRANSITION',
    epistemic_kind: 'OBSERVATION',
    assertion_time: event.observed_at,
    effective_time: event.observed_at,
    source_ref: 'reality:continuous-continuity',
    payload: {
      continuity_state: event.next_state,
      prior_state: event.prior_state,
      next_state: event.next_state,
      trigger: event.trigger,
      work_item_id: event.work_item_id,
      rehydratable: event.rehydratable === true,
      continuity_event_version: event.continuity_event_version,
      ...event.payload,
    },
    evidence_references: event.evidence_references || [],
    provenance: {
      source: 'reality_continuous_continuity',
      continuity_event_id: event.continuity_event_id,
    },
  });
  return persistUniverseEntry(canonical, { fetchImpl });
}


// Read-after-write is a separate check from receiving a successful POST.
// A database-returned row is not evidence that the entry can be rehydrated.
export async function retrievePersistedUniverseEntry({ entryId, fetchImpl = fetch } = {}) {
  if(typeof entryId !== 'string' || !entryId.trim())
    throw new Error('UNIVERSE_ENTRY_ID_REQUIRED');
  const response=await request(
    '/rest/v1/reality_universe_entries?entry_id=eq.'+encodeURIComponent(entryId)+'&select=*',
    {method:'GET',headers:{Accept:'application/json'}},fetchImpl
  );
  const rows=await response.json();
  if(!Array.isArray(rows) || rows.length !== 1)
    throw new Error('UNIVERSE_ENTRY_READBACK_NOT_UNIQUE');
  const entry=Object.freeze(mapRow(rows[0]));
  validateUniverseEntry(entry);
  return entry;
}


/**
 * Full, point-in-time, root-scoped history scan. This is for reconstruction
 * and auditing, NOT a directive to feed every ledger entry into an LLM.
 * An exhausted scan is explicit: no hidden top-100 truncation.
 *
 * Fail rather than claim a complete history when a bounded scan is exhausted
 * at maxEntries, page ordering repeats an entry, or storage integrity fails.
 */
export async function retrieveCompleteContinuityHistory({
  continuityRootId,worldlineId=null,
  snapshotAssertionTime=new Date().toISOString(),
  pageSize=100,maxEntries=10000,fetchImpl=fetch,
}={}){
  if(typeof continuityRootId!=='string'||!continuityRootId.trim())
    throw Error('CONTINUITY_FULL_HISTORY_ROOT_REQUIRED');
  if(!Number.isFinite(Date.parse(snapshotAssertionTime)))
    throw Error('CONTINUITY_FULL_HISTORY_CUTOFF_INVALID');
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>1000||
     !Number.isInteger(maxEntries)||maxEntries<1)
    throw Error('CONTINUITY_FULL_HISTORY_BOUNDS_INVALID');
  const cutoff=new Date(snapshotAssertionTime).toISOString();
  const entries=[],seen=new Set();
  let offset=0,pages=0;
  while(true) {
    // When at the limit, request one further row. Do not silently report
    // that exactly maxEntries entries represents the entire history.
    const remaining=maxEntries-entries.length;
    const limit=Math.min(pageSize,remaining+1);
    const params=new URLSearchParams();
    params.set('select','*');
    params.set('continuity_root_id','eq.'+continuityRootId);
    if(worldlineId)params.set('worldline_id','eq.'+worldlineId);
    params.set('assertion_time','lte.'+cutoff);
    params.set('order','assertion_time.asc,effective_time.asc,ledger_entry_hash.asc');
    params.set('offset',String(offset));
    params.set('limit',String(limit));
    const response=await request('/rest/v1/reality_universe_entries?'+params,{
      method:'GET',headers:{Accept:'application/json'},
    },fetchImpl);
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length>limit)
      throw Error('CONTINUITY_FULL_HISTORY_INVALID_PAGE');
    pages++;
    for(const row of rows) {
      const entry=Object.freeze(mapRow(row));
      validateUniverseEntry(entry);
      if(entry.continuity_root_id!==continuityRootId||
          (worldlineId&&entry.worldline_id!==worldlineId)||
          Date.parse(entry.assertion_time)>Date.parse(cutoff))
        throw Error('CONTINUITY_FULL_HISTORY_SCOPE_MISMATCH');
      if(seen.has(entry.entry_id))throw Error('CONTINUITY_FULL_HISTORY_DUPLICATE_ENTRY');
      if(entries.length>=maxEntries)throw Error('CONTINUITY_FULL_HISTORY_LIMIT_REACHED');
      seen.add(entry.entry_id);
      entries.push(entry);
    }
    offset+=rows.length;
    if(rows.length<limit) break;
  }
  return Object.freeze({
    version:REALITY_NATIVE_UNIVERSE_PERSISTENCE_VERSION,
    status:'COMPLETE_AT_SNAPSHOT',
    completeness_scope:'DATABASE_ROWS_MATCHING_SNAPSHOT_QUERY',
    continuity_root_id:continuityRootId,worldline_id:worldlineId,
    assertion_time_cutoff:cutoff,limit_truncated:false,
    count:entries.length,pages_read:pages,
    entries:Object.freeze(entries),
    // Caller can compare this digest across restarts to detect a changed
    // snapshot. This digest is not evidence that a database holds all reality.
    history_hash:'sha256:'+entries.reduce(
      (acc,e)=>crypto.createHash('sha256')
        .update(acc+'|'+e.entry_id+'|'+e.ledger_entry_hash).digest('hex'),'seed'),
  });
}


// A narrow, principal-root-scoped state index query. This does NOT infer a
// continuity state from arbitrary signal, diagnostic or model output events.
// Older obligations must remain discoverable even after 100 newer signals.
export async function retrieveLatestPersistedContinuityTransition({
  continuityRootId,worldlineId=null,fetchImpl=fetch,
}={}) {
  if(typeof continuityRootId!=='string'||!continuityRootId.trim())
    throw Error('CONTINUITY_STATE_ROOT_REQUIRED');
  const params=new URLSearchParams();
  params.set('select','*');
  params.set('continuity_root_id','eq.'+continuityRootId);
  if(worldlineId)params.set('worldline_id','eq.'+worldlineId);
  params.set('event_kind','eq.CONTINUITY_STATE_TRANSITION');
  params.set('order','assertion_time.desc,effective_time.desc,ledger_entry_hash.asc');
  params.set('limit','1');
  const response=await request('/rest/v1/reality_universe_entries?'+params,{
    method:'GET',headers:{Accept:'application/json'},
  },fetchImpl);
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length>1)
    throw Error('CONTINUITY_STATE_INDEX_READBACK_INVALID');
  if(!rows.length)return null;
  const entry=Object.freeze(mapRow(rows[0]));
  validateUniverseEntry(entry);
  if(entry.continuity_root_id!==continuityRootId ||
     (worldlineId && entry.worldline_id!==worldlineId) ||
     entry.event_kind!=='CONTINUITY_STATE_TRANSITION')
    throw Error('CONTINUITY_STATE_INDEX_SCOPE_MISMATCH');
  return entry;
}

// Tenant-scoped continuity transition scan. It intentionally scans *only*
// state transitions, not every raw signal. No model-context truncation may
// silently hide an unfinished work item within this bounded source scan.
export async function retrieveScopedWorkItemTransitionHistory({
 continuityRootId,worldlineId='reality:primary',pageSize=100,
 maxTransitions=2000,fetchImpl=fetch,
}={}){
 if(typeof continuityRootId!=='string'||!continuityRootId.trim()||
    typeof worldlineId!=='string'||!worldlineId.trim())
  throw Error('WORK_ITEM_HISTORY_SCOPE_REQUIRED');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>1000||
    !Number.isInteger(maxTransitions)||maxTransitions<1)
  throw Error('WORK_ITEM_HISTORY_LIMIT_INVALID');
 const rows=[],ids=new Set();let offset=0,pages=0;
 while(true){
  const available=maxTransitions-rows.length;
  const limit=Math.min(pageSize,available+1);
  const q=new URLSearchParams();
  q.set('select','*');q.set('continuity_root_id','eq.'+continuityRootId);
  q.set('worldline_id','eq.'+worldlineId);
  q.set('event_kind','eq.CONTINUITY_STATE_TRANSITION');
  q.set('order','assertion_time.desc,effective_time.desc,ledger_entry_hash.asc');
  q.set('offset',String(offset));q.set('limit',String(limit));
  const response=await request('/rest/v1/reality_universe_entries?'+q,{
   method:'GET',headers:{Accept:'application/json'},
  },fetchImpl);
  const page=await response.json();
  if(!Array.isArray(page)||page.length>limit)
   throw Error('WORK_ITEM_HISTORY_INVALID_PAGE');
  pages++;
  for(const data of page){
   const entry=Object.freeze(mapRow(data));validateUniverseEntry(entry);
   if(entry.continuity_root_id!==continuityRootId||
      entry.worldline_id!==worldlineId||
      entry.event_kind!=='CONTINUITY_STATE_TRANSITION')
    throw Error('WORK_ITEM_HISTORY_SCOPE_MISMATCH');
   if(ids.has(entry.entry_id))throw Error('WORK_ITEM_HISTORY_DUPLICATE_ENTRY');
   if(rows.length>=maxTransitions)throw Error('WORK_ITEM_HISTORY_LIMIT_REACHED');
   ids.add(entry.entry_id);rows.push(entry);
  }
  offset+=page.length;
  if(page.length<limit)break;
 }
 return Object.freeze({
  status:'SCANNED_ALL_MATCHING_ROWS_WITHIN_LIMIT',
  scope:'ONE_CONTINUITY_ROOT_AND_WORLDLINE',count:rows.length,
  pages_read:pages,entries:Object.freeze(rows),
  // Offset pagination is not snapshot-isolated against concurrent backfills.
  transactionally_consistent_snapshot_proven:false,
  truncated:false,
 });
}
