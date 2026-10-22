export const REALITY_NATIVE_UNIVERSE_VERSION = 'reality-native-universe-v1.0';

export function buildNativeUniverseContext({ systemContext = {} } = {}) {
  const source = systemContext && typeof systemContext === 'object' ? systemContext : {};
  const supplied = Array.isArray(source.universe_entries) ? source.universe_entries : [];
  const worldObservations = Array.isArray(source.connected_world_observations) ? source.connected_world_observations : [];
  // Ingest the complete request-supplied view. The cognitive runtime selects
  // a bounded working view with explicit omission telemetry; silently slicing
  // here hid commitments before the selection step could see them.
  const entries = [...supplied, ...worldObservations].filter(Boolean);
  return Object.freeze({
    version: REALITY_NATIVE_UNIVERSE_VERSION,
    status: 'AVAILABLE',
    count: entries.length,
    entries: Object.freeze(entries),
    persistence: 'REQUEST_CONTEXT',
  });
}
