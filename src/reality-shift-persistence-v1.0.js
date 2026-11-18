import crypto from 'node:crypto';

export const SHIFT_PERSISTENCE_VERSION = 'reality-shift-persistence-v1.0';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stableShiftUuid(kind, value) {
  if (typeof value === 'string' && uuidRe.test(value)) return value;
  if (value === null || value === undefined || value === '') throw new Error('SHIFT_ID_REQUIRED');
  const bits = crypto.createHash('sha256').update(JSON.stringify([kind, value])).digest('hex').slice(0, 32).split('');
  bits[12] = '5';
  bits[16] = ((parseInt(bits[16], 16) & 3) | 8).toString(16);
  const hex = bits.join('');
  return [hex.slice(0, 8),hex.slice(8, 12),hex.slice(12, 16),
    hex.slice(16, 20),hex.slice(20, 32)].join('-');
}

/**
 * The Universe's universe_events PKs, entity IDs and parent IDs are UUID.
 * Legacy Reality shift and operation code uses symbolic IDs; these must be
 * mapped deterministically at the persistence boundary, not silently passed
 * to Postgres as invalid UUID values.
 */
export function createShiftPersistenceAdapter(persistence) {
  if (!persistence?.appendEvent || !persistence?.reconstruct) throw new Error('SHIFT_PERSISTENCE_REQUIRED');
  return Object.freeze({
    ...persistence,
    appendEvent(event) {
      return persistence.appendEvent({
        ...event,
        event_id: stableShiftUuid('shift:event', event.event_id),
        entity_id: stableShiftUuid('shift:entity', event.entity_id),
        parent_event_id: event.parent_event_id == null ? null :
          stableShiftUuid('shift:event', event.parent_event_id),
      });
    },
  });
}

export function shiftRunIdForLocalDate(local, config) {
  if (!local?.year || !local?.month || !local?.day) throw new Error('SHIFT_LOCAL_DATE_REQUIRED');
  const start = String(config?.shiftStart || '21:00').split(':').map(Number);
  const nowMinutes = Number(local.hour) * 60 + Number(local.minute);
  let base = new Date(Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day)));
  const shiftMinutes = start[0] * 60 + start[1];
  const hours = Number(config?.shiftLength || 8);
  if (nowMinutes < shiftMinutes && ((nowMinutes - shiftMinutes + 1440) % 1440) < hours * 60) {
    base.setUTCDate(base.getUTCDate() - 1);
  }
  return 'shift:' + base.toISOString().slice(0, 10) + ':' + String(config?.shiftStart || '21:00');
}
