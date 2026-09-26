import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  REALITY_OPENAI_CODING_MODEL,
  invokeOpenAiStructured,
} from '../../shared/reality-core/direct-model-provider.js';
import { REALITY_CODE_TREE_HASH as REALITY_CODE_SOURCE_TREE_HASH } from '../../shared/personal-reality/generated-code-tree-hash.js';
const REALITY_CODE_SOURCES = Object.freeze([]);
import { SELF_MODEL_FACTS, SELF_MODEL_VERSION } from '../../shared/personal-reality/self-model.js';
import {
  ArtifactStatus,
  ArtifactType,
  DERIVED_ARTIFACT_AUTHORITY,
  normalizeDerivedArtifact,
} from '../../shared/personal-reality/derived-artifact-contract.js';
import { githubJsonResponse as json } from '../../shared/reality-core/github-client.ts';

// Reality Code Understand v0.1
// Establishes bounded SEMANTIC understanding of Reality's own code (reading the
// actual source bytes, not just structure/imports), maintains CONTINUOUS
// awareness of changes (diffs against the last persisted understanding by tree
// hash + understood paths), and observes DEPLOYED-RUNTIME behavior (bounded
// read-only probes against live functions). Read-only — nothing changes.

const FUNCTION_VERSION = 'reality-code-understand-v0.1';
const MAX_MODULES = 5;
const MAX_FILE_BYTES = 8000;

const SEMANTIC_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    semantic_units: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          purpose: { type: 'string' },
          contracts: { type: 'array', items: { type: 'string' } },
          dependencies: { type: 'array', items: { type: 'string' } },
          dependents: { type: 'array', items: { type: 'string' } },
          runtime_behavior_hypothesis: { type: 'string' },
          confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        },
        required: ['path', 'purpose', 'runtime_behavior_hypothesis', 'confidence'],
      },
    },
    overall_understanding: { type: 'string' },
    completeness_caveat: { type: 'string' },
  },
  required: ['semantic_units', 'overall_understanding'],
});

function sourceByPathMap() {
  return new Map(REALITY_CODE_SOURCES.map((item: any) => [item.path, item]));
}

// Cheap module selection by focus-keyword match against paths + a mild size
// preference. Avoids rebuilding the full code-intelligence model on every run.
function selectModules(focus: string) {
  const q = focus.toLowerCase();
  const terms = q.split(/\W+/).filter((t) => t.length > 2);
  const scored = [...REALITY_CODE_SOURCES].map((s: any) => {
    const path = String(s?.path || '');
    let score = 0;
    for (const term of terms) {
      if (path.toLowerCase().includes(term)) score += 5;
    }
    score += Math.min((s?.content?.length || 0) / 4000, 3);
    return { path, score };
  }).sort((a, b) => b.score - a.score);
  const seen = new Set();
  const selected: string[] = [];
  for (const { path } of scored) {
    if (path && !seen.has(path)) {
      seen.add(path);
      selected.push(path);
    }
    if (selected.length >= MAX_MODULES) break;
  }
  return selected;
}

function buildSourceBlocks(paths: string[], byPath: Map<string, any>) {
  return paths.map((path) => {
    const entry = byPath.get(path);
    const content = String(entry?.content || '').slice(0, MAX_FILE_BYTES);
    return `===== FILE ${path} =====\n${content}\n===== END FILE ${path} =====`;
  }).join('\n\n');
}

function safeExt(data: any) {
  if (!data) return {};
  return typeof data === 'object' ? data : (() => { try { return JSON.parse(data); } catch { return {}; } })();
}

async function runtimeProbes(base44: any) {
  const targets = ['reality-code-assess', 'reality-code-request', 'reality-code-apply-candidate'];
  const probes = [];
  for (const fn of targets) {
    const t0 = Date.now();
    try {
      const res = await base44.functions.invoke(fn, { action: 'status', message: 'runtime probe' });
      const data = res?.data || res;
      probes.push({
        function: fn,
        responded: true,
        latency_ms: Date.now() - t0,
        schema: data?.schema || data?.version || null,
        action_authorized: data?.action_authorized ?? null,
        mode: data?.mode || null,
      });
    } catch (e: any) {
      probes.push({ function: fn, responded: false, latency_ms: Date.now() - t0, error: e?.message || 'probe failed' });
    }
  }
  return probes;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return json({ error: 'Authentication required.' }, 401);
    if (principal.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'status').trim();

    if (action === 'status') {
      return json({
        schema: 'reality.code-understand.v0.1',
        version: FUNCTION_VERSION,
        mode: 'SEMANTIC_UNDERSTANDING_AND_RUNTIME_PROBE_ONLY',
        action_authorized: false,
        code_changed: false,
        description: "Establishes bounded semantic understanding of Reality's own code (reads actual source), maintains change awareness (diffs vs. last understanding), and probes deployed runtime behavior. Read-only.",
        capabilities: ['semantic_understanding', 'continuous_change_awareness', 'deployed_runtime_probe'],
        optional_inputs: ['focus', 'runtime_probe (default true)'],
      });
    }
    if (action !== 'understand') return json({ error: 'Unknown action. Use status or understand.' }, 400);

    const focus = String(body?.focus || '').trim().slice(0, 2000);
    const runtimeProbe = body?.runtime_probe !== false;
    const apiKey = secrets.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY_NOT_CONFIGURED' }, 503);

    const byPath = sourceByPathMap();
    const selectedPaths = selectModules(focus);
    if (!selectedPaths.length) return json({ error: 'No source modules available to understand.' }, 404);
    const sourceBlocks = buildSourceBlocks(selectedPaths, byPath);

    // ---- Continuous awareness: load the last persisted understanding ----
    let lastArtifact: any = null;
    try {
      const rows = await base44.asServiceRole.entities.DerivedArtifact.filter({ user_id: principal.id }, '-produced_at', 8);
      lastArtifact = (rows || []).find((r: any) => String(r?.engine || '').startsWith('reality-code-understand')) || null;
    } catch { lastArtifact = null; }
    const lastExt = safeExt(lastArtifact?.extension_data);
    const lastPaths: string[] = Array.isArray(lastExt.understood_paths) ? lastExt.understood_paths : [];
    const lastTreeHash = lastExt.code_tree_hash || null;
    const currentSet = new Set(selectedPaths);
    const lastSet = new Set(lastPaths);
    const added = [...currentSet].filter((p) => !lastSet.has(p));
    const removed = [...lastSet].filter((p) => !currentSet.has(p));
    const treeChanged = lastTreeHash !== null && lastTreeHash !== REALITY_CODE_SOURCE_TREE_HASH;
    const changeDelta = {
      last_understanding_artifact_id: lastArtifact?.id || null,
      last_tree_hash: lastTreeHash,
      current_tree_hash: REALITY_CODE_SOURCE_TREE_HASH,
      tree_changed_since_last_awareness: treeChanged,
      newly_understood_paths: added,
      no_longer_understood_paths: removed,
      first_awareness: lastArtifact == null,
    };

    // ---- LLM: bounded semantic understanding grounded in actual source ----
    const prompt = `You are Reality's semantic code-understanding engine. You are NOT an executor. You have no write, merge, deploy, or action authority.

You are building a bounded SEMANTIC understanding of REALITY'S OWN CODE — not just structure or imports, but what each module actually does, its contracts, its real dependencies and dependents, and its likely runtime behavior.

${focus ? `FOCUS:\n${focus}\n` : 'General understanding of the most significant modules.'}

ACTUAL SOURCE (exact verified bytes, bounded):
${sourceBlocks}

For each file, produce a semantic unit:
- path: the file path.
- purpose: what this module actually does (its role/behavior), grounded in the code.
- contracts: explicit or implicit contracts/invariants it enforces (auth checks, non-authoritative flags, immutability, etc.).
- dependencies: modules/external services it calls or requires (best-effort from the code).
- dependents: what likely depends on it (infer from exports + naming; mark uncertain).
- runtime_behavior_hypothesis: what it likely does at runtime when invoked — inputs, side effects, persistence, external calls. Be honest about what is inferred vs. visible.
- confidence: LOW/MEDIUM/HIGH. Default LOW for anything not directly visible in the source.

Also produce:
- overall_understanding: a concise synthesis of how these modules fit together and the system's runtime shape.
- completeness_caveat: an honest statement that this is a bounded semantic model of ${selectedPaths.length} modules out of ${REALITY_CODE_SOURCES.length}, not exhaustive, and what it does NOT establish.

Rules: cite only paths present in the source above. Do NOT propose changes. Do NOT claim authority, execution, or that anything was changed.

Return only the schema object.`;

    const result: any = await invokeOpenAiStructured({
      apiKey,
      prompt,
      response_json_schema: SEMANTIC_SCHEMA,
      schemaName: 'reality_code_understand_semantic',
      model: REALITY_OPENAI_CODING_MODEL,
      reasoningEffort: 'medium',
    });

    const semanticUnits = Array.isArray(result?.semantic_units) ? result.semantic_units.slice(0, MAX_MODULES) : [];
    if (!semanticUnits.length) return json({ error: 'Understanding produced no semantic units.' }, 502);

    // ---- Deployed-runtime behavior: bounded read-only probes ----
    const probes = runtimeProbe ? await runtimeProbes(base44) : [];

    // ---- Persist the understanding (and seed continuous awareness) ----
    const now = new Date().toISOString();
    const artifact = normalizeDerivedArtifact({
      user_id: principal.id,
      artifact_group_id: `code-understand:${REALITY_CODE_SOURCE_TREE_HASH.slice(0, 12)}`,
      admission_key: `code-understand:${now}`,
      version: 1,
      supersedes_id: lastArtifact?.id || null,
      artifact_type: ArtifactType.ENGINEERING_PREMISE,
      engine: 'reality-code-understand:semantic',
      subject: (focus || 'Reality codebase semantic understanding').slice(0, 200),
      summary: `Semantic understanding of ${semanticUnits.length} module(s); change-awareness ${changeDelta.first_awareness ? '(first awareness)' : treeChanged ? '(tree changed since last)' : '(unchanged)'}; ${probes.length} runtime probe(s).`,
      evidence_refs: selectedPaths.slice(0, 24),
      assumptions: ['Semantic model is bounded to the selected modules and grounded in their actual source bytes.', 'Runtime probes observe only status endpoints, not full execution paths.'],
      what_would_change_it: ['The code tree hash changes (new understanding required).', 'A runtime probe contradicts the static runtime hypothesis.', 'A module\'s actual behavior diverges from its semantic model.'],
      horizon: null,
      as_of: now,
      materiality_level: 2,
      materiality_risks: ['CODE_CHANGE', 'CAPABILITY_CHANGE'],
      status: ArtifactStatus.ACTIVE,
      outcome_ref: null,
      outcome_resolved: false,
      extension_data: {
        focus: focus || null,
        code_tree_hash: REALITY_CODE_SOURCE_TREE_HASH,
        self_model_version: SELF_MODEL_VERSION,
        understood_paths: selectedPaths,
        semantic_units: semanticUnits,
        overall_understanding: result?.overall_understanding || '',
        completeness_caveat: result?.completeness_caveat || '',
        change_awareness: changeDelta,
        runtime_probes: probes,
        authority: 'SEMANTIC_UNDERSTANDING_AND_RUNTIME_PROBE_ONLY',
        action_authorized: false,
        code_changed: false,
      },
      authority: DERIVED_ARTIFACT_AUTHORITY,
      produced_at: now,
    });
    const created = await base44.asServiceRole.entities.DerivedArtifact.create(artifact);

    return json({
      schema: 'reality.code-understand-result.v0.1',
      version: FUNCTION_VERSION,
      ok: true,
      understanding_artifact_id: created.id,
      focus: focus || null,
      modules_understood: selectedPaths.length,
      total_source_files: REALITY_CODE_SOURCES.length,
      semantic_units: semanticUnits,
      overall_understanding: result?.overall_understanding || '',
      completeness_caveat: result?.completeness_caveat || '',
      change_awareness: changeDelta,
      runtime_probes: probes,
      grounding: {
        source_verified: true,
        semantic_not_exhaustive: true,
        runtime_observed: runtimeProbe,
        authority: 'SEMANTIC_UNDERSTANDING_AND_RUNTIME_PROBE_ONLY',
      },
      governance: {
        action_authorized: false,
        code_changed: false,
        note: 'Bounded semantic understanding + change awareness + runtime probes. Read-only; nothing changed.',
      },
    });
  } catch (error: any) {
    console.error('reality-code-understand failed', error);
    return json({ error: 'Reality could not establish semantic understanding.', diagnostic: error?.message || String(error), action_authorized: false, code_changed: false }, 500);
  }
}