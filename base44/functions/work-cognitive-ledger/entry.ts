import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import {
  WORK_COGNITIVE_LEDGER_VERSION,
  occurrenceLedgerReceipt,
  reviewLedgerReceipt,
  secondsSince,
  summarizeWorkLedger,
  workWorkflowFingerprint,
} from '../../shared/personal-reality/work-cognitive-ledger.js';

const MAX_ROWS = 300;
const MAX_RECEIPTS = 120;

function cleanText(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function ownedWorkWorld(service: any, userId: string, worldId: string) {
  const rows = await service.entities.RealityWorld.filter({ world_id: worldId, created_by_user_id: userId }, '-created_date', 1, 0);
  const world = rows?.[0] || null;
  return world?.world_type === 'WORK' && world?.ownership_kind === 'PERSON' ? world : null;
}

async function currentProfile(service: any, userId: string, worldId: string) {
  const rows = await service.entities.WorkProfile.filter({ user_id: userId, world_id: worldId }, '-created_date', 1, 0);
  return rows?.[0] || null;
}

async function ensureReceipt(service: any, receipt: any) {
  if (!receipt?.ledger_entry_id || !receipt?.event_ref) return null;
  const prior = await service.entities.WorkCognitiveLedgerEntry.filter({
    user_id: receipt.user_id,
    world_id: receipt.world_id,
    ledger_entry_id: receipt.ledger_entry_id,
  }, '-created_at', 1, 0);
  return prior?.[0] || service.entities.WorkCognitiveLedgerEntry.create(receipt);
}

function publicReceipt(row: any) {
  const interaction = Number(row?.observed_review_interaction_ms);
  return {
    ledger_entry_id: row.ledger_entry_id,
    event_ref: row.event_ref,
    event_kind: row.event_kind,
    relevance_status: row.relevance_status,
    relevance_basis: row.relevance_basis,
    evidence_ref_count: Array.isArray(row.evidence_refs) ? row.evidence_refs.length : 0,
    evaluation_summary: row.evaluation_summary,
    attention_outcome: row.attention_outcome,
    action_outcome: row.action_outcome,
    human_involvement_status: row.human_involvement_status,
    observed_review_interaction_ms: Number.isFinite(interaction) ? Math.max(0, interaction) : null,
    restraint_reason: row.restraint_reason,
    boundary_age_seconds: Number(row.boundary_age_seconds) || 0,
    evidence_staleness_seconds: Number(row.evidence_staleness_seconds) || 0,
    labor_return_status: row.labor_return_status || 'NOT_MEASURED',
    created_at: row.created_at,
    automation_authorized: false,
    action_authorized: false,
  };
}

async function status(service: any, userId: string, worldId: string, fingerprint: string) {
  const rows = await service.entities.WorkCognitiveLedgerEntry.filter({
    user_id: userId,
    world_id: worldId,
    workflow_fingerprint: fingerprint,
  }, '-created_at', MAX_RECEIPTS, 0);
  return {
    ledger_version: WORK_COGNITIVE_LEDGER_VERSION,
    counts: summarizeWorkLedger(rows || []),
    relevance_baseline_contract: {
      denominator: 'Only current-workflow Work occurrences and explicit Work evidence reviews qualify in v0.1.',
      raw_source_packets_count_as_qualified_events: false,
      unscoped_connector_packets_count_as_qualified_events: false,
    },
    net_labor_return: {
      status: 'NOT_MEASURED',
      minutes: null,
      reason: 'No defensible baseline-duration plus full supervision-cost producer exists yet, so receipt counts are not converted into time saved.',
    },
    attention_protected: {
      status: 'NOT_YET_COUNTERFACTUALLY_MEASURED',
      reason: 'WITHHELD is an auditable evaluation outcome, but v0.1 does not claim every withheld item would otherwise have interrupted the user.',
    },
    receipts: (rows || []).slice(0, 24).map(publicReceipt),
    authority: 'WORK_COGNITIVE_LEDGER_AUDIT_ONLY',
    recurrence_established: false,
    labor_return_established: false,
    automation_authorized: false,
    action_authorized: false,
  };
}

async function sync(service: any, userId: string, worldId: string, profile: any) {
  const fingerprint = workWorkflowFingerprint(profile);
  const context = {
    userId,
    worldId,
    fingerprint,
    boundaryAge: secondsSince(profile?.updated_at || profile?.completed_at),
  };
  const [occurrences, reviews] = await Promise.all([
    service.entities.WorkWorkflowOccurrence.filter({ user_id: userId, world_id: worldId, workflow_fingerprint: fingerprint }, '-created_at', MAX_ROWS, 0),
    service.entities.WorkEvidenceReview.filter({ user_id: userId, world_id: worldId, workflow_fingerprint: fingerprint }, '-reviewed_at', MAX_ROWS, 0),
  ]);

  // Relevance Baseline Contract: raw connector traffic is intentionally absent here.
  // Only evidence already scoped to this Work workflow or explicitly reviewed inside it can post a receipt.
  for (const row of occurrences || []) await ensureReceipt(service, occurrenceLedgerReceipt(row, context));
  for (const row of reviews || []) await ensureReceipt(service, reviewLedgerReceipt(row, context));
  return status(service, userId, worldId, fingerprint);
}

export default async function (req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return Response.json({ error: 'Authentication required.' }, { status: 401 });

    const worldId = cleanText(body?.world_id, 180);
    if (!worldId) return Response.json({ error: 'world_id is required.' }, { status: 400 });
    const service = base44.asServiceRole;
    const [world, profile] = await Promise.all([
      ownedWorkWorld(service, principal.id, worldId),
      currentProfile(service, principal.id, worldId),
    ]);
    if (!world) return Response.json({ error: 'This Work World is unavailable to the signed-in user.' }, { status: 404 });
    if (!profile?.completed) return Response.json({ error: 'Complete Work understanding before opening the Cognitive Ledger.' }, { status: 409 });

    const action = cleanText(body?.action, 40).toLowerCase() || 'sync';
    if (action === 'sync') return Response.json(await sync(service, principal.id, worldId, profile));
    if (action === 'status') return Response.json(await status(service, principal.id, worldId, workWorkflowFingerprint(profile)));
    return Response.json({ error: 'Unknown Cognitive Ledger action.' }, { status: 400 });
  } catch (error) {
    console.error('work-cognitive-ledger failed', error);
    return Response.json({
      error: 'Reality could not update the Cognitive Ledger.',
      diagnostic: error?.message || String(error),
    }, { status: error?.status || 500 });
  }
}