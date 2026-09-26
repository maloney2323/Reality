import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import { admitObservationForPrincipal } from '../../shared/reality-core/observation-boundary.js';
import { cleanFragmentedSignals } from '../../shared/reality-core/fragmented-signal-cleaner.js';
import { validateWorkIntentAnchor } from '../../shared/personal-reality/work-intent-anchor.js';
import {
  cleanerSignalFromAdmittedLocalSignal,
  normalizeWorkObserverPacket,
} from '../../shared/personal-reality/work-session-telemetry.js';
import { persistProtectedWorkSessionTelemetry } from '../../shared/personal-reality/work-session-telemetry-persistence.js';

const MAX_ROWS = 20;

function cleanText(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function ownedWorkWorld(service: any, userId: string, worldId: string) {
  const rows = await service.entities.RealityWorld.filter({
    world_id: worldId,
    created_by_user_id: userId,
  }, '-created_date', 1, 0);
  const world = rows?.[0] || null;
  if (!world || world.world_type !== 'WORK' || world.ownership_kind !== 'PERSON') return null;
  return world;
}

async function exactAnchor(service: any, userId: string, worldId: string, sessionId: string) {
  const rows = await service.entities.WorkIntentAnchor.filter({
    user_id: userId,
    world_id: worldId,
    session_id: sessionId,
  }, '-anchored_at', 2, 0);
  if (!rows?.length) return null;
  if (rows.length !== 1) throw new Error('The Work session does not have exactly one frozen Intent Anchor.');
  validateWorkIntentAnchor(rows[0]);
  return rows[0];
}

function publicPacket(row: any) {
  return {
    packet_id: row.packet_id,
    session_id: row.session_id,
    anchor_id: row.anchor_id,
    contract_digest: row.contract_digest,
    observer_version: row.observer_version,
    received_at: row.received_at,
    raw_signal_count: row.raw_signal_count,
    canonical_signal_count: row.canonical_signal_count,
    exact_duplicate_count: row.exact_duplicate_count,
    unresolved_conflict_group_count: row.unresolved_conflict_group_count,
    observed_order_differs_from_receipt_order: row.observed_order_differs_from_receipt_order === true,
    missing_observed_time_count: row.missing_observed_time_count,
    interaction_labels: row.interaction_labels || [],
    observed_app_classes: row.observed_app_classes || [],
    authority: 'WORK_SESSION_TELEMETRY_CANONICALIZATION_ONLY',
    work_relevance_established: false,
    objective_workflow_occurrence_established: false,
    completion_established: false,
    recurrence_established: false,
    attention_protected_established: false,
    net_labor_return_established: false,
    action_authorized: false,
  };
}

async function recentPackets(service: any, userId: string, worldId: string, sessionId = '') {
  const query: any = { user_id: userId, world_id: worldId };
  if (sessionId) query.session_id = sessionId;
  const rows = await service.entities.WorkSessionTelemetryPacket.filter(query, '-received_at', MAX_ROWS, 0);
  return (rows || []).map(publicPacket);
}

async function ingestPacket({ base44, service, principal, body }: any) {
  const observerPacket = normalizeWorkObserverPacket(body?.packet);
  const world = await ownedWorkWorld(service, principal.id, observerPacket.world_id);
  if (!world) throw Object.assign(new Error('This Work World is unavailable to the signed-in user.'), { status: 404 });
  const anchor = await exactAnchor(service, principal.id, observerPacket.world_id, observerPacket.session_id);
  if (!anchor) throw Object.assign(new Error('That frozen Work Intent session is unavailable.'), { status: 404 });
  if (anchor.anchor_id !== observerPacket.anchor_id) throw Object.assign(new Error('Observer packet anchor_id does not match the frozen Work session.'), { status: 409 });
  if (anchor.contract_digest !== observerPacket.contract_digest) throw Object.assign(new Error('Observer packet contract digest does not match the frozen pre-work contract.'), { status: 409 });

  const packetId = `worktelemetry:${observerPacket.session_id}:${observerPacket.client_packet_key}`;
  const existing = await service.entities.WorkSessionTelemetryPacket.filter({
    user_id: principal.id,
    world_id: observerPacket.world_id,
    packet_id: packetId,
  }, '-received_at', 1, 0);
  if (existing?.[0]) return { row: existing[0], replayed: true };

  const receivedAt = new Date().toISOString();
  const admittedSignals: any[] = [];
  const admittedObservations: any[] = [];
  for (const localSignal of observerPacket.signals) {
    const safeContent = JSON.stringify({
      observer_version: observerPacket.observer_version,
      session_id: observerPacket.session_id,
      contract_digest: observerPacket.contract_digest,
      local_signal_id: localSignal.local_signal_id,
      observed_at: localSignal.observed_at,
      event_kind: localSignal.event_kind,
      app_class: localSignal.app_class,
      ...(localSignal.interaction ? {
        window_ms: localSignal.interaction.window_ms,
        observed_context_switch_count: localSignal.interaction.context_switch_count,
        observed_input_activity_change_count: localSignal.interaction.input_activity_change_count,
      } : {}),
      capture_policy: 'NO_WINDOW_TITLES_KEYS_CLIPBOARD_SCREENSHOTS_URLS_FILE_CONTENTS',
    });
    const admitted = await admitObservationForPrincipal({
      base44,
      principal,
      observation: {
        origin: `personal-reality:work-world:${observerPacket.world_id}:desktop-observer:${observerPacket.session_id}:${localSignal.local_signal_id}`,
        content: safeContent,
      },
    });
    admittedObservations.push(admitted);
    admittedSignals.push(cleanerSignalFromAdmittedLocalSignal({
      localSignal,
      admittedObservation: admitted,
      receivedAt,
      observerPacket,
    }));
  }

  const canonicalPacket = cleanFragmentedSignals({
    packet_id: packetId,
    signals: admittedSignals,
    reconciled_at: receivedAt,
  });
  if (canonicalPacket?.metadata?.authority !== 'CANONICALIZATION_ONLY') throw new Error('Signal Cleaner authority widened unexpectedly.');
  const row = await persistProtectedWorkSessionTelemetry({
    service,
    principal,
    observerPacket,
    anchor,
    canonicalPacket,
    admittedObservations,
    receivedAt,
  });
  return { row, replayed: false };
}

export default async function (req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return Response.json({ error: 'Authentication required.' }, { status: 401 });
    const service = base44.asServiceRole;
    const action = cleanText(body?.action, 40).toLowerCase() || 'status';

    if (action === 'status') {
      const worldId = cleanText(body?.world_id, 180);
      if (!worldId) return Response.json({ error: 'world_id is required.' }, { status: 400 });
      const world = await ownedWorkWorld(service, principal.id, worldId);
      if (!world) return Response.json({ error: 'This Work World is unavailable to the signed-in user.' }, { status: 404 });
      const sessionId = cleanText(body?.session_id, 260);
      return Response.json({
        packets: await recentPackets(service, principal.id, worldId, sessionId),
        authority: 'WORK_SESSION_TELEMETRY_CANONICALIZATION_ONLY',
        real_device_telemetry_established: false,
        work_relevance_established: false,
        completion_established: false,
        net_labor_return_established: false,
        action_authorized: false,
      });
    }

    if (action === 'ingest') {
      const result = await ingestPacket({ base44, service, principal, body });
      return Response.json({
        packet: publicPacket(result.row),
        replayed: result.replayed,
        canonicalized_by_real_fragmented_signal_cleaner: true,
        observer_payload_cannot_establish_completion_or_roi: true,
      });
    }

    return Response.json({ error: 'Unknown Work session telemetry action.' }, { status: 400 });
  } catch (error) {
    console.error('work-session-telemetry failed', error);
    return Response.json({
      error: 'Reality could not ingest this Work observer packet.',
      diagnostic: error?.message || String(error),
    }, { status: error?.status || 500 });
  }
}