export const maxDuration = 60;

import { runLiveIntelligenceOrchestration } from '../../src/reality-live-intelligence-orchestration-v0.1.js';
import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';
import { buildFromChat } from '../../src/reality-chat-build-v1.0.js';
import { buildAuthenticatedChatContinuity } from '../../src/reality-authenticated-chat-continuity-v0.1.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = '6a7bd610756b32bc21c39ad0';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function bearer(req) {
  const value = String(req.headers?.authorization || '');
  return value.startsWith('Bearer ') ? value : '';
}

async function base44Get(path, authorization) {
  const response = await fetch(`${BASE44_API}${path}`, {
    headers: {
      Authorization: authorization,
      'X-App-Id': BASE44_APP_ID,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`BASE44_CONTEXT_HTTP_${response.status}`);
  return response.json();
}

function rows(payload) {
  return Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
}

async function observeConnectedWorld() {
  const observations = [];
  const observedAt = new Date().toISOString();

  const token = String(process.env.REALITY_GITHUB_TOKEN || '').trim();
  if (token) {
    try {
      const response = await fetch('https://api.github.com/repos/maloney2323/Reality', {
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'x-github-api-version': '2022-11-28',
        },
      });
      const repo = await response.json().catch(() => null);
      observations.push({
        entry_id: `world:github:Reality:${observedAt}`,
        epistemic_kind: response.ok ? 'OBSERVATION' : 'OBSERVATION_FAILURE',
        event_kind: 'CONNECTED_WORLD_PROVIDER_STATE',
        assertion_time: observedAt,
        effective_time: observedAt,
        source_ref: 'github:maloney2323/Reality',
        payload: response.ok ? {
          provider: 'github',
          repository: 'maloney2323/Reality',
          default_branch: repo?.default_branch || null,
          archived: repo?.archived === true,
          permissions_observed: repo?.permissions ? {
            pull: repo.permissions.pull === true,
            push: repo.permissions.push === true,
            admin: repo.permissions.admin === true,
          } : null,
          access_status: 'VERIFIED_BY_LIVE_READ',
        } : {
          provider: 'github',
          access_status: 'READ_FAILED',
          http_status: response.status,
        },
        evidence_references: [`github-live-read:${observedAt}`],
        provenance: { source: 'live_connector_observation', observed_at: observedAt },
      });
    } catch (error) {
      observations.push({
        entry_id: `world:github:failure:${observedAt}`,
        epistemic_kind: 'OBSERVATION_FAILURE',
        event_kind: 'CONNECTED_WORLD_PROVIDER_STATE',
        assertion_time: observedAt,
        effective_time: observedAt,
        source_ref: 'github:maloney2323/Reality',
        payload: { provider: 'github', access_status: 'READ_ERROR', error_code: error?.message || 'UNKNOWN' },
        evidence_references: [`github-live-read-error:${observedAt}`],
        provenance: { source: 'live_connector_observation', observed_at: observedAt },
      });
    }
  }

  const productionUrl = String(process.env.REALITY_PUBLIC_URL || 'https://reality-blond.vercel.app').replace(/\/$/, '');
  try {
    const response = await fetch(productionUrl, { method: 'GET', redirect: 'follow' });
    observations.push({
      entry_id: `world:vercel:production:${observedAt}`,
      epistemic_kind: 'OBSERVATION',
      event_kind: 'CONNECTED_WORLD_RUNTIME_STATE',
      assertion_time: observedAt,
      effective_time: observedAt,
      source_ref: 'vercel:reality-production',
      payload: {
        provider: 'vercel',
        runtime_url: productionUrl,
        http_status: response.status,
        access_status: response.ok ? 'VERIFIED_BY_LIVE_READ' : 'RUNTIME_READ_FAILED',
      },
      evidence_references: [`vercel-live-read:${observedAt}`],
      provenance: { source: 'live_runtime_observation', observed_at: observedAt },
    });
  } catch (error) {
    observations.push({
      entry_id: `world:vercel:failure:${observedAt}`,
      epistemic_kind: 'OBSERVATION_FAILURE',
      event_kind: 'CONNECTED_WORLD_RUNTIME_STATE',
      assertion_time: observedAt,
      effective_time: observedAt,
      source_ref: 'vercel:reality-production',
      payload: { provider: 'vercel', runtime_url: productionUrl, access_status: 'READ_ERROR', error_code: error?.message || 'UNKNOWN' },
      evidence_references: [`vercel-live-read-error:${observedAt}`],
      provenance: { source: 'live_runtime_observation', observed_at: observedAt },
    });
  }

  return observations;
}

export async function loadRealityContext(req, body, { noHistoryWhenSelectorsMissing = false } = {}) {
  const authorization = bearer(req);
  if (!authorization) return null;

  const user = await base44Get(`/apps/${BASE44_APP_ID}/entities/User/me`, authorization);
  if (!user?.id) throw new Error('REALITY_SESSION_REQUIRED');

  const thoughtId = String(body?.thought_id || '').trim();
  const conversationId = String(body?.conversation_id || '').trim();
  if (!thoughtId || !conversationId) {
    if (noHistoryWhenSelectorsMissing === true) {
      // Older proof consoles intentionally request a new, context-free
      // model session. Verify their real Base44 principal but do not inject
      // cross-Thought memory or invent a continuity root for these probes.
      return {
        authenticated_user_id: user.id,
        universe_entries: [],
        context_source: 'BASE44_VERIFIED_EPHEMERAL_NO_HISTORY',
        authority: 'AUTHENTICATED_USER_CONTEXT_ONLY',
        truth_authorized: false,
        action_authorized: false,
      };
    }
    throw new Error('REALITY_CHAT_TRACE_REQUIRED');
  }

  const q = encodeURIComponent(JSON.stringify({
    user_id: user.id,
    thought_id: thoughtId,
    conversation_id: conversationId,
  }));
  const historyPayload = await base44Get(
    `/apps/${BASE44_APP_ID}/entities/PersonalMessage?q=${q}&sort=-created_date&limit=80`,
    authorization,
  );
  const historyRows = rows(historyPayload)
    .filter((item) => item?.role === 'user' || item?.role === 'assistant')
    .slice(0, 60);

  const profileQuery = encodeURIComponent(JSON.stringify({ user_id: user.id }));
  let profile = null;
  try {
    const profilePayload = await base44Get(
      `/apps/${BASE44_APP_ID}/entities/PersonalProfile?q=${profileQuery}&sort=-created_date&limit=1`,
      authorization,
    );
    profile = rows(profilePayload)[0] || null;
  } catch {
    profile = null;
  }

  const currentThoughtIds = new Set([thoughtId]);
  const crossQuery = encodeURIComponent(JSON.stringify({ user_id: user.id }));
  let crossThought = [];
  try {
    const crossPayload = await base44Get(
      `/apps/${BASE44_APP_ID}/entities/PersonalMessage?q=${crossQuery}&sort=-created_date&limit=120`,
      authorization,
    );
    crossThought = rows(crossPayload)
      .filter((item) => item?.role === 'user' && item?.thought_id && !currentThoughtIds.has(item.thought_id))
      .slice(0, 30);
  } catch {
    crossThought = [];
  }

  const safeProfile = profile ? {
    preferred_name: profile.preferred_name || null,
    interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 20) : [],
    hobbies: Array.isArray(profile.hobbies) ? profile.hobbies.slice(0, 20) : [],
    goals: Array.isArray(profile.goals) ? profile.goals.slice(0, 20) : [],
  } : null;

  const historyText = historyRows
    .reverse()
    .map((item) => `${String(item.role).toUpperCase()}: ${String(item.text || '').slice(0, 12000)}`)
    .join('\\n');

  const crossText = crossThought
    .reverse()
    .map((item) => `USER MEMORY FROM PRIOR THOUGHT: ${String(item.text || '').slice(0, 6000)}`)
    .join('\\n');

  const universe_entries = [
    {
      entry_id: `conversation:${conversationId}`,
      epistemic_kind: 'OBSERVATION',
      content: historyText || '(No earlier conversation context is available.)',
      provenance: { source: 'authenticated_conversation_context', authority: 'USER_CONTEXT' },
      evidence_references: [],
    },
    {
      entry_id: `cross-thought:${user.id}`,
      epistemic_kind: 'CONTEXT',
      content: crossText || '(No prior cross-thought user context selected.)',
      provenance: { source: 'authenticated_cross_thought_context', authority: 'USER_CONTEXT' },
      evidence_references: [],
    },
    ...(safeProfile ? [{
      entry_id: `profile:${user.id}`,
      epistemic_kind: 'CONTEXT',
      content: JSON.stringify(safeProfile),
      provenance: { source: 'authenticated_profile_context', authority: 'USER_CONTEXT' },
      evidence_references: [],
    }] : []),
  ];

  return {
    authenticated_user_id: user.id,
    profile: safeProfile,
    verified_conversation_context: historyText || '(No earlier conversation context is available.)',
    // Explicit speaker boundaries and message provenance, from the authenticated
    // Base44 read only. Do not infer role from arbitrary text prefixes.
    authenticated_conversation_turns: historyRows.map((item,index)=>({
      role:item.role,
      text:String(item.text||'').slice(0,12000),
      source_ref:'authenticated-conversation:'+conversationId+':'+String(item.id||item.created_date||index),
    })),
    prior_user_context: crossText || '(No prior cross-thought user context selected.)',
    universe_entries,
    context_source: 'BASE44_AUTHENTICATED_PERSONAL_REALITY',
    authority: 'AUTHENTICATED_USER_CONTEXT_ONLY',
    truth_authorized: false,
    action_authorized: false,
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST, OPTIONS').json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = req.body || {};
    const principal = getOrCreateSessionPrincipal(req, res);

    // Explicit build language in chat enters Reality's governed self-build path.
    // The resulting authority is bounded to an isolated branch + PR; production
    // merge/deploy authority remains separate.
    if (typeof body.message === 'string' && /^(build|create|implement|add|make|fix|modify|change)\\b/i.test(body.message.trim())) {
      const build = await buildFromChat({
        message: body.message,
        requestedBy: principal.principal_id,
        authorizationRef: body.authorization_id || null,
      });
      if (build) {
        return res.status(200).json({
          ok: true,
          result: {
            mode: 'SELF_BUILD',
            answer: `Reality built the requested change and opened an isolated build for review.\\n\\nBuild: ${build.objective}\\nBranch: ${build.branch}\\nPull request: ${build.pull_request?.url || 'opened'}`,
            build,
            authority: { granted: true, scope: build.authorization.scope, production_merge_permitted: false },
            execution: { status: 'PR_OPENED', production_deploy: false },
          },
        });
      }
    }

    // Selectors name a project; they are not identity or a trusted ledger root.
    // Require both selectors and independently verify the Base44 user before
    // deriving any durable continuity identity. An anonymous client must never
    // choose a persisted conversation root by providing arbitrary IDs.
    const thoughtSelected = Boolean(String(body?.thought_id || '').trim());
    const conversationSelected = Boolean(String(body?.conversation_id || '').trim());
    if (thoughtSelected !== conversationSelected) {
      const error = new Error('REALITY_CHAT_TRACE_REQUIRED');
      error.status = 400;
      throw error;
    }
    const hasAuthenticatedBearer = Boolean(bearer(req));
    if (conversationSelected && !hasAuthenticatedBearer) {
      const error = new Error('AUTHENTICATED_SESSION_REQUIRED_FOR_DURABLE_CONTINUITY');
      error.status = 401;
      throw error;
    }
    // Do not swallow failed authentication or Base44 retrieval and silently
    // replace a real project with an anonymous, unrelated conversation.
    const realityContext = hasAuthenticatedBearer
      ? await loadRealityContext(req, body, { noHistoryWhenSelectorsMissing: !conversationSelected })
      : null;
    const persistentProjectSelected = conversationSelected &&
      Boolean(realityContext?.authenticated_user_id);
    const scopedContext = persistentProjectSelected
      ? buildAuthenticatedChatContinuity({ body, authenticatedContext: realityContext })
      : {
          ...(realityContext || {}),
          ephemeral_no_history: true,
          continuity_root_id: null,
          conversation_id: null,
          thought_id: null,
          identity_basis: hasAuthenticatedBearer
            ? 'BASE44_VERIFIED_EPHEMERAL_NO_HISTORY'
            : 'ANONYMOUS_EPHEMERAL_NO_HISTORY',
        };

    const worldObservations = await observeConnectedWorld();
    const operationalContext = {
      ...scopedContext,
      connected_world_observations: worldObservations,
      world_observation_status: worldObservations.length ? 'OBSERVED' : 'NO_OBSERVATIONS',
      world_observation_count: worldObservations.length,
    };

    const result = await runLiveIntelligenceOrchestration({
      message: body?.message,
      requestedBy: realityContext?.authenticated_user_id || principal.principal_id,
      systemContext: operationalContext,
    });
    const ledger = result?.context?.continuity || {};
    const durableReadbackVerified = persistentProjectSelected &&
      ledger.signal_handoff_status === 'STORED_AND_READ_BACK' &&
      ledger.cognitive_readback_verified === true;

    return res.status(200).json({
      ok: true,
      result,
      continuity: {
        context_loaded: Boolean(realityContext),
        authenticated_user_context: Boolean(realityContext?.authenticated_user_id),
        durable_context_source: persistentProjectSelected
          ? 'BASE44_AUTHENTICATED_PROJECT_SCOPE'
          : 'NONE',
        mode: !persistentProjectSelected ? 'EPHEMERAL_NO_HISTORY'
          : durableReadbackVerified ? 'DURABLE_READBACK_VERIFIED'
          : 'AUTHENTICATED_PERSISTENCE_NOT_VERIFIED',
        durable_readback_verified: durableReadbackVerified,
        // This is a diagnostic root identifier, not a bearer or authority grant.
        root_id: persistentProjectSelected ? scopedContext.continuity_root_id : null,
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      ok: false,
      error: error.message,
      provider_error: error.provider_error || null,
    });
  }
}
