export const REALITY_NATIVE_UNIVERSE_VERSION = 'reality-native-universe-v1.0';

export function buildNativeUniverseContext({ systemContext = {} } = {}) {
  const source = systemContext && typeof systemContext === 'object' ? systemContext : {};
  const supplied = Array.isArray(source.universe_entries) ? source.universe_entries : [];
  const entries = supplied.filter(Boolean).slice(0, 100);
  return Object.freeze({
    version: REALITY_NATIVE_UNIVERSE_VERSION,
    status: 'AVAILABLE',
    count: entries.length,
    entries: Object.freeze(entries),
    persistence: 'REQUEST_CONTEXT',
  });
}
