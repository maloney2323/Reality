import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import { admitObservationForPrincipal } from '../../shared/reality-core/observation-boundary.js';

const LOOP_VERSION = 'work-evidence-loop-v0.1';
const OCCURRENCE_VERSION = 'work-workflow-occurrence-v0.1';
const REVIEW_VERSION = 'work-evidence-review-v0.1';
const REVIEW_AUTHORITY = 'AUTHENTICATED_USER_WORK_EVIDENCE_REVIEW_ONLY';
const CALENDAR_SOURCE = 'GOOGLE_CALENDAR';
const MAX_TEXT = 500;
const MAX_CANDIDATES = 8;
const MAX_CALENDAR_ROWS = 240;
const MAX_OCCURRENCES = 240;

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function cleanText(value: unknown, max = MAX_TEXT) {
  return nonEmpty(value) ? value.trim().slice(0, max) : '';
}

function exactIso(value: unknown, fallback: string | null = null) {
  if (!nonEmpty(value)) return fallback;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
}

function workflowName(profile: any) {
  return cleanText(profile?.workflow_knowledge?.workflow_name, 180) || 'Reported Work workflow';
}

function hasReportedWorkflow(profile: any) {
  const workflow = profile?.workflow_knowledge || {};
  return Boolean(
    cleanText(workflow.workflow_name)
    || cleanText(workflow.trigger)
    || Array.isArray(workflow.inputs) && workflow.inputs.length
    || Array.isArray(workflow.decision_points) && workflow.decision_points.length
    || Array.isArray(workflow.normal_actions) && workflow.normal_actions.length
    || Array.isArray(workflow.exceptions) && workflow.exceptions.length
    || Array.isArray(workflow.outputs) && workflow.outputs.length
  );
}

function workflowFingerprint(profile: any) {
  const workflow = profile?.workflow_knowledge || {};
  const canonical = JSON.stringify({
    workflow_name: cleanText(workflow.workflow_name, 180),
    trigger: cleanText(workflow.trigger, 400),
    inputs: cleanList(workflow.inputs),
    decision_points: cleanList(workflow.decision_points),
    normal_actions: cleanList(workflow.normal_actions),
    exceptions: cleanList(workflow.exceptions),
    outputs: cleanList(workflow.outputs),
    dependencies: cleanList(workflow.dependencies),
    consequences: cleanList(workflow.consequences),
  });
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `workflow-v0.1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function loopMatchesCurrentWorkflow(loop: any, profile: any) {
  return Boolean(loop?.workflow_fingerprint && loop.workflow_fingerprint === workflowFingerprint(profile));
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

async function currentProfile(service: any, userId: string, worldId: string) {
  const rows = await service.entities.WorkProfile.filter({ user_id: userId, world_id: worldId }, '-created_date', 1, 0);
  return rows?.[0] || null;
}

async function currentLoop(service: any, userId: string, worldId: string) {
  const rows = await service.entities.WorkEvidenceLoopState.filter({ user_id: userId, world_id: worldId }, '-updated_at', 1, 0);
  return rows?.[0] || null;
}

async function currentCalendarSource(service: any, userId: string) {
  const rows = await service.entities.PersonalCalendarSource.filter({ user_id: userId, source: CALENDAR_SOURCE }, '-created_date', 1, 0);
  return rows?.[0] || null;
}

async function saveLoop(service: any, userId: string, worldId: string, existing: any, profile: any, patch: any) {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    world_id: worldId,
    loop_version: LOOP_VERSION,
    status: existing?.status || 'ACTIVE',
    workflow_name_snapshot: workflowName(profile),
    workflow_fingerprint: workflowFingerprint(profile),
    calendar_binding_enabled: existing?.calendar_binding_enabled === true,
    calendar_id: existing?.calendar_id || '',
    started_at: existing?.started_at || now,
    ...(existing?.paused_at ? { paused_at: existing.paused_at } : {}),
    ...(existing?.calendar_bound_at ? { calendar_bound_at: existing.calendar_bound_at } : {}),
    updated_at: now,
    automation_authorized: false,
    action_authorized: false,
    ...patch,
  };
  return existing
    ? service.entities.WorkEvidenceLoopState.update(existing.id, payload)
    : service.entities.WorkEvidenceLoopState.create(payload);
}

function latestCalendarVersions(rows: any[]) {
  const latest = new Map<string, any>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const eventId = cleanText(row?.external_event_id, 512);
    const updated = Date.parse(row?.external_updated_at || '');
    if (!eventId || !Number.isFinite(updated)) continue;
    const prior = latest.get(eventId);
    if (!prior || updated > Date.parse(prior.external_updated_at || '')) latest.set(eventId, row);
  }
  return [...latest.values()];
}

function isPastCandidate(row: any, nowMs: number) {
  if (!row?.observation_ref) return false;
  if (row.event_status === 'CANCELLED') return false;
  if (row.transparency === 'TRANSPARENT') return false;
  if (row.self_response_status === 'DECLINED') return false;
  const end = Date.parse(row.end_value || '');
  return Number.isFinite(end) && end <= nowMs;
}

function publicCandidate(row: any) {
  return {
    source: CALENDAR_SOURCE,
    calendar_id: row.calendar_id,
    external_event_id: row.external_event_id,
    source_observation_ref: row.observation_ref,
    summary: row.summary || '(Untitled calendar event)',
    start_value: row.start_value,
    end_value: row.end_value,
    all_day: row.all_day === true,
    event_status: row.event_status,
    self_response_status: row.self_response_status,
    source_authority: 'AUTHENTICATED_USER_CALENDAR_OBSERVATION_ONLY',
    real_world_occurrence_established: false,
  };
}

async function candidateCalendarEvents(service: any, userId: string, loop: any, currentFingerprint: string) {
  if (!loop || loop.workflow_fingerprint !== currentFingerprint || loop.status !== 'ACTIVE' || loop.calendar_binding_enabled !== true || !loop.calendar_id) return [];
  const rows = await service.entities.PersonalCalendarObservation.filter({
    user_id: userId,
    source: CALENDAR_SOURCE,
    calendar_id: loop.calendar_id,
  }, '-external_updated_at', MAX_CALENDAR_ROWS, 0);
  const reviews = await service.entities.WorkEvidenceReview.filter({ user_id: userId, world_id: loop.world_id, workflow_fingerprint: currentFingerprint }, '-reviewed_at', MAX_CALENDAR_ROWS, 0);
  const reviewedRefs = new Set((reviews || []).map((row: any) => row?.source_observation_ref).filter(Boolean));
  const nowMs = Date.now();
  return latestCalendarVersions(rows || [])
    .filter((row) => isPastCandidate(row, nowMs))
    .filter((row) => !reviewedRefs.has(row.observation_ref))
    .sort((a, b) => Date.parse(b.end_value || '') - Date.parse(a.end_value || ''))
    .slice(0, MAX_CANDIDATES)
    .map(publicCandidate);
}

async function occurrenceRows(service: any, userId: string, worldId: string, currentFingerprint: string) {
  return service.entities.WorkWorkflowOccurrence.filter({ user_id: userId, world_id: worldId, workflow_fingerprint: currentFingerprint }, '-created_at', MAX_OCCURRENCES, 0);
}

function publicOccurrence(row: any) {
  return {
    occurrence_id: row.occurrence_id,
    workflow_name_snapshot: row.workflow_name_snapshot,
    occurrence_kind: row.occurrence_kind,
    occurred_at: row.occurred_at,
    summary: row.summary,
    outcome: row.outcome || '',
    exception_notes: row.exception_notes || '',
    evidence_status: row.evidence_status,
    source_observation_count: Array.isArray(row.source_observation_refs) ? row.source_observation_refs.length : 0,
    created_at: row.created_at,
    real_world_occurrence_established: false,
    recurrence_established: false,
    automation_authorized: false,
    action_authorized: false,
  };
}

async function statusPayload(service: any, userId: string, worldId: string, profile: any, loop: any) {
  const currentFingerprint = workflowFingerprint(profile);
  const workflowChanged = Boolean(loop && loop.workflow_fingerprint !== currentFingerprint);
  const [calendarSource, occurrences, candidates, laborRows] = await Promise.all([
    currentCalendarSource(service, userId),
    occurrenceRows(service, userId, worldId, currentFingerprint),
    candidateCalendarEvents(service, userId, loop, currentFingerprint),
    service.entities.WorkLaborReturnRecord.filter({ user_id: userId, world_id: worldId }, '-period_end', 1, 0),
  ]);
  const rows = occurrences || [];
  const userReported = rows.filter((row: any) => row.evidence_status === 'USER_REPORTED_ONLY').length;
  const evidenceLinked = rows.filter((row: any) => row.evidence_status === 'CONNECTED_SOURCE_PLUS_USER_CONFIRMATION').length;
  const observedEarned = evidenceLinked > 0;
  return {
    loop: loop ? {
      status: loop.status,
      loop_version: loop.loop_version || LOOP_VERSION,
      workflow_name_snapshot: loop.workflow_name_snapshot || workflowName(profile),
      workflow_fingerprint: loop.workflow_fingerprint || '',
      calendar_binding_enabled: loop.calendar_binding_enabled === true,
      calendar_id: loop.calendar_id || '',
      started_at: loop.started_at || null,
      paused_at: loop.paused_at || null,
      calendar_bound_at: loop.calendar_bound_at || null,
      updated_at: loop.updated_at || null,
    } : {
      status: 'NOT_STARTED',
      loop_version: LOOP_VERSION,
      workflow_name_snapshot: workflowName(profile),
      workflow_fingerprint: currentFingerprint,
      calendar_binding_enabled: false,
      calendar_id: '',
      started_at: null,
      paused_at: null,
      calendar_bound_at: null,
      updated_at: null,
    },
    current_workflow_fingerprint: currentFingerprint,
    workflow_model_changed_since_learning_started: workflowChanged,
    calendar: {
      connection_status: calendarSource?.connection_status || 'NOT_CONNECTED',
      calendar_id: calendarSource?.calendar_id || 'primary',
      last_sync_at: calendarSource?.last_sync_at || null,
      explicit_work_binding: !workflowChanged && loop?.calendar_binding_enabled === true,
      work_event_titles_visible: !workflowChanged && loop?.status === 'ACTIVE' && loop?.calendar_binding_enabled === true,
    },
    candidates,
    counts: {
      user_reported_occurrences: userReported,
      evidence_linked_occurrences: evidenceLinked,
      total_occurrences: rows.length,
    },
    recent_occurrences: rows.slice(0, 6).map(publicOccurrence),
    progression: {
      reported: hasReportedWorkflow(profile),
      observed: observedEarned,
      recurring: false,
      understood: false,
      help_candidate: false,
      automation_candidate: false,
    },
    labor_return_measured: Boolean(laborRows?.[0]?.evidence_refs?.length && laborRows?.[0]?.measurement_method),
    authority: 'WORK_EVIDENCE_LOOP_EVIDENCE_LINKAGE_ONLY',
    real_world_occurrence_established: false,
    recurring_workflow_established: false,
    workflow_truth_established: false,
    work_intent_truth_established: false,
    labor_return_measurement_created: false,
    automation_authorized: false,
    action_authorized: false,
  };
}

async function admitOccurrenceStatements({ base44, principal, worldId, workflow, occurredAt, summary, outcome, exceptionNotes }: any) {
  const origin = (field: string) => `personal-reality:work-world:${worldId}:workflow-occurrence:${field}`;
  const statements = [
    { origin: origin('reported-time'), content: `I report that I performed ${workflow} at ${occurredAt}.` },
    { origin: origin('reported-summary'), content: `What happened while I performed ${workflow}: ${summary}` },
  ];
  if (outcome) statements.push({ origin: origin('reported-outcome'), content: `The outcome I report for ${workflow} was: ${outcome}` });
  if (exceptionNotes) statements.push({ origin: origin('reported-exception'), content: `An exception or unusual part I report for ${workflow} was: ${exceptionNotes}` });
  const refs: string[] = [];
  for (const statement of statements) {
    const admitted = await admitObservationForPrincipal({ base44, principal, observation: statement });
    refs.push(admitted.id);
  }
  return refs;
}

async function createUserReportedOccurrence({ base44, service, principal, worldId, profile, body }: any) {
  const workflow = workflowName(profile);
  const fingerprint = workflowFingerprint(profile);
  const clientKey = cleanText(body?.client_occurrence_key, 140);
  const occurrenceId = clientKey ? `workocc:${worldId}:${fingerprint}:${clientKey}` : `workocc:${worldId}:${fingerprint}:${crypto.randomUUID()}`;
  const existing = await service.entities.WorkWorkflowOccurrence.filter({ user_id: principal.id, world_id: worldId, occurrence_id: occurrenceId }, '-created_at', 1, 0);
  if (existing?.[0]) return existing[0];

  const now = new Date().toISOString();
  const occurredAt = exactIso(body?.occurred_at, now);
  if (!occurredAt) throw new Error('occurred_at must be a valid timestamp.');
  if (Date.parse(occurredAt) > Date.now() + 5 * 60 * 1000) throw new Error('A Work occurrence cannot be reported in the future.');
  const summary = cleanText(body?.summary, 700);
  const outcome = cleanText(body?.outcome, 500);
  const exceptionNotes = cleanText(body?.exception_notes, 500);
  if (!summary) throw new Error('Tell Reality what happened during this occurrence.');

  const userObservationRefs = await admitOccurrenceStatements({
    base44,
    principal,
    worldId,
    workflow,
    occurredAt,
    summary,
    outcome,
    exceptionNotes,
  });

  return service.entities.WorkWorkflowOccurrence.create({
    occurrence_id: occurrenceId,
    record_version: OCCURRENCE_VERSION,
    user_id: principal.id,
    world_id: worldId,
    workflow_name_snapshot: workflow,
    workflow_fingerprint: fingerprint,
    occurrence_kind: 'USER_REPORTED_ONLY',
    occurred_at: occurredAt,
    summary,
    outcome,
    exception_notes: exceptionNotes,
    source_observation_refs: [],
    user_observation_refs: userObservationRefs,
    evidence_review_id: '',
    source_external_event_id: '',
    evidence_status: 'USER_REPORTED_ONLY',
    created_at: now,
    automation_authorized: false,
    action_authorized: false,
  });
}

async function exactCalendarObservation(service: any, userId: string, loop: any, observationRef: string) {
  const rows = await service.entities.PersonalCalendarObservation.filter({
    user_id: userId,
    source: CALENDAR_SOURCE,
    calendar_id: loop.calendar_id,
    observation_ref: observationRef,
  }, '-external_updated_at', 1, 0);
  const row = rows?.[0] || null;
  if (!row) return null;
  const latest = await service.entities.PersonalCalendarObservation.filter({
    user_id: userId,
    source: CALENDAR_SOURCE,
    calendar_id: loop.calendar_id,
    external_event_id: row.external_event_id,
  }, '-external_updated_at', 1, 0);
  if (!latest?.[0] || latest[0].observation_ref !== row.observation_ref) return null;
  return row;
}

async function ensureLinkedOccurrence(service: any, principal: any, worldId: string, profile: any, review: any, event: any) {
  if (!['RELATED', 'PARTLY_RELATED'].includes(review.decision)) return null;
  const fingerprint = workflowFingerprint(profile);
  if (review.workflow_fingerprint !== fingerprint) throw new Error('This evidence review belongs to an older workflow model.');
  const prior = await service.entities.WorkWorkflowOccurrence.filter({
    user_id: principal.id,
    world_id: worldId,
    workflow_fingerprint: fingerprint,
    evidence_review_id: review.review_id,
  }, '-created_at', 1, 0);
  if (prior?.[0]) return prior[0];
  const partial = review.decision === 'PARTLY_RELATED';
  return service.entities.WorkWorkflowOccurrence.create({
    occurrence_id: `workcal:${worldId}:${review.review_id}`,
    record_version: OCCURRENCE_VERSION,
    user_id: principal.id,
    world_id: worldId,
    workflow_name_snapshot: workflowName(profile),
    workflow_fingerprint: fingerprint,
    occurrence_kind: partial ? 'CALENDAR_LINKED_USER_PARTIAL' : 'CALENDAR_LINKED_USER_CONFIRMED',
    occurred_at: exactIso(event.start_value, review.reviewed_at) || review.reviewed_at,
    summary: event.summary || '(Untitled calendar event)',
    outcome: '',
    exception_notes: partial ? 'User marked this Calendar observation as only partly related to the reported workflow.' : '',
    source_observation_refs: [event.observation_ref],
    user_observation_refs: [review.review_observation_ref],
    evidence_review_id: review.review_id,
    source_external_event_id: event.external_event_id,
    evidence_status: 'CONNECTED_SOURCE_PLUS_USER_CONFIRMATION',
    created_at: review.reviewed_at,
    automation_authorized: false,
    action_authorized: false,
  });
}

async function reviewCalendarEvidence({ base44, service, principal, worldId, profile, loop, body }: any) {
  const fingerprint = workflowFingerprint(profile);
  if (!loopMatchesCurrentWorkflow(loop, profile)) {
    throw new Error('Your reported workflow changed after learning started. Restart learning for the updated workflow before reviewing evidence.');
  }
  if (loop?.status !== 'ACTIVE' || loop?.calendar_binding_enabled !== true || !loop?.calendar_id) {
    throw new Error('Start the Work Evidence Loop and explicitly bind Calendar before reviewing Calendar evidence.');
  }
  const observationRef = cleanText(body?.source_observation_ref, 512);
  const decision = cleanText(body?.decision, 40).toUpperCase();
  if (!observationRef) throw new Error('source_observation_ref is required.');
  if (!['RELATED', 'PARTLY_RELATED', 'NOT_RELATED'].includes(decision)) throw new Error('Unknown Work evidence relation decision.');

  const event = await exactCalendarObservation(service, principal.id, loop, observationRef);
  if (!event) throw new Error('That Calendar observation is unavailable, stale, or outside this Work binding.');
  if (!isPastCandidate(event, Date.now())) throw new Error('Only completed, non-cancelled Calendar observations can be reviewed as workflow occurrence evidence in v0.1.');

  const prior = await service.entities.WorkEvidenceReview.filter({
    user_id: principal.id,
    world_id: worldId,
    workflow_fingerprint: fingerprint,
    source_observation_ref: observationRef,
  }, '-reviewed_at', 1, 0);
  if (prior?.[0]) {
    if (prior[0].decision !== decision) throw new Error('This exact Calendar observation already has an append-only Work evidence review. A changed source version can be reviewed separately.');
    const occurrence = await ensureLinkedOccurrence(service, principal, worldId, profile, prior[0], event);
    return { review: prior[0], occurrence, replayed: true };
  }

  const workflow = workflowName(profile);
  const relation = decision === 'RELATED'
    ? 'was part of'
    : decision === 'PARTLY_RELATED'
      ? 'was partly related to'
      : 'was not part of';
  const admitted = await admitObservationForPrincipal({
    base44,
    principal,
    observation: {
      origin: `personal-reality:work-world:${worldId}:calendar-workflow-relation`,
      content: `I confirm that the Google Calendar event "${cleanText(event.summary, 240)}" ${relation} my work workflow "${workflow}".`,
    },
  });
  const reviewedAt = new Date().toISOString();
  const review = await service.entities.WorkEvidenceReview.create({
    review_id: `workreview:${worldId}:${crypto.randomUUID()}`,
    record_version: REVIEW_VERSION,
    user_id: principal.id,
    world_id: worldId,
    workflow_name_snapshot: workflow,
    workflow_fingerprint: fingerprint,
    source: CALENDAR_SOURCE,
    calendar_id: loop.calendar_id,
    external_event_id: event.external_event_id,
    source_observation_ref: event.observation_ref,
    source_event_summary: event.summary || '(Untitled calendar event)',
    decision,
    review_observation_ref: admitted.id,
    reviewed_at: reviewedAt,
    authority: REVIEW_AUTHORITY,
    automation_authorized: false,
    action_authorized: false,
  });
  const occurrence = await ensureLinkedOccurrence(service, principal, worldId, profile, review, event);
  return { review, occurrence, replayed: false };
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
    if (!profile?.completed || !hasReportedWorkflow(profile)) {
      return Response.json({ error: 'Teach Reality at least one Work workflow before starting the evidence loop.' }, { status: 409 });
    }

    let loop = await currentLoop(service, principal.id, worldId);
    const action = cleanText(body?.action, 60).toLowerCase() || 'status';

    if (action === 'status') {
      return Response.json(await statusPayload(service, principal.id, worldId, profile, loop));
    }

    if (action === 'start') {
      const changedWorkflow = Boolean(loop && !loopMatchesCurrentWorkflow(loop, profile));
      loop = await saveLoop(service, principal.id, worldId, loop, profile, {
        status: 'ACTIVE',
        ...(changedWorkflow ? {
          calendar_binding_enabled: false,
          calendar_id: '',
          started_at: new Date().toISOString(),
        } : {}),
      });
      return Response.json({
        ...(await statusPayload(service, principal.id, worldId, profile, loop)),
        restarted_for_updated_workflow: changedWorkflow,
      });
    }

    if (action === 'pause') {
      if (!loop) return Response.json({ error: 'The Work Evidence Loop has not been started.' }, { status: 409 });
      loop = await saveLoop(service, principal.id, worldId, loop, profile, {
        status: 'PAUSED',
        paused_at: new Date().toISOString(),
      });
      return Response.json(await statusPayload(service, principal.id, worldId, profile, loop));
    }

    if (action === 'bind_calendar') {
      if (!loop || loop.status !== 'ACTIVE') return Response.json({ error: 'Start the Work Evidence Loop before binding a source.' }, { status: 409 });
      if (!loopMatchesCurrentWorkflow(loop, profile)) return Response.json({ error: 'Your reported workflow changed after learning started. Restart learning for the updated workflow before binding Calendar.' }, { status: 409 });
      const calendar = await currentCalendarSource(service, principal.id);
      if (!calendar || calendar.connection_status !== 'CONNECTED') {
        return Response.json({ error: 'Google Calendar is not currently connected for this user.' }, { status: 409 });
      }
      loop = await saveLoop(service, principal.id, worldId, loop, profile, {
        calendar_binding_enabled: true,
        calendar_id: calendar.calendar_id || 'primary',
        calendar_bound_at: new Date().toISOString(),
      });
      return Response.json(await statusPayload(service, principal.id, worldId, profile, loop));
    }

    if (action === 'unbind_calendar') {
      if (!loop) return Response.json({ error: 'The Work Evidence Loop has not been started.' }, { status: 409 });
      loop = await saveLoop(service, principal.id, worldId, loop, profile, {
        calendar_binding_enabled: false,
        calendar_id: '',
      });
      return Response.json(await statusPayload(service, principal.id, worldId, profile, loop));
    }

    if (action === 'log_occurrence') {
      if (!loop || loop.status !== 'ACTIVE') return Response.json({ error: 'Start the Work Evidence Loop before logging an occurrence.' }, { status: 409 });
      if (!loopMatchesCurrentWorkflow(loop, profile)) return Response.json({ error: 'Your reported workflow changed after learning started. Restart learning for the updated workflow before logging new occurrences.' }, { status: 409 });
      const occurrence = await createUserReportedOccurrence({ base44, service, principal, worldId, profile, body });
      const state = await statusPayload(service, principal.id, worldId, profile, loop);
      return Response.json({
        ...state,
        occurrence: publicOccurrence(occurrence),
        occurrence_authority: 'AUTHENTICATED_USER_REPORTED_WORK_OCCURRENCE_ONLY',
        observed_stage_earned_from_this_occurrence: false,
      });
    }

    if (action === 'review_calendar_event') {
      const result = await reviewCalendarEvidence({ base44, service, principal, worldId, profile, loop, body });
      const state = await statusPayload(service, principal.id, worldId, profile, loop);
      return Response.json({
        ...state,
        review: {
          review_id: result.review.review_id,
          decision: result.review.decision,
          source_observation_ref: result.review.source_observation_ref,
          authority: REVIEW_AUTHORITY,
          replayed: result.replayed,
        },
        linked_occurrence_created: Boolean(result.occurrence),
        observed_stage_earned: state.progression.observed,
      });
    }

    return Response.json({ error: 'Unknown Work Evidence Loop action.' }, { status: 400 });
  } catch (error) {
    console.error('work-evidence-loop failed', error);
    return Response.json({
      error: 'Reality could not update the Work Evidence Loop.',
      diagnostic: error?.message || String(error),
    }, { status: error?.status || 500 });
  }
}