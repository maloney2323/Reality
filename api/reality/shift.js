import crypto from 'node:crypto';
import { createUniversePostgresPersistence } from '../../src/reality-universe-postgres-persistence-v0.1.js';
import { buildShadowObservations } from '../../src/reality-shadow-observer-v0.1.js';
import { reconstructOperationalWork, analyzeOwnership, analyzeCapabilityAndAuthority, createDiscoveredWork, validateDiscoveredWork, prioritizeDiscoveredWork } from '../../src/reality-discovered-work-v0.1.js';
import { runLiveIntelligenceOrchestration } from '../../src/reality-live-intelligence-orchestration-v0.1.js';
import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';
import { buildRealitySelfQuestionAgenda, buildSelfQuestionPrompt } from '../../src/reality-self-question-engine-v1.0.js';
import { evaluateOperatingConstitution, constitutionalEvidenceFromShift } from '../../src/reality-operating-constitution-v1.0.js';
import { createOperationId, createOperationEvent, appendOperationEvent } from '../../src/reality-operation-ledger-v1.0.js';
import { runGovernedShiftRecovery, SHIFT_OPERATING_CONTRACT } from '../../src/reality-shift-recovery-loop-v1.js';
import { getAuthorityPolicy, autoAuthorize } from '../../src/reality-authority-v1.0.js';
import { runRealityStewardshipPass } from '../../src/reality-stewardship-pass-v1.0.js';
import { projectShiftWorkCandidates, persistShiftQueue } from '../../src/reality-shift-evidence-queue-v1.js';
import { createShiftExecutionAdapters } from '../../src/reality-shift-execution-bridge-v1.js';
import { settleShift } from '../../src/reality-shift-settlement-v1.js';

export const maxDuration = 60;

const CONFIG_ROOT = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1001';
const WORLDLINE = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1002';
const SHADOW_REPO = process.env.REALITY_SHADOW_GITHUB_REPO || 'maloney2323/Reality';
const SHADOW_CONTINUITY_ROOT_ID = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1003';
const SHADOW_WORLDLINE_ID = '7b8f7a7e-5c5a-4f8e-9b9e-0d6b5c2f1004';

// Supabase's universe_events identifiers are UUIDs. Preserve the actual
// source IDs inside payload/provenance instead of submitting text as a UUID.
export function stableUuid(kind, value) {
  const digits = crypto.createHash('sha256').update(JSON.stringify([kind, value])).digest('hex').slice(0, 32).split('');
  digits[12] = '5';
  digits[16] = ((parseInt(digits[16], 16) & 3) | 8).toString(16);
  const h = digits.join('');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function shiftOperationPersistence(persistence) {
  return {
    appendEvent: event => persistence.appendEvent({
      ...event,
      event_id: stableUuid('shift-operation-event', event.event_id),
      entity_id: stableUuid('shift-operation-entity', event.entity_id),
      parent_event_id: event.parent_event_id
        ? stableUuid('shift-operation-event', event.parent_event_id) : null,
      provenance: { ...(event.provenance || {}), source_operation_event_id: event.event_id },
    }),
  };
}

// Only accept durable assignments and their original identities. Discovery
// candidates are not silently converted into authorized employee jobs.
export async function loadAssignedShiftWork(persistence, { principalId } = {}) {
  if (!principalId) return [];
  const events = await persistence.reconstruct({
    continuityRootId: CONFIG_ROOT, worldlineId: WORLDLINE,
  });
  const latest = new Map();
  for (const entry of events) {
    if (entry.entity_type !== 'shift_work_item') continue;
    const job = entry.payload?.work_item;
    if (!job?.work_item_id) continue;
    latest.set(job.work_item_id, entry.payload);
  }
  return [...latest.values()]
    .filter(value => value?.state === 'ASSIGNED' && value?.principal_id === principalId)
    .map(value => value.work_item);
}

export async function persistShiftRecoveryStage(persistence, stage) {
  if (!UUID_PATTERN.test(stage.continuity_root_id)) {
    throw new Error('SHIFT_WORK_CONTINUITY_ROOT_UUID_REQUIRED');
  }
  const when = new Date().toISOString();
  return persistence.appendEvent({
    event_id: stage.event_id, event_kind: 'operation',
    entity_type: 'shift_recovery_stage',
    entity_id: stableUuid('shift-work-entity', stage.work_item_id),
    continuity_root_id: stage.continuity_root_id,
    worldline_id: WORLDLINE, parent_event_id: null,
    effective_time: when, assertion_time: when, epistemic_status: 'OBSERVED',
    payload: stage, evidence_refs: stage.detail?.evidence_refs || [],
    provenance: { source: 'reality-governed-shift-recovery-v1', shift_id: stage.shift_id },
  });
}

export function evaluateShiftLaunchReadiness({config,principalId,env=process.env}={}) {
  const blockers=[];
  if (!config?.enabled) blockers.push('SHIFT_CONFIGURATION_REQUIRED');
  else if (!principalId || config.updated_by!==principalId) blockers.push('SHIFT_OWNER_SESSION_REQUIRED');
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) blockers.push('UNIVERSE_PERSISTENCE_CREDENTIAL_REQUIRED');
  if (!env.REALITY_GITHUB_TOKEN) blockers.push('GITHUB_CONNECTOR_CREDENTIAL_REQUIRED');
  if (!env.OPENAI_API_KEY) blockers.push('INTELLIGENCE_MODEL_CREDENTIAL_REQUIRED');
  return Object.freeze({
    status:blockers.length?'BLOCKED':'READY_TO_ATTEMPT',
    blockers:Object.freeze(blockers),
    // Credential presence is NOT successful provider verification.
    live_connector_access_verified:false,
    authority_for_external_work_not_inferred:true,
  });
}

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

export function cronRequest(req, secret = process.env.CRON_SECRET) {
  // A User-Agent or any random Bearer string is NOT cron authority.
  if (typeof secret !== 'string' || !secret) return false;
  const presented = String(req?.headers?.authorization || '');
  const wanted = 'Bearer ' + secret;
  const received = Buffer.from(presented);
  const expected = Buffer.from(wanted);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

async function githubCommits() {
  const [owner, repo] = SHADOW_REPO.split('/');
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Reality-Autonomous-Shift/0.1' },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`GITHUB_HTTP_${r.status}:${t.slice(0,300)}`);
  return JSON.parse(t);
}

async function readActiveManualShift(persistence,principalId,now=new Date()) {
  if (!principalId) return null;
  const history=await persistence.reconstruct({
    continuityRootId:CONFIG_ROOT,worldlineId:WORLDLINE,
  });
  const activation=history.filter(e=>e.entity_type==='shift_activation' &&
    e.payload?.principal_id===principalId &&
    Number.isFinite(Date.parse(e.payload?.start_at)) &&
    Number.isFinite(Date.parse(e.payload?.close_at)))
    .map(e=>e.payload)
    .sort((a,b)=>Date.parse(b.start_at)-Date.parse(a.start_at))[0];
  if (!activation) return null;
  const current=now.getTime();
  const start=Date.parse(activation.start_at),end=Date.parse(activation.close_at);
  if (current<start || current>=end+30*60000) return null;
  return {...activation,phase:current>=end?'SHIFT_CLOSE':'OPERATING'};
}

async function readConfig(persistence) {
  const events = await persistence.reconstruct({ continuityRootId: CONFIG_ROOT, worldlineId: WORLDLINE });
  const configs = events.filter(e => e.entity_type === 'shift_configuration').sort((a,b) =>
    String(a.assertion_time).localeCompare(String(b.assertion_time)));
  return configs.at(-1)?.payload || null;
}

export function deriveShiftInstanceId(config, local) {
  const start = String(config?.shiftStart || '21:00').split(':').map(Number);
  const localNow = Number(local.hour)*60 + Number(local.minute);
  const startMinute = start[0]*60 + start[1];
  const date = Date.UTC(Number(local.year),Number(local.month)-1,Number(local.day));
  const previousDay = localNow < startMinute &&
    ((localNow-startMinute+1440) <= Number(config?.shiftLength || 8)*60);
  const day = new Date(date - (previousDay ? 86400000 : 0)).toISOString().slice(0,10);
  return stableUuid('shift-instance', [config.updated_at,day,config.shiftStart,config.shiftLength,config.timeZone]);
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}

function withinShift(nowMinutes, startMinutes, lengthHours) {
  let elapsed = nowMinutes - startMinutes;
  if (elapsed < 0) elapsed += 1440;
  return elapsed >= 0 && elapsed < lengthHours * 60;
}

async function runTick({ config, phase, local, persistence, shiftIdOverride = null }) {
  const tickMinute = String(Math.floor(Number(local.minute)/15)*15).padStart(2,'0');
  const tickKey = `shift:tick:${local.year}-${local.month}-${local.day}:${local.hour}:${tickMinute}:${phase}`;
  const tickId = stableUuid('shift-tick', tickKey);
  const operationId = createOperationId(`shift-${phase.toLowerCase()}`);
  await appendOperationEvent({
    persistence: shiftOperationPersistence(persistence),
    continuityRootId: CONFIG_ROOT,
    worldlineId: WORLDLINE,
    event: createOperationEvent({
      operation_id: operationId,
      stage: 'question',
      outcome: 'not_started',
      payload: { mission: 'Determine the next evidence-grounded business-critical work for this shift.' },
    }),
    provenance: { source: 'reality-autonomous-shift-v0.1', tick_id: tickKey },
  });
  try {
    await persistence.appendEvent({
      event_id: tickId,
      event_kind: 'observation',
      entity_type: 'shift_tick',
      entity_id: tickId,
      continuity_root_id: CONFIG_ROOT,
      worldline_id: WORLDLINE,
      parent_event_id: null,
      effective_time: new Date().toISOString(),
      assertion_time: new Date().toISOString(),
      epistemic_status: 'OBSERVED',
      payload: { phase, local, config, status: 'STARTED', tick_key: tickKey },
      evidence_refs: [],
      provenance: { source: 'reality-autonomous-shift-v0.1', tick_key: tickKey },
    });
  } catch (e) {
    if (/23505|409|duplicate|already exists/i.test(e.message)) return { skipped: true, tick_id: tickId };
    throw e;
  }

  if (phase==='SHIFT_CLOSE') {
    const shiftId=shiftIdOverride || deriveShiftInstanceId(config,local);
    const jobs=await loadAssignedShiftWork(persistence,{principalId:config.updated_by});
    const historyByJob={};
    for (const job of jobs) {
      const entries=await persistence.reconstruct({
        continuityRootId:job.continuity_root_id,worldlineId:WORLDLINE,
      });
      historyByJob[job.work_item_id]=entries.filter(e=>e.entity_type==='shift_recovery_stage')
        .map(e=>e.payload);
    }
    const settlement=settleShift({
      shiftId,jobs,stageHistoryByJob:historyByJob,
      // Actual labor baselines/costs must be evidence-supplied, not invented.
      valuation:null,
    });
    const closeEventId=stableUuid('shift-settlement',shiftId);
    try {
      await persistence.appendEvent({
        event_id:closeEventId,event_kind:'observation',
        entity_type:'shift_settlement',entity_id:shiftId,
        continuity_root_id:CONFIG_ROOT,worldline_id:WORLDLINE,
        parent_event_id:tickId,
        effective_time:new Date().toISOString(),assertion_time:new Date().toISOString(),
        epistemic_status:'OBSERVED',payload:settlement,
        evidence_refs:settlement.jobs.flatMap(job=>job.evidence_refs||[]),
        provenance:{source:'reality-shift-settlement-v1',shift_id:shiftId},
      });
    } catch (error) {
      if (!/23505|409|duplicate|already exists/i.test(String(error?.message||''))) throw error;
    }
    return {
      shift_instance_id:shiftId,phase,
      shift_completion_verified:settlement.status==='ALL_SELECTED_WORK_VERIFIED',
      settlement,financial_status:settlement.financial.status,
    };
  }

  let commits = [];
  let githubObservationError = null;
  try { commits = await githubCommits(); }
  catch (error) { githubObservationError = error.message; }
  // An unavailable source may reduce work discovery, but cannot erase known
  // assignments or interrupt unrelated authorized jobs.
  const observations = buildShadowObservations({
    observedAt: new Date().toISOString(),
    commits: commits.map(c => ({
      sha: c.sha, message: String(c.commit?.message || '').split('\n')[0],
      date: c.commit?.author?.date || c.commit?.committer?.date || null,
      author: c.author?.login || c.commit?.author?.name || null,
      repository: SHADOW_REPO, url: c.html_url || null,
    })),
  });

  let persisted = 0;
  for (const o of observations) {
    try {
      await persistence.appendEvent({
        event_id: stableUuid('shadow-observation', o.observation_id), event_kind: 'observation', entity_type: 'shadow_activity',
        entity_id: stableUuid('shadow-activity', o.external_id), continuity_root_id: SHADOW_CONTINUITY_ROOT_ID,
        worldline_id: SHADOW_WORLDLINE_ID, parent_event_id: null,
        effective_time: o.effective_at, assertion_time: o.observed_at,
        epistemic_status: o.epistemic_status, payload: o, evidence_refs: [],
        provenance: { ...(o.provenance || {}), original_observation_id: o.observation_id },
        content_hash: o.content_hash,
      });
      persisted++;
    } catch (e) {
      if (!/23505|409|duplicate|already exists/i.test(e.message)) throw e;
    }
  }

  const history = await persistence.reconstruct({
    continuityRootId: SHADOW_CONTINUITY_ROOT_ID,
    worldlineId: SHADOW_WORLDLINE_ID,
  });
  const historyObservations = history
    .filter(e => e.event_kind === 'observation' && e.entity_type === 'shadow_activity')
    .map(e => e.payload);
  const reconstructions = reconstructOperationalWork({ observations: historyObservations });
  const discoveredWork = reconstructions.map((reconstruction) => {
    const ownership = analyzeOwnership(reconstruction);
    const capabilityAuthority = analyzeCapabilityAndAuthority(reconstruction);
    return validateDiscoveredWork(createDiscoveredWork({
      reconstruction,
      ownership,
      capabilityAuthority,
      materiality: reconstruction.classification === 'RECURRING' ? 'HIGH' : 'MEDIUM',
      proposedNextAction: capabilityAuthority.disposition === 'AWAITING_CAPABILITY'
        ? 'OPEN_CAPABILITY_GAP'
        : capabilityAuthority.disposition === 'AWAITING_AUTHORITY'
          ? 'REQUEST_EXPLICIT_AUTHORITY'
          : 'PREPARE_GOVERNED_WORK',
      verificationRequirements: ['Independent observation must support completion before reconciliation.'],
    }));
  });
  const prioritizedWork = prioritizeDiscoveredWork(discoveredWork).slice(0, 20);

  const constitution = evaluateOperatingConstitution({
    evidence: constitutionalEvidenceFromShift({
      discovered_work_count: prioritizedWork.length,
      authority: 'NONE_UNLESS_EXPLICITLY_GRANTED_PER_WORK_ITEM',
      verification_plan: 'INDEPENDENT_OBSERVATION_REQUIRED',
    }),
  });

  const selfQuestionAgenda = buildRealitySelfQuestionAgenda({
    phase,
    evidence: {
      repository: SHADOW_REPO,
      recent_observation_count: observations.length,
      discovered_work_count: prioritizedWork.length,
      recurring_work_count: prioritizedWork.filter(w => w.classification === 'RECURRING').length,
      authority: 'NONE_UNLESS_EXPLICITLY_GRANTED_PER_WORK_ITEM',
      execution: 'FAIL_CLOSED',
      verification_plan: 'INDEPENDENT_OBSERVATION_REQUIRED',
      live_observation_count: observations.length,
    },
  });

  // Work discovery and assignment is a separate, governed, persistent stage.
  // A GitHub observation is NOT an employee job until source and authority are checked.
  let queue = {status:'DISCOVERY_UNAVAILABLE',candidates:0,assigned:0,proposed:0};
  try {
    const stewardship = await runRealityStewardshipPass();
    const candidates = projectShiftWorkCandidates(stewardship,{principalId:config?.updated_by});
    const queueHistory = await persistence.reconstruct({
      continuityRootId:CONFIG_ROOT,worldlineId:WORLDLINE,
    });
    const policy = config?.updated_by
      ? await getAuthorityPolicy(config.updated_by,persistence) : null;
    queue = {status:'DISCOVERY_OBSERVED',...await persistShiftQueue({
      persistence,candidates,principalId:config.updated_by,
      shiftRootId:CONFIG_ROOT,worldlineId:WORLDLINE,
      existingEvents:queueHistory,
      hasExactAuthority:job=>{
        if (!policy?.enabled || policy?.mode!=='auto') return false;
        if (!policy.scopes.some(scope=>
          scope.work_item_id===job.work_item_id &&
          scope.connector===job.connector &&
          scope.operation===job.operation &&
          (!scope.resource || scope.resource===job.inputs?.repository))) return false;
        const authorization=autoAuthorize({policy,workItem:job});
        return authorization?.authorized===true;
      },
    })};
  } catch (error) {
    queue = {status:'DISCOVERY_UNAVAILABLE',error:String(error?.message||error),
      candidates:0,assigned:0,proposed:0};
  }
  const shiftId=shiftIdOverride || deriveShiftInstanceId(config,local);
  const assignedWorkCycle = phase==='READINESS'
    ? {status:'READINESS_ONLY',selected_count:0,completed_count:0}
    : await runGovernedShiftRecovery({
      shiftId,
      loadAssignedWork:()=>loadAssignedShiftWork(persistence,{principalId:config?.updated_by}),
      adapters:createShiftExecutionAdapters({
        principalId:config.updated_by,persistence,
        record:stage=>persistShiftRecoveryStage(persistence,stage),
        loadPriorStages:async (job,currentShiftId)=>{
          const entries=await persistence.reconstruct({
            continuityRootId:job.continuity_root_id,worldlineId:WORLDLINE,
          });
          return entries.filter(e=>e.entity_type==='shift_recovery_stage' &&
            e.payload?.shift_id===currentShiftId).map(e=>e.payload);
        },
      }),
      // Never broaden a failed external effect into permission to rebuild.
      // The separate governed self-build / install approvals are still required.
    });

  const mission = [
    'Operate Reality as a governed autonomous business operating shift.',
    'Permanent shift operating contract: ' + JSON.stringify(SHIFT_OPERATING_CONTRACT),
    'Current independently checked shift handoff: ' + assignedWorkCycle.status + '. Do not call planning a completed shift.',
    'Constitutional state: ' + constitution.state + '. Never claim responsibility or authority that the constitution has not established.',
    'Do not begin by asking what feature to build. Begin by asking what Reality needs to know to operate the business successfully.',
    buildSelfQuestionPrompt(selfQuestionAgenda),
    'Find concrete unfinished, recurring, repetitive, blocked, risky, or high-value work from observed evidence.',
    'Prioritize work that can remove real operational load from the owner.',
    'Inspect system health, regressions, integrations, governance, product gaps, competitive developments, and capability gaps.',
    'Do not manufacture work merely to fill the shift.',
    'Do not convert inference into authority and do not execute consequential actions without explicit authorization.',
    phase === 'READINESS'
      ? 'Prepare the shift: establish current evidence, identify likely work, capability gaps, risks, and what must be authorized before execution.'
      : 'Begin the shift: turn sufficiently evidenced findings into governed work candidates, execute only already-authorized work, independently verify results, and carry unfinished work forward.'
  ].join('\n');

  const evidence = {
    operation_id: operationId,
    operating_constitution: constitution,
    self_question_agenda: selfQuestionAgenda,
    phase, observed_at: new Date().toISOString(), repository: SHADOW_REPO,
    shift_operating_contract: SHIFT_OPERATING_CONTRACT,
    assigned_work_cycle: assignedWorkCycle,
    source_backed_shift_queue: queue,
    github_observation_error:githubObservationError,
    recent_observation_count: observations.length,
    newly_persisted_observations: persisted,
    discovered_work: prioritizedWork,
    recurring_work_candidates: prioritizedWork.filter(w => w.classification === 'RECURRING'),
    authority: 'NONE_UNLESS_EXPLICITLY_GRANTED_PER_WORK_ITEM',
    execution: 'FAIL_CLOSED',
  };

  await appendOperationEvent({
    persistence: shiftOperationPersistence(persistence),
    continuityRootId: CONFIG_ROOT,
    worldlineId: WORLDLINE,
    event: createOperationEvent({
      operation_id: operationId,
      stage: 'evidence',
      outcome: 'observed',
      payload: { constitution, self_question_agenda: selfQuestionAgenda, discovered_work_count: prioritizedWork.length },
      evidence_refs: prioritizedWork.flatMap(w => w.evidence_refs || []),
    }),
    provenance: { source: 'reality-autonomous-shift-v0.1', tick_id: tickId },
  });

  const intelligence = await runLiveIntelligenceOrchestration({
    message: mission,
    requestedBy: 'reality-autonomous-shift',
    systemContext: { shift_config: config, evidence },
  });

  const result = {
    tick_id: tickId, operation_id: operationId, phase, local, evidence_summary: evidence,
    intelligence_mode: intelligence.mode,
    work: intelligence.work || null,
    execution: intelligence.execution,
    shift_cycle: assignedWorkCycle,
    shift_queue:queue,
    shift_instance_id:shiftId,
    shift_completion_verified: assignedWorkCycle.status === 'ALL_SELECTED_JOBS_VERIFIED',
    verified_completed_jobs: assignedWorkCycle.completed_count || 0,
  };

  await appendOperationEvent({
    persistence: shiftOperationPersistence(persistence),
    continuityRootId: CONFIG_ROOT,
    worldlineId: WORLDLINE,
    event: createOperationEvent({
      operation_id: operationId,
      stage: 'decision',
      outcome: 'proposed',
      payload: { intelligence_mode: intelligence.mode, work: intelligence.work || null },
    }),
    provenance: { source: 'reality-autonomous-shift-v0.1', tick_id: tickId },
  });

  await persistence.appendEvent({
    event_id: stableUuid('shift-result', tickKey),
    event_kind: 'observation',
    entity_type: 'shift_result',
    entity_id: tickId,
    continuity_root_id: CONFIG_ROOT,
    worldline_id: WORLDLINE,
    parent_event_id: tickId,
    effective_time: new Date().toISOString(),
    assertion_time: new Date().toISOString(),
    epistemic_status: 'OBSERVED',
    payload: result,
    evidence_refs: prioritizedWork.flatMap(c => c.evidence_refs || []),
    provenance: { source: 'reality-autonomous-shift-v0.1' },
  });

  return result;
}

export default async function handler(req, res) {
  try {
    const persistence = createUniversePostgresPersistence();

    if (req.method === 'POST') {
      const principal = getOrCreateSessionPrincipal(req, res);
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      if (b.intent==='START_SHIFT_NOW') {
        const config=await readConfig(persistence);
        if (!config?.enabled || config.updated_by!==principal.principal_id) {
          return json(res,403,{ok:false,error:'CURRENT_SHIFT_OWNER_AUTHORIZATION_REQUIRED'});
        }
        const readiness=evaluateShiftLaunchReadiness({
          config,principalId:principal.principal_id,
        });
        if (readiness.status!=='READY_TO_ATTEMPT') {
          return json(res,409,{ok:false,status:'PREFLIGHT_BLOCKED',readiness,
            error:readiness.blockers.join(',')});
        }
        const now=new Date();
        const local=localParts(now,config.timeZone || 'America/New_York');
        const alreadyActive=await readActiveManualShift(persistence,principal.principal_id,now);
        if (alreadyActive) {
          return json(res,200,{ok:true,
            status:alreadyActive.phase==='OPERATING'?'ALREADY_RUNNING':'SETTLEMENT_PENDING',
            shift_instance_id:alreadyActive.shift_instance_id,started_at:alreadyActive.start_at,
            close_at:alreadyActive.close_at});
        }
        const [hh,mm]=String(config.shiftStart||'21:00').split(':').map(Number);
        const insideScheduled=withinShift(Number(local.hour)*60+Number(local.minute),
          hh*60+mm,Number(config.shiftLength||8));
        const shiftId=insideScheduled
          ? deriveShiftInstanceId(config,local)
          : stableUuid('manual-shift-activation',[
              principal.principal_id,config.updated_at,
              local.year+'-'+local.month+'-'+local.day,
            ]);
        if (!insideScheduled) {
          const activation={
            principal_id:principal.principal_id,
            shift_instance_id:shiftId,
            start_at:now.toISOString(),
            close_at:new Date(now.getTime()+Number(config.shiftLength||8)*3600000).toISOString(),
          };
          try {
            await persistence.appendEvent({
              event_id:shiftId,event_kind:'governance',
              entity_type:'shift_activation',entity_id:shiftId,
              continuity_root_id:CONFIG_ROOT,worldline_id:WORLDLINE,parent_event_id:null,
              effective_time:activation.start_at,assertion_time:activation.start_at,
              epistemic_status:'OBSERVED',payload:activation,
              evidence_refs:[],provenance:{source:'reality-shift-manual-start-v1',
                principal_id:principal.principal_id},
            });
          } catch(error) {
            if (/409|23505|duplicate/i.test(String(error?.message||''))) {
              return json(res,409,{ok:false,error:'SHIFT_ALREADY_STARTED_FOR_THIS_DATE'});
            }
            throw error;
          }
        }
        const result=await runTick({
          config,phase:'MANUAL_START',local,persistence,shiftIdOverride:shiftId,
        });
        return json(res,200,{ok:true,status:'SHIFT_STARTED',shift_instance_id:shiftId,
          result});
      }
      const config = {
        enabled: b.enabled === true,
        readinessTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.readinessTime)) ? b.readinessTime : '20:00',
        shiftStart: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.shiftStart)) ? b.shiftStart : '21:00',
        shiftLength: [8, 12].includes(Number(b.shiftLength)) ? Number(b.shiftLength) : 8,
        timeZone: typeof b.timeZone === 'string' && b.timeZone ? b.timeZone : 'America/New_York',
        updated_by: principal.principal_id,
        updated_at: new Date().toISOString(),
      };
      const eventId = crypto.randomUUID();
      await persistence.appendEvent({
        event_id: eventId, event_kind: 'governance', entity_type: 'shift_configuration',
        entity_id: eventId, continuity_root_id: CONFIG_ROOT, worldline_id: WORLDLINE,
        parent_event_id: null, effective_time: config.updated_at, assertion_time: config.updated_at,
        epistemic_status: 'OBSERVED', payload: config, evidence_refs: [],
        provenance: { source: 'reality-homepage-shift-settings', principal_id: principal.principal_id },
      });
      return json(res, 200, { ok: true, config, persisted: true });
    }

    if (req.method !== 'GET') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });

    if (!cronRequest(req)) {
      const config = await readConfig(persistence);
      if (req.query?.readiness==='1') {
        const principal=getOrCreateSessionPrincipal(req,res);
        return json(res,200,{ok:true,runtime:'server_backed',
          readiness:evaluateShiftLaunchReadiness({
            config,principalId:principal.principal_id,
          }),
        });
      }
      return json(res, 200, { ok: true, config, runtime: 'server_backed' });
    }

    const config = await readConfig(persistence);
    if (!config?.enabled) return json(res, 200, { ok: true, status: 'DISABLED' });

    const now = new Date();
    const local = localParts(now, config.timeZone || 'America/New_York');
    const nowMinutes = Number(local.hour) * 60 + Number(local.minute);
    const [rh, rm] = String(config.readinessTime || '20:00').split(':').map(Number);
    const [sh, sm] = String(config.shiftStart || '21:00').split(':').map(Number);
    const readiness = rh * 60 + rm;
    const start = sh * 60 + sm;

    let phase = null;
    if (nowMinutes === readiness) phase = 'READINESS';
    if (nowMinutes === start) phase = 'SHIFT_START';
    const elapsedSinceStart=(nowMinutes-start+1440)%1440;
    const shiftLengthMinutes=Number(config.shiftLength || 8)*60;
    if (!phase && withinShift(nowMinutes, start, Number(config.shiftLength || 8))) phase = 'OPERATING';
    if (!phase && elapsedSinceStart>=shiftLengthMinutes &&
      elapsedSinceStart<shiftLengthMinutes+30) phase='SHIFT_CLOSE';
    const manualShift=await readActiveManualShift(persistence,config.updated_by,now);
    if (manualShift) phase=manualShift.phase;

    if (!phase) return json(res, 200, { ok: true, status: 'WAITING', local, config });

    const result = await runTick({ config, phase, local, persistence,
      shiftIdOverride:manualShift?.shift_instance_id || null,
    });
    return json(res, 200, { ok: true, status: 'TICK_RECORDED', result });
  } catch (error) {
    return json(res, 500, { ok: false, status: 'ERROR', error: error.message });
  }
}
